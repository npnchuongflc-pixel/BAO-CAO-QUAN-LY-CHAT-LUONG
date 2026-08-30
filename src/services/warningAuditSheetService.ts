import { WarningAuditRecord } from './googleSheetsService';

export const DEFAULT_SHEET_ID = '1veLCZLlQGasCRU11goB5oAu0LVlK5Y1QombHWy21EJc';
export const DEFAULT_SHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SHEET_ID}/edit`;

export const STORAGE_CUSTOM_SHEET_ID_KEY = 'facility_warning_custom_sheet_id_v2';
export const STORAGE_CUSTOM_SHEET_URL_KEY = 'facility_warning_custom_sheet_url_v2';

export interface CustomSheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  createdTime: string;
}

export interface WarningFacilityItem {
  coSo: string;
  reasons?: string[];
}

interface WarningApiResponse {
  success: boolean;
  error?: string;
  count?: number;
  appended?: number;
  updated?: number;
  cleared?: number;
  spreadsheetUrl?: string;
}

export function getStoredCustomSheet(): CustomSheetInfo {
  try {
    const sheetId = localStorage.getItem(STORAGE_CUSTOM_SHEET_ID_KEY) || DEFAULT_SHEET_ID;
    const sheetUrl = localStorage.getItem(STORAGE_CUSTOM_SHEET_URL_KEY) || DEFAULT_SHEET_URL;
    return {
      spreadsheetId: sheetId,
      spreadsheetUrl: sheetUrl,
      title: 'Nhật Ký Cảnh Báo Cơ Sở',
      createdTime: '',
    };
  } catch (error) {
    console.error('Error reading stored sheet info:', error);
  }

  return {
    spreadsheetId: DEFAULT_SHEET_ID,
    spreadsheetUrl: DEFAULT_SHEET_URL,
    title: 'Nhật Ký Cảnh Báo Cơ Sở',
    createdTime: '',
  };
}

export function setStoredCustomSheet(spreadsheetId: string, spreadsheetUrl: string) {
  try {
    localStorage.setItem(STORAGE_CUSTOM_SHEET_ID_KEY, spreadsheetId);
    localStorage.setItem(STORAGE_CUSTOM_SHEET_URL_KEY, spreadsheetUrl);
  } catch (error) {
    console.error('Error saving stored sheet info:', error);
  }
}

export function clearStoredCustomSheet() {
  try {
    localStorage.removeItem(STORAGE_CUSTOM_SHEET_ID_KEY);
    localStorage.removeItem(STORAGE_CUSTOM_SHEET_URL_KEY);
  } catch (error) {
    console.error('Error clearing stored sheet info:', error);
  }
}

export function formatIsoToDateStr(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : isoDate;
}

export function formatDateStrToIso(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  return parts.length === 3
    ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    : dateStr;
}

export function getCurrentTimestampStr(): string {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export function getCurrentTimeStr(): string {
  return getCurrentTimestampStr();
}

const callWarningApi = async (payload: Record<string, unknown>): Promise<WarningApiResponse> => {
  const response = await fetch('/api/warning-audits', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null) as WarningApiResponse | null;
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || `API đồng bộ cảnh báo HTTP ${response.status}`);
  }

  if (result.spreadsheetUrl) {
    const match = result.spreadsheetUrl.match(/\/spreadsheets\/d\/([^/]+)/);
    setStoredCustomSheet(match?.[1] || DEFAULT_SHEET_ID, result.spreadsheetUrl);
  }

  return result;
};

/**
 * Apps Script đã được gắn với Sheet hiện tại, nên không cần người dùng đăng nhập
 * Firebase hoặc tạo một file mới từ trình duyệt.
 */
export async function createWarningAuditGoogleSheet(): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
}> {
  const currentSheet = getStoredCustomSheet();
  setStoredCustomSheet(currentSheet.spreadsheetId, currentSheet.spreadsheetUrl);
  return {
    spreadsheetId: currentSheet.spreadsheetId,
    spreadsheetUrl: currentSheet.spreadsheetUrl,
  };
}

/**
 * Giữ dữ liệu cục bộ khi tải trang. Web app hiện chỉ cho phép ghi an toàn;
 * đồng bộ lên Sheet được thực hiện bằng nút "Đổ cảnh báo vào Sheet".
 */
export async function syncAndFetchWarningsFromSheet(
  _dateIso: string,
  _warningFacilities: WarningFacilityItem[],
  existingAudits: Record<string, WarningAuditRecord>,
): Promise<{
  success: boolean;
  syncedAudits: Record<string, WarningAuditRecord>;
  spreadsheetUrl: string;
  addedCount: number;
}> {
  return {
    success: true,
    syncedAudits: { ...existingAudits },
    spreadsheetUrl: getStoredCustomSheet().spreadsheetUrl,
    addedCount: 0,
  };
}

export async function syncAllWarningsForDateToGoogleSheet(
  dateIso: string,
  warningFacilities: WarningFacilityItem[],
  audits: Record<string, WarningAuditRecord>,
): Promise<{ success: boolean; message: string; count: number; spreadsheetUrl?: string }> {
  try {
    const now = getCurrentTimestampStr();
    const items = warningFacilities.map(({ coSo }) => {
      const audit = audits[`${coSo}_${dateIso}`];
      return {
        facility: coSo,
        status: audit?.loaiTrangThai || null,
        email: audit?.emailThucHien || '',
        timestamp: audit?.thoiGianTich || now,
      };
    });

    const result = await callWarningApi({ action: 'sync_all', date: dateIso, items });
    const appended = result.appended || 0;
    const updated = result.updated || 0;
    return {
      success: true,
      message: `Đã đồng bộ ${result.count ?? items.length} cơ sở cảnh báo ngày ${formatIsoToDateStr(dateIso)} (${appended} dòng mới, ${updated} dòng cập nhật).`,
      count: result.count ?? items.length,
      spreadsheetUrl: result.spreadsheetUrl || getStoredCustomSheet().spreadsheetUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Thử lại';
    return { success: false, message: `Lỗi đồng bộ Sheet: ${message}`, count: 0 };
  }
}

export async function clearAllWarningAuditsForDateInGoogleSheet(
  dateIso: string,
): Promise<{ success: boolean; message: string; count: number; spreadsheetUrl?: string }> {
  try {
    const result = await callWarningApi({ action: 'clear_date', date: dateIso });
    const cleared = result.cleared || 0;
    return {
      success: true,
      message: `Đã xóa ${cleared} tích chọn ngày ${formatIsoToDateStr(dateIso)} trên Google Sheet.`,
      count: cleared,
      spreadsheetUrl: result.spreadsheetUrl || getStoredCustomSheet().spreadsheetUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Thử lại';
    return { success: false, message: `Lỗi xóa tích chọn trên Sheet: ${message}`, count: 0 };
  }
}

export async function updateSingleWarningAuditToGoogleSheet(
  dateIso: string,
  coSo: string,
  targetType: 'da_nhac_nho' | 'loi_app' | null,
  userEmailOverride = '',
): Promise<{ success: boolean; message: string; userEmail?: string; spreadsheetUrl?: string }> {
  try {
    const result = await callWarningApi({
      action: 'upsert',
      date: dateIso,
      facility: coSo,
      status: targetType,
      email: targetType ? userEmailOverride : '',
      timestamp: getCurrentTimestampStr(),
    });
    return {
      success: true,
      message: 'Đã cập nhật trạng thái vào Google Sheet.',
      userEmail: targetType ? userEmailOverride : '',
      spreadsheetUrl: result.spreadsheetUrl || getStoredCustomSheet().spreadsheetUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Thử lại';
    return { success: false, message: `Lỗi kết nối Google Sheet: ${message}` };
  }
}
