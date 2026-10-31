/* ==========================================================================
 * App.Services.Order
 * --------------------------------------------------------------------------
 * Order management. Now owns the full place() flow that was previously
 * inline in the checkoutForm submit handler.
 *
 * place(input) handles: cart validation, input validation, pricing math,
 * order construction, menu/offer counter updates, persistence, realtime
 * publish, and cart clearing. The handler that calls it is now ~20 lines
 * of pure UI work (alerts, modal close, dashboard refresh).
 * ========================================================================== */
(function () {
  'use strict';

  if (!App.Services) App.Services = {};

  function _publish(section, entry) {
    if (typeof window.publishRealtimePayload === 'function') {
      try { window.publishRealtimePayload(section, entry); } catch (e) { /* ignore */ }
    }
  }

  function list()         { return App.Repo.Orders.list(); }
  function get(id)        { return App.Repo.Orders.get(id); }
  function byUser(userId) { return App.Repo.Orders.findByUserId(userId); }

  /**
   * Place a new order. Accepts customer-supplied fields and reads the
   * current cart + config + session to build the full order. Mirrors the
   * exact logic of the original checkoutForm submit handler.
   *
   * @param {{name, phone, address, notes?}} input
   * @returns {{ok: true, order: Object} | {ok: false, error: 'CART_EMPTY'|'MISSING_FIELDS'}}
   */
  function place(input) {
    input = input || {};

    // 1. Validate cart not empty
    var cartItems = App.Services.Cart.items();
    if (cartItems.length === 0) {
      return { ok: false, error: 'CART_EMPTY' };
    }

    // 2. Validate required input fields
    var name    = String(input.name    || '').trim();
    var phone   = String(input.phone   || '').trim();
    var address = String(input.address || '').trim();
    var notes   = String(input.notes   || '').trim();
    if (!name || !phone || !address) {
      return { ok: false, error: 'MISSING_FIELDS' };
    }

    // 3. Compute pricing (delegates to legacy getCartPricingBreakdown)
    var pricingBreakdown = App.Services.Pricing.forCart(cartItems);
    var subtotal = pricingBreakdown.subtotal;
    var discount = pricingBreakdown.totalDiscount;

    var cfg = App.Repo.Config.get() || {};
    var deliveryFee   = parseFloat(cfg.deliveryFee || 0) || 0;
    var taxRate       = parseFloat(cfg.taxRate || 0) || 0;
    var serviceCharge = parseFloat(cfg.serviceCharge || cfg.serviceCharges || cfg.serviceFee || 0) || 0;
    var taxableAmount = Math.max(0, subtotal - discount + deliveryFee + serviceCharge);
    var tax   = taxableAmount * taxRate;
    var total = taxableAmount + tax;

    // 4. Snapshot cart lines
    var orderItems = cartItems.map(function (ci) {
      return (typeof window.createOrderItemSnapshot === 'function')
        ? window.createOrderItemSnapshot(ci)
        : null;
    }).filter(Boolean);

    // 5. Build order object
    var session = App.Services.Auth.session();
    var userId      = (session && session.role === 'customer') ? session.id         : null;
    // authUserId is the Supabase auth.uid(). RLS on the orders table
    // requires this match auth.uid() for non-admin inserts. Without it,
    // the production INSERT policy rejects the row and the order never
    // reaches Supabase.
    var authUserId  = (session && session.authUserId) || null;
    var placedAt = Date.now();

    var order = {
      id:              App.Util.generateOrderId(App.Repo.Orders.list()),
      items:           orderItems,
      subtotal:        subtotal,
      discount:        discount,
      discountDetails: pricingBreakdown.items,
      deliveryFee:     deliveryFee,
      serviceCharge:   serviceCharge,
      serviceCharges:  serviceCharge,
      serviceFee:      serviceCharge,
      tax:             tax,
      total:           total,
      notes:           notes,
      customer:        { name: name, phone: phone, address: address },
      paymentMethod:   'cod',
      paymentDetails:  {},
      userId:          userId,
      authUserId:      authUserId,
      date:            placedAt,
      status:          'Pending',
      timeline:        { placedAt: placedAt },
      statusHistory:   [{ status: 'Pending', time: placedAt }],
      deliveryMetrics: {}
    };

    // 6. Update menu item ordered counters (analytics).
    //
    // ONLY run these in-place mutations when the current user is an admin.
    // Otherwise the diff engine catches the mutation and tries to publish
    // it to Supabase, which fails RLS (anon doesn't have UPDATE on
    // menu_items or offers) and surfaces a false "sync failed" banner on
    // every customer order. The counter increments are admin-side analytics
    // that don't need to update from customer sessions.
    var isAdminUser = false;
    try {
      var sess = App.Services && App.Services.Auth && App.Services.Auth.session && App.Services.Auth.session();
      isAdminUser = sess && sess.role === 'admin';
    } catch (e) { /* default false */ }

    var live = App.Store.state();
    if (isAdminUser && live && Array.isArray(live.menuItems)) {
      order.items.forEach(function (entry) {
        var mi = live.menuItems.find(function (m) { return m && m.id === entry.id; });
        if (mi) {
          mi.orderedCount = Number(mi.orderedCount || 0) + Number(entry.qty || 0);
        }
      });
    }

    // 7. Update offer performance counters (admin-side analytics)
    if (isAdminUser && Number(order.discount || 0) > 0 && live && Array.isArray(live.offers)) {
      live.offers.forEach(function (offer) {
        offer.performance = offer.performance || { orders: 0, revenue: 0, discountValue: 0 };
        offer.performance.orders        += 1;
        offer.performance.revenue       += Number(order.total || 0);
        offer.performance.discountValue += Number(order.discount || 0);
      });
    }

    // 8. Persist (Repo.Orders.create auto-saves and queues a sync upsert)
    App.Repo.Orders.create(order);
    // Force-flush the sync queue so any RLS / schema error appears in the
    // console within ~50ms instead of hiding behind the 250ms debounce.
    if (App.SupabaseSync && App.SupabaseSync._flush) {
      setTimeout(function () { App.SupabaseSync._flush(); }, 0);
    }

    // 9. Realtime publish
    _publish('orders', order);

    // 10. Clear cart (also refreshes cart UI)
    App.Services.Cart.clear();

    return { ok: true, order: order };
  }

  /**
   * Update order status. Appends to statusHistory, sets status, persists,
   * publishes realtime event.
   */
  function updateStatus(orderId, newStatus) {
    var order = App.Repo.Orders.get(orderId);
    if (!order) return null;
    if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
    order.statusHistory.push({ status: newStatus, time: Date.now() });
    order.status = newStatus;
    App.Repo.Orders.update(orderId, {
      status:        newStatus,
      statusHistory: order.statusHistory
    });
    _publish('orders', order);
    return order;
  }

  function revenueTotal() {
    return list().reduce(function (sum, o) { return sum + (Number(o && o.total) || 0); }, 0);
  }

  App.Services.Order = {
    list:         list,
    get:          get,
    byUser:       byUser,
    place:        place,
    updateStatus: updateStatus,
    revenueTotal: revenueTotal
  };
})();
