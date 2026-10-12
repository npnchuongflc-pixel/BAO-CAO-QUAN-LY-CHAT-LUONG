import { SpreadsheetData } from '../types/sheet';
import { DayConfig, ClassDetailItem, processDayData, isValidTeacherName } from './dayDataProcessor';

export interface TeacherChangeRecord {
  id: string;
  dayId: string;       // e.g. 'thu4'
  dayName: string;     // e.g. 'Thứ 4'
  dateStr: string;     // e.g. '30/09/2026'
  scheduleDate?: string; // Ngày thực tế của ca học (ví dụ: '06/10/2026')
  changeDate?: string;   // Ngày thực hiện chỉnh sửa (ví dụ: '05/10/2026')
  campus: string;      // e.g. 'Cơ sở Hà Đô'
  timeSlot: string;    // e.g. '15:00 - 16:30'
  subject: 'Cờ vua' | 'Lớp vẽ';
  role: string;        // 'GV chính' | 'GV thứ 2' | 'GV thứ 3'
  oldTeacher: string;  // Đổi người nào
  newTeacher: string;  // Thành người nào
  changeTime: string;  // Thời gian đổi (ví dụ: '14:15 - 30/09/2026')
  source: 'link_sync' | 'manual';
  note?: string;
}

const CHANGES_STORAGE_KEY = 'cvsg_real_teacher_changes_v2';
const BASELINE_STORAGE_KEY = 'cvsg_real_sheet_baseline_v2';

/**
 * Trích xuất ngày, tháng, năm từ chuỗi ngày tháng bất kỳ:
 * - "17:13 - 05/10/2026" -> { day: 5, month: 10, year: 2026 }
 * - "06-10-2026" -> { day: 6, month: 10, year: 2026 }
 * - "06/10/2026" -> { day: 6, month: 10, year: 2026 }
 * - "06/10" -> { day: 6, month: 10 }
 * - "Thứ 3 06-10-2026" -> { day: 6, month: 10, year: 2026 }
 */
export function parseDateComponents(str: string | undefined): { day: number; month: number; year?: number } | null {
  if (!str) return null;
  // Tìm dạng DD/MM/YYYY hoặc DD-MM-YYYY
  const dmy = str.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10);
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += 2000;
    return { day, month, year };
  }
  // Tìm dạng DD/MM hoặc DD-MM
  const dm = str.match(/(\d{1,2})[-/](\d{1,2})/);
  if (dm) {
    const day = parseInt(dm[1], 10);
    const month = parseInt(dm[2], 10);
    return { day, month };
  }
  return null;
}

/**
 * So sánh 2 chuỗi ngày xem có cùng một ngày hay không (ngày & tháng, và năm nếu có)
 */
export function isSameDate(aStr: string | undefined, bStr: string | undefined): boolean {
  const a = parseDateComponents(aStr);
  const b = parseDateComponents(bStr);
  if (!a || !b) return false;
  if (a.day !== b.day || a.month !== b.month) return false;
  if (a.year && b.year && a.year !== b.year) return false;
  return true;
}

/**
 * Kiểm tra xem chuỗi ngày có trùng với ngày hôm nay thực tế (theo múi giờ hiện tại) hay không
 */
export function isToday(dateStr: string | undefined): boolean {
  const comp = parseDateComponents(dateStr);
  if (!comp) return false;
  const now = new Date();
  if (comp.day !== now.getDate() || comp.month !== (now.getMonth() + 1)) return false;
  if (comp.year && comp.year !== now.getFullYear()) return false;
  return true;
}

/**
 * Kiểm tra xem một bản ghi thay đổi có hợp lệ để cảnh báo hay không:
 * CHỈ CẢNH BÁO KHI NGÀY SỬA TRÙNG VỚI NGÀY THỰC TẾ
 * (Tức ngày thực hiện chỉnh sửa trùng với ngày thực tế của ca dạy,
 * và ca dạy đó diễn ra trong chính ngày thực tế)
 */
