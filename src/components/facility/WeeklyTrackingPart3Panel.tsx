import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarRange,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  ListChecks,
  RefreshCw,
} from 'lucide-react';
import { getCurrentUserProfile } from '../../services/workspaceAuth';
import {
  DEFAULT_WEEKLY_SPREADSHEET_ID,
  HANDLING_METHODS,
  MASTER_WEEKLY_SHEET_TITLE,
  TEAM_LEADER_SHEET_NAME,
  WeeklySheetTrackingRecord,
  WeeklyTrackingSheetConfig,
  WeeklyTrackingStatus,
  readAllWeeklyWarningRecords,
} from '../../services/weeklyWarningSheetService';
import { normalizeFacilityName } from '../../utils/facilityUtils';

interface WeeklyTrackingPart3PanelProps {
  selectedFacilityFilter?: string;
  selectedMonthFilter?: string;
  selectedDateFrom?: string;
  selectedDateTo?: string;
  config: WeeklyTrackingSheetConfig;
}

type AggregationTab = 'week' | 'facility' | 'method' | 'status';

function extractMonthYearKey(raw: string): string {
  const s = (raw || '').trim();
  if (!s || s === 'all') return '';
  const mDmy = /(\d{1,2})[\/\-](\d{4})/.exec(s);
  if (mDmy) {
    return `${mDmy[1].padStart(2, '0')}/${mDmy[2]}`;
  }
  const mYmd = /(\d{4})-(\d{1,2})/.exec(s);
  if (mYmd) {
    return `${mYmd[2].padStart(2, '0')}/${mYmd[1]}`;
  }
  return '';
}

function parseCalendarDayUtcMs(raw: string, fallbackYear?: number): number | null {
  const s = (raw || '').trim();
  if (!s) return null;
  const mIso = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/.exec(s);
  if (mIso) {
    return Date.UTC(Number(mIso[1]), Number(mIso[2]) - 1, Number(mIso[3]));
  }
  const mDmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(s);
  if (mDmy) {
    const rawYear = Number(mDmy[3]);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    return Date.UTC(year, Number(mDmy[2]) - 1, Number(mDmy[1]));
  }
  const mDm = /^(\d{1,2})[\/\-](\d{1,2})/.exec(s);
  if (mDm && fallbackYear) {
    return Date.UTC(fallbackYear, Number(mDm[2]) - 1, Number(mDm[1]));
  }
  return null;
}

type MethodBucketKey = 'Nhắc nhở' | 'Cảnh cáo' | 'Kỷ luật' | 'Sa thải';

