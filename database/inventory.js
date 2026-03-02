module.exports = (db) => {
  db.exec(`
   CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId INTEGER UNIQUE,
    product_code INTEGER UNIQUE,
    product_name TEXT NOT NULL,
    unit_price REAL NOT NULL,
    quantity INTEGER DEFAULT 0,
    total_value REAL DEFAULT 0,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
   );
  `);
};  