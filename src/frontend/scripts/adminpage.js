import {
  getActiveUserCount,
  getReportedUserCount,
  getBannedUserCount,
  getUnresolvedReports,
  getResolvedReports,
  getBannedUsers,
  banUser,
  unbanUser,
  dissmissReport
} from "/src/services/admin.js";
import { onAuthStateChanged } from "firebase/auth";
import { auth, logout } from "/src/services/firebase.js";

// --- Constants ---
const CONFIG = {
  DEBOUNCE_DELAY: 300,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  MODAL_Z_INDEX: 9999,
  LOADING_TIMEOUT: 10000,
  DATE_FORMAT: {
    timeZone: "Africa/Johannesburg",
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
};

const STATES = {
  LOADING: 'loading',
  ERROR: 'error',
  SUCCESS: 'success',
  IDLE: 'idle'
};

// --- State Management ---
class AdminDashboardState {
  constructor() {
    this.currentView = 'unresolved';
    this.isLoading = false;
    this.error = null;
    this.counts = { active: 0, reported: 0, banned: 0 };
    this.reports = [];
    this.bannedUsers = [];
    this.listeners = new Map();
  }

  setState(key, value) {
    this[key] = value;
    this.notifyListeners(key, value);
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
  }

  unsubscribe(key, callback) {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  notifyListeners(key, value) {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          console.error(`Error in listener for ${key}:`, error);
        }
      });
    }
  }
}

const appState = new AdminDashboardState();

// --- Utilities ---
class Logger {
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logData = data ? { message, data, timestamp } : { message, timestamp };
    
    switch (level) {
      case 'error':
        console.error(`[${timestamp}] ERROR:`, logData);
        break;
      case 'warn':
        console.warn(`[${timestamp}] WARN:`, logData);
        break;
      case 'info':
        console.info(`[${timestamp}] INFO:`, logData);
        break;
      default:
        console.log(`[${timestamp}] LOG:`, logData);
    }
  }

  static error(message, data) { this.log('error', message, data); }
  static warn(message, data) { this.log('warn', message, data); }
  static info(message, data) { this.log('info', message, data); }
}

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

async function retryOperation(operation, maxRetries = CONFIG.MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      Logger.warn(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = CONFIG.RETRY_DELAY * attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/<[^>]*>/g, '');
}

function validateUserId(userId) {
  return userId && typeof userId === 'string' && userId.trim().length > 0;
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// --- Error Handling ---
class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

function handleError(error, context = 'Unknown') {
  Logger.error(`Error in ${context}:`, {
    message: error.message,
    stack: error.stack,
    code: error.code || 'UNKNOWN'
  });

  // Show user-friendly error message
  const userMessage = getUserFriendlyErrorMessage(error);
  showNotification(userMessage, 'error');
}

function getUserFriendlyErrorMessage(error) {
  const errorMessages = {
    'PERMISSION_DENIED': 'You do not have permission to perform this action.',
    'NETWORK_ERROR': 'Network connection failed. Please check your internet connection.',
    'TIMEOUT': 'Operation timed out. Please try again.',
    'VALIDATION_ERROR': 'Invalid input provided. Please check your data.',
    'USER_NOT_FOUND': 'User not found.',
    'ALREADY_BANNED': 'User is already banned.',
    'BAN_FAILED': 'Failed to ban user. Please try again.',
    'UNBAN_FAILED': 'Failed to unban user. Please try again.'
  };

  return errorMessages[error.code] || 'An unexpected error occurred. Please try again.';
}

// --- UI Components ---
function showNotification(message, type = 'info', duration = 5000) {
  // Remove existing notifications
  const existing = document.querySelectorAll('.notification');
  existing.forEach(el => el.remove());

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: ${CONFIG.MODAL_Z_INDEX + 1};
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;

  const colors = {
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196f3'
  };

  notification.style.background = colors[type] || colors.info;
  notification.textContent = message;

  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 10);

  // Auto remove
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }
  }, duration);

  // Click to dismiss
  notification.addEventListener('click', () => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  });
}

