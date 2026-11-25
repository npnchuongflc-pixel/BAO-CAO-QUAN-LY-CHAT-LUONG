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
    // 0. MODULE BÁO CÁO XỬ LÝ CẢNH BÁO TUẦN (PHẦN 2 -> GOOGLE SHEET -> PHẦN 3)
    // Không cần đăng nhập Google khi thao tác từ web
    // =========================================================================
    if (action === "weekly_ping" || action === "weekly_capability_check") {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        weeklySupported: true,
        schemaVersion: WEEKLY_SCHEMA_VERSION_,
        spreadsheetId: ss.getId(),
        spreadsheetName: ss.getName(),
        message: "Apps Script v6 đã hỗ trợ Báo cáo Tuần 18 cột (cột Số lượt đã nhắc nhở tự đếm theo tick duyệt + 4 phương án: Nhắc nhở, Cảnh báo, Kỉ luật, Sa Thải)!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "sync_weekly_warning_report") {
      return handleSyncWeeklyWarningReport_(ss, payload);
    }

    if (action === "update_weekly_warning_record") {
      return handleUpdateWeeklyWarningRecord_(ss, payload);
    }

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
    // Khi nhân viên xem và nhấn tick ("Đã duyệt" / "Lỗi AI") hoặc xóa nhận định
    // ĐIỀU CHỈNH TRỰC TIẾP TRÊN HÀNG CÓ SẴN - TUYỆT ĐỐI KHÔNG TẠO HÀNG THỪA MỚI
    // =========================================================================
    if (action === "upsert_image_review" || action === "update_image_review") {
      var hygieneSheet = ss.getSheetByName("Kiểm duyệt vệ sinh") || ss.getSheets()[0];
      var lastRow = hygieneSheet.getLastRow();
      if (lastRow >= 1) {
        var m1Val = String(hygieneSheet.getRange(1, 13).getValue() || "").trim();
        if (!m1Val || m1Val.toLowerCase() === "không đạt") {
          hygieneSheet.getRange(1, 13).setValue("Lỗi AI");
        }
      }
      var targetDateRaw = payload.ngay || (payload.record && payload.record.ngay) || "";
      var targetLink = normLink(payload.linkAnh || (payload.record && payload.record.linkAnh) || "");
      var targetFacility = normStr(payload.coSo || (payload.record && payload.record.coSo) || "");
      var targetArea = normStr(payload.khuVuc || (payload.record && payload.record.khuVuc) || "");
      var targetTime = normTime(payload.gio || (payload.record && payload.record.gio) || "");

      var daDuyetVal = payload.daDuyet !== undefined ? payload.daDuyet : (payload.reviewStatus === "approved" ? (payload.reviewer || "Đã duyệt") : "");
      var rawRejectedPayload = payload.loiAi !== undefined ? payload.loiAi : payload.khongDat;
      var khongDatVal = rawRejectedPayload !== undefined ? rawRejectedPayload : (payload.reviewStatus === "rejected" ? (payload.reviewer || "Lỗi AI") : "");

      // TUYỆT ĐỐI LOẠI TRỪ LẪN NHAU - KHÔNG ĐỂ 2 KẾT QUẢ TỒN TẠI CÙNG LÚC
      if (daDuyetVal) {
        khongDatVal = "";
      } else if (khongDatVal) {
        daDuyetVal = "";
      }
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
      if (lastRow >= 1) {
        var m1Batch = String(hygieneSheet.getRange(1, 13).getValue() || "").trim();
        if (!m1Batch || m1Batch.toLowerCase() === "không đạt") {
          hygieneSheet.getRange(1, 13).setValue("Lỗi AI");
        }
      }
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
            data[i][12] = matched.loiAi !== undefined ? (matched.loiAi || "") : (matched.khongDat || "");
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
      "Feedback từ người dùng", "Link ảnh", "Đã duyệt", "Lỗi AI", "Thời gian đồng bộ"
    ];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
    } else {
      var m1Header = String(sheet.getRange(1, 13).getValue() || "").trim();
      if (!m1Header || m1Header.toLowerCase() === "không đạt") {
        sheet.getRange(1, 13).setValue("Lỗi AI");
      }
    }

    var records = payload.records || [];
    var targetDateRaw = payload.date || (records[0] && records[0].ngay) || "";
    var nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    if (!records.length && !payload.allowEmptyReplace) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Không có bản ghi" })).setMimeType(ContentService.MimeType.JSON);
    }

    var lastRow = sheet.getLastRow();

    // BƯỚC 4.1: THU THẬP KẾT QUẢ DUYỆT ĐÃ CÓ TRONG SHEET CŨ
    // Để khi thay thế không bao giờ làm mất các ô "Đã duyệt" / "Lỗi AI" mà người dùng đã tick
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
      var finalKhongDat = String(r.loiAi !== undefined ? (r.loiAi || "") : (r.khongDat || "")).trim();

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

      // NẾU CÓ CẢ 2 KẾT QUẢ: LOẠI BỎ KẾT QUẢ CŨ, CHỈ GIỮ 1 KẾT QUẢ DUY NHẤT
      if (finalDaDuyet && finalKhongDat) {
        if (r.reviewStatus === "rejected" || ((r.loiAi || r.khongDat) && !r.daDuyet)) {
          finalDaDuyet = "";
        } else {
          finalKhongDat = "";
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
    else if (h.indexOf("lỗi ai") !== -1 || h.indexOf("không đạt") !== -1 || h.indexOf("rejected") !== -1) colKhongDat = c;
  }

  // Lấy ngày hôm trước theo giờ Việt Nam
  var now = new Date();
  var yesterday = new Date(now.getTime() - 24 * 3600 * 1000);

  function parseScore100Local(rawVal) {
    var s = String(rawVal === undefined || rawVal === null ? "" : rawVal).trim().replace(",", ".");
    if (!s) return null;
    var slashMatch = /^(\\d+(?:\\.\\d+)?)\\s*\\/\\s*(\\d+(?:\\.\\d+)?)/.exec(s);
    if (slashMatch) {
      var n1 = Number(slashMatch[1]);
      var max1 = Number(slashMatch[2]);
      if (isNaN(n1) || isNaN(max1) || max1 <= 0) return null;
      return max1 <= 10 ? n1 * 10 : n1;
    }
    var m = /(\\d+(?:\\.\\d+)?)/.exec(s);
    if (!m) return null;
    var n = Number(m[1]);
    if (isNaN(n)) return null;
    return (n > 0 && n <= 10) ? n * 10 : n;
  }

  var matchingRows = [];
  for (var r = 1; r < csvData.length; r++) {
    var row = csvData[r];
    var rawDate = colNgay >= 0 ? String(row[colNgay]).trim() : "";
    if (isSameDay(rawDate, yesterday)) {
      var linkVal = colLinkAnh >= 0 ? String(row[colLinkAnh] || "").trim() : "";
      var rawDiem = colDiem >= 0 ? row[colDiem] : "";
      var score100 = parseScore100Local(rawDiem);
      if (!linkVal || linkVal.indexOf("images.unsplash.com/photo-1581578731548-c64695cc6952") !== -1) continue;
      if (score100 === null || score100 >= 80) continue;

      matchingRows.push({
        ngay: rawDate,
        gio: colGio >= 0 ? row[colGio] : "",
        nguoiKiemTra: colNguoi >= 0 ? row[colNguoi] : "",
        coSo: colCoSo >= 0 ? row[colCoSo] : "",
        khuVuc: colKhuVuc >= 0 ? row[colKhuVuc] : "",
        trangThai: colTrangThai >= 0 ? row[colTrangThai] : "Không đạt",
        diemSo: rawDiem,
        chiTiet: colChiTiet >= 0 ? row[colChiTiet] : "",
        phanHoi: colPhanHoi >= 0 ? row[colPhanHoi] : "",
        feedbackNguoiDung: colFeedback >= 0 ? row[colFeedback] : "",
        linkAnh: linkVal,
        daDuyet: colDaDuyet >= 0 ? row[colDaDuyet] : "",
        khongDat: colKhongDat >= 0 ? row[colKhongDat] : ""
      });
    }
  }

  // Gọi trực tiếp hàm thay thế toàn diện để đổ vào sheet (chỉ ảnh < 80đ; nếu trống thì dọn dòng cũ ngày hôm trước)
  var mockEvent = {
    postData: {
      contents: JSON.stringify({
        action: "sync_full_day_hygiene_reviews",
        date: normIsoDate(yesterday),
        records: matchingRows,
        onlyLowScore: true,
        allowEmptyReplace: true
      })
    }
  };
  doPost(mockEvent);
  Logger.log("Tự động đổ hoàn tất: " + matchingRows.length + " ảnh điểm thấp (<80đ).");
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

function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var range = e.range;
    var sheet = range.getSheet();
    if (!sheet) return;
    if (sheet.getName().trim().toLowerCase() !== TEAM_LEADER_SHEET_NAME_.toLowerCase()) return;

    var startRow = range.getRow();
    var numRows = range.getNumRows();
    var startCol = range.getColumn();
    var endCol = startCol + range.getNumColumns() - 1;

    if (startRow + numRows - 1 < 2) return;
    var touchedHandled = (startCol <= 11 && endCol >= 11);
    var touchedMethodOrNote = (startCol <= 13 && endCol >= 12);
    var touchedQlcl = (startCol <= 16 && endCol >= 16);
    if (!touchedHandled && !touchedMethodOrNote && !touchedQlcl) return;

    var effectiveStartRow = Math.max(2, startRow);
    var effectiveNumRows = (startRow + numRows - 1) - effectiveStartRow + 1;
    if (effectiveNumRows <= 0) return;

    var nowTs = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
    var editorLabel = "";
    try {
      editorLabel = String((e.user && e.user.getEmail && e.user.getEmail()) || Session.getActiveUser().getEmail() || "").trim();
    } catch (uErr) {}

    var rowsData = sheet.getRange(effectiveStartRow, 1, effectiveNumRows, 18).getValues();
    for (var i = 0; i < rowsData.length; i++) {
      var r = rowsData[i];
      if (!isRealWeeklyDataRow_(r)) continue;
      var targetRow = effectiveStartRow + i;

      var isHandled = parseBoolCell_(r[10]); // Cột K (11): Trưởng nhóm đã duyệt
      var isQlcl = parseBoolCell_(r[15]);    // Cột P (16): QLCL xác nhận
      var noCheckout = Number(r[6] || 0);
      var missingImg = Number(r[7] || 0);
      var curStatus = String(r[16] || "").trim();
      var curUpdatedBy = String(r[14] || "").trim();

      var nextStatus = "Chưa xử lý";
      if (isQlcl) {
        nextStatus = "Đã đóng";
      } else if (isHandled) {
        nextStatus = "Chờ QLCL xác nhận";
      } else if (curStatus === "Không còn cảnh báo sau cập nhật" && noCheckout === 0 && missingImg === 0) {
        nextStatus = "Không còn cảnh báo sau cập nhật";
      }
      sheet.getRange(targetRow, 17).setValue(nextStatus);

      if ((touchedHandled && isHandled) || (touchedQlcl && isQlcl)) {
        sheet.getRange(targetRow, 14)
          .setValue(nowTs)
          .setNumberFormat("@")
          .setHorizontalAlignment("center");
        if (editorLabel && !curUpdatedBy) {
          sheet.getRange(targetRow, 15).setValue(editorLabel);
        }
      } else if (touchedHandled && !isHandled && !isQlcl) {
        sheet.getRange(targetRow, 14).setValue("");
      }
    }
  } catch (err) {}
}

