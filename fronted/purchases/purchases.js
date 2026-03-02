document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("purchase-form");
  const tableBody = document.getElementById("purchase-table-body");
  const addProductBtn = document.getElementById("add-product");
  const productsContainer = document.getElementById("products-container");

  // ======== إضافة صنف جديد في الفورم ========
  addProductBtn.addEventListener("click", () => {
    const div = document.createElement("div");
    div.classList.add("product-item");
    div.innerHTML = `
      <input type="text" class="product_name" placeholder="اسم الصنف" required>
      <input type="number" class="quantity" placeholder="الكمية" required>
      <input type="number" class="price" placeholder="السعر" step="0.01" required>
      <button type="button" class="remove-product">حذف صنف</button>
    `;
    productsContainer.appendChild(div);

    div.querySelector(".remove-product").addEventListener("click", () => {
      div.remove();
    });
  });

  // ======== زر العودة للوحة التحكم ========
  document.getElementById("back-dashboard").addEventListener("click", () => {
    window.location.href = "../index.html";
  });

  // ======== تحميل الواردات وعرضها ========
  async function loadPurchases() {
    const purchases = await window.api.getPurchases();
    tableBody.innerHTML = "";

    purchases.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.supplier_name}</td>
        <td>${p.supplier_phone || "-"}</td>
        <td>${p.invoice_number || "-"}</td>
        <td>${p.invoice_date || p.date}</td>
        <td>
          ${p.products
            .map(
              (item) =>
                `${item.product_name} (${item.quantity} × ${item.price})`,
            )
            .join("<br>")}
          <br><strong>Total: ${p.total.toFixed(2)}</strong>
        </td>
        <td><button class="delete-btn" data-id="${p.id}">حذف</button></td>
        <td><button class="edit-btn" data-id="${p.id}">تعديل</button></td>
        <td><button class="print-btn" data-id="${p.id}">طباعة</button></td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // ======== Event Delegation: حذف، تعديل، طباعة ========
  tableBody.addEventListener("click", async (e) => {
    const btn = e.target;
    const tr = btn.closest("tr");
    if (!tr) return;
    const id = btn.dataset.id;

    // حذف الوارد
    if (btn.classList.contains("delete-btn")) {
      await window.api.deletePurchase(id);
      loadPurchases(); // إعادة تحميل الجدول
    }

    // تعديل الوارد
    if (btn.classList.contains("edit-btn")) {
      const purchase = await window.api.getPurchaseById(id);

      // تعبئة الفورم
      form.dataset.editId = id;
      form.querySelector("button[type=submit]").textContent = "تعديل الوارد";

      document.getElementById("supplier_name").value = purchase.supplier_name;
      document.getElementById("supplier_phone").value = purchase.supplier_phone;
      document.getElementById("invoice_number").value = purchase.invoice_number;
      document.getElementById("invoice_date").value = purchase.invoice_date
        ? purchase.invoice_date.split("T")[0]
        : "";

      // مسح المنتجات القديمة
      productsContainer.innerHTML = "";
      purchase.products.forEach((item) => {
        const div = document.createElement("div");
        div.classList.add("product-item");
        div.innerHTML = `
          <input type="text" class="product_name" value="${item.product_name}" required>
          <input type="number" class="quantity" value="${item.quantity}" required>
          <input type="number" class="price" value="${item.price}" step="0.01" required>
          <button type="button" class="remove-product">حذف صنف</button>
        `;
        productsContainer.appendChild(div);

        div
          .querySelector(".remove-product")
          .addEventListener("click", () => div.remove());
      });
    }

    // طباعة الوارد
    if (btn.classList.contains("print-btn")) {
      const purchase = await window.api.getPurchaseById(id);
      // هنا ممكن تمرر HTML للطباعة
      window.api.printInvoice(`<h1>فاتورة</h1><p>الوارد: ${id}</p>`);
    }
  });

  // ======== إرسال الفورم ========
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const products = Array.from(
      productsContainer.querySelectorAll(".product-item"),
    ).map((div) => ({
      product_name: div.querySelector(".product_name").value,
      quantity: parseInt(div.querySelector(".quantity").value),
      price: parseFloat(div.querySelector(".price").value),
    }));

    const data = {
      supplier_name: document.getElementById("supplier_name").value,
      supplier_phone: document.getElementById("supplier_phone").value,
      invoice_number: document.getElementById("invoice_number").value,
      invoice_date: document.getElementById("invoice_date").value,
      products,
    };

    const id = form.dataset.editId;
    if (id) {
      // تعديل وارد موجود
      await window.api.updatePurchase(id, data);
      delete form.dataset.editId;
      form.querySelector("button[type=submit]").textContent = "حفظ الوارد";
    } else {
      // إضافة وارد جديد
      await window.api.addPurchase(data);
    }

    form.reset();

    // إعادة الصنف الافتراضي داخل الفورم
    productsContainer.innerHTML = `
      <div class="product-item">
        <input type="text" class="product_name" placeholder="اسم الصنف" required>
        <input type="number" class="quantity" placeholder="الكمية" required>
        <input type="number" class="price" placeholder="السعر" step="0.01" required>
        <button type="button" class="remove-product">حذف صنف</button>
      </div>
    `;
    productsContainer
      .querySelector(".remove-product")
      .addEventListener("click", (e) => e.target.parentElement.remove());

    loadPurchases();
  });

  // ======== تحميل الواردات عند فتح الصفحة ========
  loadPurchases();
});
