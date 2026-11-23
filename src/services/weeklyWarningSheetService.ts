import { FacilityDayStatusRecord } from '../components/facility/FacilityDayInspectionModal';
import { OFFICIAL_FACILITIES, normalizeFacilityName } from '../utils/facilityUtils';
import { clearCachedToken, getAccessToken, getCurrentUserProfile } from './workspaceAuth';

export const MASTER_WEEKLY_SHEET_TITLE = 'THEO DÕI XỬ LÝ CẢNH BÁO VỆ SINH';
export const MASTER_OVERVIEW_TAB_TITLE = 'TỔNG HỢP HỒ SƠ';

export const HANDLING_METHODS = [
  'Nhắc nhở',
  'Cảnh báo',
  'Kỉ luật',
  'Sa Thải',
] as const;

export type WeeklyTrackingStatus =
  | 'Chưa xử lý'
  | 'Chờ QLCL xác nhận'
  | 'Đã đóng'
  | 'Không còn cảnh báo sau cập nhật';

export const TEAM_LEADER_SHEET_NAME = 'Trưởng nhóm xử lý';

export const WEEKLY_SHEET_HEADERS = [
  'Mã hồ sơ',
  'Thời gian (Từ ngày - Đến ngày)',
  'Tháng',
  'Tuần',
  'Ngày chốt dữ liệu',
  'Cơ sở',
  'Số ngày không check out',
  'Số ảnh thiếu',
  'Chi tiết các ngày vi phạm',
  'Số lượt đã nhắc nhở',
  'Trưởng nhóm đã duyệt',
  'Phương án xử lý',
  'Ghi chú',
  'Thời gian cập nhật',
  'Người cập nhật',
  'QLCL xác nhận',
  'Trạng thái xử lý',
  'Lịch sử đồng bộ',
] as const;

const STORAGE_WEEKLY_CONFIG_KEY = 'weekly_warning_sheet_config_v1';

export interface SelectedWeekMeta {
  key: string;
  weekNumber: number;
  shortRange: string;
  fullRange: string;
  startIso: string;
  endIso: string;
}

export interface Part2WarningRowInput {
  coSo: string;
  selectedWeekMissingImages: number;
  selectedWeekNoCheckoutDays: number;
  selectedWeekDays: FacilityDayStatusRecord[];
}

export interface WeeklySourceRowRecord {
  recordCode: string;
  legacyRecordCode: string;
  weekCode: string;
  weekNumber: number;
  weekOnlyLabel: string;
  weekLabel: string;
  weekDateRange: string;
  monthLabel: string;
  startIso: string;
  endIso: string;
  coSo: string;
  noCheckoutDays: number;
  missingImages: number;
  violationDetails: string;
  cutoffDate: string;
  teamLeader: string;
}

export const DEFAULT_WEEKLY_SPREADSHEET_ID = '1003lfdUh6S_Tkg5H4qChw7KrziAon1uvgkoFMj9FK0E';
export const DEFAULT_WEEKLY_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_WEEKLY_SPREADSHEET_ID}/edit`;

export interface WeeklyTrackingSheetConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  appsScriptUrl?: string;
  teamLeadersByFacility: Record<string, string>;
  weekSyncHistory: Record<string, { syncedAt: string; sheetId?: number; sheetTitle?: string }>;
}

export interface ExistingWeekCheckResult {
  spreadsheetFound: boolean;
  spreadsheetId: string;
  spreadsheetUrl: string;
  weekExists: boolean;
  weekCode: string;
  sheetId?: number;
  sheetTitle: string;
  existingRowCount: number;
  tabUrl: string;
}

export interface WeeklySheetSyncResult {
  success: boolean;
  needAuth?: boolean;
  needsScriptUpdate?: boolean;
  mode: 'create' | 'update';
  spreadsheetId: string;
  spreadsheetUrl: string;
  tabUrl: string;
  sheetId: number;
  sheetTitle: string;
  weekCode: string;
  syncedAt: string;
  updatedCount: number;
  addedCount: number;
  resolvedCount: number;
  totalRowsVerified: number;
  message: string;
}

export interface WeeklySheetTrackingRecord {
  recordCode: string;
  weekCode: string;
  weekLabel: string;
  weekOnlyLabel?: string;
  monthLabel?: string;
  startIso: string;
  endIso: string;
  coSo: string;
  noCheckoutDays: number;
  missingImages: number;
  violationDetails: string;
  cutoffDate: string;
  reminderCount: number;
  teamLeader: string;
  handled: boolean;
  handlingMethod: string;
  notes: string;
  updatedAt: string;
  updatedBy: string;
  qlclConfirmed: boolean;
  status: WeeklyTrackingStatus;
  syncNote: string;
  spreadsheetId: string;
  sheetId: number;
  sheetTitle: string;
  rowNumber: number;
  tabUrl: string;
}

export function formatIsoShortDmy(iso: string): string {
  const parts = (iso || '').trim().split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function buildMonthLabelFromIso(iso: string): string {
  const parts = (iso || '').trim().split('-');
  if (parts.length !== 3) return '';
  return `${parts[1]}/${parts[0]}`;
}

export function buildWeekDateRange(startIso: string, endIso: string): string {
  return `${formatIsoShortDmy(startIso)} - ${formatIsoShortDmy(endIso)}`;
}

export function buildWeekCode(startIso: string, endIso: string): string {
  return `W_${startIso}_TO_${endIso}`;
}

export function buildWeekPrefixNew(weekNumber: number, startIso: string): string {
  const monthLabel = buildMonthLabelFromIso(startIso);
  return `Tuần ${weekNumber}_${monthLabel}_`;
}

export function buildWeekTabTitle(startIso: string, endIso: string): string {
  const s = startIso.split('-');
  const e = endIso.split('-');
  if (s.length === 3 && e.length === 3) {
    return `Tuần ${s[2]}.${s[1]}-${e[2]}.${e[1]}.${e[0]}`;
  }
  return `Tuần ${startIso}_${endIso}`.slice(0, 90);
}

export function buildFacilitySlug(coSo: string): string {
  const norm = normalizeFacilityName(coSo) || coSo;
  return norm
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function buildLegacyRecordCode(startIso: string, endIso: string, coSo: string): string {
  return `${buildWeekCode(startIso, endIso)}__${buildFacilitySlug(coSo)}`;
}

export function buildRecordCode(
  startIso: string,
  endIso: string,
  coSo: string,
  weekNumber?: number,
): string {
  const normalizedFacility = normalizeFacilityName(coSo) || coSo;
  if (weekNumber !== undefined && weekNumber > 0) {
    return `${buildWeekPrefixNew(weekNumber, startIso)}${normalizedFacility}`;
  }
  return buildLegacyRecordCode(startIso, endIso, normalizedFacility);
}

export function parseWeekRangeFromCode(weekCode: string): { startIso: string; endIso: string } {
  const m = /^W_(\d{4}-\d{2}-\d{2})_TO_(\d{4}-\d{2}-\d{2})$/.exec((weekCode || '').trim());
  if (m) return { startIso: m[1], endIso: m[2] };
  return { startIso: '', endIso: '' };
}

function dmyToIso(dmy: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((dmy || '').trim());
  if (!m) return '';
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function parseDateRangeToIsos(rangeText: string): { startIso: string; endIso: string } {
  const clean = (rangeText || '')
    .replace(/\s*\(Tuần\s*\d+\)\s*/i, '')
    .replace(/[–—]/g, '-')
    .trim();
  const parts = clean.split('-').map(p => p.trim());
  if (parts.length >= 2) {
    const startIso = dmyToIso(parts[0]);
    const endIso = dmyToIso(parts[1]);
    if (startIso && endIso) return { startIso, endIso };
  }
  return { startIso: '', endIso: '' };
}

function normalizeDateRangeCompare(text: string): string {
  return (text || '')
    .replace(/\s*\(Tuần\s*\d+\)\s*/i, '')
    .replace(/[–—]/g, '-')
    .replace(/\s*-\s*/g, ' - ')
    .trim();
}

export function getNowVietnamTimestamp(): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(new Date())
    .replace(',', '');
}

export function formatViolatingDaysDetail(selectedWeekDays: FacilityDayStatusRecord[]): string {
  const lines: string[] = [];
  selectedWeekDays.forEach(d => {
    if (d.status === 'no_checkout') {
      lines.push(`${d.shortDate} (${d.weekdayLabel}): Không check out (0/${d.dailyTarget ?? 0})`);
    } else if (d.status === 'incomplete') {
      lines.push(
        `${d.shortDate} (${d.weekdayLabel}): Thiếu ${d.missingCount} ảnh (${d.photoCompletedItems}/${d.dailyTarget ?? 0})`,
      );
    }
  });
  return lines.join('; ');
}

/**
 * Rút trích trực tiếp các cơ sở cần xử lý từ part2WarningTableData.rows và tuần đang chọn tại Phần 2.
 * Quy tắc:
 * - Chỉ lấy cơ sở có selectedWeekMissingImages > 0 hoặc selectedWeekNoCheckoutDays > 0.
 * - KHÔNG lọc theo activeLatestDay.status.
 */
export function extractWeeklySourceRowsFromPart2(
  rows: Part2WarningRowInput[],
  selectedWeek: SelectedWeekMeta,
  cutoffDisplay: string,
  teamLeadersByFacility: Record<string, string> = {},
): WeeklySourceRowRecord[] {
  const weekCode = buildWeekCode(selectedWeek.startIso, selectedWeek.endIso);
  const weekDateRange = buildWeekDateRange(selectedWeek.startIso, selectedWeek.endIso);
  const monthLabel = buildMonthLabelFromIso(selectedWeek.startIso);
  const weekOnlyLabel = `Tuần ${selectedWeek.weekNumber}`;
  const weekLabel = `${weekDateRange} (${weekOnlyLabel})`;

  return rows
    .filter(r => r.selectedWeekMissingImages > 0 || r.selectedWeekNoCheckoutDays > 0)
    .map(r => {
      const normalizedFacility = normalizeFacilityName(r.coSo) || r.coSo;
      return {
        recordCode: buildRecordCode(
          selectedWeek.startIso,
          selectedWeek.endIso,
          normalizedFacility,
          selectedWeek.weekNumber,
        ),
        legacyRecordCode: buildLegacyRecordCode(
          selectedWeek.startIso,
          selectedWeek.endIso,
          normalizedFacility,
        ),
        weekCode,
        weekNumber: selectedWeek.weekNumber,
        weekOnlyLabel,
        weekLabel,
        weekDateRange,
        monthLabel,
        startIso: selectedWeek.startIso,
        endIso: selectedWeek.endIso,
        coSo: normalizedFacility,
        noCheckoutDays: r.selectedWeekNoCheckoutDays,
        missingImages: r.selectedWeekMissingImages,
        violationDetails: formatViolatingDaysDetail(r.selectedWeekDays) || 'Thiếu dữ liệu trong tuần',
        cutoffDate: cutoffDisplay,
        teamLeader: (teamLeadersByFacility[normalizedFacility] || '').trim(),
      };
    });
}

// ============================================================================
// Persistent config helpers (localStorage + Express /api/weekly-warning-config)
// ============================================================================
export function getLocalWeeklySheetConfig(): WeeklyTrackingSheetConfig {
  const empty: WeeklyTrackingSheetConfig = {
    spreadsheetId: DEFAULT_WEEKLY_SPREADSHEET_ID,
    spreadsheetUrl: DEFAULT_WEEKLY_SPREADSHEET_URL,
    spreadsheetTitle: MASTER_WEEKLY_SHEET_TITLE,
    appsScriptUrl: '',
    teamLeadersByFacility: {},
    weekSyncHistory: {},
  };
  try {
    const raw = localStorage.getItem(STORAGE_WEEKLY_CONFIG_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    const sid = (parsed?.spreadsheetId || '').trim() || DEFAULT_WEEKLY_SPREADSHEET_ID;
    return {
      ...empty,
      ...parsed,
      spreadsheetId: sid,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sid}/edit`,
      appsScriptUrl: parsed?.appsScriptUrl || '',
      teamLeadersByFacility: parsed?.teamLeadersByFacility || {},
      weekSyncHistory: parsed?.weekSyncHistory || {},
    };
  } catch {
    return empty;
  }
}

