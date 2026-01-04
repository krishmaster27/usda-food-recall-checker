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

  // --- NEW REUSABLE SEARCH FUNCTION ---
  async function performRecallSearch(foodKeyword) {
    // Create a sub-container for results so we don't overwrite the edit box
    let resultsContainer = document.getElementById("resultsContainer");
    if (!resultsContainer) {
      resultsContainer = document.createElement("div");
      resultsContainer.id = "resultsContainer";
      resultDiv.appendChild(resultsContainer);
    }
    
    resultsContainer.innerHTML = "<p>Searching USDA recalls...</p>";

    try {
      const recallResponse = await fetch(`/check-recalls?food=${encodeURIComponent(foodKeyword)}`);
      const recallData = await recallResponse.json();

      if (recallData.warning) {
        resultsContainer.innerHTML = `<p class="not-recalled">⚠️ ${recallData.message}</p>`;
        return;
      }

      const matches = recallData.recalls;

      if (matches.length === 0) {
        resultsContainer.innerHTML = `<p class="not-recalled">No recalls found for "<strong>${foodKeyword}</strong>".</p>`;
      } else {
        resultsContainer.innerHTML = `<p class="recalled">⚠️ ${matches.length} recall(s) found:</p>`;
        const ul = document.createElement("ul");

        matches.forEach(rec => {
          const li = document.createElement("li");
          // Applying the "Recall Card" formatting we discussed
          li.innerHTML = `
            <strong>${rec.field_title}</strong><br>
            <strong>Date:</strong> ${rec.field_recall_date || "N/A"}<br>
            <strong>Reason:</strong> ${rec.field_recall_reason || "N/A"}<br>
            <strong>Products:</strong> ${rec.field_product_items || "N/A"}
          `;
          ul.appendChild(li);
        });
        resultsContainer.appendChild(ul);
      }
    } catch (err) {
      console.error(err);
      resultsContainer.textContent = "Error fetching recalls.";
    }
  }

  checkBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    if (!imageUpload.files.length) {
      resultDiv.textContent = "Please upload an image.";
      return;
    }

    resultDiv.textContent = "Analyzing image…";

    try {
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

      // --- OPTION 1: DISPLAY EDITABLE INPUT ---
      resultDiv.innerHTML = `
        <div style="background: #f0f7ff; padding: 15px; border-radius: 8px; border: 1px solid #d0e7ff; margin-bottom: 20px; text-align: left;">
          <p style="margin-top:0"><strong>AI detected:</strong> ${food} (${confidence}%)</p>
          <div style="display: flex; gap: 10px;">
            <input type="text" id="correctedFood" value="${food}" style="margin-bottom:0; flex-grow:1;">
            <button id="updateSearchBtn" style="width: auto; padding: 0 15px; margin-top:0;">Update</button>
          </div>
          <small style="color: #666;">Is the name wrong? Edit it and click Update.</small>
        </div>
        <div id="resultsContainer"></div>
      `;

      // Setup the Update button listener
      document.getElementById("updateSearchBtn").addEventListener("click", () => {
        const newKeyword = document.getElementById("correctedFood").value;
        performRecallSearch(newKeyword);
      });

      // ---------- SAVE PRODUCT FOR LOGGED-IN USER ----------
      const user = JSON.parse(localStorage.getItem("loggedInUser"));
      if (user) {
        await fetch("/save-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: user.phone, product: food })
        });
        const event = new CustomEvent("addProduct", { detail: { product: food } });
        window.dispatchEvent(event);
      }

      // ---------- INITIAL SEARCH ----------
      performRecallSearch(food);

    } catch (err) {
      console.error(err);
      resultDiv.textContent = "An unexpected error occurred. Please try again.";
    }
  });
});