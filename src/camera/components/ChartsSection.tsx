import React, { useState } from 'react';
import { SiteStats, DailyTrendPoint, KPIData } from '../types/camera';
import { formatNumberVN, formatPctVN } from '../data/cameraDataService';
import { BarChart3, TrendingUp, PieChart } from 'lucide-react';

interface ChartsSectionProps {
  siteStatsList: SiteStats[];
  dailyTrends: DailyTrendPoint[];
  kpis: KPIData;
  periodLabel: string;
  onSelectSite?: (site: string) => void;
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  siteStatsList,
  dailyTrends,
  kpis,
  periodLabel,
  onSelectSite
}) => {
  const [hoveredTip, setHoveredTip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // Donut conic gradient string
  const totalIssues = kpis.totalIssues || 1;
  let cursor = 0;
  const conicStops = siteStatsList.length > 0
    ? siteStatsList.map((s) => {
        const start = cursor;
        const slicePct = (s.count / totalIssues) * 100;
        const end = cursor + slicePct;
        cursor = end;
        return `${s.color} ${start}% ${end}%`;
      }).join(', ')
    : '#e2e8f2 0% 100%';

  const maxSiteCount = Math.max(...siteStatsList.map((s) => s.count), 1);

  // Line Chart calculation
  const svgWidth = 680;
  const svgHeight = 235;
  const padding = { left: 38, right: 15, top: 20, bottom: 32 };
  const chartInnerWidth = svgWidth - padding.left - padding.right;
  const chartInnerHeight = svgHeight - padding.top - padding.bottom;

  const maxTrendIssues = Math.max(4, ...dailyTrends.map((d) => d.totalIssues));
  const span = Math.max(dailyTrends.length - 1, 1);

  const linePoints = dailyTrends.map((d, i) => {
    const x = padding.left + (i * chartInnerWidth) / span;
    const y = padding.top + (1 - d.totalIssues / maxTrendIssues) * chartInnerHeight;
    return { x, y, data: d };
  });

  const linePathD = linePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaPathD = linePoints.length > 0
    ? `${linePathD} L ${linePoints[linePoints.length - 1].x.toFixed(1)} ${svgHeight - padding.bottom} L ${linePoints[0].x.toFixed(1)} ${svgHeight - padding.bottom} Z`
    : '';

  // Stacked Bar Chart calculation
  const maxStackTotal = Math.max(4, ...dailyTrends.map((d) => d.unstable + d.lost + d.other));
  const barGap = chartInnerWidth / Math.max(dailyTrends.length, 1);
  const barWidth = Math.max(6, Math.min(22, barGap * 0.58));
  const everyStep = Math.max(1, Math.ceil(dailyTrends.length / 9));

  return (
    <div className="space-y-6 mb-6">
      {/* Top 2 Panels: Donut Distribution & Top Sites Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.4fr] gap-4 sm:gap-5">
        {/* Panel 1: Donut breakdown */}
        <article className="bg-white border border-[#e2e8f2] rounded-2xl shadow-[0_8px_30px_rgba(24,46,88,0.06)] overflow-hidden flex flex-col">
          <header className="p-4 sm:p-5 pb-3 border-b border-[#edf0f6] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#14213d] flex items-center gap-1.5 m-0">
                <PieChart className="w-4 h-4 text-[#2f6bff]" />
                Phân bổ bất ổn theo cơ sở
              </h2>
              <p className="text-xs text-[#6b7890] mt-0.5 m-0">
                Tỷ trọng lượt chập chờn và mất kết nối
              </p>
            </div>
            <span className="text-[11px] font-bold text-[#2459d8] bg-[#edf3ff] px-2.5 py-1 rounded-md">
              {formatNumberVN(kpis.totalIssues)} lượt
            </span>
          </header>

          <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-5 items-center">
              {/* Donut Graphic */}
              <div className="relative w-[150px] h-[150px] mx-auto flex-shrink-0">
                <div
                  className="w-full h-full rounded-full transition-all duration-500 shadow-inner"
                  style={{
                    background: `conic-gradient(${conicStops})`
                  }}
                />
                {/* Center hole */}
                <div className="absolute inset-[24px] rounded-full bg-white flex flex-col items-center justify-center text-center shadow-xs">
                  <strong className="text-2xl font-black tracking-tight text-[#14213d] leading-none">
                    {formatNumberVN(kpis.totalIssues)}
                  </strong>
                  <span className="text-[10px] font-medium text-[#6b7890] mt-1">
                    lượt bất ổn
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {siteStatsList.map((s) => (
                  <div
                    key={s.site}
                    onClick={() => onSelectSite && onSelectSite(s.site)}
                    className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-[#f7f9fc] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span
                        className="w-2.5 h-2.5 rounded-xs flex-shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-[#334155] font-medium truncate">{s.site}</span>
                    </div>
                    <b className="text-[#14213d] font-bold whitespace-nowrap">
                      {formatNumberVN(s.count)} · {s.percentage.toFixed(1).replace('.', ',')}%
                    </b>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        {/* Panel 2: Site Ranking & Split Cards */}
        <article className="bg-white border border-[#e2e8f2] rounded-2xl shadow-[0_8px_30px_rgba(24,46,88,0.06)] overflow-hidden flex flex-col">
          <header className="p-4 sm:p-5 pb-3 border-b border-[#edf0f6] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#14213d] flex items-center gap-1.5 m-0">
                <BarChart3 className="w-4 h-4 text-[#19a78e]" />
                Cơ sở có số lượt bất ổn cao
              </h2>
              <p className="text-xs text-[#6b7890] mt-0.5 m-0">
                So sánh số lần ghi nhận trong khoảng thời gian đã chọn
              </p>
            </div>
            <span className="text-[11px] font-bold text-[#19a78e] bg-[#eefaf7] px-2.5 py-1 rounded-md">
              Top cơ sở
            </span>
          </header>

          <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
            {/* Bars */}
            <div className="space-y-2.5 max-h-[175px] overflow-y-auto pr-1">
              {siteStatsList.slice(0, 6).map((s) => (
                <div key={s.site} className="grid grid-cols-[105px_1fr_38px] items-center gap-2.5 text-xs">
                  <span className="text-[#475569] font-medium truncate" title={s.site}>
                    {s.site}
                  </span>
                  <div className="h-2.5 bg-[#edf1f7] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(5, (s.count / maxSiteCount) * 100)}%`,
                        backgroundColor: s.color
                      }}
                    />
                  </div>
                  <b className="text-right text-[#14213d] font-bold">
                    {formatNumberVN(s.count)}
                  </b>
                </div>
              ))}
            </div>

            {/* Status Breakdown split cards */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-[#edf1f7]">
              <div className="p-3 rounded-xl bg-[#fffbf2] border border-[#fde8c5] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[#8a5b0f] block">
                    Chập chờn
                  </span>
                  <span className="text-[10px] text-[#a16c1a]">Giảm chất lượng</span>
                </div>
                <b className="text-xl font-black text-[#c87d18]">
                  {formatNumberVN(kpis.unstableTotal)}
                </b>
              </div>

              <div className="p-3 rounded-xl bg-[#fff2f4] border border-[#fcd5da] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[#9c1e2e] block">
                    Mất kết nối
                  </span>
                  <span className="text-[10px] text-[#b82539]">Mất tín hiệu</span>
                </div>
                <b className="text-xl font-black text-[#d93f52]">
                  {formatNumberVN(kpis.lostTotal)}
                </b>
              </div>
            </div>
          </div>
        </article>
      </div>

      {/* Bottom 2 Panels: Trend Over Time & Status Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Trend Line Chart */}
        <article className="bg-white border border-[#e2e8f2] rounded-2xl shadow-[0_8px_30px_rgba(24,46,88,0.06)] overflow-hidden">
          <header className="p-4 sm:p-5 pb-3 border-b border-[#edf0f6] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#14213d] flex items-center gap-1.5 m-0">
                <TrendingUp className="w-4 h-4 text-[#2f6bff]" />
                Diễn biến bất ổn theo ngày
              </h2>
              <p className="text-xs text-[#6b7890] mt-0.5 m-0">{periodLabel}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#6b7890]">
              <span className="inline-block w-4 h-1 rounded-full bg-[#2f6bff]" />
              <span className="font-semibold text-[#334155]">Số lượt</span>
            </div>
          </header>

          <div className="p-4 sm:p-5">
            <div className="h-[220px] w-full relative">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full overflow-visible"
                role="img"
                aria-label="Biểu đồ số lượt camera bất ổn theo ngày"
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f6bff" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2f6bff" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 1, 2, 3].map((step) => {
                  const y = padding.top + (chartInnerHeight * step) / 3;
                  const labelValue = Math.round((maxTrendIssues * (3 - step)) / 3);
                  return (
                    <g key={step}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={svgWidth - padding.right}
                        y2={y}
                        stroke="#e8edf5"
                        strokeDasharray="2 2"
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 4}
                        textAnchor="end"
                        fill="#8a96aa"
                        fontSize="10"
                        fontFamily="sans-serif"
                      >
                        {labelValue}
                      </text>
                    </g>
                  );
                })}

                {/* Shaded Area */}
                {areaPathD && (
                  <path d={areaPathD} fill="url(#areaGradient)" />
                )}

                {/* Main Curve Line */}
                {linePathD && (
                  <path
                    d={linePathD}
                    fill="none"
                    stroke="#2f6bff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Dots with Hover Triggers */}
                {linePoints.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredTip?.text.startsWith(pt.data.dayLabel) ? 6 : 4}
                    fill="#fff"
                    stroke="#2f6bff"
                    strokeWidth="2.5"
                    className="cursor-pointer transition-all duration-150 hover:scale-125"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredTip({
                        text: `${pt.data.dayLabel}: ${pt.data.totalIssues} lượt bất ổn`,
                        x: rect.x + rect.width / 2,
                        y: rect.y - 10
                      });
                    }}
                    onMouseLeave={() => setHoveredTip(null)}
                  />
                ))}

                {/* X Axis Labels */}
                {linePoints.map((pt, i) => {
                  if (i % everyStep !== 0) return null;
                  return (
                    <text
                      key={i}
                      x={pt.x}
                      y={svgHeight - 10}
                      textAnchor="middle"
                      fill="#8a96aa"
                      fontSize="10"
                      fontFamily="sans-serif"
                    >
                      {pt.data.dayLabel}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>
        </article>

        {/* Stacked Status Composition Chart */}
        <article className="bg-white border border-[#e2e8f2] rounded-2xl shadow-[0_8px_30px_rgba(24,46,88,0.06)] overflow-hidden">
          <header className="p-4 sm:p-5 pb-3 border-b border-[#edf0f6] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#14213d] flex items-center gap-1.5 m-0">
                <BarChart3 className="w-4 h-4 text-[#f4a340]" />
                Cơ cấu tình trạng
              </h2>
              <p className="text-xs text-[#6b7890] mt-0.5 m-0">
                Nhìn nhanh mức độ nghiêm trọng theo ngày
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#6b7890]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#f4a340]" />
                <span>Chập chờn</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#e44d5e]" />
                <span>Mất kết nối</span>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-5">
            <div className="h-[220px] w-full relative">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full overflow-visible"
                role="img"
                aria-label="Biểu đồ cơ cấu tình trạng camera"
              >
                {/* Horizontal Grid lines */}
                {[0, 1, 2, 3].map((step) => {
                  const y = padding.top + (chartInnerHeight * step) / 3;
                  return (
                    <line
                      key={step}
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke="#e8edf5"
                      strokeDasharray="2 2"
                    />
                  );
                })}

                {/* Stacked Bars */}
                {dailyTrends.map((d, i) => {
                  const x = padding.left + i * barGap + (barGap - barWidth) / 2;
                  const h1 = (d.unstable * chartInnerHeight) / maxStackTotal;
                  const h2 = (d.lost * chartInnerHeight) / maxStackTotal;
                  const h3 = (d.other * chartInnerHeight) / maxStackTotal;
                  const baseY = svgHeight - padding.bottom;
                  const yTotal = baseY - h1 - h2 - h3;

                  return (
                    <g key={i}>
                      {/* Segment 1: Chập chờn (amber) */}
                      {h1 > 0 && (
                        <rect
                          x={x}
                          y={baseY - h1}
                          width={barWidth}
                          height={h1}
                          rx={h2 === 0 && h3 === 0 ? 3 : 0}
                          fill="#f4a340"
                          className="cursor-pointer hover:opacity-85 transition-opacity"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredTip({
                              text: `${d.dayLabel}: ${d.unstable} chập chờn`,
                              x: rect.x + rect.width / 2,
                              y: rect.y - 10
                            });
                          }}
                          onMouseLeave={() => setHoveredTip(null)}
                        />
                      )}

                      {/* Segment 2: Mất kết nối (red) */}
                      {h2 > 0 && (
                        <rect
                          x={x}
                          y={baseY - h1 - h2}
                          width={barWidth}
                          height={h2}
                          rx={h3 === 0 ? 3 : 0}
                          fill="#e44d5e"
                          className="cursor-pointer hover:opacity-85 transition-opacity"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredTip({
                              text: `${d.dayLabel}: ${d.lost} mất kết nối`,
                              x: rect.x + rect.width / 2,
                              y: rect.y - 10
                            });
                          }}
                          onMouseLeave={() => setHoveredTip(null)}
                        />
                      )}

                      {/* Segment 3: Other (purple) */}
                      {h3 > 0 && (
                        <rect
                          x={x}
                          y={yTotal}
                          width={barWidth}
                          height={h3}
                          rx={3}
                          fill="#8d75e8"
                          className="cursor-pointer hover:opacity-85 transition-opacity"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredTip({
                              text: `${d.dayLabel}: ${d.other} bất ổn khác`,
                              x: rect.x + rect.width / 2,
                              y: rect.y - 10
                            });
                          }}
                          onMouseLeave={() => setHoveredTip(null)}
                        />
                      )}

                      {/* X Label */}
                      {i % everyStep === 0 && (
                        <text
                          x={x + barWidth / 2}
                          y={svgHeight - 10}
                          textAnchor="middle"
                          fill="#8a96aa"
                          fontSize="10"
                          fontFamily="sans-serif"
                        >
                          {d.dayLabel}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </article>
      </div>

      {/* Floating Tooltip */}
      {hoveredTip && (
        <div
          className="fixed pointer-events-none bg-[#0e1c3a] text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg z-50 transform -translate-x-1/2 -translate-y-full whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${hoveredTip.x}px`,
            top: `${hoveredTip.y}px`
          }}
        >
          {hoveredTip.text}
        </div>
      )}
    </div>
  );
};
