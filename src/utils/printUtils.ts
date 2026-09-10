/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility functions for clean, formatted PDF printing optimized for A4 Landscape
 */

export function formatPrintDateTime(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function formatPrintDateOnly(dateStr?: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return dateStr;
}

export function triggerPrintToPdf(options?: {
  title?: string;
  defaultFilename?: string;
  onBefore?: () => void;
  onAfter?: () => void;
}): void {
  const previousTitle = document.title;

  try {
    if (options?.onBefore) {
      options.onBefore();
    }

    if (options?.defaultFilename) {
      document.title = options.defaultFilename;
    } else if (options?.title) {
      const sanitized = options.title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_');
      const today = new Date().toISOString().slice(0, 10);
      document.title = `${sanitized}_${today}`;
    }

    // Trigger native browser print dialog (which has "Save as PDF" preconfigured for A4 Landscape)
    window.print();
  } finally {
    // Restore document title after print dialog closes
    setTimeout(() => {
      document.title = previousTitle;
      if (options?.onAfter) {
        options.onAfter();
      }
    }, 1000);
  }
}
