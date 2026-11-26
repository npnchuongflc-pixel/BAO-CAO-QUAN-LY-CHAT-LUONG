import React, { useState } from 'react';
import { Part1KpiId, Part1Metrics } from '../types';
import { BRAND_COLORS } from '../services/zaloPart1Service';
import { formatDate, formatNumber, formatPercent, formatRating } from '../services/sheetService';
import {
  MessageSquare,
  Percent,
  Star,
  AlertTriangle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronRight
} from 'lucide-react';

export const COLORS = {
  navy: BRAND_COLORS.navy,
  blue: BRAND_COLORS.blue,
  sky: BRAND_COLORS.sky,
  green: BRAND_COLORS.green,
  yellow: BRAND_COLORS.yellow,
  coral: BRAND_COLORS.coral,
  purple: BRAND_COLORS.purple
};

interface KpiItemConfig {
  id: Part1KpiId;
  index: number;
  label: string;
  mainValue: string;
  isEmptyData: boolean;
  subText: string;
  secondarySubText?: string;
  secondaryColor?: string;
  benchmarkText?: string;
  benchmarkColor?: string;
  deltaLabel: string;
  deltaTrend: 'up' | 'down' | 'flat' | 'none';
  deltaGood: boolean | null; // true => green, false => coral, null => neutral
  accentColor: string;
  formula: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface KpiGridProps {
  metrics: Part1Metrics;
  onSelectKpi: (kpiId: Part1KpiId) => void;
}

function formatSignedNumber(val: number, decimals = 1): string {
  const abs = Math.abs(val).toFixed(decimals).replace('.', ',');
  if (val > 0.0001) return `+${abs}`;
  if (val < -0.0001) return `-${abs}`;
  return `0,${'0'.repeat(decimals)}`;
}

function sharePct(part: number, total: number): string {
  if (!total) return '0%';
  return `${((part / total) * 100).toFixed(0)}%`;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ metrics, onSelectKpi }) => {
  const [openTooltipId, setOpenTooltipId] = useState<Part1KpiId | null>(null);
  const { kpis, surveyTypeBreakdown } = metrics;

  const monthlyDiffPts =
    kpis.overallReplyRate != null && kpis.monthlyAvgReplyRate != null
      ? (kpis.overallReplyRate - kpis.monthlyAvgReplyRate) * 100
      : null;

  const rateColor =
    monthlyDiffPts == null
      ? BRAND_COLORS.blue
      : monthlyDiffPts >= 0
      ? BRAND_COLORS.green
      : monthlyDiffPts >= -3
      ? BRAND_COLORS.yellow
      : BRAND_COLORS.coral;

  const avgColor =
    kpis.avgRating == null
      ? BRAND_COLORS.yellow
      : kpis.avgRating >= 4.5
      ? BRAND_COLORS.green
      : kpis.avgRating >= 4.0
      ? BRAND_COLORS.yellow
      : BRAND_COLORS.coral;

  const attentionColor =
    kpis.attentionRate == null
      ? BRAND_COLORS.coral
      : kpis.attentionRate === 0
      ? BRAND_COLORS.green
      : kpis.attentionRate <= 0.08
      ? BRAND_COLORS.yellow
      : BRAND_COLORS.coral;

  const sentMid = surveyTypeBreakdown.sentMidTerm;
  const sentFinal = surveyTypeBreakdown.sentFinalTerm;

  const replyFinal = surveyTypeBreakdown.replyFinalTerm;
  const replyMid = surveyTypeBreakdown.replyMidTerm;
  const replySplitBase = replyFinal + replyMid || kpis.replyCount || 0;

  const starCount = (stars: 5 | 4 | 3 | 2 | 1) =>
    metrics.ratingTiers.find((t) => t.stars === stars)?.count ?? 0;

  const cards: KpiItemConfig[] = [
    {
      id: 'rate',
      index: 1,
      label: 'Tỷ lệ phản hồi',
      mainValue:
        kpis.overallReplyRate == null ? 'Chưa có dữ liệu' : formatPercent(kpis.overallReplyRate, 1),
      isEmptyData: kpis.overallReplyRate == null,
      subText:
        kpis.sentCount == null && kpis.replyCount == null
          ? 'Chưa có lượt gửi và phản hồi'
          : `Phản hồi: ${formatNumber(kpis.replyCount ?? 0)} / Gửi: ${formatNumber(kpis.sentCount ?? 0)}`,
      benchmarkText:
        kpis.monthlyAvgReplyRate == null || monthlyDiffPts == null
          ? 'Chưa có TB tháng để đối chiếu'
          : `So với TB tháng (${formatPercent(kpis.monthlyAvgReplyRate, 1)}): ${formatSignedNumber(monthlyDiffPts, 1)} đ.%`,
      benchmarkColor: rateColor,
      deltaLabel:
        kpis.overallReplyRateDeltaPts == null
          ? 'Chưa có dữ liệu kỳ trước'
          : `${formatSignedNumber(kpis.overallReplyRateDeltaPts, 1)} đ.% so với kỳ trước`,
      deltaTrend:
        kpis.overallReplyRateDeltaPts == null
          ? 'none'
          : kpis.overallReplyRateDeltaPts > 0.05
          ? 'up'
          : kpis.overallReplyRateDeltaPts < -0.05
          ? 'down'
          : 'flat',
      deltaGood:
        kpis.overallReplyRateDeltaPts == null
          ? null
          : kpis.overallReplyRateDeltaPts > 0.05
          ? true
          : kpis.overallReplyRateDeltaPts < -0.05
          ? false
          : null,
      accentColor: rateColor,
      formula: `Tỷ lệ phản hồi = Tổng lượt phản hồi (${formatNumber(kpis.replyCount ?? 0)}) / Tổng lượt gửi (${formatNumber(kpis.sentCount ?? 0)}). Đối chiếu trực tiếp với tỷ lệ trung bình tháng (${kpis.monthlyAvgReplyRate == null ? 'Chưa có dữ liệu' : `${formatPercent(kpis.monthlyAvgReplyRate, 1)} qua ${kpis.monthlyAvgMonthsCount} tháng`}) theo bộ lọc hiện tại.`,
      icon: Percent
    },
    {
      id: 'replySplit',
      index: 2,
      label: 'Tổng lượt phản hồi Cuối kỳ / Giữa kỳ',
      mainValue:
        kpis.replyCount == null
          ? 'Chưa có dữ liệu'
          : `${formatNumber(replyFinal)} / ${formatNumber(replyMid)}`,
      isEmptyData: kpis.replyCount == null,
      subText:
        kpis.replyCount == null
          ? 'Chưa ghi nhận phản hồi hợp lệ'
          : `Cuối kỳ ${sharePct(replyFinal, replySplitBase)} · Giữa kỳ ${sharePct(replyMid, replySplitBase)} (Tổng: ${formatNumber(kpis.replyCount)})`,
      secondarySubText:
        kpis.sentCount == null
          ? 'Chưa có lượt gửi trong kỳ'
          : `Lượt gửi Giữa kỳ / Cuối kỳ: ${formatNumber(sentMid)} / ${formatNumber(sentFinal)}`,
      deltaLabel:
        kpis.replyDeltaPct == null
          ? 'Chưa có dữ liệu kỳ trước'
          : `${formatSignedNumber(kpis.replyDeltaPct, 1)}% tổng PH vs kỳ trước`,
      deltaTrend:
        kpis.replyDeltaPct == null
          ? 'none'
          : kpis.replyDeltaPct > 0.05
          ? 'up'
          : kpis.replyDeltaPct < -0.05
          ? 'down'
          : 'flat',
      deltaGood:
        kpis.replyDeltaPct == null
          ? null
          : kpis.replyDeltaPct > 0.05
          ? true
          : kpis.replyDeltaPct < -0.05
          ? false
          : null,
      accentColor: BRAND_COLORS.sky,
      formula: `Số lượt phản hồi hợp lệ (1–5 sao) tách theo Cuối kỳ (${formatNumber(replyFinal)}) / Giữa kỳ (${formatNumber(replyMid)}). Bên dưới hiển thị Tổng lượt gửi Giữa kỳ (${formatNumber(sentMid)}) / Cuối kỳ (${formatNumber(sentFinal)}).`,
      icon: MessageSquare
    },
    {
      id: 'avg',
      index: 3,
      label: 'Điểm đánh giá trung bình',
      mainValue:
        kpis.avgRating == null ? 'Chưa có dữ liệu' : `${formatRating(kpis.avgRating)} / 5`,
      isEmptyData: kpis.avgRating == null,
      subText:
        kpis.avgRating == null
          ? 'Chưa có đánh giá sao hợp lệ'
          : `Thang 5 sao · ${formatNumber(kpis.replyCount)} đánh giá hợp lệ`,
      secondarySubText:
        kpis.avgRating == null
          ? undefined
          : `4–5 sao: ${formatNumber(kpis.satisfactionCount ?? 0)} lượt (5★: ${formatNumber(starCount(5))} · 4★: ${formatNumber(starCount(4))})`,
      secondaryColor: '#2A7E60',
      benchmarkText:
        kpis.avgRating == null
          ? undefined
          : `1–3 sao: ${formatNumber(kpis.attentionCount ?? 0)} lượt (3★: ${formatNumber(starCount(3))} · 2★: ${formatNumber(starCount(2))} · 1★: ${formatNumber(starCount(1))})`,
      benchmarkColor: (kpis.attentionCount ?? 0) > 0 ? '#C94B30' : '#2A7E60',
      deltaLabel:
        kpis.avgDeltaPts == null
          ? 'Chưa có dữ liệu kỳ trước'
          : `${formatSignedNumber(kpis.avgDeltaPts, 2)} sao so với kỳ trước`,
      deltaTrend:
        kpis.avgDeltaPts == null
          ? 'none'
          : kpis.avgDeltaPts > 0.005
          ? 'up'
          : kpis.avgDeltaPts < -0.005
          ? 'down'
          : 'flat',
      deltaGood:
        kpis.avgDeltaPts == null
          ? null
          : kpis.avgDeltaPts > 0.005
          ? true
          : kpis.avgDeltaPts < -0.005
          ? false
          : null,
      accentColor: avgColor,
      formula:
        'Trung bình cộng điểm sao (thang 1–5 sao) trên toàn bộ lượt đánh giá hợp lệ, kèm thống kê chi tiết số lượt 4–5 sao và 1–3 sao.',
      icon: Star
    },
    {
      id: 'attention',
      index: 4,
      label: 'Phản hồi cần quan tâm',
      mainValue:
        kpis.attentionRate == null
          ? 'Chưa có dữ liệu'
          : formatPercent(kpis.attentionRate, 1),
      isEmptyData: kpis.attentionRate == null,
      subText:
        kpis.attentionRate == null
          ? 'Chưa có đánh giá hợp lệ'
          : `${formatNumber(kpis.attentionCount)} / ${formatNumber(kpis.replyCount)} lượt đánh giá 1–3★`,
      deltaLabel:
        kpis.attentionDeltaPts == null
          ? 'Chưa có dữ liệu kỳ trước'
          : `${formatSignedNumber(kpis.attentionDeltaPts, 1)} đ.% so với kỳ trước`,
      deltaTrend:
        kpis.attentionDeltaPts == null
          ? 'none'
          : kpis.attentionDeltaPts > 0.05
          ? 'up'
          : kpis.attentionDeltaPts < -0.05
          ? 'down'
          : 'flat',
      // Với tỷ lệ phản hồi xấu 1–3★: giảm là TỐT (green), tăng là CẢNH BÁO (coral)
      deltaGood:
        kpis.attentionDeltaPts == null
          ? null
          : kpis.attentionDeltaPts < -0.05
          ? true
          : kpis.attentionDeltaPts > 0.05
          ? false
          : null,
      accentColor: attentionColor,
      formula:
        'Tỷ lệ phản hồi cần quan tâm = Số lượt đánh giá 1–3 sao / Tổng số lượt đánh giá hợp lệ (1–5 sao) trong kỳ. Chỉ số càng thấp càng tốt.',
      icon: AlertTriangle
    }
  ];

  return (
    <section className="mx-[var(--page-gutter)] mb-5" aria-label="Phần 1 - Chỉ số tổng quan">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-3">
        <div>
          <span className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1B5EA6]">
            PHẦN 1 – CHỈ SỐ TỔNG QUAN
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#1A3A5C] tracking-tight mt-0.5">
            Chỉ số vận hành &amp; hài lòng khách hàng Zalo OA
          </h2>
        </div>

        <div className="text-xs font-semibold text-[#526B82] tabular-nums">
          Kỳ báo cáo: <strong className="text-[#1A3A5C]">{formatDate(metrics.start)}</strong> –{' '}
          <strong className="text-[#1A3A5C]">{formatDate(metrics.end)}</strong>
          <span className="mx-2 text-[#DCE6ED]">|</span>
          So sánh kỳ trước:{' '}
          <strong className="text-[#1A3A5C]">
            {formatDate(metrics.prevStart)} – {formatDate(metrics.prevEnd)}
          </strong>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const isTooltipOpen = openTooltipId === card.id;
          const deltaTextColor =
            card.deltaGood === true
              ? '#2A7E60'
              : card.deltaGood === false
              ? '#C94B30'
              : '#647D90';

          return (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectKpi(card.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectKpi(card.id);
                }
              }}
              className="group relative bg-white border border-[#DCE6ED] hover:border-[#1B5EA6] rounded-xl p-4 flex flex-col justify-between transition-colors cursor-pointer text-left min-h-[178px]"
              title={`Nhấn để xem dữ liệu chi tiết: ${card.label}`}
            >
              {/* Top brand accent bar */}
              <span
                aria-hidden="true"
                className="absolute top-0 left-3 right-3 h-[3px] rounded-b-sm"
                style={{ backgroundColor: card.accentColor }}
              />

              {/* Header: Label + Formula Tooltip Button + Icon */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#526B82] leading-snug">
                      {card.index}. {card.label}
                    </span>
                    <button
                      type="button"
                      aria-label={`Xem công thức ${card.label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenTooltipId(isTooltipOpen ? null : card.id);
                      }}
                      onMouseEnter={() => setOpenTooltipId(card.id)}
                      onMouseLeave={() =>
                        setOpenTooltipId((prev) => (prev === card.id ? null : prev))
                      }
                      className="p-0.5 rounded text-[#647D90] hover:text-[#1B5EA6] cursor-pointer shrink-0"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${card.accentColor}1A`,
                      color: card.accentColor
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                </div>

                {/* Formula Tooltip Popover */}
                {isTooltipOpen && (
                  <div
                    role="tooltip"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute z-30 left-3 right-3 top-12 rounded-xl border border-[#1A3A5C] bg-white p-3 text-xs text-[#1A3A5C] leading-relaxed shadow-lg"
                  >
                    <div className="font-extrabold text-[#1B5EA6] mb-1">
                      Công thức: {card.label}
                    </div>
                    <p className="m-0 text-[11px] text-[#334E68]">{card.formula}</p>
                  </div>
                )}

                {/* Main Metric Value */}
                <div
                  className={`mt-3 font-extrabold tracking-tight tabular-nums leading-tight ${
                    card.isEmptyData
                      ? 'text-base text-[#647D90] py-1.5'
                      : 'text-[26px] xl:text-[25px] 2xl:text-[28px] text-[#1A3A5C]'
                  }`}
                >
                  {card.mainValue}
                </div>

                {/* Supporting Subtext */}
                <p className="mt-1.5 text-[11.5px] font-semibold text-[#334E68] leading-snug tabular-nums">
                  {card.subText}
                </p>

                {card.secondarySubText && (
                  <p
                    className={`mt-0.5 text-[11px] leading-snug tabular-nums ${
                      card.secondaryColor ? 'font-bold' : 'font-medium text-[#526B82]'
                    }`}
                    style={card.secondaryColor ? { color: card.secondaryColor } : undefined}
                  >
                    {card.secondarySubText}
                  </p>
                )}

                {card.benchmarkText && (
                  <p
                    className="mt-1 text-[11px] font-bold tabular-nums"
                    style={{
                      color:
                        card.benchmarkColor === BRAND_COLORS.yellow
                          ? '#9A7208'
                          : card.benchmarkColor || '#1A3A5C'
                    }}
                  >
                    {card.benchmarkText}
                  </p>
                )}
              </div>

              {/* Footer: Prior Period Delta + Drilldown Cue */}
              <div className="mt-3 pt-2.5 border-t border-[#EDF2F7] flex items-center justify-between gap-1.5">
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-bold tabular-nums leading-tight"
                  style={{ color: deltaTextColor }}
                >
                  {card.deltaTrend === 'up' && <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />}
                  {card.deltaTrend === 'down' && <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />}
                  {card.deltaTrend === 'flat' && <Minus className="w-3 h-3 shrink-0" />}
                  <span>{card.deltaLabel}</span>
                </span>

                <ChevronRight className="w-3.5 h-3.5 text-[#94A8B8] group-hover:text-[#1B5EA6] group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
