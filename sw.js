// Guarda la página en el celular para que abra aunque no haya internet.
// Solo maneja archivos de este mismo sitio; las llamadas al servidor (Google) no pasan por aquí.
var CACHE = 'checador-b9d6fb60a9';
var ARCHIVOS = ['./', './index.html', './manifest.webmanifest', './icono-180.png', './icono-192.png', './icono-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== self.location.origin) return;
  var guardado = function () {
    return caches.match(req, { ignoreSearch: true }).then(function (r) {
      return r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined);
    });
  };
  // Primero la red (para recibir cambios); si no hay señal o tarda más de 4 s, la copia guardada.
  e.respondWith(new Promise(function (listo) {
    var hecho = false;
    var fin = function (r) { if (!hecho && r) { hecho = true; listo(r); } };
    var t = setTimeout(function () { guardado().then(fin); }, 4000);
    fetch(req).then(function (r) {
      if (r && r.ok) { var copia = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copia); }); }
      clearTimeout(t); fin(r);
    }).catch(function () {
      clearTimeout(t);
      guardado().then(function (r) { if (r) fin(r); else if (!hecho) { hecho = true; listo(Response.error()); } });
    });
  }));
});
