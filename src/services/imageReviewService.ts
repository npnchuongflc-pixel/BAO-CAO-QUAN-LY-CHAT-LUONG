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
  nguoiBaoCao: string;
  reviewed: boolean;
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

const parseResponse = async (response: Response): Promise<ImageReviewApiResponse> => {
  const result = await response.json().catch(() => null) as ImageReviewApiResponse | null;
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || `API kiểm duyệt ảnh HTTP ${response.status}`);
  }
  return result;
};

export async function fetchImageReviews(date: string): Promise<ImageReviewRecord[]> {
  const response = await fetch(`/api/image-reviews?date=${encodeURIComponent(date)}&_=${Date.now()}`, {
    cache: 'no-store',
  });
  const result = await parseResponse(response);
  return result.records || [];
}

export async function saveImageReview(record: ImageReviewRecord): Promise<{
  record: ImageReviewRecord;
  warning?: string;
}> {
  const response = await fetch('/api/image-reviews', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'upsert', record }),
  });
  const result = await parseResponse(response);
  if (!result.record) throw new Error('Máy chủ không trả về bản ghi kiểm duyệt vừa lưu.');
  return { record: result.record, warning: result.warning };
}
