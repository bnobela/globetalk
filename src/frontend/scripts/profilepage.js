import { auth } from '../../services/firebase.js';
import { onAuthStateChanged } from "firebase/auth";

// --- Country facts helpers ---
const countryCodeMap = {
  "SA(GMT+2)": "ZA",
  "UK(GMT+1)": "GB",
  "India(GMT+5:30)": "IND",
  "USA(GMT-4)": "USA"
};

async function getInterestingFacts(code) {
  const res = await fetch(`https://restcountries.com/v3.1/alpha/${code}`);
  const [country] = await res.json();

  const facts = [
    `Did you know that ${country.name.common} has a population of about ${country.population.toLocaleString()} people?`,
    `Its capital city is ${country.capital?.[0] || "N/A"}, known as one of the key centers of culture and governance in ${country.region}.`,
    `People in ${country.name.common} speak ${Object.values(country.languages || {}).slice(0, 3).join(", ")}${Object.values(country.languages || {}).length > 3 ? ", and more!" : "."}`,
    `The local currency is the ${Object.values(country.currencies || {})[0]?.name || "Unknown"} (${Object.keys(country.currencies || {})[0] || "N/A"}).`
  ];

  return facts;
}
// --- End country facts helpers ---

const DEFAULT_AVATAR_SVG = `
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="40" fill="#E0E0E0"/>
        <circle cx="40" cy="32" r="16" fill="#BDBDBD"/>
        <ellipse cx="40" cy="60" rx="22" ry="12" fill="#BDBDBD"/>
    </svg>
`;

const BACKEND_PROFILE_URL = "https://globetalk-profile-api-ne99.onrender.com/api/profile";

const ERROR_MESSAGES = {
    NO_USER_ID: 'Error: No userId provided in the URL.',
    PROFILE_FETCH_FAILED: 'Unable to load profile. Please try again later.',
    NO_PROFILE_FOUND: 'No profile found for this user.',
    AUTH_REQUIRED: 'Authentication required. Redirecting to login...',
    NETWORK_ERROR: 'Network error. Please check your connection and try again.'
};

function getQueryParam(param) {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    } catch (error) {
        console.error('Error parsing query parameters:', error);
        return null;
    }
}

function sanitizeText(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderHobbies(hobbies) {
    if (!Array.isArray(hobbies) || hobbies.length === 0) {
        return '<div class="hobby-item"><span class="hobby-text">No hobbies listed</span></div>';
    }
    
    return hobbies
        .filter(hobby => hobby && typeof hobby === 'string')
        .map(hobby => `
            <div class="hobby-item">
                <span class="hobby-text">${sanitizeText(hobby)}</span>
            </div>
        `).join('');
}

function displayError(message, container = '.main-container') {
    const element = document.querySelector(container);
    if (element) {
        element.innerHTML = `
            <div class="error-message">
                <strong>Error:</strong> ${sanitizeText(message)}
            </div>
        `;
    }
}

function initializeProfilePicture() {
    const profilePic = document.querySelector('.profile-pic');
    if (profilePic) {
        profilePic.innerHTML = DEFAULT_AVATAR_SVG;
        profilePic.style.pointerEvents = 'none';
        profilePic.style.cursor = 'default';
    }
}

function initializeChatButton() {
    const chatBtn = document.querySelector('.start-chat-btn');
    if (chatBtn) {
        // Always use the userId from the profile being viewed
        const userId = getQueryParam('userId');
        chatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (userId) {
                window.location.href = `chats.html?targetUser=${encodeURIComponent(userId)}`;
            } else {
                window.location.href = 'chats.html';
            }
        });
    }
}

