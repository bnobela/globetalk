import { admin } from "../firebaseAdmin.js";

const db = admin.firestore();

/**
 * Find a random match for a user based on preferences.
 * @param {string} userId - UID of the requester
 * @param {Object} prefs - { language, region, interest }
 * @returns {Promise<Object|null>} - matched user data or null if none
 */
export async function getRandomMatch(userId, prefs) {
  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid userId: must be a non-empty string");
  }
  if (!prefs || typeof prefs !== "object") {
    throw new Error("Invalid preferences: must be an object");
  }

  const { language, region } = prefs;

  if (!language || !region) {
    throw new Error("Language and region are required");
  }

  // normalize inputs for comparison
  const langNorm = language.toLowerCase();
  const regionNorm = region.toLowerCase();

  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) throw new Error(`User not found: ${userId}`);
  const requester = userSnap.data();

  const pastMatches = Array.isArray(requester?.matchedWith) ? requester.matchedWith : [];

  const usersRef = db.collection("users");

  // Firestore query
  let snapshot;
  try {
    snapshot = await usersRef
      .where("languages", "array-contains", language)
      .where("region", "==", region)
      .get();
  } catch (queryError) {
    throw new Error(`Database query failed: ${queryError.message}`);
  }

  // In-memory filtering with robust checks
  const candidates = snapshot.docs
    .map(docSnap => {
      const data = docSnap.data();
      if (!data || docSnap.id === userId) return null;

      const candidateLanguages = Array.isArray(data.languages) ? data.languages : [];
      const candidateMatches = Array.isArray(data.matchedWith) ? data.matchedWith : [];

      const candidateLanguagesNorm = candidateLanguages.map(l => l.toLowerCase());
      const alreadyMatched = pastMatches.includes(docSnap.id) || candidateMatches.includes(userId);
      const languageMatch = candidateLanguagesNorm.includes(langNorm);
      const regionMatch = (data.region || "").toLowerCase() === regionNorm;

      if (alreadyMatched || !languageMatch || !regionMatch) return null;

      return { id: docSnap.id, ...data };
    })
    .filter(Boolean);

  if (candidates.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * candidates.length);
  const match = candidates[randomIndex];

  // Transaction to update both users
  try {
    await db.runTransaction(async (transaction) => {
      const requesterDocSnap = await transaction.get(userRef);
      const matchRef = db.collection("users").doc(match.id);
      const matchDocSnap = await transaction.get(matchRef);

      if (!requesterDocSnap.exists || !matchDocSnap.exists) {
        throw new Error("One of the users no longer exists");
      }

      const currentRequesterMatches = Array.isArray(requesterDocSnap.data()?.matchedWith)
        ? requesterDocSnap.data().matchedWith
        : [];
      const currentMatchMatches = Array.isArray(matchDocSnap.data()?.matchedWith)
        ? matchDocSnap.data().matchedWith
        : [];

      if (currentRequesterMatches.includes(match.id) || currentMatchMatches.includes(userId)) {
        throw new Error("Users already matched (race condition detected)");
      }
      transaction.update(userRef, {
        matchedWith: admin.firestore.FieldValue.arrayUnion(match.id)
      });
      transaction.update(matchRef, {
        matchedWith: admin.firestore.FieldValue.arrayUnion(userId)
      });
    });
  } catch (transactionError) {
    console.error("Transaction failed:", transactionError);
    return null;
  }

  // return safe match data
  return {
    id: match.id,
    name: match.username || "Anonymous",
    languages: match.languages || [],
    region: match.region || "",
    hobbies: match.hobbies || [],
    bio: match.bio || ""
  };
}

/**
 * Send a penpal request from one user to another.
 * @param {string} fromUid - Requesting user's UID
 * @param {string} fromUsername - Requesting user's username
 * @param {string} toUid - Requested user's UID
 * @param {string} toUsername - Requested user's username
 * @returns {Promise<Object>} - Penpal request info
 */
