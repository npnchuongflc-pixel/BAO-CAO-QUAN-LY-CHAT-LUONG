import { ImageReviewRecord } from './imageReviewService';
import { getAccessToken } from './workspaceAuth';
import { normalizeDateToIso } from '../utils/dateUtils';
import { normalizeFacilityName } from '../utils/facilityUtils';

export const DEFAULT_MASTER_SPREADSHEET_ID = '1003lfdUh6S_Tkg5H4qChw7KrziAon1uvgkoFMj9FK0E';
const TARGET_SHEET_STORAGE_KEY = 'target_master_spreadsheet_id_v1';

export const getTargetSpreadsheetId = (): string => {
  try {
    return localStorage.getItem(TARGET_SHEET_STORAGE_KEY) || DEFAULT_MASTER_SPREADSHEET_ID;
  } catch {
    return DEFAULT_MASTER_SPREADSHEET_ID;
  }
};

export const setTargetSpreadsheetId = (id: string) => {
  try {
    localStorage.setItem(TARGET_SHEET_STORAGE_KEY, id.trim() || DEFAULT_MASTER_SPREADSHEET_ID);
  } catch {}
};

export interface SheetSyncResult {
  success: boolean;
  message: string;
  rowUpdated?: number;
  needAuth?: boolean;
  error?: string;
}

