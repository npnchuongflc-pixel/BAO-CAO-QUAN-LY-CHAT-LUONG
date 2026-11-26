import Papa from 'papaparse';
import { normalizeDateToIso } from './utils/dateUtils';
import { normalizeFacilityName } from './utils/facilityUtils';

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  GEMINI_API_KEY?: string;
}

const FACILITY_SHEET_ID = '1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY';
const FEEDBACK_SHEET_ID = '1If65m8-kv10fLlu9DSgvDJCJEpPBdGrieZ7tJ9aXgmo';
const WEEKLY_SHEET_ID = '1003lfdUh6S_Tkg5H4qChw7KrziAon1uvgkoFMj9FK0E';

async function readWeeklyTabs(spreadsheetId: string): Promise<Array<{ name: string; gid: string }>> {
  const response = await fetch(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview?t=${Date.now()}`,
    {
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) throw new Error(`Không thể đọc danh sách tab (HTTP ${response.status}).`);
  const html = await response.text();
  if (html.includes('accounts.google.com') && !html.includes('items.push')) {
    throw new Error('Google Sheet chưa cho phép xem qua đường dẫn.');
  }
  const tabs: Array<{ name: string; gid: string }> = [];
  const regex = /items\.push\(\{name:\s*"([^"]+)"[^}]*gid:\s*"(\d+)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    let name = match[1];
    try { name = JSON.parse(`"${match[1]}"`); } catch { /* Use the original name. */ }
    tabs.push({ name: name.trim(), gid: match[2] });
  }
  if (!tabs.length) throw new Error('Không tìm thấy tab nào có thể đọc trong Google Sheet.');
  return tabs;
}

async function readWeeklyRows(spreadsheetId: string, gid: string): Promise<string[][]> {
  const response = await fetch(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${encodeURIComponent(gid)}&t=${Date.now()}`,
    {
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) throw new Error(`Không thể đọc tab ${gid} (HTTP ${response.status}).`);
  const csv = await response.text();
  if (csv.includes('<!DOCTYPE html>') || csv.includes('accounts.google.com')) {
    throw new Error(`Tab ${gid} không trả về dữ liệu CSV.`);
  }
  return Papa.parse<string[]>(csv, { skipEmptyLines: false }).data;
}

function weeklyJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function weekDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function normalizeWeekRange(value: string): string {
  return value.replace(/\s*\(Tuần\s*\d+\)\s*/i, '')
    .replace(/[–—]/g, '-').replace(/\s*-\s*/g, ' - ').trim();
}


function imageReviewId(date: string, facility: string, area: string, imageUrl: string): string {
  const identity = [date, normalizeFacilityName(facility), area, imageUrl].join('|');
  let hash = 2166136261;
  for (let i = 0; i < identity.length; i++) {
    hash ^= identity.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `image-${(hash >>> 0).toString(36)}`;
}

function imageReviewFromRow(row: string[], rowIndex: number) {
  const date = normalizeDateToIso(String(row[0] || ''));
  const facility = String(row[3] || '').trim();
  const area = String(row[4] || '').trim();
  const imageUrl = String(row[10] || '').trim();
  const approvedBy = String(row[11] || '').trim();
  const rejectedBy = String(row[12] || '').trim();
  if (!date || !facility || !imageUrl || (!approvedBy && !rejectedBy)) return null;
  const reviewStatus = rejectedBy ? 'rejected' : 'approved';
  const note = rejectedBy || approvedBy;
  return {
    id: imageReviewId(date, facility, area, imageUrl), reportId: '',
    rowIndex, ngay: date, gio: String(row[1] || ''),
    coSo: facility, khuVuc: area, linkAnh: imageUrl,
    nguoiBaoCao: String(row[2] || ''), reviewed: reviewStatus === 'approved',
    reviewStatus, trangThaiKiemDuyet: reviewStatus === 'approved' ? 'Đã duyệt' : 'Lỗi AI',
    nguoiKiemDuyet: note.replace(/\s*\([^)]*\)\s*$/, '').trim(),
    thoiGianKiemDuyet: String(row[13] || ''), syncedToSheet: true,
  };
}

const IMAGE_REVIEW_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwM1RqSb0F1rZnMetAXarUlaW2J0SmZQQyfkkU-Puk6sz8vhYaIuYY1TfDAtheG1LFI/exec';


function weeklyScriptUrl(candidate: unknown): string {
  const value = typeof candidate === 'string' && candidate.trim()
    ? candidate.trim() : IMAGE_REVIEW_SCRIPT_URL;
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com' ||
      !/^\/macros\/s\/[\w-]+\/exec$/.test(parsed.pathname) || parsed.search || parsed.hash) {
    throw new Error('Đường dẫn Google Apps Script không hợp lệ.');
  }
  return value;
}

