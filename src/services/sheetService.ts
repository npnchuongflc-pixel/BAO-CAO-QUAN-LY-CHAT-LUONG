import { SheetRowItem } from '../types';

export const SPREADSHEET_ID = '1If65m8-kv10fLlu9DSgvDJCJEpPBdGrieZ7tJ9aXgmo';
export const SHEET_NAME = 'Zalo đánh giá';
export const SOURCE_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?usp=sharing`;
export const INCIDENT_SHEET_GID = '206722729';
export const INCIDENT_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=${INCIDENT_SHEET_GID}#gid=${INCIDENT_SHEET_GID}`;
export const MIN_RANK_REPLIES = 5;

export interface IncidentResolutionItem {
  rawName: string;
  normName: string;
  facility: string;
  rating: number | null;
  assignee: string;
  solutionPlan: string;
  processResult: string;
  completedDate: string;
  processStatus: 'Đã xử lý' | 'Đang xử lý' | 'Chưa xử lý';
}

export function normalizeStudentName(str: string): string {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/^ph\s*(bé)?:?\s*/i, '')
    .replace(/^phụ\s*huynh\s*(bé)?:?\s*/i, '')
    .replace(/^bé\s*:?\s*/i, '')
    .replace(/[()\-–—_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseString(cell: any): string {
  if (cell == null) return '';
  if (typeof cell === 'string') return cell.trim();
  if (typeof cell === 'number' || typeof cell === 'boolean') return String(cell);
  if (typeof cell === 'object') {
    const val = cell.v !== undefined ? cell.v : (cell.f !== undefined ? cell.f : '');
    return val != null ? String(val).trim() : '';
  }
  return String(cell).trim();
}

export function parseDate(val: any): Date | null {
  if (val instanceof Date && !Number.isNaN(val.getTime())) return val;
  if (val == null || val === '') return null;
  const str = String(val).trim();

  // Pattern Date(YYYY,M,D,H,m,s) or Date(202,...)
  let match = str.match(/^Date\((\d{1,4}),\s*(\d{1,2}),\s*(\d{1,2})(?:,\s*(\d{1,2}),\s*(\d{1,2}),\s*(\d{1,2}))?\)/i);
  if (match) {
    let year = +match[1];
    if (year === 202 || (year > 200 && year < 300)) year = 2026;
    return new Date(year, +match[2], +match[3], +(match[4] || 0), +(match[5] || 0), +(match[6] || 0));
  }

  // Pattern DD/MM/YYYY or DD-MM-YYYY (Prioritize Vietnam date format where year is at end)
  match = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    let year = +match[3];
    if (year === 202 || (year > 200 && year < 300)) year = 2026;
    else if (year < 100) year = 2000 + year;
    return new Date(year, +match[2] - 1, +match[1], +(match[4] || 0), +(match[5] || 0), +(match[6] || 0));
  }

  // Pattern YYYY/MM/DD or YYYY-MM-DD (4-digit year at start)
  match = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    let year = +match[1];
    return new Date(year, +match[2] - 1, +match[3], +(match[4] || 0), +(match[5] || 0), +(match[6] || 0));
  }

  return null;
}

export function parseCellDate(cell: any): Date | null {
  return cell ? (parseDate(cell.v) ?? parseDate(cell.f)) : null;
}

export function normalizeSubject(facilityRaw: string, subjectRaw: string): string {
  return `${facilityRaw} ${subjectRaw}`.toLocaleLowerCase('vi').includes('vẽ') ? 'Vẽ' : 'Cờ';
}

export function normalizeFacility(facilityStd: string, facilityRaw: string): string {
  return (facilityStd || facilityRaw)
    .replace(/^Cơ\s*sở\s*/i, '')
    .replace(/^Lớp\s*vẽ\s*/i, '')
    .trim() || 'Chưa xác định';
}

