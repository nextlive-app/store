var FIREBASE_URL = "https://shop-991-default-rtdb.asia-southeast1.firebasedatabase.app"; 
var FIREBASE_SECRET = ""; 
var DRIVE_FOLDER_ID = "1xKE4KD8D8kld4jUxyQMBPmMIahM23GPG"; 

var SHEET_SETTINGS = "Settings";
var SHEET_PRODUCTS = "ProductList"; 
var SHEET_OPTIONS = "OptionsList";
var SHEET_USERS = "Users";
var SHEET_ORDERS = "Orders";
var SHEET_TRANSACTIONS = "Transactions"; 
var SHEET_OTP = "OTP";
var SHEET_BOOKING = "Booking"; 
var SHEET_AFFILIATE = "Affiliate";
var SHEET_NETWORK = "Network";
var SHEET_MOVIES = "Movies";
var SHEET_MOVIE_DOWNLOADS = "MovieDownloads";
var SHEET_MOVIE_HISTORY = "MovieHistory";
var SHEET_CHAT = "LiveChat"; 

// =============================================================
//                    FIREBASE ENGINE 
// =============================================================
var FBDbCache = null;

function _getDbUrl(path) {
  if (!path) path = "/"; 
  var pathStr = String(path);
  var safePath = pathStr.indexOf('/') === 0 ? pathStr : '/' + pathStr;
  var baseUrl = FIREBASE_URL;
  if (baseUrl.charAt(baseUrl.length - 1) === '/') {
    baseUrl = baseUrl.slice(0, -1);
  }
  var url = baseUrl + safePath + ".json";
  if (FIREBASE_SECRET && FIREBASE_SECRET.trim() !== "") {
    url += "?auth=" + FIREBASE_SECRET;
  }
  return url;
}

function getFBDb() {
  if (!FBDbCache) {
    var url = _getDbUrl("/");
    var res = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
    FBDbCache = JSON.parse(res.getContentText()) || {};
  }
  return FBDbCache;
}

function fbGetValues(sheetName) {
  var db = getFBDb();
  var data = db[sheetName];
  if (!data) return [];
  var arr = [];
  if (Array.isArray(data)) {
    arr = data;
  } else {
    for (var key in data) { arr[parseInt(key)] = data[key]; }
  }
  for (var i = 0; i < arr.length; i++) { if (!arr[i]) arr[i] = []; }
  return arr;
}

function fbAppendRow(sheetName, rowData) {
  var data = fbGetValues(sheetName);
  var nextIdx = data.length;
  var url = _getDbUrl("/" + sheetName + "/" + nextIdx);
  UrlFetchApp.fetch(url, { method: 'put', contentType: 'application/json', payload: JSON.stringify(rowData) });
  if (FBDbCache && FBDbCache[sheetName]) { FBDbCache[sheetName][nextIdx] = rowData; }
}

function fbSetValue(sheetName, row, col, val) {
  var arrRow = row - 1; var arrCol = col - 1;
  var url = _getDbUrl("/" + sheetName + "/" + arrRow + "/" + arrCol);
  UrlFetchApp.fetch(url, { method: 'put', contentType: 'application/json', payload: JSON.stringify(val) });
  if (FBDbCache && FBDbCache[sheetName] && FBDbCache[sheetName][arrRow]) { FBDbCache[sheetName][arrRow][arrCol] = val; }
}

function fbGetValue(sheetName, row, col) {
  var data = fbGetValues(sheetName);
  if (data[row - 1]) return data[row - 1][col - 1];
  return "";
}

function fbDeleteRow(sheetName, row) {
  var arrRow = row - 1;
  var data = fbGetValues(sheetName);
  // แก้บัคการลบข้อมูล (เพื่อไม่ให้ Index เลื่อนจนข้อมูลพัง)
  data[arrRow] = []; 
  var url = _getDbUrl("/" + sheetName);
  UrlFetchApp.fetch(url, { method: 'put', contentType: 'application/json', payload: JSON.stringify(data) });
  if (FBDbCache) FBDbCache[sheetName] = data;
}

// =============================================================
//                    SYSTEM TRIGGERS (Auto Reset Chat)
// =============================================================
function setupMidnightTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "clearDailyChat") { ScriptApp.deleteTrigger(triggers[i]); }
  }
  ScriptApp.newTrigger("clearDailyChat").timeBased().atHour(0).nearMinute(0).everyDays(1).create();
}

function clearDailyChat() {
  var db = getFBDb();
  var chatData = db[SHEET_CHAT];
  if(chatData && chatData.length > 1) {
      var header = chatData[0];
      var url = _getDbUrl("/" + SHEET_CHAT);
      UrlFetchApp.fetch(url, { method: 'put', contentType: 'application/json', payload: JSON.stringify([header]) });
  }
}

// =============================================================
//                    SECURITY UTILS & ADMIN TOKEN
// =============================================================
function hashPassword(password) {
  if (!password) return "";
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  var hashStr = digest.map(function(byte) { return ("0" + ((byte < 0) ? 256 + byte : byte).toString(16)).slice(-2); }).join("");
  return hashStr;
}

function generateAdminToken(config) {
  return hashPassword(config.AdminEmail + "_" + config.AdminPhone + "_SECRET_SECURE_SALT_2026");
}

function verifyAdminToken(payload, config) {
  if (!payload.adminToken) return false;
  return payload.adminToken === generateAdminToken(config);
}

// =============================================================
//                    CORE SYSTEM
// =============================================================

