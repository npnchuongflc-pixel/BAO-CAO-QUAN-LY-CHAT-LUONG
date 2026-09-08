import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  CloudUpload,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  History,
  Image as ImageIcon,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  User,
  X,
  Zap,
} from 'lucide-react';
import { HygieneReport } from './facilityTypes';
import {
  OFFICIAL_FACILITIES,
  getFacilityDailyTarget,
  normalizeFacilityName,
} from '../../utils/facilityUtils';
import { normalizeDateToIso } from '../../utils/dateUtils';
import {
  batchSaveImageReviews,
  fetchImageReviews,
  getImageReviewId,
  ImageReviewRecord,
  saveImageReview,
} from '../../services/imageReviewService';

type ReviewStatus = 'pending' | 'approved' | 'rejected';
type ImageFilter = 'all' | ReviewStatus;

interface YesterdayHygieneReviewProps {
  dateIso: string;
  dateDisplay: string;
  reports: HygieneReport[];
}

const IMAGE_REVIEWER_STORAGE_KEY = 'yesterday-image-reviewer-demo-v1';
const NEW_SHEET_STORAGE_KEY = 'new-sheet-apps-script-url-v1';
const DEFAULT_NEW_SHEET_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz0KaluYvWaWNgVHCK9zesGJs2mnu5koEg9NQ9v76ndZZPXlaog1mUpuaK4x851aomp/exec';
const HYGIENE_PLACEHOLDER_IMAGE = 'images.unsplash.com/photo-1581578731548-c64695cc6952';

