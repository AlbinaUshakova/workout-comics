const CACHE = "workout-comics-v3";
const ASSETS = [
  "/",
  "/posture-workout.png",
  "/workout-mobility.png",
  "/workout-hips.png",
  "/workout-abs.png",
  "/workout-core.png",
  "/workout-feet.png",
  "/workout-legs.png",
  "/workout-shoulders.png",
  "/workout-balance.png",
  "/workout-arms.png",
  "/app-icon.png",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    })),
  );
});
