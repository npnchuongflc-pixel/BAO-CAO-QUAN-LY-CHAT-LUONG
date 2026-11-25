import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  CloudUpload,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  History,
  Image as ImageIcon,
  RefreshCw,
  RotateCcw,
  Settings,
  Sparkles,
  User,
  X,
  Zap,
} from 'lucide-react';
import { HygieneReport } from './facilityTypes';
import {
  OFFICIAL_FACILITIES,
  getFacilityDailyTarget,
  normalizeFacilityName,
} from '../../utils/facilityUtils';
import { normalizeDateToIso } from '../../utils/dateUtils';
import {
  batchSaveImageReviews,
  fetchImageReviews,
  getImageReviewId,
  ImageReviewRecord,
  saveImageReview,
} from '../../services/imageReviewService';
import { initAuth, googleSignIn, logout, getCurrentUser } from '../../services/workspaceAuth';
import { User as FirebaseUser } from 'firebase/auth';
import {
  DEFAULT_MASTER_SPREADSHEET_ID,
  getTargetSpreadsheetId,
  setTargetSpreadsheetId,
  cleanDuplicateReviewsInSheet,
  syncLowScoreRecordsDirectToSheet,
} from '../../services/googleSheetsDirectReviewService';

type ReviewStatus = 'pending' | 'approved' | 'rejected';
type ImageFilter = 'all' | ReviewStatus;

interface YesterdayHygieneReviewProps {
  dateIso: string;
  dateDisplay: string;
  reports: HygieneReport[];
  selectedFacilityFilter?: string;
}

const IMAGE_REVIEWER_STORAGE_KEY = 'yesterday-image-reviewer-demo-v1';
const NEW_SHEET_STORAGE_KEY = 'new-sheet-apps-script-url-v2';
const DEFAULT_NEW_SHEET_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwM1RqSb0F1rZnMetAXarUlaW2J0SmZQQyfkkU-Puk6sz8vhYaIuYY1TfDAtheG1LFI/exec';
const HYGIENE_PLACEHOLDER_IMAGE = 'images.unsplash.com/photo-1581578731548-c64695cc6952';
const LOW_SCORE_THRESHOLD = 80;

import { APPS_SCRIPT_TEMPLATE } from "./hygieneAppsScriptTemplate";
export { APPS_SCRIPT_TEMPLATE };

const getScore100 = (report: HygieneReport) => {
  let score = Number(report.diemSo ?? 0);
  if (Number.isNaN(score)) return 0;
  if (
    (report.diemSoMax && report.diemSoMax <= 10 && score <= 10) ||
    (!report.diemSoMax && score > 0 && score <= 10)
  ) {
    score *= 10;
  }
  return score;
};

const isLowScoreImageReport = (report: HygieneReport) =>
  Boolean(report.linkAnh?.trim() && !report.linkAnh.includes(HYGIENE_PLACEHOLDER_IMAGE)) &&
  getScore100(report) < LOW_SCORE_THRESHOLD;

const formatReviewedTime = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatIsoToDisplay = (iso: string): string => {
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
};

const shiftIsoDate = (iso: string, deltaDays: number): string => {
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return iso;
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + deltaDays));
  return dt.toISOString().slice(0, 10);
};

const getReviewStatus = (record?: ImageReviewRecord, report?: HygieneReport): ReviewStatus => {
  if (record?.reviewStatus === 'approved' || record?.reviewStatus === 'rejected') {
    return record.reviewStatus;
  }
  if (record?.reviewed) return 'approved';
  if (report?.daDuyet?.trim()) return 'approved';
  if (report?.khongDat?.trim()) return 'rejected';
  return 'pending';
};

