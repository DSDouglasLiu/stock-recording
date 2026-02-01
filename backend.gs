// Google Apps Script Code for Stock Recording Backend
// Copy this content into your Google Apps Script project (Extensions > Apps Script)

// CONFIGURATION
const SPREADSHEET_ID = "1Kk7mRQJniCid7h3K5EqbBAZP9pdoSpOvp9j9giAcJNg";
const SHEET_NAME = "Transactions";
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
    const action = params.action;
    
    // Parse Body if Post
    let body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    // Identify User Email
    // For getStocks, it's in params.email
    // For addStock, it's in body.user_email
    const userEmail = params.email || body.user_email;

    if (!userEmail) {
      return responseJSON({ status: "error", message: "Email required" });
    }

    // Check Permission
    if (!checkPermission(userEmail)) {
      return responseJSON({ status: "error", message: "Permission Denied: User not authorized" });
    }

    // Route Actions
    let result = {};
    if (action === "getStocks") {
      result = getStocks(userEmail);
    } else if (action === "addStock") {
      result = addStock(body);
    } else {
      result = { status: "error", message: "Unknown action" };
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
  
  // If sheet doesn't exist, Create it (Optional, or just block)
  // User said it will exist. If fail, maybe creating it helps properly showing where to fill.
  if (!sheet) {
    sheet = ss.insertSheet(PERMISSION_SHEET_NAME);
    sheet.appendRow(["name", "gmail"]);
    return false; // Newly created, definitely empty
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return false; // Only headers or empty

  // Normalize Headers to find "gmail"
  const headers = data[0].map(h => h.toString().toLowerCase().trim());
  const emailColIndex = headers.indexOf("gmail");

  if (emailColIndex === -1) return false; // "gmail" column not found

  // Check email
  const checkEmail = email.toLowerCase().trim();
  
  // Start from row 1 (skip header)
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
    // Init Headers
    sheet.appendRow([
      "id", "created_at", "user_email", "stock_symbol", "stock_name", 
      "type", "date", "price", "quantity", "fee", "tax", "total_amount", "note"
    ]);
  }
  return sheet;
}

function getStocks(userEmail) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { status: "success", data: [] }; // No data

  const headers = data[0];
  const rows = data.slice(1);
  
  // Filter by Email
  const userRows = rows.filter(r => r[2] === userEmail);
  
  // Map to Object
  const results = userRows.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  
  // Sort by date desc
  results.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return { status: "success", data: results };
}

function addStock(data) {
  const sheet = getSheet();
  
  if (!data.user_email || !data.stock_symbol) {
    throw new Error("Missing required fields");
  }
  
  const id = Utilities.getUuid();
  const createdAt = new Date();
  
  const newRow = [
    id,
    createdAt,
    data.user_email,
    data.stock_symbol,
    data.stock_name || "",
    data.type || "buy", 
    data.date || new Date().toISOString().split('T')[0],
    data.price || 0,
    data.quantity || 0,
    data.fee || 0,
    data.tax || 0,
    data.total_amount || 0,
    data.note || ""
  ];
  
  sheet.appendRow(newRow);
  
  return { status: "success", id: id };
}
