import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  loadReminderReportData,
  generateTeamLeaderEscalationMessage,
  parseAndGroupViolationReasons,
  formatShortDate,
  ReminderReportSummary,
  FacilityReminderAggregation,
  ReminderSheetRow,
  REMINDER_CSV_DIRECT_URL,
} from '../../services/reminderSheetService';
import {
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  Building2,
  ExternalLink,
  Info,
  Clock,
  Download,
} from 'lucide-react';

interface ReminderEscalationReportProps {
  className?: string;
}

export const ReminderEscalationReport: React.FC<ReminderEscalationReportProps> = ({ className = '' }) => {
  const [data, setData] = useState<ReminderReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'escalated' | 'all' | 'watch' | 'clean'>('escalated');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedFacility, setExpandedFacility] = useState<string | null>(null);
  const [copiedFacility, setCopiedFacility] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const summary = await loadReminderReportData();
      setData(summary);
    } catch (err) {
      console.error('Lỗi tải dữ liệu báo cáo nhắc nhở:', err);
      setError(err instanceof Error ? err.message : 'Không thể kết nối đến Google Sheet "nhắc nhở"');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter facilities
  const filteredFacilities = useMemo(() => {
    if (!data) return [];
    return data.facilities.filter(fac => {
      // Tab filter
      if (activeTab === 'escalated' && !fac.isEscalated) return false;
      if (activeTab === 'watch' && fac.remindedCount !== 1) return false;
      if (activeTab === 'clean' && fac.remindedCount !== 0) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = fac.coSo.toLowerCase().includes(query);
        const matchReason = fac.latestReason.toLowerCase().includes(query);
        if (!matchName && !matchReason) return false;
      }

      return true;
    });
  }, [data, activeTab, searchQuery]);

  // Copy specific facility report
  const handleCopyFacility = async (fac: FacilityReminderAggregation) => {
    const dates = fac.remindedRecords.map(r => formatShortDate(r.ngay)).join(', ');
    const grouped = parseAndGroupViolationReasons(fac.remindedRecords, fac.latestReason, fac.latestRemindedDate);
    const reasons = grouped.length > 0
      ? grouped.map(g => `  • ${g.name}: ${g.count} lần${g.dates.length > 0 ? ` (Ngày: ${g.dates.map(d => formatShortDate(d)).join(', ')})` : ''}`).join('\n')
      : '  • Không có ghi chú';
    const text = `🚨 [CẢNH BÁO TRƯỞNG NHÓM] ${fac.coSo.toUpperCase()}
• Số lần bị nhắc nhở: ${fac.remindedCount} lần
• Danh sách các ngày nhắc nhở: ${dates || 'Chưa có'}
• Lý do vi phạm (tổng hợp theo số lần):
${reasons}
👉 Đề xuất Trưởng nhóm làm việc với cơ sở để chấn chỉnh kịp thời!`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedFacility(fac.coSo);
      setTimeout(() => setCopiedFacility(null), 2500);
    } catch (err) {
      console.warn('Lỗi copy:', err);
    }
  };

  // Export filtered list to CSV
  const handleExportCSV = () => {
    if (!data) return;
    let csv = '\uFEFFCơ sở,Số lần nhắc nhở,Ngày nhắc nhở,Lý do vi phạm tổng hợp\n';
    filteredFacilities.forEach(f => {
      const dates = f.remindedRecords.length > 0
        ? f.remindedRecords.map(r => formatShortDate(r.ngay)).join('; ')
        : (formatShortDate(f.latestRemindedDate) || 'Chưa có');
      const grouped = parseAndGroupViolationReasons(f.remindedRecords, f.latestReason, f.latestRemindedDate);
      const reasons = grouped.length > 0
        ? grouped.map(g => `${g.name} (${g.count} lần)`).join('; ')
        : 'Không có ghi nhận vi phạm';
      csv += `"${f.coSo}","${f.remindedCount}","${dates}","${reasons.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Canh_Bao_Truong_Nhom_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className={`my-8 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden print:m-0 print:border-none print:shadow-none ${className}`}>
      {/* 1. Header Bar */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-50/60 via-amber-50/40 to-slate-50 border-b border-slate-200/90">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          {/* Left Title & Branding */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 text-white flex items-center justify-center shadow-xs shrink-0 ring-1 ring-black/5">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Báo Cáo Cảnh Báo Trưởng Nhóm: Cơ Sở Bị Nhắc Nhở ≥ 2 Lần
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                  Sheet "nhắc nhở"
                </span>
                {data?.lastSyncTime && (
                  <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                    (Đồng bộ {data.lastSyncTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Tự động tổng hợp và cảnh báo các cơ sở có từ 2 lần bị nhắc nhở để báo cáo trực tiếp về cho Trưởng nhóm
              </p>
            </div>
          </div>

          {/* Right Action Buttons: Chỉ để lại nút thu gọn */}
          <div className="flex items-center gap-2 self-end sm:self-center print:hidden">
            {/* Nút Thu gọn / Mở rộng */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs transition-colors cursor-pointer"
              title={isCollapsed ? 'Mở rộng báo cáo' : 'Thu gọn báo cáo lại'}
            >
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-rose-600" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-600" />}
              <span>{isCollapsed ? 'Mở rộng' : 'Thu gọn lại'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Collapsed View Summary */}
      {isCollapsed && data && (
        <div className="p-4 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
              🚨 {data.escalatedFacilitiesCount} cơ sở bị nhắc nhở ≥ 2 lần
            </span>
            <span className="text-slate-600">
              (Tổng cộng {data.totalRemindedCount} lượt nhắc nhở trên toàn hệ thống).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Mở rộng chi tiết</span>
          </button>
        </div>
      )}

      {/* 3. Main Content (Hidden when collapsed) */}
      <div className={isCollapsed ? 'hidden print:block' : 'block'}>
        {/* Error notification */}
        {error && (
          <div className="p-4 m-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchData}
              className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-bold text-xs hover:bg-rose-700 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !data && (
          <div className="p-8 text-center text-slate-500 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-rose-600 mb-2" />
            <span>Đang tải và xử lý dữ liệu cảnh báo từ sheet "nhắc nhở"...</span>
          </div>
        )}

        {data && (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              {/* Segmented Filter Buttons */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 gap-1 overflow-x-auto shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('escalated')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'escalated'
                      ? 'bg-white text-rose-700 shadow-xs border border-slate-200/70'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🚨 Báo Trưởng Nhóm</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800 text-[10px] font-mono">
                    {data.escalatedFacilitiesCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('watch')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'watch'
                      ? 'bg-white text-amber-800 shadow-xs border border-slate-200/70'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>⚠️ Nhắc nhở 1 lần</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-mono">
                    {data.watchFacilitiesCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'all'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Tất cả cơ sở</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700 text-[10px] font-mono">
                    {data.facilities.length}
                  </span>
                </button>
              </div>

              {/* Search & Action Controls */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên cơ sở hoặc lý do lỗi..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-slate-400 hover:text-slate-600 text-xs absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
                  title="Xuất danh sách ra file CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Xuất CSV</span>
                </button>
              </div>
            </div>

            {/* 5. Main Table: Escalated & Warned Facilities */}
            <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs bg-white">
              {filteredFacilities.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Không tìm thấy cơ sở nào phù hợp với bộ lọc hiện tại.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50/90 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3 text-center w-12">STT</th>
                        <th className="py-3 px-4 min-w-[150px]">Tên Cơ Sở</th>
                        <th className="py-3 px-4 text-center min-w-[120px]">
                          Số Lần Nhắc Nhở
                        </th>
                        <th className="py-3 px-4 min-w-[160px]">Ngày Nhắc Nhở</th>
                        <th className="py-3 px-4 min-w-[320px]">Lý Do Vi Phạm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredFacilities.map((fac, idx) => {
                        const isExpanded = expandedFacility === fac.coSo;
                        const groupedReasons = parseAndGroupViolationReasons(fac.remindedRecords, fac.latestReason, fac.latestRemindedDate);

                        return (
                          <React.Fragment key={fac.coSo}>
                            <tr
                              onClick={() => setExpandedFacility(isExpanded ? null : fac.coSo)}
                              className={`transition-colors cursor-pointer ${
                                fac.isEscalated
                                  ? fac.remindedCount >= 4
                                    ? 'bg-rose-50/30 hover:bg-rose-50/60'
                                    : 'bg-amber-50/20 hover:bg-amber-50/50'
                                  : 'hover:bg-slate-50/80'
                              } ${isExpanded ? 'bg-sky-50/40 border-l-4 border-l-rose-600' : ''}`}
                              title="Bấm vào hàng để xem thêm chi tiết lịch sử kiểm toán nếu cần"
                            >
                              {/* STT */}
                              <td className="py-3.5 px-3 text-center font-mono text-slate-500 font-semibold align-top">
                                {idx + 1}
                              </td>

                              {/* Tên cơ sở */}
                              <td className="py-3.5 px-4 font-bold text-slate-900 align-top">
                                <div className="flex items-center gap-2">
                                  <Building2 className={`w-4 h-4 shrink-0 ${
                                    fac.isEscalated ? 'text-rose-600' : 'text-slate-400'
                                  }`} />
                                  <span className="text-xs sm:text-[13px]">{fac.coSo}</span>
                                </div>
                              </td>

                              {/* Số lần nhắc nhở */}
                              <td className="py-3.5 px-4 text-center align-top">
                                <span className={`inline-flex items-center justify-center font-mono font-black text-xs px-2.5 py-1 rounded-full border shadow-2xs ${
                                  fac.remindedCount >= 4
                                    ? 'bg-rose-600 text-white border-rose-700'
                                    : fac.remindedCount >= 2
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : fac.remindedCount === 1
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                  {fac.remindedCount} lần
                                </span>
                              </td>

                              {/* Ngày nhắc nhở: Liệt kê gọn gàng (bỏ năm 2026) */}
                              <td className="py-3.5 px-4 align-top">
                                {fac.remindedRecords.length === 0 ? (
                                  <span className="text-slate-400 italic text-[11px]">-</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5 items-center max-w-[260px]">
                                    {fac.remindedRecords.map((rec, rIdx) => (
                                      <span
                                        key={rec.id || `${rec.ngay}_${rIdx}`}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border shadow-2xs ${
                                          fac.isEscalated
                                            ? 'bg-rose-50 text-rose-800 border-rose-200/90'
                                            : 'bg-amber-50 text-amber-800 border-amber-200/90'
                                        }`}
                                        title={`Lần ${rIdx + 1}: Ngày ${rec.ngay}`}
                                      >
                                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span>{formatShortDate(rec.ngay)}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>

                              {/* Lý do vi phạm: Đếm số lỗi giống nhau, hiển thị 1 lỗi kèm số lần */}
                              <td className="py-3.5 px-4 align-top">
                                {groupedReasons.length === 0 ? (
                                  <span className="text-slate-400 italic text-[11px]">Không có ghi nhận vi phạm</span>
                                ) : (
                                  <div className="space-y-1.5">
                                    {groupedReasons.map((item, rIdx) => (
                                      <div
                                        key={rIdx}
                                        className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-800 text-xs hover:bg-slate-100/70 transition-colors"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                                            item.name === 'Chưa có báo cáo'
                                              ? 'bg-rose-500'
                                              : item.name === 'Thiếu chỉ tiêu'
                                              ? 'bg-amber-500'
                                              : 'bg-orange-500'
                                          }`} />
                                          <span className="font-bold text-slate-900 whitespace-nowrap">
                                            {item.name}
                                          </span>
                                          {item.dates.length > 0 && (
                                            <span className="text-[11px] text-slate-500 font-mono">
                                              ({item.dates.map(d => formatShortDate(d)).join(', ')})
                                            </span>
                                          )}
                                        </div>

                                        <span className={`shrink-0 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border shadow-2xs ${
                                          item.count >= 2
                                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                                            : 'bg-amber-100 text-amber-800 border-amber-300'
                                        }`}>
                                          {item.count} lần
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>

                            {/* Expanded Detail Rows */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90 border-t border-b border-slate-200">
                                <td colSpan={5} className="p-4">
                                  <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-rose-600" />
                                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                                          Lịch Sử Các Lần Bị Nhắc Nhở: {fac.coSo} ({fac.remindedRecords.length} lượt)
                                        </h4>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyFacility(fac)}
                                        className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Sao chép báo cáo cơ sở này</span>
                                      </button>
                                    </div>

                                    {fac.remindedRecords.length === 0 ? (
                                      <p className="text-xs text-slate-500 py-2">Cơ sở này chưa có lượt nhắc nhở nào.</p>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs text-slate-700">
                                          <thead className="bg-slate-50 text-[10.5px] uppercase font-bold text-slate-500 border-b border-slate-100">
                                            <tr>
                                              <th className="py-2 px-3 text-center w-12">Lần #</th>
                                              <th className="py-2 px-3">Ngày</th>
                                              <th className="py-2 px-3">Lý Do Vi Phạm Cụ Thể</th>
                                              <th className="py-2 px-3 text-center">Số Lỗi</th>
                                              <th className="py-2 px-3">Người Xử Lý</th>
                                              <th className="py-2 px-3 text-center">Trạng Thái</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {fac.remindedRecords.map((rec, rIdx) => (
                                              <tr key={rec.id} className="hover:bg-slate-50/60">
                                                <td className="py-2.5 px-3 text-center font-bold text-rose-700 font-mono">
                                                  #{rIdx + 1}
                                                </td>
                                                <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                                                  {formatShortDate(rec.ngay)}
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-700 leading-relaxed">
                                                  {rec.lyDoCanhBao}
                                                </td>
                                                <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                                                  {rec.soLoi}
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                                  {rec.nguoiXuLy || 'Quản lý kiểm tra'}
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                                    Đã nhắc nhở
                                                  </span>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Link to original sheet & Footer notice */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-[11px] text-slate-500 border-t border-slate-200/80">
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Báo cáo tự động lọc từ sheet "nhắc nhở". Mọi cập nhật trên sheet sẽ tự động hiển thị tại đây khi tải lại trang.
                </span>
              </div>
              <a
                href={REMINDER_CSV_DIRECT_URL.replace('/export?format=csv&', '/edit?')}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 font-semibold hover:underline"
              >
                <span>Mở Google Sheet "nhắc nhở" gốc</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
