import React, { useState, useMemo, useEffect } from 'react';
import { HygieneReport, FacilityQualityReport, ReportMode, FilterState } from './facilityTypes';
import { BarChart3, Calendar, Camera, ClipboardCheck, Building2, Filter, X, Info, ChevronRight, CheckCircle2 } from 'lucide-react';
import { normalizeDateToIso, formatDateToShortDdMm } from '../../utils/dateUtils';
import { 
  getFacilityDayTargetConfig, 
  isWeekendDay, 
  calculatePeriodTarget, 
  FACILITY_DAY_TARGETS, 
  getFacilityDailyTarget, 
  getFacilityTargetDetail, 
  FACILITY_TARGET_DETAILS, 
  matchAreaToTargetLabel, 
  normalizeFacilityName, 
  getTotalDailyTargetAllFacilities 
} from '../../utils/facilityUtils';

interface FacilityTimelineChartProps {
  mode: ReportMode;
  selectedFacility: string;
  hygieneReports: HygieneReport[];
  qualityReports: FacilityQualityReport[];
  filters: FilterState;
  onSelectFacility: (facility: string) => void;
  onOpenDetailModal?: (facilityName: string) => void;
  onFilterChange?: (filters: FilterState) => void;
}

export const FacilityTimelineChart: React.FC<FacilityTimelineChartProps> = ({
  mode,
  selectedFacility,
  hygieneReports,
  qualityReports,
  filters,
  onSelectFacility,
  onOpenDetailModal,
  onFilterChange,
}) => {
  const [metric, setMetric] = useState<'photos' | 'reports'>('photos');
  const [showTargetModal, setShowTargetModal] = useState<boolean>(false);
  const [labelOrientation, setLabelOrientation] = useState<'slant' | 'stacked' | 'vertical' | 'horizontal'>('vertical');
  const [hoveredDay, setHoveredDay] = useState<{
    rawDate: string;
    dateLabel: string;
    reportsCount: number;
    photosCount: number;
    totalScore: number;
    passCount: number;
    facilities: Set<string>;
    facilityCounts: Record<string, { reports: number; photos: number }>;
    areaPhotos: Record<string, { photos: number; reports: number }>;
    index: number;
  } | null>(null);

  // Target config for selected facility (weekday: T2-T6, weekend: T7-CN)
  const targetConfig = useMemo(() => {
    return getFacilityDayTargetConfig(selectedFacility);
  }, [selectedFacility]);

  const hasDifferentTargets = targetConfig.weekday !== targetConfig.weekend;

  // Count photos in a link string (urls separated by comma, space or newline)
  const countPhotosInReport = (linkAnh?: string): number => {
    if (!linkAnh) return 0;
    const links = linkAnh.split(/[\n,\s]+/).filter(l => l.trim().length > 5);
    return links.length > 0 ? links.length : 1;
  };

  // Aggregated Daily Data
  const dailyData = useMemo(() => {
    const isHygiene = mode === 'hygiene';
    const reports = isHygiene ? hygieneReports : qualityReports;

    // Map: dateStr (YYYY-MM-DD) -> { dateLabel, totalReports, totalPhotos, totalScore, passCount, areaPhotos }
    const dateMap = new Map<string, {
      rawDate: string;
      dateLabel: string;
      reportsCount: number;
      photosCount: number;
      totalScore: number;
      passCount: number;
      facilities: Set<string>;
      facilityCounts: Record<string, { reports: number; photos: number }>;
      areaPhotos: Record<string, { photos: number; reports: number }>;
    }>();

    // Pre-populate date range if tuNgay and denNgay are set and <= 31 days apart
    const startIso = normalizeDateToIso(filters.tuNgay);
    const endIso = normalizeDateToIso(filters.denNgay);

    if (startIso && endIso) {
      const dStart = new Date(startIso);
      const dEnd = new Date(endIso);
      const diffDays = Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 3600 * 24));

      if (diffDays >= 0 && diffDays <= 31) {
        const curr = new Date(dStart);
        while (curr <= dEnd) {
          const iso = curr.toISOString().split('T')[0];
          const label = formatDateToShortDdMm(iso);
          dateMap.set(iso, {
            rawDate: iso,
            dateLabel: label,
            reportsCount: 0,
            photosCount: 0,
            totalScore: 0,
            passCount: 0,
            facilities: new Set<string>(),
            facilityCounts: {} as Record<string, { reports: number; photos: number }>,
            areaPhotos: {},
          });
          curr.setDate(curr.getDate() + 1);
        }
      }
    }

    // Process actual reports
    reports.forEach((r) => {
      if (selectedFacility && selectedFacility !== 'all') {
        const rFac = normalizeFacilityName(r.coSo);
        const selFac = normalizeFacilityName(selectedFacility);
        if (rFac && selFac) {
          if (rFac !== selFac) return;
        } else {
          const cleanR = (r.coSo || '').toLowerCase().trim();
          const cleanS = selectedFacility.toLowerCase().trim();
          if (cleanR !== cleanS && !cleanR.includes(cleanS) && !cleanS.includes(cleanR)) return;
        }
      }

      const isoDate = normalizeDateToIso(r.ngay);
      if (!isoDate) return;
      const label = formatDateToShortDdMm(isoDate);

      const existing = dateMap.get(isoDate) || {
        rawDate: isoDate,
        dateLabel: label,
        reportsCount: 0,
        photosCount: 0,
        totalScore: 0,
        passCount: 0,
        facilities: new Set<string>(),
        facilityCounts: {} as Record<string, { reports: number; photos: number }>,
        areaPhotos: {},
      };

      existing.reportsCount += 1;
      const pCount = countPhotosInReport(r.linkAnh);
      existing.photosCount += pCount;
      existing.facilities.add(r.coSo);

      const facName = r.coSo ? r.coSo.trim() : 'Cơ sở khác';
      if (!existing.facilityCounts[facName]) {
        existing.facilityCounts[facName] = { reports: 0, photos: 0 };
      }
      existing.facilityCounts[facName].reports += 1;
      existing.facilityCounts[facName].photos += pCount;

      const areaKey = r.khuVuc ? r.khuVuc.trim() : 'Khu vực khác';
      if (!existing.areaPhotos[areaKey]) {
        existing.areaPhotos[areaKey] = { photos: 0, reports: 0 };
      }
      existing.areaPhotos[areaKey].photos += pCount;
      existing.areaPhotos[areaKey].reports += 1;

      if (isHygiene) {
        const hr = r as HygieneReport;
        existing.totalScore += hr.diemSo || 0;
        if (hr.trangThai === 'Đạt') existing.passCount += 1;
      }

      dateMap.set(isoDate, existing);
    });

    // Convert map to sorted array by date
    const sorted = Array.from(dateMap.values()).sort((a, b) => {
      return a.rawDate.localeCompare(b.rawDate);
    });

    return sorted;
  }, [mode, hygieneReports, qualityReports, filters.tuNgay, filters.denNgay, selectedFacility]);

  // Calculate daily average score points for the line chart overlay (scale 0 - 100)
  const scorePoints = useMemo(() => {
    if (dailyData.length === 0) return [];
    const N = dailyData.length;
    return dailyData
      .map((d, index) => {
        if (d.reportsCount === 0) return null;
        const avgScore = d.totalScore / d.reportsCount;
        const xPercent = ((index + 0.5) / N) * 100;
        const yPercent = Math.max(0, Math.min(100, ((100 - avgScore) / 100) * 100));
        const xPixel = ((index + 0.5) / N) * 1000;
        const yPixel = Math.max(0, Math.min(200, ((100 - avgScore) / 100) * 200));
        return {
          index,
          xPercent,
          yPercent,
          xPixel,
          yPixel,
          avgScore,
          rawDate: d.rawDate,
          dateLabel: d.dateLabel,
        };
      })
      .filter((pt): pt is NonNullable<typeof pt> => pt !== null);
  }, [dailyData]);

  const linePathD = useMemo(() => {
    if (scorePoints.length < 2) return '';
    return scorePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.xPixel} ${p.yPixel}`).join(' ');
  }, [scorePoints]);

  // Max value calculation for exact scale math
  const highestVal = useMemo(() => {
    if (dailyData.length === 0) return 0;
    return Math.max(...dailyData.map(d => metric === 'photos' ? d.photosCount : d.reportsCount));
  }, [dailyData, metric]);

  const roundedMax = useMemo(() => {
    const rawMax = Math.max(highestVal, targetConfig.weekday, targetConfig.weekend, 1);
    // Add 20% breathing room on top
    return Math.max(Math.ceil(rawMax * 1.25), 4);
  }, [highestVal, targetConfig]);

  // Stepped target path across daily columns (jumps on weekends, steps down on weekdays)
  const steppedPathD = useMemo(() => {
    if (dailyData.length === 0) return '';
    const totalDays = dailyData.length;
    const colWidthPct = 100 / totalDays;

    return dailyData.map((d, idx) => {
      const isWk = isWeekendDay(d.rawDate);
      const target = isWk ? targetConfig.weekend : targetConfig.weekday;
      const yPct = ((roundedMax - target) / roundedMax) * 100;
      const x1 = idx * colWidthPct;
      const x2 = (idx + 1) * colWidthPct;

      if (idx === 0) {
        return `M ${x1} ${yPct} L ${x2} ${yPct}`;
      } else {
        return `L ${x1} ${yPct} L ${x2} ${yPct}`;
      }
    }).join(' ');
  }, [dailyData, targetConfig, roundedMax]);

  // Clean Y-axis ticks
  const ticks = useMemo(() => {
    const step = roundedMax / 4;
    return [
      roundedMax,
      Math.round(step * 3),
      Math.round(step * 2),
      Math.round(step * 1),
      0,
    ];
  }, [roundedMax]);

  const isAllFacilities = selectedFacility === 'all';
  const totalPeriodReports = dailyData.reduce((acc, d) => acc + d.reportsCount, 0);
  const totalPeriodPhotos = dailyData.reduce((acc, d) => acc + d.photosCount, 0);

  // Stats calculation for all 19 facilities in Target Modal
  const allFacilityStats = useMemo(() => {
    const isHygiene = mode === 'hygiene';
    const reports = isHygiene ? hygieneReports : qualityReports;

    // Map facility -> performed count
    const countMap: Record<string, { reports: number; photos: number }> = {};
    reports.forEach(r => {
      const norm = normalizeFacilityName(r.coSo);
      if (!countMap[norm]) {
        countMap[norm] = { reports: 0, photos: 0 };
      }
      countMap[norm].reports += 1;
      if (r.linkAnh) {
        countMap[norm].photos += countPhotosInReport(r.linkAnh);
      }
    });

    const facilityKeys = Object.keys(FACILITY_DAY_TARGETS).filter(fac => fac !== 'Cơ sở Richmond');

    return facilityKeys.map(facName => {
      const dayCfg = getFacilityDayTargetConfig(facName);
      const norm = normalizeFacilityName(facName);
      const stats = countMap[norm] || { reports: 0, photos: 0 };
      const performed = metric === 'photos' ? stats.photos : stats.reports;
      const targetPeriod = calculatePeriodTarget(facName, filters.tuNgay, filters.denNgay, filters.thang);
      const missing = Math.max(0, targetPeriod - performed);

      return {
        facName,
        weekdayTarget: dayCfg.weekday,
        weekendTarget: dayCfg.weekend,
        targetPeriod,
        performed,
        missing,
      };
    });
  }, [mode, hygieneReports, qualityReports, metric, filters.tuNgay, filters.denNgay, filters.thang]);

  const totalDailyWeekdaySum = useMemo(() => {
    return allFacilityStats.reduce((acc, f) => acc + f.weekdayTarget, 0);
  }, [allFacilityStats]);

  const totalDailyWeekendSum = useMemo(() => {
    return allFacilityStats.reduce((acc, f) => acc + f.weekendTarget, 0);
  }, [allFacilityStats]);

  const totalTargetPeriodSum = useMemo(() => {
    return allFacilityStats.reduce((acc, f) => acc + f.targetPeriod, 0);
  }, [allFacilityStats]);

  const totalPerformedSum = useMemo(() => {
    return allFacilityStats.reduce((acc, f) => acc + f.performed, 0);
  }, [allFacilityStats]);

  const totalMissingSum = useMemo(() => {
    return allFacilityStats.reduce((acc, f) => acc + f.missing, 0);
  }, [allFacilityStats]);

  return (
    <div id="facility-timeline-chart" className="bg-white border border-slate-200/90 rounded-2xl p-5 mb-6 text-slate-800 shadow-xs relative overflow-visible">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/90">
        <div>
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-[#1A3A5C]/10 border border-[#1B5EA6]/20 text-[#1A3A5C] shrink-0 mt-0.5">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[#1A3A5C] tracking-tight flex items-center gap-2 flex-wrap font-display">
                BIỂU ĐỒ THỰC HIỆN THEO THỜI GIAN
                {!isAllFacilities && (
                  <span className="text-xs bg-[#1B5EA6]/10 text-[#1B5EA6] border border-[#1B5EA6]/30 px-2.5 py-0.5 rounded-full font-semibold">
                    {selectedFacility}
                  </span>
                )}
              </h3>
              
              {/* Interactive Date Range Picker directly in header */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-[#1B5EA6] shrink-0" />
                <span className="text-slate-500 font-medium">Từ ngày:</span>
                <input
                  type="date"
                  value={filters.tuNgay || ''}
                  onChange={(e) => onFilterChange?.({ ...filters, tuNgay: e.target.value })}
                  className="bg-slate-50 border border-slate-200 hover:border-[#3EA8E0] focus:border-[#1B5EA6] rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none transition cursor-pointer"
                />
                <span className="text-slate-500 font-medium">Đến ngày:</span>
                <input
                  type="date"
                  value={filters.denNgay || ''}
                  onChange={(e) => onFilterChange?.({ ...filters, denNgay: e.target.value })}
                  className="bg-slate-50 border border-slate-200 hover:border-[#3EA8E0] focus:border-[#1B5EA6] rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none transition cursor-pointer"
                />
                {(filters.tuNgay || filters.denNgay) && (
                  <button
                    onClick={() => onFilterChange?.({ ...filters, tuNgay: '', denNgay: '' })}
                    className="text-[11px] text-[#F2775A] hover:text-rose-700 underline font-medium ml-1 transition-colors cursor-pointer"
                    title="Xóa lọc ngày"
                  >
                    Bỏ lọc ngày
                  </button>
                )}
                {!isAllFacilities && (
                  <button
                    onClick={() => onSelectFacility('all')}
                    className="text-[#1B5EA6] hover:text-[#1A3A5C] underline font-semibold text-xs flex items-center gap-0.5 ml-2 cursor-pointer"
                  >
                    <X className="w-3 h-3" /> Xem tất cả cơ sở
                  </button>
                )}
              </div>

              {/* Dynamic Target Badges based on Weekday / Weekend */}
              <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                <span className="text-slate-500 font-medium">Quy định chụp ảnh:</span>
                {!hasDifferentTargets ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 font-bold font-mono text-xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    {targetConfig.weekday} {metric === 'photos' ? 'ảnh' : 'lượt'}/ngày (Cả tuần)
                  </span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 font-bold font-mono text-xs">
                      <span className="w-2 h-2 rounded-full bg-[#F2775A]" />
                      T2 - T6: {targetConfig.weekday} {metric === 'photos' ? 'ảnh' : 'lượt'}/ngày
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-800 font-bold font-mono text-xs">
                      <span className="w-2 h-2 rounded-full bg-purple-600" />
                      T7, CN: {targetConfig.weekend} {metric === 'photos' ? 'ảnh' : 'lượt'}/ngày
                    </span>
                  </>
                )}
                <button
                  onClick={() => setShowTargetModal(true)}
                  className="inline-flex items-center gap-1 text-[11px] text-[#1B5EA6] hover:text-[#1A3A5C] font-semibold underline cursor-pointer ml-1"
                >
                  <Info className="w-3.5 h-3.5" /> Bảng quy định 19 cơ sở
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right side controls: Metric Switch (Photos vs Reports) */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold shadow-2xs">
            <button
              onClick={() => setMetric('photos')}
              className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                metric === 'photos' ? 'bg-white text-[#1B5EA6] shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Số lượng ảnh
            </button>
            <button
              onClick={() => setMetric('reports')}
              className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                metric === 'reports' ? 'bg-white text-[#1B5EA6] shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" /> Số lượt kiểm tra
            </button>
          </div>
        </div>
      </div>

      {/* CHART CONTENT */}
      {dailyData.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          <Filter className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
          <p className="font-medium">Không có dữ liệu báo cáo trong khoảng thời gian đã lọc</p>
          <p className="text-[11px] text-slate-500 mt-1">Vui lòng điều chỉnh lại Từ ngày / Đến ngày hoặc chọn cơ sở khác.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto custom-scrollbar pb-3">
          <div style={{ minWidth: dailyData.length > 15 ? `${Math.max(760, dailyData.length * 30)}px` : '100%' }}>
            {/* Main Chart Canvas Area */}
            <div className="relative w-full flex gap-2 pt-2">
            {/* LEFT Y-AXIS TICK LABELS COLUMN (Lượt / Ảnh) */}
            <div className="w-7 relative h-[200px] flex-shrink-0 text-[10px] font-mono text-slate-400 font-semibold pointer-events-none">
              {ticks.map((tickVal, i) => {
                const topPercent = ((roundedMax - tickVal) / roundedMax) * 100;
                return (
                  <div
                    key={`${tickVal}-${i}`}
                    className="absolute right-1 -translate-y-1/2 text-right z-10"
                    style={{ top: `${topPercent}%` }}
                  >
                    {tickVal}
                  </div>
                );
              })}
            </div>

            {/* PLOT CANVAS AREA */}
            <div className="relative flex-1 h-[200px]">
              {/* GRID LINES */}
              <div className="absolute inset-0 pointer-events-none">
                {ticks.map((tickVal, i) => {
                  const topPercent = ((roundedMax - tickVal) / roundedMax) * 100;
                  return (
                    <div
                      key={`grid-${tickVal}-${i}`}
                      className="absolute left-0 right-0 border-b border-slate-100"
                      style={{ top: `${topPercent}%` }}
                    />
                  );
                })}

                {/* TARGET LINES (CORAL for Weekday, PURPLE for Weekend) */}
                {/* 1. If weekday === weekend: Single clean reference line */}
                {!hasDifferentTargets && targetConfig.weekday > 0 && targetConfig.weekday <= roundedMax && (
                  <div
                    className="absolute left-0 right-0 border-b-2 border-dashed border-[#F2775A]/80 z-20 flex items-center justify-start pointer-events-auto transition-all duration-300"
                    style={{ top: `${((roundedMax - targetConfig.weekday) / roundedMax) * 100}%` }}
                  >
                    <button
                      onClick={() => setShowTargetModal(true)}
                      title="Bấm để xem chi tiết bảng quy định"
                      className="bg-[#F2775A] hover:bg-[#F2775A]/90 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-md shadow-xs -mt-3.5 ml-2 flex items-center gap-1.5 border border-white/40 cursor-pointer transition active:scale-95"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      Quy định: {targetConfig.weekday} {metric === 'photos' ? 'ảnh' : 'lượt'}/ngày (Cả tuần)
                      <Info className="w-3 h-3 text-white/90" />
                    </button>
                  </div>
                )}

                {/* 2. If weekday !== weekend: Stepped line connecting daily targets + Two clear reference badges */}
                {hasDifferentTargets && (
                  <>
                    {/* SVG Stepped target path */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <path
                        d={steppedPathD}
                        fill="none"
                        stroke="#F2775A"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        vectorEffect="non-scaling-stroke"
                        className="opacity-90 drop-shadow-2xs"
                      />
                    </svg>

                    {/* Weekday Reference Line (T2 - T6) */}
                    {targetConfig.weekday <= roundedMax && (
                      <div
                        className="absolute left-0 right-0 border-b border-dashed border-[#F2775A]/60 z-10 flex items-center justify-start pointer-events-auto"
                        style={{ top: `${((roundedMax - targetConfig.weekday) / roundedMax) * 100}%` }}
                      >
                        <button
                          onClick={() => setShowTargetModal(true)}
                          title="Quy định ngày thường (Thứ 2 - Thứ 6)"
                          className="bg-[#F2775A] hover:bg-[#F2775A]/90 text-white font-bold text-[9.5px] px-2 py-0.5 rounded shadow-xs -mt-3 ml-2 flex items-center gap-1 border border-white/40 cursor-pointer transition active:scale-95"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          T2-T6: {targetConfig.weekday} {metric === 'photos' ? 'ảnh' : 'lượt'}
                          <Info className="w-2.5 h-2.5 text-white/90" />
                        </button>
                      </div>
                    )}

                    {/* Weekend Reference Line (T7 & CN) */}
                    {targetConfig.weekend <= roundedMax && (
                      <div
                        className="absolute left-0 right-0 border-b border-dashed border-purple-500/70 z-10 flex items-center justify-end pointer-events-auto"
                        style={{ top: `${((roundedMax - targetConfig.weekend) / roundedMax) * 100}%` }}
                      >
                        <button
                          onClick={() => setShowTargetModal(true)}
                          title="Quy định cuối tuần (Thứ 7 & Chủ nhật)"
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[9.5px] px-2 py-0.5 rounded shadow-xs -mt-3 mr-2 flex items-center gap-1 border border-white/40 cursor-pointer transition active:scale-95"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          T7-CN: {targetConfig.weekend} {metric === 'photos' ? 'ảnh' : 'lượt'}
                          <Info className="w-2.5 h-2.5 text-white/90" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* BARS CONTAINER */}
              <div 
                className="absolute inset-0 flex items-end z-30"
                onMouseLeave={() => setHoveredDay(null)}
              >
                {dailyData.map((d, index) => {
                  const val = metric === 'photos' ? d.photosCount : d.reportsCount;
                  const heightPercent = val > 0 ? (val / roundedMax) * 100 : 0;
                  const isWk = isWeekendDay(d.rawDate);
                  const targetForDay = isWk ? targetConfig.weekend : targetConfig.weekday;
                  const meetsTarget = val >= targetForDay;
                  const isHovered = hoveredDay?.rawDate === d.rawDate;

                  return (
                    <div
                      key={d.rawDate}
                      style={{ width: `${100 / dailyData.length}%` }}
                      className="h-full flex flex-col items-center group relative justify-end hover:z-40 cursor-pointer"
                      onMouseEnter={() => setHoveredDay({ ...d, index })}
                    >
                      {/* Day target tick indicator on the column */}
                      <div
                        className={`absolute left-0 right-0 border-t-2 border-dashed pointer-events-none z-15 ${
                          isWk ? 'border-purple-500/80' : 'border-[#F2775A]/80'
                        }`}
                        style={{ bottom: `${(targetForDay / roundedMax) * 100}%` }}
                      />

                      {/* Number on Top of Bar */}
                      <div
                        style={{ bottom: `${heightPercent}%` }}
                        className={`absolute left-1/2 -translate-x-1/2 mb-1 text-[11px] font-bold tracking-wider transition-all duration-150 z-20 whitespace-nowrap pointer-events-none ${
                          isHovered
                            ? 'scale-125 text-[#1A3A5C] drop-shadow-xs font-black'
                            : val === 0
                            ? 'text-slate-300 opacity-60'
                            : meetsTarget
                            ? 'text-[#1B5EA6]'
                            : 'text-[#F2775A]'
                        }`}
                      >
                        {val}
                      </div>

                      {/* Bar Pillar Container */}
                      <div className="w-full max-w-[36px] bg-slate-100/60 rounded-t-md p-0.5 flex items-end h-full relative mx-auto">
                        {val > 0 ? (
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t-sm transition-all duration-200 ${
                              isHovered
                                ? 'bg-gradient-to-t from-[#1B5EA6] to-[#3EA8E0] ring-2 ring-[#3EA8E0] shadow-md'
                                : meetsTarget
                                ? 'bg-gradient-to-t from-[#1B5EA6] to-[#3EA8E0] group-hover:brightness-110'
                                : 'bg-gradient-to-t from-[#F2775A] to-[#F9C846] group-hover:brightness-110'
                            }`}
                          />
                        ) : (
                          <div className={`w-full h-[2px] rounded-full transition-all ${isHovered ? 'bg-[#3EA8E0]' : 'bg-slate-200'}`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* FLOATING HOVER POPUP */}
              {hoveredDay && (() => {
                const isRightHalf = hoveredDay.index / dailyData.length > 0.5;
                const colWidthPct = 100 / dailyData.length;
                const colLeftPct = hoveredDay.index * colWidthPct;
                const colRightPct = (hoveredDay.index + 1) * colWidthPct;

                const posStyle: React.CSSProperties = isRightHalf
                  ? { right: `calc(${100 - colLeftPct}% + 4px)`, top: '8px' }
                  : { left: `calc(${colRightPct}% + 4px)`, top: '8px' };

                return (
                  <div
                    style={posStyle}
                    className="absolute z-50 pointer-events-none bg-white border border-[#3EA8E0]/30 text-slate-800 p-3.5 rounded-xl shadow-xl text-[11px] whitespace-nowrap ring-1 ring-slate-100 w-[240px] sm:w-[270px] animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="font-bold text-[#1A3A5C] border-b border-slate-100 pb-1.5 mb-1.5 flex items-center justify-between gap-2">
                      <span>📅 Ngày: {hoveredDay.rawDate}</span>
                      <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold ${
                        isWeekendDay(hoveredDay.rawDate) ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isWeekendDay(hoveredDay.rawDate) ? 'T7, CN (Cuối tuần)' : 'T2 - T6 (Ngày thường)'}
                      </span>
                    </div>
                    <div className="space-y-1 text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>📸 Số lượng ảnh:</span>
                        <strong className="text-[#1A3A5C] font-mono">{hoveredDay.photosCount} tấm</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>📋 Số lượt báo cáo:</span>
                        <strong className="text-[#1A3A5C] font-mono">{hoveredDay.reportsCount} lượt</strong>
                      </div>
                      <div className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-200/80 text-[10.5px]">
                        <span className="text-slate-700 font-medium">Quy định ngày này:</span>
                        <strong className="font-mono text-slate-900 font-bold">
                          {isWeekendDay(hoveredDay.rawDate) ? targetConfig.weekend : targetConfig.weekday} {metric === 'photos' ? 'ảnh' : 'lượt'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-slate-500 font-medium">Đánh giá:</span>
                        {(metric === 'photos' ? hoveredDay.photosCount : hoveredDay.reportsCount) >= (isWeekendDay(hoveredDay.rawDate) ? targetConfig.weekend : targetConfig.weekday) ? (
                          <span className="text-emerald-800 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✓ Đạt quy định
                          </span>
                        ) : (
                          <span className="text-rose-700 font-bold text-[10px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            ⚠️ Thiếu {(isWeekendDay(hoveredDay.rawDate) ? targetConfig.weekend : targetConfig.weekday) - (metric === 'photos' ? hoveredDay.photosCount : hoveredDay.reportsCount)} {metric === 'photos' ? 'ảnh' : 'lượt'}
                          </span>
                        )}
                      </div>
                      {mode === 'hygiene' && hoveredDay.reportsCount > 0 && (
                        <div className="flex items-center justify-between pt-0.5">
                          <span>⭐ Điểm TB:</span>
                          <strong className="text-[#1B5EA6] font-mono">{(hoveredDay.totalScore / hoveredDay.reportsCount).toFixed(0)} điểm</strong>
                        </div>
                      )}
                      {isAllFacilities && hoveredDay.facilities.size > 0 && (
                        <div className="text-[10px] text-slate-500 mt-1 border-t border-slate-100 pt-1">
                          🏬 {hoveredDay.facilities.size} cơ sở thực hiện
                        </div>
                      )}
                    </div>

                    {/* DETAILED FACILITY & REPORT BREAKDOWN */}
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-[#1A3A5C] uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>{selectedFacility !== 'all' ? 'Chi tiết khu vực:' : 'Chi tiết cơ sở thực hiện:'}</span>
                      </div>

                      {selectedFacility !== 'all' && getFacilityTargetDetail(selectedFacility) ? (
                        <div className="space-y-1">
                          {getFacilityTargetDetail(selectedFacility)?.items.map((reqItem, idx) => {
                            let photos = 0;
                            let reports = 0;
                            const areaEntries = Object.entries(hoveredDay.areaPhotos || {}) as [string, { photos: number; reports: number }][];
                            areaEntries.forEach(([areaKey, info]) => {
                              if (matchAreaToTargetLabel(areaKey, reqItem.label)) {
                                photos += info.photos;
                                reports += info.reports;
                              }
                            });

                            const reqCount = reqItem.count || 1;
                            const isMissing = photos < reqCount;
                            const missingCount = reqCount - photos;

                            return (
                              <div key={idx} className="flex items-center justify-between gap-2 text-[10px]">
                                <span className={isMissing ? 'text-rose-700 font-semibold truncate' : 'text-slate-700 truncate'}>
                                  {isMissing ? '⚠️' : '✓'} {reqItem.label}:
                                </span>
                                <span className={`font-bold font-mono px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap ${
                                  isMissing 
                                    ? 'text-rose-700 bg-rose-50 border border-rose-200' 
                                    : 'text-[#4CAF8A] bg-[#4CAF8A]/10 border border-[#4CAF8A]/30'
                                }`}>
                                  {photos}/{reqCount} ảnh {isMissing ? `(Thiếu ${missingCount})` : ''}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-[160px] overflow-y-auto pr-0.5 custom-scrollbar">
                          {Object.keys(hoveredDay.facilityCounts || {}).length > 0 ? (
                            (Object.entries(hoveredDay.facilityCounts) as [string, { reports: number; photos: number }][])
                              .sort((a, b) => b[1].reports - a[1].reports)
                              .map(([facName, info]) => (
                                <div key={facName} className="flex items-center justify-between gap-2 text-[10px]">
                                  <span className="text-slate-700 truncate max-w-[140px] font-medium">{facName}:</span>
                                  <span className="font-bold font-mono text-[#1B5EA6] bg-[#1B5EA6]/10 px-1.5 py-0.5 rounded border border-[#1B5EA6]/20 whitespace-nowrap">
                                    {info.reports} lượt
                                  </span>
                                </div>
                              ))
                          ) : (
                            <div className="text-[10px] text-rose-600 italic">Chưa ghi nhận báo cáo nào</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* OVERLAY SVG LINE CHART FOR AVERAGE SCORE */}
              {mode === 'hygiene' && scorePoints.length >= 1 && (
                <div className="absolute inset-0 pointer-events-none z-15 overflow-visible">
                  <svg
                    className="w-full h-full overflow-visible"
                    viewBox="0 0 1000 200"
                    preserveAspectRatio="none"
                  >
                    {scorePoints.length >= 2 && (
                      <path
                        d={linePathD}
                        fill="none"
                        stroke="#F9C846"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-xs"
                      />
                    )}
                  </svg>

                  {/* SCORE POINT MARKERS & BADGES */}
                  {scorePoints.map((p) => (
                    <div
                      key={`score-marker-${p.rawDate}`}
                      style={{ left: `${p.xPercent}%`, top: `${p.yPercent}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-[#F9C846] border-2 border-white shadow-xs ring-1 ring-[#1A3A5C]/20" />
                      <span className="text-[9px] font-bold font-mono text-[#1A3A5C] bg-white/95 px-1 py-0.2 rounded border border-[#F9C846] shadow-xs -mt-5 whitespace-nowrap">
                        {p.avgScore.toFixed(0)}đ
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT Y-AXIS TICK LABELS COLUMN (Điểm Số 0 - 100đ) */}
            {mode === 'hygiene' && (
              <div className="w-8 relative h-[200px] flex-shrink-0 text-[10px] font-mono text-[#1A3A5C] font-bold pointer-events-none border-l border-slate-200 pl-1">
                {[100, 75, 50, 25, 0].map((scoreVal) => {
                  const topPercent = ((100 - scoreVal) / 100) * 100;
                  return (
                    <div
                      key={`score-tick-${scoreVal}`}
                      className="absolute left-1 -translate-y-1/2 text-left z-10 text-[9px] font-bold text-[#1A3A5C]"
                      style={{ top: `${topPercent}%` }}
                    >
                      {scoreVal}đ
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* X-AXIS LABELS ROW */}
          <div className={`flex mt-2 ${mode === 'hygiene' ? 'pl-7 pr-8' : 'pl-7 pr-2'}`}>
            {dailyData.map((d) => {
              const val = metric === 'photos' ? d.photosCount : d.reportsCount;
              const isWk = isWeekendDay(d.rawDate);
              const dateObj = new Date(d.rawDate);
              const dayOfWeekNum = !isNaN(dateObj.getTime()) ? dateObj.getDay() : -1;
              const dayOfWeekStr = dayOfWeekNum === 0 ? 'CN' : dayOfWeekNum > 0 ? `T${dayOfWeekNum + 1}` : '';
              const [dayPart, monthPart] = d.dateLabel.includes('/') ? d.dateLabel.split('/') : [d.dateLabel, ''];

              if (labelOrientation === 'stacked') {
                return (
                  <div
                    key={`xlabel-${d.rawDate}`}
                    style={{ width: `${100 / dailyData.length}%` }}
                    className="flex flex-col items-center justify-start pt-1.5 h-12 text-center relative"
                  >
                    <span className={`text-[11px] font-bold font-mono leading-tight ${val > 0 ? 'text-[#1A3A5C]' : 'text-slate-400'}`}>
                      {dayPart}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 font-semibold leading-tight mt-0.5">
                      {monthPart ? `/${monthPart}` : ''}
                    </span>
                    {isWk && (
                      <span className="text-[7.5px] font-black text-purple-700 bg-purple-100 px-1 rounded mt-0.5">
                        {dayOfWeekStr}
                      </span>
                    )}
                  </div>
                );
              }

              if (labelOrientation === 'vertical') {
                return (
                  <div
                    key={`xlabel-${d.rawDate}`}
                    style={{ width: `${100 / dailyData.length}%` }}
                    className="flex flex-col justify-start items-center h-16 relative pt-1"
                  >
                    <span
                      className={`inline-block transform -rotate-90 origin-center text-[10px] font-bold font-mono tracking-tight transition-colors whitespace-nowrap mt-4 ${
                        val > 0 ? 'text-[#1A3A5C]' : 'text-slate-400'
                      }`}
                    >
                      {d.dateLabel}
                    </span>
                    {isWk && (
                      <span className="absolute bottom-0 text-[7.5px] font-black text-purple-700 bg-purple-100 px-1 rounded">
                        {dayOfWeekStr}
                      </span>
                    )}
                  </div>
                );
              }

              if (labelOrientation === 'horizontal') {
                return (
                  <div
                    key={`xlabel-${d.rawDate}`}
                    style={{ width: `${100 / dailyData.length}%` }}
                    className={`text-center text-[10px] font-bold font-mono tracking-tight transition-colors whitespace-nowrap pt-1 h-8 ${
                      val > 0 ? 'text-[#1A3A5C]' : 'text-slate-400'
                    }`}
                  >
                    {d.dateLabel}
                    {isWk && <span className="ml-0.5 text-[8px] text-purple-600">({dayOfWeekStr})</span>}
                  </div>
                );
              }

              // Default: 'slant' (Nghiêng 45 độ)
              return (
                <div
                  key={`xlabel-${d.rawDate}`}
                  style={{ width: `${100 / dailyData.length}%` }}
                  className="flex flex-col justify-start items-center pt-1.5 h-14 relative"
                >
                  <span
                    className={`inline-block transform -rotate-45 origin-top-left translate-x-1.5 text-[10px] font-bold font-mono tracking-tight transition-colors whitespace-nowrap ${
                      val > 0 ? 'text-[#1A3A5C]' : 'text-slate-400'
                    }`}
                  >
                    {d.dateLabel}
                  </span>
                  {isWk && (
                    <span className="absolute bottom-0 text-[7.5px] font-black text-purple-700 bg-purple-100 px-1 rounded">
                      {dayOfWeekStr}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          </div>
        </div>
      )}

      {/* FOOTER: LEGEND & CONTROLS */}
      <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        {/* Legends */}
        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-gradient-to-t from-[#1B5EA6] to-[#3EA8E0] inline-block" />
            <span className="text-slate-700 font-medium">Đạt quy định</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-gradient-to-t from-[#F2775A] to-[#F9C846] inline-block" />
            <span className="text-slate-700 font-medium">Chưa đạt quy định</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 border-b-2 border-dashed border-[#F2775A] inline-block" />
            <span className="text-slate-700 font-medium">Quy định T2-T6 ({targetConfig.weekday})</span>
          </div>
          {hasDifferentTargets && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 border-b-2 border-dashed border-purple-600 inline-block" />
              <span className="text-purple-800 font-semibold">Quy định T7-CN ({targetConfig.weekend})</span>
            </div>
          )}
          {mode === 'hygiene' && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F9C846] border border-[#1A3A5C] inline-block" />
              <span className="text-slate-700 font-medium">Điểm TB</span>
            </div>
          )}
        </div>

        {/* Orientation Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium">
          <span className="text-slate-400 px-1.5 text-[10px]">Trục ngày:</span>
          {(['vertical', 'slant', 'stacked', 'horizontal'] as const).map((orient) => (
            <button
              key={orient}
              onClick={() => setLabelOrientation(orient)}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                labelOrientation === orient
                  ? 'bg-white text-slate-800 font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {orient === 'vertical' ? 'Đứng' : orient === 'slant' ? 'Nghiêng' : orient === 'stacked' ? '2 tầng' : 'Ngang'}
            </button>
          ))}
        </div>
      </div>

      {/* POPUP MODAL: CHI TIẾT QUY ĐỊNH KHU VỰC / HÌNH ÁNH */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative text-slate-800 animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowTargetModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 font-display">
                  BẢNG QUY ĐỊNH HÌNH ÁNH / KHU VỰC CHỤP KIỂM TRA
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {selectedFacility !== 'all' ? selectedFacility : 'Toàn bộ 19 cơ sở (Phân biệt Trong tuần & Cuối tuần)'}
                </p>
              </div>
            </div>

            {selectedFacility !== 'all' ? (
              <div className="overflow-y-auto pr-1 custom-scrollbar">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 shadow-2xs">
                    <div className="text-[11px] font-semibold text-rose-800">Thứ 2 - Thứ 6 (Trong tuần)</div>
                    <div className="text-lg font-black font-mono text-rose-900 mt-1">
                      {targetConfig.weekday} <span className="text-xs font-normal font-sans text-rose-700">{metric === 'photos' ? 'ảnh' : 'lượt'}/ngày</span>
                    </div>
                    <div className="text-[10px] text-rose-600 mt-0.5">Số lượng lớp ngày thường</div>
                  </div>

                  <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 shadow-2xs">
                    <div className="text-[11px] font-semibold text-purple-800">Thứ 7 & Chủ Nhật (Cuối tuần)</div>
                    <div className="text-lg font-black font-mono text-purple-900 mt-1">
                      {targetConfig.weekend} <span className="text-xs font-normal font-sans text-purple-700">{metric === 'photos' ? 'ảnh' : 'lượt'}/ngày</span>
                    </div>
                    <div className="text-[10px] text-purple-600 mt-0.5">Số lượng lớp cuối tuần</div>
                  </div>

                  <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 shadow-2xs">
                    <div className="text-[11px] font-semibold text-blue-800">Tổng chỉ tiêu kỳ lọc ({dailyData.length} ngày)</div>
                    <div className="text-lg font-black font-mono text-blue-900 mt-1">
                      {calculatePeriodTarget(selectedFacility, filters.tuNgay, filters.denNgay, filters.thang, metric)}{' '}
                      <span className="text-xs font-normal font-sans text-blue-700">{metric === 'photos' ? 'ảnh' : 'lượt'}</span>
                    </div>
                    <div className="text-[10px] text-blue-600 mt-0.5">Cộng dồn theo từng ngày thực tế</div>
                  </div>
                </div>

                {targetConfig.weekday !== targetConfig.weekend && (
                  <div className="text-xs bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 mb-4 flex items-start gap-2">
                    <span className="text-base leading-none">💡</span>
                    <span>
                      <strong>Lưu ý:</strong> Do số lượng lớp trong tuần và cuối tuần khác nhau, quy định chụp kiểm tra của cơ sở này được điều chỉnh: <strong>{targetConfig.weekday} {metric === 'photos' ? 'ảnh' : 'lượt'}/ngày</strong> (T2 - T6) và <strong>{targetConfig.weekend} {metric === 'photos' ? 'ảnh' : 'lượt'}/ngày</strong> (T7, CN).
                    </span>
                  </div>
                )}

                {/* Items List */}
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Danh sách chi tiết phòng / khu vực:
                </div>

                {getFacilityTargetDetail(selectedFacility) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                    {getFacilityTargetDetail(selectedFacility)?.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                        <span className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          {item.label}
                        </span>
                        <span className="text-xs font-bold font-mono text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">Chưa có chi tiết cho cơ sở này</div>
                )}
              </div>
            ) : (
              /* All Facilities breakdown list with complete table */
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Total Target Sum Banner */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 mb-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-semibold text-rose-700 block">T2 - T6 (Trong tuần - 19 Cơ Sở):</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {totalDailyWeekdaySum} {metric === 'photos' ? 'ảnh' : 'lượt'}/ngày
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-semibold text-purple-700 block">T7, CN (Cuối tuần - 19 Cơ Sở):</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {totalDailyWeekendSum} {metric === 'photos' ? 'ảnh' : 'lượt'}/ngày
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-semibold text-blue-700 block">Tổng chỉ tiêu kỳ ({dailyData.length} ngày):</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {totalTargetPeriodSum} {metric === 'photos' ? 'ảnh' : 'lượt'}
                    </span>
                  </div>
                </div>

                <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                  <span>Bảng quy định chi tiết 19 cơ sở & kết quả thực hiện:</span>
                  <span className="text-[10px] text-slate-500 font-normal">* Click vào cơ sở để xem báo cáo chi tiết</span>
                </p>

                {/* DETAILED TABLE */}
                <div className="overflow-x-auto overflow-y-auto border border-slate-200 rounded-xl shadow-2xs custom-scrollbar flex-1 max-h-[380px]">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead className="bg-slate-100/80 text-slate-600 font-semibold uppercase text-[10px] sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5 text-center w-8">STT</th>
                        <th className="py-2 px-3">Tên Cơ Sở</th>
                        <th className="py-2 px-3 text-center bg-rose-50/70 text-rose-900">T2 - T6 (Trong tuần)</th>
                        <th className="py-2 px-3 text-center bg-purple-50/70 text-purple-900">T7, CN (Cuối tuần)</th>
                        <th className="py-2 px-3 text-center">Chỉ Tiêu Kỳ</th>
                        <th className="py-2 px-3 text-center">Đã Thực Hiện</th>
                        <th className="py-2 px-3 text-center">Còn Thiếu</th>
                        <th className="py-2 px-3 text-center">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {allFacilityStats.map((item, idx) => {
                        const isDone = item.missing === 0;
                        return (
                          <tr
                            key={item.facName}
                            onClick={() => {
                              onSelectFacility(item.facName);
                              setShowTargetModal(false);
                            }}
                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                            <td className="py-2 px-2.5 text-center font-mono text-slate-400 text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900 group-hover:text-[#1B5EA6] transition-colors">
                              {item.facName}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-rose-700 bg-rose-50/30">
                              {item.weekdayTarget} {metric === 'photos' ? 'ảnh' : 'lượt'}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-purple-800 bg-purple-50/30">
                              {item.weekendTarget} {metric === 'photos' ? 'ảnh' : 'lượt'}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-semibold text-slate-700">
                              {item.targetPeriod}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">
                              {item.performed}
                            </td>
                            <td className="py-2 px-3 text-center font-mono">
                              {item.missing > 0 ? (
                                <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                                  Thiếu {item.missing}
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-semibold text-[11px]">0</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {isDone ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  ✓ Đạt
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                  ⚠️ Thiếu
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-800 sticky bottom-0 z-10">
                      <tr>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500" colSpan={2}>
                          TỔNG CỘNG 19 CƠ SỞ
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-rose-700 text-xs">
                          {totalDailyWeekdaySum}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-purple-800 text-xs">
                          {totalDailyWeekendSum}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-800 text-xs">
                          {totalTargetPeriodSum}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-emerald-700 text-xs">
                          {totalPerformedSum}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-rose-700 text-xs">
                          {totalMissingSum > 0 ? `Thiếu ${totalMissingSum}` : '0'}
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs text-emerald-800 font-semibold">
                          {totalMissingSum === 0 ? '✓ Đạt 100%' : `Đạt ${(totalPerformedSum / (totalTargetPeriodSum || 1) * 100).toFixed(0)}%`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-4 text-right border-t border-slate-100 pt-3">
              <button
                onClick={() => setShowTargetModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
