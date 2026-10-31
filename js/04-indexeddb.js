/* ==========================================================================
 * App.IndexedDB
 * --------------------------------------------------------------------------
 * Gallery image storage adapter.
 *
 * The original codebase contained TWO independent IndexedDB implementations
 * with different database names and schemas:
 *
 *   1. "galleryDB"          (object store keyed by external `id` argument)
 *      - openGalleryStorageDB / saveImageToGalleryStorageDB /
 *        getImageFromGalleryStorageDB / deleteImageFromGalleryStorageDB
 *
 *   2. "RestaurantGallery"  (object store with keyPath: 'id')
 *      - openImageDB / storeImageInDB / removeImageFromDB / getImageFromDB
 *
 * Both are referenced by the legacy code. To preserve behaviour exactly,
 * both implementations are kept here and re-aliased to their original
 * global names by 05-legacy-compat.js.
 *
 * NOTE FOR FUTURE PHASE: this duplication should be consolidated. See
 * REFACTOR_NOTES.md "Known duplication".
 * ========================================================================== */
(function () {
  'use strict';

  /* ========================================================================
   * Implementation 1: "galleryDB"  (legacy first implementation)
   * ======================================================================== */

  var galleryDBName = App.Config.INDEXEDDB_LEGACY_NAME;

  function openGalleryStorageDB() {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(galleryDBName, 1);
      request.onupgradeneeded = function (event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images');
        }
      };
      request.onsuccess = function (event) {
        resolve(event.target.result);
      };
      request.onerror = function (event) {
        console.error('Failed to open IndexedDB', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async function saveImageToGalleryStorageDB(id, data) {
    var db = await openGalleryStorageDB();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction('images', 'readwrite');
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function (event) {
        console.error('Error saving image to IndexedDB', event.target.error);
        reject(event.target.error);
      };
      var store = tx.objectStore('images');
      store.put(data, id);
    });
  }

  async function getImageFromGalleryStorageDB(id) {
    var db = await openGalleryStorageDB();
    return new Promise(function (resolve) {
      var tx = db.transaction('images', 'readonly');
      tx.onerror = function (event) {
        console.error('Error retrieving image from IndexedDB', event.target.error);
        resolve(undefined);
      };
      var store = tx.objectStore('images');
      var request = store.get(id);
      request.onsuccess = function (event) { resolve(event.target.result); };
      request.onerror = function () { resolve(undefined); };
    });
  }

  async function deleteImageFromGalleryStorageDB(id) {
    var db = await openGalleryStorageDB();
    return new Promise(function (resolve) {
      var tx = db.transaction('images', 'readwrite');
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function (event) {
        console.error('Error deleting image from IndexedDB', event.target.error);
        resolve();
      };
      var store = tx.objectStore('images');
      store.delete(id);
    });
  }

  /* ========================================================================
   * Implementation 2: "RestaurantGallery"  (primary, currently in use)
   * ======================================================================== */

  function openImageDB() {
    return new Promise(function (resolve) {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported in this browser');
        resolve(null);
        return;
      }
      var request = indexedDB.open(App.Config.INDEXEDDB_PRIMARY_NAME, 1);
      request.onupgradeneeded = function (event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }
      };
      request.onsuccess = function (event) {
        resolve(event.target.result);
      };
      request.onerror = function (event) {
        console.error('IndexedDB open error', event.target.error);
        resolve(null);
      };
    });
  }

  function storeImageInDB(id, data) {
    return openImageDB().then(function (db) {
      if (!db) return;
      return new Promise(function (resolve) {
        var tx = db.transaction('images', 'readwrite');
        var store = tx.objectStore('images');
        store.put({ id: id, data: data });
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function (event) {
          console.error('Error storing image in IndexedDB', event.target.error);
          resolve();
        };
      });
    });
  }

  function removeImageFromDB(id) {
    return openImageDB().then(function (db) {
      if (!db) return;
      return new Promise(function (resolve) {
        var tx = db.transaction('images', 'readwrite');
        var store = tx.objectStore('images');
        store.delete(id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function (event) {
          console.error('Error removing image from IndexedDB', event.target.error);
          resolve();
        };
      });
    });
  }

  function getImageFromDB(id) {
    return openImageDB().then(function (db) {
      if (!db) return null;
      return new Promise(function (resolve) {
        var tx = db.transaction('images', 'readonly');
        var store = tx.objectStore('images');
        var req = store.get(id);
        req.onsuccess = function (event) {
          var result = event.target.result;
          // Support both legacy formats (string Data URLs) and
          // newer object format { id: string, data: string }.
          if (typeof result === 'string') {
            resolve(result);
          } else if (result && typeof result.data === 'string') {
            resolve(result.data);
          } else {
            resolve(null);
          }
        };
        req.onerror = function (event) {
          console.error('Error fetching image from IndexedDB', event.target.error);
          resolve(null);
        };
      });
    });
  }

  App.IndexedDB = {
    // Primary (RestaurantGallery)
    open:   openImageDB,
    put:    storeImageInDB,
    get:    getImageFromDB,
    delete: removeImageFromDB,

    // Legacy (galleryDB)
    openLegacy:   openGalleryStorageDB,
    putLegacy:    saveImageToGalleryStorageDB,
    getLegacy:    getImageFromGalleryStorageDB,
    deleteLegacy: deleteImageFromGalleryStorageDB
  };
})();
