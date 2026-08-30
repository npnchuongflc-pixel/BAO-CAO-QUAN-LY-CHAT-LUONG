export default async (request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
  }

  return Response.json(
    {
      ok: true,
      service: 'bao-cao-quan-ly-chat-luong',
      platform: 'netlify',
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        'cache-control': 'no-store, max-age=0',
      },
    },
  );
};

export const config = {
  path: '/api/health',
};
