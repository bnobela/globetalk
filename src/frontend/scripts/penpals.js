import { auth, logout } from '../../services/firebase.js';
import { onAuthStateChanged } from "firebase/auth";

const BACKEND_URL = "https://globetalk-matchmaking-api.onrender.com/api/match";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const penpalList = document.getElementById("penpalList");
const requestList = document.getElementById("requestList");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const logoutBtn = document.getElementById("logoutBtn");

let allPenpals = [];
let currentUid = null;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        } catch (err) {
            lastError = err;
            await delay(RETRY_DELAY * (i + 1));
        }
    }
    throw lastError;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderPenpals(penpals) {
    penpalList.innerHTML = '';
    if (!penpals || penpals.length === 0) {
        penpalList.innerHTML = '<span style="color:#666;">No penpals yet. Find and connect with someone!</span>';
        return;
    }
    penpals.forEach(p => {
        const user = (p.users || []).find(u => u.uid !== currentUid) || {};
        const card = document.createElement('div');
        card.className = 'penpal-card';
        card.innerHTML = `
            <h4>${escapeHtml(user.username || "Unknown")}</h4>
            <div class="penpal-info">

            </div>
            <button class="accept-btn" style="margin-top:0.5rem;" onclick="window.location.href='chats.html?targetUsername=${encodeURIComponent(user.username || '')}&targetUser=${encodeURIComponent(user.uid || '')}'">Chat</button>
        `;
        penpalList.appendChild(card);
    });
}

function renderRequests(requests, idToken) {
    requestList.innerHTML = '';
    if (!requests || requests.length === 0) {
        requestList.innerHTML = '<span style="color:#666;">No pending requests.</span>';
        return;
    }
    requests.forEach(r => {
        const fromUser = (r.users || []).find(u => u.uid === r.requestedBy) || {};
        const card = document.createElement('div');
        card.className = 'request-card';
        card.innerHTML = `
            <h4>${escapeHtml(fromUser.username || "Unknown")}</h4>
            <div class="request-info">

            </div>
            <div class="request-actions">
                <button class="accept-btn">Accept</button>
                <button class="decline-btn">Decline</button>
            </div>
        `;
        const [acceptBtn, declineBtn] = card.querySelectorAll('.accept-btn, .decline-btn');
        acceptBtn.onclick = async () => {
            acceptBtn.disabled = true;
            try {
                await fetchWithRetry(`${BACKEND_URL}/penpal/accept`, {
                    method: "POST", 
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${idToken}` 
                    },
                    body: JSON.stringify({ docId: r.id }) 
                });
                card.remove();
            } catch (err) {
                acceptBtn.disabled = false;
                alert("Failed to accept request.");
            }
        };
        declineBtn.onclick = async () => {
            declineBtn.disabled = true;
            try {
                await fetchWithRetry(`${BACKEND_URL}/penpal/decline`, {
                    method: "POST", 
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${idToken}` 
                    },
                    body: JSON.stringify({ docId: r.id }) 
                });
                card.remove();
            } catch (err) {
                declineBtn.disabled = false;
                alert("Failed to decline request.");
            }
        };
        requestList.appendChild(card);
    });
}

const sentListContainer = document.createElement('div');
sentListContainer.className = 'section';
sentListContainer.innerHTML = `
    <h3 class="section-title">Requests You Sent</h3>
    <div id="sentList" class="request-list">
        <span>Loading sent requests...</span>
    </div>
`;
document.querySelector('.main-content').appendChild(sentListContainer);
const sentList = document.getElementById("sentList");

function renderSentRequests(sentRequests) {
    sentList.innerHTML = '';
    if (!sentRequests || sentRequests.length === 0) {
        sentList.innerHTML = '<span style="color:#666;">No pending sent requests.</span>';
        return;
    }
    sentRequests.forEach(r => {
        const toUser = (r.users || []).find(u => u.uid === r.requestedTo) || {};
        const card = document.createElement('div');
        card.className = 'request-card';
        card.innerHTML = `
            <h4>${escapeHtml(toUser.username || "Unknown")}</h4>
            <div class="request-info">
                <p><strong>Status:</strong> ${escapeHtml(toUser.status || "pending")}</p>

            </div>

        `;
     
        sentList.appendChild(card);
    });
}

function filterPenpals(query) {
    query = query.trim().toLowerCase();
    if (!query) {
        renderPenpals(allPenpals);
        return;
    }
    const filtered = allPenpals.filter(p => {
        const user = (p.users || []).find(u => u.uid !== auth.currentUser?.uid) || {};
        return (user.username || "").toLowerCase().includes(query);
    });
    renderPenpals(filtered);
}

if (searchBtn && searchInput) {
    searchBtn.onclick = () => filterPenpals(searchInput.value);
    searchInput.onkeyup = e => {
        if (e.key === "Enter") filterPenpals(searchInput.value);
    };
}

if (logoutBtn) {
    logoutBtn.onclick = async () => {
        logoutBtn.disabled = true;
        logoutBtn.textContent = "Logging out...";
        await logout();
        window.location.href = "login.html";
    };
}

onAuthStateChanged(auth, async user => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    currentUid = user.uid;
    try {
        const idToken = await user.getIdToken();
        window._lastIdToken = idToken; // for use in decline/cancel

        // Fetch penpals
        penpalList.innerHTML = '<span>Loading penpals...</span>';
        const penpalRes = await fetchWithRetry(`${BACKEND_URL}/penpal/list`, {
            headers: { "Authorization": `Bearer ${idToken}` }
        });
        allPenpals = penpalRes.penpals || [];
        renderPenpals(allPenpals);

        // Fetch requests to you
        requestList.innerHTML = '<span>Loading requests...</span>';
        const reqRes = await fetchWithRetry(`${BACKEND_URL}/penpal/pending`, {
            headers: { "Authorization": `Bearer ${idToken}` }
        });
        renderRequests(reqRes.requests || [], idToken);

        // Fetch sent requests
        sentList.innerHTML = '<span>Loading sent requests...</span>';
        const sentRes = await fetchWithRetry(`${BACKEND_URL}/penpal/sent`, {
            headers: { "Authorization": `Bearer ${idToken}` }
        });
        renderSentRequests(sentRes.requests || []);

    } catch (err) {
        penpalList.innerHTML = '<span style="color:#d32f2f;">Failed to load penpals.</span>';
        requestList.innerHTML = '<span style="color:#d32f2f;">Failed to load requests.</span>';
        sentList.innerHTML = '<span style="color:#d32f2f;">Failed to load sent requests.</span>';
        console.error(err);
    }
});