export function isValidChangeAlertForDay(
  change: TeacherChangeRecord,
  selectedDayId: string,
  selectedDayDate: string,
  selectedDayFullDate?: string
): boolean {
  // 1. Phải thuộc đúng ngày đang chọn
  if (change.dayId !== selectedDayId) return false;

  // 2. Trích xuất ngày sửa (từ changeDate hoặc changeTime)
  const changeDateStr = change.changeDate || change.changeTime;

  // 3. Trích xuất ngày thực tế của ca dạy (từ scheduleDate hoặc selectedDayFullDate / selectedDayDate)
  const scheduleDateStr = change.scheduleDate || selectedDayFullDate || selectedDayDate || change.dateStr;

  // 4. Ngày sửa PHẢI TRÙNG VỚI ngày thực tế của ca dạy
  // Ví dụ: Sửa Thứ 3 ngày 06/10 vào ngày 05/10 -> KHÔNG trùng -> KHÔNG CẢNH BÁO!
  if (!isSameDate(changeDateStr, scheduleDateStr)) {
    return false;
  }

  // 5. Ngày sửa phải trùng với ngày thực tế hôm nay (Today)
  // Chỉ cảnh báo khi việc sửa diễn ra trong ngày thực tế hôm nay
  const isMatchToday = isToday(changeDateStr) || isToday(scheduleDateStr);
  if (!isMatchToday) {
    return false;
  }

  return true;
}

/**
 * Lấy danh sách các thay đổi thực tế đã ghi nhận.
 * CHỈ LẤY CÁC THAY ĐỔI CÓ NGÀY SỬA TRÙNG VỚI NGÀY THỰC TẾ!
 */
export function getStoredTeacherChanges(): TeacherChangeRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CHANGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Tự động lọc bỏ các bản ghi cũ mà ngày sửa không trùng với ngày thực tế
    const validRecords = parsed.filter(item => {
      const changeDateStr = item.changeDate || item.changeTime;
      const scheduleDateStr = item.scheduleDate || item.dateStr;
      
      // Ngày sửa phải trùng với ngày thực tế của ca học
      if (!isSameDate(changeDateStr, scheduleDateStr)) return false;
      // Và ngày sửa phải trùng với ngày thực tế hôm nay
      if (!isToday(changeDateStr) && !isToday(scheduleDateStr)) return false;
      return true;
    });

    if (validRecords.length !== parsed.length) {
      saveTeacherChanges(validRecords);
    }

    return validRecords;
  } catch (err) {
    console.warn('Lỗi đọc teacher changes từ localStorage:', err);
    return [];
  }
}

export function saveTeacherChanges(records: TeacherChangeRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHANGES_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('Lỗi lưu teacher changes:', err);
  }
}

export function clearTeacherChanges(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CHANGES_STORAGE_KEY);
  } catch (err) {
    console.warn('Lỗi xóa teacher changes:', err);
  }
}

export function addTeacherChangeRecord(newRecord: TeacherChangeRecord): TeacherChangeRecord[] {
  const current = getStoredTeacherChanges();
  const filtered = current.filter(r => r.id !== newRecord.id);
  const updated = [newRecord, ...filtered];
  saveTeacherChanges(updated);
  return updated;
}

/**
 * Tạo snapshot bản đồ phân công giáo viên từ dữ liệu hiện tại
 * Key: `${dayId}:${subject}:${campus}:${timeSlot}:${roleIndex}` -> teacherName
 */
export function buildTeacherAssignmentsMap(
  data: SpreadsheetData,
  daysConfig: DayConfig[]
): Record<string, string> {
  const map: Record<string, string> = {};

  daysConfig.forEach(day => {
    try {
      const stats = processDayData(data, day);
      stats.classList.forEach(cls => {
        const baseKey = `${day.id}::${cls.subject}::${cls.campus}::${cls.timeSlot}`;
        if (cls.gvChinh && isValidTeacherName(cls.gvChinh)) {
          map[`${baseKey}::GV chính`] = cls.gvChinh.trim();
        }
        if (cls.gvThu2 && isValidTeacherName(cls.gvThu2)) {
          map[`${baseKey}::GV thứ 2`] = cls.gvThu2.trim();
        }
        if (cls.gvThu3 && isValidTeacherName(cls.gvThu3)) {
          map[`${baseKey}::GV thứ 3`] = cls.gvThu3.trim();
        }
      });
    } catch (e) {
      console.warn('Lỗi build teacher assignments map:', e);
    }
  });

  return map;
}

