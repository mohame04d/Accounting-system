const db = require("../database/database");

// ======== استرجاع كل المخزون ========
function getInventory() {
  return db
    .prepare(
      `SELECT p.id as productId, p.productName as product_name, p.productCode, p.unitPrice as unit_price,
                     i.quantity, i.total_value
              FROM inventory i
              JOIN products p ON p.id = i.productId
              ORDER BY p.id ASC`,
    )
    .all();
}

// ======== استرجاع كمية منتج معين ========
function getInventoryQuantity(productId) {
  const item = db
    .prepare(`SELECT quantity FROM inventory WHERE productId = ?`)
    .get(productId);
  return item ? item.quantity : 0;
}

module.exports = {
  getInventory,
  getInventoryQuantity, // 👈 صدّر الدالة الجديدة
};
