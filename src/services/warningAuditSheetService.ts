import { getAccessToken, googleSignIn, getCurrentUser } from './googleAuthService';
import { WarningAuditRecord } from './googleSheetsService';

export const DEFAULT_SHEET_ID = '1veLCZLlQGasCRU11goB5oAu0LVlK5Y1QombHWy21EJc';
export const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1veLCZLlQGasCRU11goB5oAu0LVlK5Y1QombHWy21EJc/edit';

export const STORAGE_CUSTOM_SHEET_ID_KEY = 'facility_warning_custom_sheet_id_v2';
export const STORAGE_CUSTOM_SHEET_URL_KEY = 'facility_warning_custom_sheet_url_v2';

export interface CustomSheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  createdTime: string;
}

export function getStoredCustomSheet(): CustomSheetInfo {
  try {
    const sheetId = localStorage.getItem(STORAGE_CUSTOM_SHEET_ID_KEY) || DEFAULT_SHEET_ID;
    const sheetUrl = localStorage.getItem(STORAGE_CUSTOM_SHEET_URL_KEY) || DEFAULT_SHEET_URL;
    return {
      spreadsheetId: sheetId,
      spreadsheetUrl: sheetUrl,
      title: 'Nhật Ký Cảnh Báo Cơ Sở',
      createdTime: ''
    };
  } catch (e) {
    console.error('Error reading stored sheet info:', e);
  }
  return {
    spreadsheetId: DEFAULT_SHEET_ID,
    spreadsheetUrl: DEFAULT_SHEET_URL,
    title: 'Nhật Ký Cảnh Báo Cơ Sở',
    createdTime: ''
  };
}

export function setStoredCustomSheet(spreadsheetId: string, spreadsheetUrl: string) {
  try {
    localStorage.setItem(STORAGE_CUSTOM_SHEET_ID_KEY, spreadsheetId);
    localStorage.setItem(STORAGE_CUSTOM_SHEET_URL_KEY, spreadsheetUrl);
  } catch (e) {
    console.error('Error saving stored sheet info:', e);
  }
}

export function clearStoredCustomSheet() {
  try {
    localStorage.removeItem(STORAGE_CUSTOM_SHEET_ID_KEY);
    localStorage.removeItem(STORAGE_CUSTOM_SHEET_URL_KEY);
  } catch (e) {
    console.error('Error clearing stored sheet info:', e);
  }
}

// Convert ISO date (YYYY-MM-DD) to DD/MM/YYYY
export function formatIsoToDateStr(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

// Convert DD/MM/YYYY to ISO date (YYYY-MM-DD)
export function formatDateStrToIso(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
}

// Get current full timestamp formatted as DD/MM/YYYY HH:mm:ss
export function getCurrentTimestampStr(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${h}:${m}:${s}`;
}

export function getCurrentTimeStr(): string {
  return getCurrentTimestampStr();
}

export const EXACT_HEADERS = [
  'Dấu thời gian',
  'Ngày hành động',
  'Cơ sở',
  'Đã xác minh và nhắc nhở',
  'Đã xác minh do lỗi app',
  'Email thực hiện'
];

/**
 * Ensures the Google Sheet has the exact 6 header columns and checkbox formatting
 */
export async function ensureSheetStructure(spreadsheetId: string, token: string) {
  try {
    // 1. Check or set header row A1:F1
    const checkRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:F1`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    let needsHeader = true;
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData.values && checkData.values.length > 0) {
        const row = checkData.values[0];
        if (
          (row[0] === 'Dấu thời gian' || row[0] === 'Dấu thời gian thực tế') &&
          row[1] === EXACT_HEADERS[1] &&
          row[2] === EXACT_HEADERS[2] &&
          row[3] === EXACT_HEADERS[3] &&
          row[4] === EXACT_HEADERS[4] &&
          row[5] === EXACT_HEADERS[5]
        ) {
          needsHeader = false;
        }
      }
    }

    if (needsHeader) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:F1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [EXACT_HEADERS]
          })
        }
      );
    }

    // 2. Set checkbox validation for column D (index 3) and column E (index 4)
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              setDataValidation: {
                range: {
                  startRowIndex: 1,
                  endRowIndex: 2000,
                  startColumnIndex: 3,
                  endColumnIndex: 5
                },
                rule: {
                  condition: {
                    type: 'BOOLEAN'
                  },
                  showCustomUi: true
                }
              }
            }
          ]
        })
      }
    ).catch(e => console.warn('Could not apply checkbox format batchUpdate:', e));

  } catch (err) {
    console.error('Error ensuring sheet structure:', err);
  }
}

/**
 * Creates a brand new Google Sheet specifically for Warning Inspection Audits
 */
