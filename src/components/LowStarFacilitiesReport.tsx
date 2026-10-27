import React, { useState, useMemo } from 'react';
import { FacilityMetrics, SheetRowItem } from '../types';
import { formatPercent, formatDate } from '../services/sheetService';
import {
  summarizeFacilityComments,
  ISSUE_CATEGORIES,
  IssueCategoryKey,
  FacilityCommentSummary
} from '../services/commentAnalysisService';
import {
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  AlertTriangle,
  GraduationCap,
  Headphones,
  Building,
  BookOpen,
  HelpCircle,
  MessageSquare
} from 'lucide-react';

interface LowStarFacilitiesReportProps {
  facilities: FacilityMetrics[];
  feedback: SheetRowItem[];
  lowFeedback?: SheetRowItem[];
  allReplies?: SheetRowItem[];
}

export const LowStarFacilitiesReport: React.FC<LowStarFacilitiesReportProps> = ({
  facilities,
  feedback,
  lowFeedback = [],
  allReplies = []
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [expandedFacility, setExpandedFacility] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bad' | 'good'>('bad');

  // Compute comment summary for every facility using the automatic classification engine
  const facilitySummaries = useMemo(() => {
    // Combine all replies available for complete analysis
    const sourceData = allReplies.length > 0 ? allReplies : feedback;

    const map = new Map<string, FacilityCommentSummary>();
    for (const fac of facilities) {
      const summary = summarizeFacilityComments(fac.facility, sourceData);
      map.set(fac.facility, summary);
    }
    return map;
  }, [facilities, allReplies, feedback]);

  // Combine facility metrics with automated comment groups
  const rows = useMemo(() => {
    return facilities
      .map((fac) => {
        const summary = facilitySummaries.get(fac.facility) || {
          facility: fac.facility,
          totalReplies: fac.replies || 0,
          goodCount: 0,
          badCount: fac.low || 0,
          badCategories: { teaching: 0, service: 0, facilities: 0, curriculum: 0, other: 0 },
          goodComments: [],
          badComments: []
        };

        const totalReplies = fac.replies || (summary.badCount > 0 ? summary.badCount : 1);
        const badRate = totalReplies > 0 ? summary.badCount / totalReplies : 0;

        return {
          ...fac,
          summary,
          badRate
        };
      })
      // Sắp xếp các cơ sở có bình luận chưa tốt nhiều nhất lên đầu
      .sort((a, b) => {
        return (
          b.summary.badCount - a.summary.badCount ||
          b.summary.badCategories.teaching - a.summary.badCategories.teaching ||
          a.facility.localeCompare(b.facility, 'vi')
        );
      });
  }, [facilities, facilitySummaries]);

  // Filter facilities that have either low reviews or comments to show
  const activeRows = useMemo(() => {
    const withBad = rows.filter((r) => r.summary.badCount > 0);
    // If some have bad comments, show those; otherwise show all
    return withBad.length > 0 ? withBad : rows;
  }, [rows]);

  const toggleExpand = (facilityName: string) => {
    setExpandedFacility((prev) => (prev === facilityName ? null : facilityName));
  };

  return (
    <section className="panel low-star-report-panel bg-white rounded-2xl border border-rose-200/90 shadow-sm overflow-hidden my-6">
      {/* Header bar (Clean - No Collapse Button) */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-50/90 via-amber-50/40 to-white border-b border-rose-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Thống kê phân loại nhận xét theo cơ sở
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl">
            Hệ thống tự động phân tích toàn bộ dữ liệu phản hồi: thống kê riêng <strong>Bình luận tốt</strong> (khen ngợi)
            và tự động xếp các <strong>Bình luận chưa tốt</strong> vào các nhóm vấn đề (Giảng dạy, Chăm sóc, Cơ sở vật chất, Chương trình, Góp ý khác).
          </p>
        </div>

        {/* Nút thu gọn / mở rộng */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs transition-colors cursor-pointer"
            title={isCollapsed ? 'Mở rộng báo cáo theo cơ sở' : 'Thu gọn báo cáo'}
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-4 h-4 text-rose-600" />
                <span>Mở rộng</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4 text-slate-600" />
                <span>Thu gọn lại</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dạng thu gọn (Mini Banner) */}
      {isCollapsed && (
        <div
          onClick={() => setIsCollapsed(false)}
          className="p-4 bg-rose-50/30 flex items-center justify-between gap-3 text-xs text-slate-700 cursor-pointer hover:bg-rose-50/60 transition-colors"
          title="Bấm để mở rộng báo cáo theo cơ sở"
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-bold text-rose-900 bg-rose-100/80 px-2.5 py-1 rounded-md border border-rose-200">
              ⚠️ {activeRows.filter((r) => r.summary.badCount > 0).length} / {facilities.length} cơ sở có nhận xét cần lưu ý
            </span>
            <span className="text-slate-600">
              Tổng <strong>{activeRows.reduce((s, r) => s + r.summary.badCount, 0)}</strong> phản hồi chưa tốt cần cải thiện
            </span>
          </div>
        </div>
      )}

      {/* Main Table */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5">
        {activeRows.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Sparkles className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">
              Không có cơ sở nào nhận đánh giá từ 3 sao trở xuống
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Tuyệt vời! Toàn bộ cơ sở đều đạt từ 4 đến 5 sao trong khoảng thời gian đã chọn.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                {/* Header row 1: Group headers */}
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3 whitespace-nowrap" rowSpan={2}>
                    STT
                  </th>
                  <th className="py-2.5 px-3 min-w-[150px]" rowSpan={2}>
                    Cơ sở
                  </th>
                  <th className="py-2.5 px-2 text-center whitespace-nowrap" rowSpan={2}>
                    Tổng phản hồi
                  </th>
                  {/* Single column for Good Comments */}
                  <th
                    className="py-2 px-2 text-center whitespace-nowrap bg-emerald-50/90 text-emerald-900 border-x border-emerald-200/80"
                    rowSpan={2}
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Bình luận Tốt</span>
                    </div>
                    <span className="text-[10px] font-normal text-emerald-700 block">
                      (Khen / Hài lòng)
                    </span>
                  </th>
                  {/* Group header for Bad Comments */}
                  <th
                    className="py-1.5 px-2 text-center whitespace-nowrap bg-rose-50/80 text-rose-900 border-b border-rose-200"
                    colSpan={5}
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Phân nhóm bình luận Chưa tốt (≤ 3★ / Góp ý)</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-2 text-center whitespace-nowrap text-rose-700" rowSpan={2}>
                    Tổng chưa tốt
                  </th>
                  <th className="py-2.5 px-2 text-center whitespace-nowrap" rowSpan={2}>
                    Tỷ lệ chưa tốt
                  </th>
                  <th className="py-2.5 px-3 min-w-[240px]" rowSpan={2}>
                    Nhận xét chưa tốt gần nhất
                  </th>
                </tr>

                {/* Header row 2: Sub-categories for bad comments */}
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                  <th
                    className="py-1.5 px-2 text-center whitespace-nowrap bg-rose-50/50 text-rose-800"
                    title={ISSUE_CATEGORIES.teaching.description}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <GraduationCap className="w-3 h-3 text-rose-600" />
                      <span>Giảng dạy & GV</span>
                    </div>
                  </th>
                  <th
                    className="py-1.5 px-2 text-center whitespace-nowrap bg-blue-50/50 text-blue-800"
                    title={ISSUE_CATEGORIES.service.description}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Headphones className="w-3 h-3 text-blue-600" />
                      <span>Chăm sóc & DV</span>
                    </div>
                  </th>
                  <th
                    className="py-1.5 px-2 text-center whitespace-nowrap bg-amber-50/50 text-amber-800"
                    title={ISSUE_CATEGORIES.facilities.description}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Building className="w-3 h-3 text-amber-600" />
                      <span>CS vật chất</span>
                    </div>
                  </th>
                  <th
                    className="py-1.5 px-2 text-center whitespace-nowrap bg-purple-50/50 text-purple-800"
                    title={ISSUE_CATEGORIES.curriculum.description}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <BookOpen className="w-3 h-3 text-purple-600" />
                      <span>Chương trình & HP</span>
                    </div>
                  </th>
                  <th
                    className="py-1.5 px-2 text-center whitespace-nowrap bg-slate-50 text-slate-700"
                    title={ISSUE_CATEGORIES.other.description}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <HelpCircle className="w-3 h-3 text-slate-500" />
                      <span>Góp ý khác</span>
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {activeRows.map((row, idx) => {
                  const isExpanded = expandedFacility === row.facility;
                  const latestBad = row.summary.latestBadComment;

                  return (
                    <React.Fragment key={row.facility}>
                      <tr
                        onClick={() => toggleExpand(row.facility)}
                        className={`hover:bg-rose-50/30 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-rose-50/40 font-medium' : ''
                        }`}
                      >
                        {/* STT */}
                        <td className="py-3 px-3 text-slate-500 font-medium whitespace-nowrap">
                          #{idx + 1}
                        </td>

                        {/* Cơ sở */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{row.facility}</span>
                            {(row.dist?.[0] || 0) > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                1★ Báo động
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3 text-rose-600" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-slate-400" />
                            )}
                            Bấm xem chi tiết
                          </span>
                        </td>

                        {/* Tổng phản hồi */}
                        <td className="py-3 px-2 text-center whitespace-nowrap font-medium text-slate-700">
                          {row.summary.totalReplies}
                        </td>

                        {/* Bình luận Tốt */}
                        <td className="py-3 px-2 text-center whitespace-nowrap bg-emerald-50/30 border-x border-emerald-100">
                          <span
                            className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-black ${
                              row.summary.goodCount > 0
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {row.summary.goodCount}
                          </span>
                        </td>

                        {/* Nhóm: Giảng dạy & GV */}
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          {row.summary.badCategories.teaching > 0 ? (
                            <span className="font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded border border-rose-200">
                              {row.summary.badCategories.teaching}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Nhóm: Chăm sóc & DV */}
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          {row.summary.badCategories.service > 0 ? (
                            <span className="font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200">
                              {row.summary.badCategories.service}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Nhóm: CS vật chất */}
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          {row.summary.badCategories.facilities > 0 ? (
                            <span className="font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                              {row.summary.badCategories.facilities}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Nhóm: Chương trình & HP */}
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          {row.summary.badCategories.curriculum > 0 ? (
                            <span className="font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded border border-purple-200">
                              {row.summary.badCategories.curriculum}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Nhóm: Góp ý khác */}
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          {row.summary.badCategories.other > 0 ? (
                            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {row.summary.badCategories.other}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Tổng chưa tốt */}
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-black ${
                              row.summary.badCount > 0
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {row.summary.badCount}
                          </span>
                        </td>

                        {/* Tỷ lệ chưa tốt */}
                        <td className="py-3 px-2 text-center whitespace-nowrap font-bold">
                          <span
                            className={
                              row.badRate >= 0.15
                                ? 'text-rose-700'
                                : row.badRate > 0
                                ? 'text-amber-700'
                                : 'text-slate-400'
                            }
                          >
                            {formatPercent(row.badRate)}
                          </span>
                        </td>

                        {/* Nhận xét chưa tốt gần nhất */}
                        <td className="py-3 px-3 max-w-[280px]">
                          {latestBad?.item.detail ? (
                            <div className="space-y-1">
                              {latestBad.issueCategoryMeta && (
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${latestBad.issueCategoryMeta.bgColor} ${latestBad.issueCategoryMeta.color} ${latestBad.issueCategoryMeta.borderColor}`}
                                >
                                  {latestBad.issueCategoryMeta.shortLabel}
                                </span>
                              )}
                              <p className="truncate text-slate-700" title={latestBad.item.detail}>
                                “{latestBad.item.detail}”
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Không có phản hồi chưa tốt</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Section: Drilldown of Good and Bad comments */}
                      {isExpanded && (
                        <tr className="bg-rose-50/20">
                          <td colSpan={12} className="p-4 sm:p-5">
                            <div className="bg-white rounded-xl border border-rose-200/80 p-4 shadow-sm space-y-4">
                              {/* Header & Tabs */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                                    <MessageSquare className="w-3.5 h-3.5 text-rose-600" />
                                    Chi tiết ý kiến phụ huynh tại cơ sở: {row.facility}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    Các nhận xét được tự động phân nhóm bằng thuật toán phân tích ngữ nghĩa
                                  </p>
                                </div>

                                {/* Tabs switcher */}
                                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab('bad')}
                                    className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                                      activeTab === 'bad'
                                        ? 'bg-rose-600 text-white shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Bình luận Chưa tốt ({row.summary.badCount})</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab('good')}
                                    className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                                      activeTab === 'good'
                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    <ThumbsUp className="w-3 h-3" />
                                    <span>Bình luận Tốt ({row.summary.goodCount})</span>
                                  </button>
                                </div>
                              </div>

                              {/* Tab Content: Bad Comments */}
                              {activeTab === 'bad' && (
                                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                                  {row.summary.badComments.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-500 italic">
                                      Không có nhận xét chưa tốt nào tại cơ sở này trong kỳ.
                                    </div>
                                  ) : (
                                    row.summary.badComments.map((comment, cIdx) => {
                                      const meta = comment.issueCategoryMeta || ISSUE_CATEGORIES.other;
                                      return (
                                        <div
                                          key={cIdx}
                                          className="p-3 rounded-lg bg-slate-50/90 border border-slate-200/80 hover:bg-white transition-colors text-xs space-y-1.5"
                                        >
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {/* Star Badge */}
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-black bg-rose-600 text-white">
                                              ★ {comment.item.rating ?? 3} sao
                                            </span>

                                            {/* Category Tag */}
                                            <span
                                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${meta.bgColor} ${meta.color} ${meta.borderColor}`}
                                            >
                                              {meta.label}
                                            </span>

                                            <strong className="text-slate-900">
                                              Học viên: {comment.item.student || 'Chưa có tên'}
                                            </strong>

                                            {comment.item.customer && (
                                              <span className="text-slate-500">
                                                (PH: {comment.item.customer})
                                              </span>
                                            )}

                                            {comment.item.subject && (
                                              <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 text-[10px] font-medium">
                                                {comment.item.subject}
                                              </span>
                                            )}

                                            {comment.item.course && (
                                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-semibold">
                                                {comment.item.course}
                                              </span>
                                            )}

                                            <span className="text-[11px] text-slate-400 ml-auto">
                                              {formatDate(comment.item.responseAt, true)}
                                            </span>
                                          </div>

                                          <p className="text-slate-800 font-medium pl-1 text-xs sm:text-sm">
                                            {comment.item.detail ? (
                                              <span>“{comment.item.detail}”</span>
                                            ) : (
                                              <span className="text-slate-400 italic">
                                                Đánh giá {comment.item.rating} sao không để lại lời nhắn
                                              </span>
                                            )}
                                          </p>

                                          {comment.matchedKeywords.length > 0 && (
                                            <div className="text-[10px] text-slate-400 pl-1">
                                              Từ khóa nhận diện:{' '}
                                              <span className="font-semibold text-slate-600">
                                                {comment.matchedKeywords.join(', ')}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}

                              {/* Tab Content: Good Comments */}
                              {activeTab === 'good' && (
                                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                                  {row.summary.goodComments.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-500 italic">
                                      Chưa có nhận xét tốt nào được ghi nhận cho cơ sở này trong kỳ.
                                    </div>
                                  ) : (
                                    row.summary.goodComments.map((comment, cIdx) => (
                                      <div
                                        key={cIdx}
                                        className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/70 hover:bg-white transition-colors text-xs space-y-1.5"
                                      >
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-black bg-emerald-600 text-white">
                                            ★ {comment.item.rating ?? 5} sao
                                          </span>
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            <ThumbsUp className="w-2.5 h-2.5 text-emerald-600" />
                                            Khen ngợi / Hài lòng
                                          </span>
                                          <strong className="text-slate-900">
                                            Học viên: {comment.item.student || 'Chưa có tên'}
                                          </strong>
                                          {comment.item.customer && (
                                            <span className="text-slate-500">
                                              (PH: {comment.item.customer})
                                            </span>
                                          )}
                                          {comment.item.subject && (
                                            <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 text-[10px] font-medium">
                                              {comment.item.subject}
                                            </span>
                                          )}
                                          <span className="text-[11px] text-slate-400 ml-auto">
                                            {formatDate(comment.item.responseAt, true)}
                                          </span>
                                        </div>
                                        <p className="text-slate-800 font-medium pl-1 text-xs sm:text-sm">
                                          {comment.item.detail ? (
                                            <span>“{comment.item.detail}”</span>
                                          ) : (
                                            <span className="text-slate-400 italic">
                                              Học viên chấm {comment.item.rating} sao
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                    ))
                                  )}
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
    )}
  </section>
);
};
