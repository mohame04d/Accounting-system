document.addEventListener("DOMContentLoaded", () => {
  const table = document.getElementById("productsTable");
  const searchInput = document.getElementById("searchInput");
  const addBtn = document.getElementById("addBtn");

  // ======== رسم صف منتج واحد ========
  function renderRow(p) {
    const tr = document.createElement("tr");
    tr.dataset.id = p.id;

    tr.innerHTML = `
      <td>${p.productName}</td>
      <td><input type="number" value="${p.unitPrice}" class="priceInput"/></td>
      <td><button class="updateBtn">تحديث</button></td>
      <td><button class="delete-btn">حذف</button></td>
    `;

    table.appendChild(tr);
  }

  // ======== تحميل المنتجات ========
  async function loadProducts(name = "") {
    const products = name
      ? await window.api.searchProducts(name)
      : await window.api.getProducts();

    table.innerHTML = "";
    products.forEach(renderRow);
  }

  // ======== زر العودة للوحة التحكم ========
  document.getElementById("back-dashboard").addEventListener("click", () => {
    window.location.href = "../index.html";
  });

  // ======== إضافة منتج ========
  addBtn.addEventListener("click", async () => {
    const productName = document.getElementById("productName").value.trim();
    const unitPrice = document.getElementById("unitPrice").value.trim();

    if (!productName || !unitPrice) return;

    try {
      const response = await window.api.addProduct({
        productName,
        unitPrice: parseFloat(unitPrice),
      });

      if (response.success) {
        renderRow({
          id: response.result.lastInsertRowid,
          productName,
          unitPrice: parseFloat(unitPrice),
        });

        // تنظيف الحقول
        document.getElementById("productName").value = "";
        document.getElementById("unitPrice").value = "";
        document.getElementById("productName").focus();
      }
    } catch (err) {
      console.error("خطأ في إضافة المنتج:", err);
    }
  });

  // ======== Event Delegation: تحديث وحذف ========
  table.addEventListener("click", async (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;
    const id = tr.dataset.id;

    // تحديث السعر
    if (e.target.classList.contains("updateBtn")) {
      const newPrice = parseFloat(tr.querySelector(".priceInput").value);
      if (isNaN(newPrice)) return;
      try {
        await window.api.updateProductPrice({ id, unitPrice: newPrice });
      } catch (err) {
        console.error("خطأ في تحديث السعر:", err);
      }
    }

    // حذف المنتج
    if (e.target.classList.contains("delete-btn")) {
      try {
        await window.api.deleteProduct(id);
        tr.remove();
      } catch (err) {
        console.error("خطأ في الحذف:", err);
      }
    }
  });

  // ======== البحث ========
  searchInput.addEventListener("input", async () => {
    const products = await window.api.searchProducts(searchInput.value);
    table.innerHTML = "";
    products.forEach(renderRow);
  });

  // ======== أول تحميل ========
  loadProducts();
});
