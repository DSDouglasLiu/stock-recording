// Google Apps Script Code for Stock Recording Backend
// Copy this content into your Google Apps Script project (Extensions > Apps Script)

// CONFIGURATION
const SPREADSHEET_ID = "1Kk7mRQJniCid7h3K5EqbBAZP9pdoSpOvp9j9giAcJNg";
const SHEET_NAME = "stocklist"; // Changed from Transactions
const PERMISSION_SHEET_NAME = "permission control";

function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    const params = e.parameter;

    
    // Parse Body if Post
    let body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    // Fix: Check action in both URL params and Body
    const action = params.action || body.action;

    const userEmail = params.email || body.user_email;

    if (!userEmail) {
      return responseJSON({ status: "error", message: "Email required" });
    }

    if (!checkPermission(userEmail)) {
      return responseJSON({ status: "error", message: "Permission Denied: User not authorized" });
    }

    // Route Actions
    let result = {};
    if (action === "getStocks") {
      result = getStocks(userEmail); // Still filtering by email? User said "Owner content: J, D". Maybe multiple users manage same sheet?
      // Requirement says "Owner" is a field. 
      // Current Permission logic checks if the *logged in user* is allowed.
      // Do we strictly filter rows by logged in user? "Owner" field (J/D) suggests a shared sheet where J sees D's stuff?
      // I will return ALL data if authorized, and let frontend filter/display.
      // But for now let's keep it simple: Return ALL rows from 'stocklist'.
      result = getStocks(); 
    } else if (action === "addStock") {
      result = addStock(body);
    } else {
      // DEBUG: Return input details to identify why action is missing
      result = { 
          status: "error", 
          message: "Unknown action. DebugInfo: Body=" + JSON.stringify(body) + ", Params=" + JSON.stringify(params) 
      };
    }

    return responseJSON(result);
      
  } catch (err) {
    return responseJSON({ status: "error", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// -----------------------------------------------------
// Logic
// -----------------------------------------------------

function checkPermission(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(PERMISSION_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(PERMISSION_SHEET_NAME);
    sheet.appendRow(["name", "gmail"]);
    return false; 
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return false;

  const headers = data[0].map(h => h.toString().toLowerCase().trim());
  const emailColIndex = headers.indexOf("gmail");

  if (emailColIndex === -1) return false;

  const checkEmail = email.toLowerCase().trim();
  
  for (let i = 1; i < data.length; i++) {
    const rowEmail = data[i][emailColIndex].toString().toLowerCase().trim();
    if (rowEmail === checkEmail) {
      return true;
    }
  }
  
  return false;
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Init Headers (12 Columns)
    // 日期、Owner、券商、股票代號、股票名稱、買進股數（股）、幣別、購買金額、賣出股數（股）、賣出金額、配股數量、配息金額
    sheet.appendRow([
      "Date", "Owner", "Broker", "Symbol", "Name", 
      "Currency", "Buy_Qty", "Buy_Amt", 
    ]);
  }
  return sheet;
}
// Version: Fixed Duplicate Name & Header Order (Timestamp: ${new Date().toISOString()})

function getStocks() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { status: "success", data: [] };

  const headers = data[0];
  const rows = data.slice(1);
  
  const results = rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  
  // Sort by Date desc
  results.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  
  return { status: "success", data: results };
}

function addStock(data) {
  const sheet = getSheet();
  
  // Mapping
  // Data keys from frontend: date, owner, broker, symbol, name, currency, ...
  // specific logic per type is handled in frontend, backend just receives all possible fields
  
  const newRow = [
    data.date || new Date(),
    data.owner || "",
    data.broker || "",
    data.symbol || "",
    data.name || "",

    data.currency || "TWD", // Moved before Buy_Qty
    data.buy_qty || "",
    data.buy_amount || "",
    data.sell_qty || "",
    data.sell_amount || "",
    data.stock_div || "",
    data.cash_div || "",
    new Date(), // Created_At
    data.user_email // User_Email
  ];
  
  sheet.appendRow(newRow);
  
  return { status: "success" };
}