export function setLocalWeeklySheetConfig(cfg: WeeklyTrackingSheetConfig) {
  try {
    localStorage.setItem(STORAGE_WEEKLY_CONFIG_KEY, JSON.stringify(cfg));
  } catch {}
}

export async function loadWeeklySheetConfig(): Promise<WeeklyTrackingSheetConfig> {
  const local = getLocalWeeklySheetConfig();
  try {
    const resp = await fetch('/api/weekly-warning-config', { cache: 'no-store' });
    if (resp.ok) {
      const json = await resp.json();
      if (json?.success && json.config) {
        const sid = (json.config.spreadsheetId || local.spreadsheetId || DEFAULT_WEEKLY_SPREADSHEET_ID).trim();
        const merged: WeeklyTrackingSheetConfig = {
          spreadsheetId: sid,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sid}/edit`,
          spreadsheetTitle: json.config.spreadsheetTitle || MASTER_WEEKLY_SHEET_TITLE,
          appsScriptUrl: json.config.appsScriptUrl || local.appsScriptUrl || '',
          teamLeadersByFacility: {
            ...local.teamLeadersByFacility,
            ...(json.config.teamLeadersByFacility || {}),
          },
          weekSyncHistory: {
            ...local.weekSyncHistory,
            ...(json.config.weekSyncHistory || {}),
          },
        };
        setLocalWeeklySheetConfig(merged);
        return merged;
      }
    }
  } catch {}
  return local;
}

export async function saveWeeklySheetConfig(
  patch: Partial<WeeklyTrackingSheetConfig>,
): Promise<WeeklyTrackingSheetConfig> {
  const current = getLocalWeeklySheetConfig();
  const nextSid =
    patch.spreadsheetId !== undefined
      ? patch.spreadsheetId.trim() || DEFAULT_WEEKLY_SPREADSHEET_ID
      : current.spreadsheetId || DEFAULT_WEEKLY_SPREADSHEET_ID;

  const next: WeeklyTrackingSheetConfig = {
    spreadsheetId: nextSid,
    spreadsheetUrl:
      patch.spreadsheetUrl !== undefined
        ? patch.spreadsheetUrl
        : `https://docs.google.com/spreadsheets/d/${nextSid}/edit`,
    spreadsheetTitle: patch.spreadsheetTitle || current.spreadsheetTitle || MASTER_WEEKLY_SHEET_TITLE,
    appsScriptUrl: patch.appsScriptUrl !== undefined ? patch.appsScriptUrl.trim() : current.appsScriptUrl || '',
    teamLeadersByFacility: patch.teamLeadersByFacility ?? current.teamLeadersByFacility,
    weekSyncHistory: {
      ...current.weekSyncHistory,
      ...(patch.weekSyncHistory || {}),
    },
  };
  setLocalWeeklySheetConfig(next);

  try {
    await fetch('/api/weekly-warning-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
  } catch {}

  return next;
}

// ============================================================================
// Google Sheets & Drive API v4 low-level helpers
// ============================================================================
class GoogleWorkspaceAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleWorkspaceAuthError';
  }
}

async function googleApiFetch(url: string, token: string, init: RequestInit = {}): Promise<any> {
  const resp = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });

  if (resp.status === 401) {
    clearCachedToken();
    throw new GoogleWorkspaceAuthError('Phiên đăng nhập Google đã hết hạn. Vui lòng đăng nhập lại.');
  }

  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    const errMsg = data?.error?.message || `Google API lỗi HTTP ${resp.status}`;
    if (resp.status === 403 && /insufficient|scope|permission/i.test(errMsg)) {
      throw new GoogleWorkspaceAuthError(
        'Tài khoản Google chưa cấp đủ quyền Google Sheets / Google Drive. Vui lòng đăng nhập lại và tick chọn đầy đủ quyền.',
      );
    }
    throw new Error(errMsg);
  }
  return data;
}

function escapeA1SheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

function encodeA1Range(sheetTitle: string, rangePart: string): string {
  return encodeURIComponent(`${escapeA1SheetTitle(sheetTitle)}!${rangePart}`);
}

interface SheetTabInfo {
  sheetId: number;
  title: string;
  developerMetadata?: Array<{ metadataId?: number; metadataKey?: string; metadataValue?: string }>;
}

interface SpreadsheetMetaInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  locale?: string;
  sheets: SheetTabInfo[];
}

async function fetchSpreadsheetMeta(
  spreadsheetId: string,
  token: string,
): Promise<SpreadsheetMetaInfo | null> {
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,spreadsheetUrl,properties(title,locale),sheets(properties(sheetId,title),developerMetadata(metadataId,metadataKey,metadataValue))`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  );
  if (resp.status === 401) {
    clearCachedToken();
    throw new GoogleWorkspaceAuthError('Phiên đăng nhập Google đã hết hạn. Vui lòng đăng nhập lại.');
  }
  if (resp.status === 404) return null;
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data?.spreadsheetId) {
    if (resp.status === 403) {
      throw new GoogleWorkspaceAuthError(
        data?.error?.message || 'Không có quyền truy cập file Google Sheet này.',
      );
    }
    return null;
  }

  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    title: data.properties?.title || MASTER_WEEKLY_SHEET_TITLE,
    locale: data.properties?.locale || '',
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title || '',
      developerMetadata: s.developerMetadata || [],
    })),
  };
}

async function searchMasterSheetInDrive(
  token: string,
): Promise<{ id: string; url: string } | null> {
  const escapedName = MASTER_WEEKLY_SHEET_TITLE.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const q = `name = '${escapedName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink,modifiedTime)&orderBy=modifiedTime desc&pageSize=5`;

  try {
    const data = await googleApiFetch(url, token);
    const files = Array.isArray(data?.files) ? data.files : [];
    if (files.length > 0 && files[0]?.id) {
      return {
        id: files[0].id,
        url: files[0].webViewLink || `https://docs.google.com/spreadsheets/d/${files[0].id}/edit`,
      };
    }
  } catch (err) {
    if (err instanceof GoogleWorkspaceAuthError) throw err;
    console.warn('Drive search fallback warning:', err);
  }
  return null;
}

export async function findExistingMasterSpreadsheet(
  token: string,
  config?: WeeklyTrackingSheetConfig,
): Promise<SpreadsheetMetaInfo | null> {
  const cfg = config || (await loadWeeklySheetConfig());
  if (cfg.spreadsheetId) {
    const meta = await fetchSpreadsheetMeta(cfg.spreadsheetId, token);
    if (meta) return meta;
  }

  const foundInDrive = await searchMasterSheetInDrive(token);
  if (foundInDrive) {
    const meta = await fetchSpreadsheetMeta(foundInDrive.id, token);
    if (meta) {
      await saveWeeklySheetConfig({
        spreadsheetId: meta.spreadsheetId,
        spreadsheetUrl: meta.spreadsheetUrl,
        spreadsheetTitle: meta.title,
      });
      return meta;
    }
  }
  return null;
}

