export interface ProposalItem {
  id: string; // DX-001 ... DX-023
  rowNumber: number; // 1 ... 23
  ngay: string; // Ngày gửi đề xuất (DD/MM/YYYY)
  gio: string; // Giờ gửi đề xuất (HH:mm)
  nguoiDeXuat: string; // Người gửi đề xuất
  coSo: string; // Cơ sở (Hà Đô, An Phú, Phổ Quang, Richmond, Bình Phú, Thạnh Mỹ Lợi, Richstar, Tân Bình)
  vatPham: string; // Vật phẩm / Khu vực hư hỏng
  mucDo: 'Hư hỏng nặng' | 'Hư hỏng' | 'Hư hỏng nhẹ' | 'Không hoạt động' | string;
  trangThaiGhiNhan: string; // Hiện trạng ghi nhận thực tế
  deXuat: 'Cần sửa chữa' | 'Thay mới hoàn toàn' | string;
  phuongAn: string; // Phương án xử lý kỹ thuật
  linkAnh: string; // Link ảnh hiện trạng ban đầu (Trước khi sửa)
  nguoiKiemDuyet: string; // Người phê duyệt (Huỳnh Phi Đoan)
  tinhTrangDuyet: 'ĐÃ DUYỆT' | 'CHƯA DUYỆT'; // Tình trạng phê duyệt
  ngayKiemDuyet: string; // Ngày & giờ phê duyệt (VD: 08/10/2026 10:26)
  ghiChuKiemDuyet: string; // Ghi chú của người kiểm duyệt
  thongBaoDuyet: string; // Thông báo duyệt đến BP kỹ thuật
  nguoiKhacPhuc: string; // Kỹ thuật viên (Phạm Văn Trưởng)
  trangThaiSuaChua: 'Đã khắc phục xong' | 'Chưa xử lý'; // Trạng thái đã sửa hay chưa
  ngaySuaChua: string; // Ngày hoàn thành sửa chữa (VD: 14/10/2026)
  ghiChuKhacPhuc: string; // Ghi chú giải trình của kỹ thuật viên
  chiPhiThucTe: number | null; // Kinh phí thực tế (VNĐ)
  chiPhiGocStr: string; // Nguyên bản trên sheet (VD: "1.620.000đ", "0đ")
  anhSauSua: string; // Link ảnh nghiệm thu sau khi sửa (Sau khi sửa)
  mucDoHaiLong?: string;
  feedbackCoSo?: string;
}
