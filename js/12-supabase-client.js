/* ==========================================================================
 * App.Supabase
 * --------------------------------------------------------------------------
 * Centralized Supabase client. Initialised once from App.Config and made
 * available as App.Supabase.client.
 *
 * The legacy file also contains an old Supabase init block (window.supabase
 * + window.supabaseHelpers). That block is never called by anything; we
 * leave it alone and use our own namespaced client here to avoid conflicts.
 * ========================================================================== */
(function () {
  'use strict';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.warn('[App.Supabase] supabase-js not loaded; client will be null');
    App.Supabase = {
      client: null,
      isReady: function () { return false; },
      isEnabled: function () { return false; }
    };
    return;
  }

  var url = App.Config.SUPABASE_URL;
  var key = App.Config.SUPABASE_ANON_KEY;
  var enabled = App.Config.SUPABASE_ENABLED;

  if (!enabled) {
    console.info('[App.Supabase] disabled via config; running localStorage-only');
    App.Supabase = {
      client: null,
      isReady: function () { return false; },
      isEnabled: function () { return false; }
    };
    return;
  }

  if (!url || !key || url.indexOf('your-project') !== -1) {
    console.warn('[App.Supabase] URL or anon key not configured');
    App.Supabase = {
      client: null,
      isReady: function () { return false; },
      isEnabled: function () { return false; }
    };
    return;
  }

  var client;
  try {
    client = window.supabase.createClient(url, key, {
      auth: {
        // Phase 5 wired up real Supabase Auth. We MUST persist the session
        // across page reloads (otherwise every reload appears to log the
        // user out and every subsequent write gets 401 permission denied
        // because requests go out as anon role with no JWT).
        //
        // The previous version set persistSession: false from a time when
        // the app wasn't using Supabase Auth at all. That was correct
        // then, but became the root cause of every "data not syncing"
        // report once auth was actually in use.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'sb-restaurant-auth'
      }
    });
  } catch (err) {
    console.error('[App.Supabase] client creation failed', err);
    App.Supabase = {
      client: null,
      isReady: function () { return false; },
      isEnabled: function () { return false; }
    };
    return;
  }

  App.Supabase = {
    client: client,
    url: url,
    isReady: function () { return !!client; },
    isEnabled: function () { return enabled === true; }
  };

  console.info('[App.Supabase] client ready, url:', url);
})();
