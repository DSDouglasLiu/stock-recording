console.log("App Version: v2.1 (Syntax Fix Verified)");

// Configuration
const GOOGLE_CLIENT_ID = "368914333961-lk0vd7iurbpbuut1dqmrrl7qvo0ctrah.apps.googleusercontent.com";
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyLhQQ24adWib04y7t1AY33OqfRrPOF0jJmRgIPyeEdN_CDqSlpCehi2Ht7WxkHRFQckQ/exec";

// DOM Elements (fetched dynamically)

// State
let currentUser = null;
let stocksData = [];

// =========================================
// UI Logic
// =========================================

function switchView(viewId) {
    document.querySelectorAll(".page-view").forEach(el => el.classList.add("hidden"));
    document.getElementById(viewId).classList.remove("hidden");

    // Update Tab State
    const tabRecent = document.getElementById("tabNavRecent");
    const tabAdd = document.getElementById("tabNavAdd");

    if (viewId === "viewDashboard") {
        if (tabRecent) tabRecent.classList.add("active");
        if (tabAdd) tabAdd.classList.remove("active");
    } else if (viewId === "viewForm") {
        if (tabRecent) tabRecent.classList.remove("active");
        if (tabAdd) tabAdd.classList.add("active");
    }
}

// Initialization function to attach event listeners
function initializeEventListeners() {
    // Tab Listeners
    // Tab Listeners
    const tabAdd = document.getElementById("tabNavAdd");
    if (tabAdd) tabAdd.addEventListener("click", () => {
        if (!currentUser) { showModal("提示", "請先登入"); return; }
        showAddForm();
    });

    const tabRecent = document.getElementById("tabNavRecent");
    if (tabRecent) tabRecent.addEventListener("click", () => {
        switchView("viewDashboard");
        loadDashboard(); // Reload data from Sheet
    });

    // Button Listeners
    const btnCancel = document.getElementById("btnCancel");
    if (btnCancel) btnCancel.addEventListener("click", () => switchView("viewDashboard"));

    // btnSave logic is handled in the main DOMContentLoaded block (bottom of file) to support Edit mode.


    // Modal Events
    const modalOverlay = document.querySelector(".modal-overlay");
    if (modalOverlay) modalOverlay.addEventListener("click", hideModal);

    const modalBtnConfirm = document.getElementById("modalBtnConfirm");
    if (modalBtnConfirm) modalBtnConfirm.addEventListener("click", hideModal);
}

// =========================================
// Global Modal Logic
// =========================================
let onModalConfirm = null;

function showModal(title, message, callback) {
    const modal = document.getElementById("appModal");
    const elTitle = document.getElementById("modalTitle");
    const elBody = document.getElementById("modalBody");

    if (!modal) { alert(message); return; } // Fallback

    if (elTitle) elTitle.textContent = title;
    if (elBody) elBody.textContent = message;

    onModalConfirm = callback;
    modal.classList.add("active");
}

function hideModal() {
    const modal = document.getElementById("appModal");
    if (modal) modal.classList.remove("active");

    if (onModalConfirm && typeof onModalConfirm === 'function') {
        onModalConfirm();
        onModalConfirm = null;
    }
}

// Call initialization function when DOM is ready
document.addEventListener("DOMContentLoaded", initializeEventListeners);


// =========================================
// Form Logic
// =========================================

// =========================================
// Form Logic
// =========================================

