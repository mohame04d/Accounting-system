module.exports = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      type TEXT CHECK(type IN ('IN','OUT')) NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      referenceId INTEGER,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    )
  `);
};
