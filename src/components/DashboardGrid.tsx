import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  ImprovementCategoryKey,
  Part1Granularity,
  Part1Metrics
} from '../types';
import { BRAND_COLORS } from '../services/zaloPart1Service';
import { formatNumber } from '../services/sheetService';
import { ChevronRight } from 'lucide-react';

interface DashboardGridProps {
  metrics: Part1Metrics;
  onSelectStar: (stars: 5 | 4 | 3 | 2 | 1) => void;
  onSelectIssue: (categoryKey: ImprovementCategoryKey) => void;
}

const EmptyChartState: React.FC<{ text?: string }> = ({
  text = 'Chưa có dữ liệu'
}) => (
  <div className="h-[280px] rounded-xl border border-dashed border-[#DCE6ED] bg-[#F8FBFD] flex items-center justify-center text-sm font-semibold text-[#647D90]">
    {text}
  </div>
);

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  metrics,
  onSelectStar,
  onSelectIssue
}) => {
  const [granularity, setGranularity] = useState<Part1Granularity>('day');

  // Dữ liệu Biểu đồ 1 theo ngày / tuần / tháng
  const efficiencyChartData = useMemo(() => {
    const raw = metrics.efficiencySeries[granularity] ?? [];
    return raw.map((p) => ({
      ...p,
      ratePct: p.responseRate != null ? Math.round(p.responseRate * 1000) / 10 : null
    }));
  }, [metrics.efficiencySeries, granularity]);

  const hasPendingInChart1 = useMemo(
    () => efficiencyChartData.some((d) => d.isPendingWait),
    [efficiencyChartData]
  );

  const maxRateAxis = useMemo(() => {
    const maxObserved = Math.max(25, ...efficiencyChartData.map((d) => d.ratePct ?? 0));
    return Math.ceil(Math.max(40, maxObserved + 5) / 10) * 10;
  }, [efficiencyChartData]);

  // Dữ liệu Biểu đồ 2: 5 sao -> 1 sao
  const totalRatings = metrics.replyItems.length;
  const maxTierCount = Math.max(1, ...metrics.ratingTiers.map((t) => t.count));

  const satisfiedSumPct = useMemo(() => {
    if (!totalRatings) return null;
    const count = metrics.satisfiedItems.length;
    return (count / totalRatings) * 100;
  }, [metrics.satisfiedItems.length, totalRatings]);

  const neutralSumPct = useMemo(() => {
    if (!totalRatings) return null;
    const count = metrics.ratingTiers.find((t) => t.stars === 3)?.count ?? 0;
    return (count / totalRatings) * 100;
  }, [metrics.ratingTiers, totalRatings]);

  const dissatisfiedSumPct = useMemo(() => {
    if (!totalRatings) return null;
    const c1 = metrics.ratingTiers.find((t) => t.stars === 1)?.count ?? 0;
    const c2 = metrics.ratingTiers.find((t) => t.stars === 2)?.count ?? 0;
    return ((c1 + c2) / totalRatings) * 100;
  }, [metrics.ratingTiers, totalRatings]);

  // Dữ liệu Biểu đồ 3: 100% stacked theo tháng
  const qualityTrendData = metrics.monthlyQualityTrend;

  // Dữ liệu Biểu đồ 4: Pareto 7 nhóm vấn đề
  const paretoData = useMemo(
    () =>
      metrics.paretoIssues.map((p) => ({
        ...p,
        pctRounded: Math.round(p.pctOfComments * 10) / 10,
        cumRounded: Math.round(p.cumulativePct * 10) / 10
      })),
    [metrics.paretoIssues]
  );

  return (
    <section
      className="mx-[var(--page-gutter)] mb-6"
      aria-label="Phân tích trực quan Phần 1"
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* ============================================================
            BIỂU ĐỒ 1. HIỆU QUẢ THU THẬP PHẢN HỒI
            ============================================================ */}
        <article className="bg-white border border-[#DCE6ED] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3.5 border-b border-[#EDF2F7]">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1B5EA6] block">
                  BIỂU ĐỒ 1 · CÙNG LÔ KHẢO SÁT
                </span>
                <h3 className="text-lg font-extrabold text-[#1A3A5C] tracking-tight mt-0.5">
                  Hiệu quả thu thập phản hồi
                </h3>
                <p className="text-xs text-[#526B82] mt-0.5">
                  Lượt gửi &amp; phản hồi cùng lô (cửa sổ chờ {metrics.waitWindowDays} ngày) đối chiếu KPI 25%
                </p>
              </div>

              <div
                className="inline-flex items-center rounded-lg border border-[#DCE6ED] bg-[#F4F8FB] p-0.5 shrink-0 self-start"
                role="tablist"
                aria-label="Chế độ xem thời gian"
              >
                {(
                  [
                    { id: 'day', label: 'Ngày' },
                    { id: 'week', label: 'Tuần' },
                    { id: 'month', label: 'Tháng' }
                  ] as const
                ).map((tab) => {
                  const active = granularity === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setGranularity(tab.id)}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1B5EA6] text-white'
                          : 'text-[#526B82] hover:text-[#1A3A5C]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-[#334E68]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs inline-block bg-[#1B5EA6]" />
                Lượt gửi
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs inline-block bg-[#3EA8E0]" />
                Phản hồi cùng lô
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-0.5 inline-block bg-[#4CAF8A]" />
                Tỷ lệ phản hồi (%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-[#F2775A] inline-block" />
                KPI 25%
              </span>
              {hasPendingInChart1 && (
                <span className="inline-flex items-center gap-1.5 text-[#9A7208]">
                  <span
                    className="w-3 h-3 rounded-xs inline-block border border-dashed border-[#1B5EA6]"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(45deg, #F9C84666, #F9C84666 3px, #ffffff 3px, #ffffff 6px)'
                    }}
                  />
                  Chưa đủ {metrics.waitWindowDays} ngày chờ
                </span>
              )}
            </div>
          </div>

          {efficiencyChartData.length === 0 ? (
            <EmptyChartState text="Chưa có dữ liệu gửi khảo sát trong khoảng thời gian đã chọn" />
          ) : (
            <div className="h-[290px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={efficiencyChartData}
                  margin={{ top: 14, right: 10, left: -12, bottom: 4 }}
                >
                  <defs>
                    <pattern
                      id="pendingSentHatch"
                      width="6"
                      height="6"
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(45)"
                    >
                      <rect width="6" height="6" fill="#1B5EA6" fillOpacity="0.18" />
                      <line x1="0" y1="0" x2="0" y2="6" stroke="#1B5EA6" strokeWidth="2" />
                    </pattern>
                    <pattern
                      id="pendingReplyHatch"
                      width="6"
                      height="6"
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(45)"
                    >
                      <rect width="6" height="6" fill="#3EA8E0" fillOpacity="0.22" />
                      <line x1="0" y1="0" x2="0" y2="6" stroke="#3EA8E0" strokeWidth="2" />
                    </pattern>
                  </defs>

                  <CartesianGrid stroke="#EDF2F7" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#526B82', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: '#DCE6ED' }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="count"
                    tick={{ fill: '#1A3A5C', fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="rate"
                    orientation="right"
                    domain={[0, maxRateAxis]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: '#2A7E60', fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const pt = payload[0]?.payload as (typeof efficiencyChartData)[number];
                      return (
                        <div className="rounded-xl border border-[#1A3A5C] bg-white px-3.5 py-2.5 text-xs shadow-lg tabular-nums">
                          <div className="font-extrabold text-[#1A3A5C] mb-1">
                            {pt.fullLabel}
                          </div>
                          <div className="space-y-0.5 text-[#334E68]">
                            <div>
                              Lượt gửi:{' '}
                              <strong className="text-[#1B5EA6]">
                                {formatNumber(pt.sentCount)}
                              </strong>
                            </div>
                            <div>
                              Phản hồi cùng lô (≤{metrics.waitWindowDays} ngày):{' '}
                              <strong className="text-[#3EA8E0]">
                                {formatNumber(pt.cohortReplyWithinWaitCount)}
                              </strong>
                            </div>
                            <div>
                              Tỷ lệ phản hồi:{' '}
                              <strong
                                style={{
                                  color:
                                    (pt.ratePct ?? 0) >= 25
                                      ? BRAND_COLORS.green
                                      : BRAND_COLORS.coral
                                }}
                              >
                                {pt.ratePct == null
                                  ? 'Chưa có dữ liệu'
                                  : `${pt.ratePct.toFixed(1).replace('.', ',')}%`}
                              </strong>
                            </div>
                            <div
                              className="pt-1 mt-1 border-t border-[#EDF2F7] font-bold"
                              style={{
                                color: pt.isPendingWait ? '#9A7208' : BRAND_COLORS.green
                              }}
                            >
                              {pt.isPendingWait
                                ? `Chưa đủ ${metrics.waitWindowDays} ngày chờ (${formatNumber(pt.pendingSentCount)}/${formatNumber(pt.sentCount)} lượt)`
                                : `Đã đủ ${metrics.waitWindowDays} ngày chờ`}
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />

                  <ReferenceLine
                    yAxisId="rate"
                    y={25}
                    stroke={BRAND_COLORS.coral}
                    strokeDasharray="5 4"
                    strokeWidth={1.75}
                    label={{
                      value: 'KPI 25%',
                      position: 'insideTopRight',
                      fill: BRAND_COLORS.coral,
                      fontSize: 11,
                      fontWeight: 800
                    }}
                  />

                  <Bar
                    yAxisId="count"
                    dataKey="sentCount"
                    name="Lượt gửi"
                    barSize={18}
                    radius={[4, 4, 0, 0]}
                  >
                    {efficiencyChartData.map((entry) => (
                      <Cell
                        key={`sent-${entry.key}`}
                        fill={
                          entry.isPendingWait
                            ? 'url(#pendingSentHatch)'
                            : BRAND_COLORS.blue
                        }
                        stroke={entry.isPendingWait ? BRAND_COLORS.blue : undefined}
                        strokeDasharray={entry.isPendingWait ? '3 2' : undefined}
                      />
                    ))}
                  </Bar>

                  <Bar
                    yAxisId="count"
                    dataKey="cohortReplyWithinWaitCount"
                    name="Phản hồi cùng lô"
                    barSize={18}
                    radius={[4, 4, 0, 0]}
                  >
                    {efficiencyChartData.map((entry) => (
                      <Cell
                        key={`reply-${entry.key}`}
                        fill={
                          entry.isPendingWait
                            ? 'url(#pendingReplyHatch)'
                            : BRAND_COLORS.sky
                        }
                        stroke={entry.isPendingWait ? BRAND_COLORS.sky : undefined}
                        strokeDasharray={entry.isPendingWait ? '3 2' : undefined}
                      />
                    ))}
                  </Bar>

                  <Line
                    yAxisId="rate"
                    type="monotone"
                    dataKey="ratePct"
                    name="Tỷ lệ phản hồi (%)"
                    stroke={BRAND_COLORS.green}
                    strokeWidth={2.5}
                    dot={(props: any) => {
                      const { cx, cy, payload, index } = props;
                      if (cx == null || cy == null) return <g key={`empty-${index}`} />;
                      const pending = Boolean(payload?.isPendingWait);
                      return (
                        <circle
                          key={`dot-${payload?.key}`}
                          cx={cx}
                          cy={cy}
                          r={pending ? 5 : 4}
                          fill={pending ? '#FFFFFF' : BRAND_COLORS.green}
                          stroke={pending ? BRAND_COLORS.yellow : '#FFFFFF'}
                          strokeWidth={pending ? 2.5 : 1.5}
                        />
                      );
                    }}
                    activeDot={{ r: 6, fill: BRAND_COLORS.green, stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        {/* ============================================================
            BIỂU ĐỒ 2. PHÂN BỐ ĐÁNH GIÁ SAO (5 SAO ĐẾN 1 SAO)
            ============================================================ */}
        <article className="bg-white border border-[#DCE6ED] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3.5 border-b border-[#EDF2F7]">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1B5EA6] block">
                  BIỂU ĐỒ 2 · MỨC ĐỘ HÀI LÒNG
                </span>
                <h3 className="text-lg font-extrabold text-[#1A3A5C] tracking-tight mt-0.5">
                  Phân bố đánh giá sao
                </h3>
                <p className="text-xs text-[#526B82] mt-0.5">
                  Nhấn vào từng mức sao (5★ → 1★) để xem danh sách phản hồi tương ứng
                </p>
              </div>
              <span className="text-xs font-extrabold text-[#1A3A5C] bg-[#F4F8FB] border border-[#DCE6ED] rounded-lg px-2.5 py-1.5 tabular-nums self-start">
                {totalRatings === 0
                  ? 'Chưa có dữ liệu'
                  : `${formatNumber(totalRatings)} đánh giá`}
              </span>
            </div>
          </div>

          {totalRatings === 0 ? (
            <EmptyChartState text="Chưa có dữ liệu đánh giá sao trong kỳ đã chọn" />
          ) : (
            <div className="my-3 space-y-2.5 flex-1 flex flex-col justify-center">
              {metrics.ratingTiers.map((tier) => {
                const barWidthPct = Math.max(
                  tier.count > 0 ? 4 : 0,
                  (tier.count / maxTierCount) * 100
                );
                const levelText =
                  tier.stars === 5
                    ? 'Rất hài lòng'
                    : tier.stars === 4
                    ? 'Hài lòng'
                    : tier.stars === 3
                    ? 'Cần quan tâm'
                    : 'Không hài lòng';

                return (
                  <button
                    key={tier.stars}
                    type="button"
                    onClick={() => onSelectStar(tier.stars)}
                    className="group w-full text-left rounded-xl border border-transparent hover:border-[#DCE6ED] hover:bg-[#F8FBFD] px-2.5 py-2 transition-colors cursor-pointer"
                    title={`Nhấn để xem ${formatNumber(tier.count)} phản hồi ${tier.stars} sao`}
                  >
                    <div className="grid grid-cols-[64px_92px_1fr_54px_56px_18px] sm:grid-cols-[68px_108px_1fr_60px_62px_18px] items-center gap-2.5">
                      <span className="text-sm font-extrabold text-[#1A3A5C] tabular-nums flex items-center gap-1">
                        <span>{tier.stars} sao</span>
                        <span style={{ color: BRAND_COLORS.yellow }}>★</span>
                      </span>

                      <span className="text-[11px] font-semibold text-[#526B82] truncate">
                        {levelText}
                      </span>

                      <div className="h-3.5 rounded-full bg-[#EDF2F7] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${barWidthPct}%`,
                            backgroundColor: tier.color
                          }}
                        />
                      </div>

                      <span className="text-right text-sm font-extrabold text-[#1A3A5C] tabular-nums">
                        {formatNumber(tier.count)}
                      </span>

                      <span className="text-right text-xs font-bold text-[#526B82] tabular-nums">
                        {tier.pct.toFixed(1).replace('.', ',')}%
                      </span>

                      <ChevronRight className="w-4 h-4 text-[#94A8B8] group-hover:text-[#1B5EA6] transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Summary band matching satisfaction colors */}
          <div className="pt-3 border-t border-[#EDF2F7] grid grid-cols-3 gap-2 text-center text-xs tabular-nums">
            <div className="rounded-lg bg-[#F8FBFD] border border-[#DCE6ED] py-2 px-2">
              <div className="font-bold text-[#526B82] text-[11px]">4–5★ Hài lòng</div>
              <div className="font-extrabold mt-0.5" style={{ color: BRAND_COLORS.green }}>
                {satisfiedSumPct == null
                  ? 'Chưa có dữ liệu'
                  : `${satisfiedSumPct.toFixed(1).replace('.', ',')}%`}
              </div>
            </div>
            <div className="rounded-lg bg-[#F8FBFD] border border-[#DCE6ED] py-2 px-2">
              <div className="font-bold text-[#526B82] text-[11px]">3★ Cần quan tâm</div>
              <div className="font-extrabold mt-0.5 text-[#9A7208]">
                {neutralSumPct == null
                  ? 'Chưa có dữ liệu'
                  : `${neutralSumPct.toFixed(1).replace('.', ',')}%`}
              </div>
            </div>
            <div className="rounded-lg bg-[#F8FBFD] border border-[#DCE6ED] py-2 px-2">
              <div className="font-bold text-[#526B82] text-[11px]">1–2★ Không hài lòng</div>
              <div className="font-extrabold mt-0.5" style={{ color: BRAND_COLORS.coral }}>
                {dissatisfiedSumPct == null
                  ? 'Chưa có dữ liệu'
                  : `${dissatisfiedSumPct.toFixed(1).replace('.', ',')}%`}
              </div>
            </div>
          </div>
        </article>

        {/* ============================================================
            BIỂU ĐỒ 3. XU HƯỚNG CHẤT LƯỢNG DỊCH VỤ (CỘT CHỒNG 100%)
            ============================================================ */}
        <article className="bg-white border border-[#DCE6ED] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3.5 border-b border-[#EDF2F7]">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1B5EA6] block">
                  BIỂU ĐỒ 3 · CỘT CHỒNG 100% THEO THÁNG
                </span>
                <h3 className="text-lg font-extrabold text-[#1A3A5C] tracking-tight mt-0.5">
                  Xu hướng chất lượng dịch vụ
                </h3>
                <p className="text-xs text-[#526B82] mt-0.5">
                  Cơ cấu % theo 3 nhóm mức độ hài lòng và tổng số phản hồi từng tháng
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[#334E68] pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs inline-block bg-[#4CAF8A]" />
                  4–5★ Hài lòng
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs inline-block bg-[#F9C846]" />
                  3★ Cần quan tâm
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs inline-block bg-[#F2775A]" />
                  1–2★ Không hài lòng
                </span>
              </div>
            </div>
          </div>

          {qualityTrendData.length === 0 ? (
            <EmptyChartState text="Chưa có dữ liệu xu hướng theo tháng" />
          ) : (
            <div className="h-[310px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={qualityTrendData}
                  margin={{ top: 26, right: 12, left: -14, bottom: 4 }}
                >
                  <CartesianGrid stroke="#EDF2F7" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#1A3A5C', fontSize: 11, fontWeight: 700 }}
                    axisLine={{ stroke: '#DCE6ED' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: '#526B82', fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const m = payload[0]?.payload as (typeof qualityTrendData)[number];
                      return (
                        <div className="rounded-xl border border-[#1A3A5C] bg-white px-3.5 py-2.5 text-xs shadow-lg tabular-nums">
                          <div className="font-extrabold text-[#1A3A5C] mb-1">
                            {m.label} · Tổng {formatNumber(m.total)} phản hồi
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span style={{ color: BRAND_COLORS.green }} className="font-bold">
                                4–5 sao (Hài lòng):
                              </span>
                              <span className="font-extrabold text-[#1A3A5C]">
                                {formatNumber(m.satisfiedCount)} ({m.satisfiedPct.toFixed(1).replace('.', ',')}%)
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="font-bold text-[#9A7208]">
                                3 sao (Cần quan tâm):
                              </span>
                              <span className="font-extrabold text-[#1A3A5C]">
                                {formatNumber(m.attentionCount)} ({m.attentionPct.toFixed(1).replace('.', ',')}%)
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span style={{ color: BRAND_COLORS.coral }} className="font-bold">
                                1–2 sao (Không hài lòng):
                              </span>
                              <span className="font-extrabold text-[#1A3A5C]">
                                {formatNumber(m.dissatisfiedCount)} ({m.dissatisfiedPct.toFixed(1).replace('.', ',')}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />

                  <Bar
                    dataKey="satisfiedPct"
                    stackId="quality"
                    fill={BRAND_COLORS.green}
                    barSize={38}
                  >
                    <LabelList
                      dataKey="satisfiedPct"
                      position="center"
                      formatter={(val: unknown) => {
                        const n = Number(val);
                        return n >= 12 ? `${n.toFixed(0)}%` : '';
                      }}
                      fill="#FFFFFF"
                      fontSize={11}
                      fontWeight={800}
                    />
                  </Bar>

                  <Bar
                    dataKey="attentionPct"
                    stackId="quality"
                    fill={BRAND_COLORS.yellow}
                    barSize={38}
                  >
                    <LabelList
                      dataKey="attentionPct"
                      position="center"
                      formatter={(val: unknown) => {
                        const n = Number(val);
                        return n >= 10 ? `${n.toFixed(0)}%` : '';
                      }}
                      fill="#1A3A5C"
                      fontSize={10}
                      fontWeight={800}
                    />
                  </Bar>

                  <Bar
                    dataKey="dissatisfiedPct"
                    stackId="quality"
                    fill={BRAND_COLORS.coral}
                    barSize={38}
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList
                      dataKey="total"
                      position="top"
                      formatter={(val: unknown) => `${formatNumber(Number(val))} ph`}
                      fill="#1A3A5C"
                      fontSize={11}
                      fontWeight={800}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        {/* ============================================================
            BIỂU ĐỒ 4. THỐNG KÊ CÁC NHÓM VẤN ĐỀ CẦN CẢI THIỆN (PARETO)
            ============================================================ */}
        <article className="bg-white border border-[#DCE6ED] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3.5 border-b border-[#EDF2F7]">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1B5EA6] block">
                  BIỂU ĐỒ 4 · PHÂN TÍCH PARETO (7 NHÓM VẤN ĐỀ)
                </span>
                <h3 className="text-lg font-extrabold text-[#1A3A5C] tracking-tight mt-0.5">
                  Thống kê các nhóm vấn đề cần cải thiện
                </h3>
                <p className="text-xs text-[#526B82] mt-0.5">
                  Phân tích mọi nhận xét có góp ý (kể cả 4–5★) · Đa nhãn, không tính trùng phản hồi gốc
                </p>
              </div>
              <span className="text-xs font-extrabold text-[#1A3A5C] bg-[#F4F8FB] border border-[#DCE6ED] rounded-lg px-2.5 py-1.5 tabular-nums self-start whitespace-nowrap">
                {metrics.uniqueFeedbackAnalyzedCount === 0
                  ? 'Chưa có góp ý'
                  : `${formatNumber(metrics.uniqueFeedbackAnalyzedCount)} góp ý · ${formatNumber(metrics.totalIssueMentions)} lượt gắn nhóm`}
              </span>
            </div>
          </div>

          {metrics.uniqueFeedbackAnalyzedCount === 0 ? (
            <EmptyChartState text="Chưa có nhận xét góp ý chi tiết trong kỳ đã chọn" />
          ) : (
            <div className="mt-2 flex-1 flex flex-col justify-between gap-3">
              {/* Pareto Chart */}
              <div className="h-[195px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={paretoData}
                    margin={{ top: 14, right: 6, left: -18, bottom: 2 }}
                  >
                    <CartesianGrid stroke="#EDF2F7" vertical={false} />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fill: '#334E68', fontSize: 10, fontWeight: 700 }}
                      axisLine={{ stroke: '#DCE6ED' }}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis
                      yAxisId="count"
                      allowDecimals={false}
                      tick={{ fill: '#1A3A5C', fontSize: 10, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="pct"
                      orientation="right"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fill: BRAND_COLORS.purple, fontSize: 10, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0]?.payload as (typeof paretoData)[number];
                        return (
                          <div className="rounded-xl border border-[#1A3A5C] bg-white px-3.5 py-2.5 text-xs shadow-lg max-w-xs tabular-nums">
                            <div className="font-extrabold text-[#1A3A5C] mb-1">
                              {item.label}
                            </div>
                            <div className="text-[#334E68]">
                              Số lượt phản ánh:{' '}
                              <strong style={{ color: item.color }}>
                                {formatNumber(item.count)}
                              </strong>{' '}
                              ({item.pctRounded.toFixed(1).replace('.', ',')}% số góp ý)
                            </div>
                            <div className="text-[#334E68]">
                              Tỷ lệ tích lũy Pareto:{' '}
                              <strong style={{ color: BRAND_COLORS.purple }}>
                                {item.cumRounded.toFixed(1).replace('.', ',')}%
                              </strong>
                            </div>
                            <div className="text-[11px] text-[#1B5EA6] font-bold mt-1">
                              Nhấn để xem nhận xét gốc &amp; cơ sở →
                            </div>
                          </div>
                        );
                      }}
                    />

                    <Bar
                      yAxisId="count"
                      dataKey="count"
                      barSize={26}
                      radius={[4, 4, 0, 0]}
                      className="cursor-pointer"
                      onClick={(barData: any) => {
                        const key = barData?.key ?? barData?.payload?.key;
                        if (key) onSelectIssue(key);
                      }}
                    >
                      {paretoData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="top"
                        fill="#1A3A5C"
                        fontSize={10}
                        fontWeight={800}
                      />
                    </Bar>

                    <Line
                      yAxisId="pct"
                      type="monotone"
                      dataKey="cumRounded"
                      stroke={BRAND_COLORS.purple}
                      strokeWidth={2.25}
                      dot={{ r: 3.5, fill: BRAND_COLORS.purple, stroke: '#FFFFFF', strokeWidth: 1.5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* 7-Category Interactive List (full labels + count + % + click drilldown) */}
              <div className="divide-y divide-[#EDF2F7] border border-[#DCE6ED] rounded-xl overflow-hidden">
                {paretoData.map((issue, idx) => (
                  <button
                    key={issue.key}
                    type="button"
                    onClick={() => onSelectIssue(issue.key)}
                    className="w-full px-3 py-1.5 bg-white hover:bg-[#F4F8FB] flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                    title={`Nhấn để xem nhận xét gốc nhóm: ${issue.label}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-bold text-[#647D90] w-4 tabular-nums shrink-0">
                        {idx + 1}.
                      </span>
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: issue.color }}
                      />
                      <span className="text-xs font-bold text-[#1A3A5C] truncate">
                        {issue.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
                      <span className="text-xs font-extrabold text-[#1A3A5C]">
                        {formatNumber(issue.count)}
                      </span>
                      <span className="text-[11px] font-semibold text-[#526B82] w-12 text-right">
                        {issue.pctRounded.toFixed(1).replace('.', ',')}%
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#94A8B8]" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
};