function showLoadingSpinner(container, message = 'Loading...') {
  if (!container) return;
  
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;padding:3rem;color:#666;">
      <div style="
        width:40px;
        height:40px;
        border:4px solid #e0e0e0;
        border-top:4px solid #2196f3;
        border-radius:50%;
        animation:spin 1s linear infinite;
        margin-bottom:1rem;
      "></div>
      <div>${message}</div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </div>
  `;
}

// --- Date Formatting ---
function formatDate(timestamp) {
  if (!timestamp) return "Unknown";
  
  try {
    let date;
    
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return "Invalid Date";
    }

    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    return date.toLocaleString("en-GB", CONFIG.DATE_FORMAT);
  } catch (error) {
    Logger.error('Date formatting error:', error);
    return "Format Error";
  }
}

// --- Admin Operations ---
async function getAdminCounts(idToken) {
  try {
    appState.setState('isLoading', true);

    const [active, reported, banned] = await Promise.allSettled([
      retryOperation(() => getActiveUserCount(idToken)),
      retryOperation(() => getReportedUserCount(idToken)),
      retryOperation(() => getBannedUserCount(idToken))
    ]);

    const counts = {
      active: active.status === 'fulfilled' ? active.value : 0,
      reported: reported.status === 'fulfilled' ? reported.value : 0,
      banned: banned.status === 'fulfilled' ? banned.value : 0
    };

    // Log any failures
    if (active.status === 'rejected') Logger.error('Failed to get active user count:', active.reason);
    if (reported.status === 'rejected') Logger.error('Failed to get reported user count:', reported.reason);
    if (banned.status === 'rejected') Logger.error('Failed to get banned user count:', banned.reason);

    appState.setState('counts', counts);
    return counts;
  } catch (error) {
    throw new AppError('Failed to load admin counts', 'COUNTS_LOAD_FAILED', error);
  } finally {
    appState.setState('isLoading', false);
  }
}

async function performBanUser(userId, reporterUid, reportId, report, reason, reportedDate, idToken) {
  if (!validateUserId(userId)) {
    throw new AppError('Invalid user ID', 'VALIDATION_ERROR');
  }

  const sanitizedReason = sanitizeInput(reason);
  if (!sanitizedReason) {
    throw new AppError('Ban reason is required', 'VALIDATION_ERROR');
  }

  try {
    let lastError;
    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      try {
        const adminId = (auth.currentUser && auth.currentUser.uid) || null;
        const result = await banUser(userId, reporterUid, reportId, report, sanitizedReason, reportedDate, adminId, idToken);
        if (result && result.success) {
          Logger.info('User banned successfully:', { userId, reportId });
          showNotification(`User ${userId} has been banned successfully.`, 'success');
          return result;
        } else if (result && result.error === "User is already banned.") {
          showNotification("User is already banned.", "warning");
          Logger.warn("User is already banned.", result);
          return result;
        } else {
          throw new AppError(result?.error || 'Ban operation failed', 'BAN_FAILED');
        }
      } catch (error) {
        lastError = error;
        // Stop retrying if already banned
        if (error?.message?.includes("already banned")) {
          showNotification("User is already banned.", "warning");
          Logger.warn("User is already banned.", error);
          return { success: false, error: "User is already banned." };
        }
        Logger.warn(`Attempt ${attempt} failed:`, error.message);
        if (attempt < CONFIG.MAX_RETRIES) {
          const delay = CONFIG.RETRY_DELAY * attempt;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  } catch (error) {
    Logger.error('Ban user error:', { userId, error });
    throw new AppError('Failed to ban user', 'BAN_FAILED', error);
  }
}

async function performUnbanUser(userId, idToken) {
  if (!validateUserId(userId)) {
    throw new AppError('Invalid user ID', 'VALIDATION_ERROR');
  }

  try {
    const result = await retryOperation(async () => {
      return await unbanUser(userId, null, idToken);
    });

    if (!result || !result.success) {
      throw new AppError('Unban operation failed', 'UNBAN_FAILED');
    }

    Logger.info('User unbanned successfully:', { userId });
    showNotification(`User ${userId} has been unbanned successfully.`, 'success');

    return result;
  } catch (error) {
    Logger.error('Unban user error:', { userId, error });
    throw new AppError('Failed to unban user', 'UNBAN_FAILED', error);
  }
}

async function performDissmissReport(reportId, reason, idToken) {
  if (!validateUserId(reportId)) {
    throw new AppError('Invalid report ID', 'VALIDATION_ERROR');
  }
  const sanitizedReason = sanitizeInput(reason);
  if (!sanitizedReason) {
    throw new AppError('Dismiss reason is required', 'VALIDATION_ERROR');
  }
  try {
    const adminId = (auth.currentUser && auth.currentUser.uid) || null;
    const result = await retryOperation(async () => {
      return await dissmissReport(reportId, sanitizedReason, adminId, idToken); // <-- Pass idToken here!
    });
    if (!result || !result.success) {
      throw new AppError('Dismiss operation failed', 'DISMISS_FAILED');
    }
    Logger.info('Report dismissed successfully:', { reportId });
    return result;
  } catch (error) {
    Logger.error('Dismiss report error:', { reportId, error });
    throw new AppError('Failed to dismiss report', 'DISMISS_FAILED', error);
  }
}

// --- Reports Rendering ---
async function renderReports(type, idToken) {
  const container = document.getElementById("reportedUsersList");
  if (!container) {
    Logger.error('Reports container not found');
    return;
  }

  showLoadingSpinner(container, `Loading ${type} reports...`);

  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new AppError('Request timed out', 'TIMEOUT')), CONFIG.LOADING_TIMEOUT)
    );

    const reportPromise = type === "unresolved"
      ? getUnresolvedReports(idToken)
      : getResolvedReports(idToken);

    const reports = await Promise.race([reportPromise, timeout]);

    if (!reports || reports.empty) {
      container.innerHTML = `
        <div style="padding:3rem;text-align:center;color:#666;">
          <div style="font-size:1.2rem;margin-bottom:0.5rem;">No ${type} reports found</div>
          <div style="font-size:0.9rem;">All clear! 🎉</div>
        </div>
      `;
      return;
    }

    container.innerHTML = "";
    
    // Sort reports by date (newest first)
    reports.sort((a, b) => {
      const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
      const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
      return timeB - timeA;
    });

    reports.forEach((data) => {
      const reportID = data.id;
      const reportedUid = data.reportedUid || 'Unknown User';
      const reporterUid = data.reporterUid || "Unknown Reporter";
      const reportedUsername = data.reportedUsername || reportedUid;
      const reporterUsername = data.reporterUsername || reporterUid;
      const report = data.reason || data.report || 'No reason provided';
      const flaggedMessage = data.flaggedMessage || '';
      const dateStr = formatDate(data.timestamp);

      // New card style for both unresolved and resolved reports
      const card = document.createElement('div');
      card.className = 'content-item';
      card.style.background = 'linear-gradient(135deg, #232a3b 0%, #2b3a55 100%)';
      card.style.border = '2px solid #4a90e2';
      card.style.borderRadius = '18px';
      card.style.boxShadow = '0 4px 24px rgba(74,144,226,0.12)';
      card.style.padding = '2rem 2.5rem';
      card.style.marginBottom = '0';

      const flex = document.createElement('div');
      flex.style.display = 'flex';
      flex.style.alignItems = 'center';
      flex.style.gap = '2rem';

      // User info
      const info = document.createElement('div');
      info.style.flex = '1';

      // --- Reported User ---
      const reportedUserBlock = document.createElement('div');
      reportedUserBlock.style.marginBottom = '0.3rem';
      reportedUserBlock.innerHTML = `
        <div style="font-size:1.1rem;color:#fff;font-weight:600;">
          ${reportedUsername !== reportedUid ? `${sanitizeInput(reportedUsername)}<br><span style="font-size:0.95rem;color:#b0b0b0;">${sanitizeInput(reportedUid)}</span>` : sanitizeInput(reportedUid)}
        </div>
      `;
      info.appendChild(reportedUserBlock);

      // --- Reporter User ---
      const reporterUserBlock = document.createElement('div');
      reporterUserBlock.style.marginBottom = '0.3rem';
      reporterUserBlock.innerHTML = `
        <div style="font-size:1.05rem;color:#b0b0b0;">
          Reported By: ${reporterUsername !== reporterUid ? `${sanitizeInput(reporterUsername)}<br><span style="font-size:0.95rem;color:#b0b0b0;">${sanitizeInput(reporterUid)}</span>` : sanitizeInput(reporterUid)}
        </div>
      `;
      info.appendChild(reporterUserBlock);

      // --- Date ---
      const date = document.createElement('div');
      date.style.fontSize = '1rem';
      date.style.color = '#4a90e2';
      date.style.marginTop = '0.5rem';
      date.textContent = `Date: ${dateStr}`;
      info.appendChild(date);

      const reportLabel = document.createElement('div');
      reportLabel.style.fontWeight = '500';
      reportLabel.style.color = '#fff';
      reportLabel.style.margin = '0.7rem 0 0.3rem 0';
      reportLabel.textContent = 'Report:';

      const reportContent = document.createElement('div');
      reportContent.style.color = '#b0b0b0';
      reportContent.style.lineHeight = '1.4';
      reportContent.style.background = 'rgba(74,144,226,0.08)';
      reportContent.style.padding = '0.75rem';
      reportContent.style.borderRadius = '8px';
      reportContent.style.wordBreak = 'break-word';
      reportContent.textContent = sanitizeInput(report);

      info.appendChild(reportLabel);
      info.appendChild(reportContent);

      // --- Show flagged message if present ---
      if (flaggedMessage) {
        const flaggedLabel = document.createElement('div');
        flaggedLabel.style.fontWeight = '500';
        flaggedLabel.style.color = '#fff';
        flaggedLabel.style.margin = '0.7rem 0 0.3rem 0';
        flaggedLabel.textContent = 'Flagged Message:';

        const flaggedContent = document.createElement('div');
        flaggedContent.style.color = '#f44336';
        flaggedContent.style.lineHeight = '1.4';
        flaggedContent.style.background = 'rgba(244,67,54,0.08)';
        flaggedContent.style.padding = '0.75rem';
        flaggedContent.style.borderRadius = '8px';
        flaggedContent.style.wordBreak = 'break-word';
        flaggedContent.textContent = sanitizeInput(flaggedMessage);

        info.appendChild(flaggedLabel);
        info.appendChild(flaggedContent);
      }

      // Resolved details
      if (type === 'resolved') {
        const outcome = document.createElement('div');
        outcome.style.marginTop = '0.5rem';
        outcome.style.fontSize = '1rem';
        outcome.style.color = '#4a90e2';
        outcome.innerHTML = `<strong>Outcome:</strong> ${sanitizeInput(data.outcome || 'N/A')}`;
        info.appendChild(outcome);

        const outcomeReason = document.createElement('div');
        outcomeReason.style.marginTop = '0.5rem';
        outcomeReason.style.fontSize = '1rem';
        outcomeReason.style.color = '#b0b0b0';
        outcomeReason.innerHTML = `<strong>Outcome Reason:</strong> ${sanitizeInput(data.outcomeReason || 'N/A')}`;
        info.appendChild(outcomeReason);

        const resolvedBy = document.createElement('div');
        resolvedBy.style.marginTop = '0.5rem';
        resolvedBy.style.fontSize = '1rem';
        resolvedBy.style.color = '#b0b0b0';
        resolvedBy.innerHTML = `<strong>Resolved By:</strong> ${sanitizeInput(data.resolvedBy || 'N/A')}`;
        info.appendChild(resolvedBy);

        const resolvedAt = document.createElement('div');
        resolvedAt.style.marginTop = '0.5rem';
        resolvedAt.style.fontSize = '1rem';
        resolvedAt.style.color = '#b0b0b0';
        resolvedAt.innerHTML = `<strong>Resolved At:</strong> ${formatDate(data.resolvedAt)}`;
        info.appendChild(resolvedAt);
      }

      flex.appendChild(info);

      // Manage button (only for unresolved)
      if (type === 'unresolved') {
        const manageBtn = document.createElement('button');
        manageBtn.className = 'manage-user-btn';
        manageBtn.style.background = 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)';
        manageBtn.style.color = '#fff';
        manageBtn.style.fontWeight = '600';
        manageBtn.style.border = 'none';
        manageBtn.style.borderRadius = '10px';
        manageBtn.style.padding = '0.8rem 2rem';
        manageBtn.style.fontSize = '1rem';
        manageBtn.textContent = 'Manage';
        manageBtn.addEventListener('click', () => {
          createUserModal(
            {
              userid: reportedUid,
              username: reportedUsername,
              dateStr,
              report,
              reportID,
              flaggedMessage,
              reporterUid,
              reporterUsername
            },
            async (reason) => {
              try {
                const idToken = await auth.currentUser.getIdToken();
                await performBanUser(reportedUid, reporterUid, reportID, report, reason, dateStr, idToken);
                await renderReports('unresolved', idToken);
                await getAdminCounts(idToken);
                updateCountsDisplay();
              } catch (error) {
                throw error;
              }
            }
          );
        });
        flex.appendChild(manageBtn);
      }

      card.appendChild(flex);
      container.appendChild(card);
    });

    Logger.info(`Loaded ${reports.length} ${type} reports`);

  } catch (error) {
    Logger.error(`Error loading ${type} reports:`, error);
    container.innerHTML = `
      <div style="padding:3rem;text-align:center;">
        <div style="color:#d32f2f;font-size:1.2rem;margin-bottom:1rem;">⚠️ Error Loading Reports</div>
        <div style="color:#666;margin-bottom:2rem;">${getUserFriendlyErrorMessage(error)}</div>
        <button id="retryBtn" style="
          background:#2196f3;
          color:#fff;
          border:none;
          padding:0.75rem 2rem;
          border-radius:8px;
          font-size:1rem;
          cursor:pointer;
          transition:background 0.2s;
        ">
          Try Again
        </button>
      </div>
    `;

    const retryBtn = container.querySelector('#retryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => renderReports(type));
      retryBtn.addEventListener('mouseenter', () => {
        retryBtn.style.background = '#1976d2';
      });
      retryBtn.addEventListener('mouseleave', () => {
        retryBtn.style.background = '#2196f3';
      });
    }
  }
}

// --- Count Updates ---
function updateCountsDisplay() {
  const counts = appState.counts;
  const activeCount = document.getElementById("activeUsersCount");
  const reportedCount = document.getElementById("reportedUsersCount");
  const bannedCount = document.getElementById("bannedUsersCount");

  if (activeCount) {
    activeCount.textContent = counts.active.toLocaleString();
    activeCount.setAttribute('aria-label', `${counts.active} active users`);
  }
  if (reportedCount) {
    reportedCount.textContent = counts.reported.toLocaleString();
    reportedCount.setAttribute('aria-label', `${counts.reported} reported users`);
  }
  if (bannedCount) {
    bannedCount.textContent = counts.banned.toLocaleString();
    bannedCount.setAttribute('aria-label', `${counts.banned} banned users`);
  }
}

// --- Initialization ---
async function initializeDashboard(user) {
  try {
    Logger.info('Initializing admin dashboard for user:', user.uid);

    const idToken = await user.getIdToken();

    // Set up toggle container
    const toggleContainer = document.getElementById("toggleContainer");
    if (toggleContainer) {
      toggleContainer.innerHTML = '';
      toggleContainer.appendChild(createToggleContainer(idToken));
    }

    // Load initial data
    showLoadingSpinner(document.getElementById("reportedUsersList"), "Loading dashboard...");

    const [counts] = await Promise.allSettled([
      getAdminCounts(idToken)
    ]);

    if (counts.status === 'fulfilled') {
      updateCountsDisplay();
    } else {
      Logger.error('Failed to load counts:', counts.reason);
      showNotification('Failed to load some dashboard data', 'warning');
    }

    // Load initial reports
    await renderReports("unresolved", idToken);

    // Set up banned users modal trigger
    setupBannedUsersModal(idToken);

    Logger.info('Dashboard initialized successfully');

  } catch (error) {
    Logger.error('Dashboard initialization error:', error);
    handleError(error, 'Dashboard Initialization');
    
    // Show fallback UI
    const container = document.getElementById("reportedUsersList");
    if (container) {
      container.innerHTML = `
        <div style="padding:3rem;text-align:center;">
          <div style="color:#d32f2f;font-size:1.5rem;margin-bottom:1rem;">⚠️ Dashboard Error</div>
          <div style="color:#666;margin-bottom:2rem;">Failed to initialize the admin dashboard. Please refresh the page or contact support.</div>
          <button onclick="location.reload()" style="
            background:#2196f3;
            color:#fff;
            border:none;
            padding:1rem 2rem;
            border-radius:8px;
            font-size:1.1rem;
            cursor:pointer;
          ">
            Refresh Page
          </button>
        </div>
      `;
    }
  }
}

function createToggleContainer(idToken) {
  const container = document.createElement("div");
  container.className = "toggle-container";
  container.setAttribute('role', 'tablist');
  container.style.cssText = `
    display: flex;
    gap: 1.5rem;
    margin-bottom: 2.5rem;
    justify-content: center;
    align-items: center;
  `;

  const buttons = [
    { text: "Unresolved Reports", type: "unresolved", active: true },
    { text: "Resolved Reports", type: "resolved", active: false }
  ];

  const buttonElements = buttons.map(({ text, type, active }) => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.className = `toggle-btn ${active ? 'active' : ''}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', active.toString());
    btn.setAttribute('data-type', type);
    btn.style.cssText = `
      background: ${active ? 'var(--globetalk-card-blue)' : '#e0e0e0'};
      color: ${active ? '#fff' : '#333'};
      border: ${active ? '3px solid #4a90e2' : '2px solid #e0e0e0'};
      box-shadow: ${active ? '0 0 12px 2px #4a90e2' : 'none'};
      padding: 1rem 2.5rem;
      border-radius: 20px;
      font-size: 1.25rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
      position: relative;
    `;

    // Add checkmark icon for active
    if (active) {
      btn.innerHTML = `<span style="margin-right:8px;">✔️</span>${text}`;
    }

    // Add hover effects
    btn.addEventListener('mouseenter', () => {
      if (!btn.classList.contains('active')) {
        btn.style.background = '#d0d0d0';
      }
    });

    btn.addEventListener('mouseleave', () => {
      if (!btn.classList.contains('active')) {
        btn.style.background = '#e0e0e0';
      }
    });

    btn.addEventListener('focus', () => {
      btn.style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.5)';
    });

    btn.addEventListener('blur', () => {
      btn.style.boxShadow = btn.classList.contains('active') ? '0 0 12px 2px #4a90e2' : 'none';
    });

    return btn;
  });

  function setActive(activeBtn) {
    buttonElements.forEach(btn => {
      const isActive = btn === activeBtn;
      btn.style.background = isActive ? 'var(--globetalk-card-blue)' : '#e0e0e0';
      btn.style.color = isActive ? '#fff' : '#333';
      btn.style.border = isActive ? '3px solid #4a90e2' : '2px solid #e0e0e0';
      btn.style.boxShadow = isActive ? '0 0 12px 2px #4a90e2' : 'none';
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive.toString());
      btn.innerHTML = isActive ? `<span style="margin-right:8px;">✔️</span>${btn.textContent.replace('✔️', '').trim()}` : btn.textContent.replace('✔️', '').trim();
    });
  }

  buttonElements.forEach(btn => {
    btn.addEventListener("click", async () => {
      const type = btn.getAttribute('data-type');
      setActive(btn);
      appState.setState('currentView', type);
      const idToken = await auth.currentUser.getIdToken();
      await renderReports(type, idToken);
    });

    // Keyboard navigation
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });

  buttonElements.forEach(btn => container.appendChild(btn));
  return container;
}

