import { SpreadsheetData } from '../types/sheet';
import { DayConfig, extractDateFromSheet } from './dayDataProcessor';

/**
 * Trình phân tích cú pháp CSV chuẩn xử lý tốt dấu ngoặc kép, dấu phẩy, và ngắt dòng
 */
export function parseCsvToRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip CRLF
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Tải trực tiếp dữ liệu CSV từ link Google Sheets công khai (gviz endpoint)
 */
export async function fetchLiveSheetCsv(spreadsheetId: string, gid: string): Promise<string[][] | null> {
  // 1. Thử qua API proxy nội bộ trước (Tránh lỗi CORS trong trình duyệt người dùng)
  try {
    const proxyUrl = `/api/live-sheet?gid=${gid}&spreadsheetId=${spreadsheetId}&t=${Date.now()}`;
    const proxyRes = await fetch(proxyUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (proxyRes.ok) {
      const csvText = await proxyRes.text();
      if (csvText && csvText.length > 10) {
        return parseCsvToRows(csvText);
      }
    }
  } catch (proxyErr) {
    // Thử cách dự phòng nếu proxy không khả dụng
  }

  // 2. Dự phòng: Thử gọi trực tiếp Google Sheets endpoint
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}&t=${Date.now()}`;
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Accept': 'text/csv, text/plain, */*',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    if (res.ok) {
      const csvText = await res.text();
      if (csvText && csvText.length > 10) {
        return parseCsvToRows(csvText);
      }
    }
    return null;
  } catch (err) {
    console.warn(`Lỗi fetch live CSV GID ${gid}:`, err);
    return null;
  }
}

/**
 * Đồng bộ dữ liệu ngày hiện tại hoặc toàn bộ tuần trực tiếp từ link Google Sheets song song siêu tốc
 */
export async function syncLiveSheetsFromLink(
  currentData: SpreadsheetData,
  dayConfigs: DayConfig[],
  targetDayConfig?: DayConfig
): Promise<{ updatedData: SpreadsheetData; syncedCount: number }> {
  const spreadsheetId = currentData.spreadsheetId;
  const newSheets = { ...currentData.sheets };
  let syncedCount = 0;

  // Nếu chỉ định targetDayConfig thì ưu tiên đồng bộ ngày đó trước
  const daysToSync = targetDayConfig ? [targetDayConfig] : dayConfigs;

  // Thu thập tất cả các nhiệm vụ tải sheet cần đồng bộ
  const tasks: { gid: string; name: string }[] = [];
  for (const day of daysToSync) {
    if (day.chessGid) tasks.push({ gid: day.chessGid, name: `${day.name} - cờ` });
    if (day.artGid) tasks.push({ gid: day.artGid, name: `${day.name} - vẽ` });
  }

  // Tải đồng thời tất cả các sheet qua Promise.all để cực kỳ nhanh (dưới 1 giây)
  await Promise.all(
    tasks.map(async (task) => {
      try {
        const rows = await fetchLiveSheetCsv(spreadsheetId, task.gid);
        if (rows && rows.length > 0) {
          newSheets[task.gid] = {
            ...newSheets[task.gid],
            gid: task.gid,
            name: newSheets[task.gid]?.name || task.name,
            rows: rows,
            rowCount: rows.length,
            activeRowCount: rows.length,
            colCount: rows[0]?.length || 10
          };
          syncedCount++;
        }
      } catch (err) {
        console.warn(`Lỗi sync sheet GID ${task.gid}:`, err);
      }
    })
  );

  return {
    updatedData: {
      ...currentData,
      sheets: newSheets
    },
    syncedCount
  };
}
