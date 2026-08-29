import React, { useState, useMemo, useEffect } from 'react';
import { HygieneReport, FacilityQualityReport, ReportMode, FilterState } from './facilityTypes';
import { BarChart3, Calendar, Camera, ClipboardCheck, Building2, Filter, X, Info, ChevronRight, CheckCircle2 } from 'lucide-react';
import { normalizeDateToIso, formatDateToShortDdMm } from '../../utils/dateUtils';
import { getFacilityDailyTarget, getFacilityTargetDetail, FACILITY_TARGET_DETAILS, matchAreaToTargetLabel, normalizeFacilityName, getTotalDailyTargetAllFacilities } from '../../utils/facilityUtils';

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
  const [metric, setMetric] = useState<'photos' | 'reports'>('reports');
  const [targetValInput, setTargetValInput] = useState<number>(6);
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
    areaPhotos: Record<string, { photos: number; reports: number }>;
    index: number;
  } | null>(null);

  // Auto-sync target with facility's "Số Khu Vực / Ngày" when facility changes
  useEffect(() => {
    if (selectedFacility && selectedFacility !== 'all') {
      const dailyTarget = getFacilityDailyTarget(selectedFacility);
      setTargetValInput(dailyTarget > 0 ? dailyTarget : 6);
    } else {
      setTargetValInput(getTotalDailyTargetAllFacilities());
    }
  }, [selectedFacility]);

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
    const rawMax = Math.max(highestVal, targetValInput, 1);
    // Add 20% breathing room on top
    return Math.max(Math.ceil(rawMax * 1.25), 4);
  }, [highestVal, targetValInput]);

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
    const daysCount = dailyData.length > 0 ? dailyData.length : 1;

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

    return Object.keys(FACILITY_TARGET_DETAILS).map(facName => {
      const targetDetail = FACILITY_TARGET_DETAILS[facName];
      const dailyTarget = targetDetail?.total || 10;
      const norm = normalizeFacilityName(facName);
      const stats = countMap[norm] || { reports: 0, photos: 0 };
      const performed = metric === 'photos' ? stats.photos : stats.reports;
      const targetPeriod = dailyTarget * daysCount;
      const missing = Math.max(0, targetPeriod - performed);

      return {
        facName,
        dailyTarget,
        targetPeriod,
        performed,
        missing,
      };
    });
  }, [mode, hygieneReports, qualityReports, dailyData.length, metric]);

  const totalDailyTargetSum = useMemo(() => {
    return allFacilityStats.reduce((acc, f) => acc + f.dailyTarget, 0);
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
            </div>
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

                {/* DASHED TARGET LINE (CORAL #F2775A) */}
                {targetValInput > 0 && targetValInput <= roundedMax && (
                  <div
                    className="absolute left-0 right-0 border-b-2 border-dashed border-[#F2775A]/80 z-10 flex items-center justify-start pointer-events-auto transition-all duration-300"
                    style={{ top: `${((roundedMax - targetValInput) / roundedMax) * 100}%` }}
                  >
                    <button
                      onClick={() => setShowTargetModal(true)}
                      title="Bấm để xem chi tiết phân bổ khu vực quy định"
                      className="bg-[#F2775A] hover:bg-[#F2775A]/90 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-xs -mt-3.5 ml-2 flex items-center gap-1.5 border border-white/40 cursor-pointer transition active:scale-95"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      Quy định: {targetValInput} {metric === 'photos' ? 'ảnh' : 'lượt'}
                      <Info className="w-3 h-3 text-white/90" />
                    </button>
                  </div>
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
                  const meetsTarget = val >= targetValInput;
                  const isHovered = hoveredDay?.rawDate === d.rawDate;

                  return (
                    <div
                      key={d.rawDate}
                      style={{ width: `${100 / dailyData.length}%` }}
                      className="h-full flex flex-col items-center group relative justify-end hover:z-40 cursor-pointer"
                      onMouseEnter={() => setHoveredDay({ ...d, index })}
                    >
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
                    <div className="font-bold text-[#1A3A5C] border-b border-slate-100 pb-1.5 mb-1.5 flex items-center justify-between gap-3">
                      <span>📅 Ngày: {hoveredDay.rawDate}</span>
                      <span className="text-[10px] font-mono text-slate-500 font-medium">
                        ({hoveredDay.reportsCount} lượt • {hoveredDay.photosCount} tấm)
                      </span>
                    </div>
                    <div className="space-y-0.5 text-slate-600">
                      <div>📋 Số lượt: <strong className="text-[#1A3A5C]">{hoveredDay.reportsCount} lượt</strong></div>
                      <div>📸 Số ảnh: <strong className="text-[#1A3A5C]">{hoveredDay.photosCount} tấm</strong></div>
                      {mode === 'hygiene' && hoveredDay.reportsCount > 0 && (
                        <div>⭐ Điểm TB: <strong className="text-[#1B5EA6] font-mono">{(hoveredDay.totalScore / hoveredDay.reportsCount).toFixed(0)} điểm</strong></div>
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
              const [dayPart, monthPart] = d.dateLabel.includes('/') ? d.dateLabel.split('/') : [d.dateLabel, ''];

              if (labelOrientation === 'stacked') {
                return (
                  <div
                    key={`xlabel-${d.rawDate}`}
                    style={{ width: `${100 / dailyData.length}%` }}
                    className="flex flex-col items-center justify-start pt-1.5 h-12 text-center"
                  >
                    <span className={`text-[11px] font-bold font-mono leading-tight ${val > 0 ? 'text-[#1A3A5C]' : 'text-slate-400'}`}>
                      {dayPart}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 font-semibold leading-tight mt-0.5">
                      {monthPart ? `/${monthPart}` : ''}
                    </span>
                  </div>
                );
              }

              if (labelOrientation === 'vertical') {
                return (
                  <div
                    key={`xlabel-${d.rawDate}`}
                    style={{ width: `${100 / dailyData.length}%` }}
                    className="flex justify-center items-center h-16 relative"
                  >
                    <span
                      className={`inline-block transform -rotate-90 origin-center text-[10px] font-bold font-mono tracking-tight transition-colors whitespace-nowrap ${
                        val > 0 ? 'text-[#1A3A5C]' : 'text-slate-400'
                      }`}
                    >
                      {d.dateLabel}
                    </span>
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
                  </div>
                );
              }

              // Default: 'slant' (Nghiêng 45 độ)
              return (
                <div
                  key={`xlabel-${d.rawDate}`}
                  style={{ width: `${100 / dailyData.length}%` }}
                  className="flex justify-center items-start pt-1.5 h-14 relative"
                >
                  <span
                    className={`inline-block transform -rotate-45 origin-top-left translate-x-1.5 text-[10px] font-bold font-mono tracking-tight transition-colors whitespace-nowrap ${
                      val > 0 ? 'text-[#1A3A5C]' : 'text-slate-400'
                    }`}
                  >
                    {d.dateLabel}
                  </span>
                </div>
              );
            })}
          </div>

          </div>
        </div>
      )}

      {/* POPUP MODAL: CHI TIẾT QUY ĐỊNH KHU VỰC / HÌNH ÁNH */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-800 animate-in fade-in zoom-in duration-150">
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
                  CHỈ TIÊU QUY ĐỊNH HÌNH ÁNH / KHU VỰC
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {selectedFacility !== 'all' ? selectedFacility : 'Tất cả 19 cơ sở'}
                </p>
              </div>
            </div>

            {selectedFacility !== 'all' ? (
              <div>
                {/* Summary Banner */}
                <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-200 mb-4 flex items-center justify-between">
                  <span className="text-xs text-slate-700 font-semibold">Quy định bắt buộc / ngày:</span>
                  <span className="text-sm font-bold font-mono text-rose-800 bg-white px-3 py-1 rounded-lg border border-rose-300 shadow-2xs">
                    {targetValInput} hình ({targetValInput} khu vực)
                  </span>
                </div>

                {/* Items List */}
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Danh sách chi tiết phòng / khu vực:
                </div>

                {getFacilityTargetDetail(selectedFacility) ? (
                  <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
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
              <div>
                {/* Total Target Sum Banner */}
                <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-200 mb-3 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
                  <div>
                    <span className="text-xs text-slate-900 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                      Line Quy Định Biểu Đồ (Cộng Dồn 19 Cơ Sở):
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Bao gồm chỉ tiêu của toàn bộ 19 cơ sở (kể cả cơ sở chưa làm báo cáo)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold font-mono text-rose-800 bg-white px-3 py-1 rounded-lg border border-rose-300 shadow-2xs inline-block">
                      {totalDailyTargetSum} {metric === 'photos' ? 'ảnh' : 'lượt'}/ngày
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      (Kỳ lọc {dailyData.length} ngày: {totalTargetPeriodSum} {metric === 'photos' ? 'ảnh' : 'lượt'})
                    </span>
                  </div>
                </div>

                <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                  <span>Chi tiết chỉ tiêu quy định & kết quả thực hiện của 19 cơ sở:</span>
                  <span className="text-[10px] text-slate-400 font-normal">* Click vào cơ sở để xem báo cáo chi tiết</span>
                </p>

                {/* DETAILED TABLE */}
                <div className="overflow-x-auto max-h-[340px] overflow-y-auto border border-slate-200 rounded-xl shadow-2xs custom-scrollbar">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-10">STT</th>
                        <th className="py-2.5 px-3">Tên Cơ Sở</th>
                        <th className="py-2.5 px-3 text-center">Line Quy Định (Ngày)</th>
                        <th className="py-2.5 px-3 text-center">Đã Thực Hiện</th>
                        <th className="py-2.5 px-3 text-center">Còn Thiếu</th>
                        <th className="py-2.5 px-3 text-center">Trạng Thái</th>
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
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {item.facName}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-700">
                              {item.dailyTarget} {metric === 'photos' ? 'ảnh' : 'lượt'}/ngày
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                              {item.performed} {metric === 'photos' ? 'ảnh' : 'lượt'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {item.missing > 0 ? (
                                <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  Thiếu {item.missing}
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-semibold text-[11px]">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
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
                        <td className="py-3 px-3 text-center font-mono text-slate-500" colSpan={2}>
                          TỔNG CỘNG 19 CƠ SỞ
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-rose-700 text-xs sm:text-sm">
                          {totalDailyTargetSum} {metric === 'photos' ? 'ảnh' : 'lượt'}/ngày
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-emerald-700 text-xs sm:text-sm">
                          {totalPerformedSum}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-rose-700 text-xs sm:text-sm">
                          {totalMissingSum > 0 ? `Thiếu ${totalMissingSum}` : '0'}
                        </td>
                        <td className="py-3 px-3 text-center text-xs text-emerald-800 font-semibold">
                          {totalMissingSum === 0 ? '✓ Đạt 100%' : `Đạt ${(totalPerformedSum / (totalTargetPeriodSum || 1) * 100).toFixed(0)}%`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-5 text-right border-t border-slate-100 pt-3">
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
