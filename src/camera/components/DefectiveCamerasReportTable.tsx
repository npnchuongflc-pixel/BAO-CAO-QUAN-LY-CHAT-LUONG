import React, { useState, useMemo } from 'react';
import { DefectiveCameraReport, CameraAggregate, InspectionDayInfo } from '../types/camera';
import { formatDateVN } from '../data/cameraDataService';
import {
  AlertOctagon,
  Search,
  Download,
  AlertTriangle,
  ZapOff,
  Activity,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  Filter,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';

interface DefectiveCamerasReportTableProps {
  defectiveList: DefectiveCameraReport[];
  cameraAggregates: CameraAggregate[];
  periodLabel: string;
  inspectionDate: string;
  inspectionDayInfo?: InspectionDayInfo;
  onInspectionDateChange: (date: string) => void;
  onSelectCamera: (cam: CameraAggregate) => void;
  onExportCSV: () => void;
  onViewLocation?: (data: { camera: string; site?: string; url: string }) => void;
}

export const DefectiveCamerasReportTable: React.FC<DefectiveCamerasReportTableProps> = ({
  defectiveList,
  cameraAggregates,
  inspectionDate,
  inspectionDayInfo,
  onInspectionDateChange,
  onSelectCamera,
  onExportCSV,
  onViewLocation
}) => {
  const [filterCondition, setFilterCondition] = useState<'all' | 'lost' | 'unstable'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState<string>('all');

  // Summary counts
  const totalDefective = defectiveList.length;
  const lostCount = defectiveList.filter((d) => d.currentStatus === 'Mất kết nối').length;
  const unstableCount = defectiveList.filter((d) => d.currentStatus === 'Chập chờn').length;
  const uniqueSites = Array.from(new Set(defectiveList.map((d) => d.site))).sort();

  // Filtered rows
  const filteredRows = useMemo(() => {
    return defectiveList.filter((item) => {
      // Condition filter
      if (filterCondition === 'lost' && item.currentStatus !== 'Mất kết nối') return false;
      if (filterCondition === 'unstable' && item.currentStatus !== 'Chập chờn') return false;

      // Site filter
      if (selectedSite !== 'all' && item.site !== selectedSite) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchCam = item.camera.toLowerCase().includes(q);
        const matchSite = item.site.toLowerCase().includes(q);
        const matchDiag = item.diagnostics.toLowerCase().includes(q);
        const matchOwner = item.owner.toLowerCase().includes(q);
        const matchAction = item.recommendedAction.toLowerCase().includes(q);
        if (!matchCam && !matchSite && !matchDiag && !matchOwner && !matchAction) return false;
      }

      return true;
    });
  }, [defectiveList, filterCondition, selectedSite, searchTerm]);

  const handleRowClick = (cameraCode: string) => {
    const found = cameraAggregates.find((c) => c.camera === cameraCode);
    if (found) {
      onSelectCamera(found);
    }
  };

  const latestDate = inspectionDayInfo?.latestAvailableDate || '2026-09-22';
  const hasRecords = inspectionDayInfo ? inspectionDayInfo.hasRecords : true;

  const quickDates = [
    { label: 'Hôm nay (22/09/2026)', date: '2026-09-22' },
    { label: 'Hôm qua (21/09/2026)', date: '2026-09-21' },
    { label: '20/09/2026', date: '2026-09-20' },
    { label: '19/09/2026', date: '2026-09-19' }
  ];

  return (
    <section className="bg-white border-2 border-red-200 rounded-2xl shadow-sm overflow-hidden mb-8">
      {/* Header & Quick Stats */}
      <header className="p-4 sm:p-5 bg-gradient-to-r from-[#fff5f5] via-[#fffbfb] to-white border-b border-[#fee2e2]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <span className="p-2.5 rounded-xl bg-red-600 text-white shadow-xs flex items-center justify-center flex-shrink-0">
              <AlertOctagon className="w-6 h-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#991b1b] m-0">
                  Báo Cáo Thống Kê Camera Đang Hư
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                  Ngày {formatDateVN(inspectionDate)}
                </span>
              </div>
              <p className="text-xs text-[#7f1d1d] font-normal m-0 mt-1">
                Chỉ lọc và hiển thị đúng các camera ghi nhận bị hư (Mất kết nối / Chập chờn) trong ngày{' '}
                <b className="font-bold text-red-900">{formatDateVN(inspectionDate)}</b>
              </p>
            </div>
          </div>

          {/* Date Picker & Quick Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-red-300 px-3 py-1.5 rounded-xl shadow-2xs">
              <Calendar className="w-4 h-4 text-red-600" />
              <span className="text-xs font-semibold text-[#1e293b]">Ngày kiểm tra:</span>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => e.target.value && onInspectionDateChange(e.target.value)}
                min="2026-03-01"
                max="2030-12-31"
                className="text-xs font-bold text-red-700 bg-transparent outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={onExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất CSV ({totalDefective} cam)</span>
            </button>
          </div>
        </div>

        {/* Quick Date Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-[#fee2e2]/70">
          <span className="text-[11px] font-semibold text-[#64748b] mr-1">Xem nhanh theo ngày:</span>
          {quickDates.map((q) => {
            const isActive = inspectionDate === q.date;
            return (
              <button
                key={q.date}
                type="button"
                onClick={() => onInspectionDateChange(q.date)}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-[#475569] hover:bg-red-50 hover:text-red-700 border border-[#e2e8f0]'
                }`}
              >
                {q.label}
              </button>
            );
          })}
        </div>

        {/* Warning when selected date has no data */}
        {!hasRecords && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-amber-900 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Ngày <b>{formatDateVN(inspectionDate)}</b> chưa có dữ liệu kiểm tra trong hệ thống. Dữ liệu thực tế mới nhất hiện có đến ngày <b>{formatDateVN(latestDate)}</b>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onInspectionDateChange(latestDate)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap"
            >
              Chuyển về ngày {formatDateVN(latestDate)}
            </button>
          </div>
        )}

        {/* 4 Summary Mini Stats for the selected date */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
          <div className="bg-white border border-[#fecaca] p-2.5 rounded-xl shadow-2xs">
            <div className="text-[11px] font-semibold text-[#991b1b] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              Tổng camera hư ngày {formatDateVN(inspectionDate)}
            </div>
            <div className="text-xl font-black text-[#7f1d1d] mt-0.5">{totalDefective} camera</div>
          </div>

          <div className="bg-white border border-[#fecaca] p-2.5 rounded-xl shadow-2xs">
            <div className="text-[11px] font-semibold text-[#b91c1c] flex items-center gap-1">
              <ZapOff className="w-3 h-3 text-[#dc2626]" />
              Mất kết nối hoàn toàn
            </div>
            <div className="text-xl font-black text-[#dc2626] mt-0.5">{lostCount} camera</div>
          </div>

          <div className="bg-white border border-[#fed7aa] p-2.5 rounded-xl shadow-2xs">
            <div className="text-[11px] font-semibold text-[#c2410c] flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#f97316]" />
              Đang chập chờn tín hiệu
            </div>
            <div className="text-xl font-black text-[#c2410c] mt-0.5">{unstableCount} camera</div>
          </div>

          <div className="bg-white border border-[#e2e8f0] p-2.5 rounded-xl shadow-2xs">
            <div className="text-[11px] font-semibold text-[#475569] flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#64748b]" />
              Cơ sở bị ảnh hưởng
            </div>
            <div className="text-xl font-black text-[#1e293b] mt-0.5">{uniqueSites.length} cơ sở</div>
          </div>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-[#fffbfb] border-b border-[#fee2e2] flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter Status */}
          <div className="inline-flex p-0.5 bg-white border border-[#fecaca] rounded-lg">
            <button
              onClick={() => setFilterCondition('all')}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                filterCondition === 'all'
                  ? 'bg-red-600 text-white'
                  : 'text-[#64748b] hover:text-[#991b1b]'
              }`}
            >
              Tất cả ({totalDefective})
            </button>
            <button
              onClick={() => setFilterCondition('lost')}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                filterCondition === 'lost'
                  ? 'bg-red-600 text-white'
                  : 'text-[#64748b] hover:text-[#991b1b]'
              }`}
            >
              Mất kết nối ({lostCount})
            </button>
            <button
              onClick={() => setFilterCondition('unstable')}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                filterCondition === 'unstable'
                  ? 'bg-[#ea580c] text-white'
                  : 'text-[#64748b] hover:text-[#ea580c]'
              }`}
            >
              Chập chờn ({unstableCount})
            </button>
          </div>

          {/* Site Filter dropdown */}
          <div className="flex items-center gap-1 bg-white border border-[#e2e8f0] px-2 py-1 rounded-lg">
            <Filter className="w-3 h-3 text-[#64748b]" />
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="bg-transparent outline-none text-xs font-medium text-[#334155] cursor-pointer"
            >
              <option value="all">Tất cả cơ sở</option>
              {uniqueSites.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm mã camera, cơ sở..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-7 pl-8 pr-2.5 text-xs bg-white border border-[#fecaca] rounded-lg outline-none focus:border-red-500 font-medium"
          />
        </div>
      </div>

      {/* Defective Cameras Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#fff1f2] text-[#9f1239] border-b border-[#fecdd3] font-bold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-4">Mã Camera & Cơ Sở</th>
              <th className="py-2.5 px-4">Vị Trí Lắp Đặt</th>
              <th className="py-2.5 px-4">Tình Trạng Hiện Trạng</th>
              <th className="py-2.5 px-4">Lần Bị / Gần Nhất</th>
              <th className="py-2.5 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#fee2e2]/60">
            {!hasRecords ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#8290a5]">
                  <Clock className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                  <p className="font-bold text-sm text-[#1e293b] mb-1">
                    Chưa có dữ liệu kiểm tra ngày {formatDateVN(inspectionDate)}
                  </p>
                  <p className="text-xs text-[#64748b] max-w-md mx-auto mb-3">
                    Hệ thống chưa ghi nhận lượt kiểm tra camera cho ngày này. Dữ liệu thực tế mới nhất hiện có trong hệ thống là ngày {formatDateVN(latestDate)}.
                  </p>
                  <button
                    type="button"
                    onClick={() => onInspectionDateChange(latestDate)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Xem ngày {formatDateVN(latestDate)} (ngày mới nhất có dữ liệu)</span>
                  </button>
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-[#8290a5]">
                  <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500 mb-1.5" />
                  <p className="font-bold text-xs text-[#1e293b] mb-0.5">
                    Không có camera nào bị hư trong ngày {formatDateVN(inspectionDate)}
                  </p>
                  <p className="text-xs text-[#64748b]">Tất cả camera đều hoạt động bình thường theo các bộ lọc đang chọn.</p>
                </td>
              </tr>
            ) : (
              filteredRows.map((item) => {
                const isLost = item.currentStatus === 'Mất kết nối';

                return (
                  <tr
                    key={item.camera}
                    onClick={() => handleRowClick(item.camera)}
                    className="hover:bg-[#fff9f9] transition-colors cursor-pointer group"
                  >
                    {/* Camera Code & Site */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#14213d] bg-white px-2 py-0.5 rounded border border-[#e2e8f0] group-hover:border-red-400">
                          {item.camera}
                        </span>
                        <div>
                          <b className="text-xs text-[#1e293b] block">{item.site}</b>
                          <span className="text-[10px] text-[#64748b]">Cơ sở CVSG</span>
                        </div>
                      </div>
                    </td>

                    {/* Location Link (Link mô tả vị trí) */}
                    <td className="py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {item.locationLink ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewLocation) {
                              onViewLocation({
                                camera: item.camera,
                                site: item.site,
                                url: item.locationLink!
                              });
                            } else {
                              window.open(item.locationLink, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          title="Bấm để xem trực tiếp ảnh vị trí lắp đặt camera trên web"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 transition-all shadow-2xs group/link cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-blue-500 group-hover/link:text-white flex-shrink-0" />
                          <span>Xem vị trí</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover/link:bg-white flex-shrink-0" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#94a3b8] italic">
                          Chưa có link
                        </span>
                      )}
                    </td>

                    {/* Current Condition */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                          isLost
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isLost ? 'bg-red-600 animate-ping' : 'bg-amber-500'
                          }`}
                        />
                        {item.currentStatus}
                      </span>
                    </td>

                    {/* Stats & Latest Date */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-xs text-red-700">
                        {item.totalIncidents} lần tái diễn
                      </div>
                      <div className="text-[10px] text-[#64748b]">
                        Gần nhất: <b className="text-[#334155]">{item.latestIssueDate}</b>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-600 hover:text-white hover:bg-red-600 rounded transition-colors cursor-pointer border border-red-200"
                      >
                        <span>Chi tiết</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <footer className="p-3 px-4 bg-[#fff8f8] border-t border-[#fee2e2] flex items-center justify-between text-xs text-[#7f1d1d]">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-red-500" />
          <span>
            Thời gian kiểm tra hiện trạng: <b>{formatDateVN(inspectionDate)}</b>
          </span>
        </div>
        <div className="font-semibold text-red-700">
          Hiển thị <b>{filteredRows.length}</b> / <b>{totalDefective}</b> camera hư trong ngày
        </div>
      </footer>
    </section>
  );
};