// --- Add modal for country facts ---
function setupCountryFactsModal() {
    // Create modal if not present
    if (!document.getElementById('countryFactsModal')) {
        const modal = document.createElement('div');
        modal.id = 'countryFactsModal';
        modal.style.display = 'none';
        modal.className = 'country-facts-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div id="countryFlagContainer" style="text-align:center;margin-bottom:12px;"></div>
                <h3 id="countryFactsTitle" class="modal-title">Country Facts</h3>
                <ul id="countryFactsList" class="modal-list"></ul>
                <button id="closeFactsBtn" class="modal-close-btn">Close</button>
            </div>
        `;
        document.body.appendChild(modal);

        // Add styles for modal to match GlobeTalk UI
        const style = document.createElement('style');
        style.textContent = `
.country-facts-modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(60, 60, 80, 0.18);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', 'Poppins', sans-serif;
}
.country-facts-modal .modal-content {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 32px rgba(0,0,0,0.18);
  padding: 32px 24px 24px 24px;
  max-width: 380px;
  width: 100%;
  text-align: left;
}
.country-facts-modal .modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #3b82f6;
  margin-bottom: 18px;
  letter-spacing: 0.01em;
}
.country-facts-modal .modal-list {
  margin: 0 0 18px 0;
  padding: 0 0 0 18px;
  color: #222;
  font-size: 1rem;
}
.country-facts-modal .modal-list li {
  margin-bottom: 10px;
  line-height: 1.5;
}
.country-facts-modal .modal-close-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 22px;
  font-size: 1rem;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.18s;
}
.country-facts-modal .modal-close-btn:hover {
  background: #2563eb;
}
.country-facts-modal #countryFlagContainer img {
  width: 48px;
  height: 32px;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.10);
  margin-bottom: 4px;
}
        `;
        document.head.appendChild(style);
    }
    const factsModal = document.getElementById('countryFactsModal');
    const factsList = document.getElementById('countryFactsList');
    const closeBtn = document.getElementById('closeFactsBtn');
    const factsTitle = document.getElementById('countryFactsTitle');
    const flagContainer = document.getElementById('countryFlagContainer');

    // Attach close handler
    if (closeBtn) {
        closeBtn.onclick = () => { factsModal.style.display = 'none'; };
    }

    // Attach learn more handler
    const learnMoreLink = document.querySelector('.learn-more-link');
    const regionDetail = document.getElementById('regionDetail');
    if (learnMoreLink && regionDetail) {
        learnMoreLink.addEventListener('click', async (e) => {
            e.preventDefault();
            let regionText = regionDetail.textContent.replace('Region:', '').trim();
            let code = countryCodeMap[regionText] || regionText;
            factsTitle.textContent = `Interesting Facts about ${regionText}`;
            factsList.innerHTML = '<li><strong>Loading facts...</strong></li>';
            flagContainer.innerHTML = '';
            factsModal.style.display = 'flex';
            try {
                // Fetch country data for flag and facts
                const res = await fetch(`https://restcountries.com/v3.1/alpha/${code}`);
                const [country] = await res.json();

                // Show flag if available
                if (country?.flags?.png || country?.flags?.svg) {
                    flagContainer.innerHTML = `<img src="${sanitizeText(country.flags.png || country.flags.svg)}" alt="Flag of ${sanitizeText(country.name.common)}" title="${sanitizeText(country.name.common)}" />`;
                } else {
                    flagContainer.innerHTML = '';
                }

                // Prepare facts with bold dynamic data
                const facts = [
                    `Did you know that <strong>${sanitizeText(country.name.common)}</strong> has a population of about <strong>${sanitizeText(country.population.toLocaleString())}</strong> people?`,
                    `Its capital city is <strong>${sanitizeText(country.capital?.[0] || "N/A")}</strong>, known as one of the key centers of culture and governance in <strong>${sanitizeText(country.region)}</strong>.`,
                    `People in <strong>${sanitizeText(country.name.common)}</strong> speak <strong>${sanitizeText(Object.values(country.languages || {}).slice(0, 3).join(", "))}${Object.values(country.languages || {}).length > 3 ? ", and more!" : "."}</strong>`,
                    `The local currency is the <strong>${sanitizeText(Object.values(country.currencies || {})[0]?.name || "Unknown")}</strong> (<strong>${sanitizeText(Object.keys(country.currencies || {})[0] || "N/A")}</strong>).`
                ];
                factsList.innerHTML = facts.map(f => `<li>${f}</li>`).join('');
            } catch {
                factsList.innerHTML = '<li><strong>Could not load facts for this country.</strong></li>';
                flagContainer.innerHTML = '';
            }
        });
    }
}
// --- End modal for country facts ---

