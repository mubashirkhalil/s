/* ==========================================================================
 * App.Store
 * --------------------------------------------------------------------------
 * State management + localStorage persistence.
 *
 * This file relocates the original loadData/saveData functions and the
 * default-state schema. The behaviour is preserved EXACTLY: every
 * normalization shim, every default field, every fallback path is kept.
 *
 * Key design points
 * -----------------
 *  - The legacy code uses a global `var appState` that is read and mutated
 *    in many places, and reassigned once (in syncStateFromStorage). To
 *    avoid breaking any of that, this module declares `appState` as a true
 *    global via window.appState. Both old and new code see the same value.
 *
 *  - App.Store.load()  : read localStorage, normalize, return state object
 *  - App.Store.save()  : persist current global appState (gallery image
 *                        data is stripped before serialisation)
 *  - App.Store.init()  : run load() and assign to window.appState; called
 *                        once at boot. Returns the state.
 *  - App.Store.replace(s) : set appState = s and persist. Used internally
 *                        by syncStateFromStorage (via legacy compat).
 *
 *  - DEFAULT_HERO_IMAGE is a multi-line base64 string used by the default
 *    schema. It is private to this module.
 *
 * The legacy compat layer (05-legacy-compat.js) re-exposes `loadData` and
 * `saveData` as global function names so the unrefactored portion of the
 * codebase keeps working without modification.
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
   * DEFAULT_HERO_IMAGE
   * ------------------------------------------------------------------------
   * Base64-encoded JPEG used as the fallback image for hero slides when
   * the admin has not uploaded their own. Identical bytes to the original.
   * ------------------------------------------------------------------------ */
  const DEFAULT_HERO_IMAGE = 'data:image/jpeg;base64,' +
    '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';

  /* ------------------------------------------------------------------------
   * _buildDefaults()
   * ------------------------------------------------------------------------
   * Returns a fresh default state object, used when localStorage is empty
   * (first ever page load) or unreadable. Identical structure to the
   * original `defaults` object literal.
   * ------------------------------------------------------------------------ */
  function _buildDefaults() {
    var generateId = App.Util.generateId;
    var defaults = {
      config: {
        restaurantName: 'Al Fursan Grills & Restaurant',
        // Taglines for the hero section.  Use mainTagline for the large heading and subTagline for the supporting text.
        mainTagline: 'Authentic Arabic Cuisine',
        subTagline: 'Experience the taste of tradition',
        // Default font and size for the main tagline (Arabic heading).  Admins can customise these in the settings panel.
        mainTaglineFont: 'Cairo',
        // Use a numeric value (in pixels) for the font size to allow easy parsing and range control.  Default to 32px.
        mainTaglineFontSize: 32,
        // Provide a customisable text for the thin strip at the very top of the website.
        // Administrators can modify this in the settings section to display contact info or promotions.
        topBarText: 'Call us: +971 566 583 054 • Monday – Sunday, 8:00AM – 9:00PM',
        // Note shown above the delivery address field on the checkout page.
        // Admins can edit this in Settings → Order Address Note to communicate
        // service areas, delivery limits, or instructions.
        addressNote: '',
        notifications: {
      soundEnabled: true,
      pushEnabled: true,
      toneUrl: ''
        },
        developerContact: '+971 566 583 054',
        developerInfo: {
      name: '',
      profileImage: '',
      intro: '',
      email: '',
      phone: '+971 566 583 054',
      links: {}
        },
        // Pricing configuration used during checkout.  These values can be customised later in the code or by the admin.
        // Delivery fee is a fixed cost applied to every order (in AED).
        deliveryFee: 5,
        // Tax rate applied to (subtotal - discount + deliveryFee) to compute tax.  Represented as a decimal (e.g. 0.05 for 5%).
        taxRate: 0.05,
        // Default discount rate (percentage expressed as a decimal) applied to the subtotal.  If promotions exist this may be overridden.
        discountRate: 0,
        // Minimum subtotal (in AED) required before the default discount rate is applied.  If the subtotal is below this value, the global discount will not apply.
        discountThreshold: 0,
        // aboutTitle/aboutContent removed – no longer used
        contact: {
      phone: '+971 566 583 054',
      email: 'info@alfursan.com',
      address: 'Downtown Dubai',
      openHours: 'Monday – Sunday, 8:00AM – 9:00PM',
      whatsapp: '+971 566 583 054',
      map: 'https://www.google.com/maps',
      // Provide sensible default social links so the icons show up on the contact page.
      // These can be changed by the administrator in the site settings panel.
      socials: {
        facebook: 'https://facebook.com/alfursan',
        instagram: 'https://instagram.com/alfursan',
        tiktok: 'https://www.tiktok.com/@alfursan'
      }
        },
        themeColors: {
      primary: '#b58a5b',
      secondary: '#151515',
      accent: '#d4b17e',
      bg: '#0e0d0b',
      text: '#f5f5f5'
        },
        fonts: {
      // Body and heading fonts used throughout the site.  These are
      // CSS font-family strings so that fallback fonts can be provided.
      body: "'Poppins', sans-serif",
      heading: "'Great Vibes', cursive"
        },
        // Configuration for the hero background.  When type is 'slides' the
        // standard hero slider is shown.  When type is 'image' or 'video'
        // the specified URL will be used as the background.  Admins can
        // modify this in the settings panel.
        heroBackground: {
      type: 'slides',
      url: ''
        },
        heroBackgroundMedia: {
      desktop: {
        image: '',
        video: ''
      },
      tablet: {
        image: '',
        video: ''
      },
      mobile: {
        image: '',
        video: ''
      }
        },
        announcementPopup: {
      enabled: false,
      media: {
        desktop: {
          image: '',
          video: ''
        },
        tablet: {
          image: '',
          video: ''
        },
        mobile: {
          image: '',
          video: ''
        }
      },
      schedule: {
        startsAt: '',
        endsAt: ''
      },
      rotation: [],
      cta: {
        label: '',
        url: ''
      }
        },
        heroSlides: [
      {
        id: generateId(),
        heading: 'Best Grill & Restaurant',
        tagline: 'Indulge in mouth‑watering flavours',
        image: DEFAULT_HERO_IMAGE, // default background image
        enabled: true
      },
      {
        id: generateId(),
        heading: 'Authentic Arabic Cuisine',
        tagline: 'A taste of tradition and luxury',
        image: DEFAULT_HERO_IMAGE,
        enabled: true
      },
      {
        id: generateId(),
        heading: 'Delicious Arabic Specialties',
        tagline: 'Savour the aroma of heritage',
        image: DEFAULT_HERO_IMAGE,
        enabled: true
      }
        ],
        navItems: [
      { id: 'home', label: 'Home', link: '#' },
      { id: 'menu', label: 'Menu', link: '#menu' },
      { id: 'reservation', label: 'Reservation', link: '#reservation' },
      // place offers before gallery as requested
      { id: 'offers', label: 'Offers', link: '#offers' },
      { id: 'gallery', label: 'Gallery', link: '#gallery' },
      { id: 'testimonials', label: 'Reviews', link: '#testimonials' },
      { id: 'contact', label: 'Contact', link: '#contact' },
      // Link for order tracking.  Clicking this opens a modal rather than scrolling.
      { id: 'tracking', label: 'Track Order', link: '#tracking' }
        ],
        showSections: {
      menu: true,
      reservation: true,
      offers: true,
      gallery: true,
      testimonials: true,
      contact: true,
      tracking: true
        }
      },
      categories: [
        { id: generateId(), name: 'Grill' },
        { id: generateId(), name: 'Seafood' },
        { id: generateId(), name: 'Dessert' },
        { id: generateId(), name: 'Drinks' }
      ],
      menuItems: [
        {
      id: generateId(),
      category: 0,
      name: 'Mixed Grill Platter',
      description:
        'A sumptuous selection of grilled meats marinated with our signature spices.',
      price: 22.5,
      image: '',
      enabled: true,
      viewedCount: 0,
      orderedCount: 0
        },
        {
      id: generateId(),
      category: 1,
      name: 'Seafood Mix Grill',
      description:
        'Assorted grilled seafood delights including prawns, fish and calamari.',
      price: 25.0,
      image: '',
      enabled: true,
      viewedCount: 0,
      orderedCount: 0
        },
        {
      id: generateId(),
      category: 2,
      name: 'Kunafa',
      description:
        'Sweet cheese pastry dessert drizzled with rose water and pistachios.',
      price: 8.5,
      image: '',
      enabled: true,
      viewedCount: 0,
      orderedCount: 0
        },
        {
      id: generateId(),
      category: 3,
      name: 'Arabic Coffee',
      description:
        'Traditional Arabic coffee infused with cardamom and served with dates.',
      price: 4.0,
      image: '',
      enabled: true,
      viewedCount: 0,
      orderedCount: 0
        }
      ],
      offers: [],    // Empty by default; admins add offers via the admin panel
      gallery: [],
      reviews: [],   // Empty by default; admins add reviews via the admin panel,
      orders: [],
      reservations: [],
      requests: [],
      users: [
        {
      id: generateId(),
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      displayName: 'Administrator',
      email: '',
      phone: '',
      verified: true,
      permissions: [],
      sectionsAccess: ['dashboard', 'orders', 'reservations', 'requests', 'products', 'gallery', 'settings', 'notifications'],
      notificationPrefs: {
        soundEnabled: true,
        sectionSeenAt: { orders: 0, reservations: 0, requests: 0 },
        sections: { orders: true, reservations: true, requests: true }
      },
      createdAt: Date.now()
        }
        // staff users will be added by admin
      ],
      session: null,
      // Initialize empty OTP records array for password reset workflow
      otpRecords: []
    };
    return defaults;
  }

  /* ------------------------------------------------------------------------
   * _normalize(parsed)
   * ------------------------------------------------------------------------
   * Apply migration shims to a parsed state object. This is the body of
   * the original loadData() function from "if (parsed && parsed.config)"
   * down to "return parsed;" (minus the JSON.parse and try/catch wrapping).
   * ------------------------------------------------------------------------ */
  function _normalize(parsed) {
    // Ensure newly introduced configuration fields exist when loading older data
    if (parsed && parsed.config) {
      const cfg = parsed.config;
      if (cfg.deliveryFee === undefined) cfg.deliveryFee = 5;
      if (cfg.taxRate === undefined) cfg.taxRate = 0.05;
      if (cfg.discountRate === undefined) cfg.discountRate = 0;
      // Ensure the discountThreshold field exists on older datasets.  This represents the minimum subtotal
      // before the default discount rate applies.  If undefined then assume zero (no threshold).
      if (cfg.discountThreshold === undefined) cfg.discountThreshold = 0;
      // Ensure the topBarText field exists so that older saved data still displays something in the top bar.
      if (cfg.topBarText === undefined) {
        const phone = cfg.contact && cfg.contact.phone ? cfg.contact.phone : '';
        const hours = cfg.contact && cfg.contact.openHours ? cfg.contact.openHours : '';
        cfg.topBarText = phone ? phone + ' • ' + hours : hours;
      }
      // Ensure addressNote field exists for older saved configs
      if (cfg.addressNote === undefined) cfg.addressNote = '';
      if (!cfg.developerInfo || typeof cfg.developerInfo !== 'object') {
        cfg.developerInfo = {
          name: '',
          profileImage: '',
          intro: '',
          email: '',
          phone: cfg.developerContact || '',
          links: {}
        };
      } else {
        if (!cfg.developerInfo.links || typeof cfg.developerInfo.links !== 'object') cfg.developerInfo.links = {};
        ['name', 'profileImage', 'intro', 'email', 'phone'].forEach((key) => {
          if (cfg.developerInfo[key] === undefined) cfg.developerInfo[key] = '';
        });
      }
      // Ensure font settings exist (for body and heading).  If not present, provide defaults.
      if (!cfg.fonts || typeof cfg.fonts !== 'object') {
        cfg.fonts = {
          body: "'Poppins', sans-serif",
          heading: "'Great Vibes', cursive"
        };
      } else {
        if (!cfg.fonts.body) cfg.fonts.body = "'Poppins', sans-serif";
        if (!cfg.fonts.heading) cfg.fonts.heading = "'Great Vibes', cursive";
      }

      // Ensure both main and sub taglines exist.  If migrating from an older config that used a single
      // tagline property, copy its value into mainTagline and provide a default sub tagline.
      if (cfg.mainTagline === undefined) {
        // Fall back to the legacy tagline property if present, otherwise use the default
        cfg.mainTagline = cfg.tagline || 'Authentic Arabic Cuisine';
      }
      if (cfg.subTagline === undefined) {
        // Provide a reasonable default supporting tagline
        cfg.subTagline = 'Experience the taste of tradition';
      }
    // Ensure main tagline font and size exist.  If not set (for older configs), provide sensible defaults.
    if (cfg.mainTaglineFont === undefined) {
      cfg.mainTaglineFont = 'Cairo';
    }
    if (cfg.mainTaglineFontSize === undefined) {
      cfg.mainTaglineFontSize = 32;
    }
      // Remove the obsolete tagline property to avoid confusion
      if (cfg.tagline !== undefined) {
        delete cfg.tagline;
      }
      // Ensure hero background configuration exists.  If absent, default to slides.
      if (!cfg.heroBackground || typeof cfg.heroBackground !== 'object') {
        cfg.heroBackground = { type: 'slides', url: '' };
      } else {
        if (!cfg.heroBackground.type) cfg.heroBackground.type = 'slides';
        if (!cfg.heroBackground.url) cfg.heroBackground.url = '';
      }
      if (!cfg.heroBackgroundMedia || typeof cfg.heroBackgroundMedia !== 'object') {
        cfg.heroBackgroundMedia = {
          desktop: { image: '', video: '' },
          tablet: { image: '', video: '' },
          mobile: { image: '', video: '' }
        };
        if (cfg.heroBackground.type === 'image' && cfg.heroBackground.url) {
          cfg.heroBackgroundMedia.desktop.image = cfg.heroBackground.url;
        } else if (cfg.heroBackground.type === 'video' && cfg.heroBackground.url) {
          cfg.heroBackgroundMedia.desktop.video = cfg.heroBackground.url;
        }
      } else {
        if (!cfg.heroBackgroundMedia.desktop || typeof cfg.heroBackgroundMedia.desktop !== 'object') {
          cfg.heroBackgroundMedia.desktop = { image: '', video: '' };
        }
        if (!cfg.heroBackgroundMedia.tablet || typeof cfg.heroBackgroundMedia.tablet !== 'object') {
          cfg.heroBackgroundMedia.tablet = { image: '', video: '' };
        }
        if (!cfg.heroBackgroundMedia.mobile || typeof cfg.heroBackgroundMedia.mobile !== 'object') {
          cfg.heroBackgroundMedia.mobile = { image: '', video: '' };
        }
        ['desktop', 'tablet', 'mobile'].forEach((device) => {
          if (cfg.heroBackgroundMedia[device].image === undefined) cfg.heroBackgroundMedia[device].image = '';
          if (cfg.heroBackgroundMedia[device].video === undefined) cfg.heroBackgroundMedia[device].video = '';
        });
      }
      if (!cfg.announcementPopup || typeof cfg.announcementPopup !== 'object') {
        cfg.announcementPopup = {
          enabled: false,
          media: {
            desktop: { image: '', video: '' },
            tablet: { image: '', video: '' },
            mobile: { image: '', video: '' }
          },
          schedule: { startsAt: '', endsAt: '' },
          rotation: [],
          cta: { label: '', url: '' }
        };
      } else {
        if (cfg.announcementPopup.enabled === undefined) cfg.announcementPopup.enabled = false;
        if (!cfg.announcementPopup.media || typeof cfg.announcementPopup.media !== 'object') {
          cfg.announcementPopup.media = {
            desktop: { image: '', video: '' },
            tablet: { image: '', video: '' },
            mobile: { image: '', video: '' }
          };
        }
        ['desktop', 'tablet', 'mobile'].forEach((device) => {
          if (!cfg.announcementPopup.media[device] || typeof cfg.announcementPopup.media[device] !== 'object') {
            cfg.announcementPopup.media[device] = { image: '', video: '' };
          }
          if (cfg.announcementPopup.media[device].image === undefined) cfg.announcementPopup.media[device].image = '';
          if (cfg.announcementPopup.media[device].video === undefined) cfg.announcementPopup.media[device].video = '';
        });
        if (!cfg.announcementPopup.schedule || typeof cfg.announcementPopup.schedule !== 'object') {
          cfg.announcementPopup.schedule = { startsAt: '', endsAt: '' };
        }
        if (!Array.isArray(cfg.announcementPopup.rotation)) cfg.announcementPopup.rotation = [];
        if (!cfg.announcementPopup.cta || typeof cfg.announcementPopup.cta !== 'object') {
          cfg.announcementPopup.cta = { label: '', url: '' };
        }
      }
      // Ensure contact and tracking navigation items exist. Older saved data may not have these entries.
      if (Array.isArray(cfg.navItems)) {
        const hasContact = cfg.navItems.some((it) => it.id === 'contact');
        if (!hasContact) {
          cfg.navItems.push({ id: 'contact', label: 'Contact', link: '#contact' });
        }
        const hasTracking = cfg.navItems.some((it) => it.id === 'tracking');
        if (!hasTracking) {
          cfg.navItems.push({ id: 'tracking', label: 'Track Order', link: '#tracking' });
        }
      }
      // Ensure showSections includes contact and tracking by default unless explicitly false
      if (cfg.showSections && cfg.showSections.contact === undefined) {
        cfg.showSections.contact = true;
      }
      if (cfg.showSections && cfg.showSections.tracking === undefined) {
        cfg.showSections.tracking = true;
      }
    }
    // Ensure OTP records array exists for new password reset workflow
    if (parsed && parsed.otpRecords === undefined) {
      parsed.otpRecords = [];
    }
    // Ensure contact request storage exists for the admin Requests section
    if (parsed && !Array.isArray(parsed.requests)) {
      parsed.requests = [];
    }
    if (parsed && parsed.config) {
      if (!parsed.config.notifications || typeof parsed.config.notifications !== 'object') {
        parsed.config.notifications = {};
      }
      if (parsed.config.notifications.soundEnabled === undefined) {
        parsed.config.notifications.soundEnabled = true;
      }
      if (parsed.config.notifications.pushEnabled === undefined) {
        parsed.config.notifications.pushEnabled = true;
      }
      if (parsed.config.notifications.toneUrl === undefined) {
        parsed.config.notifications.toneUrl = '';
      }
    }
    if (parsed && Array.isArray(parsed.users)) {
      parsed.users = parsed.users.map((user) => {
        if (!user || typeof user !== 'object') return user;
        if (!user.notificationPrefs || typeof user.notificationPrefs !== 'object') {
          user.notificationPrefs = {};
        }
        if (user.notificationPrefs.soundEnabled === undefined) {
          user.notificationPrefs.soundEnabled = true;
        }
        if (!user.notificationPrefs.sectionSeenAt || typeof user.notificationPrefs.sectionSeenAt !== 'object') {
          user.notificationPrefs.sectionSeenAt = { orders: 0, reservations: 0, requests: 0 };
        } else {
          if (user.notificationPrefs.sectionSeenAt.orders === undefined) user.notificationPrefs.sectionSeenAt.orders = 0;
          if (user.notificationPrefs.sectionSeenAt.reservations === undefined) user.notificationPrefs.sectionSeenAt.reservations = 0;
          if (user.notificationPrefs.sectionSeenAt.requests === undefined) user.notificationPrefs.sectionSeenAt.requests = 0;
        }
        if (!user.notificationPrefs.sections || typeof user.notificationPrefs.sections !== 'object') {
          user.notificationPrefs.sections = { orders: true, reservations: true, requests: true };
        } else {
          if (user.notificationPrefs.sections.orders === undefined) user.notificationPrefs.sections.orders = true;
          if (user.notificationPrefs.sections.reservations === undefined) user.notificationPrefs.sections.reservations = true;
          if (user.notificationPrefs.sections.requests === undefined) user.notificationPrefs.sections.requests = true;
        }
        if (!Array.isArray(user.sectionsAccess)) {
          if (user.role === 'admin') {
            user.sectionsAccess = ['dashboard', 'orders', 'reservations', 'requests', 'products', 'gallery', 'settings', 'notifications'];
          } else {
            user.sectionsAccess = [];
            const perms = Array.isArray(user.permissions) ? user.permissions : [];
            if (perms.some((perm) => ['viewAnalytics'].includes(perm))) user.sectionsAccess.push('dashboard');
            if (perms.some((perm) => ['viewOrders', 'updateOrderStatus'].includes(perm))) user.sectionsAccess.push('orders');
            if (perms.some((perm) => ['viewReservations', 'approveReservations'].includes(perm))) user.sectionsAccess.push('reservations');
            if (perms.some((perm) => ['accessCMS'].includes(perm))) user.sectionsAccess.push('requests', 'settings');
            if (perms.some((perm) => ['viewMenu', 'editMenu'].includes(perm))) user.sectionsAccess.push('products');
            if (perms.some((perm) => ['accessCMS'].includes(perm))) user.sectionsAccess.push('gallery');
            if (perms.some((perm) => ['viewOrders', 'viewReservations', 'accessCMS'].includes(perm))) user.sectionsAccess.push('notifications');
            user.sectionsAccess = Array.from(new Set(user.sectionsAccess));
          }
        }
        return user;
      });
    }
    if (parsed && Array.isArray(parsed.menuItems)) {
      parsed.menuItems = parsed.menuItems.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const sellingPrice = Number.isFinite(Number(item.sellingPrice))
          ? Number(item.sellingPrice)
          : Number.isFinite(Number(item.price))
            ? Number(item.price)
            : 0;
        if (item.sellingPrice === undefined) item.sellingPrice = sellingPrice;
        item.price = sellingPrice;
        if (item.originalPrice === undefined || item.originalPrice === null || item.originalPrice === '') {
          item.originalPrice = '';
        } else {
          const originalPrice = Number(item.originalPrice);
          item.originalPrice = Number.isFinite(originalPrice) ? originalPrice : '';
        }
        if (item.viewedCount === undefined) item.viewedCount = 0;
        if (item.orderedCount === undefined) item.orderedCount = 0;
        // getItemVariations / normalizeVariationRecord live in 99-legacy.js
        // which loads AFTER this module. If we're being called during boot
        // (before legacy is ready) the migration is a no-op - the legacy
        // code will normalize variations on first read instead. Without
        // this guard the entire defaults load throws ReferenceError and
        // the app falls back to default state on every boot.
        if (typeof window.getItemVariations === 'function') {
          item.variations = window.getItemVariations(item);
          item.variationsEnabled = !!((item.variationsEnabled || item.variations.length) && item.variations.length);
        } else if (Array.isArray(item.variations)) {
          // Minimal fallback: keep variations as-is, just ensure flag is set
          item.variationsEnabled = !!(item.variationsEnabled || item.variations.length);
        } else {
          item.variations = [];
          item.variationsEnabled = !!item.variationsEnabled;
        }
        return item;
      });
    }
    if (parsed && Array.isArray(parsed.offers)) {
      parsed.offers = parsed.offers.map((offer) => {
        if (!offer || typeof offer !== 'object') return offer;
        if (offer.performance === undefined || typeof offer.performance !== 'object') {
          offer.performance = { orders: 0, revenue: 0, discountValue: 0 };
        }
        if (offer.productVariationId === undefined) offer.productVariationId = '';
        if (offer.type === 'combo') {
          offer.comboRequirements = getComboOfferRequirements(offer);
          offer.productIds = offer.comboRequirements.map((entry) => entry.productId);
        }
        return offer;
      });
    }
    if (parsed && Array.isArray(parsed.orders)) {
      parsed.orders = parsed.orders.map((order) => {
        if (!order || typeof order !== 'object') return order;
        if (order.timeline === undefined || typeof order.timeline !== 'object') {
          order.timeline = {};
        }
        if (order.timeline.placedAt === undefined) {
          order.timeline.placedAt = order.date || Date.now();
        }
        if (order.status === 'Completed') {
          order.status = 'Delivered';
          if (!order.timeline.deliveredAt) order.timeline.deliveredAt = order.timeline.placedAt;
        }
        if (!Array.isArray(order.statusHistory)) {
          order.statusHistory = [{ status: order.status || 'Pending', time: order.timeline.placedAt }];
        }
        if (order.deliveryMetrics === undefined || typeof order.deliveryMetrics !== 'object') {
          order.deliveryMetrics = {};
        }
        if (Array.isArray(order.items)) {
          order.items = order.items.map((entry) => {
            if (!entry || typeof entry !== 'object') return entry;
            const item = parsed.menuItems.find((menuItem) => menuItem.id === entry.id);
            // Store.init() may run BEFORE 99-legacy.js loads its helper
            // functions (getResolvedVariation / getSellingPrice /
            // getCartLineKey). Use safe fallbacks — these only do
            // light normalization, the real values come back when the
            // app renders.
            const resolveVariation = (typeof getResolvedVariation === 'function')
              ? getResolvedVariation
              : (typeof window.getResolvedVariation === 'function' ? window.getResolvedVariation : function () { return null; });
            const resolveSellingPrice = (typeof getSellingPrice === 'function')
              ? getSellingPrice
              : (typeof window.getSellingPrice === 'function' ? window.getSellingPrice : function () { return 0; });
            const resolveCartLineKey = (typeof getCartLineKey === 'function')
              ? getCartLineKey
              : (typeof window.getCartLineKey === 'function' ? window.getCartLineKey : function (id, v) { return v ? id + ':' + v : id; });
            const variation = item ? resolveVariation(item, entry.variationId || '') : null;
            const unitPrice = Number.isFinite(Number(entry.unitPrice))
      ? Number(entry.unitPrice)
      : (item ? resolveSellingPrice(item, variation ? variation.id : '') : 0);
            return {
      id: entry.id,
      qty: Number(entry.qty || 0),
      lineKey: entry.lineKey || resolveCartLineKey(entry.id, variation ? variation.id : (entry.variationId || '')),
      productName: entry.productName || (item ? item.name : 'Product'),
      variationId: variation ? variation.id : (entry.variationId || ''),
      variationName: entry.variationName || (variation ? variation.name : ''),
      variationStockKey: entry.variationStockKey || (variation ? variation.stockKey : ''),
      unitPrice: unitPrice,
      originalUnitPrice: entry.originalUnitPrice === null || entry.originalUnitPrice === undefined || entry.originalUnitPrice === ''
        ? null
        : Number(entry.originalUnitPrice),
      lineTotal: Number.isFinite(Number(entry.lineTotal))
        ? Number(entry.lineTotal)
        : unitPrice * Number(entry.qty || 0)
            };
          });
        }
        if (Array.isArray(order.discountDetails)) {
          order.discountDetails = order.discountDetails.map((detail) => {
            if (!detail || typeof detail !== 'object') return detail;
            return {
      ...detail,
      lineKey: detail.lineKey || getCartLineKey(detail.id, detail.variationId || ''),
      variationId: detail.variationId || '',
      variationName: detail.variationName || '',
      stockKey: detail.stockKey || ''
            };
          });
        }
        return order;
      });
    }
    return parsed;
  }

  /* ------------------------------------------------------------------------
   * load(): read from localStorage, normalize, return state.
   * If absent or unparseable, returns _buildDefaults() and persists it.
   * ------------------------------------------------------------------------ */
  function load() {
    var raw = localStorage.getItem(App.Config.STORAGE_KEY);
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        return _normalize(parsed);
      } catch (e) {
        console.warn('Stored data unparseable, falling back to defaults', e);
      }
    }
    var fresh = _buildDefaults();
    try {
      localStorage.setItem(App.Config.STORAGE_KEY, JSON.stringify(fresh));
    } catch (e) {
      console.error('Failed to seed defaults to localStorage', e);
    }
    return fresh;
  }

  /* ------------------------------------------------------------------------
   * save(): persist current global appState back to localStorage.
   * Strips gallery image payloads before serialisation (image bytes live
   * in IndexedDB; only ids are persisted to localStorage).
   * ------------------------------------------------------------------------ */
  /* ------------------------------------------------------------------------
   * Sync diff helpers
   * ------------------------------------------------------------------------
   * The Repo layer fires sync hooks on its mutations, but ~31 places in the
   * legacy code still mutate appState.X directly and then call saveData().
   * Those bypass the Repo hooks and never reach Supabase.
   *
   * To close that gap without rewriting every legacy mutation, save() now
   * snapshots the synced collections after each successful localStorage
   * write, diffs against the previous snapshot, and queues create/update/
   * delete operations to App.SupabaseSync for any rows that changed.
   *
   * The snapshot stores JSON-stringified copies of each row keyed by row.id
   * (and a deep-cloned config object). This is intentionally aggressive:
   * any field-level change to any row produces a different JSON string and
   * therefore a publish. The cost per save is O(total rows) string
   * serialisation, negligible at this scale.
   * ------------------------------------------------------------------------ */
  var _SYNC_COLLECTIONS = ['users', 'menuItems', 'categories', 'offers',
    'orders', 'reservations', 'reviews', 'requests'];
    // NOTE: 'gallery' is intentionally excluded. Gallery items contain base64
    // image bytes in appState which differ from the metadata-only rows in
    // Supabase, causing spurious upsert attempts on every save() call.
    // Gallery sync is handled exclusively by explicit Repo.Gallery.create/remove
    // calls so image bytes are never compared by the diff engine.
  var _previousSnapshot = null;
  // Map collection name (camelCase frontend) -> table name (snake_case Supabase)
  // for use in diagnostic logs
  var _SYNC_VERBOSE = false;   // Flip to true (or set window.__SYNC_VERBOSE = true) to log every diff

  function _snapshotCollection(arr) {
    if (!Array.isArray(arr)) return Object.create(null);
    var byId = Object.create(null);
    for (var i = 0; i < arr.length; i++) {
      var row = arr[i];
      if (!row) continue;
      // Fall back to a synthetic id if the row lacks one, so the snapshot
      // still tracks it across saves. Without this, id-less rows are
      // invisible to the diff engine and never sync.
      var id = row.id || ('_idx_' + i);
      try {
        byId[id] = JSON.stringify(row);
      } catch (e) {
        // Circular reference or similar - skip this row rather than break the whole snapshot
        console.warn('[Store] snapshot stringify failed for row', id, e);
      }
    }
    return byId;
  }

  function _diffAndPublish(prev, curr) {
    if (!App.SupabaseSync) return;
    var stats = { creates: 0, updates: 0, removes: 0, configChanged: false };
    // SECURITY: never publish `users` rows from non-admin sessions.
    //
    // Customer/staff/owner sessions can only legitimately modify their
    // OWN row, and that path is handled explicitly by _ensureProfile()
    // (direct upsert by auth.uid()) or by the link_staff_invite RPC
    // (SECURITY DEFINER, server-side). The diff engine sees ANY users
    // row that arrived via realtime — re-publishing them would fail:
    //
    //   - "permission denied for table users" (RLS rejects the write)
    //   - "new row violates RLS policy" (row id != auth.uid())
    //
    // Surfacing as the red "Sync failed" banner the user saw. Admin
    // sessions retain full diff publishing — admins have elevated
    // privileges via is_admin() RLS policies.
    // Get the current session's user row id so we can allow self-updates.
    var sessionRole = null;
    var sessionUserId = null;
    try {
      var st = window.appState;
      sessionRole = st && st.session && st.session.role ? String(st.session.role) : null;
      sessionUserId = st && st.session && st.session.id ? String(st.session.id) : null;
    } catch (e) {}

    // Helper: should we skip publishing this user row?
    // Block writes to OTHER user rows when not admin (avoids RLS errors).
    // But allow staff/customer to update their OWN row — this is what
    // sectionSeenAt persistence needs to work cross-refresh.
    function shouldSkipUserPublish(id) {
      if (sessionRole === 'admin') return false;
      // Non-admin: only allow updates to own row
      return id !== sessionUserId;
    }

    _SYNC_COLLECTIONS.forEach(function (key) {
      var prevById = (prev && prev[key]) || Object.create(null);
      var currById = (curr && curr[key]) || Object.create(null);

      // New + updated rows
      Object.keys(currById).forEach(function (id) {
        // Skip synthetic ids - they cannot be tracked in Supabase
        if (id.indexOf('_idx_') === 0) return;
        // For users table: allow self-updates, block updates to others
        if (key === 'users' && shouldSkipUserPublish(id)) {
          return;
        }
        var prevJson = prevById[id];
        var currJson = currById[id];
        if (!prevJson) {
          stats.creates++;
          try {
            App.SupabaseSync.publishCreate(key, JSON.parse(currJson));
          } catch (e) { console.warn('[Store._diffAndPublish] create JSON parse failed', key, id); }
        } else if (prevJson !== currJson) {
          stats.updates++;
          try {
            App.SupabaseSync.publishUpdate(key, id, JSON.parse(currJson));
          } catch (e) { console.warn('[Store._diffAndPublish] update JSON parse failed', key, id); }
        }
      });

      // Deleted rows
      Object.keys(prevById).forEach(function (id) {
        if (id.indexOf('_idx_') === 0) return;
        if (key === 'users' && shouldSkipUserPublish(id)) {
          return;
        }
        if (!currById[id]) {
          stats.removes++;
          App.SupabaseSync.publishRemove(key, id);
        }
      });
    });

    // Config: deep-clone the snapshot so subsequent mutations don't pollute
    // the baseline. Compare as JSON.
    if (curr && curr.config) {
      var prevConfig = prev && prev.config ? JSON.stringify(prev.config) : null;
      var currConfig = JSON.stringify(curr.config);
      if (prevConfig !== currConfig && App.SupabaseSync.publishConfig) {
        stats.configChanged = true;
        App.SupabaseSync.publishConfig(curr.config);
      }
    }

    // Diagnostic: log when ANY change is published. Helps confirm sync is
    // firing as expected. Set window.__SYNC_VERBOSE = true in console to
    // see this output, or flip _SYNC_VERBOSE above.
    if (_SYNC_VERBOSE || window.__SYNC_VERBOSE) {
      if (stats.creates || stats.updates || stats.removes || stats.configChanged) {
        console.info('[Store] sync diff published:', stats);
      }
    }
  }

  function _buildSnapshot(state) {
    if (!state) return null;
    var snap = Object.create(null);
    _SYNC_COLLECTIONS.forEach(function (key) {
      snap[key] = _snapshotCollection(state[key]);
    });
    // CRITICAL: deep-clone config. Without this, snap.config and
    // state.config point to the same object reference. When the user
    // mutates state.config.X, prev.config.X also changes (same object),
    // so the diff sees no change and never publishes. The other
    // collections are immune because _snapshotCollection() stringifies
    // each row at snapshot time.
    snap.config = state.config ? JSON.parse(JSON.stringify(state.config)) : {};
    return snap;
  }

  function save() {
    try {
      var state = window.appState;
      if (!state) return;
      var stateCopy = JSON.parse(JSON.stringify(state));
      if (Array.isArray(stateCopy.gallery)) {
        // Strip the large base64 `data` field from gallery items before
        // serializing to localStorage. Keep the id + url + any small
        // metadata so we can render via Storage URL after reload without
        // re-syncing.
        stateCopy.gallery = stateCopy.gallery.map(function (item) {
          if (!item) return item;
          var clean = {};
          if (item.id)  clean.id  = item.id;
          if (item.url) clean.url = item.url;
          // Preserve any small meta fields (title, caption, sort order, etc.)
          Object.keys(item).forEach(function (k) {
            if (k !== 'data' && k !== 'id' && k !== 'url') {
              clean[k] = item[k];
            }
          });
          return clean;
        });
      }
      // STRIP base64 hero media from the localStorage snapshot.
      // Hero images/videos are stored in the Supabase 'hero' bucket
      // and referenced by URL; any `data:...` strings still living in
      // appState.config.heroBackgroundMedia are legacy artifacts that
      // would blow past localStorage's 5-10 MB quota.
      //
      // Important: this only modifies the COPY being saved to localStorage,
      // not the live appState. So Supabase still receives the full data
      // (which it can hold), and the local fast-cache stays small.
      try {
        if (stateCopy.config && stateCopy.config.heroBackgroundMedia) {
          var hbm = stateCopy.config.heroBackgroundMedia;
          ['desktop', 'tablet', 'mobile'].forEach(function (device) {
            var d = hbm[device];
            if (!d) return;
            ['image', 'video'].forEach(function (k) {
              if (typeof d[k] === 'string' && d[k].indexOf('data:') === 0) {
                d[k] = '';  // strip base64 — it's not safe in localStorage
              }
            });
          });
        }
        // Same protection for announcementPopup media (also can hold base64)
        if (stateCopy.config && stateCopy.config.announcementPopup
            && stateCopy.config.announcementPopup.media) {
          var apm = stateCopy.config.announcementPopup.media;
          ['desktop', 'tablet', 'mobile'].forEach(function (device) {
            var d = apm[device];
            if (!d) return;
            ['image', 'video'].forEach(function (k) {
              if (typeof d[k] === 'string' && d[k].indexOf('data:') === 0) {
                d[k] = '';
              }
            });
          });
        }
        // Also strip base64 from menu item images (v72). Menu products
        // now upload to the 'menu' Storage bucket and reference by URL,
        // but legacy products created before v72 may still have base64
        // in their `image` field. Stripping here keeps localStorage
        // under quota without touching the live appState (so Supabase
        // still receives the full data for legacy items it had).
        if (Array.isArray(stateCopy.menuItems)) {
          stateCopy.menuItems = stateCopy.menuItems.map(function (mi) {
            if (!mi) return mi;
            if (typeof mi.image === 'string' && mi.image.indexOf('data:') === 0) {
              var copy = Object.assign({}, mi);
              copy.image = '';   // legacy base64 stripped from cache
              return copy;
            }
            return mi;
          });
        }
        // Logo (v80): same cleanup — legacy logos uploaded as base64
        // before v80 would still be inflating localStorage. Strip from
        // the cached copy so the URL-based flow takes over cleanly.
        if (stateCopy.config && typeof stateCopy.config.logo === 'string'
            && stateCopy.config.logo.indexOf('data:') === 0) {
          stateCopy.config = Object.assign({}, stateCopy.config);
          stateCopy.config.logo = '';
        }
      } catch (e) {
        console.warn('[Store.save] media strip failed (non-fatal):', e);
      }
      // SECURITY: never persist plaintext passwords for ANY user role.
      // Customer accounts use Supabase Auth (passwords live in Supabase's
      // hashed auth schema, never in our users table). Staff accounts use
      // the same Supabase Auth path — their `password` field, if present,
      // is legacy data from an earlier version and must be stripped.
      if (Array.isArray(stateCopy.users)) {
        stateCopy.users = stateCopy.users.map(function (u) {
          if (!u) return u;
          if (u.password !== undefined) {
            var safe = Object.assign({}, u);
            delete safe.password;
            return safe;
          }
          return u;
        });
      }
      localStorage.setItem(App.Config.STORAGE_KEY, JSON.stringify(stateCopy));
      if (typeof window.updateRealtimeDots === 'function') {
        window.updateRealtimeDots();
      }

      // After the local save succeeds, diff against the previous snapshot
      // and queue Supabase upserts/deletes for any changed rows. This makes
      // every legacy saveData() call sync to Supabase automatically.
      try {
        var newSnapshot = _buildSnapshot(state);
        if (_previousSnapshot !== null) {
          _diffAndPublish(_previousSnapshot, newSnapshot);
        } else {
          if (window.__SYNC_VERBOSE) {
            console.info('[Store.save] no previous snapshot yet, skipping diff (first save)');
          }
        }
        _previousSnapshot = newSnapshot;
      } catch (diffErr) {
        console.warn('[Store.save] diff/publish failed (local save still succeeded)', diffErr);
      }
    } catch (e) {
      console.error('Failed to save data to localStorage', e);
      // QuotaExceededError recovery: clear localStorage and try once
      // more. This is safe because Supabase is the source of truth —
      // the page will re-bootstrap from there on next reload.
      var isQuotaErr = e && (e.name === 'QuotaExceededError'
        || (e.message && /quota|exceeded/i.test(e.message)));
      if (isQuotaErr) {
        try {
          console.warn('[Store.save] quota exceeded — clearing localStorage and retrying');
          var storageKey = App.Config.STORAGE_KEY;
          // Clear everything (including any zombie keys from old versions)
          try { localStorage.clear(); } catch (clearErr) {}
          // Retry the save with the (already-stripped) stateCopy
          localStorage.setItem(storageKey, JSON.stringify(stateCopy));
          console.info('[Store.save] retry succeeded after clearing localStorage');
          // Fall through to the diff/publish below
          if (typeof window.updateRealtimeDots === 'function') {
            window.updateRealtimeDots();
          }
          return;   // skip the alert since retry worked
        } catch (retryErr) {
          console.error('[Store.save] retry also failed', retryErr);
        }
      }
      alert(
        'Failed to save changes: ' + (e && e.message ? e.message : 'Storage error') + '\n' +
        'You may have reached the browser storage limit. Please remove some items or reduce file sizes and try again.'
      );
    }
  }

  /**
   * Reset the snapshot baseline. Called after Supabase bootstrap completes
   * so the diff baseline matches the cloud-fetched state, not the stale
   * localStorage state from before bootstrap.
   */
  function resetSyncBaseline() {
    _previousSnapshot = _buildSnapshot(window.appState);
  }

  /* ------------------------------------------------------------------------
   * init(): one-time bootstrap. Loads state and assigns to window.appState.
   * ------------------------------------------------------------------------ */
  function init() {
    window.appState = load();
    return window.appState;
  }

  /* ------------------------------------------------------------------------
   * replace(nextState): used by realtime sync to swap the entire state.
   * ------------------------------------------------------------------------ */
  function replace(nextState) {
    window.appState = nextState;
  }

  /* ------------------------------------------------------------------------
   * state(): read current state (mirrors window.appState).
   * ------------------------------------------------------------------------ */
  function state() {
    return window.appState;
  }

  App.Store = {
    init: init,
    load: load,
    save: save,
    replace: replace,
    state: state,
    resetSyncBaseline: resetSyncBaseline,
    // Exposed for tests / future Repo layer
    _buildDefaults: _buildDefaults,
    _normalize: _normalize
  };
})();
