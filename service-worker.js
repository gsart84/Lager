const CACHE="sps-lager-v0.9-xlsx";
const LOCAL=[
  "./",
  "./index.html",
  "./style-v09.css?v=90",
  "./app-v09.js?v=90",
  "./manifest-v09.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];
const XLSX_URL="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(LOCAL))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  const request=event.request;

  if(request.mode==="navigate"){
    event.respondWith(
      fetch(request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put("./index.html",copy));
          return response;
        })
        .catch(()=>caches.match("./index.html"))
    );
    return;
  }

  if(request.url===XLSX_URL){
    event.respondWith(
      caches.match(request).then(cached=>{
        if(cached)return cached;
        return fetch(request).then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached=>cached||fetch(request))
  );
});
