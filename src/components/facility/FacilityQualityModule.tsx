/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ReportMode,
  HygieneReport,
  FacilityQualityReport,
  FilterState,
  FacilitySummary
} from './facilityTypes';
import { OFFICIAL_FACILITIES, normalizeFacilityName } from '../../utils/facilityUtils';
import { fetchHygieneFromSheet, fetchQualityFromSheet } from '../../services/googleSheetsService';
import { FilterBar } from './FilterBar';
import { SummaryDashboard } from './SummaryDashboard';
import { FacilityTimelineChart } from './FacilityTimelineChart';
import { normalizeDateToIso } from '../../utils/dateUtils';
import { RecordDetailModal } from './RecordDetailModal';
import { ImageLightBoxModal } from './ImageLightBoxModal';
import { FacilityDetailReportsModal } from './FacilityDetailReportsModal';
import { PrintReportHeader } from '../PrintReportHeader';
import { PrintReportFooter } from '../PrintReportFooter';
const RepairManagementModule = lazy(() => import('../../repair/RepairManagementModule').then(m => ({ default: m.RepairManagementModule })));
import { Building2, CheckCircle2, Wrench, RefreshCw, AlertTriangle, Layers } from 'lucide-react';

export const FacilityQualityModule: React.FC<{ refreshKey?: number }> = ({ refreshKey = 0 }) => {
  const [mode, setMode] = useState<ReportMode>('hygiene');
  const [activeSubTab, setActiveSubTab] = useState<'hygiene-quality' | 'repair'>('hygiene-quality');

  // Reports State
  const [hygieneReports, setHygieneReports] = useState<HygieneReport[]>([]);
  const [qualityReports, setQualityReports] = useState<FacilityQualityReport[]>([]);

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const isFetchingRef = useRef(false);
  const [syncErrors, setSyncErrors] = useState<Record<ReportMode, string | null>>({
    hygiene: null,
    quality: null,
  });

  // View mode
  const [viewType, setViewType] = useState<'table' | 'gallery'>('table');

  // Modals & view state
  const [selectedRecord, setSelectedRecord] = useState<HygieneReport | FacilityQualityReport | null>(null);
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState<boolean>(false);
  const [prefilledFacility, setPrefilledFacility] = useState<string>('');
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [detailModalFacility, setDetailModalFacility] = useState<string | null>(null);

  const getCurrentMonthLabel = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `Tháng ${month}/${year}`;
  };

  // Filter State (kiểm soát toàn cục theo Tháng & Cơ sở kiểm tra)
  const [filters, setFilters] = useState<FilterState>(() => ({
    thang: getCurrentMonthLabel(),
    tuNgay: '',
    denNgay: '',
    coSo: 'all',
    khuVuc: 'all',
    trangThai: 'all',
    searchQuery: '',
  }));

  // Fetch / Sync Data
  const loadData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsSyncing(true);
    try {
      const [hygRes, qualRes] = await Promise.all([
        fetchHygieneFromSheet(),
        fetchQualityFromSheet(),
      ]);

      if (!hygRes.error) setHygieneReports(hygRes.data);
      if (!qualRes.error) setQualityReports(qualRes.data);
      setSyncErrors({
        hygiene: hygRes.error || null,
        quality: qualRes.error || null,
      });
      setHasLoadedData(true);
    } finally {
      isFetchingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const refreshVisible = () => { if (!document.hidden) void loadData(); };
    const refreshTimer = window.setInterval(refreshVisible, 60_000);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      window.clearInterval(refreshTimer);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [loadData, refreshKey]);

  // Extract Month string helper from date string using ISO normalizer
  const getMonthLabel = (dateStr: string): string => {
    const iso = normalizeDateToIso(dateStr);
    if (!iso) return 'Khác';
    const [yyyy, mm] = iso.split('-');
    return `Tháng ${mm}/${yyyy}`;
  };

  // Extract list of months available sorted newest-first chronologically
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>([getCurrentMonthLabel()]);
    const allReports = mode === 'hygiene' ? hygieneReports : qualityReports;
    allReports.forEach(r => {
      if (r.ngay) {
        const label = getMonthLabel(r.ngay);
        if (label !== 'Khác') monthsSet.add(label);
      }
    });
    const toMonthIndex = (label: string) => {
      const match = label.match(/(\d{1,2})[\/\-](\d{4})/);
      if (!match) return 0;
      return parseInt(match[2], 10) * 12 + parseInt(match[1], 10);
    };
    return Array.from(monthsSet).sort((a, b) => toMonthIndex(b) - toMonthIndex(a));
  }, [mode, hygieneReports, qualityReports]);

  // Extract list of facilities available (always 19 official facilities)
  const availableFacilities = useMemo(() => {
    return OFFICIAL_FACILITIES;
  }, []);

  // Extract list of areas available
  const availableAreas = useMemo(() => {
    const areasSet = new Set<string>();
    const allReports = mode === 'hygiene' ? hygieneReports : qualityReports;
    allReports.forEach(r => {
      if (r.khuVuc) areasSet.add(r.khuVuc);
    });
    return Array.from(areasSet).sort();
  }, [mode, hygieneReports, qualityReports]);

  // Base Filter Hygiene Reports (controlled by global Month filter)
  const baseFilteredHygiene = useMemo(() => {
    return hygieneReports.filter((r) => {
      if (filters.thang && filters.thang !== 'all') {
        if (getMonthLabel(r.ngay) !== filters.thang) return false;
      }
      return true;
    });
  }, [hygieneReports, filters.thang]);

  // Base Filter Quality Reports (controlled by global Month filter)
  const baseFilteredQuality = useMemo(() => {
    return qualityReports.filter((r) => {
      if (filters.thang && filters.thang !== 'all') {
        if (getMonthLabel(r.ngay) !== filters.thang) return false;
      }
      return true;
    });
  }, [qualityReports, filters.thang]);

  // Final Filtered Hygiene Reports (with normalized coSo filter)
  const filteredHygiene = useMemo(() => {
    if (filters.coSo === 'all') return baseFilteredHygiene;
    return baseFilteredHygiene.filter(r => (normalizeFacilityName(r.coSo) || r.coSo) === filters.coSo);
  }, [baseFilteredHygiene, filters.coSo]);

  // Final Filtered Quality Reports (with normalized coSo filter)
  const filteredQuality = useMemo(() => {
    if (filters.coSo === 'all') return baseFilteredQuality;
    return baseFilteredQuality.filter(r => (normalizeFacilityName(r.coSo) || r.coSo) === filters.coSo);
  }, [baseFilteredQuality, filters.coSo]);

  // FACILITY SUMMARIES AGGREGATION
  const facilitySummaries: FacilitySummary[] = useMemo(() => {
    const map = new Map<string, {
      count: number;
      passCount: number;
      resolvedCount: number;
      totalScore: number;
      issuesCount: number;
      latestDate: string;
    }>();

    // Always initialize all 19 official facilities
    OFFICIAL_FACILITIES.forEach(f => {
      map.set(f, {
        count: 0,
        passCount: 0,
        resolvedCount: 0,
        totalScore: 0,
        issuesCount: 0,
        latestDate: '',
      });
    });

    if (mode === 'hygiene') {
      filteredHygiene.forEach(r => {
        const facName = normalizeFacilityName(r.coSo);
        const existing = map.get(facName) || {
          count: 0,
          passCount: 0,
          resolvedCount: 0,
          totalScore: 0,
          issuesCount: 0,
          latestDate: '',
        };

        existing.count += 1;
        if (r.trangThai === 'Đạt') existing.passCount += 1;
        if (r.trangThai === 'Cần khắc phục' || r.trangThai === 'Không đạt') existing.issuesCount += 1;
        existing.totalScore += r.diemSo || 0;

        if (!existing.latestDate || `${r.ngay} ${r.gio}` > existing.latestDate) {
          existing.latestDate = `${r.ngay} ${r.gio}`;
        }

        map.set(facName, existing);
      });
    } else {
      filteredQuality.forEach(r => {
        const facName = normalizeFacilityName(r.coSo);
        const existing = map.get(facName) || {
          count: 0,
          passCount: 0,
          resolvedCount: 0,
          totalScore: 0,
          issuesCount: 0,
          latestDate: '',
        };

        existing.count += 1;
        if (r.trangThaiGhiNhan === 'Đã xử lý') existing.resolvedCount += 1;
        if (r.mucDo === 'Khẩn cấp' || r.mucDo === 'Nghiêm trọng') existing.issuesCount += 1;

        if (!existing.latestDate || `${r.ngay} ${r.gio}` > existing.latestDate) {
          existing.latestDate = `${r.ngay} ${r.gio}`;
        }

        map.set(facName, existing);
      });
    }

    const summaries: FacilitySummary[] = [];
    map.forEach((val, key) => {
      if (filters.coSo !== 'all' && key !== filters.coSo) return;
      summaries.push({
        coSo: key,
        soLanThucHien: val.count,
        tyLeDat: val.count > 0 ? (val.passCount / val.count) * 100 : 0,
        tyLeDaXuLy: val.count > 0 ? (val.resolvedCount / val.count) * 100 : 0,
        diemTrungBinh: val.count > 0 ? val.totalScore / val.count : 0,
        soSuCo: val.issuesCount,
        lanCuoiKiemTra: val.latestDate ? val.latestDate.split(' ')[0] : 'N/A',
      });
    });

    return summaries.sort((a, b) => b.soLanThucHien - a.soLanThucHien || a.coSo.localeCompare(b.coSo));
  }, [mode, filteredHygiene, filteredQuality, filters.coSo]);

  const totalFilteredRecords = mode === 'hygiene' ? filteredHygiene.length : filteredQuality.length;
  const activeFacilityCount = facilitySummaries.filter(s => s.soLanThucHien > 0).length;

  const overallScoreOrRate = useMemo(() => {
    if (totalFilteredRecords === 0) return 0;
    if (mode === 'hygiene') {
      const sum = filteredHygiene.reduce((acc, r) => acc + (r.diemSo || 0), 0);
      return sum / totalFilteredRecords;
    } else {
      const resolved = filteredQuality.filter(r => r.trangThaiGhiNhan === 'Đã xử lý').length;
      return (resolved / totalFilteredRecords) * 100;
    }
  }, [mode, filteredHygiene, filteredQuality, totalFilteredRecords]);

  const issuesCount = useMemo(() => {
    if (mode === 'hygiene') {
      return filteredHygiene.filter(r => r.trangThai === 'Cần khắc phục' || r.trangThai === 'Không đạt').length;
    } else {
      return filteredQuality.filter(r => r.mucDo === 'Khẩn cấp' || r.mucDo === 'Nghiêm trọng').length;
    }
  }, [mode, filteredHygiene, filteredQuality]);

  const handleUpdateRecord = (updated: HygieneReport | FacilityQualityReport) => {
    if ('diemSo' in updated) {
      setHygieneReports(prev => prev.map(r => r.id === updated.id ? (updated as HygieneReport) : r));
    } else {
      setQualityReports(prev => prev.map(r => r.id === updated.id ? (updated as FacilityQualityReport) : r));
    }
  };

  const handleExportCSV = () => {
    let csvContent = '';
    if (mode === 'hygiene') {
      csvContent = 'Ngày,Giờ,Người kiểm tra,Cơ sở,Khu vực,Trạng thái,Điểm số,Chi tiết,Phản hồi,Feedback từ người dùng,Link ảnh\n';
      filteredHygiene.forEach(r => {
        const row = [
          `"${r.ngay}"`,
          `"${r.gio}"`,
          `"${r.nguoiKiemTra}"`,
          `"${r.coSo}"`,
          `"${r.khuVuc}"`,
          `"${r.trangThai}"`,
          `"${r.diemSo}"`,
          `"${r.chiTiet.replace(/"/g, '""')}"`,
          `"${r.phanHoi.replace(/"/g, '""')}"`,
          `"${r.feedbackNguoiDung.replace(/"/g, '""')}"`,
          `"${r.linkAnh}"`
        ].join(',');
        csvContent += row + '\n';
      });
    } else {
      csvContent = 'NGÀY,GIỜ,TÊN,CƠ SỞ,KHU VỰC,MỨC ĐỘ,TRẠNG THÁI GHI NHẬN,ĐỀ XUẤT,LINK ẢNH\n';
      filteredQuality.forEach(r => {
        const row = [
          `"${r.ngay}"`,
          `"${r.gio}"`,
          `"${r.ten}"`,
          `"${r.coSo}"`,
          `"${r.khuVuc}"`,
          `"${r.mucDo}"`,
          `"${r.trangThaiGhiNhan}"`,
          `"${r.deXuat.replace(/"/g, '""')}"`,
          `"${r.linkAnh}"`
        ].join(',');
        csvContent += row + '\n';
      });
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_${mode === 'hygiene' ? 'Ve_Sinh' : 'Chat_Luong_Co_So'}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="tab-view-wrapper min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Top Module Sub-Navigation Bar */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            {/* Left branding */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B5EA6] to-[#0D3866] text-white flex items-center justify-center shadow-xs shrink-0 ring-1 ring-black/5">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    Báo cáo giám sát vệ sinh
                  </h1>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Sync
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                  Theo dõi chất lượng vệ sinh &amp; bảo trì 19 cơ sở toàn hệ thống
                </p>
              </div>
            </div>

            {/* Right: Modern Segmented Navigation Bar */}
            <div className="flex items-center gap-2 self-stretch lg:self-auto">
              <nav
                aria-label="Phân hệ báo cáo cơ sở"
                className="inline-flex w-full sm:w-auto p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-2xs gap-1 overflow-x-auto custom-scrollbar"
              >
                {/* Sheet 1: Báo Cáo Vệ Sinh */}
                <button
                  type="button"
                  onClick={() => {
                    setMode('hygiene');
                    setActiveSubTab('hygiene-quality');
                  }}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm transition-all duration-150 cursor-pointer select-none whitespace-nowrap ${
                    activeSubTab === 'hygiene-quality' && mode === 'hygiene'
                      ? 'bg-white text-[#1B5EA6] shadow-xs border border-slate-200/80 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
                  }`}
                  title="Xem Báo Cáo Kiểm Tra Vệ Sinh Hằng Ngày"
                >
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      activeSubTab === 'hygiene-quality' && mode === 'hygiene' ? 'text-[#1B5EA6]' : 'text-slate-400'
                    }`}
                  />
                  <span>Báo Cáo Vệ Sinh</span>
                  <span
                    className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md ${
                      activeSubTab === 'hygiene-quality' && mode === 'hygiene'
                        ? 'bg-sky-50 text-[#1B5EA6] border border-sky-100'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {hygieneReports.length.toLocaleString('vi-VN')}
                  </span>
                </button>

                {/* Sheet 2: Báo Cáo Sửa Chữa */}
                <button
                  type="button"
                  onClick={() => setActiveSubTab('repair')}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm transition-all duration-150 cursor-pointer select-none whitespace-nowrap ${
                    activeSubTab === 'repair'
                      ? 'bg-white text-amber-800 shadow-xs border border-slate-200/80 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
                  }`}
                  title="Xem Báo Cáo Đề Xuất Sửa Chữa & Bảo Trì Thiết Bị"
                >
                  <Wrench
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      activeSubTab === 'repair' ? 'text-amber-600' : 'text-slate-400'
                    }`}
                  />
                  <span>Báo Cáo Sửa Chữa</span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      activeSubTab === 'repair'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200/80'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    Đề xuất
                  </span>
                </button>
              </nav>

              {/* Quick Sync Button */}
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={isSyncing}
                className="p-2 text-slate-500 hover:text-[#1B5EA6] hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer hidden md:inline-flex"
                title="Đồng bộ / Tải lại dữ liệu Google Sheet mới nhất"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#1B5EA6]' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* RENDER VIEW: REPAIR REPORT OR HYGIENE / QUALITY DASHBOARD */}
      {activeSubTab === 'repair' ? (
        <Suspense fallback={<div className="report-loading" role="status">Đang mở báo cáo sửa chữa…</div>}><RepairManagementModule onBack={() => setActiveSubTab('hygiene-quality')} /></Suspense>
      ) : (
        <main className={`flex-1 w-full max-w-none py-0 ${detailModalFacility !== null ? 'print:hidden' : ''}`}>
          {syncErrors[mode] && (
            <div
              role="alert"
              className="mb-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <strong className="block font-bold">Chưa kết nối được dữ liệu gốc</strong>
                <span>{syncErrors[mode]}</span>
              </div>
              <button
                type="button"
                onClick={loadData}
                disabled={isSyncing}
                className="shrink-0 rounded-lg bg-rose-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-800 disabled:cursor-wait disabled:opacity-60"
              >
                {isSyncing ? 'Đang kết nối…' : 'Thử kết nối lại'}
              </button>
            </div>
          )}

          {/* Print Only Header for A4 PDF exports (Page 1) */}
          <PrintReportHeader
            title="BẢNG TỔNG HỢP XẾP HẠNG & TIẾN ĐỘ THỰC HIỆN 19 CƠ SỞ"
            subtitle={`Hệ thống quản trị cơ sở • Phạm vi: ${filters.coSo === 'all' ? 'Tất cả 19 cơ sở' : filters.coSo}`}
            pageNumber="Trang 1/2"
            dateRange={filters.thang !== 'all' ? filters.thang : 'Tất cả các tháng'}
          />

          {/* Filters Bar */}
          <FilterBar
            mode={mode}
            filters={filters}
            onFilterChange={setFilters}
            availableMonths={availableMonths}
            availableFacilities={availableFacilities}
            availableAreas={availableAreas}
            onExportCSV={handleExportCSV}
            totalFilteredCount={totalFilteredRecords}
            onOpenRepairReport={() => setActiveSubTab('repair')}
          />

        {/* TOP SECTION: SUMMARY AGGREGATION DASHBOARD (BẢNG TỔNG HỢP DUY NHẤT) */}
        <SummaryDashboard
          mode={mode}
          hygieneCount={hygieneReports.length}
          qualityCount={qualityReports.length}
          summaries={facilitySummaries}
          totalRecords={totalFilteredRecords}
          activeFacilityCount={activeFacilityCount}
          overallScoreOrRate={overallScoreOrRate}
          issuesCount={issuesCount}
          selectedFacilityFilter={filters.coSo}
          onSelectFacility={(fac) => setFilters(f => ({ ...f, coSo: fac }))}
          filters={filters}
          onFilterChange={(newFilters) => setFilters(newFilters)}
          onOpenDetailModal={(fac) => setDetailModalFacility(fac)}
          rawHygieneReports={hygieneReports}
          rawQualityReports={qualityReports}
          isDataReady={hasLoadedData && !syncErrors[mode]}
        />
      </main>
      )}

      {/* MODALS */}
      {detailModalFacility !== null && (
        <FacilityDetailReportsModal
          mode={mode}
          facilityName={detailModalFacility}
          hygieneReports={baseFilteredHygiene}
          qualityReports={baseFilteredQuality}
          filters={filters}
          onClose={() => setDetailModalFacility(null)}
          onSelectRecord={(rec) => setSelectedRecord(rec)}
          onOpenImageModal={(url, title) => setLightboxImage({ url, title })}
          availableFacilities={OFFICIAL_FACILITIES}
          onFacilityChange={(fac) => {
            setDetailModalFacility(fac);
            setFilters(f => ({ ...f, coSo: fac }));
          }}
          onFilterChange={setFilters}
        />
      )}

      {selectedRecord && (
        <RecordDetailModal
          mode={mode}
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onUpdateRecord={handleUpdateRecord}
        />
      )}

      {lightboxImage && (
        <ImageLightBoxModal
          imageUrl={lightboxImage.url}
          title={lightboxImage.title}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};
