
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';
import { defineConfig } from 'vite';

const FACILITY_SHEET_ID = '1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY';

const FACILITY_SHEET_GIDS = new Set([
  '0',
  '33769956',
  '1163313960',
]);

const facilitySheetProxy = {
  target: 'https://docs.google.com',
  changeOrigin: true,
  secure: true,
  followRedirects: true,

  rewrite: (requestPath: string) => {
    const requestUrl = new URL(requestPath, 'http://localhost');

    const gid = requestUrl.searchParams.get('gid') || '';

    const safeGid = FACILITY_SHEET_GIDS.has(gid)
      ? gid
      : 'invalid';

    return `/spreadsheets/d/${FACILITY_SHEET_ID}/export?format=csv&gid=${encodeURIComponent(safeGid)}`;
  },
};

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),

      // Remove redirects file that can cause
      // Cloudflare Workers error 100324.
      {
        name: 'remove-cloudflare-redirects',
        apply: 'build' as const,

        closeBundle() {
          const redirectsPath = path.resolve(
            __dirname,
            'dist',
            '_redirects'
          );

          if (fs.existsSync(redirectsPath)) {
            fs.unlinkSync(redirectsPath);

            console.log(
              '[Cloudflare] Removed dist/_redirects'
            );
          } else {
            console.log(
              '[Cloudflare] No dist/_redirects found'
            );
          }
        },
      },
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      host: '0.0.0.0',

      allowedHosts: ['terminal.local'],

      // Proxy Google Sheets CSV data in development.
      proxy: {
        '/api/facility-sheet-data': facilitySheetProxy,
      },

      // Preserve AI Studio HMR configuration.
      hmr: process.env.DISABLE_HMR !== 'true',

      // Preserve file-watching configuration.
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {},
    },
  };
});
