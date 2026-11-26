import React from 'react';
import { FilterState } from '../types';
import { formatDateInput } from '../services/sheetService';
import { Filter, RotateCcw } from 'lucide-react';

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  onPreset: (preset: 'month' | '30' | '90' | 'year') => void;
  onReset: () => void;
  facilities: string[];
  subjects: string[];
  courses: string[];
}

function getActivePreset(start: string, end: string): 'month' | '30' | '90' | 'year' | null {
  const now = new Date();
  const monthStart = formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  if (start === monthStart && end === monthEnd) return 'month';

  const today = formatDateInput(now);
  if (end !== today) return null;

  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 29);
  if (start === formatDateInput(d30)) return '30';

  const d90 = new Date(now);
  d90.setDate(d90.getDate() - 89);
  if (start === formatDateInput(d90)) return '90';

  const ytd = new Date(now.getFullYear(), 0, 1);
  if (start === formatDateInput(ytd)) return 'year';

  return null;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  onPreset,
  onReset,
  facilities,
  subjects,
  courses
}) => {
  const activePreset = getActivePreset(filters.start, filters.end);

  // Ưu tiên hiển thị Giữa khóa / Cuối khóa chuẩn xác
  const surveyTypeOptions = React.useMemo(() => {
    const base = ['Giữa khóa', 'Cuối khóa'];
    const extras = courses.filter((c) => c && !base.includes(c));
    const availableBase = base.filter((b) => courses.length === 0 || courses.includes(b));
    return [...availableBase, ...extras];
  }, [courses]);

  const presetItems: Array<{ id: 'month' | '30' | '90' | 'year'; label: string }> = [
    { id: 'month', label: 'Tháng hiện tại' },
    { id: '30', label: '30 ngày' },
    { id: '90', label: '90 ngày' },
    { id: 'year', label: 'Từ đầu năm' }
  ];

  return (
    <section
      className="mx-[var(--page-gutter)] mb-5 rounded-2xl border border-[#DCE6ED] bg-white overflow-hidden"
      aria-label="Bộ lọc báo cáo Zalo OA"
    >
      <div className="h-[3px] w-full bg-[#1B5EA6]" />

      <div className="px-4 py-3.5 sm:px-5 border-b border-[#E7EEF3] bg-[#F8FBFD] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1B5EA6] text-white flex items-center justify-center shrink-0">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1B5EA6]">
              PHẠM VI BÁO CÁO ĐỒNG BỘ
            </span>
            <strong className="text-[15px] font-extrabold text-[#1A3A5C] tracking-tight">
              Bộ lọc dữ liệu Zalo OA
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#647D90] mr-1">
            Khoảng nhanh:
          </span>
          {presetItems.map((item) => {
            const isActive = activePreset === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPreset(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#1B5EA6] text-white border-[#1B5EA6]'
                    : 'bg-white text-[#1A3A5C] border-[#DCE6ED] hover:border-[#3EA8E0] hover:text-[#1B5EA6]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#647D90]">
            Từ ngày
          </span>
          <input
            type="date"
            value={filters.start}
            onChange={(e) => onFilterChange({ start: e.target.value })}
            className="h-10 px-3 rounded-lg border border-[#DCE6ED] bg-white text-sm font-semibold text-[#1A3A5C] tabular-nums focus:outline-none focus:border-[#3EA8E0]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#647D90]">
            Đến ngày
          </span>
          <input
            type="date"
            value={filters.end}
            onChange={(e) => onFilterChange({ end: e.target.value })}
            className="h-10 px-3 rounded-lg border border-[#DCE6ED] bg-white text-sm font-semibold text-[#1A3A5C] tabular-nums focus:outline-none focus:border-[#3EA8E0]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#647D90]">
            Cơ sở
          </span>
          <select
            value={filters.facility}
            onChange={(e) => onFilterChange({ facility: e.target.value })}
            className="h-10 px-3 rounded-lg border border-[#DCE6ED] bg-white text-sm font-semibold text-[#1A3A5C] focus:outline-none focus:border-[#3EA8E0]"
          >
            <option value="Tất cả">Tất cả cơ sở</option>
            {facilities.map((fac) => (
              <option key={fac} value={fac}>
                {fac}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#647D90]">
            Môn học
          </span>
          <select
            value={filters.subject}
            onChange={(e) => onFilterChange({ subject: e.target.value })}
            className="h-10 px-3 rounded-lg border border-[#DCE6ED] bg-white text-sm font-semibold text-[#1A3A5C] focus:outline-none focus:border-[#3EA8E0]"
          >
            <option value="Tất cả">Tất cả môn học</option>
            {subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#647D90]">
            Loại khảo sát
          </span>
          <select
            value={filters.course}
            onChange={(e) => onFilterChange({ course: e.target.value })}
            className="h-10 px-3 rounded-lg border border-[#DCE6ED] bg-white text-sm font-semibold text-[#1A3A5C] focus:outline-none focus:border-[#3EA8E0]"
          >
            <option value="Tất cả">Giữa khóa &amp; Cuối khóa</option>
            {surveyTypeOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={onReset}
          className="h-10 px-4 rounded-lg bg-[#1A3A5C] hover:bg-[#1B5EA6] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          title="Đặt lại về mặc định tháng hiện tại"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Mặc định tháng</span>
        </button>
      </div>
    </section>
  );
};
