import React, { useEffect, useMemo, useState } from 'react';
import {
  ImprovementCategoryKey,
  Part1DrilldownState,
  Part1KpiId,
  Part1Metrics,
  SheetRowItem
} from '../types';
import {
  BRAND_COLORS,
  IMPROVEMENT_CATEGORIES
} from '../services/zaloPart1Service';
import { formatDate, formatNumber, formatPercent, formatRating } from '../services/sheetService';
import { Search, X } from 'lucide-react';

interface Part1DrilldownModalProps {
  drilldown: Part1DrilldownState;
  metrics: Part1Metrics;
  onClose: () => void;
}

const KPI_TITLES: Record<Part1KpiId, string> = {
  rate: 'Chi tiết: Tỷ lệ phản hồi (Tổng gửi & Tổng phản hồi)',
  replySplit: 'Chi tiết: Tổng lượt phản hồi Cuối kỳ / Giữa kỳ',
  avg: 'Chi tiết: Điểm đánh giá trung bình',
  attention: 'Chi tiết: Phản hồi cần quan tâm (1–3 sao)'
};

function getStarColor(rating: number | null): string {
  if (rating === 5) return BRAND_COLORS.green;
  if (rating === 4) return BRAND_COLORS.sky;
  if (rating === 3) return BRAND_COLORS.yellow;
  return BRAND_COLORS.coral;
}

