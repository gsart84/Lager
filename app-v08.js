
(() => {
  "use strict";

  const DB_NAME = "sps-lager-db";
  const DB_VERSION = 1;
  const STORE = "articles";

  let db;
  let currentProduct = null;
  let bookingMode = "in";

  const $ = id => document.getElementById(id);
  const views = [...document.querySelectorAll(".view")];

  function show(id) {
    views.forEach(v => v.classList.toggle("active", v.id === id));
    window.scrollTo({top:0, behavior:"instant"});
  }

  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, {keyPath:"barcode"});
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function objectStore(mode="readonly") {
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  function getAll() {
    return new Promise((resolve,reject) => {
      const req = objectStore().getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  function put(item) {
    return new Promise((resolve,reject) => {
      const req = objectStore("readwrite").put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  function remove(key) {
    return new Promise((resolve,reject) => {
      const req = objectStore("readwrite").delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  function normalizeName(value) {
    return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  }

  async function refreshHome(filter="") {
    const products = (await getAll()).map(p => ({
      ...p,
      displayName: p.name || p.barcode
    })).sort((a,b) => a.displayName.localeCompare(b.displayName, "de"));

    const total = products.reduce((sum,p) => sum + Number(p.stock || 0), 0);
    $("totalStock").textContent = total;
    $("productCount").textContent = `${products.length} ${products.length === 1 ? "Produkt" : "Produkte"}`;

    const q = filter.trim().toLowerCase();
    const filtered = products.filter(p => !q || p.displayName.toLowerCase().includes(q));

    const grid = $("productGrid");
    grid.innerHTML = "";

    if (!filtered.length) {
      grid.innerHTML = `<div class="empty-state">${q ? "Kein Produkt gefunden." : "Noch keine Produkte angelegt."}</div>`;
      return;
    }

    filtered.forEach(product => {
      const btn = document.createElement("button");
      btn.className = "product-card";
      btn.type = "button";
      btn.innerHTML = `
        <div class="product-name"></div>
        <div class="product-stock">
          <span>Bestand</span>
          <strong></strong>
        </div>
      `;
      btn.querySelector(".product-name").textContent = product.displayName;
      btn.querySelector(".product-stock strong").textContent = product.stock || 0;
      btn.addEventListener("click", () => openStock(product));
      grid.appendChild(btn);
    });
  }

  async function refreshSettingsList() {
    const products = (await getAll()).map(p => ({
      ...p,
      displayName: p.name || p.barcode
    })).sort((a,b) => a.displayName.localeCompare(b.displayName, "de"));

    const list = $("settingsProductList");
    list.innerHTML = "";

    if (!products.length) {
      list.innerHTML = `<div class="empty-state">Noch keine Produkte vorhanden.</div>`;
      return;
    }

    products.forEach(product => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "settings-product";
      btn.innerHTML = `<strong></strong><span></span>`;
      btn.querySelector("strong").textContent = product.displayName;
      btn.querySelector("span").textContent = `${product.stock || 0} Stück · Bearbeiten`;
      btn.addEventListener("click", () => openEditProduct(product));
      list.appendChild(btn);
    });
  }

  function openStock(product) {
    currentProduct = product;
    bookingMode = "in";
    $("stockProductName").textContent = product.name || product.barcode;
    $("currentStock").textContent = product.stock || 0;
    $("quantityInput").value = 1;
    updateBookingUi();
    show("stockView");
  }

  function updateBookingUi() {
    $("bookInMode").classList.toggle("active", bookingMode === "in");
    $("bookOutMode").classList.toggle("active", bookingMode === "out");
    const qty = Math.max(1, Number($("quantityInput").value || 1));
    $("applyStockBtn").textContent = `${qty} ${qty === 1 ? "Stück" : "Stück"} ${bookingMode === "in" ? "einbuchen" : "ausbuchen"}`;
  }

  async function applyBooking() {
    if (!currentProduct) return;
    const qty = Number($("quantityInput").value);
    if (!Number.isInteger(qty) || qty < 1) {
      toast("Bitte eine gültige Menge eingeben.");
      return;
    }

    const currentStock = Number(currentProduct.stock || 0);
    const nextStock = bookingMode === "in" ? currentStock + qty : currentStock - qty;

    if (nextStock < 0) {
      toast("Nicht genügend Bestand zum Ausbuchen.");
      return;
    }

    currentProduct = {
      ...currentProduct,
      stock: nextStock,
      updatedAt: new Date().toISOString()
    };
    await put(currentProduct);
    $("currentStock").textContent = nextStock;
    toast(`${qty} Stück ${bookingMode === "in" ? "eingebucht" : "ausgebucht"}.`);
    await refreshHome();
  }

  function openNewProduct() {
    currentProduct = null;
    $("formKicker").textContent = "Neues Produkt";
    $("formTitle").textContent = "Produkt anlegen";
    $("productNameInput").value = "";
    $("initialStockInput").value = 0;
    $("initialStockWrap").classList.remove("hidden");
    $("deleteProductBtn").classList.add("hidden");
    show("productFormView");
    setTimeout(() => $("productNameInput").focus(), 100);
  }

  function openEditProduct(product) {
    currentProduct = product;
    $("formKicker").textContent = "Produkt bearbeiten";
    $("formTitle").textContent = product.name || product.barcode;
    $("productNameInput").value = product.name || product.barcode;
    $("initialStockWrap").classList.add("hidden");
    $("deleteProductBtn").classList.remove("hidden");
    show("productFormView");
  }

  async function saveProduct() {
    const name = normalizeName($("productNameInput").value);
    if (!name) {
      toast("Bitte einen Produktnamen eingeben.");
      return;
    }

    if (currentProduct) {
      const updated = {
        ...currentProduct,
        name,
        updatedAt: new Date().toISOString()
      };
      await put(updated);
      toast("Produkt gespeichert.");
    } else {
      const existing = (await getAll()).find(p => (p.name || p.barcode).toUpperCase() === name);
      if (existing) {
        toast("Dieses Produkt ist bereits vorhanden.");
        return;
      }

      const stock = Math.max(0, Number($("initialStockInput").value || 0));
      await put({
        barcode: name,
        name,
        stock,
        updatedAt: new Date().toISOString()
      });
      toast("Produkt angelegt.");
    }

    await refreshHome();
    await refreshSettingsList();
    show("settingsView");
  }

  async function deleteProduct() {
    if (!currentProduct) return;
    const name = currentProduct.name || currentProduct.barcode;
    if (!confirm(`${name} wirklich löschen?`)) return;
    await remove(currentProduct.barcode);
    currentProduct = null;
    await refreshHome();
    await refreshSettingsList();
    show("settingsView");
    toast("Produkt gelöscht.");
  }

  function csvEscape(value) {
    return `"${String(value ?? "").replaceAll('"','""')}"`;
  }

  function stamp() {
    return new Date().toISOString().slice(0,10);
  }

  async function shareFile(blob, filename) {
    const file = new File([blob], filename, {type:blob.type});
    if (navigator.canShare && navigator.canShare({files:[file]})) {
      await navigator.share({files:[file], title:filename});
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportCsv() {
    const rows = [["Produkt","Bestand","Letzte Änderung"]];
    (await getAll()).sort((a,b)=>(a.name||a.barcode).localeCompare(b.name||b.barcode,"de"))
      .forEach(p => rows.push([p.name||p.barcode,p.stock||0,p.updatedAt||""]));
    const content = "\ufeff" + rows.map(r => r.map(csvEscape).join(";")).join("\r\n");
    await shareFile(new Blob([content],{type:"text/csv;charset=utf-8"}),`SPS-Lager_${stamp()}.csv`);
  }

  async function exportXls() {
    const products = await getAll();
    const rows = products.map(p => `<tr><td>${p.name||p.barcode}</td><td>${p.stock||0}</td><td>${p.updatedAt||""}</td></tr>`).join("");
    const html = `<html><meta charset="utf-8"><table><tr><th>Produkt</th><th>Bestand</th><th>Letzte Änderung</th></tr>${rows}</table></html>`;
    await shareFile(new Blob([html],{type:"application/vnd.ms-excel"}),`SPS-Lager_${stamp()}.xls`);
  }

  async function exportBackup() {
    const payload = {app:"SPS Lager",version:"0.8",exportedAt:new Date().toISOString(),articles:await getAll()};
    await shareFile(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),`SPS-Lager_Backup_${stamp()}.json`);
  }

  async function printPdf() {
    const products = (await getAll()).sort((a,b)=>(a.name||a.barcode).localeCompare(b.name||b.barcode,"de"));
    const total = products.reduce((s,p)=>s+Number(p.stock||0),0);
    const rows = products.map(p=>`<tr><td>${p.name||p.barcode}</td><td>${p.stock||0}</td></tr>`).join("");
    const w = window.open("","_blank");
    if (!w) return toast("Pop-ups bitte erlauben.");
    w.document.write(`<html><head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}</style></head><body><h1>SPS Lager</h1><p>${products.length} Produkte · ${total} Stück</p><table><tr><th>Produkt</th><th>Bestand</th></tr>${rows}</table><script>onload=()=>print()<\/script></body></html>`);
    w.document.close();
  }

  async function restoreBackup(file) {
    const payload = JSON.parse(await file.text());
    if (!payload || !Array.isArray(payload.articles)) throw new Error();
    for (const p of payload.articles) {
      if (!p.barcode && !p.name) continue;
      const name = normalizeName(p.name || p.barcode);
      await put({
        barcode: p.barcode || name,
        name,
        stock: Math.max(0, Number(p.stock || 0)),
        updatedAt: p.updatedAt || new Date().toISOString()
      });
    }
    await refreshHome();
    await refreshSettingsList();
  }

  function bindEvents() {
    $("settingsBtn").onclick = async () => { await refreshSettingsList(); show("settingsView"); };
    document.querySelectorAll("[data-home]").forEach(b => b.onclick = async () => { await refreshHome(); show("homeView"); });

    $("searchInput").oninput = e => refreshHome(e.target.value);

    $("bookInMode").onclick = () => { bookingMode = "in"; updateBookingUi(); };
    $("bookOutMode").onclick = () => { bookingMode = "out"; updateBookingUi(); };
    $("quantityInput").oninput = updateBookingUi;
    document.querySelectorAll("[data-qty]").forEach(b => b.onclick = () => {
      $("quantityInput").value = b.dataset.qty;
      updateBookingUi();
    });
    $("applyStockBtn").onclick = applyBooking;

    $("newProductBtn").onclick = openNewProduct;
    $("backToSettings").onclick = async () => { await refreshSettingsList(); show("settingsView"); };
    $("saveProductBtn").onclick = saveProduct;
    $("deleteProductBtn").onclick = deleteProduct;

    $("csvBtn").onclick = () => exportCsv().catch(()=>toast("CSV-Export fehlgeschlagen."));
    $("xlsBtn").onclick = () => exportXls().catch(()=>toast("Excel-Export fehlgeschlagen."));
    $("pdfBtn").onclick = () => printPdf().catch(()=>toast("PDF-Export fehlgeschlagen."));
    $("backupBtn").onclick = () => exportBackup().catch(()=>toast("Backup fehlgeschlagen."));
    $("restoreInput").onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await restoreBackup(file);
        toast("Backup wiederhergestellt.");
      } catch {
        toast("Backup konnte nicht gelesen werden.");
      }
      e.target.value = "";
    };
  }

  async function init() {
    try {
      db = await openDb();
      bindEvents();
      await refreshHome();
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./service-worker.js").catch(console.warn);
      }
    } catch (err) {
      console.error(err);
      alert("Lokale Datenbank konnte nicht geöffnet werden.");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
