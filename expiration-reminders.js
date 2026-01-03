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

      document.querySelectorAll(".delete-reminder-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const product = btn.getAttribute("data-product").trim();
          const expiresOn = btn.getAttribute("data-date");

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
      });
    } catch (err) {
      console.error(err);
      remindersList.innerHTML = "<li>Error loading reminders.</li>";
    }
  }

  loadReminders();

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
      } else alert("Failed to add reminder.");
    } catch (err) {
      console.error(err);
      alert("Error adding reminder.");
    }
  });
});
