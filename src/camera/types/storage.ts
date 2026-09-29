export type StorageHealthStatus = 'expired' | 'critical' | 'warning' | 'good' | 'error';
export type AuditCycleStatus = 'overdue' | 'due_soon' | 'valid' | 'not_checked';

export interface CameraStorageRecord {
  id: string; // e.g. "APC0"
  deviceName: string; // Col U: "APC0"
  facilityCode: string; // "APC"
  facilityName: string; // "An Phú"
  manager: string; // "Cao Bùi Nguyên Vũ"
  checkDateRaw: string; // Col T: "28/09/2026"
  checkDateIso: string | null; // "2026-09-28"
  locationImageName: string; // Col V: "APC0.jpg"
  locationLink?: string; // Col W: Google Drive URL
  storageDaysRaw: string; // Col X: "40", "12", "hết", ""
  storageDays: number | null; // parsed number or 0 if "hết"
  note: string; // Col Y: "Không kiểm tra được", etc.

  // Calculated fields:
  daysSinceLastCheck: number; // days since checkDateRaw compared to reference date
  daysUntilNextCheck: number; // 14 - daysSinceLastCheck (14 days = 2 weeks)
  cycleStatus: AuditCycleStatus;
  storageStatus: StorageHealthStatus;
  needsAction: boolean; // overdue or storage expired/critical or error
}

export interface CameraStorageSummary {
  totalDevices: number;
  checkedCount: number;
  notCheckedCount: number;
  overdueCycleCount: number; // > 14 days
  dueSoonCycleCount: number; // 11-13 days
  validCycleCount: number; // <= 10 days
  expiredStorageCount: number; // 0 days or "hết"
  shortStorageCount: number; // 1 - 13 days
  goodStorageCount: number; // >= 14 days
  errorStorageCount: number; // Cannot check / Error / Empty
  totalFacilities: number;
  managers: {
    name: string;
    total: number;
    overdue: number;
    expired: number;
    good: number;
  }[];
  facilityStats: {
    code: string;
    name: string;
    manager: string;
    total: number;
    overdue: number;
    expired: number;
    good: number;
    averageStorageDays: number | null;
  }[];
}

export interface StorageFilterOptions {
  searchQuery: string;
  facility: string; // "all" or facility name/code
  manager: string; // "all" or manager name
  cycleStatus: string; // "all" | "overdue" | "due_soon" | "valid" | "not_checked"
  storageStatus: string; // "all" | "expired" | "critical" | "warning" | "good" | "error"
  quickFilter: 'all' | 'needs_action' | 'overdue_2weeks' | 'storage_expired' | 'storage_good';
}
