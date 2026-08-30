import Papa from 'papaparse';

const SHEET_ID = '1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY';

const ALLOWED_SHEETS = new Map([
  ['0', 'Kiểm tra vệ sinh'],
  ['33769956', 'Kiểm tra cảnh báo'],
  ['1163313960', 'Chất lượng cơ sở'],
]);

const jsonResponse = (payload, status = 200) =>
  Response.json(payload, {
    status,
    headers: {
      'cache-control': 'no-store, max-age=0',
    },
  });

const isValidSheetCsv = (csv) => {
  const normalized = csv.trimStart().toLocaleLowerCase('vi-VN');
  if (!normalized || normalized.startsWith('<!doctype html') || normalized.startsWith('<html')) {
    return false;
  }

  const firstRow = csv.split(/\r?\n/, 1)[0].toLocaleLowerCase('vi-VN');
  return firstRow.includes('cơ sở') || firstRow.includes('facility');
};

export default async (request) => {
  if (request.method !== 'GET') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  const requestUrl = new URL(request.url);
  const gid = requestUrl.searchParams.get('gid') || '';
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
      signal: AbortSignal.timeout(25000),
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

    // Count parsed CSV records rather than physical lines. Google Form values
    // can contain line breaks inside quoted cells, which would inflate a
    // line-based count even though the dashboard correctly sees one record.
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
    const recordCount = parsed.data.length;

    return jsonResponse({
      success: true,
      data: {
        csv,
        recordCount,
        sheetName,
        source: 'google_sheets_live',
      },
      cached: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể tải Google Sheets';
    return jsonResponse({ success: false, error: message, sheetName }, 502);
  }
};
