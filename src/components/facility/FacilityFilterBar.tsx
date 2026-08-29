import React from 'react';
import {
  Calendar,
  Building2,
  MapPin,
  CheckCircle2,
  Search,
  Download,
  RotateCcw,
  SlidersHorizontal,
  Filter
} from 'lucide-react';
import { ReportMode, FacilityFilterState } from './facilityTypes';

interface FacilityFilterBarProps {
  mode: ReportMode;
  filters: FacilityFilterState;
  onFilterChange: React.Dispatch<React.SetStateAction<FacilityFilterState>>;
  availableMonths: string[];
  availableFacilities: string[];
  availableAreas: string[];
  onExportCSV: () => void;
  totalFilteredCount: number;
}

export const FacilityFilterBar: React.FC<FacilityFilterBarProps> = ({
  mode,
  filters,
  onFilterChange,
  availableMonths,
  availableFacilities,
  availableAreas,
  onExportCSV,
  totalFilteredCount
}) => {
  const resetFilters = () => {
    onFilterChange({
      thang: 'all',
      tuNgay: '',
      denNgay: '',
      coSo: 'all',
      khuVuc: 'all',
      trangThai: 'all',
      searchQuery: '',
    });
  };

  const hasActiveFilters =
    filters.thang !== 'all' ||
    filters.tuNgay !== '' ||
    filters.denNgay !== '' ||
    filters.coSo !== 'all' ||
    filters.khuVuc !== 'all' ||
    filters.trangThai !== 'all' ||
    filters.searchQuery !== '';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 mb-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
            <SlidersHorizontal className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Bộ Lọc Dữ Liệu
          </span>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            Hiển thị: <strong>{totalFilteredCount}</strong> bản ghi
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportCSV}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Filter: Tháng */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tháng</label>
          <select
            value={filters.thang}
            onChange={(e) => onFilterChange((prev) => ({ ...prev, thang: e.target.value }))}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Tất cả các tháng</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Filter: Cơ sở */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Cơ sở</label>
          <select
            value={filters.coSo}
            onChange={(e) => onFilterChange((prev) => ({ ...prev, coSo: e.target.value }))}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Tất cả 19 cơ sở</option>
            {availableFacilities.map((fac) => (
              <option key={fac} value={fac}>
                {fac}
              </option>
            ))}
          </select>
        </div>

        {/* Filter: Khu vực */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Khu vực kiểm tra</label>
          <select
            value={filters.khuVuc}
            onChange={(e) => onFilterChange((prev) => ({ ...prev, khuVuc: e.target.value }))}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Tất cả khu vực</option>
            <option value="cat_phong_co">Phòng học Cờ</option>
            <option value="cat_phong_ve">Phòng học Vẽ</option>
            <option value="cat_le_tan">Sảnh Lễ Tân / Tiếp Đón</option>
            <option value="cat_nvs">Nhà Vệ Sinh (WC)</option>
            <option value="cat_may_lanh">Máy Lạnh / Thiết Bị</option>
            {availableAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        {/* Filter: Trạng thái */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Trạng thái / Đánh giá</label>
          <select
            value={filters.trangThai}
            onChange={(e) => onFilterChange((prev) => ({ ...prev, trangThai: e.target.value }))}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Tất cả trạng thái</option>
            {mode === 'hygiene' ? (
              <>
                <option value="muc_1">Xuất sắc (&ge; 90đ)</option>
                <option value="muc_2">Tốt / Khá (80 - 89đ)</option>
                <option value="muc_3">Trung bình (70 - 79đ)</option>
                <option value="muc_4">Không đạt / Cần khắc phục (&lt; 70đ)</option>
              </>
            ) : (
              <>
                <option value="Đã xử lý">Đã xử lý</option>
                <option value="Đang xử lý">Đang xử lý</option>
                <option value="Chờ tiếp nhận">Chờ tiếp nhận</option>
                <option value="Khẩn cấp">Mức độ: Khẩn cấp</option>
                <option value="Nghiêm trọng">Mức độ: Nghiêm trọng</option>
              </>
            )}
          </select>
        </div>

        {/* Filter: Từ ngày - Đến ngày */}
        <div className="sm:col-span-2 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Từ ngày</label>
            <input
              type="date"
              value={filters.tuNgay}
              onChange={(e) => onFilterChange((prev) => ({ ...prev, tuNgay: e.target.value }))}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Đến ngày</label>
            <input
              type="date"
              value={filters.denNgay}
              onChange={(e) => onFilterChange((prev) => ({ ...prev, denNgay: e.target.value }))}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Tìm kiếm theo tên cơ sở, người kiểm tra, khu vực, mô tả chi tiết hoặc đề xuất..."
          value={filters.searchQuery}
          onChange={(e) => onFilterChange((prev) => ({ ...prev, searchQuery: e.target.value }))}
          className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};
