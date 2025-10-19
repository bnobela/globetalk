import express from "express";
import { saveUserProfile, getUserProfile, updateUserProfile, assignUsername } from "../controllers/profileController.js";
import {admin} from "../firebaseAdmin.js";

const router = express.Router();

// Middleware to verify Firebase ID token
async function authMiddleware(req, res, next) {
  const idToken = req.headers.authorization?.split("Bearer ")[1];
  if (!idToken) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.uid = decoded.uid;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Apply middleware to all profile routes
router.use(authMiddleware);

// GET /api/profile - get own profile
router.get("/", async (req, res) => {
  const profile = await getUserProfile(req.uid);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json(profile);
});

// POST /api/profile
router.post("/", async (req, res) => {
  try {
    await saveUserProfile(req.uid, req.body);

    const profile = await getUserProfile(req.uid);
    if (!profile.username) {
      profile.username = await assignUsername(req.uid);
    }

    res.json({ message: "Profile saved", profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/profile
router.patch("/", async (req, res) => {
  const success = await updateUserProfile(req.uid, req.body);
  if (success) return res.json({ message: "Profile updated" });
  res.status(500).json({ error: "Failed to update profile" });
});


// GET /api/profile/:userId - fetch any user's profile by userId
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const profile = await getUserProfile(userId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