function doGet(e) {
  if (e.parameter.page === 'admin') {
    return HtmlService.createHtmlOutputFromFile('Admin')
        .setTitle('Admin Dashboard | Next Live')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }
  if (e.parameter.page === 'affiliate') {
    return HtmlService.createHtmlOutputFromFile('Affiliate')
        .setTitle('ระบบแนะนำเพื่อน | Next Live')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }
  if (e.parameter.page === 'chat') {
    return HtmlService.createHtmlOutputFromFile('LiveChat')
        .setTitle('Live Support | Next Live')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no');
  }
  if (e.parameter.page === 'movie') {
    return HtmlService.createHtmlOutputFromFile('Movie')
        .setTitle('Movies | Next Live')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Next Live Shop')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

function formatThaiDateTime(dateObj) {
  if (!(dateObj instanceof Date)) {
    var parsed = new Date(dateObj);
    if(isNaN(parsed)) return String(dateObj);
    dateObj = parsed;
  }
  var y = dateObj.getFullYear();
  if(y < 2500) y += 543;
  var m = ("0" + (dateObj.getMonth() + 1)).slice(-2);
  var d = ("0" + dateObj.getDate()).slice(-2);
  var h = ("0" + dateObj.getHours()).slice(-2);
  var min = ("0" + dateObj.getMinutes()).slice(-2);
  var sec = ("0" + dateObj.getSeconds()).slice(-2);
  return d + "/" + m + "/" + y + "  " + h + ":" + min + ":" + sec;
}

function maskPhone(phoneStr) {
  var p = String(phoneStr).replace(/['\-\s]/g, "");
  if(p.length >= 10) return p.substring(0, 2) + "-XXXX-" + p.substring(p.length - 4);
  return p;
}

function cleanStr(str) {
  if (!str) return "";
  return String(str).replace(/['\-\s]/g, "").trim().toLowerCase(); 
}

function notifyAdmin(config, subject, detailsHtml, alertType = "info") {
  var headerColor = "#333333"; var iconStr = "ℹ️";
  if(alertType === "success") { headerColor = "#28a745"; iconStr = "✅"; }
  else if(alertType === "error") { headerColor = "#dc3545"; iconStr = "❌"; }
  else if(alertType === "warning") { headerColor = "#ffc107"; iconStr = "⚠️"; }
  var htmlBody = `
    <div style="font-family: 'Tahoma', sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background-color: ${headerColor}; color: white; padding: 15px 20px; font-size: 18px; font-weight: bold;">
        ${iconStr} [Admin Alert] ${subject}
      </div>
      <div style="padding: 20px; background: #fafafa;">
        <div style="background: #ffffff; padding: 15px; border-radius: 5px; border: 1px solid #eee;">${detailsHtml}</div>
      </div>
      <div style="background-color: #f1f1f1; color: #888; padding: 10px 20px; font-size: 12px; text-align: center; border-top: 1px solid #ddd;">
        ระบบแจ้งเตือนอัตโนมัติจาก ${config.SiteName}
      </div>
    </div>
  `;
  try { MailApp.sendEmail({ to: config.AdminEmail, subject: "[Admin] " + subject, htmlBody: htmlBody }); } catch(e) {}
}

function getSettings() {
  var data = fbGetValues(SHEET_SETTINGS);
  var config = {};
  for (var i = 1; i < data.length; i++) {
    if(data[i] && data[i][0]) config[data[i][0]] = data[i][1];
  }
  return config;
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var config = getSettings(); 

    if (action === "init") return handleInit(config);
    else if (action === "getUserData") return handleGetUserData(payload);
    else if (action === "saveAddress") return handleSaveAddress(payload, config);
    else if (action === "register") return handleRegister(payload, config);
    else if (action === "login") return handleLogin(payload, config);
    else if (action === "logout") return handleLogout(payload, config);
    else if (action === "sendOtp") return handleSendOtp(payload, config); 
    else if (action === "resetPassword") return handleResetPassword(payload, config); 
    else if (action === "changePassword") return handleChangePassword(payload, config); 
    else if (action === "checkDiscountCode") return handleCheckDiscountCode(payload); 
    
    // --- Order / Deposit / Withdraw / Booking Actions ---
    else if (action === "submitOrder") return handleSubmitOrder(payload, config);
    else if (action === "deposit") return handleDeposit(payload, config);
    else if (action === "addBankAccount") return handleAddBankAccount(payload, config);
    else if (action === "withdraw") return handleWithdraw(payload, config);
    else if (action === "getHistory") return handleGetHistory(payload);
    else if (action === "emailStatement") return handleEmailStatement(payload, config);
    else if (action === "depositTimeout") return handleDepositTimeout(payload, config);
    else if (action === "orderTimeout") return handleOrderTimeout(payload, config);
    else if (action === "getBookingList") return handleGetBookingList(payload);
    else if (action === "getBookedSlots") return handleGetBookedSlots(payload);
    else if (action === "submitBooking") return handleSubmitBooking(payload, config);
    else if (action === "cancelBooking") return handleCancelBooking(payload, config);
    
    // --- Affiliate Actions ---
    else if (action === "getAffiliateData") return handleGetAffiliateData(payload);
    else if (action === "transferAffiliateCredit") return handleTransferAffiliateCredit(payload, config);

    // --- Movie Actions ---
    else if (action === "getMoviesData") return handleGetMoviesData(payload);
    else if (action === "recordMovieDownload") return handleRecordMovieDownload(payload, config);
    else if (action === "getUserDownloads") return handleGetUserDownloads(payload);
    else if (action === "recordMovieWatch") return handleRecordMovieWatch(payload, config);
    else if (action === "getUserMovieData") return handleGetUserMovieData(payload);

    // --- Live Chat Actions ---
    else if (action === "getChatMessages") return handleGetChatMessages(payload);
    else if (action === "sendChatMessage") return handleSendChatMessage(payload);
    else if (action === "uploadChatFile") return handleUploadChatFile(payload);
    
    // --- ADMIN API ACTIONS ---
    else if (action === "adminLogin") return handleAdminLogin(payload, config);
    else {
        // บังคับเช็ค Token สำหรับ Admin APIs ป้องกันการถูกแฮก
        if (action.startsWith("admin")) {
            if (!verifyAdminToken(payload, config)) {
                return jsonResponse({status: "error", message: "Unauthorized: Invalid Admin Token"});
            }
        }
        
        if (action === "adminGetData") return handleAdminGetData(payload);
        else if (action === "adminUpdateRow") return handleAdminUpdateRow(payload);
        else if (action === "adminDeleteRow") return handleAdminDeleteRow(payload);
        else if (action === "adminAddRow") return handleAdminAddRow(payload);
        else if (action === "adminCallQueue") return handleAdminCallQueue(payload, config);
        else if (action === "adminBroadcast") return handleAdminBroadcast(payload, config);
        else if (action === "adminGetChatList") return handleAdminGetChatList(payload);
        else if (action === "adminMarkChatRead") return handleAdminMarkChatRead(payload);
        else if (action === "adminDeleteChatMessage") return handleAdminDeleteChatMessage(payload);
    }
    
    return jsonResponse({ status: "error", message: "Invalid action" });
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// =============================================================
//                    LIVE CHAT SYSTEM
// =============================================================
function handleGetChatMessages(payload) {
    var data = fbGetValues(SHEET_CHAT);
    var uid = payload.uid; 
    var result = [];
    
    for (var i = 1; i < data.length; i++) {
        if (!data[i] || data[i].length === 0) continue;
        if (data[i][2] === uid) {
            result.push({
                date: data[i][0], time: data[i][1], uid: data[i][2], phone: data[i][3],
                userMsg: data[i][4], adminMsg: data[i][5], timestamp: data[i][6]
            });
        }
    }
    result.sort((a, b) => a.timestamp - b.timestamp);
    return jsonResponse({ status: "success", messages: result });
}

function handleSendChatMessage(payload) {
    var d = new Date(); 
    var dateStr = Utilities.formatDate(d, "GMT+7", "dd/MM/yyyy"); 
    var timeStr = Utilities.formatDate(d, "GMT+7", "HH:mm:ss");
    var timestamp = d.getTime();
    
    var uid = payload.uid || "GUEST";
    var info = payload.phone || "0000000000"; 
    var msg = payload.message || "";
    var isAdmin = payload.type === 'admin';
    var isRead = isAdmin ? 1 : 0; 
    
    if (!isAdmin) {
        fbAppendRow(SHEET_CHAT, [dateStr, timeStr, uid, info, msg, "", timestamp, isRead]);
    } else {
        fbAppendRow(SHEET_CHAT, [dateStr, timeStr, uid, info, "", msg, timestamp, isRead]);
    }
    return jsonResponse({ status: "success" });
}

function handleUploadChatFile(payload) {
    var decodedData = Utilities.base64Decode(payload.base64); 
    var blob = Utilities.newBlob(decodedData, payload.mimeType || 'image/jpeg', payload.filename || 'chatfile.jpg');
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var newFile = folder.createFile(blob); 
    newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileLink = newFile.getUrl(); 
    
    var msgStr = fileLink;
    if (payload.mimeType.indexOf('image/') > -1) { msgStr = "[IMG]" + fileLink; }
    else if (payload.mimeType.indexOf('video/') > -1) { msgStr = "[VID]" + fileLink; }
    else { msgStr = "[FILE]" + fileLink; }
    
    var payloadForMsg = { uid: payload.uid, phone: payload.phone, message: msgStr, type: payload.type };
    handleSendChatMessage(payloadForMsg);
    
    return jsonResponse({ status: "success", url: fileLink });
}

function handleAdminGetChatList(payload) {
    var data = fbGetValues(SHEET_CHAT);
    var chatMap = {}; 
    var totalUnread = 0;
    
    for (var i = 1; i < data.length; i++) {
        if (!data[i] || data[i].length === 0) continue;
        var uid = data[i][2];
        var info = data[i][3];
        var isUserMsg = data[i][4] !== "";
        var isRead = parseInt(data[i][7]) === 1;
        var ts = parseFloat(data[i][6]);
        
        if (!chatMap[uid]) {
            chatMap[uid] = { uid: uid, info: info, latestMsg: '', timestamp: 0, unreadCount: 0 };
        }
        
        if (ts > chatMap[uid].timestamp) {
            chatMap[uid].timestamp = ts;
            chatMap[uid].latestMsg = isUserMsg ? data[i][4] : data[i][5];
            chatMap[uid].info = info; 
        }
        
        if (isUserMsg && !isRead) {
            chatMap[uid].unreadCount++;
            totalUnread++;
        }
    }
    var chatList = Object.values(chatMap).sort((a, b) => b.timestamp - a.timestamp);
    return jsonResponse({ status: "success", chatList: chatList, totalUnread: totalUnread });
}

function handleAdminMarkChatRead(payload) {
    var data = fbGetValues(SHEET_CHAT);
    var uid = payload.uid;
    for (var i = 1; i < data.length; i++) {
        if (data[i] && data[i].length > 0 && data[i][2] === uid && data[i][4] !== "") {
            if (parseInt(data[i][7]) !== 1) {
                fbSetValue(SHEET_CHAT, i+1, 8, 1); 
            }
        }
    }
    return jsonResponse({ status: "success" });
}

function handleAdminDeleteChatMessage(payload) {
    var data = fbGetValues(SHEET_CHAT);
    var rowToDelete = -1;
    for (var i = 1; i < data.length; i++) {
        if (data[i] && data[i].length > 0 && data[i][2] === payload.uid && parseFloat(data[i][6]) === payload.timestamp) {
            rowToDelete = i + 1; break;
        }
    }
    if (rowToDelete > -1) {
        fbDeleteRow(SHEET_CHAT, rowToDelete);
        return jsonResponse({ status: "success" });
    }
    return jsonResponse({ status: "error", message: "Message not found" });
}

// =============================================================
//                    ADDRESS SYSTEM
// =============================================================
function handleSaveAddress(payload, config) {
    var uData = fbGetValues(SHEET_USERS);
    var rowIndex = -1;
    for (var i = uData.length - 1; i >= 1; i--) {
        if (uData[i] && uData[i].length > 0 && (cleanStr(uData[i][5]) === cleanStr(payload.email) || cleanStr(uData[i][6]) === cleanStr(payload.phone))) { 
            rowIndex = i + 1; break; 
        }
    }
    if (rowIndex > -1) {
        var nameParts = String(payload.name).split(' ');
        fbSetValue(SHEET_USERS, rowIndex, 4, nameParts[0] || "");
        fbSetValue(SHEET_USERS, rowIndex, 5, nameParts.slice(1).join(' ') || "");
        fbSetValue(SHEET_USERS, rowIndex, 12, JSON.stringify(payload.address));
        return jsonResponse({ status: "success", message: "บันทึกที่อยู่เรียบร้อยแล้ว" });
    } else {
        return jsonResponse({ status: "error", message: "ไม่พบข้อมูลผู้ใช้ในระบบ" });
    }
}

// =============================================================
//                    MOVIE SYSTEM LOGIC
// =============================================================
function handleGetMoviesData(payload) {
  var data = fbGetValues(SHEET_MOVIES);
  var movieMap = {}; var categoriesSet = new Set();
  for (var i = 1; i < data.length; i++) {
    if(!data[i] || !data[i][0]) continue;
    var id = String(data[i][0]); var cat = data[i][1]; var title = data[i][2]; var desc = data[i][3];
    var img = data[i][4]; var vidUrl = data[i][5]; var ep = data[i][6]; 
    if (cat) categoriesSet.add(cat);
    if (!movieMap[title]) {
      movieMap[title] = { id: id || Date.now().toString() + i, title: title, category: cat, cover: img, poster: img, desc: desc, isHero: false, episodes: [] };
    }
    if (vidUrl) {
       movieMap[title].episodes.push({ ep: ep || (movieMap[title].episodes.length + 1), title: "ตอนที่ " + (ep || (movieMap[title].episodes.length + 1)), url: vidUrl, duration: "HD" });
    }
  }
  return jsonResponse({ status: "success", movies: Object.values(movieMap), categories: Array.from(categoriesSet) });
}

function handleRecordMovieDownload(payload, config) {
  var timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy | HH:mm:ss");
  fbAppendRow(SHEET_MOVIE_DOWNLOADS, [timestamp, payload.uid || "GUEST", (payload.email || payload.phone || "GUEST"), payload.movieId, payload.movieTitle, payload.episode || "ทั้งหมด"]);
  return jsonResponse({ status: "success", message: "บันทึกประวัติดาวน์โหลดสำเร็จ" });
}

function handleRecordMovieWatch(payload, config) {
  var timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy | HH:mm:ss");
  fbAppendRow(SHEET_MOVIE_HISTORY, [timestamp, payload.uid || "GUEST", (payload.email || payload.phone || "GUEST"), payload.movieId, payload.movieTitle]);
  return jsonResponse({ status: "success", message: "บันทึกประวัติสำเร็จ" });
}

function handleGetUserMovieData(payload) {
  var hData = fbGetValues(SHEET_MOVIE_HISTORY);
  var dlData = fbGetValues(SHEET_MOVIE_DOWNLOADS);
  var identifier = payload.email || payload.phone;
  var history = []; var downloads = [];
  
  if (identifier) {
      var hMap = {};
      for(var i=1; i<hData.length; i++) {
          if(!hData[i] || hData[i].length === 0) continue;
          if(cleanStr(hData[i][2]) === cleanStr(identifier)) hMap[hData[i][3]] = true; 
      }
      history = Object.keys(hMap); 
      
      var dlSet = new Set();
      for(var j=1; j<dlData.length; j++) {
          if(!dlData[j] || dlData[j].length === 0) continue;
          if(cleanStr(dlData[j][2]) === cleanStr(identifier)) dlSet.add(String(dlData[j][3]));
      }
      downloads = Array.from(dlSet);
  }
  return jsonResponse({ status: "success", history: history, downloads: downloads });
}

function handleGetUserDownloads(payload) {
  var data = fbGetValues(SHEET_MOVIE_DOWNLOADS);
  var downloads = []; var identifier = payload.email || payload.phone;
  for(var i=1; i<data.length; i++) {
    if(!data[i] || data[i].length === 0) continue;
    if(cleanStr(data[i][2]) === cleanStr(identifier)) {
        downloads.push({ date: data[i][0], uid: data[i][1], movieId: data[i][3], movieTitle: data[i][4], episode: data[i][5] });
    }
  }
  downloads.reverse();
  return jsonResponse({ status: "success", downloads: downloads });
}

// =============================================================
//                    AFFILIATE SYSTEM LOGIC
// =============================================================
function processAffiliateCommission(buyerEmail, buyerPhone, transactionAmount, isGuest, inviterFromGuestPayload) {
  var netData = fbGetValues(SHEET_NETWORK);
  var uData = fbGetValues(SHEET_USERS);
  
  var cBuyerEmail = cleanStr(buyerEmail);
  var cBuyerPhone = cleanStr(buyerPhone);

  var buyerUID = "";
  if (!isGuest) {
      for (var u = uData.length - 1; u >= 1; u--) {
          if (uData[u] && uData[u].length > 0 && (cleanStr(uData[u][5]) === cBuyerEmail || cleanStr(uData[u][6]) === cBuyerPhone)) {
              buyerUID = uData[u][2];
              break;
          }
      }
  }

  var currentInviterUID = String(inviterFromGuestPayload || "").trim();
  
  if (!currentInviterUID) {
    for (var i = netData.length - 1; i >= 1; i--) {
      if (!netData[i] || netData[i].length === 0) continue;
      if ((cBuyerEmail && cleanStr(netData[i][0]) === cBuyerEmail) || (cBuyerPhone && cleanStr(netData[i][1]) === cBuyerPhone)) { 
          currentInviterUID = String(netData[i][2]).trim(); break; 
      }
    }
  }
  
  if (!currentInviterUID) return; 

  var isInviterValid = false;
  for (var v = uData.length - 1; v >= 1; v--) {
      if (uData[v] && uData[v].length > 0 && String(uData[v][2]).trim() === currentInviterUID) {
         var invEmail = cleanStr(uData[v][5]); var invPhone = cleanStr(uData[v][6]);
         var isSelf = false;
         if (cBuyerEmail && invEmail === cBuyerEmail) isSelf = true;
         if (cBuyerPhone && invPhone === cBuyerPhone) isSelf = true;

         if (isSelf) return; 
         isInviterValid = true; break;
      }
  }

  if (!isInviterValid) return; 
  if (buyerUID && currentInviterUID === buyerUID) return;

  var isNewUser = false;
  if (!isGuest) {
    var ordSheet = fbGetValues(SHEET_ORDERS); var txSheet = fbGetValues(SHEET_TRANSACTIONS); var count = 0;
    for(var o=1; o<ordSheet.length; o++) { if(ordSheet[o] && ordSheet[o].length > 0 && (cleanStr(ordSheet[o][2]) === cBuyerEmail || cleanStr(ordSheet[o][3]) === cBuyerPhone)) count++; }
    for(var t=1; t<txSheet.length; t++) { if(txSheet[t] && txSheet[t].length > 0 && (cleanStr(txSheet[t][3]) === cBuyerEmail || cleanStr(txSheet[t][4]) === cBuyerPhone) && txSheet[t][5] === "ฝากเงิน") count++; }
    if (count <= 1) isNewUser = true; 
  }

  var timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy | HH:mm:ss");
  var level = 1; var maxDepth = 100; 

  while (currentInviterUID && level <= maxDepth) {
    var rate = 0; var typeText = "";
    if (level === 1) { rate = isGuest ? 0.01 : 0.05; typeText = isGuest ? "ไม่มีบัญชี (1%)" : (isNewUser ? "เพื่อนใหม่ (5%)" : "เพื่อนเก่า (5%)"); } 
    else if (level === 2) { rate = 0.01; typeText = "ชั้นที่ 2 แนะนำต่อ (1%)"; } 
    else if (level === 3) { rate = 0.005; typeText = "ชั้นที่ 3 แนะนำต่อ (0.5%)"; } 
    else { rate = 0.001; typeText = "ชั้นที่ " + level + " แนะนำต่อ (0.1%)"; }

    var amount = Number((transactionAmount * rate).toFixed(2));
    if (amount > 0) { fbAppendRow(SHEET_AFFILIATE, [timestamp, currentInviterUID, buyerEmail || buyerPhone, typeText, transactionAmount, amount, "ได้รับแล้ว"]); }

    var nextInviterUID = ""; var currentInviterEmail = ""; var currentInviterPhone = "";
    var foundCurrent = false;
    for(var u = uData.length - 1; u >= 1; u--) {
      if(uData[u] && uData[u].length > 0 && String(uData[u][2]).trim() === currentInviterUID) { 
          currentInviterEmail = cleanStr(uData[u][5]); currentInviterPhone = cleanStr(uData[u][6]); foundCurrent = true; break; 
      }
    }
    
    if (!foundCurrent) break; 
    
    if (currentInviterEmail || currentInviterPhone) {
      for (var n = netData.length - 1; n >= 1; n--) {
        if (netData[n] && netData[n].length > 0 && ((currentInviterEmail && cleanStr(netData[n][0]) === currentInviterEmail) || (currentInviterPhone && cleanStr(netData[n][1]) === currentInviterPhone))) { 
            nextInviterUID = String(netData[n][2]).trim(); break; 
        }
      }
    }
    
    if(nextInviterUID === currentInviterUID || (cBuyerEmail && currentInviterEmail === cBuyerEmail) || (cBuyerPhone && currentInviterPhone === cBuyerPhone)) break;
    currentInviterUID = nextInviterUID; level++;
  }
}

function handleGetAffiliateData(payload) {
  var data = fbGetValues(SHEET_AFFILIATE);
  var uid = payload.uid;
  var availableEarnings = 0; var todayTotalSales = 0; var todayTotalComm = 0; 
  var allTimeUsersSet = new Set(); var todayNewUsersSet = new Set(); var todayOldUsersSet = new Set();
  var todayTier2UsersSet = new Set(); var todayTier3UsersSet = new Set(); var todayTier4PlusUsersSet = new Set(); var todayGuestUsersSet = new Set();
  var statsData = { t1NewSales: 0, t1OldSales: 0, t2Sales: 0, t3Sales: 0, t4PlusSales: 0, guestSales: 0, t1NewComm: 0, t1OldComm: 0, t2Comm: 0, t3Comm: 0, t4PlusComm: 0, guestComm: 0 };
  var history = [];
  var todayStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
  var yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  var yestStr = Utilities.formatDate(yesterdayDate, "GMT+7", "dd/MM/yyyy");
  var yesterdayTotalComm = 0;

  for (var i = data.length - 1; i >= 1; i--) {
    if (!data[i] || data[i].length === 0) continue;
    if (data[i][1] === uid) {
      var dateStr = String(data[i][0]).split(' |')[0].trim();
      var type = String(data[i][3]); var buyerIdentifier = String(data[i][2]).trim();
      var amt = parseFloat(String(data[i][5]).replace(/,/g, '')) || 0; 
      var salesAmt = parseFloat(String(data[i][4]).replace(/,/g, '')) || 0; 
      
      if (type === "ถอนรายได้") { availableEarnings += amt; } 
      else if (String(data[i][6]) === "ได้รับแล้ว" || String(data[i][6]) === "รอย้ายเข้าเป๋า") { availableEarnings += amt; }
      
      if (type !== "ถอนรายได้") {
          allTimeUsersSet.add(buyerIdentifier);
          if (dateStr === yestStr) { yesterdayTotalComm += amt; }
          if (dateStr === todayStr) {
              todayTotalSales += salesAmt; todayTotalComm += amt;
              if (type.includes("เพื่อนใหม่") || type.includes("สมัครบัญชี") || type.includes("สมัครสมาชิก")) { todayNewUsersSet.add(buyerIdentifier); statsData.t1NewSales += salesAmt; statsData.t1NewComm += amt; } 
              else if (type.includes("เพื่อนเก่า")) { todayOldUsersSet.add(buyerIdentifier); statsData.t1OldSales += salesAmt; statsData.t1OldComm += amt; } 
              else if (type.includes("ชั้นที่ 2")) { todayTier2UsersSet.add(buyerIdentifier); statsData.t2Sales += salesAmt; statsData.t2Comm += amt; } 
              else if (type.includes("ชั้นที่ 3")) { todayTier3UsersSet.add(buyerIdentifier); statsData.t3Sales += salesAmt; statsData.t3Comm += amt; } 
              else if (type.includes("ไม่มีบัญชี")) { todayGuestUsersSet.add(buyerIdentifier); statsData.guestSales += salesAmt; statsData.guestComm += amt; } 
              else if (type.includes("ชั้นที่")) { todayTier4PlusUsersSet.add(buyerIdentifier); statsData.t4PlusSales += salesAmt; statsData.t4PlusComm += amt; }
          }
      }
      history.push({ date: data[i][0], buyer: type === "ถอนรายได้" ? "-" : buyerIdentifier.substring(0, 4) + "***", type: type, amount: amt });
    }
  }
  
  return jsonResponse({
    status: "success",
    stats: {
      available: Number(availableEarnings.toFixed(2)), todaySales: Number(todayTotalSales.toFixed(2)), todayComm: Number(todayTotalComm.toFixed(2)), yestComm: Number(yesterdayTotalComm.toFixed(2)),
      totalMembers: allTimeUsersSet.size, uniqueNew: todayNewUsersSet.size, uniqueOld: todayOldUsersSet.size, uniqueTier2: todayTier2UsersSet.size, uniqueTier3: todayTier3UsersSet.size, uniqueTier4Plus: todayTier4PlusUsersSet.size, uniqueGuest: todayGuestUsersSet.size, uniqueDownline: (todayTier2UsersSet.size + todayTier3UsersSet.size + todayTier4PlusUsersSet.size), tables: statsData
    }, history: history
  });
}

function handleTransferAffiliateCredit(payload, config) {
  var affData = fbGetValues(SHEET_AFFILIATE);
  var uData = fbGetValues(SHEET_USERS);
  var uid = payload.uid; var withdrawAmount = parseFloat(payload.amount);
  
  if(isNaN(withdrawAmount) || withdrawAmount < 100) return jsonResponse({ status: "error", message: "ขั้นต่ำในการทำรายการคือ 100 บาท" });
  
  var availableBalance = 0;
  for (var i = 1; i < affData.length; i++) {
    if (affData[i] && affData[i].length > 0 && affData[i][1] === uid) {
      var type = String(affData[i][3]); var amt = parseFloat(String(affData[i][5]).replace(/,/g, '')) || 0;
      if (type === "ถอนรายได้" || String(affData[i][6]) === "ได้รับแล้ว" || String(affData[i][6]) === "รอย้ายเข้าเป๋า") { availableBalance += amt; }
    }
  }
  availableBalance = Number(availableBalance.toFixed(2));
  if (withdrawAmount > availableBalance) return jsonResponse({ status: "error", message: "ยอดเงินไม่เพียงพอ (ยอดที่ถอนได้: " + availableBalance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ")" });
  
  var rowIndex = -1; var currentBalance = 0;
  for (var u = uData.length - 1; u >= 1; u--) {
    if (uData[u] && uData[u].length > 0 && uData[u][2] === uid) { rowIndex = u + 1; currentBalance = parseFloat(uData[u][10]) || 0; break; }
  }
  
  if (rowIndex > -1) {
    var newBalance = currentBalance + withdrawAmount;
    fbSetValue(SHEET_USERS, rowIndex, 11, newBalance);
    var timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy | HH:mm:ss");
    fbAppendRow(SHEET_AFFILIATE, [timestamp, uid, "-", "ถอนรายได้", 0, -withdrawAmount, "สำเร็จ"]);
    var txTimestamp = formatThaiDateTime(new Date());
    fbAppendRow(SHEET_TRANSACTIONS, [txTimestamp, uid, payload.fname, payload.email, payload.phone, "ปรับเครดิต (รับคอมมิชชั่น Aff)", withdrawAmount, "สำเร็จ", "ระบบ Affiliate"]);
    return jsonResponse({ status: "success", message: "ถอนรายได้สำเร็จ", newBalance: newBalance });
  } else { return jsonResponse({ status: "error", message: "ไม่พบผู้ใช้งาน" }); }
}

// =============================================================
//                    USER FRONTEND LOGIC
// =============================================================

function handleInit(config) {
  var pData = fbGetValues(SHEET_PRODUCTS);
  var products = []; var categoriesSet = new Set();
  for (var i = 1; i < pData.length; i++) {
    if(!pData[i] || pData[i].length === 0) continue;
    if(pData[i][1]) categoriesSet.add(pData[i][1]); 
    products.push({ id: String(pData[i][0]), category: pData[i][1], name: pData[i][2], desc: pData[i][3], price: parseFloat(pData[i][4])||0, image: pData[i][5], stock: parseInt(pData[i][8]) || 0 });
  }
  var oData = fbGetValues(SHEET_OPTIONS);
  var options = [];
  for (var j = 1; j < oData.length; j++) {
    if(!oData[j] || oData[j].length === 0) continue;
    options.push({ productId: String(oData[j][0]), id: String(oData[j][0])+"-"+String(oData[j][1]), name: oData[j][1], price: parseFloat(oData[j][2]) || 0 });
  }
  return jsonResponse({ status: "success", settings: config, categories: Array.from(categoriesSet), products: products, options: options });
}

function handleGetUserData(data) {
  var uData = fbGetValues(SHEET_USERS);
  for (var i = uData.length - 1; i >= 1; i--) {
    if(!uData[i] || uData[i].length === 0) continue;
    if (cleanStr(uData[i][5]) === cleanStr(data.email) || cleanStr(uData[i][6]) === cleanStr(data.phone)) {
      var currentBalance = parseFloat(uData[i][10]) || 0; 
      var addressObj = null;
      try { if(uData[i][11]) addressObj = JSON.parse(uData[i][11]); } catch(e){}

      var userObj = { 
        regDate: uData[i][0] + " / " + uData[i][1], uid: uData[i][2], fname: uData[i][3], lname: uData[i][4], 
        email: uData[i][5], phone: uData[i][6], balance: currentBalance, bankName: uData[i][8] ? String(uData[i][8]) : "", 
        bankAcc: uData[i][9] ? String(uData[i][9]) : "", address: addressObj
      };
      return jsonResponse({ status: "success", user: userObj });
    }
  }
  return jsonResponse({ status: "error", message: "ไม่พบข้อมูลผู้ใช้" });
}

function handleRegister(data, config) {
  var records = fbGetValues(SHEET_USERS);
  for (var i = 1; i < records.length; i++) {
    if(!records[i] || records[i].length === 0) continue;
    if (cleanStr(records[i][5]) === cleanStr(data.email) || cleanStr(records[i][6]) === cleanStr(data.phone)) {
      notifyAdmin(config, "การสมัครสมาชิก ไม่สำเร็จ (ข้อมูลซ้ำ)", `<p><b>ความพยายามสมัครด้วย:</b></p><p>ชื่อ: ${data.fname} ${data.lname}</p><p>อีเมล: ${data.email}</p><p>เบอร์โทร: ${data.phone}</p>`, "error");
      return jsonResponse({ status: "error", message: "อีเมล์หรือเบอร์โทรศัพท์นี้ถูกใช้งานแล้ว" });
    }
  }

  var validInviterUID = "";
  if (data.inviterUID && String(data.inviterUID).trim() !== "") {
    var reqInviter = String(data.inviterUID).trim();
    var cNewEmail = cleanStr(data.email);
    var cNewPhone = cleanStr(data.phone);
    
    for (var u = records.length - 1; u >= 1; u--) {
      if (records[u] && records[u].length > 0 && String(records[u][2]).trim() === reqInviter) {
         var invEmail = cleanStr(records[u][5]);
         var invPhone = cleanStr(records[u][6]);
         var isSelf = false;
         if (cNewEmail && invEmail === cNewEmail) isSelf = true;
         if (cNewPhone && invPhone === cNewPhone) isSelf = true;

         if (!isSelf) { validInviterUID = reqInviter; }
         break;
      }
    }
  }

  var d = new Date(); var dateStr = Utilities.formatDate(d, "GMT+7", "dd-MM-yyyy"); var timeStr = Utilities.formatDate(d, "GMT+7", "HH:mm");
  var fullTimestamp = dateStr + " / " + timeStr; var newUid = "U" + Math.floor(Date.now() / 1000);
  
  var hashedPass = hashPassword(data.password);
  fbAppendRow(SHEET_USERS, [dateStr, timeStr, newUid, data.fname, data.lname, data.email, data.phone, hashedPass, "", "", 0, ""]);
  
  if (validInviterUID !== "") {
    fbAppendRow(SHEET_NETWORK, [data.email, data.phone, validInviterUID]);
    var affTimestamp = Utilities.formatDate(d, "GMT+7", "dd/MM/yyyy | HH:mm:ss");
    fbAppendRow(SHEET_AFFILIATE, [affTimestamp, validInviterUID, data.email || data.phone, "เพื่อนใหม่ (สมัครบัญชี)", 0, 0, "เข้าสู่ระบบแล้ว"]);
  }
  
  var userObj = { uid: newUid, fname: data.fname, lname: data.lname, email: data.email, phone: data.phone, balance: 0, bankName: "", bankAcc: "", regDate: fullTimestamp, address: null };
  sendSystemEmail(data.email, "แจ้งผลการทำรายการ", userObj, config, fullTimestamp, "-", "สมัครสมาชิก สำเร็จ");
  notifyAdmin(config, "รายการสมัครสมาชิก สำเร็จ", `<p><b>ID User:</b> ${newUid}</p><p><b>ชื่อ:</b> ${data.fname} ${data.lname}</p><p><b>อีเมล์:</b> ${data.email}</p><p><b>เบอร์:</b> ${data.phone}</p><p><b>เวลา:</b> ${fullTimestamp}</p>`, "success");

  return jsonResponse({ status: "success", message: "สมัครสมาชิกสำเร็จ", user: userObj });
}

function handleLogin(data, config) {
  var records = fbGetValues(SHEET_USERS);
  var hashedInput = hashPassword(String(data.password).trim());
  for (var i = records.length - 1; i >= 1; i--) {
    if(!records[i] || records[i].length === 0) continue;
    if ((cleanStr(records[i][5]) === cleanStr(data.username) || cleanStr(records[i][6]) === cleanStr(data.username))) {
      var storedPass = String(records[i][7]);
      if (storedPass === String(data.password).trim() || storedPass === hashedInput) {
        var currentBalance = parseFloat(records[i][10]) || 0;
        var addressObj = null;
        try { if(records[i][11]) addressObj = JSON.parse(records[i][11]); } catch(e){}

        var userObj = { regDate: records[i][0] + " / " + records[i][1], uid: records[i][2], fname: records[i][3], lname: records[i][4], email: records[i][5], phone: records[i][6], balance: currentBalance, bankName: records[i][8] ? String(records[i][8]) : "", bankAcc: records[i][9] ? String(records[i][9]) : "", address: addressObj };
        var timestamp = formatThaiDateTime(new Date()); 
        sendSystemEmail(userObj.email, "แจ้งผลการทำรายการ", userObj, config, timestamp, "-", "เข้าสู่ระบบ สำเร็จ");
        notifyAdmin(config, "รายการเข้าสู่ระบบ สำเร็จ", `<p><b>ผู้ใช้:</b> ${userObj.fname} ${userObj.lname} (${userObj.phone})</p><p><b>เวลา:</b> ${timestamp}</p>`, "info");
        return jsonResponse({ status: "success", user: userObj });
      }
    }
  }
  var ts = formatThaiDateTime(new Date());
  notifyAdmin(config, "รายการเข้าสู่ระบบ ไม่สำเร็จ", `<p>มีความพยายามเข้าสู่ระบบด้วยชื่อผู้ใช้: <b>${data.username}</b></p><p>เวลา: ${ts}</p>`, "error");
  return jsonResponse({ status: "error", message: "อีเมล์/เบอร์โทรศัพท์ หรือรหัสผ่านไม่ถูกต้อง" });
}

function handleLogout(data, config) {
  var timestamp = formatThaiDateTime(new Date());
  var userObj = { uid: "-", fname: "ผู้ใช้งาน", lname: "", email: data.email, phone: data.phone };
  sendSystemEmail(data.email, "แจ้งผลการทำรายการ", userObj, config, timestamp, "-", "ออกจากระบบ สำเร็จ");
  notifyAdmin(config, "รายการออกจากระบบ สำเร็จ", `<p><b>ผู้ใช้:</b> ${data.phone} (${data.email})</p><p><b>เวลา:</b> ${timestamp}</p>`, "info");
  return jsonResponse({ status: "success" });
}

function handleSendOtp(data, config) {
  var email = cleanStr(data.email);
  var records = fbGetValues(SHEET_USERS);
  var found = false; var userFname = "";
  for(var i=1; i<records.length; i++) {
    if(records[i] && records[i].length > 0 && cleanStr(records[i][5]) === email) { found = true; userFname = records[i][3]; break; }
  }
  if(!found) return jsonResponse({status: "error", message: "ไม่พบอีเมล์นี้ในระบบ"});

  var otp = Math.floor(100000 + Math.random() * 900000).toString();
  var timestamp = formatThaiDateTime(new Date());
  var timeMs = new Date().getTime(); 
  
  fbAppendRow(SHEET_OTP, [timestamp, email, otp, "รอใช้งาน", timeMs]);

  var htmlBody = `
    <div style="font-family: 'Tahoma', sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #e43a3d;">รหัส OTP สำหรับรีเซ็ตรหัสผ่าน</h2>
      <p>เรียน คุณ ${userFname}</p>
      <p>รหัส OTP ของคุณคือ: <b style="font-size:24px; color:#e43a3d; letter-spacing: 2px;">${otp}</b></p>
      <p style="color:red; font-size:12px;">* รหัสนี้มีอายุการใช้งาน 5 นาที โปรดใช้รหัสล่าสุดที่ได้รับ</p>
      <p>ขอแสดงความนับถือ<br>${config.SiteName}</p>
    </div>`;
  try { MailApp.sendEmail({to: email, subject: "รหัส OTP สำหรับรีเซ็ตรหัสผ่าน", htmlBody: htmlBody}); } catch(e){}
  return jsonResponse({status: "success", message: "ระบบได้ส่งรหัส OTP ไปที่อีเมล์ของคุณแล้ว (รหัสมีอายุ 5 นาที)"});
}

function handleResetPassword(data, config) {
  var email = cleanStr(data.email); var otp = String(data.otp).trim(); var newPass = String(data.newPass).trim();
  var otpData = fbGetValues(SHEET_OTP);
  var isValid = false; var otpRowIndex = -1;
  
  for(var j = otpData.length - 1; j >= 1; j--) {
      if(!otpData[j] || otpData[j].length === 0) continue;
      if(cleanStr(otpData[j][1]) === email && String(otpData[j][2]) === otp && otpData[j][3] === "รอใช้งาน") {
          var createdTimeMs = parseFloat(otpData[j][4]);
          if(!isNaN(createdTimeMs)) {
              if (new Date().getTime() - createdTimeMs > 5 * 60 * 1000) {
                  fbSetValue(SHEET_OTP, j + 1, 4, "หมดเวลา");
                  return jsonResponse({status: "error", message: "รหัส OTP หมดอายุ กรุณาส่งรหัสยืนยันอีกครั้ง"});
              }
          }
          isValid = true; otpRowIndex = j + 1; break;
      }
  }
  if(!isValid) return jsonResponse({status: "error", message: "รหัส OTP ไม่ถูกต้อง หรือหมดอายุ/ถูกใช้งานไปแล้ว"});
  fbSetValue(SHEET_OTP, otpRowIndex, 4, "ใช้งานแล้ว");

  var records = fbGetValues(SHEET_USERS);
  for (var i = records.length - 1; i >= 1; i--) {
    if(records[i] && records[i].length > 0 && cleanStr(records[i][5]) === email) {
      fbSetValue(SHEET_USERS, i+1, 8, hashPassword(newPass)); 
      var timestamp = formatThaiDateTime(new Date());
      var userObj = { uid: records[i][2], fname: records[i][3], lname: records[i][4], email: email, phone: records[i][6] };
      sendSystemEmail(email, "แจ้งผลการทำรายการ", userObj, config, timestamp, "-", "เปลี่ยนรหัสผ่าน สำเร็จ");
      return jsonResponse({status: "success", message: "เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว กรุณาลงชื่อเข้าใช้"});
    }
  }
  return jsonResponse({status: "error", message: "เกิดข้อผิดพลาด ไม่พบข้อมูลบัญชี"});
}

function handleChangePassword(data, config) {
  var records = fbGetValues(SHEET_USERS);
  var hashedOldPass = hashPassword(String(data.oldPass).trim());
  for (var i = records.length - 1; i >= 1; i--) {
    if(records[i] && records[i].length > 0 && cleanStr(records[i][5]) === cleanStr(data.email)) {
      var storedPass = String(records[i][7]);
      if(storedPass === String(data.oldPass).trim() || storedPass === hashedOldPass) {
        fbSetValue(SHEET_USERS, i+1, 8, hashPassword(String(data.newPass).trim()));
        var timestamp = formatThaiDateTime(new Date());
        var userObj = { uid: records[i][2], fname: records[i][3], lname: records[i][4], email: cleanStr(data.email), phone: records[i][6] };
        sendSystemEmail(cleanStr(data.email), "แจ้งผลการทำรายการ", userObj, config, timestamp, "-", "แก้ไขรหัสผ่าน สำเร็จ");
        return jsonResponse({status: "success", message: "เปลี่ยนรหัสผ่านสำเร็จ"});
    } else { return jsonResponse({status: "error", message: "รหัสผ่านปัจจุบันไม่ถูกต้อง"}); }
    }
  }
  return jsonResponse({status: "error", message: "ไม่พบข้อมูลบัญชี"});
}

function handleCheckDiscountCode(data) {
  var oData = fbGetValues(SHEET_ORDERS);
  var appliedCode = String(data.code).trim().toUpperCase(); var bName = String(data.name).trim(); var bPhone = cleanStr(data.phone);
  for (var k = 1; k < oData.length; k++) {
    if(!oData[k] || oData[k].length === 0) continue;
    var rowStr = String(oData[k][4] || ""); 
    if (rowStr.indexOf("[Code: " + appliedCode + "]") > -1) {
      var orderName = String(oData[k][2] || "").trim(); var orderPhone = cleanStr(oData[k][3] || "");
      if (orderName === bName || orderPhone === bPhone) {
        return jsonResponse({ status: "error", message: `โค้ดนี้ถูกใช้แล้ว\nเมื่อวันที่ ${oData[k][0]}\nคำสั่งซื้อเลขที่ ${cleanStr(oData[k][1] || "")}` });
      }
    }
  }
  return jsonResponse({status: "success"});
}

function handleAddBankAccount(data, config) {
  var uData = fbGetValues(SHEET_USERS);
  var rowIndex = -1; var cleanInputBankAcc = cleanStr(data.bankAcc);

  for (var j = 1; j < uData.length; j++) {
      if(!uData[j] || uData[j].length === 0) continue;
      if (cleanStr(uData[j][5]) !== cleanStr(data.email) && cleanStr(uData[j][6]) !== cleanStr(data.phone)) { 
          if (cleanStr(uData[j][9] || "") === cleanInputBankAcc && cleanInputBankAcc !== "") {
              return jsonResponse({ status: "error", message: "เลขที่บัญชีนี้ถูกใช้งานโดยผู้ใช้อื่นในระบบแล้ว ไม่สามารถใช้ซ้ำได้" });
          }
      }
  }
  for (var i = uData.length - 1; i >= 1; i--) {
    if (uData[i] && uData[i].length > 0 && (cleanStr(uData[i][5]) === cleanStr(data.email) || cleanStr(uData[i][6]) === cleanStr(data.phone))) { rowIndex = i + 1; break; }
  }
  if (rowIndex > -1) {
    fbSetValue(SHEET_USERS, rowIndex, 9, data.bankName);
    fbSetValue(SHEET_USERS, rowIndex, 10, data.bankAcc); 
    return jsonResponse({ status: "success", message: "บันทึกบัญชีสำเร็จ", bankName: data.bankName, bankAcc: data.bankAcc });
  } else { return jsonResponse({ status: "error", message: "ไม่พบข้อมูลผู้ใช้ในระบบ" }); }
}

function handleEmailStatement(data, config) {
    try {
        var blob = Utilities.newBlob(Utilities.base64Decode(data.base64), 'image/png', `Statement_${data.phone}_${new Date().getTime()}.png`);
        var htmlBody = `<div style="font-family: 'Tahoma', sans-serif;"><p>เรียน คุณ ${data.name}</p><p>ระบบได้แนบไฟล์ใบเสร็จรับเงินของคุณเรียบร้อยแล้ว</p></div>`;
        MailApp.sendEmail({ to: data.email, subject: "ไฟล์ใบเสร็จรับเงิน (Statement) - " + config.SiteName, htmlBody: htmlBody, attachments: [blob] });
        return jsonResponse({ status: "success", message: "ส่งอีเมลสำเร็จ" });
    } catch(e) { return jsonResponse({ status: "error", message: e.toString() }); }
}

function handleDepositTimeout(data, config) {
    var uData = fbGetValues(SHEET_USERS); var userId = "GUEST"; 
    for (var i = uData.length - 1; i >= 1; i--) { if (uData[i] && uData[i].length > 0 && (cleanStr(uData[i][5]) === cleanStr(data.email) || cleanStr(uData[i][6]) === cleanStr(data.phone))) { userId = uData[i][2]; break; } }
    var timestamp = formatThaiDateTime(new Date());
    fbAppendRow(SHEET_TRANSACTIONS, [timestamp, userId, data.fullname, data.email, data.phone, "ฝากเงิน", parseFloat(data.expectedPrice), "รหัสชำระเงินไม่ถูกต้อง ER 102", "-"]);
    return jsonResponse({ status: "success" });
}

function handleOrderTimeout(data, config) {
    var cartSummary = data.cart.map(function(item) { return item.qty + "x " + item.product.name; }).join("\n");
    if(data.discountCode) cartSummary += `\n[Code: ${data.discountCode}]`; 
    var timestamp = formatThaiDateTime(new Date());
    var orderRef = "NX" + Utilities.formatDate(new Date(), "GMT+7", "yyMMdd") + Math.floor(Math.random() * 10000);
    fbAppendRow(SHEET_ORDERS, [timestamp, orderRef, data.buyname, data.phone, cartSummary, parseFloat(data.discount)||0, parseFloat(data.vat)||0, parseFloat(data.expectedPrice), "-", "รหัสชำระเงินไม่ถูกต้อง ER 102", "QR Code"]);
    return jsonResponse({ status: "success" });
}

function handleGetBookingList(data) {
  var bData = fbGetValues(SHEET_BOOKING);
  var bookings = [];
  for (var i = 1; i < bData.length; i++) {
    if (bData[i] && bData[i].length > 0 && cleanStr(bData[i][6]) === cleanStr(data.phone)) {
      bookings.push({ createDate: bData[i][0], topic: bData[i][7], detail: bData[i][8], bookDate: bData[i][9], bookTime: bData[i][10], queueNo: bData[i][11], sequence: bData[i][12], waitCount: bData[i][13], status: bData[i][14], note: bData[i][15], rowId: i + 1 });
    }
  }
  bookings.reverse(); 
  return jsonResponse({ status: "success", bookings: bookings });
}

function handleGetBookedSlots(data) {
    var bData = fbGetValues(SHEET_BOOKING);
    var bookedTimes = []; var hasUserBookedToday = false;
    for (var i = 1; i < bData.length; i++) {
        if (bData[i] && bData[i].length > 0 && bData[i][14] === "รอเรียกคิว" && bData[i][9] === data.date) {
            bookedTimes.push(bData[i][10]);
            if (cleanStr(bData[i][6]) === cleanStr(data.phone)) { hasUserBookedToday = true; }
        }
    }
    return jsonResponse({ status: "success", bookedTimes: bookedTimes, hasUserBookedToday: hasUserBookedToday });
}

function handleCancelBooking(data, config) {
  var rowId = parseInt(data.rowId);
  var bookDateStr = fbGetValue(SHEET_BOOKING, rowId, 10); 
  var bookTimeStr = fbGetValue(SHEET_BOOKING, rowId, 11); 
  
  var parts = String(bookDateStr).split(/[-/]/);
  if(parts.length === 3) {
    var y = parts[2].length === 4 ? parts[2] : parts[0];
    var m = parts[1];
    var d = parts[0].length === 2 && parts[0] <= 31 ? parts[0] : parts[2];
    var bDate = new Date(y + "-" + m + "-" + d + "T" + bookTimeStr + ":00+07:00");
    if((bDate - new Date()) / (1000 * 60 * 60) < 3) {
      return jsonResponse({ status: "error", message: "ไม่สามารถยกเลิกคิวได้ ต้องยกเลิกล่วงหน้าอย่างน้อย 3 ชั่วโมง" });
    }
  }

  fbSetValue(SHEET_BOOKING, rowId, 15, "ยกเลิกแล้ว");
  fbSetValue(SHEET_BOOKING, rowId, 16, "ผู้ใช้ยกเลิกการเข้ารับบริการในวันเวลาที่กำหนด");

  var qNo = fbGetValue(SHEET_BOOKING, rowId, 12);
  try { MailApp.sendEmail({to: data.email, subject: "ยกเลิกคิวสำเร็จ - " + config.SiteName, htmlBody: `<p>คิวหมายเลข ${qNo} ยกเลิกแล้ว</p>`}); } catch(e){}
  return jsonResponse({ status: "success", message: "ยกเลิกคิวสำเร็จ" });
}

function sendSystemEmail(toEmail, subjectTitle, user, config, timestamp, orderRef, actionText) {
  var htmlBody = `
    <div style="font-family: 'Tahoma', sans-serif; color: #333;">
      <h2 style="color: #e43a3d;">${subjectTitle}</h2>
      <p>เรียน คุณ ${user.fname} ${user.lname}</p>
      <p>ระบบขอแจ้งให้ทราบว่า <b>${actionText}</b></p>
      <p>วัน/เวลา: ${timestamp}</p><p>รหัสอ้างอิง: ${orderRef}</p>
    </div>`;
  try { MailApp.sendEmail({ to: toEmail, subject: subjectTitle + " - " + config.SiteName, htmlBody: htmlBody }); } catch(e) {}
}


// =============================================================
//                    ORDER & DEPOSIT Logic 
// =============================================================

function verifySlipWithSlipOK(blob, expectedPrice, branchId, apiKey) {
  var url = 'https://api.slipok.com/api/line/apikey/' + branchId;
  var formData = { 'files': blob, 'log': 'true' };
  var options = { 'method': 'post', 'headers': { 'x-authorization': apiKey }, 'payload': formData, 'muteHttpExceptions': true };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    var jsonResponse = JSON.parse(responseText);
    
    if (responseCode === 200 && jsonResponse.success === true) {
      var actual = parseFloat(jsonResponse.data.amount);
      
      // CRITICAL FIX: ยอดสลิปต้องตรงกับที่กรอกเป๊ะๆ เท่านั้น
      if (Math.abs(actual - expectedPrice) < 0.001) { 
          return { isValid: true, actualAmount: actual }; 
      } else if (actual < expectedPrice) { 
          return { isValid: false, isAmountMismatchUnder: true, actualAmount: actual }; 
      } else {
          return { isValid: false, isAmountMismatchOver: true, actualAmount: actual }; 
      }

    } else {
      var msg = jsonResponse.message || "ไม่สามารถตรวจสอบสลิปได้"; 
      var code = jsonResponse.code || responseCode;
      
      if (code === 1009 || msg.toLowerCase().indexOf("duplicate") > -1 || msg.indexOf("ซ้ำ") > -1) { 
          return { isValid: false, isDuplicate: true, message: msg }; 
      }
      if (msg.indexOf("บัญชี") > -1 || code === 1014 || code === 1015 || code === 1001) { 
          return { isValid: false, isWrongAccount: true, message: msg }; 
      }
      
      return { isValid: false, isFake: true, message: "SlipOK Error: " + msg + " (Code: " + code + ")" }; 
    }
  } catch (e) { 
      return { isValid: false, isFake: true, message: 'ข้อผิดพลาดระบบ: ' + e.toString() }; 
  }
}

function getErrorReason(verificationResult, expectedPrice) {
  if (verificationResult.isDuplicate) return "รหัสชำระเงินซ้ำกับในระบบ (ER 109)\nสลิปนี้ถูกใช้งานไปแล้ว";
  if (verificationResult.isWrongAccount) return "ไม่พบบัญชีในระบบ (ER 101)\nบัญชีไม่ตรง หรือไม่ใช่บัญชีร้าน";
  if (verificationResult.isAmountMismatchUnder) return "ยอดชำระเงินไม่ถูกต้อง\nกรุณาติดต่อทีมงานเพื่อตรวจสอบ";
  if (verificationResult.isAmountMismatchOver) return "ยอดชำระไม่สอดคล้องกับรหัสชำระเงิน\nกรุณาติดต่อทีมงานเพื่อตรวจสอบ";
  return "ตรวจสอบไม่ผ่าน (ER 102)\n" + (verificationResult.message || "สลิปปลอมหรือระบบอ่าน QR Code ไม่ได้ กรุณาใช้สลิปตัวเต็ม");
}

function calculateOrderPriceBackend(cart, discountCode, config) {
  var pData = fbGetValues(SHEET_PRODUCTS);
  var oData = fbGetValues(SHEET_OPTIONS);
  var subtotal = 0;

  for (var c = 0; c < cart.length; c++) {
      var pPrice = 0;
      for (var p = 1; p < pData.length; p++) {
          if (pData[p] && pData[p].length > 0 && pData[p][2] === cart[c].product.name) {
              pPrice = parseFloat(pData[p][4]) || 0; break;
          }
      }
      var optPrice = 0;
      if (cart[c].options && cart[c].options.length > 0) {
          for (var o = 0; o < cart[c].options.length; o++) {
              for (var od = 1; od < oData.length; od++) {
                  if (oData[od] && oData[od].length > 0 && oData[od][1] === cart[c].options[o].name) {
                      optPrice += parseFloat(oData[od][2]) || 0; break;
                  }
              }
          }
      }
      subtotal += (pPrice + optPrice) * cart[c].qty;
  }

  var discount = 0;
  if (discountCode) {
      if (discountCode === config.Code1) discount = parseFloat(config.Discount1) || 0;
      else if (discountCode === config.Code2) discount = parseFloat(config.Discount2) || 0;
      else if (discountCode === config.Code3) discount = parseFloat(config.Discount3) || 0;
  }
  discount = Math.min(discount, subtotal);
  var vat = (subtotal - discount) * 0.07;
  return (subtotal - discount) + vat;
}

function handleSubmitOrder(data, config) {
  var buyname = data.buyname; var buyemail = data.buyemail; var phone = data.phone;
  var cart = data.cart; var discount = parseFloat(data.discount) || 0; var vat = parseFloat(data.vat) || 0;
  var expectedPrice = parseFloat(data.expectedPrice); var creditUsed = parseFloat(data.creditUsed) || 0; 
  var paymentMethod = data.paymentMethod || 'qr'; var appliedCode = data.discountCode || "";

  var realBackendNetTotal = calculateOrderPriceBackend(cart, appliedCode, config);
  var amountToPay = realBackendNetTotal - creditUsed;
  
  if (Math.abs(expectedPrice - amountToPay) > 2) {
      return jsonResponse({ status: "error", message: "ยอดชำระเงินไม่ตรงกับราคาสินค้าในระบบ กรุณาทำรายการใหม่" });
  }

  var pData = fbGetValues(SHEET_PRODUCTS);
  for (var c = 0; c < cart.length; c++) {
    for (var p = 1; p < pData.length; p++) {
      if (pData[p] && pData[p].length > 0 && pData[p][2] === cart[c].product.name) {
        var currentStock = parseInt(pData[p][8]) || 0;
        if (currentStock < cart[c].qty) { return jsonResponse({ status: "error", message: "ขออภัย สินค้า '" + cart[c].product.name + "' มีสต๊อกไม่เพียงพอ" }); }
        break;
      }
    }
  }

  function deductStock() {
    for (var c = 0; c < cart.length; c++) {
      for (var p = 1; p < pData.length; p++) {
        if (pData[p] && pData[p].length > 0 && pData[p][2] === cart[c].product.name) {
          var currentStock = parseInt(pData[p][8]) || 0;
          var newStock = Math.max(0, currentStock - cart[c].qty);
          fbSetValue(SHEET_PRODUCTS, p + 1, 9, newStock); 
          break;
        }
      }
    }
  }

  var timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy | HH:mm:ss");
  var orderRef = "NX" + Utilities.formatDate(new Date(), "GMT+7", "yyMMdd") + Math.floor(Math.random() * 10000);
  var uData = fbGetValues(SHEET_USERS);
  var userId = "GUEST"; var rowIndex = -1; var currentBalance = 0;
  for (var i = uData.length - 1; i >= 1; i--) {
    if (uData[i] && uData[i].length > 0 && (cleanStr(uData[i][5]) === cleanStr(buyemail) || cleanStr(uData[i][6]) === cleanStr(phone))) { userId = uData[i][2]; rowIndex = i + 1; currentBalance = parseFloat(uData[i][10]) || 0; break; }
  }
  var userObj = { uid: userId, fname: buyname.split(' ')[0], lname: buyname.split(' ')[1] || '', email: buyemail, phone: phone };

  var cartSummary = cart.map(function(item) {
    var optText = item.options.length > 0 ? " [" + item.options.map(function(o){return o.name}).join(",") + "]" : "";
    return item.qty + "x " + item.product.name + optText;
  }).join("\n");
  if(appliedCode) cartSummary += `\n[Code: ${appliedCode}]`; 
  if(creditUsed > 0) cartSummary += `\n[ใช้เครดิต: ฿${creditUsed}]`;

  if (paymentMethod === 'free' || (expectedPrice === 0 && creditUsed === 0)) {
    deductStock();
    fbAppendRow(SHEET_ORDERS, [timestamp, orderRef, buyname, phone, cartSummary, discount, vat, 0, "-", "สำเร็จ (ฟรี)", "Free"]);
    sendOrderEmail(buyemail, userObj, config, orderRef, 0, currentBalance, "สำเร็จ", "", cart, discount, vat, "");
    if(data.guestInviterUID) { processAffiliateCommission(buyemail, phone, 0, true, data.guestInviterUID); }
    return jsonResponse({ status: "success", message: "ชำระเงินสำเร็จ", orderRef: orderRef });
  }

  if (paymentMethod === 'credit') {
    deductStock();
    var newBalance = currentBalance - expectedPrice;
    fbSetValue(SHEET_USERS, rowIndex, 11, newBalance);
    fbAppendRow(SHEET_TRANSACTIONS, [timestamp, userId, buyname, buyemail, phone, "สั่งซื้อสินค้า", expectedPrice, `สำเร็จ (Ref: ${orderRef})`, "-"]);
    fbAppendRow(SHEET_ORDERS, [timestamp, orderRef, buyname, phone, cartSummary, discount, vat, expectedPrice, "-", "การชำระเงินถูกต้อง", "Credit"]);
    
    sendOrderEmail(buyemail, userObj, config, orderRef, expectedPrice, newBalance, "สำเร็จ", "", cart, discount, vat, "");
    if(data.guestInviterUID) { processAffiliateCommission(buyemail, phone, expectedPrice, true, data.guestInviterUID); }
    else { processAffiliateCommission(buyemail, phone, expectedPrice, (userId === "GUEST")); }
    
    return jsonResponse({ status: "success", message: "ชำระเงินสำเร็จ", orderRef: orderRef, newBalance: newBalance });
  }

  if (paymentMethod === 'qr') {
    var decodedData = Utilities.base64Decode(data.base64);
    var blob = Utilities.newBlob(decodedData, data.type || 'image/jpeg', data.name || 'slip.jpg');
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var newFile = folder.createFile(blob); newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileLink = newFile.getUrl(); 

    var verificationResult = verifySlipWithSlipOK(blob, expectedPrice, config.SlipOkBranchId, config.SlipOkApiKey);
    
    if (verificationResult.isValid) {
      deductStock(); 
      var finalNewBalance = currentBalance;
      if (creditUsed > 0) {
        finalNewBalance = currentBalance - creditUsed;
        fbSetValue(SHEET_USERS, rowIndex, 11, finalNewBalance);
        fbAppendRow(SHEET_TRANSACTIONS, [timestamp, userId, buyname, buyemail, phone, "สั่งซื้อสินค้า (ร่วมกับ QR)", creditUsed, `สำเร็จ (Ref: ${orderRef})`, "-"]);
      }
      var totalValueRecorded = expectedPrice + creditUsed;
      fbAppendRow(SHEET_ORDERS, [timestamp, orderRef, buyname, phone, cartSummary, discount, vat, totalValueRecorded, fileLink, "การชำระเงินถูกต้อง", "QR Code"]);
      
      sendOrderEmail(buyemail, userObj, config, orderRef, totalValueRecorded, finalNewBalance, "สำเร็จ", "", cart, discount, vat, fileLink);
      
      if(data.guestInviterUID) { processAffiliateCommission(buyemail, phone, totalValueRecorded, true, data.guestInviterUID); }
      else { processAffiliateCommission(buyemail, phone, totalValueRecorded, (userId === "GUEST")); }

      return jsonResponse({ status: "success", message: "ชำระเงินสำเร็จ", orderRef: orderRef, newBalance: finalNewBalance });
    } else {
      var errorMsg = getErrorReason(verificationResult, expectedPrice);
      fbAppendRow(SHEET_ORDERS, [timestamp, orderRef, buyname, phone, cartSummary, discount, vat, (expectedPrice + creditUsed), fileLink, errorMsg.split('\n')[0], "QR Code"]);
      
      sendOrderEmail(buyemail, userObj, config, orderRef, expectedPrice, currentBalance, "ไม่สำเร็จ", errorMsg, cart, discount, vat, fileLink);
      return jsonResponse({ status: "error", message: errorMsg, orderRef: orderRef, newBalance: currentBalance });
    }
  }
}

function handleDeposit(data, config) {
  var phone = data.phone; var email = data.email; var fullname = data.fullname; var expectedPrice = parseFloat(data.expectedPrice);
  
  var uData = fbGetValues(SHEET_USERS);
  var userId = "GUEST"; var rowIndex = -1; var currentBalance = 0;
  for (var i = uData.length - 1; i >= 1; i--) {
    if (uData[i] && uData[i].length > 0 && (cleanStr(uData[i][5]) === cleanStr(email) || cleanStr(uData[i][6]) === cleanStr(phone))) { userId = uData[i][2]; rowIndex = i + 1; currentBalance = parseFloat(uData[i][10]) || 0; break; }
  }
  var userObj = { uid: userId, fname: fullname, lname: '', email: email, phone: phone };

  // บังคับขั้นต่ำ
  if (expectedPrice < 100) {
      return jsonResponse({ status: "error", message: "ขั้นต่ำในการทำรายการคือ 100 บาท", newBalance: currentBalance });
  }

  var decodedData = Utilities.base64Decode(data.base64); 
  var blob = Utilities.newBlob(decodedData, data.type || 'image/jpeg', data.name || 'slip.jpg');
  var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var newFile = folder.createFile(blob); newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var fileLink = newFile.getUrl(); 

  var verificationResult = verifySlipWithSlipOK(blob, expectedPrice, config.SlipOkBranchId, config.SlipOkApiKey);
  var timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy | HH:mm:ss");

  if (verificationResult.isValid) {
    // คำนวณโบนัสและบวกเครดิต
    var depositAmount = expectedPrice; 
    var bonusPercent = parseFloat(config.DepositBonusPercent) || 0;
    var bonusAmount = depositAmount * (bonusPercent / 100);
    var totalCreditAdded = depositAmount + bonusAmount; 
    var newBalance = currentBalance + totalCreditAdded;

    if(rowIndex > -1) { fbSetValue(SHEET_USERS, rowIndex, 11, newBalance); } 
    
    var noteStr = "สำเร็จ";
    if (bonusAmount > 0) { noteStr += " (+โบนัส " + bonusAmount.toFixed(2) + " บาท)"; }
    
    fbAppendRow(SHEET_TRANSACTIONS, [timestamp, userId, fullname, email, phone, "ฝากเงิน", totalCreditAdded, noteStr, fileLink]);
    
    sendDepositEmail(email, userObj, config, depositAmount, bonusAmount, newBalance, "สำเร็จ", "", fileLink);
    
    if(data.guestInviterUID) { processAffiliateCommission(email, phone, depositAmount, true, data.guestInviterUID); }
    else { processAffiliateCommission(email, phone, depositAmount, (userId === "GUEST")); }

    return jsonResponse({ status: "success", message: "เติมเงินสำเร็จ", newBalance: newBalance });
  } else {
    var errorStr = getErrorReason(verificationResult, expectedPrice);
    fbAppendRow(SHEET_TRANSACTIONS, [timestamp, userId, fullname, email, phone, "ฝากเงิน", expectedPrice, errorStr.split('\n')[0], fileLink]);
    sendDepositEmail(email, userObj, config, expectedPrice, 0, currentBalance, "ไม่สำเร็จ", errorStr, fileLink);
    return jsonResponse({ status: "error", message: errorStr, newBalance: currentBalance });
  }
}

function handleWithdraw(data, config) {
  var phone = data.phone; var email = data.email; var fullname = data.fullname; var amount = parseFloat(data.amount);
  var timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy | HH:mm:ss");

  var uData = fbGetValues(SHEET_USERS);
  var userId = "GUEST"; var rowIndex = -1; var currentBalance = 0; var bankName = ""; var bankAcc = "";

  for (var i = uData.length - 1; i >= 1; i--) {
    if (uData[i] && uData[i].length > 0 && (cleanStr(uData[i][5]) === cleanStr(email) || cleanStr(uData[i][6]) === cleanStr(phone))) {
      userId = uData[i][2]; rowIndex = i + 1; currentBalance = parseFloat(uData[i][10]) || 0;
      bankName = uData[i][8]; bankAcc = uData[i][9]; break;
    }
  }
  var userObj = { uid: userId, fname: fullname, lname: '', email: email, phone: phone };

  if (rowIndex === -1) return jsonResponse({ status: "error", message: "ไม่พบผู้ใช้งาน" });
  if (amount < 100 || currentBalance < amount) return jsonResponse({ status: "error", message: "ยอดเงินไม่ถูกต้อง (ขั้นต่ำ 100 บาท)" });

  var newBalance = currentBalance - amount;
  fbSetValue(SHEET_USERS, rowIndex, 11, newBalance);
  fbAppendRow(SHEET_TRANSACTIONS, [timestamp, userId, fullname, email, phone, "ถอนเงิน", amount, "รอดำเนินการ", `ไปยัง: ${bankName} (${bankAcc})`]);

  sendWithdrawEmail(email, userObj, config, amount, currentBalance, bankName, bankAcc, "รอดำเนินการ");
  return jsonResponse({ status: "success", message: "ส่งคำขอถอนเงินเรียบร้อย", newBalance: newBalance });
}

function handleSubmitBooking(data, config) {
  var bData = fbGetValues(SHEET_BOOKING);
  var d = new Date(); var dateStr = Utilities.formatDate(d, "GMT+7", "dd-MM-yyyy"); var timeStr = Utilities.formatDate(d, "GMT+7", "HH:mm:ss");
  
  var countToday = 0; var waitCount = 0;
  for(var i=1; i<bData.length; i++){
    if(!bData[i] || bData[i].length === 0) continue;
    if(bData[i][14] === "รอเรียกคิว" && bData[i][9] === data.bookDate) { countToday++; waitCount++; } 
    else if (bData[i][9] === data.bookDate) { countToday++; }
  }

  var sequence = countToday + 1;
  var parts = String(data.bookDate).split(/[-/]/);
  var y = parts[2].length === 4 ? parts[2] : parts[0];
  var m = parts[1];
  var day = parts[0].length === 2 && parts[0] <= 31 ? parts[0] : parts[2];
  var qDate = new Date(y, m - 1, day);

  var queueNo = "Q" + Utilities.formatDate(qDate, "GMT+7", "yyMMdd") + ("00" + sequence).slice(-3);
  
  fbAppendRow(SHEET_BOOKING, [dateStr, timeStr, data.uid, data.fname, data.lname, data.email, data.phone, data.topic, data.detail, data.bookDate, data.bookTime, queueNo, sequence, waitCount, "รอเรียกคิว", "-"]);
  
  var userObj = { uid: data.uid, fname: data.fname, lname: data.lname, email: data.email, phone: data.phone };
  sendBookingEmail(data.email, userObj, config, queueNo, data.topic, data.detail, waitCount);

  return jsonResponse({ status: "success", queueNo: queueNo, sequence: sequence, waitCount: waitCount });
}

// =============================================================
//                    EXACT EMAIL TEMPLATES 
// =============================================================

function generateEmailHtml(bodyContent) {
    return `<div style="font-family: 'Tahoma', sans-serif; font-size: 14px; color: #333; line-height: 1.6;">${bodyContent}</div>`;
}

function getEmailFooter(config) {
    return `
<br><br>สอบถามข้อมูลเพิ่มเติมได้ที่:<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- ${config.SiteName} Contact Center (24 ชั่วโมง) โทร. ${config.AdminPhone} กด โทรออก<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- อีเมล: ${config.AdminEmail}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- Facebook: ${config.FacebookLink}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- LINE Official Account: ${config.LineLink}<br><br>
ขอแสดงความนับถือ<br>
บริการ ${config.SiteName}
    `;
}

function generateStatementImageHtml(user, orderRef, timestamp, cart, discount, vat, amount, config) {
    var pData = fbGetValues(SHEET_PRODUCTS);
    var oData = fbGetValues(SHEET_OPTIONS);
    
    var tableHtml = `
    <table width="100%" cellpadding="8" cellspacing="0" style="font-family: 'Tahoma', sans-serif; font-size: 12px; border-collapse: collapse; margin-bottom: 10px;">
        <tr style="background-color: #f1f1f1; border-bottom: 2px solid #333;">
            <th align="left" style="border-bottom: 2px solid #333;">รายการสินค้า (Description)</th>
            <th align="center" style="border-bottom: 2px solid #333; width: 60px;">จำนวน</th>
            <th align="right" style="border-bottom: 2px solid #333; width: 100px;">ราคารวม (Total)</th>
        </tr>`;
        
    var totalSub = 0;
    
    for (var i=0; i<cart.length; i++) {
        var item = cart[i];
        var pName = item.product.name;
        var pPrice = 0;
        
        for (var p=1; p<pData.length; p++) {
            if (pData[p] && pData[p].length > 0 && pData[p][2] === pName) { pPrice = parseFloat(pData[p][4]) || 0; break; }
        }
        
        var optPrice = 0;
        var optNames = [];
        if (item.options && item.options.length > 0) {
            for (var o=0; o<item.options.length; o++) {
                var optN = item.options[o].name;
                optNames.push(optN);
                for (var od=1; od<oData.length; od++) {
                    if (oData[od] && oData[od].length > 0 && oData[od][1] === optN) { optPrice += parseFloat(oData[od][2]) || 0; break; }
                }
            }
        }
        
        var rowTotal = (pPrice + optPrice) * item.qty;
        totalSub += rowTotal;
        
        var optText = optNames.length > 0 ? `<br><span style="color: #666; font-size: 11px;">+ ${optNames.join(", ")}</span>` : "";
        var borderStyle = (i === cart.length - 1) ? "border-bottom: 1px solid #ccc;" : "border-bottom: 1px dashed #eee;";
        
        tableHtml += `
        <tr>
            <td style="${borderStyle}">${pName}${optText}</td>
            <td align="center" style="${borderStyle}">${item.qty}</td>
            <td align="right" style="${borderStyle}">${rowTotal.toFixed(2)}</td>
        </tr>`;
    }
    
    tableHtml += `</table>`;
    
    var statementHtml = `
    <div style="background-color: #ffffff; padding: 25px; border: 1px solid #ddd; max-width: 500px; margin: 20px auto; font-family: 'Tahoma', sans-serif;">
        <div style="border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 15px;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="left">
                        <h2 style="color: #e43a3d; margin: 0; font-size: 24px;">Next Live</h2>
                        <div style="font-size: 10px; font-weight: bold; letter-spacing: 1px;">RECEIPT / TAX INVOICE</div>
                    </td>
                    <td align="right" style="font-size: 11px; line-height: 1.4;">
                        <b>ร้าน ${config.SiteName}</b><br>
                        จำหน่ายสินค้าดิจิตอล และพรีเมี่ยม<br>
                        <span style="color: #666;">วันที่ ${timestamp.split('  ')[0]} | ${timestamp.split('  ')[1]} น.</span>
                    </td>
                </tr>
            </table>
        </div>
        
        <div style="background-color: #fafafa; padding: 12px; border-radius: 4px; border: 1px solid #eee; margin-bottom: 15px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 12px; line-height: 1.5;">
                <tr>
                    <td align="left">
                        <b style="color: #e43a3d;">ข้อมูลลูกค้า (Customer)</b><br>
                        <b>ชื่อ-สกุล:</b> ${user.fname} ${user.lname}<br>
                        <b>อีเมล:</b> ${user.email}<br>
                        <b>เบอร์โทร:</b> ${maskPhone(user.phone)}
                    </td>
                    <td align="right" valign="bottom">
                        <div style="font-size: 10px; color: #888;">Order Reference</div>
                        <div style="font-size: 14px; font-weight: bold; font-family: monospace;">${orderRef}</div>
                    </td>
                </tr>
            </table>
        </div>
        
        ${tableHtml}
        
        <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 12px; margin-bottom: 20px;">
            <tr>
                <td align="right" width="70%" style="color: #555;">ยอดรวม (Subtotal)</td>
                <td align="right" width="30%">฿${totalSub.toFixed(2)}</td>
            </tr>
            <tr>
                <td align="right" style="color: #dc3545;">ส่วนลด (Discount)</td>
                <td align="right" style="color: #dc3545;">- ฿${parseFloat(discount).toFixed(2)}</td>
            </tr>
            <tr>
                <td align="right" style="color: #555;">ภาษี (VAT 7%)</td>
                <td align="right">฿${parseFloat(vat).toFixed(2)}</td>
            </tr>
            <tr>
                <td align="right" style="border-top: 1px solid #ccc; padding-top: 8px;"><b>ยอดสุทธิ (Net)</b></td>
                <td align="right" style="border-top: 1px solid #ccc; padding-top: 8px; font-size: 16px; font-weight: bold; color: #e43a3d;">฿${parseFloat(amount).toFixed(2)}</td>
            </tr>
        </table>
        
        <div style="border-top: 1px solid #eee; padding-top: 10px; font-size: 11px;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="left">
                        <b style="color: #e43a3d;">ข้อมูลอ้างอิงการรับเงิน</b><br>
                        <span style="color: #888;">เอกสารนี้ออกโดยระบบอัตโนมัติ</span>
                    </td>
                    <td align="right">
                        <b>ผู้รับเงิน: ${config.AdminName}</b>
                    </td>
                </tr>
            </table>
        </div>
    </div>
    `;
    return statementHtml;
}


function sendOrderEmail(toEmail, user, config, orderRef, amount, newBalance, statusType, errorReason = "", cart = [], discount = 0, vat = 0, fileLink = "") {
    var timestamp = formatThaiDateTime(new Date());
    var statusTitle = statusType === "สำเร็จ" ? "(สำเร็จ)" : "(ไม่สำเร็จ)";
    var statusText = statusType === "สำเร็จ" ? "ชำระเงินเรียบร้อย" : errorReason.replace(/\n/g, ' ');

    var body = `
เรียน ผู้ใช้โทรศัพท์มือถือหมายเลข ${maskPhone(user.phone)}<br>
เรื่อง แจ้งผลการทำรายการชำระค่าสินค้าและบริการ ${statusTitle}<br><br>
ตามที่ คุณได้ทำรายการชำระค่าสินค้าและบริการผ่านบริการ ${config.SiteName} โดยมีรายละเอียด ดังนี้<br><br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;วันที่ทำรายการ: ${timestamp}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ชื่อ นามสกุล: ${user.fname} ${user.lname} (ผู้ใช้)<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;รหัสผู้ใช้งาน: ${user.uid}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;เพื่อเข้าบัญชีบริการ: ${config.AdminName} (แอดมิน)<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;เลขที่บัญชีร้านค้า: ${config.BankAccount}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;รหัสธุรกรรมเลขที่: ${orderRef}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;จำนวนเงิน (บาท): ${amount.toFixed(2)}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ค่าธรรมเนียม (บาท): 0.00<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ยอดถอนได้ (บาท): ${newBalance.toFixed(2)}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;สถานะ: ${statusText}<br><br>
`;

    if(statusType === "สำเร็จ") {
        body += `บริการขอเรียนให้ทราบว่า ระบบได้ดำเนินการชำระค่าสินค้าและบริการจัดส่งสินค้าตามที่คุณได้ทำรายการไว้เรียบร้อยแล้ว ทั้งนี้ คุณสามารถตรวจสอบผลของการทำรายการได้ ที่เมนูรายการล่าสุด`;
    } else {
        body += `บริการขอเรียนให้ทราบว่า ระบบไม่สามารถดำเนินการชำระค่าสินค้าตามที่คุณได้ทำรายการไว้ได้ ทั้งนี้ คุณสามารถตรวจสอบผลการทำรายการได้ที่เมนูรายการล่าสุด`;
    }

    body += getEmailFooter(config);
    
    if (statusType === "สำเร็จ" && cart && cart.length > 0) {
        body += `<br><br><hr style="border: 0; border-top: 1px dashed #ccc; margin: 20px 0;">`;
        body += `<p style="text-align: center; color: #666; font-size: 12px;">เอกสารแนบ: ใบเสร็จรับเงิน (Statement)</p>`;
        
        body += generateStatementImageHtml(user, orderRef, timestamp, cart, discount, vat, amount, config);
        
        var pData = fbGetValues(SHEET_PRODUCTS);
        var oData = fbGetValues(SHEET_OPTIONS);
        var hasLinks = false;
        var linksHtml = `
        <div style="background-color: #f1f8ff; padding: 20px; border-radius: 8px; border-left: 5px solid #0056b3; max-width: 500px; margin: 20px auto; font-family: 'Tahoma', sans-serif;">
            <h3 style="color: #0056b3; margin-top: 0; margin-bottom: 15px;">📥 ลิงก์ดาวน์โหลดสินค้าและคู่มือการใช้งาน</h3>
            <ul style="line-height: 2; margin: 0; padding-left: 20px;">
        `;
        
        for(var i=0; i<cart.length; i++) {
            var item = cart[i];
            var pName = item.product.name;
            var dlLink = ""; var mnLink = "";
            for(var p=1; p<pData.length; p++) {
                if(pData[p] && pData[p].length > 0 && pData[p][2] === pName) { dlLink = pData[p][6] || ""; mnLink = pData[p][7] || ""; break; }
            }
            
            if (dlLink || mnLink) hasLinks = true;
            
            linksHtml += `<li><b>${pName}</b>: `;
            if(dlLink) linksHtml += `<a href="${dlLink}" target="_blank" style="color: #0056b3; text-decoration: none; font-weight: bold;">[ดาวน์โหลดไฟล์]</a> `;
            else linksHtml += `<span style="color: #999;">[ไม่มีไฟล์สินค้า]</span> `;
            if(mnLink) linksHtml += ` | <a href="${mnLink}" target="_blank" style="color: #28a745; text-decoration: none; font-weight: bold;">[ดูคู่มือ]</a>`;
            linksHtml += `</li>`;
            
            if (item.options && item.options.length > 0) {
                for(var o=0; o<item.options.length; o++) {
                    var optNameCheck = item.options[o].name;
                    for(var od=1; od<oData.length; od++) {
                        if(oData[od] && oData[od].length > 0 && oData[od][1] === optNameCheck) {
                            var optDl = oData[od][3] || ""; var optMn = oData[od][4] || "";
                            if(optDl || optMn) {
                                hasLinks = true;
                                linksHtml += `<li style="list-style-type: circle; margin-left: 20px; font-size: 13px;"><b>ส่วนเสริม: ${optNameCheck}</b>: `;
                                if(optDl) linksHtml += `<a href="${optDl}" target="_blank" style="color: #0056b3; text-decoration: none; font-weight: bold;">[ดาวน์โหลดไฟล์]</a> `;
                                if(optMn) linksHtml += ` | <a href="${optMn}" target="_blank" style="color: #28a745; text-decoration: none; font-weight: bold;">[ดูคู่มือ]</a>`;
                                linksHtml += `</li>`;
                            }
                            break;
                        }
                    }
                }
            }
        }
        linksHtml += `</ul></div>`;
        
        if (hasLinks) {
            body += linksHtml;
        }
    }

    try { MailApp.sendEmail({ to: toEmail, subject: `แจ้งผลการทำรายการชำระค่าสินค้าและบริการ ${statusTitle}`, htmlBody: generateEmailHtml(body) }); } catch(e) {}
}

function sendDepositEmail(toEmail, user, config, amount, bonusAmount, newBalance, statusType, errorReason = "", fileLink = "") {
    var timestamp = formatThaiDateTime(new Date());
    var statusTitle = statusType === "สำเร็จ" ? "(สำเร็จ)" : "(ไม่สำเร็จ)";
    var statusText = statusType === "สำเร็จ" ? "รหัสชำระเงินถูกต้อง" : errorReason.replace(/\n/g, ' ');

    var body = `
เรียน ผู้ใช้โทรศัพท์มือถือหมายเลข ${maskPhone(user.phone)}<br>
เรื่อง แจ้งผลการทำรายการเติมเครดิต ${statusTitle}<br><br>
ตามที่คุณได้ทำรายการโอนเงินพร้อมเพย์ผ่านบริการ ${config.SiteName} โดยมีรายละเอียด ดังนี้<br><br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;วันที่ทำรายการ: ${timestamp}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ชื่อ นามสกุล: ${user.fname} ${user.lname}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;รหัสผู้ใช้: ${user.uid}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;เข้าบัญชีรับเงิน: ${config.BankAccount}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ชื่อผู้รับเงิน: ${config.AdminName}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;จำนวนเงินฝาก (บาท): ${amount.toFixed(2)}<br>
${bonusAmount > 0 ? `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;โบนัสที่ได้รับ (บาท): ${bonusAmount.toFixed(2)}<br>` : ''}
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ยอดเครดิตที่ได้รับรวม (บาท): ${(amount + bonusAmount).toFixed(2)}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ยอดถอนได้ (บาท): ${newBalance.toFixed(2)}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;สถานะ: ${statusText}<br><br>
`;

    if(statusType === "สำเร็จ") {
        body += `บริการขอเรียนให้ทราบว่า ระบบได้ดำเนินการโอนเงินตามที่คุณได้ทำรายการไว้เรียบร้อยแล้ว ทั้งนี้ คุณสามารถตรวจสอบผลการทำรายการได้ที่เมนู "ประวัติ" และเลือก "ประวัติการฝากเงิน" เพื่อดูประวัติการทำรายการ<br>`;
        if(fileLink !== "") {
            body += `<br><div style="text-align:center;"><a href="${fileLink}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #e43a3d; color: white; text-decoration: none; border-radius: 5px; font-weight:bold;">ดูสลิปที่แนบมา</a></div><br>`;
        }
    } else {
        body += `บริการขอเรียนให้ทราบว่า ระบบไม่สามารถดำเนินการโอนเงินตามที่คุณได้ทำรายการไว้ได้ ทั้งนี้ คุณสามารถตรวจสอบผลการทำรายการได้ที่เมนู "ประวัติ" และเลือก "ประวัติการฝากเงิน" เพื่อดูประวัติการทำรายการ`;
        if(fileLink !== "") {
            body += `<br><br><div style="text-align:center;"><a href="${fileLink}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #666; color: white; text-decoration: none; border-radius: 5px; font-weight:bold;">ดูสลิปที่มีปัญหา</a></div><br>`;
        }
    }

    body += getEmailFooter(config);
    try { MailApp.sendEmail({ to: toEmail, subject: `แจ้งผลการทำรายการเติมเครดิต ${statusTitle}`, htmlBody: generateEmailHtml(body) }); } catch(e) {}
}

function sendWithdrawEmail(toEmail, user, config, amount, currentBalance, bankName, bankAcc, statusType) {
    var timestamp = formatThaiDateTime(new Date());
    var statusTitle = statusType === "สำเร็จ" ? "(สำเร็จ)" : "(รอดำเนินการ)";

    var body = `
เรียน ผู้ใช้โทรศัพท์มือถือหมายเลข ${maskPhone(user.phone)}<br>
เรื่อง แจ้งผลการทำรายการถอนเครดิต ${statusTitle}<br><br>
ตามที่คุณได้ทำรายการถอนเงินผ่านบริการ ${config.SiteName} โดยมีรายละเอียด ดังนี้<br><br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;วันที่ทำรายการ: ${timestamp}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ชื่อ นามสกุล: ${user.fname} ${user.lname}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ธนาคารรับเงิน: ${bankName}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;เลขที่บัญชี: ${bankAcc}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ชื่อ ผู้โอน: ${config.AdminName} (แอดมิน)<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;จำนวนเงิน (บาท): ${amount.toFixed(2)}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ค่าธรรมเนียม (บาท): 0.00<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ยอดถอนได้ (บาท): ${currentBalance.toFixed(2)}<br><br>
`;

    if(statusType === "สำเร็จ") {
        body += `บริการขอเรียนให้ทราบว่า ระบบได้ดำเนินการโอนเงินตามที่คุณได้ทำรายการไว้เรียบร้อยแล้ว ทั้งนี้ คุณสามารถตรวจสอบผลการทำรายการได้ที่เมนู "ประวัติ" และเลือก "ประวัติการถอนเงิน" เพื่อดูประวัติการทำรายการ`;
    } else {
        body += `บริการขอเรียนให้ทราบว่า ระบบได้ดำเนินการแจ้งเจ้าหน้าที่และ รอดำเนินการไว้เรียบร้อยแล้ว ทั้งนี้ คุณสามารถตรวจสอบผลการทำรายการได้ที่เมนู "ประวัติ" และเลือก "ประวัติการถอนเงิน" เพื่อดูประวัติการทำรายการ`;
    }

    body += getEmailFooter(config);
    try { MailApp.sendEmail({ to: toEmail, subject: `แจ้งผลการทำรายการถอนเครดิต ${statusTitle}`, htmlBody: generateEmailHtml(body) }); } catch(e) {}
}

function sendBookingEmail(toEmail, user, config, queueNo, topic, detail, waitCount) {
    var timestamp = formatThaiDateTime(new Date());

    var body = `
เรียน ผู้ใช้โทรศัพท์มือถือหมายเลข ${maskPhone(user.phone)}<br>
เรื่อง แจ้งผลการทำรายการจองคิว (สำเร็จ)<br><br>
ตามที่คุณได้ทำรายการจองคิวผ่านบริการ ${config.SiteName} โดยมีรายละเอียด ดังนี้<br><br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;วันที่ทำรายการ: ${timestamp}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ชื่อ นามสกุล: ${user.fname} ${user.lname}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;รหัสผู้ใช้งาน: ${user.uid}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;เลขที่คิว: ${queueNo}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;หัวข้อบริการ: ${topic}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;รายละเอียด: ${detail}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;จำนวนคิวรอ: ${waitCount}<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;สถานะ: รอเรียกคิว<br><br>
บริการขอเรียนให้ทราบว่า ระบบได้ดำเนินการจองคิวตามที่คุณได้ทำรายการไว้เรียบร้อยแล้ว ทั้งนี้ คุณสามารถตรวจสอบผลการทำรายการได้ที่เมนู "จองคิว" และเลือก "ตรวจสอบการจอง" เพื่อดูประวัติการทำรายการ
`;
    body += getEmailFooter(config);
    try { MailApp.sendEmail({ to: toEmail, subject: `แจ้งผลการทำรายการจองคิว (สำเร็จ)`, htmlBody: generateEmailHtml(body) }); } catch(e) {}
}

// =============================================================
//                    HISTORY DATA FETCHING
// =============================================================
function handleGetHistory(data) {
  var uData = fbGetValues(SHEET_USERS); var currentBalance = 0;
  for (var k = 1; k < uData.length; k++) {
    if (uData[k] && uData[k].length > 0 && (cleanStr(uData[k][5]) === cleanStr(data.email) || cleanStr(uData[k][6]) === cleanStr(data.phone))) { currentBalance = parseFloat(uData[k][10]) || 0; break; }
  }

  var orderRecords = fbGetValues(SHEET_ORDERS);
  var orderHistory = [];
  for (var i = 1; i < orderRecords.length; i++) {
    if (orderRecords[i] && orderRecords[i].length > 0 && cleanStr(orderRecords[i][3]) === cleanStr(data.phone)) { 
      orderHistory.push({ 
        date: orderRecords[i][0], ref: orderRecords[i][1], items: orderRecords[i][4], 
        discount: orderRecords[i][5], vat: orderRecords[i][6], amount: orderRecords[i][7], status: orderRecords[i][9]
      }); 
    }
  }
  
  var txRecords = fbGetValues(SHEET_TRANSACTIONS);
  var txHistory = []; var wdHistory = [];
  for (var j = 1; j < txRecords.length; j++) {
    if (txRecords[j] && txRecords[j].length > 0 && cleanStr(txRecords[j][4]) === cleanStr(data.phone)) {
      var dt = txRecords[j][0];
      if (txRecords[j][5] === "ฝากเงิน" || String(txRecords[j][5]).indexOf("ปรับเครดิต") > -1) { 
          // เพิ่มการคืนค่า slipUrl ไปให้หน้าบ้าน (เพื่อแสดงปุ่มดูสลิป)
          txHistory.push({ date: dt, items: txRecords[j][5], amount: txRecords[j][6], status: txRecords[j][7], slipUrl: txRecords[j][8] || "" }); 
      } 
      else if (txRecords[j][5] === "ถอนเงิน") { 
          wdHistory.push({ date: dt, items: txRecords[j][8], amount: txRecords[j][6], status: txRecords[j][7] }); 
      }
    }
  }
  
  orderHistory.reverse(); txHistory.reverse(); wdHistory.reverse();
  return jsonResponse({ status: "success", orders: orderHistory, deposits: txHistory, withdraws: wdHistory, balance: currentBalance });
}

// =============================================================
//                    ADMIN BACKEND LOGIC
// =============================================================

function handleAdminLogin(payload, config) {
  if (cleanStr(payload.email) === cleanStr(config.AdminEmail) && cleanStr(payload.phone) === cleanStr(config.AdminPhone)) {
    // ให้สร้าง Token ตอบกลับไปให้ Admin เพื่อใช้ในรอบต่อๆไป
    return jsonResponse({ status: "success", message: "เข้าสู่ระบบสำเร็จ", adminToken: generateAdminToken(config) });
  } else { return jsonResponse({ status: "error", message: "อีเมลหรือเบอร์โทรศัพท์ไม่ถูกต้อง" }); }
}

function getSheetNameByKey(key) {
    if(key === 'users') return SHEET_USERS; if(key === 'orders') return SHEET_ORDERS; if(key === 'booking') return SHEET_BOOKING; if(key === 'products') return SHEET_PRODUCTS;
    if(key === 'settings') return SHEET_SETTINGS; if(key === 'deposits') return SHEET_TRANSACTIONS; if(key === 'withdraws') return SHEET_TRANSACTIONS;
    if(key === 'options') return SHEET_OPTIONS; if(key === 'affiliate') return SHEET_AFFILIATE; if(key === 'movies') return SHEET_MOVIES; if(key === 'movie_downloads') return SHEET_MOVIE_DOWNLOADS;
    if(key === 'network') return SHEET_NETWORK;
    return null;
}

function handleAdminGetData(payload) {
  var data = {};
  var sheets = [ { key: 'users', name: SHEET_USERS }, { key: 'orders', name: SHEET_ORDERS }, { key: 'booking', name: SHEET_BOOKING }, { key: 'products', name: SHEET_PRODUCTS }, { key: 'settings', name: SHEET_SETTINGS }, { key: 'options', name: SHEET_OPTIONS }, { key: 'affiliate', name: SHEET_AFFILIATE }, { key: 'network', name: SHEET_NETWORK }, { key: 'movies', name: SHEET_MOVIES }, { key: 'movie_downloads', name: SHEET_MOVIE_DOWNLOADS } ];
  
  sheets.forEach(function(sConfig) {
      var values = fbGetValues(sConfig.name);
      var arr = [];
      for(var i=1; i<values.length; i++) {
          if (!values[i] || values[i].length === 0) continue;
          var rowData = values[i].slice();
          if (sConfig.key === 'affiliate') { while(rowData.length < 7) rowData.push(""); }
          arr.push({ row: i+1, cols: rowData });
      }
      data[sConfig.key] = arr;
  });

  var txVals = fbGetValues(SHEET_TRANSACTIONS);
  var deposits = []; var withdraws = [];
  for(var j=1; j<txVals.length; j++) {
      if(!txVals[j] || txVals[j].length === 0) continue;
      var type = String(txVals[j][5]); var rowData = txVals[j].slice(); 
      if(type.indexOf("ฝากเงิน") > -1) { deposits.push({ row: j+1, cols: rowData }); } 
      else if(type.indexOf("ถอนเงิน") > -1) { withdraws.push({ row: j+1, cols: rowData }); }
  }
  data['deposits'] = deposits; data['withdraws'] = withdraws;
  return jsonResponse({status: "success", data: data});
}

function handleAdminUpdateRow(payload) {
  var sheetName = getSheetNameByKey(payload.sheet);
  if(!sheetName) return jsonResponse({status: "error", message: "Invalid sheet"});
  var updates = payload.data; 
  
  for (var col in updates) {
      if (updates.hasOwnProperty(col)) {
          var colIndex = parseInt(col) + 1; 
          var val = updates[col];
          
          if (payload.sheet === 'deposits' && colIndex === 8 && val === 'สำเร็จ') {
             var currentStatus = fbGetValue(sheetName, payload.row, colIndex);
             if (currentStatus !== 'สำเร็จ') {
                 var email = fbGetValue(sheetName, payload.row, 4); 
                 var amount = parseFloat(fbGetValue(sheetName, payload.row, 7)); 
                 var uData = fbGetValues(SHEET_USERS);
                 for (var u = uData.length - 1; u >= 1; u--) {
                     if(uData[u] && uData[u].length > 0 && cleanStr(uData[u][5]) === cleanStr(email)) {
                         var curBal = parseFloat(uData[u][10]) || 0;
                         fbSetValue(SHEET_USERS, u+1, 11, curBal + amount);
                         break;
                     }
                 }
             }
          }
          
          if (payload.sheet === 'withdraws' && colIndex === 8 && String(val) === 'ยกเลิก') {
             var currentStatusWd = String(fbGetValue(sheetName, payload.row, colIndex));
             if (currentStatusWd !== 'ยกเลิก') { 
                 var emailWd = fbGetValue(sheetName, payload.row, 4); 
                 var amountWd = parseFloat(fbGetValue(sheetName, payload.row, 7)); 
                 var uDataWd = fbGetValues(SHEET_USERS);
                 for(var uw=uDataWd.length-1; uw>=1; uw--) {
                     if(uDataWd[uw] && uDataWd[uw].length > 0 && cleanStr(uDataWd[uw][5]) === cleanStr(emailWd)) {
                         var curBalWd = parseFloat(uDataWd[uw][10]) || 0;
                         fbSetValue(SHEET_USERS, uw+1, 11, curBalWd + amountWd);
                         break;
                     }
                 }
             }
          }
          fbSetValue(sheetName, payload.row, colIndex, val);
      }
  }
  return jsonResponse({status: "success"});
}

function handleAdminDeleteRow(payload) {
  var sheetName = getSheetNameByKey(payload.sheet);
  if(!sheetName) return jsonResponse({status: "error", message: "Invalid sheet"});
  fbDeleteRow(sheetName, payload.row);
  return jsonResponse({status: "success"});
}

function handleAdminAddRow(payload) {
    var data = payload.data;
    if (payload.sheet === 'products') {
        fbAppendRow(SHEET_PRODUCTS, [data[0], data[1], data[2], data[3], parseFloat(data[4]) || 0, data[5]||"", data[6]||"", data[7]||"", parseInt(data[8]) || 0]);
        return jsonResponse({status: "success"});
    } else if (payload.sheet === 'options') {
        fbAppendRow(SHEET_OPTIONS, [data[0], data[1], parseFloat(data[2]) || 0, data[3]||"", data[4]||""]);
        return jsonResponse({status: "success"});
    } else if (payload.sheet === 'users') {
        var d = new Date(); var dateStr = Utilities.formatDate(d, "GMT+7", "dd-MM-yyyy"); var timeStr = Utilities.formatDate(d, "GMT+7", "HH:mm");
        var newUid = "U" + Math.floor(Date.now() / 1000); var phone = data[3] ? String(data[3]).trim() : "";
        var hashedPass = hashPassword(data[4]);
        fbAppendRow(SHEET_USERS, [dateStr, timeStr, newUid, data[0], data[1], data[2], phone, hashedPass, "", "", 0, ""]);
        return jsonResponse({status: "success"});
    } else if (payload.sheet === 'movies') {
        fbAppendRow(SHEET_MOVIES, [data[0], data[1], data[2], data[3], data[4]||"", data[5]||"", data[6]||""]);
        return jsonResponse({status: "success"});
    } else if (payload.sheet === 'network') {
        fbAppendRow(SHEET_NETWORK, [data[0], data[1], data[2]]);
        return jsonResponse({status: "success"});
    } else if (payload.sheet === 'settings') {
        fbAppendRow(SHEET_SETTINGS, [data[0], data[1], data[2]]);
        return jsonResponse({status: "success"});
    }
    return jsonResponse({status: "error", message: "Unsupported sheet for add"});
}

function handleAdminCallQueue(payload, config) {
    fbSetValue(SHEET_BOOKING, payload.row, 15, "เข้ารับบริการแล้ว");
    return jsonResponse({status: "success"});
}

function handleAdminBroadcast(payload, config) {
    var uData = fbGetValues(SHEET_USERS);
    var emails = [];
    for(var i=1; i<uData.length; i++) {
        if(!uData[i] || uData[i].length === 0) continue;
        var email = String(uData[i][5]).trim();
        if(email && email.indexOf('@') > -1) { emails.push(email); }
    }
    if(emails.length === 0) return jsonResponse({status: "error", message: "ไม่พบอีเมลผู้ใช้ในระบบ"});
    
    var imgTag = payload.imgUrl ? `<div style="text-align:center; margin-bottom: 20px;"><img src="${payload.imgUrl}" style="max-width:100%; border-radius: 8px;"></div>` : "";
    var msgHtml = payload.message.replace(/\n/g, '<br>');
    var htmlBody = `
    <div style="font-family: 'Tahoma', sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      ${imgTag}<div style="font-size: 16px; color: #444;">${msgHtml}</div>
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #888; text-align: center;">อีเมลฉบับนี้ส่งจากระบบอัตโนมัติของ ${config.SiteName}</div>
    </div>`;
    
    var chunkSize = 50; 
    for(var j=0; j<emails.length; j+=chunkSize) {
        var chunk = emails.slice(j, j+chunkSize);
        try { MailApp.sendEmail({ to: config.AdminEmail, bcc: chunk.join(','), subject: payload.subject, htmlBody: htmlBody }); } catch(e) { }
    }
    return jsonResponse({status: "success"});
}