async function weeklyScriptPost(scriptUrl: string, payload: unknown, timeout = 20_000): Promise<any> {
  const response = await fetch(scriptUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(timeout),
  });
  const result: any = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error('Google Apps Script không phản hồi hợp lệ.');
  return result;
}

async function weeklyScriptReady(scriptUrl: string): Promise<boolean> {
  const result = await weeklyScriptPost(scriptUrl, { action: 'weekly_ping' }, 12_000);
  return result.weeklySupported === true && Number(result.schemaVersion || 0) >= 8;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);


    // Weekly report writes go through the same versioned Apps Script used by the Express backend.
    if (url.pathname === '/api/weekly-warning-config' && request.method === 'GET') {
      return weeklyJson({ success: true, config: {
        spreadsheetId: WEEKLY_SHEET_ID,
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/' + WEEKLY_SHEET_ID + '/edit',
        spreadsheetTitle: 'THEO DÕI XỬ LÝ CẢNH BÁO VỆ SINH',
        appsScriptUrl: '', teamLeadersByFacility: {}, weekSyncHistory: {},
      } });
    }

    if (url.pathname === '/api/weekly-warning-config' && request.method === 'POST') {
      try {
        const body: any = await request.json().catch(() => ({}));
        const suppliedId = typeof body?.spreadsheetId === 'string' ? body.spreadsheetId.trim() : '';
        const spreadsheetId = /^[a-zA-Z0-9_-]{10,120}$/.test(suppliedId) ? suppliedId : WEEKLY_SHEET_ID;
        const scriptUrl = typeof body?.appsScriptUrl === 'string' && body.appsScriptUrl.trim()
          ? weeklyScriptUrl(body.appsScriptUrl) : '';
        return weeklyJson({
          success: true,
          config: {
            spreadsheetId,
            spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/edit',
            spreadsheetTitle: typeof body?.spreadsheetTitle === 'string' && body.spreadsheetTitle.trim()
              ? body.spreadsheetTitle.trim().slice(0, 160)
              : 'THEO DÕI XỬ LÝ CẢNH BÁO VỆ SINH',
            appsScriptUrl: scriptUrl,
            teamLeadersByFacility: body?.teamLeadersByFacility && typeof body.teamLeadersByFacility === 'object'
              ? body.teamLeadersByFacility : {},
            weekSyncHistory: body?.weekSyncHistory && typeof body.weekSyncHistory === 'object'
              ? body.weekSyncHistory : {},
            updatedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        return weeklyJson({
          success: false,
          error: error instanceof Error ? error.message : 'Cấu hình không hợp lệ.',
        }, 400);
      }
    }

    if (url.pathname === '/api/weekly-warning-sheet/script-status' && request.method === 'GET') {
      try {
        const supported = await weeklyScriptReady(IMAGE_REVIEW_SCRIPT_URL);
        return weeklyJson({ success: true, weeklySupported: supported });
      } catch (error) {
        return weeklyJson({ success: false,
          error: error instanceof Error ? error.message : 'Không thể kiểm tra Apps Script.' }, 502);
      }
    }

    if (url.pathname === '/api/weekly-warning-sheet/sync' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const spreadsheetId = /^[a-zA-Z0-9_-]{10,120}$/.test(body?.spreadsheetId || '')
          ? body.spreadsheetId : WEEKLY_SHEET_ID;
        const week = body?.selectedWeek;
        const sourceRows: any[] = body?.sourceRows;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(week?.startIso || '') ||
            !/^\d{4}-\d{2}-\d{2}$/.test(week?.endIso || '') ||
            week.startIso > week.endIso ||
            !Array.isArray(sourceRows) || sourceRows.length > 100 ||
            sourceRows.some(row => !row || typeof row.recordCode !== 'string')) {
          return weeklyJson({ success: false, message: 'Dữ liệu báo cáo tuần không hợp lệ.' }, 400);
        }
        const scriptUrl = weeklyScriptUrl(body?.scriptUrl);
        if (!(await weeklyScriptReady(scriptUrl))) {
          return weeklyJson({ success: false, needsScriptUpdate: true,
            message: 'Apps Script của Google Sheet cần cập nhật lên phiên bản hỗ trợ báo cáo tuần (v8).' });
        }
        const weekCode = 'W_' + week.startIso + '_TO_' + week.endIso;
        const weekPrefix = typeof body.weekPrefix === 'string' && body.weekPrefix.trim()
          ? body.weekPrefix.trim() : 'Tuần ' + week.weekNumber + '_' +
            week.startIso.slice(5, 7) + '/' + week.startIso.slice(0, 4) + '_';
        const mode = body.mode === 'update' ? 'update' : 'create';
        const response = await weeklyScriptPost(scriptUrl, {
          action: 'sync_weekly_warning_report', spreadsheetId,
          targetSheetName: 'Trưởng nhóm xử lý', sheetTitle: 'Trưởng nhóm xử lý',
          weekCode, weekPrefix, startIso: week.startIso, endIso: week.endIso,
          mode, sourceRows,
        }, 30_000);
        if (response.weeklySupported !== true || Number(response.schemaVersion || 0) < 8) {
          return weeklyJson({ success: false, needsScriptUpdate: true,
            message: 'Apps Script trên Google Sheet cần cập nhật phiên bản v8.' });
        }
        if (response.alreadyExists) {
          return weeklyJson({ success: false, alreadyExists: true,
            sheetId: Number(response.sheetId || 0), sheetTitle: response.sheetTitle || 'Trưởng nhóm xử lý',
            existingRowCount: Number(response.existingRowCount || 0),
            message: response.message || 'Tuần này đã tồn tại trong Google Sheet.' });
        }
        if (!response.success) {
          return weeklyJson({ success: false, message: response.error || response.message || 'Không thể ghi báo cáo tuần.' }, 502);
        }
        const tabs = await readWeeklyTabs(spreadsheetId);
        const tab = tabs.find(item => item.name.trim().toLowerCase() === 'trưởng nhóm xử lý');
        if (!tab || String(response.sheetId) !== tab.gid) {
          throw new Error('Không thể xác minh tab báo cáo tuần sau khi ghi.');
        }
        const rows = await readWeeklyRows(spreadsheetId, tab.gid);
        const range = weekDate(week.startIso) + ' - ' + weekDate(week.endIso);
        const month = week.startIso.slice(5, 7) + '/' + week.startIso.slice(0, 4);
        const verified = rows.slice(rows[0]?.[0] === 'Mã hồ sơ' ? 1 : 0).filter(row => {
          const code = String(row[0] || '').trim();
          return Boolean(code) && (code.startsWith(weekCode + '__') ||
            code.startsWith(weekPrefix) ||
            (normalizeWeekRange(String(row[1] || '')) === range &&
              String(row[2] || '').trim() === month));
        });
        const codes = new Set(verified.map(row => String(row[0] || '').trim()));
        if (sourceRows.some(row => !codes.has(row.recordCode.trim()))) {
          throw new Error('Đã gửi báo cáo nhưng chưa đọc lại đủ hồ sơ trong Sheet; vui lòng kiểm tra Sheet trước khi thử lại.');
        }
        const spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/edit';
        return weeklyJson({ success: true, mode, spreadsheetId, spreadsheetUrl,
          tabUrl: spreadsheetUrl + '#gid=' + tab.gid, sheetId: Number(tab.gid),
          sheetTitle: tab.name, weekCode, syncedAt: response.syncedAt || '',
          updatedCount: Number(response.updatedCount || 0),
          addedCount: Number(response.addedCount || 0),
          resolvedCount: Number(response.resolvedCount || 0),
          totalRowsVerified: verified.length,
          message: response.message || 'Đã đồng bộ báo cáo tuần vào Google Sheet.' });
      } catch (error) {
        return weeklyJson({ success: false, message:
          error instanceof Error ? error.message : 'Không thể đồng bộ báo cáo tuần.' }, 502);
      }
    }

    if (url.pathname === '/api/weekly-warning-sheet/update-row' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const spreadsheetId = /^[a-zA-Z0-9_-]{10,120}$/.test(body?.spreadsheetId || '')
          ? body.spreadsheetId : WEEKLY_SHEET_ID;
        const recordCode = String(body?.recordCode || '').trim();
        const patch = body?.patch;
        if (!recordCode || recordCode.length > 240 || !patch ||
            typeof patch !== 'object' || Array.isArray(patch) ||
            Object.keys(patch).some(key => !['teamLeader', 'handled', 'handlingMethod',
              'notes', 'qlclConfirmed'].includes(key))) {
          return weeklyJson({ success: false, message: 'Dữ liệu cập nhật hồ sơ không hợp lệ.' }, 400);
        }
        const scriptUrl = weeklyScriptUrl(body?.scriptUrl);
        if (!(await weeklyScriptReady(scriptUrl))) {
          return weeklyJson({ success: false, needsScriptUpdate: true,
            message: 'Apps Script của Google Sheet cần cập nhật phiên bản v8.' });
        }
        const response = await weeklyScriptPost(scriptUrl, {
          action: 'update_weekly_warning_record', spreadsheetId, recordCode,
          sheetTitle: String(body.sheetTitle || 'Trưởng nhóm xử lý').trim(),
          weekCode: String(body.weekCode || '').trim(), patch,
          actor: String(body.actor || 'Trưởng nhóm / QLCL').trim().slice(0, 120),
        });
        if (response.weeklySupported !== true || Number(response.schemaVersion || 0) < 8) {
          return weeklyJson({ success: false, needsScriptUpdate: true,
            message: 'Apps Script trên Google Sheet cần cập nhật phiên bản v8.' });
        }
        if (!response.success || !Array.isArray(response.rowValues)) {
          return weeklyJson({ success: false,
            message: response.error || 'Không thể lưu thay đổi lên Google Sheet.' }, 502);
        }
        return weeklyJson({ success: true, rowNumber: Number(response.rowNumber || 0),
          rowValues: response.rowValues, status: response.status });
      } catch (error) {
        return weeklyJson({ success: false, message:
          error instanceof Error ? error.message : 'Không thể cập nhật hồ sơ.' }, 502);
      }
    }

    // Phần 3 reads every weekly tab from the public spreadsheet without a browser OAuth token.
    if (url.pathname === '/api/weekly-warning-sheet/records') {
      const suppliedId = url.searchParams.get('spreadsheetId')?.trim();
      const spreadsheetId = suppliedId && /^[a-zA-Z0-9_-]{10,120}$/.test(suppliedId)
        ? suppliedId : WEEKLY_SHEET_ID;
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      try {
        const tabs = await readWeeklyTabs(spreadsheetId);
        const ignored = new Set(['kiểm duyệt vệ sinh', 'nhắc nhở', 'tổng hợp hồ sơ', 'sheet1']);
        const candidates = tabs.filter(tab => !ignored.has(tab.name.toLowerCase()));
        const results = await Promise.all(candidates.map(async tab => {
          try { return { tab, rows: await readWeeklyRows(spreadsheetId, tab.gid) }; }
          catch { return { tab, rows: [] as string[][] }; }
        }));
        const rawRecords: Array<{
          row: string[]; rowNumber: number; spreadsheetId: string; sheetId: number; sheetTitle: string;
        }> = [];
        for (const { tab, rows } of results) {
          const header = String(rows[0]?.[0] || '').trim();
          const legacy = /^Tuần\s*\d+_|^W_\d{4}-/.test(header);
          if (header !== 'Mã hồ sơ' && !legacy) continue;
          for (let i = header === 'Mã hồ sơ' ? 1 : 0; i < rows.length; i++) {
            const row = rows[i];
            const facility = String(row?.[5] || row?.[4] || row?.[2] || '').trim();
            if (String(row?.[0] || '').trim() && facility) {
              rawRecords.push({ row, rowNumber: i + 1, spreadsheetId,
                sheetId: Number(tab.gid), sheetTitle: tab.name });
            }
          }
        }
        return weeklyJson({ success: true, spreadsheetFound: true,
          spreadsheetId, spreadsheetUrl, rawRecords });
      } catch (error) {
        return weeklyJson({ success: false, error: error instanceof Error ? error.message : 'Không thể đọc dữ liệu tuần.' }, 502);
      }
    }

    if (url.pathname === '/api/weekly-warning-sheet/check' && request.method === 'GET') {
      const startIso = url.searchParams.get('startIso')?.trim() || '';
      const endIso = url.searchParams.get('endIso')?.trim() || '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso) || !/^\d{4}-\d{2}-\d{2}$/.test(endIso)) {
        return weeklyJson({ success: false, error: 'Ngày bắt đầu / kết thúc tuần không hợp lệ.' }, 400);
      }
      const suppliedId = url.searchParams.get('spreadsheetId')?.trim();
      const spreadsheetId = suppliedId && /^[a-zA-Z0-9_-]{10,120}$/.test(suppliedId)
        ? suppliedId : WEEKLY_SHEET_ID;
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      const weekCode = `W_${startIso}_TO_${endIso}`;
      const weekNumber = Number(url.searchParams.get('weekNumber') || 0);
      const month = `${startIso.slice(5, 7)}/${startIso.slice(0, 4)}`;
      const weekPrefix = weekNumber > 0 ? `Tuần ${weekNumber}_${month}_` : '';
      const dateRange = `${weekDate(startIso)} - ${weekDate(endIso)}`;
      try {
        const tabs = await readWeeklyTabs(spreadsheetId);
        const tab = tabs.find(t => t.name.trim().toLowerCase() === 'trưởng nhóm xử lý')
          || tabs.find(t => t.name.includes(weekCode));
        if (!tab) return weeklyJson({ success: true, result: { spreadsheetFound: true,
          spreadsheetId, spreadsheetUrl, weekExists: false, weekCode,
          sheetTitle: 'Trưởng nhóm xử lý', existingRowCount: 0, tabUrl: spreadsheetUrl } });
        const rows = await readWeeklyRows(spreadsheetId, tab.gid);
        const start = String(rows[0]?.[0] || '').trim() === 'Mã hồ sơ' ? 1 : 0;
        const matching = rows.slice(start).filter(row => {
          const code = String(row?.[0] || '').trim();
          const rowRange = normalizeWeekRange(String(row?.[1] || ''));
          return Boolean(code) && (
            (weekPrefix && code.startsWith(weekPrefix)) ||
            code.startsWith(`${weekCode}__`) || rowRange === dateRange
          );
        });
        return weeklyJson({ success: true, result: { spreadsheetFound: true,
          spreadsheetId, spreadsheetUrl, weekExists: matching.length > 0, weekCode,
          sheetId: Number(tab.gid), sheetTitle: tab.name, existingRowCount: matching.length,
          tabUrl: `${spreadsheetUrl}#gid=${tab.gid}` } });
      } catch (error) {
        return weeklyJson({ success: false, error: error instanceof Error ? error.message : 'Không thể kiểm tra hồ sơ tuần.' }, 502);
      }
    }


    // Part 1 consumes the full review ledger CSV through this same-origin endpoint.
    if (url.pathname === '/api/hygiene-review-sheet-data' && request.method === 'GET') {
      try {
        const upstream = await fetch(
          `https://docs.google.com/spreadsheets/d/${WEEKLY_SHEET_ID}/export?format=csv&gid=0`,
          { signal: AbortSignal.timeout(15_000) },
        );
        if (!upstream.ok) throw new Error(`Google Sheet trả về HTTP ${upstream.status}`);
        const csv = await upstream.text();
        if (!csv || csv.includes('<!DOCTYPE html>') || csv.includes('accounts.google.com')) {
          throw new Error('Không thể đọc tab Kiểm duyệt vệ sinh.');
        }
        return weeklyJson({ success: true, data: { csv }, cached: false });
      } catch (error) {
        return weeklyJson({ success: false,
          error: error instanceof Error ? error.message : 'Không thể đọc kiểm duyệt vệ sinh.' }, 502);
      }
    }

    // Read the shared image review ledger from the tab used by Google AI Studio.
    if (url.pathname === '/api/image-reviews' && request.method === 'GET') {
      const date = url.searchParams.get('date') || '';
      const returnAll = url.searchParams.get('all') === '1' || !date || date === 'all';
      if (!returnAll && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return weeklyJson({ success: false, error: 'Ngày tra cứu không hợp lệ.' }, 400);
      }
      try {
        const rows = await readWeeklyRows(WEEKLY_SHEET_ID, '0');
        if (rows[0]?.[0]?.trim() !== 'Ngày' || rows[0]?.[10]?.trim() !== 'Link ảnh') {
          throw new Error('Cấu trúc tab Kiểm duyệt vệ sinh đã thay đổi.');
        }
        const records = rows.slice(1).flatMap((row, i) => {
          if (!returnAll && normalizeDateToIso(String(row[0] || '')) !== date) return [];
          const record = imageReviewFromRow(row, i + 2);
          return record ? [record] : [];
        });
        records.sort((a, b) => b.ngay.localeCompare(a.ngay) || a.coSo.localeCompare(b.coSo, 'vi'));
        return weeklyJson({ success: true, date: returnAll ? 'all' : date, records, count: records.length });
      } catch (error) {
        return weeklyJson({ success: false,
          error: error instanceof Error ? error.message : 'Không thể đọc dữ liệu kiểm duyệt ảnh.' }, 502);
      }
    }

    if (url.pathname === '/api/image-reviews' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const input = body?.action === 'batch_upsert' ? body.records : [body?.record];
        if (!['batch_upsert', 'upsert'].includes(body?.action) || !Array.isArray(input) || input.length > 500) {
          return weeklyJson({ success: false, error: 'Thao tác không hợp lệ.' }, 400);
        }
        const now = new Date().toISOString();
        const records = input.map((item: any) => {
          const date = String(item?.ngay || '');
          const imageUrl = String(item?.linkAnh || '').trim();
          const facility = String(item?.coSo || '').trim();
          const reviewer = String(item?.nguoiKiemDuyet || '').trim();
          const status = String(item?.reviewStatus || (item?.reviewed ? 'approved' : 'pending'));
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !facility ||
              !/^https?:\/\//i.test(imageUrl) || !['approved', 'rejected', 'pending'].includes(status) ||
              (status !== 'pending' && !reviewer)) {
            throw new Error('Dữ liệu kiểm duyệt ảnh không hợp lệ.');
          }
          const reviewTime = item?.thoiGianKiemDuyet || now;
          const parsedTime = new Date(reviewTime);
          const timeText = Number.isNaN(parsedTime.getTime()) ? '' :
            parsedTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
          const label = reviewer ? (timeText ? `${reviewer} (${timeText})` : reviewer) : '';
          return {
            ...item, id: item?.id || imageReviewId(date, facility, String(item?.khuVuc || ''), imageUrl),
            ngay: date, coSo: facility, linkAnh: imageUrl, reviewStatus: status,
            reviewed: status === 'approved',
            trangThaiKiemDuyet: status === 'approved' ? 'Đã duyệt' : status === 'rejected' ? 'Lỗi AI' : 'Chưa duyệt',
            nguoiKiemDuyet: reviewer, thoiGianKiemDuyet: reviewTime, updatedAt: now,
            syncedToSheet: true,
            daDuyet: status === 'approved' ? (label || 'Đã duyệt') : '',
            khongDat: status === 'rejected' ? (label || 'Lỗi AI') : '',
          };
        });

        if (!body?.skipSheetSync) {
          const scriptUrl = weeklyScriptUrl(body?.scriptUrl);
          if (body.action === 'upsert') {
            const first = records[0];
            const { daDuyet, khongDat, ...savedRecord } = first;
            const upstream = await fetch(scriptUrl, {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                action: 'upsert_image_review',
                record: savedRecord,
                rowIndex: first.rowIndex,
                linkAnh: first.linkAnh,
                ngay: first.ngay,
                gio: first.gio || '',
                coSo: first.coSo,
                khuVuc: first.khuVuc || '',
                reviewStatus: first.reviewStatus,
                reviewer: first.nguoiKiemDuyet,
                daDuyet,
                khongDat,
                loiAi: khongDat,
              }),
              signal: AbortSignal.timeout(20_000),
            });
            const result: any = await upstream.json().catch(() => null);
            if (!upstream.ok || !(result?.success || result?.status === 'ok')) {
              throw new Error(result?.error || `Google Sheet API HTTP ${upstream.status}`);
            }
          } else {
            const updates = records.map((record: any) => ({
              linkAnh: record.linkAnh, ngay: record.ngay, gio: record.gio || '',
              coSo: record.coSo, khuVuc: record.khuVuc || '',
              daDuyet: record.daDuyet, khongDat: record.khongDat, loiAi: record.khongDat,
              reviewStatus: record.reviewStatus, reviewer: record.nguoiKiemDuyet,
            }));
            const upstream = await fetch(scriptUrl, {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ action: 'batch_update_image_reviews', updates }),
              signal: AbortSignal.timeout(20_000),
            });
            const result: any = await upstream.json().catch(() => null);
            if (!upstream.ok || !(result?.success || result?.status === 'ok')) {
              throw new Error(result?.error || `Google Sheet API HTTP ${upstream.status}`);
            }
          }
        }

        const saved = records.map(({ daDuyet, khongDat, ...record }: any) => record);
        return weeklyJson(body.action === 'upsert'
          ? { success: true, record: saved[0] } : { success: true, records: saved });
      } catch (error) {
        return weeklyJson({ success: false,
          error: error instanceof Error ? error.message : 'Không thể ghi kiểm duyệt ảnh.' }, 502);
      }
    }

    if (url.pathname === '/api/auto-sync-config' && request.method === 'POST') {
      try {
        const body: any = await request.json().catch(() => ({}));
        const configured = Boolean(typeof body?.scriptUrl === 'string' && body.scriptUrl.trim());
        return weeklyJson({
          success: true,
          configured,
          message: configured ? 'Đã lưu cấu hình tự động đồng bộ.' : 'Đã xóa cấu hình',
        });
      } catch (error) {
        return weeklyJson({ success: false, error: error instanceof Error ? error.message : 'Lỗi cấu hình' }, 400);
      }
    }

    if (url.pathname === '/api/sync-day-to-new-sheet' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const date = String(body?.date || '').trim();
        const records: any[] = Array.isArray(body?.records) ? body.records : [];
        if (!date) {
          return weeklyJson({ success: false, error: 'Thiếu thông tin ngày hoặc danh sách bản ghi.' }, 400);
        }
        const scriptUrl = weeklyScriptUrl(body?.scriptUrl);
        const upstream = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync_full_day_hygiene_reviews',
            date,
            count: records.length,
            records,
            onlyLowScore: Boolean(body?.onlyLowScore),
            allowEmptyReplace: Boolean(body?.allowEmptyReplace),
            timestamp: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(25_000),
        });
        const syncJson: any = await upstream.json().catch(() => null);
        if (upstream.ok && (syncJson?.success || syncJson?.status === 'ok')) {
          return weeklyJson({
            success: true,
            message: syncJson?.message || `Đã ghi nhận thành công ${records.length} dòng sang Sheet mới.`,
            syncedCount: records.length,
          });
        }
        return weeklyJson({
          success: false,
          error: syncJson?.error || `Lỗi phản hồi từ Google Apps Script (HTTP ${upstream.status})`,
        }, 502);
      } catch (error) {
        return weeklyJson({
          success: false,
          error: error instanceof Error ? error.message : 'Lỗi đồng bộ Google Sheet',
        }, 502);
      }
    }

    if (url.pathname === '/api/sync-warnings-to-sheet' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const date = String(body?.date || '').trim();
        const records: any[] = Array.isArray(body?.records) ? body.records : [];
        if (!date) {
          return weeklyJson({ success: false, error: 'Thiếu thông tin ngày hoặc danh sách cảnh báo.' }, 400);
        }
        const scriptUrl = weeklyScriptUrl(body?.scriptUrl);
        const upstream = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync_warnings',
            sheetName: 'nhắc nhở',
            date,
            count: records.length,
            records,
            timestamp: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(25_000),
        });
        const syncJson: any = await upstream.json().catch(() => null);
        if (upstream.ok && (syncJson?.success || syncJson?.status === 'ok')) {
          return weeklyJson({
            success: true,
            message: syncJson?.message || `Đã đổ thành công ${records.length} cơ sở cảnh báo sang sheet "nhắc nhở"!`,
            syncedCount: records.length,
            totalRows: syncJson?.totalRows,
          });
        }
        return weeklyJson({
          success: false,
          error: syncJson?.error || `Lỗi phản hồi từ Google Apps Script (HTTP ${upstream.status})`,
        }, 502);
      } catch (error) {
        return weeklyJson({
          success: false,
          error: error instanceof Error ? error.message : 'Lỗi kết nối Google Sheet',
        }, 502);
      }
    }

    // API Health Check
    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'Zalo OA Report Backend (Cloudflare Edge Worker)',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (url.pathname === '/api/warning-reminders-data' && request.method === 'GET') {
      try {
        const tab = (await readWeeklyTabs(WEEKLY_SHEET_ID))
          .find(item => item.name.trim().toLowerCase() === 'nhắc nhở');
        if (!tab) throw new Error('Không tìm thấy tab nhắc nhở.');
        const rows = await fetch(
          `https://docs.google.com/spreadsheets/d/${WEEKLY_SHEET_ID}/export?format=csv&gid=${tab.gid}`,
          { signal: AbortSignal.timeout(15_000) },
        );
        if (!rows.ok) throw new Error(`Google Sheet trả về HTTP ${rows.status}`);
        const csv = await rows.text();
        if (!csv || csv.includes('<!DOCTYPE html>') || csv.includes('accounts.google.com')) {
          throw new Error('Không thể đọc tab nhắc nhở.');
        }
        return weeklyJson({ success: true, data: { csv }, cached: false });
      } catch (error) {
        return weeklyJson({ success: false, error: error instanceof Error ? error.message : 'Không thể đọc tab nhắc nhở.' }, 502);
      }
    }

    if (url.pathname === '/api/proposals-sheet' && request.method === 'GET') {
      try {
        const response = await fetch(
          `https://docs.google.com/spreadsheets/d/${FACILITY_SHEET_ID}/gviz/tq?tqx=out:json&gid=169229004`,
          { signal: AbortSignal.timeout(15_000) },
        );
        if (!response.ok) throw new Error(`Google Sheet trả về HTTP ${response.status}`);
        const body = await response.text();
        const start = body.indexOf('{');
        const end = body.lastIndexOf('}');
        if (start < 0 || end < start) throw new Error('Dữ liệu đề xuất không đúng định dạng.');
        const parsed = JSON.parse(body.slice(start, end + 1));
        return weeklyJson({ success: true, table: parsed.table, cached: false });
      } catch (error) {
        return weeklyJson({ success: false, error: error instanceof Error ? error.message : 'Không thể đọc đề xuất.' }, 502);
      }
    }

    // Facility Google Sheets CSV proxy
    if (url.pathname === '/api/facility-sheet-data') {
      const allowedGids = new Set(['0', '33769956', '1163313960']);
      const gid = url.searchParams.get('gid') || '0';
      if (!allowedGids.has(gid)) {
        return weeklyJson({ success: false, error: 'Google Sheet tab không hợp lệ' }, 400);
      }
      const targetUrl = `https://docs.google.com/spreadsheets/d/${FACILITY_SHEET_ID}/export?format=csv&gid=${encodeURIComponent(gid)}`;
      try {
        const upstream = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          },
          signal: AbortSignal.timeout(15_000),
        });
        const csvText = await upstream.text();
        if (!upstream.ok || !csvText || csvText.includes('<!DOCTYPE html>') || csvText.includes('accounts.google.com')) {
          return weeklyJson({
            success: false,
            error: 'Google Sheets CSV không khả dụng hoặc cần quyền truy cập',
          }, 502);
        }
        return new Response(csvText, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=60',
          },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // Customer Feedback Google Sheets GViz proxy
    if (url.pathname === '/api/sheet-data') {
      const encodedSheet = encodeURIComponent('Zalo đánh giá');
      const targetUrl = `https://docs.google.com/spreadsheets/d/${FEEDBACK_SHEET_ID}/gviz/tq?sheet=${encodedSheet}&tq=select%20A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P`;
      try {
        const upstream = await fetch(targetUrl);
        const text = await upstream.text();
        // Parse GViz response /*O_o*/ google.visualization.Query.setResponse(...)
        const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
        if (jsonMatch && jsonMatch[1]) {
          const parsed = JSON.parse(jsonMatch[1]);
          return new Response(JSON.stringify({ success: true, data: parsed }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
        return new Response(JSON.stringify({ success: false, error: 'Invalid GViz format' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // Teaching Quality Google Sheets GViz proxy (gid=282336280)
    if (url.pathname === '/api/teaching-sheet-data') {
      const targetUrl = `https://docs.google.com/spreadsheets/d/${FEEDBACK_SHEET_ID}/gviz/tq?gid=282336280`;
      try {
        const upstream = await fetch(targetUrl);
        const text = await upstream.text();
        const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
        if (jsonMatch && jsonMatch[1]) {
          const parsed = JSON.parse(jsonMatch[1]);
          return new Response(JSON.stringify({ success: true, data: parsed }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
        return new Response(JSON.stringify({ success: false, error: 'Invalid GViz format' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // Incident Resolution Google Sheets GViz proxy (gid=206722729)
    if (url.pathname === '/api/incident-data') {
      const targetUrl = `https://docs.google.com/spreadsheets/d/${FEEDBACK_SHEET_ID}/gviz/tq?gid=206722729`;
      try {
        const upstream = await fetch(targetUrl);
        const text = await upstream.text();
        const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
        if (jsonMatch && jsonMatch[1]) {
          const parsed = JSON.parse(jsonMatch[1]);
          return new Response(JSON.stringify({ success: true, data: parsed }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
        return new Response(JSON.stringify({ success: false, error: 'Invalid GViz format' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // Warning Audits API
    if (url.pathname === '/api/warning-audits') {
      if (request.method === 'GET') {
        const date = url.searchParams.get('date') || '';
        return new Response(JSON.stringify({ success: true, date, records: [], count: 0 }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Auto Sync Status API
    if (url.pathname === '/api/auto-sync-status') {
      return new Response(JSON.stringify({ success: true, enabled: true, lastSyncDate: null }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (url.pathname === '/api/ai-insights' && request.method === 'POST') {
      if (!env.GEMINI_API_KEY) {
        return weeklyJson({
          success: false,
          error: 'Tính năng AI Insights cần cấu hình biến môi trường GEMINI_API_KEY.',
        }, 503);
      }
      try {
        const body: any = await request.json();
        const promptText = String(body?.question || body?.prompt || 'Phân tích tổng quan dữ liệu chất lượng giảng dạy:').trim();
        const contextStr = JSON.stringify(body?.summaryData || {});
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${promptText}\n\nDữ liệu: ${contextStr}` }] }],
            }),
            signal: AbortSignal.timeout(25_000),
          },
        );
        const geminiJson: any = await geminiResp.json().catch(() => null);
        const analysis = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!geminiResp.ok || !analysis) {
          throw new Error(geminiJson?.error?.message || 'Không nhận được phản hồi từ Gemini API.');
        }
        return weeklyJson({ success: true, analysis });
      } catch (error) {
        return weeklyJson({
          success: false,
          error: error instanceof Error ? error.message : 'Lỗi gọi Gemini API.',
        }, 502);
      }
    }

    // Classroom Report Live Sheet CSV Proxy (Cloudflare Edge Worker)
    if (url.pathname === '/api/live-sheet') {
      const gid = url.searchParams.get('gid') || '';
      const spreadsheetId = url.searchParams.get('spreadsheetId') || '1wmBYcZCjOCWWvcv2mxeATVxphawbpkUaPIRICj3XgsE';
      if (!gid) {
        return new Response(JSON.stringify({ error: 'Missing gid parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      try {
        const targetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}&t=${Date.now()}`;
        const upstream = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
        const csvText = await upstream.text();
        return new Response(csvText, {
          status: upstream.status,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=60',
          },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // Static Assets fallback for SPA
    return env.ASSETS.fetch(request);
  },
};
