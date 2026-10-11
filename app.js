/*
 * Konfigurasi awal. Ganti nomor WhatsApp toko.
 * Untuk demo, data produk di bawah dipakai bila backend belum dikonfigurasi.
 */
const CONFIG = {
  WHATSAPP_NUMBER: "6281234567890",
  API_URL: "", // URL endpoint aman Anda, setelah backend/proxy disiapkan.
  USE_DEMO_DATA: true
};
const DEMO_PRODUCTS = [
  {sku:"BRG001",name:"Botol Minum",category:"Perlengkapan",price:25000,stock:20,image:"",active:true},
  {sku:"BRG002",name:"Tas Belanja",category:"Aksesori",price:18000,stock:12,image:"",active:true},
  {sku:"BRG003",name:"Kotak Penyimpanan",category:"Rumah Tangga",price:42000,stock:8,image:"",active:true},
  {sku:"BRG004",name:"Handuk Serbaguna",category:"Rumah Tangga",price:30000,stock:15,image:"",active:true},
  {sku:"BRG005",name:"Tempat Makan",category:"Perlengkapan",price:35000,stock:0,image:"",active:true},
  {sku:"BRG006",name:"Pouch Kecil",category:"Aksesori",price:22000,stock:9,image:"",active:true},
  {sku:"BRG007",name:"Keranjang Mini",category:"Rumah Tangga",price:27000,stock:6,image:"",active:true},
  {sku:"BRG008",name:"Botol Travel",category:"Perlengkapan",price:32000,stock:10,image:"",active:true}
];
const rupiah = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n||0);
let products = [];
let cart = {};
let activeCategory = "Semua";
const $ = id => document.getElementById(id);