// =============================================================================
// HELPER XỬ LÝ SHEET "Trưởng nhóm xử lý" (v8: Auto timestamp onEdit khi tick duyệt)
// =============================================================================
var WEEKLY_SCHEMA_VERSION_ = 8;
var TEAM_LEADER_SHEET_NAME_ = "Trưởng nhóm xử lý";

var WEEKLY_HEADERS_ = [
  "Mã hồ sơ",                       // 1  A
  "Thời gian (Từ ngày - Đến ngày)", // 2  B
  "Tháng",                          // 3  C
  "Tuần",                           // 4  D
  "Ngày chốt dữ liệu",              // 5  E
  "Cơ sở",                          // 6  F
  "Số ngày không check out",        // 7  G
  "Số ảnh thiếu",                   // 8  H
  "Chi tiết các ngày vi phạm",      // 9  I
  "Số lượt đã nhắc nhở",            // 10 J (Tự đếm số lượt tick Trưởng nhóm đã duyệt theo Cơ sở)
  "Trưởng nhóm đã duyệt",           // 11 K (Checkbox ô vuông)
  "Phương án xử lý",                // 12 L (Dropdown: Nhắc nhở, Cảnh báo, Kỉ luật, Sa Thải)
  "Ghi chú",                        // 13 M
  "Thời gian cập nhật",             // 14 N
  "Người cập nhật",                 // 15 O
  "QLCL xác nhận",                  // 16 P (Checkbox ô vuông)
  "Trạng thái xử lý",               // 17 Q
  "Lịch sử đồng bộ"                 // 18 R
];

