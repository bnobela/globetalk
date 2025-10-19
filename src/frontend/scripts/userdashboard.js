import { auth, logout } from '../../services/firebase.js';
import { onAuthStateChanged } from "firebase/auth";

        // Constants
        const MAX_RETRY_ATTEMPTS = 3;
        const RETRY_DELAY = 1000;
        const AUTH_TIMEOUT = 10000;
        const BACKEND_PROFILE_URL = "https://binarybandits-profileapi.onrender.com/api/profile";

        // Utility function to format time
        function formatTimeAgo(date) {
            try {
                if (!date) return 'Unknown';
                
                const timestamp = date instanceof Date ? date : new Date(date);
                if (isNaN(timestamp.getTime())) return 'Unknown';

                const now = new Date();
                const diffMs = now - timestamp;
                
                if (diffMs < 0) return 'Just now';
                
                const diffSec = Math.floor(diffMs / 1000);
                if (diffSec < 60) return `${diffSec}s ago`;
                
                const diffMin = Math.floor(diffSec / 60);
                if (diffMin < 60) return `${diffMin}m ago`;
                
                const diffHr = Math.floor(diffMin / 60);
                if (diffHr < 24) return `${diffHr}h ago`;
                
                const diffDay = Math.floor(diffHr / 24);
                if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
                
                const diffWeek = Math.floor(diffDay / 7);
                if (diffWeek < 4) return `${diffWeek} week${diffWeek !== 1 ? 's' : ''} ago`;
                
                return timestamp.toLocaleDateString();
            } catch (error) {
                console.error('Error formatting time:', error);
                return 'Unknown';
            }
        }

        // Retry logic for failed operations
        async function retryOperation(operation, attempts = MAX_RETRY_ATTEMPTS) {
            for (let i = 0; i < attempts; i++) {
                try {
                    return await operation();
                } catch (error) {
                    if (i === attempts - 1) throw error;
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
                }
            }
        }

        // Safe HTML escaping
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Render pen pal suggestions
        async function renderPenPalSuggestions(userId) {
            const penPalCards = document.getElementById('penPalCards');
            if (!penPalCards) return;

            try {
                penPalCards.innerHTML = '<span>Loading pen pal suggestions...</span>';
                
                const { getPenPalSuggestions } = await import('../../services/userdashboard.js');
                const suggestions = await retryOperation(() => getPenPalSuggestions(userId));
                
                penPalCards.innerHTML = '';
                
                if (!suggestions || suggestions.length === 0) {
                    penPalCards.innerHTML = '<span style="color: #666;">No pen pal suggestions available at the moment. Check back later!</span>';
                    return;
                }

                suggestions.forEach(user => {
                    try {
                        const card = document.createElement('div');
                        card.className = 'pen-pal-card';
                        card.setAttribute('role', 'button');
                        card.setAttribute('tabindex', '0');
                        
                        const username = escapeHtml(user?.username || 'Unknown User');
                        const region = escapeHtml(user?.region || 'N/A');
                        const hobbies = Array.isArray(user?.hobbies) && user.hobbies.length 
                            ? user.hobbies.map(h => escapeHtml(h)).join(', ') 
                            : 'N/A';
                        const languages = Array.isArray(user?.languages) && user.languages.length 
                            ? user.languages.map(l => escapeHtml(l)).join(', ') 
                            : 'N/A';
                        const _g = (user?.gender || '').toString().trim().toLowerCase();
                        const genderAvatar = (_g === 'female' || _g === 'f') ? 'images/female.png' : (_g === 'male' || _g === 'm') ? 'images/male1.png' : (_g === 'non-binary' || _g === 'nonbinary' || _g === 'nb' || _g === 'non' || _g === 'n') ? 'images/nonb.png' : null;
                        const avatar = user?.avatarUrl || genderAvatar || '/src/frontend/images/default-avatar.png';

                        card.innerHTML = `
                            <div style="display:flex;align-items:center;gap:12px;">
                                <img src="${avatar}" alt="${username}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />
                                <div style="flex:1;">
                                  <h4 style="margin:0;">${username}</h4>
                                  <div class="pen-pal-info">
                                      <p><strong>Region:</strong> ${region}</p>
                                      <p><strong>Hobbies:</strong> ${hobbies}</p>
                                      <p><strong>Languages:</strong> ${languages}</p>
                                  </div>
                                </div>
                            </div>
                        `;
                        
                        const navigateToProfile = () => {
                            if (user?._docId) {
                                window.location.href = `../pages/profile.html?userId=${encodeURIComponent(user._docId)}`;
                            } else {
                                console.error('User ID not available');
                                alert('Unable to view this profile. Please try again.');
                            }
                        };
                        
                        card.onclick = navigateToProfile;
                        card.onkeypress = (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigateToProfile();
                            }
                        };
                        
                        penPalCards.appendChild(card);
                    } catch (cardError) {
                        console.error('Error rendering pen pal card:', cardError);
                    }
                });
            } catch (error) {
                console.error('Error loading pen pal suggestions:', error);
                penPalCards.innerHTML = `
                    <span style="color: #d32f2f;">
                        Unable to load pen pal suggestions. 
                        <button onclick="location.reload()" style="margin-left: 10px;">
                            Retry
                        </button>
                    </span>
                `;
            }
        }

        // Render active pen pals
        async function renderActivePenPals(userId) {
            const container = document.getElementById('activePenPals');
            if (!container) return;

            try {
                container.innerHTML = '<span>Loading your pen pals...</span>';
                const { getActivePenPals } = await import('../../services/userdashboard.js');
                const pals = await retryOperation(() => getActivePenPals(userId));

                container.innerHTML = '';
                if (!pals || pals.length === 0) {
                    container.innerHTML = '<span style="color:#666;">You have no active pen pals yet.</span>';
                    return;
                }

                pals.forEach(p => {
                    try {
                        const card = document.createElement('div');
                        card.className = 'pen-pal-card active-pal';
                        card.setAttribute('role', 'button');
                        card.setAttribute('tabindex', '0');

                                                const username = escapeHtml(p?.username || 'Unknown User');
                                                const bio = escapeHtml(p?.bio || '');
                                                const _pg = (p?.gender || '').toString().trim().toLowerCase();
                                                const genderAvatar = (_pg === 'female' || _pg === 'f') ? 'images/female.png' : (_pg === 'male' || _pg === 'm') ? 'images/male1.png' : (_pg === 'non-binary' || _pg === 'nonbinary' || _pg === 'nb' || _pg === 'non' || _pg === 'n') ? 'images/nonb.png' : null;
                                                const avatar = p?.avatarUrl || genderAvatar || '/src/frontend/images/default-avatar.png';

                                                card.innerHTML = `
                                                        <div style="display:flex;align-items:center;gap:10px;">
                                                            <img src="${avatar}" alt="${username}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />
                                                            <div>
                                                                <strong>${username}</strong>
                                                                <div style="font-size:12px;color:#666;">${escapeHtml(p?.region || 'N/A')}</div>
                                                                <div style="font-size:12px;color:#444;margin-top:4px;">${bio}</div>
                                                            </div>
                                                        </div>
                                                `;

                        card.onclick = () => {
                            window.location.href = `../pages/profile.html?userId=${encodeURIComponent(p._docId)}`;
                        };

                        container.appendChild(card);
                    } catch (err) {
                        console.error('Error rendering active pal:', err);
                    }
                });

            } catch (error) {
                console.error('Error loading active pen pals:', error);
                container.innerHTML = '<span style="color:#d32f2f;">Unable to load your pen pals.</span>';
            }
        }

        // Populate user header (avatar + username) from profile API
        async function populateUserHeader(userId) {
            try {
                if (!auth?.currentUser) return;
                const token = await auth.currentUser.getIdToken();
                const resp = await fetch(`${BACKEND_PROFILE_URL}/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!resp.ok) throw new Error('Failed to load profile');
                const profile = await resp.json();

                const avatarEl = document.getElementById('userAvatar');
                const usernameEl = document.getElementById('displayUsername');
                const regionEl = document.getElementById('displayRegion');
                const bioEl = document.getElementById('displayBio');
                // Prefer explicit avatarUrl; fall back to gender-based image, then to default
                const _pgender = (profile?.gender || '').toString().trim().toLowerCase();
                const genderAvatar = (_pgender === 'female' || _pgender === 'f') ? 'images/female.png' : (_pgender === 'male' || _pgender === 'm') ? 'images/male1.png' : (_pgender === 'non-binary' || _pgender === 'nonbinary' || _pgender === 'nb' || _pgender === 'non' || _pgender === 'n') ? 'images/nonb.png' : null;
                if (avatarEl) avatarEl.src = profile.avatarUrl || genderAvatar || '/src/frontend/images/default-avatar.png';
                if (usernameEl) usernameEl.textContent = profile.username || profile.displayName || 'You';
                if (regionEl) regionEl.textContent = profile.region || '';
                if (bioEl) bioEl.textContent = profile.bio || '';
            } catch (err) {
                console.error('Failed to populate user header:', err);
            }
        }

        // Render active conversations
        async function renderActiveConversations(userId) {
            const container = document.getElementById('conversationsContainer');
            if (!container) return;

            try {
                container.innerHTML = '<span>Loading conversations...</span>';
                
                const username = await retryOperation(() => getUsername(userId));
                
                if (!username) {
                    throw new Error('Unable to retrieve username');
                }
                
                const conversations = await retryOperation(() => getActiveConversations(username));
                
                container.innerHTML = '';
                
                if (!conversations || conversations.length === 0) {
                    container.innerHTML = '<span style="color: #666;">No active conversations yet. Find a pen pal to start chatting!</span>';
                    return;
                }

                conversations.forEach(conv => {
                    try {
                        const item = document.createElement('div');
                        item.className = 'conversation-item';
                        item.setAttribute('role', 'button');
                        item.setAttribute('tabindex', '0');
                        
                        const otherUser = escapeHtml(conv?.otherUser || 'Unknown');
                        const timeAgo = formatTimeAgo(conv?.lastUpdated);
                        
                        item.innerHTML = `
                            <h4>${otherUser}</h4>
                            <span class="conversation-time">${timeAgo}</span>
                        `;
                        
                        const navigateToChat = () => {
                            if (conv?.conversationId || conv?.otherUser) {
                                const chatId = conv.conversationId || conv.otherUser;
                                window.location.href = `../pages/chat.html?id=${encodeURIComponent(chatId)}`;
                            }
                        };
                        
                        item.onclick = navigateToChat;
                        item.onkeypress = (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigateToChat();
                            }
                        };
                        
                        container.appendChild(item);
                    } catch (convError) {
                        console.error('Error rendering conversation item:', convError);
                    }
                });
            } catch (error) {
                console.error('Error loading conversations:', error);
                container.innerHTML = `
                    <span style="color: #d32f2f;">
                        Unable to load conversations. 
                        <button onclick="location.reload()" style="margin-left: 10px;">
                            Retry
                        </button>
                    </span>
                `;
            }
        }

        // Handle logout
        async function handleLogout() {
            const logoutBtn = document.getElementById('logoutBtn');
            if (!logoutBtn) return;

            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                try {
                    logoutBtn.disabled = true;
                    logoutBtn.textContent = 'Logging out...';
                    
                    await logout();
                    window.location.href = '../pages/login.html';
                } catch (error) {
                    console.error('Logout error:', error);
                    alert('Failed to log out. Please try again.');
                    logoutBtn.disabled = false;
                    logoutBtn.textContent = 'Logout';
                }
            });
        }

        // Initialize dashboard
        async function initializeDashboard() {
            try {
                handleLogout();

                // Set up auth timeout
                const authTimeout = setTimeout(() => {
                    console.error('Authentication timeout');
                    window.location.href = '../pages/login.html';
                }, AUTH_TIMEOUT);

                onAuthStateChanged(auth, async (user) => {
                    clearTimeout(authTimeout);
                    
                    if (!user) {
                        console.log('No authenticated user, redirecting to login');
                        window.location.href = '../pages/login.html';
                        return;
                    }

                    const userId = user.uid;
                    
                    // Load sections concurrently: header, suggestions + active pen pals
                    await Promise.allSettled([
                        populateUserHeader(userId),
                        renderPenPalSuggestions(userId),
                        renderActivePenPals(userId)
                    ]);
                });
            } catch (error) {
                console.error('Dashboard initialization error:', error);
                alert('Failed to initialize dashboard. Please refresh the page.');
            }
        }

        // Start when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeDashboard);
        } else {
            initializeDashboard();
        }

        
        