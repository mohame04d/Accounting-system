module.exports = (db) => {
  db.exec(`
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT,
  customer_phone TEXT,
  invoice_number TEXT,
  invoice_date TEXT DEFAULT CURRENT_TIMESTAMP,
  items_details TEXT NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  total_before_discount REAL DEFAULT 0,
  discount_percentage REAL DEFAULT 0,
  total REAL DEFAULT 0,
  notes TEXT
);
`);

  // لو الجدول موجود قبل كده بدون الأعمدة الجديدة
  const columns = db
    .prepare(`PRAGMA table_info(sales)`)
    .all()
    .map((c) => c.name);

  if (!columns.includes("total_before_discount")) {
    db.exec(
      `ALTER TABLE sales ADD COLUMN total_before_discount REAL DEFAULT 0`,
    );
  }
  if (!columns.includes("discount_percentage")) {
    db.exec(`ALTER TABLE sales ADD COLUMN discount_percentage REAL DEFAULT 0`);
  }
  if (!columns.includes("total")) {
    db.exec(`ALTER TABLE sales ADD COLUMN total REAL DEFAULT 0`);
  }
};
