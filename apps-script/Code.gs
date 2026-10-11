/**
 * Google Apps Script backend starter.
 * Spreadsheet tabs: Produk, Pesanan, DetailPesanan, MutasiStok.
 * Set Script Properties:
 *   SPREADSHEET_ID = ID spreadsheet
 *   ADMIN_KEY = long random secret (server-side only)
 *
 * Important: the browser frontend must call this through a secured proxy/API layer
 * or be served from a compatible Apps Script deployment. Do not expose ADMIN_KEY.
 */
const SHEETS = {
  PRODUCTS: "Produk",
  ORDERS: "Pesanan",
  ITEMS: "DetailPesanan",
  MOVEMENTS: "MutasiStok"
};
function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || "products");
  try {
    if (action === "products") return json_({ products: getProducts_().filter(p => p.active) });
    if (action === "orders") {
      requireAdmin_(e.parameter.adminKey);
      return json_({ orders: getOrders_() });
    }
    return json_({ error: "Aksi tidak dikenal" });
  } catch (err) {
    return json_({ error: err.message || String(err) });
  }
}
function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (_) {}
  try {
    const action = body.action || (e && e.parameter && e.parameter.action);
    if (action === "createOrder") return json_(createOrder_(body));
    requireAdmin_(body.adminKey || (e && e.parameter && e.parameter.adminKey));
    if (action === "confirm") return json_(confirmOrder_(body.orderId));
    if (action === "cancel") return json_(cancelOrder_(body.orderId));
    return json_({ error: "Aksi tidak dikenal" });
  } catch (err) {
    return json_({ error: err.message || String(err) });
  }
}
function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("SPREADSHEET_ID belum diatur di Script Properties.");
  return SpreadsheetApp.openById(id);
}
function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error("Sheet tidak ditemukan: " + name);
  return sh;
}
function rows_(name) {
  const values = sheet_(name).getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values.shift().map(String);
  return values.filter(r => r.some(v => v !== "")).map(r => {
    const o = {};
    headers.forEach((h,i) => o[h] = r[i]);
    return o;
  });
}
function getProducts_() {
  return rows_(SHEETS.PRODUCTS).map(r => ({
    sku: String(r.SKU || ""),
    name: String(r.Nama || ""),
    category: String(r.Kategori || "Lainnya"),
    price: Number(r.Harga || 0),
    stock: Number(r.Stok || 0),
    image: String(r.Foto || ""),
    active: r.Aktif === true || String(r.Aktif).toUpperCase() === "TRUE" || String(r.Aktif) === "1"
  }));
}
function getOrders_() {
  const orders = rows_(SHEETS.ORDERS);
  const items = rows_(SHEETS.ITEMS);
  return orders.map(o => ({
    orderId: String(o.OrderID || ""),
    createdAt: o.Dibuat instanceof Date ? o.Dibuat.toISOString() : String(o.Dibuat || ""),
    customerName: String(o.NamaPelanggan || ""),
    note: String(o.Catatan || ""),
    total: Number(o.Total || 0),
    status: String(o.Status || ""),
    items: items.filter(i => String(i.OrderID) === String(o.OrderID)).map(i => ({
      sku: String(i.SKU || ""), name: String(i.NamaProduk || ""),
      qty: Number(i.Jumlah || 0), price: Number(i.HargaSatuan || 0)
    }))
  })).reverse();
}
function createOrder_(body) {
  const customerName = String(body.customerName || "").trim().slice(0,100);
  const note = String(body.note || "").trim().slice(0,500);
  const items = Array.isArray(body.items) ? body.items : [];
  if (!customerName || !items.length) throw new Error("Nama dan produk pesanan wajib diisi.");
  const products = getProducts_();
  const cleanItems = [];
  let total = 0;
  items.forEach(item => {
    const p = products.find(x => x.sku === String(item.sku));
    const qty = Math.floor(Number(item.qty));
    if (!p || !p.active || qty < 1) throw new Error("Item pesanan tidak valid.");
    if (qty > p.stock) throw new Error("Stok tidak cukup untuk " + p.name + ". Pesanan belum dikonfirmasi.");
    cleanItems.push({ sku:p.sku, name:p.name, qty, price:p.price });
    total += p.price * qty;
  });
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const id = "ORD-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random()*9000+1000);
    sheet_(SHEETS.ORDERS).appendRow([id, new Date(), customerName, note, total, "PENDING"]);
    cleanItems.forEach(i => sheet_(SHEETS.ITEMS).appendRow([id, i.sku, i.name, i.qty, i.price, i.qty*i.price]));
    return { ok:true, orderId:id, status:"PENDING", total };
  } finally { lock.releaseLock(); }
}
function confirmOrder_(orderId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const orderSh = sheet_(SHEETS.ORDERS);
    const orders = orderSh.getDataRange().getValues();
    const rowIndex = orders.findIndex((r,i) => i > 0 && String(r[0]) === String(orderId));
    if (rowIndex < 1) throw new Error("Pesanan tidak ditemukan.");
    const status = String(orders[rowIndex][5] || "");
    if (status === "CONFIRMED") return { ok:true, alreadyProcessed:true, status };
    if (status !== "PENDING") throw new Error("Pesanan tidak berstatus PENDING.");
    const items = rows_(SHEETS.ITEMS).filter(i => String(i.OrderID) === String(orderId));
    const productSh = sheet_(SHEETS.PRODUCTS);
    const productValues = productSh.getDataRange().getValues();
    const header = productValues[0].map(String);
    const skuCol = header.indexOf("SKU"), stockCol = header.indexOf("Stok");
    if (skuCol < 0 || stockCol < 0) throw new Error("Kolom SKU/Stok tidak ditemukan.");
    // Validate every SKU before changing any stock.
    const changes = items.map(i => {
      const idx = productValues.findIndex((r,n) => n > 0 && String(r[skuCol]) === String(i.SKU));
      if (idx < 1) throw new Error("SKU tidak ditemukan: " + i.SKU);
      const oldStock = Number(productValues[idx][stockCol] || 0), qty = Number(i.Jumlah || 0);
      if (qty < 1 || oldStock < qty) throw new Error("Stok tidak cukup untuk SKU " + i.SKU);
      return { idx, sku:String(i.SKU), qty, oldStock, newStock:oldStock-qty };
    });
    changes.forEach(c => {
      productSh.getRange(c.idx+1, stockCol+1).setValue(c.newStock);
      sheet_(SHEETS.MOVEMENTS).appendRow([new Date(), c.sku, c.oldStock, -c.qty, c.newStock, "Pesanan dikonfirmasi", orderId]);
    });
    orderSh.getRange(rowIndex+1, 6).setValue("CONFIRMED");
    return { ok:true, orderId, status:"CONFIRMED" };
  } finally { lock.releaseLock(); }
}
function cancelOrder_(orderId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = sheet_(SHEETS.ORDERS), values = sh.getDataRange().getValues();
    const idx = values.findIndex((r,i) => i > 0 && String(r[0]) === String(orderId));
    if (idx < 1) throw new Error("Pesanan tidak ditemukan.");
    const status = String(values[idx][5] || "");
    if (status === "CANCELLED") return { ok:true, alreadyProcessed:true, status };
    if (status !== "PENDING") throw new Error("Pesanan sudah dikonfirmasi. Gunakan proses retur/refund terpisah untuk mengembalikan stok.");
    sh.getRange(idx+1,6).setValue("CANCELLED");
    return { ok:true, orderId, status:"CANCELLED" };
  } finally { lock.releaseLock(); }
}
function requireAdmin_(provided) {
  const expected = PropertiesService.getScriptProperties().getProperty("ADMIN_KEY");
  if (!expected || !provided || String(provided) !== expected) throw new Error("Akses admin ditolak.");
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
