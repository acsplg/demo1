const $=id=>document.getElementById(id);
let apiUrl="",adminKey="";
const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
$("connectForm").addEventListener("submit",e=>{e.preventDefault();apiUrl=$("apiUrl").value.trim();adminKey=$("adminKey").value;$("adminStatus").textContent="Endpoint disimpan untuk sesi browser ini.";loadOrders()});
$("refreshBtn").addEventListener("click",loadOrders);
async function api(action,payload={}){
  if(!apiUrl)throw new Error("Masukkan URL backend terlebih dahulu.");
  const url=new URL(apiUrl);url.searchParams.set("action",action);url.searchParams.set("adminKey",adminKey);
  if(Object.keys(payload).length)url.searchParams.set("payload",JSON.stringify(payload));
  const res=await fetch(url.toString());if(!res.ok)throw new Error("Permintaan gagal: "+res.status);
  const data=await res.json();if(data.error)throw new Error(data.error);return data;
}
async function loadOrders(){
  try{
    $("adminStatus").textContent="Memuat data…";
    const data=await api("orders");
    const orders=data.orders||[];
    $("ordersBody").innerHTML=orders.length?orders.map(o=>`<tr><td>${esc(o.orderId)}</td><td>${esc(o.createdAt||"")}</td><td>${esc(o.customerName||"")}</td><td>${esc((o.items||[]).map(i=>`${i.name} ×${i.qty}`).join(", "))}</td><td>${money(o.total)}</td><td><span class="status">${esc(o.status)}</span></td><td>${o.status==="PENDING"?`<button class="action-btn" data-confirm="${esc(o.orderId)}">Konfirmasi</button> <button class="action-btn danger" data-cancel="${esc(o.orderId)}">Tolak</button>`:"—"}</td></tr>`).join(""):`<tr><td colspan="7">Belum ada pesanan.</td></tr>`;
    $("adminStatus").textContent=`Terhubung. ${orders.length} pesanan ditemukan.`;
    document.querySelectorAll("[data-confirm]").forEach(b=>b.addEventListener("click",()=>updateOrder(b.dataset.confirm,"confirm")));
    document.querySelectorAll("[data-cancel]").forEach(b=>b.addEventListener("click",()=>updateOrder(b.dataset.cancel,"cancel")));
  }catch(e){$("adminStatus").textContent="Gagal memuat: "+e.message+" — jika memakai domain berbeda, siapkan proxy API yang mendukung CORS."}
}
async function updateOrder(orderId,action){
  const msg=action==="confirm"?"Konfirmasi pesanan ini dan kurangi stok?":"Tolak pesanan ini?";
  if(!confirm(msg))return;
  try{await api(action,{orderId});await loadOrders();alert(action==="confirm"?"Pesanan dikonfirmasi.":"Pesanan ditolak.")}catch(e){alert("Gagal: "+e.message)}
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
