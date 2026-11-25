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
 * Trích xuất timestamp từ chuỗi kiểm duyệt, ví dụ "Chương (10:45:35 29/10/2026)"
 */
function parseReviewTimestamp(val: string): number {
  if (!val) return 0;
  const m = val.match(/\((\d{1,2}):(\d{2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\)/);
  if (m) {
    const [, h, min, s, d, mon, y] = m;
    const dateObj = new Date(parseInt(y, 10), parseInt(mon, 10) - 1, parseInt(d, 10), parseInt(h, 10), parseInt(min, 10), parseInt(s, 10));
    return dateObj.getTime();
  }
  return 0;
}

// In-memory cache for target sheet title and row index mappings
let cachedSheetTitle = 'Kiểm duyệt vệ sinh';
let cachedRowsData: string[][] | null = null;
let lastCacheTime = 0;

export function invalidateSheetCache() {
  cachedRowsData = null;
  lastCacheTime = 0;
}

async function getSheetRows(spreadsheetId: string, token: string, force = false): Promise<{ title: string; rows: string[][] }> {
  const now = Date.now();
  if (!force && cachedRowsData && now - lastCacheTime < 30000) {
    return { title: cachedSheetTitle, rows: cachedRowsData };
  }

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
    const errJson = await metaResp.json().catch(() => null);
    throw new Error(errJson?.error?.message || `HTTP ${metaResp.status}`);
  }

  const meta = await metaResp.json();
  const sheetsList = meta.sheets || [];
  if (!sheetsList.length) {
    throw new Error('Spreadsheet không có trang tính nào.');
  }

  let targetSheetTitle = sheetsList[0]?.properties?.title || 'Trang tính1';
  for (const s of sheetsList) {
    const title = s?.properties?.title || '';
    const normTitle = title.toLowerCase();
    if (normTitle.includes('kiểm duyệt') || normTitle.includes('vệ sinh')) {
      targetSheetTitle = title;
      break;
    }
  }

  cachedSheetTitle = targetSheetTitle;

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
  cachedRowsData = rows;
  lastCacheTime = Date.now();

  return { title: targetSheetTitle, rows };
}

async function ensureErrorAiHeader(
  spreadsheetId: string,
  targetSheetTitle: string,
  rows: string[][],
  token: string
) {
  if (rows.length === 0) {
    const headerRange = `${encodeURIComponent(targetSheetTitle)}!A1:N1`;
    const headers = [
      'Ngày', 'Giờ', 'Người kiểm tra', 'Cơ sở', 'Khu vực',
      'Trạng thái', 'Điểm số', 'Chi tiết', 'Phản hồi',
      'Feedback từ người dùng', 'Link ảnh', 'Đã duyệt', 'Lỗi AI', 'Thời gian đồng bộ',
    ];
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${headerRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `${targetSheetTitle}!A1:N1`,
          majorDimension: 'ROWS',
          values: [headers],
        }),
      }
    ).catch(() => {});
    if (cachedRowsData) cachedRowsData[0] = headers;
    return;
  }

  const m1 = String(rows[0]?.[12] || '').trim();
  if (!m1 || m1.toLowerCase() === 'không đạt') {
    const m1Range = `${encodeURIComponent(targetSheetTitle)}!M1`;
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${m1Range}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `${targetSheetTitle}!M1`,
          majorDimension: 'ROWS',
          values: [['Lỗi AI']],
        }),
      }
    ).catch(() => {});
    if (rows[0]) rows[0][12] = 'Lỗi AI';
    if (cachedRowsData && cachedRowsData[0]) cachedRowsData[0][12] = 'Lỗi AI';
  }
}

