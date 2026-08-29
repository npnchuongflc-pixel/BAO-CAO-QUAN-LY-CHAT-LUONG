import React from 'react';
import { formatNumber, formatDate } from '../services/sheetService';

interface SourceProofProps {
  totalCount: number;
  latestDate: Date | null;
  syncDate: Date | null;
}

export const SourceProof: React.FC<SourceProofProps> = ({ totalCount, latestDate, syncDate }) => {
  return (
    <section className="source-proof" aria-label="Trạng thái kết nối dữ liệu">
      <span className="live-pill">
        <i /> DỮ LIỆU THỰC TẾ
      </span>
      <span>
        Đã nạp <strong>{formatNumber(totalCount)}</strong> dòng từ “Zalo đánh giá”
      </span>
      <span>
        Dữ liệu mới nhất: <strong>{formatDate(latestDate, true)}</strong>
      </span>
      <span>
        Đồng bộ báo cáo: <strong>{formatDate(syncDate, true)}</strong>
      </span>
    </section>
  );
};
