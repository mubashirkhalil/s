/* AFGR Staff Workspace Flow — verified session routing and quick access.
 * This module never grants permissions. Supabase Auth + database RLS determine access.
 */
(function () {
  'use strict';
  var PENDING_KEY = 'afgr-workspace-pending-target';
  var _started = false;
  var _opening = false;
  var _pendingRequest = null;
  var _openingOrder = false;
  var _lastPanelUser = '';
  var _lastPushSync = 0;
  var _pendingAttempts = 0;
  var _pushSyncInFlight = null;
  var _pushBanner = null;
  var _dismissedInstallBanner = false;
  var _serverBadgeInFlight = null;
  var _lastServerBadgeRead = 0;
  var _testCooldownUntil = 0;

  // Optional native Android bridge. The web app remains fully functional as a PWA.
  // Only a trusted-origin Android WebView injects AFGRAndroid; ordinary Chrome
  // never sees an invented native device or privileged action.
  var _nativeLastToken = '';
  var _nativeNotifiedAt = 0;
  function nativeAndroid() {
    return !!(window.AFGRAndroid && typeof window.AFGRAndroid.postMessage === 'function');
  }
  function sendNative(message) {
    if (!nativeAndroid()) return;
    try { window.AFGRAndroid.postMessage(JSON.stringify(message)); }
    catch (error) { console.warn('[AFGR native] bridge unavailable', error); }
  }
  async function syncNativeSession() {
    if (!nativeAndroid()) return;
    if (!authorized()) return;
    var client = window.App && App.Supabase && App.Supabase.client;
    if (!client || !client.auth) return;
    try {
      var result = await client.auth.getSession();
      var jwt = result && result.data && result.data.session && result.data.session.access_token;
      if (!jwt || result.error) return;
      if (jwt === _nativeLastToken && Date.now() - _nativeNotifiedAt < 60000) return;
      _nativeLastToken = jwt; _nativeNotifiedAt = Date.now();
      sendNative({type:'session',accessToken:jwt});
    } catch (error) { console.warn('[AFGR native] session sync failed', error); }
  }
  function updateNativeBadge(total) {
    if (!nativeAndroid()) return;
    sendNative({type:'badge',count:Math.max(0,Math.floor(Number(total)||0))});
  }
  window.AFGRNativeSync = {sync:syncNativeSession,badge:updateNativeBadge,available:nativeAndroid};
  function auth() { return window.App && App.Services && App.Services.Auth; }
  function session() { return auth() && auth().session ? auth().session() : null; }
  function privileged(s) { return !!(s && s.authUserId && ['admin', 'staff', 'owner'].indexOf(s.role) !== -1); }
  function verified() { return !!(auth() && auth().isVerified && auth().isVerified()); }
  function authorized() { return privileged(session()) && verified(); }
  function cleanTarget(section, entryId) {
    if (['orders','reservations','requests'].indexOf(section) === -1) return null;
    var id = String(entryId || '').trim();
    if (id && !/^[\w-]{1,64}$/.test(id)) return null;
    return { section: section, entryId: id };
  }
  function savePending(target) {
    _pendingRequest = target;
    _pendingAttempts = 0;
    try { if (target) sessionStorage.setItem(PENDING_KEY, JSON.stringify(Object.assign({}, target, { receivedAt: Date.now() }))); else sessionStorage.removeItem(PENDING_KEY); }
    catch (e) {}
  }
  function parsePending() {
    var match = String(location.hash || '').match(/^#afgr\/workspace\/(orders|reservations|requests)(?:\/([\w-]{1,64}))?$/i);
    if (match) {
      // Do not keep old order links in the address bar after routing.
      var target = cleanTarget(match[1].toLowerCase(), match[2] || '');
      if (target) savePending(target);
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    }
    if (!_pendingRequest) {
      try {
        var raw = sessionStorage.getItem(PENDING_KEY);
        var data = raw && JSON.parse(raw);
        _pendingRequest = data && Number.isFinite(data.receivedAt) && Date.now() - data.receivedAt < 15 * 60 * 1000 && Date.now() >= data.receivedAt ? cleanTarget(data.section, data.entryId) : null;
        if (!_pendingRequest && raw) sessionStorage.removeItem(PENDING_KEY);
      } catch (e) {}
    }
    return _pendingRequest;
  }
  function statusMessage(message) {
    var status = document.getElementById('afgrWorkspaceStatus');
    if (status) status.textContent = message || '';
  }
  function sectionAllowed(section) {
    var s = session();
    if (!authorized()) return false;
    if (s.role === 'admin') return true;
    var user = auth().currentUser && auth().currentUser();
    var sections = (user && Array.isArray(user.sectionsAccess)) ? user.sectionsAccess : [];
    return sections.indexOf(section) !== -1;
  }
  function hidePublicPanels() {
    var website = document.getElementById('website');
    if (website) website.style.display = 'none';
    document.getElementById('adminPanel')?.classList.remove('active');
    document.getElementById('staffPanel')?.classList.remove('active');
  }
  async function openWorkspace(options) {
    options = options || {};
    if (_opening) return false;
    _opening = true;
    try {
      var a = auth();
      if (!verified() && a && a.bootstrap) await a.bootstrap();
      if (!authorized()) {
        if (options.fromNotification && typeof window.openLoginModal === 'function') window.openLoginModal();
        return false;
      }
      var s = session();
      var panelId = s.role === 'admin' ? 'adminPanel' : 'staffPanel';
      var panel = document.getElementById(panelId);
      if (!panel) return false;
      if (!panel.classList.contains('active')) {
        var openPanel = s.role === 'admin' ? window.loadAdminPanel : window.loadStaffPanel;
        if (typeof openPanel !== 'function') throw new Error('The management panel is unavailable');
        hidePublicPanels();
        openPanel();
        if (!panel.classList.contains('active')) throw new Error('The management panel did not open');
      }
      if (options.fromNotification && options.target) savePending(options.target);
      closeAccount();
      panelReady();
      return true;
    } catch (error) {
      console.warn('[AFGR Workspace] opening failed', error);
      // A failed workspace render must never strand the user on a blank page.
      document.getElementById('adminPanel')?.classList.remove('active');
      document.getElementById('staffPanel')?.classList.remove('active');
      var website = document.getElementById('website');
      if (website) { website.style.display = 'block'; website.style.visibility = 'visible'; }
      document.body.classList.remove('app-loading');
      return false;
    } finally { _opening = false; }
  }
  function closeAccount() {
    try { if (typeof window.closeAccountModal === 'function') window.closeAccountModal(); } catch (e) {}
  }
  function browseRestaurant() {
    closeAccount();
    document.getElementById('adminPanel')?.classList.remove('active');
    document.getElementById('staffPanel')?.classList.remove('active');
    var publicSite = document.getElementById('website');
    if (publicSite) { publicSite.style.display = 'block'; publicSite.style.visibility = 'visible'; }
    try { sessionStorage.setItem('lastPanel', 'public'); } catch (e) {}
    if (typeof window.buildWebsite === 'function') {
      try { window.buildWebsite(); } catch (e) { console.warn('[AFGR Workspace] public render', e); }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  function createButton(label, className, onClick) {
    var button = document.createElement('button');
    button.type = 'button'; button.className = className; button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }
  // Check the EXACT browser/device subscription against live Supabase. This
  // diagnoses whether a notification is going to Chrome or an installed PWA.
  async function staffDeviceRequest(action) {
    if (!authorized() || !App.Supabase || !App.Supabase.client) throw new Error('Sign in as staff first.');
    var client = App.Supabase.client;
    var authResult = await client.auth.getSession();
    var accessToken = authResult.data && authResult.data.session && authResult.data.session.access_token;
    if (authResult.error || !accessToken) throw new Error('Session expired. Please sign in again.');
    var endpoint = '';
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      var reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.pushManager) {
        var sub = await reg.pushManager.getSubscription();
        endpoint = sub && sub.endpoint || '';
      }
    }
    var url = App.Config.SUPABASE_URL + '/functions/v1/afgr-device-check';
    var res = await fetch(url, {method:'POST',cache:'no-store',headers:{
      'Content-Type':'application/json',
      'apikey':App.Config.SUPABASE_ANON_KEY,
      'Authorization':'Bearer '+accessToken
    }, body:JSON.stringify({action:action, endpoint:endpoint, testId:(function () {
      if (action !== 'status') return undefined;
      try { return localStorage.getItem('afgrDeviceTestId'); }
      catch (e) { return undefined; }
    })()})});
    var data;
    try { data = await res.json(); } catch (e) { throw new Error('Could not read notification test result.'); }
    if (!res.ok || !data.ok) throw new Error((data && data.error)||'Notification check unavailable.');
    return data;
  }
  function refreshUnread(force) {
    if (!authorized()) return Promise.resolve(null);
    if (_serverBadgeInFlight) return _serverBadgeInFlight;
    if (!force && Date.now()-_lastServerBadgeRead<45000) return Promise.resolve(null);
    _lastServerBadgeRead=Date.now();
    _serverBadgeInFlight=staffDeviceRequest('status').then(function(data){
      if(window.AFGRBadge && window.AFGRBadge.applyServer)window.AFGRBadge.applyServer(data);
      var text=document.querySelector('#accountModal .afgr-alert-check-status');
      if(text && data.testStatus === 'seen') {
        text.textContent='Confirmed: AFGR received the test and asked Android to display it.';
      } else if(text && data.testStatus === 'accepted') {
        text.textContent='Push service accepted the test, but delivery to this phone is not confirmed.';
      } else if(text && data.testStatus === 'failed') {
        text.textContent='The test push was rejected. Check device notification settings and retry.';
      } else if(text && data.testStatus === 'scheduled') {
        text.textContent='Test still scheduled. Close AFGR and check for the system notification.';
      }
      return data;
    }).catch(function(error){
      console.info('[AFGR] server badge refresh unavailable; using cached count:',error.message);
      return null;
    }).finally(function(){_serverBadgeInFlight=null;});
    return _serverBadgeInFlight;
  }
  function addDeviceTest(content) {
    var row = document.createElement('div');
    row.className = 'afgr-alert-check-row';
    var status = document.createElement('small');
    status.className = 'afgr-alert-check-status';
    status.setAttribute('role','status');
    status.textContent = 'Checking background alert connection…';
    var test = createButton('Test system alert', 'afgr-alert-check-btn', async function () {
      if (Date.now() < _testCooldownUntil) return;
      test.disabled = true;
      status.textContent = 'Checking this device…';
      try {
        if (!('Notification' in window)) {
          status.textContent = 'Background alerts are not available in this browser.';
          return;
        }
        if (Notification.permission !== 'granted') {
          status.textContent = 'Tap Connect alerts and allow notifications first.';
          return;
        }
        await restorePush(true);
        var result = await staffDeviceRequest('test');
        if (result.scheduled) {
          _testCooldownUntil = Date.now() + 45000;
          try { if (result.testId) localStorage.setItem('afgrDeviceTestId', result.testId); } catch (e) {}
          status.textContent = 'Push scheduled. Lock the phone now and check after 12 seconds. Reopen Account to see confirmation.';
        }
      } catch (error) {
        status.textContent = error.message || 'Device test failed. Tap Connect alerts and retry.';
      } finally { test.disabled = false; }
    });
    var connect = createButton('Connect alerts', 'afgr-alert-check-btn afgr-alert-connect', async function () {
      connect.disabled = true;
      status.textContent = 'Connecting notifications…';
      try {
        if (!('Notification' in window)) throw new Error('System notifications are not supported.');
        if (Notification.permission === 'denied') throw new Error('Notifications are blocked. Allow them in Android Settings and Chrome site settings, then return.');
        // Permission must be requested from a direct user gesture.
        var permission = Notification.permission;
        if (permission === 'default') permission = await Notification.requestPermission();
        if (permission !== 'granted') throw new Error('Notification permission is required.');
        var sub = await restorePush(true);
        var data = await staffDeviceRequest('status');
        if (data.registered) {
          connect.hidden = true;
          status.textContent = 'This device is registered in Supabase. Use the two tests to verify Android display and remote delivery.';
          showDeviceDiagnostics();
        } else {
          throw new Error('Device is not registered in Supabase. Reopen the app while online and retry.');
        }
      } catch (error) {
        status.textContent = error.message || 'Could not connect this device.';
      } finally {connect.disabled = false;}
    });
    // Two independent tests: (1) the browser/Android notification display,
    // (2) full authenticated Supabase -> Push Service -> Service Worker path.
    var local = createButton('Show phone notification', 'afgr-alert-check-btn', async function () {
      local.disabled = true;
      status.textContent = 'Checking Android notification display…';
      try {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
          throw new Error('Allow notifications in Android and Chrome site settings first.');
        }
        if (!navigator.serviceWorker) throw new Error('Service workers are unavailable on this phone.');
        var reg = await Promise.race([navigator.serviceWorker.ready,
          new Promise(function(_,reject){setTimeout(function(){reject(new Error('Service worker not ready. Reopen AFGR online.'));},10000);})]);
        if (!reg || !reg.active) throw new Error('AFGR service worker is not active.');
        await reg.showNotification('Al Fursan · Notification Check', {
          body: 'This is a direct phone notification. It does not test Supabase delivery.',
          icon: new URL('assets/icon-192.png',reg.scope).href,
          badge: new URL('assets/notification-symbol.png',reg.scope).href,
          tag:'afgr-local-notification-check',
          data:{test:true,section:'orders',entryId:''}
        });
        status.textContent = 'Android was asked to display a card now. If no card appears, check Android/Chrome notification channels; the server is not involved.';
      } catch(e) {status.textContent=e.message || 'The phone notification could not be displayed.';}
      finally {local.disabled=false;}
    });
    var diagnostic = document.createElement('small');
    diagnostic.className='afgr-alert-device-diagnostic';
    diagnostic.setAttribute('role','status');
    diagnostic.textContent='Detecting this installation…';
    async function showDeviceDiagnostics() {
      var installed=!!((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone);
      var permission=('Notification' in window)?Notification.permission:'unsupported';
      var worker='none', subscribed='no';
      try {
        var reg=await navigator.serviceWorker.getRegistration();
        worker=reg && reg.active ? 'active' : 'not active';
        if(reg && reg.pushManager)subscribed=(await reg.pushManager.getSubscription())?'yes':'no';
      }catch(e){worker='unavailable';}
      if(!row.isConnected)return;
      diagnostic.textContent='Installed view: '+(installed?'Yes':'No')+' · Permission: '+permission+' · Service worker: '+worker+' · Push subscription: '+subscribed;
    }
    row.append(local, test, connect, status, diagnostic);
    showDeviceDiagnostics();
    content.appendChild(row);
    // The status uses the server's EXACT endpoint, not the number of other
    // admin devices. A green check for another phone would be misleading.
    refreshUnread(false).then(async function (cachedResult) {
      if (!row.isConnected || !authorized()) return;
      try {
        var data = cachedResult || await staffDeviceRequest('status');
        if (!row.isConnected) return;
        var installed = !!((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone);
        var android = /Android/i.test(navigator.userAgent || '');
        if (data.registered) {
          connect.hidden = true;
          var state = data.testStatus;
          status.textContent = state === 'seen' ? 'Verified: the service worker received the last test notification.' :
            state === 'accepted' ? 'Test sent; this phone has not confirmed receiving it.' :
            state === 'failed' ? 'Last test failed. Use Connect alerts to retry.' :
            state === 'scheduled' ? 'Test scheduled. Close the app and check for the system notification.' :
            (android && !installed ? 'Connected in Chrome. Open the installed AFGR app, then reconnect alerts there. Android may still attribute Web Push to Chrome.' :
             'Device registered for background alerts. Test system alert to verify this phone.');
        } else {
          connect.hidden = false;
          status.textContent = 'This device is not connected to background alerts. Tap Connect alerts.';
        }
      } catch (error) {
        status.textContent = error.message || 'Cannot verify the connection while offline.';
      }
    });
  }

  function renderAccountActions(content) {
    if (!authorized() || !content) return;
    var s = session();
    var label = s.role === 'admin' ? 'Admin Workspace' : 'Staff Workspace';
    var button = createButton(label, 'afgr-workspace-primary', function () {
      openWorkspace();
    });
    button.setAttribute('aria-label', 'Open ' + label);
    var badge = document.createElement('span');
    badge.className = 'afgr-account-unread-badge';
    badge.dataset.afgrAccountBadge = '1';
    var unread = Math.max(0, Number(window.AFGRUnreadCount || 0));
    badge.textContent = unread > 99 ? '99+' : unread ? String(unread) : '';
    badge.hidden = unread <= 0;
    badge.setAttribute('aria-label', unread ? unread + ' unread management items' : 'No unread management items');
    button.appendChild(badge);
    content.appendChild(button);
    addDeviceTest(content);
    setTimeout(function(){refreshUnread(false);}, 0);
  }
  // Web browsers never permit a site to silently grant notification access.
  // Once staff grants it, keep background push registered regardless of which
  // AFGR view is open. This compact one-tap prompt is shown in Restaurant View
  // too, rather than hiding it inside the management workspace.
  function updatePushBanner(kind, message) {
    var banner = document.getElementById('afgrPushPrompt');
    if (!kind || !authorized()) { if (banner) banner.remove(); return; }
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'afgrPushPrompt';
      banner.className = 'afgr-push-prompt';
      banner.setAttribute('role','status');
      banner.setAttribute('aria-live','polite');
      banner.innerHTML = '<img src="assets/icon-192.png" alt="" />'+
        '<div class="afgr-push-prompt-copy"><strong>AFGR Staff Alerts</strong><span></span></div>'+
        '<button type="button" class="afgr-push-prompt-action"></button>'+
        '<button type="button" class="afgr-push-prompt-close" aria-label="Close notification setup">×</button>';
      document.body.appendChild(banner);
      banner.querySelector('.afgr-push-prompt-close').onclick = function () {
      if (banner.dataset.state === 'install-app') _dismissedInstallBanner = true;
      banner.remove();
    };
    }
    banner.dataset.state = kind;
    banner.querySelector('.afgr-push-prompt-copy span').textContent = message;
    var btn = banner.querySelector('.afgr-push-prompt-action');
    btn.textContent = kind === 'needs-permission' ? 'Enable alerts' : kind === 'blocked' ? 'Settings help' : kind === 'install-app' ? 'Get AFGR' : 'Retry';
    btn.onclick = function () {
      if (kind === 'needs-permission') {
        // Must call this immediately inside the user's click handler.
        Promise.resolve(Notification.requestPermission()).then(function (permission) {
          if (permission === 'granted') {
            updatePushBanner(null);
            restorePush(true);
          } else if (permission === 'denied') {
            updatePushBanner('blocked','Allow notifications for this site in your browser and phone settings.');
          }
        }).catch(function (error) { console.warn('[AFGR Push] permission request failed',error); });
      } else if (kind === 'install-app') {
        if (window.AFGRInstall && typeof window.AFGRInstall.open === 'function') window.AFGRInstall.open(btn);
      } else if (kind === 'blocked') {
        updatePushBanner('blocked','Open the browser site settings, allow notifications, then reopen AFGR.');
      } else {
        restorePush(true);
      }
    };
  }
  function showPushPermissionIfNeeded() {
    if (!authorized()) { updatePushBanner(null); return; }
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      // Do not claim iOS Safari supports background push unless installed.
      updatePushBanner(null);
      return;
    }
    if (Notification.permission === 'default') {
      updatePushBanner('needs-permission','Get new order alerts even when AFGR is closed.');
    } else if (Notification.permission === 'denied') {
      updatePushBanner('blocked','Notifications are blocked by your browser or phone settings.');
    } else {
      // An ordinary Chrome tab/shortcut may send Chrome-attributed notices.
      // A real standalone WebAPK gives Android a separate installed app
      // identity. This is guidance, not a workaround for OS restrictions.
      var isAndroid = /Android/i.test(navigator.userAgent || '');
      var installed = (window.AFGRInstall && window.AFGRInstall.isInstalled && window.AFGRInstall.isInstalled()) ||
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
      if (isAndroid && !installed && !_dismissedInstallBanner) {
        updatePushBanner('install-app','Install AFGR as an app for its own notification identity and launcher badge.');
      } else updatePushBanner(null);
    }
  }
  function syncAlertsControl(panel) {
    // Keep one consistent, clearly labeled permission prompt in both the
    // restaurant view and workspace; remove legacy duplicate header buttons.
    var control = panel && panel.querySelector('[data-afgr-enable-alerts]');
    if (control) control.remove();
    showPushPermissionIfNeeded();
  }
  function panelReady() {
    if (!authorized()) return;
    var s = session();
    var panel = document.getElementById(s.role === 'admin' ? 'adminPanel' : 'staffPanel');
    if (!panel || !panel.classList.contains('active')) return;
    syncAlertsControl(panel);
    if (window.AFGRBadge) window.AFGRBadge.refresh();
    refreshUnread(false);
    if (_lastPanelUser !== s.authUserId) {
      _lastPanelUser = s.authUserId;
      restorePush();
    }
    if (_pendingRequest) setTimeout(openPendingTarget, 80);
  }
  function restorePush(force) {
    if (nativeAndroid()) {
      // Native Firebase Messaging owns the notification permission and channel.
      // Never subscribe the same installed Android app to browser Web Push.
      updatePushBanner(null);
      return syncNativeSession();
    }

    if (!authorized()) { updatePushBanner(null); return Promise.resolve(null); }
    showPushPermissionIfNeeded();
    // Re-use an in-progress registration instead of creating duplicate PushManager calls.
    if (_pushSyncInFlight) return _pushSyncInFlight;
    if (!force && Date.now() - _lastPushSync < 4000) return Promise.resolve(null);
    _lastPushSync = Date.now();
    var panel = document.getElementById(session().role === 'admin' ? 'adminPanel' : 'staffPanel');
    syncAlertsControl(panel);
    if (!('Notification' in window) || Notification.permission !== 'granted') return Promise.resolve(null);
    if (typeof window.subscribeToPushNotifications !== 'function') return Promise.resolve(null);
    _pushSyncInFlight = Promise.resolve(window.subscribeToPushNotifications()).then(function (sub) {
      if (!sub && authorized() && Notification.permission === 'granted') {
        updatePushBanner('retry','Device registration needs attention. Tap Retry for background alerts.');
      } else if (sub) showPushPermissionIfNeeded();
      return sub;
    }).catch(function (error) {
      console.warn('[AFGR Push] background device registration failed', error);
      if (authorized()) updatePushBanner('retry','Background alerts could not connect. Tap Retry.');
      return null;
    }).finally(function(){ _pushSyncInFlight = null; });
    return _pushSyncInFlight;
  }
  function onLoggedOut() {
    sendNative({type:'logout'});
    _nativeLastToken = '';

    _lastPanelUser = '';
    _lastPushSync = 0;
    updatePushBanner(null);
    if (window.AFGRBadge) window.AFGRBadge.clear();
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(function (registration) {
        if (registration.active) registration.active.postMessage({type:'afgr:staff-logged-out'});
      }).catch(function () {});
    }
    document.getElementById('adminPanel')?.classList.remove('active');
    document.getElementById('staffPanel')?.classList.remove('active');
    var site = document.getElementById('website');
    if (site) { site.style.display = 'block'; site.style.visibility = 'visible'; }
    _pendingRequest = null;
    try { sessionStorage.removeItem(PENDING_KEY); } catch (e) {}
    // Prevent old account data being visible after cross-tab sign-out.
    // The explicit Logout action deletes the server subscription before this.
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker.getRegistration().then(function (reg) {
        return reg && reg.pushManager && reg.pushManager.getSubscription();
      }).then(function (sub) { if (sub) return sub.unsubscribe(); }).catch(function () {});
    }
  }
  async function openPendingTarget() {
    if (_openingOrder || !_pendingRequest || !authorized()) return;
    var target = _pendingRequest;
    if (!sectionAllowed(target.section)) {
      savePending(null);
      return;
    }
    var s = session();
    var navId = s.role === 'admin' ? 'adminNav' : 'staffNav';
    var panel = document.getElementById(s.role === 'admin' ? 'adminPanel' : 'staffPanel');
    if (!panel || !panel.classList.contains('active')) return;
    var li = document.querySelector('#' + navId + ' li[data-target="' + target.section + '"]');
    if (!li) {
      // Staff navigation may finish rendering after authentication/bootstrap.
      if (++_pendingAttempts <= 20) setTimeout(openPendingTarget, 150);
      else { console.warn('[AFGR Workspace] requested section never became available'); savePending(null); }
      return;
    }
    _pendingAttempts = 0;
    li.click();
    if (target.section !== 'orders' || !target.entryId) { savePending(null); return; }
    _openingOrder = true;
    try {
      var order = (window.appState && appState.orders || []).find(function (row) { return String(row.id) === target.entryId; });
      if (!order && App.Supabase && App.Supabase.client) {
        var response = await App.Supabase.client.from('orders').select('data').eq('id', target.entryId).maybeSingle();
        if (!response.error && response.data && response.data.data) order = response.data.data;
      }
      if (order && typeof window.openOrderDetailsModal === 'function') {
        window.openOrderDetailsModal(order);
      } else {
        statusMessage('The selected order could not be loaded. Check the Orders list or your access permissions.');
      }
      savePending(null);
    } catch (e) {
      console.warn('[AFGR Workspace] order deep link unavailable', e);
      savePending(null);
    } finally { _openingOrder = false; }
  }
  async function receiveNotification(section, entryId) {
    var target = cleanTarget(section, entryId);
    if (!target) return;
    savePending(target);
    if (!authorized()) {
      if (auth() && auth().bootstrap) await auth().bootstrap();
    }
    if (!authorized()) {
      if (typeof window.openLoginModal === 'function') window.openLoginModal();
      return;
    }
    await openWorkspace({ fromNotification: true, target: target });
    setTimeout(openPendingTarget, 120);
  }
  // Called after an explicit login. A login alone must not open the workspace,
  // but a previously tapped notification should still lead to its order.
  async function onLoggedIn() {
    if (!authorized()) return;
    if (window.AFGRBadge) window.AFGRBadge.refresh();
    // Do not wait for the management panel or cloud menu data to register push.
    restorePush(true);
    syncNativeSession();
    parsePending();
    if (_pendingRequest) {
      if (App.SupabaseSync && App.SupabaseSync.bootstrap) {
        try { await App.SupabaseSync.bootstrap(); }
        catch (error) { console.warn('[AFGR Workspace] cloud data unavailable after login', error); }
      }
      if (authorized()) await openWorkspace({ fromNotification: true, target: _pendingRequest });
    } else restorePush();
  }
  function start() {
    if (_started) return;
    _started = true;
    parsePending();
    (async function () {
      if (auth() && auth().bootstrap) await auth().bootstrap();
      if (!authorized()) {
        if (_pendingRequest && typeof window.openLoginModal === 'function') window.openLoginModal();
        return;
      }
      // Register background push as soon as the staff identity is verified.
      // Waiting for the cloud-data bootstrap previously delayed registration
      // until a management panel was opened or a long network request finished.
      restorePush(true);
      syncNativeSession();
      refreshUnread(true);
      // Wait for the cloud-data baseline before loading management records.
      // Auth verification is independent: network/data issues never grant access.
      if (App.SupabaseSync && App.SupabaseSync.bootstrap) {
        try { await App.SupabaseSync.bootstrap(); }
        catch (error) { console.warn('[AFGR Workspace] cloud data unavailable; using existing cache', error); }
      }
      if (!authorized()) return;
      if (window.AFGRBadge) window.AFGRBadge.refresh();
      // Ordinary app launches ALWAYS show the restaurant, even for staff/admin.
      // Only a valid notification deep link opens a management section.
      if (_pendingRequest) await openWorkspace({ fromNotification: true, target: _pendingRequest });
    })().catch(function (e) { console.warn('[AFGR Workspace] startup', e); });
    setInterval(function(){if(!document.hidden && authorized())refreshUnread(false);}, 60000);
    window.addEventListener('online', function () {
      var a = auth();
      if (a && a.isVerificationRetryNeeded && a.isVerificationRetryNeeded()) {
        // A clean reload also retries the original Supabase data bootstrap.
        // Never restore privileged UI from a stale local session alone.
        window.location.reload();
      } else if (authorized()) restorePush(true);
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && authorized()) {
        restorePush();
        refreshUnread(false);
        if (window.AFGRBadge) window.AFGRBadge.refresh();
      }
    });
  }
  window.AFGRWorkspace = {
    refreshUnread: refreshUnread,
    start: start, open: openWorkspace, browse: browseRestaurant,
    panelReady: panelReady, renderAccountActions: renderAccountActions,
    receiveNotification: receiveNotification, onLoggedIn: onLoggedIn,
    restorePush: restorePush, onLoggedOut: onLoggedOut,
    isAuthorized: authorized, openPendingTarget: openPendingTarget
  };
})();
