import { 
  CameraStorageRecord, 
  CameraStorageSummary, 
  StorageFilterOptions,
  StorageHealthStatus,
  AuditCycleStatus 
} from '../types/storage';
import { GOOGLE_SHEET_CSV_URL } from './googleSheetSync';
import { MASTER_CAMERA_LOCATIONS } from './cameraLocations';

const CACHE_STORAGE_KEY = 'cvsg_camera_storage_data_v1';
const CACHE_STORAGE_TIME = 'cvsg_camera_storage_time_v1';

// Facility mapping dictionary
export const FACILITY_MAP: Record<string, { name: string; manager: string }> = {
  APC: { name: 'An Phú', manager: 'Cao Bùi Nguyên Vũ' },
  BPC: { name: 'Bình Phú', manager: 'Phạm Thái Bình Dương' },
  BTC: { name: 'Bình Tân', manager: 'Phạm Thái Bình Dương' },
  DHC: { name: 'Dream Home', manager: 'Phạm Thái Bình Dương' },
  GGM: { name: 'Gigamall', manager: 'Phạm Thái Bình Dương' },
  GHC: { name: 'Gia Hòa', manager: 'Cao Bùi Nguyên Vũ' },
  GVC: { name: 'Gò Vấp', manager: 'Cao Bùi Nguyên Vũ' },
  HDC: { name: 'Hà Đô', manager: 'Phạm Thái Bình Dương' },
  HTC: { name: 'Hiệp Thành', manager: 'Cao Bùi Nguyên Vũ' },
  MLC: { name: 'Moonlight', manager: 'Phạm Thái Bình Dương' },
  NDT: { name: 'Nguyễn Duy Trinh', manager: 'Phạm Thái Bình Dương' },
  PNC: { name: 'Phú Nhuận', manager: 'Cao Bùi Nguyên Vũ' },
  PQC: { name: 'Phổ Quang', manager: 'Phạm Thái Bình Dương' },
  RMC: { name: 'RichMond', manager: 'Phạm Thái Bình Dương' },
  RTC: { name: 'Richstar', manager: 'Phạm Thái Bình Dương' },
  RSC: { name: 'Richstar', manager: 'Phạm Thái Bình Dương' },
  TBC: { name: 'Tân Bình', manager: 'Cao Bùi Nguyên Vũ' },
  TML: { name: 'Thạnh Mỹ Lợi', manager: 'Cao Bùi Nguyên Vũ' },
  TPC: { name: 'Tân Phú', manager: 'Cao Bùi Nguyên Vũ' },
  VHC: { name: 'Vinhomes', manager: 'Cao Bùi Nguyên Vũ' },
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function parseStorageCSV(csvText: string, referenceDate: Date = new Date(2026, 8, 28)): CameraStorageRecord[] {
  const lines = csvText.split(/\r?\n/);
  const records: CameraStorageRecord[] = [];

  // Parse lines starting from index 1 (skipping header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = parseCSVLine(line);

    // Columns T:Y correspond to indices 19:24
    const checkDateRaw = parts[19] ? parts[19].trim() : '';
    const deviceName = parts[20] ? parts[20].trim() : '';
    const locationImageName = parts[21] ? parts[21].trim() : '';
    const locationLinkRaw = parts[22] ? parts[22].trim() : '';
    const storageDaysRaw = parts[23] ? parts[23].trim() : '';
    const note = parts[24] ? parts[24].trim() : '';

    // If deviceName is empty, this is not a valid device row in T:Y
    if (!deviceName) continue;

    // Facility & manager resolution
    const prefix = deviceName.slice(0, 3).toUpperCase();
    const facilityInfo = FACILITY_MAP[prefix] || { name: prefix || 'Khác', manager: 'Chưa phân công' };

    // Format location link (use raw link if URL or fallback to MASTER_CAMERA_LOCATIONS)
    const locationLink = locationLinkRaw.startsWith('http') 
      ? locationLinkRaw 
      : (MASTER_CAMERA_LOCATIONS[deviceName] || undefined);

    // Parse Check Date (dd/mm/yyyy)
    let checkDateIso: string | null = null;
    let daysSinceLastCheck = 999;
    if (checkDateRaw) {
      const match = checkDateRaw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);
        const dt = new Date(year, month, day);
        checkDateIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Days difference
        const diffMs = referenceDate.getTime() - dt.getTime();
        daysSinceLastCheck = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    // 2-week cycle status calculation (14 days cycle):
    let cycleStatus: AuditCycleStatus = 'valid';
    if (!checkDateRaw || daysSinceLastCheck >= 999) {
      cycleStatus = 'not_checked';
    } else if (daysSinceLastCheck >= 14) {
      cycleStatus = 'overdue'; // Quá hạn 2 tuần cảnh báo nhân viên!
    } else if (daysSinceLastCheck >= 11) {
      cycleStatus = 'due_soon'; // Sắp đến hạn 2 tuần (còn 1-3 ngày)
    } else {
      cycleStatus = 'valid'; // Đã kiểm tra trong hạn 2 tuần
    }

    const daysUntilNextCheck = cycleStatus === 'not_checked' ? 0 : Math.max(0, 14 - daysSinceLastCheck);

    // Parse Storage Days (Col X)
    let storageDays: number | null = null;
    let storageStatus: StorageHealthStatus = 'good';

    const normalizedStorage = storageDaysRaw.toLowerCase().trim();
    if (normalizedStorage === 'hết' || normalizedStorage === '0') {
      storageDays = 0;
      storageStatus = 'expired';
    } else if (/^\d+$/.test(storageDaysRaw)) {
      storageDays = parseInt(storageDaysRaw, 10);
      if (storageDays === 0) {
        storageStatus = 'expired';
      } else if (storageDays <= 3) {
        storageStatus = 'critical';
      } else if (storageDays < 14) {
        storageStatus = 'warning';
      } else {
        storageStatus = 'good';
      }
    } else {
      // Empty or text note like "không kiểm tra được"
      storageDays = null;
      storageStatus = 'error';
    }

    // If note mentions "không kiểm tra được" or "hư", flag as error if not already expired
    if (note.toLowerCase().includes('không kiểm') || note.toLowerCase().includes('lỗi')) {
      if (storageStatus !== 'expired') {
        storageStatus = 'error';
      }
    }

    const needsAction = 
      cycleStatus === 'overdue' || 
      cycleStatus === 'not_checked' || 
      storageStatus === 'expired' || 
      storageStatus === 'critical' || 
      storageStatus === 'error';

    records.push({
      id: deviceName,
      deviceName,
      facilityCode: prefix,
      facilityName: facilityInfo.name,
      manager: facilityInfo.manager,
      checkDateRaw,
      checkDateIso,
      locationImageName,
      locationLink,
      storageDaysRaw,
      storageDays,
      note,
      daysSinceLastCheck,
      daysUntilNextCheck,
      cycleStatus,
      storageStatus,
      needsAction
    });
  }

  return records;
}