function setupBannedUsersModal(idToken) {
  const bannedCount = document.getElementById("bannedUsersCount");
  const bannedCard = bannedCount?.closest('.stat-card, [data-stat="banned"]') || bannedCount?.parentElement;

  if (bannedCard) {
    bannedCard.style.cursor = "pointer";
    bannedCard.style.transition = "transform 0.2s ease, box-shadow 0.2s ease";
    bannedCard.title = "Click to view all banned accounts";
    bannedCard.setAttribute('role', 'button');
    bannedCard.setAttribute('tabindex', '0');
    bannedCard.setAttribute('aria-label', 'View banned accounts');

    const handleClick = async () => {
      try {
        showLoadingSpinner({ innerHTML: '' }, 'Loading banned users...');
        const users = await retryOperation(() => getBannedUsers(idToken));
        showBannedUsersModal(users);
      } catch (error) {
        handleError(error, 'Load Banned Users');
      }
    };

    // Mouse events
    bannedCard.addEventListener("click", handleClick);
    
    bannedCard.addEventListener('mouseenter', () => {
      bannedCard.style.transform = 'translateY(-2px)';
      bannedCard.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    });

    bannedCard.addEventListener('mouseleave', () => {
      bannedCard.style.transform = 'translateY(0)';
      bannedCard.style.boxShadow = 'none';
    });

    // Keyboard events
    bannedCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    });

    bannedCard.addEventListener('focus', () => {
      bannedCard.style.outline = '2px solid #2196f3';
      bannedCard.style.outlineOffset = '2px';
    });

    bannedCard.addEventListener('blur', () => {
      bannedCard.style.outline = 'none';
      bannedCard.style.outlineOffset = 'initial';
    });
  }
}

