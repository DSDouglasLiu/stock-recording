
// Configuration
const GOOGLE_CLIENT_ID = "368914333961-lk0vd7iurbpbuut1dqmrrl7qvo0ctrah.apps.googleusercontent.com";
// TODO: User will populate this after GAS deployment
const GAS_API_URL = "";

// DOM Elements
const btnAddStock = document.getElementById("btnAddStock");

// State
let currentUser = null;

// =========================================
// UI Logic
// =========================================

// View Routing
function switchView(viewId) {
    document.querySelectorAll(".page-view").forEach(el => el.classList.add("hidden"));
    document.getElementById(viewId).classList.remove("hidden");
}

if (btnAddStock) btnAddStock.addEventListener("click", () => {
    // Check Auth first
    if (!currentUser) {
        alert("請先登入");
        return;
    }
    // Go to Form (Placeholder)
    if (!GAS_API_URL) {
        alert("請先設定 Google Apps Script URL (後端)");
        return;
    }
    alert("新增功能開發中...");
});


// =========================================
// Google Auth Logic (GIS)
// =========================================
window.handleCredentialResponse = function (response) {
    // Decode JWT
    const responsePayload = decodeJwtResponse(response.credential);
    console.log("Logged in as: " + responsePayload.email);

    currentUser = responsePayload;
    // Store token for API calls
    currentUser.idToken = response.credential;

    updateUIForLogin();
}

function decodeJwtResponse(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
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

    // Load Data
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
        // Use Mock Data if no API
        setTimeout(() => {
            renderMockData();
        }, 1000);
        return;
    }

    // Real API Call (Future Implementation)
    /*
    try {
        const res = await fetch(`${GAS_API_URL}?action=getStocks&token=${currentUser.idToken}`);
        const data = await res.json();
        renderList(data);
    } catch(e) { ... }
    */
}

function renderMockData() {
    const list = document.getElementById("transactionList");
    list.innerHTML = "";

    // Mock Item
    const mockItem = document.createElement("div");
    mockItem.className = "stock-card";
    mockItem.innerHTML = `
        <div class="stock-info">
            <div class="stock-symbol">2330.TW <span class="type-badge type-buy">買入</span></div>
            <div class="stock-date">2026-02-01</div>
        </div>
        <div class="stock-amount">$ 100,000</div>
    `;
    list.appendChild(mockItem);

    const hint = document.createElement("div");
    hint.style.textAlign = "center";
    hint.style.marginTop = "20px";
    hint.style.fontSize = "12px";
    hint.style.color = "#ef4444";
    hint.textContent = "注意：尚未連接後端資料庫";
    list.appendChild(hint);
}

// Init
window.onload = function () {
    // Initialize Google Sign-In
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
    });

    google.accounts.id.renderButton(
        document.getElementById("g_id_signin"),
        { theme: "outline", size: "large", type: "standard", shape: "pill" }
    );

    // google.accounts.id.prompt(); // Optional One-Tap
}
