import React from 'react';
import { FilterState } from '../types';

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  onPreset: (preset: 'month' | '30' | '90' | 'year') => void;
  onReset: () => void;
  facilities: string[];
  subjects: string[];
  courses: string[];
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
  return (
    <section className="filter-panel" aria-label="Bộ lọc báo cáo">
      <div className="preset-row">
        <span>Khoảng nhanh</span>
        <button type="button" onClick={() => onPreset('month')}>
          Tháng hiện tại
        </button>
        <button type="button" onClick={() => onPreset('30')}>
          30 ngày
        </button>
        <button type="button" onClick={() => onPreset('90')}>
          90 ngày
        </button>
        <button type="button" onClick={() => onPreset('year')}>
          Từ đầu năm
        </button>
      </div>

      <div className="filters">
        <label>
          Từ ngày
          <input
            type="date"
            value={filters.start}
            onChange={(e) => onFilterChange({ start: e.target.value })}
          />
        </label>

        <label>
          Đến ngày
          <input
            type="date"
            value={filters.end}
            onChange={(e) => onFilterChange({ end: e.target.value })}
          />
        </label>

        <label>
          Cơ sở
          <select
            value={filters.facility}
            onChange={(e) => onFilterChange({ facility: e.target.value })}
          >
            <option value="Tất cả">Tất cả</option>
            {facilities.map((fac) => (
              <option key={fac} value={fac}>
                {fac}
              </option>
            ))}
          </select>
        </label>

        <label>
          Môn học
          <select
            value={filters.subject}
            onChange={(e) => onFilterChange({ subject: e.target.value })}
          >
            <option value="Tất cả">Tất cả</option>
            {subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </label>

        <label>
          Khóa học
          <select
            value={filters.course}
            onChange={(e) => onFilterChange({ course: e.target.value })}
          >
            <option value="Tất cả">Tất cả</option>
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="reset-button" onClick={onReset}>
          Xóa lọc
        </button>
      </div>
    </section>
  );
};
