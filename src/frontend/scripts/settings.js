// settings.js

import { 
  auth,onAuthStateChanged 
} from "../../services/firebase.js";


const BACKEND_PROFILE_URL = "https://binarybandits-profileapi.onrender.com/api/profile";

// Reference to form and username text
const formElement = document.getElementById("settingsForm");
const usernameText = document.getElementById("username");

// -------------------------------
// Wait for authentication state
// -------------------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("You need to be signed in to view settings.");
    window.location.href = "../pages/login.html";
    return;
  }

  try {
    const idToken = await user.getIdToken();
    const res = await fetch(`${BACKEND_PROFILE_URL}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    if (!res.ok) throw new Error("Failed to fetch profile");
    const data = await res.json();
    applySettingsToForm(data, formElement);

    // Set username text from fetched profile
    usernameText.textContent = data.username || "No username";
  } catch (error) {
    console.error("Error loading settings:", error);
  }

  setupFormListener(formElement, user);
});

// -------------------------------
// Apply existing API data
// -------------------------------
function applySettingsToForm(data, formElement) {
  if (!data || !formElement) return;
  formElement.querySelector("#language").value = data.language || "";
  formElement.querySelector("#timezone").value = data.timezone || "";
  formElement.querySelector("#ageRange").value = data.ageRange || "";
  formElement.querySelector("#gender").value = data.gender || "";
  formElement.querySelector("#interests").value = data.interests || "";
  formElement.querySelector("#bio").value = data.bio || "";
}

// -------------------------------
// Collect form data (skip empty fields)
// -------------------------------
function collectFormData(formElement) {
  const data = {};
  const language = formElement.querySelector("#language").value.trim();
  const timezone = formElement.querySelector("#timezone").value.trim();
  const ageRange = formElement.querySelector("#ageRange").value.trim();
  const gender = formElement.querySelector("#gender").value.trim();
  const interests = formElement.querySelector("#interests").value.trim();
  const bio = formElement.querySelector("#bio").value.trim();

  if (language) data.language = language;
  if (timezone) data.timezone = timezone;
  if (ageRange) data.ageRange = ageRange;
  if (gender) data.gender = gender;
  if (interests) data.interests = interests;
  if (bio) data.bio = bio;

  return data;
}

// -------------------------------
// Save via profile API (PATCH) only if at least one field is filled
// -------------------------------
function setupFormListener(formElement, user) {
  formElement.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = collectFormData(formElement);
    if (Object.keys(data).length === 0) {
      alert("Please fill at least one field to update your profile.");
      return;
    }
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`${BACKEND_PROFILE_URL}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to save profile");
      alert("✅ Changes saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("❌ Failed to save changes.");
    }
  });
}
