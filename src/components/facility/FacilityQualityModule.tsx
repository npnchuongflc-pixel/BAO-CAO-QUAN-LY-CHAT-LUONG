/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

export const FacilityQualityModule: React.FC = () => {
  const [mode, setMode] = useState<ReportMode>('hygiene');

  // Reports State
  const [hygieneReports, setHygieneReports] = useState<HygieneReport[]>([]);
  const [qualityReports, setQualityReports] = useState<FacilityQualityReport[]>([]);

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
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

  const getDefaultCurrentMonthRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const lastDayStr = String(lastDay).padStart(2, '0');
    return {
      tuNgay: `${year}-${month}-01`,
      denNgay: `${year}-${month}-${lastDayStr}`,
    };
  };

  // Filter State
  const [filters, setFilters] = useState<FilterState>(() => {
    const range = getDefaultCurrentMonthRange();
    return {
      thang: 'all',
      tuNgay: range.tuNgay,
      denNgay: range.denNgay,
      coSo: 'all',
      khuVuc: 'all',
      trangThai: 'all',
      searchQuery: '',
    };
  });

  // Fetch / Sync Data
  const loadData = useCallback(async () => {
    setIsSyncing(true);
    const [hygRes, qualRes] = await Promise.all([
      fetchHygieneFromSheet(),
      fetchQualityFromSheet(),
    ]);

    setHygieneReports(hygRes.data);
    setQualityReports(qualRes.data);
    setSyncErrors({
      hygiene: hygRes.error || null,
      quality: qualRes.error || null,
    });
    setIsSyncing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract Month string helper from date string
  const getMonthLabel = (dateStr: string): string => {
    if (!dateStr) return 'Khác';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        return `Tháng ${parts[1]}/${parts[0]}`;
      }
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length >= 3) {
        return `Tháng ${parts[1]}/${parts[2]}`;
      }
    }
    return dateStr;
  };

  // Extract list of months available
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const allReports = mode === 'hygiene' ? hygieneReports : qualityReports;
    allReports.forEach(r => {
      if (r.ngay) monthsSet.add(getMonthLabel(r.ngay));
    });
    return Array.from(monthsSet).sort().reverse();
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

  // Date ISO Normalizer
  const parseToIsoDate = (dateStr: string): string => {
    return normalizeDateToIso(dateStr);
  };

  // Match Area Category or Exact Area String
  const matchAreaFilter = (khuVucReport: string, filterKhuVuc: string): boolean => {
    if (!filterKhuVuc || filterKhuVuc === 'all') return true;
    const kv = (khuVucReport || '').toLowerCase();

    switch (filterKhuVuc) {
      case 'cat_phong_co':
        return kv.includes('cờ') && (kv.includes('tổng thể') || kv.includes('phòng học')) && !kv.includes('máy lạnh') && !kv.includes('điều hòa') && !kv.includes('wc') && !kv.includes('vệ sinh');
      case 'cat_may_lanh_co':
        return kv.includes('cờ') && (kv.includes('máy lạnh') || kv.includes('điều hòa') || kv.includes('aircon'));
      case 'cat_wc_co':
        return kv.includes('cờ') && (kv.includes('wc') || kv.includes('vệ sinh') || kv.includes('toilet'));
      case 'cat_phong_ve':
        return kv.includes('vẽ') && (kv.includes('tổng thể') || kv.includes('phòng học')) && !kv.includes('máy lạnh') && !kv.includes('điều hòa') && !kv.includes('wc') && !kv.includes('vệ sinh');
      case 'cat_may_lanh_ve':
        return kv.includes('vẽ') && (kv.includes('máy lạnh') || kv.includes('điều hòa') || kv.includes('aircon'));
      case 'cat_wc_ve':
        return kv.includes('vẽ') && (kv.includes('wc') || kv.includes('vệ sinh') || kv.includes('toilet'));
      case 'cat_le_tan':
        return kv.includes('lễ tân') || kv.includes('sảnh') || kv.includes('tiếp tân');
      case 'cat_nvs':
        return kv.includes('vệ sinh') || kv.includes('nvs') || kv.includes('wc') || kv.includes('toilet');
      case 'cat_may_lanh':
        return kv.includes('máy lạnh') || kv.includes('điều hòa') || kv.includes('aircon');
      default:
        return khuVucReport === filterKhuVuc || kv.includes(filterKhuVuc.toLowerCase());
    }
  };

  // Match Hygiene Status & Score Levels
  const matchHygieneStatus = (report: HygieneReport, filterStatus: string): boolean => {
    if (!filterStatus || filterStatus === 'all') return true;
    const filtNorm = filterStatus.trim().toLowerCase();
    const repNorm = (report.trangThai || '').trim().toLowerCase();

    // Normalize score to 100-point scale
    let score100 = report.diemSo ?? 0;
    if (report.diemSoMax && report.diemSoMax <= 10 && score100 <= 10) {
      score100 = score100 * 10;
    }

    if (filtNorm === 'muc_1') {
      return score100 >= 90 || repNorm.includes('xuất sắc');
    }
    if (filtNorm === 'muc_2') {
      return (score100 >= 80 && score100 < 90) || repNorm.includes('khá') || repNorm.includes('tốt');
    }
    if (filtNorm === 'muc_3') {
      return (score100 >= 70 && score100 < 80) || repNorm.includes('trung bình') || repNorm.includes('đạt');
    }
    if (filtNorm === 'muc_4' || filtNorm.includes('cần cải thiện')) {
      return score100 < 70 || repNorm.includes('cải thiện') || repNorm.includes('thực hiện lại') || repNorm.includes('bẩn nặng') || repNorm.includes('không đạt');
    }

    if (filtNorm === 'đạt') {
      return repNorm.includes('đạt') && !repNorm.includes('không đạt');
    }
    if (filtNorm === 'không đạt') {
      return repNorm.includes('không đạt') || score100 < 70;
    }
    if (filtNorm === 'cần khắc phục') {
      return repNorm.includes('khắc phục') || repNorm.includes('cần');
    }
    return repNorm.includes(filtNorm) || filtNorm.includes(repNorm);
  };

  // Match Quality Status & Severity
  const matchQualityStatus = (trangThaiGhiNhan: string, mucDo: string, filterStatus: string): boolean => {
    if (!filterStatus || filterStatus === 'all') return true;
    const filtNorm = filterStatus.trim().toLowerCase();
    const ttNorm = (trangThaiGhiNhan || '').trim().toLowerCase();
    const mdNorm = (mucDo || '').trim().toLowerCase();

    return (
      ttNorm.includes(filtNorm) ||
      mdNorm.includes(filtNorm) ||
      filtNorm.includes(ttNorm) ||
      filtNorm.includes(mdNorm)
    );
  };

  // Base Filter Hygiene Reports
  const baseFilteredHygiene = useMemo(() => {
    return hygieneReports.filter((r) => {
      if (filters.tuNgay) {
        const repIso = parseToIsoDate(r.ngay);
        if (repIso && repIso < filters.tuNgay) return false;
      }
      if (filters.denNgay) {
        const repIso = parseToIsoDate(r.ngay);
        if (repIso && repIso > filters.denNgay) return false;
      }
      if (!filters.tuNgay && !filters.denNgay && filters.thang !== 'all') {
        if (getMonthLabel(r.ngay) !== filters.thang) return false;
      }

      if (!matchAreaFilter(r.khuVuc, filters.khuVuc)) return false;
      if (!matchHygieneStatus(r, filters.trangThai)) return false;
      
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matches = 
          r.coSo.toLowerCase().includes(q) ||
          r.khuVuc.toLowerCase().includes(q) ||
          r.nguoiKiemTra.toLowerCase().includes(q) ||
          r.chiTiet.toLowerCase().includes(q) ||
          (r.phanHoi && r.phanHoi.toLowerCase().includes(q)) ||
          (r.feedbackNguoiDung && r.feedbackNguoiDung.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [hygieneReports, filters.tuNgay, filters.denNgay, filters.thang, filters.khuVuc, filters.trangThai, filters.searchQuery]);

  // Base Filter Quality Reports
  const baseFilteredQuality = useMemo(() => {
    return qualityReports.filter((r) => {
      if (filters.tuNgay) {
        const repIso = parseToIsoDate(r.ngay);
        if (repIso && repIso < filters.tuNgay) return false;
      }
      if (filters.denNgay) {
        const repIso = parseToIsoDate(r.ngay);
        if (repIso && repIso > filters.denNgay) return false;
      }
      if (!filters.tuNgay && !filters.denNgay && filters.thang !== 'all') {
        if (getMonthLabel(r.ngay) !== filters.thang) return false;
      }

      if (!matchAreaFilter(r.khuVuc, filters.khuVuc)) return false;
      if (!matchQualityStatus(r.trangThaiGhiNhan, r.mucDo, filters.trangThai)) return false;

      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matches = 
          r.coSo.toLowerCase().includes(q) ||
          r.khuVuc.toLowerCase().includes(q) ||
          r.ten.toLowerCase().includes(q) ||
          r.deXuat.toLowerCase().includes(q) ||
          r.mucDo.toLowerCase().includes(q) ||
          r.trangThaiGhiNhan.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [qualityReports, filters.tuNgay, filters.denNgay, filters.thang, filters.khuVuc, filters.trangThai, filters.searchQuery]);

  // Final Filtered Hygiene Reports (with coSo filter)
  const filteredHygiene = useMemo(() => {
    if (filters.coSo === 'all') return baseFilteredHygiene;
    return baseFilteredHygiene.filter(r => r.coSo === filters.coSo);
  }, [baseFilteredHygiene, filters.coSo]);

  // Final Filtered Quality Reports (with coSo filter)
  const filteredQuality = useMemo(() => {
    if (filters.coSo === 'all') return baseFilteredQuality;
    return baseFilteredQuality.filter(r => r.coSo === filters.coSo);
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
      {/* Main Container */}
      <main className="flex-1 w-full max-w-none py-0">
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
        />

        {/* TOP SECTION: SUMMARY AGGREGATION DASHBOARD */}
        <SummaryDashboard
          mode={mode}
          onModeChange={(newMode) => {
            setMode(newMode);
            setFilters(f => ({ ...f, trangThai: 'all' }));
          }}
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
        />
      </main>

      {/* MODALS */}
      {detailModalFacility !== null && (
        <FacilityDetailReportsModal
          mode={mode}
          facilityName={detailModalFacility}
          hygieneReports={baseFilteredHygiene}
          qualityReports={baseFilteredQuality}
          filters={filters}
          onClose={() => {
            setDetailModalFacility(null);
            setFilters(f => ({ ...f, coSo: 'all' }));
          }}
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