async function ensureMasterSpreadsheet(token: string): Promise<SpreadsheetMetaInfo> {
  const cfg = await loadWeeklySheetConfig();
  const existing = await findExistingMasterSpreadsheet(token, cfg);
  if (existing) return existing;

  // Create ONCE if missing
  const created = await googleApiFetch('https://sheets.googleapis.com/v4/spreadsheets', token, {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        title: MASTER_WEEKLY_SHEET_TITLE,
        locale: 'vi_VN',
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      sheets: [
        {
          properties: {
            title: MASTER_OVERVIEW_TAB_TITLE,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  const meta: SpreadsheetMetaInfo = {
    spreadsheetId: created.spreadsheetId,
    spreadsheetUrl:
      created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}/edit`,
    title: created.properties?.title || MASTER_WEEKLY_SHEET_TITLE,
    locale: created.properties?.locale || 'vi_VN',
    sheets: (created.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title || '',
      developerMetadata: s.developerMetadata || [],
    })),
  };

  await saveWeeklySheetConfig({
    spreadsheetId: meta.spreadsheetId,
    spreadsheetUrl: meta.spreadsheetUrl,
    spreadsheetTitle: meta.title,
  });

  // Initialize overview tab header (0 data rows yet)
  const overviewTab = meta.sheets[0];
  if (overviewTab) {
    await applySheetHeaderAndFormatting(meta.spreadsheetId, overviewTab.sheetId, overviewTab.title, token, false, 0);
  }

  return meta;
}

async function applySheetHeaderAndFormatting(
  spreadsheetId: string,
  sheetId: number,
  sheetTitle: string,
  token: string,
  addProtection: boolean,
  dataRowCount = 0,
) {
  const populatedRows = Math.max(0, Math.floor(dataRowCount));
  const endDataRowIndex = 1 + populatedRows;
  const clearEndRowIndex = Math.max(1000, endDataRowIndex + 200);

  await googleApiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeA1Range(sheetTitle, 'A1:R1')}?valueInputOption=USER_ENTERED`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        range: `${escapeA1SheetTitle(sheetTitle)}!A1:R1`,
        majorDimension: 'ROWS',
        values: [[...WEEKLY_SHEET_HEADERS]],
      }),
    },
  );

  // IMPORTANT: Keep formatting + square checkboxes (BOOLEAN DataValidation) strictly on populated rows (1 .. endDataRowIndex)
  // so no trailing FALSE checkboxes pollute empty rows below the dataset!
  const formatRequests: any[] = [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 1 },
        },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    // Clear stale validations across ALL rows 2..clearEndRowIndex (cols I:R) first
    {
      setDataValidation: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: clearEndRowIndex,
          startColumnIndex: 8,
          endColumnIndex: 18,
        },
      },
    },
    // Style header row A1:R1
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 18,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.1, green: 0.23, blue: 0.36 },
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 10,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'WRAP',
          },
        },
        fields:
          'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
      },
    },
    ...(populatedRows > 0
      ? [
          // Square checkbox validation on Column K ("Trưởng nhóm đã duyệt", col index 10)
          {
            setDataValidation: {
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: endDataRowIndex,
                startColumnIndex: 10,
                endColumnIndex: 11,
              },
              rule: {
                condition: { type: 'BOOLEAN' },
                strict: true,
                showCustomUi: true,
              },
            },
          },
          // Dropdown validation on Column L ("Phương án xử lý", col index 11)
          {
            setDataValidation: {
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: endDataRowIndex,
                startColumnIndex: 11,
                endColumnIndex: 12,
              },
              rule: {
                condition: {
                  type: 'ONE_OF_LIST',
                  values: HANDLING_METHODS.map(m => ({ userEnteredValue: m })),
                },
                strict: false,
                showCustomUi: true,
              },
            },
          },
          // Square checkbox validation on Column P ("QLCL xác nhận", col index 15)
          {
            setDataValidation: {
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: endDataRowIndex,
                startColumnIndex: 15,
                endColumnIndex: 16,
              },
              rule: {
                condition: { type: 'BOOLEAN' },
                strict: true,
                showCustomUi: true,
              },
            },
          },
          // Center columns B:E (Thời gian, Tháng, Tuần, Ngày chốt) and G:H (KCO, Thiếu ảnh)
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: endDataRowIndex,
                startColumnIndex: 1,
                endColumnIndex: 5,
              },
              cell: {
                userEnteredFormat: {
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat.horizontalAlignment',
            },
          },
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: endDataRowIndex,
                startColumnIndex: 6,
                endColumnIndex: 8,
              },
              cell: {
                userEnteredFormat: {
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat.horizontalAlignment',
            },
          },
          // Center & bold Column J ("Số lượt đã nhắc nhở", col index 9) and set integer format
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: endDataRowIndex,
                startColumnIndex: 9,
                endColumnIndex: 10,
              },
              cell: {
                userEnteredFormat: {
                  horizontalAlignment: 'CENTER',
                  textFormat: { bold: true },
                  numberFormat: { type: 'NUMBER', pattern: '0' },
                },
              },
              fields: 'userEnteredFormat(horizontalAlignment,textFormat.bold,numberFormat)',
            },
          },
          // Wrap text and middle alignment A:R strictly on populated rows
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: endDataRowIndex,
                startColumnIndex: 0,
                endColumnIndex: 18,
              },
              cell: {
                userEnteredFormat: {
                  verticalAlignment: 'MIDDLE',
                  wrapStrategy: 'WRAP',
                },
              },
              fields: 'userEnteredFormat(verticalAlignment,wrapStrategy)',
            },
          },
        ]
      : []),
    // Update Row 1 height for readability
    {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: 0,
          endIndex: 1,
        },
        properties: { pixelSize: 44 },
        fields: 'pixelSize',
      },
    },
    // Column widths A..R
    ...[
      265, // A Mã hồ sơ (Tuần_Tháng_Cơ sở)
      215, // B Thời gian (Từ ngày - Đến ngày)
      95, // C Tháng
      90, // D Tuần
      140, // E Ngày chốt dữ liệu
      195, // F Cơ sở
      130, // G Số ngày không check out
      115, // H Số ảnh thiếu
      480, // I Chi tiết các ngày vi phạm
      145, // J Số lượt đã nhắc nhở
      145, // K Trưởng nhóm đã duyệt (Checkbox)
      180, // L Phương án xử lý
      240, // M Ghi chú
      165, // N Thời gian cập nhật
      175, // O Người cập nhật
      130, // P QLCL xác nhận (Checkbox)
      195, // Q Trạng thái xử lý
      270, // R Lịch sử đồng bộ
    ].map((pixelSize, idx) => ({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: idx,
          endIndex: idx + 1,
        },
        properties: { pixelSize },
        fields: 'pixelSize',
      },
    })),
  ];

  // Ensure live COUNTIFS formula in Column J using the sheet's argument separator (";" for vi_VN, "," fallback if needed)
  if (populatedRows > 0) {
    let preferSemicolon = true;
    try {
      const locMeta = await googleApiFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.locale`,
        token,
      );
      const loc = String(locMeta?.properties?.locale || '').toLowerCase();
      if (
        loc.startsWith('en_') ||
        loc === 'en' ||
        loc.startsWith('ja') ||
        loc.startsWith('ko') ||
        loc.startsWith('zh')
      ) {
        preferSemicolon = false;
      }
    } catch {
      preferSemicolon = true;
    }

    const sepOrder = preferSemicolon ? [';', ','] : [',', ';'];
    const buildJFormulas = (sep: string) =>
      Array.from({ length: populatedRows }, (_, idx) => {
        const rowNum = 2 + idx;
        return [`=IF(F${rowNum}=""${sep}""${sep}COUNTIFS($F$2:$F${sep}F${rowNum}${sep}$K$2:$K${sep}TRUE))`];
      });

    for (const sep of sepOrder) {
      try {
        await googleApiFetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeA1Range(sheetTitle, `J2:J${endDataRowIndex}`)}?valueInputOption=USER_ENTERED`,
          token,
          {
            method: 'PUT',
            body: JSON.stringify({
              range: `${escapeA1SheetTitle(sheetTitle)}!J2:J${endDataRowIndex}`,
              majorDimension: 'ROWS',
              values: buildJFormulas(sep),
            }),
          },
        );
        const checkCell = await googleApiFetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeA1Range(sheetTitle, 'J2')}?valueRenderOption=FORMATTED_VALUE`,
          token,
        ).catch(() => null);
        const renderedVal = String(checkCell?.values?.[0]?.[0] ?? '').trim();
        if (!renderedVal.startsWith('#ERROR') && !renderedVal.startsWith('#NAME')) {
          break;
        }
      } catch (fErr) {
        console.warn(`Column J COUNTIFS formula (${sep}) warning:`, fErr);
      }
    }
  }

  try {
    await googleApiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ requests: formatRequests }),
      },
    );
  } catch (err) {
    console.warn('Formatting / checkbox batchUpdate warning:', err);
  }

  if (addProtection) {
    try {
      const protMeta = await googleApiFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties.sheetId,protectedRanges(protectedRangeId))`,
        token,
      );
      const thisSheetMeta = (protMeta?.sheets || []).find((s: any) => s.properties?.sheetId === sheetId);
      const existingProtections: any[] = thisSheetMeta?.protectedRanges || [];
      if (existingProtections.length === 0) {
        await googleApiFetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          token,
          {
            method: 'POST',
            body: JSON.stringify({
              requests: [
                {
                  addProtectedRange: {
                    protectedRange: {
                      range: { sheetId, startColumnIndex: 0, endColumnIndex: 10 },
                      description: 'Khóa số liệu gốc lấy từ Phần 2 & Số lượt đã nhắc nhở tự động',
                      warningOnly: true,
                    },
                  },
                },
                {
                  addProtectedRange: {
                    protectedRange: {
                      range: { sheetId, startColumnIndex: 15, endColumnIndex: 18 },
                      description: 'Khóa cột xác nhận QLCL & trạng thái hệ thống',
                      warningOnly: true,
                    },
                  },
                },
              ],
            }),
          },
        );
      }
    } catch (protErr) {
      console.warn('Optional protection batchUpdate warning:', protErr);
    }
  }
}

function extractWeekOnlyOAuth(codeOrWeekText: string): string {
  const m = /Tuần\s*(\d+)/i.exec(codeOrWeekText || '');
  return m ? `Tuần ${m[1]}` : 'Tuần 1';
}

function buildNewCodeFromLegacyOAuth(oldCode: string, coSo: string, oldWeekText: string): string {
  const cleanCode = (oldCode || '').trim();
  if (/^Tuần\s*\d+_\d{2}\/\d{4}_/i.test(cleanCode)) {
    return cleanCode;
  }
  const mCode = /^W_(\d{4})-(\d{2})-\d{2}_TO_\d{4}-\d{2}-\d{2}__/.exec(cleanCode);
  const weekStr = extractWeekOnlyOAuth(oldWeekText);
  const monthStr = mCode ? `${mCode[2]}/${mCode[1]}` : '';
  const normalizedFac = normalizeFacilityName(coSo) || coSo;
  if (monthStr && normalizedFac) {
    return `${weekStr}_${monthStr}_${normalizedFac}`;
  }
  return oldCode;
}

