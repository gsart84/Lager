(()=>{"use strict";
const DB="sps-lager-db",STORE="articles";let db,scanner=null,current=null,pendingCode="",ocrStream=null,ocrCandidate="";
const $=id=>document.getElementById(id),views=[...document.querySelectorAll(".view")];
function show(id){views.forEach(v=>v.classList.toggle("active",v.id===id));window.scrollTo(0,0)}
function toast(t){const e=$("toast");e.textContent=t;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),2200)}
function openDb(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:"barcode"})};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function os(m="readonly"){return db.transaction(STORE,m).objectStore(STORE)}
function get(c){return new Promise((ok,no)=>{const r=os().get(c);r.onsuccess=()=>ok(r.result||null);r.onerror=()=>no(r.error)})}
function all(){return new Promise((ok,no)=>{const r=os().getAll();r.onsuccess=()=>ok(r.result||[]);r.onerror=()=>no(r.error)})}
function put(a){return new Promise((ok,no)=>{const r=os("readwrite").put(a);r.onsuccess=()=>ok();r.onerror=()=>no(r.error)})}
async function summary(){const a=await all(),n=a.reduce((s,x)=>s+Number(x.stock||0),0);$("pieceCount").textContent=n;$("articleCount").textContent=`${a.length} ${a.length===1?"verschiedener Artikel":"verschiedene Artikel"}`}
async function stop(){if(!scanner)return;try{if(scanner.isScanning)await scanner.stop();await scanner.clear()}catch(e){}scanner=null}
async function stopOcr(){if(ocrStream){ocrStream.getTracks().forEach(t=>t.stop());ocrStream=null}const v=$("ocrVideo");if(v)v.srcObject=null}
async function startOcr(){
  await stop();
  show("ocr");
  $("ocrStatus").textContent="Kamera wird vorbereitet …";
  try{
    ocrStream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080}},
      audio:false
    });
    $("ocrVideo").srcObject=ocrStream;
    await $("ocrVideo").play();
    $("ocrStatus").textContent="X20-Aufdruck gross und gerade in den orangen Rahmen halten.";
  }catch(e){
    console.error(e);
    $("ocrStatus").textContent="Kamera konnte nicht gestartet werden. Berechtigung prüfen.";
  }
}
function normalizeX20(text){
  let s=String(text||"").toUpperCase().replace(/[\s_]/g,"");
  s=s.replace(/X2O/g,"X20");
  const hits=s.match(/X20[A-Z0-9-]{2,20}/g)||[];
  return hits.sort((a,b)=>b.length-a.length)[0]||"";
}
async function captureOcr(){
  const video=$("ocrVideo"),canvas=$("ocrCanvas"),btn=$("ocrCaptureBtn");
  if(!ocrStream||!video.videoWidth){toast("Kamera ist noch nicht bereit.");return}
  if(!window.Tesseract){toast("OCR-Bibliothek konnte nicht geladen werden.");return}
  btn.classList.add("ocr-busy");btn.textContent="Text wird gelesen …";
  $("ocrStatus").textContent="Bild wird kontrastverstärkt und ausgewertet …";
  try{
    const vw=video.videoWidth,vh=video.videoHeight;
    const sx=Math.round(vw*.07),sy=Math.round(vh*.31),sw=Math.round(vw*.86),sh=Math.round(vh*.28);
    canvas.width=sw;canvas.height=sh;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    ctx.drawImage(video,sx,sy,sw,sh,0,0,sw,sh);
    const img=ctx.getImageData(0,0,sw,sh),d=img.data;
    let sum=0;
    for(let i=0;i<d.length;i+=4)sum+=(d[i]*.299+d[i+1]*.587+d[i+2]*.114);
    const avg=sum/(d.length/4);
    const threshold=Math.max(75,Math.min(190,avg*.78));
    for(let i=0;i<d.length;i+=4){
      const g=d[i]*.299+d[i+1]*.587+d[i+2]*.114;
      const v=g<threshold?0:255;
      d[i]=d[i+1]=d[i+2]=v;
    }
    ctx.putImageData(img,0,0);
    const result=await Tesseract.recognize(canvas,"eng",{
      logger:m=>{if(m.status==="recognizing text")$("ocrStatus").textContent=`Text wird gelesen … ${Math.round((m.progress||0)*100)} %`}
    });
    const raw=result?.data?.text||"";
    const code=normalizeX20(raw);
    if(!code){
      $("ocrStatus").textContent="Kein eindeutiger X20-Code erkannt. Näher herangehen und erneut versuchen.";
      toast("Kein X20-Code gefunden.");
      return;
    }
    ocrCandidate=code;
    $("ocrResultCode").textContent=code;
    $("ocrRawText").textContent=`OCR-Rohtext: ${raw.replace(/\s+/g," ").trim().slice(0,100)||"–"}`;
    await stopOcr();
    show("ocrResult");
  }catch(e){
    console.error(e);
    $("ocrStatus").textContent="Texterkennung fehlgeschlagen. Bitte nochmals versuchen.";
    toast("OCR-Fehler.");
  }finally{
    btn.classList.remove("ocr-busy");btn.textContent="Aufdruck erkennen";
  }
}
async function handle(raw){const code=String(raw||"").trim();if(!code)return;await stop();const a=await get(code);if(a)openAdjust(a);else openNew(code)}
function openNew(code){pendingCode=String(code||"").trim();$("newCodeText").textContent=pendingCode||"–";$("newBarcode").value=pendingCode;$("newCodeText").dataset.name=pendingCode;$("newStock").value=0;show("newArticle");setTimeout(()=>$("newStock").focus(),120)}
function openAdjust(a){current=a;$("adjustName").textContent=a.name||a.barcode;$("adjustCode").textContent=a.name===a.barcode?"":a.barcode;$("currentStock").textContent=a.stock;$("delta").value=-1;show("adjust")}
async function startScan(){show("scanner");$("scanStatus").textContent="Kamera wird vorbereitet …";if(!window.Html5Qrcode){$("scanStatus").textContent="Scannerbibliothek konnte nicht geladen werden.";return}try{scanner=new Html5Qrcode("reader");await scanner.start({facingMode:"environment"},{fps:12,qrbox:{width:290,height:165},aspectRatio:1.777778},x=>handle(x),()=>{});$("scanStatus").textContent="Barcode ruhig in den Rahmen halten."}catch(e){console.error(e);$("scanStatus").textContent="Kamera konnte nicht gestartet werden. Berechtigung prüfen."}}
async function book(continueScan){if(!current)return;const d=Number($("delta").value||0);if(!Number.isInteger(d)||d===0){toast("Ganze Zahl ungleich 0 eingeben.");return}if(current.stock+d<0){toast("Bestand kann nicht unter 0 fallen.");return}current={...current,stock:current.stock+d,updatedAt:new Date().toISOString()};await put(current);await summary();toast(`${d>0?"+":""}${d} Stück gebucht.`);if(continueScan)setTimeout(startScan,450);else{$("currentStock").textContent=current.stock;$("delta").value=d<0?-1:1}}
async function render(q=""){const list=await all(),total=list.reduce((s,x)=>s+Number(x.stock||0),0);$("inventoryStats").textContent=`${list.length} Artikel · ${total} Stück`;const a=list.filter(x=>!q||(x.name||"").toLowerCase().includes(q.toLowerCase())||x.barcode.toLowerCase().includes(q.toLowerCase())).sort((x,y)=>(x.name||x.barcode).localeCompare(y.name||y.barcode,"de"));const box=$("items");box.innerHTML="";if(!a.length){box.innerHTML='<div class="empty">Keine passenden Artikel vorhanden.</div>';return}a.forEach(x=>{const d=document.createElement("div");d.className="item";d.innerHTML='<button><div class="iname"></div><div class="icode"></div></button><div class="qty"></div>';d.querySelector(".iname").textContent=x.name||x.barcode;d.querySelector(".icode").textContent=x.name===x.barcode?"":x.barcode;d.querySelector(".qty").textContent=x.stock;d.querySelector("button").onclick=()=>openAdjust(x);box.appendChild(d)})}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function csv(v){return `"${String(v??"").replaceAll('"','""')}"`}
function stamp(){return new Date().toISOString().slice(0,10)}
async function share(blob,name){const f=new File([blob],name,{type:blob.type});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:name});return}const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
async function exportCsv(){const a=(await all()).sort((x,y)=>(x.name||x.barcode).localeCompare(y.name||y.barcode,"de"));const r=[["Barcode","Artikelname","Bestand","Letzte Änderung"],...a.map(x=>[x.barcode,x.name,x.stock,x.updatedAt||""])];await share(new Blob(["\ufeff"+r.map(z=>z.map(csv).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"}),`SPS-Lager_${stamp()}.csv`)}
async function exportXls(){const a=(await all()).sort((x,y)=>(x.name||x.barcode).localeCompare(y.name||y.barcode,"de"));const rows=a.map(x=>`<tr><td>${esc(x.barcode)}</td><td>${esc(x.name)}</td><td>${x.stock}</td><td>${esc(x.updatedAt||"")}</td></tr>`).join("");await share(new Blob([`<html><meta charset="utf-8"><table><tr><th>Barcode</th><th>Artikelname</th><th>Bestand</th><th>Letzte Änderung</th></tr>${rows}</table></html>`],{type:"application/vnd.ms-excel"}),`SPS-Lager_${stamp()}.xls`)}
async function backup(){const p={app:"SPS Lager",version:"0.5",exportedAt:new Date().toISOString(),articles:await all()};await share(new Blob([JSON.stringify(p,null,2)],{type:"application/json"}),`SPS-Lager_Backup_${stamp()}.json`)}
async function pdf(){const a=(await all()).sort((x,y)=>(x.name||x.barcode).localeCompare(y.name||y.barcode,"de")),rows=a.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.barcode)}</td><td>${x.stock}</td></tr>`).join(""),w=open("","_blank");if(!w){toast("Pop-ups für PDF bitte erlauben.");return}w.document.write(`<html><meta charset="utf-8"><style>body{font-family:sans-serif;padding:24px}h1{border-bottom:5px solid #f36c21;padding-bottom:12px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:9px;text-align:left}th{background:#fff1e8}</style><h1>SPS Lagerübersicht</h1><p>${new Date().toLocaleString("de-CH")}</p><table><tr><th>Artikel</th><th>Barcode</th><th>Bestand</th></tr>${rows}</table><script>onload=()=>setTimeout(()=>print(),300)<\/script></html>`);w.document.close()}
document.addEventListener("DOMContentLoaded",async()=>{db=await openDb();await summary();
$("scanBtn").onclick=startScan;$("ocrBtn").onclick=startOcr;$("manualBtn").onclick=()=>{const c=prompt("Barcode oder Artikelcode eingeben:");if(c)handle(c)};$("listBtn").onclick=async()=>{await render();show("inventory")};$("stopScan").onclick=async()=>{await stop();show("home")};
$("ocrCaptureBtn").onclick=captureOcr;
$("ocrStopBtn").onclick=async()=>{await stopOcr();show("home")};
$("ocrAcceptBtn").onclick=()=>{if(ocrCandidate)handle(ocrCandidate)};
$("ocrRetryBtn").onclick=startOcr;
$("ocrEditBtn").onclick=()=>{const c=prompt("X20-Code korrigieren:",ocrCandidate);if(c){const n=normalizeX20(c);if(n){ocrCandidate=n;$("ocrResultCode").textContent=n}else toast("Code muss mit X20 beginnen.")}};
document.querySelectorAll(".back").forEach(b=>b.onclick=async()=>{await stop();await stopOcr();show("home");summary()});
async function saveNewArticle(){
  try{
    const barcode=String($("newBarcode").value||pendingCode||"").trim();
    if(!barcode){toast("Kein Barcode vorhanden.");return}
    const stockValue=Number($("newStock").value);
    if(!Number.isFinite(stockValue)||stockValue<0||!Number.isInteger(stockValue)){toast("Bitte einen gültigen ganzen Bestand eingeben.");return}
    const name=String($("newCodeText").dataset.name||barcode).trim()||barcode;
    const a={barcode,name,stock:stockValue,updatedAt:new Date().toISOString()};
    await put(a);
    await summary();
    toast("Artikel gespeichert.");
    openAdjust(a);
  }catch(err){console.error("Speichern fehlgeschlagen",err);toast("Speichern fehlgeschlagen: "+(err?.message||"unbekannter Fehler"))}
}
$("newForm").onsubmit=e=>{e.preventDefault();saveNewArticle()};
$("saveArticleBtn").onclick=saveNewArticle;
$("editNameBeforeSave").onclick=()=>{const barcode=String($("newBarcode").value||pendingCode||"").trim();const n=prompt("Anzeigename eingeben:",$("newCodeText").dataset.name||barcode);if(n&&n.trim()){$("newCodeText").dataset.name=n.trim();$("newCodeText").textContent=n.trim();}};
document.querySelectorAll("[data-delta]").forEach(b=>b.onclick=()=>$("delta").value=b.dataset.delta);$("bookContinueBtn").onclick=()=>book(true);$("bookBtn").onclick=()=>book(false);
$("editBtn").onclick=()=>{if(!current)return;$("editTitle").textContent=current.name;$("editBarcode").value=current.barcode;$("editName").value=current.name;show("edit")};$("editForm").onsubmit=async e=>{e.preventDefault();current={...current,name:$("editName").value.trim()||current.barcode,updatedAt:new Date().toISOString()};await put(current);toast("Artikel geändert.");openAdjust(current)};
$("search").oninput=e=>render(e.target.value);$("csvBtn").onclick=()=>exportCsv().catch(e=>toast(e.message));$("xlsBtn").onclick=()=>exportXls().catch(e=>toast(e.message));$("pdfBtn").onclick=pdf;$("backupBtn").onclick=backup;$("restore").onchange=async e=>{try{const p=JSON.parse(await e.target.files[0].text());for(const a of p.articles||[])await put(a);await summary();await render();toast("Backup wiederhergestellt.")}catch(x){toast("Backup konnte nicht gelesen werden.")}e.target.value=""};
if("serviceWorker"in navigator)navigator.serviceWorker.register("./service-worker.js").catch(console.warn)});
})();