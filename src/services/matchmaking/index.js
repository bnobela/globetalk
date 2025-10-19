import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import matchRoutes from "./routes/matchRoutes.js";


dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Firebase Admin SDK is initialized automatically on import

// Health check
app.get("/", (req, res) => res.send("Globetalk Matchmaking API is live ✅"));

// API routes
app.use("/api/match", matchRoutes);

// Start server
const PORT = process.env.PORT || 8082; 
app.listen(PORT, () => console.log(`🚀 Matchmaking API running on port ${PORT}`));
