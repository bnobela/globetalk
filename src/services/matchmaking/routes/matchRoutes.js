import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  getRandomMatch,
  sendPenpalRequest,
  acceptPenpalRequest,
  declinePenpalRequest,
  getPenpals,
  getPendingPenpalRequests,
  getSentPenpalRequests
} from "../controllers/matchController.js";

const router = express.Router();

// POST /api/match
router.post("/", verifyToken, async (req, res) => {
  console.log("🎯 Match route hit!");
  const userId = req.user.uid;
  const { language, region, interest } = req.body;

  if (!language || !region) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const match = await getRandomMatch(userId, { language, region, interest });
    if (!match) {
      console.log("No match found for user:", userId, " criteria:", { language, region, interest });
      return res.status(404).json({ message: "No match found, please update your preferences" });
    }
    res.json({ match });
  } catch (err) {
    console.error("Matchmaking error:", err);
    console.log("Error details:", err.message, err.stack);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/penpal/request
router.post("/penpal/request", verifyToken, async (req, res) => {
  const fromUid = req.user.uid;
  const { fromUsername, toUid, toUsername } = req.body;
  if (!fromUsername || !toUid || !toUsername) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const result = await sendPenpalRequest(fromUid, fromUsername, toUid, toUsername);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/penpal/accept
router.post("/penpal/accept", verifyToken, async (req, res) => {
  const userId = req.user.uid;
  const { docId } = req.body;
  if (!docId) {
    return res.status(400).json({ error: "Missing penpal document ID" });
  }
  try {
    await acceptPenpalRequest(docId, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/penpal/decline
router.post("/penpal/decline", verifyToken, async (req, res) => {
  const userId = req.user.uid;
  const { docId } = req.body;
  if (!docId) {
    return res.status(400).json({ error: "Missing penpal document ID" });
  }
  try {
    await declinePenpalRequest(docId, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/penpal/list
router.get("/penpal/list", verifyToken, async (req, res) => {
  const userId = req.user.uid;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const pageToken = req.query.pageToken || null;
  try {
    const result = await getPenpals(userId, pageSize, pageToken);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/penpal/pending
router.get("/penpal/pending", verifyToken, async (req, res) => {
  const userId = req.user.uid;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const pageToken = req.query.pageToken || null;
  try {
    const result = await getPendingPenpalRequests(userId, pageSize, pageToken);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/penpal/sent
router.get("/penpal/sent", verifyToken, async (req, res) => {
  const userId = req.user.uid;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const pageToken = req.query.pageToken || null;
  try {
    const result = await getSentPenpalRequests(userId, pageSize, pageToken);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
