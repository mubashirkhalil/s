/* =============================================================================
 * Service Worker — Web Push notifications for orders/reservations/requests
 * =============================================================================
 * Lives at the site root so the browser keeps it alive even when all tabs
 * are closed. Receives Web Push messages from the Supabase send-push Edge
 * Function and displays system notifications.
 *
 * Push payload contract (from backend spec):
 *   {
 *     title:     string,
 *     body:      string,
 *     tag:       string,
 *     url:       string,    // e.g. "/#admin/orders/abc123"
 *     section:   string,    // "orders" | "reservations" | "requests"
 *     entry_id:  string,
 *     timestamp: number
 *   }
 *
 * Clicking a notification:
 *   1. Tries to focus an existing tab on this site (and routes it to the
 *      relevant section via postMessage)
 *   2. If no tab is open, opens a new window pointed at the right URL
 * ============================================================================= */

// Keep the app shell available for installation and offline launch. This
// caches ONLY same-origin static shell files, never private Supabase responses.
const AFGR_SHELL_CACHE = 'afgr-shell-20261031-mobile-alert-check-v8';
const AFGR_TEST_RECEIPT_URL = 'https://ylohcjhonuzpimilvpfq.supabase.co/functions/v1/afgr-push-receipt';
const AFGR_SHELL_FILES = [
  './index.html', './manifest.webmanifest',
  './assets/icon-192.png', './assets/icon-512.png', './assets/brand-mark.png',
  './assets/notification-banner.png', './assets/notification-symbol.png',
  './css/styles.css', './css/modern-app.css', './js/99-legacy.js',
  './js/17-arabian-table.js', './js/21-workspace-flow.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(AFGR_SHELL_CACHE)
      .then(function (cache) { return cache.addAll(AFGR_SHELL_FILES); })
      .catch(function (error) {
        // Don't break Web Push or a new service-worker install if a temporary
        // network outage prevents precaching. The next navigation can recover.
        console.warn('[AFGR SW] shell precache unavailable:', error);
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(Promise.all([
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key.indexOf('afgr-shell-') === 0 && key !== AFGR_SHELL_CACHE;
      }).map(function (key) { return caches.delete(key); }));
    }),
    self.clients.claim()
  ]));
});

// Network-first for navigations: GitHub deployments must not keep serving an
// old cached index.html forever. With a 1.5-second deadline the installed app
// still opens quickly on weak mobile connections or completely offline.
// Other public static assets remain cache-first and are revalidated quietly.
// Never cache remote Supabase API data or authenticated responses.
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  var scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  var navigation = event.request.mode === 'navigate';
  var staticAsset = /\.(?:css|js|png|jpg|jpeg|webp|svg|gif|woff2?)$/i.test(url.pathname);
  if (!navigation && !staticAsset) return;

  var fresh = fetch(event.request).then(function (response) {
    if (response && response.ok && response.type === 'basic') {
      return caches.open(AFGR_SHELL_CACHE).then(function (cache) {
        return cache.put(event.request, response.clone()).catch(function () {});
      }).then(function () { return response; });
    }
    return response;
  }).catch(function () { return null; });
  // Call waitUntil synchronously, while the fetch event is still dispatching.
  // Prior versions called it inside a later promise callback; that can fail
  // once the event has finished dispatching and suppress cache updates.
  event.waitUntil(fresh.then(function () {}));
  event.respondWith((async function () {
    var cache = await caches.open(AFGR_SHELL_CACHE);
    var cached = await cache.match(event.request, {ignoreSearch:navigation});
    if (!cached && navigation) cached = await cache.match('./index.html');
    if (navigation) {
      var timely = await Promise.race([
        fresh,
        new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 1500); })
      ]);
      if (timely && timely.ok) return timely;
      if (cached) return cached;
      if (timely) return timely;
      var later = await fresh;
      return later || Response.error();
    }
    if (cached) return cached;
    return (await fresh) || Response.error();
  })().catch(function () { return fetch(event.request); }));
});