export const Part1DrilldownModal: React.FC<Part1DrilldownModalProps> = ({
  drilldown,
  metrics,
  onClose
}) => {
  const [search, setSearch] = useState('');
  const [rateSubTab, setRateSubTab] = useState<'sent' | 'reply'>('sent');
  const [courseFilter, setCourseFilter] = useState<'all' | 'mid' | 'final'>('all');
  const [avgGroupFilter, setAvgGroupFilter] = useState<'all' | 'high' | 'low'>('all');

  useEffect(() => {
    setSearch('');
    setRateSubTab('sent');
    setCourseFilter('all');
    setAvgGroupFilter('all');
  }, [drilldown]);

  useEffect(() => {
    if (!drilldown) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drilldown, onClose]);

  const modalContent = useMemo(() => {
    if (!drilldown) return null;

    if (drilldown.kind === 'kpi') {
      const kpiId = drilldown.kpiId;
      let rows: SheetRowItem[] = [];
      let subtitle = '';
      let mode: 'sent' | 'reply' = 'reply';

      switch (kpiId) {
        case 'rate': {
          mode = rateSubTab;
          rows = rateSubTab === 'sent' ? metrics.sentItems : metrics.replyItems;
          subtitle = `Tỷ lệ phản hồi: ${
            metrics.kpis.overallReplyRate == null
              ? 'Chưa có dữ liệu'
              : formatPercent(metrics.kpis.overallReplyRate, 1)
          } (${formatNumber(metrics.replyItems.length)} / ${formatNumber(metrics.sentItems.length)}) · TB tháng: ${
            metrics.kpis.monthlyAvgReplyRate == null
              ? 'Chưa có dữ liệu'
              : formatPercent(metrics.kpis.monthlyAvgReplyRate, 1)
          }`;
          break;
        }
        case 'replySplit': {
          mode = 'reply';
          rows = metrics.replyItems.filter((item) => {
            const c = (item.course || '').toLowerCase();
            if (courseFilter === 'mid') return c.includes('giữa');
            if (courseFilter === 'final') return c.includes('cuối');
            return true;
          });
          subtitle = `Phản hồi Cuối kỳ / Giữa kỳ: ${formatNumber(metrics.surveyTypeBreakdown.replyFinalTerm)} / ${formatNumber(metrics.surveyTypeBreakdown.replyMidTerm)} · Lượt gửi Giữa kỳ / Cuối kỳ: ${formatNumber(metrics.surveyTypeBreakdown.sentMidTerm)} / ${formatNumber(metrics.surveyTypeBreakdown.sentFinalTerm)}`;
          break;
        }
        case 'avg':
          mode = 'reply';
          rows =
            avgGroupFilter === 'high'
              ? metrics.satisfiedItems
              : avgGroupFilter === 'low'
              ? metrics.attentionItems
              : metrics.replyItems;
          subtitle = `${formatNumber(metrics.replyItems.length)} đánh giá hợp lệ (4–5★: ${formatNumber(metrics.satisfiedItems.length)} · 1–3★: ${formatNumber(metrics.attentionItems.length)}) · Điểm TB: ${
            metrics.kpis.avgRating == null ? 'Chưa có dữ liệu' : `${formatRating(metrics.kpis.avgRating)} / 5`
          }`;
          break;
        case 'attention':
          mode = 'reply';
          rows = metrics.attentionItems;
          subtitle = `${formatNumber(rows.length)} phản hồi 1–3 sao cần quan tâm (${
            metrics.kpis.attentionRate == null
              ? 'Chưa có dữ liệu'
              : formatPercent(metrics.kpis.attentionRate, 1)
          })`;
          break;
      }

      return {
        title: KPI_TITLES[kpiId],
        subtitle,
        mode,
        rows: [...rows].sort((a, b) => {
          const ta = (mode === 'sent' ? a.sentAt : a.responseAt)?.getTime() ?? 0;
          const tb = (mode === 'sent' ? b.sentAt : b.responseAt)?.getTime() ?? 0;
          return tb - ta;
        }),
        issueCategoriesMap: null as Map<SheetRowItem, ImprovementCategoryKey[]> | null
      };
    }

    if (drilldown.kind === 'star') {
      const tier = metrics.ratingTiers.find((t) => t.stars === drilldown.stars);
      const rows = tier?.items ?? [];
      return {
        title: `Danh sách phản hồi mức ${drilldown.stars} sao`,
        subtitle: `${formatNumber(rows.length)} lượt (${tier ? `${tier.pct.toFixed(1).replace('.', ',')}%` : '0%'} tổng đánh giá hợp lệ)`,
        mode: 'reply' as const,
        rows,
        issueCategoriesMap: null
      };
    }

    const issue = metrics.paretoIssues.find((p) => p.key === drilldown.categoryKey);
    const issueMap = new Map<SheetRowItem, ImprovementCategoryKey[]>();
    const rows = (issue?.comments ?? []).map((rec) => {
      issueMap.set(rec.item, rec.categories);
      return rec.item;
    });

    return {
      title: `Nhóm vấn đề: ${issue?.label ?? drilldown.categoryKey}`,
      subtitle: `${formatNumber(rows.length)} nhận xét gốc (${issue ? `${issue.pctOfComments.toFixed(1).replace('.', ',')}%` : '0%'} số nhận xét góp ý) · Hiển thị nội dung gốc và cơ sở liên quan`,
      mode: 'reply' as const,
      rows,
      issueCategoriesMap: issueMap
    };
  }, [drilldown, metrics, rateSubTab, courseFilter, avgGroupFilter]);

  const filteredRows = useMemo(() => {
    if (!modalContent) return [];
    const q = search.trim().toLowerCase();
    if (!q) return modalContent.rows;
    return modalContent.rows.filter(
      (r) =>
        (r.student || '').toLowerCase().includes(q) ||
        (r.customer || '').toLowerCase().includes(q) ||
        (r.facility || '').toLowerCase().includes(q) ||
        (r.detail || '').toLowerCase().includes(q) ||
        (r.course || '').toLowerCase().includes(q)
    );
  }, [modalContent, search]);

  if (!drilldown || !modalContent) return null;

  const categoryLabelMap = new Map(IMPROVEMENT_CATEGORIES.map((c) => [c.key, c]));

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1A3A5C]/45 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={modalContent.title}
    >
      <div
        className="w-full max-w-5xl max-h-[88vh] bg-white border border-[#DCE6ED] rounded-2xl flex flex-col overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-[3px] w-full bg-[#1B5EA6]" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E7EEF3] bg-[#F8FBFD] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1B5EA6] block">
              DỮ LIỆU CHI TIẾT · PHẦN 1
            </span>
            <h3 className="text-lg font-extrabold text-[#1A3A5C] tracking-tight mt-0.5">
              {modalContent.title}
            </h3>
            <p className="text-xs font-medium text-[#526B82] mt-1 tabular-nums">
              {modalContent.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết"
            className="w-8 h-8 rounded-lg border border-[#DCE6ED] bg-white hover:bg-[#EDF4F8] text-[#1A3A5C] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & optional sub-tabs toolbar */}
        <div className="px-5 py-3 border-b border-[#EDF2F7] flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#647D90] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm học viên, phụ huynh, cơ sở, nội dung..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#DCE6ED] bg-[#F8FBFD] text-xs font-medium text-[#1A3A5C] focus:outline-none focus:border-[#3EA8E0]"
              />
            </div>

            {drilldown.kind === 'kpi' && drilldown.kpiId === 'rate' && (
              <div className="inline-flex items-center rounded-lg border border-[#DCE6ED] bg-[#F4F8FB] p-0.5 tabular-nums">
                <button
                  type="button"
                  onClick={() => setRateSubTab('sent')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                    rateSubTab === 'sent'
                      ? 'bg-[#1B5EA6] text-white'
                      : 'text-[#526B82] hover:text-[#1A3A5C]'
                  }`}
                >
                  Lượt gửi ({formatNumber(metrics.sentItems.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setRateSubTab('reply')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                    rateSubTab === 'reply'
                      ? 'bg-[#1B5EA6] text-white'
                      : 'text-[#526B82] hover:text-[#1A3A5C]'
                  }`}
                >
                  Lượt phản hồi ({formatNumber(metrics.replyItems.length)})
                </button>
              </div>
            )}

            {drilldown.kind === 'kpi' && drilldown.kpiId === 'replySplit' && (
              <div className="inline-flex items-center rounded-lg border border-[#DCE6ED] bg-[#F4F8FB] p-0.5 tabular-nums">
                {[
                  { id: 'all' as const, label: `Tất cả (${formatNumber(metrics.replyItems.length)})` },
                  { id: 'final' as const, label: `Cuối kỳ (${formatNumber(metrics.surveyTypeBreakdown.replyFinalTerm)})` },
                  { id: 'mid' as const, label: `Giữa kỳ (${formatNumber(metrics.surveyTypeBreakdown.replyMidTerm)})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCourseFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                      courseFilter === tab.id
                        ? 'bg-[#1B5EA6] text-white'
                        : 'text-[#526B82] hover:text-[#1A3A5C]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            {drilldown.kind === 'kpi' && drilldown.kpiId === 'avg' && (
              <div className="inline-flex items-center rounded-lg border border-[#DCE6ED] bg-[#F4F8FB] p-0.5 tabular-nums">
                {[
                  { id: 'all' as const, label: `Tất cả (${formatNumber(metrics.replyItems.length)})` },
                  { id: 'high' as const, label: `4–5 sao (${formatNumber(metrics.satisfiedItems.length)})` },
                  { id: 'low' as const, label: `1–3 sao (${formatNumber(metrics.attentionItems.length)})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAvgGroupFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                      avgGroupFilter === tab.id
                        ? 'bg-[#1B5EA6] text-white'
                        : 'text-[#526B82] hover:text-[#1A3A5C]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-xs font-bold text-[#526B82] tabular-nums">
            Hiển thị {formatNumber(filteredRows.length)} / {formatNumber(modalContent.rows.length)} bản ghi
          </span>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto">
          {filteredRows.length === 0 ? (
            <div className="p-10 text-center text-sm font-semibold text-[#647D90]">
              Chưa có dữ liệu phù hợp trong phạm vi đang chọn.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-[#1A3A5C] text-white">
                <tr>
                  <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                    {modalContent.mode === 'sent' ? 'Thời gian gửi' : 'Thời gian phản hồi'}
                  </th>
                  <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[10px]">
                    Cơ sở
                  </th>
                  <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[10px]">
                    Học viên / Phụ huynh
                  </th>
                  <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                    Môn · Loại
                  </th>
                  <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[10px] text-center whitespace-nowrap">
                    Đánh giá
                  </th>
                  <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[10px]">
                    Nội dung nhận xét gốc
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF2F7] bg-white">
                {filteredRows.slice(0, 250).map((item, idx) => {
                  const timeValue =
                    modalContent.mode === 'sent' ? item.sentAt : item.responseAt ?? item.sentAt;
                  const coCategories = modalContent.issueCategoriesMap?.get(item) ?? [];
                  const isPending =
                    item.sentAt &&
                    Date.now() - item.sentAt.getTime() <
                      metrics.waitWindowDays * 24 * 60 * 60 * 1000;

                  return (
                    <tr key={`${item.student}-${idx}`} className="hover:bg-[#F4F8FB]">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#334E68] whitespace-nowrap tabular-nums">
                        {formatDate(timeValue, true)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#1A3A5C] whitespace-nowrap">
                        {item.facility}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#1A3A5C]">
                          {item.student || item.customer || '—'}
                        </div>
                        {item.customer && item.customer !== item.student && (
                          <div className="text-[11px] text-[#647D90]">{item.customer}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-[#334E68]">
                        <span className="font-semibold">{item.subject}</span>
                        <span className="mx-1 text-[#CBD5E1]">·</span>
                        <span>{item.course}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap tabular-nums">
                        {item.rating != null ? (
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[11px] font-extrabold text-white"
                            style={{ backgroundColor: getStarColor(item.rating) }}
                          >
                            {item.rating} ★
                          </span>
                        ) : (
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[11px] font-bold border"
                            style={{
                              borderColor: isPending ? BRAND_COLORS.yellow : '#DCE6ED',
                              color: isPending ? '#9A7208' : '#647D90',
                              backgroundColor: isPending ? '#FFFBEB' : '#F8FAFC'
                            }}
                          >
                            {isPending ? 'Đang chờ' : 'Chưa phản hồi'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#1A3A5C] max-w-md leading-relaxed">
                        {item.detail ? (
                          <div>
                            <p className="m-0">“{item.detail}”</p>
                            {coCategories.length > 1 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {coCategories.map((catKey) => {
                                  const meta = categoryLabelMap.get(catKey);
                                  if (!meta) return null;
                                  return (
                                    <span
                                      key={catKey}
                                      className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#DCE6ED] bg-[#F8FBFD]"
                                      style={{ color: meta.color }}
                                    >
                                      {meta.shortLabel}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#94A8B8] italic">Không kèm nhận xét chữ</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {filteredRows.length > 250 && (
            <div className="px-5 py-2.5 text-center text-[11px] font-semibold text-[#647D90] bg-[#F8FBFD] border-t border-[#EDF2F7]">
              Đang hiển thị 250 bản ghi mới nhất. Dùng ô tìm kiếm để lọc bản ghi cụ thể.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
