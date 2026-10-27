import React, { useState } from 'react';
import { FacilityMetrics } from '../types';
import { formatNumber, formatPercent, MIN_RANK_REPLIES } from '../services/sheetService';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FacilityTableProps {
  facilities: FacilityMetrics[];
  sortField: string;
  onSortChange: (field: string) => void;
}

export const FacilityTable: React.FC<FacilityTableProps> = ({
  facilities,
  sortField,
  onSortChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  // Cơ sở dẫn đầu
  const topFacility = facilities.find((f) => f.rank === 1) || facilities[0];

  return (
    <section className="panel table-panel facility-table-panel bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="panel-head p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100">
        <div className="min-w-0">
          <span className="text-xs font-bold text-sky-700 uppercase tracking-wider block">
            HIỆU QUẢ THEO CƠ SỞ
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Xếp hạng điểm hiệu quả tổng hợp
          </h2>
          {!isCollapsed && (
            <p className="formula-note text-xs text-slate-600 mt-2">
              <strong>Công thức:</strong> Điểm = max(0; [55×V + 30×P5★ + 15×P4★ − 5×P3★ − 20×P2★ −
              45×P1★] / 85 × 100). V gồm 80% điểm số lượt phản hồi và 20% điểm tỷ lệ phản hồi; tỷ lệ
              sao được hiệu chỉnh theo mức chung hệ thống với 10 phản hồi tham chiếu. Chỉ xếp hạng cơ
              sở có từ {MIN_RANK_REPLIES} phản hồi theo lô gửi.
            </p>
          )}
        </div>

        {/* Nút Thu gọn / Mở rộng & Sắp xếp */}
        <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
          {!isCollapsed && (
            <label className="sort-label text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span>Sắp xếp:</span>
              <select
                value={sortField}
                onChange={(e) => onSortChange(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="performance">Điểm hiệu quả cao nhất</option>
                <option value="replies">Nhiều phản hồi theo lô</option>
                <option value="rate">Tỷ lệ theo lô</option>
                <option value="score">Điểm TB cao nhất</option>
                <option value="low">Nhiều rating thấp</option>
              </select>
            </label>
          )}

          {/* Nút thu gọn lại */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs transition-colors cursor-pointer"
            title={isCollapsed ? 'Mở rộng bảng xếp hạng cơ sở' : 'Thu gọn bảng xếp hạng cơ sở'}
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                <span>Mở rộng</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                <span>Thu gọn lại</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dạng thu gọn */}
      {isCollapsed && (
        <div
          onClick={() => setIsCollapsed(false)}
          className="p-4 bg-slate-50/80 flex items-center justify-between gap-3 text-xs text-slate-700 cursor-pointer hover:bg-slate-100/80 transition-colors"
          title="Bấm để mở rộng bảng xếp hạng cơ sở"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
              🏢 {facilities.length} cơ sở xếp hạng
            </span>
            {topFacility && (
              <span className="text-slate-600">
                • Cơ sở dẫn đầu: <strong className="text-blue-700 font-bold">{topFacility.facility}</strong> (#{topFacility.rank} - {topFacility.performanceScore?.toFixed(2)} điểm)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dạng mở rộng: Bảng xếp hạng chuẩn sạch đẹp */}
      {!isCollapsed && (
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
      )}
    </section>
  );
};