export const APPS_SCRIPT_TEMPLATE = `function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Google Apps Script Web App đang hoạt động bình thường! Sẵn sàng nhận dữ liệu."
  })).setMimeType(ContentService.MimeType.JSON);
}

// Hàm chuẩn hóa định dạng ngày từ Cell (Date object hoặc String) về dạng chuẩn dd/MM/yyyy
function formatCellDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Ho_Chi_Minh", "dd/MM/yyyy");
  }
  var s = String(val).trim();
  // Khớp định dạng yyyy-MM-dd hoặc yyyy/MM/dd
  var mYmd = s.match(/^(\\d{4})[\\/-](\\d{1,2})[\\/-](\\d{1,2})/);
  if (mYmd) {
    return ("0" + mYmd[3]).slice(-2) + "/" + ("0" + mYmd[2]).slice(-2) + "/" + mYmd[1];
  }
  // Khớp định dạng dd/MM/yyyy hoặc dd-MM-yyyy
  var mDmy = s.match(/^(\\d{1,2})[\\/-](\\d{1,2})[\\/-](\\d{4})/);
  if (mDmy) {
    return ("0" + mDmy[1]).slice(-2) + "/" + ("0" + mDmy[2]).slice(-2) + "/" + mDmy[3];
  }
  var d = new Date(val);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, "Asia/Ho_Chi_Minh", "dd/MM/yyyy");
  }
  return s;
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = payload.action || "";

    // =========================================================================
    // 1. ĐỒNG BỘ CẢNH BÁO CƠ SỞ (Sheet "nhắc nhở")
    // ĐIỀU CHỈNH TRỰC TIẾP TRÊN HÀNG ĐÃ ĐỔ, DỌN SẠCH DÒNG THỪA TRÙNG LẶP
    // =========================================================================
    if (action === "sync_warnings" || payload.sheetName === "nhắc nhở") {
      var sheetName = payload.sheetName || "nhắc nhở";
      var warningSheet = ss.getSheetByName(sheetName);
      if (!warningSheet) {
        warningSheet = ss.insertSheet(sheetName);
      }

      var warningHeaders = [
        "Ngày", "Cơ sở", "Lý do cảnh báo", "Số lỗi",
        "Đã nhắc nhở", "Lỗi app", "Trạng thái nhận định", "Người xử lý"
      ];

      var lastRow = warningSheet.getLastRow();
      if (lastRow === 0) {
        warningSheet.appendRow(warningHeaders);
        warningSheet.getRange(1, 1, 1, warningHeaders.length).setFontWeight("bold").setBackground("#fef3c7");
        lastRow = 1;
      }

      var records = payload.records || [];
      var targetDateStr = formatCellDate(payload.date || "");

      if (!records.length && !targetDateStr) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Không có bản ghi cảnh báo nào"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // Chuẩn bị danh sách bản ghi mới theo Map: Key = ngày + "|" + cơ sở (viết thường)
      var incomingMap = {};
      var incomingKeys = [];
      var incomingUsed = {};

      records.forEach(function(r) {
        var recDate = formatCellDate(r.ngay || targetDateStr);
        var recFacility = String(r.coSo || "").trim().toLowerCase();
        var key = recDate + "|" + recFacility;
        var rowArr = [
          r.ngay || targetDateStr || "",
          r.coSo || "",
          r.lyDoCanhBao || "",
          r.soLoi !== undefined ? r.soLoi : (r.soLuotCanhBao !== undefined ? r.soLuotCanhBao : 1),
          r.daNhacNho || "",
          r.loiApp || "",
          r.trangThai || "Chưa nhận định",
          r.nguoiXuLy || ""
        ];
        incomingMap[key] = rowArr;
        incomingKeys.push(key);
        incomingUsed[key] = false;
      });

      // Đọc toàn bộ dữ liệu hiện có trong Sheet "nhắc nhở" (từ hàng 2 trở đi)
      var finalRows = [];
      if (lastRow > 1) {
        var existingData = warningSheet.getRange(2, 1, lastRow - 1, 8).getValues();
        for (var i = 0; i < existingData.length; i++) {
          var row = existingData[i];
          var rowDate = formatCellDate(row[0]);
          var rowFacility = String(row[1] || "").trim().toLowerCase();
          var rowKey = rowDate + "|" + rowFacility;

          // Nếu dòng này thuộc danh sách cơ sở đang cập nhật của ngày này:
          if (incomingMap.hasOwnProperty(rowKey)) {
            if (!incomingUsed[rowKey]) {
              // CẬP NHẬT TRỰC TIẾP TRÊN HÀNG ĐÃ CÓ (giữ nguyên vị trí hàng, không tạo dòng mới)
              finalRows.push(incomingMap[rowKey]);
              incomingUsed[rowKey] = true;
            } else {
              // Đã xuất hiện trước đó: Bỏ qua dòng trùng lặp thừa thãi để dọn sạch bảng
            }
          } else {
            // Dòng thuộc ngày khác hoặc cơ sở khác: GIỮ NGUYÊN HOÀN TOÀN
            finalRows.push([
              row[0] instanceof Date ? formatCellDate(row[0]) : row[0],
              row[1], row[2], row[3], row[4], row[5], row[6], row[7]
            ]);
          }
        }
      }

      // Thêm những cơ sở mới của ngày chưa từng có trong Sheet trước đây
      for (var k = 0; k < incomingKeys.length; k++) {
        var keyToCheck = incomingKeys[k];
        if (!incomingUsed[keyToCheck]) {
          finalRows.push(incomingMap[keyToCheck]);
          incomingUsed[keyToCheck] = true;
        }
      }

      // Ghi đè lại bảng dữ liệu: cập nhật trực tiếp tại hàng cũ, xóa sạch hàng trùng
      if (lastRow > 1) {
        warningSheet.getRange(2, 1, lastRow - 1, 8).clearContent();
      }
      if (finalRows.length > 0) {
        warningSheet.getRange(2, 1, finalRows.length, 8).setValues(finalRows);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Đã cập nhật trực tiếp trên hàng của sheet '" + sheetName + "' (đã dọn sạch hàng thừa trùng lặp)!",
        count: records.length,
        totalRows: finalRows.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // 2. CẬP NHẬT TRỰC TIẾP HÀNG KIỂM DUYỆT ẢNH (Sheet "Kiểm duyệt vệ sinh")
    // Khi nhân viên nhấn xem và nhấn tick ("Đã duyệt" hoặc "Không đạt")
    // =========================================================================
    if (action === "upsert_image_review" || action === "update_image_review") {
      var hygieneSheet = ss.getSheetByName("Kiểm duyệt vệ sinh") || ss.getSheets()[0];
      var lastRow = hygieneSheet.getLastRow();
      var targetDate = formatCellDate(payload.ngay || (payload.record && payload.record.ngay) || "");
      var targetLink = String(payload.linkAnh || (payload.record && payload.record.linkAnh) || "").trim();
      var targetFacility = String(payload.coSo || (payload.record && payload.record.coSo) || "").trim().toLowerCase();
      var targetArea = String(payload.khuVuc || (payload.record && payload.record.khuVuc) || "").trim().toLowerCase();
      var targetTime = String(payload.gio || (payload.record && payload.record.gio) || "").trim();

      var daDuyetVal = payload.daDuyet !== undefined ? payload.daDuyet : (payload.reviewStatus === "approved" ? (payload.reviewer || "Đã duyệt") : "");
      var khongDatVal = payload.khongDat !== undefined ? payload.khongDat : (payload.reviewStatus === "rejected" ? (payload.reviewer || "Không đạt") : "");
      var nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

      var foundRow = -1;
      if (lastRow > 1) {
        var data = hygieneSheet.getRange(2, 1, lastRow - 1, 14).getValues();
        for (var i = 0; i < data.length; i++) {
          var rDate = formatCellDate(data[i][0]);
          var rLink = String(data[i][10] || "").trim();
          var rCoSo = String(data[i][3] || "").trim().toLowerCase();
          var rKhuVuc = String(data[i][4] || "").trim().toLowerCase();
          var rGio = String(data[i][1] || "").trim();

          var match = false;
          if (targetLink && rLink && targetLink === rLink) {
            match = true;
          } else if (targetDate && rDate === targetDate && targetFacility && rCoSo === targetFacility && targetArea && rKhuVuc === targetArea && (!targetTime || !rGio || targetTime === rGio)) {
            match = true;
          }

          if (match) {
            foundRow = i + 2;
            break;
          }
        }
      }

      if (foundRow > 1) {
        // CẬP NHẬT TRỰC TIẾP TRÊN HÀNG ĐÃ CÓ TRONG SHEET:
        // Cột 12: Đã duyệt, Cột 13: Không đạt, Cột 14: Thời gian đồng bộ
        hygieneSheet.getRange(foundRow, 12, 1, 3).setValues([[daDuyetVal, khongDatVal, nowStr]]);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Đã cập nhật trực tiếp hàng " + foundRow + " trong sheet 'Kiểm duyệt vệ sinh'!",
          updatedRow: foundRow
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        // Nếu hàng chưa có trong sheet: Thêm hàng mới vào sheet
        var rec = payload.record || {};
        var newRow = [
          targetDate,
          payload.gio || rec.gio || "",
          rec.nguoiBaoCao || rec.nguoiKiemTra || "",
          payload.coSo || rec.coSo || "",
          payload.khuVuc || rec.khuVuc || "",
          rec.trangThai || "",
          rec.diemSo !== undefined ? rec.diemSo : "",
          rec.chiTiet || "",
          rec.phanHoi || "",
          rec.feedbackNguoiDung || "",
          targetLink,
          daDuyetVal,
          khongDatVal,
          nowStr
        ];
        hygieneSheet.appendRow(newRow);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Đã thêm mới và cập nhật hàng trong sheet 'Kiểm duyệt vệ sinh'!",
          appendedRow: hygieneSheet.getLastRow()
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Cập nhật hàng loạt nhiều ảnh của 1 cơ sở (khi nhấn Duyệt tất cả hoặc Hủy tất cả)
    if (action === "batch_update_image_reviews") {
      var hygieneSheet = ss.getSheetByName("Kiểm duyệt vệ sinh") || ss.getSheets()[0];
      var lastRow = hygieneSheet.getLastRow();
      var updates = payload.updates || [];
      var nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

      if (lastRow > 1 && updates.length > 0) {
        var data = hygieneSheet.getRange(2, 1, lastRow - 1, 14).getValues();
        var linkMap = {};
        for (var u = 0; u < updates.length; u++) {
          var item = updates[u];
          var uLink = String(item.linkAnh || "").trim();
          if (uLink) linkMap[uLink] = item;
        }

        for (var i = 0; i < data.length; i++) {
          var rLink = String(data[i][10] || "").trim();
          if (rLink && linkMap.hasOwnProperty(rLink)) {
            var matched = linkMap[rLink];
            data[i][11] = matched.daDuyet || "";
            data[i][12] = matched.khongDat || "";
            data[i][13] = nowStr;
          }
        }
        hygieneSheet.getRange(2, 1, lastRow - 1, 14).setValues(data);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Đã cập nhật đồng loạt các hàng trong sheet 'Kiểm duyệt vệ sinh'!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // 3. ĐỒNG BỘ TOÀN BỘ KIỂM DUYỆT VỆ SINH (Sheet "Kiểm duyệt vệ sinh")
    // Cập nhật trực tiếp trên hàng đã có trong Sheet, KHÔNG xóa hàng cũ
    // =========================================================================
    var sheet = ss.getSheetByName("Kiểm duyệt vệ sinh") || ss.getSheets()[0];

    var headers = [
      "Ngày", "Giờ", "Người kiểm tra", "Cơ sở", "Khu vực",
      "Trạng thái", "Điểm số", "Chi tiết", "Phản hồi",
      "Feedback từ người dùng", "Link ảnh", "Đã duyệt", "Không đạt", "Thời gian đồng bộ"
    ];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
    }

    var records = payload.records || [];
    var date = payload.date || "";
    var nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    if (!records.length) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Không có bản ghi" })).setMimeType(ContentService.MimeType.JSON);
    }

    // Xây dựng incomingMap cho các bản ghi vệ sinh
    var incomingMap = {};
    var incomingKeys = [];
    var incomingUsed = {};

    records.forEach(function(r) {
      var recDate = formatCellDate(r.ngay || date);
      var recLink = String(r.linkAnh || "").trim();
      var recKey = recLink ? recLink : (recDate + "|" + String(r.coSo || "").trim().toLowerCase() + "|" + String(r.khuVuc || "").trim().toLowerCase() + "|" + String(r.gio || "").trim());
      
      var rowArr = [
        r.ngay || date || "",
        r.gio || "",
        r.nguoiKiemTra || "",
        r.coSo || "",
        r.khuVuc || "",
        r.trangThai || "",
        r.diemSo !== undefined ? r.diemSo : "",
        r.chiTiet || "",
        r.phanHoi || "",
        r.feedbackNguoiDung || "",
        r.linkAnh || "",
        r.daDuyet || "",
        r.khongDat || "",
        nowStr
      ];
      incomingMap[recKey] = rowArr;
      incomingKeys.push(recKey);
      incomingUsed[recKey] = false;
    });

    var lastRow = sheet.getLastRow();
    var finalRows = [];
    if (lastRow > 1) {
      var existingData = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
      for (var i = 0; i < existingData.length; i++) {
        var row = existingData[i];
        var rDate = formatCellDate(row[0]);
        var rLink = String(row[10] || "").trim();
        var rKey = rLink ? rLink : (rDate + "|" + String(row[3] || "").trim().toLowerCase() + "|" + String(row[4] || "").trim().toLowerCase() + "|" + String(row[1] || "").trim());

        if (incomingMap.hasOwnProperty(rKey)) {
          if (!incomingUsed[rKey]) {
            // CẬP NHẬT TRỰC TIẾP TRÊN HÀNG ĐÃ CÓ TRONG SHEET:
            // Bảo lưu giá trị Đã duyệt (cột 12) & Không đạt (cột 13) nếu dòng cũ đã có mà bản ghi mới chưa có
            var newRow = incomingMap[rKey].slice();
            if (!newRow[11] && row[11]) newRow[11] = row[11];
            if (!newRow[12] && row[12]) newRow[12] = row[12];
            finalRows.push(newRow);
            incomingUsed[rKey] = true;
          }
        } else {
          // Giữ nguyên các hàng khác đã có sẵn trong Sheet
          finalRows.push([
            row[0] instanceof Date ? formatCellDate(row[0]) : row[0],
            row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], row[12], row[13]
          ]);
        }
      }
    }

    // Thêm các bản ghi mới chưa từng có trong Sheet
    for (var k = 0; k < incomingKeys.length; k++) {
      var kToCheck = incomingKeys[k];
      if (!incomingUsed[kToCheck]) {
        finalRows.push(incomingMap[kToCheck]);
        incomingUsed[kToCheck] = true;
      }
    }

    // Cập nhật lại Sheet trực tiếp theo hàng mà không làm mất cấu trúc
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
    }
    if (finalRows.length > 0) {
      sheet.getRange(2, 1, finalRows.length, headers.length).setValues(finalRows);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Đã cập nhật trực tiếp trên hàng của sheet 'Kiểm duyệt vệ sinh' thành công!",
      count: records.length,
      totalRows: finalRows.length
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * TỰ ĐỘNG KÉO DỮ LIỆU HẰNG NGÀY (DAILY AUTO-SYNC)
 * Tự động lấy toàn bộ kiểm tra vệ sinh ngày hôm trước từ Sheet gốc về Sheet này
 * Cập nhật trực tiếp trên hàng đã có, không xóa hàng cũ
 */
function dailyAutoSyncHygieneData() {
  var SOURCE_SHEET_ID = "1LbB-hXbLQ1DdghvM4xw-nyqBfPj-lZpHSeuEhjQ5xEY";
  var SOURCE_GID = "0";
  var csvUrl = "https://docs.google.com/spreadsheets/d/" + SOURCE_SHEET_ID + "/export?format=csv&gid=" + SOURCE_GID;

  var response = UrlFetchApp.fetch(csvUrl, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    Logger.log("Lỗi tải Sheet gốc: " + response.getResponseCode());
    return;
  }

  var csvData = Utilities.parseCsv(response.getContentText());
  if (csvData.length < 2) return;

  var headers = csvData[0];
  var colNgay = -1, colGio = -1, colNguoi = -1, colCoSo = -1, colKhuVuc = -1;
  var colTrangThai = -1, colDiem = -1, colChiTiet = -1, colPhanHoi = -1, colFeedback = -1, colLinkAnh = -1;
  var colDaDuyet = -1, colKhongDat = -1;

  for (var c = 0; c < headers.length; c++) {
    var h = headers[c].toString().trim().toLowerCase();
    if (h.indexOf("ngày") !== -1 || h === "date") colNgay = c;
    else if (h.indexOf("giờ") !== -1 || h === "time") colGio = c;
    else if (h.indexOf("người") !== -1 || h.indexOf("nhân viên") !== -1) colNguoi = c;
    else if (h.indexOf("cơ sở") !== -1 || h.indexOf("facility") !== -1) colCoSo = c;
    else if (h.indexOf("khu vực") !== -1 || h.indexOf("area") !== -1) colKhuVuc = c;
    else if (h.indexOf("trạng thái") !== -1 || h.indexOf("status") !== -1) colTrangThai = c;
    else if (h.indexOf("điểm") !== -1 || h.indexOf("score") !== -1) colDiem = c;
    else if (h.indexOf("chi tiết") !== -1 || h.indexOf("detail") !== -1) colChiTiet = c;
    else if (h.indexOf("phản hồi") !== -1 || h.indexOf("response") !== -1) colPhanHoi = c;
    else if (h.indexOf("feedback") !== -1) colFeedback = c;
    else if (h.indexOf("ảnh") !== -1 || h.indexOf("link") !== -1 || h.indexOf("image") !== -1) colLinkAnh = c;
    else if (h.indexOf("đã duyệt") !== -1 || h.indexOf("approved") !== -1) colDaDuyet = c;
    else if (h.indexOf("không đạt") !== -1 || h.indexOf("rejected") !== -1) colKhongDat = c;
  }

  // Lấy ngày hôm trước theo giờ Việt Nam
  var now = new Date();
  var yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
  var targetDmy = Utilities.formatDate(yesterday, "Asia/Ho_Chi_Minh", "dd/MM/yyyy");
  var targetIso = Utilities.formatDate(yesterday, "Asia/Ho_Chi_Minh", "yyyy-MM-dd");

  var matchingRows = [];
  for (var r = 1; r < csvData.length; r++) {
    var row = csvData[r];
    var rawDate = colNgay >= 0 ? String(row[colNgay]).trim() : "";
    if (rawDate === targetDmy || rawDate === targetIso || rawDate.indexOf(targetDmy) !== -1 || rawDate.indexOf(targetIso) !== -1) {
      matchingRows.push({
        ngay: rawDate,
        gio: colGio >= 0 ? row[colGio] : "",
        nguoiKiemTra: colNguoi >= 0 ? row[colNguoi] : "",
        coSo: colCoSo >= 0 ? row[colCoSo] : "",
        khuVuc: colKhuVuc >= 0 ? row[colKhuVuc] : "",
        trangThai: colTrangThai >= 0 ? row[colTrangThai] : "",
        diemSo: colDiem >= 0 ? row[colDiem] : "",
        chiTiet: colChiTiet >= 0 ? row[colChiTiet] : "",
        phanHoi: colPhanHoi >= 0 ? row[colPhanHoi] : "",
        feedbackNguoiDung: colFeedback >= 0 ? row[colFeedback] : "",
        linkAnh: colLinkAnh >= 0 ? row[colLinkAnh] : "",
        daDuyet: colDaDuyet >= 0 ? row[colDaDuyet] : "",
        khongDat: colKhongDat >= 0 ? row[colKhongDat] : ""
      });
    }
  }

  if (matchingRows.length === 0) {
    Logger.log("Không có dòng nào thuộc ngày hôm trước: " + targetDmy);
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Kiểm duyệt vệ sinh") || ss.getSheets()[0];
  var sheetHeaders = [
    "Ngày", "Giờ", "Người kiểm tra", "Cơ sở", "Khu vực",
    "Trạng thái", "Điểm số", "Chi tiết", "Phản hồi",
    "Feedback từ người dùng", "Link ảnh", "Đã duyệt", "Không đạt", "Thời gian đồng bộ"
  ];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(sheetHeaders);
    sheet.getRange(1, 1, 1, sheetHeaders.length).setFontWeight("bold").setBackground("#e2e8f0");
  }

  var nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

  // Đọc dữ liệu hiện có trong Sheet "Kiểm duyệt vệ sinh" để cập nhật trực tiếp thay vì deleteRow
  var lastRow = sheet.getLastRow();
  var finalRows = [];
  var incomingMap = {};
  var incomingKeys = [];
  var incomingUsed = {};

  matchingRows.forEach(function(item) {
    var recDate = formatCellDate(item.ngay || targetDmy);
    var recLink = String(item.linkAnh || "").trim();
    var recKey = recLink ? recLink : (recDate + "|" + String(item.coSo || "").trim().toLowerCase() + "|" + String(item.khuVuc || "").trim().toLowerCase() + "|" + String(item.gio || "").trim());
    var rowArr = [
      item.ngay, item.gio, item.nguoiKiemTra, item.coSo, item.khuVuc,
      item.trangThai, item.diemSo, item.chiTiet, item.phanHoi,
      item.feedbackNguoiDung, item.linkAnh, item.daDuyet || "", item.khongDat || "", nowStr
    ];
    incomingMap[recKey] = rowArr;
    incomingKeys.push(recKey);
    incomingUsed[recKey] = false;
  });

  if (lastRow > 1) {
    var existingData = sheet.getRange(2, 1, lastRow - 1, sheetHeaders.length).getValues();
    for (var i = 0; i < existingData.length; i++) {
      var row = existingData[i];
      var rDate = formatCellDate(row[0]);
      var rLink = String(row[10] || "").trim();
      var rKey = rLink ? rLink : (rDate + "|" + String(row[3] || "").trim().toLowerCase() + "|" + String(row[4] || "").trim().toLowerCase() + "|" + String(row[1] || "").trim());

      if (incomingMap.hasOwnProperty(rKey)) {
        if (!incomingUsed[rKey]) {
          var updatedRow = incomingMap[rKey].slice();
          // Giữ lại kết quả kiểm duyệt của nhân viên (Cột 12, 13) nếu đã có
          if (!updatedRow[11] && row[11]) updatedRow[11] = row[11];
          if (!updatedRow[12] && row[12]) updatedRow[12] = row[12];
          finalRows.push(updatedRow);
          incomingUsed[rKey] = true;
        }
      } else {
        finalRows.push([
          row[0] instanceof Date ? formatCellDate(row[0]) : row[0],
          row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], row[12], row[13]
        ]);
      }
    }
  }

  for (var k = 0; k < incomingKeys.length; k++) {
    var kCheck = incomingKeys[k];
    if (!incomingUsed[kCheck]) {
      finalRows.push(incomingMap[kCheck]);
      incomingUsed[kCheck] = true;
    }
  }

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheetHeaders.length).clearContent();
  }
  if (finalRows.length > 0) {
    sheet.getRange(2, 1, finalRows.length, sheetHeaders.length).setValues(finalRows);
    Logger.log("Đã tự động cập nhật trực tiếp trên hàng của sheet 'Kiểm duyệt vệ sinh': " + finalRows.length + " dòng.");
  }
}

/**
 * CÀI ĐẶT LỊCH TỰ ĐỘNG CHẠY HẰNG NGÀY (Chạy 1 lần duy nhất trong Apps Script)
 * Tự động kích hoạt vào lúc 01:00 AM - 02:00 AM mỗi sáng trên Google Cloud
 */
function taoLichTuDongHangNgay() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "dailyAutoSyncHygieneData") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("dailyAutoSyncHygieneData")
    .timeBased()
    .everyDays(1)
    .atHour(1)
    .create();
  Logger.log("ĐÃ CÀI ĐẶT LỊCH TỰ ĐỘNG CHẠY MỖI SÁNG LÚC 1H THÀNH CÔNG!");
}`;

