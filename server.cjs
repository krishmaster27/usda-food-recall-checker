const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const twilio = require("twilio");

const app = express();
const PORT = 3000;

// ---------- MIDDLEWARE ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ---------- FILE PATHS ----------
const remindersPath = path.join(__dirname, "reminders.json");
const usersPath = path.join(__dirname, "users.json");

// ---------- CLARIFAI CONFIG ----------
const CLARIFAI_API_KEY = "3322dba4bf694fd99b8065d57fba6494";
const USER_ID = "clarifai";
const APP_ID = "main";
const MODEL_ID = "food-item-recognition";
const MODEL_VERSION = "1d5fd481e0cf4826aa72ec3ff049e044";

// ---------- TWILIO CONFIG ----------
const TWILIO_ACCOUNT_SID = "ACc8e2e10c293ca9f29c9475aeb47f2bf8";
const TWILIO_AUTH_TOKEN = "fe4ec513924d31307945305c31bdb5fd";
const TWILIO_PHONE_NUMBER = "+1234567890";
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// ---------- MULTER ----------
const upload = multer({ storage: multer.memoryStorage() });

// ---------- HELPER FUNCTIONS ----------
function loadUsers() {
  if (!fs.existsSync(usersPath)) return [];
  return JSON.parse(fs.readFileSync(usersPath, "utf8"));
}

function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

// ---------- TWILIO SMS FUNCTION ----------
async function sendExpirationSMS(phone, product, expiresOn) {
  try {
    await twilioClient.messages.create({
      body: `Reminder: ${product} expires on ${expiresOn}.`,
      from: TWILIO_PHONE_NUMBER,
      to: phone
    });
    console.log(`SMS sent to ${phone} for ${product}`);
  } catch (err) {
    console.error("Failed to send SMS:", err);
  }
}

// =====================
// 🔐 AUTH ROUTES
// =====================

// SIGN UP
app.post("/sign-up", (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ success: false });

  let users = loadUsers();
  if (users.some(u => u.phone === phone)) {
    return res.json({ success: false, message: "User exists" });
  }

  const newUser = { phone, password };
  users.push(newUser);
  saveUsers(users);

  res.json({ success: true, user: newUser });
});

// SIGN IN
app.post("/sign-in", (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ success: false });

  const users = loadUsers();
  const user = users.find(u => u.phone === phone && u.password === password);

  if (!user) return res.json({ success: false });
  res.json({ success: true, user });
});

// =====================
// 📦 API ROUTES
// =====================

// HOME
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);

// ---------- CLARIFAI FOOD DETECTION (FIXED) ----------
app.post("/detect-food", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const base64Image = req.file.buffer.toString("base64");

    const response = await fetch(
      `https://api.clarifai.com/v2/models/${MODEL_ID}/versions/${MODEL_VERSION}/outputs`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${CLARIFAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_app_id: {
            user_id: USER_ID,
            app_id: APP_ID
          },
          inputs: [
            {
              data: {
                image: { base64: base64Image }
              }
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Clarifai error:", text);
      return res.status(500).json({ error: "Clarifai request failed" });
    }

    const data = await response.json();
    const concepts = data.outputs?.[0]?.data?.concepts;

    if (!concepts || concepts.length === 0) {
      return res.status(400).json({ error: "No food detected" });
    }

    res.json({
      food: concepts[0].name,
      confidence: concepts[0].value
    });
  } catch (err) {
    console.error("Detect food error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// ⏰ REMINDERS
// =====================

app.get("/get-reminders", (req, res) => {
  const phone = req.query.phone;
  if (!phone) return res.json({ reminders: [] });

  if (!fs.existsSync(remindersPath)) return res.json({ reminders: [] });

  const reminders = JSON.parse(fs.readFileSync(remindersPath, "utf8"));
  res.json({ reminders: reminders.filter(r => r.phone === phone) });
});

app.post("/add-reminder", async (req, res) => {
  const { phone, product, expiresOn, remindBeforeDays } = req.body;
  if (!phone || !product || !expiresOn) return res.json({ success: false });

  let reminders = [];
  if (fs.existsSync(remindersPath)) {
    reminders = JSON.parse(fs.readFileSync(remindersPath, "utf8"));
  }

  reminders.push({
    phone,
    product: product.trim(),
    expiresOn,
    remindBeforeDays: parseInt(remindBeforeDays) || 0
  });

  fs.writeFileSync(remindersPath, JSON.stringify(reminders, null, 2));
  await sendExpirationSMS(phone, product, expiresOn);

  res.json({ success: true });
});

app.post("/delete-reminder", (req, res) => {
  const { phone, product, expiresOn } = req.body;
  if (!phone || !product || !expiresOn) return res.json({ success: false });

  if (!fs.existsSync(remindersPath)) return res.json({ success: false });

  let reminders = JSON.parse(fs.readFileSync(remindersPath, "utf8"));
  const before = reminders.length;

  reminders = reminders.filter(
    r => !(r.phone === phone && r.product === product && r.expiresOn === expiresOn)
  );

  fs.writeFileSync(remindersPath, JSON.stringify(reminders, null, 2));
  res.json({ success: reminders.length < before });
});

// ---------- USDA RECALL CHECK ----------
app.get("/check-recalls", async (req, res) => {
  const food = req.query.food;
  if (!food) {
    return res.status(400).json({ error: "Missing food query" });
  }

  const USDA_URL =
    "https://www.fsis.usda.gov/fsis/api/recall/v/1?field_closed_year_id=All&langcode=English";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(USDA_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`USDA HTTP ${response.status}`);
    }

    const data = await response.json();
    const recalls = data.recall || [];

    const matches = recalls.filter(item => {
      const text = [
        item.field_title,
        item.field_product_items,
        item.field_summary
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(food.toLowerCase());
    });

    res.json({ recalls: matches });
  } catch (err) {
    clearTimeout(timeout);
    console.error("USDA fetch failed:", err.message);

    res.json({
      warning: true,
      message:
        "USDA recall database is temporarily unavailable. Please try again later.",
      recalls: []
    });
  }
});

// =====================
// 🌐 HTML ROUTES LAST
// =====================
app.get("/:page", (req, res) => {
  const pagePath = path.join(__dirname, req.params.page + ".html");
  if (fs.existsSync(pagePath)) res.sendFile(pagePath);
  else res.status(404).send("Page not found");
});

// ---------- START SERVER ----------
app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);
