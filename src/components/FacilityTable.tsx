import React from 'react';
import { FacilityMetrics } from '../types';
import { formatNumber, formatPercent, MIN_RANK_REPLIES } from '../services/sheetService';

interface FacilityTableProps {
  facilities: FacilityMetrics[];
  sortField: string;
  onSortChange: (field: string) => void;
}

export const FacilityTable: React.FC<FacilityTableProps> = ({
  facilities,
  sortField,
  onSortChange
}) => {
  return (
    <section className="panel table-panel facility-table-panel">
      <div className="panel-head">
        <div>
          <span>HIỆU QUẢ THEO CƠ SỞ</span>
          <h2>Xếp hạng điểm hiệu quả tổng hợp</h2>
          <p className="formula-note">
            <strong>Công thức:</strong> Điểm = max(0; [55×V + 30×P5★ + 15×P4★ − 5×P3★ − 20×P2★ −
            45×P1★] / 85 × 100). V gồm 80% điểm số lượt phản hồi và 20% điểm tỷ lệ phản hồi; tỷ lệ
            sao được hiệu chỉnh theo mức chung hệ thống với 10 phản hồi tham chiếu. Chỉ xếp hạng cơ
            sở có từ {MIN_RANK_REPLIES} phản hồi theo lô gửi.
          </p>
        </div>

        <label className="sort-label">
          Sắp xếp
          <select value={sortField} onChange={(e) => onSortChange(e.target.value)}>
            <option value="performance">Điểm hiệu quả cao nhất</option>
            <option value="replies">Nhiều phản hồi theo lô</option>
            <option value="rate">Tỷ lệ theo lô</option>
            <option value="score">Điểm TB cao nhất</option>
            <option value="low">Nhiều rating thấp</option>
          </select>
        </label>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th className="col-facility">Cơ sở</th>
              <th className="col-compact">Hạng</th>
              <th className="col-compact">Lượt gửi</th>
              <th className="col-compact">Phản hồi lô</th>
              <th className="col-compact">Tỷ lệ lô</th>
              <th className="col-star">5★</th>
              <th className="col-star">4★</th>
              <th className="col-star">3★</th>
              <th className="col-star">2★</th>
              <th className="col-star">1★</th>
              <th className="col-compact">Điểm HQ/100</th>
            </tr>
          </thead>
          <tbody>
            {facilities.map((fac) => (
              <tr key={fac.facility}>
                <td className="col-facility">
                  <strong>{fac.facility}</strong>
                </td>
                <td className="col-compact">
                  {fac.rank ? (
                    <span className="rank-pill">#{fac.rank}</span>
                  ) : (
                    <span className="rank-pending">Chưa đủ mẫu</span>
                  )}
                </td>
                <td className="col-compact">{formatNumber(fac.sent)}</td>
                <td className="col-compact">{formatNumber(fac.rankReplies)}</td>
                <td className="col-compact">{formatPercent(fac.rankRate)}</td>
                <td className="col-star">{fac.rankDist[4]}</td>
                <td className="col-star">{fac.rankDist[3]}</td>
                <td className="col-star">{fac.rankDist[2]}</td>
                <td className="col-star">{fac.rankDist[1]}</td>
                <td className="col-star">{fac.rankDist[0]}</td>
                <td className="col-compact">
                  <strong className="performance-score">
                    {fac.performanceScore == null
                      ? '—'
                      : fac.performanceScore.toFixed(2).replace('.', ',')}
                  </strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