export function computeStorageSummary(records: CameraStorageRecord[]): CameraStorageSummary {
  const totalDevices = records.length;
  let checkedCount = 0;
  let notCheckedCount = 0;
  let overdueCycleCount = 0;
  let dueSoonCycleCount = 0;
  let validCycleCount = 0;

  let expiredStorageCount = 0;
  let shortStorageCount = 0;
  let goodStorageCount = 0;
  let errorStorageCount = 0;

  const managerMap: Record<string, { total: number; overdue: number; expired: number; good: number }> = {};
  const facilityMap: Record<string, { code: string; name: string; manager: string; total: number; overdue: number; expired: number; good: number; storageSum: number; storageCount: number }> = {};

  records.forEach((r) => {
    // Audit cycle
    if (r.cycleStatus === 'not_checked') {
      notCheckedCount++;
    } else {
      checkedCount++;
    }

    if (r.cycleStatus === 'overdue') overdueCycleCount++;
    else if (r.cycleStatus === 'due_soon') dueSoonCycleCount++;
    else if (r.cycleStatus === 'valid') validCycleCount++;

    // Storage status
    if (r.storageStatus === 'expired') expiredStorageCount++;
    else if (r.storageStatus === 'critical' || r.storageStatus === 'warning') shortStorageCount++;
    else if (r.storageStatus === 'good') goodStorageCount++;
    else if (r.storageStatus === 'error') errorStorageCount++;

    // Manager grouping
    if (!managerMap[r.manager]) {
      managerMap[r.manager] = { total: 0, overdue: 0, expired: 0, good: 0 };
    }
    managerMap[r.manager].total++;
    if (r.cycleStatus === 'overdue' || r.cycleStatus === 'not_checked') managerMap[r.manager].overdue++;
    if (r.storageStatus === 'expired' || r.storageStatus === 'critical') managerMap[r.manager].expired++;
    if (r.storageStatus === 'good') managerMap[r.manager].good++;

    // Facility grouping
    const fCode = r.facilityCode || 'OTHER';
    if (!facilityMap[fCode]) {
      facilityMap[fCode] = {
        code: fCode,
        name: r.facilityName,
        manager: r.manager,
        total: 0,
        overdue: 0,
        expired: 0,
        good: 0,
        storageSum: 0,
        storageCount: 0
      };
    }
    facilityMap[fCode].total++;
    if (r.cycleStatus === 'overdue' || r.cycleStatus === 'not_checked') facilityMap[fCode].overdue++;
    if (r.storageStatus === 'expired' || r.storageStatus === 'critical') facilityMap[fCode].expired++;
    if (r.storageStatus === 'good') facilityMap[fCode].good++;
    if (typeof r.storageDays === 'number' && r.storageDays > 0) {
      facilityMap[fCode].storageSum += r.storageDays;
      facilityMap[fCode].storageCount++;
    }
  });

  const managers = Object.entries(managerMap).map(([name, data]) => ({
    name,
    ...data
  }));

  const facilityStats = Object.values(facilityMap).map((f) => ({
    code: f.code,
    name: f.name,
    manager: f.manager,
    total: f.total,
    overdue: f.overdue,
    expired: f.expired,
    good: f.good,
    averageStorageDays: f.storageCount > 0 ? Math.round(f.storageSum / f.storageCount) : null
  })).sort((a, b) => b.expired - a.expired || b.overdue - a.overdue || a.name.localeCompare(b.name));

  return {
    totalDevices,
    checkedCount,
    notCheckedCount,
    overdueCycleCount,
    dueSoonCycleCount,
    validCycleCount,
    expiredStorageCount,
    shortStorageCount,
    goodStorageCount,
    errorStorageCount,
    totalFacilities: facilityStats.length,
    managers,
    facilityStats
  };
}