var WEEKLY_COLUMN_WIDTHS_ = [
  265, // A: Mã hồ sơ
  215, // B: Thời gian (Từ ngày - Đến ngày)
  95,  // C: Tháng
  90,  // D: Tuần
  140, // E: Ngày chốt dữ liệu
  195, // F: Cơ sở
  130, // G: Số ngày không check out
  115, // H: Số ảnh thiếu
  480, // I: Chi tiết các ngày vi phạm (rộng để dễ đọc, không bị xuống nhiều dòng)
  145, // J: Số lượt đã nhắc nhở
  145, // K: Trưởng nhóm đã duyệt (Checkbox)
  180, // L: Phương án xử lý
  240, // M: Ghi chú
  165, // N: Thời gian cập nhật
  175, // O: Người cập nhật
  130, // P: QLCL xác nhận (Checkbox)
  195, // Q: Trạng thái xử lý
  270  // R: Lịch sử đồng bộ
];

var WEEKLY_HANDLING_METHODS_ = [
  "Nhắc nhở",
  "Cảnh báo",
  "Kỉ luật",
  "Sa Thải"
];

function findTeamLeaderProcessingSheet_(ss, preferredTitle) {
  var targetTrimmed = String(preferredTitle || TEAM_LEADER_SHEET_NAME_).trim().toLowerCase();
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().trim().toLowerCase() === targetTrimmed) {
      return sheets[i];
    }
  }
  for (var j = 0; j < sheets.length; j++) {
    if (sheets[j].getName().trim().toLowerCase() === TEAM_LEADER_SHEET_NAME_.toLowerCase()) {
      return sheets[j];
    }
  }
  return null;
}

function isRealWeeklyDataRow_(row) {
  if (!row) return false;
  var colA = String(row[0] || "").trim();
  var colB = String(row[1] || "").trim();
  var colF = String(row[5] || "").trim();
  return Boolean(colA && (colF || colB));
}

function countRealWeeklyRows_(sheet) {
  var lr = sheet.getLastRow();
  if (lr < 2) return 0;
  var vals = sheet.getRange(2, 1, lr - 1, 6).getValues();
  var count = 0;
  for (var i = 0; i < vals.length; i++) {
    if (isRealWeeklyDataRow_(vals[i])) {
      count = i + 1;
    }
  }
  return count;
}

function parseBoolCell_(v) {
  if (v === true) return true;
  if (!v) return false;
  var s = String(v).trim().toLowerCase();
  return s === "true" || s === "có" || s === "x" || s === "1" || s === "yes";
}

function padTo18Cols_(row) {
  var out = [];
  for (var c = 0; c < 18; c++) {
    out.push(row && row[c] !== undefined && row[c] !== null ? row[c] : "");
  }
  out[10] = parseBoolCell_(out[10]);
  out[15] = parseBoolCell_(out[15]);
  return out;
}

function extractWeekLabelOnly_(codeOrWeekText) {
  var m = String(codeOrWeekText || "").match(/Tuần\\s*(\\d+)/i);
  return m ? ("Tuần " + m[1]) : "Tuần 1";
}

function buildNewCodeFromLegacyRow_(oldCode, coSo, oldWeekLabel) {
  var sCode = String(oldCode || "").trim();
  if (/^Tuần\\s*\\d+_\\d{2}\\/\\d{4}_/i.test(sCode)) {
    return sCode;
  }
  var mCode = sCode.match(/^W_(\\d{4})-(\\d{2})-\\d{2}_TO_\\d{4}-\\d{2}-\\d{2}__/);
  var weekStr = extractWeekLabelOnly_(oldWeekLabel);
  var monthStr = mCode ? (mCode[2] + "/" + mCode[1]) : "";
  if (monthStr && coSo) {
    return weekStr + "_" + monthStr + "_" + coSo;
  }
  return sCode;
}

function stripWeekTagFromDateRange_(text) {
  if (Object.prototype.toString.call(text) === "[object Date]" || text instanceof Date) {
    return formatCellDate(text);
  }
  return String(text || "")
    .replace(/\\s*\\(Tuần\\s*\\d+\\)\\s*/gi, "")
    .replace(/[–—]/g, "-")
    .replace(/\\s*-\\s*/g, " - ")
    .trim();
}

function parseFlexibleDateToIso_(part, fallbackYear) {
  var s = String(part || "").trim();
  if (!s) return "";
  var mIso = s.match(/(\\d{4})[\\/-](\\d{1,2})[\\/-](\\d{1,2})/);
  if (mIso) {
    return mIso[1] + "-" + ("0" + mIso[2]).slice(-2) + "-" + ("0" + mIso[3]).slice(-2);
  }
  var mDmy = s.match(/(\\d{1,2})[\\/-](\\d{1,2})[\\/-](\\d{4})/);
  if (mDmy) {
    return mDmy[3] + "-" + ("0" + mDmy[2]).slice(-2) + "-" + ("0" + mDmy[1]).slice(-2);
  }
  var mDm = s.match(/(\\d{1,2})[\\/-](\\d{1,2})/);
  if (mDm && fallbackYear) {
    return fallbackYear + "-" + ("0" + mDm[2]).slice(-2) + "-" + ("0" + mDm[1]).slice(-2);
  }
  return "";
}

function extractWeekSortTuple_(row) {
  var code = String((row && row[0]) || "").trim();
  var rangeText = stripWeekTagFromDateRange_(row && row[1]);
  var monthText = String((row && row[2]) || "").trim();
  var weekText = String((row && row[3]) || "").trim();
  var cutoffText = String((row && row[4]) || "").trim();

  var yearMatch = monthText.match(/(\\d{4})/) || cutoffText.match(/(\\d{4})/) || rangeText.match(/(\\d{4})/);
  var fallbackYear = yearMatch ? yearMatch[1] : String(new Date().getFullYear());

  var startIso = "";
  var endIso = "";

  if (rangeText) {
    var parts = rangeText.split("-");
    if (parts.length >= 2) {
      startIso = parseFlexibleDateToIso_(parts[0], fallbackYear);
      endIso = parseFlexibleDateToIso_(parts[1], fallbackYear);
    } else {
      startIso = parseFlexibleDateToIso_(rangeText, fallbackYear);
    }
  }

  if (!startIso) {
    var mLegacy = code.match(/^W_(\\d{4}-\\d{2}-\\d{2})_TO_(\\d{4}-\\d{2}-\\d{2})/);
    if (mLegacy) {
      startIso = mLegacy[1];
      endIso = mLegacy[2];
    }
  }

  var mWeek = (weekText + " " + code).match(/Tuần\\s*(\\d+)/i);
  var weekNum = mWeek ? parseInt(mWeek[1], 10) : 99;

  if (!startIso && monthText) {
    var mMy = monthText.match(/(\\d{1,2})[\\/-](\\d{4})/);
    if (mMy) {
      startIso = mMy[2] + "-" + ("0" + mMy[1]).slice(-2) + "-W" + ("0" + weekNum).slice(-2);
    }
  }

  return {
    startIso: startIso || "9999-99-99",
    endIso: endIso || startIso || "9999-99-99",
    weekNum: weekNum
  };
}

