// Сервис-воркер: офлайн-оболочка приложения, показ пушей и открытие приложения по клику.
// Обработчик push принимает фоновые уведомления, которые рассылает сервер (api/push.js, api/push-reminders.js).
// Кэш: страница берётся из сети (всегда свежая сборка), при отсутствии сети отдаётся сохранённая;
// файлы /assets/* имеют хэш в имени, поэтому их можно безопасно брать из кэша.
const CACHE = "dn-shell-v1";
const MAX_ASSETS = 80; // старые сборки оставляют хэшированные файлы: держим только последние
const NAV_TIMEOUT = 4000; // при плохой связи не ждём сеть вечно и открываем сохранённую оболочку

async function trimAssets() {
  const cache = await caches.open(CACHE);
  const keys = (await cache.keys()).filter((r) => new URL(r.url).pathname.startsWith("/assets/"));
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((r) => cache.delete(r)));
}

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add("/")).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    const network = fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("/", copy)); }
      return res;
    });
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), NAV_TIMEOUT));
    event.respondWith(
      Promise.race([network, timeout]).catch(() => caches.match("/").then((r) => r || network))
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).then(trimAssets); }
        return res;
      }))
    );
  } else if (url.pathname.startsWith("/icons/")) {
    // иконки без хэша в имени: отдаём сохранённую и тихо обновляем, чтобы новая иконка не застряла
    event.respondWith(
      caches.match(req).then((hit) => {
        const fresh = fetch(req).then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        });
        return hit || fresh;
      })
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* ignore */ }
  event.waitUntil(
    self.registration.showNotification(data.title || "Daily Note", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      requireInteraction: Boolean(data.requireInteraction),
      vibrate: data.requireInteraction ? [300, 150, 300, 150, 300] : undefined,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow("/");
    })
  );
});
