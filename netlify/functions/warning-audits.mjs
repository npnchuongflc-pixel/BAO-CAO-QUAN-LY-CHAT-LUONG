import { getStore } from '@netlify/blobs';

const STORE_NAME = 'facility-warning-audits';
const VALID_STATUSES = new Set(['da_nhac_nho', 'loi_app']);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
    'Trạng thái xử lý',
    'Loại trạng thái',
    'Thời gian ghi nhận',
    'Lý do cảnh báo',
    'Người xử lý',
    'Email thực hiện',
    'Cập nhật trên hệ thống',
  ];
  const rows = records.map((record) => [
    record.ngay,
    record.coSo,
    record.trangThai,
    record.loaiTrangThai,
    record.thoiGianTich,
    record.lyDoCanhBao,
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

const getAuditStore = () => getStore({ name: STORE_NAME, consistency: 'strong' });
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

const handleGet = async (request) => {
  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  const format = url.searchParams.get('format');

  if (format === 'csv') {
    if (date && !isValidDate(date)) {
      return jsonResponse({ success: false, error: 'Ngày tra cứu không hợp lệ.' }, 400);
    }
    const records = await listRecords(
      getAuditStore(),
      date ? getDatePrefix(date) : 'audits/',
    );
    return csvResponse(records);
  }

  if (!isValidDate(date)) {
    return jsonResponse({ success: false, error: 'Ngày tra cứu không hợp lệ.' }, 400);
  }
  const records = await listRecords(getAuditStore(), getDatePrefix(date));
  return jsonResponse({ success: true, date, records, count: records.length });
};

const handleUpsert = async (store, payload) => {
  const record = payload?.record;
  const date = record?.ngay;
  const facility = normalizeText(record?.coSo, 160);
  const status = record?.loaiTrangThai;
  if (!isValidDate(date) || !facility || !VALID_STATUSES.has(status)) {
    return jsonResponse({ success: false, error: 'Dữ liệu ghi nhận không hợp lệ.' }, 400);
  }

  const savedRecord = {
    id: `${facility}_${date}`,
    coSo: facility,
    ngay: date,
    thoiGianTich: normalizeText(record?.thoiGianTich, 40),
    trangThai: status === 'da_nhac_nho'
      ? 'Đã xác minh và nhắc nhở'
      : 'Đã xác minh do lỗi app',
    loaiTrangThai: status,
    lyDoCanhBao: normalizeText(record?.lyDoCanhBao, 1500),
    nguoiXuLy: normalizeText(record?.nguoiXuLy, 160) || 'Quản lý kiểm tra',
    emailThucHien: normalizeText(record?.emailThucHien, 200),
    updatedAt: new Date().toISOString(),
  };
  await store.setJSON(getRecordKey(date, facility), savedRecord, {
    metadata: { date, facility, status },
  });
  return jsonResponse({ success: true, record: savedRecord });
};

const handleDelete = async (store, payload) => {
  const date = payload?.date;
  const facility = normalizeText(payload?.facility, 160);
  if (!isValidDate(date) || !facility) {
    return jsonResponse({ success: false, error: 'Cơ sở hoặc ngày không hợp lệ.' }, 400);
  }
  await store.delete(getRecordKey(date, facility));
  return jsonResponse({ success: true, date, facility });
};

const handleClearDate = async (store, payload) => {
  const date = payload?.date;
  if (!isValidDate(date)) {
    return jsonResponse({ success: false, error: 'Ngày cần xóa không hợp lệ.' }, 400);
  }
  const { blobs } = await store.list({ prefix: getDatePrefix(date) });
  await Promise.all(blobs.map(({ key }) => store.delete(key)));
  return jsonResponse({ success: true, date, cleared: blobs.length });
};

export default async (request) => {
  if (!validateSameOrigin(request)) {
    return jsonResponse({ success: false, error: 'Nguồn yêu cầu không được phép.' }, 403);
  }
  try {
    if (request.method === 'GET') return await handleGet(request);
    if (request.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
    }
    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Nội dung yêu cầu không hợp lệ.' }, 400);
    }
    const store = getAuditStore();
    switch (payload?.action) {
      case 'upsert':
        return await handleUpsert(store, payload);
      case 'delete':
        return await handleDelete(store, payload);
      case 'clear_date':
        return await handleClearDate(store, payload);
      default:
        return jsonResponse({ success: false, error: 'Thao tác không hợp lệ.' }, 400);
    }
  } catch (error) {
    return jsonResponse({ success: false, error: getErrorMessage(error) }, 500);
  }
};

export const config = { path: '/api/warning-audits' };