function showAddForm() {
    // Reset Mode
    editingRowIndex = null;
    document.getElementById("btnSave").textContent = "儲存";
    document.getElementById("btnDelete").classList.add("hidden");

    // Reset Form
    document.getElementById("inpDate").valueAsDate = new Date(); // Default today
    document.getElementById("inpOwner").value = "J";

    // Clear Text Inputs
    ["inpBroker", "inpSymbol", "inpName", "inpBuyQty", "inpBuyAmt", "inpSellQty", "inpSellAmt", "inpStockDivQty", "inpCashDivAmt", "inpLendingAmt"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    // Default to Buy
    document.querySelector('input[name="stockType"][value="buy"]').checked = true;
    toggleFormType();

    populateDatalists(); // Ensure lists are fresh
    switchView("viewForm"); // Navigate to view
}

// Map for Auto-fill
let stockMap = {}; // Symbol -> Name
let nameMap = {};  // Name -> Symbol

function populateDatalists() {
    console.log("Populating Datalists, stocksData count:", stocksData.length);

    // Extract unique values
    const brokers = new Set(["台証", "元大", "國泰", "群益"]);
    const symbols = new Set();
    const names = new Set();
    const currencies = new Set(["TWD", "USD", "JPY"]);

    stockMap = {};
    nameMap = {};

    if (stocksData && stocksData.length > 0) {
        stocksData.forEach(item => {
            // Support both English and Chinese headers
            const s = (item.Symbol || item["股票代號"] || "").toString().trim();
            const n = (item.Name || item["股票名稱"] || "").toString().trim();
            const b = (item.Broker || item["券商"] || "").toString().trim();
            const c = (item.Currency || item["幣別"] || "").toString().trim();

            if (b) brokers.add(b);
            if (c) currencies.add(c);

            if (s) symbols.add(s);
            if (n) names.add(n);

            if (s && n) {
                stockMap[s] = n;
                nameMap[n] = s;
            }
        });
    }

    fillDatalist("listBrokers", brokers);
    fillDatalist("listSymbols", symbols);
    fillDatalist("listNames", names);
    fillDatalist("listCurrencies", currencies);
}

function fillDatalist(id, set) {
    const list = document.getElementById(id);
    if (!list) return;
    list.innerHTML = "";
    set.forEach(val => {
        const opt = document.createElement("option");
        opt.value = val;
        list.appendChild(opt);
    });
}

// Auto-fill Logic
document.addEventListener("DOMContentLoaded", () => {
    const inpSymbol = document.getElementById("inpSymbol");
    const inpName = document.getElementById("inpName");

    if (inpSymbol) {
        inpSymbol.addEventListener("input", () => {
            const val = inpSymbol.value.trim();
            if (stockMap[val]) {
                if (inpName && !inpName.value) {
                    inpName.value = stockMap[val];
                }
            }
        });
        inpSymbol.setAttribute("placeholder", "代號 (可輸入新值)");
    }

    if (inpName) {
        inpName.addEventListener("input", () => {
            const val = inpName.value.trim();
            if (nameMap[val]) {
                if (inpSymbol && !inpSymbol.value) {
                    inpSymbol.value = nameMap[val];
                }
            }
        });
        inpName.setAttribute("placeholder", "名稱 (可輸入新值)");
    }

    const inpCurrency = document.getElementById("inpCurrencyInput");
    if (inpCurrency) {
        inpCurrency.setAttribute("placeholder", "幣別 (可輸入新值)");
    }
});

window.toggleFormType = function () {
    const el = document.querySelector("input[name='stockType']:checked");
    if (!el) return;
    const type = el.value;

    // Hide all dynamic
    document.querySelectorAll(".dynamic-group").forEach(el => el.classList.add("hidden"));

    // Default: Show Currency
    const divCurrency = document.getElementById("divCurrency");
    if (divCurrency) divCurrency.classList.remove("hidden");

    // Show specific
    if (type === 'buy') {
        const f = document.getElementById("fieldsBuy");
        if (f) f.classList.remove("hidden");
    }
    if (type === 'sell') {
        const f = document.getElementById("fieldsSell");
        if (f) f.classList.remove("hidden");
    }
    if (type === 'stock_div') {
        const f = document.getElementById("fieldsStockDiv");
        if (f) f.classList.remove("hidden");
        // Hide Currency for Stock Div
        if (divCurrency) divCurrency.classList.add("hidden");
    }
    if (type === 'cash_div') {
        const f = document.getElementById("fieldsCashDiv");
        if (f) f.classList.remove("hidden");
    }
    if (type === 'lending') {
        const f = document.getElementById("fieldsLending");
        if (f) f.classList.remove("hidden");
    }
}


// =========================================
// Google Auth Logic (GIS)
// =========================================
window.handleCredentialResponse = function (response) {
    const responsePayload = decodeJwtResponse(response.credential);
    console.log("Logged in as: " + responsePayload.email);

    currentUser = responsePayload;
    currentUser.idToken = response.credential;

    updateUIForLogin();
}

function decodeJwtResponse(token) {
    try {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return {};
    }
}

function updateUIForLogin() {
    if (!currentUser) return;

    // Hide Login Button
    const signinBtn = document.getElementById("g_id_signin");
    if (signinBtn) signinBtn.style.display = "none";

    // Show User Avatar
    const userInfo = document.getElementById("userInfo");
    const userAvatar = document.getElementById("userAvatar");
    if (userInfo && userAvatar) {
        userInfo.style.display = "flex";
        userAvatar.src = currentUser.picture;
    }

    switchView("viewDashboard"); // Ensure FAB is shown
    loadDashboard();
}

// =========================================
// Data Logic
// =========================================
// Exchange Rates State
let exchangeRates = { TWD: 1, USD: 32.5 }; // Default fallback

async function fetchExchangeRates() {
    try {
        const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
        const data = await res.json();
        if (data && data.rates) {
            exchangeRates = data.rates;
            console.log("Rates Fetched:", exchangeRates);
        }
    } catch (e) {
        console.error("Failed to fetch rates, using fallback.", e);
    }
}

async function loadDashboard() {
    // Fetch rates first (non-blocking if we want speed, but for accuracy we wait or render after)
    // Let's fire it and not await strictly, OR await to prevent UI jump. 
    // Given the dashboard loads data too, we can run in parallel.
    const pRates = fetchExchangeRates();

    const list = document.getElementById("transactionList");
    if (!list) return;

    list.innerHTML = `<div class="hint" style="text-align:center; padding: 20px;">載入資料中...</div>`;

    if (!GAS_API_URL) {
        list.innerHTML = `<div class="hint" style="text-align:center; color:red;">尚未設定後端網址</div>`;
        return;
    }

    try {
        const url = `${GAS_API_URL}?action=getStocks&email=${encodeURIComponent(currentUser.email)}`;

        const [res, _] = await Promise.all([fetch(url), pRates]);
        const result = await res.json();

        console.log("API Result:", result);

        if (result.status === "success") {
            stocksData = result.data;
            renderList(stocksData);
        } else {
            throw new Error(result.message || "Unknown error");
        }
    } catch (e) {
        console.error("Load Failed:", e);

        const msg = e.message.toLowerCase();
        if (msg.includes("permission") || msg.includes("denied") || msg.includes("auth")) {
            list.innerHTML = `
                <div style="text-align:center; padding: 40px;">
                    <div style="font-size:48px;">🚫</div>
                    <div style="font-weight:700; color:#EF4444; margin-top:16px;">權限不足</div>

                </div>
            `;
            const cardTitle = document.querySelector("#viewDashboard div[style*='background'] div[style*='font-size: 32px']");
            if (cardTitle) cardTitle.textContent = "$ -";
        } else {
            list.innerHTML = `<div class="hint" style="text-align:center; padding: 20px; color:red;">載入失敗: ${e.message}</div>`;
        }
    }
}

let editingRowIndex = null; // State for editing

document.addEventListener("DOMContentLoaded", () => {
    // ... existing init ...
    const inpSymbol = document.getElementById("inpSymbol");
    const inpName = document.getElementById("inpName");

    if (inpSymbol) {
        inpSymbol.addEventListener("input", () => {
            const val = inpSymbol.value.trim();
            if (stockMap[val]) {
                if (inpName && !inpName.value) {
                    inpName.value = stockMap[val];
                }
            }
        });
        inpSymbol.setAttribute("placeholder", "代號 (可輸入新值)");
    }

    if (inpName) {
        inpName.addEventListener("input", () => {
            const val = inpName.value.trim();
            if (nameMap[val]) {
                if (inpSymbol && !inpSymbol.value) {
                    inpSymbol.value = nameMap[val];
                }
            }
        });
        inpName.setAttribute("placeholder", "名稱 (可輸入新值)");
    }

    const inpCurrency = document.getElementById("inpCurrencyInput");
    if (inpCurrency) {
        inpCurrency.setAttribute("placeholder", "幣別 (可輸入新值)");
    }

    const btnDelete = document.getElementById("btnDelete");

    // Delete Button Logic
    if (btnDelete) btnDelete.addEventListener("click", () => {
        if (!editingRowIndex) return;

        showModal("確認刪除", "確定要刪除這筆紀錄嗎？此動作無法復原。", async () => {
            // Confirm Callback
            try {
                showModal("處理中", "正在刪除...");
                const result = await callGAS({
                    action: "deleteStock",
                    user_email: currentUser.email,
                    rowIndex: editingRowIndex
                });

                if (result.status === "success") {
                    showModal("成功", "刪除成功", () => {
                        loadDashboard();
                        switchView("viewDashboard");
                    });
                } else {
                    throw new Error(result.message);
                }
            } catch (e) {
                showModal("錯誤", "刪除失敗: " + e.message);
            }
        });
    });

    const btnSave = document.getElementById("btnSave");
    if (btnSave) {
        btnSave.addEventListener("click", async () => {
            // ... Validation Logic (Keep existing) ...

            // Collect Data
            const type = document.querySelector('input[name="stockType"]:checked').value;
            const date = document.getElementById("inpDate").value;
            const owner = document.getElementById("inpOwner").value;
            const broker = document.getElementById("inpBroker").value;
            const symbol = document.getElementById("inpSymbol").value;
            const name = document.getElementById("inpName").value;
            const currency = document.getElementById("inpCurrencyInput").value || "TWD";

            let buy_qty = "", buy_amount = "";
            let sell_qty = "", sell_amount = "";
            let stock_div = "";
            let cash_div = "";
            let lending_amount = "";

            if (type === 'buy') {
                buy_qty = document.getElementById("inpBuyQty").value;
                buy_amount = document.getElementById("inpBuyAmt").value;
                if (!buy_qty || !buy_amount) { showModal("欄位未填", "請輸入買進股數與金額"); return; }
            }
            if (type === 'sell') {
                sell_qty = document.getElementById("inpSellQty").value;
                sell_amount = document.getElementById("inpSellAmt").value;
                if (!sell_qty || !sell_amount) { showModal("欄位未填", "請輸入賣出股數與金額"); return; }
            }
            if (type === 'stock_div') {
                stock_div = document.getElementById("inpStockDivQty").value;
                if (!stock_div) { showModal("欄位未填", "請輸入配股數量"); return; }
            }
            if (type === 'cash_div') {
                cash_div = document.getElementById("inpCashDivAmt").value;
                if (!cash_div) { showModal("欄位未填", "請輸入配息金額"); return; }
            }
            if (type === 'lending') {
                lending_amount = document.getElementById("inpLendingAmt").value;
                if (!lending_amount) { showModal("欄位未填", "請輸入借出收入"); return; }
            }

            if (!symbol || !date || !broker) {
                showModal("欄位未填", "請填寫基本資料 (日期、券商、代號)");
                return;
            }

            // Determine Action
            const action = editingRowIndex ? "updateStock" : "addStock";
            const statusText = editingRowIndex ? "更新中..." : "儲存中...";

            const payload = {
                action: action,
                user_email: currentUser.email,
                rowIndex: editingRowIndex, // Only used if update
                date, owner, broker, symbol, name, currency,
                buy_qty, buy_amount,
                sell_qty, sell_amount,
                stock_div, cash_div, lending_amount
            };

            btnSave.textContent = statusText;
            btnSave.disabled = true;

            try {
                const result = await callGAS(payload);
                if (result.status === "success") {
                    showModal("成功", editingRowIndex ? "更新成功" : "儲存成功", () => {
                        loadDashboard();
                        switchView("viewDashboard");
                    });
                } else {
                    throw new Error(result.message);
                }
            } catch (e) {
                showModal("錯誤", "失敗: " + e.message);
                console.error(e);
            } finally {
                btnSave.textContent = editingRowIndex ? "更新" : "儲存";
                btnSave.disabled = false;
            }
        });
    }
});

// ... inside switchView or separate helper ...



function startEdit(item) {
    editingRowIndex = item._rowIndex;
    if (!editingRowIndex) { showModal("錯誤", "無法編輯此紀錄 (找不到 ID)"); return; }

    // Switch View
    switchView("viewForm");

    // Update UI
    document.getElementById("btnSave").textContent = "更新";
    document.getElementById("btnDelete").classList.remove("hidden");

    // Fill Data
    // Date: YYYY-MM-DD
    const d = new Date(item.Date || item["日期"]);
    // Adjust for timezone offset to ensure correct date string
    const dateStr = d.toISOString().split('T')[0];
    document.getElementById("inpDate").value = dateStr;

    document.getElementById("inpOwner").value = item.Owner || item["Owner"] || "J";
    document.getElementById("inpBroker").value = item.Broker || item["券商"] || "";
    document.getElementById("inpSymbol").value = item.Symbol || item["股票代號"] || "";
    document.getElementById("inpName").value = item.Name || item["股票名稱"] || "";
    document.getElementById("inpCurrencyInput").value = item.Currency || item["幣別"] || "TWD";

    // Determine Type
    let type = "buy";
    if (item.Buy_Amt || item["購買金額"]) type = "buy";
    else if (item.Sell_Amt || item["賣出金額"]) type = "sell";
    else if (item.Stock_Div || item["配股數量"]) type = "stock_div";
    else if (item.Cash_Div || item["配息金額"]) type = "cash_div";
    else if (item.lending_amount || item["借出收入"] || item["Lending Income"]) type = "lending";

    document.querySelector(`input[name="stockType"][value="${type}"]`).checked = true;
    toggleFormType();

    // Fill Specifics
    // Fill Specifics
    if (type === 'buy') {
        const qty = item.Buy_Qty || item["買進股數 (股)"] || item["買進股數（股）"] || item["買進股數"] || item["Buy_Qty"] || "";
        const amt = item.Buy_Amt || item["購買金額"] || item["Buy_Amt"] || "";
        document.getElementById("inpBuyQty").value = qty;
        document.getElementById("inpBuyAmt").value = amt;
    }
    else if (type === 'sell') {
        const qty = item.Sell_Qty || item["賣出股數 (股)"] || item["賣出股數（股）"] || item["賣出股數"] || item["Sell_Qty"] || "";
        const amt = item.Sell_Amt || item["賣出金額"] || item["Sell_Amt"] || "";
        document.getElementById("inpSellQty").value = qty;
        document.getElementById("inpSellAmt").value = amt;
    }
    else if (type === 'stock_div') {
        document.getElementById("inpStockDivQty").value = item.Stock_Div || item["配股數量"] || "";
    }
    else if (type === 'cash_div') {
        document.getElementById("inpCashDivAmt").value = item.Cash_Div || item["配息金額"] || "";
    }
    else if (type === 'lending') {
        document.getElementById("inpLendingAmt").value = item.lending_amount || item["借出收入"] || item["Lending Income"] || "";
    }
}

function renderList(data) {
    const list = document.getElementById("transactionList");
    if (!list) return;
    list.innerHTML = "";

    if (data.length === 0) {
        list.innerHTML = `<div class="hint" style="text-align:center; padding: 40px; color: #9CA3AF;">暫無交易紀錄</div>`;
        return;
    }

    // Limit to 20 items
    const displayData = data.slice(0, 20);

    displayData.forEach(item => {
        let typeLabel = "未知";
        let typeClass = "type-buy";
        let mainValue = "";
        let subValue = ""; // For TWD conversion
        let nameColor = "#1F2937";

        let qtyValue = ""; // [NEW] Quantity display

        // Extract values
        const buyAmt = item.Buy_Amt || item["購買金額"];
        const sellAmt = item.Sell_Amt || item["賣出金額"];
        const stockDiv = item.Stock_Div || item["配股數量"];
        const cashDiv = item.Cash_Div || item["配息金額"];
        const lendingAmt = item.lending_amount || item["借出收入"] || item["Lending Income"]; // Check multiple keys
        const dateRaw = item.Date || item["日期"];
        const currency = item.Currency || item["幣別"] || "TWD";

        // Helper to format currency
        const fmt = (val, curr) => `${curr} $ ${Number(val).toLocaleString()}`;

        // Helper to convert to TWD
        // 1 USD = 32 TWD.  Rate(USD) = 1 (base). Rate(TWD) = 32.
        // TWD_Val = Amt / Rate(Curr) * Rate(TWD)
        const calcTWD = (amt, curr) => {
            if (curr === "TWD") return null;
            if (!exchangeRates[curr] || !exchangeRates["TWD"]) return null;
            // Base is USD in my fetch
            // Val in USD = amt / exchangeRates[curr]
            // Val in TWD = (amt / exchangeRates[curr]) * exchangeRates["TWD"]
            const val = (amt / exchangeRates[curr]) * exchangeRates["TWD"];
            return Math.floor(val);
        };

        if (buyAmt) {
            typeLabel = "買入";
            typeClass = "type-buy";
            nameColor = "#EF4444";
            mainValue = fmt(buyAmt, currency);

            // Extract Qty
            const qty = item.Buy_Qty || item["買進股數 (股)"] || item["買進股數（股）"] || item["買進股數"] || 0;
            if (qty) qtyValue = `${Number(qty).toLocaleString()} 股`;

            const twdVal = calcTWD(buyAmt, currency);
            if (twdVal !== null) {
                subValue = `TWD $ ${twdVal.toLocaleString()}`;
            }
        }
        else if (sellAmt) {
            typeLabel = "賣出";
            typeClass = "type-sell";
            nameColor = "#10B981";
            mainValue = fmt(sellAmt, currency);

            // Extract Qty
            const qty = item.Sell_Qty || item["賣出股數 (股)"] || item["賣出股數（股）"] || item["賣出股數"] || 0;
            if (qty) qtyValue = `${Number(qty).toLocaleString()} 股`;

            const twdVal = calcTWD(sellAmt, currency);
            if (twdVal !== null) {
                subValue = `TWD $ ${twdVal.toLocaleString()}`;
            }
        }
        else if (stockDiv) {
            typeLabel = "配股";
            typeClass = "type-div";
            nameColor = "#EF4444";
            mainValue = stockDiv + " 股";
            // Stock Div doesn't need currency conversion
        }
        else if (cashDiv) {
            typeLabel = "配息";
            typeClass = "type-div";
            nameColor = "#EF4444";
            mainValue = fmt(cashDiv, currency);

            const twdVal = calcTWD(cashDiv, currency);
            if (twdVal !== null) {
                subValue = `TWD $ ${twdVal.toLocaleString()}`;
            }
        }
        else if (lendingAmt) {
            typeLabel = "借出收入";
            typeClass = "type-div"; // Requests same style as divs
            nameColor = "#EF4444"; // Assuming Red for income? User requested "Stock Name Color" to be Red for Buy, Green for Sell/Div?
            // Wait, previous request (Obj 3 in summary): "red for 'Buy' transactions and green for 'Sell/Dividend'"
            // But wait, the previous code snippet shows:
            // Buy: #EF4444 (Red)
            // Sell: #10B981 (Green)
            // Stock Div: #EF4444 (Red) -> Wait, user said "green for Sell/Dividend" in Summary objective 3?
            // Let's re-read the previous turn's code.
            // In the snippet I viewed:
            // buy: #EF4444 (Red)
            // sell: #10B981 (Green)
            // stockDiv: #EF4444 (Red) -> This contradicts "green for Sell/Dividend". 
            // BUT, in "Previous Session Summary -> Features Modified -> Badge Style": "Further refining the color for '配息' (Cash Dividend) and '配股' (Stock Dividend) transactions to be red, aligning with the user's latest request."
            // Ah, Obj 4 says: "Further refining... to be red". 
            // So Red is correct for Divs.
            // For Lending Income, usually it's Income, so likely Red.
            // I'll stick with Red (#EF4444) for Lending Income + type-div style.

            mainValue = fmt(lendingAmt, currency);
            const twdVal = calcTWD(lendingAmt, currency);
            if (twdVal !== null) {
                subValue = `TWD $ ${twdVal.toLocaleString()}`;
            }
        }

        // Date Logic
        let dateStr = "";
        if (dateRaw) {
            const d = new Date(dateRaw);
            const year = d.getFullYear();
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
        }

        const broker = item.Broker || item["券商"] || "";
        const name = item.Name || item["股票名稱"] || item.Symbol || item["股票代號"] || "";
        const owner = item.Owner || item["Owner"] || "";

        const card = document.createElement("div");
        card.className = "stock-card";
        card.style.cursor = "pointer"; // Add pointer cursor
        card.onclick = () => startEdit(item); // Add Edit Handler

        // Layout:
        // Left: Info
        // Right: Amount Stack
        card.innerHTML = `
            <div class="stock-info">
                <div class="stock-symbol">
                    <span style="font-size:12px; color:#6B7280; margin-right:4px;">${broker}</span>
                    <span style="color:${nameColor}">${name}</span>
                    <span class="type-badge ${typeClass}">${typeLabel}</span>
                </div>
                <div class="stock-date">${dateStr} · ${owner}</div>
            </div>
            <div class="stock-amount" style="display:flex; flex-direction:column; align-items:flex-end;">
                ${qtyValue ? `<div style="font-size:13px; color:#4B5563; margin-bottom:2px;">${qtyValue}</div>` : ''}
                <div>${mainValue}</div>
                ${subValue ? `<div style="margin-top:2px;">${subValue}</div>` : ''}
            </div>
        `;
        list.appendChild(card);
    });
}



// Init
window.onload = function () {
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
    });

    google.accounts.id.renderButton(
        document.getElementById("g_id_signin"),
        { theme: "outline", size: "large", type: "standard", shape: "pill" }
    );
};

// =========================================
// Backend API Helper
// =========================================
async function callGAS(payload) {
    if (!GAS_API_URL) throw new Error("API URL Not Configured");

    // Always attach user email if not present (safety)
    if (currentUser && !payload.user_email) {
        payload.user_email = currentUser.email;
    }

    const response = await fetch(GAS_API_URL, {
        method: "POST",
        body: JSON.stringify(payload)
    });

    return await response.json();
}
