// =================== Navigation ===================
document.getElementById("purchases").addEventListener("click", () => {
    window.location.href = "./purchases/purchases.html"
});

document.getElementById("sales").addEventListener("click", () => {
    window.location.href = "./sales/sales.html";
});

document.getElementById("items").addEventListener("click", () => {
    window.location.href = "./products/product.html";
});

document.getElementById("suppliers").addEventListener("click", () => {
    window.location.href = "./suppliers.html";
});

document.getElementById("reports").addEventListener("click", () => {
    window.location.href = "./inventory/inventory.html";
});

// =================== Dashboard Summary ===================
async function loadDashboardSummary() {
    try {
        const summary = await window.api.getDashboardSummary();

        document.getElementById("last-purchase").textContent = summary.lastPurchase || "-";
        document.getElementById("last-sale").textContent = summary.lastSale || "-";
        document.getElementById("item-count").textContent = summary.totalItems || 0;
        document.getElementById("stock-count").textContent = summary.totalStock || 0;
    } catch (error) {
        console.error("حدث خطأ في تحميل بيانات Dashboard:", error);
    }
}

loadDashboardSummary();
