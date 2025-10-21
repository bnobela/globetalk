// Region data with timezone examples
        /*const regions = [
            "Africa (Central)",
            "Africa (Eastern)",
            "Africa (Southern)",
            "Africa (Western)",
            "Asia (Central)",
            "Asia (Eastern)",
            "Asia (Southern)",
            "Asia (Southeastern)",
            "Asia (Western)",
            "Australia & Pacific",
            "Europe (Central)",
            "Europe (Eastern)",
            "Europe (Western)",
            "North America (Central)",
            "North America (Eastern)",
            "North America (Mountain)",
            "North America (Pacific)",
            "North America (Western)",
            "South America (Andean)",
            "South America (Brazilian)",
            "South America (Southern)",
            "South America (Western)"
        ];

        // Timezone to region mapping
        const timezoneToRegion = {
            "Africa/": "Africa",
            "Asia/": "Asia",
            "Australia/": "Australia & Pacific",
            "Europe/": "Europe",
            "America/New_York": "North America (Eastern)",
            "America/Chicago": "North America (Central)",
            "America/Denver": "North America (Mountain)",
            "America/Los_Angeles": "North America (Pacific)",
            "America/Argentina/": "South America (Southern)",
            "America/Sao_Paulo": "South America (Brazilian)",
            "America/Lima": "South America (Western)",
            "Pacific/": "Australia & Pacific"
        };

        // Populate region dropdown
        function populateRegionOptions() {
            const optionsContainer = document.getElementById('regionOptions');
            optionsContainer.innerHTML = '';
            
            regions.forEach(region => {
                const option = document.createElement('div');
                option.className = 'dropdown-option';
                option.textContent = region;
                option.addEventListener('click', () => {
                    document.getElementById('region').value = region;
                    optionsContainer.style.display = 'none';
                });
                optionsContainer.appendChild(option);
            });
        }

        // Detect user's timezone and suggest region
        function detectUserRegion() {
            try {
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                document.getElementById('detectedLocation').textContent = `Detected timezone: ${timezone}`;
                
                // Find matching region
                for (const [tzPattern, region] of Object.entries(timezoneToRegion)) {
                    if (timezone.includes(tzPattern)) {
                        document.getElementById('region').value = region;
                        document.getElementById('detectedLocation').textContent += ` | Suggested region: ${region}`;
                        break;
                    }
                }
            } catch (e) {
                document.getElementById('detectedLocation').textContent = "Could not detect your timezone";
            }
        }

        // Initialize region dropdown
        document.addEventListener('DOMContentLoaded', function() {
            populateRegionOptions();
            detectUserRegion();
            
            const regionInput = document.getElementById('region');
            const optionsContainer = document.getElementById('regionOptions');
            
            // Show dropdown when input is focused
            regionInput.addEventListener('focus', () => {
                optionsContainer.style.display = 'block';
            });
            
            // Filter options based on input
            regionInput.addEventListener('input', () => {
                const filter = regionInput.value.toLowerCase();
                const options = document.querySelectorAll('.dropdown-option');
                
                options.forEach(option => {
                    const text = option.textContent.toLowerCase();
                    option.style.display = text.includes(filter) ? 'block' : 'none';
                });
                
                optionsContainer.style.display = 'block';
            });
            
            // Hide dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!regionInput.contains(e.target) && !optionsContainer.contains(e.target)) {
                    optionsContainer.style.display = 'none';
                }
            });
        });

        // Import the functions  from the SDKs
import { saveUserProfile } from './src/services/profile.js';
import { auth, observeUser } from '../../services/firebase.js';

// Wait for page to load
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in
      const userId = user.uid;
      console.log("User ID:", userId);
      
      // Set up form submission
      document.getElementById('profileForm').addEventListener('submit', async function(event) {
        event.preventDefault();
        
        // Get all form values
        const formData = {
          ageRange: document.getElementById('ageRange').value,
          region: document.getElementById('region').value,
          languages: document.getElementById('languages').value.split(',').map(lang => lang.trim()),
          hobbies: document.getElementById('hobbies').value.split(',').map(hobby => hobby.trim()),
          threeWords: document.getElementById('threeWords').value,
          happyThing: document.getElementById('happyThing').value,
          dailyRitual: document.getElementById('dailyRitual').value,
          wonderAbout: document.getElementById('wonderAbout').value,
          uniqueThing: document.getElementById('uniqueThing').value,
          proverb: document.getElementById('proverb').value,
          localFood: document.getElementById('localFood').value,
          season: document.getElementById('season').value,
          animal: document.getElementById('animal').value,
          song: document.getElementById('song').value,
          penPalType: document.getElementById('penPalType').value,
          createdAt: new Date()
        };
        
        // Save to Firebase
        const success = await saveUserProfile(userId, formData);
        
        if (success) {
          alert('Profile created successfully! 🎉');
          // Redirect to main app
          window.location.href = 'index.html';
        } else {
          alert('Error saving profile. Please try again.');
        }
      });
      
    } else {
      // User is signed out
      alert('You need to be logged in to create a profile.');
      window.location.href = 'login.html'; // Redirect to login
    }
  });
});*/


import { observeUser } from "../../services/firebase.js";




document.addEventListener("DOMContentLoaded", languageList);


