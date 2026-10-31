/* ==========================================================================
 * App.Repo
 * --------------------------------------------------------------------------
 * Repository layer. Single point of access for every persisted collection.
 *
 * All methods are SYNCHRONOUS in this phase because legacy callers expect
 * sync access. When migrating to Supabase (phase 4), the internals will
 * become async and consumers will be updated to handle Promises.
 *
 * Each Repo method:
 *   - reads/mutates the corresponding slice of window.appState
 *   - calls App.Store.save() when state changes
 *   - returns the affected entity (or list) for chaining
 *
 * Backend hook point:
 *   The _backend object below selects the persistence target per-resource.
 *   In this phase every value is 'local'. To migrate one resource to
 *   Supabase later, flip its entry and add the supabase branch in the
 *   relevant method.
 * ========================================================================== */
(function () {
  'use strict';

  // Per-resource backend selector. Future swap point.
  var _backend = {
    users:        'local',
    menu:         'local',
    categories:   'local',
    offers:       'local',
    orders:       'local',
    reservations: 'local',
    requests:     'local',
    reviews:      'local',
    gallery:      'local',
    config:       'local',
    otp:          'local'
  };

  function _state() {
    if (!window.appState) {
      throw new Error('App.Repo: appState not initialized. Did App.Store.init() run?');
    }
    return window.appState;
  }

  function _ensureArray(key) {
    var s = _state();
    if (!Array.isArray(s[key])) s[key] = [];
    return s[key];
  }

  /* ========================================================================
   * Generic CRUD helpers — used by most resource Repos.
   * Each takes a collection name (string) and operates on appState[name].
   * ======================================================================== */

  function _list(name) {
    return _ensureArray(name).slice();   // defensive copy
  }

  function _findById(name, id) {
    return _ensureArray(name).find(function (r) { return r && r.id === id; }) || null;
  }

  function _findByIndex(name, idx) {
    var arr = _ensureArray(name);
    if (typeof idx !== 'number' || idx < 0 || idx >= arr.length) return null;
    return arr[idx];
  }

  function _create(name, entity) {
    _ensureArray(name).push(entity);
    App.Store.save();
    _syncCreate(name, entity);
    return entity;
  }

  function _updateById(name, id, patch) {
    var row = _findById(name, id);
    if (!row) return null;
    Object.assign(row, patch);
    App.Store.save();
    _syncUpdate(name, id, row);
    return row;
  }

  function _updateByIndex(name, idx, patch) {
    var row = _findByIndex(name, idx);
    if (!row) return null;
    Object.assign(row, patch);
    App.Store.save();
    _syncUpdate(name, row.id, row);
    return row;
  }

  function _replaceById(name, id, replacement) {
    var arr = _ensureArray(name);
    var i = arr.findIndex(function (r) { return r && r.id === id; });
    if (i === -1) return null;
    arr[i] = replacement;
    App.Store.save();
    _syncUpdate(name, id, replacement);
    return replacement;
  }

  function _removeById(name, id) {
    var arr = _ensureArray(name);
    var i = arr.findIndex(function (r) { return r && r.id === id; });
    if (i === -1) return false;
    arr.splice(i, 1);
    App.Store.save();
    _syncRemove(name, id);
    return true;
  }

  function _removeByIndex(name, idx) {
    var arr = _ensureArray(name);
    if (typeof idx !== 'number' || idx < 0 || idx >= arr.length) return false;
    var row = arr[idx];
    var id = row && row.id;
    arr.splice(idx, 1);
    App.Store.save();
    if (id) _syncRemove(name, id);
    return true;
  }

  /* ------------------------------------------------------------------------
   * Sync hooks — fire-and-forget calls to App.SupabaseSync if available.
   * Failures are caught and logged inside SupabaseSync; this layer ignores.
   * ------------------------------------------------------------------------ */
  function _syncCreate(name, entity) {
    if (App.SupabaseSync) App.SupabaseSync.publishCreate(name, entity);
  }
  function _syncUpdate(name, id, entity) {
    if (App.SupabaseSync) App.SupabaseSync.publishUpdate(name, id, entity);
  }
  function _syncRemove(name, id) {
    if (App.SupabaseSync) App.SupabaseSync.publishRemove(name, id);
  }

  /* ========================================================================
   * Resource-specific Repos
   * ======================================================================== */

  var Orders = {
    list:           function ()              { return _list('orders'); },
    get:            function (id)            { return _findById('orders', id); },
    create:         function (order)         { return _create('orders', order); },
    update:         function (id, patch)     { return _updateById('orders', id, patch); },
    remove:         function (id)            { return _removeById('orders', id); },
    findByUserId:   function (userId) {
      return _ensureArray('orders').filter(function (o) { return o && o.userId === userId; });
    }
  };

  var Reservations = {
    list:   function ()           { return _list('reservations'); },
    get:    function (id)         { return _findById('reservations', id); },
    create: function (res)        { return _create('reservations', res); },
    update: function (id, patch)  { return _updateById('reservations', id, patch); },
    remove: function (id)         { return _removeById('reservations', id); }
  };

  var Users = {
    list:   function ()           { return _list('users'); },
    get:    function (id)         { return _findById('users', id); },
    create: function (user)       { return _create('users', user); },
    update: function (id, patch)  { return _updateById('users', id, patch); },
    remove: function (id)         { return _removeById('users', id); },
    findByUsername: function (usernameOrEmail) {
      return _ensureArray('users').find(function (u) {
        if (!u) return false;
        return u.username === usernameOrEmail || u.email === usernameOrEmail;
      }) || null;
    }
  };

  var Menu = {
    list:           function ()              { return _list('menuItems'); },
    get:            function (id)            { return _findById('menuItems', id); },
    create:         function (item)          { return _create('menuItems', item); },
    update:         function (id, patch)     { return _updateById('menuItems', id, patch); },
    replace:        function (id, item)      { return _replaceById('menuItems', id, item); },
    remove:         function (id)            { return _removeById('menuItems', id); },
    findByCategory: function (categoryName) {
      return _ensureArray('menuItems').filter(function (m) {
        return m && m.category === categoryName;
      });
    }
  };

  var Categories = {
    list:           function ()           { return _list('categories'); },
    getByIndex:     function (idx)        { return _findByIndex('categories', idx); },
    get:            function (id)         { return _findById('categories', id); },
    create:         function (category)   { return _create('categories', category); },
    updateByIndex:  function (idx, patch) { return _updateByIndex('categories', idx, patch); },
    update:         function (id, patch)  { return _updateById('categories', id, patch); },
    removeByIndex:  function (idx)        { return _removeByIndex('categories', idx); },
    remove:         function (id)         { return _removeById('categories', id); }
  };

  var Offers = {
    list:           function ()           { return _list('offers'); },
    getByIndex:     function (idx)        { return _findByIndex('offers', idx); },
    get:            function (id)         { return _findById('offers', id); },
    create:         function (offer)      { return _create('offers', offer); },
    update:         function (id, patch)  { return _updateById('offers', id, patch); },
    updateByIndex:  function (idx, patch) { return _updateByIndex('offers', idx, patch); },
    remove:         function (id)         { return _removeById('offers', id); },
    removeByIndex:  function (idx)        { return _removeByIndex('offers', idx); },
    active:         function (now) {
      now = (typeof now === 'number') ? now : Date.now();
      return _ensureArray('offers').filter(function (o) { return App.Util.isOfferActive(o, now); });
    }
  };

  var Reviews = {
    list:           function ()           { return _list('reviews'); },
    getByIndex:     function (idx)        { return _findByIndex('reviews', idx); },
    get:            function (id)         { return _findById('reviews', id); },
    create:         function (review)     { return _create('reviews', review); },
    update:         function (id, patch)  { return _updateById('reviews', id, patch); },
    updateByIndex:  function (idx, patch) { return _updateByIndex('reviews', idx, patch); },
    remove:         function (id)         { return _removeById('reviews', id); },
    removeByIndex:  function (idx)        { return _removeByIndex('reviews', idx); }
  };

  var Requests = {
    list:   function ()           { return _list('requests'); },
    get:    function (id)         { return _findById('requests', id); },
    create: function (req)        { return _create('requests', req); },
    update: function (id, patch)  { return _updateById('requests', id, patch); },
    remove: function (id)         { return _removeById('requests', id); }
  };

  /**
   * Gallery is special: the metadata (id, captions) lives in appState.gallery,
   * but the image bytes live in IndexedDB. Repo.Gallery.create() handles
   * both. Repo.Gallery.get() returns metadata only; use App.IndexedDB.get(id)
   * for the data URL.
   */
  var Gallery = {
    list:   function () {
      return _list('gallery');
    },
    get: function (id) {
      return _findById('gallery', id);
    },
    /**
     * Create a gallery entry. Accepts { data: dataUrl, ...meta }.
     * Uploads the image to Supabase Storage (gallery bucket) and stores
     * only the public URL + metadata in the Supabase row. The full
     * data URL still goes to local IndexedDB for instant rendering on
     * the uploading device. Other devices download via the URL.
     *
     * @returns {Promise<Object>} resolves with the new entry
     */
    create: function (entry) {
      var newId = (entry && entry.id) || App.Util.generateId();
      var dataValue = entry && entry.data;
      var meta = Object.assign({}, entry || {}, { id: newId });
      delete meta.data;  // never store base64 in meta

      // Optimistic local insert with inline data so the uploader sees
      // the image immediately. The url field will be patched in below
      // once the Storage upload completes.
      var localEntry = Object.assign({ id: newId, data: dataValue }, meta);
      _ensureArray('gallery').push(localEntry);
      App.Store.save();

      // Persist data URL to local IndexedDB so this device can render
      // without re-fetching from Storage on reload.
      var idbPromise = App.IndexedDB.put(newId, dataValue).catch(function () {});

      // Upload to Storage in parallel. When done, patch the local entry
      // with the public URL and sync the {id, url, ...meta} record.
      var uploadPromise = (App.SupabaseSync && App.SupabaseSync.uploadGalleryImage)
        ? App.SupabaseSync.uploadGalleryImage(newId, dataValue)
        : Promise.resolve(null);

      return Promise.all([idbPromise, uploadPromise]).then(function (results) {
        var url = results[1];
        // Build the record that gets synced to Supabase. If upload
        // succeeded, only {id, url, ...meta} is synced — tiny payload.
        // If upload failed (no network, bucket misconfig), fall back
        // to syncing the data URL inline so cross-device still works.
        var syncRecord;
        if (url) {
          // Patch the in-memory entry with the URL
          var idx = (App.Store.state().gallery || []).findIndex(function (g) {
            return g && g.id === newId;
          });
          if (idx !== -1) {
            App.Store.state().gallery[idx].url = url;
            App.Store.save();
          }
          syncRecord = Object.assign({ id: newId, url: url }, meta);
        } else {
          syncRecord = Object.assign({ id: newId, data: dataValue }, meta);
        }
        _syncCreate('gallery', syncRecord);
        return Object.assign({ id: newId, data: dataValue, url: url || undefined }, meta);
      });
    },
    remove: function (id) {
      var ok = _removeById('gallery', id);
      if (ok) {
        // Remove from local IndexedDB
        try { App.IndexedDB.delete(id); } catch (e) {}
        // Remove from Supabase Storage (best-effort)
        if (App.SupabaseSync && App.SupabaseSync.deleteGalleryImage) {
          App.SupabaseSync.deleteGalleryImage(id);
        }
      }
      return ok;
    },
    /**
     * Push gallery metadata WITHOUT touching IndexedDB. Used by legacy
     * upload code that already calls storeImageInDB() itself, to avoid a
     * double-write. Prefer create() in new code.
     */
    _pushMeta: function (entry) {
      _ensureArray('gallery').push(entry);
      App.Store.save();
      if (!entry || !entry.id) return entry;

      // Upload to Supabase Storage in the background and sync only the
      // URL + metadata to the database row. Falls back to inline data
      // sync if the upload fails so cross-device still works in offline
      // / misconfigured environments.
      var dataValue = entry.data;
      var meta = Object.assign({}, entry);
      delete meta.data;

      if (App.SupabaseSync && App.SupabaseSync.uploadGalleryImage && dataValue) {
        App.SupabaseSync.uploadGalleryImage(entry.id, dataValue).then(function (url) {
          var syncRecord;
          if (url) {
            // Patch the in-memory entry with the URL so future renders
            // and subsequent saves include it.
            var state = App.Store.state();
            if (state && Array.isArray(state.gallery)) {
              var idx = state.gallery.findIndex(function (g) { return g && g.id === entry.id; });
              if (idx !== -1) {
                state.gallery[idx].url = url;
                App.Store.save();
              }
            }
            syncRecord = Object.assign({ id: entry.id, url: url }, meta);
          } else {
            // Fallback: send the data URL inline (large but works)
            syncRecord = Object.assign({ id: entry.id, data: dataValue }, meta);
          }
          _syncCreate('gallery', syncRecord);
        });
      } else {
        // No SupabaseSync available — sync inline data as fallback
        var fallback = Object.assign({ id: entry.id, data: dataValue }, meta);
        _syncCreate('gallery', fallback);
      }
      return entry;
    }
  };

  /**
   * Config Repo: wraps appState.config. Read-only list, in-place mutate.
   */
  var Config = {
    get: function () {
      return _state().config || {};
    },
    update: function (patch) {
      var s = _state();
      if (!s.config) s.config = {};
      Object.assign(s.config, patch);
      App.Store.save();
      if (App.SupabaseSync) App.SupabaseSync.publishConfig(s.config);
      return s.config;
    },
    set: function (key, value) {
      var s = _state();
      if (!s.config) s.config = {};
      s.config[key] = value;
      App.Store.save();
      if (App.SupabaseSync) App.SupabaseSync.publishConfig(s.config);
      return s.config;
    }
  };

  var Otp = {
    list: function () {
      return _list('otpRecords');
    },
    create: function (record) {
      return _create('otpRecords', record);
    },
    findByEmail: function (email) {
      return _ensureArray('otpRecords').find(function (r) {
        return r && r.email === email;
      }) || null;
    },
    update: function (id, patch) { return _updateById('otpRecords', id, patch); },
    remove: function (id) {
      return _removeById('otpRecords', id);
    },
    clean: function () {
      // Remove expired entries
      var now = Date.now();
      var s = _state();
      s.otpRecords = (s.otpRecords || []).filter(function (rec) {
        return rec && rec.expiry && rec.expiry > now;
      });
      App.Store.save();
    }
  };

  App.Repo = {
    // Backend control
    _backend:    _backend,
    _setBackend: function (resource, backend) { _backend[resource] = backend; },
    _getBackend: function (resource)          { return _backend[resource]; },

    // Resource Repos
    Orders:       Orders,
    Reservations: Reservations,
    Users:        Users,
    Menu:         Menu,
    Categories:   Categories,
    Offers:       Offers,
    Reviews:      Reviews,
    Requests:     Requests,
    Gallery:      Gallery,
    Config:       Config,
    Otp:          Otp
  };
})();
