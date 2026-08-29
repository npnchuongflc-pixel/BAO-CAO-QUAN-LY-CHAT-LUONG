import React, { useMemo } from 'react';
import { Calendar, CalendarDays, X, ArrowRight, RotateCcw } from 'lucide-react';
import { TeachingFilterState, TeachingAuditItem } from '../../types';

interface ScientificDateRangePickerProps {
  filters: TeachingFilterState;
  onFilterChange: (updates: Partial<TeachingFilterState>) => void;
  rawData?: TeachingAuditItem[];
  className?: string;
}

export const ScientificDateRangePicker: React.FC<ScientificDateRangePickerProps> = ({
  filters,
  onFilterChange,
  rawData,
  className = '',
}) => {
  const isCustomDate = Boolean(filters.startDate || filters.endDate);
  const isAll = !isCustomDate && filters.month === 'all';
  const isCurrentMonth = !isCustomDate && !isAll;

  // Calculate quick numbers for current month (08/2026)
  const currentMonthMetrics = useMemo(() => {
    if (!rawData || rawData.length === 0) return null;
    let count = 0;
    let viol = 0;
    rawData.forEach((item) => {
      if (item.month === '08/2026' || item.month === 'current') {
        const shifts = item.shiftCount || 1;
        count += shifts;
        if (item.result === 'Vi phạm') viol += shifts;
      }
    });
    return {
      total: count,
      violations: viol,
      passRate: count > 0 ? (((count - viol) / count) * 100).toFixed(1) : '100',
    };
  }, [rawData]);

  // Handle Quick Select: Current Month (Always default)
  const handleSelectCurrentMonth = () => {
    onFilterChange({
      month: '08/2026',
      startDate: undefined,
      endDate: undefined,
    });
  };

  // Handle Quick Select: All Time
  const handleSelectAll = () => {
    onFilterChange({
      month: 'all',
      startDate: undefined,
      endDate: undefined,
    });
  };

  // Handle Start Date Change
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value || undefined;
    onFilterChange({
      startDate: val,
      month: 'all',
    });
  };

  // Handle End Date Change
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value || undefined;
    onFilterChange({
      endDate: val,
      month: 'all',
    });
  };

  return (
    <div className={`inline-flex items-center flex-nowrap gap-2 whitespace-nowrap ${className}`}>
      {/* Quick Buttons: Tháng hiện tại & Toàn bộ */}
      <div className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-300 rounded-lg shadow-2xs shrink-0">
        <button
          type="button"
          onClick={handleSelectCurrentMonth}
          className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            isCurrentMonth
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
          title="Lọc dữ liệu tháng hiện tại (08/2026)"
        >
          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
          <span>Tháng hiện tại (08/2026)</span>
          {currentMonthMetrics && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                isCurrentMonth
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {currentMonthMetrics.total.toLocaleString('vi-VN')} ca
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={handleSelectAll}
          className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            isAll
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
          title="Xem toàn bộ dữ liệu (từ tháng 01 đến tháng 08)"
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span>Toàn bộ</span>
          {rawData && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ml-0.5 ${
                isAll
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {rawData.length.toLocaleString('vi-VN')} ca
            </span>
          )}
        </button>
      </div>

      {/* Date Range Inputs: Từ ngày -> Đến ngày */}
      <div className="inline-flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1 rounded-lg shadow-2xs shrink-0">
        <Calendar className={`w-3.5 h-3.5 shrink-0 ${isCustomDate ? 'text-blue-600' : 'text-slate-400'}`} />
        
        <div className="flex items-center gap-1 text-xs">
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={handleStartDateChange}
            placeholder="Từ ngày"
            className="w-[115px] sm:w-[125px] text-xs py-0.5 px-1 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-slate-800 font-medium"
            title="Từ ngày"
          />
          
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={handleEndDateChange}
            placeholder="Đến ngày"
            className="w-[115px] sm:w-[125px] text-xs py-0.5 px-1 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-slate-800 font-medium"
            title="Đến ngày"
          />
        </div>

        {/* Clear Date Filter Button if active -> returns to default current month */}
        {isCustomDate && (
          <button
            type="button"
            onClick={handleSelectCurrentMonth}
            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ml-0.5 shrink-0"
            title="Xóa bộ lọc ngày (quay về Tháng hiện tại)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
