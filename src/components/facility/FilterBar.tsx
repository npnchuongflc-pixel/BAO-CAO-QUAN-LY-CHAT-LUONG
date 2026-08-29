import React from 'react';
import { FilterState, ReportMode } from './facilityTypes';
import { CustomSelect } from './CustomSelect';
import { 
  Search, 
  Calendar, 
  Building2, 
  MapPin, 
  Filter, 
  X, 
  Download 
} from 'lucide-react';

interface FilterBarProps {
  mode: ReportMode;
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  availableMonths: string[];
  availableFacilities: string[];
  availableAreas: string[];
  onExportCSV: () => void;
  totalFilteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  mode,
  filters,
  onFilterChange,
  availableMonths,
  availableFacilities,
  availableAreas,
  onExportCSV,
  totalFilteredCount,
}) => {
  const hasActiveFilters = 
    filters.thang !== 'all' || 
    Boolean(filters.tuNgay) ||
    Boolean(filters.denNgay) ||
    filters.coSo !== 'all' || 
    filters.khuVuc !== 'all' || 
    filters.trangThai !== 'all' || 
    filters.searchQuery.trim() !== '';

  const handleReset = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const lastDayStr = String(lastDay).padStart(2, '0');

    onFilterChange({
      thang: 'all',
      tuNgay: `${year}-${month}-01`,
      denNgay: `${year}-${month}-${lastDayStr}`,
      coSo: 'all',
      khuVuc: 'all',
      trangThai: 'all',
      searchQuery: '',
    });
  };

  const statusOptions = mode === 'hygiene' 
    ? [
        { value: 'all', label: 'Tất cả mức độ' },
        { value: 'muc_1', label: 'Mức 1 - Xuất sắc (≥ 90 điểm)' },
        { value: 'muc_2', label: 'Mức 2 - Khá (80 - 89 điểm)' },
        { value: 'muc_3', label: 'Mức 3 - Trung bình (70 - 79 điểm)' },
        { value: 'muc_4', label: 'Mức 4 - Cần cải thiện (< 70 điểm)' },
      ]
    : [
        { value: 'all', label: 'Tất cả mức độ' },
        { value: 'Bình thường', label: 'Mức độ: Bình thường' },
        { value: 'Cần chú ý', label: 'Mức độ: Cần chú ý' },
        { value: 'Nghiêm trọng', label: 'Mức độ: Nghiêm trọng' },
        { value: 'Khẩn cấp', label: 'Mức độ: Khẩn cấp' },
        { value: 'Chờ tiếp nhận', label: 'Trạng thái: Chờ tiếp nhận' },
        { value: 'Đang xử lý', label: 'Trạng thái: Đang xử lý' },
        { value: 'Đã xử lý', label: 'Trạng thái: Đã xử lý' },
      ];

  // Harmonized Area Categories matching exact chart & facility targets
  const areaOptions = [
    { value: 'all', label: 'Tất cả khu vực' },
    { value: 'cat_phong_co', label: '♟️ Phòng cờ - Tổng thể' },
    { value: 'cat_may_lanh_co', label: '❄️ Phòng cờ - Máy lạnh' },
    { value: 'cat_wc_co', label: '🚽 Phòng cờ - Nhà vệ sinh' },
    { value: 'cat_phong_ve', label: '🎨 Phòng vẽ - Tổng thể' },
    { value: 'cat_may_lanh_ve', label: '❄️ Phòng vẽ - Máy lạnh' },
    { value: 'cat_wc_ve', label: '🚽 Phòng vẽ - Nhà vệ sinh' },
    { value: 'cat_le_tan', label: '🛎️ Quầy lễ tân - Vệ sinh' },
    { value: 'cat_nvs', label: '🚽 Tất cả Nhà vệ sinh / WC' },
    { value: 'cat_may_lanh', label: '❄️ Tất cả Máy lạnh' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Bộ Lọc Báo Cáo & Tìm Kiếm
          </h2>
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium">
            {totalFilteredCount} kết quả
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-medium text-emerald-700 transition-colors"
            title="Xuất danh sách đã lọc ra CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất File CSV</span>
          </button>

          {/* Clear button */}
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs font-medium text-rose-600 border border-rose-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
        {/* 1. Từ Ngày */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Từ ngày
          </label>
          <input
            type="date"
            value={filters.tuNgay || ''}
            onChange={(e) => onFilterChange({ ...filters, tuNgay: e.target.value })}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
          />
        </div>

        {/* 2. Đến Ngày */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Đến ngày
          </label>
          <input
            type="date"
            value={filters.denNgay || ''}
            onChange={(e) => onFilterChange({ ...filters, denNgay: e.target.value })}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
          />
        </div>

        {/* 4. Lọc Cơ Sở */}
        <CustomSelect
          label="Cơ sở kiểm tra"
          icon={<Building2 className="w-3.5 h-3.5 text-teal-600" />}
          value={filters.coSo}
          onChange={(val) => onFilterChange({ ...filters, coSo: val })}
          options={[
            { value: 'all', label: 'Tất cả cơ sở' },
            ...availableFacilities.map((f) => ({ value: f, label: f })),
          ]}
        />

        {/* 5. Lọc Khu Vực */}
        <CustomSelect
          label="Khu vực"
          icon={<MapPin className="w-3.5 h-3.5 text-amber-500" />}
          value={filters.khuVuc}
          onChange={(val) => onFilterChange({ ...filters, khuVuc: val })}
          options={areaOptions}
        />

        {/* 6. Lọc Mức độ */}
        <CustomSelect
          label={mode === 'hygiene' ? 'Mức độ' : 'Mức độ & Xử lý'}
          icon={<Filter className="w-3.5 h-3.5 text-emerald-500" />}
          value={filters.trangThai}
          onChange={(val) => onFilterChange({ ...filters, trangThai: val })}
          options={statusOptions}
        />

        {/* 7. Tìm kiếm Từ khóa */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            Tìm từ khóa
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Chi tiết, tên..."
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg pl-7 pr-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            {filters.searchQuery && (
              <button
                onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
