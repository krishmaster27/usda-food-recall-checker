document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signUpForm"); // make sure your form has id="signUpForm"
  const phoneInput = document.getElementById("phone");
  const confirmPhoneInput = document.getElementById("confirm-phone");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");

  if (!form) {
    console.error("Sign-up form not found");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const phone = phoneInput.value.trim();
    const confirmPhone = confirmPhoneInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Basic validation
    if (!phone || !password) {
      alert("Please fill in all fields.");
      return;
    }

    if (phone !== confirmPhone) {
      alert("Phone numbers do not match!");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const response = await fetch("/api/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password })
      });

      const contentType = response.headers.get("content-type");

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned HTML instead of JSON");
      }

      const data = await response.json();

      if (data.success) {
        // ✅ Save full user object so other pages detect login
        localStorage.setItem("loggedInUser", JSON.stringify({ phone }));
        alert("✅ Account created and signed in!");
        window.location.href = "index.html"; // redirect to home
      } else {
        alert("⚠️ " + (data.message || "Phone number already registered."));
      }
    } catch (err) {
      console.error("Sign-up error:", err);
      alert("Server error. Please try again.");
    }
  });
});
