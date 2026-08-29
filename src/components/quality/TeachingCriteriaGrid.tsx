import React from 'react';
import {
  Shirt,
  Clock,
  Users,
  ArrowLeftRight,
  Smartphone,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import { CriteriaBreakdown } from '../../types';

interface TeachingCriteriaGridProps {
  criteria: CriteriaBreakdown[];
}

const CRITERIA_ICONS: Record<string, React.ReactNode> = {
  uniform: <Shirt className="w-4 h-4 text-blue-600" />,
  first15m: <Clock className="w-4 h-4 text-amber-600" />,
  classMgmt: <Users className="w-4 h-4 text-indigo-600" />,
  handover: <ArrowLeftRight className="w-4 h-4 text-purple-600" />,
  deviceUsage: <Smartphone className="w-4 h-4 text-rose-600" />,
  endShift: <CheckCircle className="w-4 h-4 text-emerald-600" />,
};

const CRITERIA_COLORS: Record<string, { bar: string; badge: string; border: string }> = {
  uniform: { bar: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200', border: 'border-blue-100' },
  first15m: { bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200', border: 'border-amber-100' },
  classMgmt: { bar: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', border: 'border-indigo-100' },
  handover: { bar: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-200', border: 'border-purple-100' },
  deviceUsage: { bar: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200', border: 'border-rose-100' },
  endShift: { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-emerald-100' },
};

export const TeachingCriteriaGrid: React.FC<TeachingCriteriaGridProps> = ({ criteria }) => {
  return (
    <div className="card panel p-5 mb-6 border border-slate-200/80 shadow-sm bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            Đánh Giá 6 Tiêu Chí Giảng Dạy &amp; Tác Phong Chuẩn Mực
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Bảng theo dõi tỷ lệ tuân thủ quy chuẩn sư phạm theo camera giám sát và dự giờ định kỳ
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
          Mục tiêu hệ thống: <strong>&ge; 98.0%</strong> tuân thủ
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {criteria.map((item) => {
          const icon = CRITERIA_ICONS[item.key] || <CheckCircle className="w-4 h-4 text-slate-600" />;
          const theme = CRITERIA_COLORS[item.key] || {
            bar: 'bg-blue-500',
            badge: 'bg-blue-50 text-blue-700 border-blue-200',
            border: 'border-slate-100'
          };
          const isWarning = item.complianceRate < 97.0;

          return (
            <div
              key={item.key}
              className={`p-4 rounded-xl border ${theme.border} bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white shadow-xs border border-slate-200">
                      {icon}
                    </div>
                    <span className="font-bold text-sm text-slate-800">{item.name}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                      isWarning
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {item.complianceRate}%
                  </span>
                </div>

                {/* Subtitle / Description */}
                <p className="text-[11px] text-slate-500 leading-snug mb-3 min-h-[32px]">
                  {item.description}
                </p>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 mb-2 overflow-hidden">
                  <div
                    className={`${theme.bar} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(item.complianceRate, 100)}%` }}
                  />
                </div>

                {/* Shift numbers */}
                <div className="flex justify-between items-center text-[11px] text-slate-600 mb-3">
                  <span>
                    Đạt tốt: <strong className="text-emerald-700">{item.goodCount.toLocaleString('vi-VN')}</strong>
                  </span>
                  <span>
                    Vi phạm: <strong className="text-rose-700">{item.violationCount.toLocaleString('vi-VN')}</strong>
                  </span>
                </div>
              </div>

              {/* Top Issues pill list */}
              {item.topIssues.length > 0 && (
                <div className="pt-2.5 border-t border-slate-200/60 mt-auto">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-slate-400" />
                    Lỗi thường gặp:
                  </div>
                  <div className="space-y-1">
                    {item.topIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] text-slate-700 flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-100"
                      >
                        <span className="truncate pr-2" title={issue.label}>
                          • {issue.label}
                        </span>
                        <span className="font-semibold text-slate-500 text-[10px] shrink-0">
                          {issue.count} ca
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
