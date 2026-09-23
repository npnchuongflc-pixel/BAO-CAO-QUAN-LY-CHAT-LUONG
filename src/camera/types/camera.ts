export type CameraStatus = 'Hoạt động' | 'Chập chờn' | 'Mất kết nối' | 'Chậm lag' | string;

export interface RawCheckRow {
  date: string;       // YYYY-MM-DD
  site: string;       // Cơ sở
  camera: string;     // Mã camera
  status: CameraStatus; // Tình trạng
  owner: string;      // Người phụ trách
  fixed: boolean;     // Đã xác nhận khắc phục
  evidence: boolean;  // Có hình ảnh minh chứng
  locationLink?: string; // Link mô tả vị trí camera
}

export type PriorityLevel = 'P1' | 'P2';

export interface CameraAggregate {
  camera: string;
  site: string;
  owner: string;
  count: number;       // Tổng số lần bất ổn
  lost: number;        // Số lần mất kết nối
  unstable: number;    // Số lần chập chờn
  other: number;       // Số lần bất ổn khác
  last: string;        // Ngày gần nhất ghi nhận
  status: CameraStatus;// Tình trạng gần nhất
  evidence: boolean;   // Có minh chứng
  locationLink?: string; // Link mô tả vị trí camera
  priority: PriorityLevel;
  totalChecks: number; // Tổng số lượt kiểm tra của camera này
  records: RawCheckRow[]; // Toàn bộ lịch sử kiểm tra
}

export interface KPIData {
  totalChecks: number;
  recordedCameras: number;
  totalIssues: number;
  issueRate: number;
  affectedCameras: number;
  fixedCount: number;
  fixedRate: number;
  evidenceCount: number;
  evidenceRate: number;
  unstableTotal: number;
  lostTotal: number;
  otherTotal: number;
}

export interface SiteStats {
  site: string;
  count: number;
  percentage: number;
  color: string;
}

export interface DailyTrendPoint {
  date: string;
  dayLabel: string;
  totalIssues: number;
  unstable: number;
  lost: number;
  other: number;
}

export interface FilterOptions {
  periodMonth: string; // '09/2026' | 'all' | 'custom' | etc.
  dateFrom: string;    // 'YYYY-MM-DD'
  dateTo: string;      // 'YYYY-MM-DD'
  site: string;        // 'all' or site name
  owner: string;       // 'all' or owner name
  status: string;      // 'all' or status
  searchQuery: string;
  evidenceOnly: boolean;
}

export interface DefectiveCameraReport {
  camera: string;
  site: string;
  owner: string;
  inspectionDate: string; // The exact date of current inspection (e.g. 2026-09-22)
  currentStatus: CameraStatus;
  firstIssueDate: string;
  latestIssueDate: string;
  consecutiveDays: number;
  totalIncidents: number;
  lostCount: number;
  unstableCount: number;
  isFixed: boolean;
  hasEvidence: boolean;
  severity: 'Khẩn cấp (Mất tín hiệu)' | 'Cảnh báo (Chập chờn)' | 'Cần theo dõi';
  diagnostics: string;
  recommendedAction: string;
  currentCondition: 'Đang mất kết nối' | 'Đang chập chờn' | 'Tái diễn liên tục';
  locationLink?: string; // Link mô tả vị trí camera (từ cột D / cột mô tả vị trí)
}

export interface InspectionDayInfo {
  date: string;
  hasRecords: boolean;
  totalRecords: number;
  defectiveCount: number;
  latestAvailableDate: string;
}
