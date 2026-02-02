console.log("App Version: v2.1 (Syntax Fix Verified)");

// Configuration
const GOOGLE_CLIENT_ID = "368914333961-lk0vd7iurbpbuut1dqmrrl7qvo0ctrah.apps.googleusercontent.com";
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxEJbhbIKrCKXRlCeX5qV1Hm32PENACQlHbE2j9n0gaS54g5koKcg6q67CAm0MkVTJFkw/exec";

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

    const btnCancel = document.getElementById("btnCancel");
    if (btnCancel) btnCancel.addEventListener("click", () => switchView("viewDashboard"));

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
                stock_div, cash_div
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
    ["inpBroker", "inpSymbol", "inpName", "inpBuyQty", "inpBuyAmt", "inpSellQty", "inpSellAmt", "inpStockDivQty", "inpCashDivAmt"].forEach(id => {
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
    switchView("viewForm");
}

// Map for Auto-fill
let stockMap = {}; // Symbol -> Name
let nameMap = {};  // Name -> Symbol

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
});

window.toggleFormType = function () {
    const el = document.querySelector("input[name='stockType']:checked");
    if (!el) return;
    const type = el.value;

    // Hide all dynamic
    document.querySelectorAll(".dynamic-group").forEach(el => el.classList.add("hidden"));

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
    }
    if (type === 'cash_div') {
        const f = document.getElementById("fieldsCashDiv");
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
async function loadDashboard() {
    const list = document.getElementById("transactionList");
    if (!list) return;

    list.innerHTML = `<div class="hint" style="text-align:center; padding: 20px;">載入資料中...</div>`;

    if (!GAS_API_URL) {
        list.innerHTML = `<div class="hint" style="text-align:center; color:red;">尚未設定後端網址</div>`;
        return;
    }

    try {
        const url = `${GAS_API_URL}?action=getStocks&email=${encodeURIComponent(currentUser.email)}`;
        const res = await fetch(url);
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

        // Extract values using both English and Chinese keys
        const buyAmt = item.Buy_Amt || item["購買金額"];
        const sellAmt = item.Sell_Amt || item["賣出金額"];
        const stockDiv = item.Stock_Div || item["配股數量"];
        const cashDiv = item.Cash_Div || item["配息金額"];
        const dateRaw = item.Date || item["日期"];

        if (buyAmt) {
            typeLabel = "買入";
            typeClass = "type-buy";
            mainValue = "- $ " + Number(buyAmt).toLocaleString();
        }
        else if (sellAmt) {
            typeLabel = "賣出";
            typeClass = "type-sell";
            mainValue = "+ $ " + Number(sellAmt).toLocaleString();
        }
        else if (stockDiv) {
            typeLabel = "配股";
            typeClass = "type-sell";
            mainValue = "+" + stockDiv + " 股";
        }
        else if (cashDiv) {
            typeLabel = "配息";
            typeClass = "type-sell";
            mainValue = "+ $ " + Number(cashDiv).toLocaleString();
        }

        const dateStr = dateRaw ? dateRaw.toString().substring(0, 10) : "";

        const broker = item.Broker || item["券商"] || "";
        const name = item.Name || item["股票名稱"] || item.Symbol || item["股票代號"] || "";
        const owner = item.Owner || item["Owner"] || "";

        const card = document.createElement("div");
        card.className = "stock-card";
        card.innerHTML = `
            <div class="stock-info">
                <div class="stock-symbol">
                    <span style="font-size:12px; color:#6B7280; margin-right:4px;">${broker}</span>
                    ${name} 
                    <span class="type-badge ${typeClass}">${typeLabel}</span>
                </div>
                <div class="stock-date">${dateStr} · ${owner}</div>
            </div>
            <div class="stock-amount">${mainValue}</div>
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
