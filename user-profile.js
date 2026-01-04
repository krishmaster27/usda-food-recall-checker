window.addEventListener("DOMContentLoaded", () => {
  // 1. SELECT ALL ELEMENTS
  const phoneDisplay = document.getElementById("phoneDisplay");
  const passwordDisplay = document.getElementById("passwordDisplay");
  const logoutBtn = document.querySelector(".logout-btn");
  const changeInfoBtn = document.querySelector(".change-info-btn");
  const forgotPasswordLink = document.getElementById("forgotPassword");

  // 2. ATTACH LISTENERS FIRST (Ensures buttons work regardless of data)
  
  // Logout Logic
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Logging out...");
      localStorage.removeItem("loggedInUser");
      window.location.href = "sign-in.html";
    });
  }

  // 3. RETRIEVE USER DATA
  let user = JSON.parse(localStorage.getItem("loggedInUser"));

  // 4. DATA VALIDATION (If no user, redirect, but listeners are already alive)
  if (!user) {
    console.error("No logged-in user found in localStorage.");
    window.location.href = "sign-in.html";
    return; // Exit here if no user, but the listeners above are already bound
  }

  // 5. DISPLAY USER INFO
  if (phoneDisplay) phoneDisplay.textContent = user.phone;
  if (passwordDisplay) passwordDisplay.textContent = "*".repeat(user.password.length);

  // --- CHANGE INFO BUTTON ---
  if (changeInfoBtn) {
    changeInfoBtn.addEventListener("click", async () => {
      const currentPassword = prompt("Enter your current password to change info:");
      
      if (!currentPassword || currentPassword !== user.password) {
        alert("Incorrect password. Cannot change info.");
        return;
      }

      const newPhone = prompt("Enter new phone number:", user.phone) || user.phone;
      const newPassword = prompt("Enter new password:", user.password) || user.password;

      // Update locally
      user.phone = newPhone;
      user.password = newPassword;
      localStorage.setItem("loggedInUser", JSON.stringify(user));

      // Refresh UI
      if (phoneDisplay) phoneDisplay.textContent = user.phone;
      if (passwordDisplay) passwordDisplay.textContent = "*".repeat(user.password.length);

      // Attempt server update
      try {
        const res = await fetch("/update-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user)
        });
        if (res.ok) alert("✅ Information updated on server!");
        else alert("✅ Saved locally (Server sync failed).");
      } catch (err) {
        alert("✅ Information updated locally!");
      }
    });
  }

  // --- FORGOT PASSWORD ---
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", (e) => {
      e.preventDefault();

      const phoneInput = prompt("Enter your phone number:");
      if (!phoneInput) return;

      // For this session-based prototype, we verify against the logged-in phone
      if (phoneInput === user.phone) {
        const newPass = prompt("Enter new password:");
        if (newPass) {
          user.password = newPass;
          localStorage.setItem("loggedInUser", JSON.stringify(user));
          if (passwordDisplay) passwordDisplay.textContent = "*".repeat(user.password.length);
          alert("✅ Password reset successfully!");
        }
      } else {
        alert("Phone number does not match current session.");
      }
    });
  }
});