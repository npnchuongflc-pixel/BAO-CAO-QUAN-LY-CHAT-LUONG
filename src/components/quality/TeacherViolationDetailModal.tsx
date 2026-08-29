import React, { useState, useMemo } from 'react';
import {
  X,
  GraduationCap,
  Calendar,
  Building,
  Clock,
  CheckCircle,
  AlertTriangle,
  Flame,
  Search,
  FileText,
  Camera,
  ExternalLink,
  Eye,
  Filter,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList
} from 'recharts';
import { TeachingAuditItem, TeachingFilterState } from '../../types';

interface TeacherViolationDetailModalProps {
  teacherName: string | null;
  allData: TeachingAuditItem[];
  currentFilters: TeachingFilterState;
  onClose: () => void;
  onOpenEvidence: (url: string, title: string) => void;
  onOpenSingleAuditDetail?: (item: TeachingAuditItem) => void;
}

export const TeacherViolationDetailModal: React.FC<TeacherViolationDetailModalProps> = ({
  teacherName,
  allData,
  currentFilters,
  onClose,
  onOpenEvidence,
  onOpenSingleAuditDetail,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'violations' | 'all-audits'>('violations');

  // 1. Collect all distinct months in dataset chronologically (independent of any active filter)
  const allAvailableMonths = useMemo(() => {
    const set = new Set<string>();
    allData.forEach((item) => {
      if (item.month && item.month.includes('/')) {
        set.add(item.month.trim());
      }
    });

    if (set.size === 0) {
      return ['01/2026', '02/2026', '03/2026', '04/2026', '05/2026', '06/2026', '07/2026', '08/2026'];
    }

    return Array.from(set).sort((a, b) => {
      const partsA = a.split('/').map((n) => parseInt(n, 10));
      const partsB = b.split('/').map((n) => parseInt(n, 10));
      const yearA = partsA[1] || 2026;
      const monthA = partsA[0] || 1;
      const yearB = partsB[1] || 2026;
      const monthB = partsB[0] || 1;
      if (yearA !== yearB) return yearA - yearB;
      return monthA - monthB;
    });
  }, [allData]);

  // 2. Compute Teacher's Monthly Progression of Violation Rate across ALL dataset months (NO FILTER)
  const teacherMonthlyProgression = useMemo(() => {
    if (!teacherName) return [];
    const normalizedTeacher = teacherName.toLowerCase().trim();

    // Entire history of this teacher from raw allData (NO filter applied)
    const teacherAllHistory = allData.filter(
      (item) => item.teacherName?.toLowerCase().trim() === normalizedTeacher
    );

    return allAvailableMonths.map((m) => {
      const monthItems = teacherAllHistory.filter((item) => item.month?.trim() === m);
      const totalAudits = monthItems.length;
      const violations = monthItems.filter((item) => item.result === 'Vi phạm').length;
      const violationRate = totalAudits > 0 ? parseFloat(((violations / totalAudits) * 100).toFixed(1)) : 0;

      const monthNum = m.split('/')[0] || m;
      return {
        month: m,
        shortMonth: `T${monthNum}`,
        displayMonth: `Tháng ${m}`,
        totalAudits,
        violations,
        violationRate,
        hasData: totalAudits > 0,
      };
    });
  }, [allData, teacherName, allAvailableMonths]);

  // Overall all-time summary for this teacher (independent of filter)
  const allTimeStats = useMemo(() => {
    let totalAudits = 0;
    let totalViolations = 0;
    teacherMonthlyProgression.forEach((m) => {
      totalAudits += m.totalAudits;
      totalViolations += m.violations;
    });
    const avgRate = totalAudits > 0 ? ((totalViolations / totalAudits) * 100).toFixed(1) : '0';
    return {
      totalAudits,
      totalViolations,
      avgRate,
    };
  }, [teacherMonthlyProgression]);

  // Filter records matching this teacher and active timeframe (for the detail table below)
  const teacherAuditsInPeriod = useMemo(() => {
    if (!teacherName) return [];
    return allData.filter((item) => {
      if (item.teacherName?.toLowerCase().trim() !== teacherName.toLowerCase().trim()) {
        return false;
      }
      if (currentFilters.month === 'current') {
        if (item.month !== '08/2026' && item.month !== 'current') return false;
      } else if (currentFilters.month !== 'all') {
        if (item.month !== currentFilters.month) return false;
      }
      return true;
    });
  }, [allData, teacherName, currentFilters.month]);

  // Essential summary stats for active period
  const teacherProfile = useMemo(() => {
    if (!teacherAuditsInPeriod.length && !teacherName) return null;
    const first = teacherAuditsInPeriod[0] || allData.find((i) => i.teacherName?.toLowerCase().trim() === teacherName.toLowerCase().trim());
    const facilities = Array.from(new Set(teacherAuditsInPeriod.map((i) => i.facility).filter(Boolean)));
    const subject = first?.subject || 'Cờ';
    const rank = first?.teacherRank || 'Bậc GV';

    const totalAudits = teacherAuditsInPeriod.length;
    const violationItems = teacherAuditsInPeriod.filter((i) => i.result === 'Vi phạm');
    const violationCount = violationItems.length;
    const severeCount = teacherAuditsInPeriod.filter((i) => i.isSevere).length;
    const handledCount = violationItems.filter((i) => i.status === 'Đã xử lý').length;
    const pendingCount = violationItems.filter((i) => i.status !== 'Đã xử lý').length;
    const violationRate = totalAudits > 0 ? ((violationCount / totalAudits) * 100).toFixed(1) : '0';

    // Group categories
    const catMap = new Map<string, number>();
    violationItems.forEach((i) => {
      const cat = i.violationCategory || i.violationName || 'Khác';
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });

    return {
      teacherName: teacherName || first?.teacherName || 'Chưa rõ',
      subject,
      rank,
      facilities,
      totalAudits,
      violationCount,
      severeCount,
      handledCount,
      pendingCount,
      violationRate,
      categoryBreakdown: Array.from(catMap.entries()).map(([name, count]) => ({ name, count })),
    };
  }, [teacherAuditsInPeriod, teacherName, allData]);

  // Filter items for the table
  const displayedItems = useMemo(() => {
    return teacherAuditsInPeriod.filter((item) => {
      if (viewMode === 'violations' && item.result !== 'Vi phạm') return false;
      if (selectedCategory !== 'all') {
        const cat = item.violationCategory || item.violationName || 'Khác';
        if (cat !== selectedCategory) return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchFacility = item.facility?.toLowerCase().includes(query);
        const matchViolation = item.violationName?.toLowerCase().includes(query) || item.detailedViolation?.toLowerCase().includes(query);
        const matchNote = item.evaluatorNote?.toLowerCase().includes(query);
        const matchDate = item.dateStr?.toLowerCase().includes(query);
        if (!matchFacility && !matchViolation && !matchNote && !matchDate) return false;
      }
      return true;
    });
  }, [teacherAuditsInPeriod, viewMode, selectedCategory, searchTerm]);

  if (!teacherName || !teacherProfile) return null;

  const timeframeLabel =
    currentFilters.month === 'current'
      ? 'Tháng 08/2026 (Kỳ hiện tại)'
      : currentFilters.month === 'all'
      ? 'Toàn bộ thời gian'
      : `Tháng ${currentFilters.month}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden text-slate-800">
        {/* ========================================================================= */}
        {/* LIGHT ELEGANT HEADER */}
        {/* ========================================================================= */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border shadow-2xs ${
                  teacherProfile.subject === 'Cờ'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {teacherProfile.teacherName}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                      teacherProfile.subject === 'Cờ'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}
                  >
                    Khối {teacherProfile.subject}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-slate-600 border border-slate-200">
                    {teacherProfile.rank}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1 font-medium text-blue-600">
                    <Calendar className="w-3.5 h-3.5" />
                    {timeframeLabel}
                  </span>
                  {teacherProfile.facilities.length > 0 && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      Cơ sở: <strong className="text-slate-700">{teacherProfile.facilities.join(', ')}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ESSENTIAL STATS STRIP (SÁNG NHẸ, TINH GỌN) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3.5 pt-3 border-t border-slate-200/80 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 flex items-center justify-between">
              <span className="text-slate-500">Tổng giám sát:</span>
              <strong className="text-slate-900 font-bold">{teacherProfile.totalAudits} lượt</strong>
            </div>

            <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80 flex items-center justify-between">
              <span className="text-amber-800 font-medium">Lượt vi phạm:</span>
              <strong className="text-amber-900 font-extrabold text-sm">{teacherProfile.violationCount} lượt</strong>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 flex items-center justify-between">
              <span className="text-slate-500">Tỉ lệ vi phạm:</span>
              <strong className={`font-bold ${Number(teacherProfile.violationRate) > 10 ? 'text-rose-600' : 'text-slate-800'}`}>
                {teacherProfile.violationRate}%
              </strong>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 flex items-center justify-between">
              <span className="text-slate-500">Trạng thái:</span>
              <span className="font-semibold text-emerald-700">
                {teacherProfile.handledCount} đã xử lý
                {teacherProfile.pendingCount > 0 && (
                  <span className="text-amber-600 ml-1">({teacherProfile.pendingCount} chờ)</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MONTHLY VIOLATION RATE PROGRESSION (TIẾN TRÌNH THEO TẤT CẢ CÁC THÁNG) */}
        {/* ========================================================================= */}
        <div className="px-6 py-3 bg-gradient-to-b from-slate-50/80 via-white to-white border-b border-slate-200 shrink-0">
          <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/90">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-blue-100 text-blue-700">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    TIẾN TRÌNH TỈ LỆ VI PHẠM THEO THÁNG
                  </h4>
                  <span className="text-[10.5px] text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Toàn bộ {allAvailableMonths.length} tháng trong dữ liệu (Độc lập bộ lọc)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 text-[11px]">Tổng tất cả các tháng:</span>
                <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                  {allTimeStats.totalViolations} / {allTimeStats.totalAudits} ca ({allTimeStats.avgRate}%)
                </span>
              </div>
            </div>

            {/* Line / Area Chart */}
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={teacherMonthlyProgression}
                  margin={{ top: 12, right: 16, left: -24, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="teacherViolGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="shortMonth"
                    tick={{ fill: '#475569', fontSize: 10.5, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    domain={[0, (dataMax: number) => Math.max(12, Math.ceil(dataMax * 1.35))]}
                    unit="%"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '11px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                    }}
                    formatter={(val: any, name: any, item: any) => [
                      `${val}% (${item.payload.violations} / ${item.payload.totalAudits} ca)`,
                      'Tỉ lệ vi phạm'
                    ]}
                    labelFormatter={(label: any, payload: any) => {
                      const fullM = payload?.[0]?.payload?.displayMonth || label;
                      return `${fullM} - GV ${teacherProfile.teacherName}`;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="violationRate"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#teacherViolGrad)"
                    dot={{ r: 3.5, fill: '#2563eb', strokeWidth: 1.5, stroke: '#fff' }}
                    activeDot={{ r: 5.5, stroke: '#2563eb', strokeWidth: 2, fill: '#fff' }}
                  >
                    <LabelList
                      dataKey="violationRate"
                      position="top"
                      offset={5}
                      fill="#1e293b"
                      fontSize={9.5}
                      fontWeight={700}
                      formatter={(val: any) => (val > 0 ? `${val}%` : '0%')}
                    />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COMPACT TOOLBAR */}
        {/* ========================================================================= */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo ngày, cơ sở, nội dung lỗi..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
              />
            </div>

            {/* Category Filter Chips */}
            {teacherProfile.categoryBreakdown.length > 1 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:bg-white"
              >
                <option value="all">Tất cả nhóm lỗi ({teacherProfile.violationCount})</option>
                {teacherProfile.categoryBreakdown.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name} ({cat.count})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('violations')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'violations'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chỉ vi phạm ({teacherProfile.violationCount})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all-audits')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'all-audits'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả lượt ({teacherProfile.totalAudits})
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TABULAR LISTING (DẠNG BẢNG GỌN GÀNG, SÁNG NHẸ, DỄ ĐỌC) */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/90 sticky top-0 z-10 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">STT</th>
                <th className="py-2.5 px-3 w-32">Thời gian</th>
                <th className="py-2.5 px-3 w-40">Cơ sở / Lớp</th>
                <th className="py-2.5 px-3 min-w-[200px]">Nội dung lỗi vi phạm & Ghi chú</th>
                <th className="py-2.5 px-3 w-28 text-center">Kết quả</th>
                <th className="py-2.5 px-3 w-28 text-center">Trạng thái</th>
                <th className="py-2.5 px-4 w-28 text-center">Minh chứng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {displayedItems.map((item, idx) => {
                const isViol = item.result === 'Vi phạm';
                return (
                  <tr
                    key={item.id || idx}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      isViol ? (item.isSevere ? 'bg-rose-50/20' : 'bg-amber-50/10') : ''
                    }`}
                  >
                    {/* STT */}
                    <td className="py-3 px-4 text-center font-medium text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Time */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">
                        {item.dateStr || 'Chưa rõ'}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : item.dayOfWeek || 'Ca dạy'}
                      </div>
                    </td>

                    {/* Facility & Class */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-blue-700">
                        {item.facility || 'Chưa rõ cơ sở'}
                      </div>
                      {item.cameraOrClass && (
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[140px]" title={item.cameraOrClass}>
                          Lớp/Cam: {item.cameraOrClass}
                        </div>
                      )}
                    </td>

                    {/* Violation Content & Notes */}
                    <td className="py-3 px-3">
                      {isViol ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {item.violationCategory || item.violationName || 'Vi phạm'}
                            </span>
                            {item.isSevere && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                <Flame className="w-3 h-3" /> Nghiêm trọng
                              </span>
                            )}
                          </div>
                          {item.detailedViolation && item.detailedViolation !== item.violationCategory && (
                            <div className="text-xs font-semibold text-rose-800">
                              {item.detailedViolation}
                            </div>
                          )}
                          {item.evaluatorNote && (
                            <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200/60 mt-1 leading-snug">
                              {item.evaluatorNote}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-emerald-700 font-medium text-xs flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Đạt chuẩn sư phạm (không vi phạm)</span>
                        </div>
                      )}
                    </td>

                    {/* Result Tag */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          isViol
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isViol ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                        {item.result}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          item.status === 'Đã xử lý'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.status || 'Đang chờ'}
                      </span>
                    </td>

                    {/* Action / Evidence */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.evidenceImage ? (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenEvidence(
                                item.evidenceImage,
                                `Minh chứng - GV ${item.teacherName} (${item.dateStr || ''})`
                              )
                            }
                            className="p-1.5 text-purple-700 bg-purple-50 hover:bg-purple-600 hover:text-white rounded-lg border border-purple-200 transition-colors shadow-2xs"
                            title="Xem minh chứng Drive"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        ) : null}

                        {onOpenSingleAuditDetail && (
                          <button
                            type="button"
                            onClick={() => onOpenSingleAuditDetail(item)}
                            className="p-1.5 text-slate-600 bg-slate-50 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
                            title="Xem phiếu chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {displayedItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle className="w-8 h-8 text-emerald-400/80" />
                      <span className="font-medium text-xs">Không có lượt vi phạm nào trong bộ lọc này.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER */}
        {/* ========================================================================= */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            Hiển thị <strong>{displayedItems.length}</strong> / <strong>{teacherProfile.totalAudits}</strong> lượt đánh giá của giáo viên.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-900 font-semibold transition-colors shadow-2xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
