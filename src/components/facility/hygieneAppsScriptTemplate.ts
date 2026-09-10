export const APPS_SCRIPT_TEMPLATE = `function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Google Apps Script Web App đang hoạt động! Chế độ: Tự động thay thế & Chống trùng lặp tuyệt đối."
  })).setMimeType(ContentService.MimeType.JSON);
}

// =============================================================================
// CÁC HÀM CHUẨN HÓA DỮ LIỆU SIÊU MẠNH - KHÔNG BỊ LỆCH MÚI GIỜ HAY FORMAT
// =============================================================================

// Trích xuất ngày về object { y, m, d } chính xác bất kể Date object hay String
function extractDateParts(val) {
  if (!val) return null;
  if (Object.prototype.toString.call(val) === '[object Date]' || val instanceof Date) {
    return {
      y: val.getFullYear(),
      m: val.getMonth() + 1,
      d: val.getDate()
    };
  }
  var s = String(val).trim();
  // Khớp dạng yyyy-MM-dd hoặc yyyy/MM/dd
  var m1 = s.match(/^(\\d{4})[\\/-](\\d{1,2})[\\/-](\\d{1,2})/);
  if (m1) {
    return { y: parseInt(m1[1], 10), m: parseInt(m1[2], 10), d: parseInt(m1[3], 10) };
  }
  // Khớp dạng dd/MM/yyyy hoặc dd-MM-yyyy
  var m2 = s.match(/^(\\d{1,2})[\\/-](\\d{1,2})[\\/-](\\d{4})/);
  if (m2) {
    return { y: parseInt(m2[3], 10), m: parseInt(m2[2], 10), d: parseInt(m2[1], 10) };
  }
  var dObj = new Date(val);
  if (!isNaN(dObj.getTime())) {
    return { y: dObj.getFullYear(), m: dObj.getMonth() + 1, d: dObj.getDate() };
  }
  return null;
}

// So sánh 2 giá trị ngày có cùng 1 ngày hay không (bất kể format dd/MM/yyyy hay yyyy-MM-dd)
function isSameDay(val1, val2) {
  var p1 = extractDateParts(val1);
  var p2 = extractDateParts(val2);
  if (!p1 || !p2) return false;
  return p1.y === p2.y && p1.m === p2.m && p1.d === p2.d;
}

// Chuẩn hóa ngày về chuỗi ISO yyyy-MM-dd
function normIsoDate(val) {
  var p = extractDateParts(val);
  if (!p) return "";
  return p.y + "-" + ("0" + p.m).slice(-2) + "-" + ("0" + p.d).slice(-2);
}

// Chuẩn hóa giờ về dạng HH:mm (ví dụ "08:30")
function normTime(val) {
  if (!val) return "";
  if (Object.prototype.toString.call(val) === '[object Date]' || val instanceof Date) {
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

// Chuẩn hóa hiển thị ngày dd/MM/yyyy cho ô tính Google Sheet
function formatCellDate(val) {
  var p = extractDateParts(val);
  if (!p) return String(val || "");
  return ("0" + p.d).slice(-2) + "/" + ("0" + p.m).slice(-2) + "/" + p.y;
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
      var targetDateStr = payload.date || "";

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
        var recDateIso = normIsoDate(r.ngay || targetDateStr);
        var recFacility = normStr(r.coSo);
        var key = recDateIso + "|" + recFacility;
        var rowArr = [
          formatCellDate(r.ngay || targetDateStr),
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
          var rowDateIso = normIsoDate(row[0]);
          var rowFacility = normStr(row[1]);
          var rowKey = rowDateIso + "|" + rowFacility;

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
        message: "Đã cập nhật trực tiếp trên hàng của sheet '" + sheetName + "' (đã dọn sạch hàng thừa)!",
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
      var targetDateRaw = payload.ngay || (payload.record && payload.record.ngay) || "";
      var targetLink = normLink(payload.linkAnh || (payload.record && payload.record.linkAnh) || "");
      var targetFacility = normStr(payload.coSo || (payload.record && payload.record.coSo) || "");
      var targetArea = normStr(payload.khuVuc || (payload.record && payload.record.khuVuc) || "");
      var targetTime = normTime(payload.gio || (payload.record && payload.record.gio) || "");

      var daDuyetVal = payload.daDuyet !== undefined ? payload.daDuyet : (payload.reviewStatus === "approved" ? (payload.reviewer || "Đã duyệt") : "");
      var khongDatVal = payload.khongDat !== undefined ? payload.khongDat : (payload.reviewStatus === "rejected" ? (payload.reviewer || "Không đạt") : "");
      var nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

      var foundRow = -1;
      var duplicateRows = [];

      if (lastRow > 1) {
        var data = hygieneSheet.getRange(2, 1, lastRow - 1, 14).getValues();

        // Bước 1: Khớp theo Link ảnh chính xác (nếu có link)
        if (targetLink && targetLink.length > 10) {
          for (var i = 0; i < data.length; i++) {
            var rLink = normLink(data[i][10]);
            if (rLink && rLink === targetLink) {
              if (foundRow === -1) {
                foundRow = i + 2;
              } else {
                duplicateRows.push(i + 2);
              }
            }
          }
        }

        // Bước 2: Khớp theo Ngày + Cơ sở + Khu vực + Giờ
        if (foundRow === -1 && targetDateRaw && targetFacility && targetArea) {
          for (var i = 0; i < data.length; i++) {
            var rDateRaw = data[i][0];
            var rCoSo = normStr(data[i][3]);
            var rKhuVuc = normStr(data[i][4]);
            var rGio = normTime(data[i][1]);

            if (isSameDay(rDateRaw, targetDateRaw) && rCoSo === targetFacility && rKhuVuc === targetArea) {
              if (!targetTime || !rGio || targetTime === rGio) {
                if (foundRow === -1) {
                  foundRow = i + 2;
                } else {
                  duplicateRows.push(i + 2);
                }
              }
            }
          }
        }

        // Bước 3: Khớp theo Ngày + Cơ sở + Khu vực
        if (foundRow === -1 && targetDateRaw && targetFacility && targetArea) {
          for (var i = 0; i < data.length; i++) {
            var rDateRaw = data[i][0];
            var rCoSo = normStr(data[i][3]);
            var rKhuVuc = normStr(data[i][4]);
            if (isSameDay(rDateRaw, targetDateRaw) && rCoSo === targetFacility && rKhuVuc === targetArea) {
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

        // Dọn dẹp dòng trùng thừa nếu có
        if (duplicateRows.length > 0) {
          for (var d = duplicateRows.length - 1; d >= 0; d--) {
            try {
              hygieneSheet.deleteRow(duplicateRows[d]);
            } catch(e) {}
          }
        }

        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Đã cập nhật trực tiếp trên hàng " + foundRow + " của sheet 'Kiểm duyệt vệ sinh'!",
          updatedRow: foundRow,
          cleanedDuplicates: duplicateRows.length
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        // Nếu thực sự chưa có trong bảng thì mới thêm
        var rec = payload.record || {};
        var newRow = [
          formatCellDate(targetDateRaw || payload.ngay),
          payload.gio || rec.gio || "",
          rec.nguoiBaoCao || rec.nguoiKiemTra || "",
          payload.coSo || rec.coSo || "",
          payload.khuVuc || rec.khuVuc || "",
          rec.trangThai || "Đạt",
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
          message: "Đã ghi nhận bản ghi vào sheet 'Kiểm duyệt vệ sinh'!",
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
          var uKey = normIsoDate(item.ngay) + "|" + normStr(item.coSo) + "|" + normStr(item.khuVuc) + "|" + normTime(item.gio);
          keyMap[uKey] = item;
        }

        for (var i = 0; i < data.length; i++) {
          var rLink = normLink(data[i][10]);
          var rKey = normIsoDate(data[i][0]) + "|" + normStr(data[i][3]) + "|" + normStr(data[i][4]) + "|" + normTime(data[i][1]);

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
    // 4. ĐỒNG BỘ TOÀN BỘ NGÀY: THAY THẾ TOÀN DIỆN & CHỐNG TRÙNG LẶP TUYỆT ĐỐI
    // BẤT KỂ BẤM BAO NHIÊU LẦN: CHỈ THAY THẾ, XÓA DÒNG THỪA, GIỮ NGUYÊN KẾT QUẢ DUYỆT!
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
    var targetDateRaw = payload.date || (records[0] && records[0].ngay) || "";
    var nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    if (!records.length) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Không có bản ghi" })).setMimeType(ContentService.MimeType.JSON);
    }

    var lastRow = sheet.getLastRow();

    // BƯỚC 4.1: THU THẬP KẾT QUẢ DUYỆT ĐÃ CÓ TRONG SHEET CŨ
    // Để khi thay thế không bao giờ làm mất các ô "Đã duyệt" / "Không đạt" mà người dùng đã tick
    var preservedReviewsByLink = {};
    var preservedReviewsByKey = {};
    var preservedReviewsByFacArea = {};
    var otherDateRows = [];

    if (lastRow > 1) {
      var existingData = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

      for (var i = 0; i < existingData.length; i++) {
        var row = existingData[i];
        var rowDateRaw = row[0];
        var rowGio = normTime(row[1]);
        var rowCoSo = normStr(row[3]);
        var rowKhuVuc = normStr(row[4]);
        var rowLink = normLink(row[10]);
        var daDuyetVal = String(row[11] || "").trim();
        var khongDatVal = String(row[12] || "").trim();

        var belongsToTargetDay = isSameDay(rowDateRaw, targetDateRaw);

        if (belongsToTargetDay) {
          // Ghi nhớ trạng thái duyệt nếu dòng này đã được nhân viên kiểm duyệt
          if (daDuyetVal || khongDatVal) {
            if (rowLink && rowLink.length > 10) {
              preservedReviewsByLink[rowLink] = { daDuyet: daDuyetVal, khongDat: khongDatVal };
            }
            var k = rowCoSo + "|" + rowKhuVuc + "|" + rowGio;
            preservedReviewsByKey[k] = { daDuyet: daDuyetVal, khongDat: khongDatVal };
            var kFac = rowCoSo + "|" + rowKhuVuc;
            if (!preservedReviewsByFacArea[kFac]) {
              preservedReviewsByFacArea[kFac] = { daDuyet: daDuyetVal, khongDat: khongDatVal };
            }
          }
          // DÒNG NÀY THUỘC NGÀY ĐANG ĐỒNG BỘ NÊN SẼ ĐƯỢC THAY THẾ HOÀN TOÀN BẰNG BẢN GHI MỚI!
          // KHÔNG ĐẨY VÀO otherDateRows -> XÓA SẠCH HOÀN TOÀN TẤT CẢ DÒNG THỪA TRÙNG LẶP!
        } else {
          // Các ngày khác: Giữ nguyên hoàn toàn
          otherDateRows.push([
            row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], row[12], row[13]
          ]);
        }
      }
    }

    // BƯỚC 4.2: CHUẨN BỊ BẢN GHI MỚI & BẢO TOÀN TRẠNG THÁI KIỂM DUYỆT
    var newDayRows = [];
    var seenKeys = {}; // Deduplicate trong chính tập incoming records

    records.forEach(function(r) {
      var rLink = normLink(r.linkAnh);
      var rCoSo = normStr(r.coSo);
      var rKhuVuc = normStr(r.khuVuc);
      var rGio = normTime(r.gio);

      // Unique key cho từng bản ghi của ngày đó
      var dedupKey = (rLink && rLink.length > 10) ? rLink : (rCoSo + "|" + rKhuVuc + "|" + rGio);
      if (seenKeys[dedupKey]) {
        return; // Bỏ qua bản ghi trùng lặp trong chính danh sách gửi lên
      }
      seenKeys[dedupKey] = true;

      // Bảo toàn trạng thái duyệt đã có
      var finalDaDuyet = String(r.daDuyet || "").trim();
      var finalKhongDat = String(r.khongDat || "").trim();

      if (!finalDaDuyet && !finalKhongDat) {
        if (rLink && preservedReviewsByLink[rLink]) {
          finalDaDuyet = preservedReviewsByLink[rLink].daDuyet;
          finalKhongDat = preservedReviewsByLink[rLink].khongDat;
        } else {
          var k = rCoSo + "|" + rKhuVuc + "|" + rGio;
          if (preservedReviewsByKey[k]) {
            finalDaDuyet = preservedReviewsByKey[k].daDuyet;
            finalKhongDat = preservedReviewsByKey[k].khongDat;
          } else {
            var kFac = rCoSo + "|" + rKhuVuc;
            if (preservedReviewsByFacArea[kFac]) {
              finalDaDuyet = preservedReviewsByFacArea[kFac].daDuyet;
              finalKhongDat = preservedReviewsByFacArea[kFac].khongDat;
            }
          }
        }
      }

      newDayRows.push([
        formatCellDate(r.ngay || targetDateRaw),
        r.gio || "",
        r.nguoiKiemTra || "",
        r.coSo || "",
        r.khuVuc || "",
        r.trangThai || "Đạt",
        r.diemSo !== undefined ? r.diemSo : "",
        r.chiTiet || "",
        r.phanHoi || "",
        r.feedbackNguoiDung || "",
        r.linkAnh || "",
        finalDaDuyet,
        finalKhongDat,
        nowStr
      ]);
    });

    // BƯỚC 4.3: GHÉP TOÀN BỘ VÀ GHI ĐÈ LÊN SHEET
    // Bảng cuối cùng = [Các dòng của ngày khác] + [Các dòng thay thế duy nhất của ngày đang xét]
    var finalAllRows = otherDateRows.concat(newDayRows);

    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
    }
    if (finalAllRows.length > 0) {
      sheet.getRange(2, 1, finalAllRows.length, headers.length).setValues(finalAllRows);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Đã thay thế chính xác " + newDayRows.length + " dòng ngày " + formatCellDate(targetDateRaw) + "! Xóa sạch toàn bộ dòng thừa trùng lặp.",
      targetDate: formatCellDate(targetDateRaw),
      replacedCount: newDayRows.length,
      totalSheetRows: finalAllRows.length
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * TỰ ĐỘNG KÉO DỮ LIỆU TỪ SHEET GỐC VỀ SHEET NÀY MÀ KHÔNG CẦN BẤM GÌ CẢ
 * Chạy tự động theo lịch (Time-Driven Trigger) hoặc chạy thủ công
 */
function tuDongDoDuLieuHangNgay() {
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

  var matchingRows = [];
  for (var r = 1; r < csvData.length; r++) {
    var row = csvData[r];
    var rawDate = colNgay >= 0 ? String(row[colNgay]).trim() : "";
    if (isSameDay(rawDate, yesterday)) {
      matchingRows.push({
        ngay: rawDate,
        gio: colGio >= 0 ? row[colGio] : "",
        nguoiKiemTra: colNguoi >= 0 ? row[colNguoi] : "",
        coSo: colCoSo >= 0 ? row[colCoSo] : "",
        khuVuc: colKhuVuc >= 0 ? row[colKhuVuc] : "",
        trangThai: colTrangThai >= 0 ? row[colTrangThai] : "Đạt",
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
    Logger.log("Không có dòng nào thuộc ngày hôm trước.");
    return;
  }

  // Gọi trực tiếp hàm thay thế toàn diện để đổ vào sheet
  var mockEvent = {
    postData: {
      contents: JSON.stringify({
        action: "sync_full_day_hygiene_reviews",
        date: normIsoDate(yesterday),
        records: matchingRows
      })
    }
  };
  doPost(mockEvent);
  Logger.log("Tự động đổ hoàn tất: " + matchingRows.length + " dòng (đã thay thế gọn gàng).");
}

/**
 * TẠO LỊCH TỰ ĐỘNG CHẠY HẰNG NGÀY LÚC 01:00 AM (HOẶC MỖI GIỜ)
 * Bạn chỉ cần bấm Run (Chạy) hàm này 1 lần duy nhất trong Apps Script
 */
function caiDatLichTuDong() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "tuDongDoDuLieuHangNgay") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Tự động chạy mỗi ngày lúc 01:00 AM
  ScriptApp.newTrigger("tuDongDoDuLieuHangNgay")
    .timeBased()
    .everyDays(1)
    .atHour(1)
    .inTimezone("Asia/Ho_Chi_Minh")
    .create();

  Logger.log("✓ Đã cài đặt lịch tự động chạy lúc 01:00 AM mỗi ngày!");
}

/**
 * TẠO MENU TRÊN GOOGLE SHEET ĐỂ THAO TÁC NHANH
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("⚡ Tự Động Vệ Sinh")
    .addItem("▶ Chạy tự động đổ dữ liệu ngay", "tuDongDoDuLieuHangNgay")
    .addItem("⏰ Cài đặt lịch tự động lúc 01:00 AM", "caiDatLichTuDong")
    .addToUi();
}
`;

