const { createPurchase } = require("../Backend/purchases");
const db = require('../database/database')
const purchaseId = createPurchase({
  supplierId: 1,
  date: "2026-02-10",
  discount: 100,
  notes: "فاتورة تجريبية",
  items: [
    { itemId: 1, quantity: 10, price: 50 },
    { itemId: 2, quantity: 5, price: 100 },
  ],
});

console.log("✅ تم تسجيل الوارد برقم:", purchaseId);

const inventory = db
  .prepare("SELECT id, name, currentQuantity FROM items")
  .all();
console.table(inventory);
