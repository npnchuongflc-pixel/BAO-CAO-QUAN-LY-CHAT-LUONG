import React from 'react';
import { DayPoint, FacilityMetrics, MonthPoint } from '../types';
import { formatNumber, formatPercent } from '../services/sheetService';
import { COLORS } from './KpiGrid';

function buildSmoothPath(points: [number, number][]): string {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  return points.slice(1).reduce((acc, [nx, ny], idx) => {
    const [px, py] = points[idx];
    const mx = (px + nx) / 2;
    return `${acc} C ${mx} ${py}, ${mx} ${ny}, ${nx} ${ny}`;
  }, `M ${points[0][0]} ${points[0][1]}`);
}

function calculateNiceMax(val: number): number {
  if (!Number.isFinite(val) || val <= 0) return 10;
  const power = 10 ** Math.floor(Math.log10(val));
  const fraction = val / power;
  let niceFraction: number;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 1.25) niceFraction = 1.25;
  else if (fraction <= 1.5) niceFraction = 1.5;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 2.5) niceFraction = 2.5;
  else if (fraction <= 3) niceFraction = 3;
  else if (fraction <= 4) niceFraction = 4;
  else if (fraction <= 5) niceFraction = 5;
  else if (fraction <= 6) niceFraction = 6;
  else if (fraction <= 8) niceFraction = 8;
  else niceFraction = 10;
  return niceFraction * power;
}

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="empty-state">
    <span>{text}</span>
  </div>
);

