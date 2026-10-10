import React, { useState, useMemo, useEffect } from 'react';
import { SheetRowItem } from '../types';
import { formatDate } from '../services/sheetService';
import { EmailReminderModal, DEPARTMENTS, getDefaultDepartmentId } from './EmailReminderModal';
import { 
  TARGET_SENDER_EMAIL, 
  googleSignIn, 
  getAccessToken, 
  getCurrentUser, 
  purgeOldSenderAccount,
  initAuth 
} from '../services/workspaceAuth';
import { User } from 'firebase/auth';
import { 
  sendGmailReminder, 
  generateUrgentFeedbackHtml, 
  SYSTEM_SENDER_NAME 
} from '../services/gmailService';
import { 
  Send, 
  CheckCircle2, 
  AlertOctagon, 
  Loader2, 
  Eye, 
  AlertTriangle,
  Mail,
  LogOut
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

  // Google Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  useEffect(() => {
    const unsub = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasToken(!!token);
      },
      () => {
        setCurrentUser(null);
        setHasToken(false);
      }
    );
    getAccessToken().then((t) => setHasToken(!!t));
    return () => unsub();
  }, []);

  const handleLoginGoogle = async () => {
    setIsAuthLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setHasToken(true);
        setToastMessage(`✓ Đã đăng nhập Google: ${res.user.email}!`);
        setTimeout(() => setToastMessage(''), 5000);
      }
    } catch (err: any) {
      setToastMessage(err.message || 'Đăng nhập Google thất bại');
      setTimeout(() => setToastMessage(''), 7000);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogoutGoogle = async () => {
    await purgeOldSenderAccount();
    setCurrentUser(null);
    setHasToken(false);
    setToastMessage('Đã đăng xuất tài khoản Google.');
    setTimeout(() => setToastMessage(''), 4000);
  };

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

    setToastMessage(`✓ Đã gửi email thành công qua Gmail API đến "${sentInfo.departmentName}" (${sentInfo.toEmail})!`);
    setTimeout(() => {
      setToastMessage('');
    }, 5000);
  };

  // Direct Send button handler from table row
  const handleDirectSend = async (item: SheetRowItem, rowKey: string) => {
    const defaultDeptId = getDefaultDepartmentId(item.subject);
    const deptId = rowDepartments[rowKey] || defaultDeptId;
    const dept = DEPARTMENTS.find((d) => d.id === deptId) || DEPARTMENTS[0];

    // If not authenticated, open the modal so the user can easily review and sign in
    const token = await getAccessToken();
    if (!token) {
      handleOpenEmailModal(item, rowKey);
      return;
    }

    setSendingRowKey(rowKey);
    try {
      const subject = `[XỬ LÝ GẤP - RATING ${item.rating || '1'}★] Cảnh báo chất lượng cơ sở ${item.facility} (${item.subject}) - PH bé ${item.student}`;
      const htmlBody = generateUrgentFeedbackHtml({
        item,
        departmentName: dept.name,
        roleDescription: dept.roleDescription,
        senderIdentity: currentUser?.email || TARGET_SENDER_EMAIL,
      });

      await sendGmailReminder({
        to: dept.defaultEmail,
        subject,
        htmlBody,
        fromEmail: currentUser?.email || TARGET_SENDER_EMAIL,
        fromName: SYSTEM_SENDER_NAME,
      });

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

      setToastMessage(`✓ Đã gửi email thành công qua Gmail API đến "${dept.name}" (${dept.defaultEmail})!`);
      setTimeout(() => {
        setToastMessage('');
      }, 5000);
    } catch (err: any) {
      console.error('Lỗi gửi email:', err);
      // Open modal so user can authenticate or review error
      handleOpenEmailModal(item, rowKey);
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

      {/* SENDER GOOGLE ACCOUNT CONNECTION STRIP */}
      <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Mail className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-bold text-slate-700">Tài khoản gửi chính thức:</span>
          <span className="font-mono font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded">
            {TARGET_SENDER_EMAIL}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {currentUser && hasToken ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-100/80 border border-emerald-300 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Đã kết nối: <strong>{currentUser.email}</strong></span>
              </span>
              <button
                type="button"
                onClick={handleLogoutGoogle}
                className="text-slate-500 hover:text-rose-600 font-semibold px-2 py-1 rounded border border-slate-200 hover:bg-white text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                title="Đăng xuất để đổi tài khoản Google khác"
              >
                <LogOut className="w-3 h-3" />
                <span>Đổi tài khoản</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLoginGoogle}
              disabled={isAuthLoading}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center gap-2 shadow-2xs transition-all disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span>{isAuthLoading ? 'Đang kết nối Google…' : `Đăng nhập ${TARGET_SENDER_EMAIL}`}</span>
            </button>
          )}
        </div>
      </div>

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
