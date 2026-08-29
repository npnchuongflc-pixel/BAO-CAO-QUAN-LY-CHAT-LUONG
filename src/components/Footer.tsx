import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer>
      <div>
        <strong>Báo cáo phản hồi Zalo OA</strong>
        <span>Dữ liệu trực tiếp từ Google Sheets · Thiết kế cho Phòng Quản lý Chất lượng</span>
      </div>
      <p>
        Quy ước: “Phản hồi trong kỳ” tính theo thời gian phản hồi; “phản hồi theo lô gửi” tính trên các
        tin được gửi trong kỳ.
      </p>
    </footer>
  );
};
