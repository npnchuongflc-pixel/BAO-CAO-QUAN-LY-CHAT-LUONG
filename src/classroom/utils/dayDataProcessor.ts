import { SpreadsheetData } from '../types/sheet';
import { normalizeCampus, normalizeTimeSlot, getCampusColor, isIgnoredCampus } from './campusColors';

export interface DayConfig {
  id: string;
  name: string;
  shortName: string;
  date: string;
  fullDateStr: string;
  chessGid: string;
  artGid: string;
  isInitialTab?: boolean;
}

export const DAYS_CONFIG: DayConfig[] = [
  { id: 'thu2', name: 'Thứ 2', shortName: 'T2', date: '28/09', fullDateStr: 'Thứ 2 28-09-2026', chessGid: '1352554580', artGid: '1432636374' },
  { id: 'thu3', name: 'Thứ 3', shortName: 'T3', date: '29/09', fullDateStr: 'Thứ 3 29-09-2026', chessGid: '1446646864', artGid: '1971663577' },
  { id: 'thu4', name: 'Thứ 4', shortName: 'T4', date: '30/09', fullDateStr: 'Thứ 4 30-09-2026', chessGid: '288401433', artGid: '1846600678' },
  { id: 'thu5', name: 'Thứ 5', shortName: 'T5', date: '01/10', fullDateStr: 'Thứ 5 01-10-2026', chessGid: '1240592747', artGid: '846230684', isInitialTab: true },
  { id: 'thu6', name: 'Thứ 6', shortName: 'T6', date: '02/10', fullDateStr: 'Thứ 6 02-10-2026', chessGid: '836638131', artGid: '1814508975' },
  { id: 'thu7', name: 'Thứ 7', shortName: 'T7', date: '03/10', fullDateStr: 'Thứ 7 03-10-2026', chessGid: '911844103', artGid: '858544709' },
  { id: 'cn', name: 'Chủ Nhật', shortName: 'CN', date: '04/10', fullDateStr: 'Chủ Nhật 04-10-2026', chessGid: '938910054', artGid: '159442386' },
];

/**
 * Trích xuất ngày thực tế từ ô dữ liệu trong Sheet (dựa vào ngày của link)
 */
export function extractDateFromSheet(sheet?: { rows: string[][] }): { date: string; fullDateStr: string; day: number; month: number; year: number } | null {
  if (!sheet || !sheet.rows || sheet.rows.length === 0) return null;

  // Quét các dòng đầu tiên (dòng 0 đến dòng 2) để tìm định dạng ngày DD-MM-YYYY hoặc DD/MM/YYYY
  for (let r = 0; r < Math.min(sheet.rows.length, 3); r++) {
    const row = sheet.rows[r];
    if (!row) continue;
    for (const cell of row) {
      if (!cell || typeof cell !== 'string') continue;
      const match = cell.trim().match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
      if (match) {
        const d = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        let y = parseInt(match[3], 10);
        if (y < 100) y += 2000;
        const dayStr = d.toString().padStart(2, '0');
        const monthStr = m.toString().padStart(2, '0');
        return {
          date: `${dayStr}/${monthStr}`,
          fullDateStr: `${dayStr}-${monthStr}-${y}`,
          day: d,
          month: m,
          year: y
        };
      }
    }
  }
  return null;
}

/**
 * Cập nhật cấu hình ngày động dựa vào dữ liệu thực tế từ Sheet (link spreadsheet)
 */
export function getDynamicDaysConfig(data: SpreadsheetData | null): DayConfig[] {
  if (!data || !data.sheets) return DAYS_CONFIG;

  return DAYS_CONFIG.map(day => {
    const chessSheet = data.sheets[day.chessGid];
    const artSheet = data.sheets[day.artGid];
    const chessDate = extractDateFromSheet(chessSheet);
    const artDate = extractDateFromSheet(artSheet);
    const chosen = chessDate || artDate;

    if (chosen) {
      return {
        ...day,
        date: chosen.date,
        fullDateStr: `${day.name} ${chosen.fullDateStr}`
      };
    }
    return day;
  });
}

