import React, { useState, useEffect, useMemo } from 'react';
import { SheetRowItem } from '../types';
import { formatDate } from '../services/sheetService';
import { 
  sendGmailReminder, 
  buildGmailComposeUrl, 
  generateUrgentFeedbackHtml,
  generateUrgentFeedbackPlainText, 
  buildUrgentEmailSubject,
  SYSTEM_SENDER_NAME,
  SYSTEM_SENDER_EMAIL
} from '../services/gmailService';
import { 
  googleSignIn, 
  getAccessToken, 
  getCurrentUser, 
  purgeOldSenderAccount, 
  TARGET_SENDER_EMAIL 
} from '../services/workspaceAuth';
import { User } from 'firebase/auth';
import { 
  Mail, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Send, 
  Building2, 
  Calendar, 
  BookOpen, 
  ShieldAlert, 
  Loader2,
  LogOut,
  Eye,
  Settings,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  FileText
} from 'lucide-react';

export interface DepartmentOption {
  id: string;
  name: string;
  defaultEmail: string;
  roleDescription: string;
  color: 'emerald' | 'blue' | 'amber' | 'purple';
}

export const DEPARTMENTS: DepartmentOption[] = [
  {
    id: 'kinhdoanh',
    name: 'Phòng Kinh Doanh',
    defaultEmail: 'truongnhomkinhdoanh2.cvsg@gmail.com',
    roleDescription: 'Chăm sóc phụ huynh, xử lý phản ánh dịch vụ & ghi nhận giải pháp bồi hoàn / bảo lưu',
    color: 'emerald',
  },
  {
    id: 'truongnhomco',
    name: 'Trưởng Nhóm Cờ',
    defaultEmail: 'truongnhomco.cvsg@gmail.com',
    roleDescription: 'Xử lý chất lượng chuyên môn môn Cờ vua, phương pháp sư phạm của giáo viên & trợ giảng',
    color: 'blue',
  },
  {
    id: 'truongnhomve',
    name: 'Trưởng Nhóm Vẽ',
    defaultEmail: 'bophanvanhanh.saigonart@gmail.com',
    roleDescription: 'Xử lý chất lượng chuyên môn môn Mỹ thuật (Saigon Art), giáo án và nề nếp lớp học',
    color: 'amber',
  },
  {
    id: 'test',
    name: 'Email Test (Giám Sát)',
    defaultEmail: 'ctvgiamsatcvsg@gmail.com',
    roleDescription: 'Hộp thư kiểm thử & giám sát để test thử tính năng gửi email nhắc nhở',
    color: 'purple',
  },
];

export function getDefaultDepartmentId(subject?: string): string {
  const s = (subject || '').toLowerCase();
  if (s.includes('cờ')) return 'truongnhomco';
  if (s.includes('vẽ')) return 'truongnhomve';
  return 'kinhdoanh';
}

interface EmailReminderModalProps {
  item: SheetRowItem;
  initialDepartmentId?: string;
  onClose: () => void;
  onSuccess: (sentInfo: { departmentName: string; toEmail: string; sentAt: Date }) => void;
}