// Panel 1: Day Line & Bar Chart
export const DayTimelineChart: React.FC<{ points: DayPoint[] }> = ({ points }) => {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  if (!points.length) return <EmptyState text="Chưa có dữ liệu theo ngày." />;

  const maxReplyVal = Math.max(0, ...points.map((p) => p.replies));
  const maxSentVal = Math.max(0, ...points.map((p) => p.sent));

  const maxVal = calculateNiceMax(
    Math.max(1, maxSentVal, maxReplyVal)
  );

  const getX = (idx: number) => 58 + (points.length === 1 ? 900 / 2 : (idx * 900) / (points.length - 1));
  const getY = (val: number) => 220 - (val / maxVal) * 180;
  const barWidth = Math.max(4, Math.min(18, 700 / (points.length * 2.2)));

  const replyPoints: [number, number][] = points.map((p, i) => [getX(i), getY(p.replies)]);
  const smoothPath = buildSmoothPath(replyPoints);

  const labelStep = Math.max(1, Math.ceil(points.length / 14));

  // Find index of max reply to highlight only the maximum value
  const maxReplyIdx = points.findIndex((p) => p.replies === maxReplyVal && p.replies > 0);

  return (
    <div className="chart-wrap" role="img" aria-label="Biểu đồ lượt gửi và phản hồi theo ngày">
      <svg
        viewBox="0 0 980 260"
        className="line-chart"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((step) => {
          const yPos = 40 + 180 * (1 - step);
          return (
            <g key={step}>
              <line x1={58} x2={958} y1={yPos} y2={yPos} className="grid-line" />
              <text x={48} y={yPos + 4} textAnchor="end" className="axis-text">
                {formatNumber(Math.round(maxVal * step))}
              </text>
            </g>
          );
        })}

        {/* Sent Bars */}
        {points.map((p, i) => {
          const xPos = getX(i) - barWidth / 2;
          const barHeight = (p.sent / maxVal) * 180;
          const yPos = 220 - barHeight;
          const isHovered = hoveredIdx === i;

          return (
            <rect
              key={`sent-${p.key}`}
              x={xPos}
              y={yPos}
              width={barWidth}
              height={barHeight}
              rx={3}
              fill={COLORS.sky}
              opacity={isHovered ? 1 : 0.65}
              onMouseEnter={() => setHoveredIdx(i)}
              style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
            >
              <title>{`${p.label}: ${formatNumber(p.sent)} lượt gửi, ${formatNumber(p.replies)} phản hồi`}</title>
            </rect>
          );
        })}

        {/* Reply Smooth Line */}
        <path
          d={smoothPath}
          fill="none"
          stroke={COLORS.coral}
          strokeWidth="3.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Reply Data Points & Max Value Indicator */}
        {points.map((p, i) => {
          const xPos = getX(i);
          const yPos = getY(p.replies);
          const showXAxisLabel = i % labelStep === 0 || i === points.length - 1;
          const isMax = i === maxReplyIdx;
          const isHovered = hoveredIdx === i;

          return (
            <g key={`reply-${p.key}`}>
              <circle
                cx={xPos}
                cy={yPos}
                r={isMax ? 6 : isHovered ? 6.5 : 4.5}
                fill={isMax ? COLORS.coral : '#fff'}
                stroke={COLORS.coral}
                strokeWidth={isMax ? 2 : 2.5}
                onMouseEnter={() => setHoveredIdx(i)}
                style={{ cursor: 'pointer' }}
              >
                <title>{`${p.label}: ${formatNumber(p.replies)} phản hồi (${formatNumber(p.sent)} lượt gửi)`}</title>
              </circle>

              {/* Only display the maximum value label */}
              {isMax && (
                <g>
                  <rect
                    x={xPos - 32}
                    y={yPos - 27}
                    width={64}
                    height={20}
                    rx={10}
                    fill={COLORS.coral}
                  />
                  <text
                    x={xPos}
                    y={yPos - 13}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="800"
                  >
                    {`Max: ${p.replies}`}
                  </text>
                </g>
              )}

              {/* Tooltip on hover if not max */}
              {isHovered && !isMax && (
                <g>
                  <rect
                    x={xPos - 24}
                    y={yPos - 24}
                    width={48}
                    height={18}
                    rx={6}
                    fill="#1a3a5c"
                  />
                  <text
                    x={xPos}
                    y={yPos - 11}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="700"
                  >
                    {p.replies}
                  </text>
                </g>
              )}

              {showXAxisLabel && (
                <text x={xPos} y={244} textAnchor="middle" className="axis-text">
                  {p.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Panel 2: Rating Distribution
export const RatingDistribution: React.FC<{ counts: number[] }> = ({ counts }) => {
  const total = counts.reduce((sum, c) => sum + c, 0);
  const maxCount = Math.max(1, ...counts);
  const colors = [COLORS.green, COLORS.sky, COLORS.yellow, COLORS.coral, COLORS.coral];

  return (
    <div className="rating-bars">
      {[5, 4, 3, 2, 1].map((stars, idx) => {
        const count = counts[stars - 1] || 0;
        const color = colors[idx];
        const widthPercent = total ? (count / maxCount) * 100 : 0;

        return (
          <div className="rating-row" key={stars}>
            <div className="rating-name">
              {stars} <span>★</span>
            </div>
            <div className="rating-track">
              <div
                style={{
                  width: `${widthPercent}%`,
                  background: color
                }}
              />
            </div>
            <strong>{formatNumber(count)}</strong>
            <small>{formatPercent(total ? count / total : null, 0)}</small>
          </div>
        );
      })}
    </div>
  );
};

// Panel 3: Top 10 Facilities
export const TopFacilitiesList: React.FC<{ rows: FacilityMetrics[] }> = ({ rows }) => {
  const sorted = [...rows].sort((a, b) => b.replies - a.replies).slice(0, 10);
  const maxReplies = Math.max(1, ...sorted.map((f) => f.replies));

  if (!sorted.length) {
    return <EmptyState text="Không có dữ liệu cơ sở." />;
  }

  return (
    <div className="facility-bars">
      {sorted.map((item, idx) => {
        const trackPercent = (item.replies / maxReplies) * 100;
        return (
          <div className="facility-bar" key={item.facility}>
            <div className="facility-rank">{idx + 1}</div>
            <div className="facility-bar-main">
              <div className="facility-bar-label">
                <span>{item.facility}</span>
                <span>
                  {item.replies} phản hồi · {formatPercent(item.rate, 0)}
                </span>
              </div>
              <div className="facility-track">
                <div style={{ width: `${trackPercent}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Panel 4: 12 Month Trend Dual-Axis Chart
export const MonthlyTrendChart: React.FC<{ points: MonthPoint[] }> = ({ points }) => {
  if (!points.length) {
    return <EmptyState text="Chưa có dữ liệu theo tháng." />;
  }

  const maxReplies = calculateNiceMax(Math.max(1, ...points.map((p) => p.replies)));
  const maxRatePct = calculateNiceMax(Math.max(5, ...points.map((p) => (p.rate ?? 0) * 100)));
  const maxRate = maxRatePct / 100;

  const getX = (idx: number) => 76 + (points.length === 1 ? 824 / 2 : (idx * 824) / (points.length - 1));
  const getYReplies = (val: number) => 254 - (val / maxReplies) * 212;
  const getYRate = (val: number | null) => 254 - ((val ?? 0) / maxRate) * 212;

  const replyPoints: [number, number][] = points.map((p, i) => [getX(i), getYReplies(p.replies)]);
  const smoothRepliesPath = buildSmoothPath(replyPoints);

  const ratePoints: [number, number][] = points.flatMap((p, i) =>
    p.rate == null ? [] : [[getX(i), getYRate(p.rate)]]
  );
  const smoothRatePath = buildSmoothPath(ratePoints);

  return (
    <div
      className="chart-wrap monthly-chart-wrap"
      role="img"
      aria-label="Biểu đồ hai trục: lượt phản hồi ở trục trái và tỷ lệ phản hồi ở trục phải"
    >
      <svg viewBox="0 0 980 310" className="line-chart monthly-chart">
        <text x={76} y="15" textAnchor="start" className="axis-title axis-title-left">
          LƯỢT PHẢN HỒI
        </text>
        <text x={900} y="15" textAnchor="end" className="axis-title axis-title-right">
          TỶ LỆ PHẢN HỒI (%)
        </text>

        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((step) => {
          const yPos = 42 + 212 * (1 - step);
          return (
            <g key={step}>
              <line x1={76} x2={900} y1={yPos} y2={yPos} className="grid-line" />
              <text x={64} y={yPos + 4} textAnchor="end" className="axis-text axis-left-value">
                {formatNumber(Math.round(maxReplies * step))}
              </text>
              <text x={912} y={yPos + 4} textAnchor="start" className="axis-text axis-right-value">
                {`${Math.round(maxRatePct * step)}%`}
              </text>
            </g>
          );
        })}

        <line x1={76} x2={76} y1={42} y2={254} className="chart-axis chart-axis-left" />
        <line x1={900} x2={900} y1={42} y2={254} className="chart-axis chart-axis-right" />
        <line x1={76} x2={900} y1={254} y2={254} className="chart-axis chart-axis-bottom" />

        {/* Reply Count Smooth Line */}
        <path
          d={smoothRepliesPath}
          fill="none"
          stroke={COLORS.blue}
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Reply Rate Dashed Line */}
        <path
          d={smoothRatePath}
          fill="none"
          stroke={COLORS.green}
          strokeWidth="3.5"
          strokeDasharray="9 7"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Markers and Value Labels */}
        {points.map((p, i) => {
          const xPos = getX(i);
          const yRep = getYReplies(p.replies);
          const yRt = getYRate(p.rate);
          const rateTextY = yRt > 234 ? yRt - 11 : yRt + 18;

          return (
            <g key={p.label}>
              <circle
                cx={xPos}
                cy={yRep}
                r="5"
                fill="#fff"
                stroke={COLORS.blue}
                strokeWidth="3"
              >
                <title>{`${p.label}: ${formatNumber(p.replies)} lượt phản hồi`}</title>
              </circle>

              <text
                x={xPos}
                y={Math.max(yRep - 11, 34)}
                textAnchor="middle"
                className="chart-value-label reply-value-label"
              >
                {formatNumber(p.replies)}
              </text>

              {p.rate != null && (
                <>
                  <circle
                    cx={xPos}
                    cy={yRt}
                    r="4"
                    fill="#fff"
                    stroke={COLORS.green}
                    strokeWidth="2.5"
                  >
                    <title>{`${p.label}: ${formatPercent(p.rate)}`}</title>
                  </circle>
                  <text
                    x={xPos}
                    y={rateTextY}
                    textAnchor="middle"
                    className="chart-value-label rate-value-label"
                  >
                    {formatPercent(p.rate, 0)}
                  </text>
                </>
              )}

              <text x={xPos} y={290} textAnchor="middle" className="axis-text month-label">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

interface DashboardGridProps {
  dayPoints: DayPoint[];
  ratingCounts: number[];
  facilities: FacilityMetrics[];
  months: MonthPoint[];
  totalReplies: number;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  dayPoints,
  ratingCounts,
  facilities,
  months,
  totalReplies
}) => {
  return (
    <section className="dashboard-grid">
      {/* Panel 1: Day timeline */}
      <article className="panel wide">
        <div className="panel-head">
          <div>
            <span>DIỄN BIẾN THEO NGÀY</span>
            <h2>Lượt gửi và phản hồi</h2>
          </div>
          <div className="legend">
            <span className="sent">Lượt gửi</span>
            <span className="reply">Phản hồi</span>
          </div>
        </div>
        <DayTimelineChart points={dayPoints} />
      </article>

      {/* Panel 2: Rating distribution */}
      <article className="panel">
        <div className="panel-head">
          <div>
            <span>CHẤT LƯỢNG PHẢN HỒI</span>
            <h2>Phân bố rating</h2>
          </div>
          <b>{formatNumber(totalReplies)} lượt</b>
        </div>
        <RatingDistribution counts={ratingCounts} />
      </article>

      {/* Panel 3: Facility comparison */}
      <article className="panel">
        <div className="panel-head">
          <div>
            <span>SO SÁNH CƠ SỞ</span>
            <h2>Cơ sở có nhiều phản hồi</h2>
          </div>
          <b>Top 10</b>
        </div>
        <TopFacilitiesList rows={facilities} />
      </article>

      {/* Panel 4: 12-Month trend */}
      <article className="panel wide">
        <div className="panel-head">
          <div>
            <span>XU HƯỚNG 12 THÁNG</span>
            <h2>Lượt phản hồi và tỷ lệ phản hồi</h2>
          </div>
          <div className="legend">
            <span className="month-reply">Lượt phản hồi</span>
            <span className="month-rate">Tỷ lệ phản hồi</span>
          </div>
        </div>
        <MonthlyTrendChart points={months} />
      </article>
    </section>
  );
};
