// Service worker simples do app "Medidor"
// Faz cache do "app shell" (HTML, manifest, ícones) para funcionar offline
// e para o PWABuilder reconhecer o site como instalável.

const CACHE_NAME = 'medidor-cache-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

// instala e guarda o app shell em cache
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

// limpa caches antigos quando uma nova versão do service worker assume
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// estratégia: "network first, fallback to cache"
// (importante aqui: NUNCA cacheamos chamadas ao Supabase — sempre precisam
// ser buscadas na rede, senão os dados de leitura ficariam desatualizados)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // deixa passar direto qualquer chamada ao Supabase, sem cache
  if (url.hostname.endsWith('supabase.co')) {
    return; // não intercepta — vai direto pra rede
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // atualiza o cache com a versão mais recente do app shell
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