export const EmailReminderModal: React.FC<EmailReminderModalProps> = ({
  item,
  initialDepartmentId,
  onClose,
  onSuccess,
}) => {
  const fallbackDeptId = initialDepartmentId || getDefaultDepartmentId(item.subject);
  const [selectedDeptId, setSelectedDeptId] = useState<string>(fallbackDeptId);
  const selectedDept = DEPARTMENTS.find((d) => d.id === selectedDeptId) || DEPARTMENTS[0];

  const [toEmail, setToEmail] = useState<string>(selectedDept.defaultEmail);
  const [customNote, setCustomNote] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'compose' | 'preview'>('compose');
  const [copiedType, setCopiedType] = useState<'html' | 'text' | null>(null);

  // Auth & Sending State
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    setToEmail(selectedDept.defaultEmail);
  }, [selectedDeptId]);

  useEffect(() => {
    const checkAuth = async () => {
      const u = getCurrentUser();
      const t = await getAccessToken();
      setCurrentUser(u);
      setHasToken(!!t);
    };
    checkAuth();
  }, []);

  const handleLoginGoogle = async () => {
    setIsLoggingIn(true);
    setErrorMsg('');
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setHasToken(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng nhập Google thất bại');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogoutGoogle = async () => {
    await purgeOldSenderAccount();
    setCurrentUser(null);
    setHasToken(false);
  };

  // Standardized subject line using helper
  const subject = useMemo(() => {
    return buildUrgentEmailSubject({
      item,
      departmentName: selectedDept.name,
    });
  }, [item, selectedDept.name]);

  // Generate standardized, executive HTML email body
  const htmlBody = useMemo(() => {
    return generateUrgentFeedbackHtml({
      item,
      departmentName: selectedDept.name,
      roleDescription: selectedDept.roleDescription,
      customNote: customNote.trim() || undefined,
      senderIdentity: currentUser?.email || TARGET_SENDER_EMAIL,
    });
  }, [item, selectedDept, customNote, currentUser]);

  // Generate plain text body for fallback / copy
  const plainTextBody = useMemo(() => {
    return generateUrgentFeedbackPlainText({
      item,
      departmentName: selectedDept.name,
      roleDescription: selectedDept.roleDescription,
      customNote: customNote.trim() || undefined,
    });
  }, [item, selectedDept, customNote]);

  const handleCopy = async (type: 'html' | 'text') => {
    try {
      const content = type === 'html' ? htmlBody : plainTextBody;
      await navigator.clipboard.writeText(content);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendEmail = async () => {
    if (!toEmail || !toEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email người nhận hợp lệ');
      return;
    }

    setIsSending(true);
    setErrorMsg('');

    try {
      let token = await getAccessToken();
      let activeUser = currentUser;

      if (!token) {
        setIsLoggingIn(true);
        const res = await googleSignIn();
        setIsLoggingIn(false);
        if (!res) {
          setErrorMsg('Vui lòng hoàn tất đăng nhập tài khoản Google để gửi email.');
          setIsSending(false);
          return;
        }
        token = res.accessToken;
        activeUser = res.user;
        setCurrentUser(res.user);
        setHasToken(true);
      }

      await sendGmailReminder({
        to: toEmail.trim(),
        subject,
        htmlBody,
        fromEmail: activeUser?.email || TARGET_SENDER_EMAIL,
        fromName: SYSTEM_SENDER_NAME,
      });

      onSuccess({
        departmentName: selectedDept.name,
        toEmail: toEmail.trim(),
        sentAt: new Date(),
      });
      onClose();
    } catch (err: any) {
      console.error('Lỗi gửi qua Gmail API:', err);
      setErrorMsg(err.message || 'Không thể gửi email qua Gmail API. Vui lòng đăng nhập lại hoặc thử lại.');
    } finally {
      setIsSending(false);
      setIsLoggingIn(false);
    }
  };

  const handleOpenGmailWeb = () => {
    if (!toEmail || !toEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email người nhận hợp lệ');
      return;
    }

    const composeUrl = buildGmailComposeUrl({
      to: toEmail.trim(),
      subject,
      bodyText: plainTextBody,
    });

    window.open(composeUrl, '_blank', 'noopener,noreferrer');

    onSuccess({
      departmentName: selectedDept.name,
      toEmail: toEmail.trim(),
      sentAt: new Date(),
    });
    onClose();
  };

  const rating = item.rating ?? 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-6 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-rose-700 via-red-600 to-rose-800 text-white p-5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shadow-inner shrink-0 border border-white/20">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold tracking-tight truncate">
                  Gửi Email Thông Báo Xử Lý Phản Hồi ({rating}★)
                </h3>
                <span className="text-[10px] font-black uppercase bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30 shrink-0">
                  {rating <= 1 ? 'Khẩn Cấp 24H' : 'Cần Xử Lý'}
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-0.5 truncate">
                Định dạng chuẩn executive gửi đến các bộ phận chuyên trách ({selectedDept.name})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0 ml-2"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between px-6 bg-slate-100/90 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 py-2">
            <button
              type="button"
              onClick={() => setActiveTab('compose')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'compose'
                  ? 'bg-white text-rose-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Thiết lập &amp; Người nhận</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white text-rose-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>👁️ Xem trước nội dung Email</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>
          </div>

          {activeTab === 'preview' && (
            <div className="flex items-center gap-1.5 py-2">
              <button
                type="button"
                onClick={() => handleCopy('html')}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-all flex items-center gap-1 cursor-pointer"
                title="Sao chép toàn bộ mã HTML của Email"
              >
                {copiedType === 'html' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedType === 'html' ? 'Đã chép HTML' : 'Chép HTML'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy('text')}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-all flex items-center gap-1 cursor-pointer"
                title="Sao chép nội dung văn bản thuần"
              >
                {copiedType === 'text' ? <Check className="w-3 h-3 text-emerald-600" /> : <FileText className="w-3 h-3" />}
                <span>{copiedType === 'text' ? 'Đã chép văn bản' : 'Chép văn bản'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
          {activeTab === 'compose' ? (
            <>
              {/* Target Class Info Summary Card */}
              <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-4 transition-all">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-black text-rose-800 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded">
                        {rating} ★ ĐÁNH GIÁ THẤP
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {item.facility} · Môn {item.subject}
                      </span>
                      {item.processStatus && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          item.processStatus === 'Đã xử lý'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.processStatus === 'Đang xử lý'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {item.processStatus}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      Học viên: {item.student} {item.customer ? `(PH: ${item.customer})` : ''}
                    </h4>
                    <div className="text-xs text-slate-600 mt-1 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(item.responseAt, true)}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        {item.course}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content text */}
                <div className="mt-3 bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-800">
                  <span className="font-bold text-slate-600 block mb-0.5">💬 Phản ánh của Phụ huynh:</span>
                  <p className="italic text-rose-950 font-medium bg-rose-50/50 p-2 rounded border-l-2 border-rose-500">
                    "{item.detail || 'Phụ huynh chỉ gửi rating đánh giá, chưa có nội dung chi tiết.'}"
                  </p>
                </div>

                {/* Solution on sheet if present */}
                {item.solutionPlan && (
                  <div className="mt-2.5 bg-blue-50/70 border border-blue-200 rounded-lg p-2.5 text-xs">
                    <span className="font-bold text-blue-900 block mb-0.5">📋 Phương án đã ghi nhận trên Sheet:</span>
                    <p className="text-blue-950 font-medium">✓ {item.solutionPlan}</p>
                    {item.assignedPerson && (
                      <span className="text-[11px] text-blue-700 mt-0.5 block">Nhân sự tiếp nhận: <strong>{item.assignedPerson}</strong></span>
                    )}
                  </div>
                )}
              </div>

              {/* Department selection */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-rose-600" />
                  1. Chọn bộ phận phụ trách xử lý
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DEPARTMENTS.map((dept) => {
                    const isSelected = dept.id === selectedDeptId;
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => setSelectedDeptId(dept.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-rose-600 bg-rose-50/80 ring-2 ring-rose-500/30 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-900">
                            {dept.name}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-rose-700 font-bold mt-1 break-all">
                          {dept.defaultEmail}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {dept.roleDescription}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recipient email & Custom note */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Địa chỉ email người nhận (Bộ phận {selectedDept.name}):
                    </label>
                    <span className="text-[11px] text-slate-400">Có thể chỉnh sửa hoặc thêm email</span>
                  </div>
                  <input
                    type="email"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    placeholder="Nhập địa chỉ email nhận thông báo..."
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Chỉ đạo cụ thể / Ghi chú bổ sung gửi kèm (tùy chọn):
                    </label>
                    <span className="text-[11px] text-amber-700 font-medium">Sẽ được format trang trọng trong email</span>
                  </div>
                  <textarea
                    rows={2}
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="Ví dụ: Đề nghị quản lý cơ sở gọi điện ngay trong sáng nay, kiểm tra camera tiết học và cập nhật tiến độ trước 15h..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Subject line preview banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide">
                  Tiêu đề email sẽ gửi:
                </div>
                <div className="font-mono text-xs font-bold text-slate-900 break-all bg-white p-2 rounded border border-slate-200">
                  {subject}
                </div>
              </div>

              {/* Sender & Google Account Connection */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-bold text-slate-700">Hộp thư gửi:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {currentUser?.email || TARGET_SENDER_EMAIL}
                    </span>
                  </div>

                  {currentUser && hasToken ? (
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-full text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Đã kết nối: <strong>{currentUser.email}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogoutGoogle}
                        className="text-xs text-slate-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer"
                        title="Đổi tài khoản Google khác"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Đổi tài khoản</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLoginGoogle}
                      disabled={isLoggingIn}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2 shadow-2xs transition-all disabled:opacity-60 cursor-pointer"
                      title="Đăng nhập tài khoản Google để cấp quyền gửi email qua Gmail API"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                      <span>{isLoggingIn ? 'Đang kết nối Google…' : `Đăng nhập ${TARGET_SENDER_EMAIL}`}</span>
                    </button>
                  )}
                </div>

                {!hasToken && (
                  <p className="text-[11px] text-slate-500 italic">
                    * Nhấn "Đăng nhập {TARGET_SENDER_EMAIL}" để cấp quyền gửi email trực tiếp qua Gmail API.
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Live Email Preview Tab */
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500">Tiêu đề:</span>
                    <span className="font-bold text-slate-900">{subject}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Giao diện chuẩn Gmail Responsive</span>
                  </span>
                </div>
                <div className="flex items-center gap-4 text-slate-600 flex-wrap">
                  <div>
                    <span className="text-slate-400">Từ:</span> <strong>{SYSTEM_SENDER_NAME} &lt;{currentUser?.email || TARGET_SENDER_EMAIL}&gt;</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Đến:</span> <strong>{selectedDept.name} &lt;{toEmail}&gt;</strong>
                  </div>
                </div>
              </div>

              {/* Rendered HTML Container */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-inner bg-slate-100 p-2 sm:p-4">
                <div 
                  className="bg-white rounded-xl shadow-xs overflow-hidden mx-auto max-w-[640px]"
                  dangerouslySetInnerHTML={{ __html: htmlBody }} 
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <p className="font-bold text-rose-900 leading-snug">
                    {errorMsg}
                  </p>
                  <p className="text-slate-600 leading-relaxed text-[11.5px]">
                    💡 <strong>Cách gửi nhanh nhất (Không cần cấu hình):</strong> Bạn chỉ cần nhấn nút <strong>"Mở web Gmail &amp; Gửi ngay"</strong> bên dưới. Trình duyệt sẽ mở sẵn một tab Gmail với đầy đủ người nhận, tiêu đề và chi tiết học viên để bạn bấm Gửi ngay.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-rose-200/80">
                <button
                  type="button"
                  onClick={handleOpenGmailWeb}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  title="Mở thư đã soạn sẵn trên giao diện web Gmail"
                >
                  <Mail className="w-4 h-4 text-white" />
                  <span>Mở web Gmail &amp; Gửi ngay</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending || isLoggingIn}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Fallback Gmail web compose button */}
            <button
              type="button"
              onClick={handleOpenGmailWeb}
              className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Mở thư đã soạn sẵn trên giao diện web Gmail"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              <span>Mở bản nháp web Gmail</span>
            </button>

            {/* Direct Send button */}
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isSending || isLoggingIn}
              className="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 rounded-xl shadow-md shadow-rose-600/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi qua Gmail API…</span>
                </>
              ) : isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang đăng nhập Google…</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {hasToken
                      ? `Gửi email ngay (${selectedDept.name})`
                      : `Đăng nhập Google & Gửi ngay (${selectedDept.name})`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