const normLink = (val: string) => {
  if (!val) return '';
  const m = val.match(/https?:\/\/[^\s"'\)]+/i);
  return m ? m[0].split('?')[0].trim().toLowerCase() : val.trim().toLowerCase();
};

const normStr = (val: string) => (val || '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Trực tiếp cập nhật hàng trong Google Sheet qua Google Sheets API v4
 */
export async function syncReviewDirectToSheet(
  record: ImageReviewRecord,
  customSpreadsheetId?: string
): Promise<SheetSyncResult> {
  const token = await getAccessToken();
  if (!token) {
    return {
      success: false,
      needAuth: true,
      message: 'Chưa đăng nhập Google Workspace hoặc phiên đăng nhập hết hạn.',
    };
  }

  const spreadsheetId = customSpreadsheetId || getTargetSpreadsheetId();

  try {
    // 1. Lấy thông tin Spreadsheet metadata để tìm tên tab
    const metaResp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    if (!metaResp.ok) {
      if (metaResp.status === 401 || metaResp.status === 403) {
        return {
          success: false,
          needAuth: true,
          message: `Lỗi xác thực Google Sheets (${metaResp.status}). Vui lòng cấp quyền lại.`,
        };
      }
      const errJson = await metaResp.json().catch(() => null);
      throw new Error(errJson?.error?.message || `HTTP ${metaResp.status}`);
    }

    const meta = await metaResp.json();
    const sheetsList = meta.sheets || [];
    if (!sheetsList.length) {
      throw new Error('Spreadsheet không có trang tính nào.');
    }

    // Ưu tiên tìm tab có tên "Kiểm duyệt vệ sinh", "Kiểm duyệt", hoặc dùng tab đầu tiên
    let targetSheetTitle = sheetsList[0]?.properties?.title || 'Trang tính1';
    for (const s of sheetsList) {
      const title = s?.properties?.title || '';
      const normTitle = title.toLowerCase();
      if (normTitle.includes('kiểm duyệt') || normTitle.includes('vệ sinh')) {
        targetSheetTitle = title;
        break;
      }
    }

    // 2. Đọc toàn bộ dữ liệu bảng tính cột A đến N
    const range = `${encodeURIComponent(targetSheetTitle)}!A:N`;
    const readResp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    if (!readResp.ok) {
      throw new Error(`Không thể đọc dữ liệu trang tính: HTTP ${readResp.status}`);
    }

    const readData = await readResp.json();
    const rows: string[][] = readData.values || [];

    // Chuẩn bị thông tin ghi
    const revTimeStr = record.thoiGianKiemDuyet
      ? new Date(record.thoiGianKiemDuyet).toLocaleString('vi-VN')
      : new Date().toLocaleString('vi-VN');
    const reviewerInfo = record.nguoiKiemDuyet ? `${record.nguoiKiemDuyet} (${revTimeStr})` : '';

    let daDuyetVal = '';
    let khongDatVal = '';
    if (record.reviewStatus === 'approved') {
      daDuyetVal = reviewerInfo || 'Đã duyệt';
    } else if (record.reviewStatus === 'rejected') {
      khongDatVal = reviewerInfo || 'Không đạt';
    }

    const targetLink = normLink(record.linkAnh);
    const targetDate = normalizeDateToIso(record.ngay);
    const targetFacility = normStr(normalizeFacilityName(record.coSo));
    const targetArea = normStr(record.khuVuc);

    let matchRowIdx = -1; // 1-indexed

    // Tìm hàng khớp
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const rLink = normLink(r[10] || ''); // Col K: Link ảnh (index 10)
      if (targetLink && rLink && targetLink === rLink) {
        matchRowIdx = i + 1;
        break;
      }
    }

    // Nếu không khớp theo link ảnh, khớp theo ngày + cơ sở + khu vực
    if (matchRowIdx === -1 && targetDate && targetFacility && targetArea) {
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const rDate = normalizeDateToIso(r[0] || '');
        const rCoSo = normStr(normalizeFacilityName(r[3] || ''));
        const rArea = normStr(r[4] || '');
        if (rDate === targetDate && rCoSo === targetFacility && rArea === targetArea) {
          matchRowIdx = i + 1;
          break;
        }
      }
    }

    if (matchRowIdx > 0) {
      // Cập nhật trực tiếp 3 cột L (Đã duyệt), M (Không đạt), N (Thời gian cập nhật)
      const updateRange = `${encodeURIComponent(targetSheetTitle)}!L${matchRowIdx}:N${matchRowIdx}`;
      const updateResp = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: `${targetSheetTitle}!L${matchRowIdx}:N${matchRowIdx}`,
            majorDimension: 'ROWS',
            values: [[daDuyetVal, khongDatVal, revTimeStr]],
          }),
        }
      );

      if (!updateResp.ok) {
        const errJson = await updateResp.json().catch(() => null);
        throw new Error(errJson?.error?.message || `Cập nhật ô tính thất bại: HTTP ${updateResp.status}`);
      }

      return {
        success: true,
        rowUpdated: matchRowIdx,
        message: `Đã cập nhật hàng ${matchRowIdx} trong tab '${targetSheetTitle}' trên Google Sheet!`,
      };
    } else {
      // Hàng chưa có trong sheet -> append thêm mới vào cuối bảng
      const appendRange = `${encodeURIComponent(targetSheetTitle)}!A:N`;
      const newRowValues = [
        record.ngay,
        record.gio || '',
        record.nguoiBaoCao || '',
        record.coSo,
        record.khuVuc || '',
        'Đạt',
        '100',
        '',
        '',
        '',
        record.linkAnh,
        daDuyetVal,
        khongDatVal,
        revTimeStr,
      ];

      const appendResp = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: `${targetSheetTitle}!A:N`,
            majorDimension: 'ROWS',
            values: [newRowValues],
          }),
        }
      );

      if (!appendResp.ok) {
        const errJson = await appendResp.json().catch(() => null);
        throw new Error(errJson?.error?.message || `Thêm hàng mới thất bại: HTTP ${appendResp.status}`);
      }

      return {
        success: true,
        message: `Đã thêm mới bản ghi vào tab '${targetSheetTitle}' trên Google Sheet!`,
      };
    }
  } catch (err: any) {
    console.error('Lỗi syncReviewDirectToSheet:', err);
    return {
      success: false,
      error: err.message || 'Lỗi kết nối Google Sheets API',
      message: `Không thể đồng bộ Google Sheet: ${err.message || 'Lỗi không xác định'}`,
    };
  }
}
