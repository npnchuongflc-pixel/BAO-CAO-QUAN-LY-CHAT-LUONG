import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import Papa from 'papaparse';

dotenv.config();

const app = express();

const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION);
const isDevWorkspace = Boolean(process.env.DEFAULT_APP_PORT);
const PORT = process.env.DEFAULT_APP_PORT
  ? parseInt(process.env.DEFAULT_APP_PORT, 10)
  : (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

app.use(express.json({ limit: '10mb' }));

// Lazy initialize Gemini API client
let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the environment');
    }
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Zalo OA Report Backend', timestamp: new Date().toISOString() });
});

// Cache for Google Sheet data
// Cache for Proposals Sheet data (gid=169229004)
let cachedProposalData: any = null;
let lastProposalCacheTime = 0;

// Google Sheets Proxy API - Proposals & Facility Repair (gid=169229004)
app.get('/api/proposals-sheet', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const now = Date.now();
    if (!force && cachedProposalData && (now - lastProposalCacheTime < CACHE_TTL_MS)) {
      return res.json({ success: true, table: cachedProposalData.table, cached: true });
    }

    const sheetId = '1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY';
    const gid = '169229004';
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;

    const response = await fetch(targetUrl);
    if (!response.ok) {
      if (cachedProposalData) {
        return res.json({ success: true, table: cachedProposalData.table, cached: true, warning: 'Stale cache' });
      }
      return res.status(502).json({ success: false, error: 'Google Sheet returned ' + response.status });
    }

    const text = await response.text();
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr);

    cachedProposalData = parsed;
    lastProposalCacheTime = now;

    res.json({ success: true, table: parsed.table, cached: false });
  } catch (err: any) {
    if (cachedProposalData) {
      return res.json({ success: true, table: cachedProposalData.table, cached: true });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

let cachedSheetData: any = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

// Cache for Teaching Quality Sheet data (gid=282336280)
let cachedTeachingData: any = null;
let lastTeachingCacheTime = 0;

// Cache for Incident Resolution Sheet data (gid=206722729)
let cachedIncidentData: any = null;
let lastIncidentCacheTime = 0;

// Cache for the complete Facility Hygiene / Quality CSV exports.
const facilitySheetCache = new Map<string, { csv: string; cachedAt: number }>();

// Google Sheets Proxy API - Customer Feedback (Tab Zalo đánh giá)
app.get('/api/sheet-data', async (req, res) => {
  try {
    const now = Date.now();
    if (cachedSheetData && (now - lastCacheTime < CACHE_TTL_MS)) {
      return res.json({ success: true, data: cachedSheetData, cached: true });
    }

    const sheetId = '1If65m8-kv10fLlu9DSgvDJCJEpPBdGrieZ7tJ9aXgmo';
    const sheetName = encodeURIComponent('Zalo đánh giá');
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${sheetName}&tqx=out:json&tq=select%20A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P`;

    const response = await fetch(targetUrl);
    const text = await response.text();
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr);

    cachedSheetData = parsed;
    lastCacheTime = now;

    res.json({ success: true, data: parsed, cached: false });
  } catch (err: any) {
    console.error('Error fetching sheet data:', err);
    if (cachedSheetData) {
      return res.json({ success: true, data: cachedSheetData, cached: true, warning: 'Using stale cache' });
    }
    res.status(500).json({ success: false, error: err.message || 'Không thể tải Google Sheets' });
  }
});

// Google Sheets Proxy API - Teaching Quality Monitoring (gid=282336280 or sheet name)
app.get('/api/teaching-sheet-data', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const now = Date.now();
    if (!force && cachedTeachingData && (now - lastTeachingCacheTime < CACHE_TTL_MS)) {
      return res.json({ success: true, data: cachedTeachingData, cached: true });
    }

    const sheetId = '1If65m8-kv10fLlu9DSgvDJCJEpPBdGrieZ7tJ9aXgmo';
    const gid = '282336280';
    // Use the official Google Visualization JSON endpoint for fast loading and 100% consistency with Looker Studio
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?gid=${gid}&tqx=out:json`;
    const response = await fetch(targetUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Google Sheets GViz responded with HTTP ${response.status}`);
    }

    const text = await response.text();
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr);

    cachedTeachingData = { table: parsed.table };
    lastTeachingCacheTime = now;

    res.json({ success: true, data: cachedTeachingData, cached: false });
  } catch (err: any) {
    console.error('Error fetching teaching sheet data:', err);
    if (cachedTeachingData) {
      return res.json({ success: true, data: cachedTeachingData, cached: true, warning: 'Using stale cache' });
    }
    res.status(500).json({ success: false, error: err.message || 'Không thể tải Google Sheets Giám Sát Giảng Dạy' });
  }
});

// Google Sheets Proxy API - Incident Resolution (gid=206722729)
app.get('/api/incident-data', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const now = Date.now();
    if (!force && cachedIncidentData && (now - lastIncidentCacheTime < CACHE_TTL_MS)) {
      return res.json({ success: true, data: cachedIncidentData, cached: true });
    }

    const sheetId = '1If65m8-kv10fLlu9DSgvDJCJEpPBdGrieZ7tJ9aXgmo';
    const gid = '206722729';
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?gid=${gid}&tqx=out:json`;
    const response = await fetch(targetUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Google Sheets GViz responded with HTTP ${response.status}`);
    }

    const text = await response.text();
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr);

    cachedIncidentData = { table: parsed.table };
    lastIncidentCacheTime = now;

    res.json({ success: true, data: cachedIncidentData, cached: false });
  } catch (err: any) {
    console.error('Error fetching incident sheet data:', err);
    if (cachedIncidentData) {
      return res.json({ success: true, data: cachedIncidentData, cached: true, warning: 'Using stale cache' });
    }
    res.status(500).json({ success: false, error: err.message || 'Không thể tải Google Sheets Xử Lý Đánh Giá Ít Sao' });
  }
});

// Complete Google Sheets export for Facility Hygiene / Quality reports.
// Only known sheet tabs are allowed, preventing arbitrary external fetches.
app.get('/api/facility-sheet-data', async (req, res) => {
  try {
    const sheetId = '1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY';
    const allowedGids = new Set(['0', '33769956', '1163313960']);
    const gid = String(req.query.gid || '');
    const force = req.query.force === 'true';

    if (!allowedGids.has(gid)) {
      return res.status(400).json({ success: false, error: 'Google Sheet tab không hợp lệ' });
    }

    const cached = facilitySheetCache.get(gid);
    if (!force && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return res.json({ success: true, data: { csv: cached.csv }, cached: true });
    }

    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(targetUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Google Sheets CSV responded with HTTP ${response.status}`);
    }

    const csv = await response.text();
    if (!csv || csv.includes('<!DOCTYPE html>')) {
      throw new Error('Google Sheets CSV không khả dụng hoặc cần quyền truy cập');
    }

    facilitySheetCache.set(gid, { csv, cachedAt: Date.now() });
    res.json({ success: true, data: { csv }, cached: false });
  } catch (err: any) {
    const gid = String(req.query.gid || '');
    const cached = facilitySheetCache.get(gid);
    if (cached) {
      return res.json({
        success: true,
        data: { csv: cached.csv },
        cached: true,
        warning: 'Using stale cache',
      });
    }
    res.status(500).json({
      success: false,
      error: err.message || 'Không thể tải dữ liệu Giám sát Vệ sinh',
    });
  }
});

// Cache for Warning Reminders Sheet ("nhắc nhở" tab)
let cachedWarningRemindersCsv = '';
let lastWarningRemindersCacheTime = 0;

app.get('/api/warning-reminders-data', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const now = Date.now();
    if (!force && cachedWarningRemindersCsv && (now - lastWarningRemindersCacheTime < 30_000)) {
      return res.json({ success: true, data: { csv: cachedWarningRemindersCsv }, cached: true });
    }

    const sheetId = '1003lfdUh6S_Tkg5H4qChw7KrziAon1uvgkoFMj9FK0E';
    const gid = '1091093608';
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(targetUrl, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      throw new Error(`Google Sheets CSV responded with HTTP ${response.status}`);
    }

    const csv = await response.text();
    if (!csv || csv.includes('<!DOCTYPE html>') || csv.includes('accounts.google.com')) {
      throw new Error('Google Sheets CSV không khả dụng hoặc cần quyền truy cập');
    }

    cachedWarningRemindersCsv = csv;
    lastWarningRemindersCacheTime = now;
    res.json({ success: true, data: { csv }, cached: false });
  } catch (err: any) {
    if (cachedWarningRemindersCsv) {
      return res.json({ success: true, data: { csv: cachedWarningRemindersCsv }, cached: true, warning: 'Stale cache' });
    }
    res.status(500).json({ success: false, error: err.message || 'Không thể tải dữ liệu sheet nhắc nhở' });
  }
});

// ============================================================================
// Classroom Report APIs (BAO-CAO-LOP-HOC)
// Spreadsheet ID: 1wmBYcZCjOCWWvcv2mxeATVxphawbpkUaPIRICj3XgsE
// ============================================================================
const CLASSROOM_SPREADSHEET_ID = '1wmBYcZCjOCWWvcv2mxeATVxphawbpkUaPIRICj3XgsE';

app.get('/api/all-sheets', (req, res) => {
  const jsonPath = path.resolve(process.cwd(), 'public/data/all_sheets.json');
  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return res.sendFile(jsonPath);
});

