const fetch = require('node-fetch');
const express = require("express");
const multer = require("multer");

const app = express();
const router = express.Router();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CONFIG ---
const CLARIFAI_API_KEY = process.env.CLARIFAI_API_KEY || "3322dba4bf694fd99b8065d57fba6494";
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 🚀 MAIN FUNCTIONALITY ROUTES
// ==========================================

// Health Check
router.get("/health", (req, res) => res.send("API is active"));

// 1. Detect Food (Clarifai)
router.post("/detect-food", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image provided" });

    const response = await fetch(
      `https://api.clarifai.com/v2/models/food-item-recognition/versions/1d5fd481e0cf4826aa72ec3ff049e044/outputs`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${CLARIFAI_API_KEY}`,
          "Content-Type": "application/json",
          "User-Agent": "Vercel"
        },
        body: JSON.stringify({
          user_app_id: { user_id: "clarifai", app_id: "main" },
          inputs: [{ data: { image: { base64: req.file.buffer.toString("base64") } } }]
        })
      }
    );

    const data = await response.json();
    const concept = data.outputs?.[0]?.data?.concepts?.[0];

    if (!concept) return res.status(400).json({ error: "No food detected" });
    res.json({ food: concept.name, confidence: concept.value });
  } catch (err) {
    console.error("Detection Error:", err);
    res.status(500).json({ error: "Food detection failed" });
  }
});

// 2. Check Recalls (USDA)
router.get("/check-recalls", async (req, res) => {
  try {
    const food = req.query.food || "";
    const response = await fetch("https://www.fsis.usda.gov/fsis/api/recall/v/1?field_closed_year_id=All&langcode=English");
    const data = await response.json();
    
    const matches = data.filter(item => 
      `${item.field_title} ${item.field_product_items}`.toLowerCase().includes(food.toLowerCase())
    );
    
    res.json({ recalls: matches });
  } catch (err) {
    console.error("USDA Error:", err);
    res.json({ warning: true, message: "USDA search failed", recalls: [] });
  }
});

// --- MOUNT ROUTER ---
app.use("/api", router);
app.use("/", router);

module.exports = app;