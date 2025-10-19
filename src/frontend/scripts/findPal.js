import { auth} from '../../services/firebase.js';

const matchContainer = document.getElementById("matchContainer");
const sendRequestBtn = document.getElementById("sendRequestBtn");
let currentMatch = null;


// Configuration
const CONFIG = {
    API_TIMEOUT: 15000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    BACKEND_URL: 'https://binarybandits-matchapi.onrender.com/api/match',
    BACKEND_PROFILE_URL: 'https://binarybandits-profileapi.onrender.com/api/profile'
};

// Utility: Delay function for retries
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Utility: Fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = CONFIG.API_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please check your connection.');
        }
        throw error;
    }
}

// Utility: Retry logic
async function fetchWithRetry(url, options = {}, retries = CONFIG.MAX_RETRIES) {
    let lastError;
    
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetchWithTimeout(url, options);
            return response;
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${i + 1} failed:`, error.message);
            
            if (i < retries - 1) {
                await delay(CONFIG.RETRY_DELAY * Math.pow(2, i)); // Exponential backoff
            }
        }
    }
    
    throw lastError;
}

// Load languages with robust error handling
async function languageList() {
    const dropdown = document.getElementById("language");
    if (!dropdown) {
        console.error("Language dropdown not found");
        return;
    }
    
    dropdown.innerHTML = '<option value="">Loading languages...</option>';
    dropdown.disabled = true;
    
    try {
        const response = await fetchWithRetry(
            "https://api.languagetoolplus.com/v2/languages",
            {},
            2 // Fewer retries for initial load
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const languages = await response.json();
        
        // Validate response
        if (!Array.isArray(languages) || languages.length === 0) {
            throw new Error("Invalid language data received");
        }

        // Process languages
        const uniqueNames = new Set();
        languages.forEach(lang => {
            if (lang && lang.name && typeof lang.name === 'string') {
                uniqueNames.add(lang.name.split("(")[0].trim());
            }
        });
        
        if (uniqueNames.size === 0) {
            throw new Error("No valid languages found");
        }

        const sortedLanguages = Array.from(uniqueNames).sort();

        // Populate dropdown
        dropdown.innerHTML = '<option value="">-- Select Language --</option>';
        sortedLanguages.forEach(langName => {
            const option = document.createElement("option");
            option.textContent = langName;
            option.value = langName.toLowerCase().replace(/\s+/g, '-');
            dropdown.appendChild(option);
        });
        
        dropdown.disabled = false;
        
    } catch (error) {
        console.error("Error loading languages:", error);
        
        // Fallback to basic language list
        const fallbackLanguages = [
            'english', 'spanish', 'french', 'german', 'italian',
            'portuguese', 'chinese', 'japanese', 'korean', 'arabic'
        ];
        
        dropdown.innerHTML = '<option value="">-- Select Language --</option>';
        fallbackLanguages.forEach(langName => {
            const option = document.createElement("option");
            option.textContent = langName;
            option.value = langName.toLowerCase();
            dropdown.appendChild(option);
        });
        
        dropdown.disabled = false;
        showError('Languages loaded from cache. Some options may be limited.', 3000);
    }
}

// Setup logout with error handling

// Validate form inputs
function validateFormInputs(language, region) {
    const errors = [];
    
    if (!language || language.trim() === '') {
        errors.push('Please select a language');
    }
    
    if (!region || region.trim() === '') {
        errors.push('Please select a region');
    }
    
    return errors;
}

// Show error message
function showError(message, duration = 5000) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    if (errorMessage && errorText) {
        errorText.textContent = message;
        errorMessage.classList.add('show');
        
        if (duration > 0) {
            setTimeout(() => errorMessage.classList.remove('show'), duration);
        }
    }
}

// Show success message
function showSuccess(message, duration = 3000) {
    const successMessage = document.getElementById('successMessage');
    
    if (successMessage) {
        const textSpan = successMessage.querySelector('span:last-child');
        if (textSpan) textSpan.textContent = message;
        
        successMessage.classList.add('show');
        
        if (duration > 0) {
            setTimeout(() => successMessage.classList.remove('show'), duration);
        }
    }
}

// Setup form with comprehensive validation and error handling
function setupForm() {
    const form = document.getElementById('penpalForm');
    if (!form) {
        console.error("Form not found");
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');

    form.addEventListener('submit', async e => {
        e.preventDefault();

        // Clear previous messages
        successMessage?.classList.remove('show');
        errorMessage?.classList.remove('show');

        // Get form values with sanitization
        const language = form.language?.value?.trim() || '';
        const region = form.region?.value?.trim() || '';

        // Validate inputs
        const validationErrors = validateFormInputs(language, region);
        if (validationErrors.length > 0) {
            showError(validationErrors.join('. '));
            return;
        }

        // Disable form during submission
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<span class="loading-spinner"></span>Searching...';

        // Disable all form inputs
        const formInputs = form.querySelectorAll('select');
        formInputs.forEach(input => input.disabled = true);

        try {
            // Check authentication
            const user = auth.currentUser;
            if (!user) {
                throw new Error('You must be logged in to find a pen pal');
            }

            // Get ID token with timeout
            const idToken = await Promise.race([
                user.getIdToken(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Authentication timeout')), 5000)
                )
            ]);

            showSuccess('Searching for your perfect match...');

            // Make API request with retry logic
            const response = await fetchWithRetry(CONFIG.BACKEND_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`
                },
                body: JSON.stringify({ 
                    language: language.toLowerCase(), 
                    region,
                })
            });

            // Handle non-OK responses
            if (!response.ok) {
                let errorMessage = 'Matchmaking failed';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    errorMessage = `Server error (${response.status})`;
                }
                throw new Error(errorMessage);
            }

            // Parse response
            const data = await response.json();
            
            if (!data) {
                throw new Error('Invalid response from server');
            }

            // Handle match result
            if (data.match) {
                currentMatch = data.match;

                let profile = {
                    username: data.match.name || data.match.username || "Unknown",
                    bio: data.match.bio || "",
                    region: data.match.region || "N/A",
                    languages: Array.isArray(data.match.languages) ? data.match.languages : [],
                    hobbies: Array.isArray(data.match.hobbies) ? data.match.hobbies : []
                };

                // If profile data is missing/corrupted, fetch from profile API
                if (!profile.username || !profile.region || !profile.languages.length) {
                    try {
                        const profileResponse = await fetch(`${CONFIG.BACKEND_PROFILE_URL}/${data.match.id}`, {
                            method: "GET",
                            headers: {
                                "Authorization": `Bearer ${idToken}`
                            }
                        });
                        if (!profileResponse.ok) throw new Error("Could not fetch profile");
                        profile = await profileResponse.json();
                    } catch (profileErr) {
                        console.error("Error fetching matched profile:", profileErr);
                        showError("Could not load matched user's profile.");
                    }
                }

                // Show modal with match info and actions
                showMatchModal(profile);

                // Hide the old match container if needed
                matchContainer.style.display = "none";
                showSuccess(`You've been matched with ${profile.username || "a pen pal"}!`);
                formInputs.forEach(input => input.disabled = false);
            } else {
                showError('No matches found. Try adjusting your preferences or check back later!', 0);
                formInputs.forEach(input => input.disabled = false);
            }

        } catch (err) {
            console.error("Error finding pen pal:", err);
            
            // User-friendly error messages
            let userMessage = 'Something went wrong. Please try again.';
            
            if (err.message.includes('logged in')) {
                userMessage = 'Please log in to continue.';
                setTimeout(() => window.location.href = '../pages/login.html', 2000);
            } else if (err.message.includes('timeout') || err.message.includes('timed out')) {
                userMessage = 'Connection timeout. Please check your internet and try again.';
            } else if (err.message.includes('Network') || err.message.includes('Failed to fetch')) {
                userMessage = 'Network error. Please check your connection.';
            } else if (err.message) {
                userMessage = err.message;
            }
            
            showError(userMessage, 0);
            formInputs.forEach(input => input.disabled = false);
            
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    // Clear error on input change
    const formInputs = form.querySelectorAll('select');
    formInputs.forEach(input => {
        input.addEventListener('change', () => {
            errorMessage?.classList.remove('show');
        });
    });
}