export function parseTableRows(table: any): SheetRowItem[] {
  const rows = table?.rows ?? [];
  return rows.map(({ c = [] }: any) => {
    const subjectRaw = parseString(c[14]);
    const facilityRaw = parseString(c[5]);
    const ratingNum = Number(c[11]?.v ?? parseString(c[11]));

    return {
      student: parseString(c[2]),
      customer: parseString(c[4]),
      facilityRaw,
      sentAt: parseCellDate(c[6]),
      course: parseString(c[9]) || 'Chưa phân loại',
      responseAt: parseCellDate(c[10]),
      rating: ratingNum >= 1 && ratingNum <= 5 ? ratingNum : null,
      detail: parseString(c[12]),
      facility: normalizeFacility(parseString(c[13]), facilityRaw),
      subject: normalizeSubject(facilityRaw, subjectRaw)
    };
  }).filter((item: SheetRowItem) => item.sentAt || item.responseAt);
}

export function parseIncidentTableRows(table: any): IncidentResolutionItem[] {
  const rows = table?.rows ?? [];
  return rows.map(({ c = [] }: any) => {
    const rawName = parseString(c[5]);
    const plan = parseString(c[8]);
    const result = parseString(c[9]);
    const completed = parseString(c[10]);
    const assignee = parseString(c[7]);

    // Trạng thái xử lý:
    // 1. Nếu đã có phương án xử lý (plan) HOẶC kết quả (result) HOẶC ngày hoàn thành (completed) -> ĐÃ XỬ LÝ
    // 2. Nếu chưa có phương án nhưng đã có người/bộ phận tiếp nhận (assignee) -> ĐANG XỬ LÝ
    // 3. Nếu chưa có thông tin nào -> CHƯA XỬ LÝ
    let processStatus: 'Đã xử lý' | 'Đang xử lý' | 'Chưa xử lý' = 'Chưa xử lý';
    if (plan.trim() || result.trim() || completed.trim()) {
      processStatus = 'Đã xử lý';
    } else if (assignee.trim()) {
      processStatus = 'Đang xử lý';
    }

    return {
      rawName,
      normName: normalizeStudentName(rawName),
      facility: parseString(c[1]) || parseString(c[6]),
      rating: Number(c[2]?.v ?? parseString(c[2])) || null,
      assignee,
      solutionPlan: plan,
      processResult: result,
      completedDate: completed,
      processStatus
    };
  }).filter((item: IncidentResolutionItem) => item.rawName.length > 0);
}

export async function fetchIncidentResolutions(): Promise<IncidentResolutionItem[]> {
  // 1. Thử qua backend proxy nội bộ trước (force=true để ép bypass cache khi có cập nhật mới)
  try {
    const res = await fetch(`/api/incident-data?force=true&t=${Date.now()}`);
    if (res.ok) {
      const json = await res.json();
      if (json?.data?.table) {
        return parseIncidentTableRows(json.data.table);
      }
    }
  } catch (e) {
    // tiếp tục fallback
  }

  // 2. Dự phòng: gọi trực tiếp Google Sheets GViz endpoint
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?gid=${INCIDENT_SHEET_GID}&tqx=out:json&t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const text = await res.text();
      const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const json = JSON.parse(jsonStr);
      if (json?.table) {
        return parseIncidentTableRows(json.table);
      }
    }
  } catch (err) {
    console.warn('Lỗi tải dữ liệu phương án xử lý (gid=206722729):', err);
  }
  return [];
}