/**
 * Lấy hoặc khởi tạo baseline snapshot từ localStorage
 */
export function getOrInitBaselineSnapshot(
  data: SpreadsheetData,
  daysConfig: DayConfig[]
): Record<string, string> {
  if (typeof window === 'undefined') return buildTeacherAssignmentsMap(data, daysConfig);
  try {
    const raw = localStorage.getItem(BASELINE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
    const newBaseline = buildTeacherAssignmentsMap(data, daysConfig);
    localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(newBaseline));
    return newBaseline;
  } catch (err) {
    return buildTeacherAssignmentsMap(data, daysConfig);
  }
}

/**
 * Cập nhật baseline mới sau khi phát hiện thay đổi
 */
export function updateBaselineSnapshot(newBaseline: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(newBaseline));
  } catch (err) {
    console.warn('Lỗi lưu baseline snapshot:', err);
  }
}

/**
 * TỰ ĐỘNG PHÁT HIỆN SỰ THAY ĐỔI THỰC SỰ TỪ LINK GOOGLE SHEETS
 * Chỉ ghi nhận khi:
 * 1. Giáo viên ở một ca học cụ thể bị thay đổi thành giáo viên khác (A -> B).
 * 2. Giáo viên cũ bị rút khỏi ca và có giáo viên mới nhận ca.
 */
export function detectRealTeacherChangesFromLiveSync(
  newData: SpreadsheetData,
  daysConfig: DayConfig[]
): { changes: TeacherChangeRecord[]; newBaseline: Record<string, string> } {
  const currentBaseline = getOrInitBaselineSnapshot(newData, daysConfig);
  const newAssignments = buildTeacherAssignmentsMap(newData, daysConfig);
  const detectedChanges: TeacherChangeRecord[] = [];

  const now = new Date();
  const timeFormatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

  // Duyệt qua tất cả các phân công mới và so sánh với baseline
  const allKeys = new Set([...Object.keys(currentBaseline), ...Object.keys(newAssignments)]);

  allKeys.forEach(key => {
    const oldTeacher = currentBaseline[key];
    const newTeacher = newAssignments[key];

    // Chỉ ghi nhận khi CẢ HAI KHÁC NHAU VÀ CÓ SỰ ĐỔI NGƯỜI THỰC SỰ
    if (oldTeacher && newTeacher && oldTeacher !== newTeacher) {
      const parts = key.split('::');
      if (parts.length >= 5) {
        const [dayId, subject, campus, timeSlot, role] = parts;
        const dayConfig = daysConfig.find(d => d.id === dayId);
        
        const scheduleDate = dayConfig?.fullDateStr || dayConfig?.date || '';
        const changeDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

        // CHỈ CẢNH BÁO KHI NGÀY SỬA TRÙNG VỚI NGÀY THỰC TẾ
        // Nếu sửa trước cho ngày khác (ví dụ: ngày 05/10 sửa lịch Thứ 3 ngày 06/10), thì KHÔNG cảnh báo!
        if (isSameDate(changeDate, scheduleDate) && (isToday(changeDate) || isToday(scheduleDate))) {
          detectedChanges.push({
            id: `real-chg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            dayId,
            dayName: dayConfig?.name || dayId,
            dateStr: dayConfig?.date || '',
            scheduleDate,
            changeDate,
            campus,
            timeSlot,
            subject: subject as 'Cờ vua' | 'Lớp vẽ',
            role,
            oldTeacher,
            newTeacher,
            changeTime: timeFormatted,
            source: 'link_sync',
            note: 'Chỉnh sửa thực tế trên link Google Sheets'
          });
        }
      }
    }
  });

  // Luôn cập nhật lại baseline để đồng bộ trạng thái mới nhất của Google Sheets
  updateBaselineSnapshot(newAssignments);

  return {
    changes: detectedChanges,
    newBaseline: newAssignments
  };
}
