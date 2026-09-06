import { getDeployStore, getStore } from '@netlify/blobs';

const STORE_NAME = 'facility-warning-audits';
const VALID_STATUSES = new Set(['chua_xu_ly', 'da_nhac_nho', 'loi_app']);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAILY_WARNINGS = 50;

const jsonResponse = (payload, status = 200) =>
  Response.json(payload, {
    status,
    headers: { 'cache-control': 'no-store, max-age=0' },
  });

const escapeCsvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const csvResponse = (records) => {
  const headers = [
    'Ngày',
    'Cơ sở',
    'Số lượt cảnh báo',
    'Lý do cảnh báo',
    'Đã nhắc nhở',
    'Lỗi app',
    'Trạng thái nhận định',
    'Thời gian phát hiện',
    'Thời gian xử lý',
    'Người xử lý',
    'Email thực hiện',
    'Cập nhật trên hệ thống',
  ];
  const rows = records.map((record) => [
    record.ngay,
    record.coSo,
    record.soLuotCanhBao,
    record.lyDoCanhBao,
    record.daNhacNho ? 'Có' : 'Không',
    record.loiApp ? 'Có' : 'Không',
    record.trangThai,
    record.thoiGianPhatHien,
    record.thoiGianTich,
    record.nguoiXuLy,
    record.emailThucHien,
    record.updatedAt,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');

  return new Response(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'cache-control': 'no-store, max-age=0',
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'inline; filename="nhat-ky-canh-bao.csv"',
    },
  });
};

const getAuditStore = (context) =>
  context?.deploy?.context === 'production'
    ? getStore({ name: STORE_NAME, consistency: 'strong' })
    : getDeployStore({ name: STORE_NAME });
const getErrorMessage = (error) =>
  error instanceof Error ? error.message : 'Không thể lưu trạng thái cảnh báo';
const normalizeText = (value, maxLength = 500) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
const isValidDate = (value) => typeof value === 'string' && ISO_DATE_PATTERN.test(value);
const getRecordKey = (date, facility) =>
  `audits/${date}/${encodeURIComponent(facility.normalize('NFC'))}`;
const getDatePrefix = (date) => `audits/${date}/`;

const validateSameOrigin = (request) => {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
};

const listRecords = async (store, prefix = 'audits/') => {
  const { blobs } = await store.list({ prefix });
  const records = await Promise.all(
    blobs.map(({ key }) => store.get(key, { type: 'json' })),
  );
  return records
    .filter(Boolean)
    .sort((left, right) => {
      const dateOrder = String(right.ngay).localeCompare(String(left.ngay));
      return dateOrder || String(left.coSo).localeCompare(String(right.coSo), 'vi');
    });
};

const normalizeStatus = (value) => VALID_STATUSES.has(value) ? value : 'chua_xu_ly';

const buildSavedRecord = (record, previousRecord = null, preferredStatus) => {
  const now = new Date().toISOString();
  const status = normalizeStatus(preferredStatus ?? record?.loaiTrangThai);
  const reasons = normalizeText(record?.lyDoCanhBao, 2000)
    || normalizeText(previousRecord?.lyDoCanhBao, 2000);
  const reasonCount = Number(record?.soLuotCanhBao);
  const savedReasonCount = Number(previousRecord?.soLuotCanhBao);

  return {
    id: `${normalizeText(record?.coSo, 160)}_${record?.ngay}`,
    coSo: normalizeText(record?.coSo, 160),
    ngay: record?.ngay,
    soLuotCanhBao: Number.isFinite(reasonCount) && reasonCount > 0
      ? Math.min(MAX_DAILY_WARNINGS, Math.floor(reasonCount))
      : Number.isFinite(savedReasonCount) && savedReasonCount > 0
      ? Math.min(MAX_DAILY_WARNINGS, Math.floor(savedReasonCount))
      : Math.max(1, reasons.split(';').filter(Boolean).length),
    lyDoCanhBao: reasons,
    daNhacNho: status === 'da_nhac_nho',
    loiApp: status === 'loi_app',
    trangThai: status === 'da_nhac_nho'
      ? 'Đã nhắc nhở'
      : status === 'loi_app'
      ? 'Lỗi app'
      : 'Chưa nhận định',
    loaiTrangThai: status,
    thoiGianPhatHien: normalizeText(previousRecord?.thoiGianPhatHien, 60)
      || normalizeText(record?.thoiGianPhatHien, 60)
      || now,
    thoiGianTich: status === 'chua_xu_ly'
      ? ''
      : normalizeText(record?.thoiGianTich, 60) || now,
    nguoiXuLy: status === 'chua_xu_ly'
      ? ''
      : normalizeText(record?.nguoiXuLy, 160) || 'Quản lý kiểm tra',
    emailThucHien: status === 'chua_xu_ly'
      ? ''
      : normalizeText(record?.emailThucHien, 200),
    updatedAt: now,
    syncedToSheet: false,
  };
};