async function loadProducts(){
  try {
    if(CONFIG.API_URL){
      const response = await fetch(`${CONFIG.API_URL}?action=products`,{method:"GET"});
      if(!response.ok) throw new Error("Gagal membaca produk");
      const data = await response.json();
      products = (data.products||data).filter(p=>p.active!==false);
    } else if(CONFIG.USE_DEMO_DATA) products = DEMO_PRODUCTS;
    else throw new Error("Backend belum dikonfigurasi");
    $("productStatus").textContent = `${products.length} produk tersedia`;
  } catch(err) {
    products = CONFIG.USE_DEMO_DATA ? DEMO_PRODUCTS : [];
    $("productStatus").textContent = products.length ? "Mode demo — data belum terhubung ke Google Sheets" : "Produk belum dapat dimuat";
  }
  renderCategories(); renderProducts();
}
function renderCategories(){
  const cats=["Semua",...new Set(products.map(p=>p.category||"Lainnya"))];
  $("categoryNav").innerHTML=cats.map(c=>`<button class="category-chip ${c===activeCategory?"active":""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");
  $("categoryNav").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{activeCategory=b.dataset.category;renderCategories();renderProducts()}));
}
function renderProducts(){
  const query=$("searchInput").value.trim().toLowerCase();
  const list=products.filter(p=>(activeCategory==="Semua"||(p.category||"Lainnya")===activeCategory)&&`${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query));
  $("productGrid").innerHTML=list.length?list.map(p=>`<article class="product-card">
    <div class="product-image">${p.image?`<img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}" loading="lazy">`:"<span>✦</span>"}</div>
    <div class="product-body"><p class="sku">${escapeHtml(p.sku)}</p><h3 class="product-name">${escapeHtml(p.name)}</h3><p class="product-category">${escapeHtml(p.category||"Lainnya")}</p><div class="price">${rupiah(Number(p.price))}</div><p class="stock ${Number(p.stock)<=0?"out":""}">${Number(p.stock)>0?`Stok tersedia: ${Number(p.stock)}`:"Stok habis"}</p><button class="add-button" data-add="${escapeAttr(p.sku)}" ${Number(p.stock)<=0?"disabled":""}>${Number(p.stock)>0?"+ Tambah ke keranjang":"Stok habis"}</button></div>
  </article>`).join(""):`<div class="empty-state">Produk tidak ditemukan. Coba kata kunci lain.</div>`;
  $("productGrid").querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>addToCart(b.dataset.add)));
}
function addToCart(sku){
  const p=products.find(x=>x.sku===sku);if(!p)return;
  const current=cart[sku]||0;
  if(current>=Number(p.stock)){toast("Jumlah melebihi stok yang terlihat.");return}
  cart[sku]=current+1;renderCart();toast("Produk ditambahkan ke keranjang.");
}
function changeQty(sku,delta){
  const p=products.find(x=>x.sku===sku);if(!p)return;
  const next=(cart[sku]||0)+delta;
  if(next<=0)delete cart[sku];else if(next<=Number(p.stock))cart[sku]=next;else toast("Jumlah melebihi stok yang terlihat.");
  renderCart();
}
function renderCart(){
  const entries=Object.entries(cart).filter(([sku,q])=>q>0);
  $("cartCount").textContent=entries.reduce((s,[,q])=>s+q,0);
  $("cartItems").innerHTML=entries.length?entries.map(([sku,q])=>{const p=products.find(x=>x.sku===sku);if(!p)return"";return `<div class="cart-line"><div><h3>${escapeHtml(p.name)}</h3><p>${rupiah(Number(p.price))} / item</p><div class="quantity"><button data-delta="-1" data-sku="${escapeAttr(sku)}" aria-label="Kurangi">−</button><strong>${q}</strong><button data-delta="1" data-sku="${escapeAttr(sku)}" aria-label="Tambah" ${q>=Number(p.stock)?"disabled":""}>+</button><button data-remove="${escapeAttr(sku)}" aria-label="Hapus item">Hapus</button></div></div><div class="line-total">${rupiah(Number(p.price)*q)}</div></div>`}).join(""):`<div class="cart-empty">Keranjang Anda masih kosong.<br><br>Pilih produk untuk mulai berbelanja.</div>`;
  $("cartTotal").textContent=rupiah(cartTotal());
  $("cartItems").querySelectorAll("[data-delta]").forEach(b=>b.addEventListener("click",()=>changeQty(b.dataset.sku,Number(b.dataset.delta))));
  $("cartItems").querySelectorAll("[data-remove]").forEach(b=>b.addEventListener("click",()=>{delete cart[b.dataset.remove];renderCart()}));
}
function cartTotal(){return Object.entries(cart).reduce((sum,[sku,q])=>{const p=products.find(x=>x.sku===sku);return sum+(p?Number(p.price)*q:0)},0)}
function openCart(){ $("cartDrawer").classList.add("open");$("cartBackdrop").classList.add("open");$("cartDrawer").setAttribute("aria-hidden","false") }
function closeCart(){ $("cartDrawer").classList.remove("open");$("cartBackdrop").classList.remove("open");$("cartDrawer").setAttribute("aria-hidden","true") }
function checkout(e){
  e.preventDefault();const entries=Object.entries(cart).filter(([,q])=>q>0);
  if(!entries.length){toast("Keranjang masih kosong.");return}
  const name=$("customerName").value.trim();if(!name)return;
  const lines=entries.map(([sku,q])=>{const p=products.find(x=>x.sku===sku);return p?`- ${p.name} (${sku}) x${q} — ${rupiah(Number(p.price)*q)}`:""}).filter(Boolean);
  const message=["Halo, saya ingin memesan produk berikut:","",`Nama: ${name}`,...lines,"",`Total sementara: ${rupiah(cartTotal())}`,`Catatan/alamat: ${$("customerNote").value.trim()||"-"}`,"","Mohon konfirmasi ketersediaan dan pesanan saya. Pesanan belum dikonfirmasi sampai disetujui pihak toko."].join("\n");
  if(!CONFIG.WHATSAPP_NUMBER||CONFIG.WHATSAPP_NUMBER==="6281234567890"){toast("Ganti nomor WhatsApp toko di app.js terlebih dahulu.");return}
  window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,"_blank","noopener");
  toast("WhatsApp dibuka. Pesanan perlu dicatat/dikonfirmasi oleh admin.");
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function escapeAttr(v){return escapeHtml(v)}
function toast(msg){const old=document.querySelector(".toast");if(old)old.remove();const el=document.createElement("div");el.className="toast";el.textContent=msg;document.body.append(el);setTimeout(()=>el.remove(),2800)}
$("searchInput").addEventListener("input",renderProducts);
$("cartToggle").addEventListener("click",openCart);$("closeCart").addEventListener("click",closeCart);$("cartBackdrop").addEventListener("click",closeCart);$("checkoutForm").addEventListener("submit",checkout);
$("year").textContent=new Date().getFullYear();
loadProducts();renderCart();
