window.addEventListener("DOMContentLoaded", async () => {
  const listEl = document.getElementById("saved-products-list");

  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    alert("Please sign in to view saved products.");
    window.location.href = "sign-in.html";
    return;
  }
  const phone = user.phone;

  async function loadSavedProducts() {
    try {
      const res = await fetch(`/saved-products-with-recalls?phone=${phone}`);
      const data = await res.json();

      listEl.innerHTML = "";

      if (!data.products || data.products.length === 0) {
        listEl.innerHTML = "<li>No saved products.</li>";
        return;
      }

      data.products.forEach(p => {
        const li = document.createElement("li");
        li.innerHTML = `
          <strong>${p.product}</strong>
          <ul class="recalls-list">
            ${p.recalls.length > 0 
              ? p.recalls.map(r => `<li>${r.field_title}: ${r.field_summary}</li>`).join("")
              : "<li>No recalls for this product.</li>"}
          </ul>
        `;
        listEl.appendChild(li);
      });

    } catch (err) {
      console.error(err);
      listEl.innerHTML = "<li>Error loading saved products.</li>";
    }
  }

  loadSavedProducts();
});
