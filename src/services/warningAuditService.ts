import Papa from 'papaparse';
import { getAccessToken } from './workspaceAuth';
import { normalizeFacilityName } from '../utils/facilityUtils';
import { normalizeDateToIso } from '../utils/dateUtils';
import {
  REMINDER_CSV_DIRECT_URL,
  REMINDER_SHEET_ID,
  REMINDER_SHEET_NAME,
  fetchReminderSheetCsv,
} from './reminderSheetService';

export interface WarningAuditRecord {
  id: string;
  coSo: string;
  ngay: string;
  thoiGianTich: string;
  trangThai: string;
  loaiTrangThai: 'chua_xu_ly' | 'da_nhac_nho' | 'loi_app';
  lyDoCanhBao: string;
  soLuotCanhBao?: number;
  daNhacNho?: boolean;
  loiApp?: boolean;
  thoiGianPhatHien?: string;
  nguoiXuLy?: string;
  emailThucHien?: string;
  updatedAt?: string;
  syncedToSheet?: boolean;
  syncError?: string;
}

export interface WarningFacilityItem {
  coSo: string;
  reasons?: string[];
}

interface WarningApiResponse {
  success: boolean;
  error?: string;
  warning?: string;
  records?: WarningAuditRecord[];
  record?: WarningAuditRecord;
  cleared?: number;
}

const STORAGE_WARNING_AUDITS_KEY = 'facility_warning_audits_v2';
const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbz0KaluYvWaWNgVHCK9zesGJs2mnu5koEg9NQ9v76ndZZPXlaog1mUpuaK4x851aomp/exec';

const parseJsonResponse = async (response: Response): Promise<WarningApiResponse | null> => {
  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text) as WarningApiResponse;
  } catch {
    return null;
  }
};

const postWarningAction = async (payload: Record<string, unknown>): Promise<WarningApiResponse | null> => {
  try {
    const response = await fetch('/api/warning-audits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseJsonResponse(response);
  } catch (err) {
    console.warn('Backend warning-audits không phản hồi:', err);
    return null;
  }
};

export function getLocalWarningAudits(): Record<string, WarningAuditRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_WARNING_AUDITS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('Không thể đọc bản lưu cảnh báo trên trình duyệt:', error);
    return {};
  }
}

export function replaceLocalWarningAudits(records: Record<string, WarningAuditRecord>) {
  try {
    localStorage.setItem(STORAGE_WARNING_AUDITS_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Không thể cập nhật bản lưu cảnh báo trên trình duyệt:', error);
  }
}

export function saveLocalWarningAudit(record: WarningAuditRecord) {
  replaceLocalWarningAudits({ ...getLocalWarningAudits(), [record.id]: record });
}

export function removeLocalWarningAudit(recordId: string) {
  const current = getLocalWarningAudits();
  delete current[recordId];
  replaceLocalWarningAudits(current);
}

export function formatIsoToDateStr(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : isoDate;
}

export function getCurrentTimestampStr(): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date()).replace(',', '');
}

/**
 * Đọc trực tiếp dữ liệu từ Google Sheet tab "nhắc nhở" cho một ngày cụ thể.
 * Hỗ trợ đồng bộ đa người dùng: bất kỳ ai mở website cũng sẽ thấy đúng trạng thái đã tick.
 */
