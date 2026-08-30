import Papa from 'papaparse';
import { HygieneReport, FacilityQualityReport } from '../types';
import { INITIAL_HYGIENE_REPORTS, INITIAL_QUALITY_REPORTS } from '../data/mockData';
import { normalizeFacilityName } from '../utils/facilityUtils';
import { normalizeDateToIso } from '../utils/dateUtils';

const SHEET_ID = '1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY';
const HYGIENE_GID = '0';
const HYGIENE_AUDIT_GID = '33769956';
const QUALITY_GID = '1163313960';

const getCompleteCsvExportUrl = (gid: string) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${encodeURIComponent(gid)}`;

export const HYGIENE_CSV_URL = getCompleteCsvExportUrl(HYGIENE_GID);
export const HYGIENE_AUDIT_CSV_URL = getCompleteCsvExportUrl(HYGIENE_AUDIT_GID);
export const QUALITY_CSV_URL = getCompleteCsvExportUrl(QUALITY_GID);

async function readCsvResponse(response: Response): Promise<string> {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const body = await response.text();
  const contentType = response.headers.get('content-type')?.toLowerCase() || '';
  const normalizedBody = body.trimStart().toLocaleLowerCase('vi-VN');

  // Static hosting may rewrite an unknown /api route to index.html with HTTP
  // 200. Treat every HTML response as a failed source so the loader continues
  // to the next full-data CSV instead of parsing the app shell as a sheet.
  const isHtmlResponse =
    contentType.includes('text/html') ||
    normalizedBody.startsWith('<!doctype html') ||
    normalizedBody.startsWith('<html') ||
    normalizedBody.includes('<head>');

  if (isHtmlResponse) {
    throw new Error('Nguồn dữ liệu trả về HTML thay vì CSV');
  }

  // The Express API returns JSON. The direct-browser fallback returns CSV, so
  // support both without ever falling back to the filtered GViz feed.
  if (contentType.includes('application/json') || normalizedBody.startsWith('{')) {
    const result = JSON.parse(body);
    if (result.success && typeof result.data?.csv === 'string' && result.data.csv.trim()) {
      return result.data.csv;
    }
    throw new Error(result.error || 'Dữ liệu CSV không đúng định dạng');
  }

  if (!body.trim()) {
    throw new Error('Google Sheets CSV không khả dụng hoặc cần quyền truy cập');
  }

  // A valid hygiene/quality export always contains a facility column. This
  // protects the report from silently accepting an unrelated text response.
  const firstRow = body.split(/\r?\n/, 1)[0].toLocaleLowerCase('vi-VN');
  if (!firstRow.includes('cơ sở') && !firstRow.includes('facility')) {
    throw new Error('CSV không có cột Cơ sở');
  }

  return body;
}

async function fetchCompleteSheetCsv(gid: string): Promise<string> {
  const sources = [
    `/api/facility-sheet-data?gid=${encodeURIComponent(gid)}&force=true`,
    getCompleteCsvExportUrl(gid),
  ];
  let lastError: unknown;

  for (const source of sources) {
    try {
      const separator = source.includes('?') ? '&' : '?';
      const response = await fetch(`${source}${separator}_=${Date.now()}`, {
        cache: 'no-store',
      });
      return await readCsvResponse(response);
    } catch (error) {
      lastError = error;
      console.warn('Complete facility sheet export unavailable:', error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Không thể tải toàn bộ dữ liệu Google Sheets');
}

// Clean up object keys & values
function getCleanKey(row: Record<string, any>, possibleKeys: string[]): string {
  if (!row) return '';
  const rowKeys = Object.keys(row);
  for (const pKey of possibleKeys) {
    const target = pKey.toLowerCase().trim();
    const foundKey = rowKeys.find(k => k.toLowerCase().trim() === target);
    if (foundKey && row[foundKey] !== undefined) {
      return String(row[foundKey]).trim();
    }
  }
  return '';
}

const DATE_KEYS = [
  'Ngày', 'NGÀY', 'Date', 'DATE', 'Timestamp', 'Dấu thời gian',
  'Thời gian', 'THỜI GIAN', 'Ngày kiểm tra', 'NGÀY KIỂM TRA', 'Thời gian kiểm tra', 'THỜI GIAN KIỂM TRA',
  'Ngày đánh giá', 'NGÀY ĐÁNH GIÁ', 'Ngày thực hiện', 'NGÀY THỰC HIỆN', 'Time Stamp'
];

export async function fetchHygieneFromSheet(): Promise<{ data: HygieneReport[]; isLive: boolean; error?: string }> {
  try {
    const csvText = await fetchCompleteSheetCsv(HYGIENE_GID);
    if (!csvText || csvText.includes('<!DOCTYPE html>')) {
      throw new Error('Cần quyền truy cập hoặc file không công khai CSV');
    }

    const parsed = Papa.parse<Record<string, any>>(csvText, { header: true, skipEmptyLines: true });
    
    if (!parsed.data || parsed.data.length === 0) {
      return { data: INITIAL_HYGIENE_REPORTS, isLive: false };
    }

    const liveReports: HygieneReport[] = [];
    const seenRowKeys = new Set<string>();

    parsed.data.forEach((row, idx) => {
      const rawCoSo = getCleanKey(row, ['Cơ sở', 'CƠ SỞ', 'Facility', 'Chi nhánh', 'CHI NHÁNH', 'Cơ sở/Chi nhánh', 'Địa điểm', 'Tên cơ sở']);
      const coSo = rawCoSo ? normalizeFacilityName(rawCoSo) : '';
      if (!coSo) return; // Ignore rows without a valid facility name

      const rawNgay = getCleanKey(row, DATE_KEYS);
      const ngay = rawNgay ? normalizeDateToIso(rawNgay) : new Date().toISOString().split('T')[0];
      const gio = getCleanKey(row, ['Giờ', 'GIỜ', 'Time']) || '08:00';
      const nguoiKiemTra = getCleanKey(row, ['Người kiểm tra', 'NGƯỜI KIỂM TRA', 'Tên', 'Auditor']) || 'Chưa rõ';
      const khuVuc = getCleanKey(row, ['Khu vực', 'KHU VỰC', 'Area']) || 'Khu vực chung';
      const trangThai = getCleanKey(row, ['Trạng thái', 'TRẠNG THÁI', 'Status']) || 'Đạt';
      const diemRaw = getCleanKey(row, ['Điểm số', 'ĐIỂM SỐ', 'Score']);
      const chiTiet = getCleanKey(row, ['Chi tiết', 'CHI TIẾT', 'Details']) || 'Không có mô tả chi tiết';
      const phanHoi = getCleanKey(row, ['Phản hồi', 'PHẢN HỒI', 'Response']) || '';
      const feedbackNguoiDung = getCleanKey(row, ['Feedback từ người dùng', 'FEEDBACK TỪ NGƯỜI DÙNG', 'Feedback']) || '';
      const linkAnh = getCleanKey(row, ['Link ảnh', 'LINK ẢNH', 'Image']) || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80';

      // Deduplicate exact duplicate submissions (e.g. accidental double form clicks)
      const rowKey = `${ngay}_${gio}_${nguoiKiemTra}_${coSo}_${khuVuc}_${linkAnh}`;
      if (seenRowKeys.has(rowKey)) {
        return;
      }
      seenRowKeys.add(rowKey);

      let diemSo = 85;
      if (diemRaw) {
        const num = parseFloat(diemRaw.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) diemSo = num;
      }

      liveReports.push({
        id: `sheet-hyg-${idx + 1}`,
        ngay,
        gio,
        nguoiKiemTra,
        coSo,
        khuVuc,
        trangThai,
        diemSo,
        diemSoMax: diemSo <= 10 ? 10 : 100,
        chiTiet,
        phanHoi,
        feedbackNguoiDung,
        linkAnh: linkAnh.startsWith('http') ? linkAnh : 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80'
      });
    });

    // Merge live sheet reports with initial historical dataset for dates not present in the live sheet
    const liveDates = new Set(liveReports.map(r => r.ngay));
    const historicalBaseline = INITIAL_HYGIENE_REPORTS.filter(r => !liveDates.has(r.ngay));
    const combined = [...liveReports, ...historicalBaseline];

    return {
      data: combined.length > 0 ? combined : INITIAL_HYGIENE_REPORTS,
      isLive: liveReports.length > 0
    };
  } catch (err: any) {
    console.warn('Cannot fetch hygiene live sheet, fallback to local dataset:', err);
    return {
      data: INITIAL_HYGIENE_REPORTS,
      isLive: false,
      error: err.message || 'Không thể đồng bộ Google Sheet tự động, đang sử dụng dữ liệu mẫu chuẩn'
    };
  }
}

export async function fetchQualityFromSheet(): Promise<{ data: FacilityQualityReport[]; isLive: boolean; error?: string }> {
  try {
    const csvText = await fetchCompleteSheetCsv(QUALITY_GID);
    if (!csvText || csvText.includes('<!DOCTYPE html>')) {
      throw new Error('Cần quyền truy cập hoặc file không công khai CSV');
    }

    const parsed = Papa.parse<Record<string, any>>(csvText, { header: true, skipEmptyLines: true });
    
    if (!parsed.data || parsed.data.length === 0) {
      return { data: INITIAL_QUALITY_REPORTS, isLive: false };
    }

    const liveReports: FacilityQualityReport[] = parsed.data
      .map((row, idx) => {
        const rawNgay = getCleanKey(row, DATE_KEYS);
        const ngay = rawNgay ? normalizeDateToIso(rawNgay) : new Date().toISOString().split('T')[0];
        const gio = getCleanKey(row, ['GIỜ', 'Giờ', 'Time']) || '09:00';
        const ten = getCleanKey(row, ['TÊN', 'Tên', 'Người kiểm tra', 'Name']) || 'Chưa rõ';
        const rawCoSo = getCleanKey(row, ['CƠ SỞ', 'Cơ sở', 'Facility', 'Chi nhánh', 'CHI NHÁNH', 'Cơ sở/Chi nhánh', 'Địa điểm', 'Tên cơ sở']);
        const coSo = rawCoSo ? normalizeFacilityName(rawCoSo) : '';
        const khuVuc = getCleanKey(row, ['KHU VỰC', 'Khu vực', 'Area']) || 'Khu vực chung';
        const mucDo = getCleanKey(row, ['MỨC ĐỘ', 'Mức độ', 'Severity']) || 'Bình thường';
        const trangThaiGhiNhan = getCleanKey(row, ['TRẠNG THÁI GHI NHẬN', 'Trạng thái ghi nhận', 'Trạng thái']) || 'Chờ tiếp nhận';
        const deXuat = getCleanKey(row, ['ĐỀ XUẤT', 'Đề xuất', 'Proposal']) || 'Không có đề xuất thêm';
        const linkAnh = getCleanKey(row, ['LINK ẢNH', 'Link ảnh', 'Image']) || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80';

        return {
          id: `sheet-qual-${idx + 1}`,
          ngay,
          gio,
          ten,
          coSo,
          khuVuc,
          mucDo,
          trangThaiGhiNhan,
          deXuat,
          linkAnh: linkAnh.startsWith('http') ? linkAnh : 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80'
        };
      })
      .filter(item => Boolean(item.coSo));

    const liveDates = new Set(liveReports.map(r => r.ngay));
    const historicalBaseline = INITIAL_QUALITY_REPORTS.filter(r => !liveDates.has(r.ngay));
    const combined = [...liveReports, ...historicalBaseline];

    return {
      data: combined.length > 0 ? combined : INITIAL_QUALITY_REPORTS,
      isLive: liveReports.length > 0
    };
  } catch (err: any) {
    console.warn('Cannot fetch quality live sheet, fallback to local dataset:', err);
    return {
      data: INITIAL_QUALITY_REPORTS,
      isLive: false,
      error: err.message || 'Không thể đồng bộ Google Sheet tự động, đang sử dụng dữ liệu mẫu chuẩn'
    };
  }
}

export interface WarningAuditRecord {
  id: string; // `${coSo}_${ngay}`
  coSo: string;
  ngay: string; // Ngày cảnh báo (YYYY-MM-DD)
  thoiGianTich: string; // 'DD/MM/YYYY HH:mm:ss'
  trangThai: 'Đã xác minh và nhắc nhở' | 'Đã xác minh do lỗi app' | 'Đã kiểm tra và nhắc nhở' | 'Đã kiểm tra và lỗi app' | string;
  loaiTrangThai: 'da_nhac_nho' | 'loi_app';
  lyDoCanhBao: string;
  nguoiXuLy?: string;
  emailThucHien?: string;
  ghiChu?: string;
  syncedToSheet?: boolean;
}

export const STORAGE_WARNING_AUDITS_KEY = 'facility_warning_audits_v1';
export const STORAGE_WEBHOOK_URL_KEY = 'facility_warning_webhook_url_v1';

export function getLocalWarningAudits(): Record<string, WarningAuditRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_WARNING_AUDITS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Error reading warning audits from localStorage:', e);
    return {};
  }
}

export function saveLocalWarningAudit(record: WarningAuditRecord) {
  try {
    const current = getLocalWarningAudits();
    current[record.id] = record;
    localStorage.setItem(STORAGE_WARNING_AUDITS_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Error saving warning audit to localStorage:', e);
  }
}

export function removeLocalWarningAudit(recordId: string) {
  try {
    const current = getLocalWarningAudits();
    delete current[recordId];
    localStorage.setItem(STORAGE_WARNING_AUDITS_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Error removing warning audit from localStorage:', e);
  }
}

export async function sendWarningAuditToGoogleSheet(
  record: WarningAuditRecord,
  customWebhookUrl?: string
): Promise<{ success: boolean; message: string }> {
  const webhookUrl = customWebhookUrl || localStorage.getItem(STORAGE_WEBHOOK_URL_KEY);

  if (!webhookUrl) {
    return {
      success: true,
      message: 'Đã lưu ghi nhận vào hệ thống thành công.'
    };
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timestamp: record.thoiGianTich,
        ngayXet: record.ngay,
        coSo: record.coSo,
        ketQua: record.trangThai,
        loaiKetQua: record.loaiTrangThai,
        lyDo: record.lyDoCanhBao,
        nguoiXuLy: record.nguoiXuLy || 'Quản lý',
        ghiChu: record.ghiChu || ''
      })
    });

    return {
      success: true,
      message: 'Đã gửi ghi nhận thành công về Google Sheet!'
    };
  } catch (err: any) {
    console.warn('Error sending audit to Google Sheets Webhook:', err);
    return {
      success: false,
      message: `Không thể gửi về Google Sheet: ${err.message || 'Lỗi kết nối'}`
    };
  }
}