/**
 * Trực tiếp cập nhật hàng trong Google Sheet qua Google Sheets API v4
 * Tuyệt đối bảo đảm tính loại trừ lẫn nhau:
 * - Khi tick 'Đã duyệt' -> Cột L = Tên người duyệt, Cột M = "" (Xóa kết quả Lỗi AI cũ)
 * - Khi tick 'Lỗi AI' -> Cột M = Tên người duyệt, Cột L = "" (Xóa kết quả Đã duyệt cũ)
 * - Khi bỏ tick -> Cột L = "", Cột M = ""
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
    const { title: targetSheetTitle, rows } = await getSheetRows(spreadsheetId, token);
    await ensureErrorAiHeader(spreadsheetId, targetSheetTitle, rows, token);

    // Chuẩn bị thông tin ghi
    const revTimeStr = record.thoiGianKiemDuyet
      ? new Date(record.thoiGianKiemDuyet).toLocaleString('vi-VN')
      : new Date().toLocaleString('vi-VN');
    const reviewerInfo = record.nguoiKiemDuyet ? `${record.nguoiKiemDuyet} (${revTimeStr})` : '';

    // BẢO ĐẢM TÍNH LOẠI TRỪ LẪN NHAU & XÓA KẾT QUẢ CŨ:
    let daDuyetVal = '';
    let khongDatVal = '';
    if (record.reviewStatus === 'approved') {
      daDuyetVal = reviewerInfo || 'Đã duyệt';
      khongDatVal = ''; // XÓA CỘT LỖI AI / KHÔNG ĐẠT CŨ
    } else if (record.reviewStatus === 'rejected') {
      daDuyetVal = ''; // XÓA CỘT ĐÃ DUYỆT CŨ
      khongDatVal = reviewerInfo || 'Lỗi AI';
    } else {
      daDuyetVal = ''; // Bỏ tick: xóa cả 2 cột
      khongDatVal = '';
    }

    const targetLink = normLink(record.linkAnh);
    const targetDate = normalizeDateToIso(record.ngay);
    const targetFacility = normStr(normalizeFacilityName(record.coSo));
    const targetArea = normStr(record.khuVuc);

    let matchRowIdx = -1; // 1-indexed

    // 1. Tìm hàng khớp theo link ảnh
    if (targetLink && targetLink.length > 8) {
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const rLink = normLink(r[10] || ''); // Col K: Link ảnh (index 10)
        if (rLink && (targetLink === rLink || targetLink.includes(rLink) || rLink.includes(targetLink))) {
          matchRowIdx = i + 1;
          break;
        }
      }
    }

    // 2. Nếu không khớp theo link ảnh, khớp theo ngày + cơ sở + khu vực
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
      // Ghi rõ cả 3 cột để nếu có kết quả cũ ở cột đối diện sẽ bị xóa sạch ngay lập tức
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

      // Cập nhật lại cache nội bộ
      if (cachedRowsData && cachedRowsData[matchRowIdx - 1]) {
        cachedRowsData[matchRowIdx - 1][11] = daDuyetVal;
        cachedRowsData[matchRowIdx - 1][12] = khongDatVal;
        cachedRowsData[matchRowIdx - 1][13] = revTimeStr;
      }

      return {
        success: true,
        rowUpdated: matchRowIdx,
        message: `Đã cập nhật hàng ${matchRowIdx} (thay thế kết quả cũ) trên Google Sheet!`,
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
        record.trangThai || 'Không đạt',
        record.diemSo !== undefined ? String(record.diemSo) : '',
        record.chiTiet || '',
        record.phanHoi || '',
        record.feedbackNguoiDung || '',
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

      // Invalidate cache
      invalidateSheetCache();

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

/**
 * Cập nhật hàng loạt nhiều bản ghi vào Google Sheet qua một lệnh gọi duy nhất (batchUpdate)
 */
