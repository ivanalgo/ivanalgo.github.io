const CACHE_NAME = "middle-school-english-v5";
const APP_SHELL = [
  "./",
  "./index.html",
  "./review-page.html",
  "./styles.css",
  "./home.js",
  "./app.js",
  "./manifest.json",
  "./icon.svg",
  "./grade-7-1/",
  "./grade-7-1/words.json",
  "./grade-7-2/",
  "./grade-7-2/words.json",
  "./grade-8-1/",
  "./grade-8-1/words.json",
  "./grade-8-2/",
  "./grade-8-2/words.json",
  "./grade-9-1/",
  "./grade-9-1/words.json",
  "./grade-9-2/",
  "./grade-9-2/words.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin || event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