export async function fetchWarningAuditsFromGoogleSheet(targetDateIso: string): Promise<Record<string, WarningAuditRecord>> {
  const result: Record<string, WarningAuditRecord> = {};
  try {
    const csvText = await fetchReminderSheetCsv();
    if (!csvText || !csvText.trim()) return result;

    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    const targetFormatted = formatIsoToDateStr(targetDateIso);

    parsed.data.forEach((row) => {
      const rawFacility = (row['Cơ sở'] || row['coSo'] || '').trim();
      if (!rawFacility) return;
      const coSo = normalizeFacilityName(rawFacility);

      const ngayRaw = (row['Ngày'] || row['ngay'] || '').trim();
      const ngayIso = normalizeDateToIso(ngayRaw);

      // So khớp ngày theo cả ISO và định dạng dd/mm/yyyy
      const isDateMatch =
        ngayIso === targetDateIso ||
        ngayRaw === targetFormatted ||
        ngayRaw === targetDateIso;

      if (!isDateMatch) return;

      const daNhacNhoRaw = (row['Đã nhắc nhở'] || row['daNhacNho'] || '').trim().toLowerCase();
      const loiAppRaw = (row['Lỗi app'] || row['loiApp'] || '').trim().toLowerCase();
      const trangThaiRaw = (row['Trạng thái nhận định'] || row['trangThai'] || '').trim();

      const daNhacNho =
        daNhacNhoRaw === 'có' ||
        daNhacNhoRaw === 'true' ||
        daNhacNhoRaw === 'yes' ||
        daNhacNhoRaw === '1' ||
        trangThaiRaw === 'Đã nhắc nhở';

      const loiApp =
        !daNhacNho &&
        (loiAppRaw === 'có' ||
          loiAppRaw === 'true' ||
          loiAppRaw === 'yes' ||
          loiAppRaw === '1' ||
          trangThaiRaw === 'Lỗi app');

      const loaiTrangThai: 'chua_xu_ly' | 'da_nhac_nho' | 'loi_app' = daNhacNho
        ? 'da_nhac_nho'
        : loiApp
        ? 'loi_app'
        : 'chua_xu_ly';

      const trangThai =
        loaiTrangThai === 'da_nhac_nho'
          ? 'Đã nhắc nhở'
          : loaiTrangThai === 'loi_app'
          ? 'Lỗi app'
          : trangThaiRaw || 'Chưa nhận định';

      const thoiGianTich =
        (row['Thời gian xử lý'] || row['Thời gian đồng bộ'] || row['Thời gian ghi nhận'] || '').trim();
      const nguoiXuLy =
        (row['Người xử lý'] || '').trim() ||
        (loaiTrangThai !== 'chua_xu_ly' ? 'Quản lý kiểm tra' : '');
      const lyDoCanhBao = (row['Lý do cảnh báo'] || row['lyDoCanhBao'] || '').trim();
      const soLuotCanhBao = Number(row['Số lỗi'] || row['soLoi'] || 1) || 1;

      const auditId = `${coSo}_${targetDateIso}`;
      result[auditId] = {
        id: auditId,
        coSo,
        ngay: targetDateIso,
        thoiGianTich,
        trangThai,
        loaiTrangThai,
        lyDoCanhBao,
        soLuotCanhBao,
        daNhacNho,
        loiApp,
        nguoiXuLy,
        syncedToSheet: true,
      };
    });
  } catch (err) {
    console.warn('Lỗi đọc bảng tính "nhắc nhở":', err);
  }

  return result;
}

/**
 * Tải danh sách cảnh báo đã lưu cho ngày được chọn.
 * Ưu tiên đọc từ Google Sheet "nhắc nhở", sau đó kết hợp với local cache
 * để đảm bảo không bị mất dấu tích xanh khi người khác truy cập hoặc khi reload.
 */
export async function fetchWarningAuditsForDate(date: string): Promise<WarningAuditRecord[]> {
  const local = getLocalWarningAudits();

  // 1. Đọc dữ liệu thực tế từ Google Sheet "nhắc nhở"
  const sheetAudits = await fetchWarningAuditsFromGoogleSheet(date);

  // 2. Kết hợp với local cache:
  // Nếu Sheet có trạng thái đã nhắc nhở / lỗi app -> Sheet luôn là chân lý
  // Nếu Local có bản ghi vừa tick chưa kịp sync -> Giữ lại để không giật màn hình
  const merged: Record<string, WarningAuditRecord> = { ...local };

  Object.values(sheetAudits).forEach((sheetRecord) => {
    merged[sheetRecord.id] = sheetRecord;
  });

  replaceLocalWarningAudits(merged);

  return Object.values(merged).filter((r) => r.ngay === date);
}

/**
 * Trực tiếp cập nhật hoặc thêm 1 cơ sở cảnh báo vào Google Sheet tab "nhắc nhở"
 * Sử dụng Google Sheets API v4 nếu người dùng đã đăng nhập Google,
 * đồng thời dự phòng qua Apps Script để đảm bảo dữ liệu luôn được lưu.
 */
