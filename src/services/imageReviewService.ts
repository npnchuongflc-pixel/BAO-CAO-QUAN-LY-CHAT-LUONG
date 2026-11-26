import Papa from 'papaparse';
import { HygieneReport } from '../components/facility/facilityTypes';
import { normalizeDateToIso } from '../utils/dateUtils';
import { normalizeFacilityName } from '../utils/facilityUtils';

export interface ImageReviewRecord {
  id: string;
  reportId: string;
  ngay: string;
  gio: string;
  coSo: string;
  khuVuc: string;
  linkAnh: string;
  rowIndex?: number;
  nguoiBaoCao: string;
  trangThai?: string;
  diemSo?: number;
  chiTiet?: string;
  phanHoi?: string;
  feedbackNguoiDung?: string;
  reviewed: boolean;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  trangThaiKiemDuyet: string;
  nguoiKiemDuyet: string;
  thoiGianKiemDuyet: string;
  updatedAt?: string;
  syncedToSheet?: boolean;
  syncError?: string;
}

export interface SyncedImageReviewLookup {
  byId: Record<string, ImageReviewRecord>;
  byLink: Record<string, ImageReviewRecord>;
  byTimeKey: Record<string, ImageReviewRecord>;
  byAreaKey: Record<string, ImageReviewRecord>;
}

export const EMPTY_SYNCED_REVIEW_LOOKUP: SyncedImageReviewLookup = {
  byId: {},
  byLink: {},
  byTimeKey: {},
  byAreaKey: {},
};

interface ImageReviewApiResponse {
  success: boolean;
  error?: string;
  warning?: string;
  records?: ImageReviewRecord[];
  record?: ImageReviewRecord;
}

const hashText = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const getImageReviewId = (report: HygieneReport) => {
  const identity = [
    normalizeDateToIso(report.ngay),
    normalizeFacilityName(report.coSo),
    report.khuVuc,
    report.linkAnh,
  ].join('|');
  return `image-${hashText(identity)}`;
};

const normReviewLink = (val?: string) => {
  if (!val) return '';
  const m = String(val).match(/https?:\/\/[^\s"'\)]+/i);
  return m ? m[0].split('?')[0].trim().toLowerCase() : String(val).trim().toLowerCase();
};

const normReviewText = (val?: string) =>
  String(val || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const normReviewTime = (val?: string) => {
  const s = String(val || '').trim();
  const m = s.match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : s;
};

export function extractReviewerName(raw?: string): string {
  const val = String(raw || '').trim();
  if (!val) return '';
  const withoutParen = val.replace(/\([^)]*\)/g, '').trim();
  const norm = withoutParen.toLowerCase();
  if (!withoutParen || norm === 'đã duyệt' || norm === 'lỗi ai' || norm === 'không đạt' || norm === 'chưa duyệt') {
    return '';
  }
  return withoutParen;
}

function parseReviewNoteTimestampMs(raw?: string): number {
  const val = String(raw || '').trim();
  if (!val) return 0;
  const m = val.match(/\((\d{1,2}):(\d{2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\)/);
  if (m) {
    const [, h, min, s, d, mon, y] = m;
    return new Date(Number(y), Number(mon) - 1, Number(d), Number(h), Number(min), Number(s)).getTime();
  }
  const parsed = Date.parse(val);
  return Number.isNaN(parsed) ? 0 : parsed;
}

const LOCAL_IMAGE_REVIEWS_STORAGE_KEY = 'facility_image_reviews_v1';

export function getLocalImageReviews(): Record<string, ImageReviewRecord> {
  try {
    const raw = localStorage.getItem(LOCAL_IMAGE_REVIEWS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalImageReview(record: ImageReviewRecord) {
  try {
    const data = getLocalImageReviews();
    data[record.id] = record;
    localStorage.setItem(LOCAL_IMAGE_REVIEWS_STORAGE_KEY, JSON.stringify(data));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('facility-image-reviews-updated'));
    }
  } catch {}
}

const parseResponse = async (response: Response): Promise<ImageReviewApiResponse | null> => {
  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text) as ImageReviewApiResponse;
  } catch {
    return null;
  }
};

export async function fetchImageReviews(date: string): Promise<ImageReviewRecord[]> {
  const merged = new Map<string, ImageReviewRecord>();
  const localMap = getLocalImageReviews();
  Object.values(localMap)
    .filter(r => r.ngay === date)
    .forEach(r => merged.set(r.id, r));

  try {
    const response = await fetch(`/api/image-reviews?date=${encodeURIComponent(date)}&_=${Date.now()}`, {
      cache: 'no-store',
    });
    if (response.ok) {
      const result = await parseResponse(response);
      if (result?.success && Array.isArray(result.records)) {
        result.records.forEach(r => merged.set(r.id, r));
      }
    }
  } catch (err) {
    console.warn('Backend image-reviews không phản hồi, dùng bộ nhớ trình duyệt:', err);
  }

  return Array.from(merged.values());
}

const getRowField = (row: Record<string, any>, candidates: string[]): string => {
  const keys = Object.keys(row || {});
  for (const candidate of candidates) {
    const target = candidate.toLowerCase().trim();
    const matched = keys.find(k => k.toLowerCase().trim() === target);
    if (matched && row[matched] !== undefined && row[matched] !== null) {
      return String(row[matched]).trim();
    }
  }
  return '';
};

const buildReviewRecordIdentity = (ngay: string, coSo: string, khuVuc: string, linkAnh: string) =>
  `image-${hashText([normalizeDateToIso(ngay), normalizeFacilityName(coSo), khuVuc, linkAnh].join('|'))}`;

async function loadMasterReviewSheetCsv(force = false): Promise<string> {
  const sources = [
    `/api/hygiene-review-sheet-data${force ? '?force=true' : ''}`,
    `https://docs.google.com/spreadsheets/d/1003lfdUh6S_Tkg5H4qChw7KrziAon1uvgkoFMj9FK0E/export?format=csv&gid=0`,
  ];
  for (const source of sources) {
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(15_000), cache: 'no-store' });
      if (!response.ok) continue;
      const body = await response.text();
      const ct = response.headers.get('content-type')?.toLowerCase() || '';
      if (ct.includes('application/json') || body.trimStart().startsWith('{')) {
        const parsedJson = JSON.parse(body);
        if (parsedJson?.success && typeof parsedJson?.data?.csv === 'string' && parsedJson.data.csv.trim()) {
          return parsedJson.data.csv;
        }
        continue;
      }
      if (body && !body.trimStart().toLowerCase().startsWith('<!doctype html') && !body.trimStart().toLowerCase().startsWith('<html')) {
        return body;
      }
    } catch {
      // Fallback to next source
    }
  }
  return '';
}