export function mergeIncidentDataIntoFeedbacks(
  feedbacks: SheetRowItem[],
  incidents: IncidentResolutionItem[]
): SheetRowItem[] {
  return feedbacks.map((item) => {
    const normStudent = normalizeStudentName(item.student);
    const normCustomer = normalizeStudentName(item.customer);

    const match = incidents.find((inc) => {
      if (inc.normName === normStudent || inc.normName === normCustomer) return true;
      if (normStudent && normStudent.length >= 3 && (inc.normName.includes(normStudent) || normStudent.includes(inc.normName))) return true;
      if (normCustomer && normCustomer.length >= 3 && (inc.normName.includes(normCustomer) || normCustomer.includes(inc.normName))) return true;
      return false;
    });

    if (match) {
      // Khi đã có phương án xử lý hoặc kết quả xử lý thì luôn ghi nhận trạng thái là 'Đã xử lý'
      let finalStatus: 'Đã xử lý' | 'Đang xử lý' | 'Chưa xử lý' = match.processStatus;
      if (match.solutionPlan?.trim() || match.processResult?.trim() || match.completedDate?.trim()) {
        finalStatus = 'Đã xử lý';
      }

      return {
        ...item,
        solutionPlan: match.solutionPlan || (match.assignee ? `${match.assignee} tiếp nhận` : ''),
        processResult: match.processResult,
        processStatus: finalStatus,
        assignedPerson: match.assignee,
        completedDate: match.completedDate,
      };
    }

    // Với phản hồi ít sao (<= 3 sao) chưa được ghi nhận trên Sheet xử lý
    if (item.rating && item.rating <= 3) {
      return {
        ...item,
        solutionPlan: '',
        processResult: '',
        processStatus: 'Chưa xử lý',
      };
    }

    // Mặc định phản hồi tốt (4 - 5 sao)
    return {
      ...item,
      solutionPlan: 'Đạt tiêu chuẩn',
      processResult: 'Hài lòng',
      processStatus: 'Đã xử lý',
    };
  });
}

function fetchRawZaloFeedbacks(): Promise<SheetRowItem[]> {
  return new Promise((resolve, reject) => {
    const callbackName = `__zalo_cb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const script = document.createElement('script');
    let timeoutId: number;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      if (script.parentNode) script.parentNode.removeChild(script);
      delete (window as any)[callbackName];
    };

    (window as any)[callbackName] = (res: any) => {
      cleanup();
      try {
        if (!res || !res.table) {
          throw new Error('Dữ liệu Google Sheets không đúng định dạng');
        }
        resolve(parseTableRows(res.table));
      } catch (err) {
        reject(err);
      }
    };

    const handleBackendFallback = () => {
      fetch('/api/sheet-data')
        .then(async r => {
          const t = await r.text().catch(() => '');
          return t ? JSON.parse(t) : null;
        })
        .then(res => {
          if (res?.success && res?.data?.table) {
            resolve(parseTableRows(res.data.table));
          } else {
            reject(new Error(res?.error || 'Không thể tải dữ liệu Google Sheets'));
          }
        })
        .catch(err => reject(err));
    };

    script.onerror = () => {
      cleanup();
      handleBackendFallback();
    };

    timeoutId = window.setTimeout(() => {
      cleanup();
      handleBackendFallback();
    }, 12000);

    const encodedSheet = encodeURIComponent(SHEET_NAME);
    script.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodedSheet}&tqx=out:json;responseHandler:${callbackName}&tq=select%20A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P`;
    document.head.appendChild(script);
  });
}

export async function fetchGoogleSheetData(): Promise<SheetRowItem[]> {
  const [feedbacks, incidents] = await Promise.all([
    fetchRawZaloFeedbacks(),
    fetchIncidentResolutions().catch(() => [] as IncidentResolutionItem[])
  ]);

  return mergeIncidentDataIntoFeedbacks(feedbacks, incidents);
}

export function formatNumber(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(val));
}

export function formatPercent(val: number | null | undefined, decimals = 1): string {
  if (val == null || !Number.isFinite(val)) return '—';
  return `${(val * 100).toFixed(decimals).replace('.', ',')}%`;
}

export function formatRating(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return '—';
  return val.toFixed(2).replace('.', ',');
}

export function formatDate(date: Date | null | undefined, includeTime = false): string {
  if (!date || Number.isNaN(date.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  if (!includeTime) return d;
  return `${d} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatMonthKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function isDateInRange(date: Date | null, start: Date, end: Date): boolean {
  if (!date) return false;
  return date >= start && date <= end;
}

export function getDaysBetween(d1: Date, d2: Date): number {
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
}

export function calculatePercentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx];
}

export function calculateDelta(current: number, previous: number): number | null {
  if (previous) return ((current - previous) / previous) * 100;
  if (current) return 100;
  return null;
}
