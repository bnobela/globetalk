// in here we define the Express routes for user-related operations
// we use the verifyToken middleware to protect these routes
// ensuring only authenticated requests can access them
// we import the user controller functions to handle the actual logic
// such as checking if a user exists and creating a new user
// the routes are mounted under /api/users in the main server file
// we handle errors and send appropriate HTTP responses
// finally we export the router for use in the main server file
// from the root, path to this file is src/services/auth/server/routes/users.js
import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { userExists, createUser } from "../controllers/userController.js";

//define the router which will hold our user-related routes
const router = express.Router();

// GET /api/users/:uid/exists - check if user exists
router.get("/:uid/exists", verifyToken, async (req, res) => {
  const { uid } = req.params;
  try {
    const exists = await userExists(uid);
    res.json({ exists });
  } catch (err) {
    console.error("Error checking user existence:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/users - create a new user
router.post("/", verifyToken, async (req, res) => {
  const { uid, email, displayName } = req.body;
  if (!uid || !email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const user = await createUser({ uid, email, displayName });
    res.status(201).json({ user });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
//what we did here:
// 1. Created an Express router for user-related routes
// 2. Added a GET route to check if a user exists by UID
// 3. Added a POST route to create a new user
// 4. Used the verifyToken middleware to protect the routes
// 5. Handled errors and sent appropriate HTTP responses
// 6. Exported the router for use in the main server file
// This file defines user-related routes for the authentication service
// It uses middleware to verify tokens and controllers to handle logic
// The routes allow checking if a user exists and creating new users
// This keeps the route definitions clean and focused on HTTP handling