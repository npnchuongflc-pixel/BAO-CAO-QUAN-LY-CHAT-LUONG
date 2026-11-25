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

