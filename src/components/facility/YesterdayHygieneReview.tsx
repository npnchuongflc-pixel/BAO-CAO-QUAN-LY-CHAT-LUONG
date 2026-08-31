import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Search,
  User,
  X,
} from 'lucide-react';
import { HygieneReport } from './facilityTypes';
import {
  OFFICIAL_FACILITIES,
  getFacilityDailyTarget,
  normalizeFacilityName,
} from '../../utils/facilityUtils';
import { normalizeDateToIso } from '../../utils/dateUtils';
import {
  fetchImageReviews,
  getImageReviewId,
  ImageReviewRecord,
  saveImageReview,
} from '../../services/imageReviewService';

type ReviewStatus = 'pending' | 'approved' | 'rejected';
type ImageFilter = 'all' | ReviewStatus;

interface YesterdayHygieneReviewProps {
  dateIso: string;
  dateDisplay: string;
  reports: HygieneReport[];
}

const IMAGE_REVIEWER_STORAGE_KEY = 'yesterday-image-reviewer-demo-v1';
const HYGIENE_PLACEHOLDER_IMAGE = 'images.unsplash.com/photo-1581578731548-c64695cc6952';

const getScore100 = (report: HygieneReport) => {
  let score = report.diemSo || 0;
  if (report.diemSoMax && report.diemSoMax <= 10 && score <= 10) score *= 10;
  return score;
};

const formatReviewedTime = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const getReviewStatus = (record?: ImageReviewRecord): ReviewStatus => {
  if (record?.reviewStatus === 'approved' || record?.reviewStatus === 'rejected') {
    return record.reviewStatus;
  }
  return record?.reviewed ? 'approved' : 'pending';
};

