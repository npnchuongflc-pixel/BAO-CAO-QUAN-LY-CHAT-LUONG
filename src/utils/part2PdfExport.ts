import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface ExportPart2PdfOptions {
  element: HTMLElement;
  filename: string;
}

function sliceCanvasToDataUrl(
  source: HTMLCanvasElement,
  srcY: number,
  srcH: number,
): string {
  const safeY = Math.max(0, Math.floor(srcY));
  const safeH = Math.max(1, Math.min(source.height - safeY, Math.ceil(srcH)));

  const slice = document.createElement('canvas');
  slice.width = source.width;
  slice.height = safeH;

  const ctx = slice.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(
      source,
      0,
      safeY,
      source.width,
      safeH,
      0,
      0,
      source.width,
      safeH,
    );
  }

  return slice.toDataURL('image/png');
}

export async function exportPart2ElementToPdf({
  element,
  filename,
}: ExportPart2PdfOptions): Promise<void> {
  // Wait two frames so inline SVG charts and layout settle completely
  await new Promise<void>(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  const rootRect = element.getBoundingClientRect();
  const cssWidth = Math.max(1, element.offsetWidth || Math.round(rootRect.width));
  const cssHeight = Math.max(1, element.offsetHeight || Math.round(rootRect.height));

  const theadEl = element.querySelector('thead');
  const tbodyRows = Array.from(element.querySelectorAll('tbody tr'));
  const tfootEl = element.querySelector('tfoot');

  const theadTop = theadEl ? theadEl.getBoundingClientRect().top - rootRect.top : 0;
  const theadBottom = theadEl ? theadEl.getBoundingClientRect().bottom - rootRect.top : 0;
  const theadHeightCss = Math.max(0, theadBottom - theadTop);

  const rowBounds = tbodyRows.map(tr => {
    const r = tr.getBoundingClientRect();
    return {
      top: Math.max(0, r.top - rootRect.top),
      bottom: Math.min(cssHeight, r.bottom - rootRect.top),
    };
  });

  const tfootTop = tfootEl ? tfootEl.getBoundingClientRect().top - rootRect.top : cssHeight;
  const tfootBottom = tfootEl ? tfootEl.getBoundingClientRect().bottom - rootRect.top : cssHeight;
  const tfootHeightCss = Math.max(0, tfootBottom - tfootTop);

  const pixelRatio = 2.5;
  const fullCanvas = await toCanvas(element, {
    pixelRatio,
    backgroundColor: '#ffffff',
    skipFonts: true,
    cacheBust: false,
    width: cssWidth,
    height: cssHeight,
  });

  const canvasScale = fullCanvas.width / cssWidth;

  // A4 Landscape: 297mm x 210mm
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const marginX = 8;
  const marginTop = 8;
  const marginBottom = 10;
  const contentW = pageW - marginX * 2;
  const contentH = pageH - marginTop - marginBottom;

  const pxToMm = contentW / cssWidth;
  const maxPageCssH = contentH / pxToMm;

  // Case 1: Entire report (header + legend + all rows + footer) fits on 1 single page
  if (cssHeight <= maxPageCssH || rowBounds.length === 0) {
    const imgData = fullCanvas.toDataURL('image/png');
    const renderH = cssHeight * pxToMm;
    pdf.addImage(imgData, 'PNG', marginX, marginTop, contentW, renderH, undefined, 'FAST');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Trang 1 / 1', pageW - marginX, pageH - 4.5, { align: 'right' });
    pdf.save(filename);
    return;
  }

  // Case 2: Paginate cleanly along exact <tr> row boundaries, repeating <thead> on pages 2+
  interface PagePlan {
    includeHeaderBand: boolean;
    startRowIdx: number;
    endRowIdx: number; // exclusive
    includeTailToBottom: boolean;
  }

  const pages: PagePlan[] = [];
  let cursorRow = 0;

  // Page 1 rows (starting from css y = 0)
  while (cursorRow < rowBounds.length) {
    const nextBottom = rowBounds[cursorRow].bottom;
    if (nextBottom <= maxPageCssH || cursorRow === 0) {
      cursorRow++;
    } else {
      break;
    }
  }

  const allRowsFitOnPage1 = cursorRow === rowBounds.length;
  const page1FitsFooter = allRowsFitOnPage1 && cssHeight <= maxPageCssH;
  pages.push({
    includeHeaderBand: false,
    startRowIdx: 0,
    endRowIdx: cursorRow,
    includeTailToBottom: page1FitsFooter,
  });

  // Continuation pages
  const maxContRowsCssH = Math.max(80, maxPageCssH - theadHeightCss);
  while (cursorRow < rowBounds.length) {
    const firstIdx = cursorRow;
    const baseTop = rowBounds[firstIdx].top;

    while (cursorRow < rowBounds.length) {
      const spanH = rowBounds[cursorRow].bottom - baseTop;
      if (spanH <= maxContRowsCssH || cursorRow === firstIdx) {
        cursorRow++;
      } else {
        break;
      }
    }

    const isLastBatch = cursorRow === rowBounds.length;
    const batchBottom = rowBounds[cursorRow - 1].bottom;
    const fitsWithTail =
      isLastBatch && cssHeight - baseTop <= maxContRowsCssH;

    pages.push({
      includeHeaderBand: true,
      startRowIdx: firstIdx,
      endRowIdx: cursorRow,
      includeTailToBottom: fitsWithTail,
    });

    // Edge case: rows reached the bottom edge so footer needs its own clean trailing tail
    if (isLastBatch && !fitsWithTail && tfootHeightCss > 0) {
      pages.push({
        includeHeaderBand: true,
        startRowIdx: rowBounds.length,
        endRowIdx: rowBounds.length,
        includeTailToBottom: true,
      });
    }
    void batchBottom;
  }

  const totalPages = pages.length;

  pages.forEach((plan, pageIdx) => {
    if (pageIdx > 0) {
      pdf.addPage('a4', 'landscape');
    }

    let currentYmm = marginTop;

    if (!plan.includeHeaderBand) {
      // Page 1: render continuous slice from top (0) down to either cssHeight or last row bottom
      const endCss = plan.includeTailToBottom
        ? cssHeight
        : rowBounds[plan.endRowIdx - 1].bottom;
      const sliceUrl = sliceCanvasToDataUrl(fullCanvas, 0, endCss * canvasScale);
      const sliceHmm = endCss * pxToMm;
      pdf.addImage(sliceUrl, 'PNG', marginX, currentYmm, contentW, sliceHmm, undefined, 'FAST');

      // Subtle closing border if table continues onto next page
      if (!plan.includeTailToBottom) {
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.25);
        pdf.line(marginX, currentYmm + sliceHmm, marginX + contentW, currentYmm + sliceHmm);
      }
    } else {
      // Continuation page: repeat crisp <thead> first
      if (theadEl && theadHeightCss > 0) {
        const theadUrl = sliceCanvasToDataUrl(
          fullCanvas,
          theadTop * canvasScale,
          theadHeightCss * canvasScale,
        );
        const theadHmm = theadHeightCss * pxToMm;
        // Top border above repeated table header
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.25);
        pdf.line(marginX, currentYmm, marginX + contentW, currentYmm);
        pdf.addImage(theadUrl, 'PNG', marginX, currentYmm, contentW, theadHmm, undefined, 'FAST');
        currentYmm += theadHmm;
      }

      if (plan.startRowIdx < plan.endRowIdx) {
        const startCss = rowBounds[plan.startRowIdx].top;
        const endCss = plan.includeTailToBottom
          ? cssHeight
          : rowBounds[plan.endRowIdx - 1].bottom;
        const sliceCssH = Math.max(1, endCss - startCss);
        const bodyUrl = sliceCanvasToDataUrl(
          fullCanvas,
          startCss * canvasScale,
          sliceCssH * canvasScale,
        );
        const bodyHmm = sliceCssH * pxToMm;
        pdf.addImage(bodyUrl, 'PNG', marginX, currentYmm, contentW, bodyHmm, undefined, 'FAST');

        if (!plan.includeTailToBottom) {
          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(0.25);
          pdf.line(marginX, currentYmm + bodyHmm, marginX + contentW, currentYmm + bodyHmm);
        }
      } else if (plan.includeTailToBottom && tfootEl) {
        // Standalone footer slice if rows filled the exact previous page
        const sliceCssH = Math.max(1, cssHeight - tfootTop);
        const footUrl = sliceCanvasToDataUrl(
          fullCanvas,
          tfootTop * canvasScale,
          sliceCssH * canvasScale,
        );
        pdf.addImage(
          footUrl,
          'PNG',
          marginX,
          currentYmm,
          contentW,
          sliceCssH * pxToMm,
          undefined,
          'FAST',
        );
      }
    }

    // Crisp page counter in footer margin
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Trang ${pageIdx + 1} / ${totalPages}`, pageW - marginX, pageH - 4.5, {
      align: 'right',
    });
  });

  pdf.save(filename);
}
