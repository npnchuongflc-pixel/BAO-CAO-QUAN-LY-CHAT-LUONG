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

export function buildUrgentEmailSubject({
  item,
  departmentName,
}: {
  item: SheetRowItem;
  departmentName?: string;
}): string {
  const rating = item.rating ?? 1;
  const tag = rating <= 1 ? '[XỬ LÝ GẤP 24H' : rating <= 2 ? '[CẦN XỬ LÝ' : '[THEO DÕI';
  const deptSuffix = departmentName ? ` ➔ ${departmentName}` : '';
  const facility = item.facility || 'Cơ sở';
  const student = item.student ? `Bé ${item.student}` : 'Học viên';
  const subjectName = item.subject || 'Lớp học';
  return `${tag} - RATING ${rating}★] CS ${facility} | ${student} (${subjectName})${deptSuffix}`;
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
    ? item.detail.trim() 
    : 'Phụ huynh chỉ gửi rating đánh giá, chưa để lại lời nhận xét chi tiết. Đề nghị bộ phận tiếp nhận liên hệ trực tiếp để lắng nghe ý kiến phản hồi.';

  const rating = item.rating ?? 1;
  const isCritical = rating <= 1;
  const isWarning = rating === 2;

  // Star visualization
  const ratingStars = '★'.repeat(Math.max(1, Math.min(5, rating))) + '☆'.repeat(Math.max(0, 5 - rating));

  // Dynamic Theme Colors
  const headerGradient = isCritical
    ? 'linear-gradient(135deg, #7F1D1D 0%, #B91C1C 50%, #DC2626 100%)'
    : isWarning
    ? 'linear-gradient(135deg, #9A3412 0%, #C2410C 50%, #EA580C 100%)'
    : 'linear-gradient(135deg, #1E293B 0%, #1E3A8A 50%, #2563EB 100%)';

  const badgeColor = isCritical ? '#DC2626' : isWarning ? '#EA580C' : '#2563EB';
  const badgeBg = isCritical ? '#FEF2F2' : isWarning ? '#FFF7ED' : '#EFF6FF';
  const badgeBorder = isCritical ? '#FECACA' : isWarning ? '#FFEDD5' : '#BFDBFE';

  const urgencyLabel = isCritical
    ? '⚡ XỬ LÝ GẤP TRONG VÒNG 24 GIỜ'
    : isWarning
    ? '⚠️ CẦN XÁC MINH & XỬ LÝ (24H - 48H)'
    : '📌 THEO DÕI & HỖ TRỢ PHỤ HUYNH';

  // Process Status badge
  const processStatus = item.processStatus || (item.solutionPlan ? 'Đang xử lý' : 'Chưa xử lý');
  const isResolved = processStatus === 'Đã xử lý';
  const isInProgress = processStatus === 'Đang xử lý';

  const statusBg = isResolved ? '#ECFDF5' : isInProgress ? '#FFFBEB' : '#FEF2F2';
  const statusColor = isResolved ? '#047857' : isInProgress ? '#B45309' : '#B91C1C';
  const statusBorder = isResolved ? '#A7F3D0' : isInProgress ? '#FDE68A' : '#FECACA';
  const statusIcon = isResolved ? '✓' : isInProgress ? '⏳' : '⚠️';

  const sheetUrl = 'https://docs.google.com/spreadsheets/d/1If65m8-kv10fLlu9DSgvDJCJEpPBdGrieZ7tJ9aXgmo/edit?gid=206722729#gid=206722729';

  return `
    <div style="margin: 0; padding: 24px 8px; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1E293B; -webkit-font-smoothing: antialiased;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width: 640px; width: 100%; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04); border: 1px solid #E2E8F0; border-collapse: separate;">
        
        <!-- HEADER BANNER -->
        <tr>
          <td style="background: ${headerGradient}; color: #FFFFFF; padding: 28px 30px; text-align: left;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td>
                  <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(255, 255, 255, 0.85); margin-bottom: 6px;">
                    CLB CỜ VUA SÀI GÒN &amp; SÀI GÒN ART • QUẢN LÝ CHẤT LƯỢNG
                  </div>
                  <h1 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 900; letter-spacing: -0.3px; line-height: 1.35; color: #FFFFFF;">
                    ⚠️ THÔNG BÁO XỬ LÝ PHẢN HỒI ĐÁNH GIÁ ${rating}★
                  </h1>
                  <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.35); padding: 5px 14px; border-radius: 20px; font-size: 11.5px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; color: #FFFFFF;">
                    ${urgencyLabel}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- MAIN BODY CONTENT -->
        <tr>
          <td style="padding: 26px 30px;">

            <!-- PHÂN CÔNG BỘ PHẬN TIẾP NHẬN -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8FAFC; border-left: 4px solid ${badgeColor}; border-top: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 22px;">
              <tr>
                <td style="padding: 14px 18px;">
                  <div style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: #64748B; letter-spacing: 0.8px; margin-bottom: 3px;">
                    ĐƠN VỊ TIẾP NHẬN &amp; CHỦ TRÌ XỬ LÝ
                  </div>
                  <div style="font-size: 15px; font-weight: 800; color: #0F172A;">
                    Bộ phận: <span style="color: ${badgeColor};">${departmentName}</span>
                  </div>
                  <div style="font-size: 12px; color: #475569; margin-top: 2px;">
                    ${roleDescription}
                  </div>
                </td>
              </tr>
            </table>

            <!-- BẢNG TÓM TẮT THÔNG TIN HỌC VIÊN & LỚP HỌC -->
            <div style="margin-bottom: 22px;">
              <div style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.6px; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                📌 THÔNG TIN HỌC VIÊN &amp; LỚP HỌC
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: separate; border-spacing: 0; font-size: 13px; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden;">
                <tr>
                  <td style="padding: 10px 14px; background-color: #F8FAFC; color: #64748B; font-weight: 600; width: 34%; border-bottom: 1px solid #E2E8F0;">
                    Học viên:
                  </td>
                  <td style="padding: 10px 14px; background-color: #FFFFFF; color: #0F172A; font-weight: 800; border-bottom: 1px solid #E2E8F0;">
                    ${item.student}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; background-color: #F8FAFC; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">
                    Phụ huynh:
                  </td>
                  <td style="padding: 10px 14px; background-color: #FFFFFF; color: #0F172A; font-weight: 600; border-bottom: 1px solid #E2E8F0;">
                    ${item.customer || 'Theo thông tin học viên'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; background-color: #F8FAFC; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">
                    Cơ sở &amp; Bộ môn:
                  </td>
                  <td style="padding: 10px 14px; background-color: #FFFFFF; color: #0F172A; font-weight: 700; border-bottom: 1px solid #E2E8F0;">
                    ${item.facility} • Môn ${item.subject} (${item.course})
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; background-color: #F8FAFC; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">
                    Thời gian phản hồi:
                  </td>
                  <td style="padding: 10px 14px; background-color: #FFFFFF; color: #334155; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12.5px; border-bottom: 1px solid #E2E8F0;">
                    ${formatDate(item.responseAt, true)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; background-color: #F8FAFC; color: #64748B; font-weight: 600;">
                    Đánh giá (Rating):
                  </td>
                  <td style="padding: 10px 14px; background-color: #FFFFFF;">
                    <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; font-weight: 900; font-size: 13.5px; padding: 3px 12px; border-radius: 9999px; border: 1px solid ${badgeBorder};">
                      ${ratingStars} (${rating}/5 sao)
                    </span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Ý KIẾN PHẢN ÁNH CỦA PHỤ HUYNH -->
            <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 18px; margin-bottom: 22px;">
              <div style="font-size: 11px; font-weight: 800; color: #991B1B; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px;">
                💬 NỘI DUNG PHẢN ÁNH NGUYÊN VĂN TỪ PHỤ HUYNH:
              </div>
              <div style="font-size: 14.5px; color: #7F1D1D; font-style: italic; background-color: #FFFFFF; padding: 14px 16px; border-radius: 8px; border-left: 4px solid #DC2626; line-height: 1.55; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);">
                "${feedbackText}"
              </div>
            </div>

            <!-- TÌNH TRẠNG & PHƯƠNG ÁN XỬ LÝ TRÊN SHEET -->
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin-bottom: 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.6px;">
                      📋 TÌNH TRẠNG &amp; PHƯƠNG ÁN XỬ LÝ (SHEET SỰ VỤ)
                    </div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; padding: 3px 10px; border-radius: 9999px; font-size: 11.5px; font-weight: 800;">
                      ${statusIcon} ${processStatus}
                    </span>
                  </td>
                </tr>
              </table>

              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #CBD5E1;">
                ${item.solutionPlan ? `
                  <div style="font-size: 13.5px; font-weight: 700; color: #0F172A; line-height: 1.5; margin-bottom: 6px;">
                    Phương án đã đề xuất: <span style="color: #1E40AF;">${item.solutionPlan}</span>
                  </div>
                  ${item.assignedPerson ? `
                    <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">
                      👤 Nhân sự tiếp nhận: <strong>${item.assignedPerson}</strong>
                    </div>
                  ` : ''}
                  ${item.processResult ? `
                    <div style="font-size: 12.5px; color: #047857; font-weight: 600; margin-top: 4px;">
                      ✓ Kết quả xử lý: <strong>${item.processResult}</strong>
                    </div>
                  ` : ''}
                ` : `
                  <div style="font-size: 13px; color: #991B1B; font-style: italic; background-color: #FEF2F2; padding: 10px 12px; border-radius: 6px; border: 1px dashed #FCA5A5;">
                    ⚠️ Chưa ghi nhận phương án trên Sheet. Đề nghị bộ phận tiếp nhận khẩn trương liên hệ và đưa ra phương án xử lý kịp thời.
                  </div>
                `}
              </div>
            </div>

            <!-- CHỈ ĐẠO CỤ THỂ TỪ BAN QUẢN LÝ (NẾU CÓ) -->
            ${customNote ? `
              <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 16px 18px; margin-bottom: 22px;">
                <div style="font-size: 11px; font-weight: 800; color: #92400E; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px;">
                  📝 CHỈ ĐẠO CỤ THỂ TỪ BAN QUẢN LÝ / ĐIỀU PHỐI:
                </div>
                <div style="font-size: 13.5px; color: #78350F; font-weight: 600; line-height: 1.55;">
                  ${customNote.replace(/\n/g, '<br/>')}
                </div>
              </div>
            ` : ''}

            <!-- QUY TRÌNH HÀNH ĐỘNG 3 BƯỚC CHO BỘ PHẬN TIẾP NHẬN -->
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 18px; margin-bottom: 24px;">
              <div style="font-size: 11px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px;">
                ⚡ QUY TRÌNH 3 BƯỚC XỬ LÝ BẮT BUỘC
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 12.5px; color: #334155; line-height: 1.5;">
                <tr>
                  <td style="vertical-align: top; width: 26px; font-weight: 900; color: ${badgeColor}; padding-bottom: 8px;">1.</td>
                  <td style="padding-bottom: 8px;">
                    <strong>Xác minh trong vòng 24 giờ:</strong> Liên hệ phụ huynh và giáo viên/quản lý cơ sở để lắng nghe, làm rõ nguyên nhân.
                  </td>
                </tr>
                <tr>
                  <td style="vertical-align: top; width: 26px; font-weight: 900; color: ${badgeColor}; padding-bottom: 8px;">2.</td>
                  <td style="padding-bottom: 8px;">
                    <strong>Đề xuất giải pháp khắc phục:</strong> Trao đổi chân thành, đưa ra phương án hỗ trợ chu đáo nhằm tạo sự an tâm và hài lòng cho gia đình.
                  </td>
                </tr>
                <tr>
                  <td style="vertical-align: top; width: 26px; font-weight: 900; color: ${badgeColor};">3.</td>
                  <td>
                    <strong>Cập nhật Bảng theo dõi:</strong> Điền phương án &amp; kết quả xử lý vào Sheet sự vụ để Ban Quản lý nghiệm thu và đóng vụ việc.
                  </td>
                </tr>
              </table>
            </div>

            <!-- NÚT CTA TRUY CẬP TRỰC TIẾP SHEET SỰ VỤ -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 10px auto 10px auto;">
              <tr>
                <td align="center" style="border-radius: 10px; background-color: #0F172A;">
                  <a 
                    href="${sheetUrl}" 
                    target="_blank" 
                    style="display: inline-block; padding: 13px 26px; font-size: 13px; font-weight: 800; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;"
                  >
                    📊 Mở Bảng Theo Dõi Xử Lý Sự Vụ Trên Sheet ➔
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- FOOTER BRANDING -->
        <tr>
          <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 30px; text-align: center; font-size: 11.5px; color: #64748B;">
            <div style="font-weight: 800; color: #334155; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
              HỆ THỐNG QUẢN LÝ CHẤT LƯỢNG — CLB CỜ VUA SÀI GÒN &amp; SÀI GÒN ART
            </div>
            <div style="margin-bottom: 6px;">
              Hộp thư điều phối chính thức: <a href="mailto:${SYSTEM_SENDER_EMAIL}" style="color: #0F172A; font-weight: 700; text-decoration: none; font-family: ui-monospace, Menlo, Consolas, monospace;">${SYSTEM_SENDER_EMAIL}</a>
              ${senderIdentity ? ` • Người gửi: <strong>${senderIdentity}</strong>` : ''}
            </div>
            <div style="font-size: 11px; color: #94A3B8; font-style: italic;">
              * Thông tin nội bộ phục vụ công tác nâng cao chất lượng dịch vụ và chăm sóc học viên.
            </div>
          </td>
        </tr>

      </table>
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
    ? item.detail.trim() 
    : 'Phụ huynh chỉ gửi rating đánh giá, chưa có nội dung chi tiết. Đề nghị bộ phận tiếp nhận liên hệ trực tiếp để lắng nghe ý kiến.';

  const rating = item.rating ?? 1;
  const isCritical = rating <= 1;
  const ratingStars = '★'.repeat(Math.max(1, Math.min(5, rating))) + '☆'.repeat(Math.max(0, 5 - rating));
  const processStatus = item.processStatus || (item.solutionPlan ? 'Đang xử lý' : 'Chưa xử lý');

  return `======================================================================
⚠️ THÔNG BÁO XỬ LÝ PHẢN HỒI ĐÁNH GIÁ ${rating}★ (${ratingStars})
CLB CỜ VUA SÀI GÒN & SÀI GÒN ART • QUẢN LÝ CHẤT LƯỢNG
Thời hạn: ${isCritical ? '⚡ XỬ LÝ GẤP TRONG VÒNG 24 GIỜ' : '⚠️ CẦN XÁC MINH & HỖ TRỢ (24H - 48H)'}
======================================================================

🏢 ĐƠN VỊ TIẾP NHẬN:
- Bộ phận: ${departmentName}
- Nhiệm vụ: ${roleDescription}

📌 THÔNG TIN HỌC VIÊN & LỚP HỌC:
- Học viên: ${item.student}
- Phụ huynh: ${item.customer || 'Theo thông tin học viên'}
- Cơ sở: ${item.facility}
- Môn học & Khóa: Môn ${item.subject} (${item.course})
- Thời gian gửi: ${formatDate(item.responseAt, true)}
- Điểm đánh giá: ${ratingStars} (${rating}/5 sao)

💬 NỘI DUNG PHẢN ÁNH TỪ PHỤ HUYNH:
"${feedbackText}"

📋 TÌNH TRẠNG & PHƯƠNG ÁN XỬ LÝ (SHEET SỰ VỤ):
- Tình trạng: ${processStatus}
${item.solutionPlan ? `- Phương án đã đề xuất: ${item.solutionPlan}` : '- Chưa ghi nhận phương án trên Sheet sự vụ (Cần lên phương án gấp)'}
${item.assignedPerson ? `- Nhân sự tiếp nhận: ${item.assignedPerson}` : ''}
${item.processResult ? `- Kết quả xử lý: ${item.processResult}` : ''}
${customNote ? `
📝 CHỈ ĐẠO CỤ THỂ TỪ BAN QUẢN LÝ:
${customNote}
` : ''}
⚡ QUY TRÌNH 3 BƯỚC XỬ LÝ BẮT BUỘC:
1. Xác minh trong vòng 24 giờ: Liên hệ phụ huynh và giáo viên/cơ sở để lắng nghe và làm rõ nguyên nhân.
2. Đề xuất giải pháp khắc phục: Đưa ra phương án hỗ trợ chu đáo để tạo sự an tâm và hài lòng cho gia đình.
3. Cập nhật Bảng theo dõi: Điền phương án & kết quả xử lý vào Sheet sự vụ để Ban Quản lý nghiệm thu.

📊 Link Sheet theo dõi sự vụ:
https://docs.google.com/spreadsheets/d/1If65m8-kv10fLlu9DSgvDJCJEpPBdGrieZ7tJ9aXgmo/edit?gid=206722729#gid=206722729

----------------------------------------------------------------------
Ban Quản Lý Chất Lượng Hệ Thống (${SYSTEM_SENDER_EMAIL})
* Thông tin nội bộ phục vụ công tác chăm sóc và nâng cao chất lượng học viên.`;
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


