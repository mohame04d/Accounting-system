const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "accounting.db");
const db = new Database(dbPath);

const createItems = require("./product");
const createSuppliers = require("./Suppliers");
const createPurchases = require("./Purchases");
const createSales = require("./sales");
const createInventory = require("./inventory");
const createInventory_log = require("./inventory_log");

createItems(db);
createSuppliers(db);
createPurchases(db);
createSales(db);
createInventory(db);
createInventory_log(db);

module.exports = db;

