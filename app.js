
// Configuration
const GOOGLE_CLIENT_ID = "368914333961-lk0vd7iurbpbuut1dqmrrl7qvo0ctrah.apps.googleusercontent.com";
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwGmMRPDpEFreiManpbHsvbmtNIvHYrqQIoK1mkc73zsnpEHd08X67ATAG7Mgr5O3axVw/exec";

// DOM Elements
const btnAddStock = document.getElementById("btnAddStock");

// State
let currentUser = null;
let stocksData = [];

// =========================================
// UI Logic
// =========================================

function switchView(viewId) {
    document.querySelectorAll(".page-view").forEach(el => el.classList.add("hidden"));
    document.getElementById(viewId).classList.remove("hidden");

    // Toggle FAB: Show only on Dashboard
    if (viewId === "viewDashboard") {
        if (btnAddStock) btnAddStock.style.display = "flex";
    } else {
        if (btnAddStock) btnAddStock.style.display = "none";
    }
}

if (btnAddStock) btnAddStock.addEventListener("click", () => {
    if (!currentUser) {
        alert("請先登入");
        return;
    }
    showAddForm();
});

// =========================================
// Form Logic
// =========================================
function showAddForm() {
    // Reset inputs
    document.getElementById("inpDate").value = new Date().toISOString().split('T')[0];
    document.getElementById("inpSymbol").value = "";
    document.getElementById("inpName").value = "";
    document.getElementById("inpPrice").value = "";
    document.getElementById("inpQty").value = "";
    document.getElementById("inpFee").value = "";
    document.getElementById("inpTax").value = "";

    // Reset Radio
    const radioBuy = document.querySelector("input[name='stockType'][value='buy']");
    if (radioBuy) {
        radioBuy.checked = true;
        radioBuy.dispatchEvent(new Event('change')); // Trigger toggleType
    }

    document.getElementById("txtTotal").textContent = "$ 0";

    switchView("viewForm");
}

window.toggleType = function (type) {
    // Visual update
    const isBuy = document.querySelector("input[name='stockType']:checked").value === 'buy';
    const lblBuy = document.getElementById("lblTypeBuy");
    const lblSell = document.getElementById("lblTypeSell");

    if (lblBuy && lblSell) {
        if (isBuy) {
            lblBuy.style.background = "#EFF6FF"; lblBuy.style.color = "#2563EB";
            lblSell.style.background = "white"; lblSell.style.color = "#374151";
        } else {
            lblSell.style.background = "#ECFDF5"; lblSell.style.color = "#059669";
            lblBuy.style.background = "white"; lblBuy.style.color = "#374151";
        }
    }
    calculateTotal();
}

function calculateTotal() {
    const price = Number(document.getElementById("inpPrice").value) || 0;
    const qty = Number(document.getElementById("inpQty").value) || 0;
    const fee = Number(document.getElementById("inpFee").value) || 0;
    const tax = Number(document.getElementById("inpTax").value) || 0;

    // Safety check for elements exist
    const typeEl = document.querySelector("input[name='stockType']:checked");
    if (!typeEl) return;

    const isBuy = typeEl.value === 'buy';

    let total = 0;
    const subtotal = price * qty;

    if (isBuy) {
        total = subtotal + fee;
    } else {
        total = subtotal - fee - tax;
    }

    const txtTotal = document.getElementById("txtTotal");
    if (txtTotal) txtTotal.textContent = "$ " + Math.round(total).toLocaleString();
    return total;
}

// Bind Calcs
["inpPrice", "inpQty", "inpFee", "inpTax"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", calculateTotal);
});
document.querySelectorAll("input[name='stockType']").forEach(el => {
    el.addEventListener("change", () => window.toggleType());
});

const btnCancel = document.getElementById("btnCancel");
const btnSave = document.getElementById("btnSave");

if (btnCancel) btnCancel.addEventListener("click", () => switchView("viewDashboard"));

if (btnSave) btnSave.addEventListener("click", async () => {
    const typeEl = document.querySelector("input[name='stockType']:checked");
    const isBuy = typeEl ? typeEl.value === 'buy' : true;

    const date = document.getElementById("inpDate").value;
    const symbol = document.getElementById("inpSymbol").value.trim();
    const name = document.getElementById("inpName").value.trim();
    const price = Number(document.getElementById("inpPrice").value);
    const qty = Number(document.getElementById("inpQty").value);
    const fee = Number(document.getElementById("inpFee").value) || 0;
    const tax = Number(document.getElementById("inpTax").value) || 0;

    if (!symbol || !date || price <= 0 || qty <= 0) {
        alert("請填寫完整正確資料");
        return;
    }

    const total = calculateTotal();

    const payload = {
        action: "addStock",
        user_email: currentUser.email, // backend checks permission based on this
        type: isBuy ? "buy" : "sell",
        date,
        stock_symbol: symbol,
        stock_name: name,
        price,
        quantity: qty,
        fee,
        tax,
        total_amount: total
    };

    btnSave.textContent = "儲存中...";
    btnSave.disabled = true;

    try {
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

        if (result.status === "success") {
            stocksData = result.data;
            renderList(stocksData);
            calculateSummary(stocksData);
        } else {
            throw new Error(result.message || "Unknown error");
        }
    } catch (e) {
        console.error(e);
        // Special UI for Permission Error
        if (e.message.includes("Permission Denied")) {
            list.innerHTML = `
                <div style="text-align:center; padding: 40px;">
                    <div style="font-size:48px;">🚫</div>
                    <div style="font-weight:700; color:#EF4444; margin-top:16px;">權限不足</div>
                    <div style="opacity:0.7; font-size:14px; margin-top:8px;">您的 Email (${currentUser.email}) 不在許可名單中。</div>
                </div>
            `;
            // Also reset summary
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

    data.forEach(item => {
        const isBuy = item.type === 'buy';
        const typeLabel = isBuy ? "買入" : "賣出";
        const typeClass = isBuy ? "type-buy" : "type-sell";
        // Format strings
        const dateStr = item.date ? item.date.toString().substring(0, 10) : "";
        const amountStr = new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(item.total_amount);

        const card = document.createElement("div");
        card.className = "stock-card";
        card.innerHTML = `
            <div class="stock-info">
                <div class="stock-symbol">
                    ${item.stock_symbol} 
                    <span class="type-badge ${typeClass}">${typeLabel}</span>
                </div>
                <div class="stock-date">${dateStr}</div>
            </div>
            <div class="stock-amount">${amountStr}</div>
        `;
        list.appendChild(card);
    });
}

function calculateSummary(data) {
    let totalInvested = 0;

    data.forEach(item => {
        if (item.type === 'buy') {
            totalInvested += Number(item.total_amount);
        } else {
            totalInvested -= Number(item.total_amount);
        }
    });

    const cardTitle = document.querySelector("#viewDashboard div[style*='background'] div[style*='font-size: 32px']");
    if (cardTitle) {
        cardTitle.textContent = new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(totalInvested);
    }
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
