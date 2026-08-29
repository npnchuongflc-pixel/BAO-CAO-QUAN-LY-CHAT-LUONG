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
  items: TargetItem[];
}

export const FACILITY_TARGET_DETAILS: Record<string, FacilityTargetDetail> = {
  'Cơ sở Gò Vấp': {
    total: 16,
    items: [
      { label: 'Phòng cờ', count: 3 },
      { label: 'Máy lạnh cờ', count: 3 },
      { label: 'WC cờ', count: 3 },
      { label: 'Phòng vẽ', count: 2 },
      { label: 'Máy lạnh vẽ', count: 2 },
      { label: 'WC vẽ', count: 2 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở An Phú': {
    total: 10,
    items: [
      { label: 'Phòng cờ', count: 3 },
      { label: 'Máy lạnh cờ', count: 3 },
      { label: 'WC cờ', count: 1 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Thạnh Mỹ Lợi': {
    total: 8,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 2 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'WC vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Vinhomes': {
    total: 15,
    items: [
      { label: 'Phòng cờ', count: 4 },
      { label: 'Máy lạnh cờ', count: 4 },
      { label: 'WC cờ', count: 3 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'WC vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Gia Hòa': {
    total: 7,
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
    total: 9,
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
    total: 10,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 2 },
      { label: 'WC cờ', count: 2 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'WC vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Bình Tân': {
    total: 13,
    items: [
      { label: 'Phòng cờ', count: 3 },
      { label: 'Máy lạnh cờ', count: 3 },
      { label: 'WC cờ', count: 3 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'WC vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Dream Home': {
    total: 9,
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
  'Cơ sở Gigamall': {
    total: 6,
    items: [
      { label: 'Phòng cờ', count: 1 },
      { label: 'Máy lạnh cờ', count: 1 },
      { label: 'WC cờ', count: 1 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Hà Đô': {
    total: 8,
    items: [
      { label: 'Phòng cờ', count: 3 },
      { label: 'Máy lạnh cờ', count: 1 },
      { label: 'WC cờ', count: 1 },
      { label: 'Phòng vẽ', count: 2 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Moonlight': {
    total: 7,
    items: [
      { label: 'Phòng cờ', count: 1 },
      { label: 'Máy lạnh cờ', count: 1 },
      { label: 'WC cờ', count: 1 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'WC vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Nguyễn Duy Trinh': {
    total: 9,
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
  'Cơ sở Richstar': {
    total: 9,
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
    total: 2,
    items: [
      { label: 'Phòng cờ', count: 1 },
      { label: 'Máy lạnh cờ', count: 1 },
    ],
  },
  'Cơ sở RichMond': {
    total: 10,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 2 },
      { label: 'WC cờ', count: 2 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'WC vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Richmond': {
    total: 10,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 2 },
      { label: 'WC cờ', count: 2 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'WC vẽ', count: 1 },
      { label: 'Lễ tân', count: 1 },
    ],
  },
  'Cơ sở Bình Phú': {
    total: 9,
    items: [
      { label: 'Phòng cờ', count: 2 },
      { label: 'Máy lạnh cờ', count: 2 },
      { label: 'WC cờ', count: 2 },
      { label: 'Phòng vẽ', count: 1 },
      { label: 'Máy lạnh vẽ', count: 1 },
      { label: 'WC vẽ', count: 1 },
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

export function getTotalDailyTargetAllFacilities(): number {
  return Object.values(FACILITY_TARGET_DETAILS).reduce((acc, curr) => acc + (curr.total || 0), 0);
}

export function getFacilityDailyTarget(facilityName: string): number {
  if (!facilityName || facilityName === 'all') return getTotalDailyTargetAllFacilities();
  const detail = getFacilityTargetDetail(facilityName);
  return detail?.total || 10;
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

