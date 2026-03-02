document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.getElementById("inventory-table-body");

  // زر العودة للوحة التحكم
  document.getElementById("back-dashboard").addEventListener("click", () => {
    window.location.href = "../index.html";
  });

  // ======== دالة تحميل الجرد ========
  async function refreshInventory() {
    const inventory = await window.api.getInventory();
    tableBody.innerHTML = "";

    inventory.forEach((item) => {
      const unitPrice = item.unit_price || 0;
      const quantity = item.quantity || 0;
      const total = quantity * unitPrice;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.productCode || "-"}</td>
        <td>${item.product_name}</td>
        <td>${quantity}</td>
        <td>${unitPrice.toFixed(2)}</td>
        <td>${total.toFixed(2)}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // ======== تحميل الجرد عند فتح الصفحة ========
  refreshInventory();

  // ======== تحديث الجرد تلقائيًا عند أي تغيير ========
  window.api.onInventoryUpdate(() => {
    refreshInventory();
  });
});  