function sortWeeklyRowsAscending_(rows) {
  var decorated = [];
  for (var i = 0; i < rows.length; i++) {
    decorated.push({
      row: rows[i],
      origIdx: i,
      tuple: extractWeekSortTuple_(rows[i])
    });
  }
  decorated.sort(function(a, b) {
    if (a.tuple.startIso < b.tuple.startIso) return -1;
    if (a.tuple.startIso > b.tuple.startIso) return 1;
    if (a.tuple.endIso < b.tuple.endIso) return -1;
    if (a.tuple.endIso > b.tuple.endIso) return 1;
    if (a.tuple.weekNum !== b.tuple.weekNum) {
      return a.tuple.weekNum - b.tuple.weekNum;
    }
    return a.origIdx - b.origIdx;
  });
  var sorted = [];
  for (var j = 0; j < decorated.length; j++) {
    sorted.push(decorated[j].row);
  }
  return sorted;
}

function applyHeaderAndWidthsOnly_(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, WEEKLY_HEADERS_.length).setValues([WEEKLY_HEADERS_]);
  sheet.getRange(1, 1, 1, WEEKLY_HEADERS_.length)
    .setBackground("#1a3a5c")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);
  try {
    sheet.setRowHeight(1, 44);
  } catch (e) {}
  for (var c = 0; c < WEEKLY_COLUMN_WIDTHS_.length; c++) {
    try {
      sheet.setColumnWidth(c + 1, WEEKLY_COLUMN_WIDTHS_[c]);
    } catch (e) {}
  }
}

function buildReminderCountFormula_(rowNum, argSep) {
  var sep = argSep === ";" ? ";" : ",";
  return "=IF(F" + rowNum + '=""' + sep + '""' + sep + "COUNTIFS($F$2:$F" + sep + "F" + rowNum + sep + "$K$2:$K" + sep + "TRUE))";
}

function applyReminderCountFormulas_(sheet, startRow, numRows) {
  if (!numRows || numRows <= 0) return;
  var jRange = sheet.getRange(startRow, 10, numRows, 1);
  jRange
    .setNumberFormat("0")
    .setHorizontalAlignment("center")
    .setFontWeight("bold");

  // QUAN TRỌNG: Trong Google Apps Script, setFormulas() LUÔN dùng cú pháp EN-US (dấu ",")
  // ngay cả khi Google Sheet đang để vùng Việt Nam (Google Sheet sẽ tự hiển thị thành dấu ";" trên giao diện).
  // Nếu truyền dấu ";" vào setFormulas() của Apps Script, ô sẽ báo "#ERROR!" Formula parse error!
  var sepOrder = [",", ";"];
  var applied = false;

  for (var sIdx = 0; sIdx < sepOrder.length; sIdx++) {
    var sep = sepOrder[sIdx];
    var formulas = [];
    for (var i = 0; i < numRows; i++) {
      formulas.push([buildReminderCountFormula_(startRow + i, sep)]);
    }
    try {
      jRange.setFormulas(formulas);
      SpreadsheetApp.flush();
      var firstDisp = "";
      try {
        firstDisp = String(sheet.getRange(startRow, 10).getDisplayValue() || "").trim();
      } catch (dispErr) {}
      if (firstDisp.indexOf("#") !== 0) {
        applied = true;
        break;
      }
    } catch (fErr) {}
  }

  // Fallback an toàn tuyệt đối nếu cả 2 cú pháp đều báo #ERROR!
  if (!applied) {
    try {
      var lr = sheet.getLastRow();
      var countByFac = {};
      if (lr >= 2) {
        var fkVals = sheet.getRange(2, 6, lr - 1, 6).getValues(); // F..K
        for (var r = 0; r < fkVals.length; r++) {
          var facKey = String(fkVals[r][0] || "").trim().toLowerCase();
          var checked = parseBoolCell_(fkVals[r][5]);
          if (facKey && checked) {
            countByFac[facKey] = (countByFac[facKey] || 0) + 1;
          }
        }
      }
      var rowFacs = sheet.getRange(startRow, 6, numRows, 1).getValues();
      var fallbackVals = [];
      for (var j = 0; j < rowFacs.length; j++) {
        var fKey = String(rowFacs[j][0] || "").trim().toLowerCase();
        fallbackVals.push([fKey ? (countByFac[fKey] || 0) : ""]);
      }
      jRange.setValues(fallbackVals);
    } catch (valErr) {}
  }
}

function applyCheckboxesAndFormatting_(sheet, lockSourceCols, actualDataCount) {
  applyHeaderAndWidthsOnly_(sheet);

  var dataCount = (actualDataCount !== undefined && actualDataCount !== null)
    ? Math.max(0, Number(actualDataCount))
    : countRealWeeklyRows_(sheet);

  // QUAN TRỌNG (v6): Chỉ chèn checkbox, công thức đếm nhắc nhở & DataValidation đúng bằng số dòng dữ liệu thực tế!
  if (dataCount > 0) {
    sheet.getRange(2, 11, dataCount, 1).insertCheckboxes();
    sheet.getRange(2, 16, dataCount, 1).insertCheckboxes();

    applyReminderCountFormulas_(sheet, 2, dataCount);

    var ruleMethod = SpreadsheetApp.newDataValidation()
      .requireValueInList(WEEKLY_HANDLING_METHODS_, true)
      .setAllowInvalid(true)
      .build();
    sheet.getRange(2, 2, dataCount, 4).setNumberFormat("@");
    sheet.getRange(2, 12, dataCount, 1).setDataValidation(ruleMethod);
    sheet.getRange(2, 1, dataCount, 18).setVerticalAlignment("middle").setWrap(true).setFontSize(10);
    sheet.getRange(2, 2, dataCount, 4).setHorizontalAlignment("center");
    sheet.getRange(2, 7, dataCount, 2).setHorizontalAlignment("center");
    sheet.getRange(2, 10, dataCount, 2).setHorizontalAlignment("center");
    sheet.getRange(2, 14, dataCount, 1).setHorizontalAlignment("center");
    sheet.getRange(2, 16, dataCount, 1).setHorizontalAlignment("center");
  }

  // Dọn sạch hoàn toàn mọi ô FALSE / checkbox / nội dung / đường viền dư thừa bên dưới dòng dữ liệu cuối cùng
  var clearFromRow = 2 + dataCount;
  var maxSheetRows = Math.max(sheet.getLastRow(), sheet.getMaxRows());
  if (clearFromRow <= maxSheetRows) {
    var trailingCount = maxSheetRows - clearFromRow + 1;
    var trailingRange = sheet.getRange(clearFromRow, 1, trailingCount, 18);
    trailingRange.clearContent();
    trailingRange.clearDataValidations();
    try {
      trailingRange.setBorder(false, false, false, false, false, false);
    } catch (bClearErr) {}
  }

  try {
    sheet.getRange(1, 1, 1 + dataCount, 18).setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
  } catch (bErr) {}

  if (lockSourceCols) {
    try {
      var existingProt = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
      for (var p = 0; p < existingProt.length; p++) {
        existingProt[p].remove();
      }
      var p1 = sheet.getRange("A:J").protect().setDescription("Khóa số liệu gốc & Số lượt đã nhắc nhở tự động");
      p1.setWarningOnly(true);
      var p2 = sheet.getRange("P:R").protect().setDescription("Khóa xác nhận QLCL & trạng thái hệ thống");
      p2.setWarningOnly(true);
    } catch (err) {}
  }
}

