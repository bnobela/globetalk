import { signInWithGoogle, observeUser } from "@services/firebase.js";
import { isBannedUser, isAdmin } from "@services/admin.js"; 

// Constants and Configuration
const CONFIG = {
  AUTH_API_URL: 'https://globetalk-auth-api.onrender.com/',
  MODERATION_API_URL: 'https://globetalk-moderation-api.onrender.com/api/moderation/',
  PAGES: {
    LOGIN: './login.html',
    DASHBOARD: './userdashboard.html',
    ONBOARDING: './onboarding.html',
    ADMIN_DASHBOARD: './admin.html' 
  },
  STORAGE_KEYS: {
    ID_TOKEN: 'idToken',
    POLICIES_ACCEPTED: 'policiesAccepted',
    USER_PREFERENCES: 'userPreferences'
  },
  RETRY_CONFIG: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 1000,
    BACKOFF_MULTIPLIER: 2
  }
};

// Error handling with custom error types
class AuthError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.details = details;
  }
}

class NetworkError extends Error {
  constructor(message, status, details = {}) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
    this.details = details;
  }
}

// Utility functions (unchanged except for safeNavigate)
const utils = {
  setSecureToken(token, expirationHours = 1) {
    const expiration = Date.now() + (expirationHours * 60 * 60 * 1000);
    const tokenData = { token, expiration };
    localStorage.setItem(CONFIG.STORAGE_KEYS.ID_TOKEN, JSON.stringify(tokenData));
  },

  getSecureToken() {
    try {
      const tokenData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN));
      if (!tokenData || Date.now() > tokenData.expiration) {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.ID_TOKEN);
        return null;
      }
      return tokenData.token;
    } catch {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.ID_TOKEN);
      return null;
    }
  },

  sanitizeUserId(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new AuthError('Invalid user ID', 'INVALID_USER_ID');
    }
    return userId.trim();
  },

async safeNavigate(url, loadingElement = null) {
  try {
    if (!url) throw new Error('Navigation URL missing');

    if (loadingElement) loadingElement.style.display = 'block';

    // Let loaders render
    await new Promise(resolve => setTimeout(resolve, 150));

    // ✅ Relaxed navigation — accepts absolute, relative, or external URLs
    if (typeof url === 'string') {
      window.location.href = url;
    } else {
      console.warn('safeNavigate called with non-string URL:', url);
    }

  } catch (error) {
    console.error('Navigation error:', error);
    if (loadingElement) loadingElement.style.display = 'none';
    throw new Error(`Navigation failed: ${error.message}`);
  }
},


  retryOperation: async function retryOperation(operation, maxAttempts = CONFIG.RETRY_CONFIG.MAX_ATTEMPTS) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt}/${maxAttempts} failed:`, error.message);
        
        if (attempt < maxAttempts) {
          const delay = CONFIG.RETRY_CONFIG.DELAY_MS * Math.pow(CONFIG.RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

// User existence check 
async function checkIfUserExists(userId) {
  try {
    const sanitizedUserId = utils.sanitizeUserId(userId);
    
    return await utils.retryOperation(async () => {
      const token = utils.getSecureToken();
      if (!token) {
        throw new AuthError('No valid authentication token', 'NO_TOKEN');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(`${CONFIG.AUTH_API_URL}api/users/${sanitizedUserId}/exists`, {
          method: 'GET',
          creditentials: 'include',
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new NetworkError(
            `Server error: ${response.status}`, 
            response.status, 
            errorData
          );
        }

        const data = await response.json();
        
        if (typeof data.exists !== 'boolean') {
          throw new AuthError('Invalid server response format', 'INVALID_RESPONSE');
        }

        return data.exists;
      } finally {
        clearTimeout(timeoutId);
      }
    });

  } catch (error) {
    console.error("Error checking user existence:", error);
    
    if (error instanceof AuthError || error instanceof NetworkError) {
      throw error;
    }
    
    throw new AuthError('Failed to check user existence', 'USER_CHECK_FAILED', { originalError: error.message });
  }
}

// UI State Manager (unchanged)
class UIStateManager {
  constructor() {
    this.loadingStates = new Set();
  }

  setLoading(element, isLoading, message = 'Loading...') {
    if (isLoading) {
      this.loadingStates.add(element);
      element.disabled = true;
      element.dataset.originalText = element.textContent;
      element.textContent = message;
      element.classList.add('loading');
    } else {
      this.loadingStates.delete(element);
      element.disabled = false;
      element.textContent = element.dataset.originalText || element.textContent;
      element.classList.remove('loading');
    }
  }

  showMessage(message, type = 'info', duration = 5000) {
    let messageEl = document.getElementById('auth-message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'auth-message';
      messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        max-width: 300px;
        word-wrap: break-word;
      `;
      document.body.appendChild(messageEl);
    }

    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };

    messageEl.style.backgroundColor = colors[type] || colors.info;
    messageEl.textContent = message;
    messageEl.style.display = 'block';

    setTimeout(() => {
      if (messageEl) {
        messageEl.style.display = 'none';
      }
    }, duration);
  }
}

