import { admin } from "../firebaseAdmin.js";
const db = admin.firestore();



// --- Check if user is admin ---
export async function isAdmin(req, res) {
	const { userId } = req.params;
	try {
		const userRef = db.collection("admins").doc(userId);
		const snapshot = await userRef.get();
		return res.json({ isAdmin: snapshot.exists });
	} catch (error) {
		console.error("Error checking if user is admin:", error);
		return res.status(500).json({ error: "Failed to check if user is admin." });
	}
}

// --- Get admin info ---
export async function getAdminInfo(req, res) {
	const { userId } = req.params;
	try {
		const userRef = db.collection("admins").doc(userId);
		const snapshot = await userRef.get();
		return res.json({ admin: snapshot.exists ? snapshot.data() : null });
	} catch (error) {
		console.error("Error getting admin info:", error);
		return res.status(500).json({ error: "Failed to get admin info." });
	}
}

// --- Ban a user ---
export async function banUser(req, res) {
	const { reportedUid, reporterUid, reportID, report, reason, reportedDate, adminId } = req.body;
	if (!reportedUid || typeof reportedUid !== 'string' || !reportedUid.trim()) {
		return res.status(400).json({ success: false, error: 'Invalid reported user ID.' });
	}
	if (!reportID || typeof reportID !== 'string' || !reportID.trim()) {
		console.log('Invalid reportID:', reportID);
		return res.status(400).json({ success: false, error: 'Invalid report ID.' });
	}
	try {
		const banUserRef = db.collection("bannedUsers").doc(reportedUid);
		const banUserSnap = await banUserRef.get();
		if (banUserSnap.exists) {
			return res.status(400).json({ success: false, error: 'User is already banned.' });
		}
		// ...existing code...
		const banBatch = db.batch();
		const banReportRef = db.collection("reports").doc(reportID);
		const banHistoryRef = db.collection("banHistory").doc(`${reportedUid}_${Date.now()}`);
		banBatch.set(banUserRef, {
			banDate: admin.firestore.FieldValue.serverTimestamp(),
			reportedBy: reporterUid,
			report: report,
			banReason: reason,
			reportID: reportID,
			reportedDate: reportedDate
		});
		banBatch.set(banReportRef, {
			status: "resolved",
			outcome: "banned",
			outcomeReason: reason,
			resolvedBy: adminId,
			resolvedAt: admin.firestore.FieldValue.serverTimestamp()
		}, { merge: true });
		banBatch.set(banHistoryRef, {
			bannedUid: reportedUid,
			banDate: admin.firestore.FieldValue.serverTimestamp(),
			reportedBy: reporterUid,
			banReason: reason,
			reportID: reportID,
			reportedDate: reportedDate
		});
		await banBatch.commit();
		return res.json({ success: true });
	} catch (error) {
		console.error("Error banning user:", error);
		console.log('Ban user error details:', { reportedUid, reporterUid, reportID, report, reason, reportedDate, adminId });
		return res.status(500).json({ success: false, error: error.message || "Failed to ban user." });
	}
}

// --- Unban a user ---
export async function unbanUser(req, res) {
	const { userId, unbannedBy } = req.body;
	try {
		const unbanUserRef = db.collection("bannedUsers").doc(userId);
		const unbanUserSnap = await unbanUserRef.get();
		if (!unbanUserSnap.exists) {
			return res.status(400).json({ success: false, error: 'User is not currently banned.' });
		}
		const unbanBatch = db.batch();
		const unbanHistoryRef = db.collection("banHistory").doc(`${userId}_unban_${Date.now()}`);
		const unbanHistoryData = {
			unbannedUid: userId,
			unbanDate: admin.firestore.FieldValue.serverTimestamp(),
		};
		if (unbannedBy) unbanHistoryData.unbannedBy = unbannedBy;
		unbanBatch.set(unbanHistoryRef, unbanHistoryData);
		unbanBatch.delete(unbanUserRef);
		await unbanBatch.commit();
		return res.json({ success: true });
	} catch (error) {
		console.error("Error unbanning user:", error);
		return res.status(500).json({ success: false, error: error.message || "Failed to unban user." });
	}
}

// --- Dismiss a report ---
export async function dismissReport(req, res) {
	const { reportId, reason, adminId } = req.body;
	if (!reportId || typeof reportId !== 'string' || !reportId.trim()) {
		return res.status(400).json({ success: false, error: 'Invalid report ID.' });
	}
	try {
		const reportRef = db.collection("reports").doc(reportId);
		const reportSnap = await reportRef.get();
		if (!reportSnap.exists) {
			return res.status(404).json({ success: false, error: 'Report does not exist.' });
		}
		await reportRef.set({
			status: "resolved",
			outcome: "dismissed",
			outcomeReason: reason,
			resolvedBy: adminId,
			resolvedAt: admin.firestore.FieldValue.serverTimestamp()
		}, { merge: true });
		return res.json({ success: true });
	} catch (error) {
		console.error("Error dismissing report:", error);
		return res.status(500).json({ success: false, error: error.message || "Failed to dismiss report." });
	}
}

// --- Get all banned users ---
export async function getBannedUsers(req, res) {
	try {
		const snapshot = await db.collection("bannedUsers").get();
		const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
		return res.json({ users });
	} catch (error) {
		console.error("Error getting banned users:", error);
		return res.status(500).json({ error: "Failed to get banned users." });
	}
}

// --- Check if user is banned ---
export async function isBannedUser(req, res) {
	const { userId } = req.params;
	try {
		const userRef = db.collection("bannedUsers").doc(userId);
		const snapshot = await userRef.get();
		return res.json({ banned: snapshot.exists });
	} catch (error) {
		console.error("Error checking if user is banned:", error);
		return res.status(500).json({ error: "Failed to check if user is banned." });
	}
}


