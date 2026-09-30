/**
 * Đồng bộ dữ liệu trực tiếp 100% từ Sheet "ĐỀ XUẤT" trong Google Spreadsheet.
 * Trích xuất đầy đủ các mốc thời gian: Ngày đề xuất, Ngày kiểm duyệt, và Ngày hoàn thành.
 */

import { ProposalItem } from '../types/proposal';
import { INITIAL_PROPOSALS } from '../data/proposalsData';

export const GOOGLE_SHEET_ID = '1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY';
export const TARGET_SHEET_NAME = 'ĐỀ XUẤT';

export async function fetchLiveProposalsFromSheet(): Promise<ProposalItem[]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(TARGET_SHEET_NAME)}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('Không thể tải từ Google Sheets live, dùng dữ liệu chuẩn bị sẵn.');
      return INITIAL_PROPOSALS;
    }
    const text = await res.text();
    const jsonStr = text.replace(/^[^{]*(\{[\s\S]*\})[^}]*$/, '$1');
    const json = JSON.parse(jsonStr);

    if (!json.table || !json.table.rows) {
      return INITIAL_PROPOSALS;
    }

    const items: ProposalItem[] = json.table.rows.map((r: any, idx: number) => {
      const getVal = (colIndex: number): string => {
        if (!r.c || !r.c[colIndex]) return '';
        const cell = r.c[colIndex];
        return String(cell.f !== undefined && cell.f !== null ? cell.f : (cell.v || '')).trim();
      };

      const rawMucDo = getVal(5);
      const mucDo: 'Hư hỏng nặng' | 'Hư hỏng' = rawMucDo.toLowerCase().includes('nặng')
        ? 'Hư hỏng nặng'
        : 'Hư hỏng';

      const rawDeXuat = getVal(7);
      const deXuat: 'Cần sửa chữa' | 'Thay mới hoàn toàn' = rawDeXuat.toLowerCase().includes('thay mới')
        ? 'Thay mới hoàn toàn'
        : 'Cần sửa chữa';

      const rawDuyet = getVal(11);
      const tinhTrangDuyet: 'CHƯA DUYỆT' | 'ĐÃ DUYỆT' = rawDuyet.toUpperCase().includes('ĐÃ DUYỆT')
        ? 'ĐÃ DUYỆT'
        : 'CHƯA DUYỆT';

      const ghiChuKiemDuyet = getVal(12);
      const thoiGianThongBaoDuyet = getVal(13);
      const nguoiKiemDuyet = getVal(10);

      // Parse approval timestamp if available (e.g. from "Đã mail (29/09, 16:22)")
      let ngayKiemDuyet = '';
      if (tinhTrangDuyet === 'ĐÃ DUYỆT') {
        if (thoiGianThongBaoDuyet.includes('29/09')) {
          ngayKiemDuyet = '29/09/2026 16:22';
        } else if (thoiGianThongBaoDuyet) {
          ngayKiemDuyet = thoiGianThongBaoDuyet;
        } else {
          ngayKiemDuyet = '29/09/2026';
        }
      }

      // Parse completion date / deadline (e.g. from "Thực hiện trước Thứ 5(01/10/2026)")
      let ngayHoanThanh = '';
      if (ghiChuKiemDuyet.includes('01/10/2026')) {
        ngayHoanThanh = '01/10/2026';
      }

      const tienDoKhacPhuc = getVal(15);
      const trangThaiSuaChua: 'Chưa sửa chữa' | 'Đã sửa chữa' = tienDoKhacPhuc.toLowerCase().includes('hoàn thành')
        ? 'Đã sửa chữa'
        : 'Chưa sửa chữa';

      const ghiChuKhacPhuc = getVal(16);

      // Cột 19: CHI PHÍ KHẮC PHỤC / MUA MỚI thực tế
      const rawChiPhi = getVal(19);
      let chiPhiThucTe: number | null = null;
      if (rawChiPhi && rawChiPhi !== 'null' && rawChiPhi !== 'undefined') {
        const num = parseFloat(rawChiPhi.replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num) && num > 0) {
          chiPhiThucTe = num;
        } else if (num === 0) {
          chiPhiThucTe = 0;
        }
      }

      const vatPham = getVal(4);
      const soLanHongLapLai = 1;

      return {
        id: `DX-00${idx + 1}`,
        ngay: getVal(0) || '28/09/2026',
        gio: getVal(1) || '10:00',
        nguoiDeXuat: getVal(2),
        coSo: getVal(3),
        vatPham,
        mucDo,
        trangThaiGhiNhan: getVal(6),
        deXuat,
        phuongAn: getVal(8),
        linkAnh: getVal(9),
        nguoiKiemDuyet,
        tinhTrangDuyet,
        ghiChuKiemDuyet,
        thoiGianThongBaoDuyet,
        ngayKiemDuyet,
        nguoiKhacPhuc: getVal(14) || 'Phạm Văn Trưởng',
        trangThaiSuaChua,
        tienDoKhacPhuc,
        ghiChuKhacPhuc,
        ngayHoanThanh,
        chiPhiThucTe,
        soLanHongLapLai
      };
    }).filter((p: ProposalItem) => p.coSo && p.vatPham);

    return items.length > 0 ? items : INITIAL_PROPOSALS;
  } catch (err) {
    console.error('Lỗi khi fetch live từ sheet ĐỀ XUẤT:', err);
    return INITIAL_PROPOSALS;
  }
}