export function filterStorageRecords(
  records: CameraStorageRecord[],
  filters: StorageFilterOptions
): CameraStorageRecord[] {
  return records.filter((item) => {
    // Quick filter
    if (filters.quickFilter === 'needs_action' && !item.needsAction) return false;
    if (filters.quickFilter === 'overdue_2weeks' && item.cycleStatus !== 'overdue' && item.cycleStatus !== 'not_checked') return false;
    if (filters.quickFilter === 'storage_expired' && item.storageStatus !== 'expired' && item.storageStatus !== 'critical') return false;
    if (filters.quickFilter === 'storage_good' && item.storageStatus !== 'good') return false;

    // Facility filter
    if (filters.facility !== 'all' && item.facilityName !== filters.facility && item.facilityCode !== filters.facility) {
      return false;
    }

    // Manager filter
    if (filters.manager !== 'all' && item.manager !== filters.manager) {
      return false;
    }

    // Cycle status filter
    if (filters.cycleStatus !== 'all' && item.cycleStatus !== filters.cycleStatus) {
      return false;
    }

    // Storage status filter
    if (filters.storageStatus !== 'all' && item.storageStatus !== filters.storageStatus) {
      return false;
    }

    // Search Query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchDevice = item.deviceName.toLowerCase().includes(q);
      const matchFacility = item.facilityName.toLowerCase().includes(q);
      const matchNote = item.note.toLowerCase().includes(q);
      const matchManager = item.manager.toLowerCase().includes(q);
      if (!matchDevice && !matchFacility && !matchNote && !matchManager) {
        return false;
      }
    }

    return true;
  });
}