function extractWeeklyRowSortTuple(row: unknown[]): { startIso: string; endIso: string; weekNum: number } {
  const code = String(row?.[0] ?? '').trim();
  const rangeText = normalizeDateRangeCompare(String(row?.[1] ?? ''));
  const monthText = String(row?.[2] ?? '').trim();
  const weekText = String(row?.[3] ?? '').trim();
  const cutoffText = String(row?.[4] ?? '').trim();

  const yearMatch = /\d{4}/.exec(monthText) || /\d{4}/.exec(cutoffText) || /\d{4}/.exec(rangeText);
  const fallbackYear = yearMatch ? yearMatch[0] : String(new Date().getFullYear());

  const parsePart = (part: string): string => {
    const s = (part || '').trim();
    const mIso = /(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/.exec(s);
    if (mIso) return `${mIso[1]}-${mIso[2].padStart(2, '0')}-${mIso[3].padStart(2, '0')}`;
    const mDmy = /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/.exec(s);
    if (mDmy) return `${mDmy[3]}-${mDmy[2].padStart(2, '0')}-${mDmy[1].padStart(2, '0')}`;
    const mDm = /(\d{1,2})[\/-](\d{1,2})/.exec(s);
    if (mDm) return `${fallbackYear}-${mDm[2].padStart(2, '0')}-${mDm[1].padStart(2, '0')}`;
    return '';
  };

  let startIso = '';
  let endIso = '';
  if (rangeText) {
    const parts = rangeText.split('-');
    if (parts.length >= 2) {
      startIso = parsePart(parts[0]);
      endIso = parsePart(parts[1]);
    } else {
      startIso = parsePart(rangeText);
    }
  }
  if (!startIso) {
    const legacyRange = parseWeekRangeFromCode(code.split('__')[0]);
    startIso = legacyRange.startIso;
    endIso = legacyRange.endIso;
  }

  const mWeek = /Tuần\s*(\d+)/i.exec(`${weekText} ${code}`);
  const weekNum = mWeek ? Number(mWeek[1]) : 99;

  if (!startIso && monthText) {
    const mMy = /(\d{1,2})[\/-](\d{4})/.exec(monthText);
    if (mMy) {
      startIso = `${mMy[2]}-${mMy[1].padStart(2, '0')}-W${String(weekNum).padStart(2, '0')}`;
    }
  }

  return {
    startIso: startIso || '9999-99-99',
    endIso: endIso || startIso || '9999-99-99',
    weekNum,
  };
}

function sortWeeklyOAuthRowsAscending(rows: unknown[][]): unknown[][] {
  return rows
    .map((row, origIdx) => ({ row, origIdx, tuple: extractWeeklyRowSortTuple(row) }))
    .sort((a, b) => {
      if (a.tuple.startIso !== b.tuple.startIso) {
        return a.tuple.startIso.localeCompare(b.tuple.startIso);
      }
      if (a.tuple.endIso !== b.tuple.endIso) {
        return a.tuple.endIso.localeCompare(b.tuple.endIso);
      }
      if (a.tuple.weekNum !== b.tuple.weekNum) {
        return a.tuple.weekNum - b.tuple.weekNum;
      }
      return a.origIdx - b.origIdx;
    })
    .map(item => item.row);
}

function isRealWeeklyOAuthRow(row: unknown[]): boolean {
  const code = String(row?.[0] ?? '').trim();
  const range = String(row?.[1] ?? '').trim();
  const coSo = String(row?.[5] ?? '').trim();
  return Boolean(code && (coSo || range));
}

async function migrateWeeklyOAuthSheetIfNeeded(
  spreadsheetId: string,
  sheetId: number,
  sheetTitle: string,
  token: string,
): Promise<boolean> {
  const existingRows = await readSheetValues(spreadsheetId, sheetTitle, 'A:R', token);
  if (existingRows.length === 0) {
    await applySheetHeaderAndFormatting(spreadsheetId, sheetId, sheetTitle, token, true, 0);
    return false;
  }

  const header = existingRows[0] || [];
  const h1 = String(header[1] ?? '').trim();
  const h2 = String(header[2] ?? '').trim();
  const h3 = String(header[3] ?? '').trim();
  const h4 = String(header[4] ?? '').trim();
  const h9 = String(header[9] ?? '').trim();

  // Already in v6 18-column structure: Mã hồ sơ | Thời gian | Tháng | Tuần | Ngày chốt dữ liệu + Số lượt đã nhắc nhở
  if (
    h1 === WEEKLY_SHEET_HEADERS[1] &&
    h2 === WEEKLY_SHEET_HEADERS[2] &&
    h3 === WEEKLY_SHEET_HEADERS[3] &&
    h4 === WEEKLY_SHEET_HEADERS[4] &&
    h9 === WEEKLY_SHEET_HEADERS[9]
  ) {
    return false;
  }

  // Upgrade v5 18-col header ("Trưởng nhóm phụ trách" -> "Số lượt đã nhắc nhở" + 4 phương án) without losing data
  if (
    h1 === WEEKLY_SHEET_HEADERS[1] &&
    h2 === WEEKLY_SHEET_HEADERS[2] &&
    h3 === WEEKLY_SHEET_HEADERS[3] &&
    h4 === WEEKLY_SHEET_HEADERS[4]
  ) {
    const realCount = existingRows.slice(1).filter(isRealWeeklyOAuthRow).length;
    await applySheetHeaderAndFormatting(spreadsheetId, sheetId, sheetTitle, token, true, realCount);
    return true;
  }

  const isOld16 = h1 === 'Tuần' || h2 === 'Cơ sở' || h3 === 'Số ngày không check out';
  const isMid17 = h1 === WEEKLY_SHEET_HEADERS[1] && h2 === 'Tháng' && h3 === 'Ngày chốt dữ liệu' && h4 === 'Cơ sở';

  if ((!isOld16 && !isMid17) || existingRows.length < 2) {
    const realCount = existingRows.slice(1).filter(isRealWeeklyOAuthRow).length;
    await applySheetHeaderAndFormatting(spreadsheetId, sheetId, sheetTitle, token, true, realCount);
    return false;
  }

  const migratedRows: unknown[][] = [];
  for (let i = 1; i < existingRows.length; i++) {
    const r = existingRows[i];
    if (isMid17) {
      const code17 = String(r?.[0] ?? '').trim();
      const coSo17 = String(r?.[4] ?? '').trim();
      if (!code17 && !coSo17) continue;
      const weekOnly17 = extractWeekOnlyOAuth(code17);
      migratedRows.push([
        code17, // A: Mã hồ sơ
        normalizeDateRangeCompare(String(r?.[1] ?? '')), // B: Thời gian (chỉ ngày)
        String(r?.[2] ?? '').trim(), // C: Tháng
        weekOnly17, // D: Tuần
        String(r?.[3] ?? '').trim(), // E: Ngày chốt dữ liệu
        coSo17, // F: Cơ sở
        Number(r?.[5] ?? 0) || 0, // G: Số ngày không check out
        Number(r?.[6] ?? 0) || 0, // H: Số ảnh thiếu
        String(r?.[7] ?? '').trim(), // I: Chi tiết các ngày vi phạm
        String(r?.[8] ?? '').trim(), // J: Trưởng nhóm phụ trách
        parseBooleanCell(r?.[9]), // K: Trưởng nhóm đã duyệt
        String(r?.[10] ?? '').trim(), // L: Phương án xử lý
        String(r?.[11] ?? '').trim(), // M: Ghi chú
        String(r?.[12] ?? '').trim(), // N: Thời gian cập nhật
        String(r?.[13] ?? '').trim(), // O: Người cập nhật
        parseBooleanCell(r?.[14]), // P: QLCL xác nhận
        String(r?.[15] ?? '').trim() || 'Chưa xử lý', // Q: Trạng thái xử lý
        String(r?.[16] ?? '').trim(), // R: Lịch sử đồng bộ
      ]);
    } else {
      const oldCode = String(r?.[0] ?? '').trim();
      const oldWeekText = String(r?.[1] ?? '').trim();
      const coSo = String(r?.[2] ?? '').trim();
      if (!oldCode && !coSo) continue;

      const rangeOnly = normalizeDateRangeCompare(oldWeekText);
      const mLegacy = /^W_(\d{4})-(\d{2})-\d{2}_TO_/.exec(oldCode);
      const mNewCode = /^Tuần\s*(\d+)_(\d{2}\/\d{4})_/i.exec(oldCode);
      const monthVal = mNewCode ? mNewCode[2] : mLegacy ? `${mLegacy[2]}/${mLegacy[1]}` : '';
      const weekOnly = mNewCode ? `Tuần ${mNewCode[1]}` : extractWeekOnlyOAuth(oldWeekText);
      const newCode = buildNewCodeFromLegacyOAuth(oldCode, coSo, oldWeekText);

      migratedRows.push([
        newCode, // A: Mã hồ sơ (Tuần_Tháng_Cơ sở)
        rangeOnly || oldWeekText, // B: Thời gian (Từ ngày - Đến ngày)
        monthVal, // C: Tháng
        weekOnly, // D: Tuần
        String(r?.[6] ?? '').trim(), // E: Ngày chốt dữ liệu (sát cột Tuần)
        coSo, // F: Cơ sở
        Number(r?.[3] ?? 0) || 0, // G: Số ngày không check out
        Number(r?.[4] ?? 0) || 0, // H: Số ảnh thiếu
        String(r?.[5] ?? '').trim(), // I: Chi tiết các ngày vi phạm
        String(r?.[7] ?? '').trim(), // J: Trưởng nhóm phụ trách
        parseBooleanCell(r?.[8]), // K: Trưởng nhóm đã duyệt (checkbox boolean)
        String(r?.[9] ?? '').trim(), // L: Phương án xử lý
        String(r?.[10] ?? '').trim(), // M: Ghi chú
        String(r?.[11] ?? '').trim(), // N: Thời gian cập nhật
        String(r?.[12] ?? '').trim(), // O: Người cập nhật
        parseBooleanCell(r?.[13]), // P: QLCL xác nhận (checkbox boolean)
        String(r?.[14] ?? '').trim() || 'Chưa xử lý', // Q: Trạng thái xử lý
        String(r?.[15] ?? '').trim(), // R: Lịch sử đồng bộ
      ]);
    }
  }

  const sortedMigrated = sortWeeklyOAuthRowsAscending(migratedRows);

  await googleApiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeA1Range(sheetTitle, 'A:R')}:clear`,
    token,
    { method: 'POST' },
  );

  if (sortedMigrated.length > 0) {
    await googleApiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeA1Range(sheetTitle, `A2:R${sortedMigrated.length + 1}`)}?valueInputOption=USER_ENTERED`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify({
          range: `${escapeA1SheetTitle(sheetTitle)}!A2:R${sortedMigrated.length + 1}`,
          majorDimension: 'ROWS',
          values: sortedMigrated,
        }),
      },
    );
  }

  await applySheetHeaderAndFormatting(
    spreadsheetId,
    sheetId,
    sheetTitle,
    token,
    true,
    sortedMigrated.length,
  );
  return true;
}

function findTeamLeaderTab(sheets: SheetTabInfo[]): SheetTabInfo | undefined {
  const targetLower = TEAM_LEADER_SHEET_NAME.trim().toLowerCase();
  return sheets.find(s => s.title.trim().toLowerCase() === targetLower);
}

function findMatchingWeekTab(
  sheets: SheetTabInfo[],
  startIso: string,
  endIso: string,
): SheetTabInfo | undefined {
  const teamTab = findTeamLeaderTab(sheets);
  if (teamTab) return teamTab;
  const weekCode = buildWeekCode(startIso, endIso);
  const expectedTitle = buildWeekTabTitle(startIso, endIso);
  return (
    sheets.find(s =>
      s.developerMetadata?.some(
        m => m.metadataKey === 'weekCode' && m.metadataValue === weekCode,
      ),
    ) ||
    sheets.find(s => s.title.trim() === expectedTitle) ||
    sheets.find(s => s.title.includes(weekCode))
  );
}

