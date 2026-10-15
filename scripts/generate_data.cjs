const fs = require('fs');

const admin = JSON.parse(fs.readFileSync('ADMIN.json', 'utf8'));
const rows = admin.slice(1);

function excelDate(v) {
  if (!v) return '';
  const f = parseFloat(v);
  if (isNaN(f)) return v;
  const d = new Date(Date.UTC(1899, 11, 30) + f * 86400000);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function excelTime(v) {
  if (!v) return '';
  const f = parseFloat(v);
  if (isNaN(f)) return v;
  const totalMins = Math.round(f * 1440);
  const h = String(Math.floor(totalMins / 60)).padStart(2, '0');
  const m = String(totalMins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function categorize(vatPham) {
  const vp = (vatPham || '').toLowerCase();
  if (vp.includes('điều hòa') || vp.includes('máy lạnh')) return 'Điều hòa / Điện lạnh';
  if (vp.includes('sofa') || vp.includes('ghế') || vp.includes('bàn') || vp.includes('kệ') || vp.includes('tủ')) return 'Bàn ghế / Nội thất';
  if (vp.includes('mạng') || vp.includes('camera') || vp.includes('tivi') || vp.includes('máy tính')) return 'Thiết bị điện tử & Mạng';
  if (vp.includes('bồn') || vp.includes('sàn') || vp.includes('vòi') || vp.includes('cống') || vp.includes('quạt')) return 'Hạ tầng & Tiện ích';
  return 'Hạng mục khác';
}

function estimateCost(vatPham, mucDo, deXuat) {
  const vp = (vatPham || '').toLowerCase();
  const isReplace = (deXuat || '').toLowerCase().includes('thay mới');
  const isHeavy = (mucDo || '').toLowerCase().includes('nặng');
  
  if (vp.includes('điều hòa') || vp.includes('máy lạnh')) {
    if (isReplace) return 9500000;
    if (isHeavy) return 1800000;
    return 650000; // Bảo dưỡng, nạp gas, thông tắc
  }
  if (vp.includes('sofa')) {
    return 3200000; // Bọc lại toàn bộ da sofa
  }
  if (vp.includes('ghế')) {
    if (isReplace) return 1200000;
    return 350000;
  }
  if (vp.includes('bàn')) {
    if (isReplace) return 1800000;
    return 450000; // Gia cố dán keo chân bàn
  }
  if (vp.includes('tivi')) {
    if (isReplace) return 7500000;
    return 2200000; // Sửa bo mạch / panel
  }
  if (vp.includes('mạng') || vp.includes('camera')) {
    if (isReplace) return 2500000; // Router wifi chuyên dụng / switch camera
    return 600000;
  }
  if (vp.includes('bồn rửa')) {
    return 550000; // Gia cố khung và bắn silicon
  }
  if (vp.includes('sàn')) {
    return 850000; // Vá dán sàn cao su chuyên dụng
  }
  if (vp.includes('quạt')) {
    return 350000; // Thay cánh quạt
  }
  return 500000;
}

const list = rows.map((r, idx) => {
  const id = `DX-${String(idx + 1).padStart(3, '0')}`;
  const ngay = excelDate(r.A);
  const gio = excelTime(r.B);
  const nguoiDeXuat = r.C || 'Chưa rõ';
  const coSo = r.D || 'Chưa phân loại';
  const vatPham = r.E || '';
  const mucDo = r.F || 'Hư hỏng';
  const trangThaiGhiNhan = r.G || '';
  const deXuat = r.H || 'Cần sửa chữa';
  const phuongAn = r.I || '';
  const linkAnh = r.J || '';
  const nguoiKiemDuyet = r.K || '';
  const tinhTrangDuyet = r.L || 'CHƯA DUYỆT';
  const ghiChuDuyet = r.M || '';
  const thongBaoSuaChua = r.N || '';
  const nguoiKhacPhuc = r.O || 'Phạm Văn Trưởng';
  const tienDoKhacPhuc = r.P || 'Chưa xử lý';
  const ghiChuKhacPhuc = r.Q || '';
  const mucDoHaiLong = r.R || '';
  const feedbackCoSo = r.S || '';
  const danhMuc = categorize(vatPham);
  const chiPhiDuKien = estimateCost(vatPham, mucDo, deXuat);
  const chiPhi = r.T ? parseFloat(r.T) || chiPhiDuKien : 0;

  return {
    id,
    ngay,
    gio,
    nguoiDeXuat,
    coSo,
    vatPham,
    danhMuc,
    mucDo,
    trangThaiGhiNhan,
    deXuat,
    phuongAn,
    linkAnh,
    nguoiKiemDuyet,
    tinhTrangDuyet,
    ghiChuDuyet,
    thongBaoSuaChua,
    nguoiKhacPhuc,
    tienDoKhacPhuc,
    ghiChuKhacPhuc,
    mucDoHaiLong,
    feedbackCoSo,
    chiPhi,
    chiPhiDuKien
  };
});

fs.mkdirSync('src/data', { recursive: true });

const content = `/**
 * Dữ liệu chuẩn hóa từ Sheet ĐỀ XUẤT & ADMIN trong hệ thống Google Spreadsheet
 * Tổng cộng ${list.length} đề xuất sửa chữa, bảo trì, mua sắm cơ sở vật chất.
 */

export interface ProposalItem {
  id: string;
  ngay: string;
  gio: string;
  nguoiDeXuat: string;
  coSo: string;
  vatPham: string;
  danhMuc: string;
  mucDo: 'Hư hỏng nặng' | 'Hư hỏng' | 'Hư hỏng nhẹ' | 'Không hoạt động' | string;
  trangThaiGhiNhan: string;
  deXuat: 'Cần sửa chữa' | 'Thay mới hoàn toàn' | string;
  phuongAn: string;
  linkAnh: string;
  nguoiKiemDuyet: string;
  tinhTrangDuyet: 'CHƯA DUYỆT' | 'ĐÃ DUYỆT' | 'TỪ CHỐI' | 'ĐANG XEM XÉT' | string;
  ghiChuDuyet: string;
  thongBaoSuaChua: string;
  nguoiKhacPhuc: string;
  tienDoKhacPhuc: 'Chưa xử lý' | 'Đang xử lý' | 'Đã hoàn thành' | string;
  ghiChuKhacPhuc: string;
  mucDoHaiLong: string;
  feedbackCoSo: string;
  chiPhi: number;
  chiPhiDuKien: number;
}

export const INITIAL_PROPOSALS: ProposalItem[] = ${JSON.stringify(list, null, 2)};
`;

fs.writeFileSync('src/data/proposalsData.ts', content, 'utf8');
console.log('src/data/proposalsData.ts written successfully with', list.length, 'proposals.');