// POST /report - report a user
export async function reportUser(req, res) {
  const { reporterUid, reportedUid, reason, flaggedMessage, messageId, reporterUsername, reportedUsername } = req.body; // <-- Add reporterUsername and reportedUsername
  if (!reporterUid || !reportedUid) {
    return res.status(400).json({ error: "Missing fields" });
  }
  if (!reason && !flaggedMessage) {
    return res.status(400).json({ error: "Either reason or flaggedMessage must be provided" });
  }
  try {
    // Check for duplicate report by messageId
    if (messageId) {
      const existing = await db.collection("reports")
        .where("messageId", "==", messageId)
        .limit(1)
        .get();
      if (!existing.empty) {
        return res.status(409).json({ error: "This message has already been reported." });
      }
    }

    const reportData = {
      reporterUid,
      reportedUid,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
    if (reason) reportData.reason = reason;
    if (flaggedMessage) reportData.flaggedMessage = flaggedMessage;
    if (messageId) reportData.messageId = messageId;
    if (reporterUsername) reportData.reporterUsername = reporterUsername; // <-- Store reporterUsername
    if (reportedUsername) reportData.reportedUsername = reportedUsername; // <-- Store reportedUsername

    const docRef = await db.collection("reports").add(reportData);
    res.json({ ok: true, id: docRef.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save report" });
  }
}

// POST /block - block a user
export async function blockUser(req, res) {
	const { uid, targetUid } = req.body;
	if (!uid || !targetUid) return res.status(400).json({ error: "Missing fields" });
	try {
		await db.collection("users").doc(uid).set({
			blocked: admin.firestore.FieldValue.arrayUnion(targetUid)
		}, { merge: true });
		res.json({ ok: true });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Failed to block user" });
	}
}

// POST /unblock - unblock a user
export async function unblockUser(req, res) {
	const { uid, targetUid } = req.body;
	if (!uid || !targetUid) return res.status(400).json({ error: "Missing fields" });
	try {
		const userRef = db.collection("users").doc(uid);
		const userDoc = await userRef.get();
		if (!userDoc.exists) {
			await userRef.set({ blocked: [] });
		}
		await userRef.update({
			blocked: admin.firestore.FieldValue.arrayRemove(targetUid)
		});
		res.json({ ok: true });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Failed to unblock user" });
	}
}

// GET /listBlocked/:uid - list blocked users
export async function listBlocked(req, res) {
	const { uid } = req.params;
	if (!uid) return res.status(400).json({ error: "Missing uid" });
	try {
		const userRef = db.collection("users").doc(uid);
		const userDoc = await userRef.get();
		if (!userDoc.exists) {
			await userRef.set({ blocked: [] });
			return res.json({ blocked: [] });
		}
		const blocked = userDoc.data().blocked || [];
		res.json({ blocked });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Failed to fetch blocked users" });
	}
}

// --- Get total number of banned users ---
export async function getBannedUserCount(req, res) {
    try {
        const snapshot = await db.collection("bannedUsers").get();
        return res.json({ count: snapshot.size });
    } catch (error) {
        console.error("Error getting banned user count:", error);
        return res.status(500).json({ error: "Failed to get banned user count." });
    }
}

// --- Get total number of reported users ---
export async function getReportedUserCount(req, res) {
    try {
        const snapshot = await db.collection("reports").get();
        return res.json({ count: snapshot.size });
    } catch (error) {
        console.error("Error getting reported user count:", error);
        return res.status(500).json({ error: "Failed to get reported user count." });
    }
}

// --- Get unresolved reports ---
export async function getUnresolvedReports(req, res) {
    try {
        const snapshot = await db.collection("reports").get();
        const filtered = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (!data.status || data.status !== 'resolved') {
                filtered.push({
                    id: docSnap.id,
                    ...data,
                    reporterUsername: data.reporterUsername || data.reporterUid,
                    reportedUsername: data.reportedUsername || data.reportedUid
                });
            }
        });
        return res.json({ reports: filtered, empty: filtered.length === 0, size: filtered.length });
    } catch (error) {
        console.error("Error getting unresolved reports:", error);
        return res.status(500).json({ error: "Failed to get unresolved reports." });
    }
}

// --- Get resolved reports ---
export async function getResolvedReports(req, res) {
    try {
        const snapshot = await db.collection("reports").get();
        const resolved = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.status === 'resolved' || data.status === 'dismissed') {
                resolved.push({
                    id: docSnap.id,
                    ...data,
                    reporterUsername: data.reporterUsername || data.reporterUid,
                    reportedUsername: data.reportedUsername || data.reportedUid
                });
            }
        });
        return res.json({ reports: resolved, empty: resolved.length === 0, size: resolved.length });
    } catch (error) {
        console.error("Error getting resolved reports:", error);
        return res.status(500).json({ error: "Failed to get resolved reports." });
    }
}

// --- Get all reports ---
export async function getAllReports(req, res) {
    try {
        const snapshot = await db.collection("reports").get();
        const reports = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                reporterUsername: data.reporterUsername || data.reporterUid,
                reportedUsername: data.reportedUsername || data.reportedUid
            };
        });
        return res.json({ reports });
    } catch (error) {
        console.error("Error getting all reports:", error);
        return res.status(500).json({ error: "Failed to get all reports." });
    }
}

// --- Get total number of active users ---
export async function getActiveUserCount(req, res) {
    try {
        const snapshot = await db.collection("users").get();
        return res.json({ count: snapshot.size });
    } catch (error) {
        console.error("Error getting active user count:", error);
        return res.status(500).json({ error: "Failed to get active user count." });
    }
}
