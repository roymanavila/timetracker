// SS Time Tracker - Service Worker
// Maneja cache offline y notificaciones de alarmas

const CACHE_NAME = 'ss-tracker-v1';
const ASSETS = [
  '/timetracker/',
  '/timetracker/index.html',
  '/timetracker/manifest.json',
  '/timetracker/icon-192.png',
  '/timetracker/icon-512.png'
];

// Instalar service worker y cachear assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .catch((err) => console.log('Cache install error:', err))
  );
  self.skipWaiting();
});

// Activar y limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Estrategia: red primero, cache como fallback
self.addEventListener('fetch', (event) => {
  // No cachear llamadas a Supabase o CDNs externos
  if (event.request.url.includes('supabase.co') || 
      event.request.url.includes('cdnjs.cloudflare.com') ||
      event.request.url.includes('cdn.jsdelivr.net')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// Manejar mensajes desde la app (para programar notificaciones)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delayMs, tag } = event.data;
    
    setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        icon: '/timetracker/icon-192.png',
        badge: '/timetracker/icon-192.png',
        tag: tag || 'ss-tracker-alert',
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300],
        silent: false
      });
    }, delayMs);
  }
  
  if (event.data && event.data.type === 'CANCEL_NOTIFICATIONS') {
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((n) => n.close());
    });
  }
});

// Click en notificación abre la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/timetracker/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/timetracker/');
      }
    })
  );
});
