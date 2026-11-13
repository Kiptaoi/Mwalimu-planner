/* Offline shell: the app opens and saved documents work without a connection. Drafting always needs the network. */
var CACHE='mwalimu-v1';
var SHELL=['./','index.html','core.js','app.js','manifest.webmanifest','icons/icon-192.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL);}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(e){
  var u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.indexOf('/api/')>=0||u.pathname.indexOf('/admin')>=0)return;
  /* network first so teachers get updates; fall back to the cached copy when offline */
  e.respondWith(fetch(e.request).then(function(r){if(r.ok){var copy=r.clone();caches.open(CACHE).then(function(c){c.put(e.request,copy);});}return r;}).catch(function(){return caches.match(e.request).then(function(m){return m||caches.match('index.html');});}));
});
