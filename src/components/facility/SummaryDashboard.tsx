import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FacilitySummary, ReportMode, FilterState, HygieneReport, FacilityQualityReport } from './facilityTypes';
import { FacilityStatusModal } from './FacilityStatusModal';
import { 
  OFFICIAL_FACILITIES,
  FACILITY_DAY_TARGETS,
  normalizeFacilityName,
  getFacilityRoomConfig, 
  getDaysInMonthFromFilter,
  getFacilityTargetDetail,
  getFacilityDailyTarget,
  getFacilityDaySchedule,
  calculatePeriodTarget
} from '../../utils/facilityUtils';
import { 
  Building2, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  ShieldCheck, 
  CalendarClock,
  ExternalLink,
  Info,
  Eye,
  FileText,
  AlertOctagon,
  Award,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  PieChart as PieIcon,
  X,
  Search,
  ClipboardList,
  RotateCcw,
  Cloud,
  RefreshCw,
  Code2,
  Copy,
  Check,
  CalendarX2,
  Camera,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { MissingDaysModal, MissingFacilityDayItem } from './MissingDaysModal';
import {
  FacilityDayInspectionModal,
  FacilityDayStatusRecord,
  FacilityDayInspectionItem,
  DayComplianceStatus,
} from './FacilityDayInspectionModal';
import { FacilityMonthlyLineChart } from './FacilityMonthlyLineChart';
import { getImageReviewId, getLocalImageReviews } from '../../services/imageReviewService';
import { normalizeDateToIso } from '../../utils/dateUtils';
import { exportPart2ElementToPdf } from '../../utils/part2PdfExport';
import { PrintReportFooter } from '../PrintReportFooter';
import {
  WarningAuditRecord,
  getLocalWarningAudits,
  replaceLocalWarningAudits,
  saveLocalWarningAudit,
  removeLocalWarningAudit,
  fetchWarningAuditsForDate,
  saveWarningAudit,
  syncWarningFacilitiesForDate,
  resetWarningAuditsForDate,
  formatIsoToDateStr,
  getCurrentTimestampStr,
  syncWarningsToGoogleSheet
} from '../../services/warningAuditService';
import { YesterdayHygieneReview } from './YesterdayHygieneReview';
import { WeeklyWarningSheetModal } from './WeeklyWarningSheetModal';
import { WeeklyTrackingPart3Panel } from './WeeklyTrackingPart3Panel';
import {
  WeeklyTrackingSheetConfig,
  buildWeekCode,
  getLocalWeeklySheetConfig,
  loadWeeklySheetConfig,
} from '../../services/weeklyWarningSheetService';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';

interface MissingImageFacilityDetail {
  coSo: string;
  missingDaysCount: number;
  missingImagesCount: number;
  dailyValidCount: number;
  dailyTargetCount: number;
  missingDates: { shortDate: string; valid: number; target: number; missing: number }[];
}

interface MissingCheckoutFacilitySummary {
  coSo: string;
  missedCount: number;
  missedDates: string[];
}

interface ProblemOccurrenceDetail {
  shortDate: string;
  isoDate: string;
  khuVuc: string;
  reasonTag: string;
}

interface ProblemFacilitySummary {
  coSo: string;
  problemCount: number;
  byDate: { shortDate: string; isoDate: string; areas: { khuVuc: string; reasonTag: string }[] }[];
  dailyAreas: { khuVuc: string; reasonTag: string }[];
}

const parseGlobalMonthFilter = (thang?: string) => {
  if (!thang || thang === 'all') return null;
  const match = thang.match(/(\d{1,2})[\/\-](\d{4})/);
  if (!match) return null;
  const monthNum = parseInt(match[1], 10);
  const year = parseInt(match[2], 10);
  if (monthNum < 1 || monthNum > 12 || year < 2000) return null;
  const monthIdx = monthNum - 1;
  const mm = String(monthNum).padStart(2, '0');
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  return {
    year,
    monthNum,
    monthIdx,
    mm,
    prefix: `${year}-${mm}-`,
    daysInMonth,
    monthStartIso: `${year}-${mm}-01`,
    monthEndIso: `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`,
    monthLabel: `Tháng ${mm}/${year}`,
  };
};

interface SummaryDashboardProps {
  mode: ReportMode;
  onModeChange?: (mode: ReportMode) => void;
  hygieneCount?: number;
  qualityCount?: number;
  summaries: FacilitySummary[];
  totalRecords: number;
  activeFacilityCount: number;
  overallScoreOrRate: number; // e.g. 88.5% or 92/100
  issuesCount: number;
  selectedFacilityFilter: string;
  onSelectFacility: (facilityName: string) => void;
  filters: FilterState;
  onFilterChange?: (filters: FilterState) => void;
  onOpenNewReportWithFacility?: (facilityName: string) => void;
  onOpenDetailModal?: (facilityName: string) => void;
  rawHygieneReports?: HygieneReport[];
  rawQualityReports?: FacilityQualityReport[];
  isDataReady?: boolean;
}

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({
  mode,
  onModeChange,
  hygieneCount,
  qualityCount,
  summaries,
  totalRecords,
  activeFacilityCount,
  overallScoreOrRate,
  issuesCount,
  selectedFacilityFilter,
  onSelectFacility,
  filters,
  onFilterChange,
  onOpenNewReportWithFacility,
  onOpenDetailModal,
  rawHygieneReports = [],
  rawQualityReports = [],
  isDataReady = true,
}) => {
  const isHygiene = mode === 'hygiene';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [missingModalScope, setMissingModalScope] = useState<'daily' | 'week' | 'period' | null>(null);
  const [hoveredKpi2Row, setHoveredKpi2Row] = useState<'daily' | 'week' | 'period' | null>(null);
  const [hoveredKpi4Row, setHoveredKpi4Row] = useState<'daily' | 'week' | 'period' | null>(null);
  const [hoveredKpi5Row, setHoveredKpi5Row] = useState<'daily' | 'week' | 'period' | null>(null);
  const [localImageReviews, setLocalImageReviews] = useState(() => getLocalImageReviews());
  const [showRankingRules, setShowRankingRules] = useState(false);
  const [isRankingTableCollapsed, setIsRankingTableCollapsed] = useState(true);
  const [rowLimit, setRowLimit] = useState<'all' | number>('all');
  const [part2WeekFilter, setPart2WeekFilter] = useState<string>('current');
  const [isExportingPart2Pdf, setIsExportingPart2Pdf] = useState<boolean>(false);
  const [isWeeklySheetModalOpen, setIsWeeklySheetModalOpen] = useState<boolean>(false);
  const [weeklySheetConfig, setWeeklySheetConfig] = useState<WeeklyTrackingSheetConfig>(() =>
    getLocalWeeklySheetConfig(),
  );
  const [inspectionModalState, setInspectionModalState] = useState<{
    facilityName: string;
    dateIso: string;
  } | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const part2PdfSnapshotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadWeeklySheetConfig().then(cfg => setWeeklySheetConfig(cfg));
  }, []);

  useEffect(() => {
    const syncLocalReviews = () => setLocalImageReviews(getLocalImageReviews());
    window.addEventListener('facility-image-reviews-updated', syncLocalReviews);
    window.addEventListener('storage', syncLocalReviews);
    return () => {
      window.removeEventListener('facility-image-reviews-updated', syncLocalReviews);
      window.removeEventListener('storage', syncLocalReviews);
    };
  }, []);

  // Tự động mở rộng bảng nếu người dùng chọn lọc một cơ sở cụ thể
  useEffect(() => {
    if (selectedFacilityFilter && selectedFacilityFilter !== 'all') {
      setIsRankingTableCollapsed(false);
    }
  }, [selectedFacilityFilter]);

  // Reset local week/date overrides whenever global month filter changes
  useEffect(() => {
    setPart2WeekFilter('current');
  }, [filters.thang]);

  // 1. Phân tích tính liên tục: Thống kê số ngày có kiểm tra của từng cơ sở trong kỳ đánh giá
  const continuityData = useMemo(() => {
    const targetFacs =
      filters.coSo && filters.coSo !== 'all'
        ? [normalizeFacilityName(filters.coSo) || filters.coSo]
        : OFFICIAL_FACILITIES;
    const datesByFacility = new Map<string, Set<string>>();
    targetFacs.forEach(f => datesByFacility.set(f, new Set<string>()));

    const parsedMonth = parseGlobalMonthFilter(filters.thang);
    const reports = isHygiene ? rawHygieneReports : rawQualityReports;
    let minIso = '';
    let maxIso = '';

    reports.forEach(r => {
      const fac = normalizeFacilityName(r.coSo) || r.coSo;
      if (!targetFacs.includes(fac)) return;
      const iso = normalizeDateToIso(r.ngay);
      if (!iso) return;

      if (parsedMonth && !iso.startsWith(parsedMonth.prefix)) return;

      if (!datesByFacility.has(fac)) {
        datesByFacility.set(fac, new Set<string>());
      }
      datesByFacility.get(fac)!.add(iso);

      if (!minIso || iso < minIso) minIso = iso;
      if (!maxIso || iso > maxIso) maxIso = iso;
    });

    // Tính số ngày đánh giá thực tế trong kỳ
    let expectedDays = 30;
    if (parsedMonth) {
      const now = new Date();
      const isCurrentMonth =
        parsedMonth.year === now.getFullYear() && parsedMonth.monthIdx === now.getMonth();
      if (isCurrentMonth) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yIso = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        const endIso = maxIso && maxIso < yIso ? maxIso : yIso;
        if (endIso >= parsedMonth.monthStartIso) {
          const dEnd = new Date(
            Number(endIso.slice(0, 4)),
            Number(endIso.slice(5, 7)) - 1,
            Number(endIso.slice(8, 10)),
          );
          const dStart = new Date(parsedMonth.year, parsedMonth.monthIdx, 1);
          expectedDays = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 3600 * 24)) + 1);
        } else {
          expectedDays = 1;
        }
      } else {
        expectedDays = parsedMonth.daysInMonth;
      }
    } else if (minIso && maxIso) {
      const dStart = new Date(Number(minIso.slice(0, 4)), Number(minIso.slice(5, 7)) - 1, Number(minIso.slice(8, 10)));
      const dEnd = new Date(Number(maxIso.slice(0, 4)), Number(maxIso.slice(5, 7)) - 1, Number(maxIso.slice(8, 10)));
      expectedDays = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 3600 * 24)) + 1);
    }

    return { datesByFacility, expectedDays, minIso, maxIso };
  }, [isHygiene, rawHygieneReports, rawQualityReports, filters.thang, filters.coSo]);

  // 2. Tính toán tổng điểm xếp hạng trên thang điểm 100 theo 3 tiêu chí:
  // - Điểm đánh giá TB (Trọng số 30% = Tối đa 30 điểm)
  // - Tiến độ tháng (Trọng số 30% = Tối đa 30 điểm)
  // - Tính liên tục (Trọng số 40% = Tối đa 40 điểm)
  // Công thức: Tổng Điểm = (Điểm TB × 30%) + (Tiến độ tháng % × 30%) + (Tính liên tục % × 40%)
  const facilityScoreMap = useMemo(() => {
    const map = new Map<string, {
      totalScore: number;
      qualityScore: number;
      progressScore: number;
      continuityScore: number;
      rawAvgScore: number;
      rawProgressRate: number;
      rawContinuityRate: number;
      activeDays: number;
      expectedDays: number;
      monthlyTarget: number;
      tier: 'xuat_sac' | 'kha' | 'trung_binh' | 'can_cai_thien';
      tierLabel: string;
      tierColor: string;
      tierBg: string;
    }>();

    const daysInMonth = getDaysInMonthFromFilter(filters.thang);

    summaries.forEach(item => {
      const targetDetail = getFacilityTargetDetail(item.coSo);
      const roomCfg = getFacilityRoomConfig(item.coSo);
      const dailyTarget = targetDetail ? targetDetail.total : (roomCfg.co + roomCfg.ve + roomCfg.nvs + roomCfg.leTan);
      const monthlyTarget = isHygiene ? dailyTarget * daysInMonth : dailyTarget;
      
      // Tiêu chí 1: Điểm Đánh Giá Trung Bình (Trọng số 30% -> Tối đa 30 điểm)
      const rawAvgScore = item.soLanThucHien > 0 ? (item.diemTrungBinh || 0) : 0;
      const qualityScore = (Math.min(100, Math.max(0, rawAvgScore)) / 100) * 30;

      // Tiêu chí 2: Tiến Độ Tháng (Trọng số 30% -> Tối đa 30 điểm)
      const rawProgressRate = monthlyTarget > 0 ? (item.soLanThucHien / monthlyTarget) * 100 : 0;
      const cappedProgressRate = Math.min(100, Math.max(0, rawProgressRate));
      const progressScore = (cappedProgressRate / 100) * 30;

      // Tiêu chí 3: Tính Liên Tục (Trọng số 40% -> Tối đa 40 điểm)
      const activeDatesSet = continuityData.datesByFacility.get(item.coSo) || new Set<string>();
      const activeDays = activeDatesSet.size;
      const expectedDays = Math.max(1, continuityData.expectedDays || 1);
      const rawContinuityRate = Math.min(100, Math.max(0, (activeDays / expectedDays) * 100));
      const continuityScore = (rawContinuityRate / 100) * 40;

      // Tổng Điểm Xếp Hạng (Thang điểm 100: 30đ + 30đ + 40đ)
      const totalScore = item.soLanThucHien > 0 
        ? Math.min(100, Math.max(0, qualityScore + progressScore + continuityScore))
        : 0;

      // Phân hạng danh hiệu
      let tier: 'xuat_sac' | 'kha' | 'trung_binh' | 'can_cai_thien' = 'can_cai_thien';
      let tierLabel = 'Cần Cải Thiện';
      let tierColor = 'text-rose-700';
      let tierBg = 'bg-rose-50 border-rose-200 text-rose-700';

      if (item.soLanThucHien === 0) {
        tier = 'can_cai_thien';
        tierLabel = 'Chưa kiểm tra';
        tierColor = 'text-slate-500';
        tierBg = 'bg-slate-100 border-slate-200 text-slate-500';
      } else if (totalScore >= 90) {
        tier = 'xuat_sac';
        tierLabel = 'Xuất Sắc';
        tierColor = 'text-emerald-700';
        tierBg = 'bg-emerald-50 border-emerald-300 text-emerald-800';
      } else if (totalScore >= 80) {
        tier = 'kha';
        tierLabel = 'Khá';
        tierColor = 'text-blue-700';
        tierBg = 'bg-blue-50 border-blue-300 text-blue-800';
      } else if (totalScore >= 70) {
        tier = 'trung_binh';
        tierLabel = 'Trung Bình';
        tierColor = 'text-amber-700';
        tierBg = 'bg-amber-50 border-amber-300 text-amber-800';
      }

      map.set(item.coSo, {
        totalScore,
        qualityScore,
        progressScore,
        continuityScore,
        rawAvgScore,
        rawProgressRate,
        rawContinuityRate,
        activeDays,
        expectedDays,
        monthlyTarget,
        tier,
        tierLabel,
        tierColor,
        tierBg
      });
    });

    return map;
  }, [summaries, isHygiene, filters.thang, continuityData]);

  // Sorted summaries according to BXH Tổng Điểm 100đ (Điểm TB 30% + Tiến độ 30% + Tính liên tục 40%)
  const sortedSummaries = useMemo(() => {
    const list = [...summaries];
    return list.sort((a, b) => {
      const dataA = facilityScoreMap.get(a.coSo);
      const dataB = facilityScoreMap.get(b.coSo);
      const scoreA = dataA ? dataA.totalScore : 0;
      const scoreB = dataB ? dataB.totalScore : 0;
      if (Math.abs(scoreB - scoreA) > 0.05) return scoreB - scoreA;
      // Tiêu chí phụ khi hòa điểm: Điểm TB -> Số lượt thực hiện
      const avgDiff = (b.diemTrungBinh || 0) - (a.diemTrungBinh || 0);
      if (Math.abs(avgDiff) > 0.05) return avgDiff;
      return b.soLanThucHien - a.soLanThucHien;
    });
  }, [summaries, facilityScoreMap]);

  // 1. Calculate Active Facilities and Score Tiers for Pie Chart (Only facilities that performed checks)
  const activeSummaries = useMemo(() => {
    return summaries.filter(s => s.soLanThucHien > 0);
  }, [summaries]);

  // Target total calculation according to active filters (Tháng + Cơ sở)
  const filterTargetInfo = useMemo(() => {
    const dailyTarget = getFacilityDailyTarget(filters.coSo);
    const days = getDaysInMonthFromFilter(filters.thang);
    const totalTarget = calculatePeriodTarget(filters.coSo, '', '', filters.thang);
    return {
      dailyTarget,
      days,
      totalTarget,
    };
  }, [filters.coSo, filters.thang]);

  const activeFacilitiesCount = activeSummaries.length;

  const scoreTiers = useMemo(() => {
    let xuatSac = 0;   // >= 90
    let kha = 0;       // 80 - 89
    let trungBinh = 0; // 70 - 79
    let canCaiThien = 0; // < 70

    activeSummaries.forEach(s => {
      const score = s.diemTrungBinh || 0;
      if (score >= 90) xuatSac++;
      else if (score >= 80) kha++;
      else if (score >= 70) trungBinh++;
      else canCaiThien++;
    });

    return [
      { name: 'Xuất sắc (≥90đ)', value: xuatSac, color: '#4CAF8A' },
      { name: 'Khá (80 - 89đ)', value: kha, color: '#3EA8E0' },
      { name: 'Trung bình (70 - 79đ)', value: trungBinh, color: '#F9C846' },
      { name: 'Cần cải thiện (<70đ)', value: canCaiThien, color: '#F2775A' },
    ];
  }, [activeSummaries]);

  // Center-wide 6 KPI metrics: Daily (rolled back 1 day since data arrives at 21:00) + Week + Period
  const centerKpiMetrics = useMemo(() => {
    const HYGIENE_PLACEHOLDER = 'images.unsplash.com/photo-1581578731548-c64695cc6952';

    const formatLocalIso = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const parseLocalIso = (iso: string): Date | null => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
      if (!match) return null;
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    };

    const enumerateIsoRange = (start: string, end: string): string[] => {
      const s = parseLocalIso(start);
      const e = parseLocalIso(end);
      if (!s || !e || s > e) return [];
      const dates: string[] = [];
      const cursor = new Date(s);
      let guard = 0;
      while (cursor <= e && guard < 400) {
        dates.push(formatLocalIso(cursor));
        cursor.setDate(cursor.getDate() + 1);
        guard += 1;
      }
      return dates;
    };

    const now = new Date();
    const todayIso = formatLocalIso(now);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const realYesterdayIso = formatLocalIso(yesterdayDate);

    const parsedMonth = parseGlobalMonthFilter(filters.thang);
    const isSelectedCurrentMonth = parsedMonth
      ? parsedMonth.year === now.getFullYear() && parsedMonth.monthIdx === now.getMonth()
      : true;
    const isSelectedFutureMonth = parsedMonth
      ? parsedMonth.monthStartIso > todayIso
      : false;

    const targetFacilities =
      filters.coSo && filters.coSo !== 'all'
        ? [normalizeFacilityName(filters.coSo) || filters.coSo]
        : OFFICIAL_FACILITIES;

    let periodStartIso = formatLocalIso(new Date(now.getFullYear(), now.getMonth(), 1));
    let periodEndIso = realYesterdayIso;
    let periodShortTitle = 'Tất cả các tháng';
    let evalDayIso = realYesterdayIso;

    if (parsedMonth) {
      periodStartIso = parsedMonth.monthStartIso;
      periodEndIso = parsedMonth.monthEndIso;
      periodShortTitle = parsedMonth.monthLabel;
      if (isSelectedCurrentMonth) {
        evalDayIso = realYesterdayIso;
      } else if (isSelectedFutureMonth) {
        evalDayIso = '';
      } else {
        evalDayIso = parsedMonth.monthEndIso;
      }
    } else {
      // 'Tất cả các tháng': tìm khoảng từ ngày đầu tiên có dữ liệu tới hôm qua
      let minIso = '';
      const activeReports = isHygiene ? rawHygieneReports : rawQualityReports;
      activeReports.forEach(r => {
        const fac = normalizeFacilityName(r.coSo) || r.coSo;
        if (!targetFacilities.includes(fac)) return;
        const iso = normalizeDateToIso(r.ngay);
        if (iso && iso <= realYesterdayIso && (!minIso || iso < minIso)) {
          minIso = iso;
        }
      });
      if (minIso) periodStartIso = minIso;
      periodEndIso = realYesterdayIso;
      evalDayIso = realYesterdayIso;
    }

    const evalDisplay = evalDayIso ? formatIsoToDateStr(evalDayIso) : '--/--/----';
    const evalShort = evalDayIso ? evalDisplay.slice(0, 5) : '--/--';

    // Week bounds anchored to evalDayIso (clamped inside selected month if month-filtered)
    const anchorDate = parseLocalIso(evalDayIso) || yesterdayDate;
    const dayOffsetFromMonday = (anchorDate.getDay() + 6) % 7;
    const mondayDate = new Date(anchorDate);
    mondayDate.setDate(mondayDate.getDate() - dayOffsetFromMonday);
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(sundayDate.getDate() + 6);
    const rawWeekStartIso = formatLocalIso(mondayDate);
    const rawWeekEndIso = formatLocalIso(sundayDate);
    const weekStartIso = parsedMonth && rawWeekStartIso < periodStartIso ? periodStartIso : rawWeekStartIso;
    const weekDisplayEndIso = parsedMonth && !isSelectedCurrentMonth && rawWeekEndIso > periodEndIso
      ? periodEndIso
      : rawWeekEndIso;
    const weekEndedDates =
      evalDayIso && evalDayIso >= weekStartIso
        ? enumerateIsoRange(weekStartIso, evalDayIso)
        : [];
    const weekRangeShort = `${formatIsoToDateStr(weekStartIso).slice(0, 5)}–${formatIsoToDateStr(weekDisplayEndIso).slice(0, 5)}`;
    const weekRowLabel = isSelectedCurrentMonth || !parsedMonth ? 'Tuần này' : 'Tuần cuối';

    const periodEndedLimitIso = !evalDayIso
      ? ''
      : periodEndIso < evalDayIso
      ? periodEndIso
      : evalDayIso;
    const periodEndedDates =
      periodEndedLimitIso && periodStartIso <= periodEndedLimitIso
        ? enumerateIsoRange(periodStartIso, periodEndedLimitIso)
        : [];

    const computeRangeStats = (datesToCheck: string[]) => {
      const totalFacilitiesRequired = targetFacilities.length;
      const dateSet = new Set(datesToCheck);

      if (datesToCheck.length === 0) {
        return {
          daysCount: 0,
          sentFacilityCount: 0,
          checkoutCompletedSlots: 0,
          checkoutRequiredSlots: 0,
          checkoutRatePct: 0,
          totalFacilitiesRequired,
          fullComplianceFacilityCount: 0,
          fullComplianceRatePct: 0,
          validCompletedItems: 0,
          requiredTotalItems: 0,
          completionPct: 0,
          missingDaysList: [] as MissingFacilityDayItem[],
          nonCheckoutRatePct: 0,
          missingCheckoutByFacility: [] as MissingCheckoutFacilitySummary[],
          missingImageFacilities: [] as MissingImageFacilityDetail[],
          totalMissingImageDays: 0,
          missingImageCalendarDatesCount: 0,
          totalMissingImages: 0,
          evaluatedItemsTotal: 0,
          problemTotal: 0,
          problemRatePct: 0,
          lowScoreTotal: 0,
          rejectedReviewTotal: 0,
          unresolvedProblemTotal: 0,
          problemFacilities: [] as ProblemFacilitySummary[],
          submittedImagesTotal: 0,
          reviewedImagesTotal: 0,
          pendingImagesTotal: 0,
        };
      }

      const buildProblemFacilitySummaries = (
        map: Map<string, ProblemOccurrenceDetail[]>,
      ): ProblemFacilitySummary[] => {
        return Array.from(map.entries())
          .map(([coSo, occurrences]) => {
            const dateGroupMap = new Map<
              string,
              { shortDate: string; isoDate: string; areas: { khuVuc: string; reasonTag: string }[] }
            >();
            occurrences.forEach(occ => {
              const existing = dateGroupMap.get(occ.isoDate) || {
                shortDate: occ.shortDate,
                isoDate: occ.isoDate,
                areas: [],
              };
              existing.areas.push({ khuVuc: occ.khuVuc, reasonTag: occ.reasonTag });
              dateGroupMap.set(occ.isoDate, existing);
            });
            const byDate = Array.from(dateGroupMap.values()).sort((a, b) =>
              b.isoDate.localeCompare(a.isoDate),
            );
            const dailyAreas = occurrences.map(o => ({
              khuVuc: o.khuVuc,
              reasonTag: o.reasonTag,
            }));
            return {
              coSo,
              problemCount: occurrences.length,
              byDate,
              dailyAreas,
            };
          })
          .sort((a, b) => b.problemCount - a.problemCount || a.coSo.localeCompare(b.coSo, 'vi'));
      };

      if (isHygiene) {
        const dayStatsMap = new Map<string, { rawCount: number; validCount: number }>();
        const sentFacilitiesSet = new Set<string>();
        const problemMap = new Map<string, ProblemOccurrenceDetail[]>();

        let evaluatedItemsTotal = 0;
        let problemTotal = 0;
        let lowScoreTotal = 0;
        let rejectedReviewTotal = 0;
        let unresolvedProblemTotal = 0;
        let submittedImagesTotal = 0;
        let approvedImagesTotal = 0;
        let rejectedImagesTotal = 0;

        rawHygieneReports.forEach(r => {
          const fac = normalizeFacilityName(r.coSo);
          if (!fac || !targetFacilities.includes(fac)) return;
          const iso = normalizeDateToIso(r.ngay);
          if (!iso || !dateSet.has(iso)) return;

          evaluatedItemsTotal += 1;
          sentFacilitiesSet.add(fac);

          const localRec = localImageReviews[getImageReviewId(r)];
          const revStatus: 'pending' | 'approved' | 'rejected' =
            localRec?.reviewStatus === 'approved' || localRec?.reviewStatus === 'rejected'
              ? localRec.reviewStatus
              : localRec?.reviewed
              ? 'approved'
              : r.khongDat?.trim()
              ? 'rejected'
              : r.daDuyet?.trim()
              ? 'approved'
              : 'pending';

          let score100 = r.diemSo || 0;
          if (r.diemSoMax && r.diemSoMax <= 10 && score100 <= 10) score100 *= 10;

          const ttLower = (r.trangThai || '').toLowerCase();
          const combinedFeedback = `${r.phanHoi || ''} ${r.feedbackNguoiDung || ''} ${r.trangThai || ''}`.toLowerCase();

          const isLowScore =
            score100 < 70 ||
            ttLower.includes('không đạt') ||
            ttLower.includes('cần khắc phục') ||
            ttLower.includes('cần dọn dẹp') ||
            ttLower.includes('cần kiểm tra') ||
            ttLower.includes('chưa tắt') ||
            ttLower.includes('bẩn nặng') ||
            ttLower.includes('sự cố');
          const isRejected = revStatus === 'rejected';
          const isValidItem = !isRejected;
          const isProblem = isLowScore || isRejected;
          const isExplicitlyResolved =
            combinedFeedback.includes('đã khắc phục') ||
            combinedFeedback.includes('đã xử lý') ||
            combinedFeedback.includes('đã tắt') ||
            combinedFeedback.includes('đã dọn') ||
            combinedFeedback.includes('hoàn thành');
          const isUnresolved = isRejected || (isProblem && revStatus !== 'approved' && !isExplicitlyResolved);

          if (isProblem) {
            problemTotal += 1;
            if (isLowScore) lowScoreTotal += 1;
            if (isRejected) rejectedReviewTotal += 1;
            if (isUnresolved) unresolvedProblemTotal += 1;
            const list = problemMap.get(fac) || [];
            const reasonTag =
              isRejected && isLowScore
                ? `${Math.round(score100)}đ • KĐ`
                : isRejected
                ? 'KĐ không đạt'
                : score100 < 70
                ? `${Math.round(score100)}đ`
                : r.trangThai?.trim() || `${Math.round(score100)}đ`;
            list.push({
              shortDate: formatIsoToDateStr(iso).slice(0, 5),
              isoDate: iso,
              khuVuc: r.khuVuc?.trim() || 'Chưa rõ khu vực',
              reasonTag,
            });
            problemMap.set(fac, list);
          }

          const hasPhoto = Boolean(r.linkAnh?.trim() && !r.linkAnh.includes(HYGIENE_PLACEHOLDER));
          if (hasPhoto) {
            submittedImagesTotal += 1;
            if (revStatus === 'approved') approvedImagesTotal += 1;
            else if (revStatus === 'rejected') rejectedImagesTotal += 1;
          }

          const key = `${fac}|${iso}`;
          const prev = dayStatsMap.get(key) || { rawCount: 0, validCount: 0 };
          prev.rawCount += 1;
          if (isValidItem) prev.validCount += 1;
          dayStatsMap.set(key, prev);
        });

        let fullComplianceFacilityCount = 0;
        let checkoutCompletedSlots = 0;
        let checkoutRequiredSlots = 0;
        let validCompletedItems = 0;
        let requiredTotalItems = 0;
        const missingDaysList: MissingFacilityDayItem[] = [];
        const missingImageFacilities: MissingImageFacilityDetail[] = [];
        let totalMissingImageDays = 0;
        let totalMissingImages = 0;
        const missingImageCalendarDatesSet = new Set<string>();

        targetFacilities.forEach(fac => {
          let allDaysFull = true;
          let facMissingDays = 0;
          let facMissingImages = 0;
          let singleDayValid = 0;
          let singleDayTarget = 0;
          const facMissingDates: { shortDate: string; valid: number; target: number; missing: number }[] = [];

          datesToCheck.forEach(dIso => {
            const target = getFacilityDailyTarget(fac, dIso);
            const stat = dayStatsMap.get(`${fac}|${dIso}`);
            const raw = stat?.rawCount || 0;
            const valid = stat?.validCount || 0;
            singleDayValid = valid;
            singleDayTarget = target;

            if (target > 0) {
              checkoutRequiredSlots += 1;
              if (raw > 0) {
                checkoutCompletedSlots += 1;
              } else {
                missingDaysList.push({
                  coSo: fac,
                  ngay: dIso,
                  displayDate: formatIsoToDateStr(dIso),
                  shortDate: formatIsoToDateStr(dIso).slice(0, 5),
                  dailyTarget: target,
                });
              }
            }
            if (valid < target) {
              allDaysFull = false;
              const deficit = target - valid;
              facMissingDays += 1;
              facMissingImages += deficit;
              totalMissingImageDays += 1;
              totalMissingImages += deficit;
              missingImageCalendarDatesSet.add(dIso);
              facMissingDates.push({
                shortDate: formatIsoToDateStr(dIso).slice(0, 5),
                valid,
                target,
                missing: deficit,
              });
            }
            validCompletedItems += Math.min(valid, target);
            requiredTotalItems += target;
          });
          if (allDaysFull) {
            fullComplianceFacilityCount += 1;
          } else {
            missingImageFacilities.push({
              coSo: fac,
              missingDaysCount: facMissingDays,
              missingImagesCount: facMissingImages,
              dailyValidCount: singleDayValid,
              dailyTargetCount: singleDayTarget,
              missingDates: facMissingDates,
            });
          }
        });

        missingImageFacilities.sort(
          (a, b) =>
            b.missingImagesCount - a.missingImagesCount ||
            b.missingDaysCount - a.missingDaysCount ||
            a.coSo.localeCompare(b.coSo, 'vi'),
        );

        const missingCheckoutMap = new Map<string, string[]>();
        missingDaysList.forEach(item => {
          const arr = missingCheckoutMap.get(item.coSo) || [];
          arr.push(item.shortDate);
          missingCheckoutMap.set(item.coSo, arr);
        });
        const missingCheckoutByFacility: MissingCheckoutFacilitySummary[] = Array.from(
          missingCheckoutMap.entries(),
        )
          .map(([coSo, missedDates]) => ({
            coSo,
            missedCount: missedDates.length,
            missedDates,
          }))
          .sort((a, b) => b.missedCount - a.missedCount || a.coSo.localeCompare(b.coSo, 'vi'));

        const completionPct =
          requiredTotalItems > 0 ? (validCompletedItems / requiredTotalItems) * 100 : 0;
        const checkoutRatePct =
          checkoutRequiredSlots > 0 ? (checkoutCompletedSlots / checkoutRequiredSlots) * 100 : 0;
        const fullComplianceRatePct =
          totalFacilitiesRequired > 0
            ? (fullComplianceFacilityCount / totalFacilitiesRequired) * 100
            : 0;
        const nonCheckoutRatePct =
          checkoutRequiredSlots > 0 ? (missingDaysList.length / checkoutRequiredSlots) * 100 : 0;
        const problemRatePct =
          evaluatedItemsTotal > 0 ? (problemTotal / evaluatedItemsTotal) * 100 : 0;
        const reviewedImagesTotal = approvedImagesTotal + rejectedImagesTotal;
        const pendingImagesTotal = Math.max(0, submittedImagesTotal - reviewedImagesTotal);

        return {
          daysCount: datesToCheck.length,
          sentFacilityCount: sentFacilitiesSet.size,
          checkoutCompletedSlots,
          checkoutRequiredSlots,
          checkoutRatePct,
          totalFacilitiesRequired,
          fullComplianceFacilityCount,
          fullComplianceRatePct,
          validCompletedItems,
          requiredTotalItems,
          completionPct,
          missingDaysList,
          nonCheckoutRatePct,
          missingCheckoutByFacility,
          missingImageFacilities,
          totalMissingImageDays,
          missingImageCalendarDatesCount: missingImageCalendarDatesSet.size,
          totalMissingImages,
          evaluatedItemsTotal,
          problemTotal,
          problemRatePct,
          lowScoreTotal,
          rejectedReviewTotal,
          unresolvedProblemTotal,
          problemFacilities: buildProblemFacilitySummaries(problemMap),
          submittedImagesTotal,
          reviewedImagesTotal,
          pendingImagesTotal,
        };
      }

      // Quality mode fallback
      const sentSet = new Set<string>();
      const sentFacilityDaySet = new Set<string>();
      const qualityProblemMap = new Map<string, ProblemOccurrenceDetail[]>();
      let problemTotal = 0;
      let unresolvedProblemTotal = 0;
      let resolvedTotal = 0;
      let submittedImagesTotal = 0;
      let totalQualityCount = 0;

      rawQualityReports.forEach(r => {
        const fac = normalizeFacilityName(r.coSo);
        if (!fac || !targetFacilities.includes(fac)) return;
        const iso = normalizeDateToIso(r.ngay);
        if (!iso || !dateSet.has(iso)) return;
        sentSet.add(fac);
        sentFacilityDaySet.add(`${fac}|${iso}`);
        totalQualityCount += 1;
        const isResolved = r.trangThaiGhiNhan === 'Đã xử lý' || r.trangThaiGhiNhan === 'Đã hủy';
        if (isResolved) resolvedTotal += 1;
        const isProblem =
          r.mucDo === 'Khẩn cấp' || r.mucDo === 'Nghiêm trọng' || r.mucDo === 'Cần chú ý' || !isResolved;
        if (isProblem) {
          problemTotal += 1;
          if (!isResolved) unresolvedProblemTotal += 1;
          const list = qualityProblemMap.get(fac) || [];
          list.push({
            shortDate: formatIsoToDateStr(iso).slice(0, 5),
            isoDate: iso,
            khuVuc: r.khuVuc?.trim() || 'Chưa rõ khu vực',
            reasonTag: r.mucDo || r.trangThaiGhiNhan || 'Cần xử lý',
          });
          qualityProblemMap.set(fac, list);
        }
        if (r.linkAnh?.trim()) submittedImagesTotal += 1;
      });

      const qualityCheckoutRequiredSlots = totalFacilitiesRequired * datesToCheck.length;
      const qualityCheckoutCompletedSlots = sentFacilityDaySet.size;
      const qualityCheckoutRatePct =
        qualityCheckoutRequiredSlots > 0
          ? (qualityCheckoutCompletedSlots / qualityCheckoutRequiredSlots) * 100
          : 0;
      const qualityFullComplianceRatePct =
        totalFacilitiesRequired > 0 ? (sentSet.size / totalFacilitiesRequired) * 100 : 0;

      return {
        daysCount: datesToCheck.length,
        sentFacilityCount: sentSet.size,
        checkoutCompletedSlots: qualityCheckoutCompletedSlots,
        checkoutRequiredSlots: qualityCheckoutRequiredSlots,
        checkoutRatePct: qualityCheckoutRatePct,
        totalFacilitiesRequired,
        fullComplianceFacilityCount: sentSet.size,
        fullComplianceRatePct: qualityFullComplianceRatePct,
        validCompletedItems: resolvedTotal,
        requiredTotalItems: Math.max(totalQualityCount, totalFacilitiesRequired),
        completionPct: totalQualityCount > 0 ? (resolvedTotal / totalQualityCount) * 100 : 0,
        missingDaysList: [] as MissingFacilityDayItem[],
        nonCheckoutRatePct: 0,
        missingCheckoutByFacility: [] as MissingCheckoutFacilitySummary[],
        missingImageFacilities: [] as MissingImageFacilityDetail[],
        totalMissingImageDays: 0,
        missingImageCalendarDatesCount: 0,
        totalMissingImages: 0,
        evaluatedItemsTotal: totalQualityCount,
        problemTotal,
        problemRatePct: totalQualityCount > 0 ? (problemTotal / totalQualityCount) * 100 : 0,
        lowScoreTotal: problemTotal,
        rejectedReviewTotal: 0,
        unresolvedProblemTotal,
        problemFacilities: buildProblemFacilitySummaries(qualityProblemMap),
        submittedImagesTotal,
        reviewedImagesTotal: resolvedTotal,
        pendingImagesTotal: Math.max(0, submittedImagesTotal - resolvedTotal),
      };
    };

    const daily = computeRangeStats(evalDayIso ? [evalDayIso] : []);
    const week = computeRangeStats(weekEndedDates);
    const period = computeRangeStats(periodEndedDates);

    return {
      todayDisplay: formatIsoToDateStr(todayIso),
      yesterdayIso: evalDayIso,
      yesterdayDisplay: evalDisplay,
      yesterdayShort: evalShort,
      weekRangeShort,
      weekRowLabel,
      periodShortTitle,
      daily,
      week,
      period,
    };
  }, [
    filters.coSo,
    filters.thang,
    isHygiene,
    rawHygieneReports,
    rawQualityReports,
    localImageReviews,
  ]);

  // Phần 2 (Hygiene): Bảng cảnh báo cơ sở theo ngày gần nhất đã kết thúc, tuần hiện tại & tháng hiện tại
  const part2WarningTableData = useMemo(() => {
    const HYGIENE_PLACEHOLDER = 'images.unsplash.com/photo-1581578731548-c64695cc6952';
    const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    const formatLocalIso = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const parseLocalIso = (iso: string): Date | null => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
      if (!match) return null;
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    };

    const now = new Date();
    const todayIso = formatLocalIso(now);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const realYesterdayIso = formatLocalIso(yesterdayDate);

    // Selected month from global filter (falls back to current month when 'all')
    const parsedMonth = parseGlobalMonthFilter(filters.thang);
    const year = parsedMonth ? parsedMonth.year : now.getFullYear();
    const monthIdx = parsedMonth ? parsedMonth.monthIdx : now.getMonth();
    const daysCountInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const monthLabel = `Tháng ${String(monthIdx + 1).padStart(2, '0')}/${year}`;
    const monthDates: string[] = [];
    for (let day = 1; day <= daysCountInMonth; day++) {
      monthDates.push(formatLocalIso(new Date(year, monthIdx, day)));
    }

    const isSelectedCurrentMonth = year === now.getFullYear() && monthIdx === now.getMonth();
    const isSelectedFutureMonth = monthDates[0] > todayIso;
    const yesterdayIso = isSelectedCurrentMonth
      ? realYesterdayIso
      : isSelectedFutureMonth
      ? ''
      : monthDates[monthDates.length - 1];

    // Chia các ngày trong tháng thành đúng 4 tuần (ưu tiên mốc Thứ 2 -> Chủ Nhật để sáng Thứ 2 gửi báo cáo cho trưởng nhóm)
    interface MonthWeekOption {
      key: string;
      weekNumber: number;
      shortRange: string;
      fullRange: string;
      startIso: string;
      endIso: string;
      daysIso: string[];
      isCurrentWeek: boolean;
      isFutureWeek: boolean;
    }

    const rawWeekBuckets: string[][] = [];
    {
      let currentBucket: string[] = [];
      monthDates.forEach(dIso => {
        const dObj = parseLocalIso(dIso);
        if (dObj && dObj.getDay() === 1 && currentBucket.length > 0) {
          rawWeekBuckets.push(currentBucket);
          currentBucket = [];
        }
        currentBucket.push(dIso);
      });
      if (currentBucket.length > 0) {
        rawWeekBuckets.push(currentBucket);
      }

      // Gộp các ngày lẻ đầu/cuối tháng để tháng luôn có đúng 4 tuần
      while (rawWeekBuckets.length > 4) {
        const firstLen = rawWeekBuckets[0].length;
        const lastLen = rawWeekBuckets[rawWeekBuckets.length - 1].length;
        if (firstLen <= lastLen) {
          const head = rawWeekBuckets.shift()!;
          rawWeekBuckets[0] = [...head, ...rawWeekBuckets[0]];
        } else {
          const tail = rawWeekBuckets.pop()!;
          rawWeekBuckets[rawWeekBuckets.length - 1] = [
            ...rawWeekBuckets[rawWeekBuckets.length - 1],
            ...tail,
          ];
        }
      }
    }

    const monthWeeks: MonthWeekOption[] = rawWeekBuckets.map((bucket, idx) => {
      const weekNum = idx + 1;
      const startIso = bucket[0];
      const endIso = bucket[bucket.length - 1];
      const startStr = formatIsoToDateStr(startIso).slice(0, 5); // DD/MM
      const endStr = formatIsoToDateStr(endIso).slice(0, 5);
      const startDay = startStr.slice(0, 2);
      const endDay = endStr.slice(0, 2);
      const shortRange = startIso === endIso ? startStr : `${startDay}–${endDay}`;
      const fullRange = startIso === endIso ? startStr : `${startStr}–${endStr}`;
      const isCurrentWeek = yesterdayIso
        ? bucket.includes(yesterdayIso) ||
          (!bucket.some(d => d <= yesterdayIso) && bucket.includes(todayIso))
        : weekNum === 1;
      const isFutureWeek = (!yesterdayIso || startIso > yesterdayIso) && !isCurrentWeek;
      return {
        key: `week-${weekNum}`,
        weekNumber: weekNum,
        shortRange,
        fullRange,
        startIso,
        endIso,
        daysIso: bucket,
        isCurrentWeek,
        isFutureWeek,
      };
    });

    const currentWeekOption =
      monthWeeks.find(w => w.isCurrentWeek) || monthWeeks[monthWeeks.length - 1] || null;
    const selectedWeek: MonthWeekOption | null =
      part2WeekFilter === 'all'
        ? null
        : part2WeekFilter === 'current'
        ? currentWeekOption
        : monthWeeks.find(w => w.key === part2WeekFilter) || currentWeekOption;
    const selectedWeekSet = selectedWeek ? new Set(selectedWeek.daysIso) : null;

    // Active week bounds (Mon..Sun around cutoff date, clamped within selected past month)
    const weekAnchorDate = parseLocalIso(yesterdayIso) || yesterdayDate;
    const dayOffsetFromMonday = (weekAnchorDate.getDay() + 6) % 7;
    const mondayDate = new Date(weekAnchorDate);
    mondayDate.setDate(mondayDate.getDate() - dayOffsetFromMonday);
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(sundayDate.getDate() + 6);
    const rawWeekStartIso = formatLocalIso(mondayDate);
    const rawWeekEndIso = formatLocalIso(sundayDate);
    const weekStartIso = rawWeekStartIso < monthDates[0] ? monthDates[0] : rawWeekStartIso;
    const weekEndIso =
      !isSelectedCurrentMonth && rawWeekEndIso > monthDates[monthDates.length - 1]
        ? monthDates[monthDates.length - 1]
        : rawWeekEndIso;
    const weekRangeShort = `${formatIsoToDateStr(weekStartIso).slice(0, 5)}–${formatIsoToDateStr(weekEndIso).slice(0, 5)}`;

    const weekEndedDates: string[] = [];
    if (yesterdayIso) {
      const cursor = new Date(mondayDate);
      for (let i = 0; i < 7; i++) {
        const dIso = formatLocalIso(cursor);
        if (dIso >= monthDates[0] && dIso <= yesterdayIso) weekEndedDates.push(dIso);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    const weekEndedSet = new Set(weekEndedDates);

    // Index rawHygieneReports by date (system total + distinct facilities) and by facility|date
    const systemCountByDate = new Map<string, number>();
    const systemFacilitiesByDate = new Map<string, Set<string>>();
    const reportsByFacilityDate = new Map<string, HygieneReport[]>();
    let maxSyncedIso = '';

    rawHygieneReports.forEach(r => {
      const iso = normalizeDateToIso(r.ngay);
      if (!iso) return;
      if (iso <= todayIso && (!maxSyncedIso || iso > maxSyncedIso)) {
        maxSyncedIso = iso;
      }
      systemCountByDate.set(iso, (systemCountByDate.get(iso) || 0) + 1);

      const fac = normalizeFacilityName(r.coSo);
      if (!fac) return;
      let facSet = systemFacilitiesByDate.get(iso);
      if (!facSet) {
        facSet = new Set<string>();
        systemFacilitiesByDate.set(iso, facSet);
      }
      facSet.add(fac);

      const key = `${fac}|${iso}`;
      const arr = reportsByFacilityDate.get(key) || [];
      arr.push(r);
      reportsByFacilityDate.set(key, arr);
    });

    const isSyncVerified = isDataReady && rawHygieneReports.length > 0 && Boolean(maxSyncedIso);

    const evaluateFacilityDay = (fac: string, dIso: string): FacilityDayStatusRecord => {
      const dObj = parseLocalIso(dIso);
      const dayNum = dObj ? dObj.getDate() : 0;
      const weekdayLabel = dObj ? WEEKDAY_LABELS[dObj.getDay()] : '';
      const displayDate = formatIsoToDateStr(dIso);
      const shortDate = displayDate.slice(0, 5);

      const hasScheduleConfig = Boolean(FACILITY_DAY_TARGETS[fac] && getFacilityTargetDetail(fac));
      const daySchedule = hasScheduleConfig ? getFacilityDaySchedule(fac, dIso) : null;
      const dailyTarget = daySchedule ? daySchedule.target : null;
      const isDayOff = Boolean(daySchedule?.isDayOff);
      const scheduleNote = daySchedule?.note;

      const dayReports = reportsByFacilityDate.get(`${fac}|${dIso}`) || [];
      const seenPhotoAreas = new Set<string>();
      let duplicatePhotosCount = 0;

      const items: FacilityDayInspectionItem[] = dayReports.map(r => {
        const hasRealPhoto = Boolean(r.linkAnh?.trim() && !r.linkAnh.includes(HYGIENE_PLACEHOLDER));
        const normalizedCategoryKey =
          (r.khuVuc || '').trim().toLowerCase().replace(/\s+/g, ' ') || '__chua_ro_khu_vuc__';

        let isDuplicateCategory = false;
        if (hasRealPhoto) {
          if (seenPhotoAreas.has(normalizedCategoryKey)) {
            isDuplicateCategory = true;
            duplicatePhotosCount += 1;
          } else {
            seenPhotoAreas.add(normalizedCategoryKey);
          }
        }

        return {
          report: r,
          normalizedCategoryKey,
          hasRealPhoto,
          isDuplicateCategory,
        };
      });

      const photoCompletedItems = seenPhotoAreas.size;
      const rawCount = dayReports.length;
      const systemFacilityCount = systemFacilitiesByDate.get(dIso)?.size || 0;

      let status: DayComplianceStatus;
      let missingCount = 0;

      if (dIso >= todayIso) {
        status = 'upcoming';
      } else if (!hasScheduleConfig || dailyTarget === null || !isSyncVerified) {
        status = 'insufficient_data';
      } else if (dIso > maxSyncedIso) {
        status = 'insufficient_data';
      } else if (isDayOff || dailyTarget <= 0) {
        status = 'off_or_unsynced';
      } else if ((systemCountByDate.get(dIso) || 0) === 0 || (rawCount === 0 && systemFacilityCount < 3)) {
        status = 'off_or_unsynced';
      } else {
        missingCount = Math.max(0, dailyTarget - photoCompletedItems);
        if (rawCount === 0) {
          status = 'no_checkout';
        } else if (photoCompletedItems < dailyTarget) {
          status = 'incomplete';
        } else {
          status = 'complete';
        }
      }

      return {
        iso: dIso,
        dayNum,
        shortDate,
        displayDate,
        weekdayLabel,
        dailyTarget,
        isDayOff,
        scheduleNote,
        status,
        rawCount,
        photoCompletedItems,
        duplicatePhotosCount,
        missingCount,
        items,
      };
    };

    const targetFacilities =
      filters.coSo && filters.coSo !== 'all'
        ? [normalizeFacilityName(filters.coSo) || filters.coSo]
        : OFFICIAL_FACILITIES;

    const statusSortRank: Record<DayComplianceStatus, number> = {
      no_checkout: 0,
      incomplete: 1,
      insufficient_data: 2,
      off_or_unsynced: 2,
      upcoming: 3,
      complete: 4,
    };

    const rows = targetFacilities.map(fac => {
      const monthDays = monthDates.map(dIso => evaluateFacilityDay(fac, dIso));
      const monthMap = new Map(monthDays.map(d => [d.iso, d]));
      const fallbackDayIso = yesterdayIso || monthDates[0];
      const latestDay = monthMap.get(fallbackDayIso) || evaluateFacilityDay(fac, fallbackDayIso);

      let monthMissingImages = 0;
      let monthNoCheckoutDays = 0;
      let monthEvaluatedDueDays = 0;
      monthDays.forEach(d => {
        if (d.status === 'no_checkout' || d.status === 'incomplete' || d.status === 'complete') {
          monthEvaluatedDueDays += 1;
          monthMissingImages += d.missingCount;
          if (d.status === 'no_checkout') monthNoCheckoutDays += 1;
        }
      });

      let weekMissingImages = 0;
      let weekNoCheckoutDays = 0;
      let weekEvaluatedDueDays = 0;
      weekEndedDates.forEach(dIso => {
        const d = monthMap.get(dIso) || evaluateFacilityDay(fac, dIso);
        if (d.status === 'no_checkout' || d.status === 'incomplete' || d.status === 'complete') {
          weekEvaluatedDueDays += 1;
          weekMissingImages += d.missingCount;
          if (d.status === 'no_checkout') weekNoCheckoutDays += 1;
        }
      });

      const selectedWeekDays = selectedWeekSet
        ? monthDays.filter(d => selectedWeekSet.has(d.iso))
        : monthDays;

      const activeLatestDay = selectedWeek
        ? (yesterdayIso
            ? [...selectedWeekDays].reverse().find(d => d.iso <= yesterdayIso && d.status !== 'upcoming')
            : undefined) ||
          selectedWeekDays[0] ||
          latestDay
        : latestDay;

      let selectedWeekMissingImages = 0;
      let selectedWeekNoCheckoutDays = 0;
      let selectedWeekEvaluatedDueDays = 0;
      let selectedWeekPhotoCompleted = 0;
      let selectedWeekTargetTotal = 0;
      selectedWeekDays.forEach(d => {
        if (d.status === 'no_checkout' || d.status === 'incomplete' || d.status === 'complete') {
          selectedWeekEvaluatedDueDays += 1;
          selectedWeekMissingImages += d.missingCount;
          selectedWeekPhotoCompleted += d.photoCompletedItems;
          selectedWeekTargetTotal += d.dailyTarget || 0;
          if (d.status === 'no_checkout') selectedWeekNoCheckoutDays += 1;
        }
      });

      return {
        coSo: fac,
        latestDay,
        activeLatestDay,
        monthDays,
        selectedWeekDays,
        weekEndedSet,
        weekMissingImages,
        weekNoCheckoutDays,
        weekEvaluatedDueDays,
        monthMissingImages,
        monthNoCheckoutDays,
        monthEvaluatedDueDays,
        selectedWeekMissingImages,
        selectedWeekNoCheckoutDays,
        selectedWeekEvaluatedDueDays,
        selectedWeekPhotoCompleted,
        selectedWeekTargetTotal,
      };
    });

    rows.sort((a, b) => {
      const aLatest = a.activeLatestDay;
      const bLatest = b.activeLatestDay;
      const rankDiff = statusSortRank[aLatest.status] - statusSortRank[bLatest.status];
      if (rankDiff !== 0) return rankDiff;

      const latestMissingDiff = bLatest.missingCount - aLatest.missingCount;
      if (latestMissingDiff !== 0) return latestMissingDiff;

      const scopeMissingDiff = selectedWeek
        ? b.selectedWeekMissingImages - a.selectedWeekMissingImages
        : b.monthMissingImages - a.monthMissingImages;
      if (scopeMissingDiff !== 0) return scopeMissingDiff;

      const secondaryDiff = selectedWeek
        ? b.selectedWeekNoCheckoutDays - a.selectedWeekNoCheckoutDays
        : b.weekMissingImages - a.weekMissingImages;
      if (secondaryDiff !== 0) return secondaryDiff;

      return a.coSo.localeCompare(b.coSo, 'vi');
    });

    const cutoffDisplay = yesterdayIso ? formatIsoToDateStr(yesterdayIso) : '--/--/----';
    const cutoffShort = yesterdayIso ? cutoffDisplay.slice(0, 5) : '--/--';

    const activeStatusDateShort = selectedWeek
      ? rows[0]?.activeLatestDay.shortDate || selectedWeek.shortRange
      : cutoffShort;

    const summaryCounts = {
      total: rows.length,
      noCheckout: rows.filter(r => r.activeLatestDay.status === 'no_checkout').length,
      incomplete: rows.filter(r => r.activeLatestDay.status === 'incomplete').length,
      complete: rows.filter(r => r.activeLatestDay.status === 'complete').length,
      insufficient: rows.filter(
        r =>
          r.activeLatestDay.status === 'insufficient_data' ||
          r.activeLatestDay.status === 'off_or_unsynced',
      ).length,
      totalWeekMissingImages: rows.reduce((s, r) => s + r.weekMissingImages, 0),
      totalMonthMissingImages: rows.reduce((s, r) => s + r.monthMissingImages, 0),
      totalWeekNoCheckoutDays: rows.reduce((s, r) => s + r.weekNoCheckoutDays, 0),
      totalMonthNoCheckoutDays: rows.reduce((s, r) => s + r.monthNoCheckoutDays, 0),
      totalSelectedWeekMissingImages: rows.reduce((s, r) => s + r.selectedWeekMissingImages, 0),
      totalSelectedWeekNoCheckoutDays: rows.reduce((s, r) => s + r.selectedWeekNoCheckoutDays, 0),
    };

    return {
      todayIso,
      yesterdayIso,
      yesterdayDisplay: cutoffDisplay,
      yesterdayShort: cutoffShort,
      activeStatusDateShort,
      weekRangeShort,
      monthLabel,
      monthNumStr: String(monthIdx + 1).padStart(2, '0'),
      yearNum: year,
      monthWeeks,
      selectedWeek,
      daysCountInMonth,
      maxSyncedIso,
      isSyncVerified,
      rows,
      summaryCounts,
    };
  }, [rawHygieneReports, filters.coSo, filters.thang, isDataReady, part2WeekFilter]);

  const handleDownloadPart2Report = async () => {
    const { rows, selectedWeek, monthNumStr, yearNum } = part2WarningTableData;
    if (!rows.length || isExportingPart2Pdf) return;

    setIsExportingPart2Pdf(true);
    try {
      // Wait for offscreen snapshot container and SVG charts to mount
      await new Promise<void>(resolve => setTimeout(resolve, 60));
      const snapshotEl = part2PdfSnapshotRef.current;
      if (!snapshotEl) return;

      const weekOrMonthPart = selectedWeek
        ? `Tuan_${selectedWeek.weekNumber}_${selectedWeek.shortRange.replace(/[\/–]/g, '-')}_${monthNumStr}_${yearNum}`
        : `Thang_${monthNumStr}_${yearNum}`;
      const facilityPart =
        filters.coSo && filters.coSo !== 'all'
          ? `_${filters.coSo
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/gi, 'd')
              .replace(/[^a-zA-Z0-9]+/g, '_')
              .replace(/^_+|_+$/g, '')}`
          : '';
      const filename = `DANH_SACH_CO_SO_CAN_XU_LY_TUAN_${weekOrMonthPart}${facilityPart}.pdf`;

      await exportPart2ElementToPdf({
        element: snapshotEl,
        filename,
      });
    } catch (err) {
      console.error('Lỗi xuất PDF Phần 2:', err);
    } finally {
      setIsExportingPart2Pdf(false);
    }
  };

  // Reference Date Info obeying global Tháng filter (current month/all -> yesterday; past month -> last day of month)
  const yesterdayInfo = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const parsedMonth = parseGlobalMonthFilter(filters.thang);
    if (parsedMonth) {
      const isCurrentMonth =
        parsedMonth.year === today.getFullYear() && parsedMonth.monthIdx === today.getMonth();
      const isPastMonth =
        parsedMonth.year < today.getFullYear() ||
        (parsedMonth.year === today.getFullYear() && parsedMonth.monthIdx < today.getMonth());
      if (isPastMonth) {
        const yyyy = String(parsedMonth.year);
        const mm = parsedMonth.mm;
        const dd = String(parsedMonth.daysInMonth).padStart(2, '0');
        return { isoStr: `${yyyy}-${mm}-${dd}`, displayStr: `${dd}/${mm}/${yyyy}` };
      }
      if (!isCurrentMonth) {
        const yyyy = String(parsedMonth.year);
        const mm = parsedMonth.mm;
        return { isoStr: `${yyyy}-${mm}-01`, displayStr: `01/${mm}/${yyyy}` };
      }
    }

    const yyyy = yesterday.getFullYear();
    const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
    const dd = String(yesterday.getDate()).padStart(2, '0');

    const isoStr = `${yyyy}-${mm}-${dd}`;
    const displayStr = `${dd}/${mm}/${yyyy}`;

    return { isoStr, displayStr };
  }, [filters.thang]);

  // Baseline "Ngày đang xét" theo tháng đang lọc
  const baselineWarningDateIso = yesterdayInfo.isoStr;

  // Single date state for Warning Card
  const [customWarningDate, setCustomWarningDate] = useState<string>('');

  useEffect(() => {
    setCustomWarningDate('');
  }, [filters.thang]);

  const activeWarningDateIso = customWarningDate || baselineWarningDateIso;

  const isCustomDateActive = Boolean(customWarningDate && customWarningDate !== baselineWarningDateIso);

  const activeWarningDisplayStr = useMemo(() => {
    if (!activeWarningDateIso) return '';
    const parts = activeWarningDateIso.trim().split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return activeWarningDateIso;
  }, [activeWarningDateIso]);

  // 2. Identify Warning Facilities for the single selected date (obeying filters.coSo & filters.thang)
  const warningFacilities = useMemo(() => {
    const isInRange = (dStr: string) => {
      const iso = normalizeDateToIso(dStr);
      if (!iso) return false;
      return iso === activeWarningDateIso;
    };

    const result: {
      coSo: string;
      performedCount: number;
      dailyTarget: number;
      periodTarget: number;
      avgScore: number;
      isLowScore: boolean;
      hasLowAreaScore: boolean;
      isMissingTarget: boolean;
      hasUnfinishedAirCon: boolean;
      reasons: string[];
    }[] = [];

    const targetFacilities =
      filters.coSo && filters.coSo !== 'all'
        ? [normalizeFacilityName(filters.coSo) || filters.coSo]
        : OFFICIAL_FACILITIES;

    targetFacilities.forEach(coSo => {
      const daySchedule = getFacilityDaySchedule(coSo, activeWarningDateIso);
      if (daySchedule.isDayOff || daySchedule.target <= 0) {
        return;
      }
      const dailyTarget = daySchedule.target;
      const periodTarget = dailyTarget;

      const reports = isHygiene
        ? rawHygieneReports.filter(r => (normalizeFacilityName(r.coSo) || r.coSo) === coSo && isInRange(r.ngay))
        : rawQualityReports.filter(r => (normalizeFacilityName(r.coSo) || r.coSo) === coSo && isInRange(r.ngay));

      const allCoSoHygieneReports = rawHygieneReports.filter(
        r => (normalizeFacilityName(r.coSo) || r.coSo) === coSo && isInRange(r.ngay),
      );
      const allCoSoQualityReports = rawQualityReports.filter(
        r => (normalizeFacilityName(r.coSo) || r.coSo) === coSo && isInRange(r.ngay),
      );

      const performedCount = reports.length;
      // Thiếu từ 10% chỉ tiêu yêu cầu
      const isMissingTarget = performedCount < periodTarget * 0.9;

      let avgScore = 0;
      const lowScoreAreas: { khuVuc: string; score: number }[] = [];

      if (isHygiene && performedCount > 0) {
        let sum = 0;
        reports.forEach(r => {
          const hr = r as HygieneReport;
          let s = hr.diemSo || 0;
          if (hr.diemSoMax && hr.diemSoMax <= 10 && s <= 10) s *= 10;
          sum += s;

          if (s < 70) {
            lowScoreAreas.push({
              khuVuc: hr.khuVuc || 'Khu vực chưa đặt tên',
              score: Math.round(s)
            });
          }
        });
        avgScore = sum / performedCount;
      }

      // Check for low score threshold (< 70)
      const isLowScore = isHygiene && performedCount > 0 && avgScore < 70;
      const hasLowAreaScore = lowScoreAreas.length > 0;

      // Check for unfinished air conditioner ("chưa tắt máy lạnh")
      const acUnfinishedAreas: string[] = [];

      const checkAcText = (text: string, khuVucName: string) => {
        const t = (text || '').toLowerCase();
        const kv = (khuVucName || '').toLowerCase();
        const isAcArea = kv.includes('máy lạnh') || kv.includes('điều hòa') || kv.includes('aircon');
        const hasAcKeyword = t.includes('máy lạnh') || t.includes('điều hòa') || t.includes('aircon') || isAcArea;
        const hasUnfinishedKeyword = 
          t.includes('chưa tắt') || 
          t.includes('chua tat') || 
          t.includes('quên tắt') || 
          t.includes('quen tat') || 
          t.includes('không tắt') || 
          t.includes('khong tat') || 
          t.includes('chạy qua đêm') || 
          t.includes('chạy liên tục') || 
          t.includes('chưa ngắt');

        return (hasAcKeyword && hasUnfinishedKeyword) || (isAcArea && (hasUnfinishedKeyword || t.includes('báo sự cố') || t.includes('chưa xử lý')));
      };

      allCoSoHygieneReports.forEach(r => {
        const combined = `${r.chiTiet || ''} ${r.phanHoi || ''} ${r.feedbackNguoiDung || ''} ${r.trangThai || ''}`;
        if (checkAcText(combined, r.khuVuc)) {
          const kv = r.khuVuc || 'Hệ thống máy lạnh';
          if (!acUnfinishedAreas.includes(kv)) acUnfinishedAreas.push(kv);
        }
      });

      allCoSoQualityReports.forEach(r => {
        const combined = `${r.deXuat || ''} ${r.mucDo || ''} ${r.trangThaiGhiNhan || ''}`;
        if (checkAcText(combined, r.khuVuc)) {
          const kv = r.khuVuc || 'Hệ thống máy lạnh';
          if (!acUnfinishedAreas.includes(kv)) acUnfinishedAreas.push(kv);
        }
      });

      const hasUnfinishedAirCon = acUnfinishedAreas.length > 0;

      const reasons: string[] = [];

      if (performedCount === 0) {
        reasons.push(`Chưa báo cáo trong ngày (0/${dailyTarget} lượt)`);
      } else {
        if (isMissingTarget) {
          reasons.push(`Thiếu chỉ tiêu (${performedCount}/${periodTarget} lượt)`);
        }
        if (isLowScore) {
          reasons.push(`Điểm TB dưới 70 điểm (${avgScore.toFixed(1)}/100đ)`);
        }
        if (hasLowAreaScore && !isLowScore) {
          const areaDetails = lowScoreAreas.map(a => `${a.khuVuc} (${a.score}đ)`).join(', ');
          reasons.push(`Khu vực dưới 70đ: ${areaDetails}`);
        }
      }

      if (hasUnfinishedAirCon) {
        reasons.push(`Chưa tắt máy lạnh: ${acUnfinishedAreas.join(', ')}`);
      }

      if (reasons.length > 0) {
        result.push({
          coSo,
          performedCount,
          dailyTarget,
          periodTarget,
          avgScore,
          isLowScore,
          hasLowAreaScore,
          isMissingTarget,
          hasUnfinishedAirCon,
          reasons,
        });
      }
    });

    return result;
  }, [rawHygieneReports, rawQualityReports, isHygiene, activeWarningDateIso, filters.coSo]);

  // Custom label renderer for Pie Chart Slices showing %
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (!percent || percent < 0.03) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="#ffffff" 
        textAnchor="middle" 
        dominantBaseline="central" 
        className="text-[14px] font-black drop-shadow-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Warning Audits (Manager Inspection check state for each facility on selected date)
  const [warningAudits, setWarningAudits] = useState<Record<string, WarningAuditRecord>>(() => getLocalWarningAudits());
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isLoadingAudits, setIsLoadingAudits] = useState(false);
  const [isAutoSyncingWarnings, setIsAutoSyncingWarnings] = useState(false);
  const [isSyncingWarningsToSheet, setIsSyncingWarningsToSheet] = useState(false);
  const [savingAuditId, setSavingAuditId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const lastWarningSyncFingerprint = useRef('');
  const hasAutoSyncedInitialForDate = useRef<Record<string, boolean>>({});
  const autoSyncDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Hàm tự động đổ dữ liệu về Google Sheet không cần nhấn nút
  const autoSyncToGoogleSheet = async (
    targetAudits: Record<string, WarningAuditRecord>,
    successMessage?: string,
    isInitial = false
  ) => {
    if (warningFacilities.length === 0 || !activeWarningDateIso) return;
    setIsSyncingWarningsToSheet(true);
    try {
      await syncWarningsToGoogleSheet(
        activeWarningDateIso,
        warningFacilities.map(({ coSo, reasons }) => ({ coSo, reasons })),
        targetAudits
      );
      if (successMessage) {
        setSyncFeedback({
          message: successMessage,
          type: 'success'
        });
        setTimeout(() => setSyncFeedback(null), 3500);
      } else if (isInitial) {
        setSyncFeedback({
          message: `Đã tự động cập nhật danh sách cảnh báo vào sheet "nhắc nhở"!`,
          type: 'success'
        });
        setTimeout(() => setSyncFeedback(null), 3500);
      }
    } catch (err) {
      console.warn('Tự động đổ vào sheet nhắc nhở chưa thành công:', err);
    } finally {
      setIsSyncingWarningsToSheet(false);
    }
  };

  useEffect(() => {
    let isActive = true;
    setIsLoadingAudits(true);

    fetchWarningAuditsForDate(activeWarningDateIso)
      .then(records => {
        if (!isActive) return;
        setWarningAudits(previous => {
          const next: Record<string, WarningAuditRecord> = { ...previous };
          records.forEach(record => {
            next[record.id] = record;
          });
          replaceLocalWarningAudits(next);
          return next;
        });
      })
      .catch(error => {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : 'Không thể tải trạng thái đã lưu';
        setSyncFeedback({
          message: `Chưa tải được dữ liệu máy chủ: ${message}. Website vẫn giữ bản gần nhất trên trình duyệt.`,
          type: 'error'
        });
      })
      .finally(() => {
        if (isActive) setIsLoadingAudits(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeWarningDateIso]);

  const warningSyncFingerprint = useMemo(() => JSON.stringify(
    warningFacilities.map(({ coSo, reasons }) => ({ coSo, reasons })),
  ), [warningFacilities]);

  useEffect(() => {
    if (!isDataReady || !activeWarningDateIso || warningFacilities.length === 0) return;
    const fingerprint = `${activeWarningDateIso}|${warningSyncFingerprint}`;
    if (lastWarningSyncFingerprint.current === fingerprint) return;
    lastWarningSyncFingerprint.current = fingerprint;

    let isActive = true;
    setIsAutoSyncingWarnings(true);
    syncWarningFacilitiesForDate(
      activeWarningDateIso,
      warningFacilities.map(({ coSo, reasons }) => ({ coSo, reasons })),
      warningAudits,
    )
      .then(async ({ records, warning }) => {
        if (!isActive) return;
        setWarningAudits(previous => {
          const next = { ...previous };
          records.forEach(record => {
            const prev = next[record.id];
            // TUYỆT ĐỐI BẢO VỆ TRẠNG THÁI ĐÃ NHẮC NHỞ HOẶC LỖI APP, KHÔNG ĐÈ TRẠNG THÁI RỖNG
            if (prev && prev.loaiTrangThai && prev.loaiTrangThai !== 'chua_xu_ly') {
              return;
            }
            next[record.id] = record;
          });
          replaceLocalWarningAudits(next);
          return next;
        });

        if (warning) {
          setSyncFeedback({
            message: `Cảnh báo đã lưu trên website nhưng chưa ghi được vào Google Sheet: ${warning}`,
            type: 'error',
          });
        }
      })
      .catch(error => {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : 'Không thể tự ghi cảnh báo';
        setSyncFeedback({ message: `Chưa tự ghi được cảnh báo: ${message}`, type: 'error' });
      })
      .finally(() => {
        if (isActive) setIsAutoSyncingWarnings(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeWarningDateIso, isDataReady, warningFacilities, warningSyncFingerprint, warningAudits]);

  // Hủy tất cả nhận định đã chọn và tự động cập nhật trống vào Google Sheet
  const handleClearAllWarningChecks = async () => {
    if (warningFacilities.length === 0) {
      setSyncFeedback({
        message: `Ngày ${activeWarningDisplayStr} không có cơ sở nào bị cảnh báo.`,
        type: 'info'
      });
      setTimeout(() => setSyncFeedback(null), 3000);
      return;
    }

    setIsClearingAll(true);
    try {
      const resetRecords = await resetWarningAuditsForDate(activeWarningDateIso);
      const next: Record<string, WarningAuditRecord> = { ...warningAudits };
      resetRecords.forEach(record => {
        next[record.id] = record;
      });
      replaceLocalWarningAudits(next);
      setWarningAudits(next);

      // Tự động đồng bộ hủy hết lựa chọn ban đầu lên Google Sheet (cả 2 cột trống)
      await autoSyncToGoogleSheet(
        next,
        `Đã hủy tất cả nhận định và tự động cập nhật trống vào sheet "nhắc nhở".`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể đặt lại nhận định';
      setSyncFeedback({ message: `Đặt lại chưa thành công: ${message}`, type: 'error' });
    } finally {
      setIsClearingAll(false);
    }
  };

  // Tích vào ô nào sẽ cập nhật đúng ô đó vào Google Sheet theo thời gian thực
  const handleToggleWarningAudit = async (coSo: string, targetType: 'da_nhac_nho' | 'loi_app', reasons: string[]) => {
    const auditId = `${coSo}_${activeWarningDateIso}`;
    const existing = warningAudits[auditId];
    if (savingAuditId === auditId) return;
    setSavingAuditId(auditId);

    try {
      const nextType = existing?.loaiTrangThai === targetType ? 'chua_xu_ly' : targetType;
      const label = nextType === 'da_nhac_nho'
        ? 'Đã nhắc nhở'
        : nextType === 'loi_app'
        ? 'Lỗi app'
        : 'Chưa nhận định';
      const newRecord: WarningAuditRecord = {
        id: auditId,
        coSo,
        ngay: activeWarningDateIso,
        thoiGianPhatHien: existing?.thoiGianPhatHien,
        thoiGianTich: nextType === 'chua_xu_ly' ? '' : getCurrentTimestampStr(),
        trangThai: label,
        loaiTrangThai: nextType,
        lyDoCanhBao: reasons.join('; '),
        soLuotCanhBao: Math.max(1, reasons.length),
        daNhacNho: nextType === 'da_nhac_nho',
        loiApp: nextType === 'loi_app',
        nguoiXuLy: nextType === 'chua_xu_ly' ? '' : 'Quản lý kiểm tra',
        emailThucHien: ''
      };
      saveLocalWarningAudit(newRecord);
      const updatedAudits = { ...warningAudits, [auditId]: newRecord };
      setWarningAudits(updatedAudits);

      const savedRecord = await saveWarningAudit(newRecord);
      saveLocalWarningAudit(savedRecord);
      const finalAudits = { ...updatedAudits, [auditId]: savedRecord };
      setWarningAudits(finalAudits);

      // Tự động cập nhật đúng ô đó vào Google Sheet (debounce 400ms)
      if (autoSyncDebounceTimer.current) clearTimeout(autoSyncDebounceTimer.current);
      autoSyncDebounceTimer.current = setTimeout(() => {
        autoSyncToGoogleSheet(
          finalAudits,
          `${coSo}: ${label} • Đã tự động cập nhật vào sheet "nhắc nhở".`
        );
      }, 400);
    } catch (error) {
      if (existing) {
        saveLocalWarningAudit(existing);
        setWarningAudits(previous => ({ ...previous, [auditId]: existing }));
      } else {
        removeLocalWarningAudit(auditId);
        setWarningAudits(previous => {
          const next = { ...previous };
          delete next[auditId];
          return next;
        });
      }
      const message = error instanceof Error ? error.message : 'Không thể lưu trạng thái';
      setSyncFeedback({ message: `Chưa lưu được ${coSo}: ${message}`, type: 'error' });
    } finally {
      setSavingAuditId(null);
    }
  };

  const totalWarningReasons = warningFacilities.reduce(
    (total, item) => total + Math.max(1, item.reasons.length),
    0,
  );
  const unclassifiedWarningCount = warningFacilities.filter(item => {
    const audit = warningAudits[`${item.coSo}_${activeWarningDateIso}`];
    return !audit || audit.loaiTrangThai === 'chua_xu_ly';
  }).length;

  return (
    <section className="bg-white text-slate-800 rounded-2xl p-5 sm:p-6 mb-8 shadow-xs border border-slate-200/90 print:p-0 print:m-0 print:border-none print:shadow-none print:bg-transparent">
      {/* PAGE 1 IN PRINT: OVERVIEW KPI + WARNING ALERTS + SCORE PIE CHART */}
      <div className="facility-print-page-1">
        {/* Header of Summary Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/90 print:pb-2 print:mb-2">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#1B5EA6]" />
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#1A3A5C] font-display">
                TỔNG HỢP THỰC HIỆN CÁC CƠ SỞ {filters.thang !== 'all' ? `(${filters.thang})` : ''}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 print:text-[10px]">
              Bảng thống kê số lần thực hiện, tỷ lệ đạt và trạng thái của từng cơ sở theo bộ lọc được chọn
            </p>
          </div>

          {/* Report & Facility Hygiene Filter Switcher & Open All Reports Button */}
          <div className="flex items-center gap-3 flex-wrap print:hidden">
            {onModeChange && (
              <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => onModeChange('hygiene')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mode === 'hygiene'
                      ? 'bg-[#1B5EA6] text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                  title="Lọc xem báo cáo Kiểm tra Vệ sinh"
                >
                  <ClipboardList className={`w-3.5 h-3.5 ${mode === 'hygiene' ? 'text-sky-200' : 'text-slate-500'}`} />
                  <span>Báo Cáo Vệ Sinh</span>
                  {typeof hygieneCount === 'number' && (
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-bold font-mono ${
                      mode === 'hygiene' ? 'bg-[#1A3A5C] text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {hygieneCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onModeChange('quality')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mode === 'quality'
                      ? 'bg-[#4CAF8A] text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                  title="Lọc xem báo cáo Chất lượng cơ sở"
                >
                  <Building2 className={`w-3.5 h-3.5 ${mode === 'quality' ? 'text-emerald-100' : 'text-slate-500'}`} />
                  <span>Chất Lượng Cơ Sở</span>
                  {typeof qualityCount === 'number' && (
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-bold font-mono ${
                      mode === 'quality' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {qualityCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {onOpenDetailModal && (
              <button
                onClick={() => onOpenDetailModal(filters.coSo || 'all')}
                className="flex items-center gap-1.5 bg-[#1B5EA6]/10 hover:bg-[#1B5EA6]/20 text-[#1B5EA6] border border-[#1B5EA6]/30 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                title="Mở popup danh sách báo cáo chi tiết"
              >
                <FileText className="w-4 h-4 text-[#1B5EA6]" />
                <span>Xem Tất Cả Nhật Ký</span>
              </button>
            )}
          </div>
        </div>

        {/* PHẦN 1: KPI THỂ HIỆN 6 CHỈ SỐ CHUNG CỦA TRUNG TÂM */}
        <div className="mt-5 mb-3 flex flex-wrap items-center gap-2 print:mt-2 print:mb-1">
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#1B5EA6] text-white">
            Phần 1
          </span>
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-[#1A3A5C]">
            KPI Chỉ Số Chung Của Trung Tâm
          </h3>
        </div>

        {/* 6 KPI Cards Grid - Cỡ chữ đồng đều giữa Ngày (lùi 1 ngày), Tuần này & Tháng/Kỳ lọc */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 facility-kpi-grid print:my-2 print:gap-3">
          {/* KPI 1: Tỉ lệ cơ sở thực hiện Check out */}
          <div
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-50/70 hover:bg-[#3EA8E0]/10 rounded-xl p-4 border border-slate-200/80 hover:border-[#3EA8E0]/60 flex flex-col justify-between gap-2.5 shadow-2xs cursor-pointer transition-all duration-200 group"
            title="Bấm để xem danh sách các cơ sở thực hiện Check out / chưa Check out (tính theo % số lượt cơ sở có Check out / tổng số lượt cơ sở)"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
                  1. Tỉ lệ cơ sở thực hiện Check out
                </p>
                <ExternalLink className="w-3 h-3 text-[#1B5EA6] opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#1B5EA6]/10 border border-[#1B5EA6]/20 flex items-center justify-center text-[#1B5EA6] shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-medium">Ngày {centerKpiMetrics.yesterdayShort}:</span>
                <span className="font-bold text-[#1A3A5C] font-mono tabular-nums">
                  {centerKpiMetrics.daily.checkoutRatePct.toFixed(1)}%
                  <span className="ml-1 text-[11px] font-medium text-slate-500">
                    ({centerKpiMetrics.daily.checkoutCompletedSlots.toLocaleString('vi-VN')}/{centerKpiMetrics.daily.checkoutRequiredSlots.toLocaleString('vi-VN')} lượt)
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-medium">{centerKpiMetrics.weekRowLabel} ({centerKpiMetrics.weekRangeShort}):</span>
                <span className="font-bold text-slate-800 font-mono tabular-nums">
                  {centerKpiMetrics.week.checkoutRatePct.toFixed(1)}%
                  <span className="ml-1 text-[11px] font-medium text-slate-500">
                    ({centerKpiMetrics.week.checkoutCompletedSlots.toLocaleString('vi-VN')}/{centerKpiMetrics.week.checkoutRequiredSlots.toLocaleString('vi-VN')} lượt)
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-medium">{centerKpiMetrics.periodShortTitle}:</span>
                <span className="font-bold text-slate-800 font-mono tabular-nums">
                  {centerKpiMetrics.period.checkoutRatePct.toFixed(1)}%
                  <span className="ml-1 text-[11px] font-medium text-slate-500">
                    ({centerKpiMetrics.period.checkoutCompletedSlots.toLocaleString('vi-VN')}/{centerKpiMetrics.period.checkoutRequiredSlots.toLocaleString('vi-VN')} lượt)
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* KPI 2: Tỉ lệ cơ sở thực hiện đầy đủ */}
          <div className={`relative bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 flex flex-col justify-between gap-2.5 shadow-2xs ${hoveredKpi2Row ? 'z-30' : ''}`}>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
                2. Tỉ lệ cơ sở thực hiện đầy đủ
              </p>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              {/* Row 1: Ngày (lùi 1 ngày) - hover hiển thị các cơ sở thiếu hình */}
              <div
                className="relative"
                onMouseEnter={() => setHoveredKpi2Row('daily')}
                onMouseLeave={() => setHoveredKpi2Row(prev => (prev === 'daily' ? null : prev))}
              >
                <div
                  onClick={() => setHoveredKpi2Row(prev => (prev === 'daily' ? null : 'daily'))}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 -mx-1.5 py-0.5 hover:bg-emerald-50/80 transition-colors cursor-pointer"
                >
                  <span className="text-slate-600 font-medium flex items-center gap-1">
                    <span>Ngày {centerKpiMetrics.yesterdayShort}:</span>
                    <Info className="w-3 h-3 text-slate-400 print:hidden" />
                  </span>
                  <span className="font-bold text-[#1A3A5C] font-mono tabular-nums">
                    <span className="underline decoration-dotted decoration-slate-400">
                      {centerKpiMetrics.daily.fullComplianceRatePct.toFixed(1)}%
                    </span>
                    <span className="ml-1 text-[11px] font-medium text-slate-500">
                      ({centerKpiMetrics.daily.fullComplianceFacilityCount}/{centerKpiMetrics.daily.totalFacilitiesRequired} cơ sở)
                    </span>
                  </span>
                </div>

                {hoveredKpi2Row === 'daily' && (
                  <div className="print:hidden absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full pt-1.5 w-[310px] sm:w-[350px] z-50">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-3 text-xs text-slate-700">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div>
                          <p className="font-bold text-slate-900">
                            Cơ sở thiếu hình • Ngày {centerKpiMetrics.yesterdayDisplay}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Đủ: {centerKpiMetrics.daily.fullComplianceFacilityCount}/{centerKpiMetrics.daily.totalFacilitiesRequired} cơ sở • Tổng thiếu:{' '}
                            <strong className="text-rose-600 font-mono">
                              {centerKpiMetrics.daily.totalMissingImages} ảnh
                            </strong>
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-bold font-mono text-[11px] shrink-0">
                          {centerKpiMetrics.daily.missingImageFacilities.length} cơ sở
                        </span>
                      </div>

                      {centerKpiMetrics.daily.missingImageFacilities.length === 0 ? (
                        <div className="py-3 text-center text-emerald-700 font-semibold">
                          Tất cả cơ sở đã thực hiện đủ hình trong ngày!
                        </div>
                      ) : (
                        <div className="mt-2 max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                          {centerKpiMetrics.daily.missingImageFacilities.map(item => (
                            <button
                              key={item.coSo}
                              type="button"
                              onClick={() => {
                                onSelectFacility(item.coSo);
                                setHoveredKpi2Row(null);
                              }}
                              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-rose-50/70 border border-slate-200/70 text-left transition-colors cursor-pointer"
                            >
                              <span className="font-semibold text-slate-800 truncate">{item.coSo}</span>
                              <span className="font-mono font-bold text-rose-600 shrink-0 text-[11px]">
                                thiếu {item.missingImagesCount} ảnh ({item.dailyValidCount}/{item.dailyTargetCount})
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 2: Tuần này - hover liệt kê cơ sở thiếu ảnh, tổng số ngày thiếu ảnh, tổng số ảnh thiếu */}
              <div
                className="relative"
                onMouseEnter={() => setHoveredKpi2Row('week')}
                onMouseLeave={() => setHoveredKpi2Row(prev => (prev === 'week' ? null : prev))}
              >
                <div
                  onClick={() => setHoveredKpi2Row(prev => (prev === 'week' ? null : 'week'))}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 -mx-1.5 py-0.5 hover:bg-emerald-50/80 transition-colors cursor-pointer"
                >
                  <span className="text-slate-600 font-medium flex items-center gap-1">
                    <span>{centerKpiMetrics.weekRowLabel} ({centerKpiMetrics.weekRangeShort}):</span>
                    <Info className="w-3 h-3 text-slate-400 print:hidden" />
                  </span>
                  <span className="font-bold text-slate-800 font-mono tabular-nums">
                    <span className="underline decoration-dotted decoration-slate-400">
                      {centerKpiMetrics.week.fullComplianceRatePct.toFixed(1)}%
                    </span>
                    <span className="ml-1 text-[11px] font-medium text-slate-500">
                      ({centerKpiMetrics.week.fullComplianceFacilityCount}/{centerKpiMetrics.week.totalFacilitiesRequired} • {centerKpiMetrics.week.daysCount} ngày)
                    </span>
                  </span>
                </div>

                {hoveredKpi2Row === 'week' && (
                  <div className="print:hidden absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full pt-1.5 w-[330px] sm:w-[400px] z-50">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-3 text-xs text-slate-700">
                      <div className="pb-2 border-b border-slate-100">
                        <p className="font-bold text-slate-900">
                          Tổng hợp thiếu ảnh • {centerKpiMetrics.weekRowLabel} ({centerKpiMetrics.weekRangeShort})
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Đánh giá trên {centerKpiMetrics.week.daysCount} ngày đã chốt đến {centerKpiMetrics.yesterdayShort}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 my-2">
                        <div className="bg-rose-50/80 border border-rose-200/80 rounded-lg px-2 py-1.5 text-center">
                          <span className="block text-[10px] text-rose-700 font-medium">Cơ sở thiếu ảnh</span>
                          <span className="font-bold font-mono text-rose-800">
                            {centerKpiMetrics.week.missingImageFacilities.length} cơ sở
                          </span>
                        </div>
                        <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg px-2 py-1.5 text-center">
                          <span className="block text-[10px] text-amber-800 font-medium">Tổng ngày thiếu ảnh</span>
                          <span className="font-bold font-mono text-amber-900">
                            {centerKpiMetrics.week.totalMissingImageDays} ngày
                          </span>
                        </div>
                        <div className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-center">
                          <span className="block text-[10px] text-slate-600 font-medium">Tổng số ảnh thiếu</span>
                          <span className="font-bold font-mono text-slate-900">
                            {centerKpiMetrics.week.totalMissingImages.toLocaleString('vi-VN')} ảnh
                          </span>
                        </div>
                      </div>

                      {centerKpiMetrics.week.missingImageFacilities.length === 0 ? (
                        <div className="py-3 text-center text-emerald-700 font-semibold">
                          Tất cả cơ sở đã thực hiện đủ ảnh trong tuần này!
                        </div>
                      ) : (
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                          {centerKpiMetrics.week.missingImageFacilities.map(item => (
                            <button
                              key={item.coSo}
                              type="button"
                              onClick={() => {
                                onSelectFacility(item.coSo);
                                setHoveredKpi2Row(null);
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-rose-50/70 border border-slate-200/70 text-left transition-colors cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-800 truncate">{item.coSo}</span>
                                <span className="font-mono font-bold text-rose-600 shrink-0 text-[11px]">
                                  {item.missingDaysCount} ngày • thiếu {item.missingImagesCount} ảnh
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                Ngày thiếu: {item.missingDates.map(d => `${d.shortDate} (-${d.missing})`).join(', ')}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: Tháng này / Kỳ lọc */}
              <div
                className="relative"
                onMouseEnter={() => setHoveredKpi2Row('period')}
                onMouseLeave={() => setHoveredKpi2Row(prev => (prev === 'period' ? null : prev))}
              >
                <div
                  onClick={() => setHoveredKpi2Row(prev => (prev === 'period' ? null : 'period'))}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 -mx-1.5 py-0.5 hover:bg-emerald-50/80 transition-colors cursor-pointer"
                >
                  <span className="text-slate-600 font-medium flex items-center gap-1">
                    <span>{centerKpiMetrics.periodShortTitle}:</span>
                    <Info className="w-3 h-3 text-slate-400 print:hidden" />
                  </span>
                  <span className="font-bold text-slate-800 font-mono tabular-nums">
                    <span className="underline decoration-dotted decoration-slate-400">
                      {centerKpiMetrics.period.fullComplianceRatePct.toFixed(1)}%
                    </span>
                    <span className="ml-1 text-[11px] font-medium text-slate-500">
                      ({centerKpiMetrics.period.fullComplianceFacilityCount}/{centerKpiMetrics.period.totalFacilitiesRequired} • {centerKpiMetrics.period.daysCount} ngày)
                    </span>
                  </span>
                </div>

                {hoveredKpi2Row === 'period' && (
                  <div className="print:hidden absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full pt-1.5 w-[330px] sm:w-[400px] z-50">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-3 text-xs text-slate-700">
                      <div className="pb-2 border-b border-slate-100">
                        <p className="font-bold text-slate-900">
                          Tổng hợp thiếu ảnh • {centerKpiMetrics.periodShortTitle}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Đánh giá trên {centerKpiMetrics.period.daysCount} ngày đã chốt
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 my-2">
                        <div className="bg-rose-50/80 border border-rose-200/80 rounded-lg px-2 py-1.5 text-center">
                          <span className="block text-[10px] text-rose-700 font-medium">Cơ sở thiếu ảnh</span>
                          <span className="font-bold font-mono text-rose-800">
                            {centerKpiMetrics.period.missingImageFacilities.length} cơ sở
                          </span>
                        </div>
                        <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg px-2 py-1.5 text-center">
                          <span className="block text-[10px] text-amber-800 font-medium">Tổng ngày thiếu ảnh</span>
                          <span className="font-bold font-mono text-amber-900">
                            {centerKpiMetrics.period.totalMissingImageDays} ngày
                          </span>
                        </div>
                        <div className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-center">
                          <span className="block text-[10px] text-slate-600 font-medium">Tổng số ảnh thiếu</span>
                          <span className="font-bold font-mono text-slate-900">
                            {centerKpiMetrics.period.totalMissingImages.toLocaleString('vi-VN')} ảnh
                          </span>
                        </div>
                      </div>

                      {centerKpiMetrics.period.missingImageFacilities.length === 0 ? (
                        <div className="py-3 text-center text-emerald-700 font-semibold">
                          Tất cả cơ sở đã thực hiện đủ ảnh trong kỳ!
                        </div>
                      ) : (
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                          {centerKpiMetrics.period.missingImageFacilities.map(item => (
                            <button
                              key={item.coSo}
                              type="button"
                              onClick={() => {
                                onSelectFacility(item.coSo);
                                setHoveredKpi2Row(null);
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-rose-50/70 border border-slate-200/70 text-left transition-colors cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-800 truncate">{item.coSo}</span>
                                <span className="font-mono font-bold text-rose-600 shrink-0 text-[11px]">
                                  {item.missingDaysCount} ngày • thiếu {item.missingImagesCount} ảnh
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KPI 3: Hạng mục hoàn thành */}
          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 flex flex-col justify-between gap-2.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
                3. Hạng mục hoàn thành
              </p>
              <div className="w-8 h-8 rounded-lg bg-[#4CAF8A]/15 border border-[#4CAF8A]/30 flex items-center justify-center text-[#4CAF8A] shrink-0">
                <Activity className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-medium">Ngày {centerKpiMetrics.yesterdayShort}:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {centerKpiMetrics.daily.validCompletedItems.toLocaleString('vi-VN')}/{centerKpiMetrics.daily.requiredTotalItems.toLocaleString('vi-VN')} ({centerKpiMetrics.daily.completionPct.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-medium">{centerKpiMetrics.weekRowLabel} ({centerKpiMetrics.weekRangeShort}):</span>
                <span className="font-bold text-slate-800 font-mono">
                  {centerKpiMetrics.week.validCompletedItems.toLocaleString('vi-VN')}/{centerKpiMetrics.week.requiredTotalItems.toLocaleString('vi-VN')} ({centerKpiMetrics.week.completionPct.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-medium">{centerKpiMetrics.periodShortTitle}:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {centerKpiMetrics.period.validCompletedItems.toLocaleString('vi-VN')}/{centerKpiMetrics.period.requiredTotalItems.toLocaleString('vi-VN')} ({centerKpiMetrics.period.completionPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* KPI 4: Tỉ lệ cơ sở không thực hiện Check out */}
          <div
            onClick={() => setMissingModalScope('period')}
            className={`relative bg-slate-50/70 hover:bg-rose-50/40 rounded-xl p-4 border border-slate-200/80 hover:border-rose-300 flex flex-col justify-between gap-2.5 shadow-2xs cursor-pointer transition-all duration-200 group ${hoveredKpi4Row ? 'z-30' : ''}`}
            title="Bấm vào từng dòng để xem chi tiết tên cơ sở và tỉ lệ lượt bị bỏ trống"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
              <div className="flex items-center gap-1.5 min-w-0">
                <p
                  className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate"
                  title="4. Tỉ lệ cơ sở không thực hiện check out (tính theo % số lượt bỏ trống / tổng số lượt)"
                >
                  4. Tỉ lệ cơ sở không thực hiện check out
                </p>
                <ExternalLink className="w-3 h-3 text-rose-600 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                  centerKpiMetrics.period.missingDaysList.length > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                }`}
              >
                <CalendarX2 className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              {/* Row 1: Ngày hiện tại (lùi 1 ngày) - hover hiển thị cơ sở không thực hiện */}
              <div
                className="relative"
                onMouseEnter={() => setHoveredKpi4Row('daily')}
                onMouseLeave={() => setHoveredKpi4Row(prev => (prev === 'daily' ? null : prev))}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHoveredKpi4Row(null);
                    setMissingModalScope('daily');
                  }}
                  className="w-full flex items-center justify-between gap-2 text-left rounded-md px-1.5 -mx-1.5 py-0.5 hover:bg-rose-50/80 hover:text-rose-700 transition-colors cursor-pointer"
                >
                  <span className="text-slate-600 font-medium flex items-center gap-1">
                    <span>Ngày {centerKpiMetrics.yesterdayShort}:</span>
                    <Info className="w-3 h-3 text-slate-400 print:hidden" />
                  </span>
                  <span className="font-bold font-mono tabular-nums">
                    <span
                      className={`underline decoration-dotted ${
                        centerKpiMetrics.daily.missingDaysList.length > 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {centerKpiMetrics.daily.nonCheckoutRatePct.toFixed(1)}%
                    </span>
                    <span className="ml-1 text-[11px] font-medium text-slate-500">
                      ({centerKpiMetrics.daily.missingDaysList.length.toLocaleString('vi-VN')}/{centerKpiMetrics.daily.checkoutRequiredSlots.toLocaleString('vi-VN')} lượt)
                    </span>
                  </span>
                </button>

                {hoveredKpi4Row === 'daily' && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="print:hidden absolute left-0 top-full pt-1.5 w-[310px] sm:w-[350px] z-50 cursor-default"
                  >
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-3 text-xs text-slate-700">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div>
                          <p className="font-bold text-slate-900">
                            Cơ sở không thực hiện • Ngày {centerKpiMetrics.yesterdayDisplay}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Chưa có báo cáo Check out nào trong ngày
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-bold font-mono text-[11px] shrink-0">
                          {centerKpiMetrics.daily.missingDaysList.length} cơ sở
                        </span>
                      </div>

                      {centerKpiMetrics.daily.missingDaysList.length === 0 ? (
                        <div className="py-3 text-center text-emerald-700 font-semibold">
                          Tất cả cơ sở đều đã thực hiện Check out trong ngày!
                        </div>
                      ) : (
                        <div className="mt-2 max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                          {centerKpiMetrics.daily.missingDaysList.map(item => (
                            <button
                              key={item.coSo}
                              type="button"
                              onClick={() => {
                                onSelectFacility(item.coSo);
                                setHoveredKpi4Row(null);
                              }}
                              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-rose-50/70 border border-slate-200/70 text-left transition-colors cursor-pointer"
                            >
                              <span className="font-semibold text-slate-800 truncate">{item.coSo}</span>
                              <span className="font-mono font-bold text-rose-600 shrink-0 text-[11px]">
                                Chưa check out (0/{item.dailyTarget})
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 2: Tuần này - hover hiển thị cơ sở không thực hiện check out kèm ngày và số lượt */}
              <div
                className="relative"
                onMouseEnter={() => setHoveredKpi4Row('week')}
                onMouseLeave={() => setHoveredKpi4Row(prev => (prev === 'week' ? null : prev))}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHoveredKpi4Row(null);
                    setMissingModalScope('week');
                  }}
                  className="w-full flex items-center justify-between gap-2 text-left rounded-md px-1.5 -mx-1.5 py-0.5 hover:bg-rose-50/80 hover:text-rose-700 transition-colors cursor-pointer"
                >
                  <span className="text-slate-600 font-medium flex items-center gap-1">
                    <span>{centerKpiMetrics.weekRowLabel} ({centerKpiMetrics.weekRangeShort}):</span>
                    <Info className="w-3 h-3 text-slate-400 print:hidden" />
                  </span>
                  <span className="font-bold font-mono tabular-nums">
                    <span
                      className={`underline decoration-dotted ${
                        centerKpiMetrics.week.missingDaysList.length > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {centerKpiMetrics.week.nonCheckoutRatePct.toFixed(1)}%
                    </span>
                    <span className="ml-1 text-[11px] font-medium text-slate-500">
                      ({centerKpiMetrics.week.missingDaysList.length.toLocaleString('vi-VN')}/{centerKpiMetrics.week.checkoutRequiredSlots.toLocaleString('vi-VN')} lượt)
                    </span>
                  </span>
                </button>

                {hoveredKpi4Row === 'week' && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="print:hidden absolute left-0 top-full pt-1.5 w-[330px] sm:w-[400px] z-50 cursor-default"
                  >
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-3 text-xs text-slate-700">
                      <div className="pb-2 border-b border-slate-100">
                        <p className="font-bold text-slate-900">
                          Không thực hiện check out • {centerKpiMetrics.weekRowLabel} ({centerKpiMetrics.weekRangeShort})
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Đánh giá trên {centerKpiMetrics.week.daysCount} ngày đã chốt đến {centerKpiMetrics.yesterdayShort}
                        </p>
                      </div>

                      {centerKpiMetrics.week.missingCheckoutByFacility.length === 0 ? (
                        <div className="py-3 text-center text-emerald-700 font-semibold">
                          Tất cả cơ sở đều thực hiện Check out đủ các ngày trong tuần!
                        </div>
                      ) : (
                        <div className="mt-2 max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                          {centerKpiMetrics.week.missingCheckoutByFacility.map(item => (
                            <button
                              key={item.coSo}
                              type="button"
                              onClick={() => {
                                onSelectFacility(item.coSo);
                                setHoveredKpi4Row(null);
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-rose-50/70 border border-slate-200/70 text-left transition-colors cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-800 truncate">{item.coSo}</span>
                                <span className="font-mono font-bold text-rose-600 shrink-0 text-[11px]">
                                  {item.missedCount} lượt
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Ngày bỏ trống: {item.missedDates.join(', ')}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: Tháng này / Kỳ lọc */}
              <div
                className="relative"
                onMouseEnter={() => setHoveredKpi4Row('period')}
                onMouseLeave={() => setHoveredKpi4Row(prev => (prev === 'period' ? null : prev))}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHoveredKpi4Row(null);
                    setMissingModalScope('period');
                  }}
                  className="w-full flex items-center justify-between gap-2 text-left rounded-md px-1.5 -mx-1.5 py-0.5 hover:bg-rose-50/80 hover:text-rose-700 transition-colors cursor-pointer"
                >
                  <span className="text-slate-600 font-medium flex items-center gap-1">
                    <span>{centerKpiMetrics.periodShortTitle}:</span>
                    <Info className="w-3 h-3 text-slate-400 print:hidden" />
                  </span>
                  <span className="font-bold font-mono tabular-nums">
                    <span
                      className={`underline decoration-dotted ${
                        centerKpiMetrics.period.missingDaysList.length > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {centerKpiMetrics.period.nonCheckoutRatePct.toFixed(1)}%
                    </span>
                    <span className="ml-1 text-[11px] font-medium text-slate-500">
                      ({centerKpiMetrics.period.missingDaysList.length.toLocaleString('vi-VN')}/{centerKpiMetrics.period.checkoutRequiredSlots.toLocaleString('vi-VN')} lượt)
                    </span>
                  </span>
                </button>

                {hoveredKpi4Row === 'period' && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="print:hidden absolute left-0 top-full pt-1.5 w-[330px] sm:w-[400px] z-50 cursor-default"
                  >
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-3 text-xs text-slate-700">
                      <div className="pb-2 border-b border-slate-100">
                        <p className="font-bold text-slate-900">
                          Không thực hiện check out • {centerKpiMetrics.periodShortTitle}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Đánh giá trên {centerKpiMetrics.period.daysCount} ngày đã chốt
                        </p>
                      </div>

                      {centerKpiMetrics.period.missingCheckoutByFacility.length === 0 ? (
                        <div className="py-3 text-center text-emerald-700 font-semibold">
                          Tất cả cơ sở đều thực hiện Check out đủ các ngày trong kỳ!
                        </div>
                      ) : (
                        <div className="mt-2 max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                          {centerKpiMetrics.period.missingCheckoutByFacility.map(item => (
                            <button
                              key={item.coSo}
                              type="button"
                              onClick={() => {
                                onSelectFacility(item.coSo);
                                setHoveredKpi4Row(null);
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-rose-50/70 border border-slate-200/70 text-left transition-colors cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-800 truncate">{item.coSo}</span>
                                <span className="font-mono font-bold text-rose-600 shrink-0 text-[11px]">
                                  {item.missedCount} lượt
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                Ngày bỏ trống: {item.missedDates.join(', ')}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KPI 5: Tỉ lệ hạng mục có vấn đề */}
          <div className={`relative bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 flex flex-col justify-between gap-2.5 shadow-2xs ${hoveredKpi5Row ? 'z-30' : ''}`}>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
                5. Tỉ lệ hạng mục có vấn đề
              </p>
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                  centerKpiMetrics.period.problemTotal > 0
                    ? 'bg-rose-50 border-rose-200 text-[#F2775A]'
                    : 'bg-emerald-50 border-emerald-200 text-[#4CAF8A]'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              {/* Row 1: Ngày hiện tại (lùi 1 ngày) - hover liệt kê cơ sở có vấn đề kèm khu vực */}
              <div
                className="relative"
                onMouseEnter={() => setHoveredKpi5Row('daily')}
                onMouseLeave={() => setHoveredKpi5Row(prev => (prev === 'daily' ? null : prev))}
              >
                <div
                  onClick={() => setHoveredKpi5Row(prev => (prev === 'daily' ? null : 'daily'))}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 -mx-1.5 py-0.5 hover:bg-orange-50/70 transition-colors cursor-pointer"
                >
                  <span className="text-slate-600 font-medium flex items-center gap-1">
                    <span>Ngày {centerKpiMetrics.yesterdayShort}:</span>
                    <Info className="w-3 h-3 text-slate-400 print:hidden" />
                  </span>
                  <span className="font-bold font-mono tabular-nums">
                    <span
                      className={`underline decoration-dotted ${
                        centerKpiMetrics.daily.problemTotal > 0 ? 'text-[#F2775A] decoration-orange-300' : 'text-emerald-700 decoration-emerald-400'
                      }`}
                    >
                      {centerKpiMetrics.daily.problemRatePct.toFixed(1)}%
                    </span>
                    <span className="ml-1 text-[11px] font-medium text-slate-500">
                      ({centerKpiMetrics.daily.problemTotal.toLocaleString('vi-VN')}/{centerKpiMetrics.daily.evaluatedItemsTotal.toLocaleString('vi-VN')} • {centerKpiMetrics.daily.lowScoreTotal} thấp, {centerKpiMetrics.daily.rejectedReviewTotal} KĐ)
                    </span>
                  </span>
                </div>

                {hoveredKpi5Row === 'daily' && (
                  <div className="print:hidden absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full pt-1.5 w-[310px] sm:w-[360px] z-50">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-2.5 text-xs text-slate-700">
                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                        <p className="font-bold text-slate-900">
                          Ngày {centerKpiMetrics.yesterdayDisplay}
                        </p>
                        <span className="font-bold font-mono text-[#D95D39] text-[11px]">
                          {centerKpiMetrics.daily.problemTotal} lượt có vấn đề
                        </span>
                      </div>

                      {centerKpiMetrics.daily.problemFacilities.length === 0 ? (
                        <div className="py-2.5 text-center text-emerald-700 font-semibold">
                          Không có vấn đề trong ngày
                        </div>
                      ) : (
                        <div className="mt-1.5 max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {centerKpiMetrics.daily.problemFacilities.map(item => {
                            const uniqueAreas = Array.from(new Set(item.dailyAreas.map(a => a.khuVuc)));
                            return (
                              <button
                                key={item.coSo}
                                type="button"
                                onClick={() => {
                                  onSelectFacility(item.coSo);
                                  setHoveredKpi5Row(null);
                                }}
                                className="w-full px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-orange-50/70 border border-slate-200/70 text-left transition-colors cursor-pointer"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-slate-800 truncate">{item.coSo}</span>
                                  <span className="font-mono font-bold text-[#F2775A] shrink-0 text-[11px]">
                                    {item.problemCount} lượt
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                                  {uniqueAreas.join(', ')}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 2: Tuần này - hover liệt kê cơ sở, tổng số lượt có vấn đề, ngày và khu vực */}
              <div
                className="relative"
                onMouseEnter={() => setHoveredKpi5Row('week')}
                onMouseLeave={() => setHoveredKpi5Row(prev => (prev === 'week' ? null : prev))}
              >
                <div
                  onClick={() => setHoveredKpi5Row(prev => (prev === 'week' ? null : 'week'))}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 -mx-1.5 py-0.5 hover:bg-orange-50/70 transition-colors cursor-pointer"
                >
                  <span className="text-slate-600 font-medium flex items-center gap-1">
                    <span>{centerKpiMetrics.weekRowLabel} ({centerKpiMetrics.weekRangeShort}):</span>
                    <Info className="w-3 h-3 text-slate-400 print:hidden" />
                  </span>
                  <span className="font-bold text-slate-800 font-mono tabular-nums">
                    <span className="underline decoration-dotted decoration-slate-400">
                      {centerKpiMetrics.week.problemRatePct.toFixed(1)}%
                    </span>
                    <span className="ml-1 text-[11px] font-medium text-slate-500">
                      ({centerKpiMetrics.week.problemTotal.toLocaleString('vi-VN')}/{centerKpiMetrics.week.evaluatedItemsTotal.toLocaleString('vi-VN')} • {centerKpiMetrics.week.unresolvedProblemTotal} chưa xử lý)
                    </span>
                  </span>
                </div>

                {hoveredKpi5Row === 'week' && (
                  <div className="print:hidden absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full pt-1.5 w-[320px] sm:w-[380px] z-50">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-2.5 text-xs text-slate-700">
                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                        <p className="font-bold text-slate-900">
                          {centerKpiMetrics.weekRowLabel} ({centerKpiMetrics.weekRangeShort})
                        </p>
                        <span className="font-bold font-mono text-[#D95D39] text-[11px]">
                          {centerKpiMetrics.week.problemTotal} lượt có vấn đề
                        </span>
                      </div>

                      {centerKpiMetrics.week.problemFacilities.length === 0 ? (
                        <div className="py-2.5 text-center text-emerald-700 font-semibold">
                          Không có vấn đề trong tuần
                        </div>
                      ) : (
                        <div className="mt-1.5 max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {centerKpiMetrics.week.problemFacilities.map(item => (
                            <button
                              key={item.coSo}
                              type="button"
                              onClick={() => {
                                onSelectFacility(item.coSo);
                                setHoveredKpi5Row(null);
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-orange-50/70 border border-slate-200/70 text-left transition-colors cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-800 truncate">{item.coSo}</span>
                                <span className="font-mono font-bold text-[#F2775A] shrink-0 text-[11px]">
                                  {item.problemCount} lượt
                                </span>
                              </div>
                              <div className="mt-0.5 space-y-0.5">
                                {item.byDate.map(day => {
                                  const uniqueDayAreas = Array.from(new Set(day.areas.map(a => a.khuVuc)));
                                  return (
                                    <p key={`${item.coSo}-${day.isoDate}`} className="text-[11px] text-slate-600 leading-snug">
                                      <span className="font-mono font-semibold text-slate-800">{day.shortDate}:</span>{' '}
                                      {uniqueDayAreas.join(', ')}
                                    </p>
                                  );
                                })}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: Tháng này / Kỳ lọc */}
              <div
                className="relative"
                onMouseEnter={() => setHoveredKpi5Row('period')}
                onMouseLeave={() => setHoveredKpi5Row(prev => (prev === 'period' ? null : prev))}
              >
                <div
                  onClick={() => setHoveredKpi5Row(prev => (prev === 'period' ? null : 'period'))}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 -mx-1.5 py-0.5 hover:bg-orange-50/70 transition-colors cursor-pointer"
                >
                  <span className="text-slate-600 font-medium flex items-center gap-1">
                    <span>{centerKpiMetrics.periodShortTitle}:</span>
                    <Info className="w-3 h-3 text-slate-400 print:hidden" />
                  </span>
                  <span className="font-bold text-slate-800 font-mono tabular-nums">
                    <span className="underline decoration-dotted decoration-slate-400">
                      {centerKpiMetrics.period.problemRatePct.toFixed(1)}%
                    </span>
                    <span className="ml-1 text-[11px] font-medium text-slate-500">
                      ({centerKpiMetrics.period.problemTotal.toLocaleString('vi-VN')}/{centerKpiMetrics.period.evaluatedItemsTotal.toLocaleString('vi-VN')} • {centerKpiMetrics.period.unresolvedProblemTotal} chưa xử lý)
                    </span>
                  </span>
                </div>

                {hoveredKpi5Row === 'period' && (
                  <div className="print:hidden absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full pt-1.5 w-[320px] sm:w-[380px] z-50">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-2.5 text-xs text-slate-700">
                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                        <p className="font-bold text-slate-900">
                          {centerKpiMetrics.periodShortTitle}
                        </p>
                        <span className="font-bold font-mono text-[#D95D39] text-[11px]">
                          {centerKpiMetrics.period.problemTotal} lượt có vấn đề
                        </span>
                      </div>

                      {centerKpiMetrics.period.problemFacilities.length === 0 ? (
                        <div className="py-2.5 text-center text-emerald-700 font-semibold">
                          Không có vấn đề trong kỳ
                        </div>
                      ) : (
                        <div className="mt-1.5 max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {centerKpiMetrics.period.problemFacilities.map(item => (
                            <button
                              key={item.coSo}
                              type="button"
                              onClick={() => {
                                onSelectFacility(item.coSo);
                                setHoveredKpi5Row(null);
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-orange-50/70 border border-slate-200/70 text-left transition-colors cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-800 truncate">{item.coSo}</span>
                                <span className="font-mono font-bold text-[#F2775A] shrink-0 text-[11px]">
                                  {item.problemCount} lượt
                                </span>
                              </div>
                              <div className="mt-0.5 space-y-0.5">
                                {item.byDate.map(day => {
                                  const uniqueDayAreas = Array.from(new Set(day.areas.map(a => a.khuVuc)));
                                  return (
                                    <p key={`${item.coSo}-${day.isoDate}`} className="text-[11px] text-slate-600 leading-snug">
                                      <span className="font-mono font-semibold text-slate-800">{day.shortDate}:</span>{' '}
                                      {uniqueDayAreas.join(', ')}
                                    </p>
                                  );
                                })}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KPI 6: Kiểm duyệt ảnh */}
          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 flex flex-col justify-between gap-2.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
                6. Kiểm duyệt ảnh
              </p>
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0">
                <Camera className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-medium">Ngày {centerKpiMetrics.yesterdayShort}:</span>
                <span className="font-bold text-[#1A3A5C] font-mono">
                  {centerKpiMetrics.daily.reviewedImagesTotal.toLocaleString('vi-VN')}/{centerKpiMetrics.daily.submittedImagesTotal.toLocaleString('vi-VN')} (chờ {centerKpiMetrics.daily.pendingImagesTotal.toLocaleString('vi-VN')})
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-medium">{centerKpiMetrics.weekRowLabel} ({centerKpiMetrics.weekRangeShort}):</span>
                <span className="font-bold text-slate-800 font-mono">
                  {centerKpiMetrics.week.reviewedImagesTotal.toLocaleString('vi-VN')}/{centerKpiMetrics.week.submittedImagesTotal.toLocaleString('vi-VN')} (chờ {centerKpiMetrics.week.pendingImagesTotal.toLocaleString('vi-VN')})
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-medium">{centerKpiMetrics.periodShortTitle}:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {centerKpiMetrics.period.reviewedImagesTotal.toLocaleString('vi-VN')}/{centerKpiMetrics.period.submittedImagesTotal.toLocaleString('vi-VN')} (chờ {centerKpiMetrics.period.pendingImagesTotal.toLocaleString('vi-VN')})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* END OF PAGE 1 IN PRINT */}

      {/* PHẦN 2: BẢNG CẢNH BÁO CƠ SỞ */}
      {(() => {
        const renderPart2WeekFilterPill = (interactive: boolean) => (
          <div
            className="inline-flex flex-wrap items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 border border-slate-200"
            role={interactive ? 'group' : undefined}
            aria-label={interactive ? 'Bộ lọc các tuần của tháng hiện tại' : undefined}
          >
            {interactive ? (
              <button
                type="button"
                onClick={() => setPart2WeekFilter('all')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  part2WeekFilter === 'all'
                    ? 'bg-white text-[#1B5EA6] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cả tháng
              </button>
            ) : (
              <span
                className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap ${
                  part2WeekFilter === 'all'
                    ? 'bg-white text-[#1B5EA6] shadow-2xs font-bold'
                    : 'text-slate-600'
                }`}
              >
                Cả tháng
              </span>
            )}
            {part2WarningTableData.monthWeeks.map(w => {
              const isActive = part2WarningTableData.selectedWeek?.key === w.key;
              const cls = `px-2 py-1 rounded-md text-[11px] font-mono tabular-nums whitespace-nowrap ${
                isActive
                  ? 'bg-white text-[#1B5EA6] shadow-2xs font-bold'
                  : w.isFutureWeek
                  ? 'text-slate-400'
                  : 'text-slate-600'
              }`;
              return interactive ? (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => setPart2WeekFilter(w.key)}
                  title={`Tuần ${w.weekNumber}: ${w.fullRange}${w.isCurrentWeek ? ' (Tuần hiện tại)' : ''}${w.isFutureWeek ? ' (Chưa đến)' : ''}`}
                  className={`${cls} transition-colors cursor-pointer ${
                    !isActive ? (w.isFutureWeek ? 'hover:text-slate-600' : 'hover:text-slate-900') : ''
                  }`}
                >
                  <span className="font-sans font-semibold">T{w.weekNumber}</span>{' '}
                  <span className="text-[10px] opacity-80">({w.shortRange})</span>
                </button>
              ) : (
                <span key={w.key} className={cls}>
                  <span className="font-sans font-semibold">T{w.weekNumber}</span>{' '}
                  <span className="text-[10px] opacity-80">({w.shortRange})</span>
                </span>
              );
            })}
          </div>
        );

        const renderPart2WarningCard = (isPdfSnapshot: boolean) => (
          <div
            ref={!isPdfSnapshot ? tableContainerRef : undefined}
            className={`${
              isPdfSnapshot ? 'mt-2.5' : 'mt-4 print:mt-0 print:border-none print:shadow-none'
            } bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs`}
          >
            {/* Legend & Sync Scope Strip */}
            <div className="px-4 py-2 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                  Không làm
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                  Làm thiếu
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                  Làm đủ
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block" />
                  Nghỉ / Chưa đồng bộ / Chưa đến hạn
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#1B5EA6]">
                  <span className="w-5 border-t-2 border-dashed border-[#1B5EA6] inline-block" />
                  Đường định mức ảnh
                </span>
              </div>

              <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                {part2WarningTableData.selectedWeek ? (
                  <>
                    Đang xem:{' '}
                    <strong className="text-[#1B5EA6]">
                      Tuần {part2WarningTableData.selectedWeek.weekNumber} ({part2WarningTableData.selectedWeek.fullRange})
                    </strong>
                    <span className="mx-1.5 text-slate-300">|</span>
                    Chốt đến: <strong className="text-slate-700">{part2WarningTableData.yesterdayShort}</strong>
                    <span className="mx-1.5 text-slate-300">|</span>
                    {part2WarningTableData.monthLabel}
                  </>
                ) : (
                  <>
                    Ngày chốt: <strong className="text-slate-700">{part2WarningTableData.yesterdayShort}</strong>
                    <span className="mx-1.5 text-slate-300">|</span>
                    Tuần: <strong className="text-slate-700">{part2WarningTableData.weekRangeShort}</strong>
                    <span className="mx-1.5 text-slate-300">|</span>
                    {part2WarningTableData.monthLabel}
                  </>
                )}
              </div>
            </div>

            {/* Warning Table */}
            {(() => {
              const selectedWeek = part2WarningTableData.selectedWeek;
              const visibleRows = isPdfSnapshot
                ? part2WarningTableData.rows.filter(r =>
                    selectedWeek
                      ? r.selectedWeekMissingImages > 0 || r.selectedWeekNoCheckoutDays > 0
                      : r.monthMissingImages > 0 || r.monthNoCheckoutDays > 0,
                  )
                : part2WarningTableData.rows;

              if (visibleRows.length === 0) {
                return (
                  <div className="p-8 text-center text-xs text-slate-500">
                    {isPdfSnapshot
                      ? 'Không có cơ sở nào Không làm hoặc Làm thiếu trong kỳ đang chọn.'
                      : `Chưa có dữ liệu cơ sở cho ngày ${part2WarningTableData.yesterdayDisplay}.`}
                  </div>
                );
              }

              return (
                <div className={isPdfSnapshot ? 'w-full' : 'w-full overflow-x-auto'}>
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] leading-tight border-b border-slate-200 text-center">
                      <tr>
                        <th className="py-2.5 px-2 text-center w-8">#</th>
                        <th className="py-2.5 px-2 text-center min-w-[140px]">Cơ sở</th>
                        <th className="py-2.5 px-2 text-center w-[98px]">
                          Trạng thái
                          <span className="block text-[9.5px] font-mono font-normal text-slate-400">
                            ({part2WarningTableData.activeStatusDateShort})
                          </span>
                        </th>
                        <th className="py-2.5 px-2 text-center w-[82px]">
                          Có ảnh /
                          <span className="block">Chỉ tiêu</span>
                        </th>
                        <th className="py-2.5 px-2 text-center w-[86px]">
                          Thiếu ảnh
                          <span className="block text-[9.5px] font-normal text-slate-400 normal-case">
                            {selectedWeek ? `Tuần ${selectedWeek.weekNumber}` : 'Tuần / Tháng'}
                          </span>
                        </th>
                        <th className="py-2.5 px-2 text-center w-[86px]">
                          Không làm
                          <span className="block text-[9.5px] font-normal text-slate-400 normal-case">
                            {selectedWeek ? `Tuần ${selectedWeek.weekNumber}` : 'Tuần / Tháng'}
                          </span>
                        </th>
                        <th className="py-2.5 px-2 text-center min-w-[215px]">
                          <span>
                            {selectedWeek
                              ? `Biểu đồ Tuần ${selectedWeek.weekNumber}`
                              : `Biểu đồ ${part2WarningTableData.monthLabel}`}
                          </span>
                          <span className="block text-[9.5px] font-mono text-slate-400 font-normal normal-case">
                            {selectedWeek
                              ? selectedWeek.fullRange
                              : `Ngày 1 → ${part2WarningTableData.daysCountInMonth}`}
                          </span>
                        </th>
                        {!isPdfSnapshot && (
                          <th className="py-2.5 px-2 text-center print:hidden w-[72px]">Đối chiếu</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleRows.map((row, idx) => {
                        const latest = row.activeLatestDay;
                        const isSelected = selectedFacilityFilter === row.coSo;

                        const statusView = (() => {
                          if (latest.status === 'no_checkout') {
                            return {
                              label: 'Không làm',
                              dotClass: 'bg-rose-500',
                              textClass: 'text-rose-700 font-bold',
                              rowAccent: 'border-l-4 border-l-rose-500 bg-rose-50/20',
                            };
                          }
                          if (latest.status === 'incomplete') {
                            return {
                              label: 'Làm thiếu',
                              dotClass: 'bg-amber-500',
                              textClass: 'text-amber-800 font-bold',
                              rowAccent: 'border-l-4 border-l-amber-400',
                            };
                          }
                          if (latest.status === 'complete') {
                            return {
                              label: 'Làm đủ',
                              dotClass: 'bg-emerald-500',
                              textClass: 'text-emerald-700 font-bold',
                              rowAccent: 'border-l-4 border-l-transparent',
                            };
                          }
                          if (latest.status === 'upcoming') {
                            return {
                              label: 'Chưa đến hạn',
                              dotClass: 'bg-slate-300',
                              textClass: 'text-slate-500 font-semibold',
                              rowAccent: 'border-l-4 border-l-slate-200',
                            };
                          }
                          if (latest.status === 'off_or_unsynced' && latest.isDayOff) {
                            return {
                              label: 'Ngày nghỉ',
                              dotClass: 'bg-slate-400',
                              textClass: 'text-slate-600 font-semibold',
                              rowAccent: 'border-l-4 border-l-slate-300',
                            };
                          }
                          return {
                            label: 'Chưa đủ dữ liệu',
                            dotClass: 'bg-slate-400',
                            textClass: 'text-slate-600 font-semibold',
                            rowAccent: 'border-l-4 border-l-slate-300',
                          };
                        })();

                        return (
                          <tr
                            key={row.coSo}
                            onClick={
                              !isPdfSnapshot
                                ? () =>
                                    setInspectionModalState({
                                      facilityName: row.coSo,
                                      dateIso: latest.iso,
                                    })
                                : undefined
                            }
                            className={`${
                              !isPdfSnapshot ? 'hover:bg-sky-50/40 transition-colors cursor-pointer ' : ''
                            }${statusView.rowAccent} ${
                              isSelected ? 'ring-1 ring-inset ring-[#1B5EA6]/40 bg-sky-50/50' : ''
                            }`}
                          >
                            {/* # */}
                            <td className="py-2 px-2 text-center font-mono tabular-nums text-slate-400 text-[11px]">
                              {idx + 1}
                            </td>

                            {/* Cơ sở */}
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Building2 className="w-3.5 h-3.5 text-[#1B5EA6] shrink-0" />
                                <span className="font-bold text-slate-900 leading-snug">{row.coSo}</span>
                              </div>
                              {latest.duplicatePhotosCount > 0 && (
                                <span className="text-[10px] text-amber-700 block pl-5 mt-0.5 leading-tight">
                                  +{latest.duplicatePhotosCount} ảnh gửi lại ({latest.shortDate})
                                </span>
                              )}
                            </td>

                            {/* Trạng thái ngày gần nhất đã kết thúc trong kỳ/tuần */}
                            <td className="py-2 px-2 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 text-[11.5px] ${statusView.textClass}`}>
                                <span className={`w-2 h-2 rounded-full shrink-0 ${statusView.dotClass}`} />
                                <span>{statusView.label}</span>
                              </span>
                              {latest.status === 'incomplete' && (
                                <span className="block text-[10px] text-amber-700 font-mono tabular-nums pl-3.5">
                                  Thiếu {latest.missingCount} lượt
                                </span>
                              )}
                            </td>

                            {/* Số hạng mục có ảnh / Chỉ tiêu ngày (+ tổng tuần khi lọc tuần) */}
                            <td className="py-2 px-2 text-center font-mono tabular-nums whitespace-nowrap">
                              {latest.status === 'upcoming' ? (
                                <span className="text-[10.5px] text-slate-400">Chưa đến</span>
                              ) : latest.status === 'off_or_unsynced' && latest.isDayOff ? (
                                <span className="text-[10.5px] text-slate-500">Không lớp</span>
                              ) : latest.status === 'insufficient_data' || latest.status === 'off_or_unsynced' ? (
                                <span className="text-[10.5px] text-slate-500">Chưa đủ DL</span>
                              ) : (
                                <div>
                                  <span
                                    className={`text-sm font-bold ${
                                      latest.status === 'no_checkout'
                                        ? 'text-rose-700'
                                        : latest.status === 'incomplete'
                                        ? 'text-amber-800'
                                        : 'text-emerald-700'
                                    }`}
                                  >
                                    {latest.photoCompletedItems}
                                  </span>
                                  <span className="text-slate-400 font-semibold">/{latest.dailyTarget ?? '-'}</span>
                                </div>
                              )}
                              {selectedWeek && row.selectedWeekEvaluatedDueDays > 0 && (
                                <span
                                  className="block text-[9.5px] text-slate-500 mt-0.5"
                                  title={`Tổng lũy kế có ảnh / chỉ tiêu tuần ${selectedWeek.weekNumber}`}
                                >
                                  Tuần: {row.selectedWeekPhotoCompleted}/{row.selectedWeekTargetTotal}
                                </span>
                              )}
                            </td>

                            {/* Tổng số lượt thiếu ảnh */}
                            <td className="py-2 px-2 text-center font-mono tabular-nums whitespace-nowrap">
                              {selectedWeek ? (
                                <>
                                  <span
                                    className={`font-bold ${
                                      row.selectedWeekMissingImages > 0 ? 'text-rose-700' : 'text-slate-500'
                                    }`}
                                  >
                                    {row.selectedWeekMissingImages}
                                  </span>
                                  <span className="block text-[9.5px] text-slate-400 font-sans">lượt thiếu</span>
                                </>
                              ) : (
                                <>
                                  <span
                                    className={`font-bold ${
                                      row.weekMissingImages > 0 ? 'text-amber-800' : 'text-slate-500'
                                    }`}
                                  >
                                    {row.weekMissingImages}
                                  </span>
                                  <span className="text-slate-300 mx-0.5">/</span>
                                  <span
                                    className={`font-bold ${
                                      row.monthMissingImages > 0 ? 'text-rose-700' : 'text-slate-500'
                                    }`}
                                  >
                                    {row.monthMissingImages}
                                  </span>
                                  <span className="block text-[9.5px] text-slate-400 font-sans">lượt thiếu</span>
                                </>
                              )}
                            </td>

                            {/* Số ngày không làm */}
                            <td className="py-2 px-2 text-center font-mono tabular-nums whitespace-nowrap">
                              {selectedWeek ? (
                                <>
                                  <span
                                    className={`font-bold ${
                                      row.selectedWeekNoCheckoutDays > 0 ? 'text-rose-700' : 'text-slate-500'
                                    }`}
                                  >
                                    {row.selectedWeekNoCheckoutDays}
                                  </span>
                                  <span className="block text-[9.5px] text-slate-400 font-sans">
                                    {row.selectedWeekEvaluatedDueDays > 0
                                      ? `/ ${row.selectedWeekEvaluatedDueDays} ngày`
                                      : 'ngày'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span
                                    className={`font-bold ${
                                      row.weekNoCheckoutDays > 0 ? 'text-rose-700' : 'text-slate-500'
                                    }`}
                                  >
                                    {row.weekNoCheckoutDays}
                                  </span>
                                  <span className="text-slate-300 mx-0.5">/</span>
                                  <span
                                    className={`font-bold ${
                                      row.monthNoCheckoutDays > 0 ? 'text-rose-700' : 'text-slate-500'
                                    }`}
                                  >
                                    {row.monthNoCheckoutDays}
                                  </span>
                                  <span className="block text-[9.5px] text-slate-400 font-sans">ngày</span>
                                </>
                              )}
                            </td>

                            {/* Biểu đồ cột theo ngày + đường định mức */}
                            <td className="py-1.5 px-2">
                              <FacilityMonthlyLineChart
                                facilityName={row.coSo}
                                monthDays={selectedWeek ? row.selectedWeekDays : row.monthDays}
                                latestIso={latest.iso}
                                xAxisMode={selectedWeek ? 'weekday' : 'month'}
                                onSelectDay={
                                  !isPdfSnapshot
                                    ? dateIso =>
                                        setInspectionModalState({
                                          facilityName: row.coSo,
                                          dateIso,
                                        })
                                    : () => {}
                                }
                              />
                            </td>

                            {/* Action */}
                            {!isPdfSnapshot && (
                              <td className="py-2 px-2 text-center print:hidden whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setInspectionModalState({
                                      facilityName: row.coSo,
                                      dateIso: latest.iso,
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1B5EA6]/10 hover:bg-[#1B5EA6]/20 text-[#1B5EA6] border border-[#1B5EA6]/25 font-semibold text-[11px] transition-colors cursor-pointer whitespace-nowrap"
                                  title="Xem hạng mục thiếu và ảnh đã gửi"
                                >
                                  <Eye className="w-3 h-3 shrink-0" />
                                  <span>Chi tiết</span>
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 text-[11px] font-semibold text-slate-700">
                      {(() => {
                        const footerCounts = isPdfSnapshot
                          ? {
                              totalWeekMissingImages: visibleRows.reduce((s, r) => s + r.weekMissingImages, 0),
                              totalMonthMissingImages: visibleRows.reduce((s, r) => s + r.monthMissingImages, 0),
                              totalWeekNoCheckoutDays: visibleRows.reduce((s, r) => s + r.weekNoCheckoutDays, 0),
                              totalMonthNoCheckoutDays: visibleRows.reduce((s, r) => s + r.monthNoCheckoutDays, 0),
                              totalSelectedWeekMissingImages: visibleRows.reduce(
                                (s, r) => s + r.selectedWeekMissingImages,
                                0,
                              ),
                              totalSelectedWeekNoCheckoutDays: visibleRows.reduce(
                                (s, r) => s + r.selectedWeekNoCheckoutDays,
                                0,
                              ),
                            }
                          : part2WarningTableData.summaryCounts;

                        return (
                          <tr>
                            <td colSpan={4} className="py-2 px-2 text-right uppercase tracking-wide text-slate-500 text-[10px]">
                              Tổng {visibleRows.length} cơ sở:
                            </td>
                            <td className="py-2 px-2 text-center font-mono tabular-nums whitespace-nowrap">
                              {selectedWeek ? (
                                <>
                                  <span className="text-rose-700">
                                    {footerCounts.totalSelectedWeekMissingImages}
                                  </span>
                                  <span className="text-slate-400 font-sans font-normal ml-1 text-[10px]">lượt</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-amber-800">{footerCounts.totalWeekMissingImages}</span>
                                  <span className="text-slate-300 mx-0.5">/</span>
                                  <span className="text-rose-700">{footerCounts.totalMonthMissingImages}</span>
                                  <span className="text-slate-400 font-sans font-normal ml-1 text-[10px]">lượt</span>
                                </>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center font-mono tabular-nums whitespace-nowrap">
                              {selectedWeek ? (
                                <>
                                  <span className="text-rose-700">
                                    {footerCounts.totalSelectedWeekNoCheckoutDays}
                                  </span>
                                  <span className="text-slate-400 font-sans font-normal ml-1 text-[10px]">ngày</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-rose-700">{footerCounts.totalWeekNoCheckoutDays}</span>
                                  <span className="text-slate-300 mx-0.5">/</span>
                                  <span className="text-rose-700">{footerCounts.totalMonthNoCheckoutDays}</span>
                                  <span className="text-slate-400 font-sans font-normal ml-1 text-[10px]">ngày</span>
                                </>
                              )}
                            </td>
                            <td colSpan={isPdfSnapshot ? 1 : 2} className="py-2 px-2 text-[10.5px] text-slate-500 font-normal">
                              {part2WarningTableData.isSyncVerified
                                ? `Đồng bộ đến ${formatIsoToDateStr(part2WarningTableData.maxSyncedIso)}.`
                                : 'Chưa đủ dữ liệu đồng bộ.'}
                            </td>
                          </tr>
                        );
                      })()}
                    </tfoot>
                  </table>
                </div>
              );
            })()}
          </div>
        );

        return (
          <div className="mt-8 pt-6 border-t border-slate-200 print:mt-0 print:pt-0 print:border-none">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 print:hidden">
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-600 text-white">
                  Phần 2
                </span>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-[#1A3A5C]">
                  {isHygiene ? 'Bảng Cảnh Báo Cơ Sở' : 'Dữ Liệu Chi Tiết Cảnh Báo Cơ Sở'}
                </h3>
              </div>

              {isHygiene && renderPart2WeekFilterPill(true)}

              {isHygiene ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDownloadPart2Report()}
                    disabled={part2WarningTableData.rows.length === 0 || isExportingPart2Pdf}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B5EA6] hover:bg-[#154b86] disabled:opacity-60 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
                    title="Tải tài liệu PDF Phần 2 giống như báo cáo đang hiển thị để gửi cho các trưởng nhóm"
                  >
                    {isExportingPart2Pdf ? (
                      <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>
                      {isExportingPart2Pdf
                        ? 'Đang tạo PDF...'
                        : `Tải báo cáo (${
                            part2WarningTableData.selectedWeek
                              ? `Tuần ${part2WarningTableData.selectedWeek.weekNumber}: ${part2WarningTableData.selectedWeek.shortRange}`
                              : part2WarningTableData.monthLabel
                          })`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!part2WarningTableData.selectedWeek && part2WarningTableData.monthWeeks.length > 0) {
                        setPart2WeekFilter('current');
                      }
                      setIsWeeklySheetModalOpen(true);
                    }}
                    disabled={part2WarningTableData.rows.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
                    title="Tạo hoặc cập nhật báo cáo xử lý tuần từ dữ liệu Phần 2 lên Google Sheet cố định"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                    <span>Tạo báo cáo xử lý trên Google Sheet</span>
                  </button>

                  {(() => {
                    const sw = part2WarningTableData.selectedWeek;
                    if (!sw || !weeklySheetConfig.spreadsheetId) return null;
                    const wCode = buildWeekCode(sw.startIso, sw.endIso);
                    const syncMeta = weeklySheetConfig.weekSyncHistory?.[wCode];
                    if (!syncMeta?.syncedAt) return null;
                    const tabUrl =
                      syncMeta.sheetId !== undefined
                        ? `https://docs.google.com/spreadsheets/d/${weeklySheetConfig.spreadsheetId}/edit#gid=${syncMeta.sheetId}`
                        : `https://docs.google.com/spreadsheets/d/${weeklySheetConfig.spreadsheetId}/edit`;
                    return (
                      <div className="inline-flex flex-wrap items-center gap-2">
                        <a
                          href={tabUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold transition-colors shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span>Mở Google Sheet tuần này</span>
                        </a>
                        <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50/70 px-2 py-1 rounded-md border border-emerald-200 whitespace-nowrap">
                          Đồng bộ: {syncMeta.syncedAt}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <span className="text-xs text-slate-500 font-medium shrink-0">
                  Tổng hợp nhắc nhở vi phạm từ Sheet “nhắc nhở” và bảng chi tiết 19 cơ sở
                </span>
              )}
            </div>

            {isHygiene ? (
              /* HYGIENE MODE: BẢNG CẢNH BÁO CƠ SỞ (CHECK OUT & THIẾU ẢNH / HẠNG MỤC) */
              <div className="facility-print-page-2">
                {/* PRINT ONLY HEADER */}
                <div className="hidden print:block mb-2 pb-1.5 border-b border-slate-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                        PHẦN 2 – BẢNG CẢNH BÁO CƠ SỞ ({part2WarningTableData.monthLabel})
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        (Ngày gần nhất đã kết thúc: {part2WarningTableData.yesterdayDisplay})
                      </span>
                    </div>
                    <span className="text-[9.5px] font-bold text-slate-700">Trang 2/2</span>
                  </div>
                </div>

                {renderPart2WarningCard(false)}

                {/* OFFSCREEN SNAPSHOT CONTAINER FOR PDF EXPORT (IDENTICAL TO PART 2 UI, ONLY KHÔNG LÀM / LÀM THIẾU) */}
                {isExportingPart2Pdf && (() => {
                  const sw = part2WarningTableData.selectedWeek;
                  const actionableCount = part2WarningTableData.rows.filter(r =>
                    sw
                      ? r.selectedWeekMissingImages > 0 || r.selectedWeekNoCheckoutDays > 0
                      : r.monthMissingImages > 0 || r.monthNoCheckoutDays > 0,
                  ).length;
                  return (
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'fixed',
                        left: '-12000px',
                        top: 0,
                        width: '1080px',
                        pointerEvents: 'none',
                        zIndex: -1,
                      }}
                    >
                      <div
                        ref={part2PdfSnapshotRef}
                        className="bg-white text-slate-800 p-3 font-sans"
                        style={{ width: '1080px' }}
                      >
                        {/* Prominent PDF Document Title */}
                        <div className="mb-3 pb-2 border-b-2 border-[#1A3A5C] text-center">
                          <h2 className="text-lg font-extrabold uppercase tracking-wider text-[#1A3A5C]">
                            DANH SÁCH CƠ SỞ CẦN XỬ LÝ TUẦN
                          </h2>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                            Chỉ bao gồm các cơ sở Không làm hoặc Làm thiếu ({actionableCount} cơ sở)
                          </p>
                        </div>

                        <div className="mb-2 flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-600 text-white">
                              Phần 2
                            </span>
                            <h3 className="text-sm font-bold uppercase tracking-wide text-[#1A3A5C]">
                              Bảng Cảnh Báo Cơ Sở
                            </h3>
                            {filters.coSo && filters.coSo !== 'all' && (
                              <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-[#1B5EA6] text-[11px] font-semibold">
                                {filters.coSo}
                              </span>
                            )}
                          </div>

                          {renderPart2WeekFilterPill(false)}

                          <span className="text-[11px] text-slate-500 font-medium shrink-0">
                            Xuất PDF: {getCurrentTimestampStr()}
                          </span>
                        </div>

                        {renderPart2WarningCard(true)}
                      </div>
                    </div>
                  );
                })()}

                {/* Print only footer for Page 2 (Signatures) */}
                <div className="hidden print:block mt-3">
                  <PrintReportFooter />
                </div>
              </div>
            ) : (
          /* QUALITY MODE: GIỮ NGUYÊN QUY TẮC & BẢNG XẾP HẠNG */
          <>
            {/* FULL WIDTH ACCORDION: THÔNG BÁO QUY TẮC XẾP HẠNG (CHỈ HIỂN THỊ TRÊN WEB) */}
            <div className="my-5 bg-slate-50 border border-slate-200/80 rounded-xl overflow-hidden transition-all print:hidden">
              <button
                onClick={() => setShowRankingRules(!showRankingRules)}
                className="w-full p-3.5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Quy Tắc Xếp Hạng &amp; Cách Tính Tổng Điểm Cơ Sở (Thang 100đ)
                  </span>
                  <span className="p-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center hover:bg-emerald-200 transition-colors" title="Xem quy tắc xếp hạng">
                    <Eye className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold">
                  <span>{showRankingRules ? 'Thu gọn' : 'Xem chi tiết cách tính'}</span>
                  {showRankingRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showRankingRules && (
                <div className="p-4 bg-white border-t border-slate-200/80 text-xs text-slate-600 space-y-3">
                  {/* Banner Công Thức Tổng Quát */}
                  <div className="p-3 bg-gradient-to-r from-sky-50 via-indigo-50 to-emerald-50 rounded-xl border border-sky-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#1B5EA6] block">
                        Công thức tính Tổng Điểm Xếp Hạng (Thang điểm 100):
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono mt-0.5 block">
                        Tổng Điểm = [Điểm TB × 30%] + [Tiến Độ Tháng % × 30%] + [Tính Liên Tục % × 40%]
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-md bg-white border border-sky-200 text-sky-800 font-bold text-[11px]">
                        ⭐ Điểm Đánh Giá: 30%
                      </span>
                      <span className="text-slate-400 font-bold">+</span>
                      <span className="px-2.5 py-1 rounded-md bg-white border border-indigo-200 text-indigo-800 font-bold text-[11px]">
                        📊 Tiến Độ Tháng: 30%
                      </span>
                      <span className="text-slate-400 font-bold">+</span>
                      <span className="px-2.5 py-1 rounded-md bg-white border border-emerald-200 text-emerald-800 font-bold text-[11px]">
                        🔄 Tính Liên Tục: 40%
                      </span>
                    </div>
                  </div>

                  {/* 3 Tiêu Chí Đánh Giá */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-sky-50/60 p-3 rounded-lg border border-sky-200">
                      <div className="font-bold text-sky-900 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-sky-600" />
                          1. Điểm Đánh Giá TB (30%)
                        </span>
                        <span className="text-[10px] bg-sky-200/70 text-sky-800 font-bold px-1.5 py-0.5 rounded">
                          Tối đa 30đ
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Đánh giá trực tiếp mức độ sạch sẽ, chuẩn chỉ vệ sinh và thẩm mỹ không gian cơ sở.
                        <span className="block mt-1 text-[10.5px] font-mono text-sky-800 font-semibold">
                          Điểm = (Điểm TB / 100) × 30đ
                        </span>
                      </p>
                    </div>

                    <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-200">
                      <div className="font-bold text-indigo-900 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                          2. Tiến Độ Tháng (30%)
                        </span>
                        <span className="text-[10px] bg-indigo-200/70 text-indigo-800 font-bold px-1.5 py-0.5 rounded">
                          Tối đa 30đ
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Tỷ lệ hoàn thành so với chỉ tiêu số lượt khu vực trong tháng (Đã làm / Chỉ tiêu).
                        <span className="block mt-1 text-[10.5px] font-mono text-indigo-800 font-semibold">
                          Điểm = Min(100%, Tiến độ %) × 30đ
                        </span>
                      </p>
                    </div>

                    <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200">
                      <div className="font-bold text-emerald-900 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          3. Tính Liên Tục (40%)
                        </span>
                        <span className="text-[10px] bg-emerald-200/70 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                          Tối đa 40đ
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Đo lường kỷ luật duy trì kiểm tra đều đặn hàng ngày, tránh dồn ngày hoặc bỏ cách tuần.
                        <span className="block mt-1 text-[10.5px] font-mono text-emerald-800 font-semibold">
                          Điểm = (Số ngày kiểm tra / Tổng ngày kỳ) × 40đ
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* 4 Mức Xếp Hạng */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200">
                      <div className="font-bold text-emerald-800 text-[11px] flex items-center gap-1">
                        🥇 Xuất Sắc (≥ 90 điểm)
                      </div>
                      <p className="text-[10.5px] text-slate-600 mt-0.5">
                        Điểm TB cao, tiến độ đạt chỉ tiêu và duy trì kiểm tra liên tục đều đặn mỗi ngày.
                      </p>
                    </div>

                    <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-200">
                      <div className="font-bold text-blue-800 text-[11px] flex items-center gap-1">
                        🥈 Khá (80 - 89.9 điểm)
                      </div>
                      <p className="text-[10.5px] text-slate-600 mt-0.5">
                        Đạt kết quả tốt, đảm bảo tiến độ và quy trình kiểm tra ổn định.
                      </p>
                    </div>

                    <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-200">
                      <div className="font-bold text-amber-800 text-[11px] flex items-center gap-1">
                        🥉 Trung Bình (70 - 79.9 điểm)
                      </div>
                      <p className="text-[10.5px] text-slate-600 mt-0.5">
                        Đạt mức cơ bản, cần cải thiện điểm số hoặc tăng cường kiểm tra đều các ngày.
                      </p>
                    </div>

                    <div className="bg-rose-50/60 p-2.5 rounded-lg border border-rose-200">
                      <div className="font-bold text-rose-800 text-[11px] flex items-center gap-1">
                        ⚠️ Cần Cải Thiện (&lt; 70 điểm)
                      </div>
                      <p className="text-[10.5px] text-slate-600 mt-0.5">
                        Điểm số thấp, thiếu lượt kiểm tra hoặc bị gián đoạn nhiều ngày.
                      </p>
                    </div>
                  </div>

                  {/* Nút thu gọn lại ở cuối quy tắc */}
                  <div className="pt-2 border-t border-slate-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowRankingRules(false)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                      title="Thu gọn quy tắc xếp hạng lại"
                    >
                      <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                      <span>Thu gọn lại</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PAGE 2 IN PRINT: AGGREGATED FACILITIES TABLE & PROGRESS BARS + SIGNATURES */}
            <div className="facility-print-page-2">
              {/* PRINT ONLY: HEADER CHO TRANG 2 */}
              <div className="hidden print:block mb-2 pb-1.5 border-b border-slate-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                      BẢNG TỔNG HỢP XẾP HẠNG &amp; TIẾN ĐỘ THỰC HIỆN 19 CƠ SỞ
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      ({filters.thang !== 'all' ? `Tháng ${filters.thang}` : 'Toàn thời gian'})
                    </span>
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-700">Trang 2/2</span>
                </div>
                <div className="flex items-center gap-2.5 text-[9px] text-slate-600 mt-1">
                  <span className="font-bold text-slate-800">Tổng Điểm 100đ: Điểm TB (30%) + Tiến độ (30%) + Tính liên tục (40%)</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-bold text-emerald-800">🥇 Xuất Sắc (≥ 90đ)</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-blue-800">🥈 Khá (80 - 89.9đ)</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-amber-800">🥉 Trung Bình (70 - 79.9đ)</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-rose-800">⚠️ Cần Cải Thiện (&lt; 70đ)</span>
                </div>
              </div>

              {/* AGGREGATED FACILITIES TABLE & PROGRESS BARS */}
              <div ref={tableContainerRef} className="mt-6 print:mt-0 bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs print:border-none print:shadow-none print:rounded-none">
                <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3 print:hidden">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#1B5EA6]" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A3A5C]">
                        Bảng Xếp Hạng (BXH) &amp; Danh Sách Các Cơ Sở
                      </h3>
                      <p className="text-[11px] text-slate-500 font-normal">
                        Xếp hạng tổng điểm 100đ theo 3 tiêu chí: Điểm TB (30%) • Tiến độ tháng (30%) • Tính liên tục (40%)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-[#1B5EA6] text-white px-3.5 py-1.5 rounded-lg shadow-xs font-bold text-xs print:hidden">
                      <Award className="w-3.5 h-3.5 text-amber-300" />
                      <span>BXH Tổng Điểm (100đ)</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsRankingTableCollapsed(!isRankingTableCollapsed)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all shadow-2xs cursor-pointer print:hidden"
                      title={isRankingTableCollapsed ? "Mở rộng bảng xếp hạng" : "Thu gọn bảng xếp hạng lại"}
                    >
                      {isRankingTableCollapsed ? (
                        <>
                          <ChevronDown className="w-3.5 h-3.5 text-[#1B5EA6]" />
                          <span>Mở rộng bảng ({sortedSummaries.length} cơ sở)</span>
                        </>
                      ) : (
                        <>
                          <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                          <span>Thu gọn lại</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isRankingTableCollapsed && (
                  <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 print:hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-700">
                        Đang thu gọn bảng xếp hạng ({sortedSummaries.length} cơ sở).
                      </span>
                      {sortedSummaries.length >= 3 && (
                        <span className="text-[11px] text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                          Top 3: 🥇 <strong className="text-slate-900">{sortedSummaries[0]?.coSo}</strong> ({facilityScoreMap.get(sortedSummaries[0]?.coSo)?.totalScore.toFixed(1)}đ) • 🥈 <strong className="text-slate-900">{sortedSummaries[1]?.coSo}</strong> ({facilityScoreMap.get(sortedSummaries[1]?.coSo)?.totalScore.toFixed(1)}đ) • 🥉 <strong className="text-slate-900">{sortedSummaries[2]?.coSo}</strong> ({facilityScoreMap.get(sortedSummaries[2]?.coSo)?.totalScore.toFixed(1)}đ)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRankingTableCollapsed(false)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B5EA6] text-white hover:bg-[#164e8a] font-bold text-xs transition-colors shadow-2xs cursor-pointer shrink-0"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Mở rộng xem chi tiết</span>
                    </button>
                  </div>
                )}

                <div className={isRankingTableCollapsed ? 'hidden print:block' : 'block'}>
                  {sortedSummaries.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      Không tìm thấy dữ liệu cơ sở nào phù hợp với bộ lọc hiện tại.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-3 text-center w-14">Hạng</th>
                            <th className="py-3 px-4">Tên Cơ Sở</th>
                            <th className="py-3 px-4 text-center min-w-[130px] bg-sky-50/70 text-[#1A3A5C]">
                              Tổng Điểm (100đ)
                            </th>
                            <th className="py-3 px-4 min-w-[170px]">Tiến Độ Quý (%)</th>
                            <th className="py-3 px-4 text-center">Số Sự Cố / Xử Lý</th>
                            <th className="py-3 px-4 text-center min-w-[135px]">Tính Liên Tục (40%)</th>
                            <th className="py-3 px-4 text-center">Định Mức Kiểm Tra</th>
                            <th className="py-3 px-4 text-center">Đã Thực Hiện</th>
                            <th className="py-3 px-4">Lần Kiểm Tra Cuối</th>
                            <th className="py-3 px-4 text-center print:hidden">Báo Cáo Chi Tiết</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedSummaries.map((item, index) => {
                            const isSelected = selectedFacilityFilter === item.coSo;
                            const targetDetail = getFacilityTargetDetail(item.coSo);
                            const roomCfg = getFacilityRoomConfig(item.coSo);
                            const dailyTarget = targetDetail ? targetDetail.total : (roomCfg.co + roomCfg.ve + roomCfg.nvs + roomCfg.leTan);
                            const quarterlyTarget = dailyTarget;
                            const progressPercent = quarterlyTarget > 0 ? (item.soLanThucHien / quarterlyTarget) * 100 : 0;
                            const totalTarget = quarterlyTarget;

                            const scoreData = facilityScoreMap.get(item.coSo) || {
                              totalScore: 0,
                              qualityScore: 0,
                              progressScore: 0,
                              continuityScore: 0,
                              rawAvgScore: 0,
                              rawProgressRate: 0,
                              rawContinuityRate: 0,
                              activeDays: 0,
                              expectedDays: 1,
                              tier: 'can_cai_thien' as const,
                              tierLabel: 'Chưa kiểm tra',
                              tierColor: 'text-slate-500',
                              tierBg: 'bg-slate-100 border-slate-200 text-slate-500'
                            };

                            let rankBadge = <span className="text-slate-400 font-mono text-xs">{index + 1}</span>;
                            if (item.soLanThucHien > 0) {
                              if (index === 0) rankBadge = <span className="text-base" title="Hạng 1">🥇</span>;
                              else if (index === 1) rankBadge = <span className="text-base" title="Hạng 2">🥈</span>;
                              else if (index === 2) rankBadge = <span className="text-base" title="Hạng 3">🥉</span>;
                            }

                            const isHiddenByLimit = rowLimit !== 'all' && index >= rowLimit;

                            return (
                              <tr
                                key={item.coSo}
                                onClick={() => {
                                  onSelectFacility(isSelected ? 'all' : item.coSo);
                                  if (onOpenDetailModal) onOpenDetailModal(item.coSo);
                                }}
                                className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                                  isSelected ? 'bg-[#3EA8E0]/10 border-l-4 border-l-[#1B5EA6] font-medium' : ''
                                } ${isHiddenByLimit ? 'hidden print:table-row' : ''}`}
                              >
                                <td className="py-3 px-3 text-center font-bold">{rankBadge}</td>
                                <td className="py-3 px-4 font-semibold text-slate-900">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 flex-shrink-0 text-[#4CAF8A]" />
                                    <span>{item.coSo}</span>
                                    {isSelected && (
                                      <span className="bg-[#1B5EA6] text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                                        Đang chọn
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center bg-sky-50/30 relative group">
                                  {item.soLanThucHien === 0 ? (
                                    <span className="text-slate-400 font-mono">-</span>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center">
                                      <div className="flex items-baseline gap-0.5">
                                        <span className="text-sm sm:text-base font-black font-display text-slate-900">
                                          {scoreData.totalScore.toFixed(1)}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-semibold">/100</span>
                                      </div>
                                      <span className={`inline-block px-2 py-0.2 rounded-full text-[9.5px] font-bold border mt-0.5 ${scoreData.tierBg}`}>
                                        {scoreData.tierLabel}
                                      </span>
                                      <div className="w-16 bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${
                                            scoreData.totalScore >= 90
                                              ? 'bg-emerald-500'
                                              : scoreData.totalScore >= 80
                                              ? 'bg-blue-500'
                                              : scoreData.totalScore >= 70
                                              ? 'bg-amber-500'
                                              : 'bg-rose-500'
                                          }`}
                                          style={{ width: `${Math.min(100, scoreData.totalScore)}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 min-w-[170px]">
                                  <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                                    <span className={progressPercent >= 100 ? 'text-[#4CAF8A] font-bold' : progressPercent >= 50 ? 'text-[#3EA8E0] font-bold' : 'text-[#F2775A] font-bold'}>
                                      {progressPercent.toFixed(0)}%
                                    </span>
                                    <span className="text-slate-500 text-[10px]">
                                      {item.soLanThucHien}/{totalTarget} lượt
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        progressPercent >= 100
                                          ? 'bg-[#4CAF8A]'
                                          : progressPercent >= 50
                                          ? 'bg-[#3EA8E0]'
                                          : progressPercent >= 20
                                          ? 'bg-[#F9C846]'
                                          : 'bg-[#F2775A]'
                                      }`}
                                      style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {item.soLanThucHien === 0 ? (
                                    <span className="text-slate-400">-</span>
                                  ) : (
                                    <div>
                                      <span className={`font-bold text-xs block ${item.soSuCo && item.soSuCo > 0 ? 'text-[#F2775A]' : 'text-[#4CAF8A]'}`}>
                                        {item.soSuCo || 0} sự cố
                                      </span>
                                      <span className="text-[10px] text-[#3EA8E0] block font-semibold">
                                        {item.tyLeDaXuLy || 100}% đã xử lý
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {item.soLanThucHien === 0 ? (
                                    <span className="text-slate-400 font-mono">-</span>
                                  ) : (
                                    <div className="inline-flex flex-col items-center">
                                      <span className="font-bold text-slate-800 text-xs font-mono">
                                        {scoreData.activeDays}/{scoreData.expectedDays} ngày
                                      </span>
                                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${
                                        scoreData.rawContinuityRate >= 90
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : scoreData.rawContinuityRate >= 70
                                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                                          : 'bg-amber-50 text-amber-700 border-amber-200'
                                      }`}>
                                        <CalendarClock className="w-2.5 h-2.5" />
                                        {scoreData.rawContinuityRate.toFixed(0)}%
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                                    <span className="font-bold text-slate-800 text-xs whitespace-nowrap">
                                      {dailyTarget} khu vực/quý
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-50 text-[#4CAF8A] border-slate-200">
                                    {item.soLanThucHien} lượt
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-600 text-xs">
                                  {item.lanCuoiKiemTra || 'Chưa kiểm tra'}
                                </td>
                                <td className="py-3 px-4 text-center print:hidden">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectFacility(isSelected ? 'all' : item.coSo);
                                      if (onOpenDetailModal) onOpenDetailModal(item.coSo);
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer border ${
                                      isSelected
                                        ? 'bg-[#1B5EA6] text-white border-[#1B5EA6] font-bold'
                                        : 'bg-[#1B5EA6]/10 hover:bg-[#1B5EA6]/20 text-[#1B5EA6] border-[#1B5EA6]/30'
                                    }`}
                                  >
                                    <Eye className="w-3.5 h-3.5" /> {isSelected ? 'Đang chọn' : 'Xem'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {sortedSummaries.length > 0 && (
                    <div className="p-3.5 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 print:hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-500">
                          Hiển thị: <strong className="text-slate-800">{rowLimit === 'all' ? sortedSummaries.length : Math.min(rowLimit, sortedSummaries.length)}</strong> / {sortedSummaries.length} cơ sở
                        </span>
                        {sortedSummaries.length > 5 && (
                          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setRowLimit(5)}
                              className={`px-2.5 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                                rowLimit === 5 ? 'bg-[#1B5EA6] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Top 5
                            </button>
                            <button
                              type="button"
                              onClick={() => setRowLimit(10)}
                              className={`px-2.5 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                                rowLimit === 10 ? 'bg-[#1B5EA6] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Top 10
                            </button>
                            <button
                              type="button"
                              onClick={() => setRowLimit('all')}
                              className={`px-2.5 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                                rowLimit === 'all' ? 'bg-[#1B5EA6] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Tất cả ({sortedSummaries.length})
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRankingTableCollapsed(true);
                            tableContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-bold text-xs cursor-pointer shadow-2xs transition-colors"
                        >
                          <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                          <span>Thu gọn lại</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden print:block mt-3">
                <PrintReportFooter />
              </div>
            </div>
          </>
        )}
      </div>
        );
      })()}
      {/* END OF PHẦN 2 */}

      {/* PHẦN 3: NHẬP LIỆU VÀ KIỂM TRA LẠI HÌNH ẢNH CHI TIẾT */}
      <div className="mt-8 pt-6 border-t border-slate-200 print:hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-700 text-white">
                Phần 3
              </span>
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-[#1A3A5C]">
                Nhập Liệu &amp; Kiểm Tra Lại Hình Ảnh Chi Tiết
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kiểm duyệt hình ảnh vệ sinh chi tiết từng khu vực, nhập đánh giá Lỗi AI / Đã duyệt và đồng bộ về Google Sheet
            </p>
          </div>
          {onOpenDetailModal && (
            <button
              type="button"
              onClick={() => onOpenDetailModal(filters.coSo || 'all')}
              className="inline-flex items-center gap-1.5 bg-[#1B5EA6]/10 hover:bg-[#1B5EA6]/20 text-[#1B5EA6] border border-[#1B5EA6]/30 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer shrink-0"
              title="Mở popup toàn bộ nhật ký hình ảnh & báo cáo chi tiết"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Xem Nhật Ký Hình Ảnh Chi Tiết</span>
            </button>
          )}
        </div>

        {isHygiene ? (
          <>
            <WeeklyTrackingPart3Panel
              selectedFacilityFilter={filters.coSo}
              selectedMonthFilter={filters.thang}
              selectedDateFrom={filters.tuNgay}
              selectedDateTo={filters.denNgay}
              config={weeklySheetConfig}
            />
            <YesterdayHygieneReview
              dateIso={yesterdayInfo.isoStr}
              dateDisplay={yesterdayInfo.displayStr}
              reports={rawHygieneReports}
              selectedFacilityFilter={filters.coSo}
            />
          </>
        ) : (
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Kiểm tra nhật ký hình ảnh &amp; đề xuất chất lượng cơ sở
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Xem đầy đủ ảnh chụp, mức độ sự cố và trạng thái khắc phục của từng cơ sở.
              </p>
            </div>
            {onOpenDetailModal && (
              <button
                type="button"
                onClick={() => onOpenDetailModal(filters.coSo || 'all')}
                className="inline-flex items-center gap-1.5 bg-[#4CAF8A] hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                <FileText className="w-4 h-4" />
                <span>Mở Danh Sách Hình Ảnh Chi Tiết</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Facility Status Detail Modal */}
      {isModalOpen && (
        <FacilityStatusModal
          mode={mode}
          summaries={summaries}
          onClose={() => setIsModalOpen(false)}
          onSelectFacility={onSelectFacility}
        />
      )}

      {/* Missing Facility Days Detail Modal */}
      {missingModalScope && (
        <MissingDaysModal
          items={
            missingModalScope === 'daily'
              ? centerKpiMetrics.daily.missingDaysList
              : missingModalScope === 'week'
              ? centerKpiMetrics.week.missingDaysList
              : centerKpiMetrics.period.missingDaysList
          }
          periodLabel={
            missingModalScope === 'daily'
              ? `Ngày ${centerKpiMetrics.yesterdayDisplay}`
              : missingModalScope === 'week'
              ? `${centerKpiMetrics.weekRowLabel} (${centerKpiMetrics.weekRangeShort})`
              : centerKpiMetrics.periodShortTitle
          }
          endedDaysCount={
            missingModalScope === 'daily'
              ? centerKpiMetrics.daily.daysCount
              : missingModalScope === 'week'
              ? centerKpiMetrics.week.daysCount
              : centerKpiMetrics.period.daysCount
          }
          onClose={() => setMissingModalScope(null)}
          onSelectFacility={onSelectFacility}
        />
      )}

      {/* Facility Day Inspection Modal (Phần 2 drill-down: hạng mục thiếu & ảnh đã gửi) */}
      {inspectionModalState && (() => {
        const matchedRow = part2WarningTableData.rows.find(
          r => r.coSo === inspectionModalState.facilityName,
        );
        if (!matchedRow) return null;
        return (
          <FacilityDayInspectionModal
            facilityName={matchedRow.coSo}
            initialDateIso={inspectionModalState.dateIso}
            daysInMonth={matchedRow.monthDays}
            monthLabel={part2WarningTableData.monthLabel}
            onClose={() => setInspectionModalState(null)}
            onSelectFacilityFilter={fac => onSelectFacility(fac)}
          />
        );
      })()}

      {/* Weekly Google Sheet Creation / Sync Modal (Phần 2 -> Google Sheet) */}
      <WeeklyWarningSheetModal
        isOpen={isWeeklySheetModalOpen}
        onClose={() => setIsWeeklySheetModalOpen(false)}
        selectedWeek={part2WarningTableData.selectedWeek}
        availableWeeks={part2WarningTableData.monthWeeks}
        onSelectWeekKey={key => setPart2WeekFilter(key)}
        part2Rows={part2WarningTableData.rows}
        cutoffDisplay={part2WarningTableData.yesterdayDisplay}
        config={weeklySheetConfig}
        onConfigUpdated={nextCfg => setWeeklySheetConfig(nextCfg)}
        onSyncCompleted={() => {
          void loadWeeklySheetConfig().then(cfg => setWeeklySheetConfig(cfg));
          window.dispatchEvent(new CustomEvent('weekly-warning-sheet-updated'));
        }}
      />
    </section>
  );
};
