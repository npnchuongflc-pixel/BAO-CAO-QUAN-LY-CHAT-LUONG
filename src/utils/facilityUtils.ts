export const OFFICIAL_FACILITIES = [
  'Cơ sở Gò Vấp',
  'Cơ sở An Phú',
  'Cơ sở Thạnh Mỹ Lợi',
  'Cơ sở Vinhomes',
  'Cơ sở Gia Hòa',
  'Cơ sở Tân Bình',
  'Cơ sở Tân Phú',
  'Cơ sở Hiệp Thành',
  'Cơ sở Phú Nhuận',
  'Cơ sở Bình Tân',
  'Cơ sở Dream Home',
  'Cơ sở Gigamall',
  'Cơ sở Hà Đô',
  'Cơ sở Moonlight',
  'Cơ sở Nguyễn Duy Trinh',
  'Cơ sở Richstar',
  'Cơ sở Phổ Quang',
  'Cơ sở RichMond',
  'Cơ sở Bình Phú',
];

export interface TargetItem {
  label: string;
  count: number;
}

export interface FacilityTargetDetail {
  total: number;
  weekday?: number;
  weekend?: number;
  items: TargetItem[];
}

export interface FacilityDayTarget {
  weekday: number; // Thứ 2 đến Thứ 6 (Ngày thường)
  weekend: number; // Thứ 7 & Chủ nhật (Cuối tuần)
}

/**
 * Số lượng ảnh quy định chính thức của từng cơ sở theo ngày thường và cuối tuần
 * Bảng quy định chuẩn: Trong tuần (T2 - T6), Cuối tuần (T7, CN)
 */
export const FACILITY_DAY_TARGETS: Record<string, FacilityDayTarget> = {
  'Cơ sở Gò Vấp': { weekday: 11, weekend: 16 },
  'Cơ sở An Phú': { weekday: 8, weekend: 11 },
  'Cơ sở Thạnh Mỹ Lợi': { weekday: 7, weekend: 7 },
  'Cơ sở Vinhomes': { weekday: 5, weekend: 5 },
  'Cơ sở Gia Hòa': { weekday: 7, weekend: 7 },
  'Cơ sở Tân Bình': { weekday: 8, weekend: 11 },
  'Cơ sở Tân Phú': { weekday: 8, weekend: 8 },
  'Cơ sở Hiệp Thành': { weekday: 8, weekend: 8 },
  'Cơ sở Phú Nhuận': { weekday: 7, weekend: 10 },
  'Cơ sở Bình Tân': { weekday: 8, weekend: 13 },
  'Cơ sở Dream Home': { weekday: 7, weekend: 7 },
  'Cơ sở Gigamall': { weekday: 7, weekend: 7 },
  'Cơ sở Hà Đô': { weekday: 12, weekend: 12 },
  'Cơ sở Moonlight': { weekday: 6, weekend: 6 },
  'Cơ sở Nguyễn Duy Trinh': { weekday: 8, weekend: 8 },
  'Cơ sở Richstar': { weekday: 9, weekend: 9 },
  'Cơ sở Phổ Quang': { weekday: 12, weekend: 12 },
  'Cơ sở RichMond': { weekday: 9, weekend: 9 },
  'Cơ sở Richmond': { weekday: 9, weekend: 9 },
  'Cơ sở Bình Phú': { weekday: 9, weekend: 9 },
};

