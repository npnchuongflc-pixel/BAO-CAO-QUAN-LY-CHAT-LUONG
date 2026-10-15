/**
 * Đồng bộ dữ liệu trực tiếp 100% từ Sheet "ĐỀ XUẤT" (gid=169229004).
 * Link trang tính: docs.google.com/spreadsheets/d/1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY/edit?pli=1&gid=169229004
 */

import { ProposalItem } from '../types/proposal';
import { INITIAL_PROPOSALS } from '../data/proposalsData';

export const GOOGLE_SHEET_ID = '1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY';
export const TARGET_GID = '169229004';
export const TARGET_SHEET_NAME = 'ĐỀ XUẤT';

// Parse approval date/time from column 13: "THÔNG BÁO ĐẾN BỘ PHẬN SỬA CHỮA"
export function parseApprovalDate(thongBao: string): string {
  if (!thongBao) return '';
  const m = thongBao.match(/(\d{1,2}\/\d{1,2}),?\s*(\d{1,2}:\d{2})/);
  if (m) {
    const [_, dayMonth, time] = m;
    return `${dayMonth}/2026 ${time}`;
  }
  return '';
}

// Parse repair date from image timestamp or approval context
export function parseRepairDate(
  trangThaiSuaChua: string,
  anhSau: string,
  thongBaoDuyet: string,
  ngayDeXuat: string
): string {
  if (!trangThaiSuaChua.toLowerCase().includes('xong')) return '';
  if (anhSau) {
    const m = anhSau.match(/_(\d{13})_/);
    if (m) {
      const dt = new Date(parseInt(m[1], 10));
      const pad = (n: number) => String(n).padStart(2, '0');
      // Format to Vietnam time DD/MM/YYYY HH:mm
      return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/2026 ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }
  }
  const appDate = parseApprovalDate(thongBaoDuyet);
  if (appDate) return appDate.split(' ')[0];
  return ngayDeXuat;
}

// Parse cost from column 19: "CHI PHÍ KHẮC PHỤC / MUA MỚI"
export function parseCost(costStr: string): number | null {
  if (!costStr) return null;
  const clean = costStr.replace(/[^0-9]/g, '');
  if (clean === '') return null;
  return parseInt(clean, 10);
}

export async function fetchLiveProposalsFromSheet(): Promise<ProposalItem[]> {
  try {
    let json: any = null;

    // 1. Thử fetch trực tiếp từ Google Sheets gviz API với cache-busting timestamp
    try {
      const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&gid=${TARGET_GID}&_t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        const jsonStr = text.replace(/^[^{]*(\{[\s\S]*\})[^}]*$/, '$1');
        json = JSON.parse(jsonStr);
      }
    } catch (directErr) {
      console.warn('Direct fetch from Google Sheets encountered an issue, trying backend proxy...', directErr);
    }

    // 2. Dự phòng: Nếu fetch trực tiếp bị CORS hoặc chặn mạng, gọi qua proxy server
    if (!json || !json.table || !json.table.rows) {
      try {
        const proxyRes = await fetch(`/api/proposals-sheet?force=true&_t=${Date.now()}`, { cache: 'no-store' });
        if (proxyRes.ok) {
          const proxyData = await proxyRes.json();
          if (proxyData && proxyData.table && proxyData.table.rows) {
            json = proxyData;
          }
        }
      } catch (proxyErr) {
        console.warn('Proxy fetch also encountered an issue:', proxyErr);
      }
    }

    if (!json || !json.table || !json.table.rows || json.table.rows.length === 0) {
      return INITIAL_PROPOSALS;
    }

    const items: ProposalItem[] = json.table.rows.map((r: any, idx: number) => {
      const getVal = (colIndex: number): string => {
        if (!r.c || !r.c[colIndex]) return '';
        const cell = r.c[colIndex];
        return String(cell.f !== undefined && cell.f !== null ? cell.f : (cell.v || '')).trim();
      };

      const id = `DX-${String(idx + 1).padStart(3, '0')}`;
      const ngayDeXuat = getVal(0) || '28/09/2026';
      const gio = getVal(1) || '10:00';
      const nguoiDeXuat = getVal(2);
      const coSo = getVal(3);
      const rawVatPham = getVal(4);
      const vatPham = rawVatPham || `[${coSo || 'Cơ sở'}] Đề xuất vật tư / CSVC`;
      const mucDo = getVal(5) || 'Hư hỏng';
      const trangThaiGhiNhan = getVal(6) || 'Chờ kiểm tra hiện trạng';
      const deXuat = getVal(7) || 'Cần sửa chữa';
      const phuongAn = getVal(8) || 'Kỹ thuật viên kiểm tra xử lý';
      const linkAnh = getVal(9);
      const nguoiKiemDuyet = getVal(10);
      const rawDuyet = getVal(11);
      const tinhTrangDuyet: 'ĐÃ DUYỆT' | 'CHƯA DUYỆT' = rawDuyet.toUpperCase().includes('ĐÃ DUYỆT')
        ? 'ĐÃ DUYỆT'
        : 'CHƯA DUYỆT';

      const ghiChuKiemDuyet = getVal(12);
      const thongBaoDuyet = getVal(13);
      const ngayKiemDuyet = parseApprovalDate(thongBaoDuyet);

      const nguoiKhacPhuc = getVal(14) || 'Phạm Văn Trưởng';
      const rawTienDo = getVal(15);
      const trangThaiSuaChua: 'Đã khắc phục xong' | 'Chưa xử lý' = rawTienDo.toLowerCase().includes('xong')
        ? 'Đã khắc phục xong'
        : 'Chưa xử lý';

      const ghiChuKhacPhuc = getVal(16);
      const chiPhiGocStr = getVal(19);
      const chiPhiThucTe = parseCost(chiPhiGocStr);
      const anhSauSua = getVal(20);
      const ngaySuaChua = parseRepairDate(trangThaiSuaChua, anhSauSua, thongBaoDuyet, ngayDeXuat);

      return {
        id,
        rowNumber: idx + 1,
        ngay: ngayDeXuat,
        gio,
        nguoiDeXuat,
        coSo,
        vatPham,
        mucDo,
        trangThaiGhiNhan,
        deXuat,
        phuongAn,
        linkAnh,
        nguoiKiemDuyet,
        tinhTrangDuyet,
        ngayKiemDuyet,
        ghiChuKiemDuyet,
        thongBaoDuyet,
        nguoiKhacPhuc,
        trangThaiSuaChua,
        ngaySuaChua,
        ghiChuKhacPhuc,
        chiPhiThucTe,
        chiPhiGocStr,
        anhSauSua
      };
    }).filter((p: ProposalItem) => p.coSo || p.vatPham);

    return items.length > 0 ? items : INITIAL_PROPOSALS;
  } catch (err) {
    console.error('Lỗi khi fetch live từ sheet gid=169229004:', err);
    return INITIAL_PROPOSALS;
  }
}