function updateProfileUI(data) {
    const elements = {
        username: document.getElementById('username'),
        userDescription: document.getElementById('userDescription'),
        ageDetail: document.getElementById('ageDetail'),
        genderDetail: document.getElementById('genderDetail'),
        regionDetail: document.getElementById('regionDetail'),
        languagesDetail: document.getElementById('languagesDetail'),
        hobbiesList: document.getElementById('hobbiesList'),
        profilePic: document.getElementById('profilePic')
    };

    const missingElements = Object.entries(elements)
        .filter(([_, el]) => !el)
        .map(([key, _]) => key);
    
    if (missingElements.length > 0) {
        console.warn('Missing DOM elements:', missingElements);
    }

    if (elements.username) {
        elements.username.textContent = data.username || 'Unknown User';
    }
    
    if (elements.userDescription) {
        elements.userDescription.textContent = data.bio || 'No bio provided.';
    }
    
    if (elements.ageDetail) {
        elements.ageDetail.textContent = `Age: ${data.ageRange || 'Not specified'}`;
    }
    
    if (elements.genderDetail) {
        elements.genderDetail.textContent = `Gender: ${data.gender || 'Not specified'}`;
    }
    
    if (elements.regionDetail) {
        elements.regionDetail.textContent = `Region: ${data.region || 'Not specified'}`;
    }
    
    if (elements.languagesDetail) {
        const languages = Array.isArray(data.languages) 
            ? data.languages.filter(lang => lang).join(', ') 
            : (data.languages || 'Not specified');
        elements.languagesDetail.textContent = `Languages: ${languages}`;
    }
    
    if (elements.hobbiesList) {
        elements.hobbiesList.innerHTML = renderHobbies(data.hobbies);
    }
    
    if (elements.profilePic) {
        elements.profilePic.innerHTML = DEFAULT_AVATAR_SVG;
    }
}

async function fetchUserProfile(userId, idToken) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(`${BACKEND_PROFILE_URL}/${encodeURIComponent(userId)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 404) {
            throw new Error(ERROR_MESSAGES.NO_PROFILE_FOUND);
        }

        if (response.status === 401 || response.status === 403) {
            throw new Error(ERROR_MESSAGES.AUTH_REQUIRED);
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${ERROR_MESSAGES.PROFILE_FETCH_FAILED}`);
        }

        const data = await response.json();
        
        if (!data || typeof data !== 'object') {
            throw new Error(ERROR_MESSAGES.NO_PROFILE_FOUND);
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error('Request timeout. Please try again.');
        }
        
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
        }
        
        throw error;
    }
}

async function initializeProfile() {
    const userId = getQueryParam('userId');
    
    if (!userId) {
        displayError(ERROR_MESSAGES.NO_USER_ID);
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.log('No authenticated user, redirecting to login');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 100);
            return;
        }

        try {
            const idToken = await user.getIdToken();
            console.log('Fetching profile for userId:', userId);
            
            const profileData = await fetchUserProfile(userId, idToken);
            console.log('Profile data loaded:', profileData);
            
            updateProfileUI(profileData);
        } catch (error) {
            console.error('Error loading profile:', error);
            displayError(error.message || ERROR_MESSAGES.PROFILE_FETCH_FAILED, '.profile-card');
        }
    }, (error) => {
        console.error('Auth state change error:', error);
        displayError('Authentication error. Please try logging in again.');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeProfilePicture();
    initializeChatButton();
    initializeProfile();
    setupCountryFactsModal(); // <-- Add modal setup
});