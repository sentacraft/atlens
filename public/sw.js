// Removes the old offline service worker from browsers that installed it.
// Deleting this file would not: a failed update (404) leaves the old worker running, with its
// caches and fetch handler. Keep it until installs from before the removal (October 2026) have
// had time to update, then delete it (say, after 2027-04).

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: "window" });
      for (const client of windows) {
        client.navigate(client.url);
      }
    })(),
  );
});
