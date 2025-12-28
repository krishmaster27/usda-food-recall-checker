import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// ------------------- CONFIG -------------------
// Replace with your actual Clarifai credentials
const CLARIFAI_API_KEY = "3322dba4bf694fd99b8065d57fba6494";
const USER_ID = "clarifai";   // from Clarifai dashboard
const APP_ID = "main";     // from Clarifai dashboard
const MODEL_ID = "food-item-recognition";
const MODEL_VERSION = "1d5fd481e0cf4826aa72ec3ff049e044";
// ---------------------------------------------

// Multer setup for in-memory uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Serve static files
app.use(express.static(__dirname));

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// POST endpoint to detect food
app.post("/detect-food", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    const base64Image = req.file.buffer.toString("base64");

    // Clarifai API request
    const clarifaiResponse = await fetch(
      `https://api.clarifai.com/v2/models/${MODEL_ID}/versions/${MODEL_VERSION}/outputs`,
      {
        method: "POST",
        headers: {
          "Authorization": `Key ${CLARIFAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_app_id: {
            user_id: USER_ID,
            app_id: APP_ID
          },
          inputs: [
            { data: { image: { base64: base64Image } } }
          ]
        })
      }
    );

    if (!clarifaiResponse.ok) {
      const text = await clarifaiResponse.text();
      console.error("Clarifai API error:", text);
      return res.status(clarifaiResponse.status).send(text);
    }

    const data = await clarifaiResponse.json();
    const concepts = data.outputs[0].data.concepts;

    if (!concepts || concepts.length === 0) {
      return res.status(400).json({ error: "No food detected" });
    }

    // Return top food prediction
    res.json({
      top_food: concepts[0].name,
      confidence: concepts[0].value
    });

  } catch (err) {
    console.error("Server error in /detect-food:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
