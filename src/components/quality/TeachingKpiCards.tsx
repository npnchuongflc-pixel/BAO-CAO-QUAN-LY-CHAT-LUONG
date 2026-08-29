import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Users,
  Building,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Clock
} from 'lucide-react';
import { TeachingQualitySummary } from '../../types';

interface TeachingKpiCardsProps {
  summary: TeachingQualitySummary;
  onSelectViolationFilter?: () => void;
  onSelectSevereFilter?: () => void;
}

export const TeachingKpiCards: React.FC<TeachingKpiCardsProps> = ({
  summary,
  onSelectViolationFilter,
  onSelectSevereFilter,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {/* 1. Total Shifts Audited */}
      <div className="card stat-card border-t-4 border-t-blue-500 hover:shadow-md transition-shadow">
        <div className="stat-label flex items-center justify-between text-slate-600">
          <span>Tổng Số Ca Đánh Giá</span>
          <GraduationCap className="w-4 h-4 text-blue-500" />
        </div>
        <div className="stat-value text-blue-700 text-xl sm:text-2xl font-black mt-1">
          {summary.totalShifts.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-500">ca</span>
        </div>
        <div className="stat-sub text-[11px] text-slate-500 mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{summary.totalAudits.toLocaleString('vi-VN')} lượt kiểm định</span>
        </div>
      </div>

      {/* 2. Compliance Rate */}
      <div className="card stat-card border-t-4 border-t-emerald-500 hover:shadow-md transition-shadow">
        <div className="stat-label flex items-center justify-between text-slate-600">
          <span>Tỷ Lệ Đạt Chuẩn</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="stat-value text-emerald-700 text-xl sm:text-2xl font-black mt-1">
          {summary.complianceRate}%
        </div>
        <div className="stat-sub text-[11px] text-emerald-600 font-semibold mt-1">
          {summary.goodShifts.toLocaleString('vi-VN')} ca hoàn thành tốt
        </div>
      </div>

      {/* 3. Violation Shifts */}
      <div
        className="card stat-card border-t-4 border-t-amber-500 hover:shadow-md transition-shadow cursor-pointer"
        onClick={onSelectViolationFilter}
        title="Nhấp để lọc danh sách ca vi phạm"
      >
        <div className="stat-label flex items-center justify-between text-slate-600">
          <span>Số Ca Vi Phạm</span>
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        </div>
        <div className="stat-value text-amber-700 text-xl sm:text-2xl font-black mt-1">
          {summary.violationShifts.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-amber-600">ca</span>
        </div>
        <div className="stat-sub text-[11px] text-amber-700 font-medium mt-1">
          Tỷ lệ vi phạm: <strong>{summary.violationRate}%</strong>
        </div>
      </div>

      {/* 4. Severe Incidents */}
      <div
        className="card stat-card border-t-4 border-t-rose-500 hover:shadow-md transition-shadow cursor-pointer"
        onClick={onSelectSevereFilter}
        title="Nhấp để lọc các ca có tình huống nghiêm trọng"
      >
        <div className="stat-label flex items-center justify-between text-slate-600">
          <span>Sự Cố Nghiêm Trọng</span>
          <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
        </div>
        <div className="stat-value text-rose-700 text-xl sm:text-2xl font-black mt-1">
          {summary.severeCount} <span className="text-xs font-semibold text-rose-500">vụ việc</span>
        </div>
        <div className="stat-sub text-[11px] text-rose-600 font-semibold mt-1">
          {summary.severeCount > 0 ? 'Cần ban GĐ chỉ đạo' : 'Không có sự cố'}
        </div>
      </div>

      {/* 5. Handled / Resolution Rate */}
      <div className="card stat-card border-t-4 border-t-indigo-500 hover:shadow-md transition-shadow">
        <div className="stat-label flex items-center justify-between text-slate-600">
          <span>Tỷ Lệ Đã Xử Lý SLA</span>
          <ShieldCheck className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="stat-value text-indigo-700 text-xl sm:text-2xl font-black mt-1">
          {summary.handledRate}%
        </div>
        <div className="stat-sub text-[11px] text-slate-500 mt-1">
          Đã xong {summary.handledCount} • Còn {summary.pendingCount} ca
        </div>
      </div>

      {/* 6. Active Teachers & Centers */}
      <div className="card stat-card border-t-4 border-t-purple-500 hover:shadow-md transition-shadow">
        <div className="stat-label flex items-center justify-between text-slate-600">
          <span>Quy Mô Giám Sát</span>
          <Users className="w-4 h-4 text-purple-500" />
        </div>
        <div className="stat-value text-purple-700 text-xl sm:text-2xl font-black mt-1">
          {summary.uniqueTeachers} <span className="text-xs font-semibold text-slate-500">GV</span>
        </div>
        <div className="stat-sub text-[11px] text-slate-500 mt-1 flex items-center gap-1">
          <Building className="w-3 h-3 text-slate-400" />
          <span>Tại {summary.uniqueFacilities} cơ sở hệ thống</span>
        </div>
      </div>
    </div>
  );
};
