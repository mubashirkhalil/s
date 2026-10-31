/* ==========================================================================
 * App.Services.Reservation
 * --------------------------------------------------------------------------
 * Reservation creation and management. Wraps Repo.Reservations with
 * domain-specific helpers and realtime publishing.
 * ========================================================================== */
(function () {
  'use strict';

  if (!App.Services) App.Services = {};

  function _publish(section, entry) {
    if (typeof window.publishRealtimePayload === 'function') {
      try { window.publishRealtimePayload(section, entry); } catch (e) { /* ignore */ }
    }
  }

  /**
   * Create a reservation. Validates required fields and produces a
   * normalized record with id, status='Pending', and date timestamp.
   *
   * Local cache is updated synchronously (so the UI feels instant).
   * The cloud upsert happens in the background; failures are logged but
   * do not block the UI.
   *
   * @param {{name, phone, email, date, time, guests, datetime?}} input
   * @returns {{ok: true, reservation: Object} | {ok: false, error: string}}
   */
  function create(input) {
    input = input || {};
    var name  = String(input.name  || '').trim();
    var phone = String(input.phone || '').trim();
    var email = String(input.email || '').trim();
    var date  = String(input.date  || '').trim();
    var time  = String(input.time  || '').trim();
    var guests = Number(input.guests || 0);

    if (!name || !phone || !date || !time || !guests) {
      return { ok: false, error: 'Please fill all reservation fields.' };
    }

    var datetime = input.datetime || (date + 'T' + time);

    var reservation = {
      id:       App.Util.generateId(),
      userId:   String(input.userId || ''),
      name:     name,
      phone:    phone,
      email:    email,
      datetime: datetime,
      guests:   guests,
      status:   'Pending',
      date:     Date.now()
    };

    // Local write (sync) - UI feels instant.
    // Repo.Reservations.create internally calls App.Store.save() and
    // App.SupabaseSync.publishCreate('reservations', reservation), which
    // queues a 250ms-debounced INSERT to Supabase. We force-flush so any
    // RLS/schema errors surface in the console within ~50ms instead of
    // hiding behind the debounce window.
    App.Repo.Reservations.create(reservation);
    _publish('reservations', reservation);
    if (App.SupabaseSync && App.SupabaseSync._flush) {
      setTimeout(function () { App.SupabaseSync._flush(); }, 0);
    }

    return { ok: true, reservation: reservation };
  }

  /**
   * Approve a reservation by id.
   */
  function approve(id) {
    var updated = App.Repo.Reservations.update(id, { status: 'Approved' });
    if (updated) _publish('reservations', updated);
    return updated;
  }

  /**
   * Reject a reservation by id.
   */
  function reject(id) {
    var updated = App.Repo.Reservations.update(id, { status: 'Rejected' });
    if (updated) _publish('reservations', updated);
    return updated;
  }

  /**
   * List all reservations (defensive copy).
   */
  function list() {
    return App.Repo.Reservations.list();
  }

  App.Services.Reservation = {
    create:  create,
    approve: approve,
    reject:  reject,
    list:    list
  };
})();
