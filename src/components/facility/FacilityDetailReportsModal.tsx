import React, { useMemo } from 'react';
import { HygieneReport, FacilityQualityReport, ReportMode, FilterState } from './facilityTypes';
import { DetailTable } from './DetailTable';
import { FacilityTimelineChart } from './FacilityTimelineChart';
import { getFacilityDayTargetConfig, calculatePeriodTarget, normalizeFacilityName } from '../../utils/facilityUtils';
import { X, Building2, FileText, BarChart3, Printer } from 'lucide-react';
import { triggerPrintToPdf } from '../../utils/printUtils';
import { PrintReportHeader } from '../PrintReportHeader';
import { PrintReportFooter } from '../PrintReportFooter';

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

  const targetConfig = useMemo(() => {
    return getFacilityDayTargetConfig(facilityName);
  }, [facilityName]);

  const targetTotalPeriod = useMemo(() => {
    return calculatePeriodTarget(facilityName, filters.tuNgay, filters.denNgay, filters.thang);
  }, [facilityName, filters.tuNgay, filters.denNgay, filters.thang]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in overflow-y-auto print:static print:inset-auto print:bg-transparent print:p-0 print:m-0 print:overflow-visible"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl text-slate-800 overflow-hidden my-auto print:w-full print:max-w-none print:shadow-none print:border-none print:rounded-none print:max-h-none print:overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 print:hidden">
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
                {facilityName !== 'all' && targetConfig && (
                  <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full font-mono">
                    {targetConfig.weekday === targetConfig.weekend
                      ? `Quy định: ${targetConfig.weekday} ảnh/ngày`
                      : `T2-T6: ${targetConfig.weekday} ảnh • T7-CN: ${targetConfig.weekend} ảnh`}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Biểu đồ thực hiện theo thời gian & Danh sách báo cáo chi tiết</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            {/* Print PDF Button */}
            <button
              type="button"
              onClick={() => {
                const facTitle = facilityName === 'all' ? 'Tat_Ca_Co_So' : facilityName.replace(/\s+/g, '_');
                triggerPrintToPdf({ title: `Bao_Cao_${facTitle}` });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 border border-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer shadow-2xs"
              title="In chi tiết cơ sở này ra file PDF (Khổ ngang A4)"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">In PDF (A4)</span>
            </button>

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
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-50/60 space-y-6 print:p-0 print:bg-white print:overflow-visible print:space-y-0">
          {/* MODAL PAGE 1: HEADER & TIMELINE CHART */}
          <div className="facility-modal-print-page-1">
            <PrintReportHeader
              title={facilityName === 'all' ? 'BÁO CÁO TOÀN DIỆN CÁC CƠ SỞ' : `BÁO CÁO CHI TIẾT CƠ SỞ: ${facilityName.toUpperCase()}`}
              subtitle={`Hệ thống quản lý chất lượng cơ sở • ${targetConfig ? (targetConfig.weekday === targetConfig.weekend ? `Quy định ${targetConfig.weekday} ảnh/ngày` : `Quy định: T2-T6: ${targetConfig.weekday} ảnh • T7-CN: ${targetConfig.weekend} ảnh`) : ''}`}
              pageNumber="Trang 1/2"
              dateRange={
                filters.tuNgay && filters.denNgay
                  ? `Từ ngày ${filters.tuNgay} đến ${filters.denNgay}`
                  : filters.thang !== 'all'
                  ? `Tháng ${filters.thang}`
                  : 'Toàn thời gian'
              }
            />

            {/* Facility Timeline Execution Chart */}
            <div className="mb-4 print:mb-0">
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
          </div>

          {/* MODAL PAGE 2: DETAILED LOGS TABLE & SIGNATURE FOOTER */}
          <div className="facility-modal-print-page-2">
            {/* Header Trang 2 chuyên dụng cho Modal khi in */}
            <div className="hidden print:block mb-2 pb-1.5 border-b border-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                  DANH SÁCH NHẬT KÝ KIỂM TRA &amp; ĐÁNH GIÁ CHI TIẾT - {facilityName.toUpperCase()}
                </span>
                <span className="text-[9.5px] font-bold text-slate-700">Trang 2/2</span>
              </div>
            </div>

            {/* Detailed Reports Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 text-slate-800 shadow-2xs print:shadow-none print:border-none print:p-0 print:rounded-none">
              <div className="mb-3 px-2 flex items-center justify-between print:hidden">
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

            {/* Print only footer */}
            <div className="hidden print:block mt-3">
              <PrintReportFooter />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
