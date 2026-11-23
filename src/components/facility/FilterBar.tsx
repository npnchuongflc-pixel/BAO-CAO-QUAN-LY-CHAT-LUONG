import React from 'react';
import { FilterState, ReportMode } from './facilityTypes';
import { CustomSelect } from './CustomSelect';
import { 
  Calendar, 
  Building2, 
  Filter
} from 'lucide-react';

interface FilterBarProps {
  mode: ReportMode;
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  availableMonths: string[];
  availableFacilities: string[];
  availableAreas: string[];
  onExportCSV?: () => void;
  totalFilteredCount: number;
  onOpenRepairReport?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  availableMonths,
  availableFacilities,
  totalFilteredCount,
}) => {
  const handleMonthChange = (thang: string) => {
    onFilterChange({
      ...filters,
      thang,
      tuNgay: '',
      denNgay: '',
      khuVuc: 'all',
      trangThai: 'all',
      searchQuery: '',
    });
  };

  const handleFacilityChange = (coSo: string) => {
    onFilterChange({
      ...filters,
      coSo,
      tuNgay: '',
      denNgay: '',
      khuVuc: 'all',
      trangThai: 'all',
      searchQuery: '',
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Bộ Lọc Báo Cáo
          </h2>
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium">
            {totalFilteredCount} kết quả
          </span>
        </div>
      </div>

      {/* Filter Controls Grid: Tháng & Cơ sở kiểm tra */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 max-w-2xl">
        <CustomSelect
          label="Tháng"
          icon={<Calendar className="w-3.5 h-3.5 text-blue-600" />}
          value={filters.thang}
          onChange={handleMonthChange}
          options={[
            { value: 'all', label: 'Tất cả các tháng' },
            ...availableMonths.map((m) => ({ value: m, label: m })),
          ]}
        />

        <CustomSelect
          label="Cơ sở kiểm tra"
          icon={<Building2 className="w-3.5 h-3.5 text-teal-600" />}
          value={filters.coSo}
          onChange={handleFacilityChange}
          options={[
            { value: 'all', label: 'Tất cả cơ sở' },
            ...availableFacilities.map((f) => ({ value: f, label: f })),
          ]}
        />
      </div>
    </div>
  );
};

