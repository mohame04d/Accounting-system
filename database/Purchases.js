module.exports = (db) => {
  db.exec(`
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  supplier_name TEXT NOT NULL,        
  supplier_phone TEXT,                
  invoice_number TEXT,            
  invoice_date TEXT DEFAULT CURRENT_TIMESTAMP,
  product_details TEXT,
  total REAL DEFAULT 0 
);`);
};
