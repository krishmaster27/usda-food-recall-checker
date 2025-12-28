//  

script.js

document.addEventListener('DOMContentLoaded', () => {
  const checkBtn = document.getElementById('checkBtn');
  const productInput = document.getElementById('productName');
  const resultDiv = document.getElementById('result');
  var foodDetected = [,];

  // javascript for AI model will be here
  // it will return a word
  // foodDetected = whatever is returned by the AI model
  // you would access foodDetected[0]


  checkBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    if (!imageUpload.files.length) {
      resultDiv.textContent = "Please upload an image.";
      return;
    }

    resultDiv.textContent = "Analyzing image…";

    try {
      /* ---------- SEND IMAGE ---------- */
      const formData = new FormData();
      formData.append("image", imageUpload.files[0]);

      const detectResponse = await fetch("/detect-food", {
        method: "POST",
        body: formData
      });

      if (!detectResponse.ok) {
        throw new Error("Food detection failed");
      }

      const detectData = await detectResponse.json();
      const food = detectData.food;
      const confidence = (detectData.confidence * 100).toFixed(1);

      resultDiv.innerHTML = `
        <strong>Detected food:</strong> ${food} (${confidence}%)<br>
        Searching USDA recalls…
      `;

      /* ---------- CHECK RECALLS ---------- */
      const recallResponse = await fetch(
        `/check-recalls?food=${encodeURIComponent(food)}`
      );

      const recallData = await recallResponse.json();

      if (recallData.warning) {
        resultDiv.innerHTML += `
          <p class="not-recalled">⚠️ ${recallData.message}</p>
        `;
        return;
      }

      const matches = recallData.recalls;

      if (matches.length === 0) {
        resultDiv.innerHTML += `
          <p class="not-recalled">No recalls found.</p>
        `;
      } else {
        resultDiv.innerHTML += `
          <p class="recalled">⚠️ ${matches.length} recall(s) found:</p>
        `;

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
      resultDiv.textContent =
        "An unexpected error occurred. Please try again.";
    }
  });
});
