import React from 'react';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Award,
  BarChart3,
  Calendar,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { ReportMode, FacilitySummary, FacilityFilterState, HygieneReport, FacilityQualityReport } from './facilityTypes';

interface FacilitySummaryDashboardProps {
  mode: ReportMode;
  onModeChange: (newMode: ReportMode) => void;
  hygieneCount: number;
  qualityCount: number;
  summaries: FacilitySummary[];
  totalRecords: number;
  activeFacilityCount: number;
  overallScoreOrRate: number;
  issuesCount: number;
  selectedFacilityFilter: string;
  onSelectFacility: (fac: string) => void;
  filters: FacilityFilterState;
  onFilterChange: (newFilters: FacilityFilterState) => void;
  onOpenDetailModal: (fac: string) => void;
  rawHygieneReports: HygieneReport[];
  rawQualityReports: FacilityQualityReport[];
}

export const FacilitySummaryDashboard: React.FC<FacilitySummaryDashboardProps> = ({
  mode,
  summaries,
  totalRecords,
  activeFacilityCount,
  overallScoreOrRate,
  issuesCount,
  selectedFacilityFilter,
  onSelectFacility,
  onOpenDetailModal,
}) => {
  // Chart Data
  const chartData = summaries.slice(0, 12).map((s) => ({
    name: s.coSo.replace('Cơ sở ', 'CS').split(' - ')[0] || s.coSo,
    fullName: s.coSo,
    soLan: s.soLanThucHien,
    rate: mode === 'hygiene' ? parseFloat(s.diemTrungBinh.toFixed(1)) : parseFloat(s.tyLeDaXuLy.toFixed(1)),
  }));

  return (
    <div className="space-y-5">
      {/* 4 KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Tổng lượt đánh giá */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng Lượt Đánh Giá</span>
            <span className="p-1.5 rounded-lg bg-blue-50">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-800">{totalRecords.toLocaleString()}</div>
          <p className="text-[11px] text-slate-500 mt-1">Lượt ghi nhận trong giai đoạn lọc</p>
        </div>

        {/* Card 2: Cơ sở có ghi nhận */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cơ Sở Hoạt Động</span>
            <span className="p-1.5 rounded-lg bg-emerald-50">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-800">
            {activeFacilityCount} <span className="text-sm font-semibold text-slate-400">/ 19</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cơ sở đã thực hiện gửi báo cáo</p>
        </div>

        {/* Card 3: Điểm TB / Tỉ lệ xử lý */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              {mode === 'hygiene' ? 'Điểm Trung Bình' : 'Tỉ Lệ Đã Xử Lý'}
            </span>
            <span className="p-1.5 rounded-lg bg-indigo-50">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-800">
            {overallScoreOrRate.toFixed(1)}
            <span className="text-sm font-semibold text-slate-400">{mode === 'hygiene' ? ' đ' : '%'}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {mode === 'hygiene' ? 'Thang điểm tiêu chuẩn 100đ' : 'Tỉ lệ sự cố đã khắc phục'}
          </p>
        </div>

        {/* Card 4: Số sự cố / Vi phạm */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              {mode === 'hygiene' ? 'Ca Cần Khắc Phục' : 'Sự Cố Khẩn Cấp'}
            </span>
            <span className="p-1.5 rounded-lg bg-rose-50">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-800">{issuesCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Cần cơ sở theo dõi và xử lý</p>
        </div>
      </div>

      {/* CHART & TOP FACILITIES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Bar Chart (Tần suất đánh giá theo cơ sở) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <BarChart3 className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Số Lượng Đánh Giá Từng Cơ Sở
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Top 12 cơ sở thực hiện nhiều nhất</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#475569', fontSize: 10.5, fontWeight: 600 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '11px',
                  }}
                  formatter={(val: any, name: any) => [
                    `${val} ${name === 'soLan' ? 'lượt' : 'điểm/%'}`,
                    name === 'soLan' ? 'Số lần thực hiện' : mode === 'hygiene' ? 'Điểm TB' : 'Tỉ lệ xử lý'
                  ]}
                  labelFormatter={(lbl: any, payload: any) => payload?.[0]?.payload?.fullName || lbl}
                />
                <Bar dataKey="soLan" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fullName === selectedFacilityFilter ? '#1d4ed8' : '#3b82f6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Quick Facility Ranking */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              Bảng Xếp Hạng Cơ Sở
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">{summaries.length} cơ sở</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-64 divide-y divide-slate-100 pr-1">
            {summaries.slice(0, 8).map((fac, idx) => (
              <div
                key={fac.coSo}
                onClick={() => onOpenDetailModal(fac.coSo)}
                className="py-2 px-1 flex items-center justify-between hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    idx === 0 ? 'bg-amber-100 text-amber-800 font-black' :
                    idx === 1 ? 'bg-slate-200 text-slate-700' :
                    idx === 2 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600">
                      {fac.coSo}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {fac.soLanThucHien} lượt • Cuối: {fac.lanCuoiKiemTra}
                    </p>
                  </div>
                </div>

                <div className="text-right flex items-center gap-1.5 shrink-0">
                  <div>
                    <span className="text-xs font-black text-slate-800">
                      {mode === 'hygiene' ? `${fac.diemTrungBinh.toFixed(0)}đ` : `${fac.tyLeDaXuLy.toFixed(0)}%`}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SUMMARY TABLE: TOÀN BỘ 19 CƠ SỞ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Tổng Hợp Báo Cáo Chi Tiết Từng Cơ Sở
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Bấm vào tên cơ sở để xem toàn bộ danh sách biên bản kiểm tra chi tiết kèm hình ảnh
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-4">TÊN CƠ SỞ</th>
                <th className="py-2.5 px-4 text-center">SỐ LƯỢT ĐÁNH GIÁ</th>
                <th className="py-2.5 px-4 text-center">
                  {mode === 'hygiene' ? 'ĐIỂM TRUNG BÌNH' : 'TỈ LỆ XỬ LÝ'}
                </th>
                <th className="py-2.5 px-4 text-center">
                  {mode === 'hygiene' ? 'TỈ LỆ ĐẠT CHUẨN' : 'SỰ CỐ KHẨN CẤP'}
                </th>
                <th className="py-2.5 px-4 text-center">LẦN KIỂM TRA GẦN NHẤT</th>
                <th className="py-2.5 px-4 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {summaries.map((fac) => (
                <tr key={fac.coSo} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-800">
                    <button
                      type="button"
                      onClick={() => onOpenDetailModal(fac.coSo)}
                      className="text-left font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1.5"
                    >
                      <span>{fac.coSo}</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-400" />
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md">
                      {fac.soLanThucHien} lượt
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold">
                    {mode === 'hygiene' ? (
                      <span className={`px-2 py-0.5 rounded-md ${
                        fac.diemTrungBinh >= 85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        fac.diemTrungBinh >= 70 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        fac.soLanThucHien === 0 ? 'text-slate-400' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {fac.soLanThucHien > 0 ? `${fac.diemTrungBinh.toFixed(1)} đ` : 'Chưa có'}
                      </span>
                    ) : (
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md">
                        {fac.soLanThucHien > 0 ? `${fac.tyLeDaXuLy.toFixed(1)}%` : 'Chưa có'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {mode === 'hygiene' ? (
                      <span className="text-slate-700 font-semibold">
                        {fac.soLanThucHien > 0 ? `${fac.tyLeDat.toFixed(1)}%` : '-'}
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-md font-bold ${
                        fac.soSuCo > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'text-slate-400'
                      }`}>
                        {fac.soSuCo} sự cố
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-500 font-medium">
                    {fac.lanCuoiKiemTra}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenDetailModal(fac.coSo)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors shadow-2xs"
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
