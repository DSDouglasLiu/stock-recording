console.log("App Version: v2.1 (Syntax Fix Verified)");

// Configuration
const GOOGLE_CLIENT_ID = "368914333961-lk0vd7iurbpbuut1dqmrrl7qvo0ctrah.apps.googleusercontent.com";
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwA03qkyECcKPd0YhlmFS1ZnH1eZF6LB6brFTWqXNi9tGfsuPOUfrj65_TS0bLjaNp6HA/exec";

// DOM Elements (fetched dynamically)

// State
let currentUser = null;

let isUserAuthorized = false; // New State
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
    const tabAdd = document.getElementById("tabNavAdd");
    if (tabAdd) tabAdd.addEventListener("click", () => {
        if (!currentUser) { alert("請先登入"); return; }
        showAddForm();
    });

    const tabRecent = document.getElementById("tabNavRecent");
    if (tabRecent) tabRecent.addEventListener("click", () => {
        // If coming back to Dashboard (Recent), maybe reload? 
        // For now just switch view.
        switchView("viewDashboard");
    });



    const btnReset = document.getElementById("btnReset");
    if (btnReset) btnReset.addEventListener("click", resetFormFields);

    const btnSave = document.getElementById("btnSave");
    if (btnSave && !btnSave.hasAttribute("data-bound")) {
        btnSave.setAttribute("data-bound", "true");
        btnSave.addEventListener("click", async () => {
            const typeEl = document.querySelector("input[name='stockType']:checked");
            const type = typeEl ? typeEl.value : "buy";

            const date = document.getElementById("inpDate").value;
            const owner = document.getElementById("inpOwner").value;
            const broker = document.getElementById("inpBroker").value.trim();
            const symbol = document.getElementById("inpSymbol").value.trim();
            const name = document.getElementById("inpName").value.trim();
            const currency = document.getElementById("inpCurrencyInput").value.trim();

            // Type Specific
            let buy_qty = "", buy_amount = "";
            let sell_qty = "", sell_amount = "";
            let stock_div = "";
            let cash_div = "";
            let lending_amt = "";

            if (type === 'buy') {
                buy_qty = document.getElementById("inpBuyQty").value;
                buy_amount = document.getElementById("inpBuyAmt").value;
                if (!buy_qty || !buy_amount) { alert("請輸入買進股數與金額"); return; }
            }
            if (type === 'sell') {
                sell_qty = document.getElementById("inpSellQty").value;
                sell_amount = document.getElementById("inpSellAmt").value;
                if (!sell_qty || !sell_amount) { alert("請輸入賣出股數與金額"); return; }
            }
            if (type === 'stock_div') {
                stock_div = document.getElementById("inpStockDivQty").value;
                if (!stock_div) { alert("請輸入配股數量"); return; }
            }
            if (type === 'cash_div') {
                cash_div = document.getElementById("inpCashDivAmt").value;
                if (!cash_div) { alert("請輸入配息金額"); return; }
            }
            if (type === 'lending') {
                lending_amt = document.getElementById("inpLendingAmt").value;
                if (!lending_amt) { alert("請輸入借出收入"); return; }
            }

            if (!symbol || !date || !broker) {
                alert("請填寫基本資料 (日期、券商、代號)");
                return;
            }

            const payload = {
                action: "addStock",
                user_email: currentUser.email,
                date, owner, broker, symbol, name, currency,
                buy_qty, buy_amount,
                sell_qty, sell_amount,
                sell_qty, sell_amount,
                stock_div, cash_div,
                lending_amt
            };

            btnSave.textContent = "儲存中...";
            btnSave.disabled = true;

            try {
                // BACKEND FIX: Sending action in body is now supported by backend
                const res = await fetch(GAS_API_URL, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
                const result = await res.json();

                if (result.status === "success") {
                    alert("儲存成功");
                    loadDashboard();
                    switchView("viewDashboard");
                } else {
                    throw new Error(result.message);
                }
            } catch (e) {
                alert("儲存失敗: " + e.message);
                console.error(e);
            } finally {
                btnSave.textContent = "儲存";
                btnSave.disabled = false;
            }
        });
    }

    // Close function
}

// Call initialization function when DOM is ready
document.addEventListener("DOMContentLoaded", initializeEventListeners);


// =========================================
// Form Logic
// =========================================

