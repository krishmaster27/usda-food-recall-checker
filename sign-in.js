document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signInForm");
  const phoneInput = document.getElementById("phone");
  const passwordInput = document.getElementById("password");

  if (!form) {
    console.error("Sign-in form not found");
    return;
  }

  // Redirect if already logged in
  const loggedUser = localStorage.getItem("loggedInUser");
  if (loggedUser) {
    window.location.href = "user-profile.html";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const phone = phoneInput.value.trim();
    const password = passwordInput.value;

    if (!phone || !password) {
      alert("Please enter both phone number and password.");
      return;
    }

    try {
      const response = await fetch("/api/sign-in", {
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
        // Save full user object so all pages detect login
        localStorage.setItem("loggedInUser", JSON.stringify({ phone }));
        window.location.href = "index.html";
      } else {
        alert("Incorrect phone number or password.");
      }
    } catch (err) {
      console.error("Sign-in error:", err);
      alert("Server error. Please try again.");
    }
  });
});
