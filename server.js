import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ✅ Serve your homepage directly from root
app.use(express.static(__dirname));

// ✅ Serve JS and CSS from your src/frontend folders
app.use("/scripts", express.static(path.join(__dirname, "src/frontend/scripts")));
app.use("/styles", express.static(path.join(__dirname, "src/frontend/styles")));

// ✅ Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ Health check for Azure
app.get("/health", (req, res) => res.send("Frontend is live!"));

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frontend running on port ${PORT}`));
