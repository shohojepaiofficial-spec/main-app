// Service worker for browser push notifications (see src/lib/push.ts).
// Only handles push — no caching, so it never serves stale pages.

// Only same-site paths ("/orders/…"), never another site. "//host" and
// "/\host" both resolve to another site, so neither is a path.
function safePath(link) {
  return typeof link === "string" && /^\/(?![/\\])/.test(link) ? link : "/dashboard";
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "New notification", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "New notification";
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || "",
        icon: "/logo-icon.png",
        badge: "/logo-icon.png",
        data: { link: safePath(data.link) },
      }),
      // Open tabs refresh their bell straight away.
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) =>
        clients.forEach((client) => client.postMessage({ type: "notification" }))
      ),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(safePath(event.notification.data && event.notification.data.link), self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const open = clients.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) return open.focus().then((client) => client.navigate(url));
      return self.clients.openWindow(url);
    })
  );
});
