const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // ======== Dashboard ========
  getDashboardSummary: () => ipcRenderer.invoke("dashboard-summary"),

  // ======== Purchases ========
  addPurchase: (data) => ipcRenderer.invoke("add-purchase", data),
  updatePurchase: (id, data) => ipcRenderer.invoke("update-purchase", id, data),
  getPurchases: () => ipcRenderer.invoke("get-purchases"),
  getPurchaseById: (id) => ipcRenderer.invoke("get-purchase-by-id", id),
  deletePurchase: (id) => ipcRenderer.invoke("delete-purchase", id),
  getNextInvoiceNumber: () => ipcRenderer.invoke("get-next-invoice-number"),

  // ======== Sales ========
  addSale: (data) => ipcRenderer.invoke("add-sale", data),
  updateSale: (id, data) => ipcRenderer.invoke("update-sale", id, data),
  getSales: () => ipcRenderer.invoke("get-sales"),
  getSaleById: (id) => ipcRenderer.invoke("get-sale-by-id", id),
  deleteSale: (id) => ipcRenderer.invoke("delete-sale", id),
  getSalesSummary: () => ipcRenderer.invoke("sales-summary"),

  // ======== Products ========
  addProduct: (data) => ipcRenderer.invoke("add-product", data),
  getProducts: () => ipcRenderer.invoke("get-products"),
  searchProducts: (name) => ipcRenderer.invoke("search-products", name),
  getProductById: (id) => ipcRenderer.invoke("get-product-by-id", id),
  updateProductPrice: (data) =>
    ipcRenderer.invoke("update-product-price", data),
  deleteProduct: (id) => ipcRenderer.invoke("delete-product", id),

  // ======== Inventory ========
  getInventory: () => ipcRenderer.invoke("get-inventory"),
  getInventoryQuantity: (productId) =>
    ipcRenderer.invoke("get-inventory-quantity", productId), // ✅ جلب الكمية الحقيقية
  onInventoryUpdate: (callback) => {
    ipcRenderer.on("refresh-inventory-table", (event) => callback());
  },

  // ======== Print Invoice (قديمة) ========
  printInvoice: (htmlContent) =>
    ipcRenderer.invoke("print-invoice", htmlContent),

  // ======== Print Invoice جديد – Sales ========
  printInvoiceById: (saleId) =>
    ipcRenderer.invoke("print-invoice-by-id", saleId),

  // ======== Print Purchase جديد – الوارد ========
  printPurchaseById: (purchaseId) =>
    ipcRenderer.invoke("print-purchase-by-id", purchaseId),
});