const syncRecordsToGoogleSheet = async (records) => {
  if (records.length === 0) return;
  const appsScriptUrl = Netlify.env.get('WARNING_APPS_SCRIPT_URL');
  const apiToken = Netlify.env.get('WARNING_API_TOKEN');

  if (!appsScriptUrl || !apiToken) {
    throw new Error('Netlify chưa có đủ cấu hình Apps Script và API token.');
  }

  const response = await fetch(appsScriptUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      action: 'sync_warning_audits',
      token: apiToken,
      records,
    }),
    signal: AbortSignal.timeout(30000),
  });

  const responseText = await response.text();
  const normalized = responseText.trimStart().toLocaleLowerCase('vi-VN');
  if (normalized.startsWith('<!doctype html') || normalized.startsWith('<html')) {
    throw new Error('Apps Script chưa được triển khai cho quyền truy cập Anyone.');
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error('Apps Script không trả về JSON hợp lệ.');
  }

  if (!response.ok || result?.success !== true) {
    throw new Error(result?.error || `Apps Script HTTP ${response.status}`);
  }
};

const syncAndSaveRecords = async (store, records) => {
  let outputRecords = records;
  let syncWarning = '';
  try {
    await syncRecordsToGoogleSheet(records);
    outputRecords = records.map((record) => ({
      ...record,
      syncedToSheet: true,
      syncError: undefined,
    }));
  } catch (error) {
    syncWarning = getErrorMessage(error);
    outputRecords = records.map((record) => ({
      ...record,
      syncedToSheet: false,
      syncError: syncWarning,
    }));
  }

  await Promise.all(outputRecords.map((record) =>
    store.setJSON(getRecordKey(record.ngay, record.coSo), record),
  ));

  return { records: outputRecords, warning: syncWarning || undefined };
};

const handleGet = async (request, context) => {
  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  const format = url.searchParams.get('format');

  if (format === 'csv') {
    if (date && !isValidDate(date)) {
      return jsonResponse({ success: false, error: 'Ngày tra cứu không hợp lệ.' }, 400);
    }
    const records = await listRecords(
      getAuditStore(context),
      date ? getDatePrefix(date) : 'audits/',
    );
    return csvResponse(records);
  }

  if (!isValidDate(date)) {
    return jsonResponse({ success: false, error: 'Ngày tra cứu không hợp lệ.' }, 400);
  }
  const records = await listRecords(getAuditStore(context), getDatePrefix(date));
  return jsonResponse({ success: true, date, records, count: records.length });
};

const validateRecordIdentity = (record) => {
  const facility = normalizeText(record?.coSo, 160);
  return isValidDate(record?.ngay) && Boolean(facility);
};

const handleUpsert = async (store, payload) => {
  const record = payload?.record;
  const status = normalizeStatus(record?.loaiTrangThai);
  if (!validateRecordIdentity(record) || !VALID_STATUSES.has(status)) {
    return jsonResponse({ success: false, error: 'Dữ liệu ghi nhận không hợp lệ.' }, 400);
  }

  const facility = normalizeText(record.coSo, 160);
  const previousRecord = await store.get(getRecordKey(record.ngay, facility), { type: 'json' });
  const savedRecord = buildSavedRecord({ ...record, coSo: facility }, previousRecord, status);
  const result = await syncAndSaveRecords(store, [savedRecord]);
  return jsonResponse({
    success: true,
    record: result.records[0],
    warning: result.warning,
  });
};

const handleSyncList = async (store, payload) => {
  const date = payload?.date;
  const inputRecords = Array.isArray(payload?.records) ? payload.records.slice(0, MAX_DAILY_WARNINGS) : [];
  if (!isValidDate(date) || inputRecords.some((record) => record?.ngay !== date || !validateRecordIdentity(record))) {
    return jsonResponse({ success: false, error: 'Danh sách cảnh báo không hợp lệ.' }, 400);
  }

  const records = await Promise.all(inputRecords.map(async (record) => {
    const facility = normalizeText(record.coSo, 160);
    const previousRecord = await store.get(getRecordKey(date, facility), { type: 'json' });
    const preservedStatus = previousRecord?.loaiTrangThai || 'chua_xu_ly';
    return buildSavedRecord({ ...record, coSo: facility }, previousRecord, preservedStatus);
  }));
  const result = await syncAndSaveRecords(store, records);
  return jsonResponse({
    success: true,
    date,
    records: result.records,
    count: result.records.length,
    warning: result.warning,
  });
};

const handleResetDate = async (store, payload) => {
  const date = payload?.date;
  if (!isValidDate(date)) {
    return jsonResponse({ success: false, error: 'Ngày cần đặt lại không hợp lệ.' }, 400);
  }
  const existingRecords = await listRecords(store, getDatePrefix(date));
  const resetRecords = existingRecords.map((record) => buildSavedRecord(record, record, 'chua_xu_ly'));
  const result = await syncAndSaveRecords(store, resetRecords);
  return jsonResponse({
    success: true,
    date,
    cleared: result.records.length,
    records: result.records,
    warning: result.warning,
  });
};

export default async (request, context) => {
  if (!validateSameOrigin(request)) {
    return jsonResponse({ success: false, error: 'Nguồn yêu cầu không được phép.' }, 403);
  }
  try {
    if (request.method === 'GET') return await handleGet(request, context);
    if (request.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
    }
    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Nội dung yêu cầu không hợp lệ.' }, 400);
    }
    const store = getAuditStore(context);
    switch (payload?.action) {
      case 'upsert':
        return await handleUpsert(store, payload);
      case 'sync_list':
        return await handleSyncList(store, payload);
      case 'reset_date':
      case 'clear_date':
        return await handleResetDate(store, payload);
      default:
        return jsonResponse({ success: false, error: 'Thao tác không hợp lệ.' }, 400);
    }
  } catch (error) {
    return jsonResponse({ success: false, error: getErrorMessage(error) }, 500);
  }
};

export const config = { path: '/api/warning-audits' };
