/**
 * Dữ liệu phân tích thiết bị hư hỏng lặp đi lặp lại (> 2 lần)
 * Trích xuất 100% từ dữ liệu thực tế lịch sử kiểm tra và đề xuất của hệ thống.
 * Tuyệt đối KHÔNG tự dự toán chi phí ước tính.
 */

export interface BreakdownOccurrence {
  ngay: string;
  mucDo: string;
  hienTrang: string;
  phuongAn: string;
}

export interface RepeatedEquipmentItem {
  id: string;
  maThietBi: string;
  tenThietBi: string;
  coSo: string;
  soLanHong: number;
  chiPhiThucTe: number | null; // Chỉ lấy chi phí thực tế nếu có
  khuyenNghi: 'Nên thay mới hoàn toàn' | 'Bảo dưỡng chuyên sâu & thay linh kiện' | 'Cần thay mới ngay';
  lyDoKhuyenNghi: string;
  lichSu: BreakdownOccurrence[];
}

export const REPEATED_EQUIPMENT_OVER_2: RepeatedEquipmentItem[] = [
  {
    id: "REP-001",
    maThietBi: "PQC_TT_LT_DH0",
    tenThietBi: "Điều Hòa - Lễ Tân (Tầng Trệt)",
    coSo: "Phổ Quang",
    soLanHong: 5,
    chiPhiThucTe: null, // Chưa có bản ghi chi phí thực tế trên sheet
    khuyenNghi: "Cần thay mới ngay",
    lyDoKhuyenNghi: "Thiết bị đã ghi nhận hỏng 5 lần liên tiếp trong lịch sử (chảy nước 2 lần, không mát 2 lần, đứt dây điện).",
    lichSu: [
      {
        ngay: "30/08/2026",
        mucDo: "Hư hỏng",
        hienTrang: "Máy lạnh chảy nước xuống quầy lễ tân",
        phuongAn: "Thông tắc đường ống thoát nước thải"
      },
      {
        ngay: "06/09/2026",
        mucDo: "Hư hỏng",
        hienTrang: "Không mát, phả hơi nóng",
        phuongAn: "Kiểm tra đo nạp gas và vệ sinh dàn nóng"
      },
      {
        ngay: "09/09/2026",
        mucDo: "Hư hỏng",
        hienTrang: "Tiếp tục chảy nước đọng giọt",
        phuongAn: "Thông đường ống và bọc bảo ôn lại"
      },
      {
        ngay: "09/09/2026",
        mucDo: "Hư hỏng",
        hienTrang: "Máy chạy yếu, không đủ độ lạnh",
        phuongAn: "Bổ sung nạp gas và xử lý rò rỉ"
      },
      {
        ngay: "09/09/2026",
        mucDo: "Hư hỏng nặng",
        hienTrang: "Đứt dây điện nguồn / dây tín hiệu",
        phuongAn: "Đi lại dây điện và rơ-le chống giật"
      }
    ]
  },
  {
    id: "REP-002",
    maThietBi: "PQC_TT_PC1_DH1",
    tenThietBi: "Điều Hòa - Phòng Cờ 1 (Tầng Trệt)",
    coSo: "Phổ Quang",
    soLanHong: 4,
    chiPhiThucTe: null,
    khuyenNghi: "Nên thay mới hoàn toàn",
    lyDoKhuyenNghi: "Đã ghi nhận hỏng 4 lần trong tháng 9, chủ yếu là lỗi chảy nước liên tục vào phòng học cờ.",
    lichSu: [
      {
        ngay: "06/09/2026",
        mucDo: "Không hoạt động",
        hienTrang: "Máy không hoạt động, bật nguồn không lên",
        phuongAn: "Kiểm tra nguồn điện và bo mạch điều khiển"
      },
      {
        ngay: "06/09/2026",
        mucDo: "Hư hỏng",
        hienTrang: "Chảy nước dàn lạnh xuống nền nhà",
        phuongAn: "Vệ sinh máng nước và ống thoát nước"
      },
      {
        ngay: "07/09/2026",
        mucDo: "Hư hỏng",
        hienTrang: "Chảy nước tái phát sau 1 ngày vệ sinh",
        phuongAn: "Cân chỉnh lại độ dốc máng thoát nước"
      },
      {
        ngay: "22/09/2026",
        mucDo: "Hư hỏng",
        hienTrang: "Tiếp tục chảy nước thành giọt nhỏ",
        phuongAn: "Thay thế đoạn ống dẫn mềm và bọc bảo ôn"
      }
    ]
  },
  {
    id: "REP-003",
    maThietBi: "APC_TT_LT_DH0",
    tenThietBi: "Điều Hòa - Lễ Tân (Tầng Trệt)",
    coSo: "An Phú",
    soLanHong: 3,
    chiPhiThucTe: null,
    khuyenNghi: "Bảo dưỡng chuyên sâu & thay linh kiện",
    lyDoKhuyenNghi: "Thiết bị hỏng lặp lại 3 lần. Hiện tại cánh vẫy bị kẹt không mở được làm đọng sương và chảy nước (đang có trong đề xuất DX-002 ngày 28/09/2026).",
    lichSu: [
      {
        ngay: "26/09/2026",
        mucDo: "Hư hỏng nhẹ",
        hienTrang: "Nhiễu nước nhẹ ở mép dàn lạnh",
        phuongAn: "Vệ sinh lưới lọc và máng nước"
      },
      {
        ngay: "28/09/2026",
        mucDo: "Hư hỏng",
        hienTrang: "Cánh bị lỗi không mở ra được, đọng sương nhiễu nước (Lần 1)",
        phuongAn: "Thay mô-tơ đảo gió và bảo dưỡng dàn lạnh"
      },
      {
        ngay: "28/09/2026",
        mucDo: "Hư hỏng",
        hienTrang: "Cánh vẫy kẹt cứng, đọng nước thành giọt chảy xuống sàn (Đề xuất DX-002)",
        phuongAn: "Thay thế cụm cánh vẫy & mô-tơ đảo gió mới"
      }
    ]
  }
];
