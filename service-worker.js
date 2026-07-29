const CACHE="sps-lager-v0.6-ocr";
const LOCAL=["./","./index.html","./style-v06.css?v=60","./app-v06.js?v=60","./manifest-v06.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];
const EXTERNAL=[
"https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js",
"https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"
];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(LOCAL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 if(e.request.mode==="navigate"){e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put("./index.html",c));return r}).catch(()=>caches.match("./index.html")));return}
 e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(EXTERNAL.includes(e.request.url)){const x=r.clone();caches.open(CACHE).then(k=>k.put(e.request,x))}return r})));
});