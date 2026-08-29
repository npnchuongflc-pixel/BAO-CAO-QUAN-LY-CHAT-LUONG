import React from 'react';
import { SheetRowItem } from '../types';
import { formatDate } from '../services/sheetService';

interface FeedbackTableProps {
  feedback: SheetRowItem[];
  onExportCsv: () => void;
}

export const FeedbackTable: React.FC<FeedbackTableProps> = ({ feedback, onExportCsv }) => {
  return (
    <section className="panel table-panel feedback-panel">
      <div className="panel-head">
        <div>
          <span>CẢNH BÁO &amp; NỘI DUNG PHẢN HỒI</span>
          <h2>Danh sách cần xác minh</h2>
          <p>
            Chỉ hiển thị phản hồi có nội dung hoặc rating từ 1–3 sao; không hiển thị số điện thoại
            và MsgID.
          </p>
        </div>
        <button type="button" className="export-button" onClick={onExportCsv}>
          Xuất CSV đã lọc
        </button>
      </div>

      {feedback.length > 0 ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="col-compact">Thời gian</th>
                <th className="col-customer">Phụ huynh / Học viên</th>
                <th className="col-facility">Cơ sở</th>
                <th className="col-subject">Môn</th>
                <th className="col-rating">Rating</th>
                <th className="col-detail">Nội dung phản hồi</th>
              </tr>
            </thead>
            <tbody>
              {feedback.slice(0, 100).map((item, idx) => (
                <tr key={`${item.student}-${idx}`}>
                  <td className="col-compact">{formatDate(item.responseAt, true)}</td>
                  <td className="col-customer">
                    <strong>{item.customer || item.student}</strong>
                  </td>
                  <td className="col-facility">{item.facility}</td>
                  <td className="col-subject">{item.subject}</td>
                  <td className="col-rating">
                    <span className={`rating-pill rating-${item.rating}`}>
                      {item.rating} ★
                    </span>
                  </td>
                  <td className="feedback-text col-detail">
                    {item.detail || 'Phụ huynh chỉ gửi rating, chưa có nội dung chi tiết.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <span>Không có đánh giá 1–3 sao hoặc nội dung phản hồi trong khoảng đã chọn.</span>
        </div>
      )}
    </section>
  );
};