function indexReviewRecord(lookup: SyncedImageReviewLookup, record: ImageReviewRecord) {
  if (record.id) lookup.byId[record.id] = record;
  const linkKey = normReviewLink(record.linkAnh);
  if (linkKey) lookup.byLink[linkKey] = record;

  const iso = normalizeDateToIso(record.ngay);
  const fac = normReviewText(normalizeFacilityName(record.coSo) || record.coSo);
  const area = normReviewText(record.khuVuc);
  const time = normReviewTime(record.gio);
  if (iso && fac && area) {
    if (time) lookup.byTimeKey[`${iso}|${fac}|${area}|${time}`] = record;
    lookup.byAreaKey[`${iso}|${fac}|${area}`] = record;
  }
}

export async function fetchAllSyncedImageReviews(force = false): Promise<SyncedImageReviewLookup> {
  const lookup: SyncedImageReviewLookup = {
    byId: {},
    byLink: {},
    byTimeKey: {},
    byAreaKey: {},
  };

  // 1. Master Google Sheet ("Kiểm duyệt vệ sinh" - 1003lfdUh6S_Tkg5H4qChw7KrziAon1uvgkoFMj9FK0E)
  try {
    const csvText = await loadMasterReviewSheetCsv(force);
    if (csvText) {
      const parsed = Papa.parse<Record<string, any>>(csvText, { header: true, skipEmptyLines: true });
      for (const row of parsed.data || []) {
        const ngay = normalizeDateToIso(getRowField(row, ['Ngày', 'NGÀY', 'Date']));
        const gio = getRowField(row, ['Giờ', 'GIỜ', 'Time']);
        const rawCoSo = getRowField(row, ['Cơ sở', 'CƠ SỞ', 'Facility']);
        const coSo = rawCoSo ? normalizeFacilityName(rawCoSo) : '';
        const khuVuc = getRowField(row, ['Khu vực', 'KHU VỰC', 'Area']);
        const linkAnh = getRowField(row, ['Link ảnh', 'LINK ẢNH', 'Image']);
        const daDuyet = getRowField(row, ['Đã duyệt', 'ĐÃ DUYỆT', 'Approved']);
        const khongDat = getRowField(row, ['Lỗi AI', 'LỖI AI', 'Không đạt', 'KHÔNG ĐẠT', 'Rejected']);
        const nguoiBaoCao = getRowField(row, ['Người kiểm tra', 'NGƯỜI KIỂM TRA']);

        if (!ngay || !coSo) continue;

        let reviewStatus: 'pending' | 'approved' | 'rejected' = 'pending';
        let reviewNote = '';
        if (daDuyet && khongDat) {
          const tApproved = parseReviewNoteTimestampMs(daDuyet);
          const tRejected = parseReviewNoteTimestampMs(khongDat);
          if (tApproved >= tRejected) {
            reviewStatus = 'approved';
            reviewNote = daDuyet;
          } else {
            reviewStatus = 'rejected';
            reviewNote = khongDat;
          }
        } else if (daDuyet) {
          reviewStatus = 'approved';
          reviewNote = daDuyet;
        } else if (khongDat) {
          reviewStatus = 'rejected';
          reviewNote = khongDat;
        }

        if (reviewStatus === 'pending') continue;

        const reviewer = extractReviewerName(reviewNote);
        const noteTs = parseReviewNoteTimestampMs(reviewNote);
        const rec: ImageReviewRecord = {
          id: buildReviewRecordIdentity(ngay, coSo, khuVuc, linkAnh),
          reportId: '',
          ngay,
          gio,
          coSo,
          khuVuc,
          linkAnh,
          nguoiBaoCao,
          reviewed: reviewStatus === 'approved',
          reviewStatus,
          trangThaiKiemDuyet: reviewStatus === 'approved' ? 'Đã duyệt' : 'Lỗi AI',
          nguoiKiemDuyet: reviewer || 'Nhân viên',
          thoiGianKiemDuyet: noteTs > 0 ? new Date(noteTs).toISOString() : '',
          updatedAt: noteTs > 0 ? new Date(noteTs).toISOString() : undefined,
          syncedToSheet: true,
        };
        indexReviewRecord(lookup, rec);
      }
    }
  } catch (err) {
    console.warn('Không thể tải kết quả kiểm duyệt ảnh từ Google Sheet:', err);
  }

  // 2. Backend in-memory store (covers immediate reviews saved in active session)
  try {
    const resp = await fetch(`/api/image-reviews?all=1&_=${Date.now()}`, { cache: 'no-store' });
    if (resp.ok) {
      const json = await parseResponse(resp);
      if (json?.success && Array.isArray(json.records)) {
        for (const rec of json.records) {
          if (rec.reviewStatus === 'approved' || rec.reviewStatus === 'rejected') {
            indexReviewRecord(lookup, rec);
          } else if (rec.reviewStatus === 'pending') {
            // If explicitly reset to pending on backend, clear sheet entry if newer
            const existing = lookup.byId[rec.id] || lookup.byLink[normReviewLink(rec.linkAnh)];
            const recTime = parseReviewNoteTimestampMs(rec.updatedAt || rec.thoiGianKiemDuyet);
            const existingTime = existing ? parseReviewNoteTimestampMs(existing.updatedAt || existing.thoiGianKiemDuyet) : 0;
            if (!existing || recTime >= existingTime) {
              indexReviewRecord(lookup, rec);
            }
          }
        }
      }
    }
  } catch {
    // Backend unavailable, keep sheet records
  }

  return lookup;
}

