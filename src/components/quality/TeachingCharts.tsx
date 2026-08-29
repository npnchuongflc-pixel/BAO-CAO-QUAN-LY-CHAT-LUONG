import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import {
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Award,
  Swords,
  Palette
} from 'lucide-react';
import { MonthlyTeachingTrend, ViolationCategoryStat, TeachingQualitySummary } from '../../types';

interface TeachingChartsProps {
  summary: TeachingQualitySummary;
  onSelectViolationCategory?: (category: string) => void;
}

const VIOLATION_COLORS = [
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#64748b', // slate
];

export const TeachingCharts: React.FC<TeachingChartsProps> = ({
  summary,
  onSelectViolationCategory,
}) => {
  const { monthlyTrends, topViolations, subjectStats } = summary;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      {/* 1. Monthly Trends Chart (7 cols on lg) */}
      <div className="card panel p-5 lg:col-span-7 border border-slate-200/80 shadow-sm bg-white flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Diễn Biến Kiểm Định &amp; Tỷ Lệ Đạt Chuẩn Qua Các Tháng
              </h3>
              <p className="text-[11px] text-slate-500">
                Theo dõi số ca đánh giá, số ca vi phạm và tỷ lệ tuân thủ (%) theo từng kỳ
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {monthlyTrends.length} Tháng
            </span>
          </div>

          <div className="h-64 w-full text-xs">
            {monthlyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={monthlyTrends}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{ value: 'Số ca', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[80, 100]}
                    tick={{ fontSize: 11, fill: '#059669' }}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: any) => {
                      if (name === 'Tỷ lệ Đạt chuẩn') return [`${value}%`, name];
                      return [`${value} ca`, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar
                    yAxisId="left"
                    dataKey="good"
                    name="Ca Đạt Chuẩn"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="violations"
                    name="Ca Vi Phạm"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="complianceRate"
                    name="Tỷ lệ Đạt chuẩn"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Không có dữ liệu xu hướng trong khoảng lọc hiện tại
              </div>
            )}
          </div>
        </div>

        {/* Quick Month Metrics Summary */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center text-xs">
          <div className="bg-slate-50 p-2 rounded-lg">
            <span className="text-slate-500 block text-[10px]">Tháng cao điểm</span>
            <strong className="text-slate-800">
              {monthlyTrends.reduce((max, cur) => cur.shifts > max.shifts ? cur : max, monthlyTrends[0] || { month: 'N/A', shifts: 0 }).month}
            </strong>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg">
            <span className="text-slate-500 block text-[10px]">Tỷ lệ đạt chuẩn cao nhất</span>
            <strong className="text-emerald-700">
              {Math.max(...monthlyTrends.map((m) => m.complianceRate), 0)}%
            </strong>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg">
            <span className="text-slate-500 block text-[10px]">Tổng lượt vi phạm kỳ</span>
            <strong className="text-rose-700">{summary.violationAudits} lượt</strong>
          </div>
        </div>
      </div>

      {/* 2. Top Violation Categories Breakdown (5 cols on lg) */}
      <div className="card panel p-5 lg:col-span-5 border border-slate-200/80 shadow-sm bg-white flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-rose-600" />
                Cơ Cấu Các Lỗi Vi Phạm Hàng Đầu
              </h3>
              <p className="text-[11px] text-slate-500">
                Tỷ trọng (%) các nhóm lỗi phát sinh cần khắc phục trọng tâm
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
              {topViolations.length} nhóm lỗi
            </span>
          </div>

          <div className="space-y-3 my-2">
            {topViolations.slice(0, 5).map((item, idx) => {
              const color = VIOLATION_COLORS[idx % VIOLATION_COLORS.length];
              return (
                <div
                  key={item.category}
                  className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => onSelectViolationCategory && onSelectViolationCategory(item.category)}
                  title={`Nhấp để lọc lỗi: ${item.category}`}
                >
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      {item.category}
                    </span>
                    <span className="font-bold text-slate-700">
                      {item.count} lượt <span className="text-slate-400 font-normal">({item.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${item.percentage}%`, backgroundColor: color }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                    <span>
                      Cờ: <strong>{item.subjectBreakdown.chess} lượt</strong> • Vẽ: <strong>{item.subjectBreakdown.art} lượt</strong>
                    </span>
                    {item.severeCount > 0 && (
                      <span className="text-rose-600 font-semibold">
                        🚨 {item.severeCount} sự cố nghiêm trọng
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {topViolations.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                Không có lỗi vi phạm nào trong bộ lọc này.
              </div>
            )}
          </div>
        </div>

        {/* Comparison: Chess vs Art */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
          <div className="p-2.5 rounded-xl border border-blue-100 bg-blue-50/50">
            <div className="flex items-center gap-1.5 text-blue-800 font-bold mb-1">
              <Swords className="w-3.5 h-3.5 text-blue-600" />
              Khối Cờ Vua
            </div>
            <div className="text-base font-black text-blue-900">
              {subjectStats.chess.complianceRate}% <span className="text-[10px] font-normal text-blue-600">chuẩn</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {subjectStats.chess.audits.toLocaleString('vi-VN')} lượt • {subjectStats.chess.violations} lượt vi phạm
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-purple-100 bg-purple-50/50">
            <div className="flex items-center gap-1.5 text-purple-800 font-bold mb-1">
              <Palette className="w-3.5 h-3.5 text-purple-600" />
              Khối Mỹ Thuật
            </div>
            <div className="text-base font-black text-purple-900">
              {subjectStats.art.complianceRate}% <span className="text-[10px] font-normal text-purple-600">chuẩn</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {subjectStats.art.audits.toLocaleString('vi-VN')} lượt • {subjectStats.art.violations} lượt vi phạm
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
