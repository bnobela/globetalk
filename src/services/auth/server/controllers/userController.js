// import the initialized admin instance for Firestore access
// next we create user-related functions
// these will be used in our routes to handle user data
// such as checking if a user exists and creating a new user
// we assume a "users" collection in Firestore
// each user document is identified by their UID
// and contains fields like email, displayName, createdAt, etc.
// we use async/await for asynchronous Firestore operations
// and handle errors appropriately
// finally we export the functions for use in our routes
// this file only handles Firestore user data ensuring separation of concerns from auth logic
import {admin} from "../firebaseAdmin.js";
// Firebase Admin was initialized in firebaseAdmin.js

function getFirestore() {
  return admin.firestore();
}
function getUsersCollection() {
  return getFirestore().collection("users");
}
// create a reference to the "users" collection
const usersCollection = getUsersCollection();

// export the functions

/**
 * Check if a user exists by UID
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function userExists(uid) {
  const doc = await usersCollection.doc(uid).get();
  return doc.exists;
}

/**
 * Create a new user in Firestore
 * @param {Object} userData - { uid, email, displayName }
 * @returns {Promise<Object>} - created user data
 */
export async function createUser(userData) {
  const { uid, email, displayName } = userData;
  const docRef = usersCollection.doc(uid);
  await docRef.set({
    email,
    displayName: displayName || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const newUserDoc = await docRef.get();
  return newUserDoc.data();
}
// in here we define two main functions:
// userExists - checks if a user document exists in Firestore by UID
// createUser - creates a new user document with provided data
// both functions interact with the "users" collection
// and return appropriate results or throw errors if something goes wrong
// this keeps our user data management clean and modular