// Main application logic
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const privacyCheckbox = document.getElementById("privacy");
  const consentCheckbox = document.getElementById("consent");
  
  if (!loginBtn || !privacyCheckbox || !consentCheckbox) {
    console.error('Required DOM elements not found');
    return;
  }

  const uiManager = new UIStateManager();
  let authStateObserverActive = false;

  const updateButtonState = utils.debounce(() => {
    try {
      const returningUser = localStorage.getItem(CONFIG.STORAGE_KEYS.POLICIES_ACCEPTED) === "true";
      const currentlyAccepted = privacyCheckbox.checked && consentCheckbox.checked;
      
      loginBtn.disabled = !(returningUser || currentlyAccepted);
      
      if (loginBtn.disabled && !returningUser) {
        loginBtn.title = "Please accept both privacy policy and consent terms";
      } else {
        loginBtn.title = "Sign in with Google";
      }
    } catch (error) {
      console.error('Error updating button state:', error);
    }
  }, 100);

  updateButtonState();
  privacyCheckbox.addEventListener("change", updateButtonState);
  consentCheckbox.addEventListener("change", updateButtonState);

  // Google Login Flow
  loginBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    if (loginBtn.disabled) return;

    uiManager.setLoading(loginBtn, true, 'Signing in...');

    try {
      const policiesAccepted = privacyCheckbox.checked && consentCheckbox.checked;
      const storedPoliciesAccepted = localStorage.getItem(CONFIG.STORAGE_KEYS.POLICIES_ACCEPTED) === "true";
      
      if (!storedPoliciesAccepted && !policiesAccepted) {
        throw new AuthError('Please accept both privacy policy and consent terms', 'POLICIES_NOT_ACCEPTED');
      }

      const signInPromise = signInWithGoogle();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new AuthError('Sign-in timeout', 'SIGNIN_TIMEOUT')), 30000)
      );
      
      const { user } = await Promise.race([signInPromise, timeoutPromise]);
      if (!user || !user.uid) {
        throw new AuthError('Invalid user data received', 'INVALID_USER_DATA');
      }

      // Get token before calling admin.js functions
      const idToken = await utils.retryOperation(async () => {
        const token = await user.getIdToken(true);
        console.log("Obtained ID token for user:", token);
        if (!token) {
          throw new AuthError('Failed to get authentication token', 'TOKEN_FAILED');
        }
        return token;
      });

      // Check if user is banned
      const isBanned = await isBannedUser(user.uid, idToken); // <-- Pass token here!
      if (isBanned) {
        throw new AuthError('Your account is banned.', 'USER_BANNED');
      }

      utils.setSecureToken(idToken);
      localStorage.setItem(CONFIG.STORAGE_KEYS.POLICIES_ACCEPTED, "true");

      uiManager.showMessage(`Welcome, ${user.displayName}!`, 'success');
      uiManager.setLoading(loginBtn, true, 'Checking account...');

      // Check admin status
      const isAdminUser = await isAdmin(user.uid, idToken); // <-- Pass token here!
      const isExistingUser = await checkIfUserExists(user.uid);

      // Navigate based on user status
      if (isAdminUser) {
        console.log("[Login] Admin user, redirecting to admin dashboard");
        await utils.safeNavigate(CONFIG.PAGES.ADMIN_DASHBOARD);
      } else if (isExistingUser === true) {
        console.log("[Login] Existing user, redirecting to dashboard");
        await utils.safeNavigate(CONFIG.PAGES.DASHBOARD);
      } else if (isExistingUser === false) {
        console.log("[Login] New user, redirecting to onboarding");
        await utils.safeNavigate(CONFIG.PAGES.ONBOARDING);
      }

    } catch (error) {
      console.error("❌ Login failed:", error);
      
      let userMessage = "Login failed. Please try again.";
      
      if (error instanceof AuthError) {
        switch (error.code) {
          case 'POLICIES_NOT_ACCEPTED':
            userMessage = "Please accept both privacy policy and consent terms.";
            break;
          case 'SIGNIN_TIMEOUT':
            userMessage = "Sign-in timed out. Please check your connection and try again.";
            break;
          case 'NO_TOKEN':
            userMessage = "Authentication failed. Please refresh the page and try again.";
            break;
          case 'USER_BANNED':
            userMessage = "Your account has been banned. Please contact support.";
            break;
          default:
            userMessage = error.message || userMessage;
        }
      } else if (error instanceof NetworkError) {
        if (error.status >= 500) {
          userMessage = "Server error. Please try again later.";
        } else if (error.status === 401) {
          userMessage = "Authentication failed. Please refresh the page and try again.";
        } else {
          userMessage = "Network error. Please check your connection.";
        }
      }
      
      uiManager.showMessage(userMessage, 'error');
    } finally {
      uiManager.setLoading(loginBtn, false);
    }
  });

  loginBtn.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && !loginBtn.disabled) {
      e.preventDefault();
      loginBtn.click();
    }
  });

  // Auth state observer
  observeUser(async (user) => {
    if (authStateObserverActive) {
      console.log("[AuthState] Observer already active, skipping...");
      return;
    }
    
    authStateObserverActive = true;
    
    try {
      console.log("[AuthState] Auth state changed. User:", user ? user.email : "null");
      
      if (user) {
        if (!user.uid || !user.email) {
          throw new AuthError('Invalid user object received', 'INVALID_USER_OBJECT');
        }

        const idToken = await utils.retryOperation(async () => {
          return await user.getIdToken(true);
        });
        utils.setSecureToken(idToken);

        if (localStorage.getItem(CONFIG.STORAGE_KEYS.POLICIES_ACCEPTED) === "true") {
          // Check if user is banned
          const isBanned = await isBannedUser(user.uid, idToken); // <-- Pass token here!
          if (isBanned) {
            console.log("[AuthState] User is banned, redirecting to login");
            localStorage.removeItem(CONFIG.STORAGE_KEYS.ID_TOKEN);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.POLICIES_ACCEPTED);
            uiManager.showMessage("Your account has been banned. Please contact support.", 'error');
            await utils.safeNavigate(CONFIG.PAGES.LOGIN);
            return;
          }

          // Check admin status
          const isAdminUser = await isAdmin(user.uid, idToken); // <-- Pass token here!
          const exists = await checkIfUserExists(user.uid);
          console.log("[AuthState] User exists?", exists);
          
          if (isAdminUser) {
            alert("Admin login detected. Redirecting to admin dashboard.");
            console.log("[AuthState] Redirecting to admin dashboard");
            await utils.safeNavigate(CONFIG.PAGES.ADMIN_DASHBOARD);
          } else if (exists === true) {
            console.log("[AuthState] Redirecting to dashboard");
            await utils.safeNavigate(CONFIG.PAGES.DASHBOARD);
          } else if (exists === false) {
            console.log("[AuthState] Redirecting to onboarding");
            await utils.safeNavigate(CONFIG.PAGES.ONBOARDING);
          }
        }
      } else {
        console.log("🚪 Not logged in");
        localStorage.removeItem(CONFIG.STORAGE_KEYS.ID_TOKEN);
        
        if (!window.location.pathname.endsWith("login.html")) {
          console.log("Redirecting to login page");
          await utils.safeNavigate(CONFIG.PAGES.LOGIN);
        }
      }
    } catch (error) {
      console.error("[AuthState] Error in auth state observer:", error);
      
      if (error instanceof AuthError && error.code === 'NAVIGATION_ERROR') {
        uiManager.showMessage("Navigation error. Please refresh the page.", 'error');
      } else if (error instanceof AuthError && error.code === 'USER_BANNED') {
        uiManager.showMessage("Your account has been banned. Please contact support.", 'error');
        await utils.safeNavigate(CONFIG.PAGES.LOGIN);
      }
    } finally {
      authStateObserverActive = false;
    }
  });

  window.addEventListener('beforeunload', () => {
    authStateObserverActive = false;
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (event.reason instanceof AuthError || event.reason instanceof NetworkError) {
      uiManager.showMessage('An unexpected error occurred. Please refresh the page.', 'error');
    }
  });
});