export interface CampusTeacherSlot {
  campus: string;
  hex: string;
  total: number;
  chess: number;
  art: number;
  chessTeachers: string[];
  artTeachers: string[];
}

export interface TimeSlotData {
  timeSlot: string;
  totalTeachers: number;
  campuses: CampusTeacherSlot[];
}

export interface ClassDetailItem {
  id: string;
  subject: 'Cờ vua' | 'Lớp vẽ';
  campus: string;
  timeSlot: string;
  slHv: number;
  slGvCan: number;
  gvCo: number;
  tinhTrangLop: string;
  canhBao: string;
  gvChinh: string;
  gvThu2: string;
  gvThu3: string;
  gvThu4?: string;
}

export interface TeacherRankStats {
  rank: string;
  label: string;
  uniqueTeachersCount: number;
  totalAssignmentsCount: number;
  percentage: number;
  bgClass: string;
  textClass: string;
  borderClass: string;
  barClass: string;
}

export interface DayProcessedStats {
  dayConfig: DayConfig;
  totalOpenedClasses: number;
  chessOpenedClasses: number;
  artOpenedClasses: number;
  totalClasses: number;
  totalStudents: number;
  missingTeacherAlerts: number;
  totalTeacherCount: number;
  uniqueTeacherCount: number;
  chessTeacherCount: number;
  artTeacherCount: number;
  chessUniqueTeacherCount: number;
  artUniqueTeacherCount: number;
  totalAssignmentsCount?: number;
  chessAssignmentsCount?: number;
  artAssignmentsCount?: number;
  rankBreakdown: TeacherRankStats[];
  chessRankBreakdown: TeacherRankStats[];
  artRankBreakdown: TeacherRankStats[];
  timeSlotsData: TimeSlotData[];
  classList: ClassDetailItem[];
  allCampusesInDay: string[];
}

/**
 * Trích xuất bậc của giáo viên (Bậc 01, Bậc 02, Bậc 03, Bậc 04, Học việc, hoặc Khác)
 */
export function extractTeacherRank(rawText: string, teacherDirectoryMap?: Map<string, string>): string {
  if (!rawText) return 'Khác';
  
  // 1. Kiểm tra trực tiếp bậc thập phân (2,5 / 3,5 hoặc 2.5 / 3.5)
  const decMatch = rawText.match(/bậc\s*0?([1-4])[,.]5/i);
  if (decMatch) {
    return `Bậc ${decMatch[1]},5`;
  }

  // 2. Kiểm tra trực tiếp bậc số nguyên (1 -> 4)
  const intMatch = rawText.match(/bậc\s*0?([1-4])\b/i);
  if (intMatch) {
    return `Bậc 0${intMatch[1]}`;
  }
  
  const lower = rawText.toLowerCase();
  if (lower.includes('học việc') || lower.includes('thử việc') || lower.includes('hoc viec') || lower.includes('hv')) {
    return 'Học việc';
  }
  
  // 3. Tra cứu trong danh bạ GV theo tên nếu có
  const cleanName = rawText.split('-')[0].trim().toLowerCase();
  if (teacherDirectoryMap && teacherDirectoryMap.has(cleanName)) {
    const dirRank = teacherDirectoryMap.get(cleanName)!;
    const dirDec = dirRank.match(/bậc\s*0?([1-4])[,.]5/i);
    if (dirDec) {
      return `Bậc ${dirDec[1]},5`;
    }
    const dirInt = dirRank.match(/bậc\s*0?([1-4])\b/i);
    if (dirInt) {
      return `Bậc 0${dirInt[1]}`;
    }
    if (dirRank.toLowerCase().includes('học việc')) {
      return 'Học việc';
    }
    if (dirRank.trim()) {
      return dirRank.trim();
    }
  }
  
  return 'Khác';
}

/**
 * Kiểm tra xem một chuỗi có phải là tên giáo viên hợp lệ hay không.
 * Nếu rỗng, dấu gạch (-), hoặc placeholder ('chưa có', 'trống', 'n/a'...) thì KHÔNG tính.
 */
