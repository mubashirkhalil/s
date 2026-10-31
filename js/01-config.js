/* ==========================================================================
 * App.Config
 * --------------------------------------------------------------------------
 * Centralized constants. Anything that was a magic string or hardcoded value
 * scattered across the original file lives here, so future changes touch one
 * place instead of N call sites.
 * ========================================================================== */
(function () {
  'use strict';

  App.Config = {
    /* ---- Persistence keys ------------------------------------------------ */
    STORAGE_KEY: 'restaurantData',
    REALTIME_EVENT_KEY: 'restaurantRealtimeEvent',
    REALTIME_CHANNEL_NAME: 'restaurant-realtime',
    PENDING_ADMIN_SECTION_KEY: 'restaurantPendingAdminSection',

    /* ---- IndexedDB names (two coexisting in legacy code, both preserved) - */
    INDEXEDDB_PRIMARY_NAME: 'RestaurantGallery',   // used by openImageDB
    INDEXEDDB_LEGACY_NAME: 'galleryDB',            // used by openGalleryStorageDB

    /* ---- Order ID format ------------------------------------------------- */
    ORDER_ID_PREFIX: 'AFGR',
    ORDER_ID_DIGITS: 4,

    /* ---- OTP ------------------------------------------------------------- */
    OTP_LENGTH: 6,
    OTP_EXPIRY_MS: 5 * 60 * 1000,    // 5 minutes
    OTP_MAX_ATTEMPTS: 5,

    /* ---- Pricing defaults (overridable via admin Settings) --------------- */
    DEFAULT_DELIVERY_FEE: 5,
    DEFAULT_TAX_RATE: 0.05,
    DEFAULT_DISCOUNT_RATE: 0,
    DEFAULT_DISCOUNT_THRESHOLD: 0,
    CURRENCY_SYMBOL: 'AED',

    /* ---- Realtime sections that get notification dots ------------------- */
    REALTIME_SECTIONS: ['orders', 'reservations', 'requests'],

    /* ---- Supabase backend (phase 4) -------------------------------------
     * URL and anon key. Replace for your own deployment. The anon key is
     * safe to expose in browser code IF Row Level Security is configured
     * properly. See supabase/SUPABASE_SETUP.md.
     * ---------------------------------------------------------------------- */
    SUPABASE_URL: 'https://ylohcjhonuzpimilvpfq.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb2hjamhvbnV6cGltaWx2cGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTk2MDIsImV4cCI6MjA5MzkzNTYwMn0.wO232nIYeALTy5-MqKdZ4WYIVK_S6-LLlseAPOJoKL4',
    SUPABASE_ENABLED: true,    // set false to disable cloud sync entirely

    // Optional: after a signed native Android APK has been built and hosted,
    // put its HTTPS .apk URL here. Until then Get App installs the PWA.
    NATIVE_ANDROID_APK_URL: '',

    /* ---- Sync engine settings ------------------------------------------- */
    SYNC_FLUSH_DELAY_MS: 50,   // batch async writes within this window - kept tight so a fast refresh doesn't beat the flush
    SYNC_BOOTSTRAP_TIMEOUT_MS: 10000,  // give up bootstrap after this

    /* ---- Phase C: Web Push (background notifications) -------------------
     * Paste your VAPID public key here AFTER you generate one. Until then,
     * background push is disabled (Phase A foreground alerts + Phase B
     * tab-inactive notifications still work). See PHASE_C_SETUP.md.
     * ---------------------------------------------------------------------- */
    VAPID_PUBLIC_KEY: 'BI8Rm32VHv5mKbgWPM13_parA9uJBTC6PdyEN3DIDr0WGHDu-d_oLKq22DSwwMqzR49rGbYAfeCsX02HTnHYdCk'
  };
})();
