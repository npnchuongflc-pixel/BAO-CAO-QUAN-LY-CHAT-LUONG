export interface WarningAuditRecord {
  id: string;
  coSo: string;
  ngay: string;
  thoiGianTich: string;
  trangThai: string;
  loaiTrangThai: 'da_nhac_nho' | 'loi_app';
  lyDoCanhBao: string;
  nguoiXuLy?: string;
  emailThucHien?: string;
  updatedAt?: string;
}

export interface WarningFacilityItem {
  coSo: string;
  reasons?: string[];
}

interface WarningApiResponse {
  success: boolean;
  error?: string;
  records?: WarningAuditRecord[];
  record?: WarningAuditRecord;
  cleared?: number;
}

const STORAGE_WARNING_AUDITS_KEY = 'facility_warning_audits_v2';

const parseJsonResponse = async (response: Response): Promise<WarningApiResponse> => {
  const result = await response.json().catch(() => null) as WarningApiResponse | null;
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || `API lưu cảnh báo HTTP ${response.status}`);
  }
  return result;
};

const postWarningAction = async (payload: Record<string, unknown>) => {
  const response = await fetch('/api/warning-audits', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response);
};

export function getLocalWarningAudits(): Record<string, WarningAuditRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_WARNING_AUDITS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('Không thể đọc bản lưu cảnh báo trên trình duyệt:', error);
    return {};
  }
}

export function replaceLocalWarningAudits(records: Record<string, WarningAuditRecord>) {
  try {
    localStorage.setItem(STORAGE_WARNING_AUDITS_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Không thể cập nhật bản lưu cảnh báo trên trình duyệt:', error);
  }
}

export function saveLocalWarningAudit(record: WarningAuditRecord) {
  replaceLocalWarningAudits({ ...getLocalWarningAudits(), [record.id]: record });
}

export function removeLocalWarningAudit(recordId: string) {
  const current = getLocalWarningAudits();
  delete current[recordId];
  replaceLocalWarningAudits(current);
}

export function formatIsoToDateStr(isoDate: string): string {
  const parts = isoDate.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : isoDate;
}

export function getCurrentTimestampStr(): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date()).replace(',', '');
}

export async function fetchWarningAuditsForDate(date: string): Promise<WarningAuditRecord[]> {
  const response = await fetch(`/api/warning-audits?date=${encodeURIComponent(date)}&_=${Date.now()}`, {
    cache: 'no-store',
  });
  const result = await parseJsonResponse(response);
  return result.records || [];
}

export async function saveWarningAudit(record: WarningAuditRecord): Promise<WarningAuditRecord> {
  const result = await postWarningAction({ action: 'upsert', record });
  if (!result.record) throw new Error('Máy chủ không trả về bản ghi vừa lưu.');
  return result.record;
}

export async function deleteWarningAudit(date: string, facility: string): Promise<void> {
  await postWarningAction({ action: 'delete', date, facility });
}

export async function clearWarningAuditsForDate(date: string): Promise<number> {
  const result = await postWarningAction({ action: 'clear_date', date });
  return result.cleared || 0;
}

const escapeCsvCell = (value: unknown) => {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
};

export function downloadWarningAuditsCsv(
  date: string,
  warningFacilities: WarningFacilityItem[],
  audits: Record<string, WarningAuditRecord>,
) {
  const headers = [
    'Ngày',
    'Cơ sở',
    'Trạng thái xử lý',
    'Thời gian ghi nhận',
    'Lý do cảnh báo',
    'Người xử lý',
  ];
  const rows = warningFacilities.map(({ coSo, reasons = [] }) => {
    const audit = audits[`${coSo}_${date}`];
    return [
      formatIsoToDateStr(date),
      coSo,
      audit?.trangThai || 'Chưa xử lý',
      audit?.thoiGianTich || '',
      audit?.lyDoCanhBao || reasons.join('; '),
      audit?.nguoiXuLy || '',
    ];
  });

  const csv = [headers, ...rows]
    .map(row => row.map(escapeCsvCell).join(','))
    .join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `nhat-ky-canh-bao-${date}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
