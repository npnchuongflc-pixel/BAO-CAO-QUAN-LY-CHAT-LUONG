import React from 'react';
import { FilterOptions } from '../types/camera';
import { AVAILABLE_MONTHS, MIN_DATA_DATE, MAX_DATA_DATE } from '../data/cameraDataService';
import { RotateCcw, Calendar, Search, MapPin, User, AlertTriangle } from 'lucide-react';

interface FiltersBarProps {
  filters: FilterOptions;
  availableSites: string[];
  availableOwners: string[];
  availableStatuses: string[];
  onChange: (updated: Partial<FilterOptions>) => void;
  onCurrentMonth: () => void;
  onReset: () => void;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  filters,
  availableSites,
  availableOwners,
  availableStatuses,
  onChange,
  onCurrentMonth,
  onReset
}) => {
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      onChange({ periodMonth: 'custom' });
      return;
    }
    const found = AVAILABLE_MONTHS.find((m) => m.value === val);
    if (found) {
      onChange({
        periodMonth: val,
        dateFrom: found.from,
        dateTo: found.to
      });
    }
  };

  const handleDateChange = (type: 'from' | 'to', value: string) => {
    let nextFrom = type === 'from' ? value : filters.dateFrom;
    let nextTo = type === 'to' ? value : filters.dateTo;

    if (nextFrom > nextTo) {
      if (type === 'from') nextTo = nextFrom;
      else nextFrom = nextTo;
    }

    onChange({
      periodMonth: 'custom',
      dateFrom: nextFrom,
      dateTo: nextTo
    });
  };

  return (
    <section className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e2e8f2] shadow-[0_8px_30px_rgba(24,46,88,0.06)] mb-6 transition-all">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-3.5">
        {/* Period Dropdown */}
        <div className="flex flex-col">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#7f8aa0] mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-[#2f6bff]" />
            Thời gian
          </label>
          <select
            value={filters.periodMonth}
            onChange={handleMonthChange}
            className="w-full h-10 px-3 bg-white border border-[#e2e8f2] rounded-lg text-sm text-[#14213d] font-medium outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/10 transition-all cursor-pointer"
          >
            {AVAILABLE_MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
            <option value="custom">Khoảng ngày tùy chọn</option>
          </select>
        </div>

        {/* Date From */}
        <div className="flex flex-col">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#7f8aa0] mb-1.5">
            Từ ngày
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            min={MIN_DATA_DATE}
            max="2030-12-31"
            onChange={(e) => handleDateChange('from', e.target.value)}
            className="w-full h-10 px-3 bg-white border border-[#e2e8f2] rounded-lg text-sm text-[#14213d] font-medium outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/10 transition-all"
          />
        </div>

        {/* Date To */}
        <div className="flex flex-col">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#7f8aa0] mb-1.5">
            Đến ngày
          </label>
          <input
            type="date"
            value={filters.dateTo}
            min={MIN_DATA_DATE}
            max="2030-12-31"
            onChange={(e) => handleDateChange('to', e.target.value)}
            className="w-full h-10 px-3 bg-white border border-[#e2e8f2] rounded-lg text-sm text-[#14213d] font-medium outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/10 transition-all"
          />
        </div>

        {/* Quick Current Month Button */}
        <div className="flex flex-col justify-end">
          <button
            type="button"
            onClick={onCurrentMonth}
            className="w-full h-10 px-4 bg-[#2f6bff] hover:bg-[#2459d8] text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <Calendar className="w-4 h-4" />
            <span>Tháng hiện tại (09/2026)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-3.5 border-t border-[#edf1f7]">
        {/* Site Filter */}
        <div className="flex flex-col">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#7f8aa0] mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-[#19a78e]" />
            Cơ sở
          </label>
          <select
            value={filters.site}
            onChange={(e) => onChange({ site: e.target.value })}
            className="w-full h-10 px-3 bg-white border border-[#e2e8f2] rounded-lg text-sm text-[#14213d] font-medium outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/10 transition-all cursor-pointer"
          >
            <option value="all">Tất cả cơ sở</option>
            {availableSites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Owner Filter */}
        <div className="flex flex-col">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#7f8aa0] mb-1.5 flex items-center gap-1.5">
            <User className="w-3 h-3 text-[#f4a340]" />
            Người phụ trách
          </label>
          <select
            value={filters.owner}
            onChange={(e) => onChange({ owner: e.target.value })}
            className="w-full h-10 px-3 bg-white border border-[#e2e8f2] rounded-lg text-sm text-[#14213d] font-medium outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/10 transition-all cursor-pointer"
          >
            <option value="all">Tất cả người phụ trách</option>
            {availableOwners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex flex-col">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#7f8aa0] mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-[#e44d5e]" />
            Tình trạng
          </label>
          <select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value })}
            className="w-full h-10 px-3 bg-white border border-[#e2e8f2] rounded-lg text-sm text-[#14213d] font-medium outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/10 transition-all cursor-pointer"
          >
            <option value="all">Tất cả bất ổn</option>
            {availableStatuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Search & Reset */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8a96aa] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm mã camera..."
              value={filters.searchQuery}
              onChange={(e) => onChange({ searchQuery: e.target.value })}
              className="w-full h-10 pl-9 pr-3 bg-white border border-[#e2e8f2] rounded-lg text-sm text-[#14213d] font-medium placeholder-[#8a96aa] outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/10 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={onReset}
            title="Đặt lại bộ lọc"
            className="h-10 px-3.5 bg-[#edf2ff] hover:bg-[#dfe8ff] text-[#2459d8] text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đặt lại</span>
          </button>
        </div>
      </div>
    </section>
  );
};
