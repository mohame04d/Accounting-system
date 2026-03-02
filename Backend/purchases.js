const db = require("../database/database");
const { getSales } = require("./sales");
const { BrowserWindow } = require("electron");

// ======== Helper: تحديث المخزن وصدر حدث للواجهة ========
function updateInventory(productName, quantity, referenceId) {
  // استخرج المنتج
  let product = db
    .prepare(`SELECT id, unitPrice FROM products WHERE productName = ?`)
    .get(productName);

  // لو المنتج مش موجود، ضيفه تلقائيًا
  if (!product) {
    const result = db
      .prepare(`INSERT INTO products (productName, unitPrice) VALUES (?, ?)`)
      .run(productName, 0); // افتراضياً السعر 0
    product = {
      id: result.lastInsertRowid,
      unitPrice: 0,
    };
  }

  // شوف موجود في المخزن ولا لأ
  const item = db
    .prepare(`SELECT * FROM inventory WHERE productId = ?`)
    .get(product.id);

  if (!item) {
    // أول مرة يدخل المخزن
    db.prepare(
      `INSERT INTO inventory (productId, product_name, quantity, unit_price, total_value)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      product.id,
      productName,
      quantity,
      product.unitPrice,
      quantity * product.unitPrice,
    );
  } else {
    const newQty = item.quantity + quantity;
    db.prepare(
      `UPDATE inventory SET quantity = ?, total_value = ? WHERE productId = ?`,
    ).run(newQty, newQty * product.unitPrice, product.id);
  }

  // Log الحركة في inventory_logs
  db.prepare(
    `INSERT INTO inventory_logs (productId, type, quantity, referenceId)
     VALUES (?, 'IN', ?, ?)`,
  ).run(product.id, Math.abs(quantity), referenceId);

  // إرسال حدث لتحديث الجرد لكل النوافذ المفتوحة
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send("refresh-inventory-table");
  });
}

// =================== إضافة وارد ===================
function addPurchase(data) {
  const transaction = db.transaction(() => {
    const products = data.products || [];
    const total = products.reduce((sum, p) => sum + p.quantity * p.price, 0);

    // احسب رقم الفاتورة الجديد ديناميكي
    const lastInvoice = db
      .prepare(`SELECT invoice_number FROM purchases ORDER BY id DESC LIMIT 1`)
      .get();
    const nextInvoiceNumber = lastInvoice
      ? Number(lastInvoice.invoice_number) + 1
      : 1;

    const result = db
      .prepare(
        `INSERT INTO purchases 
       (supplier_name, supplier_phone, date, invoice_number, invoice_date, product_details, total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.supplier_name || "مورد مجهول",
        data.supplier_phone || "",
        new Date().toISOString(),
        nextInvoiceNumber.toString(),
        data.invoice_date || new Date().toISOString(),
        JSON.stringify(products),
        total,
      );

    const purchaseId = result.lastInsertRowid;

    products.forEach((p) => {
      updateInventory(p.product_name, p.quantity, purchaseId);
    });

    return purchaseId;
  });

  return transaction();
}

// =================== قراءة كل الوارد ===================
function getPurchases() {
  return db
    .prepare("SELECT * FROM purchases ORDER BY id DESC")
    .all()
    .map((row) => ({
      ...row,
      products: JSON.parse(row.product_details || "[]"),
    }));
}

// =================== ملخص Dashboard ===================
function getDashboardSummary() {
  const allPurchases = getPurchases();
  const lastPurchase = allPurchases[0];
  const totalItems = allPurchases.reduce(
    (acc, p) => acc + p.products.length,
    0,
  );
  const totalStock = allPurchases.reduce(
    (acc, p) => acc + p.products.reduce((sum, item) => sum + item.quantity, 0),
    0,
  );
  const totalRevenue = allPurchases.reduce((acc, p) => acc + (p.total || 0), 0);

  const allSales = getSales();
  const lastSale = allSales[0];

  return {
    lastPurchase: lastPurchase
      ? `${lastPurchase.supplier_name} - ${lastPurchase.date}`
      : "لا يوجد وارد",
    lastSale: lastSale
      ? `${lastSale.customer_name || "عميل"} - ${lastSale.invoice_date}`
      : "لا يوجد بيع",
    totalItems,
    totalStock,
    totalRevenue,
  };
}

// =================== قراءة وارد واحد ===================
function getPurchaseById(id) {
  const row = db.prepare("SELECT * FROM purchases WHERE id = ?").get(id);
  if (!row) return null;

  return {
    ...row,
    products: JSON.parse(row.product_details || "[]"),
  };
}

// =================== تعديل وارد ===================
function updatePurchase(id, data) {
  const transaction = db.transaction(() => {
    const oldPurchase = getPurchaseById(id);
    if (!oldPurchase) throw new Error("الوارد غير موجود");

    // خصم الكميات القديمة
    oldPurchase.products.forEach((p) => {
      updateInventory(p.product_name, -p.quantity, id);
    });

    const products = data.products;
    const total = products.reduce((sum, p) => sum + p.quantity * p.price, 0);

    db.prepare(
      `UPDATE purchases
       SET supplier_name = ?, supplier_phone = ?, invoice_number = ?, invoice_date = ?, product_details = ?, total = ?
       WHERE id = ?`,
    ).run(
      data.supplier_name,
      data.supplier_phone,
      data.invoice_number,
      data.invoice_date,
      JSON.stringify(products),
      total,
      id,
    );

    // إضافة الكميات الجديدة
    products.forEach((p) => {
      updateInventory(p.product_name, p.quantity, id);
    });
  });

  transaction();
  return getPurchaseById(id);
}

// =================== حذف وارد ===================
function deletePurchase(id) {
  const purchase = getPurchaseById(id);
  if (!purchase) return;

  const transaction = db.transaction(() => {
    purchase.products.forEach((p) => {
      updateInventory(p.product_name, -p.quantity, id);
    });

    db.prepare("DELETE FROM purchases WHERE id = ?").run(id);
  });

  transaction();
}

module.exports = {
  addPurchase,
  updatePurchase,
  deletePurchase,
  getPurchases,
  getDashboardSummary,
  getPurchaseById,
};
