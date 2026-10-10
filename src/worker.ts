export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

const FACILITY_SHEET_ID = '1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY';
const FEEDBACK_SHEET_ID = '1B2xR3L_Xm7rM92qYQxHk_0HlD8j8_t4_g7v7X2F4A';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API Health Check
    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'Zalo OA Report Backend (Cloudflare Edge Worker)',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Facility Google Sheets CSV proxy
    if (url.pathname === '/api/facility-sheet-data') {
      const gid = url.searchParams.get('gid') || '0';
      const targetUrl = `https://docs.google.com/spreadsheets/d/${FACILITY_SHEET_ID}/export?format=csv&gid=${encodeURIComponent(gid)}`;
      try {
        const upstream = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          },
        });
        const csvText = await upstream.text();
        return new Response(csvText, {
          status: upstream.status,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=60',
          },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // Customer Feedback Google Sheets GViz proxy
    if (url.pathname === '/api/sheet-data') {
      const encodedSheet = encodeURIComponent('Zalo đánh giá');
      const targetUrl = `https://docs.google.com/spreadsheets/d/${FEEDBACK_SHEET_ID}/gviz/tq?sheet=${encodedSheet}&tq=select%20A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P`;
      try {
        const upstream = await fetch(targetUrl);
        const text = await upstream.text();
        // Parse GViz response /*O_o*/ google.visualization.Query.setResponse(...)
        const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
        if (jsonMatch && jsonMatch[1]) {
          const parsed = JSON.parse(jsonMatch[1]);
          return new Response(JSON.stringify({ success: true, data: parsed }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
        return new Response(JSON.stringify({ success: false, error: 'Invalid GViz format' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // Teaching Quality Google Sheets GViz proxy (gid=282336280)
    if (url.pathname === '/api/teaching-sheet-data') {
      const targetUrl = `https://docs.google.com/spreadsheets/d/${FEEDBACK_SHEET_ID}/gviz/tq?gid=282336280`;
      try {
        const upstream = await fetch(targetUrl);
        const text = await upstream.text();
        const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
        if (jsonMatch && jsonMatch[1]) {
          const parsed = JSON.parse(jsonMatch[1]);
          return new Response(JSON.stringify({ success: true, data: parsed }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
        return new Response(JSON.stringify({ success: false, error: 'Invalid GViz format' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // Warning Audits API
    if (url.pathname === '/api/warning-audits') {
      if (request.method === 'GET') {
        const date = url.searchParams.get('date') || '';
        return new Response(JSON.stringify({ success: true, date, records: [], count: 0 }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Auto Sync Status API
    if (url.pathname === '/api/auto-sync-status') {
      return new Response(JSON.stringify({ success: true, enabled: false, lastSyncDate: null }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Static Assets fallback for SPA
    return env.ASSETS.fetch(request);
  },
};
