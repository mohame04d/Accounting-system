// backend/suppliers.js
const db = require("../database/database"); // استدعاء قاعدة البيانات

// 1. إضافة مورد جديد
function addSupplier(name, phone, address) {
  const stmt = db.prepare(
    "INSERT INTO suppliers (name, phone, address) VALUES (?, ?, ?)",
  );
  const result = stmt.run(name, phone, address);
  return result.lastInsertRowid; // هيرجع ID المورد الجديد
}

// 2. جلب كل الموردين
function getSuppliers() {
  const stmt = db.prepare("SELECT * FROM suppliers");
  return stmt.all();
}

// 3. (اختياري) جلب مورد واحد بالـ ID
function getSupplierById(id) {
  const stmt = db.prepare("SELECT * FROM suppliers WHERE id = ?");
  return stmt.get(id);
}

module.exports = { addSupplier, getSuppliers, getSupplierById };

