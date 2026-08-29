import React from 'react';
import { PeriodReportData, FacilityMetrics } from '../types';
import { formatDate, formatPercent } from '../services/sheetService';

interface InsightStripProps {
  data: PeriodReportData;
}

export const InsightStrip: React.FC<InsightStripProps> = ({ data }) => {
  const qualityRate = data.avg == null ? null : data.avg / 5;
  const fiveStarRate = data.replies.length ? data.fiveStar / data.replies.length : null;

  const lowestRateFacility: FacilityMetrics | undefined = data.facilities
    .filter((f) => f.sent >= 5)
    .sort((a, b) => (a.rate ?? 1) - (b.rate ?? 1))[0];

  const mostLowFacility: FacilityMetrics | undefined = data.facilities
    .filter((f) => f.low > 0)
    .sort((a, b) => b.low - a.low)[0];

  return (
    <section className="insight-strip">
      <div className="insight-title">
        <span>Nhận định nhanh</span>
        <strong>
          {formatDate(data.start)} – {formatDate(data.end)}
        </strong>
      </div>

      <div className="insight-item green">
        <i />
        <p>
          <strong>{formatPercent(qualityRate)}</strong> điểm chất lượng;{' '}
          {formatPercent(fiveStarRate)} phản hồi đạt 5 sao.
        </p>
      </div>

      <div className="insight-item blue">
        <i />
        <p>
          <strong>{formatPercent(data.cohortRate)}</strong> người nhận trong lô gửi đã phản hồi;
          chỉ số này tách riêng để không lẫn phản hồi trễ từ kỳ trước.
        </p>
      </div>

      <div className="insight-item coral">
        <i />
        <p>
          {mostLowFacility ? (
            <>
              <strong>{mostLowFacility.facility}</strong> có nhiều đánh giá 1–3 sao nhất (
              {mostLowFacility.low} lượt), cần ưu tiên xác minh.
            </>
          ) : (
            <>
              <strong>Không có</strong> đánh giá 1–3 sao trong kỳ đã chọn.
            </>
          )}
        </p>
      </div>

      <div className="insight-item yellow">
        <i />
        <p>
          {lowestRateFacility ? (
            <>
              <strong>{lowestRateFacility.facility}</strong> có tỷ lệ phản hồi thấp nhất (
              {formatPercent(lowestRateFacility.rate)}) trong nhóm có từ 5 lượt gửi.
            </>
          ) : (
            'Chưa đủ dữ liệu để so sánh cơ sở.'
          )}
        </p>
      </div>
    </section>
  );
};
