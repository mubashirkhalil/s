/* ==========================================================================
 * App namespace
 * --------------------------------------------------------------------------
 * Root container for every refactored module. Loaded first.
 *
 * Layers (populated by subsequent script files):
 *   App.Config      - constants (storage keys, prefixes, defaults)
 *   App.Util        - pure helper functions
 *   App.IndexedDB   - gallery image storage adapter
 *   App.Store       - in-memory state + localStorage persistence
 *
 * Reserved for future phases:
 *   App.Repo        - data access dispatcher (Supabase swap point)
 *   App.Services    - business logic (Cart, Order, Auth, Reservation, ...)
 *   App.UI          - rendering + form handlers
 *   App.Boot        - startup orchestration
 * ========================================================================== */
(function () {
  'use strict';

  if (typeof window.App === 'undefined') {
    window.App = {
      Config: {},
      Util: {},
      IndexedDB: {},
      Store: {},
      // Placeholders so feature checks can probe these without throwing.
      Repo: null,
      Services: null,
      UI: null,
      Boot: null,
      version: 'v245-socials-persist'
    };
  }
  // Log version on boot so we can verify which build is deployed.
  // If you ever see an unexpected version here, the deploy didn't take.
  try { console.info('[App] version:', window.App.version); } catch (e) {}
})();