self.addEventListener('push', function (event) {
  var data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    // Not JSON — fall back to text
    try { data = { title: 'Notification', body: event.data ? event.data.text() : '' }; }
    catch (err) { data = { title: 'Notification', body: '' }; }
  }

  // A malformed push can still reach the worker; never let JSON null or arrays
  // throw before waitUntil(), which would lose the system notification.
  if (!data || typeof data !== 'object' || Array.isArray(data)) data = {};

  // Keep notifications recognizable as AFGR regardless of which app view
  // was last open. Android/desktop operating systems control final card UI.
  var section = ['orders','reservations','requests'].includes(data.section) ? data.section : 'orders';
  var entryId = data.entry_id || data.entryId || null;
  var titles = {orders:'Al Fursan · New Order',reservations:'Al Fursan · New Reservation',requests:'Al Fursan · New Request'};
  var title = String(data.title || titles[section]).slice(0, 90);
  var tag = String(data.tag || 'afgr-'+section+'-'+(entryId || Date.now()));
  var pushIcon = new URL('assets/icon-192.png', self.registration.scope).href;
  var pushBadge = new URL('assets/notification-symbol.png', self.registration.scope).href;
  // The same warm ivory, forest-green and gold branding used by the
  // in-panel realtime alert. Android decides whether/when to show this
  // optional artwork, usually on the expanded system notification.
  var brandedPanel = new URL('assets/notification-banner.png', self.registration.scope).href;
  var unreadLabel = Number(data.unreadCount);
  var noticeBody = String(data.body || 'A new restaurant item needs attention.');
  // Android cannot render an arbitrary numeric launcher badge. Make the
  // authorized unread total visible on the notification itself instead.
  if (Number.isFinite(unreadLabel) && unreadLabel > 1) {
    noticeBody += ' · ' + (unreadLabel > 99 ? '99+' : String(Math.floor(unreadLabel))) + ' unread';
  }
  var options = {
    body: noticeBody.slice(0, 220),
    icon: pushIcon,
    badge: pushBadge,
    image: brandedPanel,
    tag: tag,
    timestamp: Number(data.timestamp) || Date.now(),
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: section === 'orders' ? [220, 120, 220, 120, 320] : [180, 100, 180],
    actions: [
      { action:'view', title: section==='orders' ? 'View Order' : section==='reservations' ? 'View Reservation' : 'View Request' },
      { action:'dismiss', title:'Dismiss' }
    ],
    data: {section:section, entryId:entryId,source:'afgr-webpush',test:data.test===true}
  };
  // Native installed-app numeric badges are supported on iOS Home Screen
  // apps and some desktop PWAs. Android derives app-icon badges from unread
  // system notifications and does not expose the numeric Badging API.
  var incomingUnreadCount = Number(data.unreadCount);
  // Badge support is optional. A bad/unsupported badge API must NEVER block
  // the visible notification, especially when AFGR is not running.
  var badgeTask = Promise.resolve().then(function () {
    if (data.unreadCount === undefined || data.unreadCount === null ||
        !Number.isFinite(incomingUnreadCount) || incomingUnreadCount < 0) return;
    if (incomingUnreadCount > 0 && typeof self.navigator.setAppBadge === 'function') {
      return self.navigator.setAppBadge(Math.floor(incomingUnreadCount));
    }
    if (incomingUnreadCount === 0 && typeof self.navigator.clearAppBadge === 'function') {
      return self.navigator.clearAppBadge();
    }
  }).catch(function (error) {
    console.info('[AFGR SW] launcher badge is not supported:', error);
  });

  // Native action support and expanded images differ by platform. If the
  // richly branded card is rejected, still display a smaller AFGR alert.
  var notificationTask = Promise.resolve().then(function () {
    return self.registration.showNotification(title, options);
  }).catch(function (error) {
    console.warn('[AFGR SW] rich notification unavailable, retrying compact:', error);
    return self.registration.showNotification(title, {
      body: options.body,
      icon: pushIcon,
      tag: tag,
      data: options.data
    });
  });
  var receiptTask = notificationTask.then(function () {
    // A test sent while AFGR is closed is acknowledged only after
    // showNotification() succeeds. This separates push-service acceptance
    // from service-worker delivery and notification creation.
    if (data.test !== true || !data.receipt) return;
    var receipt = data.receipt;
    if (!/^[a-f0-9-]{36}$/i.test(String(receipt.id||'')) ||
        !/^[A-Za-z0-9_-]{36,100}$/.test(String(receipt.token||''))) return;
    return fetch(AFGR_TEST_RECEIPT_URL, {
      method:'POST', mode:'cors', credentials:'omit',cache:'no-store',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:receipt.id,token:receipt.token})
    }).then(function (res) {
      if (!res.ok) console.warn('[AFGR SW] test receipt could not be recorded');
    });
  }).catch(function () {});
  var foregroundTask = Promise.resolve().then(function () {
    if (data.test === true) return; // A test is not a new customer order.
    if (!self.clients || typeof self.clients.matchAll !== 'function') return;
    return self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function (windows) {
      windows.forEach(function (client) {
        if (!client || !client.url || client.url.indexOf(self.registration.scope) !== 0) return;
        if (client.visibilityState === 'hidden') return;
        try { client.postMessage({type:'afgr:push-visible',section:section,entryId:entryId,title:title,body:noticeBody}); }
        catch (e) { /* The native OS notification has already been queued. */ }
      });
    });
  }).catch(function () {});
  event.waitUntil(Promise.all([notificationTask, badgeTask, foregroundTask, receiptTask]));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  if (event.action === 'dismiss') return;
  var data = (event.notification && event.notification.data) || {};
  var section = ['orders', 'reservations', 'requests'].indexOf(data.section) >= 0 ? data.section : 'orders';
  var entryId = String(data.entryId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  // Only navigate within our app. Never trust external URLs from push payloads.
  var deepLink = data.test ? new URL('./', self.registration.scope).href : new URL('./#afgr/workspace/' + section + (entryId ? '/' + entryId : ''), self.registration.scope).href;
  var message = data.test ? {type:'afgr:system-test-opened'} : { type: 'focus-section', section: section, entryId: entryId };

  function notifyPage(client) {
    if (client && typeof client.postMessage === 'function') {
      try { client.postMessage(message); } catch (e) { /* hash link still works */ }
    }
    return client;
  }
  function openApp() {
    if (!self.clients.openWindow) return Promise.resolve(null);
    return self.clients.openWindow(deepLink).then(function (windowClient) {
      if (!windowClient) return null;
      return Promise.resolve(typeof windowClient.focus === 'function' ? windowClient.focus() : windowClient)
        .then(function () { return notifyPage(windowClient); });
    });
  }
  function focusExisting(client) {
    if (!client) return openApp();
    // navigate to the deep link as well as posting a message. This works even
    // if a suspended client has lost its message listener or has stale state.
    var moved = typeof client.navigate === 'function' ?
      Promise.resolve().then(function () { return client.navigate(deepLink); }) : Promise.resolve(client);
    return moved.then(function (target) {
      target = target || client;
      return Promise.resolve(typeof target.focus === 'function' ? target.focus() : target)
        .then(function () { return notifyPage(target); });
    });
  }

  event.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).catch(function () { return []; })
      .then(function (windows) {
        var ours = windows.filter(function (c) {
          return c.url && c.url.indexOf(self.registration.scope) === 0;
        });
        // On Android, openWindow may choose the installed standalone WebAPK
        // instead of an ordinary Chrome tab that happens to share this origin.
        // On desktop prefer reusing a tab to avoid duplicate windows.
        var isAndroid = /Android/i.test((self.navigator && self.navigator.userAgent) || '');
        if (isAndroid) {
          return openApp().then(function (opened) {
            return opened || focusExisting(ours[0]);
          }).catch(function () { return focusExisting(ours[0]); });
        }
        return focusExisting(ours[0]).catch(function () { return openApp(); });
      })
      .catch(function (error) { console.warn('[AFGR SW] notification could not open the app:', error); })
  );
});

