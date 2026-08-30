import React from 'react';
import { PeriodReportData } from '../types';
import { formatNumber, formatPercent, formatRating } from '../services/sheetService';

export const COLORS = {
  blue: '#1b5ea6',
  sky: '#3ea8e0',
  green: '#4caf8a',
  yellow: '#f9c846',
  coral: '#f2775a',
  purple: '#9b7fd4'
};

interface KpiCardProps {
  label: string;
  value: string;
  note: string;
  icon: 'send' | 'reply' | 'rate' | 'star' | 'alert' | 'clock';
  color: string;
  delta?: number | null;
}

const renderIcon = (icon: KpiCardProps['icon']) => {
  switch (icon) {
    case 'send':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      );
    case 'reply':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 17 4 12 9 7" />
          <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
      );
    case 'rate':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M16 8l-8 8M9 8.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm7 7a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case 'alert':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
  }
};

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, note, icon, color, delta }) => {
  return (
    <article className="kpi-card" style={{ ['--accent' as any]: color }}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon">{renderIcon(icon)}</span>
      </div>
      <div className="kpi-value">{value}</div>
      <p className="kpi-note">{note}</p>
      {delta != null && (
        <span
          className={`delta ${
            delta > 0.001 ? 'up' : delta < -0.001 ? 'down' : 'neutral'
          }`}
        >
          {delta > 0 ? '+' : ''}
          {delta.toFixed(1).replace('.', ',')}% so với kỳ trước
        </span>
      )}
    </article>
  );
};

interface KpiGridProps {
  data: PeriodReportData;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ data }) => {
  const qualityRate = data.avg == null ? null : data.avg / 5;
  const medianStr =
    data.medianDelay == null
      ? '—'
      : `${data.medianDelay.toFixed(1).replace('.', ',')} giờ`;

  return (
    <section className="zalo-metric-section">
      <div className="zalo-section-heading">
        <div>
          <span>TỔNG QUAN HIỆU SUẤT</span>
          <h2>Chỉ số vận hành ZALO OA</h2>
        </div>
        <p>06 chỉ số trọng yếu trong kỳ báo cáo</p>
      </div>

      <div className="kpi-grid">
        <KpiCard
          label="Tổng lượt gửi"
          value={formatNumber(data.sent.length)}
          note="Tin khảo sát gửi trong kỳ"
          icon="send"
          color={COLORS.blue}
          delta={data.delta.sent}
        />
        <KpiCard
          label="Phản hồi trong kỳ"
          value={formatNumber(data.replies.length)}
          note="Tính theo ngày phụ huynh phản hồi"
          icon="reply"
          color={COLORS.sky}
          delta={data.delta.replies}
        />
        <KpiCard
          label="Tỷ lệ phản hồi"
          value={formatPercent(data.legacyRate)}
          note="Phản hồi trong kỳ / lượt gửi trong kỳ"
          icon="rate"
          color={COLORS.green}
          delta={data.delta.rate == null ? null : data.delta.rate * 100}
        />
        <KpiCard
          label="Điểm đánh giá TB"
          value={`${formatRating(data.avg)} / 5`}
          note={`Điểm chất lượng quy đổi ${formatPercent(qualityRate)}`}
          icon="star"
          color={COLORS.yellow}
          delta={data.delta.avg}
        />
        <KpiCard
          label="Đánh giá cần xử lý"
          value={formatNumber(data.low.length)}
          note="Rating từ 1–3 sao trong kỳ"
          icon="alert"
          color={COLORS.coral}
        />
        <KpiCard
          label="Phản hồi trong 24 giờ"
          value={formatPercent(data.within24)}
          note={`Trung vị ${medianStr}`}
          icon="clock"
          color={COLORS.purple}
        />
      </div>
    </section>
  );
};
