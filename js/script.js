document.addEventListener("DOMContentLoaded", () => {
  const imageUpload = document.getElementById("imageUpload");
  const checkBtn = document.getElementById("checkBtn");
  const resultDiv = document.getElementById("result");
  const preview = document.getElementById("imagePreview");

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

    resultDiv.innerHTML = "Analyzing image…";

    try {
      const formData = new FormData();
      formData.append("image", imageUpload.files[0]);

      // Call backend
      const response = await fetch("/detect-food", { method: "POST", body: formData });

      if (!response.ok) throw new Error("Failed to detect food");

      const data = await response.json();
      const topFood = data.top_food;
      const confidence = (data.confidence * 100).toFixed(1);

      resultDiv.innerHTML = `<strong>Detected food:</strong> ${topFood} (${confidence}%)<br>Searching USDA recalls…`;

      // USDA recall search
      const recallResponse = await fetch(
        "https://www.fsis.usda.gov/fsis/api/recall/v/1?field_closed_year_id=All&langcode=English"
      );
      
      const recallData = await recallResponse.json();
      const recalls = recallData.recall || [];

      const matches = recalls.filter(item => {
        const text = [item.field_title, item.field_product_items, item.field_summary]
          .filter(Boolean).join(" ").toLowerCase();
        return text.includes(topFood.toLowerCase());
      });

      if (matches.length === 0) {
        resultDiv.innerHTML += `<p class="not-recalled">No recalls found.</p>`;
      } else {
        resultDiv.innerHTML += `<p class="recalled">⚠️ ${matches.length} recall(s) found:</p>`;
        const ul = document.createElement("ul");
        matches.forEach(rec => {
          const li = document.createElement("li");
          li.innerHTML = `<strong>${rec.field_title}</strong><br>
                          <strong>Date:</strong> ${rec.field_recall_date || "N/A"}<br>
                          <strong>Reason:</strong> ${rec.field_recall_reason || "N/A"}<br>
                          <strong>Products:</strong> ${rec.field_product_items || "N/A"}`;
          ul.appendChild(li);
        });
        resultDiv.appendChild(ul);
      }

    } catch (err) {
      console.error(err);
      resultDiv.textContent = "Error detecting food or fetching recalls.";
    }
  });
});
