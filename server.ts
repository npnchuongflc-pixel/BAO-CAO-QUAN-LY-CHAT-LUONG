import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import Papa from 'papaparse';

dotenv.config();

const app = express();
const PORT = 3000;

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
let cachedSheetData: any = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

// Cache for Teaching Quality Sheet data (gid=282336280)
let cachedTeachingData: any = null;
let lastTeachingCacheTime = 0;

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
    // Use the complete CSV export instead of the visualization query endpoint.
    // This keeps report totals independent from temporary filters applied in
    // the Raw Data sheet by an editor.
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(targetUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Google Sheets CSV responded with HTTP ${response.status}`);
    }

    const csv = await response.text();
    if (!csv || csv.includes('<!DOCTYPE html>')) {
      throw new Error('Google Sheets CSV không khả dụng hoặc cần quyền truy cập');
    }

    cachedTeachingData = { csv };
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

app.get('/api/image-reviews', (req, res) => {
  const date = String(req.query.date || '');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, error: 'Ngày tra cứu không hợp lệ.' });
  }
  const prefix = `reviews/${date}/`;
  const records: ImageReviewRecord[] = [];
  for (const [key, val] of imageReviewStore.entries()) {
    if (key.startsWith(prefix)) {
      records.push(val);
    }
  }
  records.sort((a, b) => String(a.coSo).localeCompare(String(b.coSo), 'vi'));
  res.json({ success: true, date, records, count: records.length });
});

// Automated Daily Sync Engine & Store
const DEFAULT_NEW_SHEET_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz0KaluYvWaWNgVHCK9zesGJs2mnu5koEg9NQ9v76ndZZPXlaog1mUpuaK4x851aomp/exec';
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
          trangThaiKiemDuyet: reviewStatus === 'approved' ? 'Đã duyệt' : reviewStatus === 'rejected' ? 'Không đạt' : 'Chưa duyệt',
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
          khongDat: reviewStatus === 'rejected' ? (revNote || reviewer || 'Không đạt') : '',
          reviewStatus,
          reviewer,
        });
      }

      let syncWarning = '';
      if (targetScriptUrl && updatesForSheet.length > 0) {
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
      trangThaiKiemDuyet: reviewStatus === 'approved' ? 'Đã duyệt' : reviewStatus === 'rejected' ? 'Không đạt' : 'Chưa duyệt',
      nguoiKiemDuyet: reviewer,
      thoiGianKiemDuyet: record.thoiGianKiemDuyet || now,
      updatedAt: now,
      syncedToSheet: true,
    };

    let syncWarning = '';
    if (targetScriptUrl) {
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
            // Column 12 (Đã duyệt) and Column 13 (Không đạt)
            daDuyet: savedRecord.reviewStatus === 'approved' ? (revNote || savedRecord.nguoiKiemDuyet || 'Đã duyệt') : '',
            khongDat: savedRecord.reviewStatus === 'rejected' ? (revNote || savedRecord.nguoiKiemDuyet || 'Không đạt') : '',
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

    // Filter rows for target date
    const matchedRecords: any[] = [];
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
      let khongDat = getClean(row, ['Không đạt', 'KHÔNG ĐẠT', 'Rejected', 'Không Đạt']) || '';

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
          khongDat = revNote || 'Không đạt';
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

    if (matchedRecords.length === 0) {
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

    // 2. Post to Apps Script
    const syncResp = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync_full_day_hygiene_reviews',
        date: dateIso,
        count: matchedRecords.length,
        records: matchedRecords,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(30000),
    });

    const syncJson: any = await syncResp.json().catch(() => null);
    if (syncResp.ok && (syncJson?.success || syncJson?.status === 'ok')) {
      const successMsg = `Đã tự động đổ ${matchedRecords.length} dòng ngày ${dateIso} sang Sheet Mới thành công!`;
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
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const vnNow = new Date(utc + 7 * 3600 * 1000);
      const currentHour = vnNow.getHours();

      const scriptUrl = configuredNewSheetScriptUrl || process.env.NEW_SHEET_APPS_SCRIPT_URL || process.env.WARNING_APPS_SCRIPT_URL;
      // Auto-trigger during early morning (from 1:00 AM onwards)
      if (scriptUrl && currentHour >= 1) {
        console.log(`[Auto-Sync] Bắt đầu tự động đổ dữ liệu ngày ${dates.iso} sang Sheet Mới...`);
        const result = await runDailyHygieneSync(dates.iso, scriptUrl);
        if (result.success) {
          lastAutoSyncDate = dates.iso;
          console.log(`[Auto-Sync] Hoàn tất tự động đổ ngày ${dates.iso}:`, result.message);
        } else {
          console.warn(`[Auto-Sync] Thử đổ ngày ${dates.iso} chưa thành công:`, result.error);
        }
      }
    }
  } catch (err) {
    console.error('[Auto-Sync] Lỗi trong scheduler:', err);
  }
}, 15 * 60 * 1000);

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
    const { date, scriptUrl, records } = req.body;
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

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zalo OA Report App running at http://localhost:${PORT}`);
  });
}

startServer();
