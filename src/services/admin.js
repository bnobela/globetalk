const API_BASE =  'https://globetalk-moderation-api.onrender.com/api/moderation/'; // Adjust if needed

async function apiRequest(endpoint, method = "GET", body = null, token = null) {
    const opts = {
        method,
        headers: { "Content-Type": "application/json" }
    };
    if (token) opts.headers["Authorization"] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${endpoint}`, opts);
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}

// Get total number of banned users
export async function getBannedUserCount(token) {
    const data = await apiRequest("/bannedUserCount", "GET", null, token);
    return data.count;
}

// Get total number of reported users
export async function getReportedUserCount(token) {
    const data = await apiRequest("/reportedUserCount", "GET", null, token);
    return data.count;
}

// Get unresolved reports
export async function getUnresolvedReports(token) {
    const data = await apiRequest("/unresolvedReports", "GET", null, token);
    return data.reports;
}

// Get resolved reports
export async function getResolvedReports(token) {
    const data = await apiRequest("/resolvedReports", "GET", null, token);
    return data.reports;
}

// Get all reports
export async function getAllReports(token) {
    const data = await apiRequest("/allReports", "GET", null, token);
    return data.reports;
}

// Get total number of active users
export async function getActiveUserCount(token) {
    const data = await apiRequest("/activeUserCount", "GET", null, token);
    return data.count;
}

// Ban a user
export async function banUser(reportedUid, reporterUid, reportID, report, reason, reportedDate, adminId, token) {
    const body = { reportedUid, reporterUid, reportID, report, reason, reportedDate, adminId };
    const data = await apiRequest("/banUser", "POST", body, token);
    return data;
}

// Unban a user
export async function unbanUser(userId, unbannedBy = null, token) {
    const body = { userId, unbannedBy };
    const data = await apiRequest("/unbanUser", "POST", body, token);
    return data;
}

// Dismiss a report
export async function dissmissReport(reportId, reason, adminId, token) {
    const body = { reportId, reason, adminId };
    const data = await apiRequest("/dismissReport", "POST", body, token);
    return data;
}

// Get all banned users
export async function getBannedUsers(token) {
    const data = await apiRequest("/bannedUsers", "GET", null, token);
    return data.users;
}

// Check if user is banned
export async function isBannedUser(userId, token) {
    const data = await apiRequest(`/isBanned/${encodeURIComponent(userId)}`, "GET", null, token);
    return data.banned;
}

// Check if user is admin
export async function isAdmin(userId, token) {
    const data = await apiRequest(`/isAdmin/${encodeURIComponent(userId)}`, "GET", null, token);
    return data.isAdmin;
}

// Get admin info
export async function getAdminInfo(userId, token) {
    const data = await apiRequest(`/getAdminInfo/${encodeURIComponent(userId)}`, "GET", null, token);
    return data.admin;
}