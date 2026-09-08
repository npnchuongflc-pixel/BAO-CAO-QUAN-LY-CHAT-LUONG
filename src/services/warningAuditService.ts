export interface WarningAuditRecord {
  id: string;
  coSo: string;
  ngay: string;
  thoiGianTich: string;
  trangThai: string;
  loaiTrangThai: 'chua_xu_ly' | 'da_nhac_nho' | 'loi_app';
  lyDoCanhBao: string;
  soLuotCanhBao?: number;
  daNhacNho?: boolean;
  loiApp?: boolean;
  thoiGianPhatHien?: string;
  nguoiXuLy?: string;
  emailThucHien?: string;
  updatedAt?: string;
  syncedToSheet?: boolean;
  syncError?: string;
}

export interface WarningFacilityItem {
  coSo: string;
  reasons?: string[];
}

interface WarningApiResponse {
  success: boolean;
  error?: string;
  warning?: string;
  records?: WarningAuditRecord[];
  record?: WarningAuditRecord;
  cleared?: number;
}

const STORAGE_WARNING_AUDITS_KEY = 'facility_warning_audits_v2';

const parseJsonResponse = async (response: Response): Promise<WarningApiResponse | null> => {
  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text) as WarningApiResponse;
  } catch {
    return null;
  }
};

