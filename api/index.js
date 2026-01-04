const express = require("express");
const multer = require("multer");
const path = require("path");
const twilio = require("twilio");
const { kv } = require("@vercel/kv");

const app = express();

// ---------- MIDDLEWARE ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Note: On Vercel, static files are served automatically from the root.
// We only need the API logic here.

// ---------- CONFIG ----------
const CLARIFAI_API_KEY = process.env.CLARIFAI_API_KEY || "3322dba4bf694fd99b8065d57fba6494";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "ACc8e2e10c293ca9f29c9475aeb47f2bf8";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "fe4ec513924d31307945305c31bdb5fd";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "+1234567890";

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const upload = multer({ storage: multer.memoryStorage() });

// ---------- KV STORAGE HELPERS ----------
async function loadUsers() {
  return (await kv.get("users")) || [];
}

async function saveUsers(users) {
  await kv.set("users", users);
}

async function loadReminders() {
  return (await kv.get("reminders")) || [];
}

async function saveReminders(reminders) {
  await kv.set("reminders", reminders);
}

// ---------- TWILIO SMS FUNCTION ----------
async function sendExpirationSMS(phone, product, expiresOn) {
  try {
    await twilioClient.messages.create({
      body: `Reminder: ${product} expires on ${expiresOn}.`,
      from: TWILIO_PHONE_NUMBER,
      to: phone
    });
  } catch (err) {
    console.error("Twilio Error:", err);
  }
}

// =====================
// 🔐 AUTH ROUTES
// =====================

app.post("/sign-up", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ success: false });

  let users = await loadUsers();
  if (users.some(u => u.phone === phone)) {
    return res.json({ success: false, message: "User exists" });
  }

  const newUser = { phone, password, savedProducts: [] };
  users.push(newUser);
  await saveUsers(users);

  res.json({ success: true, user: newUser });
});

app.post("/sign-in", async (req, res) => {
  const { phone, password } = req.body;
  const users = await loadUsers();
  const user = users.find(u => u.phone === phone && u.password === password);

  if (!user) return res.json({ success: false });
  res.json({ success: true, user });
});

// =====================
// 📦 SAVE PRODUCT
// =====================
app.post("/save-product", async (req, res) => {
  const { phone, product } = req.body;
  if (!phone || !product) return res.status(400).json({ success: false });

  let users = await loadUsers();
  const userIndex = users.findIndex(u => u.phone === phone);

  if (userIndex === -1) return res.status(404).json({ success: false });

  if (!users[userIndex].savedProducts) users[userIndex].savedProducts = [];
  if (!users[userIndex].savedProducts.includes(product)) {
    users[userIndex].savedProducts.push(product);
    await saveUsers(users);
  }

  res.json({ success: true, user: users[userIndex] });
});

// =====================
// 📸 CLARIFAI DETECTION
// =====================
app.post("/detect-food", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image" });

    const response = await fetch(
      `https://api.clarifai.com/v2/models/food-item-recognition/versions/1d5fd481e0cf4826aa72ec3ff049e044/outputs`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${CLARIFAI_API_KEY}`,
          "Content-Type": "application/json"
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
    res.status(500).json({ error: "Detection failed" });
  }
});

// =====================
// ⏰ REMINDERS
// =====================
app.get("/get-reminders", async (req, res) => {
  const reminders = await loadReminders();
  res.json({ reminders: reminders.filter(r => r.phone === req.query.phone) });
});

app.post("/add-reminder", async (req, res) => {
  const { phone, product, expiresOn, remindBeforeDays } = req.body;
  let reminders = await loadReminders();
  
  reminders.push({ phone, product: product.trim(), expiresOn, remindBeforeDays: parseInt(remindBeforeDays) || 0 });
  await saveReminders(reminders);
  
  await sendExpirationSMS(phone, product, expiresOn);
  res.json({ success: true });
});

// =====================
// 🔍 USDA RECALLS
// =====================
app.get("/check-recalls", async (req, res) => {
  const food = req.query.food;
  const USDA_URL = "https://www.fsis.usda.gov/fsis/api/recall/v/1?field_closed_year_id=All&langcode=English";

  try {
    const response = await fetch(USDA_URL);
    const data = await response.json();
    const matches = data.filter(item => {
      const text = `${item.field_title} ${item.field_product_items}`.toLowerCase();
      return text.includes(food.toLowerCase());
    });
    res.json({ recalls: matches });
  } catch (err) {
    res.json({ warning: true, message: "USDA database unavailable", recalls: [] });
  }
});

module.exports = app;