// Keep Android's notification-driven app-icon dot aligned with the
// workspace read state. Only notifications belonging to the viewed section
// are dismissed; unrelated unread activity stays visible.
self.addEventListener('message', function (event) {
  var message = event.data || {};
  if (message.type !== 'afgr:section-read' && message.type !== 'afgr:staff-logged-out') return;
  var section = message.section;
  if (message.type === 'afgr:section-read' && ['orders','reservations','requests'].indexOf(section) < 0) return;
  if (typeof self.registration.getNotifications !== 'function') return;
  event.waitUntil(self.registration.getNotifications().then(function (notes) {
    notes.forEach(function (note) {
      var relatedSection = note.data && note.data.section;
      if (message.type === 'afgr:staff-logged-out' || relatedSection === section) note.close();
    });
  }).catch(function () {}));
});

self.addEventListener('pushsubscriptionchange', function (event) {
  // Browser may rotate the subscription endpoint. The page will detect this
  // on next load and re-subscribe by re-running the subscribe flow.
  console.info('[SW] pushsubscriptionchange — re-registering when a signed-in page is available');
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function (windows) {
    windows.forEach(function (client) {
      if (client.url && client.url.indexOf(self.registration.scope) === 0) {
        try { client.postMessage({type:'afgr:resubscribe-push'}); } catch (e) {}
      }
    });
  }).catch(function () {}));
});