// Utility to get or fetch and cache the user's profile data
async function getCurrentUserProfile(user) {
    // Try localStorage first
    let profile = null;
    try {
        const cached = localStorage.getItem("userProfile_" + user.uid);
        if (cached) {
            profile = JSON.parse(cached);
            // Only use if the user id matches
            if (profile && profile.username && profile.id === user.uid) return profile;
        }
    } catch (e) {
        // Ignore JSON parse errors
    }

    // If not found, fetch from profile API and cache it
    try {
        const idToken = await user.getIdToken();
        const response = await fetch(`${CONFIG.BACKEND_PROFILE_URL}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${idToken}`
            }
        });
        if (!response.ok) throw new Error("Could not fetch user profile");
        profile = await response.json();
        // Store with user id in key and in object
        profile.id = user.uid;
        localStorage.setItem("userProfile_" + user.uid, JSON.stringify(profile));
        return profile;
    } catch (err) {
        console.error("Error fetching user profile from API:", err);
        throw new Error("Could not fetch user profile");
    }
}

// Send Pen Pal Request button logic
if (sendRequestBtn) {
  sendRequestBtn.addEventListener("click", async () => {
    if (!currentMatch) return showError("No match selected.");

    const user = auth.currentUser;
    if (!user) return showError("You must be logged in.");

    try {
      const idToken = await user.getIdToken();
      // Get profile from localStorage or fetch and cache it
      const userProfile = await getCurrentUserProfile(user);

      const response = await fetchWithRetry(`${CONFIG.BACKEND_URL}/penpals/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          fromUsername: userProfile.username,
          toUid: currentMatch.id,
          toUsername: currentMatch.name || currentMatch.username || "Unknown"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to send request");
      }

      showSuccess(`Request sent to ${currentMatch.name || currentMatch.username || "your match"}!`);
      sendRequestBtn.disabled = true;
      sendRequestBtn.textContent = "Request Sent ✅";

    } catch (err) {
      console.error("Error sending request:", err);
      showError("Could not send request. Try again.");
    }
  });
}



// Check authentication status
function checkAuthStatus() {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            if (!user) {
                console.warn('User not authenticated');
                window.location.href = '../pages/login.html';
            }
            resolve(user);
        }, error => {
            console.error('Auth state error:', error);
            unsubscribe();
            resolve(null);
        });
    });
}

// Initialize application
async function initialize() {
    try {
        // Check authentication first
        await checkAuthStatus();
        
        // Initialize components
        await languageList();
    // ...existing code...
        setupForm();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

function showMatchModal(profile) {
    // Remove any existing modal
    const oldModal = document.getElementById("matchModal");
    if (oldModal) oldModal.remove();

    // Create modal container
    const modal = document.createElement("div");
    modal.id = "matchModal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100vw";
    modal.style.height = "100vh";
    modal.style.background = "rgba(0,0,0,0.5)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "9999";

    // Modal content using existing CSS classes
    modal.innerHTML = `
        <div class="form-section" style="max-width: 420px; width: 100%; position: relative; text-align: center;">
            <button id="closeModalBtn" style="
                position: absolute;
                top: 18px;
                right: 18px;
                background: none;
                border: none;
                font-size: 2rem;
                color: #667eea;
                cursor: pointer;
                line-height: 1;
            " aria-label="Close">&times;</button>
            <div class="form-title" style="justify-content: center; margin-bottom: 1.2rem;">
                <span style="font-size:2rem;">🎉</span> You've been matched!
            </div>
            <div style="margin-bottom: 1.5rem; font-size: 1.08rem; color: #374151;">
                <div style="margin-bottom: 0.7rem;">
                    <strong>Username:</strong> <span style="color:#667eea;font-weight:600;">${profile.username || "Unknown"}</span>
                </div>
                <div style="margin-bottom: 0.7rem;">
                    <strong>Bio:</strong> <span>${profile.bio || "No bio available"}</span>
                </div>
                <div style="margin-bottom: 0.7rem;">
                    <strong>Region:</strong> <span>${profile.region || "N/A"}</span>
                </div>
                <div style="margin-bottom: 0.7rem;">
                    <strong>Languages:</strong> <span>${(profile.languages || []).join(", ") || "None"}</span>
                </div>
                <div style="margin-bottom: 0.7rem;">
                    <strong>Hobbies:</strong> <span>${(profile.hobbies || []).join(", ") || "None"}</span>
                </div>
            </div>
            <div style="display:flex;gap:1rem;justify-content:center;margin-top:1.5rem;">
                <button id="sendRequestBtnModal" class="submit-btn" style="min-width:140px;">Send Penpal Request</button>
                <button id="sendOneTimeMsgBtn" class="submit-btn" style="background:linear-gradient(135deg,#38a169 0%,#48bb78 100%);min-width:140px;">Send One-Time Message</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close modal handler
    document.getElementById("closeModalBtn").onclick = () => modal.remove();

    // Send Penpal Request handler
    document.getElementById("sendRequestBtnModal").onclick = async () => {
        const user = auth.currentUser;
        if (!user) return showError("You must be logged in.");

        try {
            const idToken = await user.getIdToken();
            const userProfile = await getCurrentUserProfile(user);

            const response = await fetchWithRetry(`${CONFIG.BACKEND_URL}/penpal/request`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    fromUsername: userProfile.username,
                    toUid: currentMatch.id,
                    toUsername: profile.username
                })
            });

            if (!response.ok) throw new Error("Failed to send request");

            showSuccess(`Request sent to ${profile.username}!`);
            // Remove the modal after sending the request
            const modal = document.getElementById("matchModal");
            if (modal) modal.remove();
        } catch (err) {
            console.error("Error sending request:", err);
            showError("Could not send request. Try again.");
        }
    };

    // Send One-Time Message handler
    document.getElementById("sendOneTimeMsgBtn").onclick = async () => {
        // Redirect to chats.html with query params
        window.location.href = `chats.html?targetUser=${encodeURIComponent(currentMatch.id)}&type=onetime&targetUsername=${encodeURIComponent(profile.username)}`;
    };
}