export async function batchSyncReviewsDirectToSheet(
  records: ImageReviewRecord[],
  customSpreadsheetId?: string
): Promise<{ success: boolean; updatedCount: number; message: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, updatedCount: 0, message: 'Chưa đăng nhập Google Workspace.' };
  }

  const spreadsheetId = customSpreadsheetId || getTargetSpreadsheetId();

  try {
    const { title: targetSheetTitle, rows } = await getSheetRows(spreadsheetId, token, true);
    await ensureErrorAiHeader(spreadsheetId, targetSheetTitle, rows, token);
    const nowStr = new Date().toLocaleString('vi-VN');

    const updateData: Array<{ range: string; values: string[][] }> = [];
    const appendRows: string[][] = [];

    for (const record of records) {
      const revTimeStr = record.thoiGianKiemDuyet
        ? new Date(record.thoiGianKiemDuyet).toLocaleString('vi-VN')
        : nowStr;
      const reviewerInfo = record.nguoiKiemDuyet ? `${record.nguoiKiemDuyet} (${revTimeStr})` : '';

      let daDuyetVal = '';
      let khongDatVal = '';
      if (record.reviewStatus === 'approved') {
        daDuyetVal = reviewerInfo || 'Đã duyệt';
        khongDatVal = '';
      } else if (record.reviewStatus === 'rejected') {
        daDuyetVal = '';
        khongDatVal = reviewerInfo || 'Lỗi AI';
      }

      const targetLink = normLink(record.linkAnh);
      const targetDate = normalizeDateToIso(record.ngay);
      const targetFacility = normStr(normalizeFacilityName(record.coSo));
      const targetArea = normStr(record.khuVuc);

      let matchRowIdx = -1;
      if (targetLink && targetLink.length > 8) {
        for (let i = 1; i < rows.length; i++) {
          const rLink = normLink(rows[i][10] || '');
          if (rLink && (targetLink === rLink || targetLink.includes(rLink) || rLink.includes(targetLink))) {
            matchRowIdx = i + 1;
            break;
          }
        }
      }

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
        updateData.push({
          range: `${targetSheetTitle}!L${matchRowIdx}:N${matchRowIdx}`,
          values: [[daDuyetVal, khongDatVal, revTimeStr]],
        });
      } else {
        appendRows.push([
          record.ngay,
          record.gio || '',
          record.nguoiBaoCao || '',
          record.coSo,
          record.khuVuc || '',
          record.trangThai || 'Không đạt',
          record.diemSo !== undefined ? String(record.diemSo) : '',
          record.chiTiet || '',
          record.phanHoi || '',
          record.feedbackNguoiDung || '',
          record.linkAnh,
          daDuyetVal,
          khongDatVal,
          revTimeStr,
        ]);
      }
    }

    if (updateData.length === 0 && appendRows.length === 0) {
      return { success: true, updatedCount: 0, message: 'Không có bản ghi nào cần cập nhật.' };
    }

    if (updateData.length > 0) {
      const batchResp = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: updateData,
          }),
        }
      );

      if (!batchResp.ok) {
        const errJson = await batchResp.json().catch(() => null);
        throw new Error(errJson?.error?.message || `HTTP ${batchResp.status}`);
      }
    }

    if (appendRows.length > 0) {
      const appendRange = `${encodeURIComponent(targetSheetTitle)}!A:N`;
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
            values: appendRows,
          }),
        }
      );
      if (!appendResp.ok) {
        const errJson = await appendResp.json().catch(() => null);
        throw new Error(errJson?.error?.message || `HTTP ${appendResp.status}`);
      }
    }

    invalidateSheetCache();

    const totalTouched = updateData.length + appendRows.length;
    return {
      success: true,
      updatedCount: totalTouched,
      message: `Đã cập nhật trực tiếp ${totalTouched} hàng trên Google Sheet!`,
    };
  } catch (err: any) {
    return {
      success: false,
      updatedCount: 0,
      message: err.message || 'Lỗi cập nhật hàng loạt trên Sheet',
    };
  }
}

export interface LowScoreSheetRecord {
  ngay: string;
  gio: string;
  nguoiKiemTra: string;
  coSo: string;
  khuVuc: string;
  trangThai: string;
  diemSo: number | string;
  chiTiet: string;
  phanHoi: string;
  feedbackNguoiDung: string;
  linkAnh: string;
  daDuyet: string;
  khongDat: string;
}

/**
 * Tự động ghi bổ sung các ảnh điểm thấp (< 80đ) chưa có trong Google Sheet mà không ghi đè dữ liệu đã tích duyệt.
 */
