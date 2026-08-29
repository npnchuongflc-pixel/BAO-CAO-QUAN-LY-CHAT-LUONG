import React from 'react';
import { formatNumber } from '../services/sheetService';

interface HeroProps {
  totalRows: number;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

export const Hero: React.FC<HeroProps> = ({ totalRows, loading, error, onRefresh }) => {
  return (
    <section className="hero">
      <div>
        <span className="eyebrow">ZALO OA · PHẢN HỒI PHỤ HUYNH</span>
        <h1>Báo cáo trải nghiệm khách hàng</h1>
        <p>Theo dõi lượt gửi, tốc độ phản hồi, điểm đánh giá và cảnh báo cần xử lý theo từng cơ sở.</p>
      </div>

      <div className="hero-status">
        <span className={error ? 'status-dot error' : 'status-dot'} />
        <div>
          <strong>
            {error ? 'Dữ liệu cần kiểm tra' : loading ? 'Đang đồng bộ dữ liệu' : 'Dữ liệu thực tế đã đồng bộ'}
          </strong>
          <small>
            {totalRows > 0 ? `${formatNumber(totalRows)} dòng từ Google Sheets` : 'Đang kết nối Google Sheets'}
          </small>
        </div>
        <button onClick={onRefresh} disabled={loading}>
          {loading ? 'Đang tải…' : 'Cập nhật'}
        </button>
      </div>
    </section>
  );
};
