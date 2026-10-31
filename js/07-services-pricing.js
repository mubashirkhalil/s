/* ==========================================================================
 * App.Services.Pricing
 * --------------------------------------------------------------------------
 * Pricing math for carts and orders. This phase delegates to the legacy
 * getCartPricingBreakdown function rather than reimplementing it, so
 * pricing logic remains a single source of truth. When the legacy file is
 * fully extracted, this service will own the math directly.
 * ========================================================================== */
(function () {
  'use strict';

  if (!App.Services) App.Services = {};

  /**
   * Compute the full pricing breakdown for a cart.
   * @param {Array} cartItems - line items: [{id, variationId, qty, lineKey}, ...]
   * @returns {Object} { items, subtotal, totalDiscount, deliveryFee,
   *                     serviceCharge, tax, total }
   */
  function forCart(cartItems) {
    if (typeof window.getCartPricingBreakdown === 'function') {
      return window.getCartPricingBreakdown(cartItems);
    }
    // Fallback if legacy fn is unavailable: return a zero-breakdown with same shape
    return {
      items: [],
      subtotal: 0,
      totalDiscount: 0,
      deliveryFee: 0,
      serviceCharge: 0,
      tax: 0,
      total: 0
    };
  }

  /**
   * Format a number with the configured currency symbol.
   * Convenience wrapper.
   */
  function format(value) {
    return App.Util.formatCurrency(value);
  }

  /**
   * Read pricing-related config (deliveryFee, taxRate, discount fields).
   */
  function config() {
    var cfg = App.Repo.Config.get();
    return {
      deliveryFee:       Number(cfg.deliveryFee || 0),
      taxRate:           Number(cfg.taxRate || 0),
      discount:          Number(cfg.discount || 0),
      discountThreshold: Number(cfg.discountThreshold || 0),
      serviceCharge:     Number(cfg.serviceCharge || 0)
    };
  }

  App.Services.Pricing = {
    forCart: forCart,
    format:  format,
    config:  config
  };
})();