export async function createWarningAuditGoogleSheet(
  customTitle?: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  let token = await getAccessToken();
  if (!token) {
    const authRes = await googleSignIn();
    if (!authRes?.accessToken) {
      throw new Error('Cần cấp quyền Google Sheets để tạo file bảng tính mới.');
    }
    token = authRes.accessToken;
  }

  const title = customTitle || `Nhật Ký Cảnh Báo Cơ Sở (${new Date().toLocaleDateString('vi-VN')})`;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title,
        locale: 'vi_VN',
        timeZone: 'Asia/Ho_Chi_Minh'
      },
      sheets: [
        {
          properties: {
            title: 'Trang tính1',
            gridProperties: {
              frozenRowCount: 1,
              columnCount: 6
            }
          }
        }
      ]
    })
  });

  if (!createRes.ok) {
    const errJson = await createRes.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Lỗi tạo file Google Sheet (${createRes.status})`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  await ensureSheetStructure(spreadsheetId, token);
  setStoredCustomSheet(spreadsheetId, spreadsheetUrl);

  return {
    spreadsheetId,
    spreadsheetUrl
  };
}

export interface WarningFacilityItem {
  coSo: string;
  reasons?: string[];
}

/**
 * Auto synchronizes daily warning facilities into the Google Sheet:
 * - If a warning facility for this date is NOT in the Sheet yet: appends it as [nowTime, dateFormatted, coSo, false, false]
 *   (Unchecked checkboxes show that staff has NOT verified it yet)
 * - Returns updated records synced from the Sheet so the UI reflects current state.
 */
export async function syncAndFetchWarningsFromSheet(
  dateIso: string,
  warningFacilities: WarningFacilityItem[],
  existingAudits: Record<string, WarningAuditRecord>
): Promise<{ 
  success: boolean; 
  syncedAudits: Record<string, WarningAuditRecord>; 
  spreadsheetUrl: string;
  addedCount: number;
}> {
  const currentSheet = getStoredCustomSheet();
  const spreadsheetId = currentSheet.spreadsheetId;
  const resultAudits: Record<string, WarningAuditRecord> = { ...existingAudits };

  try {
    let token = await getAccessToken();
    if (!token) {
      // Don't pop up auth automatically during passive background sync; return local data
      return {
        success: false,
        syncedAudits: resultAudits,
        spreadsheetUrl: currentSheet.spreadsheetUrl,
        addedCount: 0
      };
    }

    await ensureSheetStructure(spreadsheetId, token);

    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:F`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const existingRows: any[][] = getRes.ok ? ((await getRes.json()).values || []) : [];
    const dateFormatted = formatIsoToDateStr(dateIso);
    const nowTime = getCurrentTimeStr();

    const existingMap = new Map<string, { rowIndex: number; row: any[] }>();
    for (let i = 1; i < existingRows.length; i++) {
      const r = existingRows[i];
      if (r && r[1] === dateFormatted && r[2]) {
        existingMap.set(r[2].trim(), { rowIndex: i + 1, row: r });
      }
    }

    const rowsToAppend: any[][] = [];
    let addedCount = 0;

    for (const item of warningFacilities) {
      const coSo = item.coSo;
      const auditId = `${coSo}_${dateIso}`;
      const found = existingMap.get(coSo.trim());

      if (found) {
        // Read checkbox values and email from sheet
        const isNhacNho = found.row[3] === true || found.row[3] === 'TRUE' || found.row[3] === 'true';
        const isLoiApp = found.row[4] === true || found.row[4] === 'TRUE' || found.row[4] === 'true';
        const emailThucHien = found.row[5] || '';
        
        if (isNhacNho) {
          resultAudits[auditId] = {
            id: auditId,
            coSo,
            ngay: dateIso,
            thoiGianTich: found.row[0] || nowTime,
            trangThai: 'Đã xác minh và nhắc nhở',
            loaiTrangThai: 'da_nhac_nho',
            lyDoCanhBao: item.reasons?.join('; ') || '',
            nguoiXuLy: emailThucHien || 'Quản lý kiểm tra',
            emailThucHien: emailThucHien
          };
        } else if (isLoiApp) {
          resultAudits[auditId] = {
            id: auditId,
            coSo,
            ngay: dateIso,
            thoiGianTich: found.row[0] || nowTime,
            trangThai: 'Đã xác minh do lỗi app',
            loaiTrangThai: 'loi_app',
            lyDoCanhBao: item.reasons?.join('; ') || '',
            nguoiXuLy: emailThucHien || 'Quản lý kiểm tra',
            emailThucHien: emailThucHien
          };
        }
      } else {
        // Warning exists on this date but not yet listed in Google Sheet -> Auto-populate as FALSE, FALSE
        const audit = existingAudits[auditId];
        const isNhacNho = audit?.loaiTrangThai === 'da_nhac_nho' ? true : false;
        const isLoiApp = audit?.loaiTrangThai === 'loi_app' ? true : false;
        const timeVal = audit?.thoiGianTich || nowTime;
        const emailVal = audit?.emailThucHien || '';

        rowsToAppend.push([timeVal, dateFormatted, coSo, isNhacNho, isLoiApp, emailVal]);
        addedCount++;
      }
    }

    if (rowsToAppend.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:F:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: rowsToAppend
          })
        }
      );
    }

    return {
      success: true,
      syncedAudits: resultAudits,
      spreadsheetUrl: currentSheet.spreadsheetUrl,
      addedCount
    };
  } catch (error) {
    console.error('Error syncing warnings with Google Sheet:', error);
    return {
      success: false,
      syncedAudits: resultAudits,
      spreadsheetUrl: currentSheet.spreadsheetUrl,
      addedCount: 0
    };
  }
}

