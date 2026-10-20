// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import Papa from "papaparse";
dotenv.config();
var app = express();
var isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION);
var isDevWorkspace = Boolean(process.env.DEFAULT_APP_PORT && !isCloudRun);
var PORT = isDevWorkspace ? parseInt(process.env.DEFAULT_APP_PORT, 10) : process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
app.use(express.json({ limit: "10mb" }));
var genAIClient = null;
function getGeminiClient() {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in the environment");
    }
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Zalo OA Report Backend", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
var cachedProposalData = null;
var lastProposalCacheTime = 0;
app.get("/api/proposals-sheet", async (req, res) => {
  try {
    const force = req.query.force === "true";
    const now = Date.now();
    if (!force && cachedProposalData && now - lastProposalCacheTime < CACHE_TTL_MS) {
      return res.json({ success: true, table: cachedProposalData.table, cached: true });
    }
    const sheetId = "1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY";
    const gid = "169229004";
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
    const response = await fetch(targetUrl);
    if (!response.ok) {
      if (cachedProposalData) {
        return res.json({ success: true, table: cachedProposalData.table, cached: true, warning: "Stale cache" });
      }
      return res.status(502).json({ success: false, error: "Google Sheet returned " + response.status });
    }
    const text = await response.text();
    const jsonStr = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonStr);
    cachedProposalData = parsed;
    lastProposalCacheTime = now;
    res.json({ success: true, table: parsed.table, cached: false });
  } catch (err) {
    if (cachedProposalData) {
      return res.json({ success: true, table: cachedProposalData.table, cached: true });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});
var cachedSheetData = null;
var lastCacheTime = 0;
var CACHE_TTL_MS = 60 * 1e3;
var cachedTeachingData = null;
var lastTeachingCacheTime = 0;
var cachedIncidentData = null;
var lastIncidentCacheTime = 0;
var facilitySheetCache = /* @__PURE__ */ new Map();
app.get("/api/sheet-data", async (req, res) => {
  try {
    const now = Date.now();
    if (cachedSheetData && now - lastCacheTime < CACHE_TTL_MS) {
      return res.json({ success: true, data: cachedSheetData, cached: true });
    }
    const sheetId = "1If65m8-kv10fLlu9DSgvDJCJEpPBdGrieZ7tJ9aXgmo";
    const sheetName = encodeURIComponent("Zalo \u0111\xE1nh gi\xE1");
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${sheetName}&tqx=out:json&tq=select%20A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P`;
    const response = await fetch(targetUrl);
    const text = await response.text();
    const jsonStr = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonStr);
    cachedSheetData = parsed;
    lastCacheTime = now;
    res.json({ success: true, data: parsed, cached: false });
  } catch (err) {
    console.error("Error fetching sheet data:", err);
    if (cachedSheetData) {
      return res.json({ success: true, data: cachedSheetData, cached: true, warning: "Using stale cache" });
    }
    res.status(500).json({ success: false, error: err.message || "Kh\xF4ng th\u1EC3 t\u1EA3i Google Sheets" });
  }
});
app.get("/api/teaching-sheet-data", async (req, res) => {
  try {
    const force = req.query.force === "true";
    const now = Date.now();
    if (!force && cachedTeachingData && now - lastTeachingCacheTime < CACHE_TTL_MS) {
      return res.json({ success: true, data: cachedTeachingData, cached: true });
    }
    const sheetId = "1If65m8-kv10fLlu9DSgvDJCJEpPBdGrieZ7tJ9aXgmo";
    const gid = "282336280";
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?gid=${gid}&tqx=out:json`;
    const response = await fetch(targetUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Google Sheets GViz responded with HTTP ${response.status}`);
    }
    const text = await response.text();
    const jsonStr = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonStr);
    cachedTeachingData = { table: parsed.table };
    lastTeachingCacheTime = now;
    res.json({ success: true, data: cachedTeachingData, cached: false });
  } catch (err) {
    console.error("Error fetching teaching sheet data:", err);
    if (cachedTeachingData) {
      return res.json({ success: true, data: cachedTeachingData, cached: true, warning: "Using stale cache" });
    }
    res.status(500).json({ success: false, error: err.message || "Kh\xF4ng th\u1EC3 t\u1EA3i Google Sheets Gi\xE1m S\xE1t Gi\u1EA3ng D\u1EA1y" });
  }
});
app.get("/api/incident-data", async (req, res) => {
  try {
    const force = req.query.force === "true";
    const now = Date.now();
    if (!force && cachedIncidentData && now - lastIncidentCacheTime < CACHE_TTL_MS) {
      return res.json({ success: true, data: cachedIncidentData, cached: true });
    }
    const sheetId = "1If65m8-kv10fLlu9DSgvDJCJEpPBdGrieZ7tJ9aXgmo";
    const gid = "206722729";
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?gid=${gid}&tqx=out:json`;
    const response = await fetch(targetUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Google Sheets GViz responded with HTTP ${response.status}`);
    }
    const text = await response.text();
    const jsonStr = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonStr);
    cachedIncidentData = { table: parsed.table };
    lastIncidentCacheTime = now;
    res.json({ success: true, data: cachedIncidentData, cached: false });
  } catch (err) {
    console.error("Error fetching incident sheet data:", err);
    if (cachedIncidentData) {
      return res.json({ success: true, data: cachedIncidentData, cached: true, warning: "Using stale cache" });
    }
    res.status(500).json({ success: false, error: err.message || "Kh\xF4ng th\u1EC3 t\u1EA3i Google Sheets X\u1EED L\xFD \u0110\xE1nh Gi\xE1 \xCDt Sao" });
  }
});
app.get("/api/facility-sheet-data", async (req, res) => {
  try {
    const sheetId = "1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY";
    const allowedGids = /* @__PURE__ */ new Set(["0", "33769956", "1163313960"]);
    const gid = String(req.query.gid || "");
    const force = req.query.force === "true";
    if (!allowedGids.has(gid)) {
      return res.status(400).json({ success: false, error: "Google Sheet tab kh\xF4ng h\u1EE3p l\u1EC7" });
    }
    const cached = facilitySheetCache.get(gid);
    if (!force && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return res.json({ success: true, data: { csv: cached.csv }, cached: true });
    }
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(targetUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Google Sheets CSV responded with HTTP ${response.status}`);
    }
    const csv = await response.text();
    if (!csv || csv.includes("<!DOCTYPE html>")) {
      throw new Error("Google Sheets CSV kh\xF4ng kh\u1EA3 d\u1EE5ng ho\u1EB7c c\u1EA7n quy\u1EC1n truy c\u1EADp");
    }
    facilitySheetCache.set(gid, { csv, cachedAt: Date.now() });
    res.json({ success: true, data: { csv }, cached: false });
  } catch (err) {
    const gid = String(req.query.gid || "");
    const cached = facilitySheetCache.get(gid);
    if (cached) {
      return res.json({
        success: true,
        data: { csv: cached.csv },
        cached: true,
        warning: "Using stale cache"
      });
    }
    res.status(500).json({
      success: false,
      error: err.message || "Kh\xF4ng th\u1EC3 t\u1EA3i d\u1EEF li\u1EC7u Gi\xE1m s\xE1t V\u1EC7 sinh"
    });
  }
});
var cachedWarningRemindersCsv = "";
var lastWarningRemindersCacheTime = 0;
app.get("/api/warning-reminders-data", async (req, res) => {
  try {
    const force = req.query.force === "true";
    const now = Date.now();
    if (!force && cachedWarningRemindersCsv && now - lastWarningRemindersCacheTime < 3e4) {
      return res.json({ success: true, data: { csv: cachedWarningRemindersCsv }, cached: true });
    }
    const sheetId = "1003lfdUh6S_Tkg5H4qChw7KrziAon1uvgkoFMj9FK0E";
    const gid = "1091093608";
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(targetUrl, { cache: "no-store", signal: AbortSignal.timeout(15e3) });
    if (!response.ok) {
      throw new Error(`Google Sheets CSV responded with HTTP ${response.status}`);
    }
    const csv = await response.text();
    if (!csv || csv.includes("<!DOCTYPE html>") || csv.includes("accounts.google.com")) {
      throw new Error("Google Sheets CSV kh\xF4ng kh\u1EA3 d\u1EE5ng ho\u1EB7c c\u1EA7n quy\u1EC1n truy c\u1EADp");
    }
    cachedWarningRemindersCsv = csv;
    lastWarningRemindersCacheTime = now;
    res.json({ success: true, data: { csv }, cached: false });
  } catch (err) {
    if (cachedWarningRemindersCsv) {
      return res.json({ success: true, data: { csv: cachedWarningRemindersCsv }, cached: true, warning: "Stale cache" });
    }
    res.status(500).json({ success: false, error: err.message || "Kh\xF4ng th\u1EC3 t\u1EA3i d\u1EEF li\u1EC7u sheet nh\u1EAFc nh\u1EDF" });
  }
});
var CLASSROOM_SPREADSHEET_ID = "1wmBYcZCjOCWWvcv2mxeATVxphawbpkUaPIRICj3XgsE";
app.get("/api/all-sheets", (req, res) => {
  const jsonPath = path.resolve(process.cwd(), "public/data/all_sheets.json");
  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ error: "File not found" });
  }
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return res.sendFile(jsonPath);
});
app.get("/api/live-sheet", async (req, res) => {
  const gid = req.query.gid;
  const spreadsheetId = req.query.spreadsheetId || CLASSROOM_SPREADSHEET_ID;
  if (!gid) {
    return res.status(400).json({ error: "Missing gid parameter" });
  }
  try {
    const targetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}&t=${Date.now()}`;
    const response = await fetch(targetUrl, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "User-Agent": "Mozilla/5.0"
      }
    });
    if (!response.ok) {
      throw new Error(`Google Sheet returned HTTP ${response.status}`);
    }
    const csvData = await response.text();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.send(csvData);
  } catch (err) {
    console.error(`L\u1ED7i t\u1EA3i live sheet GID ${gid}:`, err.message);
    return res.status(502).json({ error: err.message });
  }
});
app.all("/api/sync-all", async (req, res) => {
  const jsonPath = path.resolve(process.cwd(), "public/data/all_sheets.json");
  try {
    if (!fs.existsSync(jsonPath)) {
      return res.status(404).json({ error: "Data file not found" });
    }
    const raw = fs.readFileSync(jsonPath, "utf8");
    const data = JSON.parse(raw);
    const gids = Object.keys(data.sheets || {});
    await Promise.all(
      gids.map(async (gid) => {
        try {
          const targetUrl = `https://docs.google.com/spreadsheets/d/${CLASSROOM_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}&t=${Date.now()}`;
          const response = await fetch(targetUrl, {
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache",
              "User-Agent": "Mozilla/5.0"
            }
          });
          if (response.ok) {
            const csv = await response.text();
            if (csv && csv.length > 20) {
              const parsed = Papa.parse(csv, { skipEmptyLines: true });
              if (parsed.data && parsed.data.length > 0) {
                data.sheets[gid].rows = parsed.data;
              }
            }
          }
        } catch (e) {
          console.warn(`L\u1ED7i sync gid ${gid}:`, e.message);
        }
      })
    );
    data.exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.json(data);
  } catch (err) {
    console.error("L\u1ED7i sync-all:", err.message);
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/ai-insights", async (req, res) => {
  try {
    const { metricsData, prompt, question, mode } = req.body;
    const ai = getGeminiClient();
    let systemInstruction = `B\u1EA1n l\xE0 Tr\u01B0\u1EDFng ban Gi\xE1m s\xE1t & Qu\u1EA3n l\xFD Ch\u1EA5t l\u01B0\u1EE3ng Gi\xE1o d\u1EE5c h\xE0ng \u0111\u1EA7u t\u1EA1i H\u1EC7 th\u1ED1ng \u0110\xE0o t\u1EA1o C\u1EDD Vua & M\u1EF9 Thu\u1EADt S\xE0i G\xF2n.
Nhi\u1EC7m v\u1EE5 c\u1EE7a b\u1EA1n l\xE0 ph\xE2n t\xEDch c\xE1c ch\u1EC9 s\u1ED1 \u0111\xE1nh gi\xE1 ch\u1EA5t l\u01B0\u1EE3ng gi\u1EA3ng d\u1EA1y t\u1EEB camera / d\u1EF1 gi\u1EDD, t\u1EF7 l\u1EC7 tu\xE2n th\u1EE7 6 ti\xEAu ch\xED (\u0110\u1ED3ng ph\u1EE5c/T\xE1c phong, 15 ph\xFAt \u0111\u1EA7u gi\u1EDD, Qu\u1EA3n l\xFD l\u1EDBp h\u1ECDc, Giao ca, Thi\u1EBFt b\u1ECB \u0111i\u1EC7n t\u1EED, K\u1EBFt ca), ph\xE2n t\xEDch c\u01A1 c\u1EA5u l\u1ED7i vi ph\u1EA1m theo c\u01A1 s\u1EDF, m\xF4n h\u1ECDc v\xE0 b\u1EADc gi\xE1o vi\xEAn.
\u0110\u01B0a ra nh\u1EADn x\xE9t s\xE2u s\u1EAFc, ph\xE1t hi\u1EC7n c\xE1c \u0111i\u1EC3m ngh\u1EBDn nghi\xEAm tr\u1ECDng, nguy\xEAn nh\xE2n g\u1ED1c r\u1EC5 (Root Cause) v\xE0 khuy\u1EBFn ngh\u1ECB c\xE1c gi\u1EA3i ph\xE1p h\xE0nh \u0111\u1ED9ng PDCA (Plan - Do - Check - Act) thi\u1EBFt th\u1EF1c, chi ti\u1EBFt b\u1EB1ng ti\u1EBFng Vi\u1EC7t chu\u1EA9n m\u1EF1c, chuy\xEAn nghi\u1EC7p.
Tr\xECnh b\xE0y r\xF5 r\xE0ng v\u1EDBi s\u1ED1 li\u1EC7u minh ch\u1EE9ng, \u0111\u1ECBnh d\u1EA1ng Markdown \u0111\u1EB9p m\u1EAFt, ph\xE2n m\u1EE5c r\xE0nh m\u1EA1ch.`;
    if (mode === "customer_feedback") {
      systemInstruction = `B\u1EA1n l\xE0 Chuy\xEAn gia Qu\u1EA3n l\xFD Tr\u1EA3i nghi\u1EC7m Kh\xE1ch h\xE0ng & Ch\u1EA5t l\u01B0\u1EE3ng D\u1ECBch v\u1EE5 (CSAT/NPS) t\u1EA1i H\u1EC7 th\u1ED1ng \u0110\xE0o t\u1EA1o C\u1EDD Vua & M\u1EF9 Thu\u1EADt.
Nhi\u1EC7m v\u1EE5 c\u1EE7a b\u1EA1n l\xE0 ph\xE2n t\xEDch d\u1EEF li\u1EC7u ph\u1EA3n h\u1ED3i, \u0111\xE1nh gi\xE1 sao c\u1EE7a ph\u1EE5 huynh h\u1ECDc sinh qua k\xEAnh Zalo, ph\xE2n t\xEDch \u0111i\u1EC3m m\u1EA1nh v\xE0 \u0111i\u1EC3m c\u1EA7n c\u1EA3i thi\u1EC7n c\u1EE7a t\u1EEBng c\u01A1 s\u1EDF v\xE0 b\u1ED9 m\xF4n, \u0111\u1EC1 xu\u1EA5t c\xE1c gi\u1EA3i ph\xE1p n\xE2ng cao s\u1EF1 h\xE0i l\xF2ng c\u1EE7a ph\u1EE5 huynh.`;
    }
    const userMessage = question ? `D\u1EF1a tr\xEAn d\u1EEF li\u1EC7u gi\xE1m s\xE1t sau \u0111\xE2y:
${JSON.stringify(metricsData, null, 2)}

H\xE3y tr\u1EA3 l\u1EDDi c\xE2u h\u1ECFi c\u1EE7a Qu\u1EA3n l\xFD Ch\u1EA5t l\u01B0\u1EE3ng:
"${question}"` : `D\u1EF1a tr\xEAn d\u1EEF li\u1EC7u t\u1ED5ng h\u1EE3p sau \u0111\xE2y:
${JSON.stringify(metricsData, null, 2)}

${prompt || "H\xE3y ph\xE2n t\xEDch t\u1ED5ng quan ch\u1EA5t l\u01B0\u1EE3ng gi\u1EA3ng d\u1EA1y, ch\u1EC9 ra 3 \u0111i\u1EC3m s\xE1ng, 3 \u0111i\u1EC3m vi ph\u1EA1m ph\u1ED5 bi\u1EBFn c\u1EA7n kh\u1EAFc ph\u1EE5c ngay, v\xE0 k\u1EBF ho\u1EA1ch \u0111\xE0o t\u1EA1o/h\xE0nh \u0111\u1ED9ng kh\u1EAFc ph\u1EE5c trong 14 ng\xE0y t\u1EDBi."}`;
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.6
      }
    });
    res.json({
      success: true,
      analysis: response.text,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Error generating AI insights:", error);
    res.status(500).json({
      success: false,
      error: error.message || "L\u1ED7i x\u1EED l\xFD ph\xE2n t\xEDch AI"
    });
  }
});
var imageReviewStore = /* @__PURE__ */ new Map();
app.get("/api/image-reviews", (req, res) => {
  const date = String(req.query.date || "");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, error: "Ng\xE0y tra c\u1EE9u kh\xF4ng h\u1EE3p l\u1EC7." });
  }
  const prefix = `reviews/${date}/`;
  const records = [];
  for (const [key, val] of imageReviewStore.entries()) {
    if (key.startsWith(prefix)) {
      records.push(val);
    }
  }
  records.sort((a, b) => String(a.coSo).localeCompare(String(b.coSo), "vi"));
  res.json({ success: true, date, records, count: records.length });
});
var DEFAULT_NEW_SHEET_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxmPSQdqrO2UCdWl6O_s6B9ALfqMboeyo3qBhu1EMqdUZ7FpW6opiVSkmbgGB8Uc2OQ/exec";
var configuredNewSheetScriptUrl = process.env.NEW_SHEET_APPS_SCRIPT_URL || DEFAULT_NEW_SHEET_APPS_SCRIPT_URL;
app.post("/api/image-reviews", async (req, res) => {
  try {
    const payload = req.body;
    const targetScriptUrl = (payload?.scriptUrl || configuredNewSheetScriptUrl || process.env.NEW_SHEET_APPS_SCRIPT_URL || process.env.WARNING_APPS_SCRIPT_URL || DEFAULT_NEW_SHEET_APPS_SCRIPT_URL).trim();
    if (payload?.action === "batch_upsert") {
      const inputRecords = Array.isArray(payload.records) ? payload.records : [];
      const savedList = [];
      const updatesForSheet = [];
      const now2 = (/* @__PURE__ */ new Date()).toISOString();
      for (const rec of inputRecords) {
        const id2 = typeof rec?.id === "string" ? rec.id.trim().slice(0, 240) : "";
        const date2 = rec?.ngay;
        const facility2 = typeof rec?.coSo === "string" ? rec.coSo.trim().slice(0, 160) : "";
        const imageUrl2 = typeof rec?.linkAnh === "string" ? rec.linkAnh.trim().slice(0, 3e3) : "";
        const reviewer2 = typeof rec?.nguoiKiemDuyet === "string" ? rec.nguoiKiemDuyet.trim().slice(0, 160) : "";
        const reviewStatus2 = rec?.reviewStatus || "pending";
        if (!id2 || !date2 || !facility2) continue;
        const revTime2 = rec.thoiGianKiemDuyet ? new Date(rec.thoiGianKiemDuyet).toLocaleString("vi-VN") : "";
        const revNote2 = reviewer2 ? revTime2 ? `${reviewer2} (${revTime2})` : reviewer2 : "";
        const saved = {
          id: id2,
          reportId: rec.reportId || "",
          rowIndex: rec.rowIndex,
          ngay: date2,
          gio: rec.gio || "",
          coSo: facility2,
          khuVuc: rec.khuVuc || "",
          linkAnh: imageUrl2,
          nguoiBaoCao: rec.nguoiBaoCao || "",
          reviewed: reviewStatus2 === "approved",
          reviewStatus: reviewStatus2,
          trangThaiKiemDuyet: reviewStatus2 === "approved" ? "\u0110\xE3 duy\u1EC7t" : reviewStatus2 === "rejected" ? "Kh\xF4ng \u0111\u1EA1t" : "Ch\u01B0a duy\u1EC7t",
          nguoiKiemDuyet: reviewer2,
          thoiGianKiemDuyet: rec.thoiGianKiemDuyet || now2,
          updatedAt: now2,
          syncedToSheet: true
        };
        imageReviewStore.set(`reviews/${date2}/${encodeURIComponent(id2)}`, saved);
        savedList.push(saved);
        updatesForSheet.push({
          linkAnh: imageUrl2,
          ngay: date2,
          gio: rec.gio || "",
          coSo: facility2,
          khuVuc: rec.khuVuc || "",
          daDuyet: reviewStatus2 === "approved" ? revNote2 || reviewer2 || "\u0110\xE3 duy\u1EC7t" : "",
          khongDat: reviewStatus2 === "rejected" ? revNote2 || reviewer2 || "Kh\xF4ng \u0111\u1EA1t" : "",
          reviewStatus: reviewStatus2,
          reviewer: reviewer2
        });
      }
      let syncWarning2 = "";
      if (targetScriptUrl && updatesForSheet.length > 0) {
        try {
          const syncResp = await fetch(targetScriptUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              action: "batch_update_image_reviews",
              updates: updatesForSheet
            }),
            signal: AbortSignal.timeout(2e4)
          });
          const syncJson = await syncResp.json().catch(() => null);
          if (!syncResp.ok || !syncJson?.success && syncJson?.status !== "ok") {
            syncWarning2 = syncJson?.error || `Google Sheet API HTTP ${syncResp.status}`;
          }
        } catch (err) {
          syncWarning2 = err.message || "L\u1ED7i k\u1EBFt n\u1ED1i Google Sheet";
        }
      }
      return res.json({ success: true, records: savedList, warning: syncWarning2 || void 0 });
    }
    if (payload?.action !== "upsert") {
      return res.status(400).json({ success: false, error: "Thao t\xE1c kh\xF4ng h\u1EE3p l\u1EC7." });
    }
    const record = payload.record;
    const id = typeof record?.id === "string" ? record.id.trim().slice(0, 240) : "";
    const date = record?.ngay;
    const facility = typeof record?.coSo === "string" ? record.coSo.trim().slice(0, 160) : "";
    const imageUrl = typeof record?.linkAnh === "string" ? record.linkAnh.trim().slice(0, 3e3) : "";
    const reviewer = typeof record?.nguoiKiemDuyet === "string" ? record.nguoiKiemDuyet.trim().slice(0, 160) : "";
    const reviewStatus = record?.reviewStatus || (record?.reviewed === true ? "approved" : "pending");
    const reviewed = reviewStatus === "approved";
    if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !facility || !imageUrl.startsWith("http")) {
      return res.status(400).json({ success: false, error: "D\u1EEF li\u1EC7u ki\u1EC3m duy\u1EC7t \u1EA3nh kh\xF4ng h\u1EE3p l\u1EC7." });
    }
    if (!["pending", "approved", "rejected"].includes(reviewStatus)) {
      return res.status(400).json({ success: false, error: "Tr\u1EA1ng th\xE1i ki\u1EC3m duy\u1EC7t \u1EA3nh kh\xF4ng h\u1EE3p l\u1EC7." });
    }
    if (reviewStatus !== "pending" && !reviewer) {
      return res.status(400).json({ success: false, error: "Vui l\xF2ng nh\u1EADp t\xEAn ng\u01B0\u1EDDi ki\u1EC3m duy\u1EC7t." });
    }
    const rowIndex = typeof record?.rowIndex === "number" ? record.rowIndex : void 0;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const revTime = record?.thoiGianKiemDuyet ? new Date(record.thoiGianKiemDuyet).toLocaleString("vi-VN") : (/* @__PURE__ */ new Date()).toLocaleString("vi-VN");
    const revNote = reviewer ? `${reviewer} (${revTime})` : "";
    const savedRecord = {
      id,
      reportId: record.reportId || "",
      rowIndex,
      ngay: date,
      gio: record.gio || "",
      coSo: facility,
      khuVuc: record.khuVuc || "",
      linkAnh: imageUrl,
      nguoiBaoCao: record.nguoiBaoCao || "",
      reviewed,
      reviewStatus,
      trangThaiKiemDuyet: reviewStatus === "approved" ? "\u0110\xE3 duy\u1EC7t" : reviewStatus === "rejected" ? "Kh\xF4ng \u0111\u1EA1t" : "Ch\u01B0a duy\u1EC7t",
      nguoiKiemDuyet: reviewer,
      thoiGianKiemDuyet: record.thoiGianKiemDuyet || now,
      updatedAt: now,
      syncedToSheet: true
    };
    let syncWarning = "";
    if (targetScriptUrl) {
      try {
        const syncResp = await fetch(targetScriptUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "upsert_image_review",
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
            daDuyet: savedRecord.reviewStatus === "approved" ? revNote || savedRecord.nguoiKiemDuyet || "\u0110\xE3 duy\u1EC7t" : "",
            khongDat: savedRecord.reviewStatus === "rejected" ? revNote || savedRecord.nguoiKiemDuyet || "Kh\xF4ng \u0111\u1EA1t" : ""
          }),
          signal: AbortSignal.timeout(15e3)
        });
        const syncJson = await syncResp.json().catch(() => null);
        if (syncResp.ok && (syncJson?.success || syncJson?.status === "ok")) {
          savedRecord.syncedToSheet = true;
        } else {
          syncWarning = syncJson?.error || `Google Sheet API HTTP ${syncResp.status}`;
          savedRecord.syncError = syncWarning;
        }
      } catch (err) {
        syncWarning = err.message || "L\u1ED7i \u0111\u1ED3ng b\u1ED9 Google Sheet";
        savedRecord.syncError = syncWarning;
      }
    } else {
      savedRecord.syncedToSheet = true;
      syncWarning = "";
    }
    imageReviewStore.set(`reviews/${date}/${encodeURIComponent(id)}`, savedRecord);
    res.json({ success: true, record: savedRecord, warning: syncWarning || void 0 });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "L\u1ED7i m\xE1y ch\u1EE7" });
  }
});
var autoSyncLogs = [];
var lastAutoSyncDate = "";
function getVietnamYesterdayDates() {
  const now = /* @__PURE__ */ new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 6e4;
  const vnNow = new Date(utc + 7 * 3600 * 1e3);
  const vnYesterday = new Date(vnNow.getTime() - 24 * 3600 * 1e3);
  const y = vnYesterday.getFullYear();
  const m = String(vnYesterday.getMonth() + 1).padStart(2, "0");
  const d = String(vnYesterday.getDate()).padStart(2, "0");
  const iso = `${y}-${m}-${d}`;
  const dmy = `${d}/${m}/${y}`;
  const dmyNoLeading = `${vnYesterday.getDate()}/${vnYesterday.getMonth() + 1}/${y}`;
  return { iso, dmy, dmyNoLeading };
}
async function runDailyHygieneSync(targetDateIso, targetUrl) {
  const dates = getVietnamYesterdayDates();
  const dateIso = targetDateIso || dates.iso;
  const scriptUrl = (targetUrl || configuredNewSheetScriptUrl || process.env.NEW_SHEET_APPS_SCRIPT_URL || process.env.WARNING_APPS_SCRIPT_URL || "").trim();
  if (!scriptUrl) {
    const errorMsg = "Ch\u01B0a c\u1EA5u h\xECnh \u0111\u01B0\u1EDDng d\u1EABn Web App Google Apps Script c\u1EE7a Sheet M\u1EDBi";
    autoSyncLogs.unshift({
      id: `log-${Date.now()}`,
      date: dateIso,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      count: 0,
      status: "error",
      message: errorMsg
    });
    return { success: false, error: errorMsg };
  }
  try {
    const sourceUrl = "https://docs.google.com/spreadsheets/d/1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY/export?format=csv&gid=0";
    const resp = await fetch(sourceUrl, { cache: "no-store" });
    if (!resp.ok) {
      throw new Error(`Kh\xF4ng th\u1EC3 t\u1EA3i d\u1EEF li\u1EC7u Sheet g\u1ED1c: HTTP ${resp.status}`);
    }
    const csvText = await resp.text();
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const rows = parsed.data || [];
    const getClean = (row, keys) => {
      for (const k of keys) {
        if (row[k] !== void 0 && row[k] !== null && String(row[k]).trim() !== "") return String(row[k]).trim();
      }
      for (const col of Object.keys(row)) {
        const norm = col.trim().toLowerCase();
        for (const k of keys) {
          if (norm === k.trim().toLowerCase()) return String(row[col] || "").trim();
        }
      }
      return "";
    };
    const matchedRecords = [];
    rows.forEach((row, idx) => {
      const rawDate = getClean(row, ["Ng\xE0y", "NG\xC0Y", "Date"]) || "";
      let rowDateIso = "";
      if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        rowDateIso = rawDate.slice(0, 10);
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(rawDate)) {
        const parts = rawDate.split("/");
        const day = parts[0].padStart(2, "0");
        const mon = parts[1].padStart(2, "0");
        rowDateIso = `${parts[2]}-${mon}-${day}`;
      }
      const matchDate = rowDateIso === dateIso || rawDate === dates.dmy || rawDate === dates.dmyNoLeading || rawDate.startsWith(dateIso);
      if (!matchDate) {
        return;
      }
      const gio = getClean(row, ["Gi\u1EDD", "GI\u1EDC", "Time"]) || "";
      const nguoiKiemTra = getClean(row, ["Ng\u01B0\u1EDDi ki\u1EC3m tra", "NG\u01AF\u1EDCI KI\u1EC2M TRA", "Inspector"]) || "";
      const coSo = getClean(row, ["C\u01A1 s\u1EDF", "C\u01A0 S\u1EDE", "Facility"]) || "";
      const khuVuc = getClean(row, ["Khu v\u1EF1c", "KHU V\u1EF0C", "Area"]) || "";
      const trangThai = getClean(row, ["Tr\u1EA1ng th\xE1i", "TR\u1EA0NG TH\xC1I", "Status"]) || "\u0110\u1EA1t";
      const diemSo = getClean(row, ["\u0110i\u1EC3m s\u1ED1", "\u0110i\u1EC3m", "\u0110I\u1EC2M S\u1ED0", "Score"]) || "";
      const chiTiet = getClean(row, ["Chi ti\u1EBFt", "CHI TI\u1EBET", "Detail"]) || "";
      const phanHoi = getClean(row, ["Ph\u1EA3n h\u1ED3i", "PH\u1EA2N H\u1ED2I", "Response"]) || "";
      const feedbackNguoiDung = getClean(row, ["Feedback t\u1EEB ng\u01B0\u1EDDi d\xF9ng", "FEEDBACK T\u1EEA NG\u01AF\u1EDCI D\xD9NG", "Feedback"]) || "";
      const linkAnh = getClean(row, ["Link \u1EA3nh", "LINK \u1EA2NH", "Image"]) || "";
      let daDuyet = getClean(row, ["\u0110\xE3 duy\u1EC7t", "\u0110\xC3 DUY\u1EC6T", "Approved", "\u0110\xE3 Duy\u1EC7t", "\u0110\u1EA1t"]) || "";
      let khongDat = getClean(row, ["Kh\xF4ng \u0111\u1EA1t", "KH\xD4NG \u0110\u1EA0T", "Rejected", "Kh\xF4ng \u0110\u1EA1t"]) || "";
      const reviewKey = `reviews/${dateIso}/${encodeURIComponent(`sheet-hyg-${idx + 1}`)}`;
      const savedReview = imageReviewStore.get(reviewKey);
      if (savedReview) {
        const revTime = savedReview.thoiGianKiemDuyet ? new Date(savedReview.thoiGianKiemDuyet).toLocaleString("vi-VN") : "";
        const revNote = savedReview.nguoiKiemDuyet ? revTime ? `${savedReview.nguoiKiemDuyet} (${revTime})` : savedReview.nguoiKiemDuyet : "";
        if (savedReview.reviewStatus === "approved") {
          daDuyet = revNote || "\u0110\xE3 duy\u1EC7t";
          khongDat = "";
        } else if (savedReview.reviewStatus === "rejected") {
          khongDat = revNote || "Kh\xF4ng \u0111\u1EA1t";
          daDuyet = "";
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
        khongDat
      });
    });
    if (matchedRecords.length === 0) {
      const msg = `Kh\xF4ng t\xECm th\u1EA5y b\u1EA3n ghi v\u1EC7 sinh n\xE0o trong ng\xE0y ${dateIso} t\u1EEB Sheet g\u1ED1c.`;
      autoSyncLogs.unshift({
        id: `log-${Date.now()}`,
        date: dateIso,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        count: 0,
        status: "error",
        message: msg
      });
      return { success: false, error: msg, count: 0 };
    }
    const syncResp = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sync_full_day_hygiene_reviews",
        date: dateIso,
        count: matchedRecords.length,
        records: matchedRecords,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      signal: AbortSignal.timeout(3e4)
    });
    const syncJson = await syncResp.json().catch(() => null);
    if (syncResp.ok && (syncJson?.success || syncJson?.status === "ok")) {
      const successMsg = `\u0110\xE3 t\u1EF1 \u0111\u1ED9ng \u0111\u1ED5 ${matchedRecords.length} d\xF2ng ng\xE0y ${dateIso} sang Sheet M\u1EDBi th\xE0nh c\xF4ng!`;
      autoSyncLogs.unshift({
        id: `log-${Date.now()}`,
        date: dateIso,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        count: matchedRecords.length,
        status: "success",
        message: successMsg
      });
      if (autoSyncLogs.length > 50) autoSyncLogs.pop();
      return { success: true, message: successMsg, count: matchedRecords.length };
    } else {
      const errDetail = syncJson?.error || `Google Apps Script HTTP ${syncResp.status}`;
      autoSyncLogs.unshift({
        id: `log-${Date.now()}`,
        date: dateIso,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        count: matchedRecords.length,
        status: "error",
        message: errDetail
      });
      return { success: false, error: errDetail };
    }
  } catch (err) {
    const errDetail = err.message || "L\u1ED7i k\u1EBFt n\u1ED1i";
    autoSyncLogs.unshift({
      id: `log-${Date.now()}`,
      date: dateIso,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      count: 0,
      status: "error",
      message: errDetail
    });
    return { success: false, error: errDetail };
  }
}
setInterval(async () => {
  try {
    const dates = getVietnamYesterdayDates();
    if (lastAutoSyncDate !== dates.iso) {
      const scriptUrl = configuredNewSheetScriptUrl || process.env.NEW_SHEET_APPS_SCRIPT_URL || process.env.WARNING_APPS_SCRIPT_URL || DEFAULT_NEW_SHEET_APPS_SCRIPT_URL;
      if (scriptUrl) {
        console.log(`[Auto-Sync Scheduler] B\u1EAFt \u0111\u1EA7u t\u1EF1 \u0111\u1ED9ng \u0111\u1ED5 d\u1EEF li\u1EC7u ng\xE0y ${dates.iso} sang Sheet M\u1EDBi...`);
        const result = await runDailyHygieneSync(dates.iso, scriptUrl);
        if (result.success) {
          lastAutoSyncDate = dates.iso;
          console.log(`[Auto-Sync Scheduler] Ho\xE0n t\u1EA5t t\u1EF1 \u0111\u1ED9ng \u0111\u1ED5 ng\xE0y ${dates.iso}:`, result.message);
        } else {
          console.warn(`[Auto-Sync Scheduler] Th\u1EED \u0111\u1ED5 ng\xE0y ${dates.iso} ch\u01B0a th\xE0nh c\xF4ng:`, result.error);
        }
      }
    }
  } catch (err) {
    console.error("[Auto-Sync Scheduler] L\u1ED7i trong scheduler:", err);
  }
}, 15 * 60 * 1e3);
setTimeout(async () => {
  try {
    const dates = getVietnamYesterdayDates();
    const scriptUrl = configuredNewSheetScriptUrl || process.env.NEW_SHEET_APPS_SCRIPT_URL || process.env.WARNING_APPS_SCRIPT_URL || DEFAULT_NEW_SHEET_APPS_SCRIPT_URL;
    if (scriptUrl) {
      console.log(`[Auto-Sync Boot] T\u1EF1 \u0111\u1ED9ng ki\u1EC3m tra v\xE0 \u0111\u1ED5 d\u1EEF li\u1EC7u ng\xE0y h\xF4m tr\u01B0\u1EDBc ${dates.iso} sang Sheet M\u1EDBi...`);
      const result = await runDailyHygieneSync(dates.iso, scriptUrl);
      if (result.success) {
        lastAutoSyncDate = dates.iso;
        console.log(`[Auto-Sync Boot] Th\xE0nh c\xF4ng \u0111\u1ED5 ng\xE0y ${dates.iso}:`, result.message);
      }
    }
  } catch (err) {
    console.warn("[Auto-Sync Boot] L\u1ED7i ch\u1EA1y t\u1EF1 \u0111\u1ED9ng:", err);
  }
}, 3e3);
app.get("/api/auto-sync-status", (req, res) => {
  const dates = getVietnamYesterdayDates();
  const effectiveUrl = configuredNewSheetScriptUrl || process.env.NEW_SHEET_APPS_SCRIPT_URL || process.env.WARNING_APPS_SCRIPT_URL || "";
  res.json({
    success: true,
    enabled: Boolean(effectiveUrl),
    configuredUrl: effectiveUrl ? effectiveUrl.slice(0, 35) + "..." : "",
    hasFullUrl: Boolean(effectiveUrl),
    targetYesterdayDate: dates.iso,
    lastAutoSyncDate,
    recentLogs: autoSyncLogs.slice(0, 10),
    scheduleInfo: "T\u1EF1 \u0111\u1ED9ng ki\u1EC3m tra v\xE0 \u0111\u1ED5 d\u1EEF li\u1EC7u l\xFAc 01:00 AM m\u1ED7i ng\xE0y (Gi\u1EDD Vi\u1EC7t Nam)"
  });
});
app.post("/api/auto-sync-config", (req, res) => {
  const { scriptUrl } = req.body;
  if (typeof scriptUrl === "string") {
    configuredNewSheetScriptUrl = scriptUrl.trim();
  }
  res.json({
    success: true,
    configured: Boolean(configuredNewSheetScriptUrl),
    message: configuredNewSheetScriptUrl ? "\u0110\xE3 l\u01B0u c\u1EA5u h\xECnh t\u1EF1 \u0111\u1ED9ng \u0111\u1ED5 d\u1EEF li\u1EC7u h\xE0ng ng\xE0y" : "\u0110\xE3 x\xF3a c\u1EA5u h\xECnh"
  });
});
app.post("/api/trigger-daily-sync", async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "L\u1ED7i k\xEDch ho\u1EA1t t\u1EF1 \u0111\u1ED9ng \u0111\u1ED5 d\u1EEF li\u1EC7u" });
  }
});
app.post("/api/sync-day-to-new-sheet", async (req, res) => {
  try {
    const { date, scriptUrl, records } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ success: false, error: "Thi\u1EBFu th\xF4ng tin ng\xE0y ho\u1EB7c danh s\xE1ch b\u1EA3n ghi." });
    }
    const targetUrl = scriptUrl || configuredNewSheetScriptUrl || process.env.NEW_SHEET_APPS_SCRIPT_URL || process.env.WARNING_APPS_SCRIPT_URL || DEFAULT_NEW_SHEET_APPS_SCRIPT_URL;
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: "Ch\u01B0a c\u1EA5u h\xECnh URL Google Apps Script c\u1EE7a Sheet m\u1EDBi. Vui l\xF2ng d\xE1n link Web App c\u1EE7a Sheet m\u1EDBi."
      });
    }
    const syncResp = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sync_full_day_hygiene_reviews",
        date,
        count: records.length,
        records,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      signal: AbortSignal.timeout(3e4)
    });
    const syncJson = await syncResp.json().catch(() => null);
    if (syncResp.ok && (syncJson?.success || syncJson?.status === "ok")) {
      return res.json({
        success: true,
        message: syncJson?.message || `\u0110\xE3 ghi nh\u1EADn th\xE0nh c\xF4ng ${records.length} d\xF2ng sang Sheet m\u1EDBi.`,
        syncedCount: records.length
      });
    } else {
      return res.status(502).json({
        success: false,
        error: syncJson?.error || `L\u1ED7i ph\u1EA3n h\u1ED3i t\u1EEB Google Apps Script (HTTP ${syncResp.status})`
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "L\u1ED7i x\u1EED l\xFD k\u1EBFt n\u1ED1i Google Sheet" });
  }
});
app.post("/api/sync-warnings-to-sheet", async (req, res) => {
  try {
    const { date, scriptUrl, records } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ success: false, error: "Thi\u1EBFu th\xF4ng tin ng\xE0y ho\u1EB7c danh s\xE1ch b\u1EA3n ghi c\u1EA3nh b\xE1o." });
    }
    const targetUrl = scriptUrl || configuredNewSheetScriptUrl || process.env.NEW_SHEET_APPS_SCRIPT_URL || process.env.WARNING_APPS_SCRIPT_URL;
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: "Ch\u01B0a c\u1EA5u h\xECnh URL Google Apps Script c\u1EE7a Sheet m\u1EDBi."
      });
    }
    const syncResp = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sync_warnings",
        sheetName: "nh\u1EAFc nh\u1EDF",
        date,
        count: records.length,
        records,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      signal: AbortSignal.timeout(3e4)
    });
    const respText = await syncResp.text().catch(() => "");
    let syncJson = null;
    if (respText) {
      try {
        syncJson = JSON.parse(respText);
      } catch {
        if (respText.includes("Page not found") || respText.includes("unable to open the file") || respText.includes("accounts.google.com")) {
          return res.status(502).json({
            success: false,
            error: "Link Web App Google Apps Script ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5p quy\u1EC1n c\xF4ng khai. Vui l\xF2ng v\xE0o Apps Script > 'Tri\u1EC3n khai m\u1EDBi' > ch\u1ECDn 'Ng\u01B0\u1EDDi c\xF3 quy\u1EC1n truy c\u1EADp' l\xE0 'B\u1EA5t k\u1EF3 ai' (Anyone)."
          });
        }
      }
    }
    if (syncResp.ok && (syncJson?.success || syncJson?.status === "ok")) {
      return res.json({
        success: true,
        message: syncJson?.message || `\u0110\xE3 \u0111\u1ED5 th\xE0nh c\xF4ng ${records.length} c\u01A1 s\u1EDF c\u1EA3nh b\xE1o sang sheet "nh\u1EAFc nh\u1EDF"!`,
        syncedCount: records.length,
        totalRows: syncJson?.totalRows
      });
    } else {
      return res.status(502).json({
        success: false,
        error: syncJson?.error || `L\u1ED7i ph\u1EA3n h\u1ED3i t\u1EEB Google Apps Script (HTTP ${syncResp.status})`
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "L\u1ED7i x\u1EED l\xFD k\u1EBFt n\u1ED1i Google Sheet" });
  }
});
var warningAuditStore = /* @__PURE__ */ new Map();
var getWarningKey = (date, facility) => `audits/${date}/${encodeURIComponent(facility.normalize("NFC"))}`;
function buildWarningRecord(record, previousRecord, preferredStatus) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rawStatus = preferredStatus ?? record?.loaiTrangThai;
  const status = ["chua_xu_ly", "da_nhac_nho", "loi_app"].includes(rawStatus) ? rawStatus : "chua_xu_ly";
  const reasons = (typeof record?.lyDoCanhBao === "string" ? record.lyDoCanhBao.trim() : "") || (previousRecord?.lyDoCanhBao || "");
  const reasonCount = Number(record?.soLuotCanhBao);
  const savedReasonCount = Number(previousRecord?.soLuotCanhBao);
  const soLuotCanhBao = Number.isFinite(reasonCount) && reasonCount > 0 ? Math.min(50, Math.floor(reasonCount)) : Number.isFinite(savedReasonCount) && savedReasonCount > 0 ? Math.min(50, Math.floor(savedReasonCount)) : Math.max(1, reasons.split(";").filter(Boolean).length);
  return {
    id: `${record?.coSo || ""}_${record?.ngay || ""}`,
    coSo: record?.coSo || "",
    ngay: record?.ngay || "",
    soLuotCanhBao,
    lyDoCanhBao: reasons,
    daNhacNho: status === "da_nhac_nho",
    loiApp: status === "loi_app",
    trangThai: status === "da_nhac_nho" ? "\u0110\xE3 nh\u1EAFc nh\u1EDF" : status === "loi_app" ? "L\u1ED7i app" : "Ch\u01B0a nh\u1EADn \u0111\u1ECBnh",
    loaiTrangThai: status,
    thoiGianPhatHien: previousRecord?.thoiGianPhatHien || record?.thoiGianPhatHien || now,
    thoiGianTich: status === "chua_xu_ly" ? "" : record?.thoiGianTich || now,
    nguoiXuLy: status === "chua_xu_ly" ? "" : record?.nguoiXuLy || "Qu\u1EA3n l\xFD ki\u1EC3m tra",
    emailThucHien: status === "chua_xu_ly" ? "" : record?.emailThucHien || "",
    updatedAt: now,
    syncedToSheet: false
  };
}
app.get("/api/warning-audits", (req, res) => {
  const date = req.query.date ? String(req.query.date) : "";
  const format = req.query.format ? String(req.query.format) : "";
  const prefix = date ? `audits/${date}/` : "audits/";
  const records = [];
  for (const [key, val] of warningAuditStore.entries()) {
    if (key.startsWith(prefix)) {
      records.push(val);
    }
  }
  records.sort((a, b) => {
    const dateOrder = String(b.ngay).localeCompare(String(a.ngay));
    return dateOrder || String(a.coSo).localeCompare(String(b.coSo), "vi");
  });
  if (format === "csv") {
    const escapeCsv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = [
      "Ng\xE0y",
      "C\u01A1 s\u1EDF",
      "S\u1ED1 l\u01B0\u1EE3t c\u1EA3nh b\xE1o",
      "L\xFD do c\u1EA3nh b\xE1o",
      "\u0110\xE3 nh\u1EAFc nh\u1EDF",
      "L\u1ED7i app",
      "Tr\u1EA1ng th\xE1i nh\u1EADn \u0111\u1ECBnh",
      "Th\u1EDDi gian ph\xE1t hi\u1EC7n",
      "Th\u1EDDi gian x\u1EED l\xFD",
      "Ng\u01B0\u1EDDi x\u1EED l\xFD",
      "Email th\u1EF1c hi\u1EC7n",
      "C\u1EADp nh\u1EADt tr\xEAn h\u1EC7 th\u1ED1ng"
    ];
    const rows = records.map((r) => [
      r.ngay,
      r.coSo,
      r.soLuotCanhBao,
      r.lyDoCanhBao,
      r.daNhacNho ? "C\xF3" : "Kh\xF4ng",
      r.loiApp ? "C\xF3" : "Kh\xF4ng",
      r.trangThai,
      r.thoiGianPhatHien,
      r.thoiGianTich,
      r.nguoiXuLy,
      r.emailThucHien,
      r.updatedAt
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="nhat-ky-canh-bao.csv"');
    return res.send(csvContent);
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, error: "Ng\xE0y tra c\u1EE9u kh\xF4ng h\u1EE3p l\u1EC7." });
  }
  res.json({ success: true, date, records, count: records.length });
});
app.post("/api/warning-audits", async (req, res) => {
  try {
    const payload = req.body;
    const action = payload?.action;
    if (action === "upsert") {
      const rec = payload.record;
      if (!rec?.coSo || !rec?.ngay || !/^\d{4}-\d{2}-\d{2}$/.test(rec.ngay)) {
        return res.status(400).json({ success: false, error: "D\u1EEF li\u1EC7u ghi nh\u1EADn kh\xF4ng h\u1EE3p l\u1EC7." });
      }
      const facility = String(rec.coSo).trim().slice(0, 160);
      const prev = warningAuditStore.get(getWarningKey(rec.ngay, facility));
      const saved = buildWarningRecord({ ...rec, coSo: facility }, prev, rec.loaiTrangThai);
      warningAuditStore.set(getWarningKey(rec.ngay, facility), saved);
      return res.json({ success: true, record: saved });
    }
    if (action === "sync_list") {
      const date = String(payload.date || "");
      const inputRecords = Array.isArray(payload.records) ? payload.records.slice(0, 50) : [];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, error: "Ng\xE0y kh\xF4ng h\u1EE3p l\u1EC7." });
      }
      const savedList = [];
      for (const item of inputRecords) {
        if (!item?.coSo) continue;
        const facility = String(item.coSo).trim().slice(0, 160);
        const prev = warningAuditStore.get(getWarningKey(date, facility));
        const preservedStatus = prev?.loaiTrangThai || "chua_xu_ly";
        const saved = buildWarningRecord({ ...item, coSo: facility, ngay: date }, prev, preservedStatus);
        warningAuditStore.set(getWarningKey(date, facility), saved);
        savedList.push(saved);
      }
      return res.json({ success: true, date, records: savedList, count: savedList.length });
    }
    if (action === "reset_date" || action === "clear_date") {
      const date = String(payload.date || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, error: "Ng\xE0y kh\xF4ng h\u1EE3p l\u1EC7." });
      }
      const prefix = `audits/${date}/`;
      const resetList = [];
      for (const [key, val] of warningAuditStore.entries()) {
        if (key.startsWith(prefix)) {
          const reset = buildWarningRecord(val, val, "chua_xu_ly");
          warningAuditStore.set(key, reset);
          resetList.push(reset);
        }
      }
      return res.json({ success: true, date, cleared: resetList.length, records: resetList });
    }
    return res.status(400).json({ success: false, error: "Thao t\xE1c kh\xF4ng h\u1EE3p l\u1EC7." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "L\u1ED7i m\xE1y ch\u1EE7" });
  }
});
async function startServer() {
  const distPath = path.join(process.cwd(), "dist");
  const distIndexExists = fs.existsSync(path.join(distPath, "index.html"));
  const isProduction = process.env.NODE_ENV === "production" || isCloudRun || distIndexExists && !isDevWorkspace;
  if (isProduction && distIndexExists) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Zalo OA Report App running at http://0.0.0.0:${PORT} (mode: ${isProduction ? "production" : "development"})`);
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[Server Error] Port ${PORT} is already in use.`);
    } else {
      console.error("[Server Error]", err);
    }
  });
}
startServer();