export function isValidTeacherName(str: string | undefined): boolean {
  if (!str) return false;
  const s = str.trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  if (
    lower === '-' ||
    lower === '--' ||
    lower === 'chưa có' ||
    lower === 'chưa' ||
    lower === 'trống' ||
    lower === 'ko' ||
    lower === 'không' ||
    lower === 'n/a' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower.startsWith('chưa phân') ||
    lower.startsWith('cần tuyển') ||
    lower.startsWith('chưa có') ||
    /^\d+$/.test(s)
  ) {
    return false;
  }
  return true;
}

export function processDayData(data: SpreadsheetData, dayConfig: DayConfig): DayProcessedStats {
  const chessSheet = data.sheets[dayConfig.chessGid];
  const artSheet = data.sheets[dayConfig.artGid];

  let chessOpenedClasses = 0;
  let artOpenedClasses = 0;
  let totalStudents = 0;
  let missingTeacherAlerts = 0;
  let totalTeacherCount = 0;

  const uniqueTeachersSet = new Set<string>();
  const chessTeachersSet = new Set<string>();
  const artTeachersSet = new Set<string>();

  // Danh bạ GV tra cứu bậc nếu ô chỉ có tên
  const teacherDirectoryMap = new Map<string, string>();
  const dbSheet = data.sheets ? (data.sheets['492309054'] || Object.values(data.sheets).find(s => s.name?.toLowerCase().includes('danh bạ') || s.name?.toLowerCase().includes('danh ba'))) : undefined;
  if (dbSheet && dbSheet.rows) {
    dbSheet.rows.slice(1).forEach(r => {
      const name = r[1]?.trim().toLowerCase();
      const rank = r[2]?.trim();
      if (name && rank) {
        teacherDirectoryMap.set(name, rank);
      }
    });
  }

  const teacherRankMap = new Map<string, string>(); // cleanName -> rank
  const rankAssignmentsMap = new Map<string, number>(); // rank -> count

  const chessTeacherRankMap = new Map<string, string>(); // cleanName -> rank (cờ)
  const chessRankAssignmentsMap = new Map<string, number>(); // rank -> count (cờ)

  const artTeacherRankMap = new Map<string, string>(); // cleanName -> rank (vẽ)
  const artRankAssignmentsMap = new Map<string, number>(); // rank -> count (vẽ)

  // Map: normalized timeSlot -> normalized campus -> { chess: 0, art: 0, chessTeachers: [], artTeachers: [] }
  const slotCampusMap = new Map<string, Map<string, { chess: number; art: number; chessTeachers: string[]; artTeachers: string[] }>>();
  const classList: ClassDetailItem[] = [];
  const campusesSet = new Set<string>();

  // 1. Process Chess Sheet
  if (chessSheet && chessSheet.rows) {
    let currentCampus = '';
    const rows = chessSheet.rows.slice(2); // Skip date row & header row

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => !c.trim())) continue;

      if (row[0]?.trim() && !row[0].toLowerCase().includes('tổng')) {
        currentCampus = normalizeCampus(row[0]);
      }
      if (!currentCampus) continue;
      campusesSet.add(currentCampus);

      const rawSlot = row[1]?.trim();
      if (!rawSlot || !rawSlot.includes('-')) continue;
      const timeSlot = normalizeTimeSlot(rawSlot);

      const slHv = parseInt(row[2]?.trim() || '0', 10) || 0;
      const slGvCan = parseInt(row[3]?.trim() || '0', 10) || 0;
      const tinhTrangLop = row[4]?.trim() || (slHv > 0 ? 'Đã mở lớp' : 'Chưa mở lớp');
      const gvCoCell = parseInt(row[5]?.trim() || '0', 10) || 0;
      const canhBao = row[6]?.trim() || (slGvCan > gvCoCell ? 'Thiếu' : 'Đủ');

      const gvChinh = row[7]?.trim() || '';
      const gvThu2 = row[8]?.trim() || '';
      const gvThu3 = row[9]?.trim() || '';
      const gvThu4 = row[10]?.trim() || '';

      // YÊU CẦU: CHỈ TỔNG HỢP NẾU CÓ TÊN, KHÔNG CÓ THÌ KHỎI
      const teacherList = [gvChinh, gvThu2, gvThu3, gvThu4].filter(isValidTeacherName);
      const namedCount = teacherList.length;

      const isOpened = tinhTrangLop.toLowerCase().includes('đã mở') || (slHv > 0 && !tinhTrangLop.toLowerCase().includes('chưa'));
      if (isOpened) {
        chessOpenedClasses++;
      }
      totalStudents += slHv;
      if (canhBao.toLowerCase().includes('thiếu')) {
        missingTeacherAlerts++;
      }
      totalTeacherCount += namedCount;
      teacherList.forEach(t => {
        const cleanName = t.split('-')[0].trim();
        chessTeachersSet.add(cleanName);
        uniqueTeachersSet.add(cleanName);
        const rank = extractTeacherRank(t, teacherDirectoryMap);
        teacherRankMap.set(cleanName, rank);
        rankAssignmentsMap.set(rank, (rankAssignmentsMap.get(rank) || 0) + 1);
        chessTeacherRankMap.set(cleanName, rank);
        chessRankAssignmentsMap.set(rank, (chessRankAssignmentsMap.get(rank) || 0) + 1);
      });

      // Group into time slots
      if (!slotCampusMap.has(timeSlot)) {
        slotCampusMap.set(timeSlot, new Map());
      }
      const cMap = slotCampusMap.get(timeSlot)!;
      if (!cMap.has(currentCampus)) {
        cMap.set(currentCampus, { chess: 0, art: 0, chessTeachers: [], artTeachers: [] });
      }
      const campRecord = cMap.get(currentCampus)!;
      campRecord.chess += namedCount;
      campRecord.chessTeachers.push(...teacherList);

      classList.push({
        id: `chess-${i}`,
        subject: 'Cờ vua',
        campus: currentCampus,
        timeSlot,
        slHv,
        slGvCan,
        gvCo: namedCount,
        tinhTrangLop: isOpened ? 'Đã mở lớp' : 'Chưa mở lớp',
        canhBao: canhBao.toLowerCase().includes('thiếu') ? 'Thiếu' : 'Đủ',
        gvChinh,
        gvThu2,
        gvThu3,
        gvThu4
      });
    }
  }

  // 2. Process Art Sheet
  if (artSheet && artSheet.rows) {
    let currentCampus = '';
    const rows = artSheet.rows.slice(2);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => !c.trim())) continue;

      if (row[0]?.trim() && !row[0].toLowerCase().includes('tổng')) {
        currentCampus = normalizeCampus(row[0]);
      }
      if (!currentCampus) continue;
      campusesSet.add(currentCampus);

      const rawSlot = row[1]?.trim();
      if (!rawSlot || !rawSlot.includes('-')) continue;
      const timeSlot = normalizeTimeSlot(rawSlot);

      const slHv = parseInt(row[2]?.trim() || '0', 10) || 0;
      const slGvCan = parseInt(row[3]?.trim() || '0', 10) || 0;
      // In Art sheets, col 4 is Ghi chú, col 5 is Tình trạng lớp, col 6 is GV có, col 7 is Cảnh báo
      const tinhTrangLop = row[5]?.trim() || (slHv > 0 ? 'Đã mở lớp' : 'Chưa mở lớp');
      const gvCoCell = parseInt(row[6]?.trim() || '0', 10) || 0;
      const canhBao = row[7]?.trim() || (slGvCan > gvCoCell ? 'Thiếu' : 'Đủ');

      const gvChinh = row[8]?.trim() || '';
      const gvThu2 = row[9]?.trim() || '';
      const gvThu3 = row[10]?.trim() || '';
      const gvThu4 = row[11]?.trim() || '';

      // YÊU CẦU: CHỈ TỔNG HỢP NẾU CÓ TÊN, KHÔNG CÓ THÌ KHỎI
      const teacherList = [gvChinh, gvThu2, gvThu3, gvThu4].filter(isValidTeacherName);
      const namedCount = teacherList.length;

      const isOpened = tinhTrangLop.toLowerCase().includes('đã mở') || (slHv > 0 && !tinhTrangLop.toLowerCase().includes('chưa'));
      if (isOpened) {
        artOpenedClasses++;
      }
      totalStudents += slHv;
      if (canhBao.toLowerCase().includes('thiếu')) {
        missingTeacherAlerts++;
      }
      totalTeacherCount += namedCount;
      teacherList.forEach(t => {
        const cleanName = t.split('-')[0].trim();
        artTeachersSet.add(cleanName);
        uniqueTeachersSet.add(cleanName);
        const rank = extractTeacherRank(t, teacherDirectoryMap);
        teacherRankMap.set(cleanName, rank);
        rankAssignmentsMap.set(rank, (rankAssignmentsMap.get(rank) || 0) + 1);
        artTeacherRankMap.set(cleanName, rank);
        artRankAssignmentsMap.set(rank, (artRankAssignmentsMap.get(rank) || 0) + 1);
      });

      if (!slotCampusMap.has(timeSlot)) {
        slotCampusMap.set(timeSlot, new Map());
      }
      const cMap = slotCampusMap.get(timeSlot)!;
      if (!cMap.has(currentCampus)) {
        cMap.set(currentCampus, { chess: 0, art: 0, chessTeachers: [], artTeachers: [] });
      }
      const campRecord = cMap.get(currentCampus)!;
      campRecord.art += namedCount;
      campRecord.artTeachers.push(...teacherList);

      classList.push({
        id: `art-${i}`,
        subject: 'Lớp vẽ',
        campus: currentCampus,
        timeSlot,
        slHv,
        slGvCan,
        gvCo: namedCount,
        tinhTrangLop: isOpened ? 'Đã mở lớp' : 'Chưa mở lớp',
        canhBao: canhBao.toLowerCase().includes('thiếu') ? 'Thiếu' : 'Đủ',
        gvChinh,
        gvThu2,
        gvThu3,
        gvThu4
      });
    }
  }

  // Sort time slots chronologically
  const sortedSlots = Array.from(slotCampusMap.keys()).sort();

  const timeSlotsData: TimeSlotData[] = sortedSlots.map(slot => {
    const cMap = slotCampusMap.get(slot)!;
    const campuses: CampusTeacherSlot[] = [];
    let slotTotal = 0;

    cMap.forEach((v, camp) => {
      const total = v.chess + v.art;
      if (total > 0) {
        slotTotal += total;
        campuses.push({
          campus: camp,
          hex: getCampusColor(camp).hex,
          total,
          chess: v.chess,
          art: v.art,
          chessTeachers: v.chessTeachers,
          artTeachers: v.artTeachers
        });
      }
    });

    // Sort campuses by total descending
    campuses.sort((a, b) => b.total - a.total);

    return {
      timeSlot: slot,
      totalTeachers: slotTotal,
      campuses
    };
  });

  // Trích xuất trực tiếp số liệu chính xác từ dòng "Tổng" của Google Sheet theo link thực tế
  let linkChessStudents = 0;
  let linkChessClasses = 0;
  let linkChessTeachers = 0;
  if (chessSheet && chessSheet.rows) {
    const totalRow = chessSheet.rows.find(r => r[0]?.trim().toLowerCase().startsWith('tổng'));
    if (totalRow) {
      linkChessStudents = parseInt(totalRow[2]?.trim() || '0', 10) || 0;
      linkChessClasses = parseInt(totalRow[3]?.trim() || '0', 10) || 0;
      linkChessTeachers = parseInt(totalRow[5]?.trim() || '0', 10) || 0;
    }
    if (linkChessTeachers === 0) {
      chessSheet.rows.slice(2).forEach(r => {
        if (!r[0]?.toLowerCase().includes('tổng')) {
          linkChessTeachers += parseInt(r[5]?.trim() || '0', 10) || 0;
        }
      });
    }
  }

  let linkArtStudents = 0;
  let linkArtClasses = 0;
  let linkArtTeachers = 0;
  if (artSheet && artSheet.rows) {
    const totalRow = artSheet.rows.find(r => r[0]?.trim().toLowerCase().startsWith('tổng'));
    if (totalRow) {
      linkArtStudents = parseInt(totalRow[2]?.trim() || '0', 10) || 0;
      linkArtClasses = parseInt(totalRow[3]?.trim() || '0', 10) || 0;
      linkArtTeachers = parseInt(totalRow[6]?.trim() || '0', 10) || 0;
    }
    if (linkArtTeachers === 0) {
      artSheet.rows.slice(2).forEach(r => {
        if (!r[0]?.toLowerCase().includes('tổng')) {
          linkArtTeachers += parseInt(r[6]?.trim() || '0', 10) || 0;
        }
      });
    }
  }

  // Số ca dạy thực tế của từng môn
  const chessNamedAssignments = Array.from(chessRankAssignmentsMap.values()).reduce((a, b) => a + b, 0);
  const artNamedAssignments = Array.from(artRankAssignmentsMap.values()).reduce((a, b) => a + b, 0);

  // Lấy chính xác số lượng giáo viên theo link Sheet (cột "GV có" / dòng "Tổng")
  const actualChessAssignments = linkChessTeachers > 0 ? linkChessTeachers : (chessNamedAssignments > 0 ? chessNamedAssignments : chessTeachersSet.size);
  const actualArtAssignments = linkArtTeachers > 0 ? linkArtTeachers : (artNamedAssignments > 0 ? artNamedAssignments : artTeachersSet.size);
  const totalTeacherAssignments = actualChessAssignments + actualArtAssignments;

  // Yêu cầu: "1gv dạy nhiều ca thì chỉ tính 1" và "tổng gv phải bằng cả 2 cộng lại chứ"
  // 1. Số lượng GV Cờ: Mỗi GV chỉ tính 1 người dù dạy nhiều ca trong ngày
  const finalChessTeachers = chessTeachersSet.size;
  // 2. Số lượng GV Vẽ: Mỗi GV chỉ tính 1 người dù dạy nhiều ca trong ngày
  const finalArtTeachers = artTeachersSet.size;
  // 3. Tổng số GV: Đúng bằng Số GV Cờ + Số GV Vẽ (chuẩn xác cả 2 cộng lại)
  const finalTotalTeachers = finalChessTeachers + finalArtTeachers;

  const finalChessClasses = linkChessClasses > 0 ? linkChessClasses : chessOpenedClasses;
  const finalArtClasses = linkArtClasses > 0 ? linkArtClasses : artOpenedClasses;
  const finalTotalClasses = finalChessClasses + finalArtClasses;

  const finalTotalStudents = (linkChessStudents + linkArtStudents) > 0 ? (linkChessStudents + linkArtStudents) : totalStudents;

  // Xây dựng danh sách thống kê bậc giáo viên cho ngày đang chọn - Sử dụng 7 màu chính thức
  const rankOrder = [
    {
      rank: 'Bậc 01',
      label: 'Bậc 01',
      bgClass: 'bg-[#3EA8E0]/20',
      textClass: 'text-[#3EA8E0]',
      borderClass: 'border-[#3EA8E0]/40',
      barClass: 'bg-[#3EA8E0]'
    },
    {
      rank: 'Bậc 02',
      label: 'Bậc 02',
      bgClass: 'bg-[#4CAF8A]/20',
      textClass: 'text-[#4CAF8A]',
      borderClass: 'border-[#4CAF8A]/40',
      barClass: 'bg-[#4CAF8A]'
    },
    {
      rank: 'Bậc 2,5',
      label: 'Bậc 2,5',
      bgClass: 'bg-[#1B5EA6]/30',
      textClass: 'text-[#3EA8E0]',
      borderClass: 'border-[#1B5EA6]/60',
      barClass: 'bg-[#1B5EA6]'
    },
    {
      rank: 'Bậc 03',
      label: 'Bậc 03',
      bgClass: 'bg-[#9B7FD4]/20',
      textClass: 'text-[#9B7FD4]',
      borderClass: 'border-[#9B7FD4]/40',
      barClass: 'bg-[#9B7FD4]'
    },
    {
      rank: 'Bậc 3,5',
      label: 'Bậc 3,5',
      bgClass: 'bg-[#F9C846]/20',
      textClass: 'text-[#F9C846]',
      borderClass: 'border-[#F9C846]/40',
      barClass: 'bg-[#F9C846]'
    },
    {
      rank: 'Bậc 04',
      label: 'Bậc 04',
      bgClass: 'bg-[#F2775A]/20',
      textClass: 'text-[#F2775A]',
      borderClass: 'border-[#F2775A]/40',
      barClass: 'bg-[#F2775A]'
    },
    {
      rank: 'Học việc',
      label: 'Học việc',
      bgClass: 'bg-[#F9C846]/20',
      textClass: 'text-[#F9C846]',
      borderClass: 'border-[#F9C846]/40',
      barClass: 'bg-[#F9C846]'
    },
    {
      rank: 'Khác',
      label: 'Khác / Chưa phân bậc',
      bgClass: 'bg-[#1A3A5C]',
      textClass: 'text-[#3EA8E0]',
      borderClass: 'border-[#1B5EA6]/50',
      barClass: 'bg-[#1B5EA6]'
    }
  ];

  const buildRankList = (
    rankMap: Map<string, string>,
    assignMap: Map<string, number>,
    totalUniqueCount: number
  ): TeacherRankStats[] => {
    const counts = new Map<string, number>();
    rankMap.forEach(r => counts.set(r, (counts.get(r) || 0) + 1));
    const denom = totalUniqueCount || 1;
    return rankOrder
      .map(ro => {
        const uCount = counts.get(ro.rank) || 0;
        const aCount = assignMap.get(ro.rank) || 0;
        const pct = Math.round((uCount / denom) * 100);
        return {
          rank: ro.rank,
          label: ro.label,
          uniqueTeachersCount: uCount,
          totalAssignmentsCount: aCount,
          percentage: pct,
          bgClass: ro.bgClass,
          textClass: ro.textClass,
          borderClass: ro.borderClass,
          barClass: ro.barClass
        };
      })
      .filter(ro => ro.uniqueTeachersCount > 0 || ['Bậc 01', 'Bậc 02', 'Bậc 03', 'Bậc 04'].includes(ro.rank));
  };

  const rankBreakdown = buildRankList(teacherRankMap, rankAssignmentsMap, uniqueTeachersSet.size);
  const chessRankBreakdown = buildRankList(chessTeacherRankMap, chessRankAssignmentsMap, chessTeachersSet.size);
  const artRankBreakdown = buildRankList(artTeacherRankMap, artRankAssignmentsMap, artTeachersSet.size);

  return {
    dayConfig,
    totalOpenedClasses: finalTotalClasses,
    chessOpenedClasses: finalChessClasses,
    artOpenedClasses: finalArtClasses,
    totalClasses: classList.length,
    totalStudents: finalTotalStudents,
    missingTeacherAlerts,
    totalTeacherCount: finalTotalTeachers,
    uniqueTeacherCount: uniqueTeachersSet.size,
    chessTeacherCount: finalChessTeachers,
    artTeacherCount: finalArtTeachers,
    chessUniqueTeacherCount: chessTeachersSet.size,
    artUniqueTeacherCount: artTeachersSet.size,
    totalAssignmentsCount: totalTeacherAssignments,
    chessAssignmentsCount: actualChessAssignments,
    artAssignmentsCount: actualArtAssignments,
    rankBreakdown,
    chessRankBreakdown,
    artRankBreakdown,
    timeSlotsData,
    classList,
    allCampusesInDay: Array.from(campusesSet).sort()
  };
}

