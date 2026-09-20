// Service worker — Miroir Mobile Money
// Mise en cache de l'app shell pour un fonctionnement 100% hors-ligne.
// Aucune donnée utilisateur ne transite ici : les transactions restent
// uniquement dans le localStorage du téléphone (voir index.html).

var CACHE_NAME = "miroir-mm-v2"; // v2 : bump nécessaire car index.html a beaucoup changé
var APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(name){ return name !== CACHE_NAME; })
             .map(function(name){ return caches.delete(name); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

// Stratégie : cache d'abord (l'app doit s'ouvrir instantanément et hors-ligne),
// avec mise à jour silencieuse du cache en arrière-plan si le réseau répond.
self.addEventListener("fetch", function(event){
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(function(cached){
      var networkFetch = fetch(event.request).then(function(response){
        if (response && response.status === 200){
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(function(){
        return cached; // hors-ligne : on retombe sur le cache
      });

      return cached || networkFetch;
    })
  );
});
