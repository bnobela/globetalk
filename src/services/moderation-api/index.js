import express from "express";
import cors from "cors";
import moderationRoutes from "./routes/moderationRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

// Use moderation routes
app.use("/api/moderation", moderationRoutes);

app.listen(PORT, () => {
  console.log(`Moderation API running on port ${PORT}`);
});