const postWarningAction = async (payload: Record<string, unknown>): Promise<WarningApiResponse | null> => {
  try {
    const response = await fetch('/api/warning-audits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseJsonResponse(response);
  } catch (err) {
    console.warn('Backend warning-audits không phản hồi:', err);
    return null;
  }
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
  try {
    const response = await fetch(`/api/warning-audits?date=${encodeURIComponent(date)}&_=${Date.now()}`, {
      cache: 'no-store',
    });
    if (response.ok) {
      const result = await parseJsonResponse(response);
      if (result?.success && Array.isArray(result.records)) {
        return result.records;
      }
    }
  } catch (err) {
    console.warn('Backend warning-audits không phản hồi, sử dụng bộ nhớ trình duyệt:', err);
  }

  // Fallback: Đọc từ localStorage
  const local = getLocalWarningAudits();
  return Object.values(local).filter(r => r.ngay === date);
}

export async function saveWarningAudit(record: WarningAuditRecord): Promise<WarningAuditRecord> {
  // Luôn lưu local trước
  saveLocalWarningAudit(record);

  const result = await postWarningAction({ action: 'upsert', record });
  if (result?.record) return result.record;

  return record;
}

export async function syncWarningFacilitiesForDate(
  date: string,
  warningFacilities: WarningFacilityItem[],
): Promise<{ records: WarningAuditRecord[]; warning?: string }> {
  const records: WarningAuditRecord[] = warningFacilities.map(({ coSo, reasons = [] }) => ({
    id: `${coSo}_${date}`,
    coSo,
    ngay: date,
    thoiGianTich: '',
    trangThai: 'Chưa nhận định',
    loaiTrangThai: 'chua_xu_ly',
    lyDoCanhBao: reasons.join('; '),
    soLuotCanhBao: Math.max(1, reasons.length),
    daNhacNho: false,
    loiApp: false,
  }));

  const result = await postWarningAction({ action: 'sync_list', date, records });
  if (result?.records) {
    return { records: result.records, warning: result.warning };
  }

  // Fallback local storage
  const local = getLocalWarningAudits();
  const merged = records.map(r => local[r.id] || r);
  return { records: merged };
}

export async function resetWarningAuditsForDate(date: string): Promise<WarningAuditRecord[]> {
  const result = await postWarningAction({ action: 'reset_date', date });
  if (result?.records) return result.records;

  // Fallback local storage
  const current = getLocalWarningAudits();
  const remaining: Record<string, WarningAuditRecord> = {};
  Object.entries(current).forEach(([k, v]) => {
    if (v.ngay !== date) remaining[k] = v;
  });
  replaceLocalWarningAudits(remaining);
  return [];
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
    'Số lượt cảnh báo',
    'Lý do cảnh báo',
    'Đã nhắc nhở',
    'Lỗi app',
    'Trạng thái nhận định',
    'Thời gian phát hiện',
    'Thời gian ghi nhận',
    'Người xử lý',
  ];
  const rows = warningFacilities.map(({ coSo, reasons = [] }) => {
    const audit = audits[`${coSo}_${date}`];
    return [
      formatIsoToDateStr(date),
      coSo,
      audit?.soLuotCanhBao || Math.max(1, reasons.length),
      audit?.lyDoCanhBao || reasons.join('; '),
      audit?.loaiTrangThai === 'da_nhac_nho' ? 'Có' : 'Không',
      audit?.loaiTrangThai === 'loi_app' ? 'Có' : 'Không',
      audit?.trangThai || 'Chưa nhận định',
      audit?.thoiGianPhatHien || '',
      audit?.thoiGianTich || '',
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

export async function syncWarningsToGoogleSheet(
  date: string,
  warningFacilities: WarningFacilityItem[],
  audits: Record<string, WarningAuditRecord>,
): Promise<{ success: boolean; message: string; syncedCount: number }> {
  const records = warningFacilities.map(({ coSo, reasons = [] }) => {
    const audit = audits[`${coSo}_${date}`];
    return {
      ngay: formatIsoToDateStr(date),
      coSo,
      soLuotCanhBao: audit?.soLuotCanhBao || Math.max(1, reasons.length),
      soLoi: audit?.soLuotCanhBao || Math.max(1, reasons.length),
      lyDoCanhBao: audit?.lyDoCanhBao || reasons.join('; '),
      daNhacNho: audit?.loaiTrangThai === 'da_nhac_nho' ? 'Có' : 'Không',
      loiApp: audit?.loaiTrangThai === 'loi_app' ? 'Có' : 'Không',
      trangThai: audit?.trangThai || 'Chưa nhận định',
      thoiGianPhatHien: audit?.thoiGianPhatHien || '',
      thoiGianXuLy: audit?.thoiGianTich || '',
      thoiGianTich: audit?.thoiGianTich || '',
      nguoiXuLy: audit?.nguoiXuLy || (audit?.loaiTrangThai && audit.loaiTrangThai !== 'chua_xu_ly' ? 'Quản lý kiểm tra' : ''),
    };
  });

  const targetDateStr = formatIsoToDateStr(date);
  const defaultAppsScriptUrl = 'https://script.google.com/macros/s/AKfycbymAv6NVa-8F3FDxP92_vW8htu7XKAGR0yltiHqDyAWzj80eSMUwH4INaUm-h9dnt6o/exec';
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem('custom_new_sheet_apps_script_url') : null;
  const targetScriptUrl = customUrl?.trim() || defaultAppsScriptUrl;

  // 1. Thử gửi qua server backend nếu có
  try {
    const response = await fetch('/api/sync-warnings-to-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: targetDateStr,
        scriptUrl: targetScriptUrl,
        records,
      }),
    });

    if (response.ok) {
      const text = await response.text().catch(() => '');
      if (text) {
        try {
          const result = JSON.parse(text);
          if (result?.success) return result;
        } catch {
          // ignore non-json
        }
      }
    }
  } catch (apiErr) {
    console.warn('API backend không phản hồi (có thể đang chạy trên host tĩnh Vercel/Netlify), kích hoạt fallback gửi trực tiếp Apps Script:', apiErr);
  }

  // 2. Fallback trực tiếp tới Google Apps Script (Hỗ trợ khi deploy frontend lên Vercel/Netlify/GitHub Pages)
  try {
    const directResponse = await fetch(targetScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sync_warnings',
        sheetName: 'nhắc nhở',
        date: targetDateStr,
        count: records.length,
        records,
        timestamp: new Date().toISOString(),
      }),
    });

    const text = await directResponse.text().catch(() => '');
    if (text) {
      try {
        const directResult = JSON.parse(text);
        if (directResponse.ok && (directResult?.success || directResult?.status === 'ok')) {
          return {
            success: true,
            message: directResult?.message || `Đã đổ chính xác ${records.length} cơ sở cảnh báo sang sheet "nhắc nhở"!`,
            syncedCount: records.length,
          };
        }
      } catch {
        if (text.includes('Page not found') || text.includes('unable to open the file') || text.includes('accounts.google.com')) {
          throw new Error("Link Apps Script chưa mở quyền công khai ('Bất kỳ ai' / Anyone) hoặc URL chưa đúng.");
        }
      }
    }
  } catch (directErr: any) {
    throw new Error(directErr?.message || 'Không thể kết nối Google Apps Script.');
  }

  throw new Error('Đồng bộ sang Google Sheet chưa thành công.');
}