async function readSheetValues(
  spreadsheetId: string,
  sheetTitle: string,
  rangePart: string,
  token: string,
): Promise<string[][]> {
  const data = await googleApiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeA1Range(sheetTitle, rangePart)}?valueRenderOption=UNFORMATTED_VALUE`,
    token,
  );
  return Array.isArray(data?.values) ? data.values : [];
}

function parseBooleanCell(val: unknown): boolean {
  if (val === true) return true;
  if (val === false || val === undefined || val === null) return false;
  const s = String(val).trim().toLowerCase();
  return s === 'true' || s === 'có' || s === 'x' || s === '1' || s === 'yes';
}

function parseRowToTrackingRecord(
  row: unknown[],
  rowNumber: number,
  spreadsheetId: string,
  sheetId: number,
  sheetTitle: string,
): WeeklySheetTrackingRecord | null {
  const recordCode = String(row[0] ?? '').trim();
  if (!recordCode) return null;

  const col1 = String(row[1] ?? '').trim();
  const col2 = String(row[2] ?? '').trim();
  const col3 = String(row[3] ?? '').trim();
  const col4 = String(row[4] ?? '').trim();
  const col5 = String(row[5] ?? '').trim();

  // Detect 18-col (Mã hồ sơ | Thời gian | Tháng | Tuần | Ngày chốt | Cơ sở)
  // vs mid 17-col (Mã hồ sơ | Thời gian | Tháng | Ngày chốt | Cơ sở)
  // vs legacy 16-col (Mã hồ sơ | Tuần | Cơ sở)
  const isNew18Format = row.length >= 18 || /^Tuần\s*\d+$/i.test(col3);
  const isMid17Format = !isNew18Format && (row.length === 17 || /^\d{2}\/\d{4}$/.test(col2));

  let weekCode = '';
  let weekLabel = '';
  let weekOnlyLabel = '';
  let monthLabel = '';
  let startIso = '';
  let endIso = '';
  let coSoRaw = '';
  let noCheckoutDays = 0;
  let missingImages = 0;
  let violationDetails = '';
  let cutoffDate = '';
  let reminderCount = 0;
  let teamLeader = '';
  let handled = false;
  let handlingMethod = '';
  let notes = '';
  let updatedAt = '';
  let updatedBy = '';
  let qlclConfirmed = false;
  let rawStatus = '';
  let syncNote = '';

  const parseNumericCell = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };

  if (isNew18Format) {
    coSoRaw = col5;
    if (!coSoRaw) return null;
    monthLabel = col2;
    weekOnlyLabel = col3 || extractWeekOnlyOAuth(recordCode);
    const cleanRange = normalizeDateRangeCompare(col1);
    const rangeIsos = parseDateRangeToIsos(cleanRange);
    startIso = rangeIsos.startIso;
    endIso = rangeIsos.endIso;
    weekLabel = weekOnlyLabel ? `${cleanRange || col1} (${weekOnlyLabel})` : cleanRange || col1;
    weekCode =
      startIso && endIso
        ? buildWeekCode(startIso, endIso)
        : monthLabel && weekOnlyLabel
        ? `${weekOnlyLabel}_${monthLabel}`
        : col1;
    cutoffDate = col4;
    noCheckoutDays = Number(row[6] ?? 0) || 0;
    missingImages = Number(row[7] ?? 0) || 0;
    violationDetails = String(row[8] ?? '').trim();
    reminderCount = parseNumericCell(row[9]);
    teamLeader = Number.isFinite(Number(row[9])) ? '' : String(row[9] ?? '').trim();
    handled = parseBooleanCell(row[10]);
    handlingMethod = String(row[11] ?? '').trim();
    notes = String(row[12] ?? '').trim();
    updatedAt = String(row[13] ?? '').trim();
    updatedBy = String(row[14] ?? '').trim();
    qlclConfirmed = parseBooleanCell(row[15]);
    rawStatus = String(row[16] ?? '').trim();
    syncNote = String(row[17] ?? '').trim();
  } else if (isMid17Format) {
    coSoRaw = col4;
    if (!coSoRaw) return null;
    monthLabel = col2;
    const rangeIsos = parseDateRangeToIsos(col1);
    startIso = rangeIsos.startIso;
    endIso = rangeIsos.endIso;
    const mWeekNum = /^Tuần\s*(\d+)_/i.exec(recordCode);
    weekOnlyLabel = mWeekNum ? `Tuần ${mWeekNum[1]}` : '';
    weekLabel = weekOnlyLabel ? `${col1} (${weekOnlyLabel})` : col1;
    weekCode =
      startIso && endIso
        ? buildWeekCode(startIso, endIso)
        : monthLabel && mWeekNum
        ? `Tuần ${mWeekNum[1]}_${monthLabel}`
        : col1;
    cutoffDate = col3;
    noCheckoutDays = Number(row[5] ?? 0) || 0;
    missingImages = Number(row[6] ?? 0) || 0;
    violationDetails = String(row[7] ?? '').trim();
    reminderCount = parseNumericCell(row[8]);
    teamLeader = Number.isFinite(Number(row[8])) ? '' : String(row[8] ?? '').trim();
    handled = parseBooleanCell(row[9]);
    handlingMethod = String(row[10] ?? '').trim();
    notes = String(row[11] ?? '').trim();
    updatedAt = String(row[12] ?? '').trim();
    updatedBy = String(row[13] ?? '').trim();
    qlclConfirmed = parseBooleanCell(row[14]);
    rawStatus = String(row[15] ?? '').trim();
    syncNote = String(row[16] ?? '').trim();
  } else {
    coSoRaw = col2;
    if (!coSoRaw) return null;
    const parsedRange = recordCode.includes('__')
      ? parseWeekRangeFromCode(recordCode.split('__')[0])
      : parseDateRangeToIsos(col1);
    startIso = parsedRange.startIso;
    endIso = parsedRange.endIso;
    const mNewPrefix = /^Tuần\s*(\d+)_(\d{2}\/\d{4})_/i.exec(recordCode);
    monthLabel = mNewPrefix ? mNewPrefix[2] : startIso ? buildMonthLabelFromIso(startIso) : '';
    weekOnlyLabel = mNewPrefix ? `Tuần ${mNewPrefix[1]}` : extractWeekOnlyOAuth(col1);
    weekLabel = col1;
    weekCode = startIso && endIso ? buildWeekCode(startIso, endIso) : recordCode.split('__')[0] || col1;
    noCheckoutDays = Number(row[3] ?? 0) || 0;
    missingImages = Number(row[4] ?? 0) || 0;
    violationDetails = String(row[5] ?? '').trim();
    cutoffDate = String(row[6] ?? '').trim();
    reminderCount = parseNumericCell(row[7]);
    teamLeader = Number.isFinite(Number(row[7])) ? '' : String(row[7] ?? '').trim();
    handled = parseBooleanCell(row[8]);
    handlingMethod = String(row[9] ?? '').trim();
    notes = String(row[10] ?? '').trim();
    updatedAt = String(row[11] ?? '').trim();
    updatedBy = String(row[12] ?? '').trim();
    qlclConfirmed = parseBooleanCell(row[13]);
    rawStatus = String(row[14] ?? '').trim();
    syncNote = String(row[15] ?? '').trim();
  }

  const coSo = normalizeFacilityName(coSoRaw) || coSoRaw;

  let status: WeeklyTrackingStatus = 'Chưa xử lý';
  if (rawStatus === 'Không còn cảnh báo sau cập nhật') {
    status = 'Không còn cảnh báo sau cập nhật';
  } else if (qlclConfirmed || rawStatus === 'Đã đóng') {
    status = 'Đã đóng';
  } else if (handled || rawStatus === 'Chờ QLCL xác nhận') {
    status = 'Chờ QLCL xác nhận';
  }

  return {
    recordCode,
    weekCode,
    weekLabel,
    weekOnlyLabel,
    monthLabel,
    startIso,
    endIso,
    coSo,
    noCheckoutDays,
    missingImages,
    violationDetails,
    cutoffDate,
    reminderCount,
    teamLeader,
    handled,
    handlingMethod,
    notes,
    updatedAt,
    updatedBy,
    qlclConfirmed,
    status,
    syncNote,
    spreadsheetId,
    sheetId,
    sheetTitle,
    rowNumber,
    tabUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`,
  };
}

// ============================================================================
// Public Workflows
// ============================================================================

/**
 * Kiểm tra trước khi ghi xem tuần tương ứng (startIso, endIso) đã có báo cáo trong file cố định chưa.
 * Ưu tiên kiểm tra không cần đăng nhập qua backend; chỉ fallback OAuth nếu user đã đăng nhập.
 */
export async function checkExistingWeekReport(
  selectedWeek: SelectedWeekMeta,
): Promise<{
  needAuth?: boolean;
  result?: ExistingWeekCheckResult;
  error?: string;
}> {
  const cfg = await loadWeeklySheetConfig();
  const targetSpreadsheetId = cfg.spreadsheetId || DEFAULT_WEEKLY_SPREADSHEET_ID;

  // 1. No-login check via Express backend
  try {
    const resp = await fetch(
      `/api/weekly-warning-sheet/check?startIso=${encodeURIComponent(selectedWeek.startIso)}&endIso=${encodeURIComponent(selectedWeek.endIso)}&weekNumber=${encodeURIComponent(String(selectedWeek.weekNumber))}&spreadsheetId=${encodeURIComponent(targetSpreadsheetId)}`,
      { cache: 'no-store' },
    );
    const json = await resp.json().catch(() => null);
    if (resp.ok && json?.success && json.result) {
      return { result: json.result as ExistingWeekCheckResult };
    }
  } catch {}

  // 2. Fallback OAuth if user already signed in
  const token = await getAccessToken();
  if (!token) {
    return {
      error: 'Không thể kết nối kiểm tra Google Sheet công khai. Vui lòng kiểm tra đường truyền hoặc quyền xem của Google Sheet.',
    };
  }

  try {
    const weekCode = buildWeekCode(selectedWeek.startIso, selectedWeek.endIso);
    const legacyPrefix = `${weekCode}__`;
    const newPrefix = buildWeekPrefixNew(selectedWeek.weekNumber, selectedWeek.startIso);
    const expectedDateRange = buildWeekDateRange(selectedWeek.startIso, selectedWeek.endIso);
    const expectedMonth = buildMonthLabelFromIso(selectedWeek.startIso);

    const meta = await findExistingMasterSpreadsheet(token);
    if (!meta) {
      return {
        result: {
          spreadsheetFound: false,
          spreadsheetId: targetSpreadsheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`,
          weekExists: false,
          weekCode,
          sheetTitle: TEAM_LEADER_SHEET_NAME,
          existingRowCount: 0,
          tabUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`,
        },
      };
    }

    const tab = findMatchingWeekTab(meta.sheets, selectedWeek.startIso, selectedWeek.endIso);
    if (!tab) {
      return {
        result: {
          spreadsheetFound: true,
          spreadsheetId: meta.spreadsheetId,
          spreadsheetUrl: meta.spreadsheetUrl,
          weekExists: false,
          weekCode,
          sheetTitle: TEAM_LEADER_SHEET_NAME,
          existingRowCount: 0,
          tabUrl: meta.spreadsheetUrl,
        },
      };
    }

    const rows = await readSheetValues(meta.spreadsheetId, tab.title, 'A:C', token);
    const dataRows = rows.slice(1).filter(r => {
      const code = String(r[0] || '').trim();
      const rangeVal = normalizeDateRangeCompare(String(r[1] || ''));
      const monthVal = String(r[2] || '').trim();
      return (
        code.startsWith(newPrefix) ||
        code.startsWith(legacyPrefix) ||
        (rangeVal === expectedDateRange && monthVal === expectedMonth)
      );
    });
    const tabUrl = `https://docs.google.com/spreadsheets/d/${meta.spreadsheetId}/edit#gid=${tab.sheetId}`;

    return {
      result: {
        spreadsheetFound: true,
        spreadsheetId: meta.spreadsheetId,
        spreadsheetUrl: meta.spreadsheetUrl,
        weekExists: dataRows.length > 0,
        weekCode,
        sheetId: tab.sheetId,
        sheetTitle: tab.title,
        existingRowCount: dataRows.length,
        tabUrl,
      },
    };
  } catch (err: any) {
    if (err instanceof GoogleWorkspaceAuthError) {
      return { needAuth: true, error: err.message };
    }
    return { error: err?.message || 'Không thể kiểm tra Google Sheet hiện có.' };
  }
}

/**
 * Tạo mới hoặc cập nhật lại tuần đang chọn vào Google Sheet cố định (mặc định: link user cung cấp),
 * không cần đăng nhập qua backend + Apps Script, sau đó đọc kiểm tra lại để xác nhận đã ghi thật.
 */
