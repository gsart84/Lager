const CACHE="sps-lager-v0.7-br-ocr";
const LOCAL=["./","./index.html","./style-v07.css?v=70","./app-v07.js?v=70","./manifest-v07.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];
const CACHEABLE=["https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js","https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(LOCAL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  if(e.request.mode==="navigate"){
    e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put("./index.html",copy));return r}).catch(()=>caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>{
    if(cached)return cached;
    return fetch(e.request).then(r=>{if(CACHEABLE.includes(e.request.url)){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r});
  }));
});