export type ReportMode = 'hygiene' | 'quality';

export interface HygieneReport {
  id: string;
  ngay: string; // YYYY-MM-DD or DD/MM/YYYY
  gio: string;  // HH:mm
  nguoiKiemTra: string;
  coSo: string;
  khuVuc: string;
  trangThai: 'Đạt' | 'Không đạt' | 'Cần khắc phục' | string;
  diemSo: number; // e.g., 90 or 9/10
  diemSoMax?: number; // e.g. 100 or 10
  chiTiet: string;
  phanHoi: string;
  feedbackNguoiDung: string;
  linkAnh: string;
}

export interface FacilityQualityReport {
  id: string;
  ngay: string; // YYYY-MM-DD or DD/MM/YYYY
  gio: string;  // HH:mm
  ten: string; // Người ghi nhận / kiểm tra
  coSo: string;
  khuVuc: string;
  mucDo: 'Bình thường' | 'Cần chú ý' | 'Nghiêm trọng' | 'Khẩn cấp' | string;
  trangThaiGhiNhan: 'Đã xử lý' | 'Đang xử lý' | 'Chờ tiếp nhận' | 'Đã hủy' | string;
  deXuat: string;
  linkAnh: string;
}

export interface FilterState {
  thang: string; // 'all' or '2026-07' or '07'
  tuNgay?: string; // YYYY-MM-DD
  denNgay?: string; // YYYY-MM-DD
  coSo: string;  // 'all' or specific facility
  khuVuc: string; // 'all' or specific area or category
  trangThai: string; // 'all' or specific status/severity
  searchQuery: string;
}

export type FacilityFilterState = FilterState;

export interface FacilitySummary {
  coSo: string;
  soLanThucHien: number;
  diemTrungBinh?: number;
  tyLeDat?: number; // percentage for hygiene
  soSuCo?: number; // count for quality
  tyLeDaXuLy?: number; // percentage for quality
  lanCuoiKiemTra: string;
}
