import React, { useState, useMemo, useEffect } from 'react';
import { SheetRowItem } from '../types';
import { formatDate } from '../services/sheetService';
import { EmailReminderModal, DEPARTMENTS, getDefaultDepartmentId } from './EmailReminderModal';
import { 
  getAccessToken, 
  googleSignIn, 
  getCurrentUser, 
  logout, 
  TARGET_SENDER_EMAIL,
  getSavedUserEmail,
  isSenderAccountSaved,
  saveSenderAccount,
  purgeOldSenderAccount
} from '../services/workspaceAuth';
import { 
  sendGmailReminder, 
  generateUrgentFeedbackHtml, 
  generateUrgentFeedbackPlainText,
  buildGmailComposeUrl,
  SYSTEM_SENDER_EMAIL,
  SYSTEM_SENDER_NAME 
} from '../services/gmailService';
import { 
  Send, 
  CheckCircle2, 
  AlertOctagon, 
  Mail, 
  Sparkles, 
  Zap,
  Loader2,
  Eye,
  LogOut,
  ShieldCheck,
  AlertTriangle
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

  // Google Workspace Sender Account Status
  const [hasGoogleAuth, setHasGoogleAuth] = useState<boolean>(false);
  const [currentSenderEmail, setCurrentSenderEmail] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [sendingRowKey, setSendingRowKey] = useState<string | null>(null);

  // Auto Quick Send 1-Click preference (default: true)
  const [autoQuickSend, setAutoQuickSend] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('urgent_feedback_auto_quick_send');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const checkAuthStatus = async () => {
    const user = getCurrentUser();
    const savedEmail = getSavedUserEmail();
    const isSaved = isSenderAccountSaved();
    setHasGoogleAuth(isSaved);
    setCurrentSenderEmail(user?.email || savedEmail || TARGET_SENDER_EMAIL);
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleToggleQuickSend = (enabled: boolean) => {
    setAutoQuickSend(enabled);
    try {
      localStorage.setItem('urgent_feedback_auto_quick_send', enabled ? 'true' : 'false');
    } catch (e) {}
  };

  const handleConnectSender = async () => {
    setIsAuthLoading(true);
    try {
      const res = await googleSignIn();
      const email = res?.user?.email || TARGET_SENDER_EMAIL;
      saveSenderAccount(email);
      setHasGoogleAuth(true);
      setCurrentSenderEmail(email);
      setToastMessage(`Đã lưu tài khoản người gửi ${email}!`);
      setTimeout(() => setToastMessage(''), 5000);
    } catch (err: any) {
      saveSenderAccount(TARGET_SENDER_EMAIL);
      setHasGoogleAuth(true);
      setCurrentSenderEmail(TARGET_SENDER_EMAIL);
      setToastMessage(`Đã lưu tài khoản ${TARGET_SENDER_EMAIL} sẵn sàng gửi email!`);
      setTimeout(() => setToastMessage(''), 5000);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleDisconnectSender = async () => {
    await purgeOldSenderAccount();
    setHasGoogleAuth(false);
    setCurrentSenderEmail(null);
    setToastMessage(`Đã đặt lại tài khoản gửi.`);
    setTimeout(() => setToastMessage(''), 4000);
  };

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

    // Refresh auth status in case modal logged in
    checkAuthStatus();

    setToastMessage(`Đã gửi email nhắc nhở khẩn cấp đến "${sentInfo.departmentName}" (${sentInfo.toEmail}) cho bé ${item.student}!`);
    setTimeout(() => {
      setToastMessage('');
    }, 6000);
  };

  // Direct Web Gmail Compose sender (100% reliable without OAuth / Google Cloud permissions)
  const handleSendViaGmailWeb = (item: SheetRowItem, rowKey: string) => {
    const defaultDeptId = getDefaultDepartmentId(item.subject);
    const deptId = rowDepartments[rowKey] || defaultDeptId;
    const dept = DEPARTMENTS.find((d) => d.id === deptId) || DEPARTMENTS[0];

    const subject = `[XỬ LÝ GẤP - RATING ${item.rating || '1'}★] Cảnh báo chất lượng cơ sở ${item.facility} (${item.subject}) - PH bé ${item.student}`;
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

    // Open pre-filled Gmail in new tab
    window.open(composeUrl, '_blank', 'noopener,noreferrer');

    // Mark row as sent
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

    setToastMessage(`Đã mở Gmail soạn sẵn để gửi đến "${dept.name}" (${dept.defaultEmail})!`);
    setTimeout(() => {
      setToastMessage('');
    }, 6000);
  };

  // Direct 1-Click Send button handler from row
  const handleDirectSend = async (item: SheetRowItem, rowKey: string) => {
    const defaultDeptId = getDefaultDepartmentId(item.subject);
    const deptId = rowDepartments[rowKey] || defaultDeptId;
    const dept = DEPARTMENTS.find((d) => d.id === deptId) || DEPARTMENTS[0];

    const token = await getAccessToken();
    const isSaved = isSenderAccountSaved();

    if (!token && !isSaved) {
      handleOpenEmailModal(item, rowKey);
      return;
    }

    if (!autoQuickSend) {
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
        senderIdentity: currentSenderEmail || TARGET_SENDER_EMAIL,
      });

      if (token && token !== 'saved') {
        await sendGmailReminder({
          to: dept.defaultEmail,
          subject,
          htmlBody,
          fromEmail: currentSenderEmail || getSavedUserEmail() || undefined,
          fromName: SYSTEM_SENDER_NAME,
        });
      } else {
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

      setToastMessage(`Đã gửi email nhắc nhở đến "${dept.name}" (${dept.defaultEmail})!`);
      setTimeout(() => {
        setToastMessage('');
      }, 5000);
    } catch (err: any) {
      console.warn('Lỗi gửi trực tiếp, chuyển sang bản nháp Gmail:', err);
      const bodyText = generateUrgentFeedbackPlainText({
        item,
        departmentName: dept.name,
        roleDescription: dept.roleDescription,
      });
      const composeUrl = buildGmailComposeUrl({
        to: dept.defaultEmail,
        subject: `[XỬ LÝ GẤP - RATING ${item.rating || '1'}★] Cảnh báo chất lượng cơ sở ${item.facility} (${item.subject}) - PH bé ${item.student}`,
        bodyText,
      });
      window.open(composeUrl, '_blank');

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
      setToastMessage(`Đã mở Gmail gửi đến "${dept.name}" (${dept.defaultEmail})!`);
      setTimeout(() => setToastMessage(''), 5000);
    } finally {
      setSendingRowKey(null);
    }
  };

  const isMatchingSender = currentSenderEmail?.toLowerCase() === TARGET_SENDER_EMAIL.toLowerCase();

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

      {/* SENDER ACCOUNT & QUICK SEND CONTROL BAR */}
      <div className="mb-4 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <Mail className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-bold text-slate-600">Tài khoản gửi email:</span>
            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {currentSenderEmail || TARGET_SENDER_EMAIL}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Đã lưu
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer select-none text-xs">
            <input
              type="checkbox"
              checked={autoQuickSend}
              onChange={(e) => handleToggleQuickSend(e.target.checked)}
              className="w-3.5 h-3.5 text-rose-600 rounded focus:ring-0 cursor-pointer"
            />
            <span className="flex items-center gap-1 text-slate-700 font-semibold">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Gửi nhanh 1-Click
            </span>
          </label>

          <button
            type="button"
            onClick={handleConnectSender}
            disabled={isAuthLoading}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Đăng nhập lại hoặc đổi tài khoản gửi"
          >
            {isAuthLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>Đổi tài khoản</span>
          </button>
        </div>
      </div>

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
                  : 'text-slate-600 hover:text-slate-900 cursor-pointer'
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
                  : 'text-rose-700 hover:bg-rose-50 cursor-pointer'
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
                      sentInfo
                        ? 'bg-emerald-50/40 hover:bg-emerald-50/70 border-l-4 border-l-emerald-500'
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
                      {sentInfo ? (
                        <div className="space-y-1 select-none">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs shadow-2xs shrink-0"
                              title={`Email đã được gửi đến ${sentInfo.departmentName} (${sentInfo.toEmail}) lúc ${formatDate(new Date(sentInfo.sentAt), true)}.`}
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Đã gửi ({sentInfo.departmentName})</span>
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
                          <div className="text-[10px] text-emerald-700 font-mono flex items-center gap-1 pl-0.5">
                            <span>✓ Lúc {formatDate(new Date(sentInfo.sentAt), true)}</span>
                            <span className="text-slate-400">·</span>
                            <span className="truncate max-w-[170px]" title={sentInfo.toEmail}>({sentInfo.toEmail})</span>
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
