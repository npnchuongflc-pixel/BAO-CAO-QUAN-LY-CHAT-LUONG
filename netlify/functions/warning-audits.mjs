const jsonResponse = (payload, status = 200) =>
  Response.json(payload, {
    status,
    headers: {
      'cache-control': 'no-store, max-age=0',
    },
  });

const ALLOWED_ACTIONS = new Set(['upsert', 'sync_all', 'clear_date']);

const getErrorMessage = (error) =>
  error instanceof Error ? error.message : 'Không thể kết nối Apps Script';

export default async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  const appsScriptUrl = Netlify.env.get('WARNING_APPS_SCRIPT_URL');
  const apiToken = Netlify.env.get('WARNING_API_TOKEN');

  if (!appsScriptUrl || !apiToken) {
    return jsonResponse(
      {
        success: false,
        error: 'Netlify chưa có đủ cấu hình WARNING_APPS_SCRIPT_URL và WARNING_API_TOKEN.',
      },
      503,
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Nội dung yêu cầu không phải JSON hợp lệ.' }, 400);
  }

  if (!payload || typeof payload !== 'object' || !ALLOWED_ACTIONS.has(payload.action)) {
    return jsonResponse({ success: false, error: 'Action không hợp lệ.' }, 400);
  }

  try {
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ...payload, token: apiToken }),
      signal: AbortSignal.timeout(30000),
    });

    const responseText = await response.text();
    const normalized = responseText.trimStart().toLowerCase();

    if (normalized.startsWith('<!doctype html') || normalized.startsWith('<html')) {
      throw new Error(
        'Apps Script đang trả về trang đăng nhập. Hãy triển khai Web app với quyền truy cập Anyone.',
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error('Apps Script không trả về JSON hợp lệ.');
    }

    if (!response.ok || result?.success !== true) {
      return jsonResponse(
        {
          success: false,
          error: result?.error || `Apps Script HTTP ${response.status}`,
        },
        502,
      );
    }

    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ success: false, error: getErrorMessage(error) }, 502);
  }
};

export const config = {
  path: '/api/warning-audits',
};
