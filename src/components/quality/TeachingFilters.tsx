import React from 'react';
import {
  Filter,
  Search,
  RotateCcw,
  Download,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Calendar,
  Building,
  UserCheck,
  Award
} from 'lucide-react';
import { ScientificDateRangePicker } from './ScientificDateRangePicker';
import { TeachingFilterState } from '../../types';

interface TeachingFiltersProps {
  filters: TeachingFilterState;
  onFilterChange: (newFilters: Partial<TeachingFilterState>) => void;
  onResetFilters: () => void;
  onExportCsv: () => void;
  availableMonths: string[];
  availableFacilities: string[];
  availableEvaluators: string[];
  totalFilteredCount: number;
  totalRawCount: number;
  isLoading: boolean;
  onRefresh: () => void;
}

export const TeachingFilters: React.FC<TeachingFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  onExportCsv,
  availableMonths,
  availableFacilities,
  availableEvaluators,
  totalFilteredCount,
  totalRawCount,
  isLoading,
  onRefresh,
}) => {
  return (
    <div className="card panel p-4 mb-6 border border-slate-200/80 shadow-sm bg-white">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Bộ Lọc &amp; Phân Tích Đa Chiều</h3>
            <p className="text-[11px] text-slate-500">
              Đang hiển thị <strong>{totalFilteredCount.toLocaleString('vi-VN')}</strong> / {totalRawCount.toLocaleString('vi-VN')} ca đánh giá
            </p>
          </div>
        </div>

        {/* Quick Subject Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              filters.subject === 'all'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => onFilterChange({ subject: 'all' })}
          >
            Tất cả Môn
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
              filters.subject === 'Cờ'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => onFilterChange({ subject: 'Cờ' })}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
            Cờ Vua
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
              filters.subject === 'Vẽ'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => onFilterChange({ subject: 'Vẽ' })}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-300" />
            Mỹ Thuật
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Làm mới dữ liệu từ Google Sheets"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors"
            title="Xuất bảng dữ liệu hiện tại sang tệp Excel / CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất Excel/CSV
          </button>

          <button
            type="button"
            onClick={onResetFilters}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Đặt lại tất cả bộ lọc về mặc định"
          >
            Đặt lại
          </button>
        </div>
      </div>

      {/* Filter Controls Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3">
        {/* Scientific Date Range Selector */}
        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-blue-600" />
            Thời gian đánh giá
          </label>
          <ScientificDateRangePicker
            filters={filters}
            onFilterChange={onFilterChange}
            className="w-full"
          />
        </div>

        {/* Facility Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <Building className="w-3 h-3 text-slate-400" />
            Cơ sở ({availableFacilities.length})
          </label>
          <select
            value={filters.facility}
            onChange={(e) => onFilterChange({ facility: e.target.value })}
            className="w-full text-xs py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 truncate"
          >
            <option value="all">Tất cả cơ sở ({availableFacilities.length})</option>
            {availableFacilities.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Teacher Rank Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <Award className="w-3 h-3 text-slate-400" />
            Bậc Giáo viên
          </label>
          <select
            value={filters.teacherRank}
            onChange={(e) => onFilterChange({ teacherRank: e.target.value })}
            className="w-full text-xs py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
          >
            <option value="all">Tất cả bậc GV</option>
            <option value="Bậc 01">Bậc 01</option>
            <option value="Bậc 02">Bậc 02</option>
            <option value="Bậc 03">Bậc 03</option>
          </select>
        </div>

        {/* Audit Result Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-slate-400" />
            Kết quả ca dạy
          </label>
          <select
            value={filters.result}
            onChange={(e) => onFilterChange({ result: e.target.value })}
            className="w-full text-xs py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
          >
            <option value="all">Tất cả kết quả</option>
            <option value="Tốt">Tốt (Đạt chuẩn)</option>
            <option value="Vi phạm">Có vi phạm</option>
          </select>
        </div>

        {/* Violation Status */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-slate-400" />
            Trạng thái xử lý
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="w-full text-xs py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Đã xử lý">Đã xử lý</option>
            <option value="Chưa xử lý">Chưa xử lý (Tồn đọng)</option>
            <option value="Xác nhận lại">Xác nhận lại</option>
            <option value="Không vi phạm">Không vi phạm</option>
          </select>
        </div>

        {/* Evaluator Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-slate-400" />
            Người đánh giá
          </label>
          <select
            value={filters.evaluator}
            onChange={(e) => onFilterChange({ evaluator: e.target.value })}
            className="w-full text-xs py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 truncate"
          >
            <option value="all">Tất cả CTV / Giám sát</option>
            {availableEvaluators.map((ev) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Search & Toggle Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100">
        {/* Search Teacher Input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên giáo viên (Ví dụ: Lê Hoàng Minh Khôi, Bùi Thúy Vy...)..."
            value={filters.searchTeacher}
            onChange={(e) => onFilterChange({ searchTeacher: e.target.value })}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
          />
          {filters.searchTeacher && (
            <button
              type="button"
              onClick={() => onFilterChange({ searchTeacher: '' })}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Fast Toggles */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onFilterChange({ onlyViolations: !filters.onlyViolations })}
            className={`px-3 py-1 text-xs rounded-lg font-medium flex items-center gap-1.5 transition-all border ${
              filters.onlyViolations
                ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${filters.onlyViolations ? 'text-amber-600' : 'text-slate-400'}`} />
            Chỉ xem ca Vi Phạm
          </button>

          <button
            type="button"
            onClick={() => onFilterChange({ onlySevere: !filters.onlySevere })}
            className={`px-3 py-1 text-xs rounded-lg font-medium flex items-center gap-1.5 transition-all border ${
              filters.onlySevere
                ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${filters.onlySevere ? 'text-rose-600' : 'text-slate-400'}`} />
            Tình huống Nghiêm Trọng
          </button>
        </div>
      </div>
    </div>
  );
};