function setupWeeklyTabSchema_(sheet, lockSourceCols, actualDataCount) {
  applyCheckboxesAndFormatting_(sheet, lockSourceCols, actualDataCount);
}

function migrateWeeklySheetIfNeeded_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    setupWeeklyTabSchema_(sheet, true, 0);
    return true;
  }
  var colCount = Math.max(16, sheet.getLastColumn());
  var headerRow = sheet.getRange(1, 1, 1, Math.min(18, colCount)).getValues()[0];
  var h0 = String(headerRow[0] || "").trim();
  var h1 = String(headerRow[1] || "").trim();
  var h2 = String(headerRow[2] || "").trim();
  var h3 = String(headerRow[3] || "").trim();
  var h4 = String(headerRow[4] || "").trim();
  var h5 = String(headerRow[5] || "").trim();
  var h9 = String(headerRow[9] || "").trim();

  // Already in v7 18-column schema with "Số lượt đã nhắc nhở" header -> check & auto-repair if Column J has #ERROR!
  if (
    h0 === WEEKLY_HEADERS_[0] &&
    h1 === WEEKLY_HEADERS_[1] &&
    h2 === WEEKLY_HEADERS_[2] &&
    h3 === WEEKLY_HEADERS_[3] &&
    h4 === WEEKLY_HEADERS_[4] &&
    h5 === WEEKLY_HEADERS_[5] &&
    h9 === WEEKLY_HEADERS_[9]
  ) {
    if (lastRow >= 2) {
      var sampleJDisp = "";
      try {
        sampleJDisp = String(sheet.getRange(2, 10).getDisplayValue() || "").trim();
      } catch (jErr) {}
      if (sampleJDisp.indexOf("#") === 0) {
        applyReminderCountFormulas_(sheet, 2, countRealWeeklyRows_(sheet));
        SpreadsheetApp.flush();
      }
    }
    return false;
  }

  // Upgrade v5 18-column sheet ("Trưởng nhóm phụ trách" -> "Số lượt đã nhắc nhở" + 4 phương án mới) in place
  if (
    h0 === WEEKLY_HEADERS_[0] &&
    h1 === WEEKLY_HEADERS_[1] &&
    h2 === WEEKLY_HEADERS_[2] &&
    h3 === WEEKLY_HEADERS_[3] &&
    h4 === WEEKLY_HEADERS_[4] &&
    h5 === WEEKLY_HEADERS_[5]
  ) {
    setupWeeklyTabSchema_(sheet, true, countRealWeeklyRows_(sheet));
    SpreadsheetApp.flush();
    return true;
  }

  var isOld16 = (h1 === "Tuần" || h2 === "Cơ sở" || h3 === "Số ngày không check out");
  var isMid17 = (h1 === WEEKLY_HEADERS_[1] && h2 === "Tháng" && h3 === "Ngày chốt dữ liệu" && h4 === "Cơ sở");

  // If Row 1 itself holds data (someone deleted Row 1), insert a blank Row 1 first
  if (!isOld16 && !isMid17 && (/^Tuần\\s*\\d+_/i.test(h0) || /^W_\\d{4}-/.test(h0))) {
    sheet.insertRowBefore(1);
    var realCnt = countRealWeeklyRows_(sheet);
    setupWeeklyTabSchema_(sheet, true, realCnt);
    return true;
  }

  // Row 1 was blank while Row 2+ already has 18-col data -> restore Row 1 headers + compact formatting
  if ((!isOld16 && !isMid17) || lastRow < 2) {
    var realCntBlank = countRealWeeklyRows_(sheet);
    setupWeeklyTabSchema_(sheet, true, realCntBlank);
    return true;
  }

  var readCols = isMid17 ? 17 : 16;
  var oldRows = sheet.getRange(2, 1, lastRow - 1, readCols).getValues();
  var migrated = [];

  for (var i = 0; i < oldRows.length; i++) {
    var r = oldRows[i];
    if (isMid17) {
      var code17 = String(r[0] || "").trim();
      var coSo17 = String(r[4] || "").trim();
      if (!code17 || (!coSo17 && !String(r[1] || "").trim())) continue;
      var weekOnly17 = extractWeekLabelOnly_(code17);
      migrated.push([
        code17,                             // A: Mã hồ sơ
        stripWeekTagFromDateRange_(r[1]),   // B: Thời gian (Từ ngày - Đến ngày)
        String(r[2] || "").trim(),          // C: Tháng
        weekOnly17,                         // D: Tuần
        String(r[3] || "").trim(),          // E: Ngày chốt dữ liệu
        coSo17,                             // F: Cơ sở
        Number(r[5] || 0),                  // G: Số ngày KCO
        Number(r[6] || 0),                  // H: Số ảnh thiếu
        r[7] || "",                         // I: Chi tiết vi phạm
        r[8] || "",                         // J: Trưởng nhóm phụ trách
        parseBoolCell_(r[9]),               // K: Trưởng nhóm đã duyệt (checkbox)
        r[10] || "",                        // L: Phương án xử lý
        r[11] || "",                        // M: Ghi chú
        r[12] || "",                        // N: Thời gian cập nhật
        r[13] || "",                        // O: Người cập nhật
        parseBoolCell_(r[14]),              // P: QLCL xác nhận (checkbox)
        r[15] || "Chưa xử lý",              // Q: Trạng thái xử lý
        r[16] || ""                         // R: Lịch sử đồng bộ
      ]);
    } else {
      var oldCode = String(r[0] || "").trim();
      var oldWeekText = String(r[1] || "").trim();
      var coSo = String(r[2] || "").trim();
      if (!oldCode || (!coSo && !oldWeekText)) continue;

      var rangeOnly = stripWeekTagFromDateRange_(oldWeekText);
      var mLegacy = oldCode.match(/^W_(\\d{4})-(\\d{2})-\\d{2}_TO_/);
      var mNewCode = oldCode.match(/^Tuần\\s*(\\d+)_(\\d{2}\\/\\d{4})_/i);
      var monthVal = mNewCode ? mNewCode[2] : (mLegacy ? (mLegacy[2] + "/" + mLegacy[1]) : "");
      var weekOnly = mNewCode ? ("Tuần " + mNewCode[1]) : extractWeekLabelOnly_(oldWeekText);
      var newCode = buildNewCodeFromLegacyRow_(oldCode, coSo, oldWeekText);

      migrated.push([
        newCode,                            // A: Mã hồ sơ (Tuần_Tháng_Cơ sở)
        rangeOnly || oldWeekText,           // B: Thời gian (chỉ ngày)
        monthVal,                           // C: Tháng
        weekOnly,                           // D: Tuần (tách riêng)
        r[6] || "",                         // E: Ngày chốt dữ liệu (sát cột Tuần)
        coSo,                               // F: Cơ sở
        Number(r[3] || 0),                  // G: Số ngày không check out
        Number(r[4] || 0),                  // H: Số ảnh thiếu
        r[5] || "",                         // I: Chi tiết các ngày vi phạm
        r[7] || "",                         // J: Trưởng nhóm phụ trách
        parseBoolCell_(r[8]),               // K: Trưởng nhóm đã duyệt (checkbox boolean)
        r[9] || "",                         // L: Phương án xử lý
        r[10] || "",                        // M: Ghi chú
        r[11] || "",                        // N: Thời gian cập nhật
        r[12] || "",                        // O: Người cập nhật
        parseBoolCell_(r[13]),              // P: QLCL xác nhận (checkbox boolean)
        r[14] || "Chưa xử lý",              // Q: Trạng thái xử lý
        r[15] || ""                         // R: Lịch sử đồng bộ
      ]);
    }
  }

  migrated = sortWeeklyRowsAscending_(migrated);

  var maxClear = Math.max(sheet.getLastRow(), sheet.getMaxRows());
  if (maxClear >= 1) {
    var allRng = sheet.getRange(1, 1, maxClear, 18);
    allRng.clearContent();
    allRng.clearDataValidations();
  }
  if (migrated.length > 0) {
    sheet.getRange(2, 1, migrated.length, 18).setValues(migrated);
  }
  setupWeeklyTabSchema_(sheet, true, migrated.length);
  SpreadsheetApp.flush();
  return true;
}

