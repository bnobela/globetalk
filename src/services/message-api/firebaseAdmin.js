import dotenv from "dotenv";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";


// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from project root
const envPath = path.resolve(__dirname, "../../../.env");
console.log("Attempting to load .env from:", envPath);
dotenv.config({ path: envPath });

console.log("FIREBASE_SERVICE_ACCOUNT:", !!process.env.FIREBASE_SERVICE_ACCOUNT);
/**
 * Exports the `admin` instance for use across the server.
 *
 * Environment variable required (imported from root .env):
 *   FIREBASE_SERVICE_ACCOUNT  -> JSON string of the service account
 */

// Always initialize on import
if (!admin.apps.length) {

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT not set in environment");
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON");
  }
  admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase Admin initialized");
}

export { admin };
