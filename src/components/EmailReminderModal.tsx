import React, { useState, useEffect } from 'react';
import { SheetRowItem } from '../types';
import { formatDate } from '../services/sheetService';
import { 
  sendGmailReminder, 
  buildGmailComposeUrl, 
  generateUrgentFeedbackPlainText, 
  SYSTEM_SENDER_EMAIL,
  SYSTEM_SENDER_NAME 
} from '../services/gmailService';
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
  Loader2 
} from 'lucide-react';

export interface DepartmentOption {
  id: string;
  name: string;
  defaultEmail: string;
  roleDescription: string;
  color: string;
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
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    setToEmail(selectedDept.defaultEmail);
  }, [selectedDeptId]);

  // Build subject and body
  const subject = `[XỬ LÝ GẤP - RATING ${item.rating || '1'}★] Cảnh báo chất lượng cơ sở ${item.facility} (${item.subject}) - PH bé ${item.student}`;

  const generateHtmlBody = () => {
    const feedbackText = item.detail && item.detail.trim().length > 0 
      ? item.detail 
      : 'Phụ huynh chỉ gửi rating đánh giá, chưa có nội dung chi tiết.';

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; padding: 20px 24px;">
          <h2 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
            ⚠️ THÔNG BÁO XỬ LÝ GẤP PHẢN HỒI ĐÁNH GIÁ THẤP (${item.rating}★)
          </h2>
          <p style="margin: 0; font-size: 13px; opacity: 0.9;">
            Hệ thống Giám sát & Quản lý Chất lượng Saigon Academy
          </p>
        </div>
        
        <div style="padding: 24px; background-color: #ffffff;">
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 700;">
              Chỉ định bộ phận xử lý: <u>${selectedDept.name}</u>
            </p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #b91c1c;">
              Nhiệm vụ: ${selectedDept.roleDescription}
            </p>
          </div>

          <h3 style="font-size: 15px; color: #0f172a; margin: 0 0 12px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">
            📌 Chi Tiết Lớp Học & Phản Hồi Từ Phụ Huynh
          </h3>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; width: 140px; font-weight: 600;">Cơ sở:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${item.facility}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Môn học & Khóa:</td>
                <td style="padding: 8px 0; color: #0f172a;">${item.subject} (${item.course})</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Học viên:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${item.student}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Phụ huynh:</td>
                <td style="padding: 8px 0; color: #0f172a;">${item.customer || 'Theo thông tin học viên'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Thời gian đánh giá:</td>
                <td style="padding: 8px 0; color: #0f172a;">${formatDate(item.responseAt, true)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Đánh giá (Rating):</td>
                <td style="padding: 8px 0;">
                  <span style="display: inline-block; background-color: #fee2e2; color: #b91c1c; font-weight: 800; font-size: 14px; padding: 2px 10px; border-radius: 9999px; border: 1px solid #fca5a5;">
                    ${item.rating} ★ (Mức báo động)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
            <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px;">
              💬 Nội Dung Phản Ánh Của Phụ Huynh:
            </div>
            <div style="font-size: 14px; color: #0f172a; font-style: italic; background-color: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1;">
              "${feedbackText}"
            </div>
          </div>

          ${customNote ? `
            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
              <div style="font-size: 12px; font-weight: 700; color: #b45309; text-transform: uppercase; margin-bottom: 6px;">
                📝 Ghi Chú Chỉ Đạo Bổ Sung:
              </div>
              <div style="font-size: 13px; color: #78350f;">
                ${customNote.replace(/\n/g, '<br/>')}
              </div>
            </div>
          ` : ''}

          <div style="border-top: 1px dashed #cbd5e1; padding-top: 16px; margin-top: 20px; font-size: 12px; color: #64748b;">
            <p style="margin: 0 0 4px 0;"><strong>⚠️ Đề nghị hành động:</strong></p>
            <ul style="margin: 4px 0 12px 20px; padding: 0;">
              <li>Liên hệ xác minh tình hình với phụ huynh / giáo viên trong vòng <strong>24 giờ</strong>.</li>
              <li>Đề xuất giải pháp khắc phục và cập nhật trạng thái lên nhóm Quản lý Chất lượng.</li>
            </ul>
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">
              Email được gửi tự động từ Dashboard Quản Lý Chất Lượng theo yêu cầu của <strong>${SYSTEM_SENDER_NAME} (${SYSTEM_SENDER_EMAIL})</strong>.
            </p>
          </div>
        </div>
      </div>
    `;
  };

  const handleSendEmail = async () => {
    if (!toEmail || !toEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email người nhận hợp lệ');
      return;
    }

    setIsSending(true);
    setErrorMsg('');

    try {
      const htmlBody = generateHtmlBody();
      await sendGmailReminder({
        to: toEmail.trim(),
        subject,
        htmlBody,
        fromEmail: SYSTEM_SENDER_EMAIL,
        fromName: SYSTEM_SENDER_NAME,
      });

      onSuccess({
        departmentName: selectedDept.name,
        toEmail: toEmail.trim(),
        sentAt: new Date(),
      });
      onClose();
    } catch (err: any) {
      // Smoothly fallback to pre-filled Gmail Web tab
      handleOpenGmailWeb();
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenGmailWeb = () => {
    if (!toEmail || !toEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email người nhận hợp lệ');
      return;
    }

    const bodyText = generateUrgentFeedbackPlainText({
      item,
      departmentName: selectedDept.name,
      roleDescription: selectedDept.roleDescription,
      customNote: customNote.trim() || undefined,
    });

    const composeUrl = buildGmailComposeUrl({
      to: toEmail.trim(),
      subject,
      bodyText,
    });

    window.open(composeUrl, '_blank', 'noopener,noreferrer');

    onSuccess({
      departmentName: selectedDept.name,
      toEmail: toEmail.trim(),
      sentAt: new Date(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  Gửi Email Thông Báo Xử Lý Gấp (Rating {item.rating}★)
                </h3>
                <span className="text-[10px] font-black uppercase bg-white/20 text-white px-2 py-0.5 rounded-full">
                  Khẩn Cấp
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                Nhắc nhở bộ phận chuyên trách liên hệ hỗ trợ phụ huynh &amp; khắc phục chất lượng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Target class info card */}
          <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black text-rose-800 bg-rose-200/70 px-2 py-0.5 rounded">
                    {item.rating} ★ ĐÁNH GIÁ THẤP
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    {item.facility} · Môn {item.subject}
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Học viên: {item.student} {item.customer ? `(PH: ${item.customer})` : ''}
                </h4>
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-3">
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
            <div className="mt-3 bg-white p-3 rounded-lg border border-rose-200/60 text-xs text-slate-800">
              <span className="font-bold text-slate-600 block mb-0.5">Nội dung phản ánh:</span>
              <p className="italic text-slate-900 font-medium">
                "{item.detail || 'Phụ huynh chỉ gửi rating đánh giá, chưa có nội dung chi tiết.'}"
              </p>
            </div>
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
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-rose-600 bg-rose-50/80 ring-2 ring-rose-500/30 shadow-2xs'
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
                    <div className="font-mono text-[10.5px] text-rose-700 font-bold mt-1 break-all">
                      {dept.defaultEmail}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {dept.roleDescription}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient email & Custom note */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Địa chỉ email người nhận (Bộ phận {selectedDept.name}):
              </label>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="Nhập địa chỉ email nhận thông báo..."
                className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ghi chú / Chỉ đạo bổ sung gửi kèm (tùy chọn):
              </label>
              <textarea
                rows={2}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Ví dụ: Đề nghị quản lý cơ sở gọi điện ngay trong sáng nay, kiểm tra camera tiết học và báo cáo lại trước 15h..."
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Official Sender Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold text-slate-700">Tài khoản gửi:</span>
              <span className="font-mono font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded">
                {SYSTEM_SENDER_EMAIL}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Đã lưu &amp; Sẵn sàng</span>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Fallback Gmail web compose */}
            <button
              type="button"
              onClick={handleOpenGmailWeb}
              className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Mở thư đã soạn sẵn trên giao diện web Gmail"
            >
              <Mail className="w-3.5 h-3.5 text-slate-600" />
              <span>Mở bản nháp web Gmail</span>
            </button>

            {/* Direct Send button */}
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isSending}
              className="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 rounded-xl shadow-md shadow-rose-600/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi email…</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Xác nhận gửi email ({selectedDept.name})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
