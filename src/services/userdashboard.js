import { db } from './firebase.js';
import { doc, getDoc, query, collection, where, orderBy, getDocs, documentId } from "firebase/firestore";


export async function getPenPalSuggestions(userid) {
  // Get current user's hobbies
  const userDoc = await getDoc(doc(db, "users", userid));
  if (!userDoc.exists()) return [];
  const currentHobbies = userDoc.data().hobbies || [];
  const matchedWith = userDoc.data().matchedWith || [];
  if (!Array.isArray(currentHobbies) || currentHobbies.length === 0) return [];

  // Get all users except current
  const q = query(
    collection(db, "users"),
    where(documentId(),"!=", userid)
  );
  const snap = await getDocs(q);
  // Filter users with at least one hobby in common, limit to 6
  return snap.docs
    .map(doc => ({
      _docId: doc.id,
      ...doc.data()
    }))
    .filter(user => {
      const hobbies = user.hobbies || [];
      if (!Array.isArray(hobbies) || hobbies.length === 0) return false;

      // Skip if user already matched
      if (matchedWith.includes(user._docId)) return false;
      
      return hobbies.some(hobby => currentHobbies.includes(hobby));
    })
    .slice(0, 6);
}

/**
 * Get active pen pals for a user by reading their matchedWith array
 * @param {string} userid
 * @returns {Promise<Array>} - array of user profiles
 */
export async function getActivePenPals(userid) {
  // Read the user's document to get matchedWith
  const userDoc = await getDoc(doc(db, "users", userid));
  if (!userDoc.exists()) return [];
  const matched = userDoc.data().matchedWith || [];
  if (!Array.isArray(matched) || matched.length === 0) return [];

  // Fetch each matched user's profile
  const results = [];
  for (const id of matched) {
    try {
      const d = await getDoc(doc(db, "users", id));
      if (d.exists()) {
        results.push({ _docId: d.id, ...d.data() });
      }
    } catch (err) {
      console.warn(`Failed to load matched user ${id}:`, err.message);
    }
  }

  return results;
}
