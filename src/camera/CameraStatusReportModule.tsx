import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FilterOptions, CameraAggregate, RawCheckRow } from './types/camera';
import {
  computeDashboardData,
  exportCameraDataToCSV,
  exportDefectiveCamerasToCSV,
  formatDateVN,
  AVAILABLE_MONTHS,
  setMaxDataDate,
  MAX_DATA_DATE
} from './data/cameraDataService';
import { fetchGoogleSheetData } from './data/googleSheetSync';
import { Header } from './components/Header';
import { FiltersBar } from './components/FiltersBar';
import { KpiCards } from './components/KpiCards';
import { InsightBanner } from './components/InsightBanner';
import { ChartsSection } from './components/ChartsSection';
import { CameraTable } from './components/CameraTable';
import { DefectiveCamerasReportTable } from './components/DefectiveCamerasReportTable';
import { CameraDetailModal } from './components/CameraDetailModal';
import { LocationPreviewModal, LocationPreviewData } from './components/LocationPreviewModal';
import { Footer } from './components/Footer';

const INITIAL_FILTERS: FilterOptions = {
  periodMonth: '09/2026',
  dateFrom: '2026-09-01',
  dateTo: '2026-09-22',
  site: 'all',
  owner: 'all',
  status: 'all',
  searchQuery: '',
  evidenceOnly: false
};

export interface CameraStatusReportModuleProps {
  onBack?: () => void;
}

