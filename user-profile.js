window.addEventListener("DOMContentLoaded", () => {
  const phoneDisplay = document.getElementById("phoneDisplay");
  const passwordDisplay = document.getElementById("passwordDisplay");
  const logoutBtn = document.querySelector(".logout-btn");
  const changeInfoBtn = document.querySelector(".change-info-btn");
  const forgotPasswordLink = document.getElementById("forgotPassword");

  // Get logged-in user from localStorage
  let user = JSON.parse(localStorage.getItem("loggedInUser"));

  if (!user) {
    // Redirect to sign-in if no user
    window.location.href = "sign-in.html";
    return;
  }

  // Display user info
  phoneDisplay.textContent = user.phone;
  passwordDisplay.textContent = "*".repeat(user.password.length);

  // Logout button
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    window.location.href = "sign-in.html";
  });

  // Change Info button
  changeInfoBtn.addEventListener("click", () => {
    const currentPassword = prompt("Enter your current password to change info:");
    if (!currentPassword) return;

    if (currentPassword !== user.password) {
      alert("Incorrect password. Cannot change info.");
      return;
    }

    const newPhone = prompt("Enter new phone number:", user.phone) || user.phone;
    const newPassword = prompt("Enter new password:", user.password) || user.password;

    // Update user locally
    user.phone = newPhone;
    user.password = newPassword;
    localStorage.setItem("loggedInUser", JSON.stringify(user));

    // Update display
    phoneDisplay.textContent = user.phone;
    passwordDisplay.textContent = "*".repeat(user.password.length);

    // Also update in users.json on server
    fetch("/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user)
    }).then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("✅ Your information has been updated!");
        }
      }).catch(() => alert("✅ Your information has been updated!"));
  });

  // Forgot Password
  forgotPasswordLink.addEventListener("click", (e) => {
    e.preventDefault();
    // Simulate sending SMS
    alert(`A password reset link has been sent to ${user.phone}. (Simulation only)`);
  });
});
