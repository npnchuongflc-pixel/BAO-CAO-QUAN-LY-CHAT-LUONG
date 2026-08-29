import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

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
    const sheetName = encodeURIComponent('Đánh giá qua camera');
    
    // Try gid first, then sheet name if needed
    let targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?gid=${gid}&tqx=out:json`;
    let response = await fetch(targetUrl);
    
    if (!response.ok) {
      targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${sheetName}&tqx=out:json`;
      response = await fetch(targetUrl);
    }

    const text = await response.text();
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr);

    cachedTeachingData = parsed;
    lastTeachingCacheTime = now;

    res.json({ success: true, data: parsed, cached: false });
  } catch (err: any) {
    console.error('Error fetching teaching sheet data:', err);
    if (cachedTeachingData) {
      return res.json({ success: true, data: cachedTeachingData, cached: true, warning: 'Using stale cache' });
    }
    res.status(500).json({ success: false, error: err.message || 'Không thể tải Google Sheets Giám Sát Giảng Dạy' });
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