function handleSyncWeeklyWarningReport_(ss, payload) {
  var weekCode = String(payload.weekCode || "").trim();
  var weekPrefixNew = String(payload.weekPrefix || "").trim();
  var targetSheetName = String(payload.targetSheetName || TEAM_LEADER_SHEET_NAME_).trim();
  var mode = String(payload.mode || "create");
  var sourceRows = payload.sourceRows || [];
  var nowTs = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

  if (!weekCode) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      weeklySupported: true,
      schemaVersion: WEEKLY_SCHEMA_VERSION_,
      error: "Thiếu mã tuần (weekCode)."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var targetSheet = findTeamLeaderProcessingSheet_(ss, targetSheetName);
  var isNewTab = false;
  if (!targetSheet) {
    isNewTab = true;
    targetSheet = ss.insertSheet(targetSheetName);
    setupWeeklyTabSchema_(targetSheet, true, 0);
  } else {
    migrateWeeklySheetIfNeeded_(targetSheet);
  }

  var lastRow = targetSheet.getLastRow();
  var legacyPrefix = weekCode + "__";

  var firstDateRange = stripWeekTagFromDateRange_((sourceRows[0] && sourceRows[0].weekDateRange) || "");
  var firstMonthLabel = String((sourceRows[0] && sourceRows[0].monthLabel) || "").trim();
  var firstWeekOnly = String((sourceRows[0] && sourceRows[0].weekOnlyLabel) || "").trim();

  var otherWeekRows = [];
  var thisWeekRows = [];
  var existingWeekByCode = {};
  var existingWeekByFacility = {};

  if (lastRow > 1) {
    var oldValues = targetSheet.getRange(2, 1, lastRow - 1, 18).getValues();
    for (var i = 0; i < oldValues.length; i++) {
      var rawRow = oldValues[i];
      if (!isRealWeeklyDataRow_(rawRow)) continue; // Bỏ qua toàn bộ hàng trống / hàng chỉ có checkbox FALSE!

      var padded = padTo18Cols_(rawRow);
      var code = String(padded[0] || "").trim();
      var rowRange = stripWeekTagFromDateRange_(padded[1]);
      var rowMonth = String(padded[2] || "").trim();
      var rowFacility = normStr(padded[5]);

      var belongsToWeek =
        (weekPrefixNew && code.indexOf(weekPrefixNew) === 0) ||
        code.indexOf(legacyPrefix) === 0 ||
        (firstDateRange && firstMonthLabel && rowRange === firstDateRange && rowMonth === firstMonthLabel);

      if (belongsToWeek) {
        var entryIdx = thisWeekRows.length;
        thisWeekRows.push(padded);
        if (!existingWeekByCode.hasOwnProperty(code)) {
          existingWeekByCode[code] = { idx: entryIdx, values: padded };
        }
        if (rowFacility && !existingWeekByFacility.hasOwnProperty(rowFacility)) {
          existingWeekByFacility[rowFacility] = { idx: entryIdx, values: padded };
        }
      } else {
        otherWeekRows.push(padded);
      }
    }
  }

  if (mode !== "update" && thisWeekRows.length > 0) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      weeklySupported: true,
      schemaVersion: WEEKLY_SCHEMA_VERSION_,
      alreadyExists: true,
      sheetId: targetSheet.getSheetId(),
      sheetTitle: targetSheet.getName(),
      existingRowCount: thisWeekRows.length,
      tabUrl: "https://docs.google.com/spreadsheets/d/" + ss.getId() + "/edit#gid=" + targetSheet.getSheetId(),
      message: "Tuần này đã tồn tại trong sheet '" + targetSheet.getName().trim() + "'."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var matchedIdxSet = {};
  var mergedThisWeekRows = [];
  var updatedCount = 0;
  var addedCount = 0;
  var resolvedCount = 0;

  for (var s = 0; s < sourceRows.length; s++) {
    var src = sourceRows[s];
    var rCode = String(src.recordCode || "").trim();
    var rLegacyCode = String(src.legacyRecordCode || "").trim();
    if (!rCode) continue;

    var ex =
      existingWeekByCode[rCode] ||
      (rLegacyCode && existingWeekByCode[rLegacyCode]) ||
      existingWeekByFacility[normStr(src.coSo)];

    var dateRangeVal = stripWeekTagFromDateRange_(src.weekDateRange || src.weekLabel || "");
    var monthVal = String(src.monthLabel || firstMonthLabel || "").trim();
    var weekOnlyVal = String(src.weekOnlyLabel || firstWeekOnly || extractWeekLabelOnly_(rCode)).trim();

    if (ex) {
      matchedIdxSet[ex.idx] = true;
      var oldV = ex.values;
      var oldLeader = String(oldV[9] || "").trim();
      var oldHandled = parseBoolCell_(oldV[10]);
      var oldMethod = oldV[11] || "";
      var oldNotes = oldV[12] || "";
      var oldUpdatedAt = oldV[13] || "";
      var oldUpdatedBy = oldV[14] || "";
      var oldQlcl = parseBoolCell_(oldV[15]);
      var oldStatus = String(oldV[16] || "").trim();

      var resolvedStatus = oldQlcl
        ? "Đã đóng"
        : oldHandled
        ? "Chờ QLCL xác nhận"
        : (oldStatus === "Không còn cảnh báo sau cập nhật" ? "Chưa xử lý" : (oldStatus || "Chưa xử lý"));

      mergedThisWeekRows.push([
        rCode,
        dateRangeVal,
        monthVal,
        weekOnlyVal,
        src.cutoffDate || "",
        src.coSo || "",
        Number(src.noCheckoutDays || 0),
        Number(src.missingImages || 0),
        src.violationDetails || "",
        0, // J: Số lượt đã nhắc nhở (công thức COUNTIFS sẽ được áp dụng ngay sau bước sắp xếp)
        oldHandled,
        oldMethod,
        oldNotes,
        oldUpdatedAt,
        oldUpdatedBy,
        oldQlcl,
        resolvedStatus,
        "Cập nhật lại từ Phần 2 lúc " + nowTs
      ]);
      updatedCount += 1;
    } else {
      mergedThisWeekRows.push([
        rCode,                             // A: Mã hồ sơ (Tuần_Tháng_Cơ sở)
        dateRangeVal,                      // B: Thời gian (chỉ ngày)
        monthVal,                          // C: Tháng
        weekOnlyVal,                       // D: Tuần
        src.cutoffDate || "",              // E: Ngày chốt dữ liệu
        src.coSo || "",                    // F: Cơ sở
        Number(src.noCheckoutDays || 0),   // G: Số ngày không check out
        Number(src.missingImages || 0),    // H: Số ảnh thiếu
        src.violationDetails || "",        // I: Chi tiết các ngày vi phạm
        0,                                 // J: Số lượt đã nhắc nhở (COUNTIFS)
        false,                             // K: Trưởng nhóm đã duyệt (checkbox)
        "",                                // L: Phương án xử lý
        "",                                // M: Ghi chú
        "",                                // N: Thời gian cập nhật
        "",                                // O: Người cập nhật
        false,                             // P: QLCL xác nhận (checkbox)
        "Chưa xử lý",                      // Q: Trạng thái xử lý
        "Tạo từ Phần 2 lúc " + nowTs       // R: Lịch sử đồng bộ
      ]);
      addedCount += 1;
    }
  }

  // Giữ lại các hồ sơ cũ của tuần này nay đã hết vi phạm (đánh dấu Không còn cảnh báo, chống trùng)
  var seenResolvedCodes = {};
  for (var wIdx = 0; wIdx < thisWeekRows.length; wIdx++) {
    if (matchedIdxSet[wIdx]) continue;
    var resolvedRow = thisWeekRows[wIdx].slice();
    var resCodeKey = String(resolvedRow[0] || "").trim() + "|" + normStr(resolvedRow[5]);
    if (seenResolvedCodes[resCodeKey]) continue;
    seenResolvedCodes[resCodeKey] = true;

    var latestCutoff = (sourceRows[0] && sourceRows[0].cutoffDate) || String(resolvedRow[4] || "") || nowTs;
    resolvedRow[4] = latestCutoff;
    resolvedRow[6] = 0;
    resolvedRow[7] = 0;
    resolvedRow[8] = "Không còn vi phạm sau cập nhật";
    resolvedRow[16] = "Không còn cảnh báo sau cập nhật";
    resolvedRow[17] = "Không còn cảnh báo sau cập nhật lúc " + nowTs + " (giữ nguyên lịch sử xử lý)";
    mergedThisWeekRows.push(resolvedRow);
    resolvedCount += 1;
  }

  // Ghép tất cả các tuần lại thành khối liền mạch & SẮP XẾP TĂNG DẦN THEO NGÀY
  var finalAllRows = otherWeekRows.concat(mergedThisWeekRows);
  finalAllRows = sortWeeklyRowsAscending_(finalAllRows);

  // Dọn sạch hàng trống từ Row 2 xuống cuối sheet và ghi liền mạch từ hàng tiếp theo (Row 2 trở đi)
  var maxClearRows = Math.max(targetSheet.getLastRow(), targetSheet.getMaxRows());
  if (maxClearRows >= 2) {
    var clearRng = targetSheet.getRange(2, 1, maxClearRows - 1, 18);
    clearRng.clearContent();
    clearRng.clearDataValidations();
    try {
      clearRng.setBorder(false, false, false, false, false, false);
    } catch (bErr) {}
  }

  if (finalAllRows.length > 0) {
    targetSheet.getRange(2, 1, finalAllRows.length, 18).setValues(finalAllRows);
  }

  // Chỉ tạo checkbox / dropdown / border đúng trên các hàng có dữ liệu thực (Row 2 .. 1 + finalAllRows.length)
  applyCheckboxesAndFormatting_(targetSheet, true, finalAllRows.length);
  SpreadsheetApp.flush();

  // Readback verification strictly for this week
  var finalLastRow = targetSheet.getLastRow();
  var verifiedWeekCount = 0;
  if (finalLastRow > 1) {
    var readCols = targetSheet.getRange(2, 1, finalLastRow - 1, 4).getValues();
    for (var vc = 0; vc < readCols.length; vc++) {
      var rc = String(readCols[vc][0] || "").trim();
      var rr = stripWeekTagFromDateRange_(readCols[vc][1]);
      var rm = String(readCols[vc][2] || "").trim();
      var matchNew = weekPrefixNew && rc.indexOf(weekPrefixNew) === 0;
      var matchRange = firstDateRange && firstMonthLabel && rr === firstDateRange && rm === firstMonthLabel;
      if (rc && (matchNew || matchRange)) verifiedWeekCount += 1;
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    weeklySupported: true,
    schemaVersion: WEEKLY_SCHEMA_VERSION_,
    isNewTab: isNewTab,
    sheetId: targetSheet.getSheetId(),
    sheetTitle: targetSheet.getName(),
    tabUrl: "https://docs.google.com/spreadsheets/d/" + ss.getId() + "/edit#gid=" + targetSheet.getSheetId(),
    syncedAt: nowTs,
    updatedCount: updatedCount,
    addedCount: addedCount,
    resolvedCount: resolvedCount,
    totalRowsVerified: verifiedWeekCount,
    totalSheetRows: finalAllRows.length,
    message: "Đã ghi liền mạch & sắp xếp tăng dần theo ngày (" + verifiedWeekCount + " hồ sơ tuần này, tổng " + finalAllRows.length + " hàng trong '" + targetSheet.getName().trim() + "')"
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateWeeklyWarningRecord_(ss, payload) {
  var recordCode = String(payload.recordCode || "").trim();
  var sheetTitle = String(payload.sheetTitle || TEAM_LEADER_SHEET_NAME_).trim();
  var patch = payload.patch || {};
  var actor = String(payload.actor || "Trưởng nhóm / QLCL").trim();
  var nowTs = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

  var targetSheet = findTeamLeaderProcessingSheet_(ss, sheetTitle) || ss.getSheetByName(sheetTitle);
  if (!targetSheet) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      weeklySupported: true,
      schemaVersion: WEEKLY_SCHEMA_VERSION_,
      error: "Không tìm thấy sheet 'Trưởng nhóm xử lý' trên Google Sheet."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  migrateWeeklySheetIfNeeded_(targetSheet);

  var lastRow = targetSheet.getLastRow();
  if (lastRow < 2) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      weeklySupported: true,
      schemaVersion: WEEKLY_SCHEMA_VERSION_,
      error: "Sheet 'Trưởng nhóm xử lý' chưa có dữ liệu."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var allRows = targetSheet.getRange(2, 1, lastRow - 1, 18).getValues();
  var targetRowNum = -1;
  var curVals = null;
  for (var i = 0; i < allRows.length; i++) {
    if (String(allRows[i][0] || "").trim() === recordCode) {
      targetRowNum = i + 2;
      curVals = allRows[i];
      break;
    }
  }

  if (targetRowNum < 2 || !curVals) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      weeklySupported: true,
      schemaVersion: WEEKLY_SCHEMA_VERSION_,
      error: "Không tìm thấy Mã hồ sơ " + recordCode
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var noCheckout = Number(curVals[6] || 0);
  var missingImg = Number(curVals[7] || 0);
  var prevHandled = parseBoolCell_(curVals[10]);
  var prevMethod = String(curVals[11] || "");
  var prevNotes = String(curVals[12] || "");
  var prevUpdatedAt = String(curVals[13] || "");
  var prevUpdatedBy = String(curVals[14] || "");
  var prevQlcl = parseBoolCell_(curVals[15]);
  var prevStatus = String(curVals[16] || "");
  var prevSyncNote = String(curVals[17] || "");

  var nextHandled = patch.handled !== undefined ? Boolean(patch.handled) : prevHandled;
  var nextMethod = patch.handlingMethod !== undefined ? String(patch.handlingMethod) : prevMethod;
  var nextNotes = patch.notes !== undefined ? String(patch.notes) : prevNotes;
  var nextQlcl = patch.qlclConfirmed !== undefined ? Boolean(patch.qlclConfirmed) : prevQlcl;

  var nextStatus = "Chưa xử lý";
  if (nextQlcl) {
    nextStatus = "Đã đóng";
  } else if (nextHandled) {
    nextStatus = "Chờ QLCL xác nhận";
  } else if (prevStatus === "Không còn cảnh báo sau cập nhật" && noCheckout === 0 && missingImg === 0) {
    nextStatus = "Không còn cảnh báo sau cập nhật";
  }

  var qlclChanged = patch.qlclConfirmed !== undefined && nextQlcl !== prevQlcl;
  var handledChanged = patch.handled !== undefined && nextHandled !== prevHandled;
  var nextUpdatedAt = prevUpdatedAt;
  if (handledChanged && !nextHandled && !nextQlcl) {
    nextUpdatedAt = "";
  } else if (nextHandled || nextQlcl || patch.handlingMethod !== undefined || patch.notes !== undefined) {
    nextUpdatedAt = nowTs;
  }
  var nextUpdatedBy = (handledChanged || patch.handlingMethod !== undefined || patch.notes !== undefined) ? actor : (prevUpdatedBy || actor);
  var nextSyncNote = prevSyncNote;
  if (qlclChanged) {
    nextSyncNote = nextQlcl ? ("QLCL xác nhận đóng lúc " + nowTs + " bởi " + actor) : ("QLCL hủy xác nhận lúc " + nowTs);
  } else if (handledChanged) {
    nextSyncNote = nextHandled ? ("Trưởng nhóm đã duyệt lúc " + nowTs + " (" + actor + ")") : ("Trưởng nhóm bỏ tích duyệt lúc " + nowTs);
  }

  // Ghi cột K:R (cột 11..18) và giữ công thức COUNTIFS tự động ở cột J (cột 10)
  targetSheet.getRange(targetRowNum, 11, 1, 8).setValues([[
    nextHandled,
    nextMethod,
    nextNotes,
    nextUpdatedAt,
    nextUpdatedBy,
    nextQlcl,
    nextStatus,
    nextSyncNote
  ]]);
  applyReminderCountFormulas_(targetSheet, targetRowNum, 1);
  targetSheet.getRange(targetRowNum, 11).insertCheckboxes();
  targetSheet.getRange(targetRowNum, 16).insertCheckboxes();
  var ruleMethodUpdate = SpreadsheetApp.newDataValidation()
    .requireValueInList(WEEKLY_HANDLING_METHODS_, true)
    .setAllowInvalid(true)
    .build();
  targetSheet.getRange(targetRowNum, 12).setDataValidation(ruleMethodUpdate);
  SpreadsheetApp.flush();

  var readBackRow = targetSheet.getRange(targetRowNum, 1, 1, 18).getValues()[0];

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    weeklySupported: true,
    schemaVersion: WEEKLY_SCHEMA_VERSION_,
    rowNumber: targetRowNum,
    rowValues: readBackRow,
    status: nextStatus
  })).setMimeType(ContentService.MimeType.JSON);
}
`;