export const FACILITY_TARGET_DETAILS: Record<string, FacilityTargetDetail> = {
  'Cơ sở Gò Vấp': {
    total: 11,
    weekday: 11,
    weekend: 16,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 2 },
      { label: 'WC cờ', count: 2 },
      { label: 'Phòng vẽ', count: 2 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'WC vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở An Phú': {
    total: 8,
    weekday: 8,
    weekend: 11,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 2 },
      { label: 'WC cờ', count: 1 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Thạnh Mỹ Lợi': {
    total: 7,
    weekday: 7,
    weekend: 7,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 1 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'WC vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Vinhomes': {
    total: 5,
    weekday: 5,
    weekend: 5,
    items: [
      { label: 'Phòng cờ', count: 1 },
      { label: 'Máy lạnh cờ', count: 1 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'WC cờ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Gia Hòa': {
    total: 7,
    weekday: 7,
    weekend: 7,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 1 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'WC vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Tân Bình': {
    total: 8,
    weekday: 8,
    weekend: 11,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 2 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'WC vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Tân Phú': {
    total: 8,
    weekday: 8,
    weekend: 8,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 2 },
      { label: 'WC cờ', count: 1 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Hiệp Thành': {
    total: 8,
    weekday: 8,
    weekend: 8,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 2 },
      { label: 'WC cờ', count: 1 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'WC vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Phú Nhuận': {
    total: 7,
    weekday: 7,
    weekend: 10,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 1 },
      { label: 'WC cờ', count: 1 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Bình Tân': {
    total: 8,
    weekday: 8,
    weekend: 13,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 2 },
      { label: 'WC cờ', count: 1 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Dream Home': {
    total: 7,
    weekday: 7,
    weekend: 7,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 1 },
      { label: 'WC cờ', count: 1 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Gigamall': {
    total: 7,
    weekday: 7,
    weekend: 7,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 1 },
      { label: 'WC cờ', count: 1 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Hà Đô': {
    total: 12,
    weekday: 12,
    weekend: 12,
    items: [
      { label: 'Phòng cờ', count: 3 },
      { label: 'Máy lạnh cờ', count: 3 },
      { label: 'WC cờ', count: 2 },
      { label: 'Phòng vẽ', count: 2 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Moonlight': {
    total: 6,
    weekday: 6,
    weekend: 6,
    items: [
      { label: 'Phòng cờ', count: 1 },
      { label: 'Máy lạnh cờ', count: 1 },
      { label: 'WC cờ', count: 1 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Nguyễn Duy Trinh': {
    total: 8,
    weekday: 8,
    weekend: 8,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 2 },
      { label: 'WC cờ', count: 1 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Richstar': {
    total: 9,
    weekday: 9,
    weekend: 9,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 2 },
      { label: 'WC cờ', count: 2 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Phổ Quang': {
    total: 12,
    weekday: 12,
    weekend: 12,
    items: [
      { label: 'Phòng cờ', count: 3 },
      { label: 'Máy lạnh cờ', count: 3 },
      { label: 'WC cờ', count: 2 },
      { label: 'Phòng vẽ', count: 2 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở RichMond': {
    total: 9,
    weekday: 9,
    weekend: 9,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 2 },
      { label: 'WC cờ', count: 2 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Richmond': {
    total: 9,
    weekday: 9,
    weekend: 9,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 2 },
      { label: 'WC cờ', count: 2 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Bình Phú': {
    total: 9,
    weekday: 9,
    weekend: 9,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 2 },
      { label: 'WC cờ', count: 2 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
};

export interface FacilityRoomConfig {
  co: number; // Lớp cờ
  ve: number; // Lớp vẽ
  nvs: number; // Nhà vệ sinh
  leTan: number; // Lễ tân
}

export function getFacilityRoomConfig(facilityName: string): FacilityRoomConfig {
  const norm = normalizeFacilityName(facilityName);
  const detail = FACILITY_TARGET_DETAILS[norm];
  if (!detail) return { co: 2, ve: 1, nvs: 1, leTan: 1 };

  let co = 0, ve = 0, nvs = 0, leTan = 0;
  for (const item of detail.items) {
    const l = item.label.toLowerCase();
    if (l.includes('cờ') && !l.includes('wc')) co += item.count;
    else if (l.includes('vẽ') && !l.includes('wc')) ve += item.count;
    else if (l.includes('wc') || l.includes('vệ sinh')) nvs += item.count;
    else if (l.includes('lễ tân')) leTan += item.count;
    else co += item.count;
  }
  return { co, ve, nvs, leTan };
}

export function isWeekendDay(dateInput?: string | Date): boolean {
  if (!dateInput) return false;
  let d: Date;
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const [y, m, day] = trimmed.split('T')[0].split('-').map(Number);
      d = new Date(y, m - 1, day);
    } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(trimmed)) {
      const parts = trimmed.split(/[\/\-]/).map(Number);
      d = new Date(parts[2], parts[1] - 1, parts[0]);
    } else {
      d = new Date(trimmed);
    }
  } else {
    d = dateInput;
  }
  if (isNaN(d.getTime())) return false;
  const dayOfWeek = d.getDay(); // 0: Chủ nhật, 6: Thứ 7
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function getFacilityDayTargetConfig(facilityName?: string): FacilityDayTarget {
  if (!facilityName || facilityName === 'all') {
    return { weekday: 156, weekend: 175 };
  }
  const norm = normalizeFacilityName(facilityName);
  if (FACILITY_DAY_TARGETS[norm]) return FACILITY_DAY_TARGETS[norm];
  if (FACILITY_DAY_TARGETS[facilityName]) return FACILITY_DAY_TARGETS[facilityName];

  const searchLower = (norm || facilityName).toLowerCase().trim();
  const foundKey = Object.keys(FACILITY_DAY_TARGETS).find(k => k.toLowerCase().trim() === searchLower);
  if (foundKey) return FACILITY_DAY_TARGETS[foundKey];

  return { weekday: 8, weekend: 8 };
}

export function getFacilityTargetDetail(facilityName: string): FacilityTargetDetail | null {
  if (!facilityName || facilityName === 'all') return null;
  const norm = normalizeFacilityName(facilityName);
  if (FACILITY_TARGET_DETAILS[norm]) return FACILITY_TARGET_DETAILS[norm];
  if (FACILITY_TARGET_DETAILS[facilityName]) return FACILITY_TARGET_DETAILS[facilityName];
  
  // Case insensitive fallback
  const searchLower = (norm || facilityName).toLowerCase().trim();
  const foundKey = Object.keys(FACILITY_TARGET_DETAILS).find(k => k.toLowerCase().trim() === searchLower);
  return foundKey ? FACILITY_TARGET_DETAILS[foundKey] : null;
}

export function getTotalDailyTargetAllFacilities(dateInput?: string | Date): number {
  if (dateInput && isWeekendDay(dateInput)) {
    return 175;
  }
  return 156;
}

export function getFacilityDailyTarget(facilityName?: string, dateInput?: string | Date): number {
  if (!facilityName || facilityName === 'all') {
    return getTotalDailyTargetAllFacilities(dateInput);
  }
  const cfg = getFacilityDayTargetConfig(facilityName);
  if (dateInput) {
    return isWeekendDay(dateInput) ? cfg.weekend : cfg.weekday;
  }
  return cfg.weekday;
}

/**
 * Tính tổng chỉ tiêu chuẩn cho một khoảng thời gian (tính chuẩn từng ngày trong kỳ là ngày thường hay cuối tuần)
 */
export function calculatePeriodTarget(
  facilityName?: string,
  startDate?: string,
  endDate?: string,
  monthFilter?: string,
  metric: 'photos' | 'reports' = 'photos'
): number {
  const cfg = getFacilityDayTargetConfig(facilityName);
  const isReports = metric === 'reports';
  const isAll = !facilityName || facilityName === 'all';

  const getDayTarget = (d: Date): number => {
    if (isReports) {
      return isAll ? 19 : 1;
    }
    return isWeekendDay(d) ? cfg.weekend : cfg.weekday;
  };

  const parseD = (s?: string): Date | null => {
    if (!s) return null;
    const trimmed = s.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const [y, m, d] = trimmed.split('T')[0].split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(trimmed)) {
      const parts = trimmed.split(/[\/\-]/).map(Number);
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    const dt = new Date(trimmed);
    return isNaN(dt.getTime()) ? null : dt;
  };

  // Nếu lọc theo ngày cụ thể (từ ngày - đến ngày)
  if (startDate && endDate) {
    const dStart = parseD(startDate);
    const dEnd = parseD(endDate);
    if (dStart && dEnd && dStart <= dEnd) {
      let total = 0;
      const curr = new Date(dStart);
      while (curr <= dEnd) {
        total += getDayTarget(curr);
        curr.setDate(curr.getDate() + 1);
      }
      return total;
    }
  }

  // Nếu lọc theo tháng (thang: MM/YYYY)
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;
  let daysInMonth = 30;

  if (monthFilter && monthFilter !== 'all') {
    const match = monthFilter.match(/(\d{1,2})[\/\-](\d{4})/);
    if (match) {
      month = parseInt(match[1], 10);
      year = parseInt(match[2], 10);
      daysInMonth = new Date(year, month, 0).getDate();
    }
  }

  let total = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    total += getDayTarget(d);
  }
  return total;
}

export function getDaysInMonthFromFilter(monthFilter?: string): number {
  if (!monthFilter || monthFilter === 'all') return 30;
  const match = monthFilter.match(/(\d{1,2})[\/\-](\d{4})/);
  if (match) {
    const month = parseInt(match[1], 10);
    const year = parseInt(match[2], 10);
    if (month >= 1 && month <= 12 && year > 2000) {
      return new Date(year, month, 0).getDate();
    }
  }
  return 30;
}

export function matchAreaToTargetLabel(areaName: string, targetLabel: string): boolean {
  if (!areaName || !targetLabel) return false;
  const a = areaName.toLowerCase().trim();
  const t = targetLabel.toLowerCase().trim();

  const isAirCon = a.includes('máy lạnh') || a.includes('điều hòa') || a.includes('aircon');
  const isReception = a.includes('lễ tân') || a.includes('tiếp tân') || a.includes('sảnh') || a.includes('đèn led');
  const isWC = a.includes('wc') || a.includes('toilet') || a.includes('nhà vệ sinh') || (a.includes('vệ sinh') && !isReception);
  const isChess = a.includes('cờ') || a.includes('chess');
  const isArt = a.includes('vẽ') || a.includes('art');

  // 1. Máy lạnh cờ / Máy lạnh vẽ
  if (t.includes('máy lạnh') || t.includes('điều hòa')) {
    if (t.includes('cờ')) return isAirCon && isChess;
    if (t.includes('vẽ')) return isAirCon && isArt;
    return isAirCon;
  }

  // 2. WC cờ / WC vẽ / Nhà vệ sinh
  if (t.includes('wc') || t.includes('nhà vệ sinh') || (t.includes('vệ sinh') && !t.includes('lễ tân'))) {
    if (t.includes('cờ')) return isWC && isChess;
    if (t.includes('vẽ')) return isWC && isArt;
    return isWC;
  }

  // 3. Lễ tân (Quầy lễ tân - Vệ sinh quầy lễ tân)
  if (t.includes('lễ tân') || t.includes('tiếp tân') || t.includes('sảnh')) {
    return isReception;
  }

  // 4. Phòng cờ (Chỉ tính các khu vực tổng thể/phòng học cờ, KHÔNG phải máy lạnh, WC, lễ tân)
  if (t === 'phòng cờ' || (t.includes('cờ') && !t.includes('máy lạnh') && !t.includes('wc') && !t.includes('vệ sinh'))) {
    return isChess && !isAirCon && !isWC && !isReception;
  }

  // 5. Phòng vẽ (Chỉ tính các khu vực tổng thể/phòng học vẽ, KHÔNG phải máy lạnh, WC, lễ tân)
  if (t === 'phòng vẽ' || (t.includes('vẽ') && !t.includes('máy lạnh') && !t.includes('wc') && !t.includes('vệ sinh'))) {
    return isArt && !isAirCon && !isWC && !isReception;
  }

  // Fallback match
  return a.includes(t) || t.includes(a);
}

export function isWarningReport(report: any): boolean {
  if (!report) return false;
  if ('diemSo' in report) {
    let s = report.diemSo || 0;
    if (report.diemSoMax && report.diemSoMax <= 10 && s <= 10) s *= 10;
    
    // Score under 85 pt is warning / problem area
    if (s < 85) return true;
    
    const tt = (report.trangThai || '').toLowerCase().trim();
    if (
      tt.includes('không đạt') || 
      tt.includes('cần khắc phục') || 
      tt.includes('cần dọn dẹp') || 
      tt.includes('cần cải thiện') || 
      tt.includes('bẩn nặng') || 
      tt.includes('chưa tắt') ||
      tt.includes('sự cố')
    ) {
      return true;
    }
    
    const combined = `${report.chiTiet || ''} ${report.phanHoi || ''} ${report.feedbackNguoiDung || ''} ${report.trangThai || ''}`.toLowerCase();
    const kv = (report.khuVuc || '').toLowerCase();
    const isAcArea = kv.includes('máy lạnh') || kv.includes('điều hòa') || kv.includes('aircon');
    
    const hasUnfinishedKeyword = 
      combined.includes('chưa tắt') || 
      combined.includes('chua tat') || 
      combined.includes('quên tắt') || 
      combined.includes('quen tat') || 
      combined.includes('không tắt') || 
      combined.includes('khong tat') || 
      combined.includes('chạy qua đêm') || 
      combined.includes('bật qua đêm') ||
      combined.includes('chưa ngắt');

    if (hasUnfinishedKeyword) return true;
    if (isAcArea && (combined.includes('báo sự cố') || combined.includes('chưa xử lý') || combined.includes('hỏng') || combined.includes('chảy nước'))) {
      return true;
    }

    if (combined.includes('vấn đề:') || combined.includes('lỗi:') || combined.includes('bẩn nặng') || combined.includes('hư hỏng')) {
      return true;
    }

    return false;
  } else {
    const md = (report.mucDo || '').toLowerCase();
    if (md.includes('khẩn cấp') || md.includes('nghiêm trọng') || md.includes('cần chú ý')) return true;
    const tt = (report.trangThaiGhiNhan || '').toLowerCase();
    if (tt.includes('chờ tiếp nhận') || tt.includes('chưa xử lý') || tt.includes('đang xử lý')) return true;
    return false;
  }
}

export function normalizeFacilityName(input: string): string {
  if (!input || !input.trim()) return '';
  const clean = input.trim();

  // 1. Direct case-insensitive match
  const exact = OFFICIAL_FACILITIES.find(f => f.toLowerCase() === clean.toLowerCase());
  if (exact) return exact;

  // 2. Clean prefix like "Cơ sở", "CS", "-", etc.
  const core = clean
    .toLowerCase()
    .replace(/^cơ\s*sở\s*[-:\s]*/i, '')
    .replace(/^cs\s*[-:\s]*/i, '')
    .trim();

  if (!core) return '';

  // 3. Match against official core names
  for (const official of OFFICIAL_FACILITIES) {
    const officialCore = official
      .toLowerCase()
      .replace(/^cơ\s*sở\s*/i, '')
      .trim();

    if (
      core === officialCore ||
      (core.length >= 3 && officialCore.includes(core)) ||
      (officialCore.length >= 3 && core.includes(officialCore))
    ) {
      return official;
    }
  }

  // 4. Fallback aliases for legacy strings
  if (core.includes('quận 1') || core.includes('q1')) return 'Cơ sở Gò Vấp';
  if (core.includes('bình thạnh')) return 'Cơ sở Hà Đô';
  if (core.includes('thủ đức')) return 'Cơ sở Gigamall';
  if (core.includes('quận 7') || core.includes('q7')) return 'Cơ sở Gia Hòa';

  return '';
}

