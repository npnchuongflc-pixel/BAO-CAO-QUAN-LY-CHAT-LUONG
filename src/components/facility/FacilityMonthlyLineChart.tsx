import React, { useMemo, useState } from 'react';
import { FacilityDayStatusRecord } from './FacilityDayInspectionModal';

interface FacilityMonthlyLineChartProps {
  facilityName: string;
  monthDays: FacilityDayStatusRecord[];
  latestIso: string;
  xAxisMode?: 'month' | 'weekday';
  onSelectDay: (dateIso: string) => void;
}

const SVG_W = 310;
const SVG_H = 74;
const PAD_LEFT = 24;
const PAD_RIGHT = 8;
const PAD_TOP = 13;
const PAD_BOTTOM = 14;
const PLOT_W = SVG_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = SVG_H - PAD_TOP - PAD_BOTTOM;

export const FacilityMonthlyLineChart: React.FC<FacilityMonthlyLineChartProps> = ({
  facilityName,
  monthDays,
  latestIso,
  xAxisMode = 'month',
  onSelectDay,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const chartData = useMemo(() => {
    const n = monthDays.length;
    if (n === 0) return null;

    let maxTarget = 0;
    let minTarget = Infinity;
    let maxPhoto = 0;

    monthDays.forEach(d => {
      if (d.dailyTarget !== null && d.dailyTarget > 0 && !d.isDayOff) {
        if (d.dailyTarget > maxTarget) maxTarget = d.dailyTarget;
        if (d.dailyTarget < minTarget) minTarget = d.dailyTarget;
      }
      if (d.status !== 'upcoming' && d.status !== 'off_or_unsynced' && d.status !== 'insufficient_data') {
        if (d.photoCompletedItems > maxPhoto) maxPhoto = d.photoCompletedItems;
      }
    });

    const rawMax = Math.max(maxTarget, maxPhoto, 4);
    const yMax = Math.ceil((rawMax + 1) / 2) * 2;
    const yMid = Math.round(yMax / 2);

    const slotW = PLOT_W / n;
    const barW =
      xAxisMode === 'weekday' || n <= 7
        ? Math.max(12, Math.min(26, slotW * 0.54))
        : Math.max(4, Math.min(9, slotW - 1.8));
    const getCenterX = (i: number) => PAD_LEFT + (i + 0.5) * slotW;
    const getY = (val: number) => {
      const clamped = Math.max(0, Math.min(yMax, val));
      return PAD_TOP + PLOT_H - (clamped / yMax) * PLOT_H;
    };

    const yZeroPx = getY(0);

    const bars = monthDays.map((d, i) => {
      const isEvaluated =
        d.status === 'no_checkout' || d.status === 'incomplete' || d.status === 'complete';
      const cx = getCenterX(i);
      const val = isEvaluated ? d.photoCompletedItems : 0;

      // Keep red missed-checkout & gray off/upcoming bars visibly anchored at baseline
      let barTopY = yZeroPx;
      let barHeight = 0;
      if (d.status === 'no_checkout') {
        barHeight = 6;
        barTopY = yZeroPx - barHeight;
      } else if (d.status === 'incomplete' || d.status === 'complete') {
        barTopY = getY(val);
        barHeight = Math.max(val > 0 ? 5 : 4, yZeroPx - barTopY);
        barTopY = yZeroPx - barHeight;
      } else if (d.status === 'off_or_unsynced' || d.status === 'insufficient_data') {
        barHeight = 5;
        barTopY = yZeroPx - barHeight;
      } else {
        barHeight = 4;
        barTopY = yZeroPx - barHeight;
      }

      return {
        idx: i,
        day: d,
        cx,
        barX: cx - barW / 2,
        barW,
        barTopY,
        barHeight,
        targetY: d.dailyTarget !== null && d.dailyTarget > 0 && !d.isDayOff ? getY(d.dailyTarget) : null,
        isEvaluated,
      };
    });

    // Stepped target quota line covering every day slot for direct bar-vs-line comparison
    let targetPath = '';
    bars.forEach((b, idx) => {
      if (b.targetY === null) return;
      const leftX = PAD_LEFT + idx * slotW;
      const rightX = PAD_LEFT + (idx + 1) * slotW;
      const prevHasTarget = idx > 0 && bars[idx - 1].targetY !== null;
      if (!prevHasTarget) {
        targetPath += `M${leftX.toFixed(1)},${b.targetY.toFixed(1)} L${rightX.toFixed(1)},${b.targetY.toFixed(1)} `;
      } else {
        targetPath += `L${leftX.toFixed(1)},${b.targetY.toFixed(1)} L${rightX.toFixed(1)},${b.targetY.toFixed(1)} `;
      }
    });

    const targetLabel =
      minTarget !== Infinity && maxTarget > 0
        ? minTarget === maxTarget
          ? `ĐM: ${maxTarget}`
          : `ĐM: ${minTarget}–${maxTarget}`
        : '';

    const xTicks =
      xAxisMode === 'weekday' || n <= 7
        ? monthDays.map((d, idx) => ({
            key: d.iso,
            cx: getCenterX(idx),
            label: `${d.weekdayLabel} ${d.dayNum}`,
            anchor: 'middle' as const,
          }))
        : Array.from(new Set([1, 10, 20, n]))
            .filter(d => d >= 1 && d <= n)
            .map(dayNum => ({
              key: String(dayNum),
              cx: getCenterX(dayNum - 1),
              label: String(dayNum),
              anchor:
                dayNum === 1 ? ('start' as const) : dayNum === n ? ('end' as const) : ('middle' as const),
            }));

    return {
      yMax,
      yMid,
      yTopPx: getY(yMax),
      yMidPx: getY(yMid),
      yZeroPx,
      bars,
      slotW,
      targetPath: targetPath.trim(),
      targetLabel,
      xTicks,
      getCenterX,
    };
  }, [monthDays, xAxisMode]);

  if (!chartData) return null;

  const hoveredBar = hoveredIdx !== null ? chartData.bars[hoveredIdx] || null : null;

  const formatStatusLabel = (d: FacilityDayStatusRecord) => {
    if (d.status === 'no_checkout') return `Không làm (0/${d.dailyTarget ?? '-'})`;
    if (d.status === 'incomplete') return `Làm thiếu (${d.photoCompletedItems}/${d.dailyTarget ?? '-'})`;
    if (d.status === 'complete') return `Làm đủ (${d.photoCompletedItems}/${d.dailyTarget ?? '-'})`;
    if (d.status === 'upcoming') return 'Chưa đến hạn';
    if (d.status === 'off_or_unsynced' && d.isDayOff) return 'Ngày nghỉ (không lớp)';
    return 'Nghỉ / Chưa đồng bộ';
  };

  return (
    <div
      className="relative w-full min-w-[205px] select-none"
      onClick={e => e.stopPropagation()}
      onMouseLeave={() => setHoveredIdx(null)}
    >
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full h-[72px] overflow-visible block"
        role="img"
        aria-label={`Biểu đồ cột lượt có ảnh theo ngày và đường định mức của ${facilityName}`}
      >
        {/* Inline hover readout at top-left */}
        {hoveredBar && (
          <text
            x={PAD_LEFT + 2}
            y={9}
            textAnchor="start"
            fill="#0f172a"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            {`${hoveredBar.day.shortDate}: ${
              hoveredBar.isEvaluated
                ? `${hoveredBar.day.photoCompletedItems}/${hoveredBar.day.dailyTarget ?? '-'} ảnh`
                : formatStatusLabel(hoveredBar.day)
            }`}
          </text>
        )}

        {/* Horizontal Y gridlines & Y-axis labels (photo count) */}
        {[
          { val: chartData.yMax, py: chartData.yTopPx },
          { val: chartData.yMid, py: chartData.yMidPx },
          { val: 0, py: chartData.yZeroPx },
        ].map(tick => (
          <g key={tick.val}>
            <line
              x1={PAD_LEFT}
              x2={SVG_W - PAD_RIGHT}
              y1={tick.py}
              y2={tick.py}
              stroke={tick.val === 0 ? '#cbd5e1' : '#e2e8f0'}
              strokeWidth={tick.val === 0 ? 0.9 : 0.7}
            />
            <text
              x={PAD_LEFT - 4}
              y={tick.py + 2.8}
              textAnchor="end"
              fill="#64748b"
              fontSize="8.5"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            >
              {tick.val}
            </text>
          </g>
        ))}

        {/* Y-axis vertical hairline */}
        <line
          x1={PAD_LEFT}
          x2={PAD_LEFT}
          y1={PAD_TOP}
          y2={chartData.yZeroPx}
          stroke="#cbd5e1"
          strokeWidth={0.8}
        />

        {/* Target quota label at top-right */}
        {chartData.targetLabel && (
          <text
            x={SVG_W - PAD_RIGHT}
            y={9}
            textAnchor="end"
            fill="#1B5EA6"
            fontSize="8"
            fontWeight="700"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            {chartData.targetLabel}
          </text>
        )}

        {/* Daily Status Bars */}
        {chartData.bars.map(b => {
          const d = b.day;
          const isLatest = d.iso === latestIso;
          const isHovered = hoveredIdx === b.idx;

          let fill = '#e2e8f0';
          if (d.status === 'no_checkout') fill = '#e11d48';
          else if (d.status === 'incomplete') fill = '#f59e0b';
          else if (d.status === 'complete') fill = '#10b981';
          else if (d.status === 'off_or_unsynced' || d.status === 'insufficient_data') fill = '#cbd5e1';

          return (
            <g
              key={d.iso}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(b.idx)}
              onClick={() => onSelectDay(d.iso)}
            >
              <title>{`${facilityName} · ${d.weekdayLabel} ${d.displayDate}: ${formatStatusLabel(d)}`}</title>
              <rect
                x={b.barX}
                y={b.barTopY}
                width={b.barW}
                height={b.barHeight}
                rx={1.5}
                fill={fill}
                opacity={isHovered ? 1 : 0.92}
                stroke={isHovered ? '#1B5EA6' : isLatest ? '#0f172a' : 'none'}
                strokeWidth={isHovered || isLatest ? 1.1 : 0}
              />
              {/* Full-column invisible hit target for easy hover/click */}
              <rect
                x={PAD_LEFT + b.idx * chartData.slotW}
                y={PAD_TOP - 2}
                width={chartData.slotW}
                height={PLOT_H + 6}
                fill="transparent"
              />
            </g>
          );
        })}

        {/* Target Quota Line overlaid on top of bars (white halo + blue line for crisp contrast) */}
        {chartData.targetPath && (
          <g className="pointer-events-none">
            <path
              d={chartData.targetPath}
              fill="none"
              stroke="#ffffff"
              strokeWidth={2.6}
              opacity={0.75}
            />
            <path
              d={chartData.targetPath}
              fill="none"
              stroke="#1B5EA6"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          </g>
        )}

        {/* X-axis day ticks */}
        {chartData.xTicks.map(tick => (
          <text
            key={tick.key}
            x={tick.cx}
            y={SVG_H - 2}
            textAnchor={tick.anchor}
            fill="#64748b"
            fontSize={
              xAxisMode === 'weekday'
                ? monthDays.length >= 9
                  ? '6.6'
                  : '7.4'
                : '7.8'
            }
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            {tick.label}
          </text>
        ))}
      </svg>
    </div>
  );
};