export async function sendPenpalRequest(fromUid, fromUsername, toUid, toUsername) {
  if (!fromUid || !toUid || !fromUsername || !toUsername) {
    throw new Error("All parameters are required");
  }
  if (fromUid === toUid) {
    throw new Error("Cannot send request to yourself");
  }

  // Create a unique, sorted document ID
  const [uidA, uidB] = [fromUid, toUid].sort();
  const docId = `${uidA}_${uidB}`;
  const penpalRef = db.collection("penpals").doc(docId);

  // Check if a request or relationship already exists
  const existing = await penpalRef.get();
  if (existing.exists) {
    const data = existing.data();
    if (data.status === "accepted") {
      throw new Error("You are already penpals");
    }
    if (
      (data.status === "pending" && data.requestedBy === fromUid) ||
      (data.status === "pending" && data.requestedBy === toUid)
    ) {
      throw new Error("A request is already pending between these users");
    }
  }

  // Store all necessary info for both users
  const penpalData = {
    users: [
      { uid: fromUid, username: fromUsername },
      { uid: toUid, username: toUsername }
    ],
    userIds: [fromUid, toUid], // <-- Add this line
    requestedBy: fromUid,
    requestedTo: toUid,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await penpalRef.set(penpalData);

  return {
    id: docId,
    ...penpalData
  };
}

/**
 * Accept a penpal request.
 * @param {string} docId - Penpal document ID
 * @param {string} userId - User accepting the request
 * @returns {Promise<void>}
 */
export async function acceptPenpalRequest(docId, userId) {
  const penpalRef = db.collection("penpals").doc(docId);
  await penpalRef.update({
    status: "accepted",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    acceptedBy: userId
  });
}

/**
 * Decline a penpal request.
 * @param {string} docId - Penpal document ID
 * @param {string} userId - User declining the request
 * @returns {Promise<void>}
 */
export async function declinePenpalRequest(docId, userId) {
  const penpalRef = db.collection("penpals").doc(docId);
  await penpalRef.update({
    status: "declined",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    declinedBy: userId
  });
}

/**
 * Get all penpals for a user, paginated.
 * @param {string} userId
 * @param {number} [pageSize=20]
 * @param {string} [pageToken] - Document ID to start after (for pagination)
 * @returns {Promise<{ penpals: Array, nextPageToken: string|null }>}
 */
export async function getPenpals(userId, pageSize = 20, pageToken = null) {
  if (!userId) throw new Error("userId required");

  let query = db.collection("penpals")
    .where("status", "==", "accepted")
    .where("userIds", "array-contains", userId) // <-- Use userIds
    .orderBy("createdAt", "desc")
    .limit(pageSize);

  if (pageToken) {
    const lastDoc = await db.collection("penpals").doc(pageToken).get();
    if (lastDoc.exists) {
      query = query.startAfter(lastDoc);
    }
  }

  const snapshot = await query.get();
  const penpals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const nextPageToken = snapshot.docs.length === pageSize
    ? snapshot.docs[snapshot.docs.length - 1].id
    : null;

  return { penpals, nextPageToken };
}

/**
 * Get all pending penpal requests for a user, paginated.
 * @param {string} userId
 * @param {number} [pageSize=20]
 * @param {string} [pageToken] - Document ID to start after (for pagination)
 * @returns {Promise<{ requests: Array, nextPageToken: string|null }>}
 */
export async function getPendingPenpalRequests(userId, pageSize = 20, pageToken = null) {
  if (!userId) throw new Error("userId required");

  let query = db.collection("penpals")
    .where("requestedTo", "==", userId)
    .where("status", "==", "pending")
    .orderBy("createdAt", "desc")
    .limit(pageSize);

  if (pageToken) {
    const lastDoc = await db.collection("penpals").doc(pageToken).get();
    if (lastDoc.exists) {
      query = query.startAfter(lastDoc);
    }
  }

  const snapshot = await query.get();
  const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const nextPageToken = snapshot.docs.length === pageSize
    ? snapshot.docs[snapshot.docs.length - 1].id
    : null;

  return { requests, nextPageToken };
}

/**
 * Get all pending penpal requests SENT BY the user, paginated.
 * @param {string} userId
 * @param {number} [pageSize=20]
 * @param {string} [pageToken] - Document ID to start after (for pagination)
 * @returns {Promise<{ requests: Array, nextPageToken: string|null }>}
 */
export async function getSentPenpalRequests(userId, pageSize = 20, pageToken = null) {
  if (!userId) throw new Error("userId required");

  let query = db.collection("penpals")
    .where("requestedBy", "==", userId)
    .where("status", "==", "pending")
    .orderBy("createdAt", "desc")
    .limit(pageSize);

  if (pageToken) {
    const lastDoc = await db.collection("penpals").doc(pageToken).get();
    if (lastDoc.exists) {
      query = query.startAfter(lastDoc);
    }
  }

  const snapshot = await query.get();
  const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const nextPageToken = snapshot.docs.length === pageSize
    ? snapshot.docs[snapshot.docs.length - 1].id
    : null;

  return { requests, nextPageToken };
}


