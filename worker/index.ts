const SHEET_ID = '1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY';

const ALLOWED_SHEETS = new Map([
  ['0', 'Kiểm tra vệ sinh'],
  ['33769956', 'Kiểm tra cảnh báo'],
  ['1163313960', 'Chất lượng cơ sở'],
]);

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
    },
  });
}

function isValidSheetCsv(csv: string): boolean {
  const normalized = csv.trimStart().toLocaleLowerCase('vi-VN');
  if (!normalized || normalized.startsWith('<!doctype html') || normalized.startsWith('<html')) {
    return false;
  }

  const firstRow = csv.split(/\r?\n/, 1)[0].toLocaleLowerCase('vi-VN');
  return firstRow.includes('cơ sở') || firstRow.includes('facility');
}

async function fetchGoogleSheet(gid: string): Promise<Response> {
  const sheetName = ALLOWED_SHEETS.get(gid);
  if (!sheetName) {
    return jsonResponse({ success: false, error: 'Google Sheet tab không hợp lệ' }, 400);
  }

  const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export`);
  exportUrl.searchParams.set('format', 'csv');
  exportUrl.searchParams.set('gid', gid);
  exportUrl.searchParams.set('_', Date.now().toString());

  try {
    const response = await fetch(exportUrl, {
      redirect: 'follow',
      headers: {
        accept: 'text/csv,text/plain;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Google Sheets HTTP ${response.status}`);
    }

    const csv = await response.text();
    if (!isValidSheetCsv(csv)) {
      throw new Error('Google Sheets không trả về CSV hợp lệ');
    }

    return jsonResponse({
      success: true,
      data: {
        csv,
        sheetName,
        source: 'google_sheets_live',
      },
      cached: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể tải Google Sheets';
    return jsonResponse({ success: false, error: message, sheetName }, 502);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    void ctx;
    const url = new URL(request.url);

    if (url.pathname === '/api/facility-sheet-data') {
      return fetchGoogleSheet(url.searchParams.get('gid') || '');
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404 || request.method !== 'GET') {
      return assetResponse;
    }

    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    if (!acceptsHtml) return assetResponse;

    return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
  },
};
