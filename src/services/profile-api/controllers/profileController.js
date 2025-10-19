
import {admin} from '../firebaseAdmin.js';

const db = admin.firestore();

/**
 * Create or update user profile
 * @param {string} userId
 * @param {Object} profileData
 * @returns {Promise<boolean>}
 */
export async function saveUserProfile(userId, profileData) {
  try {
    await db.collection("users").doc(userId).set(profileData, { merge: true });
    console.log("Profile saved successfully!");
    return true;
  } catch (error) {
    console.error("Error saving profile: ", error);
    return false;
  }
}

/**
 * Get user profile by userId
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
export async function getUserProfile(userId) {
  try {
    const docSnap = await db.collection("users").doc(userId).get();
    if (docSnap.exists) {
      return docSnap.data();
    } else {
      console.log("No such profile!");
      return null;
    }
  } catch (error) {
    console.error("Error getting profile: ", error);
    return null;
  }
}

/**
 * Update specific profile fields
 * @param {string} userId
 * @param {Object} updates
 * @returns {Promise<boolean>}
 */
export async function updateUserProfile(userId, updates) {
  try {
    await db.collection("users").doc(userId).update(updates);
    console.log("Profile updated successfully!");
    return true;
  } catch (error) {
    console.error("Error updating profile: ", error);
    return false;
  }
}

/**
 * Assign a random username to a user
 * @param {string} uid
 * @returns {Promise<string>}
 */
export async function assignUsername(uid) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const usernamesRef = db.collection("usernames");
    const snapshot = await usernamesRef.where("assignedTo", "==", null).limit(10).get();
    if (snapshot.empty) throw new Error("No usernames left");

    const chosen = snapshot.docs[Math.floor(Math.random() * snapshot.docs.length)];
    
    try {
      await db.runTransaction(async (tx) => {
        const docSnap = await tx.get(chosen.ref);
        if (docSnap.data().assignedTo) throw new Error("Taken");
        tx.update(chosen.ref, { assignedTo: uid, assignedAt: admin.firestore.FieldValue.serverTimestamp() });
        tx.set(db.collection("users").doc(uid), { username: chosen.id }, { merge: true });
      });
      return chosen.id;
    } catch (err) {
      console.warn("Retrying…", err.message);
    }
  }
  throw new Error("Failed to claim username after retries");
}