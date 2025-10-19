// src/frontend/scripts/index.js

export function redirectToLogin(win = window) {
  win.location.href = './pages/login.html';
}

export function goToLogin(navigate = (url) => { window.location.href = url; }) {
  navigate('./pages/login.html');
}

export function setupGetStartedBtn() {
  const joinButton = document.getElementById('getStartedBtn');
  if (!joinButton) return;

  joinButton.addEventListener('click', () => {
    redirectToLogin();
  });

  joinButton.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); // prevent scrolling
      joinButton.click();
    }
  });
}

// Automatically attach on real page load
document.addEventListener('DOMContentLoaded', setupGetStartedBtn);
