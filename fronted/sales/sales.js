document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("sales-form");
  const tableBody = document.getElementById("sales-table-body");
  const itemsContainer = document.getElementById("items-container");
  const addItemBtn = document.getElementById("add-item");
  const totalBeforeSpan = document.getElementById("total-before");
  const totalAfterSpan = document.getElementById("total-after");
  const discountInput = document.getElementById("discount");

  // جلب المنتجات
  let products = await window.api.getProducts();

  // ======= زر العودة للداشبورد =======
  document.getElementById("back-dashboard").addEventListener("click", () => {
    window.location.href = "../index.html";
  });

  // ======= حساب الإجمالي =======
  function calculateTotal() {
    let totalBefore = 0;
    itemsContainer.querySelectorAll(".item-row").forEach((row) => {
      const qty = parseFloat(row.querySelector(".quantity").value) || 0;
      const price = parseFloat(row.querySelector(".price").value) || 0;
      totalBefore += qty * price;
    });

    const discount = parseFloat(discountInput.value) || 0;
    const totalAfter = totalBefore - discount;

    totalBeforeSpan.textContent = totalBefore.toFixed(2);
    totalAfterSpan.textContent = totalAfter.toFixed(2);
  }

  // ======= إضافة صف صنف =======
  async function addItemRow(item = {}) {
    const div = document.createElement("div");
    div.classList.add("item-row");

    const select = document.createElement("select");
    select.className = "product_select";

    const quantity = document.createElement("input");
    quantity.type = "number";
    quantity.className = "quantity";
    quantity.placeholder = "الكمية";
    quantity.value = item.quantity || "";
    quantity.min = 1;

    const price = document.createElement("input");
    price.type = "number";
    price.className = "price";
    price.readOnly = true;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "حذف";
    removeBtn.type = "button";

    const errorMsg = document.createElement("span");
    errorMsg.className = "error-msg";

    // إضافة المنتجات للاختيار مع جلب المخزون
    for (const p of products) {
      const stock = await window.api.getInventoryQuantity(p.id);
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = p.productName;
      option.dataset.price = p.unitPrice;
      option.dataset.stock = stock || 0;
      select.appendChild(option);
    }

    // عند تغيير المنتج
    select.addEventListener("change", () => {
      const selectedOption = select.options[select.selectedIndex];
      price.value = parseFloat(selectedOption.dataset.price) || 0;
      quantity.max = parseInt(selectedOption.dataset.stock) || 0;
      errorMsg.textContent = "";
      calculateTotal();
    });

    // عند تغيير الكمية
    quantity.addEventListener("input", () => {
      const selectedOption = select.options[select.selectedIndex];
      const stock = parseInt(selectedOption.dataset.stock) || 0;

      if (quantity.value > stock) {
        errorMsg.textContent = `الكمية المتاحة من ${selectedOption.textContent} هي ${stock}`;
        quantity.value = stock;
      } else {
        errorMsg.textContent = "";
      }
      calculateTotal();
    });

    discountInput.addEventListener("input", calculateTotal);
    removeBtn.addEventListener("click", () => {
      div.remove();
      calculateTotal();
    });

    div.append(select, quantity, price, removeBtn, errorMsg);
    itemsContainer.appendChild(div);

    // لو جاي من تعديل
    if (item.productId) select.value = item.productId;
    select.dispatchEvent(new Event("change"));
  }

  addItemBtn.addEventListener("click", () => addItemRow());

  // ======= تحميل الفواتير =======
  async function loadSales() {
    const sales = await window.api.getSales();
    tableBody.innerHTML = "";

    sales.forEach((s) => {
      const tr = document.createElement("tr");
      tr.dataset.id = s.id;
      tr.innerHTML = `
        <td>${s.customer_name || "-"}</td>
        <td>${s.invoice_number}</td>
        <td>${s.invoice_date?.split("T")[0] || ""}</td>
        <td>${s.total?.toFixed(2) || "0.00"}</td>
        <td><button class="delete-btn" data-id="${s.id}">حذف</button></td>
        <td><button class="edit-btn" data-id="${s.id}">تعديل</button></td>
      `;

      // زر الطباعة
      const printTd = document.createElement("td");
      const printBtn = document.createElement("button");
      printBtn.textContent = "طباعة الفاتورة";
      printBtn.className = "print-invoice-btn";
      printBtn.addEventListener("click", async () => {
        try {
          await window.api.printInvoiceById(s.id);
          console.log("تم الطباعة بنجاح!");
        } catch (err) {
          console.error("خطأ في الطباعة:", err);
        }
      });
      printTd.appendChild(printBtn);
      tr.appendChild(printTd);

      tableBody.appendChild(tr);
    });

    // أزرار الحذف
    tableBody.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await window.api.deleteSale(btn.dataset.id);
        loadSales();
      });
    });

    // أزرار التعديل
    tableBody.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const sale = await window.api.getSaleById(btn.dataset.id);
        form.dataset.editId = sale.id;
        itemsContainer.innerHTML = "";

        document.getElementById("customer_name").value = sale.customer_name;
        document.getElementById("customer_phone").value = sale.customer_phone;
        document.getElementById("invoice_date").value =
          sale.invoice_date?.split("T")[0] || "";
        discountInput.value = sale.discount || 0;

        for (const item of sale.items) await addItemRow(item);
        calculateTotal();
      });
    });
  }

  // ======= حفظ الفاتورة =======
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const invoiceNumber = await window.api.getNextInvoiceNumber();

    const items = Array.from(itemsContainer.querySelectorAll(".item-row")).map(
      (row) => ({
        productId: row.querySelector(".product_select").value,
        quantity: parseInt(row.querySelector(".quantity").value),
        price: parseFloat(row.querySelector(".price").value),
      }),
    );

    const data = {
      customer_name: document.getElementById("customer_name").value,
      customer_phone: document.getElementById("customer_phone").value,
      invoice_number: invoiceNumber,
      invoice_date: document.getElementById("invoice_date").value,
      items,
      discount: parseFloat(discountInput.value) || 0,
      payment_method: document.getElementById("payment_method").value,
      notes: document.getElementById("notes").value,
    };

    try {
      if (form.dataset.editId) {
        await window.api.updateSale(form.dataset.editId, data);
        delete form.dataset.editId;
      } else {
        await window.api.addSale(data);
      }

      form.reset();
      itemsContainer.innerHTML = "";
      totalBeforeSpan.textContent = "0.00";
      totalAfterSpan.textContent = "0.00";
      await addItemRow();
      loadSales();
    } catch (err) {
      alert(err.message);
    }
  });

  // ======= أول صف افتراضي =======
  await addItemRow();
  loadSales();
});