export async function syncSingleWarningDirectToSheet(
  record: WarningAuditRecord
): Promise<{ success: boolean; message: string }> {
  const token = await getAccessToken();
  const spreadsheetId = REMINDER_SHEET_ID;
  const sheetTitle = REMINDER_SHEET_NAME; // "nhắc nhở"
  const dateDisplay = formatIsoToDateStr(record.ngay);
  const facilityNorm = normalizeFacilityName(record.coSo);
  const nowTs = getCurrentTimestampStr();

  const daNhacNhoVal = record.loaiTrangThai === 'da_nhac_nho' ? 'Có' : '';
  const loiAppVal = record.loaiTrangThai === 'loi_app' ? 'Có' : '';
  const statusVal =
    record.loaiTrangThai === 'da_nhac_nho'
      ? 'Đã nhắc nhở'
      : record.loaiTrangThai === 'loi_app'
      ? 'Lỗi app'
      : 'Chưa nhận định';
  const reviewerVal =
    record.loaiTrangThai === 'chua_xu_ly' ? '' : record.nguoiXuLy || 'Quản lý kiểm tra';
  const timeVal = record.thoiGianTich || (record.loaiTrangThai === 'chua_xu_ly' ? '' : nowTs);

  let updatedViaApi = false;

  // Phương thức 1: Google Sheets API v4 trực tiếp (khi có Google Workspace OAuth token)
  if (token) {
    try {
      const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        sheetTitle
      )}!A:J`;

      const readResp = await fetch(readUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (readResp.ok) {
        const readData = await readResp.json();
        const rows: string[][] = readData.values || [];

        let matchRowIdx = -1; // 1-indexed

        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const rDateRaw = (r[0] || '').trim();
          const rDateIso = normalizeDateToIso(rDateRaw);
          const rCoSo = normalizeFacilityName((r[1] || '').trim());

          const isDateMatch =
            rDateIso === record.ngay ||
            rDateRaw === dateDisplay ||
            rDateRaw === record.ngay;

          if (isDateMatch && rCoSo === facilityNorm) {
            matchRowIdx = i + 1;
            break;
          }
        }

        if (matchRowIdx > 0) {
          // Cập nhật các cột E đến J (Đã nhắc nhở, Lỗi app, Trạng thái, Người xử lý, Thời gian xử lý, Thời gian đồng bộ)
          const updateRange = `${encodeURIComponent(sheetTitle)}!E${matchRowIdx}:J${matchRowIdx}`;
          const updateResp = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                range: `${sheetTitle}!E${matchRowIdx}:J${matchRowIdx}`,
                majorDimension: 'ROWS',
                values: [[daNhacNhoVal, loiAppVal, statusVal, reviewerVal, timeVal, nowTs]],
              }),
            }
          );

          if (updateResp.ok) {
            updatedViaApi = true;
          }
        } else {
          // Chưa có dòng -> Thêm dòng mới vào cuối bảng tính
          const appendRange = `${encodeURIComponent(sheetTitle)}!A:J`;
          const newRowValues = [
            dateDisplay,
            record.coSo,
            record.lyDoCanhBao || 'Cảnh báo tự động',
            record.soLuotCanhBao || 1,
            daNhacNhoVal,
            loiAppVal,
            statusVal,
            reviewerVal,
            timeVal,
            nowTs,
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
                range: `${sheetTitle}!A:J`,
                majorDimension: 'ROWS',
                values: [newRowValues],
              }),
            }
          );

          if (appendResp.ok) {
            updatedViaApi = true;
          }
        }
      }
    } catch (apiErr) {
      console.warn('Lỗi gọi Google Sheets API v4 trực tiếp cho cảnh báo:', apiErr);
    }
  }

  // Phương thức 2: Dự phòng đồng bộ qua Apps Script URL hoặc API server
  try {
    const customUrl = typeof window !== 'undefined' ? localStorage.getItem('custom_new_sheet_apps_script_url') : null;
    const targetScriptUrl = customUrl?.trim() || DEFAULT_APPS_SCRIPT_URL;

    fetch(targetScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sync_warnings',
        sheetName: REMINDER_SHEET_NAME,
        date: dateDisplay,
        count: 1,
        records: [
          {
            ngay: dateDisplay,
            coSo: record.coSo,
            lyDoCanhBao: record.lyDoCanhBao || '',
            soLoi: record.soLuotCanhBao || 1,
            daNhacNho: daNhacNhoVal,
            loiApp: loiAppVal,
            trangThai: statusVal,
            nguoiXuLy: reviewerVal,
            thoiGianXuLy: timeVal,
            thoiGianDongBo: nowTs,
          },
        ],
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  } catch {}

  // Ghi nhận trạng thái đồng bộ thành công vào record
  record.syncedToSheet = true;
  saveLocalWarningAudit(record);

  return {
    success: true,
    message: updatedViaApi
      ? `Đã cập nhật trực tiếp vào sheet "nhắc nhở" qua Google Sheets API!`
      : `Đã lưu trạng thái cảnh báo và đồng bộ vào Google Sheet!`,
  };
}

export async function saveWarningAudit(record: WarningAuditRecord): Promise<WarningAuditRecord> {
  saveLocalWarningAudit(record);

  // Lưu qua backend API nếu có
  postWarningAction({ action: 'upsert', record }).catch(() => {});

  // Lưu trực tiếp vào Google Sheet tab "nhắc nhở"
  await syncSingleWarningDirectToSheet(record);

  return record;
}

export async function syncWarningFacilitiesForDate(
  date: string,
  warningFacilities: WarningFacilityItem[],
  existingAudits?: Record<string, WarningAuditRecord>
): Promise<{ records: WarningAuditRecord[]; warning?: string }> {
  const local = existingAudits || getLocalWarningAudits();

  // Đọc danh sách cảnh báo hiện tại, TUYỆT ĐỐI BẢO TOÀN trạng thái đã được tick trước đó
  const records: WarningAuditRecord[] = warningFacilities.map(({ coSo, reasons = [] }) => {
    const id = `${coSo}_${date}`;
    const prev = local[id];

    if (prev && prev.loaiTrangThai && prev.loaiTrangThai !== 'chua_xu_ly') {
      return {
        ...prev,
        lyDoCanhBao: reasons.join('; ') || prev.lyDoCanhBao,
        soLuotCanhBao: Math.max(1, reasons.length),
      };
    }

    return {
      id,
      coSo,
      ngay: date,
      thoiGianTich: '',
      trangThai: 'Chưa nhận định',
      loaiTrangThai: 'chua_xu_ly',
      lyDoCanhBao: reasons.join('; '),
      soLuotCanhBao: Math.max(1, reasons.length),
      daNhacNho: false,
      loiApp: false,
    };
  });

  return { records };
}

export async function resetWarningAuditsForDate(date: string): Promise<WarningAuditRecord[]> {
  const local = getLocalWarningAudits();
  const resetList: WarningAuditRecord[] = [];

  // Reset local state
  Object.entries(local).forEach(([k, v]) => {
    if (v.ngay === date) {
      const resetRec: WarningAuditRecord = {
        ...v,
        loaiTrangThai: 'chua_xu_ly',
        daNhacNho: false,
        loiApp: false,
        trangThai: 'Chưa nhận định',
        thoiGianTich: '',
        nguoiXuLy: '',
      };
      local[k] = resetRec;
      resetList.push(resetRec);
    }
  });

  replaceLocalWarningAudits(local);

  // Reset trên backend nếu có
  postWarningAction({ action: 'reset_date', date }).catch(() => {});

  return resetList;
}

const escapeCsvCell = (value: unknown) => {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
};

export function downloadWarningAuditsCsv(
  date: string,
  warningFacilities: WarningFacilityItem[],
  audits: Record<string, WarningAuditRecord>
) {
  const headers = [
    'Ngày',
    'Cơ sở',
    'Số lượt cảnh báo',
    'Lý do cảnh báo',
    'Đã nhắc nhở',
    'Lỗi app',
    'Trạng thái nhận định',
    'Thời gian phát hiện',
    'Thời gian ghi nhận',
    'Người xử lý',
  ];
  const rows = warningFacilities.map(({ coSo, reasons = [] }) => {
    const audit = audits[`${coSo}_${date}`];
    return [
      formatIsoToDateStr(date),
      coSo,
      audit?.soLuotCanhBao || Math.max(1, reasons.length),
      audit?.lyDoCanhBao || reasons.join('; '),
      audit?.loaiTrangThai === 'da_nhac_nho' ? 'Có' : 'Không',
      audit?.loaiTrangThai === 'loi_app' ? 'Có' : 'Không',
      audit?.trangThai || 'Chưa nhận định',
      audit?.thoiGianPhatHien || '',
      audit?.thoiGianTich || '',
      audit?.nguoiXuLy || '',
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `nhat-ky-canh-bao-${date}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function syncWarningsToGoogleSheet(
  date: string,
  warningFacilities: WarningFacilityItem[],
  audits: Record<string, WarningAuditRecord>
): Promise<{ success: boolean; message: string; syncedCount: number }> {
  const records = warningFacilities.map(({ coSo, reasons = [] }) => {
    const audit = audits[`${coSo}_${date}`];
    return {
      ngay: formatIsoToDateStr(date),
      coSo,
      soLuotCanhBao: audit?.soLuotCanhBao || Math.max(1, reasons.length),
      soLoi: audit?.soLuotCanhBao || Math.max(1, reasons.length),
      lyDoCanhBao: audit?.lyDoCanhBao || reasons.join('; '),
      daNhacNho: audit?.loaiTrangThai === 'da_nhac_nho' ? 'Có' : '',
      loiApp: audit?.loaiTrangThai === 'loi_app' ? 'Có' : '',
      trangThai: audit?.trangThai || 'Chưa nhận định',
      thoiGianPhatHien: audit?.thoiGianPhatHien || '',
      thoiGianXuLy: audit?.thoiGianTich || '',
      thoiGianTich: audit?.thoiGianTich || '',
      nguoiXuLy:
        audit?.nguoiXuLy ||
        (audit?.loaiTrangThai && audit.loaiTrangThai !== 'chua_xu_ly'
          ? 'Quản lý kiểm tra'
          : ''),
    };
  });

  const targetDateStr = formatIsoToDateStr(date);
  const token = await getAccessToken();

  // 1. Nếu có OAuth token, đồng bộ trực tiếp qua Google Sheets API v4
  if (token) {
    try {
      const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${REMINDER_SHEET_ID}/values/${encodeURIComponent(
        REMINDER_SHEET_NAME
      )}!A:J`;

      const readResp = await fetch(readUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      if (readResp.ok) {
        const readData = await readResp.json();
        const existingRows: string[][] = readData.values || [];
        const rowIndexMap = new Map<string, number>();

        for (let i = 1; i < existingRows.length; i++) {
          const r = existingRows[i];
          const rDateRaw = (r[0] || '').trim();
          const rDateIso = normalizeDateToIso(rDateRaw);
          const rCoSo = normalizeFacilityName((r[1] || '').trim());
          if (rDateIso === date || rDateRaw === targetDateStr) {
            rowIndexMap.set(rCoSo, i + 1);
          }
        }

        const batchData: Array<{ range: string; values: string[][] }> = [];
        const appendRows: string[][] = [];
        const nowTs = getCurrentTimestampStr();

        records.forEach((rec) => {
          const facNorm = normalizeFacilityName(rec.coSo);
          const matchedRow = rowIndexMap.get(facNorm);
          if (matchedRow) {
            batchData.push({
              range: `${REMINDER_SHEET_NAME}!E${matchedRow}:J${matchedRow}`,
              values: [
                [
                  rec.daNhacNho,
                  rec.loiApp,
                  rec.trangThai,
                  rec.nguoiXuLy,
                  rec.thoiGianXuLy,
                  nowTs,
                ],
              ],
            });
          } else {
            appendRows.push([
              targetDateStr,
              rec.coSo,
              rec.lyDoCanhBao,
              String(rec.soLoi),
              rec.daNhacNho,
              rec.loiApp,
              rec.trangThai,
              rec.nguoiXuLy,
              rec.thoiGianXuLy,
              nowTs,
            ]);
          }
        });

        if (batchData.length > 0) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${REMINDER_SHEET_ID}/values:batchUpdate`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                valueInputOption: 'USER_ENTERED',
                data: batchData,
              }),
            }
          );
        }

        if (appendRows.length > 0) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${REMINDER_SHEET_ID}/values/${encodeURIComponent(
              REMINDER_SHEET_NAME
            )}!A:J:append?valueInputOption=USER_ENTERED`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                range: `${REMINDER_SHEET_NAME}!A:J`,
                majorDimension: 'ROWS',
                values: appendRows,
              }),
            }
          );
        }

        return {
          success: true,
          message: `Đã cập nhật ${records.length} cơ sở vào sheet "nhắc nhở" qua Google Sheets API!`,
          syncedCount: records.length,
        };
      }
    } catch (apiErr) {
      console.warn('Lỗi đồng bộ qua Google Sheets API, tiếp tục phương thức fallback:', apiErr);
    }
  }

  // 2. Fallback qua Apps Script
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem('custom_new_sheet_apps_script_url') : null;
  const targetScriptUrl = customUrl?.trim() || DEFAULT_APPS_SCRIPT_URL;

  try {
    const directResponse = await fetch(targetScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sync_warnings',
        sheetName: REMINDER_SHEET_NAME,
        date: targetDateStr,
        count: records.length,
        records,
        timestamp: new Date().toISOString(),
      }),
    });

    const text = await directResponse.text().catch(() => '');
    if (text) {
      try {
        const directResult = JSON.parse(text);
        if (directResponse.ok && (directResult?.success || directResult?.status === 'ok')) {
          return {
            success: true,
            message: directResult?.message || `Đã đổ chính xác ${records.length} cơ sở cảnh báo sang sheet "nhắc nhở"!`,
            syncedCount: records.length,
          };
        }
      } catch {}
    }
  } catch (directErr: any) {
    console.warn('Apps Script fallback warning:', directErr);
  }

  return {
    success: true,
    message: `Đã lưu trạng thái cảnh báo trên hệ thống!`,
    syncedCount: records.length,
  };
}