function showAddForm() {
    // Reset inputs
    const elDate = document.getElementById("inpDate");
    if (elDate) elDate.value = new Date().toISOString().split('T')[0];

    const elOwner = document.getElementById("inpOwner");
    if (elOwner) elOwner.value = "J";

    // Clear Text Inputs
    ["inpBroker", "inpSymbol", "inpName", "inpBuyQty", "inpBuyAmt", "inpSellQty", "inpSellAmt", "inpStockDivQty", "inpCashDivAmt", "inpLendingAmt"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const elCurr = document.getElementById("inpCurrencyInput");
    if (elCurr) elCurr.value = "TWD";

    // Reset Type
    const radioBuy = document.querySelector("input[name='stockType'][value='buy']");
    if (radioBuy) {
        radioBuy.checked = true;
        // Manually trigger change to update visibility
        window.toggleFormType();
    }

    populateDatalists();

    updateFormPermissionState(); // Check permission
    switchView("viewForm");
}

function resetFormFields() {
    // Clear Text Inputs Only (Keep Date, Owner, Type)
    ["inpBroker", "inpSymbol", "inpName", "inpBuyQty", "inpBuyAmt", "inpSellQty", "inpSellAmt", "inpStockDivQty", "inpCashDivAmt", "inpLendingAmt"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    // Defaults
    const elCurr = document.getElementById("inpCurrencyInput");
    if (elCurr) elCurr.value = "TWD";
}

function updateFormPermissionState() {
    const deniedEl = document.getElementById("formPermissionDenied");
    const contentEl = document.getElementById("formContentContainer");

    if (isUserAuthorized) {
        if (deniedEl) deniedEl.classList.add("hidden");
        if (contentEl) contentEl.classList.remove("hidden");
    } else {
        if (deniedEl) deniedEl.classList.remove("hidden");
        if (contentEl) contentEl.classList.add("hidden");
    }
}

// Map for Auto-fill
let stockMap = {}; // Symbol -> Name
let nameMap = {};  // Name -> Symbol

// Helper for fuzzy key lookup
function findVal(item, candidates) {
    if (!item) return "";
    // 1. Direct match
    for (let c of candidates) {
        if (item[c] !== undefined) return item[c];
    }
    // 2. Case-insensitive / Trim check
    const keys = Object.keys(item);
    for (let c of candidates) {
        const match = keys.find(k => k.trim().toLowerCase() === c.trim().toLowerCase());
        if (match) return item[match];
    }
    return "";
}

function populateDatalists() {
    // Extract unique values
    const brokers = new Set(["台証", "元大", "國泰", "群益"]);
    const symbols = new Set();
    const names = new Set();
    const currencies = new Set(["TWD", "USD", "JPY"]);

    stockMap = {};
    nameMap = {};

    if (stocksData && stocksData.length > 0) {
        stocksData.forEach(item => {
            // Robust lookup
            const s = (findVal(item, ["Symbol", "股票代號"]) || "").toString().trim();
            const n = (findVal(item, ["Name", "股票名稱"]) || "").toString().trim();
            const b = (findVal(item, ["Broker", "券商"]) || "").toString().trim();
            const c = (findVal(item, ["Currency", "currency", "幣別"]) || "").toString().trim();

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

    // Ensure defaults are present
    currencies.add("TWD");
    currencies.add("USD");
    currencies.add("JPY");

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
                inpName.value = stockMap[val];
            }
        });
        inpSymbol.setAttribute("placeholder", "代號 (可輸入新值)");
    }

    if (inpName) {
        inpName.addEventListener("input", () => {
            const val = inpName.value.trim();
            if (nameMap[val]) {
                inpSymbol.value = nameMap[val];
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

    // switchView("viewDashboard"); // Ensure FAB is shown
    // loadDashboard();

    // Default to Add Form (User Request)
    // We need to fetch data for checking duplicates (populateDatalists) and rendering recent list?
    // Actually showAddForm() calls populateDatalists and logic.
    // But we need stockData loaded for populateDatalists to work well?
    // Let's load data first then show form.
    loadDashboard().then(() => {
        showAddForm();
    });
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
            isUserAuthorized = true; // Authorized
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
            isUserAuthorized = false; // Unauthorized
        } else {
            list.innerHTML = `<div class="hint" style="text-align:center; padding: 20px; color:red;">載入失敗: ${e.message}</div>`;
        }
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

        // Extract values
        // Extract values using robust finder
        const buyAmt = findVal(item, ["Buy_Amt", "購買金額"]);
        const sellAmt = findVal(item, ["Sell_Amt", "賣出金額"]);
        const stockDiv = findVal(item, ["Stock_Div", "配股數量"]);
        const cashDiv = findVal(item, ["Cash_Div", "配息金額"]);
        const lendingAmt = findVal(item, ["Lending_Amt", "借出收入", "Lending_Income"]);
        const dateRaw = findVal(item, ["Date", "日期"]);
        const currency = findVal(item, ["Currency", "currency", "幣別"]) || "TWD";

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
            typeClass = "type-div"; // Reuse styling or new one
            // Special styling for DIV?
            // Reuse type-buy but maybe text-gray-800?
            // "配息" badge style
            nameColor = "#EF4444";
            mainValue = fmt(cashDiv, currency);
            if (currency !== "TWD") {
                const twdVal = calcTWD(cashDiv, currency);
                if (twdVal) subValue = `TWD $ ${twdVal.toLocaleString()}`;
            }
        } else if (lendingAmt && Number(lendingAmt) > 0) {
            typeLabel = "借出收入";
            typeClass = "type-div"; // Same style as Div
            nameColor = "#EF4444"; // Assuming same color as other income types
            mainValue = fmt(lendingAmt, currency);
            if (currency !== "TWD") {
                const twdVal = calcTWD(lendingAmt, currency);
                if (twdVal) subValue = `TWD $ ${twdVal.toLocaleString()}`;
            }
        } else {
            // Default / Fallback
            // Check if Buy/Sell was 0?
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
            <div class="stock-amount" style="display:flex; flex-direction:column; align-items:flex-end; font-weight:700; font-size:15px; color:#1F2937;">
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