const getScore100 = (report: HygieneReport) => {
  let score = report.diemSo || 0;
  if (report.diemSoMax && report.diemSoMax <= 10 && score <= 10) score *= 10;
  return score;
};

const formatReviewedTime = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const getReviewStatus = (record?: ImageReviewRecord, report?: HygieneReport): ReviewStatus => {
  if (record?.reviewStatus === 'approved' || record?.reviewStatus === 'rejected') {
    return record.reviewStatus;
  }
  if (record?.reviewed) return 'approved';
  if (report?.daDuyet?.trim()) return 'approved';
  if (report?.khongDat?.trim()) return 'rejected';
  return 'pending';
};

export const YesterdayHygieneReview: React.FC<YesterdayHygieneReviewProps> = ({
  dateIso,
  dateDisplay,
  reports,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [filter, setFilter] = useState<ImageFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewerError, setReviewerError] = useState(false);
  const [imageReviews, setImageReviews] = useState<Record<string, ImageReviewRecord>>({});
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<{
    tone: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const [reviewerName, setReviewerName] = useState(() => {
    try {
      if (typeof window === 'undefined') return '';
      return window.localStorage.getItem(IMAGE_REVIEWER_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const DEFAULT_NEW_SHEET_URL = 'https://script.google.com/macros/s/AKfycbz0KaluYvWaWNgVHCK9zesGJs2mnu5koEg9NQ9v76ndZZPXlaog1mUpuaK4x851aomp/exec';
  const [newSheetScriptUrl, setNewSheetScriptUrl] = useState(() => {
    try {
      if (typeof window === 'undefined') return DEFAULT_NEW_SHEET_URL;
      return window.localStorage.getItem(NEW_SHEET_STORAGE_KEY) || DEFAULT_NEW_SHEET_URL;
    } catch {
      return DEFAULT_NEW_SHEET_URL;
    }
  });
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllStatus, setSyncAllStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isTriggeringAutoSync, setIsTriggeringAutoSync] = useState(false);
  const [autoSyncInfo, setAutoSyncInfo] = useState<{
    enabled: boolean;
    configuredUrl: string;
    hasFullUrl: boolean;
    targetYesterdayDate: string;
    lastAutoSyncDate: string;
    recentLogs: Array<{
      id: string;
      date: string;
      timestamp: string;
      count: number;
      status: 'success' | 'error';
      message: string;
    }>;
    scheduleInfo: string;
  } | null>(null);

  const fetchAutoSyncStatus = async () => {
    try {
      const res = await fetch('/api/auto-sync-status');
      if (!res.ok) return;
      const text = await res.text().catch(() => '');
      if (!text) return;
      try {
        const data = JSON.parse(text);
        if (data?.success) {
          setAutoSyncInfo(data);
        }
      } catch {
        // Not valid JSON, ignore
      }
    } catch {
      // Ignore background fetch error
    }
  };

  useEffect(() => {
    fetchAutoSyncStatus();
    // Also sync local storage script URL to backend if present
    if (newSheetScriptUrl.trim()) {
      fetch('/api/auto-sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptUrl: newSheetScriptUrl.trim() }),
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoadingReviews(true);
    setSyncNotice(null);

    fetchImageReviews(dateIso)
      .then(records => {
        if (!active) return;
        setImageReviews(Object.fromEntries(records.map(record => [record.id, record])));
      })
      .catch(error => {
        if (!active) return;
        setSyncNotice({
          tone: 'error',
          message: error instanceof Error ? error.message : 'Không thể tải trạng thái kiểm duyệt.',
        });
      })
      .finally(() => {
        if (active) setIsLoadingReviews(false);
      });

    return () => {
      active = false;
    };
  }, [dateIso]);

  useEffect(() => {
    try {
      window.localStorage.setItem(IMAGE_REVIEWER_STORAGE_KEY, reviewerName);
    } catch {
      // The employee can re-enter their name when browser storage is unavailable.
    }
  }, [reviewerName]);

  const facilityRows = useMemo(() => {
    const reportsForDate = reports.filter(
      report => normalizeDateToIso(report.ngay) === dateIso,
    );

    return OFFICIAL_FACILITIES.map(coSo => {
      const facilityReports = reportsForDate.filter(
        report => normalizeFacilityName(report.coSo) === coSo,
      );
      const images = facilityReports.filter(report => (
        report.linkAnh?.trim() && !report.linkAnh.includes(HYGIENE_PLACEHOLDER_IMAGE)
      ));
      const target = getFacilityDailyTarget(coSo);
      const performed = facilityReports.length;
      const progress = target > 0 ? Math.min(100, (performed / target) * 100) : 0;
      const scores = facilityReports.map(getScore100);
      const averageScore = scores.length
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;

      return {
        coSo,
        reports: facilityReports,
        images,
        target,
        performed,
        progress,
        averageScore,
      };
    }).sort((left, right) => left.coSo.localeCompare(right.coSo, 'vi'));
  }, [dateIso, reports]);

  const selectedRow = useMemo(
    () => facilityRows.find(row => row.coSo === selectedFacility) || null,
    [facilityRows, selectedFacility],
  );

  const totalImages = useMemo(
    () => facilityRows.reduce((sum, row) => sum + row.images.length, 0),
    [facilityRows],
  );
  const reviewSummary = useMemo(() => {
    let approved = 0;
    let rejected = 0;
    facilityRows.forEach(row => row.images.forEach(image => {
      const status = getReviewStatus(imageReviews[getImageReviewId(image)], image);
      if (status === 'approved') approved += 1;
      if (status === 'rejected') rejected += 1;
    }));
    return {
      approved,
      rejected,
      pending: Math.max(0, totalImages - approved - rejected),
    };
  }, [facilityRows, imageReviews, totalImages]);
  const visibleRows = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('vi-VN');
    return facilityRows.filter(row => (
      !query || row.coSo.toLocaleLowerCase('vi-VN').includes(query)
    ));
  }, [facilityRows, searchQuery]);

  const selectedImages = useMemo(() => {
    if (!selectedRow) return [];
    return selectedRow.images.filter(image => {
      const status = getReviewStatus(imageReviews[getImageReviewId(image)], image);
      if (filter !== 'all') return status === filter;
      return true;
    });
  }, [filter, imageReviews, selectedRow]);

  const setImageReviewStatus = async (report: HygieneReport, requestedStatus: ReviewStatus) => {
    const reviewId = getImageReviewId(report);
    const cleanReviewer = reviewerName.trim();
    const previousRecord = imageReviews[reviewId];
    const currentStatus = getReviewStatus(previousRecord, report);
    const nextStatus: ReviewStatus = currentStatus === requestedStatus ? 'pending' : requestedStatus;

    if (nextStatus !== 'pending' && !cleanReviewer) {
      setReviewerError(true);
      return;
    }

    setReviewerError(false);
    setSyncNotice(null);
    const timestamp = new Date().toISOString();
    const optimisticRecord: ImageReviewRecord = {
      id: reviewId,
      reportId: report.id,
      rowIndex: report.rowIndex,
      ngay: dateIso,
      gio: report.gio || '',
      coSo: report.coSo,
      khuVuc: report.khuVuc || '',
      linkAnh: report.linkAnh,
      nguoiBaoCao: report.nguoiKiemTra || '',
      reviewed: nextStatus === 'approved',
      reviewStatus: nextStatus,
      trangThaiKiemDuyet: nextStatus === 'approved'
        ? 'Đã duyệt'
        : nextStatus === 'rejected'
        ? 'Không đạt'
        : 'Chưa duyệt',
      nguoiKiemDuyet: cleanReviewer || previousRecord?.nguoiKiemDuyet || '',
      thoiGianKiemDuyet: timestamp,
      syncedToSheet: false,
    };

    setImageReviews(current => ({ ...current, [reviewId]: optimisticRecord }));
    setSavingReviewId(reviewId);

    try {
      const result = await saveImageReview(optimisticRecord, newSheetScriptUrl);
      setImageReviews(current => ({ ...current, [reviewId]: result.record }));
      setSyncNotice(result.warning
        ? { tone: 'warning', message: `Đã lưu trên hệ thống; Google Sheet: ${result.warning}` }
        : { tone: 'success', message: '✓ Đã cập nhật trực tiếp hàng tương ứng trong Google Sheet!' });
    } catch (error) {
      setImageReviews(current => {
        const next = { ...current };
        if (previousRecord) next[reviewId] = previousRecord;
        else delete next[reviewId];
        return next;
      });
      setSyncNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Không thể lưu kiểm duyệt ảnh.',
      });
    } finally {
      setSavingReviewId(null);
    }
  };

  const [isBatchSaving, setIsBatchSaving] = useState(false);

  const handleBatchApproveFacility = async () => {
    if (!selectedRow || !selectedRow.images.length) return;
    const cleanReviewer = reviewerName.trim();
    if (!cleanReviewer) {
      setReviewerError(true);
      return;
    }
    setReviewerError(false);
    setSyncNotice(null);
    setIsBatchSaving(true);

    const timestamp = new Date().toISOString();
    const updatedRecords: ImageReviewRecord[] = selectedRow.images.map(report => {
      const reviewId = getImageReviewId(report);
      return {
        id: reviewId,
        reportId: report.id,
        rowIndex: report.rowIndex,
        ngay: dateIso,
        gio: report.gio || '',
        coSo: report.coSo,
        khuVuc: report.khuVuc || '',
        linkAnh: report.linkAnh,
        nguoiBaoCao: report.nguoiKiemTra || '',
        reviewed: true,
        reviewStatus: 'approved',
        trangThaiKiemDuyet: 'Đã duyệt',
        nguoiKiemDuyet: cleanReviewer,
        thoiGianKiemDuyet: timestamp,
        syncedToSheet: false,
      };
    });

    setImageReviews(current => {
      const next = { ...current };
      updatedRecords.forEach(rec => {
        next[rec.id] = rec;
      });
      return next;
    });

    try {
      const result = await batchSaveImageReviews(updatedRecords, newSheetScriptUrl);
      if (result.records) {
        setImageReviews(current => {
          const next = { ...current };
          result.records.forEach(rec => {
            next[rec.id] = rec;
          });
          return next;
        });
      }
      setSyncNotice({
        tone: 'success',
        message: `✓ Đã duyệt đạt tất cả ${updatedRecords.length} ảnh và cập nhật trực tiếp hàng trong Sheet!`
      });
    } catch (error) {
      setSyncNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Không thể lưu duyệt hàng loạt.',
      });
    } finally {
      setIsBatchSaving(false);
    }
  };

  const handleBatchResetFacility = async () => {
    if (!selectedRow || !selectedRow.images.length) return;
    setSyncNotice(null);
    setIsBatchSaving(true);

    const timestamp = new Date().toISOString();
    const updatedRecords: ImageReviewRecord[] = selectedRow.images.map(report => {
      const reviewId = getImageReviewId(report);
      return {
        id: reviewId,
        reportId: report.id,
        rowIndex: report.rowIndex,
        ngay: dateIso,
        gio: report.gio || '',
        coSo: report.coSo,
        khuVuc: report.khuVuc || '',
        linkAnh: report.linkAnh,
        nguoiBaoCao: report.nguoiKiemTra || '',
        reviewed: false,
        reviewStatus: 'pending',
        trangThaiKiemDuyet: 'Chưa duyệt',
        nguoiKiemDuyet: '',
        thoiGianKiemDuyet: timestamp,
        syncedToSheet: false,
      };
    });

    setImageReviews(current => {
      const next = { ...current };
      updatedRecords.forEach(rec => {
        next[rec.id] = rec;
      });
      return next;
    });

    try {
      const result = await batchSaveImageReviews(updatedRecords, newSheetScriptUrl);
      if (result.records) {
        setImageReviews(current => {
          const next = { ...current };
          result.records.forEach(rec => {
            next[rec.id] = rec;
          });
          return next;
        });
      }
      setSyncNotice({
        tone: 'success',
        message: `✓ Đã bỏ lựa chọn ${updatedRecords.length} ảnh và cập nhật hàng tương ứng trong Sheet!`
      });
    } catch (error) {
      setSyncNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Không thể cập nhật.',
      });
    } finally {
      setIsBatchSaving(false);
    }
  };

  const openFacility = (facilityName: string) => {
    setSelectedFacility(facilityName);
    setFilter('all');
    setReviewerError(false);
  };

  const closeFacility = () => {
    setSelectedFacility(null);
    setReviewerError(false);
  };

  const selectedCounts = useMemo(() => {
    if (!selectedRow) return { approved: 0, rejected: 0, pending: 0 };
    let approved = 0;
    let rejected = 0;
    selectedRow.images.forEach(image => {
      const status = getReviewStatus(imageReviews[getImageReviewId(image)]);
      if (status === 'approved') approved += 1;
      if (status === 'rejected') rejected += 1;
    });
    return {
      approved,
      rejected,
      pending: Math.max(0, selectedRow.images.length - approved - rejected),
    };
  }, [imageReviews, selectedRow]);

  useEffect(() => {
    try {
      window.localStorage.setItem(NEW_SHEET_STORAGE_KEY, newSheetScriptUrl);
    } catch {
      // ignore
    }
  }, [newSheetScriptUrl]);

  const reportsForDate = useMemo(() => {
    return reports.filter(report => normalizeDateToIso(report.ngay) === dateIso);
  }, [reports, dateIso]);

  const preparedDateRecords = useMemo(() => {
    return reportsForDate.map(report => {
      const reviewId = getImageReviewId(report);
      const review = imageReviews[reviewId];
      const reviewStatus = getReviewStatus(review, report);
      const reviewer = review?.nguoiKiemDuyet || (reviewStatus === 'approved' ? (report.daDuyet || 'Đã duyệt') : reviewStatus === 'rejected' ? (report.khongDat || 'Không đạt') : '');
      const reviewTime = review?.thoiGianKiemDuyet ? new Date(review.thoiGianKiemDuyet).toLocaleString('vi-VN') : '';
      const reviewNote = reviewer ? (reviewTime ? `${reviewer} (${reviewTime})` : reviewer) : '';

      const daDuyet = reviewStatus === 'approved' ? (reviewNote || 'Đã duyệt') : '';
      const khongDat = reviewStatus === 'rejected' ? (reviewNote || 'Không đạt') : '';

      return {
        ngay: report.ngay,
        gio: report.gio,
        nguoiKiemTra: report.nguoiKiemTra,
        coSo: report.coSo,
        khuVuc: report.khuVuc,
        trangThai: report.trangThai,
        diemSo: report.diemSo,
        chiTiet: report.chiTiet,
        phanHoi: report.phanHoi,
        feedbackNguoiDung: report.feedbackNguoiDung,
        linkAnh: report.linkAnh,
        daDuyet,
        khongDat,
      };
    });
  }, [reportsForDate, imageReviews]);

  const handleDownloadCsv = () => {
    if (!preparedDateRecords.length) {
      setSyncAllStatus({ type: 'error', message: 'Không có dữ liệu vệ sinh nào trong ngày này để tải về.' });
      return;
    }
    const headers = [
      'Ngày', 'Giờ', 'Người kiểm tra', 'Cơ sở', 'Khu vực',
      'Trạng thái', 'Điểm số', 'Chi tiết', 'Phản hồi',
      'Feedback từ người dùng', 'Link ảnh', 'Đã duyệt', 'Không đạt'
    ];
    const escapeCsv = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = preparedDateRecords.map(r => [
      r.ngay, r.gio, r.nguoiKiemTra, r.coSo, r.khuVuc,
      r.trangThai, r.diemSo, r.chiTiet, r.phanHoi,
      r.feedbackNguoiDung, r.linkAnh, r.daDuyet, r.khongDat
    ]);
    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kiem-duyet-ve-sinh-${dateIso}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSyncAllStatus({ type: 'success', message: `Đã xuất file CSV với ${preparedDateRecords.length} dòng thành công!` });
  };

  const handleSyncAllToNewSheet = async () => {
    if (!preparedDateRecords.length) {
      setSyncAllStatus({ type: 'error', message: 'Không có dữ liệu kiểm tra vệ sinh nào trong ngày này để ghi.' });
      return;
    }
    setIsSyncingAll(true);
    setSyncAllStatus(null);
    try {
      let isSuccess = false;
      let successMsg = '';

      // 1. Thử qua backend nếu server có endpoint
      try {
        const res = await fetch('/api/sync-day-to-new-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: dateIso,
            scriptUrl: newSheetScriptUrl.trim() || undefined,
            records: preparedDateRecords,
          }),
        });
        const text = await res.text().catch(() => '');
        if (text) {
          try {
            const data = JSON.parse(text);
            if (res.ok && data?.success) {
              isSuccess = true;
              successMsg = data.message || `Đã ghi nhận toàn bộ ${preparedDateRecords.length} dòng sang Sheet mới thành công!`;
            }
          } catch {
            // Non-JSON response, ignore
          }
        }
      } catch (e) {
        console.warn('API backend chưa phản hồi, chuyển sang đồng bộ trực tiếp Apps Script:', e);
      }

      // 2. Fallback: Gửi trực tiếp đến Google Apps Script từ trình duyệt
      if (!isSuccess) {
        const targetUrl = newSheetScriptUrl.trim() || DEFAULT_NEW_SHEET_APPS_SCRIPT_URL;
        let directErrorHint = '';
        try {
          const directResp = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'sync_full_day_hygiene_reviews',
              date: dateIso,
              count: preparedDateRecords.length,
              records: preparedDateRecords,
              timestamp: new Date().toISOString(),
            }),
          });
          const text = await directResp.text().catch(() => '');
          if (text) {
            try {
              const directData = JSON.parse(text);
              if (directResp.ok && (directData?.success || directData?.status === 'ok')) {
                isSuccess = true;
                successMsg = directData?.message || `Đã ghi nhận toàn bộ ${preparedDateRecords.length} dòng sang Sheet mới thành công!`;
              }
            } catch {
              if (text.includes('Page not found') || text.includes('unable to open the file') || text.includes('accounts.google.com')) {
                directErrorHint = "Link Web App Google Apps Script chưa được cấp quyền công khai hoặc đã bị thay đổi URL. Vui lòng vào Apps Script > 'Triển khai mới' > chọn 'Người có quyền truy cập' là 'Bất kỳ ai' (Anyone).";
              }
            }
          }
        } catch (err: any) {
          directErrorHint = err.message || 'Không thể kết nối trực tiếp đến Google Apps Script.';
        }

        if (!isSuccess && directErrorHint) {
          throw new Error(directErrorHint);
        }
      }

      if (isSuccess) {
        setSyncAllStatus({
          type: 'success',
          message: successMsg,
        });
      } else {
        setSyncAllStatus({
          type: 'error',
          message: 'Đồng bộ sang Sheet mới chưa thành công. Vui lòng kiểm tra lại kết nối mạng hoặc URL Apps Script.',
        });
      }
    } catch (err: any) {
      setSyncAllStatus({
        type: 'error',
        message: err.message || 'Lỗi mạng kết nối máy chủ.',
      });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleTriggerDailyAutoSyncNow = async () => {
    setIsTriggeringAutoSync(true);
    setSyncAllStatus(null);
    try {
      let isSuccess = false;
      let successMsg = '';
      let directErrorHint = '';

      // 1. Thử gọi backend /api/trigger-daily-sync
      try {
        const res = await fetch('/api/trigger-daily-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: dateIso,
            scriptUrl: newSheetScriptUrl.trim() || undefined,
          }),
        });
        const text = await res.text().catch(() => '');
        if (text) {
          try {
            const data = JSON.parse(text);
            if (res.ok && data?.success) {
              isSuccess = true;
              successMsg = data.message || `Đã tự động lấy và đổ ${data.count || 0} dòng sang Sheet Mới thành công!`;
              fetchAutoSyncStatus();
            }
          } catch {
            // Non-JSON response, ignore
          }
        }
      } catch (e) {
        console.warn('Backend trigger không phản hồi, kích hoạt fallback đổ trực tiếp:', e);
      }

      // 2. Fallback: Nếu backend không phản hồi (ví dụ deploy trên Vercel/Netlify không có server Node.js),
      // tự động đổ danh sách dữ liệu hiện tại trực tiếp sang Web App Google Apps Script!
      if (!isSuccess && preparedDateRecords.length > 0) {
        const targetUrl = newSheetScriptUrl.trim() || DEFAULT_NEW_SHEET_APPS_SCRIPT_URL;
        try {
          const directResp = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'sync_full_day_hygiene_reviews',
              date: dateIso,
              count: preparedDateRecords.length,
              records: preparedDateRecords,
              timestamp: new Date().toISOString(),
            }),
          });
          const text = await directResp.text().catch(() => '');
          if (text) {
            try {
              const directData = JSON.parse(text);
              if (directResp.ok && (directData?.success || directData?.status === 'ok')) {
                isSuccess = true;
                successMsg = directData?.message || `Đã tự động đổ ${preparedDateRecords.length} dòng sang Sheet mới thành công!`;
              }
            } catch {
              if (text.includes('Page not found') || text.includes('unable to open the file') || text.includes('accounts.google.com')) {
                directErrorHint = "Link Web App Google Apps Script chưa được cấp quyền công khai hoặc đã bị thay đổi URL. Vui lòng vào Apps Script > 'Triển khai mới' > chọn 'Người có quyền truy cập' là 'Bất kỳ ai' (Anyone).";
              }
            }
          }
        } catch (err: any) {
          directErrorHint = err.message || 'Không thể kết nối trực tiếp đến Google Apps Script.';
        }

        if (!isSuccess && directErrorHint) {
          throw new Error(directErrorHint);
        }
      }

      if (isSuccess) {
        setSyncAllStatus({
          type: 'success',
          message: successMsg,
        });
      } else {
        setSyncAllStatus({
          type: 'error',
          message: 'Tự động đổ dữ liệu chưa thành công. Vui lòng kiểm tra lại URL Google Apps Script.',
        });
      }
    } catch (err: any) {
      setSyncAllStatus({
        type: 'error',
        message: err.message || 'Lỗi mạng khi kích hoạt tự động đổ dữ liệu.',
      });
    } finally {
      setIsTriggeringAutoSync(false);
    }
  };

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className={`flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3 ${isExpanded ? 'border-b border-slate-200' : ''}`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#1A3A5C]">
              <ClipboardCheck className="h-4 w-4 text-sky-700" />
              Kiểm duyệt ảnh ngày hôm trước
            </h3>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-800">
              {dateDisplay}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800" title="Chức năng tự động lấy dữ liệu ngày hôm trước đổ về Sheet mới hằng ngày">
              <Clock className="h-3 w-3 text-emerald-600" />
              Tự động đổ hàng ngày lúc 01:00 AM
            </span>
          </div>
          {isExpanded && (
            <p className="mt-1 text-[11px] text-slate-500">
              {facilityRows.length} cơ sở · {totalImages} ảnh · đạt {reviewSummary.approved} · không đạt {reviewSummary.rejected} · chờ {reviewSummary.pending}. Nhấn “Xem” để kiểm duyệt.
            </p>
          )}
        </div>

        <div className={`flex items-center gap-2 ${isExpanded ? 'w-full sm:w-auto' : ''}`}>
          {isExpanded && (
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:w-64 sm:flex-none">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Tìm tên cơ sở..."
                className="min-w-0 flex-1 bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(current => !current)}
            aria-expanded={isExpanded}
            aria-controls="yesterday-image-review-content"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {isExpanded ? 'Thu gọn' : 'Mở rộng'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Action toolbar for Day Sync / Export to New Sheet */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                Toàn bộ dữ liệu ngày: <strong>{preparedDateRecords.length}</strong> dòng
              </span>
              <span className="text-xs text-slate-300">|</span>
              <span className="text-xs text-slate-500">
                Đã duyệt: <strong className="text-emerald-700">{reviewSummary.approved}</strong> · Không đạt: <strong className="text-rose-600">{reviewSummary.rejected}</strong> · Chờ duyệt: <strong className="text-amber-600">{reviewSummary.pending}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSyncAllToNewSheet}
                disabled={isSyncingAll || !preparedDateRecords.length}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                title="Ghi toàn bộ dữ liệu ngày hôm trước kèm 2 cột Đã duyệt & Không đạt sang Sheet mới"
              >
                {isSyncingAll ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CloudUpload className="h-3.5 w-3.5" />
                )}
                {isSyncingAll ? 'Đang ghi vào Sheet mới...' : 'Đồng bộ toàn bộ ngày sang Sheet mới'}
              </button>
            </div>
          </div>

          {syncAllStatus && (
            <div className={`flex items-center justify-between border-b px-4 py-2 text-xs font-medium ${
              syncAllStatus.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}>
              <span>{syncAllStatus.message}</span>
              <button
                type="button"
                onClick={() => setSyncAllStatus(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div id="yesterday-image-review-content" className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs text-slate-700">
          <thead className="border-b border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-center">STT</th>
              <th className="px-4 py-3">Tên cơ sở</th>
              <th className="px-4 py-3 text-center">Chỉ tiêu/ngày</th>
              <th className="px-4 py-3 text-center">Đã thực hiện</th>
              <th className="px-4 py-3">Tiến độ ngày</th>
              <th className="px-4 py-3 text-center">Kiểm duyệt</th>
              <th className="px-4 py-3 text-center">Báo cáo chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((row, index) => {
              const approved = row.images.filter(image => getReviewStatus(imageReviews[getImageReviewId(image)]) === 'approved').length;
              const rejected = row.images.filter(image => getReviewStatus(imageReviews[getImageReviewId(image)]) === 'rejected').length;
              const evaluated = approved + rejected;
              const reviewProgress = row.images.length > 0 ? (evaluated / row.images.length) * 100 : 0;

              return (
                <tr key={row.coSo} className="transition-colors hover:bg-sky-50/50">
                  <td className="px-4 py-3 text-center font-mono text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Building2 className="h-4 w-4 shrink-0 text-sky-700" />
                      {row.coSo}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-slate-800">
                      {row.target} lượt/ngày
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 font-bold text-sky-700">
                      {row.performed} lượt
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-44">
                      <div className="mb-1 flex items-center justify-between text-[10px] font-bold">
                        <span className={row.progress >= 100 ? 'text-emerald-700' : row.progress >= 50 ? 'text-sky-700' : 'text-amber-700'}>
                          {row.progress.toFixed(1)}%
                        </span>
                        <span className="text-slate-500">{row.performed}/{row.target} lượt</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${row.progress >= 100 ? 'bg-emerald-500' : row.progress >= 50 ? 'bg-sky-500' : 'bg-amber-400'}`}
                          style={{ width: `${row.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="mx-auto w-28">
                      <div className="mb-1 flex items-center justify-between text-[10px] font-bold">
                        <span className={evaluated === row.images.length && row.images.length > 0 ? 'text-emerald-700' : 'text-slate-600'}>
                          {evaluated}/{row.images.length}
                        </span>
                        <span className="text-slate-400">{reviewProgress.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${reviewProgress}%` }} />
                      </div>
                      <div className="mt-1 text-center text-[9px] font-semibold text-slate-400">
                        <span className="text-emerald-600">Đạt {approved}</span> · <span className="text-rose-600">Không đạt {rejected}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => openFacility(row.coSo)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-[11px] font-bold text-sky-700 transition hover:bg-sky-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Xem
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
        </>
      )}

      {selectedRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-2 backdrop-blur-xs sm:p-4"
          onClick={closeFacility}
        >
          <div
            className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="flex items-center gap-2 text-base font-black text-slate-900">
                    <Building2 className="h-5 w-5 text-sky-700" />
                    {selectedRow.coSo}
                  </h4>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">
                    {dateDisplay}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedRow.images.length} ảnh · đạt {selectedCounts.approved} · không đạt {selectedCounts.rejected} · chờ {selectedCounts.pending}
                </p>
              </div>
              <button
                type="button"
                onClick={closeFacility}
                className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 sm:static"
                title="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">Nhân viên kiểm duyệt</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={reviewerName}
                      onChange={event => {
                        setReviewerName(event.target.value);
                        if (event.target.value.trim()) setReviewerError(false);
                      }}
                      placeholder="Nhập tên một lần trên thiết bị này"
                      className={`w-72 rounded-lg border bg-white px-3 py-2 text-xs text-slate-800 outline-none ${reviewerError ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100'}`}
                    />
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                      isLoadingReviews
                        ? 'border-slate-200 bg-slate-50 text-slate-600'
                        : syncNotice?.tone === 'error'
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : syncNotice?.tone === 'warning'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}>
                      {isLoadingReviews
                        ? 'Đang tải trạng thái…'
                        : syncNotice?.message || 'Sẵn sàng đồng bộ Google Sheet'}
                    </span>
                  </div>
                  {reviewerError && (
                    <p className="mt-1 text-[10px] font-semibold text-rose-600">Vui lòng nhập tên trước khi tích ảnh.</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      ['all', 'Tất cả', selectedRow.images.length],
                      ['pending', 'Chưa đánh giá', selectedCounts.pending],
                      ['approved', 'Đã duyệt', selectedCounts.approved],
                      ['rejected', 'Không đạt', selectedCounts.rejected],
                    ] as Array<[ImageFilter, string, number]>).map(([value, label, count]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold ${filter === value ? 'border-sky-700 bg-sky-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        {label} ({count})
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                    <button
                      type="button"
                      onClick={handleBatchApproveFacility}
                      disabled={isBatchSaving || selectedRow.images.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                      title="Duyệt đạt tất cả ảnh của cơ sở này và tự động cập nhật hàng trong Sheet"
                    >
                      {isBatchSaving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Duyệt đạt tất cả ({selectedRow.images.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleBatchResetFacility}
                      disabled={isBatchSaving || selectedRow.images.length === 0}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      title="Bỏ đánh giá tất cả ảnh của cơ sở này"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Bỏ chọn tất cả
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/70 p-3 sm:p-4">
              {selectedImages.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {selectedImages.map((report, index) => {
                    const reviewId = getImageReviewId(report);
                    const review = imageReviews[reviewId];
                    const reviewStatus = getReviewStatus(review, report);
                    const approved = reviewStatus === 'approved';
                    const rejected = reviewStatus === 'rejected';

                    return (
                      <article
                        key={reviewId}
                        className={`overflow-hidden rounded-xl border bg-white transition ${
                          approved
                            ? 'border-emerald-300 shadow-[0_0_0_2px_rgba(16,185,129,0.08)]'
                            : rejected
                            ? 'border-rose-300 shadow-[0_0_0_2px_rgba(244,63,94,0.08)]'
                            : 'border-slate-200 hover:border-sky-300 hover:shadow-sm'
                        }`}
                      >
                        <a
                          href={report.linkAnh}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative block aspect-[4/3] overflow-hidden bg-slate-100"
                          title="Mở ảnh gốc"
                        >
                          <img
                            src={report.linkAnh}
                            alt={`Ảnh ${index + 1} - ${selectedRow.coSo}`}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            onError={event => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                          <span className="absolute right-2 top-2 rounded-md bg-slate-900/70 p-1.5 text-white backdrop-blur-sm">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </span>
                          <span className="absolute bottom-2 left-2 rounded-md bg-slate-900/75 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                            Ảnh {index + 1}
                          </span>
                        </a>

                        <div className="space-y-2 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 text-[11px] text-slate-600">
                              <p className="truncate font-bold text-slate-800">{report.khuVuc || 'Chưa ghi khu vực'}</p>
                              <p className="mt-0.5 flex items-center gap-1 truncate">
                                <User className="h-3 w-3 shrink-0 text-slate-400" />
                                {report.nguoiKiemTra || 'Chưa ghi người báo cáo'}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-400">{report.gio || '—'} · {report.trangThai || 'Chưa đánh giá'}</p>
                            </div>

                            <div className="flex shrink-0 items-start gap-2">
                              <label className="flex cursor-pointer flex-col items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={approved}
                                  onChange={() => setImageReviewStatus(report, 'approved')}
                                  disabled={savingReviewId === reviewId || isLoadingReviews}
                                  aria-label={`Đánh dấu đạt ảnh ${index + 1} của ${selectedRow.coSo}`}
                                  className="h-7 w-7 cursor-pointer rounded border-slate-300 accent-emerald-600 disabled:cursor-wait disabled:opacity-50"
                                />
                                <span className={`text-[10px] font-black ${approved ? 'text-emerald-700' : 'text-slate-400'}`}>
                                  Đã duyệt
                                </span>
                              </label>
                              <label className="flex cursor-pointer flex-col items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={rejected}
                                  onChange={() => setImageReviewStatus(report, 'rejected')}
                                  disabled={savingReviewId === reviewId || isLoadingReviews}
                                  aria-label={`Đánh dấu không đạt ảnh ${index + 1} của ${selectedRow.coSo}`}
                                  className="h-7 w-7 cursor-pointer rounded border-slate-300 accent-rose-600 disabled:cursor-wait disabled:opacity-50"
                                />
                                <span className={`text-[10px] font-black ${rejected ? 'text-rose-700' : 'text-slate-400'}`}>
                                  Không đạt
                                </span>
                              </label>
                            </div>
                          </div>

                          {reviewStatus !== 'pending' && (
                            <div className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-semibold ${
                              approved
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-rose-200 bg-rose-50 text-rose-700'
                            }`}>
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              {approved ? 'Đã duyệt' : 'Không đạt'} · {review.nguoiKiemDuyet} · {formatReviewedTime(review.thoiGianKiemDuyet)}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-center text-sm text-slate-500">
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                  <p>{selectedRow.images.length === 0 ? 'Cơ sở chưa có ảnh báo cáo trong ngày này.' : 'Không có ảnh phù hợp với bộ lọc.'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs sm:p-4"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-800">Cấu hình Google Sheet Mới độc lập</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4 text-xs text-slate-600">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <Zap className="h-4 w-4 text-emerald-600" />
                  <span>Cơ chế tự động đổ dữ liệu hằng ngày (Daily Auto-Sync)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-800">
                  Hệ thống tự động kiểm tra Sheet gốc và đổ toàn bộ dữ liệu kiểm tra vệ sinh của ngày hôm trước (kèm 2 cột <em>Đã duyệt</em> & <em>Không đạt</em>) sang Google Sheet mới vào lúc <strong>01:00 AM mỗi sáng (Giờ Việt Nam)</strong>.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                  <span className="font-semibold text-slate-700">Trạng thái hiện tại:</span>
                  <span className={`rounded-full px-2 py-0.5 font-bold ${
                    autoSyncInfo?.enabled || newSheetScriptUrl
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}>
                    {autoSyncInfo?.enabled || newSheetScriptUrl ? '✓ Đang bật (Chạy tự động lúc 01:00 AM)' : 'Chưa kích hoạt (Cần dán link bên dưới)'}
                  </span>
                  {autoSyncInfo?.lastAutoSyncDate && (
                    <span className="text-slate-500">· Ngày hoàn thành gần nhất: <strong>{autoSyncInfo.lastAutoSyncDate}</strong></span>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Đường dẫn Web App (Apps Script URL) của Sheet Mới:
                </label>
                <input
                  type="url"
                  value={newSheetScriptUrl}
                  onChange={e => setNewSheetScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Dán URL Web App của Sheet mới vào đây để kích hoạt cơ chế tự động đổ dữ liệu.
                </p>
              </div>

              {autoSyncInfo?.recentLogs && autoSyncInfo.recentLogs.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <History className="h-3.5 w-3.5 text-slate-600" />
                    <span>Nhật ký tự động đổ dữ liệu gần nhất:</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 text-[11px]">
                    {autoSyncInfo.recentLogs.map(log => (
                      <div
                        key={log.id}
                        className={`flex items-center justify-between rounded-md px-2.5 py-1.5 ${
                          log.status === 'success' ? 'bg-emerald-100/60 text-emerald-900' : 'bg-rose-100/60 text-rose-900'
                        }`}
                      >
                        <span className="font-semibold">{log.date}: {log.message}</span>
                        <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                          {new Date(log.timestamp).toLocaleTimeString('vi-VN')} {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Mã Google Apps Script để dán vào Sheet Mới:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2500);
                    }}
                    className="inline-flex items-center gap-1 rounded bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-300 hover:bg-emerald-50 shadow-xs"
                  >
                    {copiedScript ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedScript ? 'Đã sao chép!' : 'Sao chép mã script'}
                  </button>
                </div>
                <pre className="max-h-48 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-[10px] text-emerald-300 leading-relaxed">
                  {APPS_SCRIPT_TEMPLATE}
                </pre>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-600 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <strong className="text-slate-800 block text-xs">2 cách tự động đổ dữ liệu hàng ngày:</strong>
                <p>
                  <strong>Cách 1 (Khuyên dùng - Tự động qua hệ thống web):</strong> Dán link Web App vào ô trên và nhấn <em>"Lưu & Kích hoạt tự động"</em>. Máy chủ sẽ tự động chạy hàng ngày lúc 01:00 AM.
                </p>
                <p>
                  <strong>Cách 2 (Chạy độc lập trên Google Cloud):</strong> Trong trình soạn thảo Apps Script của Google Sheet mới, ở menu dropdown chọn hàm <code>taoLichTuDongHangNgay</code> rồi nhấn nút <strong>Chạy (Run)</strong> một lần. Google sẽ tự động kích hoạt hẹn giờ kéo dữ liệu mỗi sáng vĩnh viễn mà không phụ thuộc vào bất cứ đâu!
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={async () => {
                  if (newSheetScriptUrl.trim()) {
                    await fetch('/api/auto-sync-config', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ scriptUrl: newSheetScriptUrl.trim() }),
                    }).catch(() => {});
                    fetchAutoSyncStatus();
                  }
                  setShowSettingsModal(false);
                }}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
              >
                Lưu & Kích hoạt tự động
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
