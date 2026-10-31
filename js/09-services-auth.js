/* ==========================================================================
 * App.Services.Auth   (phase 5 - Supabase Auth backed)
 * --------------------------------------------------------------------------
 * Replaces the phase 3/4 localStorage-only auth with real Supabase Auth.
 *
 * Flow:
 *   - signup() and login() are async (use Supabase Auth API)
 *   - logout() is async
 *   - session() and currentUser() are SYNC (read from cached state) so the
 *     legacy code that calls them synchronously keeps working
 *
 * The cache lives at appState.session and is kept in lockstep with
 * supabase.auth via onAuthStateChange.
 *
 * Roles:
 *   - "admin"    : the user's auth.uid() is in the public.admins table
 *   - "staff"    : profile row in users table has role = 'staff' (or any
 *                  non-'customer' value other than 'admin')
 *   - "customer" : default for new sign-ups
 *
 * Backward compat:
 *   - Login accepts username OR email. If a non-email is given, we look up
 *     the email from the users profile table.
 *   - Returns the same { ok, user } shape the phase 3 handlers expect.
 *   - appState.session shape is { id, role, authUserId }, where id is the
 *     application's profile id (base36) so existing legacy code continues
 *     to look up users via App.Repo.Users.get(session.id).
 * ========================================================================== */
