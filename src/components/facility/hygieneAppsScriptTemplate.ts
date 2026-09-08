export const APPS_SCRIPT_TEMPLATE = `function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Google Apps Script Web App đang hoạt động bình thường! Sẵn sàng nhận dữ liệu."
  })).setMimeType(ContentService.MimeType.JSON);
}

// -----------------------------------------------------------------------------
// CÁC HÀM CHUẨN HÓA DỮ LIỆU ĐỂ SO SÁNH & CẬP NHẬT TRỰC TIẾP TRÊN HÀNG CÓ SẴN
// -----------------------------------------------------------------------------

// Chuẩn hóa ngày về dạng yyyy-MM-dd để so sánh đồng nhất
function normDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Ho_Chi_Minh", "yyyy-MM-dd");
  }
  var s = String(val).trim();
  var mYmd = s.match(/^(\\d{4})[\\/-](\\d{1,2})[\\/-](\\d{1,2})/);
  if (mYmd) {
    return mYmd[1] + "-" + ("0" + mYmd[2]).slice(-2) + "-" + ("0" + mYmd[3]).slice(-2);
  }
  var mDmy = s.match(/^(\\d{1,2})[\\/-](\\d{1,2})[\\/-](\\d{4})/);
  if (mDmy) {
    return mDmy[3] + "-" + ("0" + mDmy[2]).slice(-2) + "-" + ("0" + mDmy[1]).slice(-2);
  }
  var d = new Date(val);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, "Asia/Ho_Chi_Minh", "yyyy-MM-dd");
  }
  return s;
}

// Chuẩn hóa giờ về dạng HH:mm (ví dụ "20:43")
function normTime(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Ho_Chi_Minh", "HH:mm");
  }
  var s = String(val).trim();
  var m = s.match(/(\\d{1,2}):(\\d{2})/);
  if (m) {
    return ("0" + m[1]).slice(-2) + ":" + m[2];
  }
  return s;
}

// Chuẩn hóa chuỗi văn bản (bỏ dấu cách thừa, viết thường)
function normStr(val) {
  if (val === null || val === undefined) return "";
  return String(val).replace(/\\s+/g, " ").trim().toLowerCase();
}

// Chuẩn hóa link ảnh (bỏ qua query parameters nếu có)
function normLink(val) {
  if (!val) return "";
  var s = String(val).trim();
  var m = s.match(/https?:\\/\\/[^\\s"'\\)]+/i);
  if (m) {
    return m[0].split("?")[0].trim().toLowerCase();
  }
  return s.toLowerCase();
}

// Chuẩn hóa hiển thị ngày dd/MM/yyyy
function formatCellDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Ho_Chi_Minh", "dd/MM/yyyy");
  }
  var s = String(val).trim();
  var mYmd = s.match(/^(\\d{4})[\\/-](\\d{1,2})[\\/-](\\d{1,2})/);
  if (mYmd) {
    return ("0" + mYmd[3]).slice(-2) + "/" + ("0" + mYmd[2]).slice(-2) + "/" + mYmd[1];
  }
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
      var targetDateStr = normDate(payload.date || "");

      if (!records.length && !targetDateStr) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Không có bản ghi cảnh báo nào"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var incomingMap = {};
      var incomingKeys = [];
      var incomingUsed = {};

      records.forEach(function(r) {
        var recDate = normDate(r.ngay || targetDateStr);
        var recFacility = normStr(r.coSo);
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

      var finalRows = [];
      if (lastRow > 1) {
        var existingData = warningSheet.getRange(2, 1, lastRow - 1, 8).getValues();
        for (var i = 0; i < existingData.length; i++) {
          var row = existingData[i];
          var rowDate = normDate(row[0]);
          var rowFacility = normStr(row[1]);
          var rowKey = rowDate + "|" + rowFacility;

          if (incomingMap.hasOwnProperty(rowKey)) {
            if (!incomingUsed[rowKey]) {
              finalRows.push(incomingMap[rowKey]);
              incomingUsed[rowKey] = true;
            }
          } else {
            finalRows.push([
              row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7]
            ]);
          }
        }
      }

      for (var k = 0; k < incomingKeys.length; k++) {
        var keyToCheck = incomingKeys[k];
        if (!incomingUsed[keyToCheck]) {
          finalRows.push(incomingMap[keyToCheck]);
          incomingUsed[keyToCheck] = true;
        }
      }

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
    // Khi nhân viên xem và nhấn tick ("Đã duyệt" / "Không đạt") hoặc xóa nhận định
    // ĐIỀU CHỈNH TRỰC TIẾP TRÊN HÀNG CÓ SẴN - TUYỆT ĐỐI KHÔNG TẠO HÀNG THỪA MỚI
    // =========================================================================
    if (action === "upsert_image_review" || action === "update_image_review") {
      var hygieneSheet = ss.getSheetByName("Kiểm duyệt vệ sinh") || ss.getSheets()[0];
      var lastRow = hygieneSheet.getLastRow();
      var targetDate = normDate(payload.ngay || (payload.record && payload.record.ngay) || "");
      var targetLink = normLink(payload.linkAnh || (payload.record && payload.record.linkAnh) || "");
      var targetFacility = normStr(payload.coSo || (payload.record && payload.record.coSo) || "");
      var targetArea = normStr(payload.khuVuc || (payload.record && payload.record.khuVuc) || "");
      var targetTime = normTime(payload.gio || (payload.record && payload.record.gio) || "");

      var daDuyetVal = payload.daDuyet !== undefined ? payload.daDuyet : (payload.reviewStatus === "approved" ? (payload.reviewer || "Đã duyệt") : "");
      var khongDatVal = payload.khongDat !== undefined ? payload.khongDat : (payload.reviewStatus === "rejected" ? (payload.reviewer || "Không đạt") : "");
      var nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

      var foundRow = -1;
      if (lastRow > 1) {
        var data = hygieneSheet.getRange(2, 1, lastRow - 1, 14).getValues();

        // Bước 1: Khớp theo Link ảnh chính xác (nếu có link)
        if (targetLink && targetLink.length > 10) {
          for (var i = 0; i < data.length; i++) {
            var rLink = normLink(data[i][10]);
            if (rLink && rLink === targetLink) {
              foundRow = i + 2;
              break;
            }
          }
        }

        // Bước 2: Khớp theo Ngày + Cơ sở + Khu vực + Giờ
        if (foundRow === -1 && targetDate && targetFacility && targetArea) {
          for (var i = 0; i < data.length; i++) {
            var rDate = normDate(data[i][0]);
            var rCoSo = normStr(data[i][3]);
            var rKhuVuc = normStr(data[i][4]);
            var rGio = normTime(data[i][1]);

            if (rDate === targetDate && rCoSo === targetFacility && rKhuVuc === targetArea) {
              if (!targetTime || !rGio || targetTime === rGio) {
                foundRow = i + 2;
                break;
              }
            }
          }
        }

        // Bước 3: Khớp theo Ngày + Cơ sở + Khu vực
        if (foundRow === -1 && targetDate && targetFacility && targetArea) {
          for (var i = 0; i < data.length; i++) {
            var rDate = normDate(data[i][0]);
            var rCoSo = normStr(data[i][3]);
            var rKhuVuc = normStr(data[i][4]);
            if (rDate === targetDate && rCoSo === targetFacility && rKhuVuc === targetArea) {
              foundRow = i + 2;
              break;
            }
          }
        }
      }

      if (foundRow > 1) {
        // CẬP NHẬT TRỰC TIẾP TRÊN HÀNG ĐÃ CÓ TRONG SHEET:
        // Cột 12: Đã duyệt, Cột 13: Không đạt, Cột 14: Thời gian đồng bộ
        hygieneSheet.getRange(foundRow, 12, 1, 3).setValues([[daDuyetVal, khongDatVal, nowStr]]);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Đã cập nhật trực tiếp trên hàng " + foundRow + " của sheet 'Kiểm duyệt vệ sinh'!",
          updatedRow: foundRow
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        // Chỉ thêm dòng mới nếu hàng thực sự chưa từng có trong Sheet
        var rec = payload.record || {};
        var newRow = [
          targetDate || payload.ngay || "",
          payload.gio || rec.gio || "",
          rec.nguoiBaoCao || rec.nguoiKiemTra || "",
          payload.coSo || rec.coSo || "",
          payload.khuVuc || rec.khuVuc || "",
          rec.trangThai || "",
          rec.diemSo !== undefined ? rec.diemSo : "",
          rec.chiTiet || "",
          rec.phanHoi || "",
          rec.feedbackNguoiDung || "",
          payload.linkAnh || rec.linkAnh || "",
          daDuyetVal,
          khongDatVal,
          nowStr
        ];
        hygieneSheet.appendRow(newRow);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Đã thêm mới bản ghi vào sheet 'Kiểm duyệt vệ sinh'!",
          appendedRow: hygieneSheet.getLastRow()
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // =========================================================================
    // 3. CẬP NHẬT HÀNG LOẠT (Khi nhấn Duyệt tất cả hoặc Hủy nhận định cơ sở)
    // ĐIỀU CHỈNH TRỰC TIẾP TRÊN HÀNG ĐÃ CÓ - KHÔNG THÊM HÀNG MỚI
    // =========================================================================
    if (action === "batch_update_image_reviews") {
      var hygieneSheet = ss.getSheetByName("Kiểm duyệt vệ sinh") || ss.getSheets()[0];
      var lastRow = hygieneSheet.getLastRow();
      var updates = payload.updates || [];
      var nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

      if (lastRow > 1 && updates.length > 0) {
        var data = hygieneSheet.getRange(2, 1, lastRow - 1, 14).getValues();
        var linkMap = {};
        var keyMap = {};

        for (var u = 0; u < updates.length; u++) {
          var item = updates[u];
          var uLink = normLink(item.linkAnh);
          if (uLink && uLink.length > 10) linkMap[uLink] = item;
          var uKey = normDate(item.ngay) + "|" + normStr(item.coSo) + "|" + normStr(item.khuVuc) + "|" + normTime(item.gio);
          keyMap[uKey] = item;
        }

        for (var i = 0; i < data.length; i++) {
          var rLink = normLink(data[i][10]);
          var rKey = normDate(data[i][0]) + "|" + normStr(data[i][3]) + "|" + normStr(data[i][4]) + "|" + normTime(data[i][1]);

          var matched = null;
          if (rLink && linkMap.hasOwnProperty(rLink)) {
            matched = linkMap[rLink];
          } else if (keyMap.hasOwnProperty(rKey)) {
            matched = keyMap[rKey];
          }

          if (matched) {
            data[i][11] = matched.daDuyet || "";
            data[i][12] = matched.khongDat || "";
            data[i][13] = nowStr;
          }
        }
        hygieneSheet.getRange(2, 1, lastRow - 1, 14).setValues(data);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Đã cập nhật trực tiếp trên các hàng của sheet 'Kiểm duyệt vệ sinh'!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // 4. ĐỒNG BỘ TOÀN BỘ NGÀY & DỌN DẸP SẠCH DÒNG THỪA TRÙNG LẶP
    // CẬP NHẬT TRỰC TIẾP TRÊN HÀNG CÓ SẴN - TỰ ĐỘNG XÓA TOÀN BỘ CÁC HÀNG TRÙNG LẶP
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
    var targetDateNorm = normDate(payload.date || (records[0] && records[0].ngay) || "");
    var nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    if (!records.length) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Không có bản ghi" })).setMimeType(ContentService.MimeType.JSON);
    }

    var incomingByLink = {};
    var incomingByKey = {};
    var incomingRecords = [];
    var incomingUsed = {};

    records.forEach(function(r, idx) {
      var rDate = normDate(r.ngay || targetDateNorm);
      var rGio = normTime(r.gio);
      var rCoSo = normStr(r.coSo);
      var rKhuVuc = normStr(r.khuVuc);
      var rLink = normLink(r.linkAnh);
      var recId = "rec_" + idx;

      var rowArr = [
        r.ngay || targetDateNorm,
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

      var item = { id: recId, rowArr: rowArr, rDate: rDate, rGio: rGio, rCoSo: rCoSo, rKhuVuc: rKhuVuc, rLink: rLink };
      incomingRecords.push(item);
      incomingUsed[recId] = false;

      if (rLink && rLink.length > 10) {
        incomingByLink[rLink] = item;
      }
      var key = rDate + "|" + rCoSo + "|" + rKhuVuc + "|" + rGio;
      incomingByKey[key] = item;
    });

    var finalRows = [];
    var lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      var existingData = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

      for (var i = 0; i < existingData.length; i++) {
        var row = existingData[i];
        var rowDate = normDate(row[0]);
        var rowGio = normTime(row[1]);
        var rowCoSo = normStr(row[3]);
        var rowKhuVuc = normStr(row[4]);
        var rowLink = normLink(row[10]);

        // Nếu dòng này thuộc ngày đang đồng bộ:
        if (targetDateNorm && rowDate === targetDateNorm) {
          var matchedItem = null;
          if (rowLink && incomingByLink[rowLink]) {
            matchedItem = incomingByLink[rowLink];
          } else {
            var rKey = rowDate + "|" + rowCoSo + "|" + rowKhuVuc + "|" + rowGio;
            if (incomingByKey[rKey]) {
              matchedItem = incomingByKey[rKey];
            } else {
              for (var j = 0; j < incomingRecords.length; j++) {
                var cand = incomingRecords[j];
                if (cand.rDate === rowDate && cand.rCoSo === rowCoSo && cand.rKhuVuc === rowKhuVuc) {
                  if (!incomingUsed[cand.id]) {
                    matchedItem = cand;
                    break;
                  }
                }
              }
            }
          }

          if (matchedItem) {
            if (!incomingUsed[matchedItem.id]) {
              // CẬP NHẬT TRỰC TIẾP TRÊN HÀNG ĐÃ CÓ TRONG SHEET:
              // Giữ lại kết quả Đã duyệt (cột 12) & Không đạt (cột 13) nếu dòng cũ đã có mà bản ghi mới chưa có
              var newRow = matchedItem.rowArr.slice();
              if (!newRow[11] && row[11]) newRow[11] = row[11];
              if (!newRow[12] && row[12]) newRow[12] = row[12];
              finalRows.push(newRow);
              incomingUsed[matchedItem.id] = true;
            } else {
              // BỎ QUA DÒNG NÀY ĐỂ XÓA SẠCH DÒNG THỪA TRÙNG LẶP TRONG SHEET!
            }
          } else {
            finalRows.push([
              row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], row[12], row[13]
            ]);
          }
        } else {
          // Các ngày khác: Giữ nguyên hoàn toàn vị trí và dữ liệu
          finalRows.push([
            row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], row[12], row[13]
          ]);
        }
      }
    }

    // Thêm các bản ghi của ngày đang xét chưa từng có trong Sheet
    for (var k = 0; k < incomingRecords.length; k++) {
      var rec = incomingRecords[k];
      if (!incomingUsed[rec.id]) {
        finalRows.push(rec.rowArr);
        incomingUsed[rec.id] = true;
      }
    }

    // Ghi lại toàn bộ bảng: Cập nhật trực tiếp trên hàng, dọn sạch hoàn toàn hàng thừa trùng lặp
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
    }
    if (finalRows.length > 0) {
      sheet.getRange(2, 1, finalRows.length, headers.length).setValues(finalRows);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Đã cập nhật trực tiếp trên hàng của sheet 'Kiểm duyệt vệ sinh' và dọn sạch toàn bộ hàng thừa trùng lặp!",
      count: records.length,
      totalRows: finalRows.length
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * TỰ ĐỘNG KÉO DỮ LIỆU HẰNG NGÀY (DAILY AUTO-SYNC)
 * Tự động lấy toàn bộ kiểm tra vệ sinh ngày hôm trước từ Sheet gốc về Sheet này
 * Cập nhật trực tiếp trên hàng đã có, tự động dọn sạch hàng thừa trùng lặp
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
  var lastRow = sheet.getLastRow();
  var targetDateNorm = normDate(targetIso);

  var incomingByLink = {};
  var incomingByKey = {};
  var incomingRecords = [];
  var incomingUsed = {};

  matchingRows.forEach(function(item, idx) {
    var rDate = normDate(item.ngay || targetIso);
    var rGio = normTime(item.gio);
    var rCoSo = normStr(item.coSo);
    var rKhuVuc = normStr(item.khuVuc);
    var rLink = normLink(item.linkAnh);
    var recId = "rec_" + idx;

    var rowArr = [
      item.ngay, item.gio, item.nguoiKiemTra, item.coSo, item.khuVuc,
      item.trangThai, item.diemSo, item.chiTiet, item.phanHoi,
      item.feedbackNguoiDung, item.linkAnh, item.daDuyet || "", item.khongDat || "", nowStr
    ];
    var entry = { id: recId, rowArr: rowArr, rDate: rDate, rGio: rGio, rCoSo: rCoSo, rKhuVuc: rKhuVuc, rLink: rLink };
    incomingRecords.push(entry);
    incomingUsed[recId] = false;

    if (rLink && rLink.length > 10) incomingByLink[rLink] = entry;
    incomingByKey[rDate + "|" + rCoSo + "|" + rKhuVuc + "|" + rGio] = entry;
  });

  var finalRows = [];
  if (lastRow > 1) {
    var existingData = sheet.getRange(2, 1, lastRow - 1, sheetHeaders.length).getValues();
    for (var i = 0; i < existingData.length; i++) {
      var row = existingData[i];
      var rowDate = normDate(row[0]);
      var rowGio = normTime(row[1]);
      var rowCoSo = normStr(row[3]);
      var rowKhuVuc = normStr(row[4]);
      var rowLink = normLink(row[10]);

      if (targetDateNorm && rowDate === targetDateNorm) {
        var matchedItem = null;
        if (rowLink && incomingByLink[rowLink]) {
          matchedItem = incomingByLink[rowLink];
        } else {
          var rKey = rowDate + "|" + rowCoSo + "|" + rowKhuVuc + "|" + rowGio;
          if (incomingByKey[rKey]) {
            matchedItem = incomingByKey[rKey];
          } else {
            for (var j = 0; j < incomingRecords.length; j++) {
              var cand = incomingRecords[j];
              if (cand.rDate === rowDate && cand.rCoSo === rowCoSo && cand.rKhuVuc === rowKhuVuc) {
                if (!incomingUsed[cand.id]) {
                  matchedItem = cand;
                  break;
                }
              }
            }
          }
        }

        if (matchedItem) {
          if (!incomingUsed[matchedItem.id]) {
            var updatedRow = matchedItem.rowArr.slice();
            if (!updatedRow[11] && row[11]) updatedRow[11] = row[11];
            if (!updatedRow[12] && row[12]) updatedRow[12] = row[12];
            finalRows.push(updatedRow);
            incomingUsed[matchedItem.id] = true;
          }
        } else {
          finalRows.push([
            row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], row[12], row[13]
          ]);
        }
      } else {
        finalRows.push([
          row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], row[12], row[13]
        ]);
      }
    }
  }

  for (var k = 0; k < incomingRecords.length; k++) {
    var rec = incomingRecords[k];
    if (!incomingUsed[rec.id]) {
      finalRows.push(rec.rowArr);
      incomingUsed[rec.id] = true;
    }
  }

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheetHeaders.length).clearContent();
  }
  if (finalRows.length > 0) {
    sheet.getRange(2, 1, finalRows.length, sheetHeaders.length).setValues(finalRows);
  }
  Logger.log("Hoàn thành tự động đồng bộ ngày hôm trước: " + finalRows.length + " hàng.");
}

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
    .inTimezone("Asia/Ho_Chi_Minh")
    .create();

  Logger.log("Đã tạo lịch tự động chạy lúc 01:00 AM hằng ngày thành công!");
}
`;
