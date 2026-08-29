import { HygieneReport, FacilityQualityReport } from '../types';

export const FACILITY_LIST = [
  'Cơ sở 1 - Phan Xích Long',
  'Cơ sở 2 - Lê Văn Sỹ',
  'Cơ sở 3 - Nguyễn Thị Thập',
  'Cơ sở 5 - Nguyễn Oanh',
  'Cơ sở 6 - Quang Trung',
  'Cơ sở 7 - Tô Hiến Thành',
  'Cơ sở 8 - Trần Não',
  'Cơ sở 9 - Hậu Giang',
  'Cơ sở 10 - Đỗ Xuân Hợp',
  'Cơ sở 11 - Tên Lửa',
  'Cơ sở 12 - Song Hành',
  'Cơ sở 14 - Huỳnh Tấn Phát',
  'Cơ sở 15 - Lê Văn Việt',
  'Cơ sở 16 - Tân Sơn Nhì',
  'Cơ sở 17 - Nguyễn Duy Trinh',
  'Cơ sở 18 - Phạm Hùng',
  'Cơ sở 19 - Nguyễn Gia Trí',
  'Cơ sở 20 - Phạm Văn Đồng',
  'Cơ sở 21 - Phan Văn Hớn'
];

export const INITIAL_HYGIENE_REPORTS: HygieneReport[] = [
  {
    id: 'mock-hyg-1',
    ngay: '2026-08-25',
    gio: '08:30',
    nguoiKiemTra: 'Nguyễn Văn An',
    coSo: 'Cơ sở 1 - Phan Xích Long',
    khuVuc: 'Phòng học Cờ 1',
    trangThai: 'Đạt',
    diemSo: 95,
    diemSoMax: 100,
    chiTiet: 'Bàn ghế ngăn nắp, sàn sạch sẽ, bảng viết không vết mực cũ',
    phanHoi: 'Đã duy trì tốt theo tiêu chuẩn 5S',
    feedbackNguoiDung: 'Rất hài lòng',
    linkAnh: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'mock-hyg-2',
    ngay: '2026-08-25',
    gio: '09:15',
    nguoiKiemTra: 'Trần Thị Bích',
    coSo: 'Cơ sở 2 - Lê Văn Sỹ',
    khuVuc: 'Nhà vệ sinh nữ',
    trangThai: 'Cần khắc phục',
    diemSo: 65,
    diemSoMax: 100,
    chiTiet: 'Hết giấy vệ sinh, bồn rửa tay có đọng nước',
    phanHoi: 'Đã báo tạp vụ bổ sung giấy và lau khô sàn',
    feedbackNguoiDung: 'Cần kiểm tra thường xuyên hơn',
    linkAnh: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'mock-hyg-3',
    ngay: '2026-08-24',
    gio: '14:00',
    nguoiKiemTra: 'Lê Hoàng Nam',
    coSo: 'Cơ sở 3 - Nguyễn Thị Thập',
    khuVuc: 'Sảnh Lễ Tân & Đón Tiếp',
    trangThai: 'Đạt',
    diemSo: 90,
    diemSoMax: 100,
    chiTiet: 'Khu vực tiếp đón phụ huynh sạch sẽ, cây xanh được tưới gọn gàng',
    phanHoi: 'Tốt',
    feedbackNguoiDung: 'Không gian thoáng mát',
    linkAnh: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'
  }
];

export const INITIAL_QUALITY_REPORTS: FacilityQualityReport[] = [
  {
    id: 'mock-qual-1',
    ngay: '2026-08-26',
    gio: '10:00',
    ten: 'Phạm Minh Tuấn',
    coSo: 'Cơ sở 1 - Phan Xích Long',
    khuVuc: 'Phòng học Vẽ 2',
    mucDo: 'Cần sửa chữa',
    trangThaiGhiNhan: 'Đã tiếp nhận',
    deXuat: 'Đèn led góc phòng bị chớp nháy cần thay bóng mới',
    linkAnh: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'mock-qual-2',
    ngay: '2026-08-24',
    gio: '15:30',
    ten: 'Vũ Thị Hằng',
    coSo: 'Cơ sở 5 - Nguyễn Oanh',
    khuVuc: 'Máy lạnh phòng học Cờ 3',
    mucDo: 'Khẩn cấp',
    trangThaiGhiNhan: 'Đang xử lý',
    deXuat: 'Máy lạnh chảy nước rỉ xuống bàn học, cần bảo trì gấp',
    linkAnh: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
  }
];
