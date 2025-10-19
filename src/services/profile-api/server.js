
import express from "express";
import profileRoutes from "./routes/profileRoutes.js";
import cors from "cors";

const app = express();
app.use(cors()); // Enable CORS
app.use(express.json()); // parse JSON bodies

// Mount profile routes
app.use("/api/profile", profileRoutes);

//test route
app.get("/", (req, res) => res.send("Server is running"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