// --- Modals ---
function createModal(id, content, options = {}) {
  const existingModal = document.getElementById(id);
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.id = id;
  modal.className = "modal";
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', `${id}-title`);
  
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(10, 20, 40, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: ${CONFIG.MODAL_Z_INDEX};
    opacity: 0;
    transition: opacity 0.3s ease;
    backdrop-filter: blur(6px) saturate(1.2);
  `;

  modal.innerHTML = content;
  document.body.appendChild(modal);

  // Animate in
  setTimeout(() => {
    modal.style.opacity = '1';
  }, 10);

  // Focus management
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  }

  // Escape key handling
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };

  const closeModal = () => {
    modal.style.opacity = '0';
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
    }, 300);
    document.removeEventListener('keydown', handleEscape);
  };

  // Event listeners
  document.addEventListener('keydown', handleEscape);
  
  if (!options.preventOutsideClick) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  return { modal, closeModal };
}

function showBannedUsersModal(bannedUsers) {
  const content = `
    <div style="background:linear-gradient(135deg, #232a3b 0%, #2b3a55 100%); border:3px solid #4a90e2; box-shadow:0 16px 48px 0 rgba(74,144,226,0.25), 0 2px 8px 0 rgba(0,0,0,0.18); padding:2.5rem 2rem; border-radius:28px; min-width:340px; max-width:95vw; max-height:80vh; display:flex; flex-direction:column;">
      <h2 id="bannedUsersModal-title" style="margin-bottom:1.5rem;font-size:2.2rem; color:#4a90e2; text-align:center; letter-spacing:0.5px;">Banned Accounts (${bannedUsers.length})</h2>
      <div style="flex:1;max-height:50vh;overflow-y:auto;margin-bottom:1.5rem;">
        ${bannedUsers.length === 0 ? 
          '<div style="text-align:center;padding:2rem;color:#b0b0b0;font-size:1.2rem;">No banned accounts found.</div>' :
          `<ul style="list-style:none;padding:0;margin:0;">
            ${bannedUsers.map(user => `
              <li style="margin-bottom:1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;padding:1.2rem 1rem;background:rgba(74,144,226,0.08);border:2px solid #4a90e2;border-radius:12px;">
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:600;word-break:break-all;color:#fff;font-size:1.1rem;">${sanitizeInput(user.email || user.id || 'Unknown User')}</div>
                  <div style="color:#4a90e2;font-size:0.98rem;margin-top:0.25rem;">Banned: ${formatDate(user.banDate)}</div>
                  ${user.banReason ? `<div style="color:#b0b0b0;font-size:0.95rem;margin-top:0.25rem;">Reason: ${sanitizeInput(user.banReason)}</div>` : ''}
                </div>
                <button class="unban-btn" data-id="${user.id}" style="background:linear-gradient(135deg,#4caf50 0%,#388e3c 100%);color:#fff;border:none;padding:0.85rem 1.7rem;border-radius:10px;font-size:1rem;cursor:pointer;white-space:nowrap;transition:background 0.2s;font-weight:600;">Unban</button>
              </li>
            `).join('')}
          </ul>`
        }
      </div>
      <button id="closeBannedModalBtn" style="background:linear-gradient(135deg,#f5f5f5 0%,#e0e0e0 100%);color:#333;border:1px solid #4a90e2;padding:1rem 2.2rem;border-radius:14px;font-size:1.15rem;cursor:pointer;transition:background 0.2s;font-weight:600;margin:0 auto;">Close</button>
    </div>
  `;

  const { modal, closeModal } = createModal('bannedUsersModal', content);

  // Unban button handlers
  modal.querySelectorAll(".unban-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.id;
      if (!validateUserId(userId)) {
        showNotification('Invalid user ID', 'error');
        return;
      }

      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Unbanning...';
      btn.style.background = '#ccc';

      try {
        const idToken = await auth.currentUser.getIdToken(); // <-- Get token here!
        await performUnbanUser(userId, idToken); // <-- Pass token here!
        
        // Remove the user from the list
        const listItem = btn.closest('li');
        if (listItem) {
          listItem.style.opacity = '0';
          setTimeout(() => listItem.remove(), 300);
        }

        // Update counts
        await getAdminCounts(idToken);
        updateCountsDisplay();
      } catch (error) {
        handleError(error, 'Unban User');
        btn.disabled = false;
        btn.textContent = originalText;
        btn.style.background = '#4caf50';
      }
    });

    // Hover effects
    btn.addEventListener('mouseenter', () => {
      if (!btn.disabled) {
        btn.style.background = '#45a049';
      }
    });

    btn.addEventListener('mouseleave', () => {
      if (!btn.disabled) {
        btn.style.background = '#4caf50';
      }
    });
  });

  // Close button
  const closeBtn = modal.querySelector('#closeBannedModalBtn');
  closeBtn.addEventListener('click', closeModal);
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = '#e0e0e0';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = '#f5f5f5';
  });
}

function createUserModal({ userid, username, dateStr, report, reportID, flaggedMessage, reporterUid, reporterUsername }, onBan) {
  const content = `
    <div style="background:linear-gradient(135deg, #232a3b 0%, #2b3a55 100%); border:3px solid #4a90e2; box-shadow:0 16px 48px 0 rgba(74,144,226,0.25), 0 2px 8px 0 rgba(0,0,0,0.18); padding:2.5rem 2rem; border-radius:28px; min-width:340px; max-width:95vw; display:flex; flex-direction:column;">
      <h2 id="manageUserModal-title" style="margin-bottom:1.5rem;font-size:2.2rem; color:#4a90e2; text-align:center; letter-spacing:0.5px;">Manage User</h2>
      <div style="margin-bottom:1rem;font-size:1.15rem;color:#fff;">
        <strong>Username:</strong>
        <span style="word-break:break-all;">
          ${username && username !== userid ? `${sanitizeInput(username)}<br><span style="font-size:0.98rem;color:#b0b0b0;">${sanitizeInput(userid)}</span>` : sanitizeInput(userid)}
        </span>
      </div>
      <div style="margin-bottom:1rem;font-size:1.1rem;color:#b0b0b0;">
        <strong>Date:</strong> ${sanitizeInput(dateStr)}
      </div>
      <div style="margin-bottom:2rem;font-size:1.1rem;">
        <strong>Report:</strong>
        <div style="background:rgba(74,144,226,0.08);padding:1rem;border-radius:8px;margin-top:0.5rem;word-break:break-word;color:#fff;">
          ${sanitizeInput(report)}
        </div>
      </div>
      ${flaggedMessage ? `
        <div style="margin-bottom:2rem;font-size:1.1rem;">
          <strong>Reported Message:</strong>
          <div style="background:rgba(244,67,54,0.08);padding:1rem;border-radius:8px;margin-top:0.5rem;word-break:break-word;color:#f44336;">
            ${sanitizeInput(flaggedMessage)}
          </div>
        </div>
      ` : ''}
      <div style="margin-bottom:2rem;">
        <label for="banReason" style="display:block;margin-bottom:0.5rem;font-weight:600;color:#4a90e2;">Ban/Dismiss Reason (required):</label>
        <textarea id="banReason" placeholder="Enter reason for banning this user..." style="width:100%;min-height:80px;padding:0.75rem;border:2px solid #4a90e2;border-radius:10px;resize:vertical;font-family:inherit;background:rgba(255,255,255,0.08);color:#fff;"></textarea>
      </div>
      <div style="display:flex;gap:1rem;flex-wrap:wrap;">
        <button id="banUserBtn" style="background:linear-gradient(135deg,#d32f2f 0%,#b71c1c 100%);color:#fff;border:none;padding:1rem 2.2rem;border-radius:14px;font-size:1.1rem;cursor:pointer;transition:background 0.2s;flex:1;min-width:120px;font-weight:600;">Ban User</button>
        <button id="dismissUserBtn" style="background:linear-gradient(135deg,#ff9800 0%,#ffb300 100%);color:#fff;border:none;padding:1rem 2.2rem;border-radius:14px;font-size:1.1rem;cursor:pointer;transition:background 0.2s;flex:1;min-width:120px;font-weight:600;">Dismiss Report</button>
        <button id="closeModalBtn" style="background:linear-gradient(135deg,#f5f5f5 0%,#e0e0e0 100%);color:#333;border:1px solid #4a90e2;padding:1rem 2.2rem;border-radius:14px;font-size:1.1rem;cursor:pointer;transition:background 0.2s;flex:1;min-width:120px;font-weight:600;">Cancel</button>
      </div>
    </div>
  `;

  const { modal, closeModal } = createModal('manageUserModal', content, { preventOutsideClick: true });

  const banReasonTextarea = modal.querySelector('#banReason');
  const banUserBtn = modal.querySelector('#banUserBtn');
  const dismissUserBtn = modal.querySelector('#dismissUserBtn');
  const closeBtn = modal.querySelector('#closeModalBtn');

  // Real-time validation
  banReasonTextarea.addEventListener('input', () => {
    const reason = banReasonTextarea.value.trim();
    banUserBtn.disabled = !reason;
    banUserBtn.style.background = reason ? '#d32f2f' : '#ccc';
    dismissUserBtn.disabled = !reason;
    dismissUserBtn.style.background = reason ? '#ff9800' : '#ccc';
  });

  // Initial validation
  banUserBtn.disabled = true;
  banUserBtn.style.background = '#ccc';
  dismissUserBtn.disabled = true;
  dismissUserBtn.style.background = '#ccc';

  // Ban user handler
  banUserBtn.addEventListener('click', async () => {
    const reason = sanitizeInput(banReasonTextarea.value);

    if (!reason) {
      showNotification('Please provide a reason for banning this user.', 'error');
      banReasonTextarea.focus();
      return;
    }

    const originalText = banUserBtn.textContent;
    banUserBtn.disabled = true;
    banUserBtn.textContent = 'Banning...';
    banUserBtn.style.background = '#ccc';

    try {
      const idToken = await auth.currentUser.getIdToken();
      await performBanUser(userid, reporterUid, reportID, report, reason, dateStr, idToken);
      closeModal();
      await renderReports('unresolved', idToken);
      await getAdminCounts(idToken);
      updateCountsDisplay();
    } catch (error) {
      handleError(error, 'Ban User');
      banUserBtn.disabled = false;
      banUserBtn.textContent = originalText;
      banUserBtn.style.background = '#d32f2f';
    }
  });

  // Dismiss report handler
  dismissUserBtn.addEventListener('click', async () => {
    const reason = sanitizeInput(banReasonTextarea.value);
    if (!reason) {
      showNotification('Please provide a reason for dismissing this report.', 'error');
      banReasonTextarea.focus();
      return;
    }
    const originalText = dismissUserBtn.textContent;
    dismissUserBtn.disabled = true;
    dismissUserBtn.textContent = 'Dismissing...';
    dismissUserBtn.style.background = '#ccc';
    try {
      const idToken = await auth.currentUser.getIdToken();
      await performDissmissReport(reportID, reason, idToken);
      showNotification('Report dismissed successfully.', 'success');
      closeModal();
      await renderReports('unresolved', idToken);
    } catch (error) {
      handleError(error, 'Dismiss Report');
      dismissUserBtn.disabled = false;
      dismissUserBtn.textContent = originalText;
      dismissUserBtn.style.background = '#ff9800';
    }
  });

  // Close handler
  closeBtn.addEventListener('click', closeModal);

  // Hover effects
  banUserBtn.addEventListener('mouseenter', () => {
    if (!banUserBtn.disabled) {
      banUserBtn.style.background = '#b71c1c';
    }
  });

  banUserBtn.addEventListener('mouseleave', () => {
    if (!banUserBtn.disabled) {
      banUserBtn.style.background = '#d32f2f';
    }
  });

  dismissUserBtn.addEventListener('mouseenter', () => {
    if (!dismissUserBtn.disabled) {
      dismissUserBtn.style.background = '#f57c00';
    }
  });
  dismissUserBtn.addEventListener('mouseleave', () => {
    if (!dismissUserBtn.disabled) {
      dismissUserBtn.style.background = '#ff9800';
    }
  });

  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = '#e0e0e0';
  });

  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = '#f5f5f5';
  });

  // Focus on textarea
  setTimeout(() => {
    banReasonTextarea.focus();
  }, 100);
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  Logger.info('DOM loaded, setting up admin dashboard');

  // Logout button logic
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await logout();
      } catch (error) {
        Logger.error('Logout error', error);
      } finally {
        window.location.href = "login.html";
      }
    });
  }

  // Set up authentication listener
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      Logger.warn('No authenticated user, redirecting to login');
      window.location.href = "login.html";
      return;
    }

    try {
      await initializeDashboard(user);
    } catch (error) {
      Logger.error('Authentication handler error:', error);
      handleError(error, 'Authentication');
    }
  });

  // Global error handler
  window.addEventListener('error', (event) => {
    Logger.error('Global error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    Logger.error('Unhandled promise rejection:', event.reason);
    event.preventDefault(); // Prevent default browser behavior
  });

  // Visibility change handler (refresh data when tab becomes visible)
  document.addEventListener('visibilitychange', debounce(async () => {
    if (!document.hidden && auth.currentUser) {
      try {
        Logger.info('Tab became visible, refreshing data');
        const idToken = await auth.currentUser.getIdToken(); // <-- Always get fresh token!
        await getAdminCounts(idToken);
        updateCountsDisplay();
        await renderReports(appState.currentView, idToken);
      } catch (error) {
        Logger.warn('Failed to refresh data on visibility change:', error);
      }
    }
  }, 1000));
});

// --- Cleanup ---
window.addEventListener('beforeunload', () => {
  // Clean up any listeners or ongoing operations
  appState.listeners.clear();
  Logger.info('Page unloading, cleanup completed');
});

// --- Export for testing (if needed) ---
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AppError,
    Logger,
    formatDate,
    sanitizeInput,
    validateUserId,
    validateEmail,
    performBanUser,
    performUnbanUser,
    AdminDashboardState
  };
}