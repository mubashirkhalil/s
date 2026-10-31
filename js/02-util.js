/* ==========================================================================
 * App.Util
 * --------------------------------------------------------------------------
 * Pure helpers extracted from the monolith. None of these touch appState,
 * the DOM, or any I/O. They are safe to call from any layer.
 *
 * Functions extracted from the original file:
 *   - generateId          (was line 12045)
 *   - generateOrderId     (was line 12304)
 *   - generateOtp         (was line 12078)
 *   - escapeHtml          (was line 13014)
 *   - formatCurrency      (was line 14470)
 *   - isOfferActive       (was line 14474)
 *
 * The legacy compat layer (05-legacy-compat.js) re-exposes these as the
 * same global function names the rest of the codebase already calls, so
 * no consumer needs to change.
 * ========================================================================== */
(function () {
  'use strict';

  /**
   * Generate a unique identifier for new items. Behaviour is identical to
   * the original implementation: timestamp in base36 plus 5 random base36
   * characters.
   */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  /**
   * Generate a unique order identifier in the format AFGR####.
   *
   * The legacy version closed over the global appState.orders. To keep this
   * pure, the existing orders array is passed in. The legacy compat shim
   * wires that up automatically so callers using the old global name
   * continue to work without changes.
   *
   * @param {Array<Object>} existingOrders Optional array of orders to
   *                                       collision-check against.
   */
  function generateOrderId(existingOrders) {
    var prefix = App.Config.ORDER_ID_PREFIX;
    var digits = App.Config.ORDER_ID_DIGITS;
    var max = Math.pow(10, digits);

    function makeCode() {
      var num = Math.floor(Math.random() * max).toString().padStart(digits, '0');
      return prefix + num;
    }

    if (!Array.isArray(existingOrders)) {
      return makeCode();
    }
    var id;
    do {
      id = makeCode();
    } while (existingOrders.some(function (o) { return o && o.id === id; }));
    return id;
  }

  /**
   * Generate a cryptographically secure 6-digit numeric OTP.
   * Falls back to Math.random if window.crypto is unavailable.
   */
  function generateOtp() {
    var length = App.Config.OTP_LENGTH;
    var arr = new Uint32Array(1);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(arr);
    } else {
      arr[0] = Math.floor(Math.random() * Math.pow(10, length));
    }
    var padded = '000000' + arr[0];
    return padded.slice(-length).slice(0, length);
  }

  /**
   * HTML-escape a value for safe insertion into innerHTML strings.
   * Preserves the exact same character mapping the original used.
   */
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Format a numeric value as the configured currency.
   * Output format: "AED 12.34"
   */
  function formatCurrency(value) {
    return App.Config.CURRENCY_SYMBOL + ' ' + Number(value || 0).toFixed(2);
  }

  /**
   * Determine whether an offer is currently active.
   * Pure: depends only on the offer object and the timestamp passed in.
   */
  function isOfferActive(offer, now) {
    if (!offer || !offer.enabled) return false;
    if (typeof now !== 'number') now = Date.now();
    var startsOk = !offer.start || offer.start <= now;
    var endsOk = !offer.end || offer.end >= now;
    return startsOk && endsOk;
  }

  App.Util = {
    generateId: generateId,
    generateOrderId: generateOrderId,
    generateOtp: generateOtp,
    escapeHtml: escapeHtml,
    formatCurrency: formatCurrency,
    isOfferActive: isOfferActive
  };
})();
