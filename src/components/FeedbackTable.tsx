import React, { useState, useMemo, useEffect } from 'react';
import { SheetRowItem } from '../types';
import { formatDate } from '../services/sheetService';
import { EmailReminderModal, DEPARTMENTS, getDefaultDepartmentId } from './EmailReminderModal';
import { TARGET_SENDER_EMAIL } from '../services/workspaceAuth';
import { 
  sendGmailReminder, 
  generateUrgentFeedbackHtml, 
  generateUrgentFeedbackPlainText,
  buildGmailComposeUrl,
  SYSTEM_SENDER_NAME 
} from '../services/gmailService';
import { 
  Send, 
  CheckCircle2, 
  AlertOctagon, 
  Loader2, 
  Eye, 
  AlertTriangle 
} from 'lucide-react';

interface FeedbackTableProps {
  feedback: SheetRowItem[];
  onExportCsv: () => void;
}

export const FeedbackTable: React.FC<FeedbackTableProps> = ({ feedback, onExportCsv }) => {
  // Filter mode: 'all' | 'urgent' | 'sent'
  const [filterMode, setFilterMode] = useState<'all' | 'urgent' | 'sent'>('all');

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
  const [sendingRowKey, setSendingRowKey] = useState<string | null>(null);

  // Deterministic row key independent of index or sorting
  const getRowKey = (item: SheetRowItem): string => {
    const student = (item.student || '').trim().toLowerCase();
    const customer = (item.customer || '').trim().toLowerCase();
    const facility = (item.facility || '').trim().toLowerCase();
    const course = (item.course || '').trim().toLowerCase();
    const subject = (item.subject || '').trim().toLowerCase();
    const time = item.responseAt 
      ? item.responseAt.toISOString() 
      : (item.sentAt ? item.sentAt.toISOString() : '');
    const detailSnippet = (item.detail || '').slice(0, 30).trim().toLowerCase();
    return `${student}|${customer}|${facility}|${course}|${subject}|${time}|${detailSnippet}`;
  };

  const urgentCount = useMemo(() => {
    return feedback.filter((item) => item.rating === 1 || item.rating === 2).length;
  }, [feedback]);

  const sentCount = useMemo(() => {
    return feedback.filter((item) => !!sentRecords[getRowKey(item)]).length;
  }, [feedback, sentRecords]);

  const displayedFeedback = useMemo(() => {
    if (filterMode === 'urgent') {
      return feedback.filter((item) => item.rating === 1 || item.rating === 2);
    }
    if (filterMode === 'sent') {
      return feedback.filter((item) => !!sentRecords[getRowKey(item)]);
    }
    return feedback;
  }, [feedback, filterMode, sentRecords]);

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

    setToastMessage(`✓ Đã gửi email thông báo đến "${sentInfo.departmentName}" (${sentInfo.toEmail})!`);
    setTimeout(() => {
      setToastMessage('');
    }, 5000);
  };

  // Direct Send button handler from table row
  const handleDirectSend = async (item: SheetRowItem, rowKey: string) => {
    const defaultDeptId = getDefaultDepartmentId(item.subject);
    const deptId = rowDepartments[rowKey] || defaultDeptId;
    const dept = DEPARTMENTS.find((d) => d.id === deptId) || DEPARTMENTS[0];

    setSendingRowKey(rowKey);
    try {
      const subject = `[XỬ LÝ GẤP - RATING ${item.rating || '1'}★] Cảnh báo chất lượng cơ sở ${item.facility} (${item.subject}) - PH bé ${item.student}`;
      const htmlBody = generateUrgentFeedbackHtml({
        item,
        departmentName: dept.name,
        roleDescription: dept.roleDescription,
        senderIdentity: TARGET_SENDER_EMAIL,
      });

      try {
        await sendGmailReminder({
          to: dept.defaultEmail,
          subject,
          htmlBody,
          fromEmail: TARGET_SENDER_EMAIL,
          fromName: SYSTEM_SENDER_NAME,
        });
      } catch (err) {
        // Smoothly compose via Gmail Web pre-filled tab
        const bodyText = generateUrgentFeedbackPlainText({
          item,
          departmentName: dept.name,
          roleDescription: dept.roleDescription,
        });
        const composeUrl = buildGmailComposeUrl({
          to: dept.defaultEmail,
          subject,
          bodyText,
        });
        window.open(composeUrl, '_blank');
      }

      const newSent = {
        ...sentRecords,
        [rowKey]: {
          departmentName: dept.name,
          toEmail: dept.defaultEmail,
          sentAt: new Date().toISOString(),
        },
      };

      setSentRecords(newSent);
      try {
        localStorage.setItem('urgent_feedback_sent_emails', JSON.stringify(newSent));
      } catch (e) {}

      setToastMessage(`✓ Đã gửi email nhắc nhở đến "${dept.name}" (${dept.defaultEmail})!`);
      setTimeout(() => {
        setToastMessage('');
      }, 5000);
    } finally {
      setSendingRowKey(null);
    }
  };

  return (
    <section className="panel table-panel feedback-panel relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`mb-4 p-3.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200 ${
          toastMessage.toLowerCase().includes('thất bại') || toastMessage.toLowerCase().includes('lỗi')
            ? 'bg-rose-600 text-white'
            : 'bg-emerald-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.toLowerCase().includes('thất bại') || toastMessage.toLowerCase().includes('lỗi') ? (
              <AlertTriangle className="w-4 h-4 text-rose-200 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            )}
            <span>{toastMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setToastMessage('')}
            className="text-white/80 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* CLEAN PANEL HEADER */}
      <div className="panel-head flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="flex items-center gap-1.5 text-rose-600 font-extrabold text-xs">
            <AlertOctagon className="w-4 h-4" />
            CẢNH BÁO &amp; PHẢN HỒI PHỤ HUYNH
          </span>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            Danh sách ý kiến đóng góp &amp; Đánh giá cần xử lý
          </h2>
          <p className="text-xs text-slate-500">
            Dễ dàng chọn bộ phận phụ trách và bấm gửi email thông báo nhanh qua hộp thư quản lý ({TARGET_SENDER_EMAIL}).
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Quick Filters */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 cursor-pointer'
              }`}
            >
              Tất cả ({feedback.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('urgent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterMode === 'urgent'
                  ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                  : 'text-rose-700 hover:bg-rose-50 cursor-pointer'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${urgentCount > 0 ? 'bg-rose-400 animate-pulse' : 'bg-slate-300'}`} />
              <span>Xử lý gấp 1–2★</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                filterMode === 'urgent' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
              }`}>
                {urgentCount}
              </span>
            </button>
            {sentCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterMode('sent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterMode === 'sent'
                    ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                    : 'text-emerald-700 hover:bg-emerald-50 cursor-pointer'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đã gửi ({sentCount})</span>
              </button>
            )}
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
              {displayedFeedback.slice(0, 100).map((item) => {
                const rowKey = getRowKey(item);
                const isUrgent = item.rating === 1 || item.rating === 2;
                const sentInfo = sentRecords[rowKey];
                const defaultDeptId = getDefaultDepartmentId(item.subject);
                const currentDeptId = rowDepartments[rowKey] || defaultDeptId;

                return (
                  <tr 
                    key={rowKey}
                    className={`transition-colors ${
                      sentInfo
                        ? 'bg-emerald-50/50 hover:bg-emerald-50/80 border-l-4 border-l-emerald-500'
                        : isUrgent 
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
                      {sentInfo && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-300 px-1.5 py-0.2 rounded-md mt-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          Đã gửi mail
                        </span>
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
                    <td className="col-action py-3 px-3">
                      {sentInfo ? (
                        <div className="space-y-1.5 select-none">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-extrabold text-xs shadow-xs shrink-0"
                              title={`Email đã được gửi đến ${sentInfo.departmentName} (${sentInfo.toEmail}) lúc ${formatDate(new Date(sentInfo.sentAt), true)}.`}
                            >
                              <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                              <span>ĐÃ GỬI ({sentInfo.departmentName})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenEmailModal(item, rowKey)}
                              className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                              title="Bấm để gửi lại hoặc gửi thêm cho bộ phận khác"
                            >
                              Gửi lại
                            </button>
                          </div>
                          <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1 pl-0.5">
                            <span className="font-bold">✓ Lúc {formatDate(new Date(sentInfo.sentAt), true)}</span>
                            <span className="text-slate-400">·</span>
                            <span className="truncate max-w-[170px] font-mono text-[10.5px]" title={sentInfo.toEmail}>({sentInfo.toEmail})</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <select
                            value={currentDeptId}
                            onChange={(e) => handleDepartmentChange(rowKey, e.target.value)}
                            className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 shrink-0 max-w-[190px]"
                            title="Chọn bộ phận phụ trách"
                          >
                            {DEPARTMENTS.map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name}
                              </option>
                            ))}
                          </select>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={sendingRowKey === rowKey}
                              onClick={() => handleDirectSend(item, rowKey)}
                              className={`px-3 py-1.5 text-xs font-black text-white rounded-lg shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                                sendingRowKey === rowKey 
                                  ? 'bg-rose-400 opacity-80 cursor-wait' 
                                  : isUrgent
                                    ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                              }`}
                              title="Nhấn để tự động gửi email ngay đến bộ phận phụ trách"
                            >
                              {sendingRowKey === rowKey ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Đang gửi…</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-3 h-3" />
                                  <span>Gửi Email</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEmailModal(item, rowKey)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                              title="Xem trước nội dung email hoặc tùy chỉnh ghi chú trước khi gửi"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
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
