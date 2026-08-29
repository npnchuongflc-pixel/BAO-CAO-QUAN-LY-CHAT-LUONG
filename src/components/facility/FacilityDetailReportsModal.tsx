import React, { useMemo } from 'react';
import { HygieneReport, FacilityQualityReport, ReportMode, FilterState } from './facilityTypes';
import { DetailTable } from './DetailTable';
import { FacilityTimelineChart } from './FacilityTimelineChart';
import { getFacilityDailyTarget, getDaysInMonthFromFilter, normalizeFacilityName } from '../../utils/facilityUtils';
import { X, Building2, FileText, BarChart3 } from 'lucide-react';

interface FacilityDetailReportsModalProps {
  mode: ReportMode;
  facilityName: string; // e.g. 'Cơ sở Phú Nhuận' or 'all'
  hygieneReports: HygieneReport[];
  qualityReports: FacilityQualityReport[];
  filters: FilterState;
  onClose: () => void;
  onSelectRecord: (record: HygieneReport | FacilityQualityReport) => void;
  onOpenImageModal: (imageUrl: string, title: string) => void;
  availableFacilities: string[];
  onFacilityChange: (facilityName: string) => void;
  onFilterChange?: (filters: FilterState) => void;
}

export const FacilityDetailReportsModal: React.FC<FacilityDetailReportsModalProps> = ({
  mode,
  facilityName,
  hygieneReports,
  qualityReports,
  filters,
  onClose,
  onSelectRecord,
  onOpenImageModal,
  availableFacilities,
  onFacilityChange,
  onFilterChange,
}) => {
  const isHygiene = mode === 'hygiene';

  // Filter reports for the specific facility if facilityName !== 'all'
  const filteredHygiene = facilityName === 'all' 
    ? hygieneReports 
    : hygieneReports.filter(r => {
        const normR = normalizeFacilityName(r.coSo);
        const normTarget = normalizeFacilityName(facilityName);
        return normR === normTarget || r.coSo === facilityName || r.coSo.includes(facilityName) || facilityName.includes(r.coSo);
      });

  const filteredQuality = facilityName === 'all' 
    ? qualityReports 
    : qualityReports.filter(r => {
        const normR = normalizeFacilityName(r.coSo);
        const normTarget = normalizeFacilityName(facilityName);
        return normR === normTarget || r.coSo === facilityName || r.coSo.includes(facilityName) || facilityName.includes(r.coSo);
      });

  const count = isHygiene ? filteredHygiene.length : filteredQuality.length;

  const targetTotalPeriod = useMemo(() => {
    const daily = getFacilityDailyTarget(facilityName);
    let days = 30;
    if (filters.tuNgay && filters.denNgay) {
      const start = new Date(filters.tuNgay);
      const end = new Date(filters.denNgay);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);
      }
    } else if (filters.thang && filters.thang !== 'all') {
      days = getDaysInMonthFromFilter(filters.thang);
    }
    return daily * days;
  }, [facilityName, filters.tuNgay, filters.denNgay, filters.thang]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl text-slate-800 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-display">
                  Chi Tiết Cơ Sở: <span className="text-emerald-700">{facilityName === 'all' ? 'Tất Cả Cơ Sở' : facilityName}</span>
                </h3>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold font-mono">
                  {count} / {targetTotalPeriod} báo cáo
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Biểu đồ thực hiện theo thời gian & Danh sách báo cáo chi tiết</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            {/* Facility Selector inside Modal */}
            <select
              value={facilityName}
              onChange={(e) => onFacilityChange(e.target.value)}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
            >
              <option value="all">--- Tất cả cơ sở ({isHygiene ? hygieneReports.length : qualityReports.length}) ---</option>
              {availableFacilities.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Đóng popup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Chart + Detail Table */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-50/60 space-y-6">
          {/* Facility Timeline Execution Chart */}
          <div>
            <FacilityTimelineChart
              mode={mode}
              selectedFacility={facilityName}
              hygieneReports={hygieneReports}
              qualityReports={qualityReports}
              filters={{ ...filters, coSo: facilityName }}
              onSelectFacility={(fac) => onFacilityChange(fac)}
              onFilterChange={onFilterChange}
            />
          </div>

          {/* Detailed Reports Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 text-slate-800 shadow-2xs">
            <div className="mb-3 px-2 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 font-display">
                <FileText className="w-4 h-4 text-emerald-600" />
                Danh Sách Nhật Ký Báo Cáo ({count})
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                Nhấn vào dòng bất kỳ để xem chi tiết ảnh chụp và phản hồi
              </span>
            </div>
            <DetailTable
              mode={mode}
              hygieneReports={filteredHygiene}
              qualityReports={filteredQuality}
              onSelectRecord={onSelectRecord}
              onOpenImageModal={onOpenImageModal}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