export function CameraStatusReportModule({ onBack }: CameraStatusReportModuleProps) {
  const [filters, setFilters] = useState<FilterOptions>(INITIAL_FILTERS);
  const [inspectionDate, setInspectionDate] = useState<string>('2026-09-22');
  const [selectedCamera, setSelectedCamera] = useState<CameraAggregate | null>(null);
  const [activeLocationPreview, setActiveLocationPreview] = useState<LocationPreviewData | null>(null);

  // Live Google Sheet State
  const [liveRecords, setLiveRecords] = useState<RawCheckRow[] | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Sync Google Sheets on startup and upon user refresh
  const syncWithSheet = useCallback(async (forceRefresh = false) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const result = await fetchGoogleSheetData(forceRefresh);
      if (result.records && result.records.length > 0) {
        setLiveRecords(result.records);
        setLastSyncTime(result.lastSync);

        // Calculate latest date from records
        let latest = '';
        for (const r of result.records) {
          if (!latest || r.date > latest) {
            latest = r.date;
          }
        }

        if (latest) {
          setMaxDataDate(latest);
          // If latest date is newer than current dateTo, update filters & inspectionDate
          setFilters((prev) => {
            if (prev.dateTo < latest && prev.periodMonth === '09/2026') {
              return { ...prev, dateTo: latest };
            }
            return prev;
          });
          setInspectionDate((prev) => (prev < latest ? latest : prev));
        }
      }
    } catch (err: unknown) {
      console.warn('Google Sheet live sync notice:', err);
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
      setSyncError(msg);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Initial fetch on mount & continuous live polling every 30 seconds
  useEffect(() => {
    // 1. Initial live sync
    syncWithSheet(true);

    // 2. Continuous background sync every 30 seconds
    const interval = setInterval(() => {
      syncWithSheet(true);
    }, 30000);

    // 3. Instant sync whenever user switches back to this tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncWithSheet(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncWithSheet]);

  // Computed dashboard data based on filters, inspectionDate, and liveRecords
  const dashboardData = useMemo(() => {
    return computeDashboardData(filters, inspectionDate, liveRecords || undefined);
  }, [filters, inspectionDate, liveRecords]);

  const {
    kpis,
    cameraList,
    defectiveCamerasReport,
    inspectionDayInfo,
    siteStatsList,
    dailyTrends,
    insight,
    filterOptions
  } = dashboardData;

  const handleFilterChange = (updated: Partial<FilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleCurrentMonth = () => {
    const current = AVAILABLE_MONTHS[0]; // '09/2026'
    setFilters({
      periodMonth: current.value,
      dateFrom: current.from,
      dateTo: current.to,
      site: 'all',
      owner: 'all',
      status: 'all',
      searchQuery: '',
      evidenceOnly: false
    });
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
  };

  const handleSelectSiteFromChart = (siteName: string) => {
    setFilters((prev) => ({
      ...prev,
      site: prev.site === siteName ? 'all' : siteName
    }));
  };

  const handleExportCSV = () => {
    const csvContent = exportCameraDataToCSV(cameraList);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const periodSlug = filters.periodMonth !== 'custom'
      ? filters.periodMonth.replace('/', '-')
      : `${filters.dateFrom}_den_${filters.dateTo}`;
    link.setAttribute('href', url);
    link.setAttribute('download', `CVSG_Camera_BaoCao_${periodSlug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportDefectiveCSV = () => {
    const csvContent = exportDefectiveCamerasToCSV(defectiveCamerasReport);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const periodSlug = filters.periodMonth !== 'custom'
      ? filters.periodMonth.replace('/', '-')
      : `${filters.dateFrom}_den_${filters.dateTo}`;
    link.setAttribute('href', url);
    link.setAttribute('download', `CVSG_Cam_Hu_Ngay_${inspectionDate.replace(/-/g, '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const periodLabel = filters.periodMonth !== 'custom'
    ? `Tháng ${filters.periodMonth} (${formatDateVN(filters.dateFrom)} – ${formatDateVN(filters.dateTo)})`
    : `Khoảng ngày tùy chọn (${formatDateVN(filters.dateFrom)} – ${formatDateVN(filters.dateTo)})`;

  return (
    <div className="min-h-screen bg-[#f4f7fc] text-[#14213d] flex flex-col font-sans antialiased selection:bg-[#2f6bff] selection:text-white">
      {/* Top Header */}
      <Header
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        onReset={handleReset}
        onExportCSV={handleExportCSV}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        onRefreshData={() => syncWithSheet(true)}
        totalLiveRecords={liveRecords ? liveRecords.length : undefined}
        syncError={syncError}
        onBack={onBack}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1480px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Controls Bar */}
        <FiltersBar
          filters={filters}
          availableSites={filterOptions.availableSites}
          availableOwners={filterOptions.availableOwners}
          availableStatuses={filterOptions.availableStatuses}
          onChange={handleFilterChange}
          onCurrentMonth={handleCurrentMonth}
          onReset={handleReset}
        />

        {/* 5 KPI Metric Cards */}
        <KpiCards kpis={kpis} />

        {/* Bottleneck Recommendation Banner */}
        <InsightBanner
          title={insight.title}
          text={insight.text}
          tag={insight.tag}
        />

        {/* Charts Section: Donut breakdown, Bar breakdown, Line Trend & Stacked Bars */}
        <ChartsSection
          siteStatsList={siteStatsList}
          dailyTrends={dailyTrends}
          kpis={kpis}
          periodLabel={periodLabel}
          onSelectSite={handleSelectSiteFromChart}
        />

        {/* Action Priority Cameras Table */}
        <CameraTable
          cameras={cameraList}
          onSelectCamera={setSelectedCamera}
          onViewLocation={setActiveLocationPreview}
        />

        {/* Báo Cáo Thống Kê Hiện Trạng Camera Đang Hư (Ở phía dưới cùng) */}
        <DefectiveCamerasReportTable
          defectiveList={defectiveCamerasReport}
          cameraAggregates={cameraList}
          periodLabel={periodLabel}
          inspectionDate={inspectionDate}
          inspectionDayInfo={inspectionDayInfo}
          onInspectionDateChange={setInspectionDate}
          onSelectCamera={setSelectedCamera}
          onExportCSV={handleExportDefectiveCSV}
          onViewLocation={setActiveLocationPreview}
        />
      </main>

      {/* Camera Inspection Log & Action Modal */}
      <CameraDetailModal
        camera={selectedCamera}
        onClose={() => setSelectedCamera(null)}
        onViewLocation={setActiveLocationPreview}
      />

      {/* Direct In-App Location Image & Preview Modal */}
      <LocationPreviewModal
        data={activeLocationPreview}
        onClose={() => setActiveLocationPreview(null)}
      />

      {/* Application Footer */}
      <Footer />
    </div>
  );
}

export default CameraStatusReportModule;