const BACKEND_PROFILE_URL = "https://globetalk-profile-api-ne99.onrender.com/api/profile";
// ------------------ REGION DATA ------------------
const regions = [
  "Africa (Central)", "Africa (Eastern)", "Africa (Southern)", "Africa (Western)",
  "Asia (Central)", "Asia (Eastern)", "Asia (Southern)", "Asia (Southeastern)", "Asia (Western)",
  "Australia & Pacific",
  "Europe (Central)", "Europe (Eastern)", "Europe (Western)",
  "North America (Central)", "North America (Eastern)", "North America (Mountain)",
  "North America (Pacific)", "North America (Western)",
  "South America (Andean)", "South America (Brazilian)", "South America (Southern)", "South America (Western)"
];

const timezoneToRegion = {
  "Africa/": "Africa",
  "Asia/": "Asia",
  "Australia/": "Australia & Pacific",
  "Europe/": "Europe",
  "America/New_York": "North America (Eastern)",
  "America/Chicago": "North America (Central)",
  "America/Denver": "North America (Mountain)",
  "America/Los_Angeles": "North America (Pacific)",
  "America/Argentina/": "South America (Southern)",
  "America/Sao_Paulo": "South America (Brazilian)",
  "America/Lima": "South America (Western)",
  "Pacific/": "Australia & Pacific"
};

// Populate region dropdown
function populateRegionOptions() {
  const optionsContainer = document.getElementById('regionOptions');
  optionsContainer.innerHTML = '';

  regions.forEach(region => {
    const option = document.createElement('div');
    option.className = 'dropdown-option';
    option.textContent = region;
    option.addEventListener('click', () => {
      document.getElementById('region').value = region;
      optionsContainer.style.display = 'none';
    });
    optionsContainer.appendChild(option);
  });
}

// Detect user’s timezone and suggest region
function detectUserRegion() {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    document.getElementById('detectedLocation').textContent = `Detected timezone: ${timezone}`;

    for (const [tzPattern, region] of Object.entries(timezoneToRegion)) {
      if (timezone.includes(tzPattern)) {
        document.getElementById('region').value = region;
        document.getElementById('detectedLocation').textContent += ` | Suggested region: ${region}`;
        break;
      }
    }
  } catch (e) {
    document.getElementById('detectedLocation').textContent = "Could not detect your timezone";
  }
}

// ------------------ LANGUAGE DROPDOWN ------------------
async function languageList() {
  const dropdown = document.querySelector(".languages");

  try {
    const response = await fetch("https://api.languagetoolplus.com/v2/languages");
    if (!response.ok) throw new Error("Network response was not ok " + response.status);

    const languages = await response.json();
    const uniqueNames = new Set();

    languages.forEach(lang => {
      let cleanName = lang.name.split("(")[0].trim();
      uniqueNames.add(cleanName);
    });

    const sortedLanguages = Array.from(uniqueNames).sort();
    dropdown.innerHTML = '<option value="">-- Select Language --</option>';

    sortedLanguages.forEach(langName => {
      const option = document.createElement("option");
      option.textContent = langName;
      option.value = langName.toLowerCase(); // ✅ fixed bug (was missing ())
      dropdown.appendChild(option);
    });

  } catch (error) {
    console.error("Error loading languages:", error);
    dropdown.innerHTML = '<option value="">Error loading languages</option>';
  }
}
/*
// ------------------ SAVE PROFILE TO FIRESTORE ------------------
async function saveUserProfile(userId, data) {
  try {
    await setDoc(doc(db, "profiles", userId), data);
    return true;
  } catch (error) {
    console.error("Error saving profile:", error);
    return false;
  }
}
*/
// ------------------ MAIN APP ------------------





document.addEventListener('DOMContentLoaded', function() {
  populateRegionOptions();
  detectUserRegion();
  languageList();

  const regionInput = document.getElementById('region');
  const optionsContainer = document.getElementById('regionOptions');

  // Show dropdown when input is focused
  regionInput.addEventListener('focus', () => {
    optionsContainer.style.display = 'block';
  });

  // Filter options based on input
  regionInput.addEventListener('input', () => {
    const filter = regionInput.value.toLowerCase();
    const options = document.querySelectorAll('.dropdown-option');

    options.forEach(option => {
      const text = option.textContent.toLowerCase();
      option.style.display = text.includes(filter) ? 'block' : 'none';
    });

    optionsContainer.style.display = 'block';
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!regionInput.contains(e.target) && !optionsContainer.contains(e.target)) {
      optionsContainer.style.display = 'none';
    }
  });

  // ------------------ AUTH CHECK + FORM SUBMIT ------------------
  observeUser(async (user) => {
    if (user) {
      const userId = user.uid;
      document.getElementById('profileForm').addEventListener('submit', async function(event) {
        event.preventDefault();

        const formData = {
          ageRange: document.getElementById('ageRange').value,
          region: document.getElementById('region').value,
          languages: document.getElementById('languages').value.split(',').map(lang => lang.trim()),
          gender: document.getElementById('gender').value,
          hobbies: document.getElementById('hobbies').value.split(',').map(hobby => hobby.trim()),
          bio: document.getElementById('bio').value,
          createdAt: new Date(),
          secret: "groupBKPTN9",
          username: null // will be assigned by backend
        };

        // Get fresh ID token
        const idToken = await user.getIdToken(true);

        // Send profile to backend API
        const response = await fetch(`${BACKEND_PROFILE_URL}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          alert("Profile created successfully 🎉");
          window.location.href = "userdashboard.html";
        } else {
          alert("Error saving profile. Please try again.");
        }
      });
    } else {
      alert('You need to be logged in to create a profile.');
      window.location.href = 'login.html';
    }
  });
});
