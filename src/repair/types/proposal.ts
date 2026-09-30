export interface ProposalItem {
  id: string;
  ngay: string;
  gio: string;
  nguoiDeXuat: string;
  coSo: string;
  vatPham: string;
  mucDo: 'Hư hỏng nặng' | 'Hư hỏng';
  trangThaiGhiNhan: string;
  deXuat: 'Cần sửa chữa' | 'Thay mới hoàn toàn';
  phuongAn: string;
  linkAnh: string;
  nguoiKiemDuyet: string;
  tinhTrangDuyet: 'CHƯA DUYỆT' | 'ĐÃ DUYỆT';
  ghiChuKiemDuyet?: string;
  thoiGianThongBaoDuyet?: string; // e.g. "29/09, 16:22"
  ngayKiemDuyet?: string; // e.g. "29/09/2026 16:22"
  nguoiKhacPhuc: string;
  trangThaiSuaChua: 'Chưa sửa chữa' | 'Đã sửa chữa';
  tienDoKhacPhuc?: string;
  ghiChuKhacPhuc?: string;
  ngayHoanThanh?: string; // Ngày hoàn thành hoặc deadline kỹ thuật
  chiPhiThucTe: number | null; // Cột T của Sheet
  soLanHongLapLai?: number;
}