/**
 * Dumps all warning facilities for a specific date into the Google Sheet.
 * Exact structure:
 * A: Dấu thời gian (DD/MM/YYYY HH:mm:ss)
 * B: Ngày hành động (DD/MM/YYYY)
 * C: Cơ sở
 * D: Đã xác minh và nhắc nhở (Checkbox TRUE/FALSE)
 * E: Đã xác minh do lỗi app (Checkbox TRUE/FALSE)
 * F: Email thực hiện
 */
export async function syncAllWarningsForDateToGoogleSheet(
  dateIso: string,
  warningFacilities: WarningFacilityItem[],
  audits: Record<string, WarningAuditRecord>
): Promise<{ success: boolean; message: string; count: number; spreadsheetUrl?: string }> {
  try {
    let token = await getAccessToken();
    let loggedInEmail = getCurrentUser()?.email || '';

    if (!token) {
      const authRes = await googleSignIn();
      if (!authRes?.accessToken) {
        return {
          success: false,
          message: 'Chưa cấp quyền Google để đồng bộ Sheet.',
          count: 0
        };
      }
      token = authRes.accessToken;
      if (authRes.user?.email) {
        loggedInEmail = authRes.user.email;
      }
    }

    const currentSheet = getStoredCustomSheet();
    const spreadsheetId = currentSheet.spreadsheetId;

    await ensureSheetStructure(spreadsheetId, token);

    // Fetch existing sheet data
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:F`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const existingRows: any[][] = getRes.ok ? ((await getRes.json()).values || []) : [];
    const dateFormatted = formatIsoToDateStr(dateIso);
    const nowTime = getCurrentTimeStr();

    let updatedCount = 0;
    let appendedCount = 0;

    const rowsToAppend: any[][] = [];

    for (const item of warningFacilities) {
      const coSo = item.coSo;
      const auditId = `${coSo}_${dateIso}`;
      const audit = audits[auditId];

      const isNhacNho = audit?.loaiTrangThai === 'da_nhac_nho' ? true : false;
      const isLoiApp = audit?.loaiTrangThai === 'loi_app' ? true : false;
      
      // Determine timestamp (real actual timestamp when recorded or synced)
      let timeVal = audit?.thoiGianTich || nowTime;
      if (!timeVal.includes('/') && timeVal.includes(':')) {
        timeVal = `${dateFormatted} ${timeVal}`;
      }

      const emailVal = audit?.emailThucHien || ((isNhacNho || isLoiApp) ? loggedInEmail : '');

      // Check if row already exists for (dateFormatted, coSo)
      let foundRowIndex = -1;
      for (let i = 1; i < existingRows.length; i++) {
        const row = existingRows[i];
        if (row && row[1] === dateFormatted && row[2] === coSo) {
          foundRowIndex = i + 1; // 1-indexed for Sheet API
          break;
        }
      }

      const rowData = [timeVal, dateFormatted, coSo, isNhacNho, isLoiApp, emailVal];

      if (foundRowIndex > 0) {
        // Update existing row
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A${foundRowIndex}:F${foundRowIndex}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [rowData]
            })
          }
        );
        updatedCount++;
      } else {
        rowsToAppend.push(rowData);
      }
    }

    if (rowsToAppend.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:F:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: rowsToAppend
          })
        }
      );
      appendedCount += rowsToAppend.length;
    }

    return {
      success: true,
      message: `Đã cập nhật ${warningFacilities.length} cơ sở cảnh báo ngày ${dateFormatted} vào Sheet (${appendedCount} dòng mới, ${updatedCount} dòng cập nhật)`,
      count: warningFacilities.length,
      spreadsheetUrl: currentSheet.spreadsheetUrl
    };
  } catch (error: any) {
    console.error('Error syncing warnings to Google Sheet:', error);
    return {
      success: false,
      message: `Lỗi đồng bộ Sheet: ${error.message || 'Thử lại'}`,
      count: 0
    };
  }
}

/**
 * Clears (unchecks) all warning verification checkboxes for a specific date in the Google Sheet
 * Sets both "Đã xác minh và nhắc nhở" (col D) and "Đã xác minh do lỗi app" (col E) to false, and clears "Email thực hiện" (col F).
 */
export async function clearAllWarningAuditsForDateInGoogleSheet(
  dateIso: string
): Promise<{ success: boolean; message: string; count: number; spreadsheetUrl?: string }> {
  try {
    let token = await getAccessToken();
    if (!token) {
      const authRes = await googleSignIn();
      if (!authRes?.accessToken) {
        return {
          success: false,
          message: 'Chưa cấp quyền Google để xóa tích trên Sheet.',
          count: 0
        };
      }
      token = authRes.accessToken;
    }

    const currentSheet = getStoredCustomSheet();
    const spreadsheetId = currentSheet.spreadsheetId;

    await ensureSheetStructure(spreadsheetId, token);

    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:F`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const existingRows: any[][] = getRes.ok ? ((await getRes.json()).values || []) : [];
    const dateFormatted = formatIsoToDateStr(dateIso);
    let clearedCount = 0;

    const updateRequests: { range: string; values: any[][] }[] = [];

    for (let i = 1; i < existingRows.length; i++) {
      const row = existingRows[i];
      if (row && row[1] === dateFormatted) {
        const rowIndex = i + 1;
        updateRequests.push({
          range: `D${rowIndex}:F${rowIndex}`,
          values: [[false, false, '']]
        });
        clearedCount++;
      }
    }

    if (updateRequests.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: updateRequests
          })
        }
      );
    }

    return {
      success: true,
      message: `Đã xóa toàn bộ ${clearedCount} tích chọn của ngày ${dateFormatted} trên Google Sheet!`,
      count: clearedCount,
      spreadsheetUrl: currentSheet.spreadsheetUrl
    };
  } catch (error: any) {
    console.error('Error clearing warning audits from Google Sheet:', error);
    return {
      success: false,
      message: `Lỗi xóa tích chọn trên Sheet: ${error.message || 'Thử lại'}`,
      count: 0
    };
  }
}

