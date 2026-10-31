/* ==========================================================================
 * Legacy compatibility shims
 * --------------------------------------------------------------------------
 * The unrefactored portion of the codebase (99-legacy.js) calls dozens of
 * functions by their original global names (`generateId`, `saveData`,
 * `escapeHtml`, etc.). This file re-exposes the new App.* methods under
 * those original names so legacy code keeps working without modification.
 *
 * As future phases extract more layers, the corresponding aliases here can
 * be removed once all call sites have moved to App.* directly.
 *
 * IMPORTANT: function declarations at the top level of a classic <script>
 * are hoisted to the global scope and become accessible as window.<name>,
 * so legacy code that calls these without a prefix continues to resolve.
 * ========================================================================== */
(function () {
  'use strict';

  /* ---- Util aliases ---------------------------------------------------- */
  window.generateId       = App.Util.generateId;
  window.generateOtp      = App.Util.generateOtp;
  window.escapeHtml       = App.Util.escapeHtml;
  window.formatCurrency   = App.Util.formatCurrency;
  window.isOfferActive    = App.Util.isOfferActive;

  // generateOrderId() in the original closed over appState.orders.
  // Wrap so the legacy zero-arg call still works while exposing a clean
  // pure version on App.Util for new code.
  window.generateOrderId = function () {
    var orders = (window.appState && Array.isArray(window.appState.orders))
      ? window.appState.orders
      : null;
    return App.Util.generateOrderId(orders);
  };

  /* ---- Store aliases --------------------------------------------------- */
  window.loadData = App.Store.load;
  window.saveData = App.Store.save;

  /* ---- IndexedDB aliases ---------------------------------------------- */
  // Primary (RestaurantGallery)
  window.openImageDB        = App.IndexedDB.open;
  window.storeImageInDB     = App.IndexedDB.put;
  window.getImageFromDB     = App.IndexedDB.get;
  window.removeImageFromDB  = App.IndexedDB.delete;

  // Legacy (galleryDB)
  window.openGalleryStorageDB        = App.IndexedDB.openLegacy;
  window.saveImageToGalleryStorageDB = App.IndexedDB.putLegacy;
  window.getImageFromGalleryStorageDB = App.IndexedDB.getLegacy;
  window.deleteImageFromGalleryStorageDB = App.IndexedDB.deleteLegacy;

  /* ---- Bootstrap appState --------------------------------------------- */
  // The original code did: `let appState = loadData();` near the top of the
  // main script. We pre-load it here so legacy code finds appState ready.
  // The legacy script's own initialiser line has been removed.
  App.Store.init();
  // Seed the sync diff baseline. This is the snapshot the first mutation
  // will be diffed against. SupabaseSync.bootstrap will reset it again
  // after fetching fresh cloud data.
  if (App.Store.resetSyncBaseline) App.Store.resetSyncBaseline();
})();