export async function syncLowScoreRecordsDirectToSheet(
  dateIso: string,
  records: LowScoreSheetRecord[],
  customSpreadsheetId?: string
): Promise<{ success: boolean; appendedCount: number; message: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, appendedCount: 0, message: 'Chưa đăng nhập Google Workspace.' };
  }

  const spreadsheetId = customSpreadsheetId || getTargetSpreadsheetId();

  try {
    const { title: targetSheetTitle, rows } = await getSheetRows(spreadsheetId, token, true);
    await ensureErrorAiHeader(spreadsheetId, targetSheetTitle, rows, token);

    const existingLinks = new Set<string>();
    const existingKeys = new Set<string>();
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const rLink = normLink(r[10] || '');
      if (rLink) existingLinks.add(rLink);
      const rDate = normalizeDateToIso(r[0] || '');
      const rCoSo = normStr(normalizeFacilityName(r[3] || ''));
      const rArea = normStr(r[4] || '');
      if (rDate && rCoSo && rArea) {
        existingKeys.add(`${rDate}|${rCoSo}|${rArea}`);
      }
    }

    const nowStr = new Date().toLocaleString('vi-VN');
    const appendRows: string[][] = [];

    for (const r of records) {
      const linkKey = normLink(r.linkAnh || '');
      const recDate = normalizeDateToIso(r.ngay) || dateIso;
      const recKey = `${recDate}|${normStr(normalizeFacilityName(r.coSo))}|${normStr(r.khuVuc)}`;
      if (linkKey ? existingLinks.has(linkKey) : existingKeys.has(recKey)) {
        continue;
      }
      if (linkKey) existingLinks.add(linkKey);
      existingKeys.add(recKey);

      appendRows.push([
        recDate,
        r.gio || '',
        r.nguoiKiemTra || '',
        r.coSo || '',
        r.khuVuc || '',
        r.trangThai || '',
        r.diemSo !== undefined ? String(r.diemSo) : '',
        r.chiTiet || '',
        r.phanHoi || '',
        r.feedbackNguoiDung || '',
        r.linkAnh || '',
        r.daDuyet || '',
        r.khongDat || '',
        nowStr,
      ]);
    }

    if (appendRows.length > 0) {
      const appendRange = `${encodeURIComponent(targetSheetTitle)}!A:N`;
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
            values: appendRows,
          }),
        }
      );
      if (!appendResp.ok) {
        const errJson = await appendResp.json().catch(() => null);
        throw new Error(errJson?.error?.message || `HTTP ${appendResp.status}`);
      }
      invalidateSheetCache();
    }

    return {
      success: true,
      appendedCount: appendRows.length,
      message: appendRows.length > 0
        ? `Đã tự động thêm ${appendRows.length} ảnh điểm thấp (<80đ) vào Google Sheet.`
        : 'Tất cả ảnh điểm thấp (<80đ) đã có sẵn trong Google Sheet.',
    };
  } catch (err: any) {
    return {
      success: false,
      appendedCount: 0,
      message: err.message || 'Lỗi tự động ghi dữ liệu sang Google Sheet',
    };
  }
}

/**
 * Quét toàn bộ sheet và dọn dẹp các hàng đang bị 2 kết quả (vừa có Đã duyệt, vừa có Không đạt)
 * Giữ lại kết quả mới nhất theo thời gian, xóa kết quả cũ để 2 cột luôn chuẩn xác
 */
export async function cleanDuplicateReviewsInSheet(
  targetDateIso?: string,
  customSpreadsheetId?: string
): Promise<{ success: boolean; cleanedCount: number; message: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, cleanedCount: 0, message: 'Chưa đăng nhập Google Workspace.' };
  }

  const spreadsheetId = customSpreadsheetId || getTargetSpreadsheetId();

  try {
    const { title: targetSheetTitle, rows } = await getSheetRows(spreadsheetId, token, true);
    const updates: Array<{ range: string; values: string[][] }> = [];
    const nowStr = new Date().toLocaleString('vi-VN');

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowDate = normalizeDateToIso(row[0] || '');
      if (targetDateIso && rowDate !== targetDateIso) continue;

      const daDuyet = String(row[11] || '').trim();
      const khongDat = String(row[12] || '').trim();

      // Phát hiện hàng có cả 2 kết quả
      if (daDuyet && khongDat) {
        const timeL = parseReviewTimestamp(daDuyet);
        const timeM = parseReviewTimestamp(khongDat);

        let finalDaDuyet = '';
        let finalKhongDat = '';

        if (timeL >= timeM) {
          // Đã duyệt mới hơn (hoặc bằng nhau) -> Giữ Đã duyệt, xóa Không đạt
          finalDaDuyet = daDuyet;
          finalKhongDat = '';
        } else {
          // Không đạt mới hơn -> Giữ Không đạt, xóa Đã duyệt
          finalDaDuyet = '';
          finalKhongDat = khongDat;
        }

        const rowNum = i + 1;
        updates.push({
          range: `${targetSheetTitle}!L${rowNum}:N${rowNum}`,
          values: [[finalDaDuyet, finalKhongDat, nowStr]],
        });
      }
    }

    if (updates.length === 0) {
      return { success: true, cleanedCount: 0, message: 'Không có dòng nào bị trùng 2 kết quả!' };
    }

    const batchResp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: updates,
        }),
      }
    );

    if (!batchResp.ok) {
      const errJson = await batchResp.json().catch(() => null);
      throw new Error(errJson?.error?.message || `HTTP ${batchResp.status}`);
    }

    invalidateSheetCache();

    return {
      success: true,
      cleanedCount: updates.length,
      message: `Đã dọn dẹp và xóa bỏ kết quả cũ cho ${updates.length} hàng trên Google Sheet!`,
    };
  } catch (err: any) {
    return {
      success: false,
      cleanedCount: 0,
      message: err.message || 'Lỗi dọn dẹp hàng trùng',
    };
  }
}