export function exportStorageToCSV(records: CameraStorageRecord[]): string {
  const headers = [
    'Mã Camera',
    'Cơ Sở',
    'Người Phụ Trách',
    'Ngày Kiểm Tra Gần Nhất',
    'Số Ngày Kể Từ Lần Kiểm Tra',
    'Trạng Thái Chu Kỳ 2 Tuần',
    'Hạn Kiểm Tra Tiếp Theo (Ngày)',
    'Thời Gian Lưu Trữ (Ngày)',
    'Đánh Giá Dung Lượng',
    'Ghi Chú',
    'Link Hình Ảnh Vị Trí'
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = records.map((r) => {
    let cycleText = 'Đạt chuẩn chu kỳ 2 tuần';
    if (r.cycleStatus === 'overdue') cycleText = 'QUÁ HẠN 2 TUẦN (Cảnh báo)';
    else if (r.cycleStatus === 'due_soon') cycleText = 'Sắp đến hạn (còn 1-3 ngày)';
    else if (r.cycleStatus === 'not_checked') cycleText = 'Chưa kiểm tra';

    let storageText = 'Đạt chuẩn (≥14 ngày)';
    if (r.storageStatus === 'expired') storageText = 'HẾT DUNG LƯỢNG / 0 NGÀY';
    else if (r.storageStatus === 'critical') storageText = 'Cực ngắn (≤3 ngày)';
    else if (r.storageStatus === 'warning') storageText = 'Ngắn (<14 ngày)';
    else if (r.storageStatus === 'error') storageText = 'Lỗi / Không kiểm tra được';

    return [
      escapeCSV(r.deviceName),
      escapeCSV(r.facilityName),
      escapeCSV(r.manager),
      escapeCSV(r.checkDateRaw || 'Chưa kiểm tra'),
      escapeCSV(r.cycleStatus === 'not_checked' ? 'N/A' : r.daysSinceLastCheck),
      escapeCSV(cycleText),
      escapeCSV(r.cycleStatus === 'not_checked' ? 'N/A' : r.daysUntilNextCheck),
      escapeCSV(r.storageDays !== null ? r.storageDays : r.storageDaysRaw),
      escapeCSV(storageText),
      escapeCSV(r.note || ''),
      escapeCSV(r.locationLink || '')
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

export async function fetchCameraStorageData(forceRefresh = false): Promise<{
  records: CameraStorageRecord[];
  summary: CameraStorageSummary;
  fromCache: boolean;
  lastSync: string;
}> {
  const now = Date.now();

  try {
    const fetchUrl = `${GOOGLE_SHEET_CSV_URL}&_t=${now}`;
    const response = await fetch(fetchUrl, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    });

    if (response.ok) {
      const csvText = await response.text();
      const records = parseStorageCSV(csvText);

      if (records && records.length > 0) {
        const summary = computeStorageSummary(records);
        try {
          localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(records));
          localStorage.setItem(CACHE_STORAGE_TIME, now.toString());
        } catch {
          // Ignore
        }

        return {
          records,
          summary,
          fromCache: false,
          lastSync: new Date(now).toLocaleTimeString('vi-VN')
        };
      }
    }
  } catch (err) {
    console.warn('Network fetch for camera storage failed, trying cache:', err);
  }

  // Fallback to cache
  try {
    const cached = localStorage.getItem(CACHE_STORAGE_KEY);
    const timeStr = localStorage.getItem(CACHE_STORAGE_TIME);
    if (cached) {
      const records: CameraStorageRecord[] = JSON.parse(cached);
      if (records && records.length > 0) {
        return {
          records,
          summary: computeStorageSummary(records),
          fromCache: true,
          lastSync: timeStr ? new Date(parseInt(timeStr, 10)).toLocaleTimeString('vi-VN') : 'Lưu tạm'
        };
      }
    }
  } catch {
    // Ignore
  }

  throw new Error('Không thể tải dữ liệu kiểm tra thẻ nhớ từ Google Sheets.');
}
