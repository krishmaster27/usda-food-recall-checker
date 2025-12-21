document.addEventListener("DOMContentLoaded", () => {

  // 🔥 DEMO ONLY — DO NOT SHIP THIS
  const CLARIFAI_API_KEY = "3322dba4bf694fd99b8065d57fba6494";
  const MODEL_ID = "food-item-recognition";
  const MODEL_VERSION = "1d5fd481e0cf4826aa72ec3ff049e044";

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

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function detectFood(imageFile) {
    const base64Image = await toBase64(imageFile);

    const clarifaiUrl =
      `https://api.clarifai.com/v2/models/${MODEL_ID}/versions/${MODEL_VERSION}/outputs`;

    // 🚨 CORS PROXY
    const proxyUrl =
      "https://api.allorigins.win/raw?url=" + encodeURIComponent(clarifaiUrl);

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Authorization": `Key ${CLARIFAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: [
          {
            data: {
              image: { base64: base64Image }
            }
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error("Clarifai request failed");
    }

    const data = await response.json();
    return data.outputs[0].data.concepts;
  }

  checkBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    if (!imageUpload.files.length) {
      resultDiv.textContent = "Please upload an image.";
      return;
    }

    resultDiv.innerHTML = "Analyzing image…";

    try {
      const concepts = await detectFood(imageUpload.files[0]);
      const topFood = concepts[0].name;
      const confidence = (concepts[0].value * 100).toFixed(1);

      resultDiv.innerHTML = `
        <strong>Detected food:</strong> ${topFood}<br>
        <strong>Confidence:</strong> ${confidence}%<br><br>
        Searching USDA recalls…
      `;

      const response = await fetch(
        "https://www.fsis.usda.gov/fsis/api/recall/v/1?field_closed_year_id=All&langcode=English"
      );

      const data = await response.json();

      const matches = data.filter(item => {
        const text = [
          item.field_title,
          item.field_product_items,
          item.field_summary
        ].filter(Boolean).join(" ").toLowerCase();

        return text.includes(topFood.toLowerCase());
      });

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
      resultDiv.textContent =
        "Demo proxy failed (this is common). Refresh and try again.";
    }
  });
});