export const YesterdayHygieneReview: React.FC<YesterdayHygieneReviewProps> = ({
  dateIso,
  dateDisplay,
  reports,
  selectedFacilityFilter = 'all',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDateIso, setSelectedDateIso] = useState<string>('');
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [filter, setFilter] = useState<ImageFilter>('all');
  const [reviewerError, setReviewerError] = useState(false);
  const [imageReviews, setImageReviews] = useState<Record<string, ImageReviewRecord>>({});
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);

  const activeDateIso = selectedDateIso || dateIso;
  const isCustomDateSelected = Boolean(selectedDateIso && selectedDateIso !== dateIso);
  const activeDateDisplay = useMemo(
    () => (isCustomDateSelected ? formatIsoToDisplay(activeDateIso) : dateDisplay),
    [activeDateIso, dateDisplay, isCustomDateSelected],
  );
  const maxSelectableDateIso = useMemo(() => {
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return dateIso > todayIso ? dateIso : todayIso;
  }, [dateIso]);

  const handleSelectDate = (nextIso: string) => {
    const normalized = nextIso.trim();
    if (!normalized || normalized === dateIso) {
      setSelectedDateIso('');
    } else {
      setSelectedDateIso(normalized);
    }
    setSelectedFacility(null);
    setSyncAllStatus(null);
    setIsExpanded(true);
  };
  const [syncNotice, setSyncNotice] = useState<{
    tone: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const [reviewerName, setReviewerName] = useState(() => {
    try {
      if (typeof window === 'undefined') return '';
      return window.localStorage.getItem(IMAGE_REVIEWER_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const DEFAULT_NEW_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwM1RqSb0F1rZnMetAXarUlaW2J0SmZQQyfkkU-Puk6sz8vhYaIuYY1TfDAtheG1LFI/exec';
  const [newSheetScriptUrl, setNewSheetScriptUrl] = useState(() => {
    try {
      if (typeof window === 'undefined') return DEFAULT_NEW_SHEET_URL;
      const saved = window.localStorage.getItem(NEW_SHEET_STORAGE_KEY);
      if (!saved || saved.includes('AKfycbz0Kalu') || saved.includes('AKfycbxmPSQ')) {
        window.localStorage.setItem(NEW_SHEET_STORAGE_KEY, DEFAULT_NEW_SHEET_URL);
        return DEFAULT_NEW_SHEET_URL;
      }
      return saved || DEFAULT_NEW_SHEET_URL;
    } catch {
      return DEFAULT_NEW_SHEET_URL;
    }
  });
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllStatus, setSyncAllStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isTriggeringAutoSync, setIsTriggeringAutoSync] = useState(false);

  // Google Sheets Workspace OAuth integration state
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(() => getCurrentUser());
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [targetSpreadsheetId, setTargetSpreadsheetState] = useState(() => getTargetSpreadsheetId());

  useEffect(() => {
    const unsubscribe = initAuth(
      user => {
        setGoogleUser(user);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
    setIsGoogleSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setGoogleUser(res.user);
        setSyncNotice({
          tone: 'success',
          message: `✓ Đã kết nối Google Sheets (${res.user.email}). Tích kiểm duyệt sẽ lưu trực tiếp vào Sheet!`,
        });
      }
    } catch (err: any) {
      setSyncNotice({
        tone: 'error',
        message: err?.message || 'Không thể đăng nhập Google.',
      });
    } finally {
      setIsGoogleSigningIn(false);
    }
  };
  const [autoSyncInfo, setAutoSyncInfo] = useState<{
    enabled: boolean;
    configuredUrl: string;
    hasFullUrl: boolean;
    targetYesterdayDate: string;
    lastAutoSyncDate: string;
    recentLogs: Array<{
      id: string;
      date: string;
      timestamp: string;
      count: number;
      status: 'success' | 'error';
      message: string;
    }>;
    scheduleInfo: string;
  } | null>(null);

  const [autoSyncNotice, setAutoSyncNotice] = useState<{
    status: 'idle' | 'syncing' | 'synced' | 'error';
    message: string;
    time?: string;
  }>({ status: 'idle', message: '' });
  const autoSyncedDateRef = useRef<string>('');

  const fetchAutoSyncStatus = async () => {
    try {
      const res = await fetch('/api/auto-sync-status');
      if (!res.ok) return;
      const text = await res.text().catch(() => '');
      if (!text) return;
      try {
        const data = JSON.parse(text);
        if (data?.success) {
          setAutoSyncInfo(data);
        }
      } catch {
        // Not valid JSON, ignore
      }
    } catch {
      // Ignore background fetch error
    }
  };

  useEffect(() => {
    fetchAutoSyncStatus();
    // Also sync local storage script URL to backend if present
    if (newSheetScriptUrl.trim()) {
      fetch('/api/auto-sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptUrl: newSheetScriptUrl.trim() }),
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoadingReviews(true);
    setSyncNotice(null);

    fetchImageReviews(activeDateIso)
      .then(records => {
        if (!active) return;
        setImageReviews(Object.fromEntries(records.map(record => [record.id, record])));
      })
      .catch(error => {
        if (!active) return;
        setSyncNotice({
          tone: 'error',
          message: error instanceof Error ? error.message : 'Không thể tải trạng thái kiểm duyệt.',
        });
      })
      .finally(() => {
        if (active) setIsLoadingReviews(false);
      });

    return () => {
      active = false;
    };
  }, [activeDateIso]);

  useEffect(() => {
    try {
      window.localStorage.setItem(IMAGE_REVIEWER_STORAGE_KEY, reviewerName);
    } catch {
      // The employee can re-enter their name when browser storage is unavailable.
    }
  }, [reviewerName]);

  const targetFacilities = useMemo(() => {
    if (!selectedFacilityFilter || selectedFacilityFilter === 'all') {
      return OFFICIAL_FACILITIES;
    }
    return [normalizeFacilityName(selectedFacilityFilter) || selectedFacilityFilter];
  }, [selectedFacilityFilter]);

  useEffect(() => {
    if (selectedFacility && selectedFacilityFilter !== 'all' && selectedFacility !== (normalizeFacilityName(selectedFacilityFilter) || selectedFacilityFilter)) {
      setSelectedFacility(null);
    }
  }, [selectedFacility, selectedFacilityFilter]);

  const facilityRows = useMemo(() => {
    const reportsForDate = reports.filter(
      report => normalizeDateToIso(report.ngay) === activeDateIso,
    );

    return targetFacilities.map(coSo => {
      const facilityReports = reportsForDate.filter(
        report => normalizeFacilityName(report.coSo) === coSo,
      );
      const allImages = facilityReports.filter(report => (
        report.linkAnh?.trim() && !report.linkAnh.includes(HYGIENE_PLACEHOLDER_IMAGE)
      ));
      const images = allImages.filter(report => getScore100(report) < LOW_SCORE_THRESHOLD);
      const target = getFacilityDailyTarget(coSo, activeDateIso);
      const performed = facilityReports.length;
      const progress = target > 0 ? Math.min(100, (performed / target) * 100) : 0;
      const scores = facilityReports.map(getScore100);
      const averageScore = scores.length
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;

      return {
        coSo,
        reports: facilityReports,
        allImagesCount: allImages.length,
        images,
        target,
        performed,
        progress,
        averageScore,
      };
    }).sort((left, right) => right.images.length - left.images.length || left.coSo.localeCompare(right.coSo, 'vi'));
  }, [activeDateIso, reports, targetFacilities]);

  const selectedRow = useMemo(
    () => facilityRows.find(row => row.coSo === selectedFacility) || null,
    [facilityRows, selectedFacility],
  );

  const totalAllImages = useMemo(
    () => facilityRows.reduce((sum, row) => sum + row.allImagesCount, 0),
    [facilityRows],
  );
  const totalImages = useMemo(
    () => facilityRows.reduce((sum, row) => sum + row.images.length, 0),
    [facilityRows],
  );
  const reviewSummary = useMemo(() => {
    let approved = 0;
    let rejected = 0;
    facilityRows.forEach(row => row.images.forEach(image => {
      const status = getReviewStatus(imageReviews[getImageReviewId(image)], image);
      if (status === 'approved') approved += 1;
      if (status === 'rejected') rejected += 1;
    }));
    return {
      approved,
      rejected,
      pending: Math.max(0, totalImages - approved - rejected),
    };
  }, [facilityRows, imageReviews, totalImages]);
  const visibleRows = useMemo(
    () => facilityRows.filter(row => row.images.length > 0),
    [facilityRows],
  );

  const selectedImages = useMemo(() => {
    if (!selectedRow) return [];
    return selectedRow.images.filter(image => {
      const status = getReviewStatus(imageReviews[getImageReviewId(image)], image);
      if (filter !== 'all') return status === filter;
      return true;
    });
  }, [filter, imageReviews, selectedRow]);

  const setImageReviewStatus = async (report: HygieneReport, requestedStatus: ReviewStatus) => {
    const reviewId = getImageReviewId(report);
    let cleanReviewer = reviewerName.trim();
    if (!cleanReviewer) {
      cleanReviewer = (googleUser?.displayName ? googleUser.displayName.split(' ')[0] : '') || 'Chương';
      setReviewerName(cleanReviewer);
    }
    const previousRecord = imageReviews[reviewId];
    const currentStatus = getReviewStatus(previousRecord, report);
    const nextStatus: ReviewStatus = currentStatus === requestedStatus ? 'pending' : requestedStatus;

    setReviewerError(false);
    setSyncNotice(null);
    const timestamp = new Date().toISOString();
    const optimisticRecord: ImageReviewRecord = {
      id: reviewId,
      reportId: report.id,
      rowIndex: report.rowIndex,
      ngay: activeDateIso,
      gio: report.gio || '',
      coSo: report.coSo,
      khuVuc: report.khuVuc || '',
      linkAnh: report.linkAnh,
      nguoiBaoCao: report.nguoiKiemTra || '',
      trangThai: report.trangThai || '',
      diemSo: Math.round(getScore100(report) * 10) / 10,
      chiTiet: report.chiTiet || '',
      phanHoi: report.phanHoi || '',
      feedbackNguoiDung: report.feedbackNguoiDung || '',
      reviewed: nextStatus === 'approved',
      reviewStatus: nextStatus,
      trangThaiKiemDuyet: nextStatus === 'approved'
        ? 'Đã duyệt'
        : nextStatus === 'rejected'
        ? 'Lỗi AI'
        : 'Chưa duyệt',
      nguoiKiemDuyet: cleanReviewer || previousRecord?.nguoiKiemDuyet || '',
      thoiGianKiemDuyet: timestamp,
      syncedToSheet: false,
    };

    setImageReviews(current => ({ ...current, [reviewId]: optimisticRecord }));
    setSavingReviewId(reviewId);

    try {
      const result = await saveImageReview(optimisticRecord, newSheetScriptUrl);
      setImageReviews(current => ({ ...current, [reviewId]: result.record }));
      setSyncNotice(result.warning
        ? { tone: 'warning', message: `Đã lưu trên hệ thống; Google Sheet: ${result.warning}` }
        : { tone: 'success', message: '✓ Đã tự động đổ về Google Sheet & xóa kết quả cũ!' });
    } catch (error) {
      setImageReviews(current => {
        const next = { ...current };
        if (previousRecord) next[reviewId] = previousRecord;
        else delete next[reviewId];
        return next;
      });
      setSyncNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Không thể lưu kiểm duyệt ảnh.',
      });
    } finally {
      setSavingReviewId(null);
    }
  };

  const [isBatchSaving, setIsBatchSaving] = useState(false);

  const handleBatchApproveFacility = async () => {
    if (!selectedRow || !selectedRow.images.length) return;
    const cleanReviewer = reviewerName.trim();
    if (!cleanReviewer) {
      setReviewerError(true);
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn duyệt đạt toàn bộ ${selectedRow.images.length} ảnh của cơ sở "${selectedRow.coSo}" và cập nhật vào Google Sheet không?`
    );
    if (!confirmed) return;

    setReviewerError(false);
    setSyncNotice(null);
    setIsBatchSaving(true);

    const timestamp = new Date().toISOString();
    const updatedRecords: ImageReviewRecord[] = selectedRow.images.map(report => {
      const reviewId = getImageReviewId(report);
      return {
        id: reviewId,
        reportId: report.id,
        rowIndex: report.rowIndex,
        ngay: activeDateIso,
        gio: report.gio || '',
        coSo: report.coSo,
        khuVuc: report.khuVuc || '',
        linkAnh: report.linkAnh,
        nguoiBaoCao: report.nguoiKiemTra || '',
        trangThai: report.trangThai || '',
        diemSo: Math.round(getScore100(report) * 10) / 10,
        chiTiet: report.chiTiet || '',
        phanHoi: report.phanHoi || '',
        feedbackNguoiDung: report.feedbackNguoiDung || '',
        reviewed: true,
        reviewStatus: 'approved',
        trangThaiKiemDuyet: 'Đã duyệt',
        nguoiKiemDuyet: cleanReviewer,
        thoiGianKiemDuyet: timestamp,
        syncedToSheet: false,
      };
    });

    setImageReviews(current => {
      const next = { ...current };
      updatedRecords.forEach(rec => {
        next[rec.id] = rec;
      });
      return next;
    });

    try {
      const result = await batchSaveImageReviews(updatedRecords, newSheetScriptUrl);
      if (result.records) {
        setImageReviews(current => {
          const next = { ...current };
          result.records.forEach(rec => {
            next[rec.id] = rec;
          });
          return next;
        });
      }
      setSyncNotice({
        tone: 'success',
        message: `✓ Đã duyệt đạt tất cả ${updatedRecords.length} ảnh và cập nhật trực tiếp hàng trong Sheet!`
      });
    } catch (error) {
      setSyncNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Không thể lưu duyệt hàng loạt.',
      });
    } finally {
      setIsBatchSaving(false);
    }
  };

  const handleBatchResetFacility = async () => {
    if (!selectedRow || !selectedRow.images.length) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn đặt lại (chưa duyệt) toàn bộ ${selectedRow.images.length} ảnh của cơ sở "${selectedRow.coSo}" không?`
    );
    if (!confirmed) return;

    setSyncNotice(null);
    setIsBatchSaving(true);

    const timestamp = new Date().toISOString();
    const updatedRecords: ImageReviewRecord[] = selectedRow.images.map(report => {
      const reviewId = getImageReviewId(report);
      return {
        id: reviewId,
        reportId: report.id,
        rowIndex: report.rowIndex,
        ngay: activeDateIso,
        gio: report.gio || '',
        coSo: report.coSo,
        khuVuc: report.khuVuc || '',
        linkAnh: report.linkAnh,
        nguoiBaoCao: report.nguoiKiemTra || '',
        trangThai: report.trangThai || '',
        diemSo: Math.round(getScore100(report) * 10) / 10,
        chiTiet: report.chiTiet || '',
        phanHoi: report.phanHoi || '',
        feedbackNguoiDung: report.feedbackNguoiDung || '',
        reviewed: false,
        reviewStatus: 'pending',
        trangThaiKiemDuyet: 'Chưa duyệt',
        nguoiKiemDuyet: '',
        thoiGianKiemDuyet: timestamp,
        syncedToSheet: false,
      };
    });

    setImageReviews(current => {
      const next = { ...current };
      updatedRecords.forEach(rec => {
        next[rec.id] = rec;
      });
      return next;
    });

    try {
      const result = await batchSaveImageReviews(updatedRecords, newSheetScriptUrl);
      if (result.records) {
        setImageReviews(current => {
          const next = { ...current };
          result.records.forEach(rec => {
            next[rec.id] = rec;
          });
          return next;
        });
      }
      setSyncNotice({
        tone: 'success',
        message: `✓ Đã bỏ lựa chọn ${updatedRecords.length} ảnh và cập nhật hàng tương ứng trong Sheet!`
      });
    } catch (error) {
      setSyncNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Không thể cập nhật.',
      });
    } finally {
      setIsBatchSaving(false);
    }
  };

  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const handleCleanDuplicateReviews = async () => {
    setIsCleaningDuplicates(true);
    setSyncNotice(null);
    try {
      const res = await cleanDuplicateReviewsInSheet(activeDateIso, targetSpreadsheetId);
      setSyncNotice({
        tone: res.success ? 'success' : 'warning',
        message: res.message,
      });
      if (res.success && res.cleanedCount > 0) {
        fetchImageReviews(activeDateIso).then(records => {
          setImageReviews(Object.fromEntries(records.map(record => [record.id, record])));
        });
      }
    } catch (err: any) {
      setSyncNotice({
        tone: 'error',
        message: err.message || 'Lỗi khi dọn dẹp hàng trùng',
      });
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const openFacility = (facilityName: string) => {
    setSelectedFacility(facilityName);
    setFilter('all');
    setReviewerError(false);
  };

  const closeFacility = () => {
    setSelectedFacility(null);
    setReviewerError(false);
  };

  const selectedCounts = useMemo(() => {
    if (!selectedRow) return { approved: 0, rejected: 0, pending: 0 };
    let approved = 0;
    let rejected = 0;
    selectedRow.images.forEach(image => {
      const status = getReviewStatus(imageReviews[getImageReviewId(image)], image);
      if (status === 'approved') approved += 1;
      if (status === 'rejected') rejected += 1;
    });
    return {
      approved,
      rejected,
      pending: Math.max(0, selectedRow.images.length - approved - rejected),
    };
  }, [imageReviews, selectedRow]);

  useEffect(() => {
    try {
      window.localStorage.setItem(NEW_SHEET_STORAGE_KEY, newSheetScriptUrl);
    } catch {
      // ignore
    }
  }, [newSheetScriptUrl]);

  const reportsForDate = useMemo(() => {
    return reports.filter(report => {
      if (normalizeDateToIso(report.ngay) !== activeDateIso) return false;
      if (selectedFacilityFilter && selectedFacilityFilter !== 'all') {
        const normTarget = normalizeFacilityName(selectedFacilityFilter) || selectedFacilityFilter;
        return (normalizeFacilityName(report.coSo) || report.coSo) === normTarget;
      }
      return true;
    });
  }, [reports, activeDateIso, selectedFacilityFilter]);

  const allDayReportsForDate = useMemo(() => {
    return reports.filter(report => normalizeDateToIso(report.ngay) === activeDateIso);
  }, [reports, activeDateIso]);

  const allDayPreparedRecords = useMemo(() => {
    return allDayReportsForDate
      .filter(isLowScoreImageReport)
      .map(report => {
        const reviewId = getImageReviewId(report);
        const review = imageReviews[reviewId];
        const reviewStatus = getReviewStatus(review, report);
        const reviewer = review?.nguoiKiemDuyet || (reviewStatus === 'approved' ? (report.daDuyet || 'Đã duyệt') : reviewStatus === 'rejected' ? (report.khongDat || 'Lỗi AI') : '');
        const reviewTime = review?.thoiGianKiemDuyet ? new Date(review.thoiGianKiemDuyet).toLocaleString('vi-VN') : '';
        const reviewNote = reviewer ? (reviewTime ? `${reviewer} (${reviewTime})` : reviewer) : '';

        const daDuyet = reviewStatus === 'approved' ? (reviewNote || 'Đã duyệt') : '';
        const khongDat = reviewStatus === 'rejected' ? (reviewNote || 'Lỗi AI') : '';

        return {
          ngay: report.ngay,
          gio: report.gio,
          nguoiKiemTra: report.nguoiKiemTra,
          coSo: report.coSo,
          khuVuc: report.khuVuc,
          trangThai: report.trangThai,
          diemSo: Math.round(getScore100(report) * 10) / 10,
          chiTiet: report.chiTiet,
          phanHoi: report.phanHoi,
          feedbackNguoiDung: report.feedbackNguoiDung,
          linkAnh: report.linkAnh,
          daDuyet,
          khongDat,
          loiAi: khongDat,
        };
      });
  }, [allDayReportsForDate, imageReviews]);

  const preparedDateRecords = useMemo(() => {
    return reportsForDate
      .filter(isLowScoreImageReport)
      .map(report => {
        const reviewId = getImageReviewId(report);
        const review = imageReviews[reviewId];
        const reviewStatus = getReviewStatus(review, report);
        const reviewer = review?.nguoiKiemDuyet || (reviewStatus === 'approved' ? (report.daDuyet || 'Đã duyệt') : reviewStatus === 'rejected' ? (report.khongDat || 'Lỗi AI') : '');
        const reviewTime = review?.thoiGianKiemDuyet ? new Date(review.thoiGianKiemDuyet).toLocaleString('vi-VN') : '';
        const reviewNote = reviewer ? (reviewTime ? `${reviewer} (${reviewTime})` : reviewer) : '';

        const daDuyet = reviewStatus === 'approved' ? (reviewNote || 'Đã duyệt') : '';
        const khongDat = reviewStatus === 'rejected' ? (reviewNote || 'Lỗi AI') : '';

        return {
          ngay: report.ngay,
          gio: report.gio,
          nguoiKiemTra: report.nguoiKiemTra,
          coSo: report.coSo,
          khuVuc: report.khuVuc,
          trangThai: report.trangThai,
          diemSo: Math.round(getScore100(report) * 10) / 10,
          chiTiet: report.chiTiet,
          phanHoi: report.phanHoi,
          feedbackNguoiDung: report.feedbackNguoiDung,
          linkAnh: report.linkAnh,
          daDuyet,
          khongDat,
          loiAi: khongDat,
        };
      });
  }, [reportsForDate, imageReviews]);

  // TỰ ĐỘNG ĐỔ DỮ LIỆU ẢNH ĐIỂM THẤP (<80Đ) VỀ GOOGLE SHEET (CHỈ TỰ ĐỘNG CHO NGÀY MẶC ĐỊNH)
  useEffect(() => {
    if (isCustomDateSelected || !allDayReportsForDate.length || isLoadingReviews) return;
    const targetScriptUrl = newSheetScriptUrl.trim() || DEFAULT_NEW_SHEET_APPS_SCRIPT_URL;
    if (!targetScriptUrl && !googleUser) return;

    // Đã tự động đổ cho ngày này trong phiên này rồi thì không chạy lại
    if (autoSyncedDateRef.current === activeDateIso) return;

    const timer = setTimeout(async () => {
      try {
        setAutoSyncNotice({
          status: 'syncing',
          message: allDayPreparedRecords.length > 0
            ? `Đang tự động ghi ${allDayPreparedRecords.length} ảnh điểm thấp (<80đ) về Google Sheet...`
            : `Đang đồng bộ danh sách ngày ${activeDateDisplay} (0 ảnh <80đ)...`,
        });

        let isSuccess = false;

        // 0. Nếu đã đăng nhập Google Workspace -> cập nhật trực tiếp tiêu đề 'Lỗi AI' & thêm các dòng <80đ còn thiếu
        if (googleUser) {
          try {
            const directApiRes = await syncLowScoreRecordsDirectToSheet(
              activeDateIso,
              allDayPreparedRecords,
              targetSpreadsheetId
            );
            if (directApiRes.success) {
              isSuccess = true;
            }
          } catch (e) {
            console.warn('Direct Google Sheets API auto-sync fallback:', e);
          }
        }

        // 1. Thử gửi qua backend server (khi có Apps Script URL)
        if (!isSuccess && targetScriptUrl) {
          try {
            const res = await fetch('/api/sync-day-to-new-sheet', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                date: activeDateIso,
                scriptUrl: targetScriptUrl,
                records: allDayPreparedRecords,
                onlyLowScore: true,
                allowEmptyReplace: true,
                isAuto: true,
              }),
            });
            const text = await res.text().catch(() => '');
            if (text) {
              try {
                const data = JSON.parse(text);
                if (res.ok && data?.success) {
                  isSuccess = true;
                }
              } catch {}
            }
          } catch (e) {
            console.warn('Backend auto-sync không phản hồi, thử fallback trực tiếp:', e);
          }
        }

        // 2. Fallback gửi trực tiếp Google Apps Script
        if (!isSuccess && targetScriptUrl) {
          try {
            const directResp = await fetch(targetScriptUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'sync_full_day_hygiene_reviews',
                date: activeDateIso,
                count: allDayPreparedRecords.length,
                records: allDayPreparedRecords,
                onlyLowScore: true,
                allowEmptyReplace: true,
                timestamp: new Date().toISOString(),
              }),
            });
            const text = await directResp.text().catch(() => '');
            if (text) {
              try {
                const directData = JSON.parse(text);
                if (directResp.ok && (directData?.success || directData?.status === 'ok')) {
                  isSuccess = true;
                }
              } catch {}
            }
          } catch (e) {
            console.warn('Direct Apps Script auto-sync failed:', e);
          }
        }

        if (isSuccess) {
          autoSyncedDateRef.current = activeDateIso;
          const timeStr = new Date().toLocaleTimeString('vi-VN');
          setAutoSyncNotice({
            status: 'synced',
            message: allDayPreparedRecords.length > 0
              ? `✓ Đã tự động ghi ${allDayPreparedRecords.length} ảnh điểm <80đ về Google Sheet`
              : `✓ Ngày ${activeDateDisplay} không có ảnh <80đ (Sheet đã được giữ gọn)`,
            time: timeStr,
          });
        }
      } catch (err: any) {
        console.warn('Lỗi tự động đổ dữ liệu ngầm:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isCustomDateSelected, activeDateIso, activeDateDisplay, allDayReportsForDate.length, isLoadingReviews, allDayPreparedRecords, newSheetScriptUrl, googleUser, targetSpreadsheetId]);

  const handleDownloadCsv = () => {
    if (!preparedDateRecords.length) {
      setSyncAllStatus({ type: 'error', message: 'Không có ảnh điểm thấp (<80đ) nào trong ngày này để tải về.' });
      return;
    }
    const headers = [
      'Ngày', 'Giờ', 'Người kiểm tra', 'Cơ sở', 'Khu vực',
      'Trạng thái', 'Điểm số', 'Chi tiết', 'Phản hồi',
      'Feedback từ người dùng', 'Link ảnh', 'Đã duyệt', 'Lỗi AI'
    ];
    const escapeCsv = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = preparedDateRecords.map(r => [
      r.ngay, r.gio, r.nguoiKiemTra, r.coSo, r.khuVuc,
      r.trangThai, r.diemSo, r.chiTiet, r.phanHoi,
      r.feedbackNguoiDung, r.linkAnh, r.daDuyet, r.khongDat
    ]);
    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kiem-duyet-anh-duoi-80d-${activeDateIso}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSyncAllStatus({ type: 'success', message: `Đã xuất file CSV với ${preparedDateRecords.length} ảnh điểm <80đ thành công!` });
  };

  const handleSyncAllToNewSheet = async () => {
    if (!reportsForDate.length) {
      setSyncAllStatus({ type: 'error', message: 'Không có dữ liệu kiểm tra vệ sinh nào trong ngày này để ghi.' });
      return;
    }

    const confirmMsg = preparedDateRecords.length > 0
      ? `Hành động này sẽ chỉ ghi ${preparedDateRecords.length} ảnh điểm thấp (<80đ) ngày ${activeDateDisplay} vào bảng tính Google Sheets của bạn (loại bỏ các ảnh đạt ≥80đ). Bạn có muốn tiếp tục không?`
      : `Ngày ${activeDateDisplay} không có ảnh nào dưới 80đ. Bạn có muốn cập nhật để xóa các dòng ≥80đ cũ của ngày này trên Google Sheet không?`;
    const confirmed = window.confirm(confirmMsg);
    if (!confirmed) return;

    setIsSyncingAll(true);
    setSyncAllStatus(null);
    try {
      let isSuccess = false;
      let successMsg = '';

      // 1. Thử qua backend nếu server có endpoint
      try {
        const res = await fetch('/api/sync-day-to-new-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: activeDateIso,
            scriptUrl: newSheetScriptUrl.trim() || undefined,
            records: preparedDateRecords,
            onlyLowScore: true,
            allowEmptyReplace: true,
          }),
        });
        const text = await res.text().catch(() => '');
        if (text) {
          try {
            const data = JSON.parse(text);
            if (res.ok && data?.success) {
              isSuccess = true;
              successMsg = data.message || `Đã ghi nhận ${preparedDateRecords.length} ảnh điểm <80đ sang Google Sheet thành công!`;
            }
          } catch {
            // Non-JSON response, ignore
          }
        }
      } catch (e) {
        console.warn('API backend chưa phản hồi, chuyển sang đồng bộ trực tiếp Apps Script:', e);
      }

      // 2. Fallback: Gửi trực tiếp đến Google Apps Script từ trình duyệt
      if (!isSuccess) {
        const targetUrl = newSheetScriptUrl.trim() || DEFAULT_NEW_SHEET_APPS_SCRIPT_URL;
        let directErrorHint = '';
        try {
          const directResp = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'sync_full_day_hygiene_reviews',
              date: activeDateIso,
              count: preparedDateRecords.length,
              records: preparedDateRecords,
              onlyLowScore: true,
              allowEmptyReplace: true,
              timestamp: new Date().toISOString(),
            }),
          });
          const text = await directResp.text().catch(() => '');
          if (text) {
            try {
              const directData = JSON.parse(text);
              if (directResp.ok && (directData?.success || directData?.status === 'ok')) {
                isSuccess = true;
                successMsg = directData?.message || `Đã ghi nhận ${preparedDateRecords.length} ảnh điểm <80đ sang Google Sheet thành công!`;
              }
            } catch {
              if (text.includes('Page not found') || text.includes('unable to open the file') || text.includes('accounts.google.com')) {
                directErrorHint = "Link Web App Google Apps Script chưa được cấp quyền công khai hoặc đã bị thay đổi URL. Vui lòng vào Apps Script > 'Triển khai mới' > chọn 'Người có quyền truy cập' là 'Bất kỳ ai' (Anyone).";
              }
            }
          }
        } catch (err: any) {
          directErrorHint = err.message || 'Không thể kết nối trực tiếp đến Google Apps Script.';
        }

        if (!isSuccess && directErrorHint) {
          throw new Error(directErrorHint);
        }
      }

      if (isSuccess) {
        setSyncAllStatus({
          type: 'success',
          message: successMsg,
        });
      } else {
        setSyncAllStatus({
          type: 'error',
          message: 'Đồng bộ sang Sheet mới chưa thành công. Vui lòng kiểm tra lại kết nối mạng hoặc URL Apps Script.',
        });
      }
    } catch (err: any) {
      setSyncAllStatus({
        type: 'error',
        message: err.message || 'Lỗi mạng kết nối máy chủ.',
      });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleTriggerDailyAutoSyncNow = async () => {
    setIsTriggeringAutoSync(true);
    setSyncAllStatus(null);
    try {
      let isSuccess = false;
      let successMsg = '';
      let directErrorHint = '';

      // 1. Thử gọi backend /api/trigger-daily-sync
      try {
        const res = await fetch('/api/trigger-daily-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: activeDateIso,
            scriptUrl: newSheetScriptUrl.trim() || undefined,
          }),
        });
        const text = await res.text().catch(() => '');
        if (text) {
          try {
            const data = JSON.parse(text);
            if (res.ok && data?.success) {
              isSuccess = true;
              successMsg = data.message || `Đã tự động lấy và đổ ${data.count || 0} dòng sang Sheet Mới thành công!`;
              fetchAutoSyncStatus();
            }
          } catch {
            // Non-JSON response, ignore
          }
        }
      } catch (e) {
        console.warn('Backend trigger không phản hồi, kích hoạt fallback đổ trực tiếp:', e);
      }

      // 2. Fallback: Nếu backend không phản hồi (ví dụ deploy trên Vercel/Netlify không có server Node.js),
      // tự động đổ danh sách dữ liệu hiện tại trực tiếp sang Web App Google Apps Script!
      if (!isSuccess && preparedDateRecords.length > 0) {
        const targetUrl = newSheetScriptUrl.trim() || DEFAULT_NEW_SHEET_APPS_SCRIPT_URL;
        try {
          const directResp = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'sync_full_day_hygiene_reviews',
              date: activeDateIso,
              count: preparedDateRecords.length,
              records: preparedDateRecords,
              timestamp: new Date().toISOString(),
            }),
          });
          const text = await directResp.text().catch(() => '');
          if (text) {
            try {
              const directData = JSON.parse(text);
              if (directResp.ok && (directData?.success || directData?.status === 'ok')) {
                isSuccess = true;
                successMsg = directData?.message || `Đã tự động đổ ${preparedDateRecords.length} dòng sang Sheet mới thành công!`;
              }
            } catch {
              if (text.includes('Page not found') || text.includes('unable to open the file') || text.includes('accounts.google.com')) {
                directErrorHint = "Link Web App Google Apps Script chưa được cấp quyền công khai hoặc đã bị thay đổi URL. Vui lòng vào Apps Script > 'Triển khai mới' > chọn 'Người có quyền truy cập' là 'Bất kỳ ai' (Anyone).";
              }
            }
          }
        } catch (err: any) {
          directErrorHint = err.message || 'Không thể kết nối trực tiếp đến Google Apps Script.';
        }

        if (!isSuccess && directErrorHint) {
          throw new Error(directErrorHint);
        }
      }

      if (isSuccess) {
        setSyncAllStatus({
          type: 'success',
          message: successMsg,
        });
      } else {
        setSyncAllStatus({
          type: 'error',
          message: 'Tự động đổ dữ liệu chưa thành công. Vui lòng kiểm tra lại URL Google Apps Script.',
        });
      }
    } catch (err: any) {
      setSyncAllStatus({
        type: 'error',
        message: err.message || 'Lỗi mạng khi kích hoạt tự động đổ dữ liệu.',
      });
    } finally {
      setIsTriggeringAutoSync(false);
    }
  };

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className={`bg-slate-50 px-4 py-3 ${isExpanded ? 'border-b border-slate-200' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#1A3A5C]">
                <ClipboardCheck className="h-4 w-4 text-sky-700" />
                {isCustomDateSelected
                  ? 'Kiểm duyệt ảnh điểm thấp (< 80đ) theo ngày'
                  : 'Kiểm duyệt ảnh điểm thấp (< 80đ) ngày hôm trước'}
              </h3>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-800">
                {activeDateDisplay}
              </span>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                Chỉ ảnh &lt; 80đ ({totalImages})
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            <div className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-white px-2 py-1 shadow-2xs">
              <button
                type="button"
                onClick={() => handleSelectDate(shiftIsoDate(activeDateIso, -1))}
                className="rounded p-1 text-slate-500 transition hover:bg-sky-50 hover:text-sky-700"
                title="Xem ngày trước đó"
                aria-label="Xem ngày trước đó"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <Calendar className="h-3.5 w-3.5 shrink-0 text-sky-700" />
              <label htmlFor="hygiene-review-date-picker" className="text-[11px] font-semibold text-slate-500">
                Ngày:
              </label>
              <input
                id="hygiene-review-date-picker"
                type="date"
                value={activeDateIso}
                max={maxSelectableDateIso}
                onChange={event => handleSelectDate(event.target.value)}
                className="cursor-pointer bg-transparent text-xs font-bold text-slate-800 outline-none"
                title="Chọn ngày để xem lại dữ liệu và hình ảnh kiểm duyệt"
              />
              <button
                type="button"
                onClick={() => handleSelectDate(shiftIsoDate(activeDateIso, 1))}
                disabled={activeDateIso >= maxSelectableDateIso}
                className="rounded p-1 text-slate-500 transition hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-35"
                title="Xem ngày tiếp theo"
                aria-label="Xem ngày tiếp theo"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {isCustomDateSelected && (
              <button
                type="button"
                onClick={() => handleSelectDate(dateIso)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 transition hover:bg-amber-100"
                title={`Quay về ngày hôm trước mặc định (${dateDisplay})`}
              >
                <RotateCcw className="h-3 w-3" />
                Về {dateDisplay}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(current => !current)}
              aria-expanded={isExpanded}
              aria-controls="yesterday-image-review-content"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-bold text-sky-700 transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {isExpanded ? 'Thu gọn' : 'Mở rộng'}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <>

          <div id="yesterday-image-review-content" className="overflow-x-auto">
          {visibleRows.length === 0 ? (
            <div className="flex items-center justify-center gap-2 bg-emerald-50/60 px-4 py-8 text-center text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>
                {reportsForDate.length === 0
                  ? `Ngày ${activeDateDisplay} không có dữ liệu kiểm tra vệ sinh nào được ghi nhận.`
                  : `Ngày ${activeDateDisplay} không có ảnh điểm thấp (< 80đ) nào cần kiểm duyệt (tổng ${totalAllImages} ảnh đều đạt từ 80đ trở lên).`}
              </span>
            </div>
          ) : (
          <table className="w-full min-w-[850px] text-left text-xs text-slate-700">
          <thead className="border-b border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-center">STT</th>
              <th className="px-4 py-3">Tên cơ sở</th>
              <th className="px-4 py-3 text-center">Ảnh &lt; 80đ cần duyệt</th>
              <th className="px-4 py-3 text-center">Tổng ảnh ngày</th>
              <th className="px-4 py-3 text-center">Kiểm duyệt</th>
              <th className="px-4 py-3 text-center">Báo cáo chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((row, index) => {
              const approved = row.images.filter(image => getReviewStatus(imageReviews[getImageReviewId(image)], image) === 'approved').length;
              const rejected = row.images.filter(image => getReviewStatus(imageReviews[getImageReviewId(image)], image) === 'rejected').length;
              const evaluated = approved + rejected;
              const reviewProgress = row.images.length > 0 ? (evaluated / row.images.length) * 100 : 0;

              return (
                <tr key={row.coSo} className="transition-colors hover:bg-sky-50/50">
                  <td className="px-4 py-3 text-center font-mono text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Building2 className="h-4 w-4 shrink-0 text-sky-700" />
                      {row.coSo}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-bold text-rose-700">
                      {row.images.length} ảnh &lt; 80đ
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700">
                      {row.allImagesCount} ảnh ({row.performed}/{row.target} lượt)
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="mx-auto w-28">
                      <div className="mb-1 flex items-center justify-between text-[10px] font-bold">
                        <span className={evaluated === row.images.length && row.images.length > 0 ? 'text-emerald-700' : 'text-slate-600'}>
                          {evaluated}/{row.images.length}
                        </span>
                        <span className="text-slate-400">{reviewProgress.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${reviewProgress}%` }} />
                      </div>
                      <div className="mt-1 text-center text-[9px] font-semibold text-slate-400">
                        <span className="text-emerald-600">Đã duyệt {approved}</span> · <span className="text-rose-600">Lỗi AI {rejected}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => openFacility(row.coSo)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-[11px] font-bold text-sky-700 transition hover:bg-sky-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Xem ({row.images.length})
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
          )}
        </div>
        </>
      )}

      {selectedRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-2 backdrop-blur-xs sm:p-4"
          onClick={closeFacility}
        >
          <div
            className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="flex items-center gap-2 text-base font-black text-slate-900">
                    <Building2 className="h-5 w-5 text-sky-700" />
                    {selectedRow.coSo}
                  </h4>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">
                    {activeDateDisplay}
                  </span>
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">
                    Chỉ lọc ảnh điểm &lt; 80đ
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedRow.images.length} ảnh điểm thấp (&lt; 80đ) · đã duyệt {selectedCounts.approved} · lỗi AI {selectedCounts.rejected} · chờ {selectedCounts.pending}
                </p>
              </div>
              <button
                type="button"
                onClick={closeFacility}
                className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 sm:static"
                title="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">Nhân viên kiểm duyệt</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={reviewerName}
                      onChange={event => {
                        setReviewerName(event.target.value);
                        if (event.target.value.trim()) setReviewerError(false);
                      }}
                      placeholder="Nhập tên một lần trên thiết bị này"
                      className={`w-72 rounded-lg border bg-white px-3 py-2 text-xs text-slate-800 outline-none ${reviewerError ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100'}`}
                    />
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                      isLoadingReviews
                        ? 'border-slate-200 bg-slate-50 text-slate-600'
                        : syncNotice?.tone === 'error'
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : syncNotice?.tone === 'warning'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}>
                      {isLoadingReviews
                        ? 'Đang tải trạng thái…'
                        : syncNotice?.message || 'Sẵn sàng đồng bộ Google Sheet'}
                    </span>
                  </div>
                  {reviewerError && (
                    <p className="mt-1 text-[10px] font-semibold text-rose-600">Vui lòng nhập tên trước khi tích ảnh.</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      ['all', 'Tất cả', selectedRow.images.length],
                      ['pending', 'Chưa đánh giá', selectedCounts.pending],
                      ['approved', 'Đã duyệt', selectedCounts.approved],
                      ['rejected', 'Lỗi AI', selectedCounts.rejected],
                    ] as Array<[ImageFilter, string, number]>).map(([value, label, count]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold ${filter === value ? 'border-sky-700 bg-sky-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        {label} ({count})
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                    <button
                      type="button"
                      onClick={handleBatchApproveFacility}
                      disabled={isBatchSaving || selectedRow.images.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                      title="Duyệt đạt tất cả ảnh của cơ sở này và tự động cập nhật hàng trong Sheet"
                    >
                      {isBatchSaving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Duyệt đạt tất cả ({selectedRow.images.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleBatchResetFacility}
                      disabled={isBatchSaving || selectedRow.images.length === 0}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      title="Bỏ đánh giá tất cả ảnh của cơ sở này"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Bỏ chọn tất cả
                    </button>
                    {googleUser && (
                      <button
                        type="button"
                        onClick={handleCleanDuplicateReviews}
                        disabled={isCleaningDuplicates}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                        title="Quét và xóa bỏ kết quả cũ nếu các hàng trong Sheet bị 2 kết quả"
                      >
                        {isCleaningDuplicates ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-amber-600" />}
                        Xóa kết quả cũ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/70 p-3 sm:p-4">
              {selectedImages.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {selectedImages.map((report, index) => {
                    const reviewId = getImageReviewId(report);
                    const review = imageReviews[reviewId];
                    const reviewStatus = getReviewStatus(review, report);
                    const approved = reviewStatus === 'approved';
                    const rejected = reviewStatus === 'rejected';

                    return (
                      <article
                        key={reviewId}
                        className={`overflow-hidden rounded-xl border bg-white transition ${
                          approved
                            ? 'border-emerald-300 shadow-[0_0_0_2px_rgba(16,185,129,0.08)]'
                            : rejected
                            ? 'border-rose-300 shadow-[0_0_0_2px_rgba(244,63,94,0.08)]'
                            : 'border-slate-200 hover:border-sky-300 hover:shadow-sm'
                        }`}
                      >
                        <a
                          href={report.linkAnh}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative block aspect-[4/3] overflow-hidden bg-slate-100"
                          title="Mở ảnh gốc"
                        >
                          <img
                            src={report.linkAnh}
                            alt={`Ảnh ${index + 1} - ${selectedRow.coSo}`}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            onError={event => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                          <span className="absolute right-2 top-2 rounded-md bg-slate-900/70 p-1.5 text-white backdrop-blur-sm">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </span>
                          <span className="absolute bottom-2 left-2 rounded-md bg-slate-900/75 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                            Ảnh {index + 1}
                          </span>
                          <span className="absolute bottom-2 right-2 rounded-md bg-rose-600/95 px-2 py-1 text-[10px] font-extrabold text-white shadow-xs backdrop-blur-sm">
                            {Math.round(getScore100(report) * 10) / 10}/100đ
                          </span>
                        </a>

                        <div className="space-y-2 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 text-[11px] text-slate-600">
                              <p className="truncate font-bold text-slate-800">{report.khuVuc || 'Chưa ghi khu vực'}</p>
                              <p className="mt-0.5 flex items-center gap-1 truncate">
                                <User className="h-3 w-3 shrink-0 text-slate-400" />
                                {report.nguoiKiemTra || 'Chưa ghi người báo cáo'}
                              </p>
                              <p className="mt-0.5 text-[10px] font-semibold text-rose-700">
                                {report.gio || '—'} · Điểm: {Math.round(getScore100(report) * 10) / 10}đ ({report.trangThai || 'Không đạt'})
                              </p>
                              {report.chiTiet && (
                                <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500" title={report.chiTiet}>
                                  {report.chiTiet}
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 items-start gap-2">
                              <label className="flex cursor-pointer flex-col items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={rejected}
                                  onChange={() => setImageReviewStatus(report, 'rejected')}
                                  disabled={savingReviewId === reviewId || isLoadingReviews}
                                  aria-label={`Đánh dấu lỗi AI ảnh ${index + 1} của ${selectedRow.coSo}`}
                                  className="h-7 w-7 cursor-pointer rounded border-slate-300 accent-rose-600 disabled:cursor-wait disabled:opacity-50"
                                />
                                <span className={`text-[10px] font-black ${rejected ? 'text-rose-700' : 'text-slate-400'}`}>
                                  Lỗi AI
                                </span>
                              </label>
                              <label className="flex cursor-pointer flex-col items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={approved}
                                  onChange={() => setImageReviewStatus(report, 'approved')}
                                  disabled={savingReviewId === reviewId || isLoadingReviews}
                                  aria-label={`Đánh dấu đã duyệt ảnh ${index + 1} của ${selectedRow.coSo}`}
                                  className="h-7 w-7 cursor-pointer rounded border-slate-300 accent-emerald-600 disabled:cursor-wait disabled:opacity-50"
                                />
                                <span className={`text-[10px] font-black ${approved ? 'text-emerald-700' : 'text-slate-400'}`}>
                                  Đã duyệt
                                </span>
                              </label>
                            </div>
                          </div>

                          {reviewStatus !== 'pending' && (
                            <div className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-semibold ${
                              approved
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-rose-200 bg-rose-50 text-rose-700'
                            }`}>
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              {approved ? 'Đã duyệt' : 'Lỗi AI'} · {review.nguoiKiemDuyet} · {formatReviewedTime(review.thoiGianKiemDuyet)}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-center text-sm text-slate-500">
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                  <p>{selectedRow.images.length === 0 ? 'Cơ sở chưa có ảnh báo cáo trong ngày này.' : 'Không có ảnh phù hợp với bộ lọc.'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs sm:p-4"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-800">Cài đặt kết nối & Đồng bộ dữ liệu Google Sheet</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4 text-xs text-slate-600">
              {/* Giải thích nguyên nhân không đổ về được */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-rose-900">
                  <span className="text-base">⚠️</span>
                  <span>Nguyên nhân dữ liệu không tự đổ về khi bạn tích ảnh:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-800">
                  Do bạn vừa xóa đoạn script trong file tổng Google Sheet (<code>{targetSpreadsheetId}</code>). Khi script bị xóa, URL triển khai Web App cũ của Google đã bị hủy trên máy chủ Google (báo lỗi 404 / script deleted), khiến các yêu cầu gửi dữ liệu từ hệ thống trước đây không thể kết nối tới Sheet.
                </p>
              </div>

              {/* Cách 1: Đồng bộ trực tiếp qua Google Workspace OAuth (Khuyên dùng) */}
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-emerald-950">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <span>Cách 1 (Khuyên dùng): Đồng bộ trực tiếp qua tài khoản Google - Không cần Apps Script</span>
                  </div>
                  <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                    Chính thức từ Google
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-900">
                  Hệ thống đã tích hợp <strong>Google Sheets API</strong> chính thức. Bạn chỉ cần đăng nhập bằng tài khoản Google có quyền chỉnh sửa file Sheet, mọi thao tác tích duyệt ảnh sẽ được lưu thẳng vào Google Sheet ngay lập tức mà <strong>không cần phải tạo hay bảo trì bất kỳ đoạn code Apps Script nào!</strong>
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 border border-emerald-200">
                  <div>
                    <span className="block text-[11px] font-bold text-slate-700">Trạng thái kết nối Google:</span>
                    <span className="text-xs text-slate-600">
                      {googleUser ? (
                        <span className="text-emerald-700 font-semibold">✓ Đã đăng nhập: {googleUser.email}</span>
                      ) : (
                        <span className="text-amber-700">Chưa đăng nhập tài khoản Google</span>
                      )}
                    </span>
                  </div>

                  {!googleUser ? (
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isGoogleSigningIn}
                      className="gsi-material-button shadow-2xs"
                    >
                      <div className="gsi-material-button-state"></div>
                      <div className="gsi-material-button-content-wrapper">
                        <div className="gsi-material-button-icon">
                          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 1589-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                            <path fill="none" d="M0 0h48v48H0z" />
                          </svg>
                        </div>
                        <span className="gsi-material-button-contents">
                          {isGoogleSigningIn ? 'Đang kết nối...' : 'Đăng nhập Google'}
                        </span>
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        await logout();
                        setGoogleUser(null);
                      }}
                      className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Đăng xuất tài khoản
                    </button>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ID File Google Sheet đích (Master Spreadsheet ID):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={targetSpreadsheetId}
                      onChange={e => {
                        setTargetSpreadsheetState(e.target.value);
                        setTargetSpreadsheetId(e.target.value);
                      }}
                      placeholder="1003lfdUh6S_Tkg5H4qChw7KrziAon1uvgkoFMj9FK0E"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                    />
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit?gid=0#gid=0`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      Mở Sheet
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Cách 2: Khôi phục lại Google Apps Script Web App */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Code2 className="h-4 w-4 text-sky-600" />
                    <span>Cách 2: Khôi phục lại mã Google Apps Script trong Sheet</span>
                  </div>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                    Web App URL
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-600">
                  <p><strong>Bước 1:</strong> Mở file Google Sheet của bạn (nhấn nút "Mở Sheet" ở trên).</p>
                  <p><strong>Bước 2:</strong> Vào menu <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>.</p>
                  <p><strong>Bước 3:</strong> Nhấn nút <strong>"Sao chép mã script"</strong> bên dưới rồi dán toàn bộ vào file <code>Code.gs</code>.</p>
                  <p><strong>Bước 4:</strong> Bấm <strong>Triển khai (Deploy)</strong> &gt; <strong>Triển khai mới (New deployment)</strong> &gt; chọn biểu tượng bánh răng <strong>Ứng dụng web (Web App)</strong> &gt; mục <em>'Ai có quyền truy cập'</em> chọn <strong>Bất kỳ ai (Anyone)</strong> &gt; Triển khai &gt; Sao chép link URL Web App và dán vào ô bên dưới.</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Đường dẫn Web App (Apps Script URL) sau khi triển khai:
                  </label>
                  <input
                    type="url"
                    value={newSheetScriptUrl}
                    onChange={e => setNewSheetScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                  />
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px]">Toàn bộ mã Google Apps Script chuẩn:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
                        setCopiedScript(true);
                        setTimeout(() => setCopiedScript(false), 2500);
                      }}
                      className="inline-flex items-center gap-1 rounded bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-300 hover:bg-emerald-50 shadow-xs"
                    >
                      {copiedScript ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedScript ? 'Đã sao chép!' : 'Sao chép mã script'}
                    </button>
                  </div>
                  <pre className="max-h-40 overflow-x-auto rounded-lg bg-slate-900 p-2.5 font-mono text-[10px] text-emerald-300 leading-relaxed">
                    {APPS_SCRIPT_TEMPLATE}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={async () => {
                  if (newSheetScriptUrl.trim()) {
                    await fetch('/api/auto-sync-config', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ scriptUrl: newSheetScriptUrl.trim() }),
                    }).catch(() => {});
                    fetchAutoSyncStatus();
                  }
                  setShowSettingsModal(false);
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
              >
                Lưu cấu hình & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
