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

  // --- REUSABLE SEARCH FUNCTION ---
  async function performRecallSearch(foodKeyword) {
    let resultsContainer = document.getElementById("resultsContainer");
    if (!resultsContainer) {
      resultsContainer = document.createElement("div");
      resultsContainer.id = "resultsContainer";
      resultDiv.appendChild(resultsContainer);
    }
    
    resultsContainer.innerHTML = "<p>Searching USDA recalls...</p>";

    try {
      // PATH MATCHES THE ROUTE IN api/index.cjs
      const recallResponse = await fetch(`/api/check-recalls?food=${encodeURIComponent(foodKeyword)}`);
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

      // 1. Detect Food
      const detectResponse = await fetch("/api/detect-food", {
        method: "POST",
        body: formData
      });

      if (!detectResponse.ok) throw new Error("Food detection failed");

      const detectData = await detectResponse.json();
      const food = detectData.food;
      const confidence = (detectData.confidence * 100).toFixed(1);

      // Update UI with Detection Results
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

      document.getElementById("updateSearchBtn").addEventListener("click", () => {
        const newKeyword = document.getElementById("correctedFood").value;
        performRecallSearch(newKeyword);
      });

      // 2. Trigger USDA Search immediately (The "User Save" block is removed from here)
      performRecallSearch(food);

    } catch (err) {
      console.error(err);
      resultDiv.textContent = "An error occurred during detection.";
    }
  });
});