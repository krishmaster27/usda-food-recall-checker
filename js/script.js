document.addEventListener("DOMContentLoaded", () => {
  const imageUpload = document.getElementById("imageUpload");
  const checkBtn = document.getElementById("checkBtn");
  const resultDiv = document.getElementById("result");
  const preview = document.getElementById("imagePreview");

  // Show image preview
  imageUpload.addEventListener("change", () => {
    const file = imageUpload.files[0];
    if (file) {
      preview.src = URL.createObjectURL(file);
      preview.style.display = "block";
    }
  });

  checkBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    if (!imageUpload.files.length) {
      resultDiv.textContent = "Please upload an image.";
      return;
    }

    resultDiv.textContent = "Analyzing image…";

    try {
      // ---------- SEND IMAGE TO CLARIFAI ----------
      const formData = new FormData();
      formData.append("image", imageUpload.files[0]);

      const detectResponse = await fetch("/detect-food", {
        method: "POST",
        body: formData
      });

      if (!detectResponse.ok) throw new Error("Food detection failed");

      const detectData = await detectResponse.json();
      const food = detectData.food;
      const confidence = (detectData.confidence * 100).toFixed(1);

      resultDiv.innerHTML = `
        <strong>Detected food:</strong> ${food} (${confidence}%)<br>
        Searching USDA recalls…
      `;

      // ---------- SAVE PRODUCT FOR LOGGED-IN USER ----------
      const user = JSON.parse(localStorage.getItem("loggedInUser"));
      if (user) {
        await fetch("/save-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: user.phone, product: food })
        });

        // Optional: Dispatch event so Saved Products page updates immediately
        const event = new CustomEvent("addProduct", { detail: { product: food } });
        window.dispatchEvent(event);
      }

      // ---------- CHECK USDA RECALLS ----------
      const recallResponse = await fetch(
        `/check-recalls?food=${encodeURIComponent(food)}`
      );

      const recallData = await recallResponse.json();

      if (recallData.warning) {
        resultDiv.innerHTML += `<p class="not-recalled">⚠️ ${recallData.message}</p>`;
        return;
      }

      const matches = recallData.recalls;

      if (matches.length === 0) {
        resultDiv.innerHTML += `<p class="not-recalled">No recalls found.</p>`;
      } else {
        resultDiv.innerHTML += `<p class="recalled">⚠️ ${matches.length} recall(s) found:</p>`;

        const ul = document.createElement("ul");

        matches.forEach(rec => {
          const li = document.createElement("li");
          li.innerHTML = `
            <strong>${rec.field_title}</strong><br>
            <strong>Date:</strong> ${rec.field_recall_date || "N/A"}<br>
            <strong>Reason:</strong> ${rec.field_recall_reason || "N/A"}<br>
            <strong>Products:</strong> ${rec.field_product_items || "N/A"}
          `;
          ul.appendChild(li);
        });

        resultDiv.appendChild(ul);
      }

    } catch (err) {
      console.error(err);
      resultDiv.textContent = "An unexpected error occurred. Please try again.";
    }
  });
});
