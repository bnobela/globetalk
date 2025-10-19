import express from "express";
import {
  reportUser, blockUser, unblockUser, listBlocked, banUser, unbanUser, dismissReport,
  getBannedUsers, isBannedUser, isAdmin, getAdminInfo,
  getBannedUserCount, getReportedUserCount, getUnresolvedReports, getResolvedReports,
  getAllReports, getActiveUserCount
} from "../controllers/moderationController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Root endpoint for browser testing
router.get("/", (req, res) => {
	res.send("Moderation API is running!");
});


// Public endpoints
router.post("/report", verifyToken, reportUser);
router.post("/block", verifyToken, blockUser);
router.post("/unblock", verifyToken, unblockUser);
router.get("/listBlocked/:uid", verifyToken, listBlocked);

// Moderation/admin endpoints 
router.post("/banUser", verifyToken, banUser);
router.post("/unbanUser", verifyToken, unbanUser);
router.post("/dismissReport", verifyToken, dismissReport);
router.get("/bannedUsers", verifyToken, getBannedUsers);
router.get("/isBanned/:userId", verifyToken, isBannedUser);
router.get("/isAdmin/:userId", verifyToken, isAdmin);
router.get("/getAdminInfo/:userId", verifyToken, getAdminInfo);

// Stats endpoints
router.get("/bannedUserCount", verifyToken, getBannedUserCount);
router.get("/reportedUserCount", verifyToken, getReportedUserCount);
router.get("/activeUserCount", verifyToken, getActiveUserCount);

// Reports endpoints
router.get("/unresolvedReports", verifyToken, getUnresolvedReports);
router.get("/resolvedReports", verifyToken, getResolvedReports);
router.get("/allReports", verifyToken, getAllReports);

export default router;