export const YesterdayHygieneReview: React.FC<YesterdayHygieneReviewProps> = ({
  dateIso,
  dateDisplay,
  reports,
}) => {
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [filter, setFilter] = useState<ImageFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewerError, setReviewerError] = useState(false);
  const [imageReviews, setImageReviews] = useState<Record<string, ImageReviewRecord>>({});
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);
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

  useEffect(() => {
    let active = true;
    setIsLoadingReviews(true);
    setSyncNotice(null);

    fetchImageReviews(dateIso)
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
  }, [dateIso]);

  useEffect(() => {
    try {
      window.localStorage.setItem(IMAGE_REVIEWER_STORAGE_KEY, reviewerName);
    } catch {
      // The employee can re-enter their name when browser storage is unavailable.
    }
  }, [reviewerName]);

  const facilityRows = useMemo(() => {
    const reportsForDate = reports.filter(
      report => normalizeDateToIso(report.ngay) === dateIso,
    );

    return OFFICIAL_FACILITIES.map(coSo => {
      const facilityReports = reportsForDate.filter(
        report => normalizeFacilityName(report.coSo) === coSo,
      );
      const images = facilityReports.filter(report => (
        report.linkAnh?.trim() && !report.linkAnh.includes(HYGIENE_PLACEHOLDER_IMAGE)
      ));
      const target = getFacilityDailyTarget(coSo);
      const performed = facilityReports.length;
      const progress = target > 0 ? Math.min(100, (performed / target) * 100) : 0;
      const scores = facilityReports.map(getScore100);
      const averageScore = scores.length
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;

      return {
        coSo,
        reports: facilityReports,
        images,
        target,
        performed,
        progress,
        averageScore,
      };
    }).sort((left, right) => left.coSo.localeCompare(right.coSo, 'vi'));
  }, [dateIso, reports]);

  const selectedRow = useMemo(
    () => facilityRows.find(row => row.coSo === selectedFacility) || null,
    [facilityRows, selectedFacility],
  );

  const totalImages = useMemo(
    () => facilityRows.reduce((sum, row) => sum + row.images.length, 0),
    [facilityRows],
  );
  const reviewSummary = useMemo(() => {
    let approved = 0;
    let rejected = 0;
    facilityRows.forEach(row => row.images.forEach(image => {
      const status = getReviewStatus(imageReviews[getImageReviewId(image)]);
      if (status === 'approved') approved += 1;
      if (status === 'rejected') rejected += 1;
    }));
    return {
      approved,
      rejected,
      pending: Math.max(0, totalImages - approved - rejected),
    };
  }, [facilityRows, imageReviews, totalImages]);
  const visibleRows = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('vi-VN');
    return facilityRows.filter(row => (
      !query || row.coSo.toLocaleLowerCase('vi-VN').includes(query)
    ));
  }, [facilityRows, searchQuery]);

  const selectedImages = useMemo(() => {
    if (!selectedRow) return [];
    return selectedRow.images.filter(image => {
      const status = getReviewStatus(imageReviews[getImageReviewId(image)]);
      if (filter !== 'all') return status === filter;
      return true;
    });
  }, [filter, imageReviews, selectedRow]);

  const setImageReviewStatus = async (report: HygieneReport, requestedStatus: ReviewStatus) => {
    const reviewId = getImageReviewId(report);
    const cleanReviewer = reviewerName.trim();
    const previousRecord = imageReviews[reviewId];
    const currentStatus = getReviewStatus(previousRecord);
    const nextStatus: ReviewStatus = currentStatus === requestedStatus ? 'pending' : requestedStatus;

    if (nextStatus !== 'pending' && !cleanReviewer) {
      setReviewerError(true);
      return;
    }

    setReviewerError(false);
    setSyncNotice(null);
    const timestamp = new Date().toISOString();
    const optimisticRecord: ImageReviewRecord = {
      id: reviewId,
      reportId: report.id,
      ngay: dateIso,
      gio: report.gio || '',
      coSo: report.coSo,
      khuVuc: report.khuVuc || '',
      linkAnh: report.linkAnh,
      nguoiBaoCao: report.nguoiKiemTra || '',
      reviewed: nextStatus === 'approved',
      reviewStatus: nextStatus,
      trangThaiKiemDuyet: nextStatus === 'approved'
        ? 'Đã duyệt'
        : nextStatus === 'rejected'
        ? 'Không đạt'
        : 'Chưa duyệt',
      nguoiKiemDuyet: cleanReviewer || previousRecord?.nguoiKiemDuyet || '',
      thoiGianKiemDuyet: timestamp,
      syncedToSheet: false,
    };

    setImageReviews(current => ({ ...current, [reviewId]: optimisticRecord }));
    setSavingReviewId(reviewId);

    try {
      const result = await saveImageReview(optimisticRecord);
      setImageReviews(current => ({ ...current, [reviewId]: result.record }));
      setSyncNotice(result.warning
        ? { tone: 'warning', message: `Đã lưu trên hệ thống; Google Sheet đang chờ đồng bộ: ${result.warning}` }
        : { tone: 'success', message: 'Đã lưu và đồng bộ vào Google Sheet.' });
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
      const status = getReviewStatus(imageReviews[getImageReviewId(image)]);
      if (status === 'approved') approved += 1;
      if (status === 'rejected') rejected += 1;
    });
    return {
      approved,
      rejected,
      pending: Math.max(0, selectedRow.images.length - approved - rejected),
    };
  }, [imageReviews, selectedRow]);

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#1A3A5C]">
              <ClipboardCheck className="h-4 w-4 text-sky-700" />
              Kiểm duyệt ảnh ngày hôm trước
            </h3>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-800">
              {dateDisplay}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {facilityRows.length} cơ sở · {totalImages} ảnh · đạt {reviewSummary.approved} · không đạt {reviewSummary.rejected} · chờ {reviewSummary.pending}. Nhấn “Xem” để kiểm duyệt.
          </p>
        </div>

        <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:w-64">
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <input
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Tìm tên cơ sở..."
            className="min-w-0 flex-1 bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left text-xs text-slate-700">
          <thead className="border-b border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-center">STT</th>
              <th className="px-4 py-3">Tên cơ sở</th>
              <th className="px-4 py-3 text-center">Chỉ tiêu/ngày</th>
              <th className="px-4 py-3 text-center">Đã thực hiện</th>
              <th className="px-4 py-3">Tiến độ ngày</th>
              <th className="px-4 py-3 text-center">Điểm số TB</th>
              <th className="px-4 py-3 text-center">Số ảnh</th>
              <th className="px-4 py-3 text-center">Kiểm duyệt</th>
              <th className="px-4 py-3 text-center">Báo cáo chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((row, index) => {
              const approved = row.images.filter(image => getReviewStatus(imageReviews[getImageReviewId(image)]) === 'approved').length;
              const rejected = row.images.filter(image => getReviewStatus(imageReviews[getImageReviewId(image)]) === 'rejected').length;
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
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-slate-800">
                      {row.target} lượt/ngày
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 font-bold text-sky-700">
                      {row.performed} lượt
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-44">
                      <div className="mb-1 flex items-center justify-between text-[10px] font-bold">
                        <span className={row.progress >= 100 ? 'text-emerald-700' : row.progress >= 50 ? 'text-sky-700' : 'text-amber-700'}>
                          {row.progress.toFixed(1)}%
                        </span>
                        <span className="text-slate-500">{row.performed}/{row.target} lượt</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${row.progress >= 100 ? 'bg-emerald-500' : row.progress >= 50 ? 'bg-sky-500' : 'bg-amber-400'}`}
                          style={{ width: `${row.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.performed ? (
                      <span className={`text-sm font-black ${row.averageScore < 70 ? 'text-rose-700' : row.averageScore < 80 ? 'text-amber-700' : 'text-slate-900'}`}>
                        {row.averageScore.toFixed(0)} <span className="text-[10px] font-semibold text-slate-400">/100</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-800">{row.images.length}</td>
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
                        <span className="text-emerald-600">Đạt {approved}</span> · <span className="text-rose-600">Không đạt {rejected}</span>
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
                      Xem
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
                    {dateDisplay}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedRow.images.length} ảnh · đạt {selectedCounts.approved} · không đạt {selectedCounts.rejected} · chờ {selectedCounts.pending}
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

                <div className="flex flex-wrap gap-1.5">
                  {([
                    ['all', 'Tất cả', selectedRow.images.length],
                    ['pending', 'Chưa đánh giá', selectedCounts.pending],
                    ['approved', 'Đã duyệt', selectedCounts.approved],
                    ['rejected', 'Không đạt', selectedCounts.rejected],
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
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/70 p-3 sm:p-4">
              {selectedImages.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {selectedImages.map((report, index) => {
                    const reviewId = getImageReviewId(report);
                    const review = imageReviews[reviewId];
                    const reviewStatus = getReviewStatus(review);
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
                        </a>

                        <div className="space-y-2 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 text-[11px] text-slate-600">
                              <p className="truncate font-bold text-slate-800">{report.khuVuc || 'Chưa ghi khu vực'}</p>
                              <p className="mt-0.5 flex items-center gap-1 truncate">
                                <User className="h-3 w-3 shrink-0 text-slate-400" />
                                {report.nguoiKiemTra || 'Chưa ghi người báo cáo'}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-400">{report.gio || '—'} · {report.trangThai || 'Chưa đánh giá'}</p>
                            </div>

                            <div className="flex shrink-0 items-start gap-2">
                              <label className="flex cursor-pointer flex-col items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={approved}
                                  onChange={() => setImageReviewStatus(report, 'approved')}
                                  disabled={savingReviewId === reviewId || isLoadingReviews}
                                  aria-label={`Đánh dấu đạt ảnh ${index + 1} của ${selectedRow.coSo}`}
                                  className="h-7 w-7 cursor-pointer rounded border-slate-300 accent-emerald-600 disabled:cursor-wait disabled:opacity-50"
                                />
                                <span className={`text-[10px] font-black ${approved ? 'text-emerald-700' : 'text-slate-400'}`}>
                                  Đã duyệt
                                </span>
                              </label>
                              <label className="flex cursor-pointer flex-col items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={rejected}
                                  onChange={() => setImageReviewStatus(report, 'rejected')}
                                  disabled={savingReviewId === reviewId || isLoadingReviews}
                                  aria-label={`Đánh dấu không đạt ảnh ${index + 1} của ${selectedRow.coSo}`}
                                  className="h-7 w-7 cursor-pointer rounded border-slate-300 accent-rose-600 disabled:cursor-wait disabled:opacity-50"
                                />
                                <span className={`text-[10px] font-black ${rejected ? 'text-rose-700' : 'text-slate-400'}`}>
                                  Không đạt
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
                              {approved ? 'Đã duyệt' : 'Không đạt'} · {review.nguoiKiemDuyet} · {formatReviewedTime(review.thoiGianKiemDuyet)}
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
    </div>
  );
};
