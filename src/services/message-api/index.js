import express from "express";
import chatRoutes from "./routes/messageRoutes.js";

const app = express();

// Built-in JSON parser (no need for body-parser)
app.use(express.json());

// Chat routes
app.use("/api/chat", chatRoutes);

//test route
app.get("/", (req, res) => res.send("Server is alive!"));


const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
