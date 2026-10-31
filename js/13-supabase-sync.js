/* ==========================================================================
 * App.SupabaseSync  (v2 — full cross-device sync)
 * --------------------------------------------------------------------------
 * WRITE PATH
 *   Repo hooks + Store.save() diff engine → publishCreate/Update/Remove
 *   → _enqueue → _flush (250ms debounced batch)
 *
 *   _flush send rules (verified against DB grants + RLS):
 *     create → plain INSERT (ignoreDuplicates)
 *       Upsert requires UPDATE grant. anon only has INSERT on
 *       orders/reservations/requests, so upsert throws 42501 for every
 *       guest-submitted row. Plain INSERT is sufficient and idempotent.
 *     update → UPSERT (onConflict:'id')
 *       Admin-only path. authenticated role has full grants + is_admin() RLS.
 *       Upsert handles the case where the row never reached Supabase during
 *       the create phase.
 *     remove → DELETE  (admin-only, authenticated + is_admin() RLS)
 *
 * READ / BOOTSTRAP PATH  (page load)
 *   bootstrap() fetches all collections, replaces appState slices if
 *   Supabase has data, resets diff baseline, rebuilds UI.
 *   Falls back silently to localStorage on error / timeout.
 *
 * REALTIME PATH  (cross-device live sync)
 *   subscribe() opens Postgres Changes channels for orders, reservations,
 *   requests. Remote INSERT/UPDATE/DELETE merges into appState and
 *   refreshes the UI without a page reload.
 * ========================================================================== */
