export interface SheetRowItem {
  student: string;
  customer: string;
  facilityRaw: string;
  sentAt: Date | null;
  course: string;
  responseAt: Date | null;
  rating: number | null;
  detail: string;
  facility: string;
  subject: string;
}

export interface FilterState {
  start: string;
  end: string;
  facility: string;
  subject: string;
  course: string;
}

export interface DayPoint {
  key: string;
  label: string;
  sent: number;
  replies: number;
}

export interface MonthPoint {
  label: string;
  sent: number;
  replies: number;
  rate: number | null;
}

export interface FacilityMetrics {
  facility: string;
  sent: number;
  replies: number;
  cohort: number;
  rate: number | null;
  cohortRate: number | null;
  score: number | null;
  dist: number[];
  low: number;
  status: 'Tốt' | 'Theo dõi' | 'Cần xử lý';
  rankEligible: boolean;
  rankReplies: number;
  rankRate: number | null;
  rankScore: number | null;
  rankDist: number[];
  rankLow: number;
  performanceScore?: number | null;
  responseEffectiveness?: number;
  adjustedStarRates?: number[];
  rank?: number | null;
}

export interface PeriodReportData {
  start: Date;
  end: Date;
  sent: SheetRowItem[];
  replies: SheetRowItem[];
  cohortReplies: SheetRowItem[];
  low: SheetRowItem[];
  avg: number | null;
  legacyRate: number | null;
  cohortRate: number | null;
  fiveStar: number;
  ratingCounts: number[];
  dayPoints: DayPoint[];
  facilities: FacilityMetrics[];
  months: MonthPoint[];
  feedback: SheetRowItem[];
  medianDelay: number | null;
  within24: number | null;
  delta: {
    sent: number | null;
    replies: number | null;
    rate: number | null;
    avg: number | null;
  };
}

// -------------------------------------------------------------
// TEACHING QUALITY MONITORING TYPES (Google Sheet gid=282336280)
// -------------------------------------------------------------

export interface TeachingAuditItem {
  id: string;
  dayOfWeek: string; // Thứ
  evaluator: string; // Người thực hiện đánh giá
  facility: string; // Cơ sở đánh giá
  cameraOrClass: string; // Lớp/ tên Camera
  teacherName: string; // Họ và tên GV
  date: Date | null; // Ngày đánh giá
  dateStr: string; // Chuỗi ngày dd/MM/yyyy
  teacherRank: string; // Bậc GV (Bậc 01, Bậc 02, Bậc 03...)
  startTime: string; // Thời gian bắt đầu
  endTime: string; // Thời gian kết thúc
  shiftCount: number; // Số ca (1, 2)
  uniform: string; // Đồng phục/ Tác Phong
  first15m: string; // 15p đầu giờ
  classMgmt: string; // Quản lớp - đảm bảo trật tự
  handover: string; // Giao ca
  deviceUsage: string; // Sử dụng điện thoại/laptop
  endShift: string; // Kết ca
  result: 'Tốt' | 'Vi phạm'; // Kết quả
  violationName: string; // Lỗi vi phạm (e.g. Đến trễ, Sử dụng điện thoại...)
  violationCategory: string; // Phân loại lỗi vi phạm (e.g. 15 phút đầu giờ, Thiết bị...)
  status: string; // Trạng thái (Không vi phạm, Đã xử lý, Chưa xử lý, Xác nhận lại)
  resolutionDate: Date | null; // Ngày xử lý
  resolutionDateStr: string;
  month: string; // Tháng (01/2026, 02/2026...)
  resolutionDuration: string; // Thời lượng xử lý
  evidenceImage: string; // Link ảnh vi phạm
  isSevere: boolean; // Tình huống nghiêm trọng
  subject: 'Cờ' | 'Vẽ' | 'Khác'; // Môn học
  evaluatorNote: string; // CTV mô tả lỗi vi phạm
  detailedViolation: string; // Lỗi chi tiết
  emailSent: string; // Gửi mail (Đã gửi / Chưa gửi)
}

export interface TeachingFilterState {
  month: string; // 'all' or '01/2026', '02/2026'..., or 'current' for current month
  dateMode?: 'all' | 'current-month' | 'custom-range'; // date filter mode
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  subject: string; // 'all' | 'Cờ' | 'Vẽ'
  facility: string; // 'all' | facility name
  teacherRank: string; // 'all' | 'Bậc 01' | 'Bậc 02' | 'Bậc 03'
  result: string; // 'all' | 'Tốt' | 'Vi phạm'
  status: string; // 'all' | 'Đã xử lý' | 'Chưa xử lý' | 'Xác nhận lại' | 'Không vi phạm'
  evaluator: string; // 'all' | evaluator name
  searchTeacher: string;
  searchFacility: string;
  onlySevere: boolean;
  onlyViolations: boolean;
}