export const ALL_SYSTEM_CAMPUSES = [
  'An Phú', 'Bình Tân', 'Dream Home', 'Gia Hòa', 'Gigamall', 'Gò Vấp', 'Hà Đô',
  'Moonlight', 'Nguyễn Duy Trinh', 'Nhà Thiếu Nhi Thủ Đức', 'Phú Nhuận', 'Phổ Quang', 'Quận 12', 'Quận 6',
  'Richmond', 'Richstar', 'Thạnh Mỹ Lợi', 'Tân Bình', 'Tân Phú', 'Vinhomes'
];

export interface CampusActiveInfo {
  campus: string;
  isOpen: boolean;
  openedClassesCount: number;
  totalClassesCount: number;
  studentsCount: number;
  teachersCount: number;
  hasChess: boolean;
  hasArt: boolean;
}

export interface DayCampusStats {
  dayId: string;
  dayName: string;
  dateStr: string;
  activeCount: number;
  totalCount: number;
  percentage: number;
  activeCampuses: string[];
  inactiveCampuses: string[];
  campusList: CampusActiveInfo[];
  chessActiveCount: number;
  artActiveCount: number;
}

export function computeDayCampusStats(data: SpreadsheetData, dayConfig: DayConfig): DayCampusStats {
  const stats = processDayData(data, dayConfig);
  
  // Tổng cơ sở toàn hệ thống theo link (bao gồm Nhà Thiếu Nhi Thủ Đức)
  const fullCampusList = ALL_SYSTEM_CAMPUSES;

  const campusInfoMap = new Map<string, CampusActiveInfo>();
  fullCampusList.forEach(camp => {
    campusInfoMap.set(camp, {
      campus: camp,
      isOpen: false,
      openedClassesCount: 0,
      totalClassesCount: 0,
      studentsCount: 0,
      teachersCount: 0,
      hasChess: false,
      hasArt: false,
    });
  });

  stats.classList.forEach(cls => {
    if (isIgnoredCampus(cls.campus)) return;
    const info = campusInfoMap.get(cls.campus);
    if (!info) return;

    info.totalClassesCount++;
    info.studentsCount += cls.slHv;
    info.teachersCount += cls.gvCo;

    // Chỉ tính có lớp hoạt động khi có giáo viên
    if (cls.gvCo > 0) {
      info.openedClassesCount++;
      if (cls.subject === 'Cờ vua') info.hasChess = true;
      if (cls.subject === 'Lớp vẽ') info.hasArt = true;
    }
  });

  const activeCampuses: string[] = [];
  const inactiveCampuses: string[] = [];
  let chessActiveCount = 0;
  let artActiveCount = 0;

  const campusList: CampusActiveInfo[] = [];
  fullCampusList.forEach(camp => {
    const info = campusInfoMap.get(camp)!;
    // YÊU CẦU: CÁC CƠ SỞ HOẠT ĐỘNG CHỈ TÍNH NHỮNG CÁI NÀO CÓ GV, KHÔNG CÓ THÌ COI NHƯ KHÔNG HOẠT ĐỘNG
    info.isOpen = info.teachersCount > 0;
    campusList.push(info);
    if (info.isOpen) {
      activeCampuses.push(camp);
      if (info.hasChess) chessActiveCount++;
      if (info.hasArt) artActiveCount++;
    } else {
      inactiveCampuses.push(camp);
    }
  });

  const totalCount = fullCampusList.length; // Tổng số cơ sở toàn hệ thống (bao gồm Nhà Thiếu Nhi Thủ Đức)
  const activeCount = activeCampuses.length;
  const percentage = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

  return {
    dayId: dayConfig.id,
    dayName: dayConfig.name,
    dateStr: dayConfig.date,
    activeCount,
    totalCount,
    percentage,
    activeCampuses,
    inactiveCampuses,
    campusList,
    chessActiveCount,
    artActiveCount
  };
}

