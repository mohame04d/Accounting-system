const db = require("../database/database");

// ======== الحصول على كمية المنتج من الجرد ========
function getInventoryQuantity(productId) {
  const item = db
    .prepare(`SELECT quantity FROM inventory WHERE productId = ?`)
    .get(productId);
  return item ? item.quantity : 0;
}

// ======== تقليل المخزون مع التحقق ========
function decreaseInventory(productId, quantity, referenceId) {
  const product = db
    .prepare(`SELECT id, unitPrice, productName FROM products WHERE id = ?`)
    .get(productId);
  if (!product) throw new Error("المنتج غير موجود");

  const item = db
    .prepare(`SELECT * FROM inventory WHERE productId = ?`)
    .get(product.id);
  if (!item) throw new Error("المخزون غير موجود لهذا المنتج");

  if (item.quantity === 0)
    throw new Error(`المنتج "${product.productName}" نفذ`);

  if (quantity > item.quantity)
    throw new Error(
      `الكمية المطلوبة للمنتج "${product.productName}" أكبر من المتوفر (${item.quantity})`,
    );

  const newQty = item.quantity - quantity;

  db.prepare(
    `UPDATE inventory SET quantity = ?, total_value = ? WHERE productId = ?`,
  ).run(newQty, newQty * product.unitPrice, product.id);

  db.prepare(
    `INSERT INTO inventory_logs (productId, type, quantity, referenceId) VALUES (?, 'OUT', ?, ?)`,
  ).run(product.id, quantity, referenceId);
}

// ======== استرجاع المخزون ========
function restoreInventory(productId, quantity, referenceId) {
  const product = db
    .prepare(`SELECT id, unitPrice FROM products WHERE id = ?`)
    .get(productId);
  if (!product) return;

  const item = db
    .prepare(`SELECT * FROM inventory WHERE productId = ?`)
    .get(product.id);
  if (!item) return;

  const newQty = item.quantity + quantity;

  db.prepare(
    `UPDATE inventory SET quantity = ?, total_value = ? WHERE productId = ?`,
  ).run(newQty, newQty * product.unitPrice, product.id);

  db.prepare(
    `INSERT INTO inventory_logs (productId, type, quantity, referenceId) VALUES (?, 'IN', ?, ?)`,
  ).run(product.id, quantity, referenceId);
}

// ======== إضافة فاتورة ========
function addSale(data) {
  const transaction = db.transaction(() => {
    const items = data.items || [];
    if (items.length === 0) throw new Error("لا يوجد أصناف في الفاتورة");

    let totalBeforeDiscount = 0;

    items.forEach((item) => {
      const product = db
        .prepare(`SELECT unitPrice, productName FROM products WHERE id = ?`)
        .get(item.productId);
      if (!product) throw new Error("المنتج غير موجود");

      const availableQty = getInventoryQuantity(item.productId);
      if (availableQty === 0)
        throw new Error(`المنتج "${product.productName}" نفذ`);
      if (item.quantity > availableQty)
        throw new Error(
          `الكمية المطلوبة للمنتج "${product.productName}" أكبر من المتوفر (${availableQty})`,
        );

      item.price = product.unitPrice;
      totalBeforeDiscount += item.quantity * product.unitPrice;
    });

    const discountPercentage = data.discount || 0;
    const totalAfterDiscount =
      totalBeforeDiscount * (1 - discountPercentage / 100);

    const result = db
      .prepare(
        `INSERT INTO sales
      (customer_name, customer_phone, invoice_number, invoice_date, items_details, payment_method, total_before_discount, discount_percentage, total, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.customer_name || "عميل نقدي",
        data.customer_phone || "",
        data.invoice_number || "",
        data.invoice_date || new Date().toISOString(),
        JSON.stringify(items),
        data.payment_method || "cash",
        totalBeforeDiscount,
        discountPercentage,
        totalAfterDiscount,
        data.notes || "",
      );

    const saleId = result.lastInsertRowid;

    items.forEach((item) =>
      decreaseInventory(item.productId, item.quantity, saleId),
    );

    return saleId;
  });

  return transaction();
}

// ======== تعديل فاتورة ========
function updateSale(id, data) {
  const transaction = db.transaction(() => {
    const oldSale = getSaleById(id);
    if (!oldSale) throw new Error("الفاتورة غير موجودة");

    oldSale.items.forEach((item) =>
      restoreInventory(item.productId, item.quantity, id),
    );

    const items = data.items || [];
    let totalBeforeDiscount = 0;

    items.forEach((item) => {
      const product = db
        .prepare(`SELECT unitPrice, productName FROM products WHERE id = ?`)
        .get(item.productId);
      if (!product) throw new Error("المنتج غير موجود");

      const availableQty = getInventoryQuantity(item.productId);
      if (availableQty === 0)
        throw new Error(`المنتج "${product.productName}" نفذ`);
      if (item.quantity > availableQty)
        throw new Error(
          `الكمية المطلوبة للمنتج "${product.productName}" أكبر من المتوفر (${availableQty})`,
        );

      item.price = product.unitPrice;
      totalBeforeDiscount += item.quantity * product.unitPrice;
    });

    const discountPercentage = data.discount || 0;
    const totalAfterDiscount =
      totalBeforeDiscount * (1 - discountPercentage / 100);

    db.prepare(
      `UPDATE sales
       SET customer_name = ?, customer_phone = ?, invoice_number = ?, invoice_date = ?,
           items_details = ?, payment_method = ?, total_before_discount = ?, discount_percentage = ?, total = ?, notes = ?
       WHERE id = ?`,
    ).run(
      data.customer_name || oldSale.customer_name,
      data.customer_phone || oldSale.customer_phone,
      data.invoice_number || oldSale.invoice_number,
      data.invoice_date || oldSale.invoice_date,
      JSON.stringify(items),
      data.payment_method || oldSale.payment_method,
      totalBeforeDiscount,
      discountPercentage,
      totalAfterDiscount,
      data.notes || oldSale.notes,
      id,
    );

    items.forEach((item) =>
      decreaseInventory(item.productId, item.quantity, id),
    );
  });

  transaction();
}

// ======== حذف فاتورة ========
function deleteSale(id) {
  const transaction = db.transaction(() => {
    const sale = getSaleById(id);
    if (!sale) return;

    sale.items.forEach((item) =>
      restoreInventory(item.productId, item.quantity, id),
    );
    db.prepare("DELETE FROM sales WHERE id = ?").run(id);
  });

  transaction();
}

// ======== قراءة المبيعات ========
function getSales() {
  return db
    .prepare("SELECT * FROM sales ORDER BY id DESC")
    .all()
    .map((row) => ({ ...row, items: JSON.parse(row.items_details || "[]") }));
}

function getSaleById(id) {
  const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(id);
  if (!sale) return null;

  return { ...sale, items: JSON.parse(sale.items_details || "[]") };
}

function getSalesSummary() {
  const result = db
    .prepare(
      `SELECT SUM(total) as totalSales, COUNT(id) as invoicesCount FROM sales`,
    )
    .get();
  return {
    totalSales: result.totalSales || 0,
    invoicesCount: result.invoicesCount || 0,
  };
}

module.exports = {
  addSale,
  updateSale,
  getSales,
  deleteSale,
  getSaleById,
  getSalesSummary,
  getInventoryQuantity, // <- أضفت هذه الدالة للفرونت
};
