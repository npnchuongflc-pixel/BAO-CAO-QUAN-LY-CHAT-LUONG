import Papa from 'papaparse';
import { normalizeDateToIso } from './utils/dateUtils';
import { normalizeFacilityName } from './utils/facilityUtils';

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

const FACILITY_SHEET_ID = '1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY';
const FEEDBACK_SHEET_ID = '1If65m8-kv10fLlu9DSgvDJCJEpPBdGrieZ7tJ9aXgmo';
const WEEKLY_SHEET_ID = '1003lfdUh6S_Tkg5H4qChw7KrziAon1uvgkoFMj9FK0E';

async function readWeeklyTabs(spreadsheetId: string): Promise<Array<{ name: string; gid: string }>> {
  const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`, {
    signal: AbortSignal.timeout(15_000),
  });
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
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
    { signal: AbortSignal.timeout(15_000) },
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
    reviewStatus, trangThaiKiemDuyet: reviewStatus === 'approved' ? 'Đã duyệt' : 'Không đạt',
    nguoiKiemDuyet: note.replace(/\s*\([^)]*\)\s*$/, '').trim(),
    thoiGianKiemDuyet: String(row[13] || ''), syncedToSheet: true,
  };
}

const IMAGE_REVIEW_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwM1RqSb0F1rZnMetAXarUlaW2J0SmZQQyfkkU-Puk6sz8vhYaIuYY1TfDAtheG1LFI/exec';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

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


    // Read the shared image review ledger from the tab used by Google AI Studio.
    if (url.pathname === '/api/image-reviews' && request.method === 'GET') {
      const date = url.searchParams.get('date') || '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return weeklyJson({ success: false, error: 'Ngày tra cứu không hợp lệ.' }, 400);
      }
      try {
        const rows = await readWeeklyRows(WEEKLY_SHEET_ID, '0');
        if (rows[0]?.[0]?.trim() !== 'Ngày' || rows[0]?.[10]?.trim() !== 'Link ảnh') {
          throw new Error('Cấu trúc tab Kiểm duyệt vệ sinh đã thay đổi.');
        }
        const records = rows.slice(1).flatMap((row, i) => {
          if (normalizeDateToIso(String(row[0] || '')) !== date) return [];
          const record = imageReviewFromRow(row, i + 2);
          return record ? [record] : [];
        });
        records.sort((a, b) => a.coSo.localeCompare(b.coSo, 'vi'));
        return weeklyJson({ success: true, date, records, count: records.length });
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
          const imageUrl = String(item?.linkAnh || '');
          const facility = String(item?.coSo || '').trim();
          const reviewer = String(item?.nguoiKiemDuyet || '').trim();
          const status = String(item?.reviewStatus || (item?.reviewed ? 'approved' : 'pending'));
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !facility ||
              !imageUrl.startsWith('https://') || !['approved', 'rejected', 'pending'].includes(status) ||
              (status !== 'pending' && !reviewer)) {
            throw new Error('Dữ liệu kiểm duyệt ảnh không hợp lệ.');
          }
          const reviewTime = item?.thoiGianKiemDuyet || now;
          const parsedTime = new Date(reviewTime);
          const timeText = Number.isNaN(parsedTime.getTime()) ? '' :
            parsedTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
          const label = reviewer ? `${reviewer} (${timeText})` : '';
          return {
            ...item, id: item?.id || imageReviewId(date, facility, String(item?.khuVuc || ''), imageUrl),
            ngay: date, coSo: facility, linkAnh: imageUrl, reviewStatus: status,
            reviewed: status === 'approved',
            trangThaiKiemDuyet: status === 'approved' ? 'Đã duyệt' : status === 'rejected' ? 'Không đạt' : 'Chưa duyệt',
            nguoiKiemDuyet: reviewer, thoiGianKiemDuyet: reviewTime, updatedAt: now,
            syncedToSheet: true, daDuyet: status === 'approved' ? label : '',
            khongDat: status === 'rejected' ? label : '',
          };
        });
        const updates = records.map((record: any) => ({
          linkAnh: record.linkAnh, ngay: record.ngay, gio: record.gio || '',
          coSo: record.coSo, khuVuc: record.khuVuc || '',
          daDuyet: record.daDuyet, khongDat: record.khongDat,
          reviewStatus: record.reviewStatus, reviewer: record.nguoiKiemDuyet,
        }));
        const upstream = await fetch(IMAGE_REVIEW_SCRIPT_URL, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'batch_update_image_reviews', updates }),
          signal: AbortSignal.timeout(20_000),
        });
        const result: any = await upstream.json().catch(() => null);
        if (!upstream.ok || !(result?.success || result?.status === 'ok')) {
          throw new Error(result?.error || `Google Sheet API HTTP ${upstream.status}`);
        }
        const saved = records.map(({ daDuyet, khongDat, ...record }: any) => record);
        return weeklyJson(body.action === 'upsert'
          ? { success: true, record: saved[0] } : { success: true, records: saved });
      } catch (error) {
        return weeklyJson({ success: false,
          error: error instanceof Error ? error.message : 'Không thể ghi kiểm duyệt ảnh.' }, 502);
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
      const gid = url.searchParams.get('gid') || '0';
      const targetUrl = `https://docs.google.com/spreadsheets/d/${FACILITY_SHEET_ID}/export?format=csv&gid=${encodeURIComponent(gid)}`;
      try {
        const upstream = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
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
      return new Response(JSON.stringify({ success: true, enabled: false, lastSyncDate: null }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
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
