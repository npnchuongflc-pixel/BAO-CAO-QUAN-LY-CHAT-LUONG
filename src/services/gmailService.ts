import { getAccessToken } from './workspaceAuth';

export interface SendEmailPayload {
  to: string;
  subject: string;
  htmlBody: string;
}

export function buildRfc822Base64Url({
  to,
  subject,
  htmlBody,
}: SendEmailPayload): string {
  // UTF-8 base64 encoding for subject
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  const messageParts = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    htmlBody,
  ];

  const rawMessage = messageParts.join('\r\n');
  const base64 = btoa(unescape(encodeURIComponent(rawMessage)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendGmailReminder(payload: SendEmailPayload): Promise<{ id: string; threadId: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Chưa đăng nhập tài khoản Google hoặc phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
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
    const errorJson = await res.json().catch(() => ({}));
    const message = errorJson.error?.message || `Lỗi gửi email: HTTP ${res.status}`;
    throw new Error(message);
  }

  return await res.json();
}
