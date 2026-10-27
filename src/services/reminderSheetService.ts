/**
 * Service to fetch and process data from the "nhắc nhở" Google Sheet tab
 * Spreadsheet ID: 1003lfdUh6S_Tkg5H4qChw7KrziAon1uvgkoFMj9FK0E
 * GID: 1091093608 (Sheet: "nhắc nhở")
 */

import Papa from 'papaparse';
import { normalizeFacilityName } from '../utils/facilityUtils';
import { normalizeDateToIso } from '../utils/dateUtils';

export const REMINDER_SHEET_ID = '1003lfdUh6S_Tkg5H4qChw7KrziAon1uvgkoFMj9FK0E';
export const REMINDER_SHEET_GID = '1091093608';
export const REMINDER_SHEET_NAME = 'nhắc nhở';

export const REMINDER_CSV_DIRECT_URL = `https://docs.google.com/spreadsheets/d/${REMINDER_SHEET_ID}/export?format=csv&gid=${REMINDER_SHEET_GID}`;

export interface ReminderSheetRow {
  id: string;
  ngay: string;
  ngayIso: string;
  coSo: string;
  lyDoCanhBao: string;
  soLoi: number;
  daNhacNho: boolean;
  loiApp: boolean;
  trangThaiNhanDinh: string;
  nguoiXuLy: string;
  thoiGianXuLy: string;
  thoiGianDongBo: string;
  isReminded: boolean;
}

export interface FacilityReminderAggregation {
  coSo: string;
  totalAuditedCount: number;
  remindedCount: number;
  appErrorCount: number;
  pendingCount: number;
  isEscalated: boolean; // remindedCount >= 3
  severity: 'critical' | 'high' | 'watch' | 'clean';
  latestRemindedDate: string;
  latestRemindedDateIso: string;
  latestReason: string;
  remindedRecords: ReminderSheetRow[];
  allRecords: ReminderSheetRow[];
}

export interface ReminderReportSummary {
  totalRecords: number;
  totalRemindedCount: number;
  escalatedFacilitiesCount: number; // >= 3 reminders (Báo Trưởng Nhóm)
  watchFacilitiesCount: number; // 1-2 reminders (Nhắc nhở 1-2 lần)
  cleanFacilitiesCount: number; // 0 reminders
  minDate: string;
  maxDate: string;
  lastSyncTime: Date;
  facilities: FacilityReminderAggregation[];
}

/**
 * Fetch raw CSV data from the proxy or directly from Google Sheets
 */
