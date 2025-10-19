// src/services/firebase.js
import { 
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
} from "firebase/auth";
import { initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);
const secretKey = "groupBKPTN9";

export function observeUser(callback) {
  return onAuthStateChanged(auth, callback);
}

export function observeToken(callback) {
  return onIdTokenChanged(auth, callback);
}


export async function signInWithGoogle() {

  const result = await signInWithPopup(auth, googleProvider);

  const user = result.user;

  return { user };
}


export async function logout() {

  await signOut(auth);
  localStorage.removeItem("idToken");
  localStorage.removeItem("policiesAccepted");
  console.log("User signed out.");
}

export {
  auth,
  googleProvider,
  db,
  secretKey,
  signInWithPopup,
  signOut,
  onAuthStateChanged
};
