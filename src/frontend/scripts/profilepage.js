import { auth } from '../../services/firebase.js';
import { onAuthStateChanged } from "firebase/auth";

        const DEFAULT_AVATAR_SVG = `
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="40" fill="#E0E0E0"/>
                <circle cx="40" cy="32" r="16" fill="#BDBDBD"/>
                <ellipse cx="40" cy="60" rx="22" ry="12" fill="#BDBDBD"/>
            </svg>
        `;

        const BACKEND_PROFILE_URL = "https://binarybandits-profileapi.onrender.com/api/profile";

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
        });