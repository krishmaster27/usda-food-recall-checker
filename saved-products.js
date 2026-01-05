window.addEventListener("DOMContentLoaded", async () => {
  const listEl = document.getElementById("productList");
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  if (!user) {
    window.location.href = "sign-in.html";
    return;
  }

  async function loadSavedProducts() {
    try {
      // Use the phone number from localStorage to fetch the list
      const res = await fetch(`/get-user-products?phone=${user.phone}`);
      const data = await res.json();

      listEl.innerHTML = ""; // Clear loading text

      if (!data.products || data.products.length === 0) {
        listEl.innerHTML = "<p style='text-align:center; padding:20px;'>No saved products yet.</p>";
        return;
      }

      data.products.forEach((item) => {
        const li = document.createElement("li");
        li.style.listStyle = "none";
        li.innerHTML = `
          <div class="product-row" style="display:flex; justify-content:space-between; align-items:center; background:white; padding:15px; margin-bottom:10px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
            <span style="font-weight:bold;">${item.product}</span>
            <div class="buttons">
              <button class="show-btn" style="background:#0074D9; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Show Recalls</button>
              <button class="delete-btn" style="background:#b30000; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; margin-left:5px;">Delete</button>
            </div>
          </div>
          <div class="recalls" style="display:none; padding:15px; background:#f9f9f9; border-radius:8px; border:1px solid #ddd; margin-bottom:15px;">
            <p>Searching USDA recalls...</p>
          </div>
        `;

        const showBtn = li.querySelector(".show-btn");
        const deleteBtn = li.querySelector(".delete-btn");
        const recallsDiv = li.querySelector(".recalls");

        // --- Toggle Recalls ---
        showBtn.onclick = async () => {
          if (recallsDiv.style.display === "none") {
            recallsDiv.style.display = "block";
            showBtn.textContent = "Hide Recalls";
            
            // This calls your server's USDA check route
            const recRes = await fetch(`/check-recalls?food=${encodeURIComponent(item.product)}`);
            const recData = await recRes.json();
            
            if (recData.recalls && recData.recalls.length > 0) {
              recallsDiv.innerHTML = "<ul>" + recData.recalls.map(r => `
                <li style="margin-bottom:10px;">
                  <strong>DATE:</strong> ${r.field_recall_date}<br>
                  <strong>SUMMARY:</strong> ${r.field_title}
                </li>
              `).join("") + "</ul>";
            } else {
              recallsDiv.innerHTML = "<p>✅ No active recalls found for this product.</p>";
            }
          } else {
            recallsDiv.style.display = "none";
            showBtn.textContent = "Show Recalls";
          }
        };

        // --- Delete Product ---
        deleteBtn.onclick = async () => {
          if (confirm(`Delete ${item.product}?`)) {
            const delRes = await fetch('/delete-product', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: user.phone, product: item.product })
            });
            if (delRes.ok) li.remove();
          }
        };

        listEl.appendChild(li);
      });
    } catch (err) {
      console.error("Error loading products:", err);
      listEl.innerHTML = "<p>Error loading products. Check console for details.</p>";
    }
  }

  loadSavedProducts();
});
