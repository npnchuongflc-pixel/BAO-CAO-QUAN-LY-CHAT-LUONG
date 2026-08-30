import React, { useState, useMemo, useEffect } from 'react';
import { FacilitySummary, ReportMode, FilterState, HygieneReport, FacilityQualityReport } from './facilityTypes';
import { FacilityStatusModal } from './FacilityStatusModal';
import { 
  OFFICIAL_FACILITIES,
  getFacilityRoomConfig, 
  getDaysInMonthFromFilter,
  getFacilityTargetDetail,
  getFacilityDailyTarget
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
  FileSpreadsheet,
  RotateCcw
} from 'lucide-react';
import { normalizeDateToIso } from '../../utils/dateUtils';
import {
  getLocalWarningAudits,
  saveLocalWarningAudit,
  removeLocalWarningAudit,
  WarningAuditRecord
} from '../../services/googleSheetsService';
import {
  getStoredCustomSheet,
  updateSingleWarningAuditToGoogleSheet,
  syncAllWarningsForDateToGoogleSheet,
  syncAndFetchWarningsFromSheet,
  clearAllWarningAuditsForDateInGoogleSheet,
  createWarningAuditGoogleSheet,
  formatIsoToDateStr,
  getCurrentTimestampStr
} from '../../services/warningAuditSheetService';
import { getCurrentUser } from '../../services/googleAuthService';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';

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
}) => {
  const isHygiene = mode === 'hygiene';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showRankingRules, setShowRankingRules] = useState(false);
  const [rankingSortMode, setRankingSortMode] = useState<'frequency' | 'score'>('frequency');

  // Sorted summaries according to BXH ranking mode (Frequency vs Score)
  const sortedSummaries = useMemo(() => {
    const list = [...summaries];
    if (rankingSortMode === 'score') {
      return list.sort((a, b) => {
        const scoreA = a.diemTrungBinh || 0;
        const scoreB = b.diemTrungBinh || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return b.soLanThucHien - a.soLanThucHien;
      });
    } else {
      // Frequency (default)
      return list.sort((a, b) => {
        if (b.soLanThucHien !== a.soLanThucHien) return b.soLanThucHien - a.soLanThucHien;
        return (b.diemTrungBinh || 0) - (a.diemTrungBinh || 0);
      });
    }
  }, [summaries, rankingSortMode]);

  // 1. Calculate Active Facilities and Score Tiers for Pie Chart (Only facilities that performed checks)
  const activeSummaries = useMemo(() => {
    return summaries.filter(s => s.soLanThucHien > 0);
  }, [summaries]);

  // Target total calculation according to active filters
  const filterTargetInfo = useMemo(() => {
    const dailyTarget = getFacilityDailyTarget(filters.coSo);
    let days = 30;
    if (filters.tuNgay && filters.denNgay) {
      const start = new Date(filters.tuNgay);
      const end = new Date(filters.denNgay);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
        days = Math.max(1, diffDays);
      }
    } else if (filters.thang && filters.thang !== 'all') {
      days = getDaysInMonthFromFilter(filters.thang);
    }
    const totalTarget = dailyTarget * days;
    return {
      dailyTarget,
      days,
      totalTarget,
    };
  }, [filters.coSo, filters.tuNgay, filters.denNgay, filters.thang]);

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

  // Yesterday Date Info (Always previous day relative to current local date)
  const yesterdayInfo = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yyyy = yesterday.getFullYear();
    const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
    const dd = String(yesterday.getDate()).padStart(2, '0');

    const isoStr = `${yyyy}-${mm}-${dd}`;
    const displayStr = `${dd}/${mm}/${yyyy}`;

    return { isoStr, displayStr };
  }, []);

  // Baseline "Ngày đang xét" (Luôn là ngày trước ngày hiện tại 1 ngày - Hôm qua)
  const baselineWarningDateIso = yesterdayInfo.isoStr;

  // Single date state for Warning Card
  const [customWarningDate, setCustomWarningDate] = useState<string>('');

  const activeWarningDateIso = customWarningDate || baselineWarningDateIso;

  const isCustomDateActive = Boolean(customWarningDate && customWarningDate !== baselineWarningDateIso);

  const activeWarningDisplayStr = useMemo(() => {
    if (!activeWarningDateIso) return '';
    const parts = activeWarningDateIso.trim().split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return activeWarningDateIso;
  }, [activeWarningDateIso]);

  // 2. Identify Warning Facilities for the single selected date
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

    OFFICIAL_FACILITIES.forEach(coSo => {
      const dailyTarget = getFacilityDailyTarget(coSo);
      const periodTarget = dailyTarget;

      const reports = isHygiene
        ? rawHygieneReports.filter(r => r.coSo === coSo && isInRange(r.ngay))
        : rawQualityReports.filter(r => r.coSo === coSo && isInRange(r.ngay));

      const allCoSoHygieneReports = rawHygieneReports.filter(r => r.coSo === coSo && isInRange(r.ngay));
      const allCoSoQualityReports = rawQualityReports.filter(r => r.coSo === coSo && isInRange(r.ngay));

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
  }, [rawHygieneReports, rawQualityReports, isHygiene, activeWarningDateIso]);

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
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; type: 'success' | 'info' | 'error'; url?: string } | null>(null);
  const [customSheetUrl, setCustomSheetUrl] = useState<string>(() => getStoredCustomSheet()?.spreadsheetUrl || '');
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);

  // Background Auto-Sync: Automatically ensures all warning facilities for the active date exist in the Google Sheet (FALSE, FALSE if unchecked)
  // and syncs back any existing checkboxes from the Sheet to ensure 100% consistency across devices.
  useEffect(() => {
    if (!warningFacilities || warningFacilities.length === 0) return;
    
    let isMounted = true;
    const runAutoSync = async () => {
      try {
        const res = await syncAndFetchWarningsFromSheet(
          activeWarningDateIso,
          warningFacilities.map(w => ({ coSo: w.coSo, reasons: w.reasons })),
          warningAudits
        );
        if (isMounted && res.success) {
          setWarningAudits(prev => ({ ...prev, ...res.syncedAudits }));
        }
      } catch (err) {
        console.warn('Auto-sync warning facilities background notice:', err);
      }
    };

    runAutoSync();

    return () => {
      isMounted = false;
    };
  }, [activeWarningDateIso, warningFacilities.length]);

  const handleInitSheet = async () => {
    setIsCreatingSheet(true);
    try {
      const res = await createWarningAuditGoogleSheet();
      setCustomSheetUrl(res.spreadsheetUrl);
      setSyncFeedback({
        message: 'Đã tạo file Google Sheet mới thành công!',
        type: 'success',
        url: res.spreadsheetUrl
      });
      setTimeout(() => setSyncFeedback(null), 6000);
    } catch (err: any) {
      setSyncFeedback({
        message: `Lỗi tạo Google Sheet: ${err.message || 'Thử lại'}`,
        type: 'error'
      });
      setTimeout(() => setSyncFeedback(null), 5000);
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const handleClearAllWarningChecks = () => {
    if (warningFacilities.length === 0) {
      setSyncFeedback({
        message: `Ngày ${activeWarningDisplayStr} không có cơ sở nào bị cảnh báo.`,
        type: 'info'
      });
      setTimeout(() => setSyncFeedback(null), 3000);
      return;
    }

    // 1. Remove all check records for activeWarningDateIso locally (UI and localStorage only)
    setWarningAudits(prev => {
      const copy = { ...prev };
      for (const w of warningFacilities) {
        const auditId = `${w.coSo}_${activeWarningDateIso}`;
        delete copy[auditId];
        removeLocalWarningAudit(auditId);
      }
      return copy;
    });

    setSyncFeedback({
      message: `Đã xóa toàn bộ tích chọn ngày ${activeWarningDisplayStr} trên giao diện. Bấm "Đổ cảnh báo vào Sheet" khi muốn cập nhật lên Google Sheet.`,
      type: 'info',
      url: customSheetUrl
    });
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  const handleSyncAllWarningsForDate = async () => {
    if (warningFacilities.length === 0) {
      setSyncFeedback({
        message: `Ngày ${activeWarningDisplayStr} không có cơ sở nào bị cảnh báo.`,
        type: 'info'
      });
      setTimeout(() => setSyncFeedback(null), 3000);
      return;
    }

    setIsSyncingAll(true);
    try {
      const res = await syncAllWarningsForDateToGoogleSheet(
        activeWarningDateIso,
        warningFacilities.map(w => ({ coSo: w.coSo, reasons: w.reasons })),
        warningAudits
      );
      if (res.spreadsheetUrl) {
        setCustomSheetUrl(res.spreadsheetUrl);
      }
      setSyncFeedback({
        message: res.message,
        type: res.success ? 'success' : 'error',
        url: res.spreadsheetUrl || customSheetUrl
      });
      setTimeout(() => setSyncFeedback(null), 7000);
    } catch (err: any) {
      setSyncFeedback({
        message: `Lỗi đồng bộ Sheet: ${err.message || 'Thử lại'}`,
        type: 'error'
      });
      setTimeout(() => setSyncFeedback(null), 5000);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleToggleWarningAudit = async (coSo: string, targetType: 'da_nhac_nho' | 'loi_app', reasons: string[]) => {
    const auditId = `${coSo}_${activeWarningDateIso}`;
    const existing = warningAudits[auditId];

    // If clicking the active status -> toggle off (remove)
    if (existing && existing.loaiTrangThai === targetType) {
      removeLocalWarningAudit(auditId);
      setWarningAudits(prev => {
        const copy = { ...prev };
        delete copy[auditId];
        return copy;
      });

      // Update sheet row checkbox to FALSE, FALSE
      const sheetRes = await updateSingleWarningAuditToGoogleSheet(activeWarningDateIso, coSo, null);
      if (sheetRes.spreadsheetUrl) {
        setCustomSheetUrl(sheetRes.spreadsheetUrl);
      }

      setSyncFeedback({
        message: `Đã hủy tích chọn cho ${coSo} (đã cập nhật vào Sheet)`,
        type: 'info',
        url: sheetRes.spreadsheetUrl || customSheetUrl
      });
      setTimeout(() => setSyncFeedback(null), 3000);
      return;
    }

    // Otherwise create or update record
    const timeStr = getCurrentTimestampStr();
    const label = targetType === 'da_nhac_nho' ? 'Đã xác minh và nhắc nhở' : 'Đã xác minh do lỗi app';
    const currentUser = getCurrentUser();
    const currentEmail = currentUser?.email || '';

    const newRecord: WarningAuditRecord = {
      id: auditId,
      coSo,
      ngay: activeWarningDateIso,
      thoiGianTich: timeStr,
      trangThai: label,
      loaiTrangThai: targetType,
      lyDoCanhBao: reasons.join('; '),
      nguoiXuLy: currentEmail || 'Quản lý kiểm tra',
      emailThucHien: currentEmail
    };

    saveLocalWarningAudit(newRecord);
    setWarningAudits(prev => ({
      ...prev,
      [auditId]: newRecord
    }));

    // Send directly to the dedicated Google Sheet with exact column mapping
    const sheetRes = await updateSingleWarningAuditToGoogleSheet(activeWarningDateIso, coSo, targetType, currentEmail);
    if (sheetRes.spreadsheetUrl) {
      setCustomSheetUrl(sheetRes.spreadsheetUrl);
    }
    if (sheetRes.userEmail && sheetRes.userEmail !== newRecord.emailThucHien) {
      newRecord.emailThucHien = sheetRes.userEmail;
      newRecord.nguoiXuLy = sheetRes.userEmail;
      saveLocalWarningAudit(newRecord);
      setWarningAudits(prev => ({
        ...prev,
        [auditId]: newRecord
      }));
    }

    setSyncFeedback({
      message: `${coSo}: ${label} → ${sheetRes.success ? 'Đã cập nhật vào Google Sheet!' : `(${sheetRes.message})`}`,
      type: sheetRes.success ? 'success' : 'error',
      url: sheetRes.spreadsheetUrl || customSheetUrl
    });
    setTimeout(() => setSyncFeedback(null), 6000);
  };

  return (
    <section className="bg-white text-slate-800 rounded-2xl p-5 sm:p-6 mb-8 shadow-xs border border-slate-200/90">
      {/* Header of Summary Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/90">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#1B5EA6]" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#1A3A5C] font-display">
              TỔNG HỢP THỰC HIỆN CÁC CƠ SỞ {filters.thang !== 'all' ? `(${filters.thang})` : ''}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bảng thống kê số lần thực hiện, tỷ lệ đạt và trạng thái của từng cơ sở theo bộ lọc được chọn
          </p>
        </div>

        {/* Report & Facility Hygiene Filter Switcher & Open All Reports Button */}
        <div className="flex items-center gap-3 flex-wrap">
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
              onClick={() => onOpenDetailModal('all')}
              className="flex items-center gap-1.5 bg-[#1B5EA6]/10 hover:bg-[#1B5EA6]/20 text-[#1B5EA6] border border-[#1B5EA6]/30 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              title="Mở popup danh sách báo cáo chi tiết"
            >
              <FileText className="w-4 h-4 text-[#1B5EA6]" />
              <span>Xem Tất Cả Nhật Ký</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-5">
        {/* KPI 1: Số cơ sở đã thực hiện (CLICKABLE TO SEE DONE vs NOT DONE) */}
        <div 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-50/70 hover:bg-[#3EA8E0]/10 rounded-xl p-4 border border-slate-200/80 hover:border-[#3EA8E0]/60 flex items-center justify-between shadow-2xs cursor-pointer transition-all duration-200 group relative"
          title="Bấm để xem danh sách chi tiết các cơ sở Đã làm / Chưa làm"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cơ sở đã thực hiện</p>
              <ExternalLink className="w-3 h-3 text-[#1B5EA6] opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>

            <p className="text-2xl font-bold text-[#1A3A5C] mt-1 font-display">
              {activeFacilityCount} <span className="text-xs font-normal text-slate-500">/ {summaries.length} cơ sở</span>
            </p>
            
            <div className="mt-1 flex items-center gap-1">
              <span className="inline-flex items-center gap-1 text-[10px] bg-[#1B5EA6]/10 text-[#1B5EA6] group-hover:bg-[#1B5EA6] group-hover:text-white px-2 py-0.5 rounded font-medium transition-colors">
                Ấn vào để xem chi tiết ↗
              </span>
            </div>
          </div>

          <div className="w-11 h-11 rounded-xl bg-[#1B5EA6]/10 border border-[#1B5EA6]/20 group-hover:bg-[#1B5EA6]/20 flex items-center justify-center text-[#1B5EA6] transition-colors">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Tổng số lần thực hiện */}
        <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng lượt kiểm tra</p>
            <p className="text-2xl font-bold text-[#1A3A5C] mt-1 font-display">
              {totalRecords} <span className="text-sm font-semibold text-slate-500">/ {filterTargetInfo.totalTarget} lần</span>
            </p>
            <p className="text-xs text-[#3EA8E0] font-semibold mt-1">
              Target: {filterTargetInfo.dailyTarget} lượt/ngày
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#3EA8E0]/15 border border-[#3EA8E0]/30 flex items-center justify-center text-[#1B5EA6]">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Chỉ số trung bình / Pass rate */}
        <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isHygiene ? 'Tỷ lệ Vệ sinh Đạt' : 'Tỷ lệ Đã xử lý'}
            </p>
            <p className="text-2xl font-bold text-[#4CAF8A] mt-1 font-display">
              {overallScoreOrRate.toFixed(1)}%
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isHygiene ? 'Trung bình kết quả kiểm tra' : 'Sự cố đã khắc phục'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#4CAF8A]/15 border border-[#4CAF8A]/30 flex items-center justify-center text-[#4CAF8A]">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SECTION: PIE CHART & DIRECT WARNING ALERTS LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 my-6">
        
        {/* LEFT COLUMN: DIRECT WARNING ALERTS LIST (7 cols) */}
        <div className="lg:col-span-7 bg-amber-50/30 border border-amber-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            {/* Warning Section Header with Independent Date Selector & Google Sheet Links */}
            <div className="pb-3 border-b border-amber-200/70 mb-3.5 space-y-2.5">
              {/* Row 1: Header Title and Date Selector */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 shrink-0">
                    <AlertOctagon className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-amber-950 font-bold text-xs sm:text-sm uppercase tracking-wide">
                      CẢNH BÁO CƠ SỞ CẦN THEO DÕI
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200/90 text-amber-900 border border-amber-300/80">
                      {warningFacilities.length}
                    </span>
                  </div>
                </div>

                {/* Right: Date Picker */}
                <div className="flex items-center gap-2">
                  {isCustomDateActive && (
                    <button 
                      type="button"
                      onClick={() => setCustomWarningDate('')}
                      className="text-xs text-amber-800 hover:text-amber-950 font-medium px-2 py-1 rounded-md bg-amber-100/80 hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer"
                      title={`Quay về ngày hôm qua (${yesterdayInfo.displayStr})`}
                    >
                      <span>↩ Về ngày xét ({yesterdayInfo.displayStr})</span>
                    </button>
                  )}

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-300/90 rounded-lg text-xs shadow-2xs">
                    <CalendarClock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-slate-500 font-medium">Ngày:</span>
                    <input 
                      type="date" 
                      value={activeWarningDateIso}
                      onChange={(e) => setCustomWarningDate(e.target.value)}
                      className="bg-transparent text-slate-800 font-semibold text-xs focus:outline-none cursor-pointer"
                      title="Chọn ngày lọc cảnh báo"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Action Toolbar with balanced buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Ghi nối tiếp dữ liệu theo ngày vào Sheet (không ghi đè)</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Sync all warning facilities of this day into Google Sheet */}
                  <button
                    type="button"
                    disabled={isSyncingAll || warningFacilities.length === 0}
                    onClick={handleSyncAllWarningsForDate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    title="Đổ toàn bộ danh sách các cơ sở cảnh báo ngày này vào Google Sheet"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{isSyncingAll ? 'Đang đổ vào Sheet...' : 'Đổ cảnh báo vào Sheet'}</span>
                  </button>

                  {/* Clear all checks for this day */}
                  <button
                    type="button"
                    disabled={warningFacilities.length === 0}
                    onClick={handleClearAllWarningChecks}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 disabled:opacity-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    title="Xóa toàn bộ các ô đã tích chọn trên giao diện web (bấm 'Đổ cảnh báo vào Sheet' khi muốn cập nhật lên Google Sheet)"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Xóa tất cả tích</span>
                  </button>

                  {/* Google Sheet Open / Create Button */}
                  {customSheetUrl ? (
                    <a
                      href={customSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      title="Mở file Google Sheet chứa toàn bộ dữ liệu nhật ký kiểm tra"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở Sheet</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled={isCreatingSheet}
                      onClick={handleInitSheet}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      title="Tạo file Google Sheet mới trên Google Drive"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isCreatingSheet ? 'Đang tạo...' : 'Tạo Sheet'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sync Feedback Toast Notification */}
            {syncFeedback && (
              <div className={`mb-3 p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 animate-fadeIn ${
                syncFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : syncFeedback.type === 'error'
                  ? 'bg-rose-50 text-rose-900 border-rose-300'
                  : 'bg-sky-50 text-sky-900 border-sky-300'
              }`}>
                <div className="flex items-center gap-2 flex-wrap">
                  {syncFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-sky-600 shrink-0" />
                  )}
                  <span>{syncFeedback.message}</span>
                  {syncFeedback.url && (
                    <a
                      href={syncFeedback.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold underline text-emerald-800 hover:text-emerald-950 ml-1"
                    >
                      <span>[Xem trên Sheet ↗]</span>
                    </a>
                  )}
                </div>
                <button 
                  type="button" 
                  onClick={() => setSyncFeedback(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Direct Warning List Body */}
            {warningFacilities.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg my-2 font-medium">
                <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600 shrink-0" />
                <span>Tất cả 19 cơ sở đều đạt chỉ tiêu, điểm số ≥ 70đ và đã tắt máy lạnh đầy đủ trong ngày {activeWarningDisplayStr}!</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar my-1">
                {warningFacilities.map((item) => {
                  const auditKey = `${item.coSo}_${activeWarningDateIso}`;
                  const audit = warningAudits[auditKey];

                  return (
                    <div
                      key={item.coSo}
                      className={`border p-3.5 rounded-xl transition-all flex flex-col justify-between gap-2.5 shadow-2xs ${
                        audit?.loaiTrangThai === 'da_nhac_nho'
                          ? 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-400'
                          : audit?.loaiTrangThai === 'loi_app'
                          ? 'bg-rose-50/40 border-rose-300 hover:border-rose-400'
                          : 'bg-white hover:bg-amber-50/40 border-amber-200 hover:border-amber-300'
                      }`}
                    >
                      {/* Top Row: Info & Reasons */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              audit?.loaiTrangThai === 'da_nhac_nho'
                                ? 'bg-emerald-500'
                                : audit?.loaiTrangThai === 'loi_app'
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`} />
                            <h4 
                              onClick={() => onSelectFacility(item.coSo)}
                              className="text-xs font-bold text-slate-900 hover:text-amber-800 transition-colors flex items-center gap-1 cursor-pointer hover:underline"
                              title={`Bấm để chọn lọc ${item.coSo}`}
                            >
                              <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              {item.coSo}
                            </h4>

                            {/* Badges */}
                            {item.isLowScore && (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-300 rounded">
                                Điểm TB &lt; 70đ ({item.avgScore.toFixed(1)}đ)
                              </span>
                            )}
                            {!item.isLowScore && item.hasLowAreaScore && (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-300 rounded">
                                Khu vực &lt; 70đ
                              </span>
                            )}
                            {item.hasUnfinishedAirCon && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded flex items-center gap-1">
                                ❄️ Chưa tắt máy lạnh
                              </span>
                            )}
                            {item.isMissingTarget && (
                              <span className="text-[10px] font-medium px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded">
                                Thiếu chỉ tiêu ({item.performedCount}/{item.dailyTarget} lượt)
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-600 space-y-0.5 pl-4">
                            {item.reasons.map((r, idx) => (
                              <p key={idx} className="flex items-center gap-1">
                                <span className="text-amber-600 font-bold">•</span>
                                <span>{r}</span>
                              </p>
                            ))}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-start pt-0.5">
                          <button
                            type="button"
                            onClick={() => onSelectFacility(item.coSo)}
                            className="text-[11px] text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                            title={`Xem chi tiết cơ sở ${item.coSo}`}
                          >
                            <span>Chọn cơ sở</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Manager Action Row: Checkboxes neatly framed */}
                      <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 mt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Ô vuông 1: Đã xác minh và nhắc nhở */}
                          <label 
                            onClick={(e) => e.stopPropagation()}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer select-none transition-all border ${
                              audit?.loaiTrangThai === 'da_nhac_nho'
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-1 ring-emerald-500'
                                : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-300 hover:border-emerald-400'
                            }`}
                            title="Tích vào: Đã xác minh và nhắc nhở cơ sở"
                          >
                            <input
                              type="checkbox"
                              checked={audit?.loaiTrangThai === 'da_nhac_nho'}
                              onChange={() => handleToggleWarningAudit(item.coSo, 'da_nhac_nho', item.reasons)}
                              className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span>Đã xác minh và nhắc nhở</span>
                          </label>

                          {/* Ô vuông 2: Đã xác minh do lỗi app */}
                          <label 
                            onClick={(e) => e.stopPropagation()}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer select-none transition-all border ${
                              audit?.loaiTrangThai === 'loi_app'
                                ? 'bg-rose-600 text-white border-rose-700 shadow-xs ring-1 ring-rose-500'
                                : 'bg-white hover:bg-rose-50 text-slate-700 border-slate-300 hover:border-rose-400'
                            }`}
                            title="Tích vào: Đã xác minh do lỗi app"
                          >
                            <input
                              type="checkbox"
                              checked={audit?.loaiTrangThai === 'loi_app'}
                              onChange={() => handleToggleWarningAudit(item.coSo, 'loi_app', item.reasons)}
                              className="w-3.5 h-3.5 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                            />
                            <span>Đã xác minh do lỗi app</span>
                          </label>
                        </div>

                        {/* Status Timestamp & Email */}
                        {audit ? (
                          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600 font-medium bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Ghi nhận: <strong>{audit.thoiGianTich}</strong></span>
                            </div>
                            {audit.emailThucHien && (
                              <span className="text-slate-600 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200/80 text-[10px] flex items-center gap-1 font-normal">
                                <span className="text-slate-400">👤</span>
                                <span className="font-semibold text-slate-700">{audit.emailThucHien}</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic hidden sm:inline">Chưa tích kiểm tra</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PIE CHART (5 cols) */}

        <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between mb-1 pb-2 border-b border-slate-200/70">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              <span>Phân Bổ Cơ Sở Theo Mức Điểm</span>
            </div>
            <span className="text-[10px] text-slate-500">Đã thực hiện: {activeFacilitiesCount}/{summaries.length} cơ sở</span>
          </div>

          <div className="h-[300px] sm:h-[340px] w-full my-auto py-2">
            {activeFacilitiesCount === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Chưa có cơ sở nào thực hiện kiểm tra
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scoreTiers}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderPieLabel}
                    outerRadius="84%"
                    innerRadius="44%"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {scoreTiers.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderColor: '#cbd5e1', 
                      borderRadius: '0.75rem',
                      color: '#0f172a',
                      fontSize: '11px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name: any) => [`${value} cơ sở`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Balanced 2x2 Custom Legend Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-200/70">
            {scoreTiers.map((tier) => {
              const pct = activeFacilitiesCount > 0 ? ((tier.value / activeFacilitiesCount) * 100).toFixed(1) : '0';
              return (
                <div key={tier.name} className="flex items-center justify-between bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-slate-700 shadow-2xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: tier.color }} />
                    <span className="truncate font-medium text-[11px]">{tier.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 text-[11px] font-mono ml-1 shrink-0">
                    {tier.value} <span className="text-emerald-700 font-semibold text-[10px]">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* FULL WIDTH ACCORDION: THÔNG BÁO QUY TẮC XẾP HẠNG */}
      <div className="my-5 bg-slate-50 border border-slate-200/80 rounded-xl overflow-hidden transition-all">
        <button
          onClick={() => setShowRankingRules(!showRankingRules)}
          className="w-full p-3.5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Award className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Quy Tắc Xếp Hạng & Điểm Đánh Giá Cơ Sở
            </span>
            <span className="p-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center hover:bg-emerald-200 transition-colors" title="Xem quy tắc xếp hạng">
              <Eye className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold">
            <span>{showRankingRules ? 'Thu gọn' : 'Xem quy tắc'}</span>
            {showRankingRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showRankingRules && (
          <div className="p-4 bg-white border-t border-slate-200/80 text-xs text-slate-600 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200">
                <div className="font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  🥇 Xuất Sắc (≥ 90 điểm)
                </div>
                <p className="text-[11px] text-slate-600">
                  Cơ sở có chất lượng vệ sinh/hình ảnh chỉn chu, điểm trung bình ≥ 90đ và tiến độ đạt tối thiểu 80% chỉ tiêu tháng.
                </p>
              </div>

              <div className="bg-teal-50/50 p-3 rounded-lg border border-teal-200">
                <div className="font-bold text-teal-800 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-600" />
                  🥈 Khá (80 - 89 điểm)
                </div>
                <p className="text-[11px] text-slate-600">
                  Thực hiện đúng quy trình, chất lượng đạt yêu cầu tiêu chuẩn, điểm trung bình từ 80 đến 89 điểm.
                </p>
              </div>

              <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200">
                <div className="font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  🥉 Trung Bình (70 - 79 điểm)
                </div>
                <p className="text-[11px] text-slate-600">
                  Có xuất hiện một số lưu ý nhỏ về vệ sinh hoặc thiết bị, cần tiếp tục duy trì và khắc phục bổ sung.
                </p>
              </div>

              <div className="bg-rose-50/60 p-3 rounded-lg border border-rose-200">
                <div className="font-bold text-rose-800 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  ⚠️ Cần Cải Thiện (&lt; 70 điểm)
                </div>
                <p className="text-[11px] text-slate-600">
                  Cơ sở có điểm đánh giá dưới 70đ, hoặc tiến độ thực hiện kiểm tra quá chậm (&lt; 25% chỉ tiêu) hoặc chưa kiểm tra.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Công thức tính chỉ tiêu tháng:</strong> Mục tiêu tháng = (Tổng số khu vực quy định/ngày của cơ sở) × (Số ngày trong tháng lọc). 
                Chỉ số được tự động tính toán dựa trên số phòng vẽ, khu sinh hoạt, nhà vệ sinh và quầy lễ tân riêng biệt của từng cơ sở.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AGGREGATED FACILITIES TABLE & PROGRESS BARS */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#1B5EA6]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A3A5C]">
              Bảng Xếp Hạng (BXH) & Danh Sách Các Cơ Sở
            </h3>
          </div>

          {/* RANKING TOGGLE BUTTONS */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setRankingSortMode('frequency')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                rankingSortMode === 'frequency'
                  ? 'bg-[#1B5EA6] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>BXH Theo Tần Suất</span>
            </button>
            <button
              onClick={() => setRankingSortMode('score')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                rankingSortMode === 'score'
                  ? 'bg-[#F9C846] text-[#1A3A5C] shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>BXH Theo Điểm Số</span>
            </button>
          </div>
        </div>

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
                  <th className="py-3 px-4 text-center">
                    {isHygiene ? 'Số Khu Vực / Ngày' : 'Định Mức Kiểm Tra'}
                  </th>
                  <th className="py-3 px-4 text-center">Đã Thực Hiện</th>
                  <th className="py-3 px-4 min-w-[170px]">
                    {isHygiene ? 'Tiến Độ Tháng (%)' : 'Tiến Độ Quý (%)'}
                  </th>
                  <th className="py-3 px-4 text-center">
                    {isHygiene ? 'Điểm Số TB' : 'Số Sự Cố / Xử Lý'}
                  </th>
                  <th className="py-3 px-4">Lần Kiểm Tra Cuối</th>
                  <th className="py-3 px-4 text-center">Báo Cáo Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedSummaries.map((item, index) => {
                  const isSelected = selectedFacilityFilter === item.coSo;
                  const targetDetail = getFacilityTargetDetail(item.coSo);
                  const roomCfg = getFacilityRoomConfig(item.coSo);
                  const dailyTarget = targetDetail ? targetDetail.total : (roomCfg.co + roomCfg.ve + roomCfg.nvs + roomCfg.leTan);
                  const daysInMonth = getDaysInMonthFromFilter(filters.thang);
                  
                  // Hygiene (Daily / Monthly)
                  const monthlyTarget = dailyTarget * daysInMonth;
                  const progressPercentHygiene = monthlyTarget > 0 ? (item.soLanThucHien / monthlyTarget) * 100 : 0;

                  // Quality (Quarterly - total areas in facility per quarter)
                  const quarterlyTarget = dailyTarget;
                  const progressPercentQuality = quarterlyTarget > 0 ? (item.soLanThucHien / quarterlyTarget) * 100 : 0;

                  const progressPercent = isHygiene ? progressPercentHygiene : progressPercentQuality;
                  const totalTarget = isHygiene ? monthlyTarget : quarterlyTarget;

                  // Rank Badge
                  let rankBadge = <span className="text-slate-400 font-mono text-xs">{index + 1}</span>;
                  if (item.soLanThucHien > 0) {
                    if (index === 0) rankBadge = <span className="text-base" title="Hạng 1">🥇</span>;
                    else if (index === 1) rankBadge = <span className="text-base" title="Hạng 2">🥈</span>;
                    else if (index === 2) rankBadge = <span className="text-base" title="Hạng 3">🥉</span>;
                  }

                  return (
                    <tr
                      key={item.coSo}
                      onClick={() => {
                        onSelectFacility(isSelected ? 'all' : item.coSo);
                        if (onOpenDetailModal) onOpenDetailModal(item.coSo);
                      }}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#3EA8E0]/10 border-l-4 border-l-[#1B5EA6] font-medium' : ''
                      }`}
                    >
                      {/* HẠNG / STT */}
                      <td className="py-3 px-3 text-center font-bold">
                        {rankBadge}
                      </td>

                      {/* Facility Name */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building2 className={`w-4 h-4 flex-shrink-0 ${isHygiene ? 'text-[#1B5EA6]' : 'text-[#4CAF8A]'}`} />
                          <span>{item.coSo}</span>
                          {isSelected && (
                            <span className="bg-[#1B5EA6] text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                              Đang chọn
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Số khu vực / ngày hoặc Định mức kiểm tra quý */}
                      <td className="py-3 px-4 text-center relative group">
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 group-hover:border-[#3EA8E0] px-2.5 py-1 rounded-lg cursor-help transition-all">
                          <span className="font-bold text-slate-800 text-xs whitespace-nowrap">
                            {dailyTarget} {isHygiene ? 'lượt/ngày' : 'khu vực/quý'}
                          </span>
                          <Info className="w-3 h-3 text-slate-400 group-hover:text-[#1B5EA6] transition-colors" />
                        </div>

                        {/* HOVER TOOLTIP BREAKDOWN */}
                        {targetDetail && targetDetail.items.length > 0 && (
                          <div className={`absolute left-1/2 -translate-x-1/2 ${
                            index < 5 ? 'top-full mt-2' : 'bottom-full mb-2'
                          } hidden group-hover:flex flex-col bg-white border border-[#3EA8E0]/40 text-slate-800 p-3 rounded-xl shadow-xl text-[11px] whitespace-nowrap z-50 pointer-events-none min-w-[190px] text-left ring-1 ring-slate-200`}>
                            {/* Arrow Pointer */}
                            <div className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rotate-45 border-[#3EA8E0]/40 ${
                              index < 5 ? '-top-1.5 border-t border-l' : '-bottom-1.5 border-b border-r'
                            }`} />

                            <div className="font-bold text-[#1A3A5C] border-b border-slate-100 pb-1.5 mb-2 flex items-center justify-between gap-3 relative z-10">
                              <span>{item.coSo}</span>
                              <span className="text-[10px] bg-[#1B5EA6]/10 text-[#1B5EA6] px-1.5 py-0.5 rounded border border-[#1B5EA6]/20 font-mono font-bold">
                                Quy định: {targetDetail.total} hình
                              </span>
                            </div>
                            <div className="space-y-1 relative z-10">
                              {targetDetail.items.map((it, i) => (
                                <div key={i} className="flex items-center justify-between text-slate-600 text-[11px] gap-4">
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#1B5EA6] inline-block" />
                                    {it.label}:
                                  </span>
                                  <span className="font-bold text-[#1B5EA6] font-mono">{it.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Số lần đã thực hiện */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                          isHygiene 
                            ? 'bg-slate-50 text-[#1B5EA6] border-slate-200' 
                            : 'bg-slate-50 text-[#4CAF8A] border-slate-200'
                        }`}>
                          {item.soLanThucHien} lượt
                        </span>
                      </td>

                      {/* Tiến độ tháng / quý Progress Bar */}
                      <td className="py-3 px-4 min-w-[170px]">
                        <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                          <span className={progressPercent >= 100 ? 'text-[#4CAF8A] font-bold' : progressPercent >= 50 ? 'text-[#3EA8E0] font-bold' : 'text-[#F2775A] font-bold'}>
                            {progressPercent.toFixed(isHygiene ? 1 : 0)}%
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

                      {/* Score or Issue Count */}
                      <td className="py-3 px-4 text-center">
                        {item.soLanThucHien === 0 ? (
                          <span className="text-slate-400">-</span>
                        ) : isHygiene ? (
                          <span className="font-bold text-slate-900 text-sm font-display">
                            {(item.diemTrungBinh || 0).toFixed(0)} <span className="text-[10px] text-slate-500">/100</span>
                          </span>
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

                      {/* Lần kiểm tra cuối */}
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {item.lanCuoiKiemTra || 'Chưa kiểm tra'}
                      </td>

                      {/* Báo Cáo Chi Tiết Button */}
                      <td className="py-3 px-4 text-center">
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
                          title="Bấm để xem popup nhật ký chi tiết cơ sở này"
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
    </section>
  );
};
