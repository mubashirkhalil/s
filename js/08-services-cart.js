/* ==========================================================================
 * App.Services.Cart
 * --------------------------------------------------------------------------
 * Cart operations. Owns the canonical implementation of add and adjustQty.
 * Legacy addToCart() and changeCartQty() are now thin wrappers around this.
 *
 * The cart array itself remains as window.cart so any other consumer that
 * reads from it directly continues to work. Both this service and the
 * legacy wrappers mutate the same underlying array.
 *
 * UI refresh: the service calls window.updateCartUI() when present. The UI
 * function still lives in the legacy file because it depends on many other
 * legacy helpers (getResolvedCartLine, getCartPricingBreakdown, etc.). It
 * will move to App.UI.Cart in a later phase.
 * ========================================================================== */
(function () {
  'use strict';

  if (!App.Services) App.Services = {};

  function _cart() {
    if (!Array.isArray(window.cart)) window.cart = [];
    return window.cart;
  }

  function _refreshUI() {
    if (typeof window.updateCartUI === 'function') {
      try { window.updateCartUI(); } catch (e) { /* ignore */ }
    }
  }

  function items()  { return _cart().slice(); }
  function count()  { return _cart().reduce(function (n, l) { return n + (Number(l && l.qty) || 0); }, 0); }
  function isEmpty() { return _cart().length === 0; }

  /**
   * Add an item to the cart. If the same {itemId, variationId} pair already
   * exists, increments qty.
   */
  function add(itemId, variationId) {
    var item = App.Repo.Menu.get(itemId);
    if (!item) return;
    // Block disabled items at the service level too — defense in
    // depth in case the UI somehow lets a disabled add through.
    if (item.enabled === false) {
      console.info('[Cart.add] blocked — item is disabled:', itemId);
      return;
    }
    var resolvedVariation = (typeof window.getResolvedVariation === 'function')
      ? window.getResolvedVariation(item, variationId || '')
      : null;
    var finalVariationId = resolvedVariation ? resolvedVariation.id : '';
    var existing = _cart().find(function (c) {
      return c && c.id === itemId && (c.variationId || '') === finalVariationId;
    });
    if (existing) {
      existing.qty = (Number(existing.qty) || 0) + 1;
    } else {
      _cart().push({ id: itemId, variationId: finalVariationId, qty: 1 });
    }
    _refreshUI();
  }

  /**
   * Adjust the quantity of a cart line by delta. Removes the line if qty
   * drops to 0 or below. Used by + / - buttons. Also: if increasing
   * quantity for an item that's now disabled, refuse.
   */
  function adjustQty(itemId, variationId, delta) {
    var line = _cart().find(function (c) {
      return c && c.id === itemId && (c.variationId || '') === (variationId || '');
    });
    if (!line) return;
    // Block qty INCREASE for disabled items. Decreasing is always
    // allowed (lets customer remove a now-disabled item from cart).
    if (Number(delta || 0) > 0) {
      var item = App.Repo.Menu.get(itemId);
      if (item && item.enabled === false) {
        console.info('[Cart.adjustQty] increase blocked — item is disabled:', itemId);
        return;
      }
    }
    line.qty = (Number(line.qty) || 0) + Number(delta || 0);
    if (line.qty <= 0) {
      var idx = _cart().indexOf(line);
      if (idx !== -1) _cart().splice(idx, 1);
    }
    _refreshUI();
  }

  /**
   * Set the quantity for a specific line by lineKey. qty <= 0 removes line.
   */
  function setQty(lineKey, qty) {
    var arr = _cart();
    var i = arr.findIndex(function (l) { return l && l.lineKey === lineKey; });
    if (i === -1) return;
    if (qty <= 0) arr.splice(i, 1);
    else arr[i].qty = qty;
    _refreshUI();
  }

  function remove(lineKey) {
    setQty(lineKey, 0);
  }

  function clear() {
    if (Array.isArray(window.cart)) window.cart.length = 0;
    _refreshUI();
  }

  /**
   * Compute the pricing breakdown for the current cart.
   */
  function pricing() {
    return App.Services.Pricing.forCart(_cart());
  }

  App.Services.Cart = {
    items:     items,
    count:     count,
    isEmpty:   isEmpty,
    add:       add,
    adjustQty: adjustQty,
    setQty:    setQty,
    remove:    remove,
    clear:     clear,
    pricing:   pricing
  };
})();
