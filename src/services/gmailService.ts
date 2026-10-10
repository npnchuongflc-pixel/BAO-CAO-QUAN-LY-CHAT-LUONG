import { getAccessToken, clearCachedToken, getCurrentUser, getSavedUserEmail } from './workspaceAuth';
import { SheetRowItem } from '../types';
import { formatDate } from './sheetService';

export const SYSTEM_SENDER_EMAIL = 'quanlychatluongcvsg@gmail.com';
export const SYSTEM_SENDER_NAME = 'Quản Lý Chất Lượng Cờ Vua Sài Gòn';

export interface SendEmailPayload {
  to: string;
  subject: string;
  htmlBody: string;
  fromEmail?: string;
  fromName?: string;
}

// Robust UTF-8 to Base64 encoder supporting full unicode, emoji and Vietnamese diacritics
export function toBase64Utf8(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const len = bytes.length;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return btoa(unescape(encodeURIComponent(str)));
  }
}

export function toBase64Url(str: string): string {
  const b64 = toBase64Utf8(str);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildRfc822Base64Url({
  to,
  subject,
  htmlBody,
  fromEmail,
  fromName = SYSTEM_SENDER_NAME,
}: SendEmailPayload): string {
  // Determine effective sender email address. Must ALWAYS contain a valid email address inside angle brackets <...>.
  const effectiveSenderEmail = 
    fromEmail?.trim() || 
    getCurrentUser()?.email?.trim() || 
    getSavedUserEmail()?.trim() || 
    SYSTEM_SENDER_EMAIL;

  // UTF-8 RFC 2047 base64 encoding for subject & sender display name
  const utf8Subject = `=?utf-8?B?${toBase64Utf8(subject)}?=`;
  const utf8FromName = `=?utf-8?B?${toBase64Utf8(fromName)}?=`;

  const fromHeader = `From: ${utf8FromName} <${effectiveSenderEmail}>`;
  
  // RFC 2045 & RFC 5322: base64 encoded body MUST be split into lines of at most 76 characters
  const rawBase64 = toBase64Utf8(htmlBody);
  const base64Body = rawBase64.match(/.{1,76}/g)?.join('\r\n') || rawBase64;

  const messageParts = [
    `Date: ${new Date().toUTCString()}`,
    fromHeader,
    `To: ${to.trim()}`,
    `Reply-To: ${SYSTEM_SENDER_EMAIL}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    `Subject: ${utf8Subject}`,
    '',
    base64Body,
  ];

  const rawMessage = messageParts.join('\r\n');
  return toBase64Url(rawMessage);
}

export async function sendGmailReminder(payload: SendEmailPayload): Promise<{ id: string; threadId: string }> {
  const token = await getAccessToken();
  if (!token || token === 'saved') {
    throw new Error('AUTH_REQUIRED');
  }

  const raw = buildRfc822Base64Url(payload);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      clearCachedToken();
      if (res.status === 403) {
        throw new Error('Tài khoản Google chưa được cấp quyền gửi email (Gmail Send). Vui lòng đăng nhập lại và tích chọn cho phép quyền gửi email.');
      }
      throw new Error('Phiên đăng nhập Google đã hết hạn. Vui lòng bấm đăng nhập lại để tiếp tục.');
    }
    const errorJson = await res.json().catch(() => ({}));
    console.error('Gmail API send error:', res.status, errorJson);
    const message = errorJson.error?.message || `Lỗi từ dịch vụ Gmail (HTTP ${res.status})`;
    throw new Error(message);
  }

  return await res.json();
}

export function generateUrgentFeedbackHtml({
  item,
  departmentName,
  roleDescription,
  customNote,
  senderIdentity,
}: {
  item: SheetRowItem;
  departmentName: string;
  roleDescription: string;
  customNote?: string;
  senderIdentity?: string;
}): string {
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
            Chỉ định bộ phận xử lý: <u>${departmentName}</u>
          </p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #b91c1c;">
            Nhiệm vụ: ${roleDescription}
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
            Email được gửi tự động từ Dashboard Quản Lý Chất Lượng (${SYSTEM_SENDER_EMAIL})${senderIdentity ? ` theo yêu cầu của ${senderIdentity}` : ''}.
          </p>
        </div>
      </div>
    </div>
  `;
}

export function generateUrgentFeedbackPlainText({
  item,
  departmentName,
  roleDescription,
  customNote,
}: {
  item: SheetRowItem;
  departmentName: string;
  roleDescription: string;
  customNote?: string;
}): string {
  const feedbackText = item.detail && item.detail.trim().length > 0 
    ? item.detail 
    : 'Phụ huynh chỉ gửi rating đánh giá, chưa có nội dung chi tiết.';

  return `⚠️ THÔNG BÁO XỬ LÝ GẤP PHẢN HỒI ĐÁNH GIÁ THẤP (${item.rating}★)
Hệ thống Giám sát & Quản lý Chất lượng Saigon Academy

- Chỉ định bộ phận xử lý: ${departmentName}
- Nhiệm vụ: ${roleDescription}

📌 CHI TIẾT LỚP HỌC & PHẢN HỒI TỪ PHỤ HUYNH:
- Cơ sở: ${item.facility}
- Môn học & Khóa: ${item.subject} (${item.course})
- Học viên: ${item.student} ${item.customer ? `(PH: ${item.customer})` : ''}
- Thời gian đánh giá: ${formatDate(item.responseAt, true)}
- Đánh giá (Rating): ${item.rating}★ (Mức báo động)

💬 NỘI DUNG PHẢN ÁNH CỦA PHỤ HUYNH:
"${feedbackText}"

${customNote ? `📝 GHI CHÚ CHỈ ĐẠO BỔ SUNG:\n${customNote}\n\n` : ''}⚠️ ĐỀ NGHỊ HÀNH ĐỘNG:
1. Liên hệ xác minh tình hình với phụ huynh / giáo viên trong vòng 24 giờ.
2. Đề xuất giải pháp khắc phục và cập nhật trạng thái lên nhóm Quản lý Chất lượng.

---
Email được gửi từ Ban Quản Lý Chất Lượng (${SYSTEM_SENDER_EMAIL}).`;
}

export function buildGmailComposeUrl({
  to,
  subject,
  bodyText,
}: {
  to: string;
  subject: string;
  bodyText: string;
}): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to,
    su: subject,
    body: bodyText,
    authuser: SYSTEM_SENDER_EMAIL,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}


