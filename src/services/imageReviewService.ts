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

function getLocalImageReviews(): Record<string, ImageReviewRecord> {
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
  try {
    const response = await fetch(`/api/image-reviews?date=${encodeURIComponent(date)}&_=${Date.now()}`, {
      cache: 'no-store',
    });
    if (response.ok) {
      const result = await parseResponse(response);
      if (result?.success && Array.isArray(result.records)) {
        return result.records;
      }
    }
  } catch (err) {
    console.warn('Backend image-reviews không phản hồi, dùng bộ nhớ trình duyệt:', err);
  }

  // Fallback: Đọc từ localStorage
  const localMap = getLocalImageReviews();
  return Object.values(localMap).filter(r => r.ngay === date);
}

export async function saveImageReview(record: ImageReviewRecord): Promise<{
  record: ImageReviewRecord;
  warning?: string;
}> {
  // Luôn lưu local trước
  saveLocalImageReview(record);

  try {
    const response = await fetch('/api/image-reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'upsert', record }),
    });
    if (response.ok) {
      const result = await parseResponse(response);
      if (result?.success && result?.record) {
        return { record: result.record, warning: result.warning };
      }
    }
  } catch (err) {
    console.warn('Backend không khả dụng khi lưu kiểm duyệt ảnh, đã lưu vào bộ nhớ trình duyệt:', err);
  }

  return { record };
}
