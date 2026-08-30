import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="app-footer__identity">
        <span className="app-footer__eyebrow">BỘ PHẬN PHỤ TRÁCH</span>
        <strong>Bộ phận Quản lý Chất lượng</strong>
        <span>Hệ thống Trung tâm Cờ Vua Sài Gòn – Sài Gòn Art</span>
      </div>

      <div className="app-footer__meta" aria-label="Thông tin báo cáo">
        <div className="app-footer__meta-item">
          <span>Tác giả</span>
          <strong>NPNC</strong>
        </div>
        <div className="app-footer__meta-item">
          <span>Nguồn dữ liệu</span>
          <strong>Google Sheets</strong>
        </div>
        <div className="app-footer__meta-item">
          <span>Trạng thái</span>
          <strong>Tự động cập nhật</strong>
        </div>
      </div>

      <p className="app-footer__copyright">© 2026 NPNC · Báo cáo sử dụng nội bộ</p>
    </footer>
  );
};