export interface CriteriaBreakdown {
  name: string;
  key: string;
  iconName: string;
  totalAudits: number;
  goodCount: number;
  violationCount: number;
  complianceRate: number;
  description: string;
  topIssues: Array<{ label: string; count: number }>;
}

export interface ViolationCategoryStat {
  category: string;
  count: number;
  percentage: number;
  severeCount: number;
  subjectBreakdown: { chess: number; art: number };
}

export interface FacilityTeachingRank {
  facility: string;
  totalAudits: number;
  totalShifts: number;
  goodShifts: number;
  violationShifts: number;
  complianceRate: number;
  violationRate: number;
  severeCount: number;
  pendingCount: number;
  status: 'Tốt' | 'Cần cải thiện' | 'Cảnh báo';
  rank: number;
}

export interface TeacherTeachingRank {
  teacherName: string;
  teacherRank: string;
  subject: string;
  totalAudits: number;
  totalShifts: number;
  goodShifts: number;
  violationShifts: number;
  complianceRate: number;
  severeCount: number;
  facilities: string[];
  violationCategories: string[];
  status: 'Tiêu biểu' | 'Đạt chuẩn' | 'Cần lưu ý' | 'Tái đào tạo';
}

export interface MonthlyTeachingTrend {
  month: string;
  audits: number;
  shifts: number;
  good: number;
  violations: number;
  complianceRate: number;
  violationRate: number;
  severe: number;
}

export interface DailyAuditTrend {
  dayKey: string; // e.g. '2026-08-01'
  dayLabel: string; // e.g. '1 thg 8'
  dayNum: number;
  good: number; // Không vi phạm
  handled: number; // Đã xử lý
  pending: number; // Chưa xử lý
  nullCount: number; // null / khác
  total: number;
}

export interface MonthlySubjectViolation {
  month: string; // '01/2026', '02/2026'...
  chess: number; // Cờ
  art: number; // Vẽ
  total: number;
}

export interface TeacherViolationRow {
  rank: number;
  teacherName: string;
  teacherRank: string;
  subject: string;
  violations: number;
  totalAudits: number;
  violationRate: number;
  percentScore: number;
  diff: string;
}

export interface FacilityViolationComboItem {
  facility: string;
  totalAudits: number;
  violations: number;
  violationRate: number;
  severeCount: number;
}

export interface StatusDistributionItem {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TeachingQualitySummary {
  totalAudits: number;
  totalShifts: number;
  goodAudits: number;
  goodShifts: number;
  violationAudits: number;
  violationShifts: number;
  complianceRate: number;
  violationRate: number;
  severeCount: number;
  unwarnedCount: number; // Chưa nhắc nhở
  handledCount: number; // Đã xử lý
  pendingCount: number; // Chưa xử lý
  handledRate: number;
  uniqueTeachers: number;
  uniqueFacilities: number;
  criteria: CriteriaBreakdown[];
  topViolations: ViolationCategoryStat[];
  facilityRanks: FacilityTeachingRank[];
  teacherRanks: TeacherTeachingRank[];
  monthlyTrends: MonthlyTeachingTrend[];
  dailyTrends: DailyAuditTrend[];
  monthlySubjectViolations: MonthlySubjectViolation[];
  teacherViolationsList: TeacherViolationRow[];
  facilityViolationsCombo: FacilityViolationComboItem[];
  statusDistribution: StatusDistributionItem[];
  delta: {
    shiftsDelta: number;
    violationsDelta: number;
    complianceDelta: number;
  };
  subjectStats: {
    chess: { audits: number; shifts: number; complianceRate: number; violations: number };
    art: { audits: number; shifts: number; complianceRate: number; violations: number };
  };
}

// -------------------------------------------------------------
// FACILITY QUALITY & HYGIENE MONITORING TYPES
// -------------------------------------------------------------

export type ReportMode = 'hygiene' | 'quality';

export interface HygieneReport {
  id: string;
  ngay: string;
  gio: string;
  nguoiKiemTra: string;
  coSo: string;
  khuVuc: string;
  trangThai: string;
  diemSo: number;
  diemSoMax?: number;
  chiTiet: string;
  phanHoi: string;
  feedbackNguoiDung: string;
  linkAnh: string;
}

export interface FacilityQualityReport {
  id: string;
  ngay: string;
  gio: string;
  ten: string;
  coSo: string;
  khuVuc: string;
  mucDo: string;
  trangThaiGhiNhan: string;
  deXuat: string;
  linkAnh: string;
}

export interface FacilityFilterState {
  thang: string;
  tuNgay: string;
  denNgay: string;
  coSo: string;
  khuVuc: string;
  trangThai: string;
  searchQuery: string;
}

export interface FacilitySummary {
  coSo: string;
  soLanThucHien: number;
  tyLeDat: number;
  tyLeDaXuLy: number;
  diemTrungBinh: number;
  soSuCo: number;
  lanCuoiKiemTra: string;
}