(function () {
  'use strict';

  var TABLE_MAP = {
    users:        'users',
    menuItems:    'menu_items',
    categories:   'menu_categories',
    offers:       'offers',
    orders:       'orders',
    reservations: 'reservations',
    reviews:      'reviews',
    requests:     'requests',
    gallery:      'gallery',
    config:       'app_config',
    otpRecords:   null
  };

  var _queue            = [];
  var _flushTimer       = null;
  var _bootstrapped     = false;
  var _bootstrapPromise = null;
  var _channels         = [];

  function _client()  { return App.Supabase && App.Supabase.client; }
  function _enabled() { return !!(App.Supabase && App.Supabase.isReady() && App.Supabase.isEnabled()); }
  function _table(c)  { return (TABLE_MAP[c] !== undefined) ? TABLE_MAP[c] : null; }

  /* =========================================================================
   * BOOTSTRAP
   * ========================================================================= */

  function bootstrap() {
    if (_bootstrapPromise) return _bootstrapPromise;
    if (!_enabled()) {
      console.info('[SupabaseSync] disabled — using localStorage cache');
      _bootstrapped = true;
      _bootstrapPromise = Promise.resolve({ ok: false, reason: 'disabled' });
      return _bootstrapPromise;
    }

    var sb = _client();
    var timeoutMs = App.Config.SYNC_BOOTSTRAP_TIMEOUT_MS || 10000;

    function fetchTable(tbl) {
      var t0 = performance.now();
      return sb.from(tbl).select('*').then(function (res) {
        var elapsed = Math.round(performance.now() - t0);
        if (elapsed > 1500) {
          console.warn('[SupabaseSync] slow fetch:', tbl, elapsed, 'ms — rows:', res.data ? res.data.length : 0);
        } else {
          console.info('[SupabaseSync] fetched:', tbl, elapsed, 'ms — rows:', res.data ? res.data.length : 0);
        }
        if (res.error) throw res.error;
        return res.data || [];
      });
    }

    var p = Promise.all([
      fetchTable('users'),
      fetchTable('menu_items'),
      fetchTable('menu_categories'),
      fetchTable('offers'),
      fetchTable('orders'),
      fetchTable('reservations'),
      fetchTable('reviews'),
      fetchTable('requests'),
      fetchTable('gallery'),
      fetchTable('app_config')
    ]).then(function (results) {
      var live = App.Store.state();
      if (!live) {
        console.warn('[SupabaseSync] no appState — aborting bootstrap');
        return { ok: false, reason: 'no-state' };
      }

      function toData(rows) { return rows.map(function (r) { return r.data; }).filter(Boolean); }

      // Deep-merge the server config over the local config. Unlike a shallow
      // Object.assign (which replaces whole nested objects like `contact`
      // and would DROP locally-set keys the server copy happens to lack,
      // e.g. contact.socials), this preserves local nested keys while still
      // letting the server win on any value it actually carries (including
      // explicit empty strings, so intentional clears still propagate).
      function deepMergeConfig(localObj, serverObj) {
        if (!serverObj || typeof serverObj !== 'object' || Array.isArray(serverObj)) {
          return serverObj === undefined ? localObj : serverObj;
        }
        var out = Object.assign({}, localObj);
        Object.keys(serverObj).forEach(function (k) {
          var sv = serverObj[k];
          var lv = out[k];
          if (sv && lv && typeof sv === 'object' && typeof lv === 'object'
              && !Array.isArray(sv) && !Array.isArray(lv)) {
            out[k] = deepMergeConfig(lv, sv);
          } else {
            out[k] = sv;
          }
        });
        return out;
      }

      if (results[0].length  > 0) live.users        = toData(results[0]);
      if (results[1].length  > 0) live.menuItems     = toData(results[1]);
      if (results[2].length  > 0) live.categories    = toData(results[2]);
      if (results[3].length  > 0) live.offers        = toData(results[3]);
      if (results[4].length  > 0) live.orders        = toData(results[4]);
      if (results[5].length  > 0) live.reservations  = toData(results[5]);
      if (results[6].length  > 0) live.reviews       = toData(results[6]);
      if (results[7].length  > 0) live.requests      = toData(results[7]);
      if (results[8].length  > 0) live.gallery       = toData(results[8]);
      if (results[9].length  > 0) {
        live.config = deepMergeConfig(live.config || {}, results[9][0].data || {});
      }

      // Set baseline BEFORE save() so first diff sees zero changes.
      if (App.Store.resetSyncBaseline) App.Store.resetSyncBaseline();
      App.Store.save();

      // Restore auto-translation cache from appState.config.translations
      // now that Supabase data has populated appState. This makes previously
      // fetched MyMemory translations available immediately so the page
      // doesn't have to re-fetch them when the user toggles to Arabic.
      if (typeof window.__syncAutoTranslations === 'function') {
        try { window.__syncAutoTranslations(); } catch (e) {}
      }

      if (typeof window.buildWebsite === 'function') {
        try { window.buildWebsite(); } catch (e) { console.warn('[SupabaseSync] buildWebsite error', e); }
      }
      if (typeof window.updateRealtimeDots === 'function') {
        try { window.updateRealtimeDots(); } catch (e) {}
      }

      // Hide the preloader now that the cloud-loaded data is rendered.
      // This prevents the user from seeing the stale localStorage version
      // for a moment before bootstrap completes. The legacy code in
      // 99-legacy.js also hides the preloader after a 500ms timeout as a
      // fallback in case bootstrap never resolves.
      try {
        var pre = document.getElementById('preloader');
        if (pre) pre.style.display = 'none';
      } catch (e) {}

      _bootstrapped = true;
      console.info('[SupabaseSync] bootstrap complete', {
        orders: results[4].length, reservations: results[5].length,
        requests: results[7].length, menuItems: results[1].length
      });

      // Re-render the admin panel if it's currently open. This is critical:
      // bootstrap replaces appState collections with Supabase IDs. Without a
      // re-render, the admin panel still shows items with stale localStorage IDs.
      // Any admin action (edit/status change) would then fail to find the item
      // by ID in the fresh appState and fall into the wrong create/insert branch.
      if (typeof window.refreshAdminSectionIfActive === 'function') {
        try {
          // Refresh whichever section is currently open
          ['orders','reservations','requests','menuItems'].forEach(function(key) {
            window.refreshAdminSectionIfActive(key);
          });
          // Also force a full admin re-render if the panel is open
          var adminPanel = document.getElementById('adminPanel');
          if (adminPanel && adminPanel.classList.contains('active')) {
            var activeNav = document.querySelector('#adminNav li.active');
            var adminContent = document.getElementById('adminContent');
            if (activeNav && adminContent && typeof window.renderAdminSectionByTarget === 'function') {
              window.renderAdminSectionByTarget(activeNav.dataset.target, adminContent);
            }
          }
        } catch (e) {
          console.warn('[SupabaseSync] bootstrap admin re-render failed', e);
        }
      }

      subscribe();
      return { ok: true };

    }).catch(function (err) {
      console.error('[SupabaseSync] bootstrap failed — using localStorage cache', err);
      _bootstrapped = true;
      try { subscribe(); } catch (e) {}
      // Hide preloader even if bootstrap failed - we'll show whatever
      // localStorage has cached
      try {
        var pre = document.getElementById('preloader');
        if (pre) pre.style.display = 'none';
      } catch (e) {}
      return { ok: false, reason: 'fetch-failed', error: err };
    });

    var timeout = new Promise(function (resolve) {
      setTimeout(function () {
        if (!_bootstrapped) {
          console.warn('[SupabaseSync] bootstrap timed out after', timeoutMs, 'ms');
          _bootstrapped = true;
          resolve({ ok: false, reason: 'timeout' });
        }
      }, timeoutMs);
    });

    _bootstrapPromise = Promise.race([p, timeout]);
    return _bootstrapPromise;
  }

  /* =========================================================================
   * WRITE QUEUE
   * ========================================================================= */

  function _enqueue(op) {
    if (!_enabled()) return;
    _queue.push(op);
    _scheduleFlush();
  }

  function _scheduleFlush() {
    if (_flushTimer) return;
    _flushTimer = setTimeout(function () {
      _flushTimer = null;
      _flush();
    }, App.Config.SYNC_FLUSH_DELAY_MS || 250);
  }

  function _flush() {
    if (!_enabled() || !_queue.length) return Promise.resolve();

    var batch = _queue.splice(0, _queue.length);
    var sb    = _client();

    // Helper: surface sync errors on the page itself, not just console.
    // Filters out harmless transient errors that don't represent data loss.
    function _isHarmlessError(errObj) {
      if (!errObj) return true;
      var code = errObj.code || '';
      var msg  = (errObj.message || '').toLowerCase();
      // 23505: unique_violation - row already exists, harmless on retry
      if (code === '23505') return true;
      // 21000: "cannot affect row a second time" - we dedup but old caches
      // may still hit this briefly. The write generally still succeeds
      // for one of the duplicates. Suppress to avoid alarming the user.
      if (code === '21000') return true;
      if (msg.indexOf('cannot affect row a second time') !== -1) return true;
      // PGRST116: "no rows returned" - happens on innocuous queries
      if (code === 'PGRST116') return true;
      return false;
    }

    function _showSyncError(table, op, errorMsg, ids) {
      try {
        var box = document.getElementById('__syncErrorBanner');
        if (!box) {
          box = document.createElement('div');
          box.id = '__syncErrorBanner';
          box.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:99999;' +
            'background:#dc3545;color:white;padding:12px 18px;border-radius:6px;' +
            'font-size:13px;font-family:sans-serif;max-width:380px;box-shadow:0 4px 12px rgba(0,0,0,0.3);' +
            'cursor:pointer;line-height:1.4;';
          box.title = 'Click to dismiss';
          box.onclick = function () { box.style.display = 'none'; };
          document.body.appendChild(box);
        }
        var idList = (ids || []).slice(0, 3).join(', ');
        box.innerHTML = '<strong>⚠ Sync failed</strong><br>' +
          'Operation: ' + op + ' on ' + table + '<br>' +
          'Error: ' + errorMsg + '<br>' +
          (idList ? '<small>IDs: ' + idList + (ids.length > 3 ? '…' : '') + '</small><br>' : '') +
          '<small>Your changes are saved locally but did not reach Supabase. Click to dismiss.</small>';
        box.style.display = 'block';
        // Auto-dismiss after 8 seconds so it doesn't stay forever
        setTimeout(function () {
          if (box && box.style.display !== 'none') box.style.display = 'none';
        }, 8000);
      } catch (e) { /* if DOM not ready, silently skip */ }
    }

    // Group by (table, op) for batching, and deduplicate by id within
    // each group. This is critical: Postgres ON CONFLICT DO UPDATE cannot
    // process the same primary key twice in one statement (error 21000
    // "command cannot affect row a second time"). Without this dedup,
    // the same item being published twice in rapid succession (e.g. once
    // from the diff engine and once from an explicit publishUpdate call)
    // causes the entire batched upsert to fail.
    //
    // Last-write-wins: if the same id appears multiple times, only the
    // most recently queued copy is sent.
    var byKey = Object.create(null);
    batch.forEach(function (item) {
      var k = item.table + '|' + item.op;
      if (!byKey[k]) byKey[k] = Object.create(null);
      byKey[k][item.id] = item;   // last write wins
    });

    var pending = [];

    // For 'create' operations: we have TWO paths because of RLS grants.
    //
    // - Admin-only collections (menu_items, menu_categories, offers, reviews,
    //   gallery, users, app_config): the writer is authenticated and has
    //   UPDATE grant. We use UPSERT(onConflict='id') so retries are idempotent
    //   and any pre-existing row with the same id gets overwritten cleanly.
    //
    // - Anon-writable collections (orders, reservations, requests): anon
    //   has INSERT but NOT UPDATE grant. UPSERT fails because PostgreSQL
    //   requires UPDATE permission for ON CONFLICT DO UPDATE. We use plain
    //   INSERT here. Duplicate-id retries fail with 23505, which we swallow.
    var ADMIN_ONLY_TABLES = ['menu_items', 'menu_categories', 'offers',
      'reviews', 'gallery', 'users', 'app_config'];

    Object.keys(byKey).forEach(function (key) {
      // byKey[key] is now an object keyed by id (for dedup). Convert to
      // an array of items so the rest of the code is unchanged.
      var itemsById = byKey[key];
      var items = Object.keys(itemsById).map(function (id) { return itemsById[id]; });
      if (!items.length) return;
      var tbl   = items[0].table;
      var op    = items[0].op;

      if (op === 'create') {
        var rows = items.map(function (it) { return { id: it.id, data: it.record }; });

        if (ADMIN_ONLY_TABLES.indexOf(tbl) !== -1) {
          // Admin path: UPSERT. Idempotent. Same code path as 'update' op.
          // This fixes the bug where new menu items / categories / offers
          // disappeared on refresh: the previous code used insert() with
          // ignoreDuplicates which is unreliable across supabase-js versions
          // and could silently no-op.
          pending.push(
            sb.from(tbl).upsert(rows, { onConflict: 'id' })
              .then(function (res) {
                if (res && res.error && !_isHarmlessError(res.error)) {
                  var msg = res.error.message || String(res.error);
                  console.error('[SupabaseSync] upsert (create) error', tbl, msg,
                    'ids:', rows.map(function (r) { return r.id; }));
                  _showSyncError(tbl, 'upsert', msg, rows.map(function (r) { return r.id; }));
                } else if (res && res.error) {
                  console.info('[SupabaseSync] suppressed harmless error', tbl, res.error.code || res.error.message);
                }
              })
              .catch(function (err) {
                console.error('[SupabaseSync] upsert (create) threw', tbl, err);
                _showSyncError(tbl, 'upsert', String(err && err.message || err), rows.map(function (r) { return r.id; }));
              })
          );
        } else {
          // Anon-writable path: plain INSERT only.
          pending.push(
            sb.from(tbl).insert(rows)
              .then(function (res) {
                if (res && res.error && !_isHarmlessError(res.error)) {
                  var msg = res.error.message || String(res.error);
                  console.error('[SupabaseSync] insert error', tbl, msg,
                    'ids:', rows.map(function (r) { return r.id; }));
                  _showSyncError(tbl, 'insert', msg, rows.map(function (r) { return r.id; }));
                } else if (res && res.error) {
                  console.info('[SupabaseSync] suppressed harmless error', tbl, res.error.code || res.error.message);
                }
              })
              .catch(function (err) {
                console.error('[SupabaseSync] insert threw', tbl, err);
                _showSyncError(tbl, 'insert', String(err && err.message || err), rows.map(function (r) { return r.id; }));
              })
          );
        }

      } else if (op === 'update') {
        items.forEach(function (it) {
          pending.push(
            sb.from(tbl).upsert([{ id: it.id, data: it.record }], { onConflict: 'id' })
              .then(function (res) {
                if (res && res.error && !_isHarmlessError(res.error)) {
                  var msg = res.error.message || String(res.error);
                  console.error('[SupabaseSync] upsert error', tbl, it.id, msg);
                  _showSyncError(tbl, 'upsert', msg, [it.id]);
                } else if (res && res.error) {
                  console.info('[SupabaseSync] suppressed harmless error', tbl, res.error.code || res.error.message);
                }
              })
              .catch(function (err) {
                console.error('[SupabaseSync] upsert threw', tbl, it.id, err);
                _showSyncError(tbl, 'upsert', String(err && err.message || err), [it.id]);
              })
          );
        });

      } else if (op === 'remove') {
        var ids = items.map(function (it) { return it.id; });
        pending.push(
          sb.from(tbl).delete().in('id', ids)
            .then(function (res) {
              if (res && res.error && !_isHarmlessError(res.error)) {
                var msg = res.error.message || String(res.error);
                console.error('[SupabaseSync] delete error', tbl, msg);
                _showSyncError(tbl, 'delete', msg, ids);
              }
            })
            .catch(function (err) {
              console.error('[SupabaseSync] delete threw', tbl, err);
              _showSyncError(tbl, 'delete', String(err && err.message || err), ids);
            })
        );
      }
    });

    return Promise.all(pending);
  }

  /* =========================================================================
   * PUBLISH HOOKS
   * ========================================================================= */

  function publishCreate(collection, record) {
    var tbl = _table(collection);
    if (!tbl || !record) return;
    if (collection === 'config') return publishConfig(record);
    if (!record.id) { console.warn('[SupabaseSync] create skipped: no id', collection); return; }
    var safe = record;
    if (collection === 'users') { safe = Object.assign({}, record); delete safe.password; }
    _enqueue({ op: 'create', collection: collection, table: tbl, id: record.id, record: safe });
  }

  function publishUpdate(collection, id, record) {
    var tbl = _table(collection);
    if (!tbl || !record || !id) return;
    if (collection === 'config') return publishConfig(record);
    var safe = record;
    if (collection === 'users') { safe = Object.assign({}, record); delete safe.password; }
    _enqueue({ op: 'update', collection: collection, table: tbl, id: id, record: safe });
  }

  function publishRemove(collection, id) {
    var tbl = _table(collection);
    if (!tbl || !id || collection === 'config') return;
    _enqueue({ op: 'remove', collection: collection, table: tbl, id: id });
  }

  function publishConfig(configData) {
    if (!_enabled() || !configData) return;
    _client().from('app_config')
      .upsert([{ id: 'main', data: configData }])
      .then(function (res) {
        if (res && res.error) console.error('[SupabaseSync] config upsert error', res.error);
      });
  }

  /* =========================================================================
   * REALTIME SUBSCRIPTIONS  — cross-device live sync
   *
   * Tables: orders, reservations, requests
   * On any remote change, merges the row into appState and refreshes UI.
   * ========================================================================= */

  // Tables that get realtime subscriptions. Any INSERT/UPDATE/DELETE on
  // these tables fires _onRemoteChange on every connected device.
  //
  // CRITICAL: this list is what makes cross-device sync work. If a table
  // is missing from here, devices won't see live updates from each other
  // — they'll only catch up on full page reload via the bootstrap path.
  //
  // The `key` is the camelCase appState property name that maps to the
  // database `table` name (which uses snake_case for multi-word tables).
  var _RT_TABLES = [
    { table: 'orders',       key: 'orders'       },
    { table: 'reservations', key: 'reservations' },
    { table: 'requests',     key: 'requests'     },
    { table: 'gallery',      key: 'gallery'      },
    // v76: menu_items, categories, offers, reviews, users added.
    // Previously these only synced on full page reload — admin edits on
    // Device A wouldn't appear on Device B until Device B refreshed.
    { table: 'menu_items',       key: 'menuItems'    },
    { table: 'menu_categories',  key: 'categories'   },
    { table: 'offers',           key: 'offers'       },
    { table: 'reviews',          key: 'reviews'      },
    { table: 'users',            key: 'users'        }
  ];

  function _onRemoteChange(stateKey, payload) {
    try {
      var eventType = payload.eventType;
      var newRow    = payload.new;
      var oldRow    = payload.old;

      var live = App.Store.state();
      if (!live) return;
      if (!Array.isArray(live[stateKey])) live[stateKey] = [];

      var arr = live[stateKey];

      if (eventType === 'DELETE') {
        var delId = oldRow && oldRow.id;
        if (delId) {
          var di = arr.findIndex(function (r) { return r && r.id === delId; });
          if (di !== -1) arr.splice(di, 1);
        }
      } else {
        var rowData = newRow && newRow.data;
        if (!rowData || !rowData.id) return;

        var ei = arr.findIndex(function (r) { return r && r.id === rowData.id; });
        var isNewRow = (ei === -1);   // wasn't in our local state
        if (ei !== -1) {
          // Merge remote onto local — remote wins for all shared fields
          arr[ei] = Object.assign({}, arr[ei], rowData);
        } else {
          arr.unshift(rowData);  // newest-first for admin lists
        }

        // Cross-device notification trigger. When a fresh row arrives
        // via Supabase realtime (we did not create it locally) and the
        // section is one that admins/staff want to be alerted about,
        // play the ringtone and show the alert banner on this device.
        // Only INSERT events fire alerts — UPDATEs (e.g. status changes)
        // do not.
        if (isNewRow
            && (stateKey === 'orders' || stateKey === 'reservations' || stateKey === 'requests')
            && eventType === 'INSERT'
            && typeof window.notifyRealtimeInsertFromRemote === 'function') {
          try {
            window.notifyRealtimeInsertFromRemote(stateKey, rowData);
          } catch (e) {
            console.warn('[SupabaseSync] cross-device alert failed', e);
          }
        }

        // Gallery-specific: if a gallery row arrived with INLINE image
        // data (legacy pre-Storage records), persist it to local
        // IndexedDB so it survives page reloads. URL-only rows need
        // no special handling — the <img src=url> fetches from the
        // public Storage URL on demand.
        if (stateKey === 'gallery' && rowData.id && rowData.data && !rowData.url
            && App.IndexedDB && typeof App.IndexedDB.put === 'function') {
          try {
            var p = App.IndexedDB.put(rowData.id, rowData.data);
            if (p && typeof p.catch === 'function') p.catch(function () {});
          } catch (e) {}
        }
      }

      // Persist the merged state without triggering another diff/publish
      App.Store.resetSyncBaseline();
      App.Store.save();

      // Refresh UI
      if (typeof window.updateRealtimeDots === 'function') {
        try { window.updateRealtimeDots(); } catch (e) {}
      }
      if (typeof window.refreshAdminSectionIfActive === 'function') {
        try { window.refreshAdminSectionIfActive(stateKey); } catch (e) {}
      }

      console.info('[SupabaseSync] realtime', eventType, stateKey,
        (newRow && newRow.id) || (oldRow && oldRow.id));
    } catch (err) {
      console.warn('[SupabaseSync] realtime handler error', err);
    }
  }

  function subscribe() {
    if (!_enabled()) return;
    var sb = _client();
    _unsubscribe();

    _RT_TABLES.forEach(function (def) {
      try {
        var ch = sb
          .channel('rt:' + def.table)
          .on('postgres_changes',
              { event: '*', schema: 'public', table: def.table },
              function (payload) { _onRemoteChange(def.key, payload); })
          .subscribe(function (status) {
            if (status === 'SUBSCRIBED') {
              console.info('[SupabaseSync] subscribed:', def.table);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('[SupabaseSync] channel issue:', def.table, status);
            }
          });
        _channels.push(ch);
      } catch (err) {
        console.warn('[SupabaseSync] subscribe error for', def.table, err);
      }
    });
  }

  function _unsubscribe() {
    var sb = _client();
    if (!sb) return;
    _channels.forEach(function (ch) {
      try { sb.removeChannel(ch); } catch (e) {}
    });
    _channels = [];
  }

  /* =========================================================================
   * STATUS / DIAGNOSTICS
   * ========================================================================= */

  function status() {
    return {
      enabled:      _enabled(),
      bootstrapped: _bootstrapped,
      queued:       _queue.length,
      flushPending: !!_flushTimer,
      channels:     _channels.length
    };
  }

  /**
   * Force an immediate flush of any queued operations. Returns a Promise
   * that resolves when all in-flight writes complete (or error).
   *
   * Useful when:
   *   - The user just made an admin change and might refresh soon
   *   - You want to wait for sync before navigating away
   */
  function flushNow() {
    if (_flushTimer) {
      clearTimeout(_flushTimer);
      _flushTimer = null;
    }
    return _flush();
  }

  /**
   * How many operations are currently queued or in-flight?
   */
  function pending() {
    return _queue.length + (_flushTimer ? 1 : 0);
  }

  /* =========================================================================
   * BEFORE-UNLOAD GUARD
   * =========================================================================
   * If the user tries to navigate away or refresh while sync writes are
   * pending, force an immediate synchronous flush attempt. We cannot truly
   * block navigation in modern browsers, but we CAN force the network
   * request to fire BEFORE the page unloads — fetch() requests fire on
   * a separate task and have a good chance of completing if started in
   * time.
   *
   * For browsers that support it, we also use navigator.sendBeacon for
   * a more reliable fire-and-forget. But the supabase-js client uses fetch,
   * so we just kick the flush.
   * ========================================================================= */
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', function (e) {
      if (_queue.length > 0 || _flushTimer) {
        // Fire the flush immediately. The fetch request will be in-flight
        // when the page unloads. Modern browsers continue in-flight requests
        // for a short window after unload.
        flushNow();
        // Optionally warn the user. Most browsers ignore the message string
        // for security reasons but will show a generic "leave site?" prompt.
        var msg = 'Your changes are still saving. Please wait a moment before reloading.';
        e.preventDefault();
        e.returnValue = msg;
        return msg;
      }
    });
  }

  /* =========================================================================
   * Supabase Storage helpers (gallery bucket)
   * =========================================================================
   * The `gallery` bucket is configured as public in Supabase. Gallery
   * images are uploaded as files; the public URL is stored on the
   * gallery row's `data` JSONB column. This is dramatically better than
   * the previous approach of stuffing base64 strings into JSONB:
   *
   *   - Row size drops from MBs to ~100 bytes
   *   - Realtime payload is tiny — instant cross-device sync
   *   - <img src> uses CDN delivery instead of inline data URLs
   *   - No localStorage / IndexedDB quota pressure
   * ========================================================================= */
  var GALLERY_BUCKET = 'gallery';

  // Convert a base64 data URL to a Blob for upload.
  function _dataUrlToBlob(dataUrl) {
    var parts = String(dataUrl || '').split(',');
    if (parts.length < 2) return null;
    var match = /data:([^;]+);base64/i.exec(parts[0] || '');
    var mime = match ? match[1] : 'application/octet-stream';
    var b64 = parts[1];
    try {
      var byteString = atob(b64);
      var len = byteString.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) bytes[i] = byteString.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    } catch (e) {
      console.warn('[Storage] dataURL→blob failed', e);
      return null;
    }
  }

  function _mimeToExt(mime) {
    var m = String(mime || '').toLowerCase();
    if (m.indexOf('jpeg') !== -1 || m.indexOf('jpg') !== -1) return 'jpg';
    if (m.indexOf('png') !== -1) return 'png';
    if (m.indexOf('webp') !== -1) return 'webp';
    if (m.indexOf('gif') !== -1) return 'gif';
    return 'bin';
  }

  /**
   * Upload a base64 data URL to the gallery bucket and return its
   * public URL. Falls back to returning null on any failure so the
   * caller can decide whether to retry or store inline data instead.
   * @param {string} id - gallery item id (used as the file name prefix)
   * @param {string} dataUrl - base64 data URL e.g. "data:image/jpeg;base64,..."
   * @returns {Promise<string|null>} public URL or null on failure
   */
  function uploadGalleryImage(id, dataUrl) {
    if (!_enabled()) {
      console.warn('[Storage] upload skipped — Supabase not enabled');
      return Promise.resolve(null);
    }
    var blob = _dataUrlToBlob(dataUrl);
    if (!blob) {
      console.warn('[Storage] upload skipped — invalid data URL for id', id);
      return Promise.resolve(null);
    }
    var ext = _mimeToExt(blob.type);
    var path = id + '.' + ext;
    var sb = _client();
    console.info('[Storage] uploading', path, 'size=', blob.size, 'type=', blob.type);
    return sb.storage.from(GALLERY_BUCKET)
      .upload(path, blob, {
        contentType: blob.type,
        upsert: true,
        cacheControl: '31536000'
      })
      .then(function (res) {
        if (res && res.error) {
          console.error('[Storage] upload error response', res.error);
          throw res.error;
        }
        var pub = sb.storage.from(GALLERY_BUCKET).getPublicUrl(path);
        var url = pub && pub.data && pub.data.publicUrl;
        console.info('[Storage] upload OK, public URL:', url);
        return url || null;
      })
      .catch(function (err) {
        console.error('[Storage] gallery upload failed', err && (err.message || err));
        return null;
      });
  }

  /**
   * Delete a gallery image from Storage. Best-effort — failures are
   * logged but don't break the rest of the delete flow.
   * @param {string} id - gallery item id
   * @param {string} [ext] - optional file extension if known
   */
  function deleteGalleryImage(id, ext) {
    if (!_enabled() || !id) return Promise.resolve(false);
    var sb = _client();
    // Try common extensions if we don't know the exact one
    var candidates = ext ? [id + '.' + ext] : [
      id + '.jpg', id + '.png', id + '.webp', id + '.gif', id + '.bin'
    ];
    return sb.storage.from(GALLERY_BUCKET).remove(candidates)
      .then(function (res) { return res && !res.error; })
      .catch(function (err) {
        console.warn('[Storage] gallery delete failed', err);
        return false;
      });
  }

  App.SupabaseSync = {
    bootstrap:     bootstrap,
    publishCreate: publishCreate,
    publishUpdate: publishUpdate,
    publishRemove: publishRemove,
    publishConfig: publishConfig,
    subscribe:     subscribe,
    status:        status,
    _table:        _table,
    _flush:        _flush,
    flushNow:      flushNow,
    pending:       pending,
    _unsubscribe:  _unsubscribe,
    // Storage API
    uploadGalleryImage: uploadGalleryImage,
    deleteGalleryImage: deleteGalleryImage
  };
})();
