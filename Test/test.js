const db = require("../database/database");

// =================== إضافة مورد تجريبي لو مش موجود ===================
const supplierExists = db.prepare("SELECT 1 FROM suppliers WHERE id = 1").get();
if (!supplierExists) {
  db.prepare("INSERT INTO suppliers (id, name) VALUES (?, ?)").run(
    1,
    "مورد تجريبي"
  );
  console.log("تم إضافة مورد تجريبي.");
}

// =================== إضافة منتجات تجريبية لو مش موجودة ===================
const itemsToAdd = [
  { id: 1, name: "منتج تجريبي 1" },
  { id: 2, name: "منتج تجريبي 2" },
  { id: 3, name: "منتج تجريبي 3" },
];

itemsToAdd.forEach((item) => {
  const exists = db.prepare("SELECT 1 FROM items WHERE id = ?").get(item.id);
  if (!exists) {
    db.prepare(
      "INSERT INTO items (id, name, currentQuantity) VALUES (?, ?, ?)"
    ).run(item.id, item.name, 0);
    console.log(`تم إضافة ${item.name}`);
  }
});

console.log("جميع العناصر المرجعية جاهزة الآن.");