export function resolveSyncedImageReview(
  report: HygieneReport,
  localReviews: Record<string, ImageReviewRecord>,
  syncedLookup: SyncedImageReviewLookup,
): { status: 'pending' | 'approved' | 'rejected'; reviewer: string } {
  const reportId = getImageReviewId(report);
  const localRec = localReviews[reportId];

  const linkKey = normReviewLink(report.linkAnh);
  const iso = normalizeDateToIso(report.ngay);
  const fac = normReviewText(normalizeFacilityName(report.coSo) || report.coSo);
  const area = normReviewText(report.khuVuc);
  const time = normReviewTime(report.gio);

  const remoteRec =
    syncedLookup.byId[reportId] ||
    (linkKey ? syncedLookup.byLink[linkKey] : undefined) ||
    (iso && fac && area && time ? syncedLookup.byTimeKey[`${iso}|${fac}|${area}|${time}`] : undefined) ||
    (iso && fac && area ? syncedLookup.byAreaKey[`${iso}|${fac}|${area}`] : undefined);

  let chosenRec: ImageReviewRecord | undefined = remoteRec;
  if (localRec) {
    if (!remoteRec || !localRec.syncedToSheet) {
      chosenRec = localRec;
    } else {
      const localTs = parseReviewNoteTimestampMs(localRec.updatedAt || localRec.thoiGianKiemDuyet);
      const remoteTs = parseReviewNoteTimestampMs(remoteRec.updatedAt || remoteRec.thoiGianKiemDuyet);
      if (localTs >= remoteTs) {
        chosenRec = localRec;
      }
    }
  }

  if (chosenRec) {
    if (chosenRec.reviewStatus === 'approved') {
      return {
        status: 'approved',
        reviewer: extractReviewerName(chosenRec.nguoiKiemDuyet) || chosenRec.nguoiKiemDuyet?.trim() || 'Nhân viên',
      };
    }
    if (chosenRec.reviewStatus === 'rejected') {
      return {
        status: 'rejected',
        reviewer: extractReviewerName(chosenRec.nguoiKiemDuyet) || chosenRec.nguoiKiemDuyet?.trim() || 'Nhân viên',
      };
    }
    if (chosenRec.reviewStatus === 'pending') {
      return { status: 'pending', reviewer: '' };
    }
    if (chosenRec.reviewed) {
      return {
        status: 'approved',
        reviewer: extractReviewerName(chosenRec.nguoiKiemDuyet) || chosenRec.nguoiKiemDuyet?.trim() || 'Nhân viên',
      };
    }
  }

  if (report.khongDat?.trim()) {
    return {
      status: 'rejected',
      reviewer: extractReviewerName(report.khongDat) || 'Nhân viên',
    };
  }
  if (report.daDuyet?.trim()) {
    return {
      status: 'approved',
      reviewer: extractReviewerName(report.daDuyet) || 'Nhân viên',
    };
  }

  return { status: 'pending', reviewer: '' };
}

