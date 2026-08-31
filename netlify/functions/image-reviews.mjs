import { getDeployStore, getStore } from '@netlify/blobs';

const STORE_NAME = 'facility-image-reviews';
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_REVIEW_STATUSES = new Set(['pending', 'approved', 'rejected']);

const jsonResponse = (payload, status = 200) =>
  Response.json(payload, {
    status,
    headers: { 'cache-control': 'no-store, max-age=0' },
  });

const normalizeText = (value, maxLength = 500) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
const isValidDate = (value) => typeof value === 'string' && ISO_DATE_PATTERN.test(value);
const getReviewStore = (context) =>
  context?.deploy?.context === 'production'
    ? getStore({ name: STORE_NAME, consistency: 'strong' })
    : getDeployStore({ name: STORE_NAME });
const getDatePrefix = (date) => `reviews/${date}/`;
const getRecordKey = (date, id) => `${getDatePrefix(date)}${encodeURIComponent(id)}`;

const validateSameOrigin = (request) => {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
};

const getErrorMessage = (error) =>
  error instanceof Error ? error.message : 'Không thể lưu kiểm duyệt ảnh';

const listRecords = async (date, context) => {
  const store = getReviewStore(context);
  const { blobs } = await store.list({ prefix: getDatePrefix(date) });
  const records = await Promise.all(
    blobs.map(({ key }) => store.get(key, { type: 'json' })),
  );
  return records
    .filter(Boolean)
    .sort((left, right) => String(left.coSo).localeCompare(String(right.coSo), 'vi'));
};

const syncRecordToGoogleSheet = async (record) => {
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
      action: 'upsert_image_review',
      token: apiToken,
      record,
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
  return result;
};

const handleGet = async (request, context) => {
  const date = new URL(request.url).searchParams.get('date');
  if (!isValidDate(date)) {
    return jsonResponse({ success: false, error: 'Ngày tra cứu không hợp lệ.' }, 400);
  }
  const records = await listRecords(date, context);
  return jsonResponse({ success: true, date, records, count: records.length });
};

const handleUpsert = async (payload, context) => {
  const record = payload?.record;
  const id = normalizeText(record?.id, 240);
  const date = record?.ngay;
  const facility = normalizeText(record?.coSo, 160);
  const imageUrl = normalizeText(record?.linkAnh, 3000);
  const reviewer = normalizeText(record?.nguoiKiemDuyet, 160);
  const reviewStatus = normalizeText(record?.reviewStatus, 20)
    || (record?.reviewed === true ? 'approved' : 'pending');
  const reviewed = reviewStatus === 'approved';

  if (!id || !isValidDate(date) || !facility || !imageUrl.startsWith('http')) {
    return jsonResponse({ success: false, error: 'Dữ liệu kiểm duyệt ảnh không hợp lệ.' }, 400);
  }
  if (!VALID_REVIEW_STATUSES.has(reviewStatus)) {
    return jsonResponse({ success: false, error: 'Trạng thái kiểm duyệt ảnh không hợp lệ.' }, 400);
  }
  if (reviewStatus !== 'pending' && !reviewer) {
    return jsonResponse({ success: false, error: 'Vui lòng nhập tên người kiểm duyệt.' }, 400);
  }

  const now = new Date().toISOString();
  let savedRecord = {
    id,
    reportId: normalizeText(record?.reportId, 240),
    ngay: date,
    gio: normalizeText(record?.gio, 40),
    coSo: facility,
    khuVuc: normalizeText(record?.khuVuc, 240),
    linkAnh: imageUrl,
    nguoiBaoCao: normalizeText(record?.nguoiBaoCao, 160),
    reviewed,
    reviewStatus,
    trangThaiKiemDuyet: reviewStatus === 'approved'
      ? 'Đã duyệt'
      : reviewStatus === 'rejected'
      ? 'Không đạt'
      : 'Chưa duyệt',
    nguoiKiemDuyet: reviewer,
    thoiGianKiemDuyet: normalizeText(record?.thoiGianKiemDuyet, 60) || now,
    updatedAt: now,
    syncedToSheet: false,
  };

  let syncWarning = '';
  try {
    await syncRecordToGoogleSheet(savedRecord);
    savedRecord = { ...savedRecord, syncedToSheet: true };
  } catch (error) {
    syncWarning = getErrorMessage(error);
    savedRecord = { ...savedRecord, syncError: syncWarning };
  }

  const store = getReviewStore(context);
  await store.setJSON(getRecordKey(date, id), savedRecord);

  return jsonResponse({
    success: true,
    record: savedRecord,
    warning: syncWarning || undefined,
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

    if (payload?.action !== 'upsert') {
      return jsonResponse({ success: false, error: 'Thao tác không hợp lệ.' }, 400);
    }
    return await handleUpsert(payload, context);
  } catch (error) {
    return jsonResponse({ success: false, error: getErrorMessage(error) }, 500);
  }
};

export const config = { path: '/api/image-reviews' };
