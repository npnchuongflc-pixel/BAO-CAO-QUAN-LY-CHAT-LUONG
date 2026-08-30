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
      <div className="filter-panel__header">
        <div className="filter-panel__title">
          <span className="filter-panel__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
          </span>
          <div>
            <span>PHẠM VI BÁO CÁO</span>
            <strong>Bộ lọc dữ liệu</strong>
          </div>
        </div>

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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v6h6" />
          </svg>
          Xóa lọc
        </button>
      </div>
    </section>
  );
};