import { syncReviewDirectToSheet, batchSyncReviewsDirectToSheet } from './googleSheetsDirectReviewService';

export async function saveImageReview(record: ImageReviewRecord, scriptUrl?: string): Promise<{
  record: ImageReviewRecord;
  warning?: string;
}> {
  // Luôn lưu local trước
  saveLocalImageReview(record);

  // 1. Thử đồng bộ trực tiếp Google Sheets API v4 (khi người dùng đã đăng nhập Google)
  let syncedDirectly = false;
  try {
    const directResult = await syncReviewDirectToSheet(record);
    if (directResult.success) {
      syncedDirectly = true;
      record.syncedToSheet = true;
      delete record.syncError;
      saveLocalImageReview(record);
    }
  } catch (e) {
    console.warn('Google Sheets API direct sync fallback:', e);
  }

  // 2. Lưu vào backend store (+ Apps Script Web App nếu chưa đồng bộ trực tiếp qua Google Sheets API)
  try {
    const response = await fetch('/api/image-reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert',
        record,
        scriptUrl,
        skipSheetSync: syncedDirectly,
      }),
    });
    if (response.ok) {
      const result = await parseResponse(response);
      if (result?.success && result?.record) {
        return {
          record: syncedDirectly ? { ...result.record, syncedToSheet: true } : result.record,
          warning: syncedDirectly ? undefined : result.warning,
        };
      }
    }
  } catch (err) {
    console.warn('Backend không khả dụng khi lưu kiểm duyệt ảnh, đã lưu vào bộ nhớ trình duyệt:', err);
  }

  return { record };
}

export async function batchSaveImageReviews(records: ImageReviewRecord[], scriptUrl?: string): Promise<{
  records: ImageReviewRecord[];
  warning?: string;
}> {
  records.forEach(r => saveLocalImageReview(r));

  // 1. Thử đồng bộ batch qua Google Sheets API v4 trực tiếp
  let syncedDirectly = false;
  try {
    const batchRes = await batchSyncReviewsDirectToSheet(records);
    if (batchRes.success && batchRes.updatedCount > 0) {
      syncedDirectly = true;
      records.forEach(r => {
        r.syncedToSheet = true;
        delete r.syncError;
        saveLocalImageReview(r);
      });
    }
  } catch (e) {
    console.warn('Direct batch sync fallback:', e);
  }

  // 2. Lưu vào backend store (+ Apps Script Web App nếu chưa đồng bộ trực tiếp)
  try {
    const response = await fetch('/api/image-reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'batch_upsert',
        records,
        scriptUrl,
        skipSheetSync: syncedDirectly,
      }),
    });
    if (response.ok) {
      const result = await parseResponse(response);
      if (result?.success && Array.isArray(result.records)) {
        return {
          records: result.records,
          warning: syncedDirectly ? undefined : result.warning,
        };
      }
    }
  } catch (err) {
    console.warn('Backend không khả dụng khi lưu kiểm duyệt ảnh hàng loạt:', err);
  }

  return { records };
}

