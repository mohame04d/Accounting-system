const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// Backends
const purchasesBackend = require("./Backend/purchases");
const salesBackend = require("./Backend/sales");
const productsBackend = require("./Backend/product");
const inventoryBackend = require("./Backend/inventory");

// ======= Create Main Window =======
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "./preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadFile("./fronted/index.html");
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ======= Helper Function =======
function refreshInventoryWindows() {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send("refresh-inventory-table");
  });
}

// ================== IPC Handlers ==================

// ======= Dashboard =======
ipcMain.handle("dashboard-summary", () =>
  purchasesBackend.getDashboardSummary(),
);
ipcMain.handle("sales-summary", () => salesBackend.getSalesSummary());

// ======= Inventory =======
ipcMain.handle("get-inventory", () => inventoryBackend.getInventory());
ipcMain.handle("get-inventory-quantity", (event, productId) =>
  inventoryBackend.getInventoryQuantity(productId),
);

// ======= Purchases =======
ipcMain.handle("add-purchase", async (event, purchase) => {
  try {
    const result = await purchasesBackend.addPurchase(purchase);
    refreshInventoryWindows();
    return result;
  } catch (err) {
    console.error("Add purchase error:", err);
    return null;
  }
});

ipcMain.handle("update-purchase", async (event, id, data) => {
  try {
    const result = await purchasesBackend.updatePurchase(id, data);
    refreshInventoryWindows();
    return result;
  } catch (err) {
    console.error("Update purchase error:", err);
    throw err;
  }
});

ipcMain.handle("delete-purchase", async (event, id) => {
  try {
    const result = await purchasesBackend.deletePurchase(id);
    refreshInventoryWindows();
    return result;
  } catch (err) {
    console.error("Delete purchase error:", err);
    return null;
  }
});

ipcMain.handle("get-purchases", () => purchasesBackend.getPurchases());
ipcMain.handle("get-purchase-by-id", (event, id) =>
  purchasesBackend.getPurchaseById(id),
);

// ======= Dynamic Invoice Number =======
ipcMain.handle("get-next-invoice-number", () => {
  const sales = salesBackend.getSales();
  const maxInvoice = sales.reduce((max, s) => {
    const num = parseInt(s.invoice_number) || 0;
    return num > max ? num : max;
  }, 0);
  return maxInvoice + 1;
});

// ======= Sales =======
ipcMain.handle("add-sale", async (event, sale) => {
  try {
    const result = await salesBackend.addSale(sale);
    refreshInventoryWindows();
    return result;
  } catch (err) {
    console.error("Add sale error:", err);
    return null;
  }
});

ipcMain.handle("update-sale", async (event, id, data) => {
  try {
    const result = await salesBackend.updateSale(id, data);
    refreshInventoryWindows();
    return result;
  } catch (err) {
    console.error("Update sale error:", err);
    throw err;
  }
});

ipcMain.handle("delete-sale", async (event, id) => {
  try {
    const result = await salesBackend.deleteSale(id);
    refreshInventoryWindows();
    return result;
  } catch (err) {
    console.error("Delete sale error:", err);
    return null;
  }
});

ipcMain.handle("get-sales", () => salesBackend.getSales());
ipcMain.handle("get-sale-by-id", (event, id) => salesBackend.getSaleById(id));

// ======= Products =======
ipcMain.handle("add-product", async (event, data) => {
  try {
    const result = await productsBackend.addProduct(data);
    return { success: true, result };
  } catch (err) {
    console.error("Add product error:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-products", () => productsBackend.getAllProducts());
ipcMain.handle("get-product-by-id", (event, id) =>
  productsBackend.getProductById(id),
);
ipcMain.handle("search-products", (event, name) =>
  productsBackend.searchProducts(name),
);

ipcMain.handle("update-product-price", async (event, data) => {
  try {
    const result = await productsBackend.updateProductPrice(
      data.id,
      data.unitPrice,
    );
    return { success: true, result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("delete-product", async (event, id) => {
  try {
    const result = await productsBackend.deleteProduct(id);
    return result;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// =======================================================
// ======= Print Invoice – Sales by ID (معدل فقط) =======
// =======================================================

ipcMain.handle("print-invoice-by-id", async (event, saleId) => {
  try {
    const sale = salesBackend.getSaleById(saleId);
    if (!sale) throw new Error("فاتورة غير موجودة");

    // ✅ تحويل items_details بدل sale.items
    const items = JSON.parse(sale.items_details || "[]");

    // ✅ حساب بالإسم الصحيح للحقول
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.price, 0);

    const discount = sale.discount_percentage || 0;
    const netTotal = subtotal - discount;
    const paid = sale.total || 0;
    const due = netTotal - paid;

    let html = fs.readFileSync(
      path.join(__dirname, "./fronted/invoice.html"),
      "utf8",
    );

    let itemsHtml = "";

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const product = await productsBackend.getProductById(item.productId);

      itemsHtml += `
        <tr>
          <td>${i + 1}</td>
          <td>${product ? product.productName : "منتج"}</td>
          <td>${item.quantity}</td>
          <td>${item.price.toFixed(2)}</td>
          <td>${(item.quantity * item.price).toFixed(2)}</td>
        </tr>
      `;
    }

    html = html
      .replace("{{companyName}}", "مصنع محمد")
      .replace("{{companyAddress}}", "العنوان هنا")
      .replace("{{companyPhone}}", "01000000000")
      .replace("{{invoiceNumber}}", sale.invoice_number || sale.id)
      .replace("{{invoiceDate}}", sale.invoice_date)
      .replace("{{customerName}}", sale.customer_name)
      .replace("{{customerPhone}}", sale.customer_phone)
      .replace("{{itemsRows}}", itemsHtml)
      .replace("{{subtotal}}", subtotal.toFixed(2))
      .replace("{{discount}}", discount.toFixed(2))
      .replace("{{netTotal}}", netTotal.toFixed(2))
      .replace("{{paid}}", paid.toFixed(2))
      .replace("{{due}}", due.toFixed(2))
      .replace("{{companyWebsite}}", "www.example.com");

    const printWin = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: { nodeIntegration: true, contextIsolation: false },
    });

    printWin.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
    );

    return new Promise((resolve, reject) => {
      printWin.webContents.on("did-finish-load", () => {
        printWin.webContents.print(
          { silent: false, printBackground: true },
          (success, reason) => {
            if (!success) reject(reason);
            else resolve(true);
            printWin.close();
          },
        );
      });
    });
  } catch (err) {
    console.error("Print Invoice Error:", err);
    throw err;
  }
});