(function () {
  'use strict';

  if (!App.Services) App.Services = {};

  function _sb() {
    return App.Supabase && App.Supabase.client;
  }

  function _enabled() {
    return !!_sb();
  }

  /* ------------------------------------------------------------------------
   * Internal helpers
   * ------------------------------------------------------------------------ */

  /**
   * Look up a profile in the users table by auth_user_id (UUID).
   * Returns the JSONB `data` object or null.
   */
  async function _profileByAuthUserId(authUserId) {
    var sb = _sb();
    if (!sb || !authUserId) return null;
    try {
      var res = await sb.from('users').select('*')
        .eq('auth_user_id', authUserId)
        .limit(1)
        .maybeSingle();
      if (res.error) {
        console.warn('[Auth] profile lookup error', res.error);
        // Throw to signal "lookup failed, don't fall through to create"
        // — distinct from a genuine "not found" which returns null.
        var err = new Error(res.error.message || 'profile-lookup-failed');
        err.__lookupFailed = true;
        throw err;
      }
      return res.data ? res.data.data : null;
    } catch (err) {
      // Bubble lookup-failed errors so _ensureProfile can bail safely
      // instead of creating an orphan customer row.
      if (err && err.__lookupFailed) throw err;
      console.error('[Auth] profile lookup threw', err);
      return null;
    }
  }

  /**
   * Look up a profile in the users table by email (string).
   * Used during signup to link an existing legacy localStorage profile to a
   * newly created Supabase Auth user.
   */
  async function _profileByEmail(email) {
    var sb = _sb();
    if (!sb || !email) return null;
    try {
      var res = await sb.from('users').select('*')
        .eq('email', email)
        .limit(1)
        .maybeSingle();
      if (res.error) {
        console.warn('[Auth] profile-by-email lookup error', res.error);
        return null;
      }
      return res.data || null;   // returns full row {id, data, ...} for upserting
    } catch (err) {
      console.error('[Auth] profile-by-email lookup threw', err);
      return null;
    }
  }

  /**
   * Look up a profile by username in the users table, returning the email.
   * Used at login when the user types a username instead of an email.
   */
  async function _emailByUsername(username) {
    var sb = _sb();
    if (!sb || !username) return null;
    try {
      var res = await sb.from('users').select('email')
        .eq('username', username)
        .limit(1)
        .maybeSingle();
      if (res.error || !res.data) return null;
      return res.data.email || null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Check if a Supabase auth user id is in the admins table.
   *
   * Tries three methods, in order of reliability:
   *   1. RPC call to is_admin() function (preferred — bypasses RLS via
   *      SECURITY DEFINER, works regardless of column naming)
   *   2. SELECT against admins.id (your column convention)
   *   3. SELECT against admins.user_id (alternate convention)
   *
   * Returns true ONLY when a positive match is found. Any error/empty
   * result falls back to the next method, then ultimately false. This
   * prevents a transient network glitch from silently elevating a user.
   *
   * Logs verbosely so RLS rejections, missing tables, and column
   * mismatches are visible in the browser console.
   */
  async function _isAdminInDB(authUserId) {
    var sb = _sb();
    if (!sb || !authUserId) {
      console.warn('[Auth._isAdminInDB] no client or no authUserId');
      return false;
    }

    // Method 1: RPC is_admin(). This is the most reliable because the
    // function is SECURITY DEFINER and bypasses RLS internally.
    try {
      var rpc = await sb.rpc('is_admin');
      if (rpc && !rpc.error) {
        if (rpc.data === true) {
          console.info('[Auth._isAdminInDB] match via is_admin() RPC');
          return true;
        }
        if (rpc.data === false) {
          console.info('[Auth._isAdminInDB] is_admin() RPC returned false');
          return false;
        }
      } else if (rpc && rpc.error) {
        console.warn('[Auth._isAdminInDB] is_admin() RPC failed:', rpc.error.message || rpc.error);
        // Fall through to direct queries
      }
    } catch (err) {
      console.warn('[Auth._isAdminInDB] is_admin() RPC threw:', err && err.message);
    }

    // Method 2: query admins.id directly
    try {
      var res = await sb.from('admins').select('id')
        .eq('id', authUserId)
        .limit(1)
        .maybeSingle();
      if (res && res.error) {
        console.warn('[Auth._isAdminInDB] query on admins.id failed:', res.error.message || res.error);
      } else if (res && res.data) {
        console.info('[Auth._isAdminInDB] match found via admins.id');
        return true;
      } else {
        console.info('[Auth._isAdminInDB] no row via admins.id (RLS may be blocking the read)');
      }
    } catch (err) {
      console.warn('[Auth._isAdminInDB] threw on admins.id:', err && err.message);
    }

    // Method 3: query admins.user_id
    try {
      var res2 = await sb.from('admins').select('user_id')
        .eq('user_id', authUserId)
        .limit(1)
        .maybeSingle();
      if (res2 && res2.error) {
        console.warn('[Auth._isAdminInDB] query on admins.user_id failed:', res2.error.message || res2.error);
      } else if (res2 && res2.data) {
        console.info('[Auth._isAdminInDB] match found via admins.user_id');
        return true;
      }
    } catch (err) {
      console.warn('[Auth._isAdminInDB] threw on admins.user_id:', err && err.message);
    }

    console.info('[Auth._isAdminInDB] not an admin (or all queries blocked by RLS)');
    return false;
  }

  /* ------------------------------------------------------------------------
   * Explicit-login lock
   * ------------------------------------------------------------------------
   * When the user clicks "Login", we run signIn + admin check + applySession
   * deliberately. Supabase ALSO fires onAuthStateChange('SIGNED_IN') at the
   * same time, which triggers a parallel admin check. If those two finish
   * out of order, the listener can overwrite our freshly applied session
   * with a stale one. We set this flag during explicit login so the
   * listener defers until the explicit flow is done.
   * ------------------------------------------------------------------------ */
  var _explicitLoginInProgress = false;
  var _verifiedSession = false;
  var _needsAuthRetry = false;
  var _bootstrapPromise = null;
  var _authListenerInstalled = false;

  /**
   * Apply a session to local state. profileData is the JSONB user record.
   * authUser is the supabase auth user (has .id). isAdmin is bool.
   */
  function _applySession(profileData, authUser, isAdmin) {
    var s = App.Store.state();
    if (!profileData || !authUser) {
      s.session = null;
    } else {
      // Admin access MUST be proven by public.admins membership. A stale
      // or malicious users.data.role='admin' must never open the Admin Panel.
      var profileRole = String(profileData.role || 'customer');
      var role = isAdmin ? 'admin'
        : (profileRole === 'staff' || profileRole === 'owner' ? profileRole : 'customer');
      s.session = {
        id:         profileData.id,
        role:       role,
        authUserId: authUser.id
      };
      // Also merge the profile into appState.users so getCurrentSessionUser()
      // can find it. Previously this was the responsibility of
      // SupabaseSync.bootstrap() which fetches the users table — but if
      // bootstrap fails (network/RLS), the admin's own row was missing
      // from local state, breaking notification prefs, red dots, and
      // anything else that reads from appState.users.
      if (!Array.isArray(s.users)) s.users = [];
      var idx = s.users.findIndex(function (u) { return u && u.id === profileData.id; });
      // Mirror the resolved role onto the row (in case profileData has
      // stale role from before is_admin() RPC granted admin).
      var merged = Object.assign({}, profileData, { role: role });
      if (idx >= 0) {
        // Never preserve stale access/notification fields from the previous
        // cached profile when the server has removed them.
        s.users[idx] = merged;
      } else {
        s.users.push(merged);
      }
    }
    _verifiedSession = !!s.session;
    _needsAuthRetry = false;
    App.Store.save();
    return s.session;
  }

  function _clearSession() {
    var s = App.Store.state();
    if (s && s.session && window.AFGRWorkspace && window.AFGRWorkspace.onLoggedOut) {
      try { window.AFGRWorkspace.onLoggedOut(); } catch (e) {}
    }
    _verifiedSession = false;
    _needsAuthRetry = false;
    s.session = null;
    App.Store.save();
  }

  /**
   * Ensure a profile row exists in the users table linked to authUser.
   * If a profile with the same email already exists (legacy data), link it
   * by setting auth_user_id and merging fields. Otherwise insert a fresh one.
   */
  async function _ensureProfile(authUser, draftProfile) {
    var sb = _sb();
    if (!sb || !authUser) return null;

    // 1. Look up by auth_user_id first. If lookup ERRORS (network blip,
    // RLS misfire, etc.), bail rather than fall through to creating a
    // fresh customer — that would orphan an existing staff/admin row
    // and silently demote them to customer.
    var existing = null;
    try {
      existing = await _profileByAuthUserId(authUser.id);
    } catch (lookupErr) {
      if (lookupErr && lookupErr.__lookupFailed) {
        console.warn('[Auth] profile lookup failed — refusing to create fresh row to avoid orphaning.', lookupErr);
        return null;   // caller will keep existing session/handle null
      }
      throw lookupErr;
    }
    if (existing) return existing;

    // 2. Look up by email (legacy account migration OR staff invite)
    //
    // SECURITY MODEL:
    //   When admin pre-stages a staff invite, a row is created in `users`
    //   with role='staff' and id=X (admin-generated id). When the staff
    //   member signs up, their auth account has a different id. They
    //   CANNOT upsert directly into the staff row from their own session
    //   because RLS only allows writes to rows where id = auth.uid().
    //
    //   Instead we call `link_staff_invite(p_email, p_auth_user_id)` —
    //   a Postgres SECURITY DEFINER function that runs with elevated
    //   privileges, finds the pending staff row by email, sets its
    //   auth_user_id, marks it verified, and returns the linked row.
    //
    //   If no matching staff invite exists for this email, the function
    //   returns NULL and we fall through to creating a fresh customer
    //   profile (step 3 below).
    if (draftProfile && draftProfile.email) {
      try {
        var rpcRes = await sb.rpc('link_staff_invite', {
          p_email:        draftProfile.email,
          p_auth_user_id: authUser.id
        });
        if (rpcRes && !rpcRes.error && rpcRes.data) {
          var linked = rpcRes.data;
          // rpcRes.data is whatever JSONB the function returns. We
          // expect the full users.data record.
          var linkedRow = (linked && typeof linked === 'object' && linked.data)
            ? linked.data
            : linked;
          if (linkedRow && linkedRow.id) {
            // Mirror locally
            var live = App.Store.state();
            if (Array.isArray(live.users)) {
              var idx = live.users.findIndex(function (u) {
                return u && u.id === linkedRow.id;
              });
              if (idx >= 0) live.users[idx] = linkedRow; else live.users.push(linkedRow);
              App.Store.save();
            }
            console.info('[Auth] linked to pre-staged staff invite:',
              linkedRow.role, linkedRow.email);
            return linkedRow;
          }
        } else if (rpcRes && rpcRes.error) {
          // Common case: function doesn't exist yet (admin hasn't run
          // the SQL setup). Log warn but DON'T fail — fall through to
          // creating a fresh customer profile.
          console.warn('[Auth] link_staff_invite RPC not available:',
            rpcRes.error.message || rpcRes.error);
        }
      } catch (rpcErr) {
        console.warn('[Auth] link_staff_invite call failed', rpcErr);
      }
    }

    // 3. Create fresh customer profile (default for self-signups with
    //    no pre-staged invite). Use the auth user's UID as the row id
    //    so the row satisfies the standard RLS policy on `users`
    //    (id = auth.uid()). Without this, the upsert fails with
    //    "permission denied for table users" or "new row violates RLS
    //    policy" because the row's id wouldn't match the writer's
    //    auth uid.
    var fresh = Object.assign({
      id:           authUser.id,    // use auth uid as primary id
      role:         'customer',
      verified:     true,
      permissions: [],
      createdAt:    Date.now()
    }, draftProfile || {}, {
      // Re-pin id after spread in case draftProfile carried an id field
      id:           authUser.id,
      auth_user_id: authUser.id,
      authUserId:   authUser.id,
      email:        (draftProfile && draftProfile.email) || authUser.email
    });
    delete fresh.password;
    try {
      var write = await sb.from('users').upsert([{ id: fresh.id, data: fresh }]);
      if (write && write.error) {
        console.warn('[Auth] profile insert rejected', write.error);
        return null;
      }
    } catch (e) {
      console.warn('[Auth] profile insert failed', e);
      return null;
    }
    // Mirror locally
    var live2 = App.Store.state();
    if (!Array.isArray(live2.users)) live2.users = [];
    live2.users.push(fresh);
    App.Store.save();
    return fresh;
  }

  /* ------------------------------------------------------------------------
   * Public API
   * ------------------------------------------------------------------------ */

  /**
   * Synchronous session getter. Returns { id, role, authUserId } or null.
   */
  function session() {
    var s = App.Store.state();
    return (s && s.session) || null;
  }

  /**
   * Synchronous current-user getter. Returns the full profile object or null.
   */
  function currentUser() {
    var sess = session();
    if (!sess || !sess.id) return null;
    return App.Repo.Users.get(sess.id);
  }

  /**
   * Sync helpers.
   */
  function hasRole(role) {
    var sess = session();
    return !!(_verifiedSession && sess && sess.role === role);
  }

  function isAdmin() {
    return hasRole('admin');
  }

  /**
   * Sign up a new customer.
   * @param {{name, email, password, confirm, phone?}} input
   * @returns {Promise<{ok:true, user:Object} | {ok:false, error:string}>}
   */
  async function signup(input) {
    input = input || {};
    var fullName = String(input.name || input.username || '').trim();
    var email    = String(input.email    || '').trim();
    var password = String(input.password || '');
    var confirm  = String(input.confirm  || '');
    var phone    = String(input.phone    || '').trim();

    if (!fullName) {
      return { ok: false, error: 'Please enter your name.' };
    }
    if (!email || !password) {
      return { ok: false, error: 'Please fill all required fields.' };
    }
    if (password !== confirm) {
      return { ok: false, error: 'Passwords do not match.' };
    }
    if (email.indexOf('@') === -1) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }

    if (!_enabled()) {
      return { ok: false, error: 'Authentication service unavailable.' };
    }

    var sb = _sb();
    var authRes;
    try {
      authRes = await sb.auth.signUp({
        email: email,
        password: password,
        options: { data: { name: fullName, displayName: fullName } }
      });
    } catch (err) {
      return { ok: false, error: (err && err.message) || 'Sign-up failed.' };
    }
    if (authRes.error) {
      // Provide friendlier copy for the most common errors
      var msg = authRes.error.message || 'Sign-up failed.';
      if (/already registered/i.test(msg) || /User already/i.test(msg)) {
        msg = 'An account with this email already exists. Please log in.';
      }
      return { ok: false, error: msg };
    }
    if (!authRes.data || !authRes.data.user) {
      return { ok: false, error: 'Sign-up did not return a user. If email confirmation is enabled in Supabase, check your inbox.' };
    }

    // Create / link the profile row
    // Name is a display field, not a globally unique username. Generate the
    // internal username from the authenticated UUID so two guests with the
    // same name can both register under their separate email addresses.
    var profile = await _ensureProfile(authRes.data.user, {
      username:    'customer_' + authRes.data.user.id.replace(/-/g, ''),
      displayName: fullName,
      name:        fullName,
      email:       email,
      phone:       phone,
      role:        'customer'
    });

    // If Supabase has a session attached (email confirmation disabled), apply it
    if (authRes.data.session) {
      var admin = await _isAdminInDB(authRes.data.user.id);
      _applySession(profile, authRes.data.user, admin);
    }
    return { ok: true, user: profile };
  }

  /**
   * Log in. Accepts an email or a username (looked up via users table).
   * @returns {Promise<{ok:true, user:Object} | {ok:false, error:string}>}
   */
  async function login(usernameOrEmail, password) {
    if (!usernameOrEmail || !password) {
      return { ok: false, error: 'Please enter your email and password.' };
    }
    if (!_enabled()) {
      return { ok: false, error: 'Authentication service unavailable.' };
    }
    var sb = _sb();
    var email = String(usernameOrEmail).trim();
    if (email.indexOf('@') === -1) {
      var resolved = await _emailByUsername(email);
      if (!resolved) return { ok: false, error: 'Invalid credentials.' };
      email = resolved;
    }

    _explicitLoginInProgress = true;
    try {
      var res;
      try {
        res = await sb.auth.signInWithPassword({ email: email, password: password });
      } catch (err) {
        return { ok: false, error: 'Invalid credentials.' };
      }
      if (res.error) {
        var em = res.error.message || 'Invalid credentials.';
        if (/email not confirmed/i.test(em)) {
          em = 'Please confirm your email before logging in.';
        } else if (/invalid login credentials/i.test(em)) {
          em = 'Invalid credentials.';
        }
        return { ok: false, error: em };
      }
      var authUser = res.data && res.data.user;
      if (!authUser) return { ok: false, error: 'Login response missing user.' };

      var profile = await _ensureProfile(authUser, {
        email: authUser.email,
        role: 'customer'
      });
      if (!profile || !profile.id) {
        // An authenticated identity without a readable/writable profile must
        // not be mistaken for a working staff or customer session.
        _verifiedSession = false;
        return { ok: false, error: 'Unable to load your account profile. Check your connection or contact the administrator.' };
      }
      var admin = await _isAdminInDB(authUser.id);
      var sess = _applySession(profile, authUser, admin);
      console.info('[Auth] login complete', {
        authUserId: authUser.id,
        isAdmin: admin,
        role: sess && sess.role
      });
      return { ok: true, user: Object.assign({}, profile, { role: sess.role }) };
    } finally {
      // Release the lock on the next tick so any in-flight onAuthStateChange
      // handler can see it as still set.
      setTimeout(function () { _explicitLoginInProgress = false; }, 0);
    }
  }

  /**
   * Sign out and clear local session.
   */
  async function logout() {
    if (_enabled()) {
      try { await _sb().auth.signOut(); } catch (err) { console.warn('[Auth] signOut error', err); }
    }
    _clearSession();
  }

  /**
   * Bootstrap on page load: read current Supabase Auth session, populate the
   * local cache. Returns a Promise that resolves once the cache is ready.
   */
  function isVerified() { return _verifiedSession; }
  function isVerificationRetryNeeded() { return _needsAuthRetry; }
  function isTemporaryAuthError(error) {
    if (!error) return false;
    var message = String(error.message || error.name || '');
    return /failed to fetch|network|fetcherror|load failed|timeout|timed out|abort|unavailable|connection|retryable/i.test(message)
      || error.name === 'AuthRetryableFetchError';
  }
  function markVerificationUnavailable(error) {
    // Fail closed (no privileged panel) but keep the Supabase refresh token
    // and On Duty choice on a temporary network outage.
    _verifiedSession = false;
    _needsAuthRetry = true;
    _bootstrapPromise = null;
    console.warn('[Auth] cannot verify session; will retry when online', error);
  }

  // One boot attempt per app startup. Use a server-verified auth user, not a
  // mutable localStorage profile, before restoring privileged workspaces.
  function bootstrap() {
    if (_bootstrapPromise) return _bootstrapPromise;
    _bootstrapPromise = (async function () {
      if (!_enabled()) { _clearSession(); return null; }
      var sb = _sb();
      try {
        var response = await sb.auth.getUser();
        var authUser = response && response.data && response.data.user;
        if (response && response.error && isTemporaryAuthError(response.error)) {
          markVerificationUnavailable(response.error);
        } else if (!authUser || (response && response.error)) {
          _clearSession();
        } else {
          var profile = await _ensureProfile(authUser, { email: authUser.email });
          if (!profile || !profile.id) {
            markVerificationUnavailable(new Error('Account profile lookup unavailable'));
            return null;
          }
          var admin = await _isAdminInDB(authUser.id);
          _applySession(profile, authUser, admin);
        }
      } catch (error) {
        // A temporary network problem must not grant a stale cached role.
        // Keep auth tokens intact so the browser can retry on a later visit.
        markVerificationUnavailable(error);
      }
      if (!_authListenerInstalled) {
        _authListenerInstalled = true;
        sb.auth.onAuthStateChange(function (event, newSession) {
          if (event === 'PASSWORD_RECOVERY') {
            setTimeout(function () {
              if (typeof window.openSetNewPasswordModal === 'function') window.openSetNewPasswordModal();
            }, 50);
            return;
          }
          if (event === 'SIGNED_OUT') { _clearSession(); return; }
          if (event !== 'SIGNED_IN' && event !== 'TOKEN_REFRESHED' && event !== 'USER_UPDATED') return;
          if (_explicitLoginInProgress || !newSession || !newSession.user) return;
          // Don't hold the auth client's state-change callback while making
          // another Auth/network request; refresh asynchronously after it returns.
          setTimeout(function () {
            (async function () {
              try {
                var checked = await sb.auth.getUser();
                var user = checked && checked.data && checked.data.user;
                if (!user || checked.error) { _verifiedSession = false; return; }
                var profile = await _ensureProfile(user, { email: user.email });
                if (!profile || !profile.id) { _verifiedSession = false; return; }
                var isAdmin = await _isAdminInDB(user.id);
                _applySession(profile, user, isAdmin);
              } catch (err) {
                _verifiedSession = false;
                console.warn('[Auth] session refresh could not be verified', err);
              }
            })();
          }, 0);
        });
      }
      return session();
    })();
    return _bootstrapPromise;
  }

  /**
   * Trigger a password reset email via Supabase Auth.
   * Replaces the legacy in-app OTP flow.
   */
  async function requestPasswordReset(email, redirectTo) {
    if (!_enabled()) return { ok: false, error: 'Authentication service unavailable.' };
    if (!email || email.indexOf('@') === -1) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    var sb = _sb();
    try {
      // redirectTo is the URL Supabase puts in the reset email's "Reset
      // Password" link. When user clicks it, they land here with a
      // recovery token in the URL hash. The frontend listens for the
      // PASSWORD_RECOVERY auth event and opens the new-password modal.
      var opts = {};
      if (redirectTo) opts.redirectTo = redirectTo;
      var res = await sb.auth.resetPasswordForEmail(email, opts);
      if (res.error) return { ok: false, error: res.error.message };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err && err.message) || 'Reset request failed.' };
    }
  }

  /**
   * Explicit re-check of admin status against the database. Useful if the
   * cached session role drifts out of sync (e.g. you just promoted yourself
   * via SQL while the page was open). Returns the new role string.
   */
  async function recheckAdmin() {
    if (!_enabled()) return null;
    var sb = _sb();
    var res = await sb.auth.getSession();
    var authUser = res && res.data && res.data.session && res.data.session.user;
    if (!authUser) {
      _clearSession();
      return null;
    }
    var profile = await _ensureProfile(authUser, { email: authUser.email });
    var admin = await _isAdminInDB(authUser.id);
    var sess = _applySession(profile, authUser, admin);
    console.info('[Auth] recheckAdmin', {
      authUserId: authUser.id,
      isAdmin: admin,
      role: sess && sess.role
    });
    return sess && sess.role;
  }

  /**
   * Async admin probe (queries the database directly, ignoring cache).
   * Returns boolean.
   */
  async function isAdminAsync() {
    if (!_enabled()) return false;
    var sb = _sb();
    var res = await sb.auth.getSession();
    var authUser = res && res.data && res.data.session && res.data.session.user;
    if (!authUser) return false;
    return await _isAdminInDB(authUser.id);
  }

  App.Services.Auth = {
    // Sync (cache reads)
    session:     session,
    currentUser: currentUser,
    hasRole:     hasRole,
    isAdmin:     isAdmin,
    isVerified:  isVerified,
    isVerificationRetryNeeded: isVerificationRetryNeeded,

    // Async (Supabase Auth)
    signup:                signup,
    login:                 login,
    logout:                logout,
    bootstrap:             bootstrap,
    requestPasswordReset:  requestPasswordReset,

    // Async diagnostics / recovery
    isAdminAsync:          isAdminAsync,
    recheckAdmin:          recheckAdmin,
    _isAdminInDB:          _isAdminInDB    // exposed for direct testing
  };
})();