app.get('/api/live-sheet', async (req, res) => {
  const gid = req.query.gid as string;
  const spreadsheetId = (req.query.spreadsheetId as string) || CLASSROOM_SPREADSHEET_ID;
  if (!gid) {
    return res.status(400).json({ error: 'Missing gid parameter' });
  }
  try {
    const targetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}&t=${Date.now()}`;
    const response = await fetch(targetUrl, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    if (!response.ok) {
      throw new Error(`Google Sheet returned HTTP ${response.status}`);
    }
    const csvData = await response.text();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.send(csvData);
  } catch (err: any) {
    console.error(`Lỗi tải live sheet GID ${gid}:`, err.message);
    return res.status(502).json({ error: err.message });
  }
});

app.all('/api/sync-all', async (req, res) => {
  const jsonPath = path.resolve(process.cwd(), 'public/data/all_sheets.json');
  try {
    if (!fs.existsSync(jsonPath)) {
      return res.status(404).json({ error: 'Data file not found' });
    }
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(raw);
    const gids = Object.keys(data.sheets || {});
    await Promise.all(
      gids.map(async (gid) => {
        try {
          const targetUrl = `https://docs.google.com/spreadsheets/d/${CLASSROOM_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}&t=${Date.now()}`;
          const response = await fetch(targetUrl, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'User-Agent': 'Mozilla/5.0'
            }
          });
          if (response.ok) {
            const csv = await response.text();
            if (csv && csv.length > 20) {
              const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: true });
              if (parsed.data && parsed.data.length > 0) {
                data.sheets[gid].rows = parsed.data;
              }
            }
          }
        } catch (e: any) {
          console.warn(`Lỗi sync gid ${gid}:`, e.message);
        }
      })
    );
    data.exportedAt = new Date().toISOString();
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.json(data);
  } catch (err: any) {
    console.error('Lỗi sync-all:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// AI Insights API using Gemini 3.7 Flash
app.post('/api/ai-insights', async (req, res) => {
  try {
    const { metricsData, prompt, question, mode } = req.body;
    const ai = getGeminiClient();

    let systemInstruction = `Bạn là Trưởng ban Giám sát & Quản lý Chất lượng Giáo dục hàng đầu tại Hệ thống Đào tạo Cờ Vua & Mỹ Thuật Sài Gòn.
Nhiệm vụ của bạn là phân tích các chỉ số đánh giá chất lượng giảng dạy từ camera / dự giờ, tỷ lệ tuân thủ 6 tiêu chí (Đồng phục/Tác phong, 15 phút đầu giờ, Quản lý lớp học, Giao ca, Thiết bị điện tử, Kết ca), phân tích cơ cấu lỗi vi phạm theo cơ sở, môn học và bậc giáo viên.
Đưa ra nhận xét sâu sắc, phát hiện các điểm nghẽn nghiêm trọng, nguyên nhân gốc rễ (Root Cause) và khuyến nghị các giải pháp hành động PDCA (Plan - Do - Check - Act) thiết thực, chi tiết bằng tiếng Việt chuẩn mực, chuyên nghiệp.
Trình bày rõ ràng với số liệu minh chứng, định dạng Markdown đẹp mắt, phân mục rành mạch.`;

    if (mode === 'customer_feedback') {
      systemInstruction = `Bạn là Chuyên gia Quản lý Trải nghiệm Khách hàng & Chất lượng Dịch vụ (CSAT/NPS) tại Hệ thống Đào tạo Cờ Vua & Mỹ Thuật.
Nhiệm vụ của bạn là phân tích dữ liệu phản hồi, đánh giá sao của phụ huynh học sinh qua kênh Zalo, phân tích điểm mạnh và điểm cần cải thiện của từng cơ sở và bộ môn, đề xuất các giải pháp nâng cao sự hài lòng của phụ huynh.`;
    }

    const userMessage = question 
      ? `Dựa trên dữ liệu giám sát sau đây:\n${JSON.stringify(metricsData, null, 2)}\n\nHãy trả lời câu hỏi của Quản lý Chất lượng:\n"${question}"`
      : `Dựa trên dữ liệu tổng hợp sau đây:\n${JSON.stringify(metricsData, null, 2)}\n\n${prompt || 'Hãy phân tích tổng quan chất lượng giảng dạy, chỉ ra 3 điểm sáng, 3 điểm vi phạm phổ biến cần khắc phục ngay, và kế hoạch đào tạo/hành động khắc phục trong 14 ngày tới.'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.6,
      }
    });

    res.json({
      success: true,
      analysis: response.text,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error generating AI insights:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi xử lý phân tích AI'
    });
  }
});

// In-memory store for Facility Image Reviews (Mocking Netlify Blobs)
interface ImageReviewRecord {
  id: string;
  reportId: string;
  rowIndex?: number;
  ngay: string;
  gio: string;
  coSo: string;
  khuVuc: string;
  linkAnh: string;
  nguoiBaoCao: string;
  reviewed: boolean;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  trangThaiKiemDuyet: string;
  nguoiKiemDuyet: string;
  thoiGianKiemDuyet: string;
  updatedAt?: string;
  syncedToSheet?: boolean;
  syncError?: string;
}

const imageReviewStore = new Map<string, ImageReviewRecord>();
let cachedHygieneReviewSheetCsv = '';
let lastHygieneReviewSheetCacheTime = 0;

app.get('/api/image-reviews', (req, res) => {
  const date = String(req.query.date || '').trim();
  const returnAll = req.query.all === '1' || !date || date === 'all';
  if (!returnAll && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, error: 'Ngày tra cứu không hợp lệ.' });
  }
  const prefix = `reviews/${date}/`;
  const records: ImageReviewRecord[] = [];
  for (const [key, val] of imageReviewStore.entries()) {
    if (returnAll || key.startsWith(prefix)) {
      records.push(val);
    }
  }
  records.sort((a, b) => String(b.ngay || '').localeCompare(String(a.ngay || '')) || String(a.coSo).localeCompare(String(b.coSo), 'vi'));
  res.json({ success: true, date: returnAll ? 'all' : date, records, count: records.length });
});

app.get('/api/hygiene-review-sheet-data', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const now = Date.now();
    if (!force && cachedHygieneReviewSheetCsv && (now - lastHygieneReviewSheetCacheTime < 30_000)) {
      return res.json({ success: true, data: { csv: cachedHygieneReviewSheetCsv }, cached: true });
    }

    const sheetId = '1003lfdUh6S_Tkg5H4qChw7KrziAon1uvgkoFMj9FK0E';
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
    const response = await fetch(targetUrl, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      throw new Error(`Google Sheets CSV responded with HTTP ${response.status}`);
    }

    const csv = await response.text();
    if (!csv || csv.includes('<!DOCTYPE html>') || csv.includes('accounts.google.com')) {
      throw new Error('Google Sheets CSV không khả dụng hoặc cần quyền truy cập');
    }

    cachedHygieneReviewSheetCsv = csv;
    lastHygieneReviewSheetCacheTime = now;
    res.json({ success: true, data: { csv }, cached: false });
  } catch (err: any) {
    if (cachedHygieneReviewSheetCsv) {
      return res.json({ success: true, data: { csv: cachedHygieneReviewSheetCsv }, cached: true, warning: 'Stale cache' });
    }
    res.status(500).json({ success: false, error: err.message || 'Không thể tải dữ liệu kiểm duyệt ảnh từ Google Sheet' });
  }
});

// Automated Daily Sync Engine & Store
const DEFAULT_NEW_SHEET_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwM1RqSb0F1rZnMetAXarUlaW2J0SmZQQyfkkU-Puk6sz8vhYaIuYY1TfDAtheG1LFI/exec';
let configuredNewSheetScriptUrl = process.env.NEW_SHEET_APPS_SCRIPT_URL || DEFAULT_NEW_SHEET_APPS_SCRIPT_URL;

app.post('/api/image-reviews', async (req, res) => {
  try {
    const payload = req.body;
    const targetScriptUrl = (payload?.scriptUrl || configuredNewSheetScriptUrl || process.env.NEW_SHEET_APPS_SCRIPT_URL || process.env.WARNING_APPS_SCRIPT_URL || DEFAULT_NEW_SHEET_APPS_SCRIPT_URL).trim();

    if (payload?.action === 'batch_upsert') {
      const inputRecords: any[] = Array.isArray(payload.records) ? payload.records : [];
      const savedList: ImageReviewRecord[] = [];
      const updatesForSheet: any[] = [];
      const now = new Date().toISOString();

      for (const rec of inputRecords) {
        const id = typeof rec?.id === 'string' ? rec.id.trim().slice(0, 240) : '';
        const date = rec?.ngay;
        const facility = typeof rec?.coSo === 'string' ? rec.coSo.trim().slice(0, 160) : '';
        const imageUrl = typeof rec?.linkAnh === 'string' ? rec.linkAnh.trim().slice(0, 3000) : '';
        const reviewer = typeof rec?.nguoiKiemDuyet === 'string' ? rec.nguoiKiemDuyet.trim().slice(0, 160) : '';
        const reviewStatus = rec?.reviewStatus || 'pending';

        if (!id || !date || !facility) continue;

        const revTime = rec.thoiGianKiemDuyet ? new Date(rec.thoiGianKiemDuyet).toLocaleString('vi-VN') : '';
        const revNote = reviewer ? (revTime ? `${reviewer} (${revTime})` : reviewer) : '';

        const saved: ImageReviewRecord = {
          id,
          reportId: rec.reportId || '',
          rowIndex: rec.rowIndex,
          ngay: date,
          gio: rec.gio || '',
          coSo: facility,
          khuVuc: rec.khuVuc || '',
          linkAnh: imageUrl,
          nguoiBaoCao: rec.nguoiBaoCao || '',
          reviewed: reviewStatus === 'approved',
          reviewStatus,
          trangThaiKiemDuyet: reviewStatus === 'approved' ? 'Đã duyệt' : reviewStatus === 'rejected' ? 'Lỗi AI' : 'Chưa duyệt',
          nguoiKiemDuyet: reviewer,
          thoiGianKiemDuyet: rec.thoiGianKiemDuyet || now,
          updatedAt: now,
          syncedToSheet: true,
        };
        imageReviewStore.set(`reviews/${date}/${encodeURIComponent(id)}`, saved);
        savedList.push(saved);

        updatesForSheet.push({
          linkAnh: imageUrl,
          ngay: date,
          gio: rec.gio || '',
          coSo: facility,
          khuVuc: rec.khuVuc || '',
          daDuyet: reviewStatus === 'approved' ? (revNote || reviewer || 'Đã duyệt') : '',
          khongDat: reviewStatus === 'rejected' ? (revNote || reviewer || 'Lỗi AI') : '',
          loiAi: reviewStatus === 'rejected' ? (revNote || reviewer || 'Lỗi AI') : '',
          reviewStatus,
          reviewer,
        });
      }

      let syncWarning = '';
      if (!payload?.skipSheetSync && targetScriptUrl && updatesForSheet.length > 0) {
        try {
          const syncResp = await fetch(targetScriptUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              action: 'batch_update_image_reviews',
              updates: updatesForSheet,
            }),
            signal: AbortSignal.timeout(20000),
          });
          const syncJson: any = await syncResp.json().catch(() => null);
          if (!syncResp.ok || (!syncJson?.success && syncJson?.status !== 'ok')) {
            syncWarning = syncJson?.error || `Google Sheet API HTTP ${syncResp.status}`;
          }
        } catch (err: any) {
          syncWarning = err.message || 'Lỗi kết nối Google Sheet';
        }
      }

      lastHygieneReviewSheetCacheTime = 0;
      return res.json({ success: true, records: savedList, warning: syncWarning || undefined });
    }

    if (payload?.action !== 'upsert') {
      return res.status(400).json({ success: false, error: 'Thao tác không hợp lệ.' });
    }

    const record = payload.record;
    const id = typeof record?.id === 'string' ? record.id.trim().slice(0, 240) : '';
    const date = record?.ngay;
    const facility = typeof record?.coSo === 'string' ? record.coSo.trim().slice(0, 160) : '';
    const imageUrl = typeof record?.linkAnh === 'string' ? record.linkAnh.trim().slice(0, 3000) : '';
    const reviewer = typeof record?.nguoiKiemDuyet === 'string' ? record.nguoiKiemDuyet.trim().slice(0, 160) : '';
    const reviewStatus = record?.reviewStatus || (record?.reviewed === true ? 'approved' : 'pending');
    const reviewed = reviewStatus === 'approved';

    if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !facility || !imageUrl.startsWith('http')) {
      return res.status(400).json({ success: false, error: 'Dữ liệu kiểm duyệt ảnh không hợp lệ.' });
    }
    if (!['pending', 'approved', 'rejected'].includes(reviewStatus)) {
      return res.status(400).json({ success: false, error: 'Trạng thái kiểm duyệt ảnh không hợp lệ.' });
    }
    if (reviewStatus !== 'pending' && !reviewer) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập tên người kiểm duyệt.' });
    }

    const rowIndex = typeof record?.rowIndex === 'number' ? record.rowIndex : undefined;
    const now = new Date().toISOString();
    const revTime = record?.thoiGianKiemDuyet ? new Date(record.thoiGianKiemDuyet).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');
    const revNote = reviewer ? `${reviewer} (${revTime})` : '';

    const savedRecord: ImageReviewRecord = {
      id,
      reportId: record.reportId || '',
      rowIndex,
      ngay: date,
      gio: record.gio || '',
      coSo: facility,
      khuVuc: record.khuVuc || '',
      linkAnh: imageUrl,
      nguoiBaoCao: record.nguoiBaoCao || '',
      reviewed,
      reviewStatus,
      trangThaiKiemDuyet: reviewStatus === 'approved' ? 'Đã duyệt' : reviewStatus === 'rejected' ? 'Lỗi AI' : 'Chưa duyệt',
      nguoiKiemDuyet: reviewer,
      thoiGianKiemDuyet: record.thoiGianKiemDuyet || now,
      updatedAt: now,
      syncedToSheet: true,
    };

    let syncWarning = '';
    if (!payload?.skipSheetSync && targetScriptUrl) {
      try {
        const syncResp = await fetch(targetScriptUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'upsert_image_review',
            record: savedRecord,
            rowIndex: savedRecord.rowIndex,
            linkAnh: savedRecord.linkAnh,
            ngay: savedRecord.ngay,
            gio: savedRecord.gio,
            coSo: savedRecord.coSo,
            khuVuc: savedRecord.khuVuc,
            reviewStatus: savedRecord.reviewStatus,
            reviewer: savedRecord.nguoiKiemDuyet,
            // Column 12 (Đã duyệt) and Column 13 (Lỗi AI)
            daDuyet: savedRecord.reviewStatus === 'approved' ? (revNote || savedRecord.nguoiKiemDuyet || 'Đã duyệt') : '',
            khongDat: savedRecord.reviewStatus === 'rejected' ? (revNote || savedRecord.nguoiKiemDuyet || 'Lỗi AI') : '',
            loiAi: savedRecord.reviewStatus === 'rejected' ? (revNote || savedRecord.nguoiKiemDuyet || 'Lỗi AI') : '',
          }),
          signal: AbortSignal.timeout(15000),
        });
        const syncJson: any = await syncResp.json().catch(() => null);
        if (syncResp.ok && (syncJson?.success || syncJson?.status === 'ok')) {
          savedRecord.syncedToSheet = true;
        } else {
          syncWarning = syncJson?.error || `Google Sheet API HTTP ${syncResp.status}`;
          savedRecord.syncError = syncWarning;
        }
      } catch (err: any) {
        syncWarning = err.message || 'Lỗi đồng bộ Google Sheet';
        savedRecord.syncError = syncWarning;
      }
    } else {
      savedRecord.syncedToSheet = true;
      syncWarning = '';
    }

    imageReviewStore.set(`reviews/${date}/${encodeURIComponent(id)}`, savedRecord);
    lastHygieneReviewSheetCacheTime = 0;
    res.json({ success: true, record: savedRecord, warning: syncWarning || undefined });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Lỗi máy chủ' });
  }
});
interface AutoSyncLog {
  id: string;
  date: string;
  timestamp: string;
  count: number;
  status: 'success' | 'error';
  message: string;
}
const autoSyncLogs: AutoSyncLog[] = [];
let lastAutoSyncDate = '';

function getVietnamYesterdayDates(): { iso: string; dmy: string; dmyNoLeading: string } {
  // Current time in Vietnam (UTC+7)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vnNow = new Date(utc + 7 * 3600 * 1000);
  const vnYesterday = new Date(vnNow.getTime() - 24 * 3600 * 1000);

  const y = vnYesterday.getFullYear();
  const m = String(vnYesterday.getMonth() + 1).padStart(2, '0');
  const d = String(vnYesterday.getDate()).padStart(2, '0');
  const iso = `${y}-${m}-${d}`;
  const dmy = `${d}/${m}/${y}`;
  const dmyNoLeading = `${vnYesterday.getDate()}/${vnYesterday.getMonth() + 1}/${y}`;
  return { iso, dmy, dmyNoLeading };
}

async function runDailyHygieneSync(targetDateIso?: string, targetUrl?: string) {
  const dates = getVietnamYesterdayDates();
  const dateIso = targetDateIso || dates.iso;
  const scriptUrl = (targetUrl || configuredNewSheetScriptUrl || process.env.NEW_SHEET_APPS_SCRIPT_URL || process.env.WARNING_APPS_SCRIPT_URL || '').trim();

  if (!scriptUrl) {
    const errorMsg = 'Chưa cấu hình đường dẫn Web App Google Apps Script của Sheet Mới';
    autoSyncLogs.unshift({
      id: `log-${Date.now()}`,
      date: dateIso,
      timestamp: new Date().toISOString(),
      count: 0,
      status: 'error',
      message: errorMsg,
    });
    return { success: false, error: errorMsg };
  }

  try {
    // 1. Fetch source sheet CSV (gid=0: Kiểm tra vệ sinh)
    const sourceUrl = 'https://docs.google.com/spreadsheets/d/1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY/export?format=csv&gid=0';
    const resp = await fetch(sourceUrl, { cache: 'no-store' });
    if (!resp.ok) {
      throw new Error(`Không thể tải dữ liệu Sheet gốc: HTTP ${resp.status}`);
    }
    const csvText = await resp.text();
    const parsed = Papa.parse<any>(csvText, { header: true, skipEmptyLines: true });
    const rows = parsed.data || [];

    const getClean = (row: any, keys: string[]) => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return String(row[k]).trim();
      }
      for (const col of Object.keys(row)) {
        const norm = col.trim().toLowerCase();
        for (const k of keys) {
          if (norm === k.trim().toLowerCase()) return String(row[col] || '').trim();
        }
      }
      return '';
    };

    const parseScore100 = (raw: string): number | null => {
      const s = String(raw || '').trim().replace(',', '.');
      if (!s) return null;
      const slashMatch = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(s);
      if (slashMatch) {
        const num = Number(slashMatch[1]);
        const max = Number(slashMatch[2]);
        if (!Number.isFinite(num) || !Number.isFinite(max) || max <= 0) return null;
        return max <= 10 ? num * 10 : num;
      }
      const numMatch = /(\d+(?:\.\d+)?)/.exec(s);
      if (!numMatch) return null;
      const num = Number(numMatch[1]);
      if (!Number.isFinite(num)) return null;
      return num > 0 && num <= 10 ? num * 10 : num;
    };

    // Filter rows for target date (chỉ lấy các ảnh điểm thấp < 80đ để kiểm duyệt và ghi lại)
    const matchedRecords: any[] = [];
    let totalDateRows = 0;
    rows.forEach((row: any, idx: number) => {
      const rawDate = getClean(row, ['Ngày', 'NGÀY', 'Date']) || '';
      let rowDateIso = '';
      if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        rowDateIso = rawDate.slice(0, 10);
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(rawDate)) {
        const parts = rawDate.split('/');
        const day = parts[0].padStart(2, '0');
        const mon = parts[1].padStart(2, '0');
        rowDateIso = `${parts[2]}-${mon}-${day}`;
      }

      const matchDate = rowDateIso === dateIso || rawDate === dates.dmy || rawDate === dates.dmyNoLeading || rawDate.startsWith(dateIso);
      if (!matchDate) {
        return;
      }
      totalDateRows += 1;

      const gio = getClean(row, ['Giờ', 'GIỜ', 'Time']) || '';
      const nguoiKiemTra = getClean(row, ['Người kiểm tra', 'NGƯỜI KIỂM TRA', 'Inspector']) || '';
      const coSo = getClean(row, ['Cơ sở', 'CƠ SỞ', 'Facility']) || '';
      const khuVuc = getClean(row, ['Khu vực', 'KHU VỰC', 'Area']) || '';
      const trangThai = getClean(row, ['Trạng thái', 'TRẠNG THÁI', 'Status']) || 'Đạt';
      const diemSo = getClean(row, ['Điểm số', 'Điểm', 'ĐIỂM SỐ', 'Score']) || '';
      const chiTiet = getClean(row, ['Chi tiết', 'CHI TIẾT', 'Detail']) || '';
      const phanHoi = getClean(row, ['Phản hồi', 'PHẢN HỒI', 'Response']) || '';
      const feedbackNguoiDung = getClean(row, ['Feedback từ người dùng', 'FEEDBACK TỪ NGƯỜI DÙNG', 'Feedback']) || '';
      const linkAnh = getClean(row, ['Link ảnh', 'LINK ẢNH', 'Image']) || '';
      let daDuyet = getClean(row, ['Đã duyệt', 'ĐÃ DUYỆT', 'Approved', 'Đã Duyệt', 'Đạt']) || '';
      let khongDat = getClean(row, ['Lỗi AI', 'LỖI AI', 'Không đạt', 'KHÔNG ĐẠT', 'Rejected', 'Không Đạt']) || '';

      const hasValidImage = Boolean(linkAnh) && !linkAnh.includes('images.unsplash.com/photo-1581578731548-c64695cc6952');
      const score100 = parseScore100(diemSo);
      if (!hasValidImage || score100 === null || score100 >= 80) {
        return;
      }

      // Check review store in memory
      const reviewKey = `reviews/${dateIso}/${encodeURIComponent(`sheet-hyg-${idx + 1}`)}`;
      const savedReview = imageReviewStore.get(reviewKey);
      if (savedReview) {
        const revTime = savedReview.thoiGianKiemDuyet ? new Date(savedReview.thoiGianKiemDuyet).toLocaleString('vi-VN') : '';
        const revNote = savedReview.nguoiKiemDuyet ? (revTime ? `${savedReview.nguoiKiemDuyet} (${revTime})` : savedReview.nguoiKiemDuyet) : '';
        if (savedReview.reviewStatus === 'approved') {
          daDuyet = revNote || 'Đã duyệt';
          khongDat = '';
        } else if (savedReview.reviewStatus === 'rejected') {
          khongDat = revNote || 'Lỗi AI';
          daDuyet = '';
        }
      }

      matchedRecords.push({
        ngay: rawDate || dateIso,
        gio,
        nguoiKiemTra,
        coSo,
        khuVuc,
        trangThai,
        diemSo,
        chiTiet,
        phanHoi,
        feedbackNguoiDung,
        linkAnh,
        daDuyet,
        khongDat,
      });
    });

    if (totalDateRows === 0) {
      const msg = `Không tìm thấy bản ghi vệ sinh nào trong ngày ${dateIso} từ Sheet gốc.`;
      autoSyncLogs.unshift({
        id: `log-${Date.now()}`,
        date: dateIso,
        timestamp: new Date().toISOString(),
        count: 0,
        status: 'error',
        message: msg,
      });
      return { success: false, error: msg, count: 0 };
    }

    // 2. Post to Apps Script (chỉ ghi các ảnh điểm thấp < 80đ; nếu ngày đó không có ảnh < 80đ thì làm sạch các dòng cũ của ngày đó)
    const syncResp = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync_full_day_hygiene_reviews',
        date: dateIso,
        count: matchedRecords.length,
        records: matchedRecords,
        onlyLowScore: true,
        allowEmptyReplace: true,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(30000),
    });

    const syncJson: any = await syncResp.json().catch(() => null);
    if (syncResp.ok && (syncJson?.success || syncJson?.status === 'ok')) {
      const successMsg = matchedRecords.length > 0
        ? `Đã tự động đổ ${matchedRecords.length} ảnh điểm thấp (<80đ) ngày ${dateIso} sang Sheet Mới thành công!`
        : `Ngày ${dateIso} không có ảnh điểm thấp (<80đ); đã đồng bộ gọn Sheet Mới.`;
      autoSyncLogs.unshift({
        id: `log-${Date.now()}`,
        date: dateIso,
        timestamp: new Date().toISOString(),
        count: matchedRecords.length,
        status: 'success',
        message: successMsg,
      });
      if (autoSyncLogs.length > 50) autoSyncLogs.pop();
      return { success: true, message: successMsg, count: matchedRecords.length };
    } else {
      const errDetail = syncJson?.error || `Google Apps Script HTTP ${syncResp.status}`;
      autoSyncLogs.unshift({
        id: `log-${Date.now()}`,
        date: dateIso,
        timestamp: new Date().toISOString(),
        count: matchedRecords.length,
        status: 'error',
        message: errDetail,
      });
      return { success: false, error: errDetail };
    }
  } catch (err: any) {
    const errDetail = err.message || 'Lỗi kết nối';
    autoSyncLogs.unshift({
      id: `log-${Date.now()}`,
      date: dateIso,
      timestamp: new Date().toISOString(),
      count: 0,
      status: 'error',
      message: errDetail,
    });
    return { success: false, error: errDetail };
  }
}

// Background daily sync interval (checks every 15 minutes)
setInterval(async () => {
  try {
    const dates = getVietnamYesterdayDates();
    if (lastAutoSyncDate !== dates.iso) {
      const scriptUrl = configuredNewSheetScriptUrl || process.env.NEW_SHEET_APPS_SCRIPT_URL || process.env.WARNING_APPS_SCRIPT_URL || DEFAULT_NEW_SHEET_APPS_SCRIPT_URL;
      if (scriptUrl) {
        console.log(`[Auto-Sync Scheduler] Bắt đầu tự động đổ dữ liệu ngày ${dates.iso} sang Sheet Mới...`);
        const result = await runDailyHygieneSync(dates.iso, scriptUrl);
        if (result.success) {
          lastAutoSyncDate = dates.iso;
          console.log(`[Auto-Sync Scheduler] Hoàn tất tự động đổ ngày ${dates.iso}:`, result.message);
        } else {
          console.warn(`[Auto-Sync Scheduler] Thử đổ ngày ${dates.iso} chưa thành công:`, result.error);
        }
      }
    }
  } catch (err) {
    console.error('[Auto-Sync Scheduler] Lỗi trong scheduler:', err);
  }
}, 15 * 60 * 1000);

// Khởi chạy tự động đổ dữ liệu ngay khi server khởi động (chờ 3s)
setTimeout(async () => {
  try {
    const dates = getVietnamYesterdayDates();
    const scriptUrl = configuredNewSheetScriptUrl || process.env.NEW_SHEET_APPS_SCRIPT_URL || process.env.WARNING_APPS_SCRIPT_URL || DEFAULT_NEW_SHEET_APPS_SCRIPT_URL;
    if (scriptUrl) {
      console.log(`[Auto-Sync Boot] Tự động kiểm tra và đổ dữ liệu ngày hôm trước ${dates.iso} sang Sheet Mới...`);
      const result = await runDailyHygieneSync(dates.iso, scriptUrl);
      if (result.success) {
        lastAutoSyncDate = dates.iso;
        console.log(`[Auto-Sync Boot] Thành công đổ ngày ${dates.iso}:`, result.message);
      }
    }
  } catch (err) {
    console.warn('[Auto-Sync Boot] Lỗi chạy tự động:', err);
  }
}, 3000);

// GET /api/auto-sync-status
app.get('/api/auto-sync-status', (req, res) => {
  const dates = getVietnamYesterdayDates();
  const effectiveUrl = configuredNewSheetScriptUrl || process.env.NEW_SHEET_APPS_SCRIPT_URL || process.env.WARNING_APPS_SCRIPT_URL || '';
  res.json({
    success: true,
    enabled: Boolean(effectiveUrl),
    configuredUrl: effectiveUrl ? (effectiveUrl.slice(0, 35) + '...') : '',
    hasFullUrl: Boolean(effectiveUrl),
    targetYesterdayDate: dates.iso,
    lastAutoSyncDate,
    recentLogs: autoSyncLogs.slice(0, 10),
    scheduleInfo: 'Tự động kiểm tra và đổ dữ liệu lúc 01:00 AM mỗi ngày (Giờ Việt Nam)',
  });
});

// POST /api/auto-sync-config
app.post('/api/auto-sync-config', (req, res) => {
  const { scriptUrl } = req.body;
  if (typeof scriptUrl === 'string') {
    configuredNewSheetScriptUrl = scriptUrl.trim();
  }
  res.json({
    success: true,
    configured: Boolean(configuredNewSheetScriptUrl),
    message: configuredNewSheetScriptUrl ? 'Đã lưu cấu hình tự động đổ dữ liệu hàng ngày' : 'Đã xóa cấu hình',
  });
});

// POST /api/trigger-daily-sync
app.post('/api/trigger-daily-sync', async (req, res) => {
  try {
    const { date, scriptUrl } = req.body;
    const dates = getVietnamYesterdayDates();
    const targetDate = date || dates.iso;
    const result = await runDailyHygieneSync(targetDate, scriptUrl);
    if (result.success) {
      lastAutoSyncDate = targetDate;
      return res.json({ success: true, message: result.message, count: result.count });
    } else {
      return res.status(400).json({ success: false, error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Lỗi kích hoạt tự động đổ dữ liệu' });
  }
});

// POST /api/sync-day-to-new-sheet
// Sync entire day of hygiene reports + 2 review columns (Đã duyệt, Không đạt) to a new Google Sheet
app.post('/api/sync-day-to-new-sheet', async (req, res) => {
  try {
    const { date, scriptUrl, records, allowEmptyReplace, onlyLowScore } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin ngày hoặc danh sách bản ghi.' });
    }

    const targetUrl = scriptUrl || configuredNewSheetScriptUrl || process.env.NEW_SHEET_APPS_SCRIPT_URL || process.env.WARNING_APPS_SCRIPT_URL || DEFAULT_NEW_SHEET_APPS_SCRIPT_URL;
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'Chưa cấu hình URL Google Apps Script của Sheet mới. Vui lòng dán link Web App của Sheet mới.',
      });
    }

    const syncResp = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync_full_day_hygiene_reviews',
        date,
        count: records.length,
        records,
        onlyLowScore: Boolean(onlyLowScore),
        allowEmptyReplace: Boolean(allowEmptyReplace),
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(30000),
    });

    const syncJson: any = await syncResp.json().catch(() => null);
    if (syncResp.ok && (syncJson?.success || syncJson?.status === 'ok')) {
      return res.json({
        success: true,
        message: syncJson?.message || `Đã ghi nhận thành công ${records.length} dòng sang Sheet mới.`,
        syncedCount: records.length,
      });
    } else {
      return res.status(502).json({
        success: false,
        error: syncJson?.error || `Lỗi phản hồi từ Google Apps Script (HTTP ${syncResp.status})`,
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Lỗi xử lý kết nối Google Sheet' });
  }
});

// POST /api/sync-warnings-to-sheet
// Sync warning facilities list to the "nhắc nhở" sheet tab in the Google Spreadsheet
app.post('/api/sync-warnings-to-sheet', async (req, res) => {
  try {
    const { date, scriptUrl, records } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin ngày hoặc danh sách bản ghi cảnh báo.' });
    }

    const targetUrl = scriptUrl || configuredNewSheetScriptUrl || process.env.NEW_SHEET_APPS_SCRIPT_URL || process.env.WARNING_APPS_SCRIPT_URL;
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'Chưa cấu hình URL Google Apps Script của Sheet mới.',
      });
    }

    const syncResp = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync_warnings',
        sheetName: 'nhắc nhở',
        date,
        count: records.length,
        records,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(30000),
    });

    const respText = await syncResp.text().catch(() => '');
    let syncJson: any = null;
    if (respText) {
      try {
        syncJson = JSON.parse(respText);
      } catch {
        if (respText.includes('Page not found') || respText.includes('unable to open the file') || respText.includes('accounts.google.com')) {
          return res.status(502).json({
            success: false,
            error: "Link Web App Google Apps Script chưa được cấp quyền công khai. Vui lòng vào Apps Script > 'Triển khai mới' > chọn 'Người có quyền truy cập' là 'Bất kỳ ai' (Anyone).",
          });
        }
      }
    }

    if (syncResp.ok && (syncJson?.success || syncJson?.status === 'ok')) {
      return res.json({
        success: true,
        message: syncJson?.message || `Đã đổ thành công ${records.length} cơ sở cảnh báo sang sheet "nhắc nhở"!`,
        syncedCount: records.length,
        totalRows: syncJson?.totalRows,
      });
    } else {
      return res.status(502).json({
        success: false,
        error: syncJson?.error || `Lỗi phản hồi từ Google Apps Script (HTTP ${syncResp.status})`,
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Lỗi xử lý kết nối Google Sheet' });
  }
});

// In-memory store for Facility Warning Audits (Mocking Netlify Blobs)
interface WarningAuditRecord {
  id: string;
  coSo: string;
  ngay: string;
  thoiGianTich: string;
  trangThai: string;
  loaiTrangThai: 'chua_xu_ly' | 'da_nhac_nho' | 'loi_app';
  lyDoCanhBao: string;
  soLuotCanhBao?: number;
  daNhacNho?: boolean;
  loiApp?: boolean;
  thoiGianPhatHien?: string;
  nguoiXuLy?: string;
  emailThucHien?: string;
  updatedAt?: string;
  syncedToSheet?: boolean;
  syncError?: string;
}

const warningAuditStore = new Map<string, WarningAuditRecord>();

const getWarningKey = (date: string, facility: string) => `audits/${date}/${encodeURIComponent(facility.normalize('NFC'))}`;

function buildWarningRecord(record: any, previousRecord?: WarningAuditRecord | null, preferredStatus?: string): WarningAuditRecord {
  const now = new Date().toISOString();
  const rawStatus = preferredStatus ?? record?.loaiTrangThai;
  const status: 'chua_xu_ly' | 'da_nhac_nho' | 'loi_app' = ['chua_xu_ly', 'da_nhac_nho', 'loi_app'].includes(rawStatus)
    ? rawStatus
    : 'chua_xu_ly';
  const reasons = (typeof record?.lyDoCanhBao === 'string' ? record.lyDoCanhBao.trim() : '')
    || (previousRecord?.lyDoCanhBao || '');
  const reasonCount = Number(record?.soLuotCanhBao);
  const savedReasonCount = Number(previousRecord?.soLuotCanhBao);
  const soLuotCanhBao = Number.isFinite(reasonCount) && reasonCount > 0
    ? Math.min(50, Math.floor(reasonCount))
    : Number.isFinite(savedReasonCount) && savedReasonCount > 0
    ? Math.min(50, Math.floor(savedReasonCount))
    : Math.max(1, reasons.split(';').filter(Boolean).length);

  return {
    id: `${record?.coSo || ''}_${record?.ngay || ''}`,
    coSo: record?.coSo || '',
    ngay: record?.ngay || '',
    soLuotCanhBao,
    lyDoCanhBao: reasons,
    daNhacNho: status === 'da_nhac_nho',
    loiApp: status === 'loi_app',
    trangThai: status === 'da_nhac_nho' ? 'Đã nhắc nhở' : status === 'loi_app' ? 'Lỗi app' : 'Chưa nhận định',
    loaiTrangThai: status,
    thoiGianPhatHien: previousRecord?.thoiGianPhatHien || record?.thoiGianPhatHien || now,
    thoiGianTich: status === 'chua_xu_ly' ? '' : (record?.thoiGianTich || now),
    nguoiXuLy: status === 'chua_xu_ly' ? '' : (record?.nguoiXuLy || 'Quản lý kiểm tra'),
    emailThucHien: status === 'chua_xu_ly' ? '' : (record?.emailThucHien || ''),
    updatedAt: now,
    syncedToSheet: false,
  };
}

// GET /api/warning-audits
app.get('/api/warning-audits', (req, res) => {
  const date = req.query.date ? String(req.query.date) : '';
  const format = req.query.format ? String(req.query.format) : '';

  const prefix = date ? `audits/${date}/` : 'audits/';
  const records: WarningAuditRecord[] = [];
  for (const [key, val] of warningAuditStore.entries()) {
    if (key.startsWith(prefix)) {
      records.push(val);
    }
  }
  records.sort((a, b) => {
    const dateOrder = String(b.ngay).localeCompare(String(a.ngay));
    return dateOrder || String(a.coSo).localeCompare(String(b.coSo), 'vi');
  });

  if (format === 'csv') {
    const escapeCsv = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'Ngày', 'Cơ sở', 'Số lượt cảnh báo', 'Lý do cảnh báo', 'Đã nhắc nhở',
      'Lỗi app', 'Trạng thái nhận định', 'Thời gian phát hiện', 'Thời gian xử lý',
      'Người xử lý', 'Email thực hiện', 'Cập nhật trên hệ thống'
    ];
    const rows = records.map(r => [
      r.ngay, r.coSo, r.soLuotCanhBao, r.lyDoCanhBao,
      r.daNhacNho ? 'Có' : 'Không', r.loiApp ? 'Có' : 'Không',
      r.trangThai, r.thoiGianPhatHien, r.thoiGianTich,
      r.nguoiXuLy, r.emailThucHien, r.updatedAt
    ]);
    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="nhat-ky-canh-bao.csv"');
    return res.send(csvContent);
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, error: 'Ngày tra cứu không hợp lệ.' });
  }

  res.json({ success: true, date, records, count: records.length });
});

// POST /api/warning-audits
app.post('/api/warning-audits', async (req, res) => {
  try {
    const payload = req.body;
    const action = payload?.action;

    if (action === 'upsert') {
      const rec = payload.record;
      if (!rec?.coSo || !rec?.ngay || !/^\d{4}-\d{2}-\d{2}$/.test(rec.ngay)) {
        return res.status(400).json({ success: false, error: 'Dữ liệu ghi nhận không hợp lệ.' });
      }
      const facility = String(rec.coSo).trim().slice(0, 160);
      const prev = warningAuditStore.get(getWarningKey(rec.ngay, facility));
      const saved = buildWarningRecord({ ...rec, coSo: facility }, prev, rec.loaiTrangThai);
      warningAuditStore.set(getWarningKey(rec.ngay, facility), saved);
      return res.json({ success: true, record: saved });
    }

    if (action === 'sync_list') {
      const date = String(payload.date || '');
      const inputRecords: any[] = Array.isArray(payload.records) ? payload.records.slice(0, 50) : [];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, error: 'Ngày không hợp lệ.' });
      }
      const savedList: WarningAuditRecord[] = [];
      for (const item of inputRecords) {
        if (!item?.coSo) continue;
        const facility = String(item.coSo).trim().slice(0, 160);
        const prev = warningAuditStore.get(getWarningKey(date, facility));
        const preservedStatus = prev?.loaiTrangThai || 'chua_xu_ly';
        const saved = buildWarningRecord({ ...item, coSo: facility, ngay: date }, prev, preservedStatus);
        warningAuditStore.set(getWarningKey(date, facility), saved);
        savedList.push(saved);
      }
      return res.json({ success: true, date, records: savedList, count: savedList.length });
    }

    if (action === 'reset_date' || action === 'clear_date') {
      const date = String(payload.date || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, error: 'Ngày không hợp lệ.' });
      }
      const prefix = `audits/${date}/`;
      const resetList: WarningAuditRecord[] = [];
      for (const [key, val] of warningAuditStore.entries()) {
        if (key.startsWith(prefix)) {
          const reset = buildWarningRecord(val, val, 'chua_xu_ly');
          warningAuditStore.set(key, reset);
          resetList.push(reset);
        }
      }
      return res.json({ success: true, date, cleared: resetList.length, records: resetList });
    }

    return res.status(400).json({ success: false, error: 'Thao tác không hợp lệ.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Lỗi máy chủ' });
  }
});

// ============================================================================
// Persistent config & No-Login Google Sheet APIs for Weekly Warning Reports
// Default target spreadsheet: 1003lfdUh6S_Tkg5H4qChw7KrziAon1uvgkoFMj9FK0E
// ============================================================================
const DEFAULT_WEEKLY_WARNING_SPREADSHEET_ID = '1003lfdUh6S_Tkg5H4qChw7KrziAon1uvgkoFMj9FK0E';

interface WeeklyWarningSheetServerConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  appsScriptUrl: string;
  teamLeadersByFacility: Record<string, string>;
  weekSyncHistory: Record<string, { syncedAt: string; sheetId?: number; sheetTitle?: string }>;
  updatedAt: string;
}

const WEEKLY_CONFIG_DIR = path.resolve(process.cwd(), '.data');
const WEEKLY_CONFIG_FILE = path.resolve(WEEKLY_CONFIG_DIR, 'weekly-warning-sheet-config.json');

const sanitizeSpreadsheetId = (val: unknown): string => {
  const s = typeof val === 'string' ? val.trim() : '';
  return /^[a-zA-Z0-9_-]{10,120}$/.test(s) ? s : DEFAULT_WEEKLY_WARNING_SPREADSHEET_ID;
};

const isValidAppsScriptExecUrl = (val: unknown): val is string => {
  if (typeof val !== 'string') return false;
  return /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]{15,200}\/exec$/.test(val.trim());
};

let weeklyWarningConfigState: WeeklyWarningSheetServerConfig = {
  spreadsheetId: sanitizeSpreadsheetId(process.env.WEEKLY_WARNING_SHEET_ID || DEFAULT_WEEKLY_WARNING_SPREADSHEET_ID),
  spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sanitizeSpreadsheetId(process.env.WEEKLY_WARNING_SHEET_ID || DEFAULT_WEEKLY_WARNING_SPREADSHEET_ID)}/edit`,
  spreadsheetTitle: 'THEO DÕI XỬ LÝ CẢNH BÁO VỆ SINH',
  appsScriptUrl: isValidAppsScriptExecUrl(configuredNewSheetScriptUrl) ? configuredNewSheetScriptUrl : DEFAULT_NEW_SHEET_APPS_SCRIPT_URL,
  teamLeadersByFacility: {},
  weekSyncHistory: {},
  updatedAt: '',
};

try {
  if (fs.existsSync(WEEKLY_CONFIG_FILE)) {
    const rawCfg = fs.readFileSync(WEEKLY_CONFIG_FILE, 'utf8');
    const parsedCfg = JSON.parse(rawCfg);
    if (parsedCfg && typeof parsedCfg === 'object') {
      const sid = sanitizeSpreadsheetId(parsedCfg.spreadsheetId);
      weeklyWarningConfigState = {
        ...weeklyWarningConfigState,
        ...parsedCfg,
        spreadsheetId: sid,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sid}/edit`,
        appsScriptUrl: isValidAppsScriptExecUrl(parsedCfg.appsScriptUrl)
          ? parsedCfg.appsScriptUrl.trim()
          : weeklyWarningConfigState.appsScriptUrl,
      };
    }
  }
} catch (err) {
  console.warn('Không thể đọc cấu hình weekly-warning-sheet:', err);
}

function persistWeeklyWarningConfig(nextConfig: WeeklyWarningSheetServerConfig) {
  weeklyWarningConfigState = nextConfig;
  try {
    if (!fs.existsSync(WEEKLY_CONFIG_DIR)) {
      fs.mkdirSync(WEEKLY_CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(WEEKLY_CONFIG_FILE, JSON.stringify(nextConfig, null, 2), 'utf8');
  } catch (writeErr) {
    console.warn('Không thể lưu file cấu hình weekly-warning-sheet:', writeErr);
  }
}

function buildServerWeekCode(startIso: string, endIso: string): string {
  return `W_${startIso}_TO_${endIso}`;
}

function formatServerDmy(iso: string): string {
  const parts = (iso || '').trim().split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function buildServerMonthLabel(startIso: string): string {
  const parts = (startIso || '').trim().split('-');
  if (parts.length !== 3) return '';
  return `${parts[1]}/${parts[0]}`;
}

function buildServerDateRange(startIso: string, endIso: string): string {
  return `${formatServerDmy(startIso)} - ${formatServerDmy(endIso)}`;
}

function buildServerWeekPrefixNew(weekNumber: number | string, startIso: string): string {
  const wk = Number(weekNumber || 0);
  const monthLabel = buildServerMonthLabel(startIso);
  if (wk > 0 && monthLabel) {
    return `Tuần ${wk}_${monthLabel}_`;
  }
  return '';
}

function normalizeServerRangeCompare(val: string): string {
  return (val || '')
    .replace(/\s*\(Tuần\s*\d+\)\s*/i, '')
    .replace(/[–—]/g, '-')
    .replace(/\s*-\s*/g, ' - ')
    .trim();
}

function buildServerWeekTabTitle(startIso: string, endIso: string): string {
  const s = (startIso || '').split('-');
  const e = (endIso || '').split('-');
  if (s.length === 3 && e.length === 3) {
    return `Tuần ${s[2]}.${s[1]}-${e[2]}.${e[1]}.${e[0]}`;
  }
  return `Tuần ${startIso}_${endIso}`.slice(0, 90);
}

async function fetchPublicSpreadsheetTabs(
  spreadsheetId: string,
): Promise<Array<{ name: string; gid: string }>> {
  const targetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`;
  const resp = await fetch(targetUrl, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) {
    throw new Error(`Không thể đọc danh sách tab của Google Sheet (HTTP ${resp.status}).`);
  }
  const html = await resp.text();
  if (html.includes('accounts.google.com') && !html.includes('items.push')) {
    throw new Error('Google Sheet chưa bật quyền xem công khai (Anyone with the link).');
  }

  const tabs: Array<{ name: string; gid: string }> = [];
  const regex = /items\.push\(\{name:\s*"([^"]+)"[^}]*gid:\s*"(\d+)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    // Decode basic JS unicode escapes if any (e.g. \u00e0)
    let decodedName = match[1];
    try {
      decodedName = JSON.parse(`"${match[1].replace(/"/g, '\\"')}"`);
    } catch {}
    tabs.push({ name: decodedName.trim(), gid: match[2] });
  }
  return tabs;
}

async function fetchPublicSheetCsvRows(
  spreadsheetId: string,
  gid: string,
): Promise<string[][]> {
  const targetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&t=${Date.now()}`;
  const resp = await fetch(targetUrl, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) {
    throw new Error(`Không thể đọc dữ liệu tab gid=${gid} (HTTP ${resp.status}).`);
  }
  const csv = await resp.text();
  if (csv.includes('<!DOCTYPE html>') || csv.includes('accounts.google.com')) {
    throw new Error('Không thể đọc dữ liệu CSV từ Google Sheet.');
  }
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: false });
  return Array.isArray(parsed.data) ? parsed.data : [];
}

app.get('/api/weekly-warning-config', (_req, res) => {
  res.json({ success: true, config: weeklyWarningConfigState });
});

app.post('/api/weekly-warning-config', (req, res) => {
  try {
    const body = req.body || {};
    const nextConfig: WeeklyWarningSheetServerConfig = {
      ...weeklyWarningConfigState,
      updatedAt: new Date().toISOString(),
    };

    if (typeof body.spreadsheetId === 'string') {
      const cleanId = body.spreadsheetId.trim() || DEFAULT_WEEKLY_WARNING_SPREADSHEET_ID;
      if (!/^[a-zA-Z0-9_-]{10,120}$/.test(cleanId)) {
        return res.status(400).json({ success: false, error: 'Spreadsheet ID không hợp lệ.' });
      }
      nextConfig.spreadsheetId = cleanId;
      nextConfig.spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;
    }
    if (typeof body.spreadsheetUrl === 'string' && body.spreadsheetUrl.startsWith('https://docs.google.com/spreadsheets/')) {
      nextConfig.spreadsheetUrl = body.spreadsheetUrl.slice(0, 500);
    }
    if (typeof body.spreadsheetTitle === 'string' && body.spreadsheetTitle.trim()) {
      nextConfig.spreadsheetTitle = body.spreadsheetTitle.trim().slice(0, 160);
    }
    if (typeof body.appsScriptUrl === 'string' && body.appsScriptUrl.trim()) {
      const trimmedScript = body.appsScriptUrl.trim();
      if (!isValidAppsScriptExecUrl(trimmedScript)) {
        return res.status(400).json({
          success: false,
          error: 'Đường dẫn Web App Apps Script phải có dạng https://script.google.com/macros/s/.../exec',
        });
      }
      nextConfig.appsScriptUrl = trimmedScript;
      configuredNewSheetScriptUrl = trimmedScript;
    }
    if (body.teamLeadersByFacility && typeof body.teamLeadersByFacility === 'object') {
      const cleanMap: Record<string, string> = {};
      Object.entries(body.teamLeadersByFacility).slice(0, 50).forEach(([k, v]) => {
        if (typeof k === 'string' && typeof v === 'string') {
          cleanMap[k.trim().slice(0, 120)] = v.trim().slice(0, 120);
        }
      });
      nextConfig.teamLeadersByFacility = cleanMap;
    }
    if (body.weekSyncHistory && typeof body.weekSyncHistory === 'object') {
      nextConfig.weekSyncHistory = {
        ...weeklyWarningConfigState.weekSyncHistory,
        ...body.weekSyncHistory,
      };
    }

    persistWeeklyWarningConfig(nextConfig);
    res.json({ success: true, config: weeklyWarningConfigState });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Lỗi lưu cấu hình' });
  }
});

const TEAM_LEADER_PROCESSING_SHEET_NAME = 'Trưởng nhóm xử lý';
const REQUIRED_WEEKLY_SCHEMA_VERSION = 8;

async function verifyWeeklyAppsScriptSchema(scriptUrl: string): Promise<{
  supported: boolean;
  schemaVersion: number;
}> {
  try {
    const pingResp = await fetch(scriptUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'weekly_ping' }),
      signal: AbortSignal.timeout(12_000),
    });
    const pingText = await pingResp.text().catch(() => '');
    const pingJson: any = pingText ? JSON.parse(pingText) : null;
    const schemaVersion = Number(pingJson?.schemaVersion || 0);
    const supported =
      Boolean(pingResp.ok) &&
      pingJson?.weeklySupported === true &&
      schemaVersion >= REQUIRED_WEEKLY_SCHEMA_VERSION;
    return { supported, schemaVersion };
  } catch {
    return { supported: false, schemaVersion: 0 };
  }
}

function findTeamLeaderPublicTab(tabs: Array<{ name: string; gid: string }>) {
  const targetLower = TEAM_LEADER_PROCESSING_SHEET_NAME.trim().toLowerCase();
  return tabs.find(t => t.name.trim().toLowerCase() === targetLower);
}

// No-login check whether a week already has records inside sheet "Trưởng nhóm xử lý"
app.get('/api/weekly-warning-sheet/check', async (req, res) => {
  try {
    const startIso = String(req.query.startIso || '').trim();
    const endIso = String(req.query.endIso || '').trim();
    const weekNumber = String(req.query.weekNumber || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso) || !/^\d{4}-\d{2}-\d{2}$/.test(endIso)) {
      return res.status(400).json({ success: false, error: 'Ngày bắt đầu / kết thúc tuần không hợp lệ.' });
    }
    const spreadsheetId = sanitizeSpreadsheetId(req.query.spreadsheetId || weeklyWarningConfigState.spreadsheetId);
    const weekCode = buildServerWeekCode(startIso, endIso);
    const legacyPrefix = `${weekCode}__`;
    const newPrefix = buildServerWeekPrefixNew(weekNumber, startIso);
    const expectedDateRange = buildServerDateRange(startIso, endIso);
    const expectedMonth = buildServerMonthLabel(startIso);
    const legacyTitle = buildServerWeekTabTitle(startIso, endIso);
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    const tabs = await fetchPublicSpreadsheetTabs(spreadsheetId);
    const teamLeaderTab = findTeamLeaderPublicTab(tabs);
    const matchedTab =
      teamLeaderTab ||
      tabs.find(t => t.name.trim() === legacyTitle || t.name.includes(weekCode));

    if (!matchedTab) {
      return res.json({
        success: true,
        result: {
          spreadsheetFound: true,
          spreadsheetId,
          spreadsheetUrl,
          weekExists: false,
          weekCode,
          sheetTitle: TEAM_LEADER_PROCESSING_SHEET_NAME,
          existingRowCount: 0,
          tabUrl: spreadsheetUrl,
        },
      });
    }

    const rows = await fetchPublicSheetCsvRows(spreadsheetId, matchedTab.gid);
    const checkStartIdx = String(rows[0]?.[0] || '').trim() === 'Mã hồ sơ' ? 1 : 0;
    const weekRows = rows.slice(checkStartIdx).filter(r => {
      const code = String(r?.[0] || '').trim();
      const rowRange = normalizeServerRangeCompare(String(r?.[1] || ''));
      const rowMonth = String(r?.[2] || '').trim();
      return (
        Boolean(code) &&
        ((newPrefix && code.startsWith(newPrefix)) ||
          code.startsWith(legacyPrefix) ||
          (rowRange === expectedDateRange && rowMonth === expectedMonth) ||
          rowRange === expectedDateRange)
      );
    });
    const sheetIdNum = parseInt(matchedTab.gid, 10) || 0;
    const tabUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${matchedTab.gid}`;

    return res.json({
      success: true,
      result: {
        spreadsheetFound: true,
        spreadsheetId,
        spreadsheetUrl,
        weekExists: weekRows.length > 0,
        weekCode,
        sheetId: sheetIdNum,
        sheetTitle: matchedTab.name,
        existingRowCount: weekRows.length,
        tabUrl,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Không thể kiểm tra sheet "Trưởng nhóm xử lý" trên Google Sheet.',
    });
  }
});

// No-login read all weekly records from "Trưởng nhóm xử lý" (plus any legacy weekly tabs)
app.get('/api/weekly-warning-sheet/records', async (req, res) => {
  try {
    const spreadsheetId = sanitizeSpreadsheetId(req.query.spreadsheetId || weeklyWarningConfigState.spreadsheetId);
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const tabs = await fetchPublicSpreadsheetTabs(spreadsheetId);

    const ignored = new Set(['kiểm duyệt vệ sinh', 'nhắc nhở', 'tổng hợp hồ sơ', 'sheet1']);
    const candidateTabs = tabs.filter(t => !ignored.has(t.name.trim().toLowerCase()));

    const tabRowsResults = await Promise.all(
      candidateTabs.map(async tab => {
        try {
          const rows = await fetchPublicSheetCsvRows(spreadsheetId, tab.gid);
          return { tab, rows };
        } catch {
          return { tab, rows: [] as string[][] };
        }
      }),
    );

    const rawRecords: Array<{
      row: string[];
      rowNumber: number;
      spreadsheetId: string;
      sheetId: number;
      sheetTitle: string;
    }> = [];

    tabRowsResults.forEach(({ tab, rows }) => {
      if (!rows.length) return;
      const header0 = String(rows[0]?.[0] || '').trim();
      const firstRowLooksLikeRecord = /^Tuần\s*\d+_|^W_\d{4}-/.test(header0);
      if (header0 !== 'Mã hồ sơ' && !firstRowLooksLikeRecord) return;
      const startIdx = header0 === 'Mã hồ sơ' ? 1 : 0;
      const sheetIdNum = parseInt(tab.gid, 10) || 0;
      for (let i = startIdx; i < rows.length; i++) {
        const r = rows[i];
        const col0 = String(r?.[0] || '').trim();
        const colFac =
          String(r?.[5] || '').trim() ||
          String(r?.[4] || '').trim() ||
          String(r?.[2] || '').trim();
        if (col0 && colFac) {
          rawRecords.push({
            row: r,
            rowNumber: i + 1,
            spreadsheetId,
            sheetId: sheetIdNum,
            sheetTitle: tab.name,
          });
        }
      }
    });

    res.json({
      success: true,
      spreadsheetFound: true,
      spreadsheetId,
      spreadsheetUrl,
      rawRecords,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Không thể đọc dữ liệu báo cáo tuần từ Google Sheet.',
    });
  }
});

// No-login create / update a week report inside "Trưởng nhóm xử lý" via Apps Script Web App + CSV readback verification
app.post('/api/weekly-warning-sheet/sync', async (req, res) => {
  try {
    const body = req.body || {};
    const spreadsheetId = sanitizeSpreadsheetId(body.spreadsheetId || weeklyWarningConfigState.spreadsheetId);
    const selectedWeek = body.selectedWeek;
    const sourceRows = Array.isArray(body.sourceRows) ? body.sourceRows : [];
    const mode = body.mode === 'update' ? 'update' : 'create';
    const scriptUrlCandidate =
      (typeof body.scriptUrl === 'string' && body.scriptUrl.trim()) ||
      weeklyWarningConfigState.appsScriptUrl ||
      configuredNewSheetScriptUrl ||
      DEFAULT_NEW_SHEET_APPS_SCRIPT_URL;

    if (!selectedWeek?.startIso || !selectedWeek?.endIso) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin tuần đang chọn.' });
    }
    if (!isValidAppsScriptExecUrl(scriptUrlCandidate)) {
      return res.status(400).json({
        success: false,
        needsScriptUpdate: true,
        error: 'Chưa có đường dẫn Web App Google Apps Script hợp lệ cho file Google Sheet.',
      });
    }

    const weekCode = buildServerWeekCode(selectedWeek.startIso, selectedWeek.endIso);
    const legacyPrefix = `${weekCode}__`;
    const weekPrefixNew =
      (typeof body.weekPrefix === 'string' && body.weekPrefix.trim()) ||
      buildServerWeekPrefixNew(selectedWeek.weekNumber, selectedWeek.startIso);
    const expectedDateRange = buildServerDateRange(selectedWeek.startIso, selectedWeek.endIso);
    const expectedMonth = buildServerMonthLabel(selectedWeek.startIso);

    const preflight = await verifyWeeklyAppsScriptSchema(scriptUrlCandidate);
    if (!preflight.supported) {
      return res.json({
        success: false,
        needsScriptUpdate: true,
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        message:
          'Apps Script gắn trên Google Sheet cần được cập nhật lên phiên bản mới (v8) để tự động điền "Thời gian cập nhật" (cột N) ngay khi tích trực tiếp ô "Trưởng nhóm đã duyệt" (cột K) trên Google Sheet. Vui lòng bấm "1. Sao chép mã Apps Script mới", dán vào Code.gs rồi chọn Triển khai > Quản lý các mục đã triển khai > Chỉnh sửa > Phiên bản mới > Triển khai.',
      });
    }

    // Note: intentionally pass `sourceRows` (NOT `records`) so older Apps Script deployments return
    // `{ success: true, message: "Không có bản ghi" }` without touching "Kiểm duyệt vệ sinh".
    const appsResp = await fetch(scriptUrlCandidate.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync_weekly_warning_report',
        spreadsheetId,
        targetSheetName: TEAM_LEADER_PROCESSING_SHEET_NAME,
        sheetTitle: TEAM_LEADER_PROCESSING_SHEET_NAME,
        weekCode,
        weekPrefix: weekPrefixNew,
        startIso: selectedWeek.startIso,
        endIso: selectedWeek.endIso,
        mode,
        sourceRows,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    const respText = await appsResp.text().catch(() => '');
    let appsJson: any = null;
    try {
      appsJson = JSON.parse(respText);
    } catch {
      appsJson = null;
    }

    if (
      !appsResp.ok ||
      !appsJson ||
      appsJson.weeklySupported !== true ||
      Number(appsJson.schemaVersion || 0) < REQUIRED_WEEKLY_SCHEMA_VERSION
    ) {
      return res.json({
        success: false,
        needsScriptUpdate: true,
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        message:
          'Apps Script gắn trên Google Sheet chưa phải phiên bản v8 mới nhất (tự điền Thời gian cập nhật khi tích duyệt trên Sheet). Vui lòng sao chép mã Apps Script mới, lưu vào Code.gs và triển khai Phiên bản mới (New version) trong Google Sheet.',
      });
    }

    if (appsJson.alreadyExists) {
      return res.json({
        success: false,
        alreadyExists: true,
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        sheetId: Number(appsJson.sheetId || 0),
        sheetTitle: appsJson.sheetTitle || TEAM_LEADER_PROCESSING_SHEET_NAME,
        existingRowCount: Number(appsJson.existingRowCount || 0),
        tabUrl: appsJson.tabUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${appsJson.sheetId}`,
        message: appsJson.message || 'Tuần này đã tồn tại trong sheet "Trưởng nhóm xử lý".',
      });
    }

    if (!appsJson.success) {
      return res.status(502).json({
        success: false,
        message: appsJson.error || appsJson.message || 'Google Apps Script báo lỗi khi ghi vào sheet "Trưởng nhóm xử lý".',
      });
    }

    // Mandatory readback verification from live Google Sheet CSV specifically for this week
    const sheetIdStr = String(appsJson.sheetId ?? '');
    let verifiedCodes = new Set<string>();
    if (sheetIdStr) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const readRows = await fetchPublicSheetCsvRows(spreadsheetId, sheetIdStr);
          const readStartIdx = String(readRows[0]?.[0] || '').trim() === 'Mã hồ sơ' ? 1 : 0;
          verifiedCodes = new Set(
            readRows
              .slice(readStartIdx)
              .filter(r => {
                const code = String(r?.[0] || '').trim();
                const rRange = normalizeServerRangeCompare(String(r?.[1] || ''));
                const rMonth = String(r?.[2] || '').trim();
                return (
                  Boolean(code) &&
                  ((weekPrefixNew && code.startsWith(weekPrefixNew)) ||
                    code.startsWith(legacyPrefix) ||
                    (rRange === expectedDateRange && rMonth === expectedMonth))
                );
              })
              .map(r => String(r?.[0] || '').trim()),
          );
          const missing = sourceRows.filter((s: any) => !verifiedCodes.has(String(s.recordCode || '').trim()));
          if (missing.length === 0) break;
        } catch {}
        if (attempt === 0) await new Promise(r => setTimeout(r, 900));
      }
    }

    const totalRowsVerified = Math.max(verifiedCodes.size, Number(appsJson.totalRowsVerified || 0));
    if (sourceRows.length > 0 && totalRowsVerified < sourceRows.length) {
      return res.status(502).json({
        success: false,
        message: `Đọc kiểm tra lại sheet "Trưởng nhóm xử lý" chỉ thấy ${totalRowsVerified}/${sourceRows.length} hồ sơ của tuần này. Vui lòng thử lại.`,
      });
    }

    const syncedAt = String(appsJson.syncedAt || '');
    const sheetIdNum = Number(appsJson.sheetId || 0);
    const finalTitle = String(appsJson.sheetTitle || TEAM_LEADER_PROCESSING_SHEET_NAME);
    const tabUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetIdNum}`;

    persistWeeklyWarningConfig({
      ...weeklyWarningConfigState,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      appsScriptUrl: scriptUrlCandidate.trim(),
      weekSyncHistory: {
        ...weeklyWarningConfigState.weekSyncHistory,
        [weekCode]: {
          syncedAt,
          sheetId: sheetIdNum,
          sheetTitle: finalTitle,
        },
      },
      updatedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      mode,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      tabUrl,
      sheetId: sheetIdNum,
      sheetTitle: finalTitle,
      weekCode,
      syncedAt,
      updatedCount: Number(appsJson.updatedCount || 0),
      addedCount: Number(appsJson.addedCount || 0),
      resolvedCount: Number(appsJson.resolvedCount || 0),
      totalRowsVerified,
      message:
        mode === 'create'
          ? `Đã ghi thành công ${Number(appsJson.addedCount || sourceRows.length)} cơ sở vào sheet "Trưởng nhóm xử lý" (đã kiểm tra đọc lại ${totalRowsVerified} dòng).`
          : `Đã cập nhật sheet "Trưởng nhóm xử lý" lúc ${syncedAt}: ${Number(appsJson.updatedCount || 0)} dòng cập nhật, ${Number(appsJson.addedCount || 0)} thêm mới, ${Number(appsJson.resolvedCount || 0)} không còn cảnh báo.`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err?.message || 'Lỗi kết nối đồng bộ Google Sheet.',
    });
  }
});

// No-login update single Team Leader / QLCL tracking row via Apps Script Web App
app.post('/api/weekly-warning-sheet/update-row', async (req, res) => {
  try {
    const body = req.body || {};
    const spreadsheetId = sanitizeSpreadsheetId(body.spreadsheetId || weeklyWarningConfigState.spreadsheetId);
    const scriptUrlCandidate =
      (typeof body.scriptUrl === 'string' && body.scriptUrl.trim()) ||
      weeklyWarningConfigState.appsScriptUrl ||
      configuredNewSheetScriptUrl ||
      DEFAULT_NEW_SHEET_APPS_SCRIPT_URL;

    if (!isValidAppsScriptExecUrl(scriptUrlCandidate)) {
      return res.status(400).json({
        success: false,
        needsScriptUpdate: true,
        message: 'Chưa có đường dẫn Web App Google Apps Script hợp lệ.',
      });
    }

    const preflight = await verifyWeeklyAppsScriptSchema(scriptUrlCandidate);
    if (!preflight.supported) {
      return res.json({
        success: false,
        needsScriptUpdate: true,
        message:
          'Apps Script trên Google Sheet đang là bản cũ (chưa cập nhật cột "Số lượt đã nhắc nhở" & 4 phương án xử lý). Vui lòng sao chép mã Code.gs mới và triển khai Phiên bản mới (New version) trong Google Sheet.',
      });
    }

    const appsResp = await fetch(scriptUrlCandidate.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_weekly_warning_record',
        spreadsheetId,
        recordCode: String(body.recordCode || '').trim(),
        sheetTitle: String(body.sheetTitle || '').trim(),
        weekCode: String(body.weekCode || '').trim(),
        patch: body.patch || {},
        actor: String(body.actor || 'Trưởng nhóm / QLCL').trim().slice(0, 120),
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const respText = await appsResp.text().catch(() => '');
    let appsJson: any = null;
    try {
      appsJson = JSON.parse(respText);
    } catch {
      appsJson = null;
    }

    if (
      !appsResp.ok ||
      !appsJson ||
      appsJson.weeklySupported !== true ||
      Number(appsJson.schemaVersion || 0) < REQUIRED_WEEKLY_SCHEMA_VERSION
    ) {
      return res.json({
        success: false,
        needsScriptUpdate: true,
        message:
          'Apps Script gắn trên Google Sheet chưa cập nhật phiên bản 18 cột mới. Vui lòng cập nhật Code.gs và triển khai Phiên bản mới trong Google Sheet.',
      });
    }

    if (!appsJson.success || !Array.isArray(appsJson.rowValues)) {
      return res.status(502).json({
        success: false,
        message: appsJson.error || 'Không thể lưu thay đổi lên Google Sheet.',
      });
    }

    return res.json({
      success: true,
      rowNumber: Number(appsJson.rowNumber || 0),
      rowValues: appsJson.rowValues,
      status: appsJson.status,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err?.message || 'Lỗi lưu cập nhật lên Google Sheet.',
    });
  }
});

async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const distIndexExists = fs.existsSync(path.join(distPath, 'index.html'));
  const isProduction = process.env.NODE_ENV === 'production' || isCloudRun || (distIndexExists && !isDevWorkspace);

  if (isProduction && distIndexExists) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zalo OA Report App running at http://0.0.0.0:${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server Error] Port ${PORT} is already in use.`);
    } else {
      console.error('[Server Error]', err);
    }
  });
}

startServer();
