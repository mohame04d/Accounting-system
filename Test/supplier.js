const { addSupplier, getSuppliers } = require("./backend/suppliers");

// إضافة مورد جديد
const supplierId = addSupplier("شركة المتحدة وود", "01012345678", "القاهرة");
console.log("تم إضافة مورد جديد بالـ ID:", supplierId);

// جلب كل الموردين
const suppliers = getSuppliers();
console.log("قائمة الموردين الحالية:");
console.table(suppliers);