function normalizeHandlingMethodBucket(raw: string): MethodBucketKey | null {
  const s = (raw || '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'nhắc nhở') return 'Nhắc nhở';
  if (s === 'cảnh báo' || s === 'cảnh cáo') return 'Cảnh cáo';
  if (s === 'kỉ luật' || s === 'kỷ luật') return 'Kỷ luật';
  if (s === 'sa thải') return 'Sa thải';
  return null;
}

const isSafeSpreadsheetUrl = (url: string): boolean =>
  typeof url === 'string' && url.startsWith('https://docs.google.com/spreadsheets/');

const STATUS_BADGE_MAP: Record<WeeklyTrackingStatus, string> = {
  'Chưa xử lý': 'bg-rose-50 text-rose-700 border-rose-200',
  'Chờ QLCL xác nhận': 'bg-amber-50 text-amber-800 border-amber-200',
  'Đã đóng': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Không còn cảnh báo sau cập nhật': 'bg-sky-50 text-[#1B5EA6] border-sky-200',
};

const ALL_STATUSES: WeeklyTrackingStatus[] = [
  'Chưa xử lý',
  'Chờ QLCL xác nhận',
  'Đã đóng',
  'Không còn cảnh báo sau cập nhật',
];

export const WeeklyTrackingPart3Panel: React.FC<WeeklyTrackingPart3PanelProps> = ({
  selectedFacilityFilter = 'all',
  selectedMonthFilter = 'all',
  selectedDateFrom = '',
  selectedDateTo = '',
  config,
}) => {
  const [records, setRecords] = useState<WeeklySheetTrackingRecord[]>([]);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(
    config.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${config.spreadsheetId || DEFAULT_WEEKLY_SPREADSHEET_ID}/edit`,
  );
  const [spreadsheetFound, setSpreadsheetFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState('');
  const [userLabel, setUserLabel] = useState('');

  const [activeAggTab, setActiveAggTab] = useState<AggregationTab>('week');

  const loadRecords = useCallback(async () => {
    const profile = getCurrentUserProfile();
    setUserLabel(profile.label);

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await readAllWeeklyWarningRecords();
      if (!res.success) {
        setErrorMsg(res.message || 'Không thể tải dữ liệu từ Google Sheet.');
        return;
      }

      setSpreadsheetFound(res.spreadsheetFound);
      if (res.spreadsheetUrl) setSpreadsheetUrl(res.spreadsheetUrl);
      setRecords(res.records);
      setLastLoadedAt(
        new Intl.DateTimeFormat('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date()),
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Lỗi đọc dữ liệu từ Google Sheet.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
    const handler = () => {
      void loadRecords();
    };
    window.addEventListener('weekly-warning-sheet-updated', handler);
    return () => window.removeEventListener('weekly-warning-sheet-updated', handler);
  }, [loadRecords]);

  const activeGlobalMonthKey = useMemo(
    () => extractMonthYearKey(selectedMonthFilter),
    [selectedMonthFilter],
  );

  const normalizedGlobalFacility = useMemo(() => {
    if (!selectedFacilityFilter || selectedFacilityFilter === 'all') return 'all';
    return normalizeFacilityName(selectedFacilityFilter) || selectedFacilityFilter;
  }, [selectedFacilityFilter]);

  // Toàn bộ dữ liệu Phần 3 chịu sự chi phối trực tiếp của "Bộ lọc báo cáo" (Tháng, Cơ sở, Khoảng ngày)
  const reportScopedRecords = useMemo(() => {
    return records.filter(r => {
      if (activeGlobalMonthKey) {
        const rowMonthKey =
          extractMonthYearKey(r.monthLabel || '') ||
          extractMonthYearKey(r.startIso || '') ||
          extractMonthYearKey(r.cutoffDate || '') ||
          extractMonthYearKey(r.weekLabel || '');
        if (rowMonthKey !== activeGlobalMonthKey) return false;
      }
      if (normalizedGlobalFacility !== 'all') {
        const rowFac = normalizeFacilityName(r.coSo) || r.coSo;
        if (rowFac !== normalizedGlobalFacility) return false;
      }
      if (selectedDateFrom && r.endIso && r.endIso < selectedDateFrom) return false;
      if (selectedDateTo && r.startIso && r.startIso > selectedDateTo) return false;
      return true;
    });
  }, [records, activeGlobalMonthKey, normalizedGlobalFacility, selectedDateFrom, selectedDateTo]);

  // 4 KPI LỚN thống kê từ file Trưởng nhóm xử lý theo Bộ lọc báo cáo
  const bigKpis = useMemo(() => {
    const receivedCount = reportScopedRecords.length;
    const approvedCount = reportScopedRecords.filter(r => r.handled === true).length;
    const processingRate = receivedCount > 0 ? (approvedCount / receivedCount) * 100 : 0;

    let totalDiffDays = 0;
    let timedCount = 0;
    reportScopedRecords.forEach(r => {
      if (!r.updatedAt || !r.cutoffDate) return;
      const yearHint =
        (r.startIso && Number(r.startIso.slice(0, 4))) ||
        (() => {
          const mY = /\d{4}/.exec(r.cutoffDate || r.updatedAt || '');
          return mY ? Number(mY[0]) : new Date().getFullYear();
        })();
      const updatedDayMs = parseCalendarDayUtcMs(r.updatedAt, yearHint);
      const cutoffDayMs = parseCalendarDayUtcMs(r.cutoffDate, yearHint);
      if (updatedDayMs !== null && cutoffDayMs !== null) {
        const diffDays = Math.max(0, Math.round((updatedDayMs - cutoffDayMs) / 86_400_000));
        totalDiffDays += diffDays;
        timedCount += 1;
      }
    });
    const avgProcessingDays = timedCount > 0 ? totalDiffDays / timedCount : null;

    const methodCounts: Record<MethodBucketKey, number> = {
      'Nhắc nhở': 0,
      'Cảnh cáo': 0,
      'Kỷ luật': 0,
      'Sa thải': 0,
    };
    let methodChosenTotal = 0;
    reportScopedRecords.forEach(r => {
      const bucket = normalizeHandlingMethodBucket(r.handlingMethod);
      if (bucket) {
        methodCounts[bucket] += 1;
        methodChosenTotal += 1;
      }
    });

    const methodBreakdown: Array<{
      index: number;
      label: MethodBucketKey;
      filterMatch: string;
      count: number;
      percent: number;
    }> = [
      {
        index: 1,
        label: 'Nhắc nhở',
        filterMatch: 'Nhắc nhở',
        count: methodCounts['Nhắc nhở'],
        percent: methodChosenTotal > 0 ? (methodCounts['Nhắc nhở'] / methodChosenTotal) * 100 : 0,
      },
      {
        index: 2,
        label: 'Cảnh cáo',
        filterMatch: 'Cảnh báo',
        count: methodCounts['Cảnh cáo'],
        percent: methodChosenTotal > 0 ? (methodCounts['Cảnh cáo'] / methodChosenTotal) * 100 : 0,
      },
      {
        index: 3,
        label: 'Kỷ luật',
        filterMatch: 'Kỉ luật',
        count: methodCounts['Kỷ luật'],
        percent: methodChosenTotal > 0 ? (methodCounts['Kỷ luật'] / methodChosenTotal) * 100 : 0,
      },
      {
        index: 4,
        label: 'Sa thải',
        filterMatch: 'Sa Thải',
        count: methodCounts['Sa thải'],
        percent: methodChosenTotal > 0 ? (methodCounts['Sa thải'] / methodChosenTotal) * 100 : 0,
      },
    ];

    return {
      receivedCount,
      approvedCount,
      processingRate,
      avgProcessingDays,
      totalDiffDays,
      timedCount,
      methodChosenTotal,
      methodBreakdown,
    };
  }, [reportScopedRecords]);

  const recurrenceStats = useMemo(() => {
    const facilityWeeksMap = new Map<string, { weeks: Set<string>; rowCount: number }>();
    reportScopedRecords.forEach(r => {
      const facKey = normalizeFacilityName(r.coSo) || r.coSo.trim();
      if (!facKey) return;
      const cur = facilityWeeksMap.get(facKey) || { weeks: new Set<string>(), rowCount: 0 };
      cur.rowCount += 1;
      cur.weeks.add(r.weekCode || r.weekLabel || String(cur.rowCount));
      facilityWeeksMap.set(facKey, cur);
    });

    const totalFacilitiesCount = facilityWeeksMap.size;
    let repeatFacilityCount = 0;
    let nonRepeatFacilityCount = 0;
    let repeatRecordCount = 0;

    facilityWeeksMap.forEach(entry => {
      const violationTimes = Math.max(entry.weeks.size, entry.rowCount);
      if (violationTimes >= 2) {
        repeatFacilityCount += 1;
        repeatRecordCount += entry.rowCount;
      } else {
        nonRepeatFacilityCount += 1;
      }
    });

    const repeatRate =
      totalFacilitiesCount > 0 ? (repeatFacilityCount / totalFacilitiesCount) * 100 : 0;
    const nonRepeatRate =
      totalFacilitiesCount > 0 ? (nonRepeatFacilityCount / totalFacilitiesCount) * 100 : 0;

    return {
      totalFacilitiesCount,
      repeatFacilityCount,
      nonRepeatFacilityCount,
      repeatRecordCount,
      repeatRate,
      nonRepeatRate,
    };
  }, [reportScopedRecords]);

  const byWeekAgg = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        label: string;
        sheetTitle: string;
        tabUrl: string;
        startIso: string;
        total: number;
        unhandled: number;
        pendingQlcl: number;
        closed: number;
        cleared: number;
        totalMissingImages: number;
        totalNoCheckoutDays: number;
      }
    >();

    reportScopedRecords.forEach(r => {
      const cur = map.get(r.weekCode) || {
        key: r.weekCode,
        label: r.weekLabel || r.sheetTitle,
        sheetTitle: r.sheetTitle,
        tabUrl: r.tabUrl,
        startIso: r.startIso,
        total: 0,
        unhandled: 0,
        pendingQlcl: 0,
        closed: 0,
        cleared: 0,
        totalMissingImages: 0,
        totalNoCheckoutDays: 0,
      };
      cur.total += 1;
      cur.totalMissingImages += r.missingImages;
      cur.totalNoCheckoutDays += r.noCheckoutDays;
      if (r.status === 'Chưa xử lý') cur.unhandled += 1;
      else if (r.status === 'Chờ QLCL xác nhận') cur.pendingQlcl += 1;
      else if (r.status === 'Đã đóng') cur.closed += 1;
      else cur.cleared += 1;
      map.set(r.weekCode, cur);
    });

    return Array.from(map.values()).sort((a, b) =>
      (b.startIso || b.key).localeCompare(a.startIso || a.key),
    );
  }, [reportScopedRecords]);

  const byFacilityAgg = useMemo(() => {
    const map = new Map<
      string,
      {
        coSo: string;
        total: number;
        reminderCount: number;
        unhandled: number;
        pendingQlcl: number;
        closed: number;
        cleared: number;
        totalMissingImages: number;
        totalNoCheckoutDays: number;
      }
    >();
    reportScopedRecords.forEach(r => {
      const cur = map.get(r.coSo) || {
        coSo: r.coSo,
        total: 0,
        reminderCount: 0,
        unhandled: 0,
        pendingQlcl: 0,
        closed: 0,
        cleared: 0,
        totalMissingImages: 0,
        totalNoCheckoutDays: 0,
      };
      cur.total += 1;
      if (r.handled) cur.reminderCount += 1;
      cur.totalMissingImages += r.missingImages;
      cur.totalNoCheckoutDays += r.noCheckoutDays;
      if (r.status === 'Chưa xử lý') cur.unhandled += 1;
      else if (r.status === 'Chờ QLCL xác nhận') cur.pendingQlcl += 1;
      else if (r.status === 'Đã đóng') cur.closed += 1;
      else cur.cleared += 1;
      map.set(r.coSo, cur);
    });
    return Array.from(map.values()).sort(
      (a, b) => b.unhandled - a.unhandled || b.pendingQlcl - a.pendingQlcl || a.coSo.localeCompare(b.coSo, 'vi'),
    );
  }, [reportScopedRecords]);

  const byMethodAgg = useMemo(() => {
    const map = new Map<
      string,
      {
        method: string;
        total: number;
        unhandled: number;
        pendingQlcl: number;
        closed: number;
        cleared: number;
      }
    >();
    HANDLING_METHODS.forEach(m => {
      map.set(m, { method: m, total: 0, unhandled: 0, pendingQlcl: 0, closed: 0, cleared: 0 });
    });
    reportScopedRecords.forEach(r => {
      const key = r.handlingMethod.trim() || '(Chưa chọn phương án)';
      const cur = map.get(key) || {
        method: key,
        total: 0,
        unhandled: 0,
        pendingQlcl: 0,
        closed: 0,
        cleared: 0,
      };
      cur.total += 1;
      if (r.status === 'Chưa xử lý') cur.unhandled += 1;
      else if (r.status === 'Chờ QLCL xác nhận') cur.pendingQlcl += 1;
      else if (r.status === 'Đã đóng') cur.closed += 1;
      else cur.cleared += 1;
      map.set(key, cur);
    });
    return Array.from(map.values());
  }, [reportScopedRecords]);

  const byStatusAgg = useMemo(() => {
    return ALL_STATUSES.map(status => {
      const matched = reportScopedRecords.filter(r => r.status === status);
      return {
        status,
        count: matched.length,
        percent:
          reportScopedRecords.length > 0
            ? ((matched.length / reportScopedRecords.length) * 100).toFixed(1)
            : '0.0',
      };
    });
  }, [reportScopedRecords]);

  const safeMasterUrl = isSafeSpreadsheetUrl(spreadsheetUrl) ? spreadsheetUrl : '';
  const activeSheetId = config.spreadsheetId || DEFAULT_WEEKLY_SPREADSHEET_ID;

  return (
    <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Top Header */}
      <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-[#1A3A5C]">
              Tổng Hợp &amp; Theo Dõi Xử Lý Hồ Sơ Tuần ({MASTER_WEEKLY_SHEET_TITLE})
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Đọc trực tiếp tất cả các tuần từ Google Sheet (<span className="font-mono">{activeSheetId}</span>) • Tuần mới không xóa việc tồn đọng của tuần trước
              {userLabel && <span className="ml-1.5 text-emerald-700 font-semibold">• Google: {userLabel}</span>}
              {lastLoadedAt && <span className="ml-1.5 font-mono text-slate-400">• Đọc lúc {lastLoadedAt}</span>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {safeMasterUrl && (
            <a
              href={safeMasterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở Google Sheet tổng</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => void loadRecords()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B5EA6] hover:bg-[#154b86] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Đang tải...' : 'Làm mới từ Sheet'}</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4 text-xs">
        {/* Feedback banners */}
        {errorMsg && (
          <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isLoading && records.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#1B5EA6]" />
            <span>Đang đọc dữ liệu các tuần từ Google Sheet (không cần đăng nhập)...</span>
          </div>
        ) : !isLoading && (!spreadsheetFound || records.length === 0) ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-600 space-y-2">
            <p>
              Chưa có hồ sơ nào trong sheet <strong>“{TEAM_LEADER_SHEET_NAME}”</strong> của Google Sheet (
              <span className="font-mono font-semibold text-slate-700">{activeSheetId}</span>).
            </p>
            <p>
              Hãy bấm nút <strong>“Tạo báo cáo xử lý trên Google Sheet”</strong> ở <strong>Phần 2</strong> để ghi dữ liệu tuần vào sheet <strong>“{TEAM_LEADER_SHEET_NAME}”</strong>; sau khi ghi xong, Phần 3 sẽ tự động đọc và tổng hợp tại đây.
            </p>
          </div>
        ) : (
          <>
            {/* Scope indicator synchronized with "Bộ lọc báo cáo" */}
            <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/90 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#1A3A5C]">
                  <Filter className="w-3.5 h-3.5 text-emerald-600" />
                  KPI Lớn Theo “Bộ Lọc Báo Cáo”
                </span>
                <span className="px-2 py-0.5 rounded-md border border-slate-200 bg-white font-semibold text-slate-700">
                  Tháng: {activeGlobalMonthKey || 'Tất cả các tháng'}
                </span>
                <span className="px-2 py-0.5 rounded-md border border-slate-200 bg-white font-semibold text-slate-700">
                  Cơ sở: {normalizedGlobalFacility === 'all' ? 'Tất cả cơ sở' : normalizedGlobalFacility}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Đang thống kê{' '}
                <strong className="text-[#1A3A5C]">{reportScopedRecords.length}</strong> / {records.length}{' '}
                hàng từ sheet “{TEAM_LEADER_SHEET_NAME}”
              </span>
            </div>

            {/* 4 BIG KPI BLOCKS (KPI LỚN) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {/* 1. Số lượt trưởng nhóm tiếp nhận */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    1. Số lượt trưởng nhóm tiếp nhận
                  </span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#1A3A5C] font-mono tabular-nums">
                      {bigKpis.receivedCount}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">lượt / hàng</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>
                    Đã tick duyệt: <strong className="text-emerald-700 font-mono">{bigKpis.approvedCount}</strong>
                  </span>
                  <span>
                    Chưa duyệt:{' '}
                    <strong className="text-rose-700 font-mono">
                      {Math.max(0, bigKpis.receivedCount - bigKpis.approvedCount)}
                    </strong>
                  </span>
                </div>
              </div>

              {/* 2. Tỷ lệ xử lý */}
              <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/35 shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1B5EA6] block">
                    2. Tỷ lệ xử lý
                  </span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#1B5EA6] font-mono tabular-nums">
                      {bigKpis.processingRate.toFixed(1)}%
                    </span>
                    <span className="text-[11px] font-mono text-slate-600">
                      ({bigKpis.approvedCount}/{bigKpis.receivedCount})
                    </span>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="w-full h-2 rounded-sm bg-sky-100 overflow-hidden">
                    <div
                      className="h-full bg-[#1B5EA6] transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, bigKpis.processingRate))}%` }}
                    />
                  </div>
                  <p className="text-[10.5px] text-slate-600">
                    Số lượt tick <em>Trưởng nhóm đã duyệt</em> / Tổng số hàng tương ứng
                  </p>
                </div>
              </div>

              {/* 3. Số lượng ngày xử lý trung bình */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/35 shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                    3. Số ngày xử lý trung bình
                  </span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-extrabold text-amber-900 font-mono tabular-nums">
                      {bigKpis.avgProcessingDays !== null ? bigKpis.avgProcessingDays.toFixed(1) : '--'}
                    </span>
                    <span className="text-xs font-semibold text-amber-800">ngày / lượt</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-amber-200/60 text-[10.5px] text-amber-900/90 space-y-0.5">
                  {bigKpis.timedCount > 0 ? (
                    <div className="font-mono font-semibold">
                      Tổng {bigKpis.totalDiffDays} ngày / {bigKpis.timedCount} lượt có Thời gian cập nhật
                    </div>
                  ) : (
                    <div className="italic text-amber-800/80">
                      Chưa có dòng nào có Thời gian cập nhật (cột N)
                    </div>
                  )}
                  <div className="text-slate-600">
                    = (Thời gian cập nhật − Ngày chốt dữ liệu) / Số lượt tính
                  </div>
                </div>
              </div>

              {/* 4. Phương án xử lý: 4 phần % */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    4. Phương án xử lý
                  </span>
                  <span className="text-[10.5px] font-mono text-emerald-800 font-semibold">
                    {bigKpis.methodChosenTotal}/{bigKpis.receivedCount} đã chọn
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                  {bigKpis.methodBreakdown.map(item => (
                    <div
                      key={item.label}
                      className="px-2 py-1.5 rounded-lg border bg-white text-slate-800 border-emerald-200/80"
                    >
                      <div className="text-[10.5px] font-semibold truncate">
                        {item.index}. {item.label}
                      </div>
                      <div className="flex items-baseline justify-between gap-1 mt-0.5 font-mono tabular-nums">
                        <span className="text-sm font-extrabold">
                          {item.percent.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ({item.count})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2 Chỉ số tái phạm & không tái vi phạm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/45 shadow-2xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                    1. Chỉ số tái phạm
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-rose-700">
                    {recurrenceStats.repeatFacilityCount}/{recurrenceStats.totalFacilitiesCount} cơ sở
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-rose-800 font-mono tabular-nums">
                    {recurrenceStats.repeatRate.toFixed(1)}%
                  </span>
                  <span className="text-[11px] text-rose-900/80">
                    ({recurrenceStats.repeatRecordCount} lượt vi phạm lặp lại)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-sm bg-rose-100 overflow-hidden">
                  <div
                    className="h-full bg-rose-600 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, recurrenceStats.repeatRate))}%` }}
                  />
                </div>
                <p className="text-[10.5px] text-slate-600">
                  Tỷ lệ cơ sở vi phạm từ <strong>2 tuần trở lên</strong> trên tổng số cơ sở có hồ sơ trong kỳ lọc
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/45 shadow-2xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    2. Chỉ số không tái vi phạm
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-emerald-700">
                    {recurrenceStats.nonRepeatFacilityCount}/{recurrenceStats.totalFacilitiesCount} cơ sở
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-emerald-800 font-mono tabular-nums">
                    {recurrenceStats.nonRepeatRate.toFixed(1)}%
                  </span>
                  <span className="text-[11px] text-emerald-900/80">
                    (chỉ phát sinh 1 tuần, không lặp lại)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-sm bg-emerald-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, recurrenceStats.nonRepeatRate))}%` }}
                  />
                </div>
                <p className="text-[10.5px] text-slate-600">
                  Tỷ lệ cơ sở chỉ có <strong>1 tuần vi phạm</strong> và không tái phạm trong kỳ lọc
                </p>
              </div>
            </div>

            {/* 4 Aggregation Dimensions */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Tổng hợp theo chiều dữ liệu
                </span>
                <div className="inline-flex flex-wrap rounded-lg bg-white p-0.5 border border-slate-200 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveAggTab('week')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                      activeAggTab === 'week'
                        ? 'bg-[#1B5EA6] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CalendarRange className="w-3 h-3" />
                    <span>Theo Tuần ({byWeekAgg.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAggTab('facility')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                      activeAggTab === 'facility'
                        ? 'bg-[#1B5EA6] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3 h-3" />
                    <span>Theo Cơ sở ({byFacilityAgg.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAggTab('method')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                      activeAggTab === 'method'
                        ? 'bg-[#1B5EA6] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ListChecks className="w-3 h-3" />
                    <span>Theo Phương án xử lý ({byMethodAgg.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAggTab('status')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                      activeAggTab === 'status'
                        ? 'bg-[#1B5EA6] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>Theo Trạng thái</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-64">
                {activeAggTab === 'week' && (
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Tuần</th>
                        <th className="p-2.5 text-center">Tổng cơ sở</th>
                        <th className="p-2.5 text-center text-rose-700">Chưa xử lý</th>
                        <th className="p-2.5 text-center text-amber-700">Chờ QLCL</th>
                        <th className="p-2.5 text-center text-emerald-700">Đã đóng</th>
                        <th className="p-2.5 text-center text-[#1B5EA6]">Hết cảnh báo</th>
                        <th className="p-2.5 text-center">Ngày KCO / Ảnh thiếu</th>
                        <th className="p-2.5 text-center">Google Sheet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {byWeekAgg.map(w => (
                        <tr key={w.key} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-semibold text-[#1A3A5C]">{w.label}</td>
                          <td className="p-2.5 text-center font-mono">{w.total}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-rose-700">
                            {w.unhandled}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-amber-700">
                            {w.pendingQlcl}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-emerald-700">
                            {w.closed}
                          </td>
                          <td className="p-2.5 text-center font-mono text-[#1B5EA6]">{w.cleared}</td>
                          <td className="p-2.5 text-center font-mono text-slate-600">
                            {w.totalNoCheckoutDays} ngày / {w.totalMissingImages} ảnh
                          </td>
                          <td className="p-2.5 text-center">
                            {isSafeSpreadsheetUrl(w.tabUrl) && (
                              <a
                                href={w.tabUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[#1B5EA6] hover:underline font-semibold"
                              >
                                <span>Mở tab</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeAggTab === 'facility' && (
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Cơ sở</th>
                        <th className="p-2.5 text-center">Tổng tuần vi phạm</th>
                        <th className="p-2.5 text-center text-[#1B5EA6]">Số lượt đã nhắc nhở</th>
                        <th className="p-2.5 text-center text-rose-700">Tồn chưa xử lý</th>
                        <th className="p-2.5 text-center text-amber-700">Chờ QLCL</th>
                        <th className="p-2.5 text-center text-emerald-700">Đã đóng</th>
                        <th className="p-2.5 text-center text-[#1B5EA6]">Hết cảnh báo</th>
                        <th className="p-2.5 text-center">Lũy kế KCO / Thiếu ảnh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {byFacilityAgg.map(f => (
                        <tr key={f.coSo} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-semibold text-slate-800">{f.coSo}</td>
                          <td className="p-2.5 text-center font-mono">{f.total}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-[#1B5EA6]">
                            {f.reminderCount} lượt
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-rose-700">
                            {f.unhandled}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-amber-700">
                            {f.pendingQlcl}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-emerald-700">
                            {f.closed}
                          </td>
                          <td className="p-2.5 text-center font-mono text-[#1B5EA6]">{f.cleared}</td>
                          <td className="p-2.5 text-center font-mono text-slate-600">
                            {f.totalNoCheckoutDays} ngày / {f.totalMissingImages} ảnh
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeAggTab === 'method' && (
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Phương án xử lý</th>
                        <th className="p-2.5 text-center">Tổng hồ sơ</th>
                        <th className="p-2.5 text-center text-rose-700">Chưa xử lý</th>
                        <th className="p-2.5 text-center text-amber-700">Chờ QLCL xác nhận</th>
                        <th className="p-2.5 text-center text-emerald-700">Đã đóng</th>
                        <th className="p-2.5 text-center text-[#1B5EA6]">Hết cảnh báo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {byMethodAgg.map(m => (
                        <tr key={m.method} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-semibold text-slate-800">{m.method}</td>
                          <td className="p-2.5 text-center font-mono">{m.total}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-rose-700">
                            {m.unhandled}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-amber-700">
                            {m.pendingQlcl}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-emerald-700">
                            {m.closed}
                          </td>
                          <td className="p-2.5 text-center font-mono text-[#1B5EA6]">{m.cleared}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeAggTab === 'status' && (
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Trạng thái xử lý</th>
                        <th className="p-2.5 text-center">Số hồ sơ</th>
                        <th className="p-2.5 text-center">Tỷ lệ %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {byStatusAgg.map(s => (
                        <tr key={s.status} className="hover:bg-slate-50/80">
                          <td className="p-2.5">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded border text-[11px] font-semibold ${STATUS_BADGE_MAP[s.status]}`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-800">
                            {s.count}
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-600">
                            {s.percent}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
};