export async function syncWeekReportToGoogleSheet(params: {
  selectedWeek: SelectedWeekMeta;
  sourceRows: WeeklySourceRowRecord[];
  mode: 'create' | 'update';
  preferOAuth?: boolean;
}): Promise<WeeklySheetSyncResult> {
  const { selectedWeek, sourceRows, mode, preferOAuth } = params;
  const weekCode = buildWeekCode(selectedWeek.startIso, selectedWeek.endIso);
  const weekPrefixNew = buildWeekPrefixNew(selectedWeek.weekNumber, selectedWeek.startIso);
  const expectedTabTitle = buildWeekTabTitle(selectedWeek.startIso, selectedWeek.endIso);
  const cfg = await loadWeeklySheetConfig();
  const targetSpreadsheetId = cfg.spreadsheetId || DEFAULT_WEEKLY_SPREADSHEET_ID;

  // 1. Primary path (NO LOGIN): Backend -> Apps Script Web App + CSV Readback Verification
  if (!preferOAuth) {
    try {
      const resp = await fetch('/api/weekly-warning-sheet/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: targetSpreadsheetId,
          scriptUrl: cfg.appsScriptUrl || undefined,
          selectedWeek,
          weekPrefix: weekPrefixNew,
          sourceRows,
          mode,
        }),
      });
      const json = await resp.json().catch(() => null);
      if (json?.success) {
        await saveWeeklySheetConfig({
          spreadsheetId: json.spreadsheetId,
          spreadsheetUrl: json.spreadsheetUrl,
          weekSyncHistory: {
            [weekCode]: {
              syncedAt: json.syncedAt,
              sheetId: json.sheetId,
              sheetTitle: json.sheetTitle,
            },
          },
        });
        return json as WeeklySheetSyncResult;
      }

      if (json?.needsScriptUpdate) {
        return {
          success: false,
          needsScriptUpdate: true,
          mode,
          spreadsheetId: targetSpreadsheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`,
          tabUrl: '',
          sheetId: 0,
          sheetTitle: expectedTabTitle,
          weekCode,
          syncedAt: '',
          updatedCount: 0,
          addedCount: 0,
          resolvedCount: 0,
          totalRowsVerified: 0,
          message:
            json.message ||
            'Apps Script trên Google Sheet chưa được cập nhật hàm tạo tab Báo cáo Tuần.',
        };
      }

      // If Apps Script failed for other reason, fall through only if OAuth token exists
      const existingToken = await getAccessToken();
      if (!existingToken) {
        return {
          success: false,
          mode,
          spreadsheetId: targetSpreadsheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`,
          tabUrl: '',
          sheetId: 0,
          sheetTitle: expectedTabTitle,
          weekCode,
          syncedAt: '',
          updatedCount: 0,
          addedCount: 0,
          resolvedCount: 0,
          totalRowsVerified: 0,
          message: json?.message || json?.error || 'Không thể ghi dữ liệu lên Google Sheet.',
        };
      }
    } catch (err: any) {
      const existingToken = await getAccessToken();
      if (!existingToken) {
        return {
          success: false,
          mode,
          spreadsheetId: targetSpreadsheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`,
          tabUrl: '',
          sheetId: 0,
          sheetTitle: expectedTabTitle,
          weekCode,
          syncedAt: '',
          updatedCount: 0,
          addedCount: 0,
          resolvedCount: 0,
          totalRowsVerified: 0,
          message: err?.message || 'Lỗi kết nối đồng bộ Google Sheet.',
        };
      }
    }
  }

  // 2. Optional Google OAuth v4 fallback (when explicitly requested)
  const token = await getAccessToken();
  if (!token) {
    return {
      success: false,
      needAuth: true,
      mode,
      spreadsheetId: targetSpreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`,
      tabUrl: '',
      sheetId: 0,
      sheetTitle: expectedTabTitle,
      weekCode,
      syncedAt: '',
      updatedCount: 0,
      addedCount: 0,
      resolvedCount: 0,
      totalRowsVerified: 0,
      message: 'Cần đăng nhập Google Workspace để ghi trực tiếp bằng tài khoản Google.',
    };
  }

  try {
    const meta = await ensureMasterSpreadsheet(token);
    let targetTab = findTeamLeaderTab(meta.sheets);
    let isBrandNewTab = false;

    if (!targetTab) {
      isBrandNewTab = true;
      const addResp = await googleApiFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${meta.spreadsheetId}:batchUpdate`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: TEAM_LEADER_SHEET_NAME,
                    gridProperties: { frozenRowCount: 1 },
                  },
                },
              },
            ],
          }),
        },
      );
      const createdProps = addResp?.replies?.[0]?.addSheet?.properties;
      if (!createdProps?.sheetId && createdProps?.sheetId !== 0) {
        throw new Error(`Không thể tạo sheet "${TEAM_LEADER_SHEET_NAME}" trong Google Sheet.`);
      }
      targetTab = {
        sheetId: createdProps.sheetId,
        title: createdProps.title || TEAM_LEADER_SHEET_NAME,
      };
    }

    if (isBrandNewTab) {
      await applySheetHeaderAndFormatting(
        meta.spreadsheetId,
        targetTab.sheetId,
        targetTab.title,
        token,
        true,
        sourceRows.length,
      );
    } else {
      await migrateWeeklyOAuthSheetIfNeeded(
        meta.spreadsheetId,
        targetTab.sheetId,
        targetTab.title,
        token,
      );
    }

    const weekTab = targetTab;
    const legacyPrefix = `${weekCode}__`;
    const expectedDateRange = buildWeekDateRange(selectedWeek.startIso, selectedWeek.endIso);
    const expectedMonth = buildMonthLabelFromIso(selectedWeek.startIso);
    const nowTs = getNowVietnamTimestamp();
    const existingRawRows = await readSheetValues(meta.spreadsheetId, weekTab.title, 'A:R', token);

    const otherWeekRows: unknown[][] = [];
    const thisWeekRows: unknown[][] = [];
    const existingByCode = new Map<string, { idx: number; values: unknown[] }>();
    const existingByFacility = new Map<string, { idx: number; values: unknown[] }>();

    for (let i = 1; i < existingRawRows.length; i++) {
      const raw = existingRawRows[i];
      if (!isRealWeeklyOAuthRow(raw)) continue;

      const padded: unknown[] = Array.from({ length: 18 }, (_, c) => raw[c] ?? '');
      padded[10] = parseBooleanCell(padded[10]);
      padded[15] = parseBooleanCell(padded[15]);

      const code = String(padded[0] ?? '').trim();
      const rowRange = normalizeDateRangeCompare(String(padded[1] ?? ''));
      const rowMonth = String(padded[2] ?? '').trim();
      const rowFacilityNorm = normalizeFacilityName(String(padded[5] ?? '').trim());
      const belongsToWeek =
        code.startsWith(weekPrefixNew) ||
        code.startsWith(legacyPrefix) ||
        (rowRange === expectedDateRange && rowMonth === expectedMonth);

      if (belongsToWeek) {
        const entryIdx = thisWeekRows.length;
        thisWeekRows.push(padded);
        const entry = { idx: entryIdx, values: padded };
        if (!existingByCode.has(code)) {
          existingByCode.set(code, entry);
        }
        if (rowFacilityNorm && !existingByFacility.has(rowFacilityNorm)) {
          existingByFacility.set(rowFacilityNorm, entry);
        }
      } else {
        otherWeekRows.push(padded);
      }
    }

    const matchedIdxSet = new Set<number>();
    const mergedThisWeekRows: unknown[][] = [];

    let updatedCount = 0;
    let addedCount = 0;
    let resolvedCount = 0;

    // 1. Update matched rows or add new violating rows
    sourceRows.forEach(src => {
      const existing =
        existingByCode.get(src.recordCode) ||
        existingByCode.get(src.legacyRecordCode) ||
        existingByFacility.get(normalizeFacilityName(src.coSo) || src.coSo);

      if (existing) {
        matchedIdxSet.add(existing.idx);
        const oldVals = existing.values;
        const oldTeamLeader = String(oldVals[9] ?? '').trim();
        const oldHandled = parseBooleanCell(oldVals[10]);
        const oldMethod = oldVals[11] ?? '';
        const oldNotes = oldVals[12] ?? '';
        const oldUpdatedAt = oldVals[13] ?? '';
        const oldUpdatedBy = oldVals[14] ?? '';
        const oldQlclConfirmed = parseBooleanCell(oldVals[15]);
        const oldStatus = String(oldVals[16] ?? '').trim();

        const resolvedStatus = oldQlclConfirmed
          ? 'Đã đóng'
          : oldHandled
          ? 'Chờ QLCL xác nhận'
          : oldStatus === 'Không còn cảnh báo sau cập nhật'
          ? 'Chưa xử lý'
          : oldStatus || 'Chưa xử lý';

        mergedThisWeekRows.push([
          src.recordCode,
          src.weekDateRange,
          src.monthLabel,
          src.weekOnlyLabel,
          src.cutoffDate,
          src.coSo,
          src.noCheckoutDays,
          src.missingImages,
          src.violationDetails,
          0, // J: Số lượt đã nhắc nhở (công thức COUNTIFS được áp dụng ngay sau khi ghi & sắp xếp)
          oldHandled,
          oldMethod,
          oldNotes,
          oldUpdatedAt,
          oldUpdatedBy,
          oldQlclConfirmed,
          resolvedStatus,
          `Cập nhật lại từ Phần 2 lúc ${nowTs}`,
        ]);
        updatedCount += 1;
      } else {
        mergedThisWeekRows.push([
          src.recordCode, // A: Mã hồ sơ (Tuần_Tháng_Cơ sở)
          src.weekDateRange, // B: Thời gian (Từ ngày - Đến ngày)
          src.monthLabel, // C: Tháng
          src.weekOnlyLabel, // D: Tuần
          src.cutoffDate, // E: Ngày chốt dữ liệu
          src.coSo, // F: Cơ sở
          src.noCheckoutDays, // G: Số ngày không check out
          src.missingImages, // H: Số ảnh thiếu
          src.violationDetails, // I: Chi tiết các ngày vi phạm
          0, // J: Số lượt đã nhắc nhở (COUNTIFS)
          false, // K: Trưởng nhóm đã duyệt (checkbox)
          '', // L: Phương án xử lý
          '', // M: Ghi chú
          '', // N: Thời gian cập nhật
          '', // O: Người cập nhật
          false, // P: QLCL xác nhận (checkbox)
          'Chưa xử lý', // Q: Trạng thái xử lý
          `Tạo từ Phần 2 lúc ${nowTs}`, // R: Lịch sử đồng bộ
        ]);
        addedCount += 1;
      }
    });

    // 2. Rows that previously existed for this week, but NO LONGER have violations
    const seenResolved = new Set<string>();
    thisWeekRows.forEach((oldVals, idx) => {
      if (matchedIdxSet.has(idx)) return;
      const key = `${String(oldVals[0] ?? '').trim()}|${normalizeFacilityName(String(oldVals[5] ?? ''))}`;
      if (seenResolved.has(key)) return;
      seenResolved.add(key);

      const copy = [...oldVals];
      const oldCutoff = String(copy[4] ?? '').trim();
      copy[4] = sourceRows[0]?.cutoffDate || oldCutoff || nowTs;
      copy[6] = 0;
      copy[7] = 0;
      copy[8] = 'Không còn vi phạm sau cập nhật';
      copy[16] = 'Không còn cảnh báo sau cập nhật';
      copy[17] = `Không còn cảnh báo sau cập nhật lúc ${nowTs} (giữ nguyên lịch sử xử lý)`;
      mergedThisWeekRows.push(copy);
      resolvedCount += 1;
    });

    const finalAllRows = sortWeeklyOAuthRowsAscending([...otherWeekRows, ...mergedThisWeekRows]);

    // Clear A2:R completely and rewrite contiguously from A2 in ascending chronological order
    await googleApiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${meta.spreadsheetId}/values/${encodeA1Range(weekTab.title, 'A2:R')}:clear`,
      token,
      { method: 'POST' },
    );

    if (finalAllRows.length > 0) {
      await googleApiFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${meta.spreadsheetId}/values/${encodeA1Range(weekTab.title, `A2:R${finalAllRows.length + 1}`)}?valueInputOption=USER_ENTERED`,
        token,
        {
          method: 'PUT',
          body: JSON.stringify({
            range: `${escapeA1SheetTitle(weekTab.title)}!A2:R${finalAllRows.length + 1}`,
            majorDimension: 'ROWS',
            values: finalAllRows,
          }),
        },
      );
    }

    // Enforce 18-column header, widths & square checkbox DataValidation ONLY on populated rows
    await applySheetHeaderAndFormatting(
      meta.spreadsheetId,
      weekTab.sheetId,
      weekTab.title,
      token,
      true,
      finalAllRows.length,
    );

    // 3. MANDATORY READBACK VERIFICATION: read back from Google Sheets and verify every source Mã hồ sơ of this week exists!
    const verifiedRows = await readSheetValues(meta.spreadsheetId, weekTab.title, 'A:R', token);
    const verifiedCodes = new Set(
      verifiedRows
        .slice(1)
        .filter(r => {
          const code = String(r?.[0] ?? '').trim();
          const rangeVal = normalizeDateRangeCompare(String(r?.[1] ?? ''));
          const monthVal = String(r?.[2] ?? '').trim();
          return (
            Boolean(code) &&
            (code.startsWith(weekPrefixNew) ||
              code.startsWith(legacyPrefix) ||
              (rangeVal === expectedDateRange && monthVal === expectedMonth))
          );
        })
        .map(r => String(r?.[0] ?? '').trim()),
    );
    const missingAfterWrite = sourceRows.filter(s => !verifiedCodes.has(s.recordCode));
    if (missingAfterWrite.length > 0) {
      throw new Error(
        `Đọc kiểm tra lại sheet "${TEAM_LEADER_SHEET_NAME}" thấy thiếu ${missingAfterWrite.length} hồ sơ vừa ghi. Vui lòng thử lại.`,
      );
    }

    // 4. Sync master overview tab ("TỔNG HỢP HỒ SƠ") in the same file (best-effort)
    try {
      await syncMasterOverviewTab(meta.spreadsheetId, token);
    } catch (overviewErr) {
      console.warn('Overview tab sync warning:', overviewErr);
    }

    const tabUrl = `https://docs.google.com/spreadsheets/d/${meta.spreadsheetId}/edit#gid=${weekTab.sheetId}`;
    await saveWeeklySheetConfig({
      spreadsheetId: meta.spreadsheetId,
      spreadsheetUrl: meta.spreadsheetUrl,
      spreadsheetTitle: meta.title,
      weekSyncHistory: {
        [weekCode]: {
          syncedAt: nowTs,
          sheetId: weekTab.sheetId,
          sheetTitle: weekTab.title,
        },
      },
    });

    const summaryMsg =
      mode === 'create'
        ? `Đã tạo thành công ${addedCount} hồ sơ cho tuần ${selectedWeek.fullRange} trên Google Sheet (đã kiểm tra đọc lại ${verifiedCodes.size} dòng).`
        : `Đã cập nhật tuần ${selectedWeek.fullRange} lúc ${nowTs}: ${updatedCount} dòng cập nhật, ${addedCount} thêm mới, ${resolvedCount} không còn cảnh báo.`;

    return {
      success: true,
      mode,
      spreadsheetId: meta.spreadsheetId,
      spreadsheetUrl: meta.spreadsheetUrl,
      tabUrl,
      sheetId: weekTab.sheetId,
      sheetTitle: weekTab.title,
      weekCode,
      syncedAt: nowTs,
      updatedCount,
      addedCount,
      resolvedCount,
      totalRowsVerified: verifiedCodes.size,
      message: summaryMsg,
    };
  } catch (err: any) {
    const needAuth = err instanceof GoogleWorkspaceAuthError;
    return {
      success: false,
      needAuth,
      mode,
      spreadsheetId: '',
      spreadsheetUrl: '',
      tabUrl: '',
      sheetId: 0,
      sheetTitle: expectedTabTitle,
      weekCode,
      syncedAt: '',
      updatedCount: 0,
      addedCount: 0,
      resolvedCount: 0,
      totalRowsVerified: 0,
      message: err?.message || 'Lỗi đồng bộ Google Sheet. Dữ liệu chưa được xác nhận.',
    };
  }
}

/**
 * Đọc toàn bộ các tab tuần trong Google Sheet (mặc định không cần đăng nhập qua backend CSV).
 * Chỉ fallback sang Google Sheets OAuth API nếu đã đăng nhập.
 */
export async function readAllWeeklyWarningRecords(): Promise<{
  success: boolean;
  needAuth?: boolean;
  spreadsheetFound: boolean;
  spreadsheetId: string;
  spreadsheetUrl: string;
  records: WeeklySheetTrackingRecord[];
  message?: string;
}> {
  const cfg = await loadWeeklySheetConfig();
  const targetSpreadsheetId = cfg.spreadsheetId || DEFAULT_WEEKLY_SPREADSHEET_ID;

  // 1. Primary path (NO LOGIN): Backend reads all weekly tabs via public CSV
  try {
    const resp = await fetch(
      `/api/weekly-warning-sheet/records?spreadsheetId=${encodeURIComponent(targetSpreadsheetId)}`,
      { cache: 'no-store' },
    );
    const json = await resp.json().catch(() => null);
    if (resp.ok && json?.success && Array.isArray(json.rawRecords)) {
      const records: WeeklySheetTrackingRecord[] = [];
      json.rawRecords.forEach((item: any) => {
        const parsed = parseRowToTrackingRecord(
          item.row || [],
          Number(item.rowNumber || 2),
          item.spreadsheetId || targetSpreadsheetId,
          Number(item.sheetId || 0),
          String(item.sheetTitle || ''),
        );
        if (parsed) records.push(parsed);
      });

      // Ensure reminderCount strictly reflects the total ticked approvals for each Cơ sở
      const facilityTickCounts = new Map<string, number>();
      records.forEach(r => {
        if (r.handled) {
          facilityTickCounts.set(r.coSo, (facilityTickCounts.get(r.coSo) || 0) + 1);
        }
      });
      records.forEach(r => {
        r.reminderCount = facilityTickCounts.get(r.coSo) || 0;
      });

      records.sort((a, b) => {
        const weekCmp = (b.startIso || b.weekCode).localeCompare(a.startIso || a.weekCode);
        if (weekCmp !== 0) return weekCmp;
        const statusRank: Record<WeeklyTrackingStatus, number> = {
          'Chưa xử lý': 0,
          'Chờ QLCL xác nhận': 1,
          'Không còn cảnh báo sau cập nhật': 2,
          'Đã đóng': 3,
        };
        const sCmp = statusRank[a.status] - statusRank[b.status];
        if (sCmp !== 0) return sCmp;
        return a.coSo.localeCompare(b.coSo, 'vi');
      });

      return {
        success: true,
        spreadsheetFound: Boolean(json.spreadsheetFound),
        spreadsheetId: json.spreadsheetId || targetSpreadsheetId,
        spreadsheetUrl:
          json.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`,
        records,
      };
    }
  } catch {}

  const token = await getAccessToken();
  if (!token) {
    return {
      success: false,
      spreadsheetFound: false,
      spreadsheetId: targetSpreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`,
      records: [],
      message: 'Không thể đọc dữ liệu các tab tuần từ Google Sheet. Hãy kiểm tra quyền xem của Sheet.',
    };
  }

  try {
    const meta = await findExistingMasterSpreadsheet(token);
    if (!meta) {
      return {
        success: true,
        spreadsheetFound: false,
        spreadsheetId: targetSpreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`,
        records: [],
      };
    }

    const weekTabs = meta.sheets.filter(
      s => {
        const lower = s.title.trim().toLowerCase();
        return (
          lower !== MASTER_OVERVIEW_TAB_TITLE.toLowerCase() &&
          lower !== 'sheet1' &&
          lower !== 'kiểm duyệt vệ sinh' &&
          lower !== 'nhắc nhở'
        );
      },
    );
    if (weekTabs.length === 0) {
      return {
        success: true,
        spreadsheetFound: true,
        spreadsheetId: meta.spreadsheetId,
        spreadsheetUrl: meta.spreadsheetUrl,
        records: [],
      };
    }

    const rangesQuery = weekTabs
      .map(t => `ranges=${encodeA1Range(t.title, 'A:R')}`)
      .join('&');
    const batchResp = await googleApiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${meta.spreadsheetId}/values:batchGet?${rangesQuery}&valueRenderOption=UNFORMATTED_VALUE`,
      token,
    );

    const valueRanges: Array<{ range?: string; values?: unknown[][] }> = batchResp?.valueRanges || [];
    const records: WeeklySheetTrackingRecord[] = [];

    weekTabs.forEach((tab, idx) => {
      const rows = valueRanges[idx]?.values || [];
      for (let rIdx = 1; rIdx < rows.length; rIdx++) {
        const parsed = parseRowToTrackingRecord(
          rows[rIdx],
          rIdx + 1,
          meta.spreadsheetId,
          tab.sheetId,
          tab.title,
        );
        if (parsed) records.push(parsed);
      }
    });

    // Ensure reminderCount strictly reflects the total ticked approvals for each Cơ sở
    const facilityTickCounts = new Map<string, number>();
    records.forEach(r => {
      if (r.handled) {
        facilityTickCounts.set(r.coSo, (facilityTickCounts.get(r.coSo) || 0) + 1);
      }
    });
    records.forEach(r => {
      r.reminderCount = facilityTickCounts.get(r.coSo) || 0;
    });

    // Sort newest week first, then unresolved first, then by facility
    records.sort((a, b) => {
      const weekCmp = (b.startIso || b.weekCode).localeCompare(a.startIso || a.weekCode);
      if (weekCmp !== 0) return weekCmp;
      const statusRank: Record<WeeklyTrackingStatus, number> = {
        'Chưa xử lý': 0,
        'Chờ QLCL xác nhận': 1,
        'Không còn cảnh báo sau cập nhật': 2,
        'Đã đóng': 3,
      };
      const sCmp = statusRank[a.status] - statusRank[b.status];
      if (sCmp !== 0) return sCmp;
      return a.coSo.localeCompare(b.coSo, 'vi');
    });

    return {
      success: true,
      spreadsheetFound: true,
      spreadsheetId: meta.spreadsheetId,
      spreadsheetUrl: meta.spreadsheetUrl,
      records,
    };
  } catch (err: any) {
    if (err instanceof GoogleWorkspaceAuthError) {
      return {
        success: false,
        needAuth: true,
        spreadsheetFound: false,
        spreadsheetId: targetSpreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`,
        records: [],
        message: err.message,
      };
    }
    return {
      success: false,
      spreadsheetFound: false,
      spreadsheetId: targetSpreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`,
      records: [],
      message: err?.message || 'Không thể đọc dữ liệu từ Google Sheet.',
    };
  }
}

async function syncMasterOverviewTab(spreadsheetId: string, token: string) {
  const meta = await fetchSpreadsheetMeta(spreadsheetId, token);
  if (!meta) return;
  const overviewTab = meta.sheets.find(s => s.title === MASTER_OVERVIEW_TAB_TITLE);
  if (!overviewTab) return;

  const weekTabs = meta.sheets.filter(
    s => s.title !== MASTER_OVERVIEW_TAB_TITLE && s.title !== 'Sheet1',
  );
  if (weekTabs.length === 0) return;

  const rangesQuery = weekTabs.map(t => `ranges=${encodeA1Range(t.title, 'A:R')}`).join('&');
  const batchResp = await googleApiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}&valueRenderOption=UNFORMATTED_VALUE`,
    token,
  );
  const valueRanges: Array<{ values?: unknown[][] }> = batchResp?.valueRanges || [];
  const allRows: unknown[][] = [[...WEEKLY_SHEET_HEADERS]];

  weekTabs.forEach((_tab, idx) => {
    const rows = valueRanges[idx]?.values || [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (String(r?.[0] || '').trim()) {
        const padded = Array.from({ length: 18 }, (_, c) => r[c] ?? '');
        allRows.push(padded);
      }
    }
  });

  await googleApiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeA1Range(MASTER_OVERVIEW_TAB_TITLE, 'A:R')}:clear`,
    token,
    { method: 'POST' },
  );

  await googleApiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeA1Range(MASTER_OVERVIEW_TAB_TITLE, `A1:R${allRows.length}`)}?valueInputOption=USER_ENTERED`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        range: `${escapeA1SheetTitle(MASTER_OVERVIEW_TAB_TITLE)}!A1:R${allRows.length}`,
        majorDimension: 'ROWS',
        values: allRows,
      }),
    },
  );
}

/**
 * Thao tác của Trưởng nhóm (tick Đã xử lý, chọn cách xử lý, ghi chú) hoặc xác nhận của QLCL.
 * Không ghi đè cột số liệu nguồn A:G. Ưu tiên không cần đăng nhập qua backend Apps Script, có đọc kiểm tra lại.
 */
export async function updateTrackingRecordInGoogleSheet(
  record: WeeklySheetTrackingRecord,
  patch: {
    teamLeader?: string;
    handled?: boolean;
    handlingMethod?: string;
    notes?: string;
    qlclConfirmed?: boolean;
  },
  actorNameOverride?: string,
): Promise<{
  success: boolean;
  needAuth?: boolean;
  needsScriptUpdate?: boolean;
  updatedRecord?: WeeklySheetTrackingRecord;
  message: string;
}> {
  const cfg = await loadWeeklySheetConfig();
  const profile = getCurrentUserProfile();
  const actorLabel =
    (actorNameOverride && actorNameOverride.trim()) ||
    profile.label ||
    record.teamLeader ||
    'Trưởng nhóm / QLCL';

  // 1. Primary path (NO LOGIN): Backend -> Apps Script Web App + row readback
  try {
    const resp = await fetch('/api/weekly-warning-sheet/update-row', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheetId: record.spreadsheetId || cfg.spreadsheetId || DEFAULT_WEEKLY_SPREADSHEET_ID,
        scriptUrl: cfg.appsScriptUrl || undefined,
        recordCode: record.recordCode,
        sheetTitle: record.sheetTitle,
        weekCode: record.weekCode,
        patch,
        actor: actorLabel,
      }),
    });
    const json = await resp.json().catch(() => null);
    if (json?.success && Array.isArray(json.rowValues)) {
      const verified = parseRowToTrackingRecord(
        json.rowValues,
        Number(json.rowNumber || record.rowNumber),
        record.spreadsheetId,
        record.sheetId,
        record.sheetTitle,
      );
      if (verified) {
        return {
          success: true,
          updatedRecord: verified,
          message: `Đã lưu thao tác cho ${verified.coSo} lên Google Sheet (${verified.status}).`,
        };
      }
    }

    if (json?.needsScriptUpdate) {
      const existingToken = await getAccessToken();
      if (!existingToken) {
        return {
          success: false,
          needsScriptUpdate: true,
          message:
            json.message ||
            'Apps Script trên Google Sheet chưa hỗ trợ lưu không cần đăng nhập.',
        };
      }
    }
  } catch {}

  const token = await getAccessToken();
  if (!token) {
    return {
      success: false,
      needsScriptUpdate: true,
      message: 'Không thể lưu thao tác lên Google Sheet. Vui lòng kiểm tra cấu hình Apps Script của Google Sheet.',
    };
  }

  try {
    // Ensure sheet is migrated to 18-column layout & checkbox cells before updating exact row
    await migrateWeeklyOAuthSheetIfNeeded(
      record.spreadsheetId,
      record.sheetId,
      record.sheetTitle,
      token,
    );

    const allSheetRows = await readSheetValues(record.spreadsheetId, record.sheetTitle, 'A:R', token);
    let targetRowNum = record.rowNumber;
    const expectedNewCode =
      record.startIso && record.endIso
        ? (() => {
            const mWeek = /Tuần\s*(\d+)/i.exec(record.weekOnlyLabel || record.weekLabel || '');
            return mWeek
              ? buildRecordCode(record.startIso, record.endIso, record.coSo, Number(mWeek[1]))
              : record.recordCode;
          })()
        : record.recordCode;

    // Locate exact row by Mã hồ sơ (new or old) after potential migration
    for (let idx = 1; idx < allSheetRows.length; idx++) {
      const c0 = String(allSheetRows[idx]?.[0] ?? '').trim();
      if (c0 === record.recordCode || c0 === expectedNewCode) {
        targetRowNum = idx + 1;
        break;
      }
    }

    const nowTs = getNowVietnamTimestamp();

    const nextTeamLeader = patch.teamLeader !== undefined ? patch.teamLeader.trim() : record.teamLeader;
    const nextHandled = patch.handled !== undefined ? patch.handled : record.handled;
    const nextMethod = patch.handlingMethod !== undefined ? patch.handlingMethod : record.handlingMethod;
    const nextNotes = patch.notes !== undefined ? patch.notes : record.notes;
    const nextQlcl = patch.qlclConfirmed !== undefined ? patch.qlclConfirmed : record.qlclConfirmed;

    let nextStatus: WeeklyTrackingStatus = 'Chưa xử lý';
    if (nextQlcl) {
      nextStatus = 'Đã đóng';
    } else if (nextHandled) {
      nextStatus = 'Chờ QLCL xác nhận';
    } else if (
      record.status === 'Không còn cảnh báo sau cập nhật' &&
      record.noCheckoutDays === 0 &&
      record.missingImages === 0
    ) {
      nextStatus = 'Không còn cảnh báo sau cập nhật';
    }

    const qlclChanged = patch.qlclConfirmed !== undefined && patch.qlclConfirmed !== record.qlclConfirmed;
    const handledChanged = patch.handled !== undefined && patch.handled !== record.handled;
    let nextUpdatedAt = record.updatedAt;
    if (handledChanged && !nextHandled && !nextQlcl) {
      nextUpdatedAt = '';
    } else if (nextHandled || nextQlcl || patch.handlingMethod !== undefined || patch.notes !== undefined) {
      nextUpdatedAt = nowTs;
    }
    const nextUpdatedBy = handledChanged || patch.handlingMethod !== undefined || patch.notes !== undefined ? actorLabel : record.updatedBy || actorLabel;

    let nextSyncNote = record.syncNote;
    if (qlclChanged) {
      nextSyncNote = nextQlcl
        ? `QLCL xác nhận đóng lúc ${nowTs} bởi ${actorLabel}`
        : `QLCL hủy xác nhận lúc ${nowTs} bởi ${actorLabel}`;
    } else if (handledChanged) {
      nextSyncNote = nextHandled
        ? `Trưởng nhóm đã duyệt lúc ${nowTs} (${actorLabel})`
        : `Trưởng nhóm bỏ tích duyệt lúc ${nowTs} (${actorLabel})`;
    }

    // Write ONLY columns K:R on exact sheetTitle + targetRowNum so Column J preserves its live COUNTIFS formula
    const rangeRef = encodeA1Range(record.sheetTitle, `K${targetRowNum}:R${targetRowNum}`);
    await googleApiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${record.spreadsheetId}/values/${rangeRef}?valueInputOption=USER_ENTERED`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify({
          range: `${escapeA1SheetTitle(record.sheetTitle)}!K${targetRowNum}:R${targetRowNum}`,
          majorDimension: 'ROWS',
          values: [
            [
              nextHandled,
              nextMethod,
              nextNotes,
              nextUpdatedAt,
              nextUpdatedBy,
              nextQlcl,
              nextStatus,
              nextSyncNote,
            ],
          ],
        }),
      },
    );

    // Ensure square checkboxes & live COUNTIFS formula on populated rows
    const populatedCount = Math.max(
      allSheetRows.slice(1).filter(isRealWeeklyOAuthRow).length,
      targetRowNum - 1,
    );
    await applySheetHeaderAndFormatting(
      record.spreadsheetId,
      record.sheetId,
      record.sheetTitle,
      token,
      false,
      populatedCount,
    );

    // Readback verify exact row
    const readback = await readSheetValues(
      record.spreadsheetId,
      record.sheetTitle,
      `A${targetRowNum}:R${targetRowNum}`,
      token,
    );
    const verified = readback[0]
      ? parseRowToTrackingRecord(
          readback[0],
          targetRowNum,
          record.spreadsheetId,
          record.sheetId,
          record.sheetTitle,
        )
      : null;

    if (!verified || (verified.recordCode !== record.recordCode && verified.recordCode !== expectedNewCode)) {
      throw new Error('Không xác minh được dữ liệu đọc lại từ Google Sheet sau khi lưu.');
    }

    // Best-effort refresh master overview tab
    syncMasterOverviewTab(record.spreadsheetId, token).catch(() => {});

    return {
      success: true,
      updatedRecord: verified,
      message: `Đã lưu thao tác cho ${verified.coSo} lên Google Sheet (${verified.status}).`,
    };
  } catch (err: any) {
    return {
      success: false,
      needAuth: err instanceof GoogleWorkspaceAuthError,
      message: err?.message || 'Lỗi ghi cập nhật lên Google Sheet.',
    };
  }
}

export function getOfficialFacilityTeamLeaderDefaults(
  savedMap: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  OFFICIAL_FACILITIES.forEach(fac => {
    result[fac] = savedMap[fac] || '';
  });
  return result;
}
