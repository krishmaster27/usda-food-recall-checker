const fetch = require('node-fetch');
const express = require("express");
const multer = require("multer");
const twilio = require("twilio");
const { kv } = require("@vercel/kv");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const CLARIFAI_API_KEY = process.env.CLARIFAI_API_KEY || "3322dba4bf694fd99b8065d57fba6494";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "ACc8e2e10c293ca9f29c9475aeb47f2bf8";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "fe4ec513924d31307945305c31bdb5fd";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "+1234567890";

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const upload = multer({ storage: multer.memoryStorage() });

// --- KV STORAGE HELPERS ---
async function loadUsers() { return (await kv.get("users")) || []; }
async function saveUsers(users) { await kv.set("users", users); }
async function loadReminders() { return (await kv.get("reminders")) || []; }
async function saveReminders(reminders) { await kv.set("reminders", reminders); }

// --- SMS ---
async function sendExpirationSMS(phone, product, expiresOn) {
  try { await twilioClient.messages.create({ body: `Reminder: ${product} expires on ${expiresOn}.`, from: TWILIO_PHONE_NUMBER, to: phone }); } 
  catch (err) { console.error("Twilio Error:", err); }
}

// ==========================================
// 🚀 THE FIX: CATCH-ALL ROUTING
// ==========================================

// 1. Detect Food
app.post(["/api/detect-food", "/detect-food"], upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image" });
    const response = await fetch(`https://api.clarifai.com/v2/models/food-item-recognition/versions/1d5fd481e0cf4826aa72ec3ff049e044/outputs`, {
      method: "POST",
      headers: { Authorization: `Key ${CLARIFAI_API_KEY}`, "Content-Type": "application/json", "User-Agent": "Vercel" },
      body: JSON.stringify({ user_app_id: { user_id: "clarifai", app_id: "main" }, inputs: [{ data: { image: { base64: req.file.buffer.toString("base64") } } }] })
    });
    const data = await response.json();
    const concept = data.outputs?.[0]?.data?.concepts?.[0];
    if (!concept) return res.status(400).json({ error: "No food detected" });
    res.json({ food: concept.name, confidence: concept.value });
  } catch (err) { res.status(500).json({ error: "Detection failed" }); }
});

// 2. Check Recalls
app.get(["/api/check-recalls", "/check-recalls"], async (req, res) => {
  try {
    const response = await fetch("https://www.fsis.usda.gov/fsis/api/recall/v/1?field_closed_year_id=All&langcode=English");
    const data = await response.json();
    const matches = data.filter(item => `${item.field_title} ${item.field_product_items}`.toLowerCase().includes(req.query.food.toLowerCase()));
    res.json({ recalls: matches });
  } catch (err) { res.json({ warning: true, recalls: [] }); }
});

// 3. Auth & Save (Repeat the pattern for others)
app.post(["/api/sign-up", "/sign-up"], async (req, res) => {
  let users = await loadUsers();
  if (users.some(u => u.phone === req.body.phone)) return res.json({ success: false });
  users.push({ ...req.body, savedProducts: [] });
  await saveUsers(users);
  res.json({ success: true });
});

app.post(["/api/sign-in", "/sign-in"], async (req, res) => {
  const users = await loadUsers();
  const user = users.find(u => u.phone === req.body.phone && u.password === req.body.password);
  res.json({ success: user ? true : false, user });
});

app.post(["/api/save-product", "/save-product"], async (req, res) => {
  let users = await loadUsers();
  const idx = users.findIndex(u => u.phone === req.body.phone);
  if (idx !== -1) {
    users[idx].savedProducts = users[idx].savedProducts || [];
    if (!users[idx].savedProducts.includes(req.body.product)) users[idx].savedProducts.push(req.body.product);
    await saveUsers(users);
  }
  res.json({ success: true });
});

module.exports = app;