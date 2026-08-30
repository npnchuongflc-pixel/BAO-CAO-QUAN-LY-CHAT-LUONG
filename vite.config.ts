import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const FACILITY_SHEET_ID = '1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY';
const FACILITY_SHEET_GIDS = new Set(['0', '33769956', '1163313960']);

const facilitySheetProxy = {
  target: 'https://docs.google.com',
  changeOrigin: true,
  secure: true,
  followRedirects: true,
  rewrite: (requestPath: string) => {
    const requestUrl = new URL(requestPath, 'http://localhost');
    const gid = requestUrl.searchParams.get('gid') || '';
    const safeGid = FACILITY_SHEET_GIDS.has(gid) ? gid : 'invalid';
    return `/spreadsheets/d/${FACILITY_SHEET_ID}/export?format=csv&gid=${encodeURIComponent(safeGid)}`;
  },
};

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: ['terminal.local'],
      // Live Preview runs Vite directly. Proxy the complete CSV export so the
      // preview uses every row instead of the filter-sensitive GViz endpoint.
      proxy: {
        '/api/facility-sheet-data': facilitySheetProxy,
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
