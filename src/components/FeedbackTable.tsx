import React, { useState, useMemo, useEffect } from 'react';
import { SheetRowItem } from '../types';
import { formatDate } from '../services/sheetService';
import { EmailReminderModal, DEPARTMENTS, getDefaultDepartmentId } from './EmailReminderModal';
import { 
  Send, 
  CheckCircle2, 
  AlertOctagon, 
  Filter, 
  Mail, 
  Sparkles, 
  ChevronRight
} from 'lucide-react';

interface FeedbackTableProps {
  feedback: SheetRowItem[];
  onExportCsv: () => void;
}

export const FeedbackTable: React.FC<FeedbackTableProps> = ({ feedback, onExportCsv }) => {
  // Filter mode: all or only urgent (rating 1-2 stars)
  const [filterUrgentOnly, setFilterUrgentOnly] = useState<boolean>(false);

  // Selected department per row key: rowKey -> departmentId
  const [rowDepartments, setRowDepartments] = useState<Record<string, string>>({});

  // Sent records history: rowKey -> { departmentName, toEmail, sentAt }
  const [sentRecords, setSentRecords] = useState<Record<string, { departmentName: string; toEmail: string; sentAt: string }>>(() => {
    try {
      const saved = localStorage.getItem('urgent_feedback_sent_emails');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Active email modal item
  const [activeModalItem, setActiveModalItem] = useState<{
    item: SheetRowItem;
    rowKey: string;
    departmentId: string;
  } | null>(null);

  // Success toast
  const [toastMessage, setToastMessage] = useState<string>('');

  const getRowKey = (item: SheetRowItem, idx: number): string => {
    const studentPart = (item.student || '').trim().toLowerCase();
    const facilityPart = (item.facility || '').trim().toLowerCase();
    const coursePart = (item.course || '').trim().toLowerCase();
    const timePart = item.responseAt ? item.responseAt.getTime() : (item.sentAt ? item.sentAt.getTime() : idx);
    return `${studentPart}_${facilityPart}_${coursePart}_${timePart}`;
  };

  const urgentCount = useMemo(() => {
    return feedback.filter((item) => item.rating === 1 || item.rating === 2).length;
  }, [feedback]);

  const displayedFeedback = useMemo(() => {
    if (filterUrgentOnly) {
      return feedback.filter((item) => item.rating === 1 || item.rating === 2);
    }
    return feedback;
  }, [feedback, filterUrgentOnly]);

  const handleDepartmentChange = (rowKey: string, deptId: string) => {
    setRowDepartments((prev) => ({
      ...prev,
      [rowKey]: deptId,
    }));
  };

  const handleOpenEmailModal = (item: SheetRowItem, rowKey: string) => {
    const defaultDeptId = getDefaultDepartmentId(item.subject);
    const deptId = rowDepartments[rowKey] || defaultDeptId;
    setActiveModalItem({
      item,
      rowKey,
      departmentId: deptId,
    });
  };

  const handleSendSuccess = (sentInfo: { departmentName: string; toEmail: string; sentAt: Date }) => {
    if (!activeModalItem) return;
    const { rowKey, item } = activeModalItem;

    const newSent = {
      ...sentRecords,
      [rowKey]: {
        departmentName: sentInfo.departmentName,
        toEmail: sentInfo.toEmail,
        sentAt: sentInfo.sentAt.toISOString(),
      },
    };

    setSentRecords(newSent);
    try {
      localStorage.setItem('urgent_feedback_sent_emails', JSON.stringify(newSent));
    } catch (e) {
      console.error(e);
    }

    setToastMessage(`Đã gửi email nhắc nhở khẩn cấp đến "${sentInfo.departmentName}" (${sentInfo.toEmail}) cho bé ${item.student}!`);
    setTimeout(() => {
      setToastMessage('');
    }, 6000);
  };

  return (
    <section className="panel table-panel feedback-panel relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="mb-4 p-3.5 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setToastMessage('')}
            className="text-emerald-100 hover:text-white text-xs px-2 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      <div className="panel-head flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="flex items-center gap-1.5 text-rose-600 font-extrabold">
            <AlertOctagon className="w-3.5 h-3.5" />
            CẢNH BÁO &amp; NỘI DUNG PHẢN HỒI
          </span>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            Danh sách cần xác minh &amp; Gửi Email Xử Lý Gấp (1–2★)
          </h2>
          <p className="text-xs text-slate-500">
            Chỉ hiển thị phản hồi có nội dung hoặc rating từ 1–3 sao. Bạn có thể chọn bộ phận và bấm gửi email tự động qua Gmail.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Quick Filter: Urgent 1-2 star classes */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterUrgentOnly(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !filterUrgentOnly
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({feedback.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterUrgentOnly(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterUrgentOnly
                  ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${urgentCount > 0 ? 'bg-rose-400 animate-pulse' : 'bg-slate-300'}`} />
              <span>Xử lý gấp 1–2★</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                filterUrgentOnly ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
              }`}>
                {urgentCount}
              </span>
            </button>
          </div>

          <button type="button" className="export-button" onClick={onExportCsv}>
            Xuất CSV đã lọc
          </button>
        </div>
      </div>

      {displayedFeedback.length > 0 ? (
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
                <th className="col-action" style={{ minWidth: '260px' }}>
                  Bộ phận xử lý &amp; Gửi Email Nhắc Nhở
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedFeedback.slice(0, 100).map((item, idx) => {
                const rowKey = getRowKey(item, idx);
                const isUrgent = item.rating === 1 || item.rating === 2;
                const sentInfo = sentRecords[rowKey];
                const defaultDeptId = getDefaultDepartmentId(item.subject);
                const currentDeptId = rowDepartments[rowKey] || defaultDeptId;

                return (
                  <tr 
                    key={rowKey}
                    className={`transition-colors ${
                      isUrgent 
                        ? 'bg-rose-50/30 hover:bg-rose-50/60' 
                        : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <td className="col-compact font-mono text-xs">
                      {formatDate(item.responseAt, true)}
                    </td>

                    <td className="col-customer">
                      <div className="font-extrabold text-slate-900 text-xs">
                        {item.customer || item.student}
                      </div>
                      {item.customer && item.student && item.customer !== item.student && (
                        <div className="text-[11px] text-slate-500">
                          Bé: {item.student}
                        </div>
                      )}
                    </td>

                    <td className="col-facility font-medium text-slate-800">
                      {item.facility}
                    </td>

                    <td className="col-subject text-slate-700">
                      {item.subject}
                    </td>

                    <td className="col-rating text-center">
                      <span className={`rating-pill rating-${item.rating} ${
                        isUrgent ? 'font-black ring-2 ring-rose-400/50' : ''
                      }`}>
                        {item.rating} ★
                      </span>
                    </td>

                    <td className="feedback-text col-detail text-slate-800">
                      {item.detail ? (
                        <span>{item.detail}</span>
                      ) : (
                        <span className="text-slate-400 italic">
                          Phụ huynh chỉ gửi rating, chưa có nội dung chi tiết.
                        </span>
                      )}
                    </td>

                    {/* Column: Bộ phận xử lý & Nút gửi email */}
                    <td className="col-action py-2.5 px-3">
                      {isUrgent ? (
                        <div className="space-y-1">
                          {sentInfo ? (
                            <div className="space-y-1 select-none">
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
                                {/* Tên bộ phận đã gửi (Tĩnh / Đã chọn) */}
                                <div 
                                  className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-bold shrink-0 max-w-[170px] truncate"
                                  title={`Đã gửi thông báo đến: ${sentInfo.departmentName} (${sentInfo.toEmail})`}
                                >
                                  {sentInfo.departmentName}
                                </div>

                                {/* Nút đã gửi email - Khóa hoàn toàn, không cho phép bấm nữa */}
                                <button
                                  type="button"
                                  disabled={true}
                                  className="px-3 py-1.5 text-xs font-black text-emerald-800 bg-emerald-100/90 border border-emerald-300 rounded-lg shadow-2xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-90 select-none shrink-0"
                                  title={`Email đã được gửi đến ${sentInfo.departmentName} lúc ${formatDate(new Date(sentInfo.sentAt), true)}. Nút đã được khóa.`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                  <span>Đã gửi email</span>
                                </button>
                              </div>

                              {/* Thông báo thời gian chi tiết */}
                              <div className="text-[10px] text-emerald-700 font-mono flex items-center gap-1 pl-0.5">
                                <span>✓ Lúc {formatDate(new Date(sentInfo.sentAt), true)}</span>
                                <span className="text-slate-400">·</span>
                                <span className="truncate max-w-[170px]" title={sentInfo.toEmail}>({sentInfo.toEmail})</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              {/* 1. Lựa chọn bộ phận xử lý */}
                              <select
                                value={currentDeptId}
                                onChange={(e) => handleDepartmentChange(rowKey, e.target.value)}
                                className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 shrink-0 max-w-[190px]"
                                title="Chọn bộ phận phụ trách xử lý khẩn cấp"
                              >
                                {DEPARTMENTS.map((dept) => (
                                  <option key={dept.id} value={dept.id}>
                                    {dept.name}
                                  </option>
                                ))}
                              </select>

                              {/* 2. Nút Gửi Email */}
                              <button
                                type="button"
                                onClick={() => handleOpenEmailModal(item, rowKey)}
                                className="px-3 py-1.5 text-xs font-black text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 rounded-lg shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                                title="Mở hộp thoại gửi email nhắc nhở bộ phận phụ trách"
                              >
                                <Send className="w-3 h-3" />
                                <span>Gửi Email</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Rating >= 3: Không bắt buộc xử lý gấp */
                        sentInfo ? (
                          <div className="select-none">
                            <button
                              type="button"
                              disabled={true}
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-md cursor-not-allowed opacity-90 flex items-center gap-1"
                              title={`Đã gửi email lúc ${formatDate(new Date(sentInfo.sentAt), true)}`}
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Đã gửi ({sentInfo.departmentName})</span>
                            </button>
                            <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                              ✓ {formatDate(new Date(sentInfo.sentAt), true)}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="text-[11px] italic">Đánh giá bình thường</span>
                            <button
                              type="button"
                              onClick={() => handleOpenEmailModal(item, rowKey)}
                              className="text-[11px] text-slate-500 hover:text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                              title="Gửi email thông báo cho bộ phận liên quan nếu cần"
                            >
                              <Mail className="w-3 h-3" />
                              <span>Gửi mail</span>
                            </button>
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <span>Không có đánh giá phù hợp trong khoảng đã chọn.</span>
        </div>
      )}

      {/* Confirmation & Email Sending Modal */}
      {activeModalItem && (
        <EmailReminderModal
          item={activeModalItem.item}
          initialDepartmentId={activeModalItem.departmentId}
          onClose={() => setActiveModalItem(null)}
          onSuccess={handleSendSuccess}
        />
      )}
    </section>
  );
};