export async function fetchReminderSheetCsv(): Promise<string> {
  const sources = [
    '/api/warning-reminders-data',
    REMINDER_CSV_DIRECT_URL,
  ];

  let lastError: unknown;

  for (const src of sources) {
    try {
      const response = await fetch(src, {
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const body = await response.text();
      const contentType = response.headers.get('content-type')?.toLowerCase() || '';

      // Check if response is JSON from server proxy
      if (contentType.includes('application/json') || body.trimStart().startsWith('{')) {
        try {
          const json = JSON.parse(body);
          if (json.success && json.data?.csv) {
            return json.data.csv;
          }
        } catch {
          // not JSON, continue
        }
      }

      const lower = body.toLowerCase();
      if (
        contentType.includes('text/html') ||
        lower.includes('<!doctype html') ||
        lower.includes('<html') ||
        lower.includes('accounts.google.com')
      ) {
        throw new Error('Nguồn dữ liệu trả về HTML thay vì CSV');
      }

      // Valid reminder sheet CSV must have "Cơ sở" or "coSo"
      if (!lower.includes('cơ sở') && !lower.includes('coso')) {
        throw new Error('Dữ liệu không phải là bảng nhắc nhở cơ sở');
      }

      if (body.trim().length > 0) {
        return body;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Lỗi tải dữ liệu từ ${src}:`, err);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Không thể kết nối đến Google Sheet "nhắc nhở"');
}

/**
 * Parse CSV and aggregate reminder data by facility
 */
export async function loadReminderReportData(): Promise<ReminderReportSummary> {
  const csvText = await fetchReminderSheetCsv();
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const rawRows: ReminderSheetRow[] = [];
  let minDate = '';
  let maxDate = '';

  parsed.data.forEach((row, index) => {
    const rawFacility = row['Cơ sở'] || row['coSo'] || '';
    if (!rawFacility.trim()) return;

    const coSo = normalizeFacilityName(rawFacility.trim());
    const ngayRaw = (row['Ngày'] || row['ngay'] || '').trim();
    const ngayIso = normalizeDateToIso(ngayRaw);

    const lyDoCanhBao = (row['Lý do cảnh báo'] || row['lyDoCanhBao'] || '').trim();
    const soLoiRaw = Number(row['Số lỗi'] || row['soLoi'] || 1);
    const soLoi = Number.isFinite(soLoiRaw) && soLoiRaw > 0 ? soLoiRaw : 1;

    const daNhacNhoRaw = (row['Đã nhắc nhở'] || row['daNhacNho'] || '').trim().toLowerCase();
    const loiAppRaw = (row['Lỗi app'] || row['loiApp'] || '').trim().toLowerCase();
    const trangThaiNhanDinh = (row['Trạng thái nhận định'] || row['trangThai'] || 'Chưa nhận định').trim();

    const daNhacNho = daNhacNhoRaw === 'có' || daNhacNhoRaw === 'true' || daNhacNhoRaw === 'yes' || daNhacNhoRaw === '1';
    const loiApp = loiAppRaw === 'có' || loiAppRaw === 'true' || loiAppRaw === 'yes' || loiAppRaw === '1';
    const isReminded = daNhacNho || trangThaiNhanDinh === 'Đã nhắc nhở';

    const nguoiXuLy = (row['Người xử lý'] || '').trim() || (isReminded ? 'Quản lý kiểm tra' : '');
    const thoiGianXuLy = (row['Thời gian xử lý'] || '').trim();
    const thoiGianDongBo = (row['Thời gian đồng bộ'] || '').trim();

    if (ngayRaw) {
      if (!minDate || ngayRaw < minDate) minDate = ngayRaw;
      if (!maxDate || ngayRaw > maxDate) maxDate = ngayRaw;
    }

    rawRows.push({
      id: `${coSo}_${ngayRaw}_${index}`,
      ngay: ngayRaw,
      ngayIso,
      coSo,
      lyDoCanhBao,
      soLoi,
      daNhacNho,
      loiApp,
      trangThaiNhanDinh: isReminded ? 'Đã nhắc nhở' : loiApp ? 'Lỗi app' : trangThaiNhanDinh,
      nguoiXuLy,
      thoiGianXuLy,
      thoiGianDongBo,
      isReminded,
    });
  });

  // Group by facility
  const map = new Map<string, FacilityReminderAggregation>();

  rawRows.forEach(item => {
    let agg = map.get(item.coSo);
    if (!agg) {
      agg = {
        coSo: item.coSo,
        totalAuditedCount: 0,
        remindedCount: 0,
        appErrorCount: 0,
        pendingCount: 0,
        isEscalated: false,
        severity: 'clean',
        latestRemindedDate: '',
        latestRemindedDateIso: '',
        latestReason: '',
        remindedRecords: [],
        allRecords: [],
      };
      map.set(item.coSo, agg);
    }

    agg.totalAuditedCount += 1;
    agg.allRecords.push(item);

    if (item.isReminded) {
      agg.remindedCount += 1;
      agg.remindedRecords.push(item);
      if (!agg.latestRemindedDate || item.ngay > agg.latestRemindedDate) {
        agg.latestRemindedDate = item.ngay;
        agg.latestRemindedDateIso = item.ngayIso;
        agg.latestReason = item.lyDoCanhBao;
      }
    } else if (item.loiApp || item.trangThaiNhanDinh === 'Lỗi app') {
      agg.appErrorCount += 1;
    } else {
      agg.pendingCount += 1;
    }
  });

  // Calculate severity & escalation status
  const facilities: FacilityReminderAggregation[] = [];
  let totalReminded = 0;
  let escalatedCount = 0;
  let watchCount = 0;
  let cleanCount = 0;

  map.forEach(agg => {
    // Sort records descending by date
    agg.remindedRecords.sort((a, b) => b.ngay.localeCompare(a.ngay));
    agg.allRecords.sort((a, b) => b.ngay.localeCompare(a.ngay));

    // Update latest reason if available
    if (agg.remindedRecords.length > 0) {
      agg.latestReason = agg.remindedRecords[0].lyDoCanhBao;
      agg.latestRemindedDate = agg.remindedRecords[0].ngay;
    }

    agg.isEscalated = agg.remindedCount >= 3;

    if (agg.remindedCount >= 4) {
      agg.severity = 'critical';
      escalatedCount += 1;
    } else if (agg.remindedCount === 3) {
      agg.severity = 'high';
      escalatedCount += 1;
    } else if (agg.remindedCount >= 1) {
      // Nhóm nhắc nhở 1-2 lần
      agg.severity = 'watch';
      watchCount += 1;
    } else {
      agg.severity = 'clean';
      cleanCount += 1;
    }

    totalReminded += agg.remindedCount;
    facilities.push(agg);
  });

  // Sort: Escalated facilities first (by remindedCount desc), then by name
  facilities.sort((a, b) => {
    if (b.remindedCount !== a.remindedCount) {
      return b.remindedCount - a.remindedCount;
    }
    return a.coSo.localeCompare(b.coSo, 'vi');
  });

  return {
    totalRecords: rawRows.length,
    totalRemindedCount: totalReminded,
    escalatedFacilitiesCount: escalatedCount,
    watchFacilitiesCount: watchCount,
    cleanFacilitiesCount: cleanCount,
    minDate,
    maxDate,
    lastSyncTime: new Date(),
    facilities,
  };
}

/**
 * Rút gọn chuỗi ngày: Bỏ năm 2026 (ví dụ: "29/09/2026" -> "29/09")
 */
export function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '';
  const str = dateStr.trim();
  const dmyMatch = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-]202\d$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    return `${day}/${month}`;
  }
  const ymdMatch = str.match(/^202\d[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (ymdMatch) {
    const month = ymdMatch[1].padStart(2, '0');
    const day = ymdMatch[2].padStart(2, '0');
    return `${day}/${month}`;
  }
  return str.replace(/[/.-]202\d\b/g, '').trim();
}

export interface GroupedViolationReason {
  name: string;
  count: number;
  dates: string[];
}

/**
 * Phân loại và đếm số lần của các loại lỗi vi phạm:
 * 3 loại lỗi chính:
 * 1. "Chưa có báo cáo"
 * 2. "Thiếu chỉ tiêu"
 * 3. "Điểm thấp"
 */
export function parseAndGroupViolationReasons(
  records: Array<{ ngay?: string; lyDoCanhBao?: string }>,
  fallbackReason?: string,
  fallbackDate?: string,
): GroupedViolationReason[] {
  const items = records && records.length > 0
    ? records
    : fallbackReason
      ? [{ ngay: fallbackDate || '', lyDoCanhBao: fallbackReason }]
      : [];

  if (items.length === 0) return [];

  const groups = new Map<string, { count: number; dates: Set<string> }>();

  const addReason = (category: string, date: string) => {
    if (!groups.has(category)) {
      groups.set(category, { count: 0, dates: new Set() });
    }
    const g = groups.get(category)!;
    g.count += 1;
    if (date && date.trim()) {
      g.dates.add(formatShortDate(date));
    }
  };

  items.forEach(item => {
    const raw = (item.lyDoCanhBao || '').trim();
    const date = (item.ngay || '').trim();
    if (!raw) return;

    // Phân tách nếu có nhiều lỗi ngăn cách bởi dấu chấm phẩy, xuống dòng, hoặc gạch dọc
    const parts = raw.split(/[;\n|]+/).map(p => p.trim()).filter(Boolean);
    const matchedInThisRecord = new Set<string>();

    parts.forEach(part => {
      const lower = part.toLowerCase();

      let category = '';
      if (
        lower.includes('chưa có báo cáo') ||
        lower.includes('chưa báo cáo') ||
        lower.includes('chua bao cao') ||
        lower.includes('không có báo cáo') ||
        lower.includes('chưa làm báo cáo')
      ) {
        category = 'Chưa có báo cáo';
      } else if (
        lower.includes('thiếu chỉ tiêu') ||
        lower.includes('thieu chi tieu') ||
        lower.includes('chỉ tiêu') ||
        lower.includes('thiếu lượt')
      ) {
        category = 'Thiếu chỉ tiêu';
      } else if (
        lower.includes('điểm thấp') ||
        lower.includes('diem thap') ||
        lower.includes('dưới 70') ||
        lower.includes('duoi 70') ||
        lower.includes('< 70') ||
        lower.includes('thấp điểm')
      ) {
        category = 'Điểm thấp';
      } else {
        category = part.replace(/\(.*?\)/g, '').trim() || part;
      }

      if (category && !matchedInThisRecord.has(category)) {
        matchedInThisRecord.add(category);
        addReason(category, date);
      }
    });

    if (matchedInThisRecord.size === 0) {
      const lower = raw.toLowerCase();
      let category = 'Chưa có báo cáo';
      if (lower.includes('chỉ tiêu') || lower.includes('thiếu')) {
        category = 'Thiếu chỉ tiêu';
      } else if (lower.includes('điểm') || lower.includes('70')) {
        category = 'Điểm thấp';
      } else {
        category = raw.slice(0, 50);
      }
      addReason(category, date);
    }
  });

  const standardOrder = ['Chưa có báo cáo', 'Thiếu chỉ tiêu', 'Điểm thấp'];

  const result: GroupedViolationReason[] = [];
  groups.forEach((val, name) => {
    result.push({
      name,
      count: val.count,
      dates: Array.from(val.dates),
    });
  });

  result.sort((a, b) => {
    const idxA = standardOrder.indexOf(a.name);
    const idxB = standardOrder.indexOf(b.name);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return b.count - a.count;
  });

  return result;
}

/**
 * Helper to build formatted message for Team Leader (Zalo / Telegram / Email)
 */
export function generateTeamLeaderEscalationMessage(summary: ReminderReportSummary): string {
  const escalated = summary.facilities.filter(f => f.isEscalated);
  const now = new Date();
  const dateStr = now.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  let message = `🚨 [CẢNH BÁO VẬN HÀNH] BÁO CÁO CÁC CƠ SỞ BỊ NHẮC NHỞ TRÊN 3 LẦN\n`;
  message += `⏱️ Thời gian xuất báo cáo: ${timeStr} ngày ${dateStr}\n`;
  message += `📊 Nguồn dữ liệu: Google Sheet "nhắc nhở" (Tổng ${summary.totalRemindedCount} lượt nhắc nhở)\n`;
  message += `⚠️ Số cơ sở cần Trưởng nhóm xử lý: ${escalated.length} cơ sở\n`;
  message += `------------------------------------\n\n`;

  if (escalated.length === 0) {
    message += `✅ Hiện tại không có cơ sở nào bị nhắc nhở trên 3 lần.\n`;
  } else {
    escalated.forEach((item, idx) => {
      const icon = item.remindedCount >= 4 ? '🔴' : '🟠';
      message += `${idx + 1}. ${icon} ${item.coSo.toUpperCase()}: ${item.remindedCount} LẦN NHẮC NHỞ\n`;
      if (item.remindedRecords.length > 0) {
        message += `   • Các ngày nhắc nhở: ${item.remindedRecords.map(r => formatShortDate(r.ngay)).join(', ')}\n`;
      }
      const grouped = parseAndGroupViolationReasons(item.remindedRecords, item.latestReason, item.latestRemindedDate);
      if (grouped.length > 0) {
        message += `   • Lý do vi phạm (tổng hợp theo số lần):\n`;
        grouped.forEach(g => {
          const dateList = g.dates.length > 0 ? ` (Ngày: ${g.dates.join(', ')})` : '';
          message += `     - ${g.name}: ${g.count} lần${dateList}\n`;
        });
      } else if (item.latestReason) {
        message += `   • Chi tiết lỗi: ${item.latestReason}\n`;
      }
      message += `\n`;
    });
  }

  message += `------------------------------------\n`;
  message += `📌 Kính đề nghị Trưởng nhóm làm việc trực tiếp với Quản lý các cơ sở trên để chấn chỉnh kỷ luật kiểm tra và cải thiện chất lượng 5S. Trân trọng!`;

  return message;
}
