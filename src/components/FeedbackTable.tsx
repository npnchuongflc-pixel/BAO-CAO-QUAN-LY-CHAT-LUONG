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

  const [showAuthGuide, setShowAuthGuide] = useState<boolean>(false);

  const checkAuthStatus = async () => {
    const user = getCurrentUser();
    const savedEmail = getSavedUserEmail();
    const token = await getAccessToken();
    setHasGoogleAuth(!!token);
    setCurrentSenderEmail(user?.email || savedEmail || null);
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
      if (res) {
        setHasGoogleAuth(true);
        setCurrentSenderEmail(res.user.email);
        setToastMessage(`Đã kết nối tài khoản người gửi ${res.user.email}! Lần sau bạn không cần đăng nhập lại.`);
        setTimeout(() => setToastMessage(''), 6000);
      }
    } catch (err: any) {
      if (
        err?.code !== 'auth/popup-closed-by-user' &&
        !err?.message?.includes('popup-closed-by-user')
      ) {
        setToastMessage(`Đăng nhập Google thất bại: ${err.message || 'Lỗi không xác định'}`);
        setTimeout(() => setToastMessage(''), 6000);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleDisconnectSender = async () => {
    await purgeOldSenderAccount();
    setHasGoogleAuth(false);
    setCurrentSenderEmail(null);
    setToastMessage(`Đã gỡ bỏ tài khoản. Bạn có thể nhấn đăng nhập để kết nối lại ${TARGET_SENDER_EMAIL}.`);
    setTimeout(() => setToastMessage(''), 5000);
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
    if (!token) {
      // If not yet authenticated, open modal to connect Google and send cleanly
      handleOpenEmailModal(item, rowKey);
      return;
    }

    if (!autoQuickSend) {
      // If user toggled off quick-send, open preview modal
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
        senderIdentity: currentSenderEmail || SYSTEM_SENDER_EMAIL,
      });

      await sendGmailReminder({
        to: dept.defaultEmail,
        subject,
        htmlBody,
        fromEmail: currentSenderEmail || getSavedUserEmail() || undefined,
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

      setToastMessage(`Đã gửi thành công email nhắc nhở đến "${dept.name}" (${dept.defaultEmail})!`);
      setTimeout(() => {
        setToastMessage('');
      }, 6000);
    } catch (err: any) {
      console.error('Lỗi gửi email trực tiếp:', err);
      if (err.message?.includes('hết hạn') || err.message?.includes('Chưa kết nối')) {
        setHasGoogleAuth(false);
        handleOpenEmailModal(item, rowKey);
      } else {
        setToastMessage(`Lỗi gửi: ${err.message || 'Thất bại'}`);
        setTimeout(() => setToastMessage(''), 7000);
      }
    } finally {
      setSendingRowKey(null);
    }
  };

  const isMatchingSender = currentSenderEmail?.toLowerCase() === TARGET_SENDER_EMAIL.toLowerCase();

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
            className="text-emerald-100 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* SENDER ACCOUNT & QUICK SEND CONTROL BAR */}
      <div className="mb-4 bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              hasGoogleAuth 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {hasGoogleAuth ? <ShieldCheck className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  Tài khoản gửi email (Gmail):
                </span>
                {hasGoogleAuth && currentSenderEmail ? (
                  <span className="font-mono text-xs font-black text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    {currentSenderEmail}
                  </span>
                ) : (
                  <span className="text-xs text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                    Chưa kết nối
                  </span>
                )}
              </div>
              <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                {hasGoogleAuth ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Đã ghi nhớ phiên làm việc · Phản hồi tự động chuyển về: <strong>{SYSTEM_SENDER_EMAIL}</strong>
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs">
                    Đăng nhập tài khoản Google của bạn một lần duy nhất để hệ thống tự động gửi email nhắc nhở
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Quick Send 1-Click Toggle */}
          <label className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 cursor-pointer select-none text-xs">
            <input
              type="checkbox"
              checked={autoQuickSend}
              onChange={(e) => handleToggleQuickSend(e.target.checked)}
              className="w-3.5 h-3.5 text-rose-600 rounded focus:ring-0 cursor-pointer"
            />
            <span className="flex items-center gap-1 text-slate-200 font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              Gửi nhanh 1-Click (Tự động gửi ngay khi bấm)
            </span>
          </label>

          {/* Connect / Change Account Button */}
          {hasGoogleAuth ? (
            <button
              type="button"
              onClick={handleDisconnectSender}
              className="text-xs text-slate-300 hover:text-rose-400 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Đăng xuất hoặc đổi tài khoản gửi"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đổi tài khoản</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleConnectSender}
                disabled={isAuthLoading}
                className="text-xs font-extrabold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 px-3.5 py-1.5 rounded-xl shadow-md shadow-rose-900/40 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isAuthLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>Đăng nhập {TARGET_SENDER_EMAIL} (1 lần)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAuthGuide(true)}
                className="text-[11px] text-amber-300 hover:text-amber-200 underline flex items-center gap-1 py-1 px-1.5 cursor-pointer"
                title="Bấm xem hướng dẫn nếu gặp lỗi Google chặn 403 khi đăng nhập tài khoản này"
              >
                <span>❓ Nếu bị lỗi Google chặn (Lỗi 403)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Guide Modal: Fix Google 403 access_denied */}
      {showAuthGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-extrabold text-base">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>Cách Mở Quyền Google Cho {TARGET_SENDER_EMAIL}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthGuide(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-700 space-y-3 leading-relaxed">
              <p className="bg-rose-50 text-rose-900 p-3 rounded-xl border border-rose-200">
                <strong>Tại sao Google báo lỗi 403?</strong> Vì dự án Google Cloud đang ở chế độ thử nghiệm nội bộ, Google bắt buộc phải thêm tài khoản <code>{TARGET_SENDER_EMAIL}</code> vào danh sách người thử nghiệm trước khi cho phép đăng nhập.
              </p>

              <div className="space-y-2">
                <p className="font-extrabold text-slate-900">👉 Bạn chỉ cần làm 3 bước đơn giản (mất 30 giây):</p>
                <ol className="list-decimal list-inside space-y-2 pl-1 font-medium text-slate-800">
                  <li>
                    Bấm mở trang cấu hình Google Cloud của bạn:
                    <div className="mt-1">
                      <a
                        href="https://console.cloud.google.com/apis/credentials/consent?project=gen-lang-client-0375685705"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs"
                      >
                        <span>Mở Google Cloud Console ↗</span>
                      </a>
                    </div>
                  </li>
                  <li>
                    Tại trang đó, cuộn xuống phần <strong>Test users (Người dùng thử nghiệm)</strong> và bấm nút <strong>+ ADD USERS</strong>.
                  </li>
                  <li>
                    Nhập chính xác email: <strong className="text-rose-700 font-mono bg-rose-50 px-1.5 py-0.5 rounded">{TARGET_SENDER_EMAIL}</strong> rồi bấm <strong>SAVE (Lưu)</strong>.
                  </li>
                </ol>
              </div>

              <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 font-medium">
                ✓ Sau khi bấm Lưu xong trên Google Cloud, bạn quay lại trang này và bấm nút <strong>"Đăng nhập {TARGET_SENDER_EMAIL}"</strong> là Google sẽ cho phép đăng nhập thành công ngay lập tức!
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAuthGuide(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Đã hiểu, đóng lại
              </button>
            </div>
          </div>
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

                                {/* Nút đã gửi email & Nút gửi lại nếu cần */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={true}
                                    className="px-2.5 py-1.5 text-xs font-black text-emerald-800 bg-emerald-100/90 border border-emerald-300 rounded-lg shadow-2xs flex items-center justify-center gap-1.5 opacity-90 select-none shrink-0"
                                    title={`Email đã được gửi đến ${sentInfo.departmentName} lúc ${formatDate(new Date(sentInfo.sentAt), true)}.`}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                    <span>Đã gửi</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEmailModal(item, rowKey)}
                                    className="px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:text-rose-600 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                                    title="Bấm để gửi lại hoặc gửi thêm cho bộ phận khác"
                                  >
                                    Gửi lại
                                  </button>
                                </div>
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

                              {/* 2. Nút Gửi Email & Xem trước */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={sendingRowKey === rowKey}
                                  onClick={() => handleDirectSend(item, rowKey)}
                                  className={`px-3 py-1.5 text-xs font-black text-white rounded-lg shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                                    sendingRowKey === rowKey 
                                      ? 'bg-rose-400 opacity-80 cursor-wait' 
                                      : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700'
                                  }`}
                                  title={
                                    autoQuickSend && hasGoogleAuth
                                      ? "Nhấn để tự động gửi email ngay đến bộ phận phụ trách"
                                      : "Gửi email nhắc nhở bộ phận phụ trách"
                                  }
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

                                {/* Nút xem trước / ghi chú */}
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
                        </div>
                      ) : (
                        /* Rating >= 3: Không bắt buộc xử lý gấp */
                        sentInfo ? (
                          <div className="select-none flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              disabled={true}
                              className="px-2 py-0.5 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-md cursor-not-allowed opacity-90 flex items-center gap-1"
                              title={`Đã gửi email lúc ${formatDate(new Date(sentInfo.sentAt), true)}`}
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Đã gửi ({sentInfo.departmentName})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEmailModal(item, rowKey)}
                              className="text-[11px] text-slate-500 hover:text-rose-600 underline cursor-pointer"
                              title="Gửi lại email cho bộ phận khác nếu cần"
                            >
                              Gửi lại
                            </button>
                            <div className="text-[10px] text-emerald-700 font-mono w-full">
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
