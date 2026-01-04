window.addEventListener("DOMContentLoaded", async () => {
  const productInput = document.getElementById("product-name");
  const expirationInput = document.getElementById("expiration-date");
  const reminderSelect = document.getElementById("reminder-days");
  const addBtn = document.getElementById("add-reminder-btn");
  const remindersList = document.getElementById("reminders-list");

  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    alert("Please sign in.");
    window.location.href = "sign-in.html";
    return;
  }
  const phone = user.phone;

  // Ask for notification permission
  if (Notification.permission !== "granted") {
    await Notification.requestPermission();
  }

  // -------------------------------
  // Load reminders and render list
  // -------------------------------
  async function loadReminders() {
    try {
      const res = await fetch(`/get-reminders?phone=${phone}`);
      const data = await res.json();
      remindersList.innerHTML = "";

      if (!data.reminders || data.reminders.length === 0) {
        remindersList.innerHTML = "<li>No reminders set yet.</li>";
        return;
      }

      data.reminders.forEach((r) => {
        const li = document.createElement("li");
        li.innerHTML = `
          ${r.product} — Expires: ${r.expiresOn} — Remind ${r.remindBeforeDays || 0} day(s) before
          <button class="delete-reminder-btn" data-product="${r.product}" data-date="${r.expiresOn}">Delete</button>
        `;
        remindersList.appendChild(li);
      });
    } catch (err) {
      console.error(err);
      remindersList.innerHTML = "<li>Error loading reminders.</li>";
    }
  }

  // -------------------------------
  // Delete reminder (event delegation)
  // -------------------------------
  remindersList.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("delete-reminder-btn")) return;
    const product = e.target.dataset.product.trim();
    const expiresOn = e.target.dataset.date;

    try {
      const res = await fetch("/delete-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, product, expiresOn })
      });
      const result = await res.json();
      if (result.success) loadReminders();
      else alert("Failed to delete reminder.");
    } catch (err) {
      console.error("Delete request failed:", err);
      alert("Error deleting reminder.");
    }
  });

  // -------------------------------
  // Add reminder
  // -------------------------------
  addBtn.addEventListener("click", async () => {
    const product = productInput.value.trim();
    const expiresOn = expirationInput.value.trim();
    const remindBeforeDays = parseInt(reminderSelect.value) || 0;

    if (!product || !expiresOn) return alert("Please enter product and expiration date.");

    try {
      const res = await fetch("/add-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, product, expiresOn, remindBeforeDays })
      });

      const data = await res.json();
      if (data.success) {
        productInput.value = "";
        expirationInput.value = "";
        reminderSelect.value = "1";
        loadReminders();

        // Immediately check notifications for the new reminder
        const updatedRes = await fetch(`/get-reminders?phone=${phone}`);
        const updatedData = await updatedRes.json();
        checkAndNotify(updatedData.reminders || []);
      } else alert("Failed to add reminder.");
    } catch (err) {
      console.error(err);
      alert("Error adding reminder.");
    }
  });

  loadReminders();

  // -------------------------------
  // Notification logic
  // -------------------------------
  function isNotifyToday(date) {
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  function checkAndNotify(reminders) {
    reminders.forEach((r) => {
      // Force local midnight to avoid timezone issues
      const expires = new Date(r.expiresOn + "T00:00:00");
      const notifyDate = new Date(expires);
      notifyDate.setDate(expires.getDate() - (r.remindBeforeDays || 0));

      if (isNotifyToday(notifyDate) && !r.notified) {
        new Notification(`${r.product} Expires On ${r.expiresOn}!`);
        r.notified = true; // prevent repeated notifications in this session
      }
    });
  }

  async function fetchAndNotify() {
    try {
      const res = await fetch(`/get-reminders?phone=${phone}`);
      const data = await res.json();
      if (!data.reminders) return;
      checkAndNotify(data.reminders);
    } catch (err) {
      console.error("Notification check failed:", err);
    }
  }

  // Check every minute
  setInterval(fetchAndNotify, 60 * 1000);

  // Initial check on page load
  fetchAndNotify();
});
