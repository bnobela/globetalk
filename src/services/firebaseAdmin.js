//import firebaseAdmin from "firebase-admin";
import admin from "firebase-admin";

// Initialize Firebase Admin SDK
let initialized = false;
export function initFirebaseAdmin() {
  if (!initialized && admin.apps.length === 0) {
    // Load service account from env
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : undefined;
    if (!serviceAccount) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT env variable not set");
    }
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    initialized = true;
  }
  return admin;
}

// export the initialized admin instance
export { admin };

// This file sets up and exports the Firebase Admin SDK for server-side use.
// It reads the service account credentials from environment variables for security.
// Make sure to set the FIREBASE_SERVICE_ACCOUNT environment variable with your service account JSON.
// Example: export FIREBASE_SERVICE_ACCOUNT='{"type": "...", "project_id": "...", ...}'
// You can then import { admin } from this file to use Firebase Admin features like authentication and Firestore.
