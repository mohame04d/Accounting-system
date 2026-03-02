const db = require("../database/database");

// =================== إضافة منتج ===================
function addProduct(data) {
  // التأكد أن المنتج مش موجود
  const existing = db
    .prepare(`SELECT id FROM products WHERE productName = ?`)
    .get(data.productName);

  if (existing) {
    return { success: false, error: "المنتج موجود بالفعل" };
  }

  // إضافة المنتج في products (عمودين فقط: الاسم والسعر)
  const stmt = db.prepare(`
    INSERT INTO products (productName, unitPrice)
    VALUES (?, ?)
  `);

  const info = stmt.run(data.productName, data.unitPrice);
  const productId = info.lastInsertRowid;

  // ✅ إضافة تلقائية في inventory (product_code اختياري)
  db.prepare(
    `
    INSERT INTO inventory (productId, product_name, unit_price, quantity, total_value)
    VALUES (?, ?, ?, 0, 0)
  `,
  ).run(productId, data.productName, data.unitPrice);

  return { success: true, lastInsertRowid: productId };
}

// =================== البحث بالاسم ===================
function searchProducts(name) {
  return db
    .prepare(
      `
      SELECT id, productName, unitPrice
      FROM products
      WHERE productName LIKE ?
      ORDER BY productName ASC
    `,
    )
    .all(`%${name}%`);
}

// =================== جلب كل المنتجات ===================
function getAllProducts() {
  return db
    .prepare(
      `
      SELECT id, productName, unitPrice
      FROM products
      ORDER BY id DESC
    `,
    )
    .all();
}

// =================== جلب منتج بالـ id ===================
function getProductById(id) {
  return db
    .prepare(
      `
      SELECT id, productName, unitPrice
      FROM products
      WHERE id = ?
    `,
    )
    .get(id);
}

// =================== تحديث السعر ===================
function updateProductPrice(id, unitPrice) {
  const info = db
    .prepare(`UPDATE products SET unitPrice = ? WHERE id = ?`)
    .run(unitPrice, id);

  // تحديث السعر في inventory كمان
  db.prepare(
    `
    UPDATE inventory
    SET unit_price = ?
    WHERE productId = ?
  `,
  ).run(unitPrice, id);

  return info;
}

// =================== حذف المنتج ===================
function deleteProduct(id) {
  const info = db.prepare(`DELETE FROM products WHERE id = ?`).run(id);

  if (info.changes > 0) {
    // حذف من inventory كمان
    db.prepare(`DELETE FROM inventory WHERE productId = ?`).run(id);
    return { success: true };
  } else {
    return { success: false, message: "المنتج غير موجود" };
  }
}

module.exports = {
  addProduct,
  searchProducts,
  getAllProducts,
  getProductById,
  updateProductPrice,
  deleteProduct,
};