/**
 * Updates a single warning audit checkbox status and executor email in the Google Sheet
 */
export async function updateSingleWarningAuditToGoogleSheet(
  dateIso: string,
  coSo: string,
  targetType: 'da_nhac_nho' | 'loi_app' | null,
  userEmailOverride?: string
): Promise<{ success: boolean; message: string; userEmail?: string; spreadsheetUrl?: string }> {
  try {
    let token = await getAccessToken();
    let loggedInEmail = userEmailOverride || getCurrentUser()?.email || '';

    if (!token) {
      const authRes = await googleSignIn();
      if (!authRes?.accessToken) {
        return {
          success: false,
          message: 'Chưa cấp quyền Google để ghi nhận vào Sheet.'
        };
      }
      token = authRes.accessToken;
      if (!loggedInEmail && authRes.user?.email) {
        loggedInEmail = authRes.user.email;
      }
    }

    if (!loggedInEmail) {
      const u = getCurrentUser();
      if (u?.email) loggedInEmail = u.email;
    }

    const currentSheet = getStoredCustomSheet();
    const spreadsheetId = currentSheet.spreadsheetId;

    await ensureSheetStructure(spreadsheetId, token);

    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:F`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const existingRows: any[][] = getRes.ok ? ((await getRes.json()).values || []) : [];
    const dateFormatted = formatIsoToDateStr(dateIso);
    const nowTime = getCurrentTimeStr();

    const isNhacNho = targetType === 'da_nhac_nho' ? true : false;
    const isLoiApp = targetType === 'loi_app' ? true : false;
    const emailToSave = (isNhacNho || isLoiApp) ? loggedInEmail : '';

    let foundRowIndex = -1;
    for (let i = 1; i < existingRows.length; i++) {
      const row = existingRows[i];
      if (row && row[1] === dateFormatted && row[2] === coSo) {
        foundRowIndex = i + 1; // 1-based index
        break;
      }
    }

    const rowData = [nowTime, dateFormatted, coSo, isNhacNho, isLoiApp, emailToSave];

    if (foundRowIndex > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A${foundRowIndex}:F${foundRowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [rowData]
          })
        }
      );
    } else {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:F:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [rowData]
          })
        }
      );
    }

    return {
      success: true,
      message: 'Đã cập nhật trạng thái vào Google Sheet thành công!',
      userEmail: emailToSave,
      spreadsheetUrl: currentSheet.spreadsheetUrl
    };
  } catch (error: any) {
    console.error('Error updating warning to Google Sheet:', error);
    return {
      success: false,
      message: `Lỗi kết nối Google Sheet: ${error.message || 'Thử lại'}`
    };
  }
}
