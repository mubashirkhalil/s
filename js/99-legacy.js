/* ==========================================================================
 * Legacy main script  (UNREFACTORED REMAINDER)
 * --------------------------------------------------------------------------
 * This file contains the parts of the original inline <script> block that
 * have NOT yet been extracted into modules. It is loaded last in index.html
 * and depends on App.Util, App.IndexedDB, App.Store, and the compat shims
 * being available.
 *
 * Extracted blocks have been replaced by single-line // [extracted to ...]
 * pointers so you can find the new home of each function quickly.
 *
 * Future phases will continue extracting from this file:
 *   - Cart logic           -> App.Services.Cart
 *   - Order logic          -> App.Services.Order
 *   - Reservation logic    -> App.Services.Reservation
 *   - Auth logic           -> App.Services.Auth
 *   - Realtime logic       -> App.Services.Realtime
 *   - Admin/Staff render   -> App.UI.Admin, App.UI.Staff
 *   - Customer render      -> App.UI.Customer
 *
 * Until then, this file remains a single monolithic block.
 * ========================================================================== */

      /*
       * Supabase configuration and reusable CRUD helpers.
       * This block is intentionally placed at the top of the main script so any
       * future feature can use the shared client without disturbing the current
       * animations, layout, or front-end rendering logic below.
       */
      const SUPABASE_URL = 'https://fimogqovpfnjhdknjiux.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpbW9ncW92cGZuamhka25qaXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDQ0OTIsImV4cCI6MjA5MzMyMDQ5Mn0.e4Ss4SdwUDlj2-U4sdHa47jk-hHlM6fqV0uAMhI-ufw';
      const supabaseClient = window.supabase && typeof window.supabase.createClient === 'function'
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        : null;

      /*
       * Centralized query runner so all helpers return data consistently and
       * surface Supabase errors without forcing UI changes in the existing app.
       */
      async function runSupabaseQuery(queryBuilder) {
        if (!supabaseClient) {
          throw new Error('Supabase client failed to initialize. Check the CDN script load.');
        }
        const { data, error } = await queryBuilder;
        if (error) throw error;
        return data;
      }

      /*
       * Fetch rows from a table.
       * Pass a callback in options.query to customize filters, ordering, limits,
       * or joins while keeping the helper reusable across site sections.
       */
      async function fetchData(table, options = {}) {
        const columns = options.columns || '*';
        const query = supabaseClient.from(table).select(columns);
        const finalQuery = typeof options.query === 'function' ? options.query(query) || query : query;
        return runSupabaseQuery(finalQuery);
      }

      /*
       * Insert one row or many rows into a table.
       * options.select can be used when the caller needs the inserted records back.
       */
      async function insertData(table, payload, options = {}) {
        let query = supabaseClient.from(table).insert(payload);
        if (options.select) query = query.select(options.select);
        return runSupabaseQuery(query);
      }

      /*
       * Update rows in a table.
       * The matcher object becomes an equality-based WHERE clause so callers can
       * reuse this helper for common updates without rewriting filter logic.
       */
      async function updateData(table, updates, matcher = {}, options = {}) {
        let query = supabaseClient.from(table).update(updates);
        Object.entries(matcher || {}).forEach(([column, value]) => {
          query = query.eq(column, value);
        });
        if (options.select) query = query.select(options.select);
        return runSupabaseQuery(query);
      }

      /*
       * Delete rows in a table.
       * The matcher object mirrors updateData so both helpers are easy to reuse.
       */
      async function deleteData(table, matcher = {}, options = {}) {
        let query = supabaseClient.from(table).delete();
        Object.entries(matcher || {}).forEach(([column, value]) => {
          query = query.eq(column, value);
        });
        if (options.select) query = query.select(options.select);
        return runSupabaseQuery(query);
      }

      // Expose the initialized client and helpers globally for safe reuse by future features.
      window.supabaseClient = supabaseClient;
      window.supabaseHelpers = {
        fetchData,
        insertData,
        updateData,
        deleteData
      };

      // ========== Utility functions ========== //
      /**
       * Retrieve application data from localStorage or initialise with defaults
       */
      // [extracted to App.Store.load - see js/03-store.js]

      /**
       * Save the entire application state back to localStorage
       */
      // [extracted to App.Store.save - see js/03-store.js]

      /**
       * Initialise a fresh dataset with sane defaults.  This will be used
       * whenever there is no existing data in localStorage.  Feel free to
       * customise any of these defaults to suit your needs.
       */
      function initDefaultData() {
        const defaults = {
          config: {
            restaurantName: 'Al Fursan Grills & Restaurant',
            // Taglines for the hero section.  Use mainTagline for the large heading and subTagline for the supporting text.
            mainTagline: 'Authentic Arabic Cuisine',
            subTagline: 'Experience the taste of tradition',
            // Default font and size for the main tagline (Arabic heading).  Admins can customise these in the settings panel.
            mainTaglineFont: 'Cairo',
            // Use a numeric value (in pixels) for the font size to allow easy parsing and range control.  Default to 32px.
            mainTaglineFontSize: 32,
            // Font and size controls for the restaurant name shown in the
            // navbar. Configurable via Admin → Settings. Default keeps the
            // existing handwritten cursive look.
            restaurantNameFont: 'Great Vibes',
            restaurantNameSize: 32,        // desktop size (px)
            restaurantNameSizeMobile: 20,  // mobile size (px) — clamped on small screens
            // Provide a customisable text for the thin strip at the very top of the website.
            // Administrators can modify this in the settings section to display contact info or promotions.
            topBarText: 'Call us: +971 566 583 054 • Monday – Sunday, 8:00AM – 9:00PM',
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
            // v92: About page configuration. Customizable from the
            // admin panel's About section. Everything here is optional
            // — defaults render a tasteful "About Us" page even before
            // admin has uploaded any content.
            about: {
              enabled: true,
              bannerImage: '',                // hero image at the top of the section
              title: 'About Us',
              subtitle: 'Our Story',
              bodyText: 'Welcome to our restaurant. Add your story here from the Admin Panel → About section.',
              midImage: '',                   // optional secondary image
              features: [
                { icon: 'fa-utensils',  title: 'Authentic Cuisine', description: 'Crafted from time-honored recipes and the freshest ingredients.' },
                { icon: 'fa-leaf',      title: 'Fresh Ingredients', description: 'Sourced daily from trusted suppliers and local farms.' },
                { icon: 'fa-heart',     title: 'Made with Love',    description: 'Every dish is prepared with care by our passionate chefs.' }
              ]
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
              { id: 'about', label: 'About', link: '#about' },
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
              about: true,
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
          offers: [
            {
              id: generateId(),
              title: 'Family Feast',
              description: 'Get 20% off on orders above AED 150.',
              discount: 20,
              start: Date.now(),
              end: Date.now() + 7 * 24 * 60 * 60 * 1000,
              enabled: true,
              performance: { orders: 0, revenue: 0, discountValue: 0 }
            }
          ],
          gallery: [],
          reviews: [
            {
              id: generateId(),
              name: 'Sara Ali',
              rating: 5,
              message:
                'An unforgettable dining experience! The food was exquisite and the ambience truly luxurious.',
              image: ''
            },
            {
              id: generateId(),
              name: 'Mohammad Khan',
              rating: 4,
              message:
                'Great service and authentic flavours. Highly recommend the mixed grill platter.',
              image: ''
            }
          ],
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
        localStorage.setItem('restaurantData', JSON.stringify(defaults));
        return defaults;
      }

      /**
       * Generate a unique identifier for new items.  Uses simple random
       * numbers combined with timestamp for predictability between reloads.
       */
      // [extracted to App.Util.generateId - see js/02-util.js]

      /* -----------------------------------------------------------------
       * OTP (One‑Time Password) management for password reset.
       *
       * These helpers generate secure 6‑digit codes, persist them alongside
       * an expiry timestamp and attempt counter, send the code via email
       * using EmailJS and verify submissions.  OTP records are stored in
       * appState.otpRecords and persisted to localStorage via saveData().
       * Codes expire after 5 minutes and will be invalidated after
       * excessive failed attempts.  See bottom of file for external
       * library includes and EmailJS initialisation.
       * ----------------------------------------------------------------- */

      // Ensure the otpRecords array exists on the application state.
      function ensureOtpRecords() {
        if (!appState.otpRecords) {
          appState.otpRecords = [];
        }
      }
      // Remove expired OTP entries.
      function cleanExpiredOtps() {
        ensureOtpRecords();
        const now = Date.now();
        appState.otpRecords = appState.otpRecords.filter((rec) => {
          return rec && rec.expiry && rec.expiry > now;
        });
      }
      // Generate a cryptographically secure 6‑digit numeric OTP.
      // [extracted to App.Util.generateOtp - see js/02-util.js]
      // Send the OTP via EmailJS.  Requires global variables specifying your
      // service ID, template ID and user/public key (see configuration
      // instructions near the bottom of the file).  The template should
      // accept variables { to_email, otp }.
      async function sendOtpEmail(email, otp) {
        try {
          const serviceID = window.EMAILJS_SERVICE_ID;
          const templateID = window.EMAILJS_TEMPLATE_ID;
          const userID = window.EMAILJS_USER_ID;
          if (
            serviceID &&
            templateID &&
            userID &&
            window.emailjs &&
            typeof emailjs.send === 'function'
          ) {
            await emailjs.send(
              serviceID,
              templateID,
              { to_email: email, otp: otp },
              userID
            );
          } else {
            console.warn(
              'EmailJS not configured. Set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID and EMAILJS_USER_ID to enable OTP emails.'
            );
          }
        } catch (ex) {
          console.error('Failed to send OTP email', ex);
        }
      }
      // Create an OTP entry for the given email, invalidating any previous
      // pending codes.  Returns the generated code.
      function createOtpForEmail(email) {
        cleanExpiredOtps();
        ensureOtpRecords();
        // Remove any existing codes for this email
        appState.otpRecords = appState.otpRecords.filter((r) => r.email !== email);
        const code = generateOtp();
        const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes
        const attemptsLeft = 5;
        appState.otpRecords.push({
          email: email,
          code: code,
          expiry: expiry,
          attemptsLeft: attemptsLeft
        });
        // Persist immediately to localStorage
        saveData();
        // Fire off email asynchronously.  Do not await to avoid blocking UI.
        sendOtpEmail(email, code);
        // Log the OTP to the console for development/testing purposes only.
        // This assists testers without compromising the UI.  Avoid exposing it to end users.
        try {
          console.log('Generated OTP for ' + email + ': ' + code);
        } catch (ex) {
          /* ignore */
        }
        return code;
      }
      // Verify the OTP for a given email.  Returns an object
      // { ok: boolean, error?: string }.  On success, the code is removed.
      function verifyOtpForEmail(email, code) {
        cleanExpiredOtps();
        ensureOtpRecords();
        const recIndex = appState.otpRecords.findIndex((r) => r.email === email);
        if (recIndex < 0) {
          return { ok: false, error: 'No OTP requested for this email.' };
        }
        const rec = appState.otpRecords[recIndex];
        if (!code || code !== rec.code) {
          // decrement attempts and persist
          if (rec.attemptsLeft !== undefined) {
            rec.attemptsLeft--;
          }
          if (!rec.attemptsLeft || rec.attemptsLeft <= 0) {
            // remove the record when attempts exhausted
            appState.otpRecords.splice(recIndex, 1);
          }
          saveData();
          return {
            ok: false,
            error: 'Incorrect verification code. Please try again.'
          };
        }
        if (Date.now() > rec.expiry) {
          // expired
          appState.otpRecords.splice(recIndex, 1);
          saveData();
          return { ok: false, error: 'The verification code has expired.' };
        }
        // success
        appState.otpRecords.splice(recIndex, 1);
        saveData();
        return { ok: true };
      }

      /**
       * =============================
       * IndexedDB helpers
       * =============================
       *
       * To avoid exceeding browser localStorage quotas when storing large
       * images, gallery images are persisted in IndexedDB under a separate
       * database.  Each image is stored in the 'images' object store using
       * its unique id as the key.  The appState.gallery array stores only
       * references (ids) to images rather than embedding the actual data.
       */
      const galleryDBName = 'galleryDB';
      /**
       * Open (or create) the IndexedDB database used for gallery images.  Returns
       * a promise that resolves with the database instance.  On first run, the
       * 'images' object store is created to hold image DataURLs.
       *
       * NOTE: This function has been renamed to avoid collision with the
       * image database functions used elsewhere.  It remains for backward
       * compatibility but is not used by new code.
       */
      // [extracted to App.IndexedDB.openLegacy - see js/04-indexeddb.js]

      /**
       * Save image data into IndexedDB using the given id as the key.  Returns
       * a promise that resolves when the transaction completes.  If the
       * database fails to open or the transaction fails, the promise rejects.
       * @param {string} id Unique identifier for the image
       * @param {string} data Data URL representing the image
       */
      // [extracted to App.IndexedDB.putLegacy - see js/04-indexeddb.js]

      /**
       * Retrieve image data from IndexedDB by id.  Returns a promise that
       * resolves with the Data URL or undefined if not found.
       * @param {string} id Unique identifier for the image
       */
      // [extracted to App.IndexedDB.getLegacy - see js/04-indexeddb.js]

      /**
       * Delete an image from IndexedDB by id.  Used when the admin removes
       * an image from the gallery.  Returns a promise that resolves when
       * deletion completes.
       * @param {string} id Unique identifier for the image
       */
      // [extracted to App.IndexedDB.deleteLegacy - see js/04-indexeddb.js]

      /**
       * Generate a unique order identifier in the format AFGR####.
       * The identifier begins with the fixed prefix "AFGR" followed by a
       * four‑digit number (0000–9999).  If an ID already exists in the
       * current orders array, a new one is generated until a unique ID
       * is produced.  This ensures each order can be tracked using a
       * consistent and human‑friendly code.
       */
      // [extracted to App.Util.generateOrderId - see js/02-util.js]

      /**
       * ==================== IndexedDB helpers for gallery images ====================
       *
       * Storing image data URLs directly in localStorage can quickly exceed
       * the browser’s quota, especially when uploading many or high‑resolution
       * photos.  To avoid these storage limits, we persist gallery images in
       * IndexedDB under a dedicated database and object store.  Only image
       * identifiers are saved in localStorage.  When the page loads, the
       * images are rehydrated by reading them back from IndexedDB into
       * appState.gallery.  If IndexedDB is not available for some reason,
       * operations will silently fail but not break other functionality.
       */

      // Open (or create) the IndexedDB used to store gallery images.  The
      // returned promise resolves with the database instance.  A single
      // database named "RestaurantGallery" is used with one object store
      // called "images" keyed by the image id.  When upgrading from
      // version 0, the object store is created if it does not yet exist.
      // [extracted to App.IndexedDB.open - see js/04-indexeddb.js]

      /**
       * Persist an image in IndexedDB.  The id should be the same id
       * stored in appState.gallery.  The data parameter is a Data URL
       * (string).  If IndexedDB is unavailable or an error occurs, the
       * promise resolves without rejecting so that the UI continues to
       * function.  Errors are logged to the console for debugging.
       */
      // [extracted to App.IndexedDB.put - see js/04-indexeddb.js]

      /**
       * Remove an image from IndexedDB by id.  Called when a gallery item is
       * deleted.  If IndexedDB is unavailable the operation is silently
       * ignored.  Errors are logged but do not prevent execution.
       */
      // [extracted to App.IndexedDB.delete - see js/04-indexeddb.js]

      /**
       * Fetch an image’s Data URL from IndexedDB by its id.  If the image
       * isn’t found or IndexedDB isn’t available, the promise resolves
       * with null.  Errors are logged for debugging.  Callers should
       * handle null values appropriately.
       */
      // [extracted to App.IndexedDB.get - see js/04-indexeddb.js]

      /**
       * Load all gallery images from IndexedDB into appState.gallery.  This
       * function iterates through the gallery entries loaded from
       * localStorage (which only contain ids) and fetches the full data
       * for each image from IndexedDB.  Missing images are skipped.  The
       * returned promise resolves when all lookups complete.
       */
      async function loadGalleryImages() {
        if (!appState || !Array.isArray(appState.gallery) || appState.gallery.length === 0) {
          return;
        }
        const promises = appState.gallery.map(async (item) => {
          if (!item) return;
          // URL-only items (uploaded to Supabase Storage) need no
          // IndexedDB step — the browser fetches from the public URL.
          if (item.url && !item.data) return;
          // If there is data but no id, migrate the image to IndexedDB
          if (item.data && !item.id) {
            const newId = generateId();
            try {
              await storeImageInDB(newId, item.data);
              item.id = newId;
            } catch (e) {
              console.error('Error migrating image to IndexedDB', e);
            }
          }
          // If there is an id but no data loaded, fetch it from IndexedDB
          if (item.id && !item.data && !item.url) {
            try {
              const data = await getImageFromDB(item.id);
              if (data) {
                item.data = data;
              }
            } catch (e) {
              console.error('Error loading image from IndexedDB', e);
            }
          }
          // Legacy cross-device case: item came in from Supabase with
          // inline data (pre-Storage-migration records). Persist to
          // local IndexedDB so subsequent reloads have a fast path.
          if (item.id && item.data && !item.url) {
            try {
              const existing = await getImageFromDB(item.id);
              if (!existing) {
                await storeImageInDB(item.id, item.data);
              }
            } catch (e) {}
          }
        });
        await Promise.all(promises);
        if (Array.isArray(appState.gallery)) {
          appState.gallery = appState.gallery.filter((item) => {
            return item && (item.data || item.id || item.url);
          });
        }
      }

      // Default hero image encoded as a base64 data URI.  This constant is used as the
      // fallback background for hero slides when the admin has not provided custom images.
      // It is composed of multiple concatenated strings for readability.
      // [extracted to App.Store - see js/03-store.js]

      /**
       * Scroll smoothly to a section by ID when nav items are clicked
       */
      function scrollToSection(section) {
        // Intercept tracking navigation to open the order tracking modal
        if (section === 'tracking') {
          openTrackOrderModal();
          return;
        }
        const el = document.getElementById(section);
        if (el) {
          const navbar = document.querySelector('.navbar');
          const navOffset = navbar ? navbar.offsetHeight + 10 : 60;
          const targetTop = Math.max(0, el.getBoundingClientRect().top + window.scrollY - navOffset);
          window.scrollTo({ top: targetTop, behavior: 'smooth' });
        }
      }

      /**
       * Toggle the mobile navigation.  When the screen width is below 768px the
       * navigation list is hidden by default.  This function toggles the
       * 'active' class on the nav list, revealing or hiding it.  A hamburger
       * icon defined in the HTML calls this function.
       */
      function toggleMenu(forceState) {
        const mobileNav = document.getElementById('mobileNav');
        const overlay = document.getElementById('menuOverlay');
        const menuButton = document.getElementById('menuButton');
        if (!mobileNav) return;
        const shouldOpen =
          typeof forceState === 'boolean'
            ? forceState
            : !mobileNav.classList.contains('active');

        mobileNav.classList.toggle('active', shouldOpen);
        mobileNav.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
        document.body.classList.toggle('menu-open', shouldOpen);

        if (menuButton) {
          menuButton.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
        }

        if (overlay) {
          overlay.classList.toggle('active', shouldOpen);
          overlay.onclick = shouldOpen
            ? function () {
                toggleMenu(false);
              }
            : null;
        }
      }

      document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        const mobileNav = document.getElementById('mobileNav');
        if (mobileNav && mobileNav.classList.contains('active')) {
          toggleMenu(false);
        }
      });

      /**
       * Open the customer account panel or show the login modal when the
       * account button is clicked.  If the user is signed in as a
       * customer, open the account modal; otherwise prompt for login.
       */
      function openAccountOrLogin() {
        try {
          // Determine if there is an active customer session
          const session = appState && appState.session;
          if (session && (!App.Services.Auth.isVerified || App.Services.Auth.isVerified())) {
            openAccountModal();
          } else {
            openLoginModal();
          }
        } catch (ex) {
          console.warn('Error opening account or login modal', ex);
        }
      }

      // Global application state
      // [appState now initialized by App.Store.init() in 05-legacy-compat.js]
      // ----- Defensive normalization (phase 5 hardening) -----
      // After Supabase Auth + production RLS, the bootstrap may receive
      // partial data (e.g. an authenticated customer can only read their
      // own user row, so appState.users may have 1 row instead of N).
      // Ensure every expected collection exists as an array so legacy
      // .find / .filter / .forEach calls don't throw on undefined.
      if (window.appState) {
        ['users','menuItems','categories','offers','orders',
         'reservations','requests','reviews','gallery','otpRecords']
          .forEach(function (k) {
            if (!Array.isArray(window.appState[k])) window.appState[k] = [];
          });
        if (!window.appState.config || typeof window.appState.config !== 'object') {
          window.appState.config = {};
        }
      }
      let heroViewportMode = window.innerWidth <= 768 ? 'mobile' : (window.innerWidth <= 1024 ? 'tablet' : 'desktop');

      function ensureOrderTimeline(order) {
        if (!order || typeof order !== 'object') return order;
        order.timeline = order.timeline && typeof order.timeline === 'object' ? order.timeline : {};
        order.timeline.placedAt = order.timeline.placedAt || order.date || Date.now();
        order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [{ status: order.status || 'Pending', time: order.timeline.placedAt }];
        order.deliveryMetrics = order.deliveryMetrics && typeof order.deliveryMetrics === 'object' ? order.deliveryMetrics : {};
        return order;
      }

      function updateOrderStatusTimeline(order, nextStatus) {
        if (!order) return;
        ensureOrderTimeline(order);
        const now = Date.now();
        const statusMap = {
          Accepted: 'acceptedAt',
          Preparing: 'preparationStartedAt',
          'Out for Delivery': 'dispatchedAt',
          Delivered: 'deliveredAt'
        };
        const key = statusMap[nextStatus];
        if (key && !order.timeline[key]) {
          order.timeline[key] = now;
        }
        if (nextStatus === 'Cancelled') {
          order.timeline.cancelledAt = now;
        }
        if (!order.statusHistory.some((entry) => entry.status === nextStatus && entry.time === now)) {
          order.statusHistory.push({ status: nextStatus, time: now });
        }
        order.status = nextStatus;
      }

      function getDashboardDateRange(rangeKey, customStart, customEnd) {
        const now = new Date();
        let start = null;
        let end = new Date(now);
        end.setHours(23, 59, 59, 999);
        if (rangeKey === 'today') {
          start = new Date(now);
          start.setHours(0, 0, 0, 0);
        } else if (rangeKey === 'yesterday') {
          start = new Date(now);
          start.setDate(start.getDate() - 1);
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setHours(23, 59, 59, 999);
        } else if (rangeKey === 'week') {
          start = new Date(now);
          start.setDate(now.getDate() - 6);
          start.setHours(0, 0, 0, 0);
        } else if (rangeKey === 'month') {
          start = new Date(now);
          start.setDate(now.getDate() - 29);
          start.setHours(0, 0, 0, 0);
        } else if (rangeKey === 'custom') {
          start = customStart ? new Date(customStart) : null;
          end = customEnd ? new Date(customEnd) : end;
          if (start) start.setHours(0, 0, 0, 0);
          if (end) end.setHours(23, 59, 59, 999);
        } else if (rangeKey === 'all') {
          start = null;
          end = null;
        }
        return { start, end };
      }

      function isWithinRange(timestamp, range) {
        if (!timestamp) return false;
        if (range.start && timestamp < range.start.getTime()) return false;
        if (range.end && timestamp > range.end.getTime()) return false;
        return true;
      }

      function formatMinutesLabel(minutes) {
        if (!Number.isFinite(minutes)) return 'N/A';
        if (minutes < 60) return `${Math.round(minutes)} min`;
        const hrs = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
      }

      function getOrderDurationMinutes(order, startKey, endKey) {
        const timeline = ensureOrderTimeline(order).timeline || {};
        if (!timeline[startKey] || !timeline[endKey]) return null;
        return Math.max(0, (timeline[endKey] - timeline[startKey]) / 60000);
      }

      function collectAnalytics(range) {
        const orders = (appState.orders || []).filter((order) => isWithinRange(order.date || order.timeline?.placedAt, range));
        const reservations = (appState.reservations || []).filter((entry) => isWithinRange(entry.date || Date.parse(entry.datetime || '') || 0, range));
        const customers = (appState.users || []).filter((user) => user.role === 'customer');
        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        const statusCounts = {
          Pending: 0,
          Accepted: 0,
          Preparing: 0,
          'Out for Delivery': 0,
          Delivered: 0,
          Cancelled: 0
        };
        const productStats = {};
        const categoryStats = {};
        let discountOrders = 0;
        let discountRevenue = 0;
        let discountValue = 0;
        orders.forEach((order) => {
          const normalizedStatus = statusCounts[order.status] !== undefined ? order.status : 'Pending';
          statusCounts[normalizedStatus] = (statusCounts[normalizedStatus] || 0) + 1;
          if (Number(order.discount || 0) > 0) {
            discountOrders++;
            discountRevenue += Number(order.total || 0);
            discountValue += Number(order.discount || 0);
          }
          (order.items || []).forEach((entry) => {
            const item = appState.menuItems.find((menuItem) => menuItem.id === entry.id);
            const itemName = entry.productName || (item ? item.name : 'Product');
            const variationSuffix = entry.variationName ? ` - ${entry.variationName}` : '';
            const statsKey = entry.lineKey || getCartLineKey(entry.id, entry.variationId || '');
            if (!productStats[statsKey]) {
              productStats[statsKey] = {
                name: `${itemName}${variationSuffix}`,
                qty: 0,
                revenue: 0,
                views: Number(item && item.viewedCount || 0),
                category: item ? item.category : -1
              };
            }
            productStats[statsKey].qty += Number(entry.qty || 0);
            productStats[statsKey].revenue += Number(entry.lineTotal || (Number(entry.unitPrice || 0) * Number(entry.qty || 0)));
            const catName = appState.categories[item && item.category]?.name || 'Other';
            categoryStats[catName] = (categoryStats[catName] || 0) + Number(entry.qty || 0);
          });
        });
        const deliveryDurations = orders.map((order) => getOrderDurationMinutes(order, 'placedAt', 'deliveredAt')).filter((value) => Number.isFinite(value));
        const prepDurations = orders.map((order) => getOrderDurationMinutes(order, 'acceptedAt', 'preparationStartedAt')).filter((value) => Number.isFinite(value));
        const newCustomers = customers.filter((user) => isWithinRange(Number(user.createdAt || 0), range));
        const returningCustomers = customers.filter((user) => (appState.orders || []).filter((order) => order.userId === user.id).length > 1);
        const activeCustomers = customers.filter((user) => orders.some((order) => order.userId === user.id));
        const viewedProducts = (appState.menuItems || []).map((item) => ({
          id: item.id,
          name: item.name,
          views: Number(item.viewedCount || 0),
          qty: Number(item.orderedCount || 0)
        })).sort((a, b) => b.views - a.views);
        const bestProducts = Object.values(productStats).sort((a, b) => b.qty - a.qty);
        const categoryLeaders = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);
        return {
          range,
          orders,
          reservations,
          customers,
          totalRevenue,
          statusCounts,
          todayOrders: (appState.orders || []).filter((order) => isWithinRange(order.date || order.timeline?.placedAt, getDashboardDateRange('today'))).length,
          yesterdayOrders: (appState.orders || []).filter((order) => isWithinRange(order.date || order.timeline?.placedAt, getDashboardDateRange('yesterday'))).length,
          weeklyOrders: (appState.orders || []).filter((order) => isWithinRange(order.date || order.timeline?.placedAt, getDashboardDateRange('week'))).length,
          monthlyOrders: (appState.orders || []).filter((order) => isWithinRange(order.date || order.timeline?.placedAt, getDashboardDateRange('month'))).length,
          todayRevenue: (appState.orders || []).filter((order) => isWithinRange(order.date || order.timeline?.placedAt, getDashboardDateRange('today'))).reduce((sum, order) => sum + Number(order.total || 0), 0),
          weeklyRevenue: (appState.orders || []).filter((order) => isWithinRange(order.date || order.timeline?.placedAt, getDashboardDateRange('week'))).reduce((sum, order) => sum + Number(order.total || 0), 0),
          monthlyRevenue: (appState.orders || []).filter((order) => isWithinRange(order.date || order.timeline?.placedAt, getDashboardDateRange('month'))).reduce((sum, order) => sum + Number(order.total || 0), 0),
          bestProducts,
          viewedProducts,
          topCategory: categoryLeaders[0] ? categoryLeaders[0][0] : 'N/A',
          hotDeals: { orders: discountOrders, revenue: discountRevenue, discountValue: discountValue },
          totalCustomers: customers.length,
          returningCustomers: returningCustomers.length,
          newCustomers: newCustomers.length,
          activeCustomers: activeCustomers.length,
          avgDelivery: deliveryDurations.length ? deliveryDurations.reduce((sum, val) => sum + val, 0) / deliveryDurations.length : null,
          fastestDelivery: deliveryDurations.length ? Math.min(...deliveryDurations) : null,
          slowestDelivery: deliveryDurations.length ? Math.max(...deliveryDurations) : null,
          avgPreparation: prepDurations.length ? prepDurations.reduce((sum, val) => sum + val, 0) / prepDurations.length : null
        };
      }

      function getHeroDeviceMode() {
        if (window.innerWidth <= 768) return 'mobile';
        if (window.innerWidth <= 1024) return 'tablet';
        return 'desktop';
      }

      function getResolvedHeroBackgroundMedia() {
        const config = (appState && appState.config && appState.config.heroBackgroundMedia) || {};
        const desktop = config.desktop || {};
        const tablet = config.tablet || {};
        const mobile = config.mobile || {};
        const device = getHeroDeviceMode();
        let preferred = desktop;
        let fallbackChain = [tablet, mobile];
        if (device === 'mobile') {
          preferred = mobile;
          fallbackChain = [tablet, desktop];
        } else if (device === 'tablet') {
          preferred = tablet;
          fallbackChain = [desktop, mobile];
        }
        const fallback = fallbackChain.find((entry) => entry && (entry.image || entry.video)) || {};
        return {
          device: device,
          image: preferred.image || fallback.image || '',
          video: preferred.video || fallback.video || '',
          hasSpecificMedia: !!(preferred.image || preferred.video)
        };
      }

      function getResolvedAnnouncementMedia() {
        const popupConfig = (appState && appState.config && appState.config.announcementPopup) || {};
        const config = popupConfig.media || {};
        const desktop = config.desktop || {};
        const tablet = config.tablet || {};
        const mobile = config.mobile || {};
        const device = getHeroDeviceMode();
        let preferred = desktop;
        let fallbackChain = [tablet, mobile];
        if (device === 'mobile') {
          preferred = mobile;
          fallbackChain = [tablet, desktop];
        } else if (device === 'tablet') {
          preferred = tablet;
          fallbackChain = [desktop, mobile];
        }
        const fallback = fallbackChain.find((entry) => entry && (entry.image || entry.video)) || {};
        return {
          device: device,
          image: preferred.image || fallback.image || '',
          video: preferred.video || fallback.video || ''
        };
      }

      function getAnnouncementSignature() {
        const popupConfig = (appState && appState.config && appState.config.announcementPopup) || {};
        const media = popupConfig.media || {};
        const desktop = media.desktop || {};
        const tablet = media.tablet || {};
        const mobile = media.mobile || {};
        return JSON.stringify({
          dI: desktop.image || '',
          dV: desktop.video || '',
          tI: tablet.image || '',
          tV: tablet.video || '',
          mI: mobile.image || '',
          mV: mobile.video || ''
        });
      }

      function hasActiveAnnouncementMedia() {
        const popupConfig = (appState && appState.config && appState.config.announcementPopup) || {};
        if (!popupConfig || popupConfig.enabled === false) return false;
        const media = popupConfig.media || {};
        return ['desktop', 'tablet', 'mobile'].some((device) => {
          const entry = media[device] || {};
          return !!(entry.image || entry.video);
        });
      }

      function closeAnnouncementPopup(markDismissed) {
        const popup = document.getElementById('announcementPopup');
        if (!popup || popup.classList.contains('hidden')) return;
        popup.classList.remove('is-visible');
        popup.setAttribute('aria-hidden', 'true');
        if (markDismissed) {
          sessionStorage.setItem('restaurantAnnouncementDismissed', getAnnouncementSignature());
        }
        window.setTimeout(() => {
          popup.classList.add('hidden');
        }, 280);
      }

      function renderAnnouncementPopup() {
        const popup = document.getElementById('announcementPopup');
        const mediaHost = document.getElementById('announcementPopupMedia');
        if (!popup || !mediaHost) return;
        mediaHost.innerHTML = '';
        if (!hasActiveAnnouncementMedia()) {
          closeAnnouncementPopup(false);
          return;
        }
        const dismissedSignature = sessionStorage.getItem('restaurantAnnouncementDismissed');
        const currentSignature = getAnnouncementSignature();
        if (dismissedSignature && dismissedSignature === currentSignature) {
          closeAnnouncementPopup(false);
          return;
        }
        const media = getResolvedAnnouncementMedia();
        if (!media.image && !media.video) {
          closeAnnouncementPopup(false);
          return;
        }
        let node;
        if (media.video) {
          node = document.createElement('video');
          node.src = media.video;
          node.controls = true;
          node.autoplay = true;
          node.muted = true;
          node.loop = true;
          node.playsInline = true;
          node.preload = 'metadata';
          if (media.image) node.poster = media.image;
        } else {
          node = document.createElement('img');
          node.src = media.image;
          node.alt = 'Announcement';
          node.loading = 'eager';
          node.decoding = 'async';
        }
        mediaHost.appendChild(node);
        popup.classList.remove('hidden');
        requestAnimationFrame(() => {
          popup.classList.add('is-visible');
          popup.setAttribute('aria-hidden', 'false');
        });
      }

      function applyHeroBackgroundMedia() {
        const heroSection = document.getElementById('heroSection');
        const heroSlidesContainer = document.getElementById('heroSlidesContainer');
        if (!heroSection || !heroSlidesContainer) return;
        const media = getResolvedHeroBackgroundMedia();
        let existingVideo = document.getElementById('heroBackgroundVideo');
        const shouldUseVideo = !!media.video;
        const shouldUseImage = !shouldUseVideo && !!media.image;
        if (shouldUseVideo) {
          heroSection.style.background = media.image ? `#050505 url(${media.image}) center center / cover no-repeat` : '#050505';
          heroSection.style.position = 'relative';
          heroSlidesContainer.style.display = 'none';
          if (!existingVideo) {
            existingVideo = document.createElement('video');
            existingVideo.id = 'heroBackgroundVideo';
            existingVideo.autoplay = true;
            existingVideo.loop = true;
            existingVideo.muted = true;
            existingVideo.playsInline = true;
            existingVideo.preload = media.device === 'mobile' ? 'metadata' : 'auto';
            existingVideo.poster = media.image || '';
            existingVideo.style.position = 'absolute';
            existingVideo.style.top = '0';
            existingVideo.style.left = '0';
            existingVideo.style.width = '100%';
            existingVideo.style.height = '100%';
            existingVideo.style.objectFit = 'cover';
            existingVideo.style.objectPosition = 'center center';
            existingVideo.style.zIndex = '0';
            existingVideo.style.pointerEvents = 'none';
            existingVideo.style.background = '#050505';
            const overlay = heroSection.querySelector('.hero-overlay');
            if (overlay) {
              heroSection.insertBefore(existingVideo, overlay);
            } else {
              heroSection.prepend(existingVideo);
            }
          }
          if (existingVideo.src !== media.video) {
            existingVideo.src = media.video;
            existingVideo.poster = media.image || '';
            existingVideo.load();
          }
          existingVideo.oncanplay = function () {
            existingVideo.play().catch(() => {});
          };
          existingVideo.onerror = function () {
            if (media.image) {
              heroSection.style.background = `#050505 url(${media.image}) center center / cover no-repeat`;
              heroSlidesContainer.style.display = 'none';
            } else {
              heroSection.style.background = 'none';
              heroSlidesContainer.style.display = '';
            }
            existingVideo.remove();
          };
          existingVideo.play().catch(() => {});
          return;
        }
        if (existingVideo) {
          existingVideo.pause();
          existingVideo.remove();
        }
        if (shouldUseImage) {
          heroSection.style.background = `#050505 url(${media.image}) center center / cover no-repeat`;
          heroSection.style.position = 'relative';
          heroSlidesContainer.style.display = 'none';
          return;
        }
        heroSection.style.background = 'none';
        heroSection.style.position = 'relative';
        heroSlidesContainer.style.display = '';
      }
      const REALTIME_EVENT_STORAGE_KEY = 'restaurantRealtimeEvent';
      const REALTIME_CHANNEL_NAME = 'restaurantRealtimeChannel';
      const REALTIME_INSTANCE_ID = generateId();
      const handledRealtimeEvents = new Set();
      const sectionAccessMap = {
        orders: ['viewOrders', 'updateOrderStatus'],
        reservations: ['viewReservations', 'approveReservations'],
        requests: ['accessCMS']
      };
      let realtimeChannel = null;
      let realtimeAudio = null;
      let realtimeAudioReady = false;
      let activeRingtoneState = null;

      function getCurrentSessionUser() {
        if (!appState || !appState.session) return null;
        var found = appState.users.find((user) => user.id === appState.session.id);
        if (found) return found;
        // Fallback stub: if user row isn't in appState yet (Supabase
        // fetch in flight), create one AND push it to appState.users.
        // Pushing is critical — without it, every call returns a fresh
        // throwaway stub and mutations to it (markSectionAsSeen,
        // notification prefs) are lost. The pushed stub will be
        // overwritten when the real row arrives via bootstrap.
        var stub = {
          id: appState.session.id,
          role: appState.session.role,
          auth_user_id: appState.session.authUserId,
          authUserId: appState.session.authUserId,
          email: '',
          displayName: appState.session.role === 'admin' ? 'Admin' :
                       appState.session.role === 'owner' ? 'Owner' : 'Staff',
          notificationPrefs: {
            soundEnabled: true,
            sectionSeenAt: { orders: 0, reservations: 0, requests: 0 },
            sections: { orders: true, reservations: true, requests: true }
          },
          sectionsAccess: undefined
        };
        appState.users.push(stub);
        return stub;
      }

      // [extracted to App.Util.escapeHtml - see js/02-util.js]

      function ensureCurrentUserNotificationPrefs() {
        const user = getCurrentSessionUser();
        if (!user) return null;
        if (!user.notificationPrefs || typeof user.notificationPrefs !== 'object') {
          user.notificationPrefs = {};
        }
        if (user.notificationPrefs.soundEnabled === undefined) {
          user.notificationPrefs.soundEnabled = true;
        }
        if (!user.notificationPrefs.sectionSeenAt || typeof user.notificationPrefs.sectionSeenAt !== 'object') {
          user.notificationPrefs.sectionSeenAt = { orders: 0, reservations: 0, requests: 0 };
        }
        ['orders', 'reservations', 'requests'].forEach((section) => {
          if (user.notificationPrefs.sectionSeenAt[section] === undefined) {
            user.notificationPrefs.sectionSeenAt[section] = 0;
          }
        });
        if (!user.notificationPrefs.sections || typeof user.notificationPrefs.sections !== 'object') {
          user.notificationPrefs.sections = { orders: true, reservations: true, requests: true };
        }
        ['orders', 'reservations', 'requests'].forEach((section) => {
          if (user.notificationPrefs.sections[section] === undefined) {
            user.notificationPrefs.sections[section] = true;
          }
        });
        return user;
      }

      function getUserRoleLabel(user) {
        if (!user) return 'Staff';
        if (user.role === 'owner') return 'Owner';
        if (user.role === 'admin') return 'Admin';
        return 'Staff';
      }

      function getUserAccessibleSections(user) {
        if (!user) return [];
        if (user.role === 'admin') {
          // Admin sees every section
          return ['dashboard', 'orders', 'reservations', 'requests',
                  'menu', 'offers', 'gallery', 'reviews',
                  'customers', 'staff', 'settings', 'popup', 'about'];
        }
        return Array.isArray(user.sectionsAccess) ? user.sectionsAccess : [];
      }

      function userCanAccessSection(user, section) {
        if (!user || !section) return false;
        if (user.role === 'admin') return true;
        return getUserAccessibleSections(user).includes(section);
      }

      function canUserReceiveNotification(user, section) {
        const normalizedUser = user || getCurrentSessionUser();
        if (!normalizedUser) return false;
        // Inline-initialize defaults on THIS user object. Previously
        // ensureCurrentUserNotificationPrefs() ran on getCurrentSessionUser's
        // return value, which (for admins whose user row isn't in
        // appState yet) is a fresh stub each call — so the mutations
        // didn't persist onto `normalizedUser`. That left
        // `normalizedUser.notificationPrefs` undefined, which happened
        // to work (treated as enabled), but was fragile.
        if (!normalizedUser.notificationPrefs || typeof normalizedUser.notificationPrefs !== 'object') {
          normalizedUser.notificationPrefs = {};
        }
        if (normalizedUser.notificationPrefs.soundEnabled === undefined) {
          normalizedUser.notificationPrefs.soundEnabled = true;
        }
        if (!normalizedUser.notificationPrefs.sections || typeof normalizedUser.notificationPrefs.sections !== 'object') {
          normalizedUser.notificationPrefs.sections = { orders: true, reservations: true, requests: true };
        }
        if (!userCanAccessSection(normalizedUser, section)) return false;
        if (window.AFGRWorkspace && !window.AFGRWorkspace.isAuthorized()) return false;
        const prefs = normalizedUser.notificationPrefs;
        // Master toggle: if soundEnabled === false (admin/staff disabled
        // ALL notifications for their account), block everything.
        if (prefs.soundEnabled === false) return false;
        const perSection = prefs.sections || {};
        return perSection[section] !== false;
      }

      function getSectionEntries(section) {
        if (section === 'orders') return Array.isArray(appState.orders) ? appState.orders : [];
        if (section === 'reservations') return Array.isArray(appState.reservations) ? appState.reservations : [];
        if (section === 'requests') return Array.isArray(appState.requests) ? appState.requests : [];
        return [];
      }

      function getEntryTimestamp(section, entry) {
        if (!entry) return 0;
        if (section === 'orders') return Number(entry.date || entry.createdAt || 0);
        if (section === 'reservations') return Number(entry.date || Date.parse(entry.datetime || '') || 0);
        if (section === 'requests') return Number(entry.timestamp || entry.createdAt || 0);
        return 0;
      }

      function getSectionLatestTimestamp(section) {
        return getSectionEntries(section).reduce((latest, entry) => {
          return Math.max(latest, getEntryTimestamp(section, entry));
        }, 0);
      }

      function getSectionUnreadCount(section) {
        const user = ensureCurrentUserNotificationPrefs();
        // Unread activity is independent of sound/push preferences.
        // Muting alerts must not make unread orders disappear from the badge.
        if (!user || !userCanAccessSection(user, section)) return 0;
        if (window.AFGRWorkspace && !window.AFGRWorkspace.isAuthorized()) return 0;
        const seenAt = Number(user.notificationPrefs.sectionSeenAt[section] || 0);
        return getSectionEntries(section).filter((entry) => getEntryTimestamp(section, entry) > seenAt).length;
      }

      function isSectionCurrentlyOpen(section) {
        const adminPanel = document.getElementById('adminPanel');
        const staffPanel = document.getElementById('staffPanel');
        if (adminPanel && adminPanel.classList.contains('active')) {
          const activeNav = document.querySelector('#adminNav li.active');
          return !!(activeNav && activeNav.dataset.target === section);
        }
        if (staffPanel && staffPanel.classList.contains('active')) {
          const activeNav = document.querySelector('#staffNav li.active');
          return !!(activeNav && activeNav.dataset.target === section);
        }
        return false;
      }

      function markSectionAsSeen(section, shouldPersist) {
        if (window.AFGRNativeSync && window.AFGRNativeSync.available && window.AFGRNativeSync.available()) {
          try { window.AFGRAndroid.postMessage(JSON.stringify({type:'read',section:section})); } catch (e) {}
        }
        const user = ensureCurrentUserNotificationPrefs();
        if (!user || !userCanAccessSection(user, section)) return;
        user.notificationPrefs.sectionSeenAt[section] = Date.now();
        if (window.AFGRServerUnread && window.AFGRServerUnread.unread) {
          window.AFGRServerUnread.unread[section] = 0;
        }
        // Android app-icon dots reflect active system notifications. Once
        // staff views a section, dismiss its old system notifications too.
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then(function (registration) {
            if (registration.active) registration.active.postMessage({ type:'afgr:section-read', section:section });
          }).catch(function () {});
        }
        if (activeRingtoneState && activeRingtoneState.section === section) {
          stopRealtimeRingtone(section);
        }
        updateRealtimeDots();
        if (shouldPersist !== false) {
          saveData();
          // Force immediate flush to Supabase so the seenAt timestamp is
          // durable before any potential page refresh. Without this, a
          // user who views a section and refreshes within 250ms would
          // see the dot return because the debounced publish hadn't
          // fired yet.
          try {
            if (App.SupabaseSync && App.SupabaseSync.flushNow) {
              App.SupabaseSync.flushNow();
            }
          } catch (e) {}
          if (window.AFGRWorkspace && window.AFGRWorkspace.refreshUnread) {
            setTimeout(function(){ window.AFGRWorkspace.refreshUnread(true); }, 1600);
          }
        }
      }

      function getRealtimeNotificationAudio() {
        const configuredTone = (appState.config && appState.config.notifications && appState.config.notifications.toneUrl) || '';
        if (realtimeAudio) {
          if (configuredTone && realtimeAudio.dataset.src !== configuredTone) {
            realtimeAudio.pause();
            realtimeAudio = null;
            // Audio is being replaced — the new element won't have the
            // user-activation flag yet. Force re-prime on next interaction.
            realtimeAudioReady = false;
          } else if (!configuredTone && realtimeAudio.dataset.src === 'generated') {
            return realtimeAudio;
          } else if (configuredTone && realtimeAudio.dataset.src === configuredTone) {
            return realtimeAudio;
          } else if (!configuredTone && realtimeAudio.dataset.src !== 'generated') {
            // Configured tone was removed — fall back to generated tone
            realtimeAudio.pause();
            realtimeAudio = null;
            realtimeAudioReady = false;
          }
        }
        function buildWavUrl() {
          const sampleRate = 22050;
          const seconds = 1.24;
          const totalSamples = Math.floor(sampleRate * seconds);
          const bytes = new ArrayBuffer(44 + totalSamples * 2);
          const view = new DataView(bytes);
          const write = (offset, text) => {
            for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
          };
          write(0, 'RIFF');
          view.setUint32(4, 36 + totalSamples * 2, true);
          write(8, 'WAVE');
          write(12, 'fmt ');
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, 1, true);
          view.setUint32(24, sampleRate, true);
          view.setUint32(28, sampleRate * 2, true);
          view.setUint16(32, 2, true);
          view.setUint16(34, 16, true);
          write(36, 'data');
          view.setUint32(40, totalSamples * 2, true);
          let offset = 44;
          for (let i = 0; i < totalSamples; i++) {
            const t = i / sampleRate;
            const envelope = Math.max(0, 1 - ((t % 0.62) / 0.62));
            const tone = Math.sin(2 * Math.PI * 740 * t) * 0.45 + Math.sin(2 * Math.PI * 988 * t) * 0.28;
            const burst = (t % 0.62) < 0.36 ? tone : 0;
            view.setInt16(offset, Math.max(-1, Math.min(1, burst * envelope)) * 32767, true);
            offset += 2;
          }
          return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
        }
        const audioSource = configuredTone || buildWavUrl();
        realtimeAudio = new Audio(audioSource);
        realtimeAudio.dataset.src = configuredTone || 'generated';
        realtimeAudio.loop = true;
        realtimeAudio.preload = 'auto';
        realtimeAudio.playsInline = true;
        return realtimeAudio;
      }

      // Audio unlock banner — shown when the browser's autoplay policy
      // blocks our notification sound (typical after page refresh, since
      // no user interaction has happened yet). A single click anywhere
      // on this banner satisfies the autoplay policy for the rest of
      // the session, restoring ringtone playback.
      //
      // This is the standard pattern used by Slack, WhatsApp Web,
      // Discord, etc. for the same problem — there is no way around
      // the browser's policy except to ask the user to click once.
      function maybeShowAudioUnlockBanner() {
        // Only show if admin or staff panel is active (don't bother
        // customers with this)
        var adminPanel = document.getElementById('adminPanel');
        var staffPanel = document.getElementById('staffPanel');
        var inPanel = (adminPanel && adminPanel.classList.contains('active')) ||
                      (staffPanel && staffPanel.classList.contains('active'));
        if (!inPanel) return;
        if (document.getElementById('audioUnlockBanner')) return;   // already shown
        if (realtimeAudioReady) return;                              // already unlocked

        var banner = document.createElement('div');
        banner.id = 'audioUnlockBanner';
        banner.className = 'audio-unlock-banner';
        banner.innerHTML =
          '<span class="audio-unlock-icon">🔔</span>' +
          '<span class="audio-unlock-text">Tap here to enable notification sound</span>' +
          '<span class="audio-unlock-close" aria-label="Dismiss">&times;</span>';
        banner.addEventListener('click', function (event) {
          if (event.target.classList.contains('audio-unlock-close')) {
            hideAudioUnlockBanner();
            return;
          }
          // The click itself satisfies the autoplay gesture — try prime.
          primeRealtimeAudio().then(function () {
            if (realtimeAudioReady) {
              hideAudioUnlockBanner();
              // Play a brief test ding so the user knows it worked
              try {
                var testAudio = getRealtimeNotificationAudio();
                testAudio.currentTime = 0;
                var p = testAudio.play();
                if (p && typeof p.then === 'function') {
                  // Stop after 1.5 seconds so it's just a confirmation chirp
                  setTimeout(function () {
                    try { testAudio.pause(); testAudio.currentTime = 0; } catch (e) {}
                  }, 1500);
                }
              } catch (e) {}
            }
          });
        });
        document.body.appendChild(banner);
      }

      function hideAudioUnlockBanner() {
        var b = document.getElementById('audioUnlockBanner');
        if (b && b.parentNode) b.parentNode.removeChild(b);
      }

      function primeRealtimeAudio() {
        // Create the audio element if it doesn't exist yet. This is the
        // SAME element that will later be used to play notifications,
        // so priming this specific element counts toward the browser's
        // autoplay policy for subsequent unattended .play() calls.
        const audio = getRealtimeNotificationAudio();
        if (realtimeAudioReady) return Promise.resolve();
        // Also create/resume an AudioContext. AudioContext follows
        // similar autoplay rules but in many browsers (Chrome, Edge)
        // a resumed context grants broader unlock than a single <audio>
        // play. Once resumed, the audio element's play() typically
        // succeeds even after page refresh, as long as the user has
        // interacted with the origin during this browser session.
        try {
          if (!window.__realtimeAudioCtx) {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (AC) {
              window.__realtimeAudioCtx = new AC();
              // Silent burst to confirm the context is unlocked
              var osc = window.__realtimeAudioCtx.createOscillator();
              var gain = window.__realtimeAudioCtx.createGain();
              gain.gain.value = 0;   // silent
              osc.connect(gain);
              gain.connect(window.__realtimeAudioCtx.destination);
              osc.start(0);
              osc.stop(window.__realtimeAudioCtx.currentTime + 0.01);
            }
          }
          if (window.__realtimeAudioCtx && window.__realtimeAudioCtx.state === 'suspended') {
            window.__realtimeAudioCtx.resume().catch(function () {});
          }
        } catch (e) {}
        // Browser autoplay policy: play() must be called within a user
        // gesture handler to unlock subsequent unattended playback.
        audio.muted = true;
        return audio.play()
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = false;
            realtimeAudioReady = true;
            console.info('[Audio] primed successfully — notifications will play');
            // Hide the unlock banner if it was showing
            hideAudioUnlockBanner();
          })
          .catch((err) => {
            audio.muted = false;
            console.info('[Audio] prime failed (will retry on next interaction):', err.name);
            // Show the unlock banner so user can fix it with one click
            maybeShowAudioUnlockBanner();
          });
      }

      // Aggressive priming: ANY user interaction on the page should be
      // an opportunity to (re-)prime audio. Listeners are NOT `once`
      // because refresh resets `realtimeAudioReady` and we want every
      // subsequent click to try priming if needed. The function itself
      // short-circuits if already primed (cheap no-op).
      //
      // Without this, after a refresh, the user might never click
      // anywhere on the page before an order arrives — and the
      // notification would fire silently. Now, the moment the user
      // touches the keyboard, mouse, or screen anywhere, audio gets
      // primed for the rest of the session.
      function installAudioPrimingListeners() {
        // Capture phase + non-passive listeners catch interactions
        // earliest, even on elements that call stopPropagation.
        var primeEvents = ['pointerdown', 'mousedown', 'touchstart', 'keydown', 'click'];
        primeEvents.forEach(function (evt) {
          document.addEventListener(evt, primeRealtimeAudio, { capture: true, passive: true });
        });
        // Also re-prime if the page becomes visible again (user switched tabs)
        document.addEventListener('visibilitychange', function () {
          if (!document.hidden && !realtimeAudioReady) {
            // Attempt silent re-prime; will succeed if browser remembers
            // recent user interaction with the origin.
            primeRealtimeAudio();
          }
        });
      }

      function isNotificationSoundEnabled(section) {
        const user = ensureCurrentUserNotificationPrefs();
        if (!user) {
          console.info('[Audio] sound disabled — no session user');
          return false;
        }
        const configEnabled = !appState.config.notifications || appState.config.notifications.soundEnabled !== false;
        if (!configEnabled) {
          console.info('[Audio] sound disabled — site-wide soundEnabled is false');
          return false;
        }
        if (user.notificationPrefs.soundEnabled === false) {
          console.info('[Audio] sound disabled — user master toggle is off (role:', user.role, ')');
          return false;
        }
        if (section && !canUserReceiveNotification(user, section)) {
          console.info('[Audio] sound disabled — per-section toggle for', section, 'is off (role:', user.role, ')');
          return false;
        }
        console.info('[Audio] sound ENABLED for', section, '— role:', user.role);
        return true;
      }

      function startRealtimeRingtone(section, entryId) {
        const audioEnabled = isNotificationSoundEnabled(section);
        if (audioEnabled) {
          const audio = getRealtimeNotificationAudio();
          activeRingtoneState = { section: section, entryId: entryId || null };
          audio.currentTime = 0;
          var playAttempt = audio.play();
          if (playAttempt && typeof playAttempt.then === 'function') {
            playAttempt.catch(function (err) {
              console.warn('[Audio] play failed:', err.name, '— attempting re-prime');
              realtimeAudioReady = false;
              primeRealtimeAudio().then(function () {
                if (realtimeAudioReady) {
                  audio.currentTime = 0;
                  audio.play().catch(function (e2) {
                    console.warn('[Audio] retry play failed:', e2.name,
                      '— showing unlock banner');
                    // Browser is firmly blocking audio. Show the
                    // unlock banner so user can fix it with one click.
                    maybeShowAudioUnlockBanner();
                  });
                } else {
                  // Prime itself failed. Show unlock banner.
                  maybeShowAudioUnlockBanner();
                }
              });
            });
          }
        } else {
          activeRingtoneState = { section: section, entryId: entryId || null };
        }
        showRealtimeAlertBanner(section, entryId);
      }

      var afgrVisiblePushKeys = new Map();
      function afgrRememberVisibleAlert(section, entryId) {
        if (!entryId) return true;
        var now = Date.now();
        var key = section + ':' + String(entryId);
        if (afgrVisiblePushKeys.has(key) && now - afgrVisiblePushKeys.get(key) < 12000) return false;
        afgrVisiblePushKeys.set(key, now);
        if (afgrVisiblePushKeys.size > 80) {
          afgrVisiblePushKeys.forEach(function (time, id) { if (now - time > 60000) afgrVisiblePushKeys.delete(id); });
        }
        return true;
      }
      window.AFGRShowIncomingPushCard = function (section, entryId, title, body) {
        if (!['orders','reservations','requests'].includes(section)) return;
        if (document.visibilityState === 'hidden') return;
        if (!window.AFGRWorkspace || !window.AFGRWorkspace.isAuthorized || !window.AFGRWorkspace.isAuthorized()) return;
        showRealtimeAlertBanner(section, entryId);
        var titleEl = document.getElementById('realtimeAlertTitle');
        var bodyEl = document.getElementById('realtimeAlertMsg');
        if (titleEl && title) titleEl.textContent = String(title).slice(0,90);
        if (bodyEl && body) bodyEl.textContent = String(body).slice(0,190);
      };
      function showRealtimeAlertBanner(section, entryId) {
        if (!afgrRememberVisibleAlert(section, entryId)) return;
        var banner = document.getElementById('realtimeAlertBanner');
        if (!banner) return;
        var titleEl  = document.getElementById('realtimeAlertTitle');
        var msgEl    = document.getElementById('realtimeAlertMsg');
        var iconEl   = document.getElementById('realtimeAlertIcon');
        var viewBtn  = document.getElementById('realtimeAlertViewBtn');
        var dismissBtn = document.getElementById('realtimeAlertDismissBtn');
        if (!titleEl || !msgEl || !viewBtn || !dismissBtn) return;

        // Look up entry by id for richer body text
        var entry = {};
        try {
          var entries = getSectionEntries(section);
          entry = (entries || []).find(function (it) { return it.id === entryId; }) || {};
        } catch (e) {}

        // Different icons per section for quick visual recognition
        if (iconEl) {
          iconEl.textContent =
            section === 'orders'       ? '🛒' :
            section === 'reservations' ? '🍽️' :
            section === 'requests'     ? '✉️' : '🔔';
        }
        titleEl.textContent = getNotificationTitleForSection(section);
        msgEl.textContent   = getNotificationBody(section, entry);
        banner.dataset.section = section;
        banner.dataset.entryId = entryId || '';
        banner.style.display = '';

        // Wire buttons (replace handlers each show to keep them in sync
        // with the latest section/entry).
        viewBtn.onclick = function () {
          var s = banner.dataset.section || section;
          stopRealtimeRingtone();
          hideRealtimeAlertBanner();
          // Match a background push tap: open the exact order when possible.
          if (window.AFGRWorkspace && typeof window.AFGRWorkspace.receiveNotification === 'function' &&
              ['orders', 'reservations', 'requests'].includes(s)) {
            window.AFGRWorkspace.receiveNotification(s, banner.dataset.entryId || null);
          } else if (typeof focusRealtimeSection === 'function') {
            focusRealtimeSection(s);
          }
        };
        dismissBtn.onclick = function () {
          stopRealtimeRingtone();
          hideRealtimeAlertBanner();
        };
      }

      function hideRealtimeAlertBanner() {
        var banner = document.getElementById('realtimeAlertBanner');
        if (banner) banner.style.display = 'none';
      }

      // Bridge function called by 13-supabase-sync.js when a fresh row
      // arrives via cross-device realtime (orders/reservations/requests).
      // This is the missing piece that made Phase A only work for events
      // created in the same browser — without this, Device B would never
      // hear the ringtone for an order placed on Device A.
      window.notifyRealtimeInsertFromRemote = function (stateKey, rowData) {
        try {
          var user = getCurrentSessionUser();
          if (!user) {
            console.info('[Notify] skipped — no session user');
            return;
          }
          if (!canUserReceiveNotification(user, stateKey)) {
            console.info('[Notify] skipped for', stateKey, '— role:', user.role,
              '| sound:', user.notificationPrefs && user.notificationPrefs.soundEnabled,
              '| section:', user.notificationPrefs && user.notificationPrefs.sections && user.notificationPrefs.sections[stateKey]);
            return;
          }
          // A new item invalidates the previous backend badge snapshot.
          // Refresh after the database event reaches the cloud, without
          // blocking the new-activity banner or ringtone.
          if (window.AFGRServerUnread) window.AFGRServerUnread.at = 0;
          if (window.AFGRWorkspace && window.AFGRWorkspace.refreshUnread) {
            setTimeout(function(){ window.AFGRWorkspace.refreshUnread(true); }, 800);
          }
          // Even if the Orders/Reservations/Requests section is already
          // visible, show the compact notification card. Don't play a new
          // ringtone while the employee is actively viewing that section.
          if (isSectionCurrentlyOpen(stateKey)) {
            if (typeof updateRealtimeDots === 'function') updateRealtimeDots();
            showRealtimeAlertBanner(stateKey, rowData && rowData.id);
            return;
          }
          var entryId = rowData && rowData.id ? rowData.id : null;
          console.info('[Notify] firing for', stateKey, 'role:', user.role, 'entry:', entryId);
          startRealtimeRingtone(stateKey, entryId);
          showRealtimeBrowserNotification(stateKey, rowData || {});
        } catch (e) {
          console.warn('[Notify] remote insert handler failed', e);
        }
      };

      function stopRealtimeRingtone(section, entryId) {
        if (!activeRingtoneState) {
          // Even with no active ringtone state, ensure the banner is
          // hidden in case a sound failure left it visible.
          hideRealtimeAlertBanner();
          return;
        }
        const sectionMatches = !section || activeRingtoneState.section === section;
        const entryMatches = !entryId || activeRingtoneState.entryId === entryId;
        if (!sectionMatches || !entryMatches) return;
        const audio = getRealtimeNotificationAudio();
        audio.pause();
        audio.currentTime = 0;
        activeRingtoneState = null;
        hideRealtimeAlertBanner();
      }

      function focusRealtimeSection(section) {
        if (!section) return;
        sessionStorage.setItem('restaurantPendingAdminSection', section);
        const user = getCurrentSessionUser();
        if (!user) return;
        if (document.getElementById('adminPanel').classList.contains('active') && user.role === 'admin') {
          setActiveNavItem('adminNav', section);
          renderAdminSection(section);
          return;
        }
        if (document.getElementById('staffPanel').classList.contains('active') && userCanAccessSection(user, section)) {
          setActiveNavItem('staffNav', section);
          renderStaffSection(section);
          return;
        }
        if (user.role === 'admin') {
          loadAdminPanel();
        } else if (userCanAccessSection(user, section)) {
          loadStaffPanel();
        }
      }

      function getNotificationTitleForSection(section) {
        if (section === 'orders') return 'Al Fursan · New Order';
        if (section === 'reservations') return 'Al Fursan · New Reservation';
        if (section === 'requests') return 'Al Fursan · New Request';
        return 'New Activity';
      }

      function getNotificationBody(section, entry) {
        if (section === 'orders') {
          return `${entry.customer?.name || 'Customer'} placed an order${entry.total ? ` • AED ${Number(entry.total).toFixed(2)}` : ''}`;
        }
        if (section === 'reservations') {
          return `${entry.name || 'Guest'} requested a table${entry.guests ? ` • ${entry.guests} guests` : ''}`;
        }
        if (section === 'requests') {
          return `${entry.name || 'Customer'} sent a new request`;
        }
        return 'Open the admin panel to review the latest activity.';
      }

      async function showRealtimeBrowserNotification(section, entry) {
        // The realtime listener already shows AFGR's in-app banner and plays
        // the configured sound. A second OS notification emitted by the open
        // browser is Chrome-attributed, and may duplicate the true background
        // Web Push notification arriving from the Supabase push trigger.
        // Only the service worker's `push` event creates system notifications.
        console.info('[AFGR Push] foreground alert handled in-app; OS notification owned by Web Push', section);
      }

      // Match the established per-user sectionSeenAt unread markers to the
      // OS app badge. This is a feature-detected enhancement: Android owns
      // installed-app dots/counts through its notification tray.
      function refreshAFGRAppBadge() {
        var isAuthorized = window.AFGRWorkspace && window.AFGRWorkspace.isAuthorized && window.AFGRWorkspace.isAuthorized();
        var user = isAuthorized ? ensureCurrentUserNotificationPrefs() : null;
        var backed = window.AFGRServerUnread;
        var useBackend = !!(user && backed && backed.unread && Date.now()-backed.at < 120000);
        function sectionCount(section) {
          if (!user || !userCanAccessSection(user,section)) return 0;
          return useBackend ? Math.max(0,Number(backed.unread[section]||0)) : getSectionUnreadCount(section);
        }
        var total = user ? ['orders','reservations','requests'].reduce(function(sum,section){
          return sum + sectionCount(section);
        },0) : 0;
        window.AFGRUnreadCount = total;
        if (window.AFGRNativeSync && window.AFGRNativeSync.badge) {
          window.AFGRNativeSync.badge(total);
        }

        document.querySelectorAll('[data-afgr-account-badge]').forEach(function (badge) {
          badge.textContent = total > 99 ? '99+' : total > 0 ? String(total) : '';
          badge.hidden = total <= 0;
          badge.setAttribute('aria-label', total > 0 ? total + ' unread management items' : 'No unread management items');
        });
        if (typeof navigator.setAppBadge === 'function' && total > 0) {
          Promise.resolve(navigator.setAppBadge(total)).catch(function () {});
        } else if (typeof navigator.clearAppBadge === 'function' && total === 0) {
          Promise.resolve(navigator.clearAppBadge()).catch(function () {});
        }
        // On platforms without numeric OS badges, keep a visible count in
        // the management navigation alongside the existing red unread dot.
        document.querySelectorAll('#adminNav li[data-target], #staffNav li[data-target]').forEach(function (item) {
          var section = item.dataset.target;
          var dot = item.querySelector('.realtime-dot');
          if (!dot || ['orders','reservations','requests'].indexOf(section) === -1) return;
          var count = sectionCount(section);
          dot.textContent = count > 99 ? '99+' : count ? String(count) : '';
          dot.setAttribute('aria-label',count ? count + ' unread' : 'No unread items');
          dot.classList.toggle('afgr-unread-count', count > 0);
        });
        return total;
      }
      window.AFGRBadge = {
        refresh: refreshAFGRAppBadge,
        applyServer: function (response) {
          if (!response || !response.unread) return;
          window.AFGRServerUnread = {unread:response.unread, at:Date.now()};
          refreshAFGRAppBadge();
        },
        clear: function () {
          window.AFGRServerUnread = null;
          window.AFGRUnreadCount = 0;
          if (typeof navigator.clearAppBadge === 'function') {
            Promise.resolve(navigator.clearAppBadge()).catch(function () {});
          }
        }
      };

      function updateRealtimeDots() {
        const user = ensureCurrentUserNotificationPrefs();
        ['adminNav', 'staffNav'].forEach((navId) => {
          document.querySelectorAll(`#${navId} li[data-target]`).forEach((item) => {
            const section = item.dataset.target;
            const dot = item.querySelector('.realtime-dot');
            if (!dot) return;
            const active = !!user && userCanAccessSection(user, section) && getSectionUnreadCount(section) > 0;
            dot.classList.toggle('active', active);
          });
        });
        refreshAFGRAppBadge();
      }

      function setActiveNavItem(navId, sectionId) {
        document.querySelectorAll(`#${navId} li`).forEach((el) => {
          el.classList.toggle('active', el.dataset.target === sectionId);
        });
      }

      function decorateNavItem(li, label) {
        li.innerHTML = `<span class="nav-label-wrap"><span>${label}</span><span class="realtime-dot" aria-hidden="true"></span></span>`;
      }

      function consumePendingRealtimeSection(navId, renderer) {
        const pending = sessionStorage.getItem('restaurantPendingAdminSection');
        if (!pending) return false;
        const target = document.querySelector(`#${navId} li[data-target="${pending}"]`);
        if (!target) return false;
        setActiveNavItem(navId, pending);
        renderer(pending);
        sessionStorage.removeItem('restaurantPendingAdminSection');
        return true;
      }

      function syncStateFromStorage() {
        const currentSession = appState && appState.session ? JSON.parse(JSON.stringify(appState.session)) : null;
        const currentGallery = Array.isArray(appState.gallery) ? appState.gallery.slice() : [];
        const nextState = loadData();
        nextState.session = currentSession;
        if (Array.isArray(nextState.gallery) && currentGallery.length) {
          nextState.gallery = nextState.gallery.map((item) => {
            const cached = currentGallery.find((galleryItem) => galleryItem.id === item.id && galleryItem.data);
            return cached ? Object.assign({}, item, { data: cached.data }) : item;
          });
        }
        appState = nextState;
      }

      function refreshRealtimeViews(sectionHint) {
        if (document.getElementById('website').style.display !== 'none') {
          buildWebsite();
        }
        if (document.getElementById('adminPanel').classList.contains('active')) {
          const activeNav = document.querySelector('#adminNav li.active');
          if (activeNav) renderAdminSection(activeNav.dataset.target);
        }
        if (document.getElementById('staffPanel').classList.contains('active')) {
          const activeNav = document.querySelector('#staffNav li.active');
          if (activeNav) renderStaffSection(activeNav.dataset.target);
        }
        // Customer-facing history modals: re-render in place if currently open
        // so the customer sees new reservations / requests / orders live
        // without having to close and re-open the modal.
        try {
          var orderModal = document.getElementById('orderHistoryModal');
          if (orderModal && orderModal.classList.contains('active')
              && typeof openOrderHistoryModal === 'function') {
            openOrderHistoryModal();
          }
          var resModal = document.getElementById('reservationHistoryModal');
          if (resModal && resModal.classList.contains('active')
              && typeof openReservationHistoryModal === 'function') {
            openReservationHistoryModal();
          }
          var reqModal = document.getElementById('requestHistoryModal');
          if (reqModal && reqModal.classList.contains('active')
              && typeof openRequestHistoryModal === 'function') {
            openRequestHistoryModal();
          }
        } catch (e) {}
        updateRealtimeDots();
        if (sectionHint && isSectionCurrentlyOpen(sectionHint)) {
          markSectionAsSeen(sectionHint, false);
        }
      }

      function handleRealtimePayload(payload) {
        if (!payload || !payload.id || payload.origin === REALTIME_INSTANCE_ID || handledRealtimeEvents.has(payload.id)) return;
        handledRealtimeEvents.add(payload.id);
        syncStateFromStorage();
        refreshRealtimeViews(payload.section);
        const user = getCurrentSessionUser();
        if (!user || !canUserReceiveNotification(user, payload.section)) return;
        if (!isSectionCurrentlyOpen(payload.section)) {
          startRealtimeRingtone(payload.section, payload.entryId || null);
        }
        const entry = getSectionEntries(payload.section).find((item) => item.id === payload.entryId) || {};
        showRealtimeBrowserNotification(payload.section, entry);
      }

      function publishRealtimePayload(section, entry) {
        const payload = {
          id: generateId(),
          origin: REALTIME_INSTANCE_ID,
          section: section,
          entryId: entry && entry.id ? entry.id : null,
          timestamp: Date.now()
        };
        handledRealtimeEvents.add(payload.id);
        try {
          localStorage.setItem(REALTIME_EVENT_STORAGE_KEY, JSON.stringify(payload));
        } catch (error) {
          console.warn('Realtime storage event failed', error);
        }
        if (realtimeChannel) {
          try {
            realtimeChannel.postMessage(payload);
          } catch (error) {
            console.warn('Realtime broadcast failed', error);
          }
        }
        const user = getCurrentSessionUser();
        if (user && canUserReceiveNotification(user, section) && !isSectionCurrentlyOpen(section)) {
          startRealtimeRingtone(section, entry && entry.id ? entry.id : null);
          showRealtimeBrowserNotification(section, entry || {});
        }
        updateRealtimeDots();
      }

      async function registerInlineServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        // PHASE C: register the real /sw.js file (not an inline blob).
        // A blob-URL service worker cannot handle Web Push subscriptions
        // — push requires a service worker served from a same-origin URL
        // so the browser can keep it alive across reboots.
        try {
          var reg = await navigator.serviceWorker.register('./sw.js?v=20261031-mobile-alert-check-v8', {scope:'./'});
          console.info('[SW] registered at', reg.scope);
          // Once active, attempt to subscribe to push (no-op if VAPID key
          // not configured or user hasn't granted permission).
          if (typeof window.subscribeToPushNotifications === 'function') {
            window.subscribeToPushNotifications().catch(function (e) {
              console.info('[Push] subscription deferred:', e && e.message);
            });
          }
        } catch (error) {
          console.warn('Service worker registration failed', error);
        }
      }

      /* ======================================================================
       * PHASE C — Web Push subscription
       * ======================================================================
       * Subscribes the current device to Web Push and stores the subscription
       * in Supabase's `push_subscriptions` table. A Supabase Edge Function
       * (separately deployed) sends push messages to these endpoints when
       * new orders/reservations/requests arrive in the database.
       *
       * Requires:
       *   - VAPID public key in App.Config.VAPID_PUBLIC_KEY
       *   - /sw.js registered (handled by registerInlineServiceWorker above)
       *   - Notification permission granted by the user
       *   - push_subscriptions table exists in Supabase (run PHASE_C_SETUP.sql)
       *
       * If VAPID key is missing, this is a no-op. Phase A/B alerts still work.
       * ====================================================================== */
      function urlBase64ToUint8Array(b64) {
        var padding = '='.repeat((4 - b64.length % 4) % 4);
        var s = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
        var raw = atob(s);
        var bytes = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        return bytes;
      }

      window.subscribeToPushNotifications = async function () {
        if (!App.Services.Auth || !App.Services.Auth.isVerified || !App.Services.Auth.isVerified()) return null;
        var current = App.Services.Auth.session();
        if (!current || ['admin','staff','owner'].indexOf(current.role) < 0) return null;
        if (window.AFGRWorkspace && !window.AFGRWorkspace.isAuthorized()) return null;
        var vapidKey = (App.Config && App.Config.VAPID_PUBLIC_KEY) || '';
        if (!vapidKey) {
          console.info('[Push] VAPID public key not configured — skipping subscription');
          return null;
        }
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          console.info('[Push] not supported in this browser');
          return null;
        }
        if (Notification.permission !== 'granted') {
          console.info('[Push] notification permission not granted yet');
          return null;
        }
        // The service worker may be unavailable while offline. Limit waiting.
        var reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise(function (_, reject) {
            setTimeout(function () { reject(new Error('Service worker not ready')); }, 12000);
          })
        ]);
        if (window.AFGRWorkspace && !window.AFGRWorkspace.isAuthorized()) return null;
        var existing = await reg.pushManager.getSubscription();
        var repairedVersion = 'afgr-webpush-20261028-webapk-binding-v1';
        var isStandalonePWA = !!((window.matchMedia &&
          window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true);
        var shouldRepair = false;
        try {
          // A browser push endpoint can belong to a previously signed-in
          // employee. RLS correctly denies reassigning that row, so rotate
          // a stale endpoint when the authenticated staff identity changes.
          var boundUser = localStorage.getItem('afgrPushBoundAuthUserId');
          var currentUser = String(current.authUserId || '');
          var changedAccount = !!(boundUser && currentUser && boundUser !== currentUser);
          shouldRepair = changedAccount ||
            localStorage.getItem('afgrPushDeviceVersion') !== repairedVersion ||
            (isStandalonePWA && localStorage.getItem('afgrPushBindingMode') !== 'standalone');
        } catch (e) { shouldRepair = isStandalonePWA; }
        // A subscription originally created in a Chrome tab may remain
        // browser-attributed after the site is installed as a WebAPK. Rotate
        // once when first opened standalone to let Chrome update the WebAPK
        // notification permission/registration delegation.

        // One-time device refresh after correcting the old push backend.  Many
        // previously saved endpoints are expired (HTTP 410). Chrome may retain
        // an unusable subscription locally until it is explicitly rotated.
        if (existing && shouldRepair) {
          try {
            var formerEndpoint = existing.endpoint;
            if (await existing.unsubscribe()) {
              existing = null;
              // Nonfatal: RLS-authenticated deletion while the staff JWT exists.
              if (App.Supabase && App.Supabase.client) {
                var oldRemoval = await App.Supabase.client.from('push_subscriptions')
                  .delete().eq('endpoint', formerEndpoint);
                if (oldRemoval && oldRemoval.error) console.info('[Push] old device endpoint will expire server-side');
              }
              console.info('[Push] refreshed older device subscription');
            }
          } catch (e) {
            console.warn('[Push] device refresh unavailable; will retry', e);
          }
        }
        if (existing) {
          var saved = await uploadPushSubscription(existing);
          if (saved) {
            try {
              localStorage.setItem('afgrPushDeviceVersion', repairedVersion);
              if (isStandalonePWA) localStorage.setItem('afgrPushBindingMode', 'standalone');
              localStorage.setItem('afgrPushBoundAuthUserId', String(current.authUserId || ''));
            } catch (e) {}
          }
          return saved ? existing : null;
        }
        try {
          var subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey)
          });
          console.info('[Push] subscribed');
          var savedNew = await uploadPushSubscription(subscription);
          if (savedNew) {
            try {
              localStorage.setItem('afgrPushDeviceVersion', repairedVersion);
              if (isStandalonePWA) localStorage.setItem('afgrPushBindingMode', 'standalone');
              localStorage.setItem('afgrPushBoundAuthUserId', String(current.authUserId || ''));
            } catch (e) {}
          }
          return savedNew ? subscription : null;
        } catch (err) {
          console.warn('[Push] subscribe failed', err);
          return null;
        }
      };

      // Registration is triggered by the SW and verified-session startup.
      // Serialize them so a device is not unsubscribed by a concurrent call.
      (function () {
        var originalSubscribe = window.subscribeToPushNotifications;
        var running = null;
        window.subscribeToPushNotifications = function () {
          if (running) return running;
          running = Promise.resolve().then(originalSubscribe).finally(function () { running = null; });
          return running;
        };
      })();

      async function uploadPushSubscription(subscription) {
        try {
          if (!App.Supabase || !App.Supabase.client) return false;
          // An async subscribe may finish AFTER the user signed out or lost
          // access. Never register a stale subscription with Supabase.
          if (window.AFGRWorkspace && !window.AFGRWorkspace.isAuthorized()) return false;
          if (!App.Services.Auth || !App.Services.Auth.isVerified || !App.Services.Auth.isVerified()) return false;
          var sess = appState && appState.session;
          if (!sess) return false;
          var sub = subscription.toJSON ? subscription.toJSON() : subscription;
          var payload = {
            user_id:    sess.id,
            auth_user_id: sess.authUserId || null,
            endpoint:   sub.endpoint,
            p256dh:     (sub.keys && sub.keys.p256dh) || '',
            auth:       (sub.keys && sub.keys.auth) || '',
            role:       sess.role || 'customer',
            user_agent: (navigator.userAgent || '').slice(0, 200),
            updated_at: new Date().toISOString()
          };
          var res = await App.Supabase.client
            .from('push_subscriptions')
            .upsert([payload], { onConflict: 'endpoint' });
          if (res && res.error) {
            console.warn('[Push] subscription upload failed', res.error.message);
            return false;
          } else {
            try { localStorage.setItem('afgrLastPushEndpoint', sub.endpoint); } catch (e) {}
            console.info('[Push] subscription saved to Supabase');
            return true;
          }
        } catch (e) {
          console.warn('[Push] subscription upload error', e);
          return false;
        }
      }

      window.unsubscribeFromPushNotifications = async function () {
        var serverRemoved = true;
        var browserRemoved = true;
        try {
          var endpoint = '';
          var reg = null, sub = null;
          if ('serviceWorker' in navigator) {
            reg = await navigator.serviceWorker.getRegistration();
            if (reg && reg.pushManager) sub = await reg.pushManager.getSubscription();
          }
          endpoint = (sub && sub.endpoint) || localStorage.getItem('afgrLastPushEndpoint') || '';
          // Delete the server-side row while the user's JWT is available.
          if (endpoint && App.Supabase && App.Supabase.client) {
            try {
              var result = await App.Supabase.client.from('push_subscriptions')
                .delete().eq('endpoint', endpoint);
              if (result && result.error) {
                serverRemoved = false;
                console.warn('[Push] subscription delete failed', result.error.message);
              }
            } catch (e) { serverRemoved = false; console.warn('[Push] server delete unavailable', e); }
          } else if (endpoint) {
            serverRemoved = false;
          }
          // Always stop delivery at the browser, even if the network is down.
          if (sub) {
            try { browserRemoved = (await sub.unsubscribe()) !== false; }
            catch (e) { browserRemoved = false; console.warn('[Push] local unsubscribe error', e); }
          }
          if (serverRemoved) {
            try {
              localStorage.removeItem('afgrLastPushEndpoint');
              localStorage.removeItem('afgrPushBoundAuthUserId');
            } catch (e) {}
          } else if (endpoint) {
            // Retain the endpoint so a later visit can retry server cleanup.
            try { localStorage.setItem('afgrLastPushEndpoint', endpoint); } catch (e) {}
          }
          console.info('[Push] device unsubscribe result:', serverRemoved && browserRemoved);
          return serverRemoved && browserRemoved;
        } catch (e) {
          console.warn('[Push] unsubscribe error', e);
          return false;
        }
      };

      function initRealtimeSystem() {
        const hashSection = String(window.location.hash || '').replace('#', '').trim();
        if (['orders', 'reservations', 'requests'].includes(hashSection)) {
          sessionStorage.setItem('restaurantPendingAdminSection', hashSection);
        }
        // First, try to prime audio immediately. May succeed if the
        // browser remembers a recent user interaction with this site.
        primeRealtimeAudio();
        // Install PERSISTENT audio priming listeners. Every user
        // interaction (click, keypress, touch) is an opportunity to
        // (re-)prime. Crucial for the post-refresh case: after F5,
        // realtimeAudioReady is false, but as soon as the user clicks
        // anywhere on the panel (e.g. a sidebar item), audio re-primes
        // and subsequent notifications play normally.
        installAudioPrimingListeners();
        if ('BroadcastChannel' in window) {
          realtimeChannel = new BroadcastChannel(REALTIME_CHANNEL_NAME);
          realtimeChannel.onmessage = (event) => handleRealtimePayload(event.data);
        }
        window.addEventListener('storage', (event) => {
          if (event.key === 'restaurantData') {
            syncStateFromStorage();
            refreshRealtimeViews();
            return;
          }
          if (event.key === REALTIME_EVENT_STORAGE_KEY && event.newValue) {
            try {
              handleRealtimePayload(JSON.parse(event.newValue));
            } catch (error) {
              console.warn('Invalid realtime payload', error);
            }
          }
        });
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'focus-section') {
              if (window.AFGRWorkspace) window.AFGRWorkspace.receiveNotification(event.data.section, event.data.entryId);
              else focusRealtimeSection(event.data.section);
            } else if (event.data && event.data.type === 'afgr:push-visible') {
              if (typeof window.AFGRShowIncomingPushCard === 'function') {
                window.AFGRShowIncomingPushCard(event.data.section,event.data.entryId,event.data.title,event.data.body);
              }
              if (window.AFGRWorkspace && window.AFGRWorkspace.refreshUnread) {
                setTimeout(function(){ window.AFGRWorkspace.refreshUnread(true); }, 850);
              }
            } else if (event.data && event.data.type === 'afgr:resubscribe-push') {
              // Browser rotated a Web Push endpoint while this app was open.
              // Only the verified frontend can re-bind the new endpoint to the
              // authenticated staff account in Supabase.
              if (window.AFGRWorkspace && window.AFGRWorkspace.isAuthorized()) {
                window.AFGRWorkspace.restorePush(true);
              }
            }
          });
        }
        registerInlineServiceWorker();
        updateRealtimeDots();
      }

        /* TEST HOOK FOR GALLERY SCROLL DEBUGGING
         * When the gallery is empty, prepopulate it with sample images for
         * debugging the infinite scroll.  This block will insert four
         * coloured test images into the gallery (red, green, blue and
         * yellow) using Data URLs defined below.  These will only be
         * added once and can be removed by clearing the gallery in the
         * admin panel.  After debugging, this section can be removed.
         */
        (function () {
          try {
            // Disable the test hook by forcing the condition to false.  This
            // prevents auto‑insertion of sample images when the gallery is
            // empty.  To re-enable for debugging, set the first operand to
            // true.  See previous commit for the original hook.
            // Sample image injection DISABLED. Public site only shows
            // images uploaded via Admin Panel Gallery. Force false to skip.
            if (false && Array.isArray(appState.gallery) && appState.gallery.length === 0) {
              const sampleImages = [
                { data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAEsCAIAAABi1XKVAAAD7ElEQVR4nO3UQQ0AIBDAMMC/58MCP7KkVbDX9iyAhvM7AOCVYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWEDGBW+xA1d7e5vLAAAAASUVORK5CYII=' },
                { data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAEsCAIAAABi1XKVAAAD7UlEQVR4nO3UQQ0AIBDAsAP/nsECP7KkVbDX1pwBSNi/AwBeGRaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWEDGBW+xA1d7e5vLAAAAAElFTkSuQmCC' },
                { data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAEsCAIAAABi1XKVAAAD7UlEQVR4nO3UQQ0AIBDAsAP/nsECP7KkVbDX1swZgIL9OwDglWEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWEDGBW+xA1d7e5vLAAAAAElFTkSuQmCC' },
                { data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAEsCAIAAABi1XKVAAAD7UlEQVR4nO3UQQ0AIBDAMMC/58MCP7KkVbDX9swCSDi/AwBeGRaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWECGYQEZhgVkGBaQYVhAhmEBGYYFZBgWkGFYQIZhARmGBWQYFpBhWEDGBa1sBFZFMdV3AAAAAElFTkSuQmCC' }
              ];
              appState.gallery = sampleImages.map((img) => {
                return { id: generateId(), data: img.data };
              });
              try {
                saveData();
              } catch (ex) {
                console.warn('Test gallery images could not be saved', ex);
              }
            }
          } catch (ex) {
            console.error('Error injecting test gallery images', ex);
          }
        })();

      // Keep track of any running gallery scroll animation frame.  This is used
      // to cancel a previous animation when startGalleryAutoscroll() is invoked
      // again (for example if the page is rebuilt).  Without clearing the
      // animation frame, multiple animation loops would accumulate and cause
      // erratic scrolling speeds.
      let galleryAnimationFrameId = null;
    /**
     * Build a horizontally scrolling marquee for the gallery.  This
     * function creates two child wrappers (.marquee) inside the
     * gallery grid.  Each wrapper contains multiple copies of the
     * gallery images to ensure the wrapper's width exceeds the
     * viewport.  Both wrappers are animated leftward via CSS; the
     * second wrapper starts half way through the cycle to create
     * seamless coverage.  A CSS custom property (--gallery-duration)
     * on the grid element controls the animation duration based on
     * content width and a fixed speed.
     */
    function buildGalleryMarquee() {
      const grid = document.getElementById('galleryGrid');
      if (!grid) return;
      // Clear previous content and cancel any existing animation loop
      grid.innerHTML = '';
      if (typeof galleryAnimationFrameId === 'number' && galleryAnimationFrameId) {
        cancelAnimationFrame(galleryAnimationFrameId);
        galleryAnimationFrameId = null;
      }
      // Reset any inline width or transform so we can recalculate size
      grid.style.width = '';
      grid.style.transform = '';
      grid.style.animation = '';
      // If there are no images in the gallery state, display a message
      if (!appState.gallery || appState.gallery.length === 0) {
        grid.textContent = 'No images yet.';
        return;
      }
      // Build an array of base image elements using loaded data
      const baseImages = [];
      appState.gallery.forEach((img) => {
        // Only include images that have data loaded.  Images awaiting
        // asynchronous loading are skipped; this function will be
        // re‑invoked once data becomes available.
        if (img.data || img.url) {
          const pic = document.createElement('img');
          pic.alt = 'gallery';
          // Prefer the Storage URL (small, CDN-cached) over inline data URL
          pic.src = img.url || img.data;
          pic.onclick = () => {
            const src = img.url || img.data;
            openLightbox(src);
          };
          baseImages.push(pic);
        }
      });
      // If no images are ready yet, do nothing.  The caller should
      // re‑invoke after asynchronous loads complete.
      if (baseImages.length === 0) {
        grid.textContent = 'No images yet.';
        return;
      }
      // Determine the width of the viewport that the images should
      // cover.  Use the grid's parent element width if available; if
      // not, fallback to the grid's offset width.
      const containerWidth = grid.parentElement ? grid.parentElement.offsetWidth : grid.offsetWidth;
      // Helper to create and fill a marquee wrapper.  It clones the
      // base images multiple times until the wrapper's scrollWidth
      // exceeds the viewport width.  A small upper bound prevents
      // excessive duplication.
      const createMarquee = () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'marquee';
        // Always clone the images at least once
        let iterations = 0;
        do {
          baseImages.forEach((img) => {
            // Clone the image node to avoid sharing the same element
            const clone = img.cloneNode(true);
            wrapper.appendChild(clone);
          });
          iterations++;
          // Continue duplicating until the wrapper's width exceeds
          // twice the container width.  Multiplying by 2 ensures
          // overlapping coverage from both marquees.  Cap iterations
          // at 10 to avoid excessive memory use.
        } while (wrapper.scrollWidth < containerWidth * 2 && iterations < 10);
        return wrapper;
      };
      // Build two marquee wrappers
      const marquee1 = createMarquee();
      const marquee2 = createMarquee();
      // Append wrappers to the grid
      grid.appendChild(marquee1);
      grid.appendChild(marquee2);
      // After appending, compute the width of the first marquee to
      // derive animation duration.  We use requestAnimationFrame to
      // ensure measurements after layout.
      requestAnimationFrame(() => {
        const sequenceWidth = marquee1.scrollWidth;
        if (sequenceWidth > 0) {
          // Speed in pixels per second.  Adjust to control scrolling rate.
          const speed = 50;
          const duration = sequenceWidth / speed;
          grid.style.setProperty('--gallery-duration', duration.toFixed(2) + 's');
        }
      });
    }

      // ========== Website initialisation ========== //
      let selectedMenuCategory = 'explore';
      let menuExpanded = false;
      let menuCollapseTimer = null;

      function stableMenuItems(items) {
        // Keep the All/Explore category stable while the user browses.
        // Do not randomize or reshuffle products during the session.
        return items.slice();
      }

      /**
       * Apply the theme colours from the configuration.  CSS variables
       * automatically propagate the colours throughout the site.
       */
      function applyTheme() {
        const theme = appState.config.themeColors;
        document.documentElement.style.setProperty(
          '--primary',
          theme.primary || '#b58a5b'
        );
        document.documentElement.style.setProperty(
          '--secondary',
          theme.secondary || '#151515'
        );
        document.documentElement.style.setProperty(
          '--accent',
          theme.accent || '#d4b17e'
        );
        document.documentElement.style.setProperty(
          '--bg',
          theme.bg || '#0e0d0b'
        );
        document.documentElement.style.setProperty(
          '--text',
          theme.text || '#f5f5f5'
        );
      }

      function escapeDeveloperInfo(value) {
        return String(value || '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
      }

      function normalizeDeveloperInfoUrl(value, type) {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (type === 'email') {
          const address = raw.replace(/^mailto:/i, '').trim();
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
            ? 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(address) : '';
        }
        if (type === 'phone') return /^tel:/i.test(raw) ? raw : 'tel:' + raw.replace(/[^+\d]/g, '');
        if (type === 'whatsapp') {
          if (/^https?:\/\//i.test(raw) || /^whatsapp:/i.test(raw)) return raw;
          const digits = raw.replace(/[^+\d]/g, '').replace(/^\+/, '');
          return digits ? 'https://wa.me/' + digits : '';
        }
        if (/^https?:\/\//i.test(raw) || /^mailto:/i.test(raw) || /^tel:/i.test(raw)) return raw;
        return 'https://' + raw.replace(/^\/+/, '');
      }

      function getDeveloperInfoConfig() {
        const cfg = appState.config || {};
        const cleanInfo = cfg.developerInfo && typeof cfg.developerInfo === 'object' ? cfg.developerInfo : {};
        const cleanLinks = cleanInfo.links && typeof cleanInfo.links === 'object' ? cleanInfo.links : {};
        return {
          name: cleanInfo.name || '',
          profileImage: cleanInfo.profileImage || '',
          intro: cleanInfo.intro || '',
          email: cleanInfo.email || '',
          phone: cleanInfo.phone || cfg.developerContact || '',
          linkedin: cleanLinks.linkedin || ''
        };
      }

      function renderDeveloperInfoPopup() {
        const content = document.getElementById('developerInfoContent');
        if (!content) return;
        const info = getDeveloperInfoConfig();
        const name = info.name || 'Developer';
        const avatarHtml = info.profileImage
          ? `<img src="${escapeDeveloperInfo(info.profileImage)}" alt="${escapeDeveloperInfo(name)}" onerror="this.onerror=null;this.src='assets/original-logo.png';this.alt='Al Fursan logo';" />`
          : '<img src="assets/original-logo.png" alt="Al Fursan logo" />';

        // v160: official brand-color SVG icons (replaces generic gold
        // Font Awesome glyphs). Each icon is hand-crafted SVG using the
        // brand's official colors:
        //   - Gmail: red/yellow/green/blue (the M shape)
        //   - LinkedIn: official LinkedIn blue (#0A66C2)
        //   - Phone: WhatsApp green (#25D366) since phone usually = WhatsApp
        const ICON_GMAIL = `
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="#4285F4" d="M22 6.5c0-1.1-.9-2-2-2h-1l-7 5-7-5H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h1V9.4l7 4.9 7-4.9V19.5h1c1.1 0 2-.9 2-2v-11z"/>
            <path fill="#34A853" d="M5 19.5V9.4l7 4.9V19.5z"/>
            <path fill="#FBBC04" d="M19 19.5V9.4l-7 4.9V19.5z"/>
            <path fill="#EA4335" d="M5 4.5h-1c-1.1 0-2 .9-2 2v1l3 2.1V4.5z"/>
            <path fill="#C5221F" d="M19 4.5h1c1.1 0 2 .9 2 2v1l-3 2.1V4.5z"/>
          </svg>`;

        const ICON_LINKEDIN = `
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect width="24" height="24" rx="4" fill="#0A66C2"/>
            <path fill="#fff" d="M8.34 18.34V9.5H5.4v8.84h2.94zM6.87 8.3c.95 0 1.54-.65 1.54-1.46-.02-.83-.59-1.46-1.52-1.46s-1.54.63-1.54 1.46c0 .81.58 1.46 1.49 1.46h.03zm3.1 10.04h2.94v-4.94c0-.27.02-.53.1-.72.21-.53.69-1.07 1.5-1.07 1.06 0 1.48.81 1.48 1.99v4.74h2.94v-5.08c0-2.72-1.45-3.99-3.39-3.99-1.58 0-2.27.87-2.66 1.47v.03h-.02l.02-.03V9.5H9.97c.04.83 0 8.84 0 8.84z"/>
          </svg>`;

        const ICON_PHONE = `
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="12" r="11" fill="#25D366"/>
            <path fill="#fff" d="M17.07 14.18c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.17-1.34-.8-.71-1.34-1.6-1.5-1.87-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.83-2.01-.22-.53-.45-.45-.61-.46-.16-.01-.34-.01-.52-.01-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27 0 1.34.98 2.63 1.11 2.81.14.18 1.92 2.93 4.65 4.11 2.73 1.18 2.73.79 3.22.74.49-.05 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32z"/>
          </svg>`;

        // Build clickable contact rows. Each row is an <a> so the entire
        // row (icon + text) is tappable. Phone → tel:, Email → mailto:,
        // LinkedIn → external URL (opens in new tab via target=_blank).
        const contactRows = [];
        if (info.email) {
          const displayEmail = String(info.email).trim().replace(/^mailto:/i, '');
          const href = normalizeDeveloperInfoUrl(displayEmail, 'email');
          if (href) contactRows.push(
            `<a class="developer-info-contact-row" href="${escapeDeveloperInfo(href)}" target="_blank" rel="noopener noreferrer" aria-label="Compose email to ${escapeDeveloperInfo(displayEmail)}">` +
              `<span class="developer-info-contact-icon brand-icon brand-icon-gmail" aria-hidden="true">${ICON_GMAIL}</span>` +
              `<span>${escapeDeveloperInfo(displayEmail)}</span>` +
            `</a>`
          );
        }
        if (info.phone) {
          // tel: must NOT contain spaces, parens, or dashes in some
          // dialer apps. Strip everything but digits and a leading +.
          const phoneHref = 'tel:' + info.phone.replace(/[^\d+]/g, '');
          contactRows.push(
            `<a class="developer-info-contact-row force-ltr" href="${escapeDeveloperInfo(phoneHref)}">` +
              `<span class="developer-info-contact-icon brand-icon brand-icon-phone" aria-hidden="true">${ICON_PHONE}</span>` +
              `<span>${escapeDeveloperInfo(info.phone)}</span>` +
            `</a>`
          );
        }
        if (info.linkedin) {
          // Use normalizeDeveloperInfoUrl which adds https:// if missing.
          // Display the URL minus protocol for cleaner UI.
          const linkedinHref = normalizeDeveloperInfoUrl(info.linkedin, 'url');
          const displayLinkedin = String(info.linkedin)
            .replace(/^https?:\/\//i, '')
            .replace(/^www\./i, '');
          contactRows.push(
            `<a class="developer-info-contact-row" href="${escapeDeveloperInfo(linkedinHref)}" target="_blank" rel="noopener noreferrer">` +
              `<span class="developer-info-contact-icon brand-icon brand-icon-linkedin" aria-hidden="true">${ICON_LINKEDIN}</span>` +
              `<span>${escapeDeveloperInfo(displayLinkedin)}</span>` +
            `</a>`
          );
        }
        // Vertical stack: large square-rounded avatar → name → intro → contact
        content.innerHTML = `
          <div class="developer-info-stack">
            <div class="developer-info-avatar developer-info-avatar-large">${avatarHtml}</div>
            <h3 id="developerInfoName" class="developer-info-name">${escapeDeveloperInfo(name)}</h3>
            ${info.intro ? `<p class="developer-info-intro">${escapeDeveloperInfo(info.intro)}</p>` : ''}
            ${contactRows.length ? `<div class="developer-info-contact">${contactRows.join('')}</div>` : ''}
          </div>
        `;
        if (window.applyRestaurantTranslations) window.applyRestaurantTranslations(content);
      }

      function openDeveloperInfoModal() {
        renderDeveloperInfoPopup();
        const modal = document.getElementById('developerInfoModal');
        if (!modal) return;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
      }

      function closeDeveloperInfoModal() {
        const modal = document.getElementById('developerInfoModal');
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      }

      /**
       * Open a full-screen legal document view.
       * which = 'privacy' | 'terms'
       *
       * Reads the policy text from appState.config.legal.{privacyPolicy|
       * termsOfService}. If empty, shows a placeholder so the page is
       * never blank — admin can publish real text later via Settings.
       *
       * The URL hash is updated to /#privacy-policy or /#terms-of-service
       * so users can bookmark/share the page directly. Closing restores
       * the previous hash.
       */
      function openLegalPage(which) {
        const modal = document.getElementById('legalPageModal');
        if (!modal) return;
        const titleEl = modal.querySelector('#legalPageTitle');
        const bodyEl  = modal.querySelector('#legalPageBody');
        const isTerms = (which === 'terms');
        const title   = isTerms ? 'Terms of Service' : 'Privacy Policy';
        const cfg     = (appState.config && appState.config.legal) || {};
        const rawText = isTerms ? (cfg.termsOfService || '') : (cfg.privacyPolicy || '');
        if (titleEl) titleEl.textContent = title;
        if (bodyEl) {
          if (rawText && rawText.trim()) {
            // Render as paragraphs — preserve line breaks the admin used
            // without allowing HTML injection.
            const escaped = escapeHtml(rawText.trim())
              .split(/\n{2,}/).map(function (block) {
                return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
              }).join('');
            bodyEl.innerHTML = escaped;
          } else {
            // Placeholder shown when admin has not yet published the doc.
            bodyEl.innerHTML =
              '<p class="legal-placeholder">This document has not been published yet. ' +
              'Please check back soon.</p>';
          }
        }
        // Push the hash so the page is bookmarkable/shareable
        try {
          history.pushState({ legal: which }, '', '#' + (isTerms ? 'terms-of-service' : 'privacy-policy'));
        } catch (e) {}
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        // Scroll to top of the legal page content
        if (bodyEl) bodyEl.scrollTop = 0;
      }

      function closeLegalPage() {
        const modal = document.getElementById('legalPageModal');
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        // Restore URL to clean root (remove the #privacy-policy / #terms-of-service)
        try {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        } catch (e) {}
      }
      // Expose to global so HTML close button can call it
      window.openLegalPage  = openLegalPage;
      window.closeLegalPage = closeLegalPage;
      // If user lands on the page with a direct hash, open the legal page automatically
      (function () {
        var h = (window.location.hash || '').toLowerCase();
        if (h === '#privacy-policy') {
          setTimeout(function () { openLegalPage('privacy'); }, 400);
        } else if (h === '#terms-of-service') {
          setTimeout(function () { openLegalPage('terms'); }, 400);
        }
      })();


      document.addEventListener('DOMContentLoaded', () => {
        const closeBtn = document.getElementById('developerInfoClose');
        if (closeBtn) closeBtn.addEventListener('click', closeDeveloperInfoModal);
        const dealCloseBtn = document.getElementById('dealDetailsClose');
        if (dealCloseBtn) dealCloseBtn.addEventListener('click', closeDealDetailsModal);
        const legalCloseBtn = document.getElementById('legalPageClose');
        if (legalCloseBtn) legalCloseBtn.addEventListener('click', closeLegalPage);

        // v95: Premium experience layer initialization.
        // 1) Insert a scroll-progress ember bar at top of viewport
        // 2) Tag major sections with .reveal class
        // 3) Wire IntersectionObserver to add .reveal-in when sections
        //    scroll into view (one-shot per element).
        //
        // All of this is purely visual — zero impact on layout, data,
        // or interactivity. Respects prefers-reduced-motion via CSS.
        try {
          // --- Scroll progress bar -----------------------------------
          if (!document.getElementById('scrollProgressBar')) {
            const bar = document.createElement('div');
            bar.id = 'scrollProgressBar';
            bar.className = 'scroll-progress-bar idle';
            bar.setAttribute('aria-hidden', 'true');
            document.body.appendChild(bar);
            let rafId = null;
            const updateBar = function () {
              const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
              const docHeight = (document.documentElement.scrollHeight - window.innerHeight) || 1;
              const pct = Math.max(0, Math.min(100, (scrollTop / docHeight) * 100));
              bar.style.width = pct + '%';
              // Hide when at the very top — cleaner look
              if (pct < 1.5) bar.classList.add('idle');
              else            bar.classList.remove('idle');
              rafId = null;
            };
            window.addEventListener('scroll', function () {
              // requestAnimationFrame throttle — scroll events fire
              // dozens of times per second; we batch updates to one
              // per frame to keep perf clean.
              if (rafId === null) rafId = requestAnimationFrame(updateBar);
            }, { passive: true });
            updateBar();
          }

          // --- Section reveal-on-scroll ------------------------------
          // Apply .reveal class to major homepage sections. Using a
          // curated allowlist (not "every section") to avoid breaking
          // checkout/admin layouts that don't expect transforms.
          const revealTargets = [
            '#menu',
            '#reservation',
            '#offers',
            '#about',
            '#gallery',
            '#testimonials',
            '#contact'
          ];
          revealTargets.forEach(function (sel) {
            const el = document.querySelector(sel);
            if (el && !el.classList.contains('reveal')) {
              el.classList.add('reveal');
            }
          });

          // v96: smoke-wisp dividers between top-level sections.
          // Inserted AFTER each revealed section. Pure decoration so
          // they live OUTSIDE the section's reveal box (won't fade
          // with it; instead they're a constant atmospheric layer).
          revealTargets.forEach(function (sel) {
            const el = document.querySelector(sel);
            if (!el) return;
            // v105: skip the smoke divider AFTER #contact — the next
            // sibling is the footer, and an extra 60px band between
            // them creates an awkward gap before the footer.
            if (sel === '#contact') {
              // Also remove a previously-inserted divider if one exists
              const prev = el.nextElementSibling;
              if (prev && prev.classList && prev.classList.contains('smoke-divider')) {
                prev.parentNode.removeChild(prev);
              }
              return;
            }
            // Skip if a smoke divider is already adjacent (avoid double-
            // insertion if buildWebsite runs twice or page hot-reloads)
            const next = el.nextElementSibling;
            if (next && next.classList && next.classList.contains('smoke-divider')) return;
            const div = document.createElement('div');
            div.className = 'smoke-divider';
            div.setAttribute('aria-hidden', 'true');
            el.parentNode.insertBefore(div, el.nextSibling);
          });

          // v96: stagger reveal on key grids — menu, offers, gallery.
          // Adds .stagger-reveal class. When the parent section receives
          // .reveal-in (from IO), the staggered children cascade in.
          const staggerSelectors = [
            '#menuItems',
            '#offersGrid',
            '#offersExtraGrid',
            '#galleryGrid'
          ];
          staggerSelectors.forEach(function (sel) {
            const el = document.querySelector(sel);
            if (el && !el.classList.contains('stagger-reveal')) {
              el.classList.add('stagger-reveal');
            }
          });

          // IntersectionObserver to trigger reveal-in once per element.
          // rootMargin = -40px from bottom so the reveal fires slightly
          // before the element fully enters view (feels cinematic, not
          // delayed). threshold of 0.08 = ~8% of element visible.
          if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver(function (entries) {
              entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                  entry.target.classList.add('reveal-in');
                  io.unobserve(entry.target);   // fire once only
                }
              });
            }, {
              root: null,
              rootMargin: '0px 0px -40px 0px',
              threshold: 0.08
            });
            // Observe both .reveal sections AND .stagger-reveal grids
            document.querySelectorAll('.reveal, .stagger-reveal').forEach(function (el) {
              io.observe(el);
            });
          } else {
            // Browser too old for IntersectionObserver — just reveal
            // everything immediately so content isn't stuck invisible.
            document.querySelectorAll('.reveal, .stagger-reveal').forEach(function (el) {
              el.classList.add('reveal-in');
            });
          }

          // v96: global showToast() helper. Replaces clinical alert()
          // boxes for confirmation/info messages. Stays out of the way
          // by default; opt-in via window.showToast(message, type).
          //
          // Type: 'success' | 'error' | 'info' (default: 'info')
          // Duration: optional ms (default 2800)
          (function setupToasts() {
            if (window.showToast) return;
            let stack = document.querySelector('.toast-stack');
            if (!stack) {
              stack = document.createElement('div');
              stack.className = 'toast-stack';
              stack.setAttribute('aria-live', 'polite');
              document.body.appendChild(stack);
            }
            const icons = {
              success: '<i class="fa-solid fa-check"></i>',
              error:   '<i class="fa-solid fa-xmark"></i>',
              info:    '<i class="fa-solid fa-info"></i>'
            };
            window.showToast = function (message, type, duration) {
              type = type || 'info';
              duration = typeof duration === 'number' ? duration : 2800;
              const toast = document.createElement('div');
              toast.className = 'toast toast-' + type;
              toast.innerHTML =
                '<span class="toast-icon">' + (icons[type] || icons.info) + '</span>' +
                '<span class="toast-msg">' + String(message || '').replace(/[<>]/g, '') + '</span>';
              // Tap-to-dismiss
              toast.addEventListener('click', function () { dismiss(); });
              stack.appendChild(toast);
              // Force reflow then add toast-in to trigger transition
              void toast.offsetWidth;
              toast.classList.add('toast-in');
              let dismissed = false;
              function dismiss() {
                if (dismissed) return;
                dismissed = true;
                toast.classList.remove('toast-in');
                toast.classList.add('toast-out');
                setTimeout(function () {
                  if (toast.parentNode) toast.parentNode.removeChild(toast);
                }, 500);
              }
              setTimeout(dismiss, duration);
              return { dismiss: dismiss };
            };
          })();
        } catch (premiumErr) {
          // Never let visual enhancements break the site
          console.warn('[v95+96 premium] init failed:', premiumErr);
        }
      });

      /**
       * Populate static elements (logo, nav bar, contact info, footer) and
       * build dynamic sections such as hero slides, menu items, gallery,
       * offers and testimonials.  This function is called on every page
       * load and whenever configuration data is updated in the admin panel.
       */
      /**
       * Re-apply viewport-sensitive font sizes for the navbar brand
       * and the hero taglines. Called on every window resize so that
       * flipping device orientation (or resizing the browser across
       * the 768px breakpoint) picks up the correct mobile vs desktop
       * value without needing a full buildWebsite() rebuild.
       */
      /**
       * v223: Keep the restaurant name on a SINGLE line in the header.
       * Never wrap, never show an ellipsis. If the full name at the
       * admin-set size would be too wide for the space available in the
       * header, shrink the font (down to a sane minimum) until the whole
       * name fits on one line.
       */
      /**
       * v224: the restaurant name target size. The admin "Size" value is
       * the MOBILE size; on desktop (wide screens) the name renders at
       * DOUBLE that size. The fit routine then shrinks it only if the
       * doubled size would not fit the header on one line.
       */
      function brandNameTargetSize() {
        var base = Number(appState && appState.config && appState.config.restaurantNameSize) || 32;
        return (window.innerWidth <= 768) ? 22 : 20;
      }

      function fitRestaurantNameToHeader(maxSize) {
        var el = document.getElementById('navLogo');
        if (!el) return;
        maxSize = Number(maxSize) || brandNameTargetSize();
        var MIN = 12;
        // Helper: set font-size with !important inline so it beats ANY
        // stylesheet rule (this was the override that made size changes
        // appear to do nothing).
        function setFS(px) { el.style.setProperty('font-size', px + 'px', 'important'); }
        // One line, no ellipsis, NO clipping (overflow visible) so the
        // full name is always shown. We fit by shrinking the font only.
        el.style.whiteSpace = 'nowrap';
        el.style.textOverflow = 'clip';
        el.style.overflow = 'visible';
        el.style.maxWidth = 'none';
        el.style.display = 'inline-block';

        var navbarEl = el.closest('.navbar');
        if (!navbarEl) { setFS(maxSize); return; }
        var navItems = navbarEl.querySelector('#navItems');
        var navRight = navbarEl.querySelector('.nav-right');

        // DESKTOP: honor the requested size exactly. The header has the
        // full menu, so there is no point auto-shrinking against it (that
        // was collapsing the name to the minimum). One line, no wrap.
        if (window.innerWidth > 768) {
          setFS(maxSize);
          return;
        }

        // MOBILE: flexbox sizes the name box to the leftover space between
        // the logo and the two icons (logo and icons are fixed width). We
        // just shrink the font until the text fits that box on ONE line.
        // No wrap, no ellipsis, no overlap, auto on every screen width.
        el.style.overflow = 'hidden';
        el.style.whiteSpace = 'nowrap';
        var size = maxSize;
        setFS(size);
        var guard = 0;
        while (el.scrollWidth > el.clientWidth + 1 && size > MIN && guard < 300) {
          size -= 1;
          setFS(size);
          guard++;
        }
      }

      // Re-fit once the (async-loaded) brand font is ready, since the
      // text width changes when the real font replaces the fallback.
      if (!window._rnFitFontsWired && document.fonts && document.fonts.ready) {
        window._rnFitFontsWired = true;
        document.fonts.ready.then(function () {
          try { fitRestaurantNameToHeader(); } catch (e) {}
        });
      }

      function applyResponsiveBrandSizes() {
        if (!appState || !appState.config) return;
        var isMobile = window.innerWidth <= 768;
        // Restaurant name
        var navLogoEl = document.getElementById('navLogo');
        if (navLogoEl) {
          // Mobile = admin size, desktop = 2x, auto-shrunk to fit one line.
          fitRestaurantNameToHeader(brandNameTargetSize());
        }
        // v169: hero tagline + subtagline are hardcoded now (preview
        // styling via CSS). No longer size them from config here.
      }
      window.applyResponsiveBrandSizes = applyResponsiveBrandSizes;

      function buildWebsite() {
        // v92: backward-compat — ensure About config & nav entry exist
        // even on configs saved before About was introduced. Adds default
        // values lazily without overwriting anything admin already set.
        try {
          const cfg = appState.config;
          if (!cfg.about) {
            cfg.about = {
              enabled: true,
              bannerImage: '',
              title: 'About Us',
              subtitle: 'Our Story',
              bodyText: 'Welcome to our restaurant. Add your story here from the Admin Panel → About section.',
              midImage: '',
              features: [
                { icon: 'fa-utensils', title: 'Authentic Cuisine', description: 'Crafted from time-honored recipes and the freshest ingredients.' },
                { icon: 'fa-leaf',     title: 'Fresh Ingredients', description: 'Sourced daily from trusted suppliers and local farms.' },
                { icon: 'fa-heart',    title: 'Made with Love',    description: 'Every dish is prepared with care by our passionate chefs.' }
              ]
            };
          }
          if (cfg.showSections && cfg.showSections.about === undefined) {
            cfg.showSections.about = true;
          }
          if (Array.isArray(cfg.navItems) && !cfg.navItems.some(function (i) { return i.id === 'about'; })) {
            // Insert About into navItems right after reservation
            const resIdx = cfg.navItems.findIndex(function (i) { return i.id === 'reservation'; });
            const aboutEntry = { id: 'about', label: 'About', link: '#about' };
            if (resIdx >= 0) cfg.navItems.splice(resIdx + 1, 0, aboutEntry);
            else cfg.navItems.push(aboutEntry);
          }
        } catch (e) { /* non-fatal */ }
        // Apply configured fonts to CSS variables so they reflect throughout the site
        try {
          if (appState.config.fonts) {
            const bodyFont = appState.config.fonts.body || "'Poppins', sans-serif";
            const headingFont = appState.config.fonts.heading || "'Great Vibes', cursive";
            document.documentElement.style.setProperty('--body-font', bodyFont);
            document.documentElement.style.setProperty('--heading-font', headingFont);
          }
        } catch (ex) {
          console.warn('Error applying font settings', ex);
        }
        // Title and logo
        document.getElementById('siteTitle').textContent =
          appState.config.restaurantName;
        const navLogoEl = document.getElementById('navLogo');
        if (navLogoEl) {
          navLogoEl.textContent = appState.config.restaurantName;
          var rnFont = (appState.config.restaurantNameFont || 'Great Vibes');
          var rnSize = Number(appState.config.restaurantNameSize) || 32;
          var fontStack = rnFont.indexOf(' ') >= 0 ? "'" + rnFont + "'" : rnFont;
          var fallback = ", 'Great Vibes', cursive, serif";
          navLogoEl.style.fontFamily = fontStack + fallback;
          // v224: mobile = admin size, desktop = 2x. CSS vars mirror that
          // (inline font-size set by the fit routine still wins).
          navLogoEl.style.setProperty('--rn-size-desktop', '20px');
          navLogoEl.style.setProperty('--rn-size-mobile', '22px');
          // Apply the viewport-appropriate size and shrink to fit one line.
          // Defer one frame so the header layout is settled before measuring.
          (function () {
            try { fitRestaurantNameToHeader(brandNameTargetSize()); } catch (e) {}
            requestAnimationFrame(function () {
              try { fitRestaurantNameToHeader(brandNameTargetSize()); } catch (e) {}
            });
          })();
        }
        // Install (or refresh) a debounced resize handler that re-applies
        // viewport-sensitive font sizes (restaurant name + hero taglines).
        // Without this, flipping device orientation or resizing the browser
        // from desktop→mobile (or vice versa) leaves the wrong size locked
        // in until the user does another full rebuild.
        if (!window._rnResizeWired) {
          window._rnResizeWired = true;
          var _rnResizeTimer = null;
          window.addEventListener('resize', function () {
            if (_rnResizeTimer) clearTimeout(_rnResizeTimer);
            _rnResizeTimer = setTimeout(function () {
              try { applyResponsiveBrandSizes(); } catch (e) {}
            }, 120);
          });
        }
        // Update logo image if configured.  The site logo is loaded from configuration or defaults to the placeholder.
        const siteLogoEl = document.getElementById('site-logo');
        if (siteLogoEl) {
          if (appState.config.logo) {
            siteLogoEl.src = appState.config.logo;
          }
        }

        // v105: logo traveler animation removed per user request.

        // Top bar content.  Use the user‑configured text if available; otherwise fall back to phone and opening hours.
        const contact = appState.config.contact;
        const topInner = document.getElementById('topBarInner');
        if (topInner) {
          let barText = appState.config.topBarText;
          if (!barText || !barText.trim()) {
            const phone = contact && contact.phone ? contact.phone : '';
            const hours = contact && contact.openHours ? contact.openHours : '';
            barText = phone ? phone + ' • ' + hours : hours;
          }
          // CRITICAL (v87): wrap every digit-heavy run with Unicode BiDi
          // isolate marks BEFORE setting textContent. Marks survive any
          // later translation pass and tell the BiDi algorithm to render
          // the wrapped substring strictly LTR regardless of surrounding
          // Arabic text. This is the canonical Unicode-level fix —
          // independent of CSS direction or container class.
          //
          //   \u2066 = LEFT-TO-RIGHT ISOLATE (push LTR context)
          //   \u2069 = POP DIRECTIONAL ISOLATE  (pop the context)
          //
          // Matches: phone numbers ("+971 566 ..."), time ranges
          // ("8:00AM – 9:00PM"), any 5+ consecutive digits or digit
          // sequence joined by separators. Same PHONE_RX as the existing
          // protectNumbers helper plus a time-range pattern.
          var PHONE_RX_LOCAL = /([+]?\d[\d\s().-]{4,}\d)/g;
          var TIME_RX_LOCAL  = /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?(?:\s*[–-]\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)?)/g;
          barText = String(barText)
            .replace(PHONE_RX_LOCAL, '\u2066$1\u2069')
            .replace(TIME_RX_LOCAL,  '\u2066$1\u2069');
          topInner.textContent = barText;
          // Belt-and-suspenders: force the marquee container to LTR via
          // CSS too. .force-ltr applies direction:ltr + unicode-bidi:isolate.
          topInner.classList.add('force-ltr');
          // Defensively re-translate the topBar inline. The end-of-buildWebsite
          // applyRestaurantTranslations call should normally cover this, but
          // for the announcement ticker specifically we run a targeted
          // re-translate so the bar is the FIRST thing to update visibly.
          if (window.applyRestaurantTranslations) {
            try { window.applyRestaurantTranslations(topInner); } catch (e) {}
          }
        }

        // Build nav bar
        const navContainer = document.getElementById('navItems');
        navContainer.innerHTML = '';
        // v93: About moved AFTER offers (was after reservation in v92).
        // Order is consistent in both desktop and mobile drawer.
        const desktopNavOrder = ['home', 'menu', 'reservation', 'offers', 'about', 'contact', 'gallery', 'testimonials', 'tracking'];
        const mobileNavOrder = ['home', 'menu', 'reservation', 'offers', 'about', 'gallery', 'testimonials', 'tracking'];
        desktopNavOrder.forEach((id) => {
          // Skip gallery and testimonials (reviews) buttons from appearing in the menu bar
          if (id === 'gallery' || id === 'testimonials') return;
          // find matching item in config
          const item = appState.config.navItems.find((it) => it.id === id);
          if (!item) return;
          if (appState.config.showSections[id] !== false) {
            const li = document.createElement('li');
            li.style.position = 'relative';
            const link = document.createElement('a');
            link.href = item.link;
            // Use a shorter label for the tracking page to save header space
            if (id === 'tracking') {
              link.textContent = 'Track';
            } else {
              link.textContent = item.label;
            }
            link.onclick = (e) => {
              e.preventDefault();
              scrollToSection(id === 'home' ? 'heroSection' : id);
            };
            // If item is offers and there are enabled offers, show a notification dot
            if (id === 'offers') {
              const hasActive = getActiveOffers().length > 0;
              if (hasActive) {
                link.classList.add('has-offer');
              }
            }
            li.appendChild(link);
            navContainer.appendChild(li);
          }
        });

        // Append an account/login entry at the end of the navigation list.  This
        // entry is shown only on mobile screens via CSS.  On larger screens
        // the account button remains in the header.  We determine the label
        // and click handler based on the current session state.
        (function () {
          const mobileLi = document.createElement('li');
          mobileLi.id = 'mobileAccount';
          const a = document.createElement('a');
          a.href = '#';
          if (appState.session && appState.session.role === 'customer') {
            a.textContent = 'Account';
            a.onclick = (e) => {
              e.preventDefault();
              openAccountModal();
            };
          } else {
            a.textContent = 'Login';
            a.onclick = (e) => {
              e.preventDefault();
              openLoginModal();
            };
          }
          mobileLi.appendChild(a);
          navContainer.appendChild(mobileLi);
        })();

        // Build mobile navigation menu using the same items.  On each click of a
        // link in the mobile drawer, we close the drawer and then perform the
        // appropriate action (scroll or open modals).
        (function () {
          const mobileList = document.getElementById('mobileNavItems');
          if (!mobileList) return;
          mobileList.innerHTML = '';
          const navMeta = {
            home: { hint: 'Back to hero experience', icon: 'home' },
            menu: { hint: 'Browse signature dishes', icon: 'menu' },
            reservation: { hint: 'Book your dining table', icon: 'calendar' },
            about: { hint: 'Learn about our story', icon: 'info' },
            offers: { hint: 'See live promotions', icon: 'gift' },
            tracking: { hint: 'Follow your current order', icon: 'tracking' },
            account: { hint: 'Manage profile and orders', icon: 'user' },
            login: { hint: 'Access your customer account', icon: 'login' }
          };
          const iconSvgMap = {
            home:
              '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 10.5L12 3l9 7.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 9.5V20h13V9.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 20v-5h4v5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            menu:
              '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="18" cy="18" r="2" stroke="currentColor" stroke-width="1.9"/></svg>',
            calendar:
              '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3" stroke="currentColor" stroke-width="1.9"/><path d="M8 3.5v3M16 3.5v3M3.5 9.5h17M8.5 13h3M8.5 16h7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
            gift:
              '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10h16v10H4z" stroke="currentColor" stroke-width="1.9"/><path d="M2.5 7.5h19v4h-19zM12 7.5v12.5" stroke="currentColor" stroke-width="1.9"/><path d="M9.2 7.3C7.8 7.3 6.7 6.2 6.7 4.9s1.1-2.2 2.5-2.2c2.1 0 2.8 2.3 2.8 4.6H9.2zm5.6 0c1.4 0 2.5-1.1 2.5-2.4s-1.1-2.2-2.5-2.2c-2.1 0-2.8 2.3-2.8 4.6h2.8z" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            tracking:
              '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10z" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="11" r="2.5" stroke="currentColor" stroke-width="1.9"/></svg>',
            user:
              '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.2" stroke="currentColor" stroke-width="1.9"/><path d="M5 20c1.6-3.3 4.1-4.9 7-4.9s5.4 1.6 7 4.9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
            login:
              '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M10 16l4-4-4-4M14 12H4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            info:
              '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.9"/><path d="M12 8h.01M11 12h1v5h1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            arrow:
              '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          };
          function createMobileNavLink(label, hint, iconKey, onClick, href, hasOffer) {
            const li = document.createElement('li');
            li.style.setProperty('--delay', `${index * 0.06}s`);
            index++;
            const link = document.createElement('a');
            link.href = href || '#';
            // Explicit cursor:pointer helps iOS Safari recognize the
            // element as tappable when it might otherwise miss the gesture
            link.style.cursor = 'pointer';
            link.innerHTML = `
              <span class="nav-icon">${iconSvgMap[iconKey] || iconSvgMap.menu}</span>
              <span class="nav-copy">
                <span class="nav-label">${label}</span>
                <span class="nav-hint">${hint}</span>
              </span>
              <span class="nav-arrow">${iconSvgMap.arrow}</span>
            `;
            if (hasOffer) {
              link.classList.add('has-offer');
            }
            // Use addEventListener instead of onclick assignment for
            // reliability across browsers. Touch devices sometimes fail
            // to fire the assigned .onclick property on the first tap
            // after a layout shift; addEventListener is more consistent.
            link.addEventListener('click', function (e) {
              e.preventDefault();
              e.stopPropagation();
              if (typeof onClick === 'function') {
                try { onClick(e); } catch (err) { console.error('[MobileNav] handler error', err); }
              }
            });
            li.appendChild(link);
            mobileList.appendChild(li);
          }
          let index = 0;
          mobileNavOrder.forEach((id) => {
            if (id === 'gallery' || id === 'testimonials') return;
            const item = appState.config.navItems.find((it) => it.id === id);
            if (!item) return;
            if (appState.config.showSections[id] !== false) {
              const label = id === 'tracking' ? 'Track' : item.label;
              const meta = navMeta[id] || navMeta.menu;
              const hasActiveOffer =
                id === 'offers' &&
                getActiveOffers().length > 0;
              createMobileNavLink(
                label,
                meta.hint,
                meta.icon,
                (e) => {
                  e.preventDefault();
                  // v94: simplified click flow. Previous version used a
                  // double-rAF wait that was for an old body-fixed
                  // scroll-lock that no longer exists. Removing it
                  // makes navigation feel immediate. The 60ms timeout
                  // is just long enough to let the drawer's fade-out
                  // start, so the scroll doesn't fight the closing
                  // animation visually on slower phones.
                  toggleMenu(false);
                  if (id === 'tracking') {
                    // Modal opens IMMEDIATELY — no scroll needed.
                    openTrackOrderModal();
                  } else {
                    setTimeout(() => {
                      scrollToSection(id === 'home' ? 'heroSection' : id);
                    }, 60);
                  }
                },
                item.link,
                hasActiveOffer
              );
            }
          });
          // Append account/login item to mobile menu
          if (appState.session && appState.session.role === 'customer') {
            createMobileNavLink(
              'Account',
              navMeta.account.hint,
              navMeta.account.icon,
              (e) => {
                e.preventDefault();
                toggleMenu(false);
                openAccountModal();
              }
            );
          } else {
            createMobileNavLink(
              'Login',
              navMeta.login.hint,
              navMeta.login.icon,
              (e) => {
                e.preventDefault();
                toggleMenu(false);
                openLoginModal();
              }
            );
          }
        })();

        applyHeroBackgroundMedia();
        // Hero slides
        const heroContainer = document.getElementById('heroSlidesContainer');
        heroContainer.innerHTML = '';
        const slides = appState.config.heroSlides.filter((s) => s.enabled);
        if (slides.length === 0) {
          // When no hero slides are defined, build a default slide using the configured taglines.
          slides.push({
            id: 'default',
            heading: appState.config.mainTagline,
            tagline: appState.config.subTagline || '',
            image: '',
            enabled: true
          });
        }
        slides.forEach((slide, idx) => {
          const div = document.createElement('div');
          div.className = 'hero-slide' + (idx === 0 ? ' active' : '');
          // Use default hero image if no image provided; fall back to gradient as last resort
          if (slide.image) {
            div.style.backgroundImage = `url(${slide.image})`;
          } else if (typeof DEFAULT_HERO_IMAGE !== 'undefined') {
            div.style.backgroundImage = `url(${DEFAULT_HERO_IMAGE})`;
          } else {
            div.style.backgroundImage = 'linear-gradient(135deg, var(--secondary), var(--bg))';
          }
          heroContainer.appendChild(div);
        });
        // Set the hero text using the configured main and sub taglines rather than the slide heading.
        // v169: tagline + subtagline are now HARDCODED in index.html with
        // the preview styling (serif title with accent "Fire", kicker,
        // sub paragraph). The old admin-configurable tagline system has
        // been removed from the hero. We no longer overwrite the text,
        // font, or size from appState.config here. Only the kicker
        // alignment is adjusted responsively.
        const heroKickerEl = document.getElementById('heroKicker');
        if (heroKickerEl) {
          heroKickerEl.style.justifyContent = window.innerWidth <= 768 ? 'center' : 'flex-start';
        }
        // Start the hero slider and then initialise the Chef's Special carousel
        startHeroSlider();
        initChefSpecial();
        // v143: scroll-spy — highlights nav item for currently-visible section
        initScrollSpy();


        // v93: Populate About section from cfg.about. The layout is now
        // a tight two-column with one image on the left + text/features
        // on the right. Banner + midImage from v92 are CONSOLIDATED into
        // a single cfg.about.image — we read whichever is set, with
        // bannerImage taking precedence for back-compat.
        try {
          const aboutSection = document.getElementById('about');
          const aboutCfg = (appState.config && appState.config.about) || {};
          if (aboutSection) {
            if (aboutCfg.enabled === false || appState.config.showSections.about === false) {
              aboutSection.style.display = 'none';
            } else {
              aboutSection.style.display = '';
              // Title + subtitle
              const titleEl = document.getElementById('aboutTitle');
              const subEl   = document.getElementById('aboutSubtitle');
              if (titleEl) titleEl.textContent = aboutCfg.title || 'About Us';
              if (subEl)   subEl.textContent   = aboutCfg.subtitle || '';
              // Single image — back-compat: prefer `image`, then
              // `bannerImage`, then `midImage` from older configs.
              const imageUrl = aboutCfg.image || aboutCfg.bannerImage || aboutCfg.midImage || '';
              const imgEl = document.getElementById('aboutImage');
              if (imgEl) {
                if (imageUrl) {
                  imgEl.style.display = '';
                  imgEl.innerHTML = '<img src="' + escapeHtml(imageUrl) +
                    '" alt="' + escapeHtml(aboutCfg.title || 'About') + '" loading="lazy" />';
                } else {
                  // Use a bundled dining photograph only while the owner has
                  // not uploaded an About photo. Never overwrite saved settings.
                  imgEl.style.display = '';
                  imgEl.innerHTML = '<img src="assets/arabic/arabic-dining.webp"' +
                    ' alt="Warm, inviting Arabic restaurant dining atmosphere" loading="lazy" />';
                }
              }
              // Body text (paragraphs from blank lines)
              const bodyEl = document.getElementById('aboutBody');
              if (bodyEl) {
                const rawText = String(aboutCfg.bodyText || '').trim();
                const text = /^Welcome to our restaurant\. Add your story here from the Admin Panel/i.test(rawText)
                  ? 'At Al Fursan Grills & Restaurant, the warmth of the charcoal grill meets the joy of gathering around the table. From generous mixed grills to aromatic rice dishes, every plate is prepared for sharing and enjoying together.'
                  : rawText;
                if (text) {
                  bodyEl.innerHTML = text.split(/\n{2,}/).map(function (block) {
                    return '<p>' + escapeHtml(block).replace(/\n/g, '<br>') + '</p>';
                  }).join('');
                } else {
                  bodyEl.innerHTML = '';
                }
              }
              // Feature cards — now rendered as compact horizontal pills
              const featEl = document.getElementById('aboutFeatures');
              if (featEl) {
                const features = Array.isArray(aboutCfg.features) ? aboutCfg.features : [];
                featEl.innerHTML = features.filter(function (f) { return f && (f.title || f.description); })
                  .map(function (f) {
                    return '<div class="about-feature-pill">' +
                      '<div class="about-feature-icon"><i class="fa-solid ' + escapeHtml(f.icon || 'fa-circle') + '" aria-hidden="true"></i></div>' +
                      '<div class="about-feature-text">' +
                        '<h4>' + escapeHtml(f.title || '') + '</h4>' +
                        '<p>' + escapeHtml(f.description || '') + '</p>' +
                      '</div>' +
                      '</div>';
                  }).join('');
              }
            }
          }
        } catch (aboutErr) {
          console.warn('[About render] failed:', aboutErr);
        }

        // Menu categories
        const catContainer = document.getElementById('menuCategories');
        catContainer.innerHTML = '';
        const exploreBtn = document.createElement('button');
        exploreBtn.textContent = 'All';
        exploreBtn.dataset.cat = 'explore';
        // v103: flame-edge-rim adds the dancing fire border (no halo)
        // matching the chef-special-card style.
        exploreBtn.className =
          'flame-edge flame-edge-rim' +
          (selectedMenuCategory === 'explore' ? ' active' : '');
        exploreBtn.onclick = () => {
          document
            .querySelectorAll('#menu .categories button')
            .forEach((b) => b.classList.remove('active'));
          exploreBtn.classList.add('active');
          filterMenu('explore');
        };
        catContainer.appendChild(exploreBtn);
        const hotDealsBtn = document.createElement('button');
        hotDealsBtn.textContent = window.translateUiText ? window.translateUiText('Hot Deals') : 'Hot Deals';
        hotDealsBtn.dataset.cat = 'hot-deals';
        hotDealsBtn.className =
          'flame-edge flame-edge-rim' +
          (selectedMenuCategory === 'hot-deals' ? ' active' : '');
        hotDealsBtn.onclick = () => {
          document
            .querySelectorAll('#menu .categories button')
            .forEach((b) => b.classList.remove('active'));
          hotDealsBtn.classList.add('active');
          filterMenu('hot-deals');
        };
        catContainer.appendChild(hotDealsBtn);
        appState.categories.forEach((cat, idx) => {
          const btn = document.createElement('button');
          btn.textContent = cat.name;
          btn.dataset.cat = idx;
          btn.className =
            'flame-edge flame-edge-rim' +
            (selectedMenuCategory == idx ? ' active' : '');
          btn.onclick = () => {
            document
              .querySelectorAll('#menu .categories button')
              .forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            filterMenu(idx);
          };
          catContainer.appendChild(btn);
        });

        const arrowPrev = document.getElementById('categoryArrowPrev');
        const arrowNext = document.getElementById('categoryArrowNext');
        const sliderWrap = document.getElementById('categorySliderWrap');
        if (arrowPrev && arrowNext && catContainer) {
          const SCROLL_STEP = 240; // px per arrow click
          const updateArrowState = () => {
            const maxScroll = catContainer.scrollWidth - catContainer.clientWidth;
            const sl = catContainer.scrollLeft;
            const scrollable = maxScroll > 4;
            // Toggle no-scroll on wrap so the edge-fade mask disables
            // when there's nothing to scroll (looks cleaner for short lists).
            if (sliderWrap) sliderWrap.classList.toggle('no-scroll', !scrollable);
            // Disable arrows at scroll extremes (or always when not scrollable)
            arrowPrev.classList.toggle('is-disabled', !scrollable || sl <= 2);
            arrowNext.classList.toggle('is-disabled', !scrollable || sl >= maxScroll - 2);
            // Hide both arrows entirely if non-scrollable
            arrowPrev.style.display = scrollable ? '' : 'none';
            arrowNext.style.display = scrollable ? '' : 'none';
          };
          arrowPrev.onclick = () => {
            catContainer.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
          };
          arrowNext.onclick = () => {
            catContainer.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
          };
          catContainer.addEventListener('scroll', updateArrowState, { passive: true });
          window.addEventListener('resize', updateArrowState);
          requestAnimationFrame(updateArrowState);
        }
        // Build menu items
        buildMenuItems(selectedMenuCategory);

        // Gallery
        const gallery = document.getElementById('galleryGrid');
        // Clear previous content and reset duplication flags.  The
        // marquee builder will regenerate the content.
        gallery.innerHTML = '';
        if (gallery.dataset && gallery.dataset.duplicated) {
          delete gallery.dataset.duplicated;
        }
        if (appState.gallery.length === 0) {
          gallery.textContent = 'No images yet.';
        } else {
          // Ensure all gallery images have a renderable source. An item
          // is renderable if it has EITHER:
          //   - `url` (Supabase Storage public URL — preferred, used by
          //     cross-device synced images) OR
          //   - `data` (inline base64 data URL — local IndexedDB cache)
          //
          // If neither is present but `id` is, we try to load from local
          // IndexedDB as a last resort. ONLY when none of those work do
          // we remove the item.
          //
          // The previous code only checked for `data` and deleted any
          // URL-only items as "missing" — which broke cross-device sync.
          // When Device B received a new {id, url} row via realtime,
          // this code immediately removed it before render.
          appState.gallery.slice().forEach((img) => {
            // Has a URL or has inline data → already renderable, skip.
            if (img.url || img.data) return;
            // Only id present — try local IndexedDB
            if (img.id) {
              getImageFromDB(img.id)
                .then((data) => {
                  if (data) {
                    img.data = data;
                  } else {
                    // Truly missing — no url, no data, no IndexedDB entry.
                    const index = appState.gallery.indexOf(img);
                    if (index > -1) {
                      appState.gallery.splice(index, 1);
                      try {
                        saveData();
                      } catch (e) {
                        console.warn('Failed to save after removing missing gallery image', e);
                      }
                    }
                  }
                  // Rebuild the marquee after each asynchronous load or removal
                  startGalleryAutoscroll();
                })
                .catch((err) => {
                  console.error('Failed to load gallery image from DB', err);
                });
            }
          });
          // Build the marquee immediately for any images that already have data or url.
          startGalleryAutoscroll();
        }

        // Offers
        const offersGrid = document.getElementById('offersGrid');
        const offersExtraWrap = document.getElementById('offersExtraWrap');
        const offersExtraGrid = document.getElementById('offersExtraGrid');
        const offersActions = document.getElementById('offersActions');
        const offersToggleBtn = document.getElementById('offersToggleBtn');
        offersGrid.innerHTML = '';
        offersExtraGrid.innerHTML = '';
        offersActions.classList.add('hidden');
        offersExtraWrap.classList.remove('is-open');
        offersExtraWrap.style.maxHeight = '0px';
        offersToggleBtn.classList.remove('is-expanded');
        offersToggleBtn.querySelector('span').textContent = window.translateUiText ? window.translateUiText('View More') : 'View More';
        const now = Date.now();
        const offers = appState.offers.filter(
          (o) => o.enabled && o.end > now
        );
        if (offers.length === 0) {
          const emptyState = document.createElement('div');
          emptyState.className = 'offers-empty';
          emptyState.innerHTML = '<span class="afgr-empty-kicker">OUR LATEST SPECIALS</span>' +
            '<h3>Something delicious is coming.</h3>' +
            '<p>No active offers right now. Explore the menu and find your next favorite.</p>' +
            '<button type="button" data-ao-route-target="menu">Explore our menu &rarr;</button>';
          offersGrid.appendChild(emptyState);
        } else {
          const createOfferCard = (offer) => {
            const card = document.createElement('div');
            // v97: flame-edge skipped on offer cards because they have
            // their own ::before/::after pseudo-elements for the
            // existing gradient + corner glow. Adding flame on top
            // would conflict and look cluttered. The deal/discount
            // badges INSIDE these cards DO get flame-edge-soft, so
            // v103: has-flame-rim adds a dancing fire border to each
            // offer card (overrides the existing corner-glow ::after).
            card.className = 'offer-card has-flame-rim';
            const cardTop = document.createElement('div');
            cardTop.className = 'offer-card-top';
            const mark = document.createElement('div');
            mark.className = 'offer-card-mark';
            let labelIcon = 'fa-star';
            let labelText = 'Special';
            if (offer.discount >= 30) {
              labelIcon = 'fa-fire';
              labelText = 'Hot Deal';
            } else if (offer.type === 'combo') {
              labelIcon = 'fa-tags';
              labelText = 'Chef Pick';
            } else if (offer.type === 'product') {
              labelIcon = 'fa-tag';
              labelText = 'Signature';
            }
            mark.innerHTML = '<i class="fas ' + labelIcon + '"></i><span>' + labelText + '</span>';
            const discount = document.createElement('div');
            // v103: discount badge gets the flame-edge-rim treatment too
            discount.className = 'discount flame-edge flame-edge-rim';
            discount.textContent = offer.discount + '% OFF';
            cardTop.appendChild(mark);
            const body = document.createElement('div');
            body.className = 'offer-card-body';
            const title = document.createElement('h4');
            title.textContent = offer.title;
            const desc = document.createElement('p');
            // Build description with product names wrapped in <span> elements
            // so each name translates independently. Without this, the
            // whole sentence ("Valid for Spicy Chicken") is one text node;
            // the translator can match the static "Valid for " phrase but
            // the product name stays English. Wrapping it lets the
            // translator process the name through MyMemory auto-translate
            // (which will pick it up automatically once cached).
            desc.innerHTML = '';
            if (offer.type === 'product' && offer.productId) {
              const item = appState.menuItems.find((mi) => mi.id === offer.productId);
              const prefix = document.createTextNode('Valid for ');
              const nameSpan = document.createElement('span');
              nameSpan.className = 'offer-product-name';
              nameSpan.textContent = item ? item.name : 'Selected Product';
              desc.appendChild(prefix);
              desc.appendChild(nameSpan);
            } else if (offer.type === 'combo') {
              const names = getOfferProductNames(offer);
              if (names.length) {
                const prefix = document.createTextNode(
                  'Combo Deal — apply ' + offer.discount + '% OFF when you order: '
                );
                desc.appendChild(prefix);
                names.forEach((nm, i) => {
                  if (i > 0) desc.appendChild(document.createTextNode(' + '));
                  const span = document.createElement('span');
                  span.className = 'offer-product-name';
                  span.textContent = nm;
                  desc.appendChild(span);
                });
              } else {
                desc.textContent = 'Combo Deal — applies to selected products';
              }
            } else {
              let billText = 'Valid on entire bill';
              if (offer.minValue) {
                billText += ' (min AED ' + parseFloat(offer.minValue).toFixed(2) + ')';
              }
              desc.textContent = billText;
            }
            body.appendChild(title);
            body.appendChild(desc);
            const meta = document.createElement('div');
            meta.className = 'offer-meta';
            const metaLabel = document.createElement('div');
            metaLabel.className = 'offer-meta-label';
            metaLabel.innerHTML = '<i class="fas fa-clock"></i><span>' + (window.translateUiText ? window.translateUiText('Ending Soon') : 'Ending Soon') + '</span>';
            const countdown = document.createElement('div');
            countdown.className = 'countdown';
            meta.appendChild(metaLabel);
            meta.appendChild(countdown);
            card.appendChild(cardTop);
            card.appendChild(discount);
            card.appendChild(body);
            card.appendChild(meta);
            // update countdown every second
            function updateCountdown() {
              const diff = offer.end - Date.now();
              if (diff <= 0) {
                countdown.textContent = window.translateUiText ? window.translateUiText('Expired') : 'Expired';
                return;
              }
              countdown.textContent = window.formatOfferCountdown ? window.formatOfferCountdown(diff) : '0d 0h 0m remaining';
              requestAnimationFrame(updateCountdown);
            }
            updateCountdown();
            return card;
          };

          // Initial visible count: 3 on desktop, 2 on mobile.
          // The rest are hidden under "View More".
          const initialOfferCount = window.matchMedia('(min-width: 769px)').matches ? 3 : 2;

          offers.slice(0, initialOfferCount).forEach((offer) => {
            offersGrid.appendChild(createOfferCard(offer));
          });

          offers.slice(initialOfferCount).forEach((offer) => {
            offersExtraGrid.appendChild(createOfferCard(offer));
          });

          if (offers.length > initialOfferCount) {
            offersActions.classList.remove('hidden');
            offersToggleBtn.onclick = () => {
              const isExpanded = offersExtraWrap.classList.contains('is-open');
              if (isExpanded) {
                offersExtraWrap.style.maxHeight = offersExtraWrap.scrollHeight + 'px';
                requestAnimationFrame(() => {
                  offersExtraWrap.style.maxHeight = '0px';
                });
                offersExtraWrap.classList.remove('is-open');
                offersToggleBtn.classList.remove('is-expanded');
                offersToggleBtn.querySelector('span').textContent = window.translateUiText ? window.translateUiText('View More') : 'View More';
              } else {
                offersExtraWrap.classList.add('is-open');
                offersExtraWrap.style.maxHeight = offersExtraGrid.scrollHeight + 'px';
                offersToggleBtn.classList.add('is-expanded');
                offersToggleBtn.querySelector('span').textContent = window.translateUiText ? window.translateUiText('View Less') : 'View Less';
              }
            };
          } else {
            offersToggleBtn.onclick = null;
          }
        }

        // Premium testimonials carousel
        const slider = document.getElementById('testimonialsSlider');
        const controls = document.getElementById('testimonialsControls');
        if (window.testimonialTimer) {
          clearInterval(window.testimonialTimer);
          window.testimonialTimer = null;
        }
        if (slider) slider.innerHTML = '';
        if (controls) controls.innerHTML = '';
        if (!appState.reviews || appState.reviews.length === 0) {
          if (slider) slider.innerHTML = '<div class="testimonials-empty">No reviews yet.</div>';
        } else if (slider) {
          const track = document.createElement('div');
          track.className = 'testimonials-track';
          const buildCard = (rev) => {
            const card = document.createElement('div');
            card.className = 'testimonial has-flame-rim';
            const inner = document.createElement('div');
            inner.className = 'testimonial-card-inner';
            const top = document.createElement('div');
            top.className = 'testimonial-topline';
            const avatar = document.createElement('div');
            avatar.className = 'testimonial-avatar';
            // v153: if admin uploaded an avatar image, render it; else
            // fall back to colored circle with first letter of name.
            const avatarUrl = (rev.avatarUrl || '').trim();
            if (avatarUrl) {
              avatar.classList.add('has-image');
              const avatarImg = document.createElement('img');
              avatarImg.src = avatarUrl;
              avatarImg.alt = rev.name || '';
              avatarImg.loading = 'lazy';
              avatar.appendChild(avatarImg);
            } else {
              avatar.textContent = (rev.name || 'G').trim().charAt(0).toUpperCase();
            }
            // v151: meta block — name on top, subtitle below (admin-editable)
            const meta = document.createElement('div');
            meta.className = 'testimonial-meta';
            const nameEl = document.createElement('div');
            nameEl.className = 'name';
            nameEl.textContent = rev.name || 'Guest';
            meta.appendChild(nameEl);
            // Only render subtitle line if admin provided one (empty string = hidden)
            const subtitleText = (rev.subtitle || '').trim();
            if (subtitleText) {
              const sub = document.createElement('div');
              sub.className = 'testimonial-sub';
              sub.textContent = subtitleText;
              meta.appendChild(sub);
            }

            // v151: rating row below the topline. Stars left, time-ago right.
            // Matches Google Maps review layout.
            const ratingRow = document.createElement('div');
            ratingRow.className = 'testimonial-rating-row';
            const rating = document.createElement('div');
            rating.className = 'rating';
            const stars = Math.max(0, Math.min(5, Math.round(Number(rev.rating) || 5)));
            rating.setAttribute('aria-label', `${stars} out of 5 stars`);
            const starPath = 'M12 2l2.928 6.683 7.072 1.027-5.118 4.989 1.208 7.041L12 18.36l-6.09 3.38L7.118 14.7 2 9.71l7.072-1.027L12 2z';
            for (let i = 1; i <= 5; i++) {
              const filled = i <= stars;
              const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              star.setAttribute('viewBox', '0 0 24 24');
              star.setAttribute('class', filled ? 'star star-filled' : 'star star-empty');
              star.setAttribute('aria-hidden', 'true');
              const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              path.setAttribute('d', starPath);
              star.appendChild(path);
              rating.appendChild(star);
            }
            ratingRow.appendChild(rating);
            // Time-ago line — admin-editable. Only shown if provided.
            const timeAgoText = (rev.timeAgo || '').trim();
            if (timeAgoText) {
              const timeEl = document.createElement('span');
              timeEl.className = 'testimonial-time-ago';
              timeEl.textContent = timeAgoText;
              ratingRow.appendChild(timeEl);
            }

            top.appendChild(avatar);
            top.appendChild(meta);
            const msg = document.createElement('p');
            msg.textContent = rev.message || '';
            inner.appendChild(top);
            inner.appendChild(ratingRow);
            inner.appendChild(msg);
            card.appendChild(inner);
            return card;
          };
          appState.reviews.forEach((rev) => track.appendChild(buildCard(rev)));
          if (appState.reviews.length > 1) {
            appState.reviews.forEach((rev) => track.appendChild(buildCard(rev)));
          }
          slider.appendChild(track);
          if (controls && appState.reviews.length > 1) {
            controls.innerHTML = '<button class="testimonial-control" type="button" aria-label="Previous review"><i class="fa fa-chevron-left"></i></button><button class="testimonial-control" type="button" aria-label="Next review"><i class="fa fa-chevron-right"></i></button>';
          }
          startTestimonials();
        }

        // Compact contact actions. Both email and directions use saved Admin
        // contact settings; never hard-code a real-world destination or inbox.
        const contactInfo = document.getElementById('contactInfo');
        if (contactInfo) {
          contactInfo.replaceChildren();
          contactInfo.hidden = true; // The old tall, duplicate Google Maps card is removed.
          contactInfo.setAttribute('aria-hidden', 'true');
        }
        {
          const socials = contact.socials || {};
          const socialsDiv = document.getElementById('contactSocials');
          const brandIcons = {
            facebook: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.414c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97H15.83c-1.49 0-1.955.93-1.955 1.884v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z"/></svg>',
            instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><defs><radialGradient id="igRadial" cx="30%" cy="107%" r="130%"><stop offset="0" stop-color="#fdf497"/><stop offset="0.18" stop-color="#fdf497"/><stop offset="0.45" stop-color="#fd5949"/><stop offset="0.62" stop-color="#d6249f"/><stop offset="1" stop-color="#285AEB"/></radialGradient></defs><path fill="url(#igRadial)" d="M7.6 2h8.8A5.6 5.6 0 0 1 22 7.6v8.8a5.6 5.6 0 0 1-5.6 5.6H7.6A5.6 5.6 0 0 1 2 16.4V7.6A5.6 5.6 0 0 1 7.6 2Z"/><path fill="#fff" d="M12 7.35A4.65 4.65 0 1 0 12 16.65 4.65 4.65 0 0 0 12 7.35Zm0 7.55A2.9 2.9 0 1 1 12 9.1a2.9 2.9 0 0 1 0 5.8Zm4.86-7.76a1.09 1.09 0 1 1-2.18 0 1.09 1.09 0 0 1 2.18 0Z"/></svg>',
            tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#25F4EE" d="M10.35 8.35v8.06a2.3 2.3 0 1 1-2.3-2.3c.24 0 .47.04.69.11v-3.06a5.28 5.28 0 1 0 4.74 5.25V9.98a7.2 7.2 0 0 0 4.22 1.35V8.25a4.08 4.08 0 0 1-4.22-4.08h-3.13v4.18Z"/><path fill="#FE2C55" d="M12.22 4.17a4.08 4.08 0 0 0 4.22 4.08v2.12a7.17 7.17 0 0 1-2.96-.97v7.01a5.28 5.28 0 0 1-7.72 4.68 5.28 5.28 0 0 0 8.55-4.15V10.5a7.2 7.2 0 0 0 4.22 1.35V8.77a4.08 4.08 0 0 1-4.22-4.08h-2.09v-.52Z"/><path fill="#fff" d="M10.35 8.35v8.06a2.3 2.3 0 1 1-1.61-2.19v-3.06a5.28 5.28 0 1 0 4.74 5.25V9.98a7.2 7.2 0 0 0 4.22 1.35V8.25a4.08 4.08 0 0 1-4.22-4.08h-3.13v4.18Z"/></svg>',
            gmail: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M3 6.5 12 13l9-6.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5Z"/><path fill="#FBBC04" d="M3 6.5 12 13v3L3 9.5v-3Z"/><path fill="#34A853" d="M21 6.5V18a2 2 0 0 1-2 2h-1V9.5l3-3Z"/><path fill="#4285F4" d="M5 4h14a2 2 0 0 1 2 2v.5L12 13 3 6.5V6a2 2 0 0 1 2-2Z"/></svg>',
            map: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#34A853" d="M12 22s7-6.3 7-13A7 7 0 0 0 5 9c0 6.7 7 13 7 13Z"/><path fill="#FBBC04" d="M12 2a7 7 0 0 1 7 7c0 1.23-.24 2.43-.67 3.58L12 22V2Z" opacity=".85"/><path fill="#EA4335" d="M12 2A7 7 0 0 0 5 9c0 1.56.38 3.05.98 4.42L12 22V2Z" opacity=".9"/><circle cx="12" cy="9" r="2.55" fill="#4285F4"/><circle cx="12" cy="9" r="1.25" fill="#fff"/></svg>',
            phone: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z"/></svg>',
            // Official WhatsApp brand icon (green circle + white phone-bubble glyph).
            // Replaces the previous generic call-receiver icon in the Contact Us
            // box. Tap now opens WhatsApp at wa.me/<number> instead of the dialer.
            whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#25D366" d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.06L2 22l5.06-1.34A9.93 9.93 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Z"/><path fill="#fff" d="M17.4 14.36c-.27-.13-1.6-.78-1.84-.87-.25-.09-.43-.13-.6.13-.18.27-.69.87-.85 1.05-.16.18-.31.2-.58.07-.27-.13-1.14-.42-2.17-1.34a8.22 8.22 0 0 1-1.5-1.87c-.16-.27-.02-.41.12-.55.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.6-1.45-.82-1.99-.22-.52-.44-.45-.6-.45-.16 0-.34-.02-.51-.02-.18 0-.47.07-.71.34-.25.27-.94.92-.94 2.25 0 1.32.96 2.6 1.09 2.78.13.18 1.89 2.88 4.58 4.04.64.28 1.14.44 1.53.57.64.2 1.23.18 1.69.11.52-.08 1.6-.65 1.82-1.28.22-.63.22-1.17.16-1.28-.07-.11-.24-.18-.51-.31Z"/></svg>'
          };
          const normalizeExternalLink = (value) => {
            const link = String(value || '').trim();
            if (!link) return '';
            if (/^(https?:|mailto:|tel:|whatsapp:)/i.test(link)) return link;
            return 'https://' + link.replace(/^\/+/, '');
          };
          const waSource = String(contact.whatsapp || contact.phone || '').trim();
          const waDigits = waSource.replace(/[^\d]/g, '');
          const waHref = waDigits ? 'https://wa.me/' + waDigits : '';
          // "Official Email" always follows the admin-configured contact.email.
          const savedEmail = String(contact.email || '').trim().replace(/^mailto:/i, '');
          const emailHref = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(savedEmail)
            ? 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(savedEmail) : '';
          const addressText = String(contact.address || '').trim();
          let preciseMapLink = '';
          try {
            const link = new URL(String(contact.map || '').trim());
            const hostname = link.hostname.toLowerCase();
            const isMapsHost = ['www.google.com', 'google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'].includes(hostname);
            const hasLocation = /\/(place|dir|search)\//i.test(link.pathname) ||
              /\/maps\/\@[-.0-9,]+/i.test(link.pathname) ||
              /\/maps\/\?q=/i.test(link.href) ||
              ['q', 'query', 'cid', 'place_id', 'destination', 'daddr'].some(key => link.searchParams.has(key)) ||
              hostname === 'maps.app.goo.gl' || (hostname === 'goo.gl' && link.pathname.startsWith('/maps/'));
            if (link.protocol === 'https:' && isMapsHost && hasLocation) preciseMapLink = link.href;
          } catch (_) { /* Use the admin-saved street address if there is one. */ }
          const mapHref = preciseMapLink || (addressText
            ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(addressText) + '&travelmode=driving'
            : '');
          const iconLinks = [
            { key: 'facebook', label: 'Facebook', href: normalizeExternalLink(socials.facebook), html: brandIcons.facebook },
            { key: 'instagram', label: 'Instagram', href: normalizeExternalLink(socials.instagram), html: brandIcons.instagram },
            { key: 'tiktok', label: 'TikTok', href: normalizeExternalLink(socials.tiktok), html: brandIcons.tiktok },
            { key: 'whatsapp', label: 'WhatsApp', href: waHref, html: brandIcons.whatsapp },
            { key: 'email', label: 'Email', href: emailHref, html: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="3" fill="#F0AD60"/><path d="M4.7 7.5 12 12.9 19.3 7.5V9L12 14.3 4.7 9Z" fill="#75401C"/></svg>' },
            { key: 'map', label: 'Directions', href: mapHref, html: brandIcons.map }
          ];
          if (socialsDiv) {
            socialsDiv.replaceChildren();
            iconLinks.forEach((item) => {
              if (!item.href) return;
              const a = document.createElement('a');
              a.href = item.href;
              a.className = `contact-icon-link contact-icon-${item.key}`;
              a.setAttribute('aria-label', item.key === 'map' && addressText ? 'Get directions to ' + addressText : item.label);
              a.setAttribute('title', item.key === 'map' && addressText ? addressText : item.key === 'email' ? savedEmail : item.label);
              if (!item.href.startsWith('mailto:') && !item.href.startsWith('tel:')) {
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
              }
              const iconBox = document.createElement('span');
              iconBox.className = 'contact-brand-icon';
              iconBox.setAttribute('aria-hidden', 'true');
              iconBox.innerHTML = item.html;
              const nameBox = document.createElement('span');
              nameBox.className = 'contact-brand-name';
              nameBox.textContent = item.label;
              const labelBlock = document.createElement('span');
              labelBlock.className = 'contact-brand-text';
              labelBlock.appendChild(nameBox);
              // Show the exact address saved by the administrator, below Directions.
              if (item.key === 'map' && addressText) {
                const address = document.createElement('small');
                address.className = 'contact-brand-detail';
                address.textContent = addressText;
                labelBlock.appendChild(address);
              }
              const arrowBox = document.createElement('span');
              arrowBox.className = 'contact-brand-arrow';
              arrowBox.setAttribute('aria-hidden', 'true');
              arrowBox.textContent = '↗';
              a.append(iconBox, labelBlock, arrowBox);
              socialsDiv.appendChild(a);
            });
          }
        }

        const contactForm = document.getElementById('contactForm');
        const contactAccountEmail = document.getElementById('contactAccountEmail');
        const activeContactUser = appState.session
          ? appState.users.find((u) => u.id === appState.session.id)
          : null;
        if (contactAccountEmail) {
          contactAccountEmail.value =
            activeContactUser && activeContactUser.email
              ? activeContactUser.email
              : '';
          contactAccountEmail.placeholder = activeContactUser
            ? 'No email saved on account'
            : 'Login required';
        }
        if (contactForm && !contactForm.dataset.bound) {
          contactForm.dataset.bound = 'true';
          contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const alert = document.getElementById('contactAlert');
            const session = appState.session;
            const user = session ? appState.users.find((u) => u.id === session.id) : null;
            if (!session || !user || session.role !== 'customer') {
              if (alert) alert.textContent = 'Please login to send a request';
              openLoginModal();
              return;
            }
            const userEmail = user.email || '';
            if (!userEmail) {
              if (alert) alert.textContent = 'Please add an email to your account before sending a request';
              return;
            }
            const nameInput = document.getElementById('contactName');
            const messageInput = document.getElementById('contactMessage');
            const name = nameInput ? nameInput.value : user.displayName || user.username || '';
            const message = messageInput ? messageInput.value : '';
            if (!String(message).trim()) {
              if (alert) alert.textContent = 'Please enter your message';
              return;
            }
            // Build request record. Use App.Repo.Requests.create so the
            // sync hook fires (was previously appState.requests.unshift,
            // which silently skipped Supabase).
            var __request = {
              id: generateId(),
              userId: user.id,
              name: String(name).trim() || user.displayName || user.username || 'Customer',
              email: userEmail,
              message: String(message).trim(),
              timestamp: Date.now()
            };
            App.Repo.Requests.create(__request);
            // Maintain the original ordering: unshift onto the local array
            // for the existing UI rendering code that relies on newest-first.
            if (Array.isArray(appState.requests)) {
              var insertedIdx = appState.requests.findIndex(function (r) { return r && r.id === __request.id; });
              if (insertedIdx > 0) {
                appState.requests.splice(insertedIdx, 1);
                appState.requests.unshift(__request);
                saveData();
              }
            }
            // Force-flush so any RLS error surfaces immediately
            if (App.SupabaseSync && App.SupabaseSync._flush) {
              setTimeout(function () { App.SupabaseSync._flush(); }, 0);
            }
            publishRealtimePayload('requests', __request);
            contactForm.reset();
            const accountEmailInput = document.getElementById('contactAccountEmail');
            if (accountEmailInput) accountEmailInput.value = userEmail;
            if (alert) alert.textContent = 'Thank you. Your request has been sent.';
            const activeNav = document.querySelector('#adminNav li.active');
            if (activeNav && activeNav.dataset.target === 'requests') {
              renderAdminSection('requests');
            }
          });
        }

        // Footer text
        const footerTextEl = document.getElementById('footerText');
        if (footerTextEl) {
          // Compact single-line footer with legal links.
          // Layout: © 2026 Al Fursan · Privacy Policy · Terms of Service · Contact
          // The separators are middle-dots; "Privacy Policy" and "Terms of
          // Service" open dedicated full-page legal views; "Contact"
          // smooth-scrolls to the existing #contact section on the same page.
          const restaurantName = (appState.config && appState.config.restaurantName) || 'Al Fursan';
          const year = new Date().getFullYear();
          footerTextEl.innerHTML =
            '<span class="footer-copyright">© ' + year + ' ' + escapeHtml(restaurantName) + '</span>' +
            '<span class="footer-sep" aria-hidden="true">·</span>' +
            '<a href="#" class="footer-link" data-legal="privacy">Privacy</a>' +
            '<span class="footer-sep" aria-hidden="true">·</span>' +
            '<a href="#" class="footer-link" data-legal="terms">Terms</a>' +
            '<span class="footer-sep" aria-hidden="true">·</span>' +
            '<a href="#contact" class="footer-link" data-footer-contact="1">Contact</a>';
          // Wire the legal links — both open the same in-app view; the
          // data-legal attribute selects which document to render.
          footerTextEl.querySelectorAll('a[data-legal]').forEach(function (a) {
            a.addEventListener('click', function (e) {
              e.preventDefault();
              const which = this.getAttribute('data-legal');
              openLegalPage(which);
            });
          });
          // Wire the Contact link — smooth-scroll to the existing contact section
          const contactLinkEl = footerTextEl.querySelector('a[data-footer-contact]');
          if (contactLinkEl) {
            contactLinkEl.addEventListener('click', function (e) {
              e.preventDefault();
              const section = document.getElementById('contact');
              if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          }
        }
        renderDeveloperInfoPopup();
        const developerLinkEl = document.getElementById('developerContactLink');
        if (developerLinkEl) {
          developerLinkEl.textContent = 'Developed By';
          developerLinkEl.setAttribute('aria-label', 'Open Developed By information');
          developerLinkEl.setAttribute('title', 'Developed By');
          developerLinkEl.onclick = (event) => {
            event.preventDefault();
            openDeveloperInfoModal();
          };
        }

        // Apply theme colours
        applyTheme();

        // Adjust account button based on session.  Preserve the icon-only content and update
        // the tooltip and click handler accordingly.  Customers see a "My Account" tooltip.
        const loginBtn = document.getElementById('loginButton');
        if (loginBtn) {
          if (appState.session && appState.session.role === 'customer') {
            loginBtn.title = 'My Account';
            loginBtn.onclick = openAccountModal;
          } else {
            loginBtn.title = 'Account login';
            loginBtn.onclick = openLoginModal;
          }
        }

        // Start auto‑scrolling the gallery once items are loaded
        startGalleryAutoscroll();
        renderAnnouncementPopup();
        if (window.applyRestaurantTranslations) window.applyRestaurantTranslations(document.body);
      }

      const MENU_ITEM_FALLBACK_IMAGE =
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=60';

      function getMenuItemImage(item) {
        return (item && item.image) || MENU_ITEM_FALLBACK_IMAGE;
      }

      function formatMenuPrice(price) {
        if (typeof price === 'number' && Number.isFinite(price)) {
          return 'AED ' + price.toFixed(2);
        }
        if (typeof price === 'string' && price.trim()) {
          return price.trim();
        }
        return 'AED 0.00';
      }

      // [extracted to App.Util.formatCurrency - see js/02-util.js]

      // [extracted to App.Util.isOfferActive - see js/02-util.js]

      function getActiveOffers(now = Date.now()) {
        return Array.isArray(appState.offers)
          ? appState.offers.filter((offer) => isOfferActive(offer, now))
          : [];
      }

      function slugifyVariationName(value) {
        return String(value || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'variation';
      }

      function normalizeVariationRecord(variation, fallbackItem, index = 0) {
        const fallbackSellingPrice = fallbackItem
          ? (
            Number.isFinite(Number(fallbackItem.sellingPrice))
              ? Number(fallbackItem.sellingPrice)
              : (Number.isFinite(Number(fallbackItem.price)) ? Number(fallbackItem.price) : 0)
          )
          : 0;
        const fallbackOriginalPrice = fallbackItem && fallbackItem.originalPrice !== '' && fallbackItem.originalPrice !== null && fallbackItem.originalPrice !== undefined
          ? Number(fallbackItem.originalPrice)
          : null;
        const variationName = String(variation && variation.name ? variation.name : `Option ${index + 1}`).trim() || `Option ${index + 1}`;
        const sellingPrice = Number.isFinite(Number(variation && variation.sellingPrice))
          ? Number(variation.sellingPrice)
          : Number.isFinite(Number(variation && variation.price))
            ? Number(variation.price)
            : fallbackSellingPrice;
        const rawOriginal = variation && variation.originalPrice !== undefined ? variation.originalPrice : fallbackOriginalPrice;
        const parsedOriginal = rawOriginal === '' || rawOriginal === null || rawOriginal === undefined
          ? null
          : Number(rawOriginal);
        return {
          id: variation && variation.id ? variation.id : generateId(),
          name: variationName,
          sellingPrice: sellingPrice,
          originalPrice: Number.isFinite(parsedOriginal) ? parsedOriginal : null,
          enabled: variation && variation.enabled === false ? false : true,
          stockKey: variation && variation.stockKey ? variation.stockKey : slugifyVariationName(variationName)
        };
      }

      function getItemVariations(item) {
        if (!item || !Array.isArray(item.variations)) return [];
        return item.variations
          .map((variation, index) => normalizeVariationRecord(variation, item, index))
          .filter((variation) => variation && variation.name);
      }

      function hasEnabledVariations(item) {
        return !!(item && item.variationsEnabled && getItemVariations(item).some((variation) => variation.enabled !== false));
      }

      function getDefaultVariation(item) {
        const variations = getItemVariations(item).filter((variation) => variation.enabled !== false);
        if (!variations.length) return null;
        const priorityVariation = variations.find((variation) => {
          const originalPrice = variation.originalPrice === null ? null : Number(variation.originalPrice);
          return (originalPrice !== null && originalPrice > Number(variation.sellingPrice || 0))
            || getLinkedOffersForItem(item.id, variation.id).length;
        });
        return priorityVariation || variations[0];
      }

      function getVariationById(item, variationId) {
        if (!item || !variationId) return null;
        return getItemVariations(item).find((variation) => variation.id === variationId) || null;
      }

      function getResolvedVariation(item, variationId) {
        if (!hasEnabledVariations(item)) return null;
        return getVariationById(item, variationId) || getDefaultVariation(item);
      }

      function getSellingPrice(item, variationId = '') {
        if (!item) return 0;
        const variation = getResolvedVariation(item, variationId);
        if (variation) return Number(variation.sellingPrice || 0);
        const directPrice = Number(item.sellingPrice);
        if (Number.isFinite(directPrice)) return directPrice;
        const legacyPrice = Number(item.price);
        return Number.isFinite(legacyPrice) ? legacyPrice : 0;
      }

      function getOriginalPrice(item, variationId = '') {
        if (!item) return null;
        const variation = getResolvedVariation(item, variationId);
        if (variation) {
          return variation.originalPrice === null ? null : Number(variation.originalPrice);
        }
        if (item.originalPrice === '' || item.originalPrice === null || item.originalPrice === undefined) return null;
        const originalPrice = Number(item.originalPrice);
        return Number.isFinite(originalPrice) ? originalPrice : null;
      }

      function getVariationLabel(item, variationId = '') {
        const variation = getResolvedVariation(item, variationId);
        return variation ? variation.name : '';
      }

      function getVariationStockKey(item, variationId = '') {
        const variation = getResolvedVariation(item, variationId);
        return variation ? variation.stockKey : '';
      }

      function getMenuPricing(item, variationId = '') {
        const variation = getResolvedVariation(item, variationId);
        const sellingPrice = getSellingPrice(item, variation ? variation.id : variationId);
        const originalPrice = getOriginalPrice(item, variation ? variation.id : variationId);
        const discountActive = originalPrice !== null && originalPrice > sellingPrice && sellingPrice >= 0;
        const discountPercent = discountActive ? ((originalPrice - sellingPrice) / originalPrice) * 100 : 0;
        const roundedDiscount = Math.round(discountPercent);
        const hasDiscount = discountActive && roundedDiscount > 0;
        return {
          sellingPrice,
          originalPrice,
          hasDiscount,
          // Short badge for product cards: just the percent (e.g. "10% OFF")
          shortBadge: hasDiscount ? `${roundedDiscount}% OFF` : '',
          // Long descriptive label for checkout deal lists
          badgeText: hasDiscount
            ? `Discount ${roundedDiscount}% off — saved ${formatCurrency(originalPrice - sellingPrice)} per item`
            : '',
          discountPercent: roundedDiscount,
          variationId: variation ? variation.id : '',
          variationName: variation ? variation.name : '',
          stockKey: variation ? variation.stockKey : ''
        };
      }

      function itemHasVariationDiscount(item) {
        return getItemVariations(item).some((variation) => {
          const original = variation.originalPrice === null ? null : Number(variation.originalPrice);
          return original !== null && original > Number(variation.sellingPrice || 0);
        });
      }

      function normalizeComboRequirement(requirement) {
        if (!requirement || !requirement.productId) return null;
        return {
          productId: requirement.productId,
          variationId: requirement.variationId || ''
        };
      }

      function getComboOfferRequirements(offer) {
        if (!offer || offer.type !== 'combo') return [];
        if (Array.isArray(offer.comboRequirements) && offer.comboRequirements.length) {
          return offer.comboRequirements.map(normalizeComboRequirement).filter(Boolean);
        }
        if (Array.isArray(offer.productIds)) {
          return offer.productIds.map((productId) => normalizeComboRequirement({ productId, variationId: '' })).filter(Boolean);
        }
        return [];
      }

      function getLinkedOffersForItem(itemId, variationId = '', now = Date.now()) {
        return getActiveOffers(now).filter((offer) => {
          if (!offer || !itemId) return false;
          if (offer.type === 'product') {
            if (offer.productId !== itemId) return false;
            return !offer.productVariationId || offer.productVariationId === variationId;
          }
          if (offer.type === 'combo') {
            return getComboOfferRequirements(offer).some((requirement) =>
              requirement.productId === itemId && (!requirement.variationId || requirement.variationId === variationId)
            );
          }
          return false;
        });
      }

      function getPrimaryDealForItem(item, variationId = '', now = Date.now()) {
        if (!item) return null;
        const linkedOffers = getLinkedOffersForItem(item.id, variationId, now);
        return linkedOffers.length ? linkedOffers[0] : null;
      }

      function getOfferProductNames(offer) {
        if (!offer) return [];
        const comboRequirements = offer.type === 'combo' ? getComboOfferRequirements(offer) : [];
        const ids = offer.type === 'combo'
          ? comboRequirements.map((entry) => entry.productId)
          : offer.type === 'product' && offer.productId
            ? [offer.productId]
            : [];
        return ids
          .map((id, index) => ({ item: appState.menuItems.find((mi) => mi.id === id), comboRequirement: offer.type === 'combo' ? comboRequirements[index] : null }))
          .filter((entry) => !!entry.item)
          .map(({ item, comboRequirement }) => {
            if (offer.type === 'combo' && comboRequirement && comboRequirement.variationId) {
              const comboVariationLabel = getVariationLabel(item, comboRequirement.variationId);
              return comboVariationLabel ? `${item.name} - ${comboVariationLabel}` : (item.name || 'Product');
            }
            if (offer.type === 'product' && offer.productVariationId) {
              const variationLabel = getVariationLabel(item, offer.productVariationId);
              return variationLabel ? `${item.name} - ${variationLabel}` : (item.name || 'Product');
            }
            return item.name || 'Product';
          });
      }

      function hasActiveDeal(item, variationId = '', now = Date.now()) {
        return !!(item && getLinkedOffersForItem(item.id, variationId, now).length);
      }

      function itemHasAnyDiscountOrDeal(item, now = Date.now()) {
        if (!item) return false;
        if (hasEnabledVariations(item)) {
          const enabledVariations = getItemVariations(item).filter((variation) => variation.enabled !== false);
          return enabledVariations.some((variation) => {
            const pricing = getMenuPricing(item, variation.id);
            return pricing.hasDiscount || hasActiveDeal(item, variation.id, now);
          });
        }
        const pricing = getMenuPricing(item);
        return pricing.hasDiscount || hasActiveDeal(item, '', now);
      }

      function appendProductBadges(target, item, pricing, now = Date.now()) {
        if (!target || !item) return;
        const activeVariationId = pricing && pricing.variationId ? pricing.variationId : '';
        const primaryDeal = getPrimaryDealForItem(item, activeVariationId, now);
        if (primaryDeal) {
          const dealBadge = document.createElement('button');
          dealBadge.type = 'button';
          // v97: flame-edge-soft gives a subtle dancing fire halo around
          // signature badges — premium fire energy without overpowering
          // the small badge text.
          dealBadge.className = 'deal-badge flame-edge flame-edge-soft';
          dealBadge.textContent = window.translateUiText ? window.translateUiText('DEAL') : 'DEAL';
          dealBadge.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            openDealDetailsModal(item, primaryDeal);
          };
          target.appendChild(dealBadge);
        }
        if (pricing && pricing.hasDiscount) {
          const discountBadge = document.createElement('div');
          discountBadge.className = 'discount-badge flame-edge flame-edge-soft';
          // Compact text only — full description appears at checkout
          discountBadge.textContent = pricing.shortBadge || (pricing.discountPercent + '% OFF');
          target.appendChild(discountBadge);
        }
      }

      function createPriceStack(pricing) {
        const priceStack = document.createElement('div');
        priceStack.className = 'price-stack';
        if (pricing && pricing.hasDiscount) {
          const oldPrice = document.createElement('span');
          oldPrice.className = 'original-price';
          oldPrice.textContent = formatMenuPrice(pricing.originalPrice);
          priceStack.appendChild(oldPrice);
        }
        const price = document.createElement('span');
        price.className = pricing && pricing.hasDiscount ? 'selling-price' : '';
        price.textContent = formatMenuPrice(pricing ? pricing.sellingPrice : 0);
        priceStack.appendChild(price);
        return priceStack;
      }

      function openDealDetailsModal(item, deal) {
        const modal = document.getElementById('dealDetailsModal');
        const content = document.getElementById('dealDetailsContent');
        if (!modal || !content || !deal) return;
        const validityText = deal.end
          ? `Valid until ${new Date(deal.end).toLocaleDateString()}`
          : 'Available for a limited time';
        const productNames = getOfferProductNames(deal);
        // Wrap each product name in a <span> so it's a translatable text node
        // independent of the surrounding sentence. The translator processes
        // each span separately via MyMemory.
        const namesListHtml = productNames.map((name) =>
          `• <span class="offer-product-name">${escapeHtml(name)}</span>`
        ).join('<br>');
        const comboCondition = deal.type === 'combo' && productNames.length
          ? `<p>This deal is valid only when you add:</p><p>${namesListHtml}</p>`
          : `<p>${deal.title || (item && item.name ? `<span class="offer-product-name">${escapeHtml(item.name)}</span> includes an active deal.` : 'This product includes an active deal.')}</p>`;
        content.innerHTML = `
          <h3 id="dealDetailsTitle">Deal Details</h3>
          <div class="deal-modal-body">
            <div class="deal-modal-name">${deal.title || (item && item.name ? item.name : 'Active Deal')}</div>
            ${comboCondition}
            <div class="deal-modal-discount">${Math.round(Number(deal.discount) || 0)}% OFF</div>
            <p>${validityText}</p>
          </div>
        `;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
      }

      function closeDealDetailsModal() {
        const modal = document.getElementById('dealDetailsModal');
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      }

      function getCartLineKey(itemId, variationId = '') {
        return `${itemId}::${variationId || 'base'}`;
      }

      function getResolvedCartLine(cartLine) {
        if (!cartLine) return null;
        const item = appState.menuItems.find((entry) => entry.id === cartLine.id);
        if (!item) return null;
        const variation = getResolvedVariation(item, cartLine.variationId || '');
        const variationId = variation ? variation.id : '';
        const pricing = getMenuPricing(item, variationId);
        const qty = Number(cartLine.qty || 0);
        return {
          lineKey: getCartLineKey(item.id, variationId),
          item,
          qty,
          variation,
          variationId,
          variationName: variation ? variation.name : '',
          stockKey: variation ? variation.stockKey : '',
          pricing
        };
      }

      function createOrderItemSnapshot(cartLine) {
        const resolved = getResolvedCartLine(cartLine);
        if (!resolved) return null;
        const unitPrice = Number(resolved.pricing.sellingPrice || 0);
        return {
          id: resolved.item.id,
          qty: resolved.qty,
          lineKey: resolved.lineKey,
          productName: resolved.item.name || 'Product',
          variationId: resolved.variationId,
          variationName: resolved.variationName,
          variationStockKey: resolved.stockKey,
          unitPrice: unitPrice,
          originalUnitPrice: resolved.pricing.originalPrice !== null ? Number(resolved.pricing.originalPrice) : null,
          lineTotal: unitPrice * resolved.qty
        };
      }

      function getCartPricingBreakdown(cartItems) {
        const now = Date.now();
        const activeOffers = getActiveOffers(now);
        const itemsInCart = (Array.isArray(cartItems) ? cartItems : [])
          .map((ci) => {
            const resolved = getResolvedCartLine(ci);
            if (!resolved || !resolved.qty) return null;
            const pricing = resolved.pricing;
            // When the admin sets a higher originalPrice (dummy/crossed-out
            // price) than the sellingPrice, the gap is an explicit per-product
            // discount and counts as a real saving in the bill summary. The
            // pricing.badgeText label like "40% OFF" is attached so the
            // checkout product list can display it.
            const baseUnitPrice = pricing.hasDiscount ? pricing.originalPrice : pricing.sellingPrice;
            const sellingUnitPrice = pricing.sellingPrice;
            const qty = resolved.qty;
            const baseSavings = Math.max(0, (baseUnitPrice - sellingUnitPrice) * qty);
            const labels = pricing.hasDiscount ? [pricing.badgeText] : [];
            return {
              lineKey: resolved.lineKey,
              id: resolved.item.id,
              name: resolved.item.name || 'Product',
              qty,
              variationId: resolved.variationId,
              variationName: resolved.variationName,
              stockKey: resolved.stockKey,
              pricing,
              sellingLineTotal: sellingUnitPrice * qty,
              baseLineTotal:    baseUnitPrice * qty,
              totalSaved: baseSavings,
              labels
            };
          })
          .filter(Boolean);

        const cartKeys = itemsInCart.map((entry) => entry.lineKey);
        const cartIds = itemsInCart.map((entry) => entry.id);
        const sellingSubtotal = itemsInCart.reduce((sum, entry) => sum + entry.sellingLineTotal, 0);
        const subtotal = itemsInCart.reduce((sum, entry) => sum + entry.baseLineTotal, 0);

        itemsInCart.forEach((entry) => {
          activeOffers.forEach((offer) => {
            const rawPct = Math.max(0, Math.min(99, Number(offer.discount) || 0));
            const rate = rawPct / 100;
            const labelPct = Math.round(rawPct);
            if (!rate) return;
            // Offer title shown on the product card — falls back to a
            // generic name if the admin didn't set one.
            const offerTitle = (offer.title || offer.name || '').toString().trim() || 'Special Offer';
            if (offer.type === 'product' && offer.productId === entry.id && (!offer.productVariationId || offer.productVariationId === entry.variationId)) {
              const savings = entry.sellingLineTotal * rate;
              if (savings > 0) {
                entry.totalSaved += savings;
                // Label shows: deal name + percent off + amount saved
                entry.labels.push(`${offerTitle} (${labelPct}% off — saved ${formatCurrency(savings)})`);
              }
            } else if (
              offer.type === 'combo' &&
              getComboOfferRequirements(offer).length &&
              getComboOfferRequirements(offer).every((requirement) => {
                if (!requirement.variationId) return cartIds.includes(requirement.productId);
                return cartKeys.includes(getCartLineKey(requirement.productId, requirement.variationId));
              }) &&
              getComboOfferRequirements(offer).some((requirement) =>
                requirement.productId === entry.id && (!requirement.variationId || requirement.variationId === entry.variationId)
              )
            ) {
              const savings = entry.sellingLineTotal * rate;
              if (savings > 0) {
                entry.totalSaved += savings;
                const comboNames = getOfferProductNames(offer);
                // Show: combo deal name + product list + percent + amount
                entry.labels.push(`${offerTitle} — Combo Deal (${comboNames.join(' + ')}) ${labelPct}% off — saved ${formatCurrency(savings)}`);
              }
            }
          });
        });

        const sharedDiscounts = [];
        activeOffers.forEach((offer) => {
          const rawPct = Math.max(0, Math.min(99, Number(offer.discount) || 0));
          const rate = rawPct / 100;
          if (!rate) return;
          if (offer.type === 'bill') {
            const minVal = Number(offer.minValue) || 0;
            if (sellingSubtotal >= minVal) {
              sharedDiscounts.push({
                label: `${Math.round(rawPct)}% OFF`,
                amount: sellingSubtotal * rate
              });
            }
          }
        });
        // The legacy global "discountRate" / "discountThreshold" feature
        // has been removed from admin Settings. Any value still in storage
        // is ignored here so it can't quietly apply to bills. Discounts
        // now come ONLY from per-item original/selling price gaps and
        // configured Offers (product / combo / bill-wide).

        const allocBase = sellingSubtotal > 0 ? sellingSubtotal : itemsInCart.length;
        sharedDiscounts.forEach((sharedDiscount) => {
          itemsInCart.forEach((entry, index) => {
            const isLast = index === itemsInCart.length - 1;
            const allocatedSoFar = itemsInCart
              .slice(0, index)
              .reduce((sum, prev) => sum + (prev._sharedAllocated || 0), 0);
            const proportionalAmount = allocBase > 0
              ? (sharedDiscount.amount * (sellingSubtotal > 0 ? entry.sellingLineTotal : 1)) / allocBase
              : 0;
            const allocation = isLast
              ? Math.max(0, sharedDiscount.amount - allocatedSoFar)
              : proportionalAmount;
            if (allocation > 0) {
              entry.totalSaved += allocation;
              entry._sharedAllocated = (entry._sharedAllocated || 0) + allocation;
              if (!entry.labels.includes(sharedDiscount.label)) {
                entry.labels.push(sharedDiscount.label);
              }
            }
          });
        });

        itemsInCart.forEach((entry) => {
          entry.totalSaved = Math.min(entry.totalSaved, entry.baseLineTotal);
          delete entry._sharedAllocated;
        });

        const totalDiscount = Math.min(
          subtotal,
          itemsInCart.reduce((sum, entry) => sum + entry.totalSaved, 0)
        );
        return {
          subtotal,
          sellingSubtotal,
          totalDiscount,
          items: itemsInCart.map((entry) => ({
            lineKey: entry.lineKey,
            id: entry.id,
            name: entry.name,
            qty: entry.qty,
            variationId: entry.variationId,
            variationName: entry.variationName,
            stockKey: entry.stockKey,
            unitPrice: entry.pricing.sellingPrice,
            originalUnitPrice: entry.pricing.originalPrice,
            lineTotal: entry.sellingLineTotal,
            // Final payable amount for this product line after every discount
            // attributable to it (per-item original/selling gap + share of
            // offer/combo/bill-wide savings). Used by the Checkout product
            // list to show the final per-row total the customer actually
            // pays for this item.
            finalLineTotal: Math.max(0, entry.baseLineTotal - entry.totalSaved),
            totalSaved: entry.totalSaved,
            labels: entry.labels
          }))
        };
      }

      let menuVariationSelections = {};

      function getSelectedMenuVariationId(item) {
        if (!hasEnabledVariations(item)) return '';
        const stored = menuVariationSelections[item.id];
        const resolved = getResolvedVariation(item, stored || '');
        if (!resolved) return '';
        menuVariationSelections[item.id] = resolved.id;
        return resolved.id;
      }

      function buildVariationSelector(item, onSelect) {
        if (!hasEnabledVariations(item)) return null;
        const shell = document.createElement('div');
        shell.className = 'variation-shell';
        const label = document.createElement('div');
        label.className = 'variation-label';
        label.textContent = 'Choose Option';
        const chipList = document.createElement('div');
        chipList.className = 'variation-chip-list';
        const selectedId = getSelectedMenuVariationId(item);
        getItemVariations(item)
          .filter((variation) => variation.enabled !== false)
          .forEach((variation) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            // v105: variation chips (Small, Medium, Half, Full, etc.)
            // get the flame-edge-rim treatment matching category pills.
            chip.className =
              'variation-chip flame-edge flame-edge-rim' +
              (variation.id === selectedId ? ' is-active' : '');
            chip.textContent = variation.name;
            chip.onclick = () => {
              menuVariationSelections[item.id] = variation.id;
              chipList.querySelectorAll('.variation-chip').forEach((entry) => entry.classList.remove('is-active'));
              chip.classList.add('is-active');
              if (typeof onSelect === 'function') onSelect(variation.id);
            };
            chipList.appendChild(chip);
          });
        shell.appendChild(label);
        shell.appendChild(chipList);
        return shell;
      }

      function getMenuGridColumnCount(container) {
        // Match the CSS breakpoints exactly so the JS-side limit matches
        // what's visually rendered.
        if (window.matchMedia('(max-width: 768px)').matches) return 2;
        // Wide desktop: 5 columns (matches CSS @media min-width: 1200px)
        if (window.matchMedia('(min-width: 1200px)').matches) return 5;
        // Mid desktop: 4 columns (matches CSS @media 1025-1199px)
        if (window.matchMedia('(min-width: 1025px)').matches) return 4;
        // Tablet (769-1024px): 3 columns (matches CSS)
        return 3;
      }

      function getMenuInitialLimit(container) {
        // 3 rows on every viewport. Mobile = 2 × 3 = 6. Tablet = 3 × 3 = 9.
        // Mid desktop = 4 × 3 = 12. Wide desktop = 5 × 3 = 15.
        if (window.matchMedia('(max-width: 768px)').matches) return 6;
        return getMenuGridColumnCount(container) * 3;
      }

      function setMenuToggleState(toggleBtn, expanded) {
        if (!toggleBtn) return;
        toggleBtn.classList.toggle('is-expanded', expanded);
        toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        const label = window.translateUiText
          ? window.translateUiText(expanded ? 'View Less' : 'View More')
          : (expanded ? 'View Less' : 'View More');
        toggleBtn.innerHTML = `${label} <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>`;
      }

      function revealMenuGridItems(container, toggleBtn) {
        if (!container) return;
        clearTimeout(menuCollapseTimer);
        const hiddenCards = Array.from(container.querySelectorAll('.menu-card.menu-extra-hidden'));
        menuExpanded = true;
        container.classList.add('menu-grid-expanded');
        hiddenCards.forEach((card, index) => {
          card.classList.remove('menu-extra-hidden', 'menu-mobile-collapsing');
          card.classList.add('menu-extra-visible');
          card.style.animationDelay = Math.min(index * 0.035, 0.35).toFixed(3) + 's';
        });
        setMenuToggleState(toggleBtn, true);
      }

      function scrollMenuSectionToTop() {
        if (!window.matchMedia('(max-width: 768px)').matches) return;
        const menuSection = document.getElementById('menu');
        if (!menuSection) return;
        const headerOffset = 78;
        const targetTop = Math.max(0, menuSection.getBoundingClientRect().top + window.pageYOffset - headerOffset);
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
      }

      function collapseMenuGridItems(container, toggleBtn) {
        if (!container) return;
        clearTimeout(menuCollapseTimer);
        const initialLimit = Number(container.dataset.initialLimit || getMenuInitialLimit(container));
        const cards = Array.from(container.querySelectorAll('.menu-card'));
        const isMobileMenu = window.matchMedia('(max-width: 768px)').matches;
        menuExpanded = false;
        container.classList.remove('menu-grid-expanded');
        if (isMobileMenu) {
          cards.forEach((card, index) => {
            card.style.animationDelay = '';
            card.classList.remove('menu-extra-visible');
            if (index >= initialLimit) {
              card.classList.add('menu-mobile-collapsing');
            } else {
              card.classList.remove('menu-extra-hidden', 'menu-mobile-collapsing');
            }
          });
          menuCollapseTimer = setTimeout(() => {
            cards.forEach((card, index) => {
              card.classList.remove('menu-mobile-collapsing');
              card.classList.toggle('menu-extra-hidden', index >= initialLimit);
            });
          }, 260);
          scrollMenuSectionToTop();
        } else {
          cards.forEach((card, index) => {
            card.style.animationDelay = '';
            card.classList.remove('menu-extra-visible', 'menu-mobile-collapsing');
            card.classList.toggle('menu-extra-hidden', index >= initialLimit);
          });
        }
        setMenuToggleState(toggleBtn, false);
      }

      /** Build or rebuild the menu item grid based on selected category and search term */
      function buildMenuItems(filterCategory) {
        const container = document.getElementById('menuItems');
        if (!container) return;
        container.innerHTML = '';

        const existingToggle = document.getElementById('menuToggleWrap');
        if (existingToggle) existingToggle.remove();

        const searchInput = document.getElementById('menuSearch');
        const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const searching = search.length > 0;
        // Display the complete filtered menu, without pagination or collapsing.
        menuExpanded = true;

        // Show ALL menu items (including disabled ones). Previously
        // disabled items were filtered out here and never appeared on
        // the public site. New behavior: disabled items REMAIN VISIBLE
        // but are rendered as inactive (dimmed card, "Currently
        // Unavailable" badge, disabled Add-to-Cart button). This lets
        // customers see what's on the menu even when temporarily out
        // of service.
        let visibleItems = appState.menuItems.filter((item) => item);
        if (searching) {
          visibleItems = visibleItems.filter((item) =>
            (item.name || '').toLowerCase().includes(search) ||
            (item.description || '').toLowerCase().includes(search)
          );
        } else if (filterCategory === 'hot-deals') {
          visibleItems = visibleItems.filter((item) => itemHasAnyDiscountOrDeal(item));
        } else if (filterCategory !== undefined && filterCategory !== 'explore') {
          visibleItems = visibleItems.filter((item) => item.category == filterCategory);
        } else {
          visibleItems = stableMenuItems(visibleItems);
        }

        // Every matching menu product is visible, regardless of the count.
        container.removeAttribute('data-initial-limit');

        if (visibleItems.length === 0) {
          const emptyState = document.createElement('div');
          emptyState.style.gridColumn = '1 / -1';
          emptyState.style.textAlign = 'center';
          emptyState.style.padding = '18px';
          emptyState.style.borderRadius = '16px';
          emptyState.style.background = 'rgba(255, 255, 255, 0.03)';
          emptyState.style.border = '1px solid rgba(255, 255, 255, 0.05)';
          emptyState.textContent = 'No matching items found.';
          container.appendChild(emptyState);
          return;
        }

        visibleItems.forEach((item, index) => {
          // NOTE: previously had `if (!item.enabled) return;` here which
          // skipped disabled items entirely. That's wrong — disabled
          // items should REMAIN VISIBLE with a dimmed card + "Currently
          // Unavailable" badge + non-functional Add button (see below).
          const selectedVariationId = getSelectedMenuVariationId(item);
          let pricing = getMenuPricing(item, selectedVariationId);
          const card = document.createElement('div');
          card.className = 'menu-card';
          // Disabled state: dimmed card, "Currently Unavailable" badge,
          // disabled Add button. The product stays visible so customers
          // know it exists, but cannot be ordered.
          const isItemDisabled = (item.enabled === false);
          if (isItemDisabled) {
            card.classList.add('menu-card-disabled');
          }
          card.dataset.menuIndex = String(index);
          const media = document.createElement('div');
          media.className = 'media';
          media.onclick = () => {
            if (isItemDisabled) return;
            trackMenuItemView(item.id);
          };
          appendProductBadges(media, item, pricing);
          // Add a prominent "Sold Out" overlay badge on
          // disabled products so customers immediately understand why
          // the card looks dim and Add is greyed out.
          if (isItemDisabled) {
            const unavailableBadge = document.createElement('div');
            unavailableBadge.className = 'unavailable-badge';
            unavailableBadge.textContent = (window.translateUiText
              ? window.translateUiText('Sold Out')
              : 'Sold Out');
            media.appendChild(unavailableBadge);
          }
          const img = document.createElement('img');
          // Mobile perf: lazy-load off-screen images, async decode
          img.loading = 'lazy';
          img.decoding = 'async';
          img.src = getMenuItemImage(item);
          img.alt = item.name;
          media.appendChild(img);
          const content = document.createElement('div');
          content.className = 'content';
          const title = document.createElement('h4');
          title.textContent = item.name;
          title.style.cursor = isItemDisabled ? 'default' : 'pointer';
          title.onclick = () => {
            if (isItemDisabled) return;
            trackMenuItemView(item.id);
          };
          const desc = document.createElement('p');
          desc.textContent = item.description;
          let priceStackEl = null;
          const variationSelector = buildVariationSelector(item, (variationId) => {
            pricing = getMenuPricing(item, variationId);
            const nextPriceStack = createPriceStack(pricing);
            if (priceStackEl) priceStackEl.replaceWith(nextPriceStack);
            priceStackEl = nextPriceStack;
            media.querySelectorAll('.deal-badge, .discount-badge').forEach((badge) => badge.remove());
            appendProductBadges(media, item, pricing);
          });
          const priceRow = document.createElement('div');
          priceRow.className = 'price';
          priceStackEl = createPriceStack(pricing);
          const addBtn = document.createElement('button');
          addBtn.textContent = window.translateUiText ? window.translateUiText('Add') : 'Add';
          if (isItemDisabled) {
            // Don't use the `disabled` attribute — that would block the
            // click event entirely. We WANT the click to fire so we can
            // show a friendly "currently unavailable" popup. The visual
            // dimming and not-allowed cursor come from the CSS class.
            addBtn.setAttribute('aria-disabled', 'true');
            addBtn.classList.add('menu-card-add-disabled');
            addBtn.title = 'This item is sold out';
            addBtn.onclick = function (e) {
              if (e && e.preventDefault) e.preventDefault();
              if (typeof showUnavailableProductPopup === 'function') {
                showUnavailableProductPopup(item.name);
              }
              return false;
            };
          } else {
            addBtn.onclick = () => addToCart(item.id, getSelectedMenuVariationId(item));
          }
          priceRow.appendChild(priceStackEl);
          priceRow.appendChild(addBtn);
          content.appendChild(title);
          content.appendChild(desc);
          if (variationSelector) content.appendChild(variationSelector);
          content.appendChild(priceRow);
          card.appendChild(media);
          card.appendChild(content);
          container.appendChild(card);
        });

      }

      /** Filter menu by category and search input */
      function filterMenu(catIdx) {
        // Preserve expanded products until the visitor manually clicks View Less.
        // Scrolling, focus changes, outside clicks, searching, and category selection must not auto-collapse.
        if (catIdx !== undefined) {
          selectedMenuCategory = catIdx;
        }
        const buttons = document.querySelectorAll('#menu .categories button');
        const searchInput = document.getElementById('menuSearch');
        const search = searchInput ? searchInput.value.trim() : '';
        if (!search) {
          buttons.forEach((btn) => {
            btn.classList.toggle('active', String(btn.dataset.cat) === String(selectedMenuCategory));
          });
        }
        buildMenuItems(selectedMenuCategory);
      }
      // ========== Cart handling ========== //
      var cart = []; /* eslint-disable-line no-var */ // scoped to window for App.Services.Cart access

      /**
       * Show a friendly "currently unavailable" popup when the customer
       * taps the dimmed Add button on a disabled product. Auto-dismisses
       * after 3 seconds, or user can tap to dismiss earlier.
       */
      function showUnavailableProductPopup(productName) {
        // Remove any existing one first so rapid taps don't stack
        var existing = document.getElementById('unavailableProductPopup');
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

        var popup = document.createElement('div');
        popup.id = 'unavailableProductPopup';
        popup.className = 'unavailable-product-popup';
        var msg = productName
          ? '<strong>Sorry!</strong> "' + escapeDeveloperInfo(productName) + '" is sold out.'
          : '<strong>Sorry!</strong> This item is sold out.';
        popup.innerHTML =
          '<div class="unavailable-popup-icon">⚠️</div>' +
          '<div class="unavailable-popup-text">' + msg + '</div>' +
          '<button type="button" class="unavailable-popup-close" aria-label="Close">&times;</button>';
        // Tap anywhere or close button to dismiss
        function dismiss() {
          popup.classList.add('dismissing');
          setTimeout(function () {
            if (popup.parentNode) popup.parentNode.removeChild(popup);
          }, 250);
        }
        popup.addEventListener('click', dismiss);
        document.body.appendChild(popup);
        // Auto-dismiss after 3 seconds
        setTimeout(dismiss, 3000);
      }
      window.showUnavailableProductPopup = showUnavailableProductPopup;

      /**
       * Add a menu item to the cart.  If the item already exists in the
       * cart, increment its quantity.  Afterwards update the UI.
       */
      // ===== addToCart (rewritten phase 3 - wraps App.Services.Cart.add) =====
      function addToCart(itemId, variationId = '') {
        // Hard guard: refuse to add disabled items even if called
        // programmatically. The Add button onclick also intercepts and
        // shows the popup, but this is the defense-in-depth layer.
        var item = Array.isArray(appState.menuItems)
          ? appState.menuItems.find(function (m) { return m && m.id === itemId; })
          : null;
        if (item && item.enabled === false) {
          console.info('[Cart] add blocked — item is disabled:', itemId);
          if (typeof showUnavailableProductPopup === 'function') {
            showUnavailableProductPopup(item.name);
          }
          return;
        }
        App.Services.Cart.add(itemId, variationId);
      }

      // ===== trackMenuItemView (analytics - local-only, no sync) =====
      // Previously this called App.Repo.Menu.update which fired a Supabase
      // upsert. Customers (anon role) don't have UPDATE permission on
      // menu_items, so every view tracking attempt produced an RLS error
      // banner. Track views locally only - they don't need cross-device
      // aggregation for this app.
      function trackMenuItemView(itemId) {
        if (!Array.isArray(appState.menuItems)) return;
        var item = appState.menuItems.find(function (m) { return m && m.id === itemId; });
        if (!item) return;
        item.viewedCount = Number(item.viewedCount || 0) + 1;
        // Save locally only - DO NOT call saveData() here because that would
        // trigger the diff engine to publish the change. Just persist to
        // localStorage directly via a lightweight path.
        try {
          localStorage.setItem(App.Config.STORAGE_KEY, JSON.stringify(appState));
        } catch (e) { /* storage full or similar - ignore */ }
      }

      /**
       * Change quantity of a cart item or remove it if quantity drops to 0
       */
      // ===== changeCartQty (rewritten phase 3 - data work via App.Services.Cart) =====
      function changeCartQty(itemId, variationId, delta) {
        App.Services.Cart.adjustQty(itemId, variationId, delta);
        // UI: refresh checkout modal if it is open
        var checkoutModal = document.getElementById('checkoutModal');
        if (checkoutModal && checkoutModal.classList.contains('active') && typeof renderCheckoutDetails === 'function') {
          if (cart.length === 0) {
            closeCheckout();
          } else {
            renderCheckoutDetails();
          }
        }
      }

      /**
       * Rebuild the cart panel UI, compute totals and update the count on the
       * cart button.  This function should be called any time the cart
       * contents change.
       */
      function updateCartUI() {
        const count = cart.reduce((sum, it) => sum + it.qty, 0);
        document.getElementById('cartCount').textContent = count;
        const cartList = document.getElementById('cartItems');
        cartList.innerHTML = '';
        const pricingBreakdown = getCartPricingBreakdown(cart);
        // CART TOTAL = sum of ORIGINAL prices (or selling price if no
        // original-price discount is set on the item). No offer/deal
        // discounts are subtracted here — discounts only kick in on
        // the checkout page so the customer sees the full retail total
        // first and then the savings during checkout.
        const total = Number(pricingBreakdown.subtotal || 0);
        if (cart.length === 0) {
          cartList.innerHTML = '<div class="cart-empty"><i class="fa-solid fa-basket-shopping"></i><p>Your cart is empty.</p></div>';
        }
        cart.forEach((cartItem) => {
          const resolved = getResolvedCartLine(cartItem);
          if (!resolved) return;
          const menuItem = resolved.item;
          const sellingPrice = resolved.pricing.sellingPrice;
          const savedEntry = pricingBreakdown.items.find((entry) => entry.lineKey === resolved.lineKey);
          const div = document.createElement('div');
          div.className = 'cart-item';
          const img = document.createElement('img');
          img.loading = 'lazy';
          img.decoding = 'async';
          img.src = getMenuItemImage(menuItem);
          img.alt = menuItem.name;
          const info = document.createElement('div');
          info.className = 'info';
          // Cart shows ORIGINAL/full prices only — no discount info here.
          // savedEntry.baseLineTotal is the original price × qty (or selling
          // price × qty if no originalPrice is configured). Discounts and
          // savings are only displayed on the Checkout page.
          const baseUnitPrice = savedEntry && savedEntry.baseLineTotal && resolved.qty
            ? (savedEntry.baseLineTotal / resolved.qty)
            : sellingPrice;
          const unitPrice = Number(baseUnitPrice).toFixed(2);
          const lineTotal = (Number(baseUnitPrice) * resolved.qty).toFixed(2);
          const variationMeta = resolved.variationName ? `${resolved.variationName} • ` : '';
          info.innerHTML = `<div class="cart-name">${menuItem.name}</div><div class="cart-meta">${variationMeta}AED ${unitPrice} each</div><div class="cart-line-total">AED ${lineTotal}</div>`;
          const actions = document.createElement('div');
          actions.className = 'actions';
          const minus = document.createElement('button');
          minus.type = 'button';
          minus.setAttribute('aria-label', 'Decrease quantity');
          minus.textContent = '−';
          minus.onclick = () => changeCartQty(cartItem.id, cartItem.variationId || '', -1);
          const qty = document.createElement('span');
          qty.className = 'cart-qty';
          qty.textContent = resolved.qty;
          const plus = document.createElement('button');
          plus.type = 'button';
          plus.setAttribute('aria-label', 'Increase quantity');
          plus.textContent = '+';
          plus.onclick = () => changeCartQty(cartItem.id, cartItem.variationId || '', 1);
          actions.appendChild(minus);
          actions.appendChild(qty);
          actions.appendChild(plus);
          div.appendChild(img);
          div.appendChild(info);
          div.appendChild(actions);
          cartList.appendChild(div);
        });
        document.getElementById('cartTotal').textContent = 'AED ' + total.toFixed(2);
      }

      function openCart() {
        document.getElementById('cartPanel').classList.add('active');
      }
      function closeCart() {
        document.getElementById('cartPanel').classList.remove('active');
      }

      // ========== Checkout handling ========== //
      function renderCheckoutDetails() {
        const pricingBreakdown = getCartPricingBreakdown(cart);
        // Bill model:
        //   Subtotal = ORIGINAL price sum (same as cart total)
        //   Discount = sum of ALL savings — per-item original/selling gaps
        //              + offer/combo/bill-wide discounts (totalDiscount)
        //   Tax      = flat AED amount from settings (no longer a decimal rate)
        //   Total    = Subtotal - Discount + Delivery + Tax + Service
        const subtotal = Number(pricingBreakdown.subtotal || 0);
        const discount = Number(pricingBreakdown.totalDiscount || 0);
        const deliveryFee = appState.config && appState.config.deliveryFee ? parseFloat(appState.config.deliveryFee) : 0;
        // Tax is now a flat AED amount (admin Settings field), not a rate.
        const taxAmount = appState.config && appState.config.taxRate ? parseFloat(appState.config.taxRate) : 0;
        const serviceCharge = appState.config ? parseFloat(appState.config.serviceCharge || appState.config.serviceCharges || appState.config.serviceFee || 0) || 0 : 0;
        const total = Math.max(0, subtotal - discount + deliveryFee + serviceCharge + taxAmount);
        const tax = taxAmount;
        const setTxt = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.textContent = val;
        };
        const checkoutItemsCount = document.getElementById('checkoutItemsCount');
        if (checkoutItemsCount) {
          const count = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
          checkoutItemsCount.textContent = `${count} item${count === 1 ? '' : 's'}`;
        }
        const checkoutProductList = document.getElementById('checkoutProductList');
        if (checkoutProductList) {
          if (!pricingBreakdown.items.length) {
            checkoutProductList.innerHTML = `<div class="checkout-empty-state"><div><i class="fa-solid fa-basket-shopping" aria-hidden="true"></i><p>Your cart is empty.</p></div></div>`;
          } else {
            checkoutProductList.innerHTML = pricingBreakdown.items.map((entry) => {
              const menuItem = (appState.menuItems || []).find((item) => String(item.id) === String(entry.id));
              const imgSrc = menuItem ? getMenuItemImage(menuItem) : '';
              const variationText = entry.variationName ? escapeHtml(entry.variationName) : 'Regular';
              const dealLabels = Array.isArray(entry.labels) ? entry.labels.filter(Boolean) : [];
              const savedAmount = Number(entry.totalSaved || 0);
              const hasSavings = savedAmount > 0;
              // Show the deal labels and the "Saved" pill only when an
              // actual discount applies to this row.
              const dealInfo = (dealLabels.length || hasSavings)
                ? `<div class="checkout-product-deals">` +
                  dealLabels.map((label) => `<span>${escapeHtml(label)}</span>`).join('') +
                  (hasSavings ? `<span class="checkout-product-saved">Saved ${formatCurrency(savedAmount)}</span>` : '') +
                  `</div>`
                : '';
              const safeId = String(entry.id || '').replace(/'/g, "\'");
              const safeVariation = String(entry.variationId || '').replace(/'/g, "\'");
              const finalRowTotal = (typeof entry.finalLineTotal === 'number')
                ? entry.finalLineTotal
                : (entry.lineTotal || 0);
              return `
                <div class="checkout-product-row">
                  <img class="checkout-product-image" src="${imgSrc}" alt="${escapeHtml(entry.name || 'Product')}" loading="lazy" decoding="async">
                  <div class="checkout-product-info">
                    <strong>${escapeHtml(entry.name || 'Product')}</strong>
                    <span class="checkout-variation-line">${variationText}</span>
                    ${dealInfo}
                  </div>
                  <div class="checkout-product-totals">
                    <div class="checkout-product-qty"><span>Qty</span><strong>${Number(entry.qty || 0)}</strong></div>
                    <div class="checkout-product-money checkout-unit-price"><span>Unit</span><strong>${formatCurrency(entry.unitPrice || 0)}</strong></div>
                    <div class="checkout-product-money checkout-product-price"><span>Total</span><strong>${formatCurrency(finalRowTotal)}</strong></div>
                  </div>
                  <button type="button" class="checkout-remove-item" aria-label="Remove ${escapeHtml(entry.name || 'product')}" onclick="removeCheckoutItem('${safeId}', '${safeVariation}')"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7m4-7v7"/></svg></button>
                </div>
              `;
            }).join('');
          }
        }
        setTxt('summarySubtotal', formatCurrency(subtotal));
        setTxt('summaryDiscount', discount > 0 ? formatCurrency(discount) : 'AED 0.00');
        setTxt('summaryDelivery', formatCurrency(deliveryFee));
        setTxt('summaryTax', formatCurrency(tax));
        setTxt('summaryService', formatCurrency(serviceCharge));
        setTxt('summaryTotal', formatCurrency(total));
        setTxt('checkoutButtonTotal', formatCurrency(total));
        const discountDetailsBlock = document.getElementById('discountDetailsBlock');
        const discountToggle = document.getElementById('summaryDiscountToggle');
        if (discountDetailsBlock) {
          discountDetailsBlock.innerHTML = '';
          discountDetailsBlock.classList.remove('is-open');
          if (discountToggle) {
            discountToggle.classList.remove('has-details');
            discountToggle.setAttribute('aria-expanded', 'false');
          }
          if (pricingBreakdown.items.some((entry) => entry.totalSaved > 0)) {
            pricingBreakdown.items
              .filter((entry) => entry.totalSaved > 0)
              .forEach((entry) => {
                const detailCard = document.createElement('div');
                detailCard.className = 'discount-detail-card';
                detailCard.innerHTML = `<strong>${escapeHtml(entry.name)}${entry.qty > 1 ? ' x' + entry.qty : ''}</strong><p>Discount: ${escapeHtml(entry.labels.join(' + ') || 'Deal Applied')}</p><p>Saved: ${formatCurrency(entry.totalSaved)}</p>`;
                discountDetailsBlock.appendChild(detailCard);
              });
            const totalSavedCard = document.createElement('div');
            totalSavedCard.className = 'discount-total-saved';
            totalSavedCard.innerHTML = `<strong>You saved ${formatCurrency(pricingBreakdown.totalDiscount)}</strong>`;
            discountDetailsBlock.appendChild(totalSavedCard);
            if (discountToggle) discountToggle.classList.add('has-details');
          }
        }
      }

      function removeCheckoutItem(itemId, variationId) {
        cart = cart.filter((c) => !(String(c.id) === String(itemId) && String(c.variationId || '') === String(variationId || '')));
        updateCartUI();
        if (cart.length === 0) {
          closeCheckout();
          return;
        }
        renderCheckoutDetails();
      }

      function openCheckout() {
        // Prevent checkout if cart is empty
        if (cart.length === 0) {
          alert('Your cart is empty');
          return;
        }
        // Require a logged in customer account before proceeding to checkout
        if (!appState.session || appState.session.role !== 'customer') {
          alert('Please log in or sign up to complete your order.');
          // Prompt login modal; once authenticated user can return to checkout
          openLoginModal();
          return;
        }
        // Build and display the checkout details each time checkout is opened.
        renderCheckoutDetails();
        // Render the admin-configured address note (above the delivery
        // address field). Hidden if admin hasn't set any text.
        var addressNoteBox = document.getElementById('checkoutAddressNoteBox');
        if (addressNoteBox) {
          var note = appState && appState.config && appState.config.addressNote;
          if (note && String(note).trim()) {
            addressNoteBox.textContent = '';
            // Use a small icon prefix and preserve line breaks the admin entered
            var icon = document.createElement('span');
            icon.className = 'checkout-address-note-icon';
            icon.textContent = 'ℹ️';
            var msg = document.createElement('span');
            msg.className = 'checkout-address-note-text';
            // Use textContent to render newlines from admin via white-space:pre-line in CSS
            msg.textContent = String(note).trim();
            addressNoteBox.appendChild(icon);
            addressNoteBox.appendChild(msg);
            addressNoteBox.style.display = '';
            // Re-translate if Arabic mode is active
            if (window.applyRestaurantTranslations) {
              try { window.applyRestaurantTranslations(addressNoteBox); } catch (e) {}
            }
          } else {
            addressNoteBox.style.display = 'none';
            addressNoteBox.textContent = '';
          }
        }
        document.getElementById('checkoutModal').classList.add('active');
      }
      function closeCheckout() {
        document.getElementById('checkoutModal').classList.remove('active');
      }

      const summaryDiscountToggle = document.getElementById('summaryDiscountToggle');
      if (summaryDiscountToggle) {
        summaryDiscountToggle.addEventListener('click', function () {
          if (!this.classList.contains('has-details')) return;
          const details = document.getElementById('discountDetailsBlock');
          if (!details) return;
          const isOpen = details.classList.toggle('is-open');
          this.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
      }

      // No payment selection is needed.  Only cash on delivery (COD) is available so we do not
      // attach any change handler for a payment method.  The payment method is fixed to COD.

      // ===== checkoutForm submit (rewritten phase 3 - calls App.Services.Order.place) =====
      document.getElementById('checkoutForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var result = App.Services.Order.place({
          name:    document.getElementById('checkoutName').value.trim(),
          phone:   document.getElementById('checkoutPhone').value.trim(),
          address: document.getElementById('checkoutAddress').value.trim(),
          notes:   document.getElementById('checkoutNotes').value.trim()
        });
        if (!result.ok) {
          if (result.error === 'CART_EMPTY') {
            alert('Your cart is empty');
          } else if (result.error === 'MISSING_FIELDS') {
            showAlert('checkoutAlert', 'Please fill all required fields.', 'error');
          } else {
            showAlert('checkoutAlert', 'Could not place order. Please try again.', 'error');
          }
          return;
        }
        showAlert(
          'checkoutAlert',
          'Order placed successfully! Your order ID is ' + result.order.id + '.',
          'success'
        );
        // If admin panel is active, refresh orders and dashboard without requiring page reload
        if (document.getElementById('adminPanel').classList.contains('active')) {
          renderOrdersSection(document.getElementById('adminContent'), true);
          var activeNav = document.querySelector('#adminNav li.active');
          if (activeNav && activeNav.dataset.target === 'dashboard') {
            renderDashboardSection(document.getElementById('adminContent'));
          }
        }
        setTimeout(closeCheckout, 2000);
      });

      // ========== Reservation handling ========== //
      function getReservationUser() {
        if (!appState.session || appState.session.role !== 'customer') return null;
        return appState.users.find((u) => u.id === appState.session.id) || null;
      }
      function fillReservationDefaults() {
        const user = getReservationUser();
        const nameInput = document.getElementById('resName');
        const phoneInput = document.getElementById('resPhone');
        const dateInput = document.getElementById('resDate');
        const timeInput = document.getElementById('resTime');
        if (user) {
          if (nameInput && !nameInput.value) {
            nameInput.value = user.displayName || user.name || user.username || '';
          }
          if (phoneInput && !phoneInput.value) {
            phoneInput.value = user.phone || '';
          }
        }
        if (dateInput) {
          dateInput.min = new Date().toISOString().split('T')[0];
        }
        if (timeInput && !timeInput.value) {
          timeInput.value = '19:30';
        }
      }
      function openReservation() {
        // Require customer login to make a reservation
        if (!appState.session || appState.session.role !== 'customer') {
          alert('Please log in or sign up to make a reservation.');
          openLoginModal();
          return;
        }
        fillReservationDefaults();
        const section = document.getElementById('reservation');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        const nameInput = document.getElementById('resName');
        if (nameInput) {
          setTimeout(() => nameInput.focus(), 250);
        }
      }
      function closeReservation() {
        const form = document.getElementById('reservationForm');
        if (form) form.reset();
        fillReservationDefaults();
      }
      fillReservationDefaults();
      // ===== reservationForm submit (rewritten phase 3 - calls App.Services.Reservation.create) =====
      document.getElementById('reservationForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var user = getReservationUser();
        if (!user) {
          showAlert('reservationAlert', 'Please log in or sign up to complete your reservation.', 'error');
          openLoginModal();
          return;
        }
        var result = App.Services.Reservation.create({
          userId: user.id,
          name:   document.getElementById('resName').value.trim(),
          phone:  document.getElementById('resPhone').value.trim(),
          email:  user.email || '',
          date:   document.getElementById('resDate').value,
          time:   document.getElementById('resTime').value,
          guests: parseInt(document.getElementById('resGuests').value, 10)
        });
        if (!result.ok) {
          showAlert('reservationAlert', result.error || 'Please fill all fields.', 'error');
          return;
        }
        showAlert('reservationAlert', 'Reservation sent!', 'success');
        setTimeout(function () { closeReservation(); }, 1500);
      });

      /** Show alert message within a modal */
      function showAlert(elementId, message, type) {
        const el = document.getElementById(elementId);
        el.innerHTML = `<div class="alert ${type}">${message}</div>`;
        setTimeout(() => {
          el.innerHTML = '';
        }, 3000);
      }

      // ========== Lightbox handling ========== //
      function openLightbox(src) {
        const img = document.getElementById('lightboxImg');
        img.src = src;
        document.getElementById('lightbox').classList.add('active');
      }
      function closeLightbox() {
        document.getElementById('lightbox').classList.remove('active');
      }

      // ========== Hero slider rotation ========== //
      let heroIndex = 0;
      function startHeroSlider() {
        const slides = document.querySelectorAll('.hero-slide');
        if (slides.length <= 1) return;
        setInterval(() => {
          slides[heroIndex].classList.remove('active');
          heroIndex = (heroIndex + 1) % slides.length;
          slides[heroIndex].classList.add('active');
          // v169: tagline/subtagline are hardcoded in HTML now. The slider
          // only rotates the background images — it no longer touches the
          // heading/tagline text, font, or alignment.
        }, 7000);
      }

      // ========== Chef Special carousel rotation ==========
      /**
       * Initialise the Chef's Special carousel.  It dynamically builds a set of featured
       * dishes from the menu data and rotates them at a regular interval.  The
       * currently active item is highlighted by scaling it up.  Items are selected
       * by prioritising dishes marked as featured/popular; if none exist the first
       * few menu items are used.  This function is idempotent: it will safely
       * rebuild the carousel each time it is invoked.
       */
      /**
       * v143: scroll-spy. Automatically applies `.active` class to the
       * nav item whose target section is currently most visible in the
       * viewport. Uses IntersectionObserver for performance.
       *
       * Mapping: nav item 'home' targets #heroSection; all other items
       * target a section with matching id (#menu, #reservation, etc).
       */
      function initScrollSpy() {
        try {
          // Section id → nav-link href. 'home' maps to heroSection because
          // that's how the click handler scrolls (see renderNavigation).
          const sectionToNavId = {
            'heroSection': 'home',
            'menu': 'menu',
            'reservation': 'reservation',
            'offers': 'offers',
            'about': 'about',
            'contact': 'contact',
            'tracking': 'tracking'
          };

          // Build a lookup: section ID → nav link element
          const navContainer = document.getElementById('navItems');
          if (!navContainer) return;
          const navLinkByNavId = {};
          navContainer.querySelectorAll('a').forEach(function (link) {
            // The link's onclick was set to scrollToSection(id). We can
            // re-derive the section id from the href fragment, or just
            // match by text content. Most reliable: re-walk and match.
          });
          // Re-walk: match each nav anchor by href fragment to section id
          navContainer.querySelectorAll('li > a').forEach(function (link) {
            const href = link.getAttribute('href') || '';
            // href format is "#sectionid" — extract the id
            const m = href.match(/#(.+)$/);
            if (m && m[1]) {
              navLinkByNavId[m[1]] = link;
            }
          });

          // Resolve section elements (those that exist on page)
          const watchedSections = [];
          Object.keys(sectionToNavId).forEach(function (sectionId) {
            const el = document.getElementById(sectionId);
            if (!el) return;
            const navId = sectionToNavId[sectionId];
            // The nav links may have href like "#heroSection" or "#home";
            // Try both for robustness.
            const link = navLinkByNavId[sectionId] || navLinkByNavId[navId];
            if (!link) return;
            watchedSections.push({ el: el, link: link, navId: navId });
          });

          if (!watchedSections.length) return;

          // Disconnect any previous observer so we don't double-bind
          if (window.__scrollSpyObserver) {
            try { window.__scrollSpyObserver.disconnect(); } catch (e) {}
            window.__scrollSpyObserver = null;
          }

          // Track each section's current intersection ratio. The one with
          // the highest ratio wins the .active state.
          const ratios = new Map();
          watchedSections.forEach(function (w) { ratios.set(w.el.id, 0); });

          function applyActive() {
            // Find section with highest intersection ratio
            let bestId = null;
            let bestRatio = 0;
            ratios.forEach(function (r, id) {
              if (r > bestRatio) {
                bestRatio = r;
                bestId = id;
              }
            });
            // Remove .active from all watched nav links, add to winner
            watchedSections.forEach(function (w) {
              if (w.el.id === bestId && bestRatio > 0) {
                w.link.classList.add('active');
              } else {
                w.link.classList.remove('active');
              }
            });
          }

          const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              ratios.set(entry.target.id, entry.intersectionRatio);
            });
            applyActive();
          }, {
            // Tracking ratios at multiple thresholds for accurate "best" pick
            threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
            // Slight top inset to account for the fixed navbar height
            rootMargin: '-80px 0px -20% 0px'
          });

          watchedSections.forEach(function (w) {
            observer.observe(w.el);
          });
          window.__scrollSpyObserver = observer;
        } catch (err) {
          console.warn('Error initialising scroll-spy:', err);
        }
      }

      // ============================================================
      // v166: HERO 3D DEPTH-QUEUE CONVEYOR
      // Replaces the old chef-curve shifting showcase. Dishes recede
      // into the distance (translateZ) and travel forward toward the
      // front. The hero background theme shifts to match the front dish.
      // Function name kept as initChefSpecial() so all existing callers
      // continue to work without changes.
      // ============================================================

      // 5 warm grill-appropriate themes, cycled as the front dish changes.
      var HERO_CONVEYOR_THEMES = [
        // v177: only 3 themes — orange (ember), saffron, green (olive).
        // v194: blue removed per user request.
        { deep:'#2b1206', edge:'#0d0704', accent:'#ff7a2e', accent2:'#c9531a', soft:'rgba(255,122,46,0.18)' },
        { deep:'#2a1d08', edge:'#0d0a04', accent:'#e0a83e', accent2:'#b07f22', soft:'rgba(224,168,62,0.18)' },
        { deep:'#1a220f', edge:'#080d05', accent:'#9bbf5a', accent2:'#6f9138', soft:'rgba(155,191,90,0.16)' }
      ];

      // depth-queue layout: pos 0 = FRONT (sharp, big), higher = further
      // back into distance, diagonally up-right, smaller + blurrier.
      var HERO_CONVEYOR_LAYOUT = {
        '0': { x:0,   y:0,    z:0,     blur:0,   opacity:1.0,  zIndex:50 },
        '1': { x:200, y:-44,  z:-260,  blur:1.5, opacity:0.82, zIndex:40 },
        '2': { x:330, y:-78,  z:-520,  blur:3.5, opacity:0.55, zIndex:30 },
        '3': { x:420, y:-104, z:-780,  blur:6,   opacity:0.30, zIndex:20 },
        '4': { x:480, y:-122, z:-1040, blur:9,   opacity:0.12, zIndex:10 }
      };
      var HERO_CONVEYOR_BASE = 320; // front plate diameter (px)

      var heroConveyorState = {
        center: 0,
        plateEls: [],
        dishes: [],
        timer: null
      };

      function heroConveyorApplyTheme(theme) {
        if (!theme) return;
        // v181: apply theme vars on :root (documentElement) so the SAME
        // themed background can be used site-wide, not just the hero.
        // These are --hero-* vars (separate from the global brand --accent),
        // so the site-wide gold branding is unaffected.
        var root = document.documentElement;
        root.style.setProperty('--hero-accent', theme.accent);
        root.style.setProperty('--hero-accent-2', theme.accent2 || theme.accent);
        root.style.setProperty('--hero-accent-soft', theme.soft);
        root.style.setProperty('--hero-glow-deep', theme.deep);
        root.style.setProperty('--hero-glow-edge', theme.edge);
      }

      // v167: ember particles (matches preview). Generated once; they
      // recolor automatically via the --hero-accent CSS variable.
      function heroConveyorBuildEmbers() {
        var embers = document.getElementById('heroEmbers');
        if (!embers || embers.childElementCount > 0) return;
        var IS_MOBILE = window.matchMedia('(max-width: 768px)').matches;
        var count = IS_MOBILE ? 10 : 18;
        for (var i = 0; i < count; i++) {
          var e = document.createElement('div');
          e.className = 'hero-ember';
          e.style.left = (Math.random() * 100) + '%';
          e.style.animationDuration = (6 + Math.random() * 6) + 's';
          e.style.animationDelay = (Math.random() * 8) + 's';
          var s = 2 + Math.random() * 4;
          e.style.width = s + 'px';
          e.style.height = s + 'px';
          embers.appendChild(e);
        }
      }

      // v189: site-wide ember particles. Fills the fixed #siteEmbers layer
      // so embers float across EVERY page (not just the hero). They recolor
      // with the theme via --hero-accent. Spread across the full viewport
      // height (not just rising from the very bottom) so they're visible on
      // every section as you scroll.
      function buildSiteEmbers() {
        var embers = document.getElementById('siteEmbers');
        if (!embers || embers.childElementCount > 0) return;
        var IS_MOBILE = window.matchMedia('(max-width: 768px)').matches;
        var count = IS_MOBILE ? 12 : 16;
        for (var i = 0; i < count; i++) {
          var e = document.createElement('div');
          e.className = 'site-ember';
          e.style.left = (Math.random() * 100) + '%';
          e.style.animationDuration = (7 + Math.random() * 7) + 's';
          e.style.animationDelay = (Math.random() * 10) + 's';
          var s = 2 + Math.random() * 4;
          e.style.width = s + 'px';
          e.style.height = s + 'px';
          embers.appendChild(e);
        }
      }

      function heroConveyorQueuePos(i) {
        var n = heroConveyorState.dishes.length;
        if (n === 0) return 0;
        var diff = i - heroConveyorState.center;
        if (diff < 0) diff += n;
        return diff;
      }

      function heroConveyorRender() {
        var st = heroConveyorState;
        var IS_MOBILE = window.matchMedia('(max-width: 768px)').matches;
        var baseSize = IS_MOBILE ? 230 : HERO_CONVEYOR_BASE;
        st.plateEls.forEach(function (el, i) {
          var p = heroConveyorQueuePos(i);
          // mobile shows fewer plates in the queue (front + 2 back)
          var maxBack = IS_MOBILE ? 2 : 4;
          // v198: with ALL menu items in the queue there can be many plates.
          // Only render the visible ones; fully hide the rest so they don't
          // cost layout/filter/compositing work (keeps scrolling smooth).
          if (p > maxBack) {
            el.style.display = 'none';
            el.style.opacity = 0;
            return;
          }
          el.style.display = '';
          var key = String(Math.min(maxBack, p));
          var L = HERO_CONVEYOR_LAYOUT[key] || HERO_CONVEYOR_LAYOUT[String(maxBack)];
          el.style.width = baseSize + 'px';
          el.style.height = baseSize + 'px';
          el.style.zIndex = L.zIndex;
          el.style.opacity = L.opacity;
          el.style.filter = 'blur(' + L.blur + 'px)';
          // mobile: reduce the diagonal offset + depth so it fits a narrow screen
          var x = IS_MOBILE ? L.x * 0.5 : L.x;
          var y = IS_MOBILE ? L.y * 0.5 : L.y;
          var z = IS_MOBILE ? L.z * 0.7 : L.z;
          el.style.transform =
            'translate(-50%, -50%) translate3d(' + x + 'px,' + y + 'px,' + z + 'px)';
          el.className = 'hero-plate pos-' + (p === 0 ? '0' : 'back');
        });
        var d = st.dishes[st.center];
        if (!d) return;
        heroConveyorApplyTheme(d.theme);
        var badge = document.getElementById('heroConveyorBadge');
        var nameEl = document.getElementById('heroConveyorName');
        var tagEl = document.getElementById('heroConveyorTag');
        if (badge) {
          if (d.badge) {
            badge.textContent = d.badge;
            badge.classList.remove('show');
            void badge.offsetWidth;
            badge.classList.add('show');
          } else {
            badge.classList.remove('show');
          }
        }
        if (nameEl) nameEl.textContent = d.name || '';
        if (tagEl) tagEl.textContent = d.tag || '';
        var dotsWrap = document.getElementById('heroConveyorDots');
        if (dotsWrap) {
          Array.prototype.forEach.call(dotsWrap.children, function (b, i) {
            b.classList.toggle('active', i === st.center);
          });
        }
      }

      function heroConveyorAdvance() {
        var n = heroConveyorState.dishes.length;
        if (n === 0) return;
        heroConveyorState.center = (heroConveyorState.center + 1) % n;
        heroConveyorRender();
      }
      function heroConveyorStart() {
        heroConveyorStop();
        if (heroConveyorState.dishes.length > 1) {
          heroConveyorState.timer = setInterval(heroConveyorAdvance, 3200);
        }
        heroConveyorSetupVisibilityPause();
      }
      function heroConveyorStop() {
        if (heroConveyorState.timer) {
          clearInterval(heroConveyorState.timer);
          heroConveyorState.timer = null;
        }
      }
      // v241 PERF: pause the conveyor (its rotation timer AND its CSS
      // animations) whenever the hero is scrolled out of view, so it stops
      // burning frames while you scroll the rest of the page. Invisible:
      // you cannot see the hero when it is offscreen. Resumes on return.
      function heroConveyorSetupVisibilityPause() {
        if (window._heroConveyorIO || typeof IntersectionObserver === 'undefined') return;
        var hero = document.getElementById('heroSection') || document.getElementById('heroConveyor');
        if (!hero) return;
        window._heroConveyorIO = new IntersectionObserver(function (entries) {
          var visible = entries[0] && entries[0].isIntersecting;
          var conv = document.getElementById('heroConveyor');
          if (visible) {
            if (conv) conv.classList.remove('conveyor-paused');
            if (heroConveyorState.dishes.length > 1 && !heroConveyorState.timer) {
              heroConveyorState.timer = setInterval(heroConveyorAdvance, 3200);
            }
          } else {
            if (conv) conv.classList.add('conveyor-paused');
            heroConveyorStop();
          }
        }, { threshold: 0 });
        window._heroConveyorIO.observe(hero);
      }

      function initChefSpecial() {
        try {
          var stage = document.getElementById('heroConveyorStage');
          var conveyor = document.getElementById('heroConveyor');
          if (!stage || !conveyor) return;

          heroConveyorStop();

          // v198: include ALL enabled menu items in the rotation (was
          // limited to featured/popular/chefSpecial and capped at 6). Now
          // every menu image cycles through the conveyor one after another.
          var pool = Array.isArray(appState.menuItems)
            ? appState.menuItems.filter(function (item) {
                return item && item.enabled !== false && getMenuItemImage(item);
              })
            : [];
          if (pool.length === 0) {
            conveyor.style.display = 'none';
            return;
          }
          conveyor.style.display = '';

          // No cap — all menu images rotate through the queue.

          // Build dish objects with image + name + tag + badge + theme.
          // v202: every dish gets a badge (Chef's Special / Bestseller /
          // Featured / Signature). Shown as the pill on the dish.
          // v203: real flags win; dishes without any flag rotate through the
          // badge types so the showcase shows variety instead of all
          // "Signature".
          var FALLBACK_BADGES = [
            "\u2605 Chef's Special",
            '\uD83D\uDD25 Bestseller',
            '\uD83C\uDF1F Featured',
            '\u2726 Signature'
          ];
          var badgeFor = function (item, idx) {
            if (item.chefSpecial) return "\u2605 Chef's Special";
            if (item.popular) return '\uD83D\uDD25 Bestseller';
            if (item.featured) return '\uD83C\uDF1F Featured';
            return FALLBACK_BADGES[idx % FALLBACK_BADGES.length];
          };
          // v202: category names are NOT shown on the hero dish system.
          var tagFor = function (item) {
            return '';
          };
          heroConveyorState.dishes = pool.map(function (item, idx) {
            return {
              name: item.name || 'Dish',
              tag: tagFor(item),
              badge: badgeFor(item, idx),
              img: getMenuItemImage(item),
              theme: HERO_CONVEYOR_THEMES[idx % HERO_CONVEYOR_THEMES.length]
            };
          });
          heroConveyorState.center = 0;

          // Clear old plates + dots (keep badge/caption/dots containers).
          var oldPlates = stage.querySelectorAll('.hero-plate');
          Array.prototype.forEach.call(oldPlates, function (el) { el.remove(); });
          var dotsWrap = document.getElementById('heroConveyorDots');
          if (dotsWrap) dotsWrap.innerHTML = '';
          heroConveyorState.plateEls = [];

          // Build plates.
          heroConveyorState.dishes.forEach(function (d, i) {
            var el = document.createElement('div');
            el.className = 'hero-plate';
            var img = document.createElement('img');
            img.src = d.img;
            img.alt = d.name;
            img.loading = 'lazy';
            img.onerror = function () { img.src = MENU_ITEM_FALLBACK_IMAGE; };
            el.appendChild(img);
            // Click a plate to bring it to the front.
            el.addEventListener('click', function () {
              heroConveyorState.center = i;
              heroConveyorRender();
              heroConveyorStart();
            });
            // Insert plates BEFORE the badge so badge/caption sit on top.
            stage.insertBefore(el, stage.firstChild);
            heroConveyorState.plateEls.push(el);
          });

          // Build dots. v198: with all menu items rotating there can be a
          // lot — too many dots clutter the row, so only show them for a
          // small set. The conveyor auto-rotates regardless.
          if (dotsWrap) {
            if (heroConveyorState.dishes.length <= 8) {
              dotsWrap.style.display = '';
              heroConveyorState.dishes.forEach(function (d, i) {
                var b = document.createElement('button');
                b.type = 'button';
                b.setAttribute('aria-label', 'Show ' + (d.name || 'dish'));
                b.addEventListener('click', function () {
                  heroConveyorState.center = i;
                  heroConveyorRender();
                  heroConveyorStart();
                });
                dotsWrap.appendChild(b);
              });
            } else {
              dotsWrap.style.display = 'none';
            }
          }

          heroConveyorRender();
          heroConveyorStart();
          heroConveyorBuildEmbers();
          buildSiteEmbers();

          // Pause when tab hidden (save battery / CPU).
          var visibilityHandler = function () {
            if (document.visibilityState === 'hidden') {
              heroConveyorStop();
            } else if (document.visibilityState === 'visible') {
              heroConveyorStart();
            }
          };
          if (window.__heroConveyorVisibilityHandler) {
            document.removeEventListener('visibilitychange', window.__heroConveyorVisibilityHandler);
          }
          window.__heroConveyorVisibilityHandler = visibilityHandler;
          document.addEventListener('visibilitychange', visibilityHandler);

          // Re-render on resize (mobile/desktop layout differs).
          if (window.__heroConveyorResizeHandler) {
            window.removeEventListener('resize', window.__heroConveyorResizeHandler);
          }
          var resizeRaf = null;
          var resizeHandler = function () {
            if (resizeRaf) cancelAnimationFrame(resizeRaf);
            resizeRaf = requestAnimationFrame(heroConveyorRender);
          };
          window.__heroConveyorResizeHandler = resizeHandler;
          window.addEventListener('resize', resizeHandler);

        } catch (err) {
          console.warn('Error initialising hero conveyor:', err);
        }
      }

      // ========== Premium testimonials carousel ========== //
      let testIdx = 0;
      window.testimonialTimer = null;
      function startTestimonials() {
        const slider = document.getElementById('testimonialsSlider');
        const track = slider ? slider.querySelector('.testimonials-track') : null;
        const controls = document.getElementById('testimonialsControls');
        if (!track) return;
        const originalCount = appState.reviews ? appState.reviews.length : 0;
        if (originalCount <= 1) return;
        testIdx = 0;
        const firstCard = () => track.querySelector('.testimonial');
        const stepSize = () => {
          const card = firstCard();
          if (!card) return 0;
          const styles = window.getComputedStyle(track);
          const gap = parseFloat(styles.columnGap || styles.gap || 0) || 0;
          return card.getBoundingClientRect().width + gap;
        };
        const visibleCount = () => {
          const card = firstCard();
          if (!card || !slider) return 1;
          const styles = window.getComputedStyle(track);
          const gap = parseFloat(styles.columnGap || styles.gap || 0) || 0;
          return Math.max(1, Math.round((slider.clientWidth + gap) / (card.getBoundingClientRect().width + gap)));
        };
        const moveTo = (idx, animate = true) => {
          track.style.transition = animate ? 'transform 1.05s cubic-bezier(0.22, 0.86, 0.25, 1)' : 'none';
          track.style.transform = `translate3d(${-idx * stepSize()}px, 0, 0)`;
        };
        const goNext = () => {
          testIdx += 1;
          moveTo(testIdx, true);
        };
        const goPrev = () => {
          if (testIdx === 0) {
            testIdx = originalCount;
            moveTo(testIdx, false);
            requestAnimationFrame(() => requestAnimationFrame(() => {
              testIdx -= 1;
              moveTo(testIdx, true);
            }));
          } else {
            testIdx -= 1;
            moveTo(testIdx, true);
          }
        };
        track.addEventListener('transitionend', () => {
          if (testIdx >= originalCount) {
            testIdx = 0;
            moveTo(testIdx, false);
          }
        });
        if (controls) {
          const btns = controls.querySelectorAll('.testimonial-control');
          if (btns[0]) btns[0].onclick = () => { goPrev(); restartTestimonialsTimer(goNext); };
          if (btns[1]) btns[1].onclick = () => { goNext(); restartTestimonialsTimer(goNext); };
        }
        window.addEventListener('resize', () => moveTo(testIdx, false), { passive: true });
        restartTestimonialsTimer(goNext);
      }
      function restartTestimonialsTimer(callback) {
        if (window.testimonialTimer) clearInterval(window.testimonialTimer);
        window.testimonialTimer = setInterval(callback, 5200);
      }

      // ========== Login handling ========== //
      function openLoginModal() {
        // Reset the login form whenever it is opened so previous values do not persist
        const form = document.getElementById('loginForm');
        if (form) {
          form.reset();
        }
        // Clear any previous alert messages
        const alertEl = document.getElementById('loginAlert');
        if (alertEl) {
          alertEl.innerHTML = '';
        }
        document.getElementById('loginModal').classList.add('active');
      }
      function closeLoginModal() {
        document.getElementById('loginModal').classList.remove('active');
        // Reset the form and clear alert when closing so the next open is fresh
        const form = document.getElementById('loginForm');
        if (form) {
          form.reset();
        }
        const alertEl = document.getElementById('loginAlert');
        if (alertEl) {
          alertEl.innerHTML = '';
        }
      }

      // Toggle visibility for a password input field. Called by the eye
      // icon button beside any password field. Swaps the eye-open and
      // eye-closed spans inside the button to indicate state.
      function togglePasswordVisibility(inputId, btn) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const isPwd = input.type === 'password';
        input.type = isPwd ? 'text' : 'password';
        if (btn) {
          const openEye   = btn.querySelector('.password-eye-open');
          const closedEye = btn.querySelector('.password-eye-closed');
          if (openEye && closedEye) {
            openEye.style.display   = isPwd ? 'none' : '';
            closedEye.style.display = isPwd ? '' : 'none';
          }
        }
      }
      // Expose to inline onclick handlers
      window.togglePasswordVisibility = togglePasswordVisibility;

      // Sign‑up modal handlers
      function openSignupModal() {
        var consent = document.getElementById('signupLegalConsent');
        if (consent) consent.checked = false;
        document.getElementById('signupModal').classList.add('active');
      }
      function closeSignupModal() {
        document.getElementById('signupModal').classList.remove('active');
        document.getElementById('signupAlert').innerHTML = '';
      }
      function openSignupFromLogin() {
        closeLoginModal();
        openSignupModal();
      }

      // Account modal handlers (for customers)
      function openAccountModal() {
        const modal = document.getElementById('accountModal');
        const content = document.getElementById('accountContent');
        if (!modal || !content) return;
        content.replaceChildren();
        const session = App.Services.Auth && App.Services.Auth.session ? App.Services.Auth.session() : appState.session;
        if (!session) { if (typeof openLoginModal === 'function') openLoginModal(); return; }
        const user = (App.Services.Auth && App.Services.Auth.currentUser && App.Services.Auth.currentUser()) ||
          appState.users.find(u => u && u.id === session.id) || {};
        const name = String(user.displayName || user.name || user.username || 'AFGR Member').trim();
        const email = String(user.email || '').trim();
        // Compact account identity: restore the original Hello + email treatment.
        const profile = document.createElement('section');
        profile.className = 'afgr-account-profile';
        const avatar = document.createElement('span');
        avatar.className = 'afgr-account-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = (name.charAt(0) || 'A').toUpperCase();
        const details = document.createElement('div');
        details.className = 'afgr-account-identity';
        const greeting = document.createElement('h4');
        greeting.textContent = 'Hello, ' + name + '!';
        const emailValue = document.createElement('p');
        emailValue.className = 'afgr-account-email';
        emailValue.textContent = email || 'Email unavailable';
        details.append(greeting, emailValue);
        profile.append(avatar, details);
        content.appendChild(profile);
        // Show the verified Auth email, not a locally edited profile value.
        if (App.Supabase && App.Supabase.client) {
          App.Supabase.client.auth.getUser().then(function (response) {
            if (modal.classList.contains('active') && App.Services.Auth.session() &&
                App.Services.Auth.session().authUserId === session.authUserId &&
                response && response.data && response.data.user && response.data.user.email) {
              emailValue.textContent = response.data.user.email;
            }
          }).catch(function () {});
        }
        if (window.AFGRWorkspace && window.AFGRWorkspace.renderAccountActions) {
          window.AFGRWorkspace.renderAccountActions(content);
        }
        const actions = document.createElement('div');
        actions.className = 'afgr-account-main-actions';
        const pwd = document.createElement('button');
        pwd.type = 'button'; pwd.className = 'afgr-account-btn afgr-account-password';
        pwd.textContent = 'Change Password';
        pwd.onclick = openChangePasswordModal;
        const logoutBtn = document.createElement('button');
        logoutBtn.type = 'button'; logoutBtn.className = 'afgr-account-btn afgr-account-logout';
        logoutBtn.textContent = 'Logout';
        logoutBtn.onclick = function () { closeAccountModal(); logout(); };
        actions.append(pwd, logoutBtn);
        content.appendChild(actions);
        if (session.role === 'customer') {
          const history = document.createElement('section');
          history.className = 'afgr-account-history';
          const heading = document.createElement('h4'); heading.textContent = 'Your activity';
          history.appendChild(heading);
          [
            ['Order History', openOrderHistoryModal],
            ['Reservation History', openReservationHistoryModal],
            ['Request History', openRequestHistoryModal]
          ].forEach(function (entry) {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'afgr-account-history-button';
            button.textContent = entry[0]; button.onclick = entry[1];
            history.appendChild(button);
          });
          content.appendChild(history);
        }
        modal.classList.add('active');
      }
      function closeAccountModal() {
        document.getElementById('accountModal').classList.remove('active');
      }

      /**
       * Build and start the gallery auto‑scroll loop.  This function
       * dynamically constructs a track containing two copies of all
       * loaded gallery images, then uses requestAnimationFrame to
       * translate the track leftward by a small step on each frame.  When
       * the translation offset reaches the width of the original set
       * (half of the total track width), it resets the offset to create a
       * seamless, infinite scrolling effect.  Any previous animation
       * frame is cancelled before starting a new one, preventing
       * overlapping loops when the gallery is rebuilt.  If no images
       * have loaded yet, the function displays a placeholder text.
       */
      function startGalleryAutoscroll() {
        const grid = document.getElementById('galleryGrid');
        if (!grid) return;
        if (galleryAnimationFrameId) {
          cancelAnimationFrame(galleryAnimationFrameId);
          galleryAnimationFrameId = null;
        }
        if (grid.galleryCarouselTimerId) {
          clearInterval(grid.galleryCarouselTimerId);
          grid.galleryCarouselTimerId = null;
        }
        // The tile-shuffle and empty-gallery preview own separate timers.
        // Clear both every time the gallery data changes, preventing a stale
        // timer from mutating detached images after Supabase/IndexedDB sync.
        if (grid.galleryTileTimerId) clearInterval(grid.galleryTileTimerId);
        if (grid.galleryPreviewTimerId) clearInterval(grid.galleryPreviewTimerId);
        grid.galleryTileTimerId = grid.galleryPreviewTimerId = null;
        grid.innerHTML = '';
        const oldControls = document.querySelector('.gallery-carousel-controls');
        if (oldControls) oldControls.remove();

        // Swap the image INSIDE a tile, not just the containing collage.
        // Preload and decode first; a failed URL never blanks an image.
        // Store the current source on the tile so View photo follows the
        // same picture customers actually see after a shuffle.
        function swapGalleryPhoto(slot, nextSource, previewMode) {
          if (!slot || !slot.isConnected || !nextSource) return;
          const oldImage = slot.querySelector('img');
          if (!oldImage || oldImage.dataset.sourceUrl === nextSource) return;
          if (slot.dataset.swapping === '1') return;
          slot.dataset.swapping = '1';
          const candidate = new Image();
          candidate.decoding = 'async';
          candidate.onload = () => {
            if (!slot.isConnected || !slot.contains(oldImage)) { slot.dataset.swapping = ''; return; }
            candidate.className = 'afgr-gallery-incoming';
            candidate.alt = oldImage.alt;
            candidate.dataset.sourceUrl = nextSource;
            candidate.style.opacity = '0';
            slot.appendChild(candidate);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => { candidate.style.opacity = '1'; });
            });
            const settle = () => {
              if (slot.contains(candidate)) {
                oldImage.remove();
                candidate.classList.remove('afgr-gallery-incoming');
                candidate.style.opacity = '';
                if (previewMode) candidate.classList.add('afgr-preview-current');
              }
              slot.dataset.swapping = '';
            };
            setTimeout(settle, 630);
          };
          candidate.onerror = () => { slot.dataset.swapping = ''; };
          candidate.src = nextSource;
        }

        const loadedImages = Array.isArray(appState.gallery)
          ? appState.gallery.filter((img) => img && (img.data || img.url))
          : [];
        if (loadedImages.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'gallery-empty afgr-gallery-preview';
          empty.innerHTML = '<div class="afgr-gallery-preview-copy"><span>OUR GALLERY</span>' +
            '<h3>A feast for the eyes.</h3>' +
            '<p>Our photo gallery is being prepared. Here is an illustrative glimpse of the flavors we love.</p>' +
            '<button type="button" data-ao-route-target="menu">Explore our dishes &rarr;</button></div>' +
            '<div class="afgr-gallery-preview-photos" aria-label="Illustrative Arabic-grill food photos">' +
            '<img src="assets/arabic/feature-charcoal.webp" alt="Illustrative charcoal-grilled kebabs">' +
            '<img src="assets/arabic/feature-biryani.webp" alt="Illustrative fragrant biryani">' +
            '<img src="assets/arabic/feature-feast.webp" alt="Illustrative Arabic mixed-grill platter">' +
            '</div>';
          grid.appendChild(empty);
          // Give even a new restaurant a living visual gallery. The copy
          // above explicitly identifies these as illustrative images.
          const illustrative = [
            'assets/arabic/feature-charcoal.webp',
            'assets/arabic/feature-biryani.webp',
            'assets/arabic/feature-feast.webp',
            'assets/arabic/hero-platter.webp',
            'assets/arabic/lamb-chops.webp',
            'assets/arabic/spicy-chicken.webp',
            'assets/arabic/arabic-mixed-platter.webp'
          ];
          empty.querySelectorAll('.afgr-gallery-preview-photos img').forEach((image, index) => {
            const slot = document.createElement('span');
            slot.className = 'afgr-gallery-preview-slot';
            slot.dataset.galleryIndex = String(index);
            slot.appendChild(image.cloneNode(true));
            image.replaceWith(slot);
          });
          let previewPhase = 0;
          grid.galleryPreviewTimerId = setInterval(() => {
            if (!grid.isConnected || document.hidden) return;
            const slots = empty.querySelectorAll('.afgr-gallery-preview-slot');
            if (!slots.length) return;
            previewPhase++;
            // Different timing/offsets ensure each displayed picture changes.
            slots.forEach((slot, index) => {
              const next = illustrative[(previewPhase + index * 2 + 2) % illustrative.length];
              swapGalleryPhoto(slot, next, true);
            });
            empty.dataset.galleryPhase = String(previewPhase);
          }, 2750);
          return;
        }

        const viewport = document.createElement('div');
        viewport.className = 'gallery-carousel-viewport';
        const track = document.createElement('div');
        track.className = 'gallery-carousel-track';
        viewport.appendChild(track);
        grid.appendChild(viewport);

        const layouts = ['gallery-layout-signature', 'gallery-layout-b', 'gallery-layout-c', 'gallery-layout-a'];
        const slides = [];
        const photoCount = loadedImages.length;
        const groupSize = 4;
        // Each slide gets a different composition, even for a small gallery.
        // There are no fabricated entries: only uploaded photos are repeated
        // where needed to fill an editorial four-photo arrangement.
        const slideCountWanted = photoCount <= 4 ? photoCount : Math.ceil(photoCount / 3);
        for (let slide = 0; slide < slideCountWanted; slide++) {
          const group = [];
          const startPhoto = photoCount <= 4 ? slide : slide * 3;
          for (let j = 0; j < groupSize; j++) group.push(loadedImages[(startPhoto + j) % photoCount]);
          slides.push(group);
        }

        function createSlide(group, visualIndex, cloneType) {
          const slide = document.createElement('div');
          slide.className = 'gallery-collage-slide ' + layouts[visualIndex % layouts.length];
          if (cloneType) slide.setAttribute('aria-hidden', 'true');
          group.slice(0, 4).forEach((imgObj, imageIndex) => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'gallery-collage-card';
            card.setAttribute('aria-label', 'Open gallery image ' + (visualIndex * groupSize + imageIndex + 1));
            const el = document.createElement('img');
            el.src = imgObj.url || imgObj.data;
            el.alt = 'Restaurant gallery image ' + (visualIndex * groupSize + imageIndex + 1);
            el.loading = visualIndex === 0 ? 'eager' : 'lazy';
            el.decoding = 'async';
            el.dataset.sourceUrl = imgObj.url || imgObj.data;
            card.dataset.galleryIndex = String(loadedImages.indexOf(imgObj));
            card.appendChild(el);
            const tag = document.createElement('span');
            tag.className = 'gallery-photo-index';
            tag.textContent = String(imageIndex + 1).padStart(2, '0');
            const action = document.createElement('span');
            action.className = 'gallery-photo-action';
            action.textContent = 'View photo ↗';
            card.append(tag, action);
            card.onclick = () => openLightbox(card.querySelector('img')?.currentSrc || card.querySelector('img')?.src || imgObj.url || imgObj.data);
            slide.appendChild(card);
          });
          return slide;
        }

        const slideCount = slides.length;
        if (slideCount > 1) track.appendChild(createSlide(slides[slideCount - 1], slideCount - 1, 'clone-start'));
        slides.forEach((group, index) => track.appendChild(createSlide(group, index)));
        if (slideCount > 1) track.appendChild(createSlide(slides[0], 0, 'clone-end'));
        // Real-photo shuffle: every ~2.6s the visible collage's pictures
        // fade into DIFFERENT uploaded photos. This is independent of the
        // entire-slide carousel, so customers see photos change in place.
        let tileShuffleTick = 0;
        grid.galleryTileTimerId = setInterval(() => {
          if (document.hidden || !grid.isConnected) return;
          const currentSlide = track.querySelector('.gallery-collage-slide.is-current');
          if (!currentSlide) return;
          tileShuffleTick++;
          const allImages = loadedImages.map(image => image.url || image.data);
          currentSlide.querySelectorAll('.gallery-collage-card').forEach((card, slotIndex) => {
            if (allImages.length < 2) {
              card.classList.remove('afgr-gallery-single-pulse');
              void card.offsetWidth;
              card.classList.add('afgr-gallery-single-pulse');
              return;
            }
            const currentIndex = Number(card.dataset.galleryIndex || 0);
            const jump = 1 + ((tileShuffleTick + slotIndex) % (allImages.length - 1));
            const nextIndex = (currentIndex + jump) % allImages.length;
            const source = allImages[nextIndex];
            card.dataset.galleryIndex = String(nextIndex);
            swapGalleryPhoto(card, source, false);
          });
          grid.dataset.photoShuffleTick = String(tileShuffleTick);
        }, 2600);

        const controls = document.createElement('div');
        controls.className = 'gallery-carousel-controls';
        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'gallery-nav-btn';
        prevBtn.setAttribute('aria-label', 'Previous gallery collage');
        prevBtn.innerHTML = '&lsaquo;';
        const dotsWrap = document.createElement('div');
        dotsWrap.className = 'gallery-dots';
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'gallery-nav-btn';
        nextBtn.setAttribute('aria-label', 'Next gallery collage');
        nextBtn.innerHTML = '&rsaquo;';
        controls.appendChild(prevBtn);
        controls.appendChild(dotsWrap);
        controls.appendChild(nextBtn);
        grid.insertAdjacentElement('afterend', controls);

        const dots = slides.map((_, index) => {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'gallery-dot';
          dot.setAttribute('aria-label', 'Show gallery collage ' + (index + 1));
          dot.onclick = () => goToRealSlide(index, true);
          dotsWrap.appendChild(dot);
          return dot;
        });

        let currentTrackIndex = slideCount > 1 ? 1 : 0;
        let isAnimating = false;
        let loopResetFrame = null;
        let transitionUnlockTimer = null;

        function realIndex() {
          if (slideCount <= 1) return 0;
          if (currentTrackIndex === 0) return slideCount - 1;
          if (currentTrackIndex === slideCount + 1) return 0;
          return currentTrackIndex - 1;
        }
        function updateDots() {
          dots.forEach((dot, index) => dot.classList.toggle('active', index === realIndex()));
        }
        function markActiveSlide(animateTiles) {
          Array.from(track.children).forEach((slide, index) => {
            slide.classList.toggle('is-current', index === currentTrackIndex);
            slide.classList.toggle('is-arriving', !!animateTiles && index === currentTrackIndex);
          });
        }
        function setTrackPosition(withTransition = true) {
          track.classList.toggle('no-transition', !withTransition);
          track.style.transform = 'translate3d(-' + (currentTrackIndex * 100) + '%, 0, 0)';
          markActiveSlide(withTransition);
          updateDots();
        }
        function normalizeLoopPosition() {
          if (slideCount <= 1) return;
          let needsInvisibleReset = false;
          if (currentTrackIndex === 0) {
            currentTrackIndex = slideCount;
            needsInvisibleReset = true;
          } else if (currentTrackIndex === slideCount + 1) {
            currentTrackIndex = 1;
            needsInvisibleReset = true;
          }
          if (!needsInvisibleReset) return;

          if (loopResetFrame) cancelAnimationFrame(loopResetFrame);
          track.classList.add('no-transition');
          track.style.transform = 'translate3d(-' + (currentTrackIndex * 100) + '%, 0, 0)';
          markActiveSlide(false);
          updateDots();
          track.offsetHeight;
          loopResetFrame = requestAnimationFrame(() => {
            loopResetFrame = requestAnimationFrame(() => {
              track.classList.remove('no-transition');
              loopResetFrame = null;
            });
          });
        }
        function restartTimer() {
          if (grid.galleryCarouselTimerId) clearInterval(grid.galleryCarouselTimerId);
          if (slideCount > 1) {
            grid.galleryCarouselTimerId = setInterval(() => {
              if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
              goToTrackIndex(currentTrackIndex + 1, false);
            }, 4000);
          }
        }
        function goToTrackIndex(index, manual) {
          if (isAnimating || slideCount <= 1) return;
          isAnimating = true;
          if (transitionUnlockTimer) clearTimeout(transitionUnlockTimer);
          currentTrackIndex = index;
          setTrackPosition(true);
          transitionUnlockTimer = setTimeout(() => {
            normalizeLoopPosition();
            isAnimating = false;
          }, 900);
          if (manual) restartTimer();
        }
        function goToRealSlide(index, manual) {
          if (slideCount <= 1) return;
          goToTrackIndex(index + 1, manual);
        }

        track.addEventListener('transitionend', (event) => {
          if (event.propertyName !== 'transform') return;
          if (transitionUnlockTimer) {
            clearTimeout(transitionUnlockTimer);
            transitionUnlockTimer = null;
          }
          normalizeLoopPosition();
          isAnimating = false;
        });
        prevBtn.onclick = () => goToTrackIndex(currentTrackIndex - 1, true);
        nextBtn.onclick = () => goToTrackIndex(currentTrackIndex + 1, true);
        if (slideCount <= 1) controls.style.display = 'none';

        let touchStartX = 0;
        let touchDeltaX = 0;
        viewport.addEventListener('touchstart', (event) => {
          touchStartX = event.touches[0].clientX;
          touchDeltaX = 0;
        }, { passive: true });
        viewport.addEventListener('touchmove', (event) => {
          touchDeltaX = event.touches[0].clientX - touchStartX;
        }, { passive: true });
        viewport.addEventListener('touchend', () => {
          if (Math.abs(touchDeltaX) > 45) {
            goToTrackIndex(currentTrackIndex + (touchDeltaX < 0 ? 1 : -1), true);
          }
        });

        // Do not pause just because a visitor's pointer is over the gallery.
        // That made auto-advance look broken while they were looking at it.
        // Keyboard focus still pauses the full-slide carousel for accessibility.
        grid.addEventListener('focusin', () => {
          if (grid.galleryCarouselTimerId) clearInterval(grid.galleryCarouselTimerId);
        });
        grid.addEventListener('focusout', () => {
          setTimeout(() => { if (!grid.contains(document.activeElement)) restartTimer(); }, 0);
        });
        setTrackPosition(false);
        requestAnimationFrame(() => track.classList.remove('no-transition'));
        restartTimer();
      }

      function updateFixedHeaderMetrics() {
        const topBar = document.getElementById('topBar');
        const navbar = document.querySelector('.navbar');
        const topBarHeight = topBar ? topBar.offsetHeight : 0;
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        document.documentElement.style.setProperty('--top-bar-height', topBarHeight + 'px');
        document.documentElement.style.setProperty('--navbar-height', navbarHeight + 'px');
        document.documentElement.style.setProperty('--site-header-offset', (topBarHeight + navbarHeight) + 'px');
      }
      function handleHeaderScrollBehavior() {
        const topBar = document.getElementById('topBar');
        const scrolled = window.scrollY > 8;
        document.body.classList.toggle('announcement-collapsed', scrolled);
        document.body.classList.toggle('header-scrolled', scrolled);
        if (topBar) topBar.classList.toggle('announcement-hidden', scrolled);
        // v237: the scrolled pill narrows the name box, so re-fit the
        // restaurant name once, only when the state actually changes.
        if (window._rnScrolledState !== scrolled) {
          window._rnScrolledState = scrolled;
          if (typeof fitRestaurantNameToHeader === 'function') {
            requestAnimationFrame(function () {
              try { fitRestaurantNameToHeader(); } catch (e) {}
            });
          }
        }
      }
      function initFixedHeaderBehavior() {
        updateFixedHeaderMetrics();
        handleHeaderScrollBehavior();
        window.addEventListener('scroll', handleHeaderScrollBehavior, { passive: true });
        window.addEventListener('resize', function () { updateFixedHeaderMetrics(); handleHeaderScrollBehavior(); });
        setTimeout(updateFixedHeaderMetrics, 250);
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initFixedHeaderBehavior);
      else initFixedHeaderBehavior();

      /**
       * Open the Export Users modal.  This function populates the field
       * selection checkboxes and attaches handlers for select/deselect
       * buttons.  It then displays the modal overlay.
       */
      function openExportUsersModal() {
        const modal = document.getElementById('exportUsersModal');
        if (!modal) return;
        // Show the scope hint: how many users will be exported
        const hint = document.getElementById('exportUsersScopeHint');
        if (hint) {
          var selectedIds = Array.isArray(window.__exportSelectedUserIds)
            ? window.__exportSelectedUserIds
            : [];
          if (selectedIds.length > 0) {
            hint.innerHTML = '✓ <strong>' + selectedIds.length + '</strong> selected user' +
              (selectedIds.length === 1 ? '' : 's') + ' will be exported. ' +
              '<a href="#" id="exportUsersClearScope" style="color:var(--accent);text-decoration:underline;">Export all instead</a>';
            const clearLink = document.getElementById('exportUsersClearScope');
            if (clearLink) {
              clearLink.onclick = function (e) {
                e.preventDefault();
                window.__exportSelectedUserIds = [];
                hint.innerHTML = 'No users selected — all customer users will be exported (subject to filters below).';
              };
            }
          } else {
            hint.innerHTML = 'No users selected — all customer users will be exported (subject to filters below).';
          }
        }
        // Build checkboxes for each exportable field
        const fieldsDiv = document.getElementById('exportUsersFields');
        if (fieldsDiv) {
          fieldsDiv.innerHTML = '';
          const fields = [
            { key: 'name', label: 'Name' },
            { key: 'phone', label: 'Phone Number' },
            { key: 'email', label: 'Email' },
            { key: 'address', label: 'Address' },
            { key: 'orders', label: 'Orders' },
            { key: 'reservations', label: 'Reservations' },
            { key: 'requests', label: 'Requests' },
            { key: 'registration', label: 'Registration Date' },
            { key: 'status', label: 'Status' }
          ];
          fields.forEach((f) => {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.gap = '5px';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = 'export_field_' + f.key;
            cb.value = f.key;
            cb.checked = true;
            const lbl = document.createElement('label');
            lbl.setAttribute('for', cb.id);
            lbl.textContent = f.label;
            wrapper.appendChild(cb);
            wrapper.appendChild(lbl);
            fieldsDiv.appendChild(wrapper);
          });
        }
        // Attach select/deselect handlers
        const selectAllBtn = document.getElementById('selectAllFieldsBtn');
        const deselectAllBtn = document.getElementById('deselectAllFieldsBtn');
        if (selectAllBtn && deselectAllBtn && fieldsDiv) {
          selectAllBtn.onclick = function () {
            fieldsDiv.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
              cb.checked = true;
            });
          };
          deselectAllBtn.onclick = function () {
            fieldsDiv.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
              cb.checked = false;
            });
          };
        }
        modal.classList.add('active');

        // Attach export handler to the generate button
        const genBtn = document.getElementById('exportUsersGenerateBtn');
        if (genBtn) {
          genBtn.onclick = exportUsers;
        }
      }

      /**
       * Close the Export Users modal.
       */
      function closeExportUsersModal() {
        const modal = document.getElementById('exportUsersModal');
        if (modal) modal.classList.remove('active');
      }

      /**
       * Generate and download the users export based on the selected
       * format and fields.  Supports Excel and PDF exports.  Applies
       * filters for active users and date ranges.  Relies on the xlsx
       * library and jsPDF + autoTable for PDF generation.
       */
      async function exportUsers() {
        // Determine selected fields
        const fieldsDiv = document.getElementById('exportUsersFields');
        if (!fieldsDiv) return;
        const checkboxes = fieldsDiv.querySelectorAll('input[type="checkbox"]');
        const selectedKeys = Array.from(checkboxes)
          .filter((cb) => cb.checked)
          .map((cb) => cb.value);
        if (selectedKeys.length === 0) {
          alert('Please select at least one field to export.');
          return;
        }
        // Determine format
        const formatSel = document.getElementById('exportUsersFormat');
        const format = formatSel ? formatSel.value : 'excel';
        if (window.AFGRLoadReportLibrary) {
          try { await window.AFGRLoadReportLibrary(format === 'pdf' ? 'pdf' : 'excel'); }
          catch (error) { alert('Export library unavailable. Connect to the internet and try again.'); return; }
        }
        // Determine filters
        const activeOnly = document.getElementById('filterActive') && document.getElementById('filterActive').checked;
        const fromInput = document.getElementById('filterFrom');
        const toInput = document.getElementById('filterTo');
        let fromDate = null;
        let toDate = null;
        if (fromInput && fromInput.value) {
          fromDate = new Date(fromInput.value);
        }
        if (toInput && toInput.value) {
          // Add one day to include the end date
          const d = new Date(toInput.value);
          d.setHours(23, 59, 59, 999);
          toDate = d;
        }
        // Gather customer users
        let users = appState.users.filter((u) => u.role === 'customer');
        // If the admin selected specific users via the per-row checkboxes,
        // restrict the export to only those IDs. An empty selection means
        // "export all" (the existing default behavior).
        var selectedIds = Array.isArray(window.__exportSelectedUserIds)
          ? window.__exportSelectedUserIds
          : [];
        if (selectedIds.length > 0) {
          var idSet = new Set(selectedIds.map(String));
          users = users.filter((u) => idSet.has(String(u.id || '')));
        }
        // Apply active filter: active means verified true (status yes) or user not deleted
        if (activeOnly) {
          users = users.filter((u) => u.verified);
        }
        // Apply date range filter based on createdAt if available
        if (fromDate || toDate) {
          users = users.filter((u) => {
            if (!u.createdAt) return false;
            const time = new Date(u.createdAt);
            if (fromDate && time < fromDate) return false;
            if (toDate && time > toDate) return false;
            return true;
          });
        }
        // Build export data rows
        const rows = users.map((u) => {
          const row = {};
          selectedKeys.forEach((key) => {
            switch (key) {
              case 'name':
                row['Name'] = u.displayName || u.username || '';
                break;
              case 'phone':
                row['Phone Number'] = u.phone || '';
                break;
              case 'email':
                row['Email'] = u.email || '';
                break;
              case 'address': {
                // Derive address from most recent order if available
                let addr = '';
                if (Array.isArray(appState.orders)) {
                  const userOrders = appState.orders
                    .filter((o) => o.userId === u.id)
                    .sort((a, b) => (b.date || 0) - (a.date || 0));
                  if (userOrders.length > 0) {
                    addr = (userOrders[0].customer && userOrders[0].customer.address) || '';
                  }
                }
                row['Address'] = addr;
                break;
              }
              case 'orders': {
                // Count orders for user
                let count = 0;
                if (Array.isArray(appState.orders)) {
                  count = appState.orders.filter((o) => o.userId === u.id).length;
                }
                row['Orders'] = count;
                break;
              }
              case 'reservations': {
                // Count reservations for user: match by userId (new
                // records) OR by email/phone (legacy records without
                // userId field — same fallback as the customer account
                // history page).
                let count = 0;
                const myId = String(u.id || '');
                const myEmail = (u.email || '').toLowerCase().trim();
                const myPhone = (u.phone || '').replace(/\s+/g, '');
                if (Array.isArray(appState.reservations)) {
                  count = appState.reservations.filter((r) => {
                    if (!r) return false;
                    if (myId && String(r.userId || '') === myId) return true;
                    const re = (r.email || '').toLowerCase().trim();
                    const rp = (r.phone || '').replace(/\s+/g, '');
                    return (myEmail && re === myEmail) || (myPhone && rp === myPhone);
                  }).length;
                }
                row['Reservations'] = count;
                break;
              }
              case 'requests': {
                // Count requests for user (always tagged with userId)
                let count = 0;
                if (Array.isArray(appState.requests)) {
                  count = appState.requests.filter((r) => r && r.userId === u.id).length;
                }
                row['Requests'] = count;
                break;
              }
              case 'registration': {
                let reg = '';
                if (u.createdAt) {
                  try {
                    const dt = new Date(u.createdAt);
                    reg = dt.toLocaleDateString();
                  } catch (e) {
                    reg = '' + u.createdAt;
                  }
                }
                row['Registration Date'] = reg;
                break;
              }
              case 'status': {
                row['Status'] = u.verified ? 'Verified' : 'Not Verified';
                break;
              }
              default:
                break;
            }
          });
          return row;
        });
        if (rows.length === 0) {
          alert('No users match the selected filters.');
          return;
        }
        // Generate export
        if (format === 'excel') {
          // Excel export using SheetJS (xlsx)
          try {
            const workbook = XLSX.utils.book_new();
            const sheet = XLSX.utils.json_to_sheet(rows);
            // Ensure column order matches selected fields
            const header = [];
            selectedKeys.forEach((key) => {
              switch (key) {
                case 'name': header.push('Name'); break;
                case 'phone': header.push('Phone Number'); break;
                case 'email': header.push('Email'); break;
                case 'address': header.push('Address'); break;
                case 'orders': header.push('Orders'); break;
                case 'reservations': header.push('Reservations'); break;
                case 'requests': header.push('Requests'); break;
                case 'registration': header.push('Registration Date'); break;
                case 'status': header.push('Status'); break;
              }
            });
            // Reorder sheet columns
            const orderedRows = rows.map((row) => {
              const newRow = {};
              header.forEach((h) => {
                newRow[h] = row[h];
              });
              return newRow;
            });
            const newSheet = XLSX.utils.json_to_sheet(orderedRows);
            XLSX.utils.book_append_sheet(workbook, newSheet, 'Users');
            const filename = 'users_export_' + new Date().toISOString().slice(0, 10) + '.xlsx';
            XLSX.writeFile(workbook, filename);
          } catch (ex) {
            console.error('Error exporting to Excel', ex);
            alert('Error exporting to Excel: ' + ex.message);
          }
        } else if (format === 'pdf') {
          try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            // Build head and body for autoTable
            const head = [selectedKeys.map((key) => {
              switch (key) {
                case 'name': return 'Name';
                case 'phone': return 'Phone Number';
                case 'email': return 'Email';
                case 'address': return 'Address';
                case 'orders': return 'Orders';
                case 'reservations': return 'Reservations';
                case 'requests': return 'Requests';
                case 'registration': return 'Registration Date';
                case 'status': return 'Status';
              }
            })];
            const body = rows.map((row) => {
              return head[0].map((label) => row[label]);
            });
            // Use autoTable if available
            if (doc.autoTable) {
              doc.autoTable({ head: head, body: body, startY: 20, styles: { fontSize: 10 } });
            } else {
              // Fallback: simple text table
              let y = 20;
              const colWidths = head[0].map((h) => 180 / head[0].length);
              // Header
              head[0].forEach((h, idx) => {
                doc.text(String(h), 10 + idx * 180 / head[0].length, y);
              });
              y += 8;
              // Rows
              body.forEach((rowVals) => {
                rowVals.forEach((val, idx) => {
                  doc.text(String(val), 10 + idx * 180 / head[0].length, y);
                });
                y += 8;
              });
            }
            const filename = 'users_export_' + new Date().toISOString().slice(0, 10) + '.pdf';
            doc.save(filename);
          } catch (ex) {
            console.error('Error exporting to PDF', ex);
            alert('Error exporting to PDF: ' + ex.message);
          }
        } else {
          alert('Unknown export format: ' + format);
        }
        // Close modal on completion
        closeExportUsersModal();
      }

      /**
       * Change the password for the supplied user.
       * Prompts for current password and new password and updates if valid.
       */
      function changePassword(user) {
        // Launch the password change modal instead of using browser prompts.
        // The actual password update will be handled when the user submits the
        // form in the modal.  Passing the user is unnecessary since we
        // operate on the currently logged in session.
        openChangePasswordModal();
      }

      /**
       * Display the change password modal.  Clears any previous input values
       * and hides any alert messages so that the form is always fresh when
       * shown.  The modal can be closed by clicking the Cancel button or
       * the close icon.
       */
      function openChangePasswordModal() {
        // Reset form fields
        const cur = document.getElementById('currentPasswordInput');
        const neu = document.getElementById('newPasswordInput');
        const conf = document.getElementById('confirmNewPasswordInput');
        if (cur) cur.value = '';
        if (neu) neu.value = '';
        if (conf) conf.value = '';
        // Clear alert area
        const alertDiv = document.getElementById('changePasswordAlert');
        if (alertDiv) alertDiv.innerHTML = '';
        // Show modal
        const modal = document.getElementById('changePasswordModal');
        if (modal) modal.classList.add('active');
      }

      /**
       * Hide the change password modal.  Also clears the form and any
       * messages so that the next time it is opened it starts fresh.
       */
      function closeChangePasswordModal() {
        const modal = document.getElementById('changePasswordModal');
        if (modal) modal.classList.remove('active');
        // reset form and alert
        const cur = document.getElementById('currentPasswordInput');
        const neu = document.getElementById('newPasswordInput');
        const conf = document.getElementById('confirmNewPasswordInput');
        if (cur) cur.value = '';
        if (neu) neu.value = '';
        if (conf) conf.value = '';
        const alertDiv = document.getElementById('changePasswordAlert');
        if (alertDiv) alertDiv.innerHTML = '';
      }

      /**
       * Open the category editing modal.  When index is null a new category will be created
       * on save.  When index is a number, the existing category at that index will be updated.
       */
      function openEditCategoryModal(index) {
        const modal = document.getElementById('editCategoryModal');
        const titleEl = document.getElementById('editCategoryModalTitle');
        const input = document.getElementById('categoryNameInput');
        const alertDiv = document.getElementById('editCategoryAlert');
        if (titleEl && input && alertDiv) {
          alertDiv.innerHTML = '';
          if (index === null || index === undefined) {
            titleEl.textContent = 'Add Category';
            input.value = '';
            modal.dataset.index = '';
          } else {
            titleEl.textContent = 'Edit Category';
            input.value = appState.categories[index].name;
            modal.dataset.index = index;
          }
        }
        modal.classList.add('active');
      }
      function closeEditCategoryModal() {
        const modal = document.getElementById('editCategoryModal');
        if (modal) modal.classList.remove('active');
      }
      // handle saving category
      const catForm = document.getElementById('editCategoryForm');
      if (catForm) {
        catForm.addEventListener('submit', function (e) {
          e.preventDefault();
          const name = document.getElementById('categoryNameInput').value.trim();
          if (!name) {
            const alertDiv = document.getElementById('editCategoryAlert');
            if (alertDiv) alertDiv.textContent = 'Name is required.';
            return;
          }
          const modal = document.getElementById('editCategoryModal');
          const idxAttr = modal.dataset.index;
          if (idxAttr === '' || idxAttr === undefined) {
            App.Repo.Categories.create({ id: generateId(), name: name });
          } else {
            const idx = parseInt(idxAttr, 10);
            if (!isNaN(idx) && appState.categories[idx]) {
              appState.categories[idx].name = name;
              // Explicit publish so admin category renames sync even if the
              // diff engine misses it for any reason.
              if (App.SupabaseSync && appState.categories[idx].id) {
                App.SupabaseSync.publishUpdate('categories', appState.categories[idx].id, appState.categories[idx]);
              }
            }
          }
          saveData();
          // Force the sync queue to fire immediately so the write reaches
          // Supabase before any user-initiated refresh can cancel it.
          if (App.SupabaseSync && App.SupabaseSync.flushNow) {
            App.SupabaseSync.flushNow();
          }
          // refresh categories view and website
          if (document.getElementById('adminPanel').classList.contains('active')) {
            renderMenuManagement(document.getElementById('adminContent'));
          }
          buildWebsite();
          closeEditCategoryModal();
        });
      }

      /**
       * Open the offer editing modal.  index null means add new offer.
       */
      function openEditOfferModal(index) {
        const modal = document.getElementById('editOfferModal');
        const titleEl = document.getElementById('editOfferModalTitle');
        const alertDiv = document.getElementById('editOfferAlert');
        const titleInput = document.getElementById('offerTitleInput');
        const discountInput = document.getElementById('offerDiscountInput');
        const startInput = document.getElementById('offerStartInput');
        const endInput = document.getElementById('offerEndInput');
        const enabledInput = document.getElementById('offerEnabledInput');
        const typeSelect = document.getElementById('offerTypeInput');
        const minValueGroup = document.getElementById('offerMinValueGroup');
        const minValueInput = document.getElementById('offerMinValueInput');
        const productGroup = document.getElementById('offerProductGroup');
        const productSelect = document.getElementById('offerProductSelect');
        const variationGroup = document.getElementById('offerVariationGroup');
        const variationSelect = document.getElementById('offerVariationSelect');
        const productsGroup = document.getElementById('offerProductsGroup');
        const productsSelect = document.getElementById('offerProductsSelect');
        const comboVariationRows = document.getElementById('offerComboVariationRows');
        const renderOfferVariationOptions = (productId, selectedVariationId = '') => {
          if (!variationSelect) return;
          variationSelect.innerHTML = '<option value="">Any Variation</option>';
          const product = appState.menuItems.find((mi) => mi.id === productId);
          if (!product || !hasEnabledVariations(product)) return;
          getItemVariations(product)
            .filter((variation) => variation.enabled !== false)
            .forEach((variation) => {
              const option = document.createElement('option');
              option.value = variation.id;
              option.textContent = variation.name;
              if (variation.id === selectedVariationId) option.selected = true;
              variationSelect.appendChild(option);
            });
        };
        const renderComboVariationRows = (selectedRequirements = []) => {
          if (!comboVariationRows || !productsSelect) return;
          const selectedIds = Array.from(productsSelect.options).filter((opt) => opt.selected).map((opt) => opt.value);
          if (!selectedIds.length) {
            comboVariationRows.innerHTML = '<div class="variation-admin-empty">Select combo products, then choose a required variation for each one.</div>';
            return;
          }
          comboVariationRows.innerHTML = '';
          selectedIds.forEach((productId, index) => {
            const product = appState.menuItems.find((mi) => mi.id === productId);
            const selectedRequirement = selectedRequirements.find((entry) => entry.productId === productId) || { productId, variationId: '' };
            const row = document.createElement('div');
            row.className = 'variation-admin-row';
            row.innerHTML = `
              <div class="form-group">
                <label>Product</label>
                <input type="text" value="${escapeHtml(product ? product.name : 'Product').replace(/"/g, '&quot;')}" readonly />
              </div>
              <div class="form-group" style="grid-column: span 2;">
                <label>Required Variation</label>
                <select data-combo-product-id="${productId}">
                  <option value="">Any Variation</option>
                </select>
              </div>
              <div class="variation-admin-toggle" style="justify-content:flex-end;">${index + 1}</div>
              <div></div>
            `;
            const select = row.querySelector('select');
            if (product && hasEnabledVariations(product)) {
              getItemVariations(product).filter((variation) => variation.enabled !== false).forEach((variation) => {
                const option = document.createElement('option');
                option.value = variation.id;
                option.textContent = variation.name;
                if (variation.id === selectedRequirement.variationId) option.selected = true;
                select.appendChild(option);
              });
            }
            comboVariationRows.appendChild(row);
          });
        };
        // Populate product select (single) and products select (multi) with menu items
        if (productSelect) {
          productSelect.innerHTML = '';
          appState.menuItems.forEach((mi) => {
            const opt = document.createElement('option');
            opt.value = mi.id;
            opt.textContent = mi.name;
            productSelect.appendChild(opt);
          });
        }
        if (productsSelect) {
          productsSelect.innerHTML = '';
          appState.menuItems.forEach((mi) => {
            const opt = document.createElement('option');
            opt.value = mi.id;
            opt.textContent = mi.name;
            productsSelect.appendChild(opt);
          });
        }
        if (alertDiv) alertDiv.innerHTML = '';
        // Reset type related fields
        if (typeSelect) typeSelect.value = 'bill';
        if (minValueInput) minValueInput.value = '';
        if (productSelect) productSelect.selectedIndex = 0;
        renderOfferVariationOptions(productSelect ? productSelect.value : '', '');
        if (productsSelect) productsSelect.selectedIndex = -1;
        if (comboVariationRows) comboVariationRows.innerHTML = '';
        // Hide optional groups by default
        if (minValueGroup) minValueGroup.style.display = 'none';
        if (productGroup) productGroup.style.display = 'none';
        if (variationGroup) variationGroup.style.display = 'none';
        if (productsGroup) productsGroup.style.display = 'none';
        if (index === null || index === undefined) {
          if (titleEl) titleEl.textContent = 'Add Offer';
          if (titleInput) titleInput.value = '';
          if (discountInput) discountInput.value = '';
          if (startInput) startInput.value = '';
          if (endInput) endInput.value = '';
          if (enabledInput) enabledInput.checked = true;
          modal.dataset.index = '';
        } else {
          const offer = appState.offers[index];
          if (!offer) return;
          if (titleEl) titleEl.textContent = 'Edit Offer';
          if (titleInput) titleInput.value = offer.title;
          if (discountInput) discountInput.value = offer.discount;
          if (startInput) startInput.value = offer.start ? new Date(offer.start).toISOString().substring(0, 10) : '';
          if (endInput) endInput.value = offer.end ? new Date(offer.end).toISOString().substring(0, 10) : '';
          if (enabledInput) enabledInput.checked = offer.enabled;
          if (typeSelect && offer.type) {
            typeSelect.value = offer.type;
          }
          if (offer.type === 'bill') {
            if (offer.minValue !== undefined && offer.minValue !== null) {
              if (minValueGroup) minValueGroup.style.display = 'block';
              if (minValueInput) minValueInput.value = offer.minValue;
            }
          } else if (offer.type === 'product') {
            if (productGroup) productGroup.style.display = 'block';
            // set product select
            if (productSelect) {
              for (let i = 0; i < productSelect.options.length; i++) {
                if (productSelect.options[i].value === offer.productId) {
                  productSelect.selectedIndex = i;
                  break;
                }
              }
            }
            renderOfferVariationOptions(offer.productId, offer.productVariationId || '');
            if (variationGroup) variationGroup.style.display = 'block';
          } else if (offer.type === 'combo') {
            if (productsGroup) productsGroup.style.display = 'block';
            const comboRequirements = getComboOfferRequirements(offer);
            if (productsSelect && Array.isArray(offer.productIds)) {
              // Select matching options in multi select
              for (let i = 0; i < productsSelect.options.length; i++) {
                const opt = productsSelect.options[i];
                opt.selected = offer.productIds.includes(opt.value);
              }
            }
            renderComboVariationRows(comboRequirements);
          }
          modal.dataset.index = index;
        }
        // Attach change handler to update display of product/min value inputs
        if (typeSelect) {
          typeSelect.onchange = function () {
            const val = this.value;
            if (val === 'bill') {
              if (minValueGroup) minValueGroup.style.display = 'block';
              if (productGroup) productGroup.style.display = 'none';
              if (variationGroup) variationGroup.style.display = 'none';
              if (productsGroup) productsGroup.style.display = 'none';
            } else if (val === 'product') {
              if (minValueGroup) minValueGroup.style.display = 'none';
              if (productGroup) productGroup.style.display = 'block';
              if (variationGroup) variationGroup.style.display = 'block';
              if (productsGroup) productsGroup.style.display = 'none';
              renderOfferVariationOptions(productSelect ? productSelect.value : '', variationSelect ? variationSelect.value : '');
            } else if (val === 'combo') {
              if (minValueGroup) minValueGroup.style.display = 'none';
              if (productGroup) productGroup.style.display = 'none';
              if (variationGroup) variationGroup.style.display = 'none';
              if (productsGroup) productsGroup.style.display = 'block';
              renderComboVariationRows();
            }
          };
          // Trigger change once to set correct state
          typeSelect.onchange();
        }
        if (productSelect) {
          productSelect.onchange = function () {
            renderOfferVariationOptions(this.value, '');
          };
        }
        if (productsSelect) {
          productsSelect.onchange = function () {
            renderComboVariationRows();
          };
        }
        // Live status label for the Enabled toggle — updates dot color
        // and text as the admin flips the switch, so it's visually clear
        // whether the offer is active or paused.
        var offerStatusEl = document.getElementById('offerEnabledStatus');
        function refreshOfferEnabledStatus() {
          if (!offerStatusEl || !enabledInput) return;
          var on = enabledInput.checked;
          offerStatusEl.classList.toggle('is-enabled', on);
          offerStatusEl.classList.toggle('is-disabled', !on);
          var labelEl = offerStatusEl.querySelector('.status-label');
          if (labelEl) {
            labelEl.textContent = on
              ? 'Enabled — offer is active'
              : 'Disabled — offer is paused (will not appear on site)';
          }
        }
        if (enabledInput && !enabledInput.dataset.statusWired) {
          enabledInput.dataset.statusWired = '1';
          enabledInput.addEventListener('change', refreshOfferEnabledStatus);
        }
        refreshOfferEnabledStatus();
        modal.classList.add('active');
      }
      function closeEditOfferModal() {
        const modal = document.getElementById('editOfferModal');
        if (modal) modal.classList.remove('active');
      }
      // handle saving offer
      const offerForm = document.getElementById('editOfferForm');
      if (offerForm) {
        offerForm.addEventListener('submit', function (e) {
          e.preventDefault();
          const title = document.getElementById('offerTitleInput').value.trim();
          const discount = parseFloat(document.getElementById('offerDiscountInput').value);
          const startDate = document.getElementById('offerStartInput').value;
          const endDate = document.getElementById('offerEndInput').value;
          const enabled = document.getElementById('offerEnabledInput').checked;
          const type = document.getElementById('offerTypeInput').value;
          const minVal = document.getElementById('offerMinValueInput').value;
          const productId = document.getElementById('offerProductSelect').value;
          const productVariationId = document.getElementById('offerVariationSelect').value;
          const productsSelect = document.getElementById('offerProductsSelect');
          // Collect selected values for multi-product offers
          let selectedProductIds = [];
          if (productsSelect) {
            selectedProductIds = Array.from(productsSelect.options)
              .filter((opt) => opt.selected)
              .map((opt) => opt.value);
          }
          const comboRequirements = Array.from(document.querySelectorAll('#offerComboVariationRows [data-combo-product-id]')).map((select) => ({
            productId: select.getAttribute('data-combo-product-id'),
            variationId: select.value || ''
          })).filter((entry) => entry.productId);
          if (!title || isNaN(discount)) {
            const alertDiv = document.getElementById('editOfferAlert');
            if (alertDiv) alertDiv.textContent = 'Please fill all required fields correctly.';
            return;
          }
          const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
          const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
          const modal = document.getElementById('editOfferModal');
          const idxAttr = modal.dataset.index;
          const offerObj = {
            id: generateId(),
            title: title,
            discount: discount,
            start: start,
            end: end,
            enabled: enabled,
            type: type
          };
          if (type === 'product') {
            offerObj.productId = productId;
            offerObj.productVariationId = productVariationId || '';
          } else if (type === 'combo') {
            offerObj.productIds = selectedProductIds;
            offerObj.comboRequirements = comboRequirements.length
              ? comboRequirements
              : selectedProductIds.map((productId) => ({ productId, variationId: '' }));
          } else {
            // bill type
            const minValue = parseFloat(minVal);
            if (!isNaN(minValue)) offerObj.minValue = minValue;
          }
          if (idxAttr === '' || idxAttr === undefined) {
            // new offer
            App.Repo.Offers.create(offerObj);
          } else {
            const idx = parseInt(idxAttr, 10);
            if (!isNaN(idx) && appState.offers[idx]) {
              const offer = appState.offers[idx];
              offer.title = title;
              offer.discount = discount;
              offer.start = start;
              offer.end = end;
              offer.enabled = enabled;
              offer.type = type;
              if (type === 'product') {
                offer.productId = productId;
                offer.productVariationId = productVariationId || '';
                delete offer.minValue;
                if (offer.productIds) delete offer.productIds;
              } else if (type === 'combo') {
                offer.productIds = selectedProductIds;
                offer.comboRequirements = comboRequirements.length
                  ? comboRequirements
                  : selectedProductIds.map((productId) => ({ productId, variationId: '' }));
                if (offer.productId) delete offer.productId;
                if (offer.productVariationId) delete offer.productVariationId;
                if (offer.minValue !== undefined) delete offer.minValue;
              } else {
                // bill
                const minValue = parseFloat(minVal);
                if (!isNaN(minValue)) offer.minValue = minValue;
                if (offer.productId) delete offer.productId;
                if (offer.productVariationId) delete offer.productVariationId;
                if (offer.productIds) delete offer.productIds;
                if (offer.comboRequirements) delete offer.comboRequirements;
              }
              // Explicit publishUpdate to ensure the edit syncs even if
              // the diff engine misses an in-place mutation.
              if (App.SupabaseSync && offer.id) {
                App.SupabaseSync.publishUpdate('offers', offer.id, offer);
              }
            }
          }
          saveData();
          if (App.SupabaseSync && App.SupabaseSync.flushNow) {
            App.SupabaseSync.flushNow();
          }
          if (document.getElementById('adminPanel').classList.contains('active')) {
            renderOffersManagement(document.getElementById('adminContent'));
          }
          buildWebsite();
          closeEditOfferModal();
        });
      }

      /**
       * Open the review editing modal.  index null means add new review.
       */
      function openEditReviewModal(index) {
        const modal = document.getElementById('editReviewModal');
        const titleEl = document.getElementById('editReviewModalTitle');
        const alertDiv = document.getElementById('editReviewAlert');
        const nameInput = document.getElementById('reviewNameInput');
        const ratingInput = document.getElementById('reviewRatingInput');
        const messageInput = document.getElementById('reviewMessageInput');
        // v151: new admin-editable fields
        const subtitleInput = document.getElementById('reviewSubtitleInput');
        const timeAgoInput = document.getElementById('reviewTimeAgoInput');
        // v153: avatar upload field
        const avatarFileInput = document.getElementById('reviewAvatarInput');
        const avatarPreview = document.getElementById('reviewAvatarPreview');
        const avatarClearBtn = document.getElementById('reviewAvatarClearBtn');
        // Reset file input + clear pending upload state
        if (avatarFileInput) avatarFileInput.value = '';
        if (alertDiv) alertDiv.innerHTML = '';
        if (index === null || index === undefined) {
          if (titleEl) titleEl.textContent = 'Add Review';
          if (nameInput) nameInput.value = '';
          if (ratingInput) ratingInput.value = '';
          if (messageInput) messageInput.value = '';
          if (subtitleInput) subtitleInput.value = '';
          if (timeAgoInput) timeAgoInput.value = '';
          if (avatarPreview) {
            avatarPreview.src = '';
            avatarPreview.style.display = 'none';
            avatarPreview.dataset.existingUrl = '';
          }
          if (avatarClearBtn) avatarClearBtn.style.display = 'none';
          modal.dataset.index = '';
        } else {
          const review = appState.reviews[index];
          if (!review) return;
          if (titleEl) titleEl.textContent = 'Edit Review';
          if (nameInput) nameInput.value = review.name;
          if (ratingInput) ratingInput.value = review.rating;
          if (messageInput) messageInput.value = review.message;
          if (subtitleInput) subtitleInput.value = review.subtitle || '';
          if (timeAgoInput) timeAgoInput.value = review.timeAgo || '';
          // v153: load existing avatar if any
          if (avatarPreview) {
            if (review.avatarUrl) {
              avatarPreview.src = review.avatarUrl;
              avatarPreview.style.display = 'inline-block';
              avatarPreview.dataset.existingUrl = review.avatarUrl;
              if (avatarClearBtn) avatarClearBtn.style.display = 'inline-block';
            } else {
              avatarPreview.src = '';
              avatarPreview.style.display = 'none';
              avatarPreview.dataset.existingUrl = '';
              if (avatarClearBtn) avatarClearBtn.style.display = 'none';
            }
          }
          modal.dataset.index = index;
        }
        modal.classList.add('active');
      }
      function closeEditReviewModal() {
        const modal = document.getElementById('editReviewModal');
        if (modal) modal.classList.remove('active');
      }
      // v153: avatar file input preview + clear handler
      const reviewAvatarInputEl = document.getElementById('reviewAvatarInput');
      const reviewAvatarPreviewEl = document.getElementById('reviewAvatarPreview');
      const reviewAvatarClearBtnEl = document.getElementById('reviewAvatarClearBtn');
      if (reviewAvatarInputEl && reviewAvatarPreviewEl) {
        reviewAvatarInputEl.addEventListener('change', function () {
          const file = reviewAvatarInputEl.files && reviewAvatarInputEl.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
              reviewAvatarPreviewEl.src = e.target.result;
              reviewAvatarPreviewEl.style.display = 'inline-block';
              if (reviewAvatarClearBtnEl) reviewAvatarClearBtnEl.style.display = 'inline-block';
            };
            reader.readAsDataURL(file);
          }
        });
      }
      if (reviewAvatarClearBtnEl) {
        reviewAvatarClearBtnEl.addEventListener('click', function () {
          if (reviewAvatarInputEl) reviewAvatarInputEl.value = '';
          if (reviewAvatarPreviewEl) {
            reviewAvatarPreviewEl.src = '';
            reviewAvatarPreviewEl.style.display = 'none';
            reviewAvatarPreviewEl.dataset.existingUrl = '';
            // Flag this as explicitly cleared so submit removes avatarUrl
            reviewAvatarPreviewEl.dataset.cleared = '1';
          }
          reviewAvatarClearBtnEl.style.display = 'none';
        });
      }

      // handle saving review
      const reviewForm = document.getElementById('editReviewForm');
      if (reviewForm) {
        reviewForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          const name = document.getElementById('reviewNameInput').value.trim();
          const rating = parseFloat(document.getElementById('reviewRatingInput').value);
          const message = document.getElementById('reviewMessageInput').value.trim();
          // v151: read new optional fields
          const subtitle = document.getElementById('reviewSubtitleInput').value.trim();
          const timeAgo = document.getElementById('reviewTimeAgoInput').value.trim();
          if (!name || isNaN(rating) || rating < 1 || rating > 5 || !message) {
            const alertDiv = document.getElementById('editReviewAlert');
            if (alertDiv) alertDiv.textContent = 'Please fill all fields correctly.';
            return;
          }

          // v153: handle avatar upload BEFORE saving the review
          let avatarUrl = '';
          const avatarFile = reviewAvatarInputEl && reviewAvatarInputEl.files && reviewAvatarInputEl.files[0];
          const existingAvatarUrl = (reviewAvatarPreviewEl && reviewAvatarPreviewEl.dataset.existingUrl) || '';
          const wasCleared = reviewAvatarPreviewEl && reviewAvatarPreviewEl.dataset.cleared === '1';
          if (avatarFile) {
            // New file selected — compress + upload
            try {
              const alertDiv = document.getElementById('editReviewAlert');
              if (alertDiv) alertDiv.textContent = 'Uploading avatar...';
              const compressedBlob = await resizeImageFileGeneric(avatarFile, 400, 0.85);
              avatarUrl = await uploadImageToStorage(compressedBlob, 'hero', 'review_avatar', 'jpg');
              if (alertDiv) alertDiv.textContent = '';
            } catch (err) {
              const alertDiv = document.getElementById('editReviewAlert');
              if (alertDiv) alertDiv.textContent = 'Avatar upload failed: ' + (err.message || 'unknown error');
              return;
            }
          } else if (!wasCleared && existingAvatarUrl) {
            // No new file, but existing URL preserved
            avatarUrl = existingAvatarUrl;
          }
          // Reset cleared flag for next open
          if (reviewAvatarPreviewEl) reviewAvatarPreviewEl.dataset.cleared = '';

          const modal = document.getElementById('editReviewModal');
          const idxAttr = modal.dataset.index;
          if (idxAttr === '' || idxAttr === undefined) {
            var __review = {
              id: generateId(),
              name: name,
              rating: rating,
              message: message,
              subtitle: subtitle,
              timeAgo: timeAgo,
              avatarUrl: avatarUrl
            };
            App.Repo.Reviews.create(__review);
          } else {
            const idx = parseInt(idxAttr, 10);
            if (!isNaN(idx) && appState.reviews[idx]) {
              appState.reviews[idx].name = name;
              appState.reviews[idx].rating = rating;
              appState.reviews[idx].message = message;
              appState.reviews[idx].subtitle = subtitle;
              appState.reviews[idx].timeAgo = timeAgo;
              appState.reviews[idx].avatarUrl = avatarUrl;
              if (App.SupabaseSync && appState.reviews[idx].id) {
                App.SupabaseSync.publishUpdate('reviews', appState.reviews[idx].id, appState.reviews[idx]);
              }
            }
          }
          saveData();
          if (App.SupabaseSync && App.SupabaseSync.flushNow) {
            App.SupabaseSync.flushNow();
          }
          if (document.getElementById('adminPanel').classList.contains('active')) {
            renderReviewsManagement(document.getElementById('adminContent'));
          }
          buildWebsite();
          closeEditReviewModal();
        });
      }

      /**
       * Display full order details in a modal for administrators.
       */
      function getOrderStatusClass(status) {
        const normalized = String(status || 'Pending').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return `status-${normalized}`;
      }

      function renderOrderStatusPill(status) {
        return `<span class="status-pill ${getOrderStatusClass(status)}">${escapeHtml(status || 'Pending')}</span>`;
      }

      function formatOrderCurrency(value) {
        return `AED ${Number(value || 0).toFixed(2)}`;
      }

      let selectedOrderFilter = 'recent';

      function getOrderFilterRange(filterKey) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        switch (filterKey) {
          case 'today':
            return getDashboardDateRange('today');
          case 'last7':
            return getDashboardDateRange('week');
          case 'last30':
            return getDashboardDateRange('month');
          case 'thisMonth':
            return { start: monthStart, end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
          case 'all':
          case 'recent':
          default:
            return { start: null, end: null };
        }
      }

      function filterOrdersBySelection(orders, filterKey) {
        if (filterKey === 'recent') {
          return orders.slice().sort((a, b) => Number(b.date || b.timeline?.placedAt || 0) - Number(a.date || a.timeline?.placedAt || 0)).slice(0, 25);
        }
        if (filterKey === 'all') return orders.slice().sort((a, b) => Number(b.date || b.timeline?.placedAt || 0) - Number(a.date || a.timeline?.placedAt || 0));
        const range = getOrderFilterRange(filterKey);
        return orders
          .filter((order) => isWithinRange(order.date || order.timeline?.placedAt || 0, range))
          .sort((a, b) => Number(b.date || b.timeline?.placedAt || 0) - Number(a.date || a.timeline?.placedAt || 0));
      }

      function updateOrderFromDetailModal(orderId, nextStatus) {
        const order = (appState.orders || []).find((entry) => entry.id === orderId);
        if (!order) return;
        updateOrderStatusTimeline(order, nextStatus);
        saveData();
        // Explicitly sync the status change so it reaches Supabase regardless
        // of diff-engine snapshot state.
        if (App.SupabaseSync) App.SupabaseSync.publishUpdate('orders', order.id, order);
        if (['Accepted', 'Delivered', 'Cancelled'].includes(nextStatus)) {
          stopRealtimeRingtone('orders', order.id);
        }
        const adminContent = document.getElementById('adminContent');
        if (document.getElementById('adminPanel').classList.contains('active') && adminContent) {
          const activeNav = document.querySelector('#adminNav li.active');
          if (activeNav) {
            if (activeNav.dataset.target === 'orders') renderOrdersSection(adminContent, true);
            if (activeNav.dataset.target === 'dashboard') renderDashboardSection(adminContent);
          }
        }
        openOrderDetailsModal(order);
      }

      function openOrderDetailsModal(order) {
        const modal = document.getElementById('orderDetailsModal');
        const container = document.getElementById('orderDetailsContent');
        if (!modal || !container || !order) return;
        markSectionAsSeen('orders', false);
        stopRealtimeRingtone('orders', order.id);
        ensureOrderTimeline(order);

        const orderItems = Array.isArray(order.items) ? order.items : [];
        const discountDetails = Array.isArray(order.discountDetails)
          ? order.discountDetails.filter((item) => Number(item.totalSaved || 0) > 0 || (item.labels || []).length)
          : [];
        const orderId = String(order.id || '');
        const safeOrderId = orderId.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const orderDateValue = order.date || order.timeline?.placedAt || Date.now();
        const orderDate = new Date(orderDateValue);
        const customer = order.customer || {};
        const customerUser = order.userId ? (appState.users || []).find((user) => user.id === order.userId) : null;
        const customerEmail = customer.email || order.email || customerUser?.email || 'Not provided';
        const paymentMethodLabel = order.paymentMethod === 'cod'
          ? 'Cash on Delivery'
          : (order.paymentMethod || order.paymentDetails?.method || 'Not specified');
        const paymentStatusLabel = order.paymentStatus || order.paymentDetails?.status || (order.status === 'Delivered' ? 'Collected' : 'Pending / COD');
        const orderNotes = order.notes || 'No notes added for this order.';

        const itemRows = orderItems.map((it) => {
          const item = (appState.menuItems || []).find((mi) => mi.id === it.id);
          const name = it.productName || (item ? item.name : 'Item');
          const unitPrice = Number(it.unitPrice || 0);
          const quantity = Number(it.qty || 0);
          const lineTotal = Number(it.lineTotal || (unitPrice * quantity));
          const appliedDiscount = discountDetails.find((detail) => detail.lineKey === it.lineKey);
          const labels = appliedDiscount && appliedDiscount.labels && appliedDiscount.labels.length
            ? appliedDiscount.labels.join(' • ')
            : '';
          const imageSrc = item ? getMenuItemImage(item) : getMenuItemImage({ image: it.image || '' });
          const variationName = it.variationName || it.size || 'Regular';
          return `
            <tr>
              <td class="image-cell" data-label="Image">
                <img class="order-detail-product-thumb" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(name)}" loading="lazy" />
              </td>
              <td data-label="Product Name">
                <div class="order-detail-product-name">
                  <strong>${escapeHtml(name)}</strong>
                  ${labels ? `<small>${escapeHtml(labels)}</small>` : ''}
                </div>
              </td>
              <td data-label="Variation/Size">
                <span class="order-detail-variation-note">${escapeHtml(variationName)}</span>
              </td>
              <td class="qty-cell" data-label="Quantity">${quantity}</td>
              <td class="price-cell" data-label="Unit Price">${formatOrderCurrency(unitPrice)}</td>
              <td class="price-cell" data-label="Total Price">${formatOrderCurrency(lineTotal)}</td>
            </tr>
          `;
        }).join('') || `
          <tr>
            <td colspan="6">
              <div class="order-detail-empty-state">No products found for this order.</div>
            </td>
          </tr>
        `;

        const discountRows = discountDetails.map((detail) => `
          <div class="order-detail-deal-card">
            <strong>${escapeHtml(detail.name || 'Discount')}${detail.variationName ? ` - ${escapeHtml(detail.variationName)}` : ''}</strong>
            <span>${Number(detail.qty || 0)} item(s) • Saved ${formatOrderCurrency(detail.totalSaved)}${detail.labels && detail.labels.length ? ` • ${escapeHtml(detail.labels.join(' • '))}` : ''}</span>
          </div>
        `).join('') || '<div class="order-detail-empty-state">No discounts or deals were applied to this order.</div>';

        container.innerHTML = `
          <div class="order-detail-panel">
            <header class="order-detail-header">
              <div class="order-detail-header-main">
                <span class="order-detail-eyebrow">Order Details</span>
                <div class="order-detail-heading-row">
                  <h3 id="orderDetailTitle">Order ${escapeHtml(orderId)}</h3>
                  ${renderOrderStatusPill(order.status)}
                </div>
                <p class="order-detail-subtitle">Placed on ${orderDate.toLocaleDateString()} at ${orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <button type="button" class="order-detail-close" aria-label="Close order details" onclick="closeOrderDetailsModal()"><span aria-hidden="true">&times;</span></button>
            </header>

            <div class="order-detail-body">
              <section class="order-detail-section-card">
                <div class="order-detail-section-head">
                  <h4>Order Overview</h4>
                  <span>Primary order status and payment information</span>
                </div>
                <div class="order-detail-overview-grid">
                  <div class="order-detail-info-item">
                    <span class="label">Order ID</span>
                    <strong>${escapeHtml(orderId)}</strong>
                  </div>
                  <div class="order-detail-info-item">
                    <span class="label">Order Status</span>
                    <strong>${renderOrderStatusPill(order.status)}</strong>
                  </div>
                  <div class="order-detail-info-item">
                    <span class="label">Date & Time</span>
                    <strong>${orderDate.toLocaleString()}</strong>
                  </div>
                  <div class="order-detail-info-item">
                    <span class="label">Payment Status</span>
                    <strong><span class="status-pill order-detail-payment-pill">${escapeHtml(paymentStatusLabel)}</span></strong>
                  </div>
                </div>
              </section>

              <section class="order-detail-section-card">
                <div class="order-detail-section-head">
                  <h4>Customer Information</h4>
                  <span>Delivery and contact details</span>
                </div>
                <div class="order-detail-info-grid">
                  <div class="order-detail-info-item">
                    <span class="label">Customer Name</span>
                    <strong>${escapeHtml(customer.name || 'Unknown')}</strong>
                  </div>
                  <div class="order-detail-info-item">
                    <span class="label">Phone Number</span>
                    <strong>${escapeHtml(customer.phone || 'Not provided')}</strong>
                  </div>
                  <div class="order-detail-info-item is-wide">
                    <span class="label">Email</span>
                    <strong>${escapeHtml(customerEmail)}</strong>
                  </div>
                  <div class="order-detail-info-item is-full">
                    <span class="label">Address</span>
                    <p>${escapeHtml(customer.address || 'No address provided')}</p>
                  </div>
                  <div class="order-detail-info-item is-full">
                    <span class="label">Order Notes</span>
                    <p>${escapeHtml(orderNotes)}</p>
                  </div>
                </div>
              </section>

              <section class="order-detail-section-card">
                <div class="order-detail-section-head">
                  <h4>Ordered Items</h4>
                  <span>${orderItems.length} item line${orderItems.length === 1 ? '' : 's'}</span>
                </div>
                <div class="order-detail-table-wrap">
                  <table class="order-detail-items-table">
                    <thead>
                      <tr>
                        <th class="image-col">Image</th>
                        <th>Product Name</th>
                        <th>Variation / Size</th>
                        <th class="qty-col">Qty</th>
                        <th class="price-col">Unit Price</th>
                        <th class="price-col">Total Price</th>
                      </tr>
                    </thead>
                    <tbody>${itemRows}</tbody>
                  </table>
                </div>
              </section>

              <section class="order-detail-section-card">
                <div class="order-detail-section-head">
                  <h4>Discounts, Charges & Total</h4>
                  <span>Applied deals, tax, delivery and grand total</span>
                </div>
                <div class="order-detail-finance-grid">
                  <div>
                    <span class="order-detail-label">Discount Details & Applied Deals</span>
                    <div class="order-detail-deal-list">${discountRows}</div>
                    <div class="order-detail-note-box" style="margin-top:10px;">
                      <strong style="display:block;color:#fff8ef;margin-bottom:4px;">Payment Method</strong>
                      ${escapeHtml(paymentMethodLabel)}
                    </div>
                  </div>
                  <div class="order-detail-summary-card">
                    <div class="order-detail-summary-lines">
                      <div class="order-detail-summary-line"><span>Subtotal</span><strong>${formatOrderCurrency(order.subtotal)}</strong></div>
                      <div class="order-detail-summary-line"><span>Discount Details</span><strong>${formatOrderCurrency(order.discount)}</strong></div>
                      <div class="order-detail-summary-line"><span>Applied Deals</span><strong>${discountDetails.length ? `${discountDetails.length} applied` : 'None'}</strong></div>
                      <div class="order-detail-summary-line"><span>Tax</span><strong>${formatOrderCurrency(order.tax)}</strong></div>
                      <div class="order-detail-summary-line"><span>Delivery Charges</span><strong>${formatOrderCurrency(order.deliveryFee)}</strong></div>
                      <div class="order-detail-summary-line total"><span>Grand Total</span><strong>${formatOrderCurrency(order.total)}</strong></div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <footer class="order-detail-action-bar">
              <div class="order-detail-action-copy">
                <strong>Order Actions</strong>
                <span>Update the order without leaving this details view.</span>
              </div>
              <div class="order-detail-actions">
                <button type="button" class="order-detail-action-btn accept" onclick="updateOrderFromDetailModal('${safeOrderId}', 'Accepted')"><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>Accept</span></button>
                <button type="button" class="order-detail-action-btn decline" onclick="updateOrderFromDetailModal('${safeOrderId}', 'Cancelled')"><i class="fa-solid fa-ban" aria-hidden="true"></i><span>Decline</span></button>
                <button type="button" class="order-detail-action-btn complete" onclick="updateOrderFromDetailModal('${safeOrderId}', 'Delivered')"><i class="fa-solid fa-check-double" aria-hidden="true"></i><span>Complete</span></button>
              </div>
            </footer>
          </div>
        `;
        modal.classList.add('active');
      }
      function closeOrderDetailsModal() {
        const modal = document.getElementById('orderDetailsModal');
        if (modal) modal.classList.remove('active');
      }
      document.addEventListener('click', function (event) {
        const orderModal = document.getElementById('orderDetailsModal');
        if (orderModal && event.target === orderModal) {
          closeOrderDetailsModal();
        }
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          closeOrderDetailsModal();
        }
      });

      function openRequestDetailsModal(requestId) {
        const modal = document.getElementById('requestDetailsModal');
        const container = document.getElementById('requestDetailsContent');
        const request = (appState.requests || []).find((entry) => entry.id === requestId);
        if (!modal || !container || !request) return;
        markSectionAsSeen('requests', false);
        stopRealtimeRingtone('requests', request.id);
        container.innerHTML = `
          <div class="detail-grid">
            <div><strong>Name</strong>${escapeHtml(request.name || 'Customer')}</div>
            <div><strong>Email</strong>${escapeHtml(request.email || 'Not provided')}</div>
            <div><strong>Submitted</strong>${new Date(request.timestamp || request.createdAt || Date.now()).toLocaleString()}</div>
          </div>
          <div class="request-message-box">
            <strong style="display:block;margin-bottom:8px;color:#fff8ef;">Full Message</strong>
            <p>${escapeHtml(request.message || '')}</p>
          </div>
        `;
        modal.classList.add('active');
      }

      function closeRequestDetailsModal() {
        const modal = document.getElementById('requestDetailsModal');
        if (modal) modal.classList.remove('active');
      }

      /**
       * Open the track order modal for customers.  Clears previous search results.
       */
      function openTrackOrderModal() {
        const modal = document.getElementById('trackOrderModal');
        const alertDiv = document.getElementById('trackOrderAlert');
        const input = document.getElementById('trackOrderIdInput');
        const result = document.getElementById('trackOrderResult');
        if (alertDiv) alertDiv.innerHTML = '';
        if (input) input.value = '';
        if (result) result.innerHTML = '';
        if (modal) modal.classList.add('active');
      }
      function closeTrackOrderModal() {
        const modal = document.getElementById('trackOrderModal');
        if (modal) modal.classList.remove('active');
      }
      // Handle searching for an order by ID
      const trackForm = document.getElementById('trackOrderForm');
      if (trackForm) {
        trackForm.addEventListener('submit', function (e) {
          e.preventDefault();
          const id = document.getElementById('trackOrderIdInput').value.trim();
          const result = document.getElementById('trackOrderResult');
          if (!id) {
            if (result) result.innerHTML = '<p>Please enter an order ID.</p>';
            return;
          }
          const order = appState.orders.find((o) => o.id === id);
          if (!order) {
            if (result) result.innerHTML = '<p>No order found with this ID.</p>';
            return;
          }
          // Build order summary for customers
          let html = `<p><strong>Status:</strong> ${order.status}</p>`;
          html += `<p><strong>Placed on:</strong> ${new Date(order.date).toLocaleString()}</p>`;
          html += `<p><strong>Total:</strong> AED ${order.total.toFixed(2)}</p>`;
          html += '<h4>Items:</h4><ul style="padding-left:20px;">';
          order.items.forEach((it) => {
            const item = appState.menuItems.find((mi) => mi.id === it.id);
            const itemName = it.productName || (item ? item.name : 'Item');
            html += `<li>${itemName}${it.variationName ? ` - ${it.variationName}` : ''} × ${it.qty}</li>`;
          });
          html += '</ul>';
          if (result) result.innerHTML = html;
        });
      }

      /**
       * Password reset workflow.  When a user clicks "Forgot password" on the login form,
       * a modal opens allowing them to specify their username or email and set a new password.
       */
      function openResetPasswordModal() {
        const modal = document.getElementById('resetPasswordModal');
        if (!modal) return;
        const alertDiv = document.getElementById('resetPasswordAlert');
        const idInput = document.getElementById('resetIdentifierInput');
        if (alertDiv) {
          alertDiv.innerHTML = '';
          alertDiv.style.color = '';
        }
        if (idInput) idInput.value = '';
        const submitBtn = document.getElementById('resetSubmitBtn');
        if (submitBtn) {
          submitBtn.textContent = 'Send Reset Link';
          submitBtn.disabled = false;
        }
        modal.classList.add('active');
      }
      function closeResetPasswordModal() {
        const modal = document.getElementById('resetPasswordModal');
        if (modal) modal.classList.remove('active');
      }

      // ================================================================
      // "Set New Password" modal — opened automatically when the user
      // clicks the reset link in their email. The Supabase client fires
      // a PASSWORD_RECOVERY auth event when the URL contains a valid
      // recovery token, which our boot-time listener catches and opens
      // this modal.
      // ================================================================
      function openSetNewPasswordModal() {
        const modal = document.getElementById('setNewPasswordModal');
        if (!modal) return;
        const alertDiv = document.getElementById('setNewPasswordAlert');
        if (alertDiv) {
          alertDiv.innerHTML = '';
          alertDiv.style.color = '';
        }
        const p1 = document.getElementById('setNewPasswordInput');
        const p2 = document.getElementById('setNewPasswordConfirmInput');
        if (p1) p1.value = '';
        if (p2) p2.value = '';
        modal.classList.add('active');
      }
      function closeSetNewPasswordModal() {
        const modal = document.getElementById('setNewPasswordModal');
        if (modal) modal.classList.remove('active');
      }
      window.openSetNewPasswordModal = openSetNewPasswordModal;
      window.closeSetNewPasswordModal = closeSetNewPasswordModal;

      // Attach handler for the simplified reset password form (just email)
      const resetForm = document.getElementById('resetPasswordForm');
      if (resetForm) {
        resetForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          const emailVal = (document.getElementById('resetIdentifierInput').value || '')
            .trim().toLowerCase();
          const alertDiv = document.getElementById('resetPasswordAlert');
          const submitBtn = document.getElementById('resetSubmitBtn');

          if (!emailVal || emailVal.indexOf('@') === -1) {
            if (alertDiv) {
              alertDiv.style.color = 'red';
              alertDiv.textContent = 'Please enter a valid email address.';
            }
            return;
          }

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
          }
          if (alertDiv) {
            alertDiv.style.color = '';
            alertDiv.textContent = '';
          }

          // Where Supabase should send the user after they click the
          // email link. Using window.location.origin + pathname keeps
          // it pointed at this exact deployed site (works for
          // GitHub Pages subpath too).
          var redirectTo = window.location.origin + window.location.pathname;
          // Strip any existing hash so Supabase's recovery hash lands clean
          redirectTo = redirectTo.replace(/#.*$/, '');

          try {
            const result = await App.Services.Auth.requestPasswordReset(emailVal, redirectTo);
            if (result && result.ok) {
              if (alertDiv) {
                alertDiv.style.color = 'green';
                alertDiv.textContent =
                  'If an account exists for that email, a password reset link has been sent. Please check your inbox (and spam folder).';
              }
              // Clear the email field so it's not lingering
              const idInput = document.getElementById('resetIdentifierInput');
              if (idInput) idInput.value = '';
              setTimeout(closeResetPasswordModal, 4000);
            } else {
              if (alertDiv) {
                alertDiv.style.color = 'red';
                alertDiv.textContent = (result && result.error) || 'Could not send reset email. Please try again.';
              }
            }
          } catch (err) {
            console.error('[ResetPassword] request failed', err);
            if (alertDiv) {
              alertDiv.style.color = 'red';
              alertDiv.textContent = 'Could not send reset email. Please try again.';
            }
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Send Reset Link';
            }
          }
        });
      }

      // Attach handler for the new-password form (post-link landing)
      const setNewPassForm = document.getElementById('setNewPasswordForm');
      if (setNewPassForm) {
        setNewPassForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          const p1 = document.getElementById('setNewPasswordInput').value;
          const p2 = document.getElementById('setNewPasswordConfirmInput').value;
          const alertDiv = document.getElementById('setNewPasswordAlert');

          if (!p1 || p1.length < 6) {
            if (alertDiv) {
              alertDiv.style.color = 'red';
              alertDiv.textContent = 'Password must be at least 6 characters.';
            }
            return;
          }
          if (p1 !== p2) {
            if (alertDiv) {
              alertDiv.style.color = 'red';
              alertDiv.textContent = 'Passwords do not match.';
            }
            return;
          }
          if (!App.Supabase || !App.Supabase.client) {
            if (alertDiv) {
              alertDiv.style.color = 'red';
              alertDiv.textContent = 'Authentication service unavailable.';
            }
            return;
          }
          try {
            const res = await App.Supabase.client.auth.updateUser({ password: p1 });
            if (res.error) {
              if (alertDiv) {
                alertDiv.style.color = 'red';
                alertDiv.textContent = res.error.message || 'Could not update password.';
              }
              return;
            }
            if (alertDiv) {
              alertDiv.style.color = 'green';
              alertDiv.textContent = 'Password updated. You are now signed in.';
            }
            // Clear the recovery hash from the URL so this modal doesn't
            // re-open on refresh
            try {
              history.replaceState(null, '', window.location.pathname + window.location.search);
            } catch (e) {}
            setTimeout(function () {
              closeSetNewPasswordModal();
              // After successful password reset Supabase leaves the user
              // signed in. Reload so the auth-bootstrap flow routes them
              // to the right panel naturally.
              window.location.reload();
            }, 1500);
          } catch (err) {
            console.error('[SetNewPassword] failed', err);
            if (alertDiv) {
              alertDiv.style.color = 'red';
              alertDiv.textContent = 'Could not update password. Please try again.';
            }
          }
        });
      }

      /**
       * Show the order history modal for the logged‑in customer.  Displays a table of
       * previous orders with ID, date/time and total.
       */
      function openOrderHistoryModal() {
        const modal = document.getElementById('orderHistoryModal');
        const content = document.getElementById('orderHistoryContent');
        if (!modal || !content) return;
        content.innerHTML = '';
        const session = appState.session;
        if (!session || session.role !== 'customer') return;
        const orders = appState.orders.filter((o) => o.userId === session.id);
        if (orders.length === 0) {
          content.innerHTML = '<p>You have not placed any orders yet.</p>';
        } else {
          const table = document.createElement('table');
          table.className = 'table';
          table.innerHTML = '<thead><tr><th>ID</th><th>Date &amp; Time</th><th>Total</th></tr></thead><tbody></tbody>';
          const tbody = table.querySelector('tbody');
          orders.forEach((o) => {
            const tr = document.createElement('tr');
            const date = new Date(o.date);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            tr.innerHTML = `<td>${o.id}</td><td>${dateStr}</td><td>AED ${o.total.toFixed(2)}</td>`;
            tbody.appendChild(tr);
          });
          content.appendChild(table);
        }
        modal.classList.add('active');
      }
      function closeOrderHistoryModal() {
        const modal = document.getElementById('orderHistoryModal');
        if (modal) modal.classList.remove('active');
      }

      // ===== Reservation history modal (customer) =====
      function openReservationHistoryModal() {
        const modal = document.getElementById('reservationHistoryModal');
        const content = document.getElementById('reservationHistoryContent');
        if (!modal || !content) return;
        content.innerHTML = '';
        const session = appState.session;
        if (!session || session.role !== 'customer') return;
        const user = appState.users.find((u) => u.id === session.id);
        if (!user) return;
        // Match reservations by userId first (set on new reservations
        // submitted while logged in). Fall back to email/phone matching
        // for legacy reservations or anonymous submissions.
        const myId = String(user.id || '');
        const myEmail = (user.email || '').toLowerCase().trim();
        const myPhone = (user.phone || '').replace(/\s+/g, '');
        const reservations = (appState.reservations || []).filter((r) => {
          if (!r) return false;
          // Strongest match: userId
          if (myId && String(r.userId || '') === myId) return true;
          // Legacy fallback: email or phone
          const re = (r.email || '').toLowerCase().trim();
          const rp = (r.phone || '').replace(/\s+/g, '');
          return (myEmail && re === myEmail) || (myPhone && rp === myPhone);
        });
        if (reservations.length === 0) {
          content.innerHTML = '<p>You have no reservations yet.</p>';
        } else {
          const table = document.createElement('table');
          table.className = 'table';
          table.innerHTML = '<thead><tr><th>When</th><th>Guests</th><th>Status</th></tr></thead><tbody></tbody>';
          const tbody = table.querySelector('tbody');
          // Sort newest first
          reservations
            .slice()
            .sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0))
            .forEach((r) => {
              const tr = document.createElement('tr');
              const when = r.datetime
                ? new Date(r.datetime).toLocaleString()
                : (r.date ? new Date(r.date).toLocaleString() : '');
              tr.innerHTML = `<td>${escapeHtml(when)}</td><td>${Number(r.guests || 0)}</td><td>${escapeHtml(r.status || 'Pending')}</td>`;
              tbody.appendChild(tr);
            });
          content.appendChild(table);
        }
        modal.classList.add('active');
      }
      function closeReservationHistoryModal() {
        const modal = document.getElementById('reservationHistoryModal');
        if (modal) modal.classList.remove('active');
      }
      window.openReservationHistoryModal  = openReservationHistoryModal;
      window.closeReservationHistoryModal = closeReservationHistoryModal;

      // ===== Request history modal (customer) =====
      function openRequestHistoryModal() {
        const modal = document.getElementById('requestHistoryModal');
        const content = document.getElementById('requestHistoryContent');
        if (!modal || !content) return;
        content.innerHTML = '';
        const session = appState.session;
        if (!session || session.role !== 'customer') return;
        // Requests track userId directly
        const requests = (appState.requests || []).filter((r) => r && r.userId === session.id);
        if (requests.length === 0) {
          content.innerHTML = '<p>You have not sent any messages yet.</p>';
        } else {
          const table = document.createElement('table');
          table.className = 'table';
          table.innerHTML = '<thead><tr><th>Date</th><th>Message</th></tr></thead><tbody></tbody>';
          const tbody = table.querySelector('tbody');
          requests
            .slice()
            .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0))
            .forEach((r) => {
              const tr = document.createElement('tr');
              const dateStr = r.timestamp ? new Date(r.timestamp).toLocaleString() : '';
              tr.innerHTML = `<td>${escapeHtml(dateStr)}</td><td>${escapeHtml(r.message || '')}</td>`;
              tbody.appendChild(tr);
            });
          content.appendChild(table);
        }
        modal.classList.add('active');
      }
      function closeRequestHistoryModal() {
        const modal = document.getElementById('requestHistoryModal');
        if (modal) modal.classList.remove('active');
      }
      window.openRequestHistoryModal  = openRequestHistoryModal;
      window.closeRequestHistoryModal = closeRequestHistoryModal;

      /**
       * Open the user details modal.  Shows basic customer information and a
       * table of their orders.  The user is identified by their ID.  If the
       * user or orders cannot be found nothing is displayed.  Called from
       * the admin panel when clicking the "View" button in the users table.
       */
      function openUserDetailsModal(userId) {
        const user = appState.users.find((u) => u.id === userId);
        if (!user) return;
        const modal = document.getElementById('userDetailsModal');
        const titleEl = document.getElementById('userDetailsTitle');
        const contentEl = document.getElementById('userDetailsContent');
        if (!modal || !titleEl || !contentEl) return;
        // Set the title to include the username
        titleEl.textContent = `Customer Details – ${user.displayName || user.name || user.username || 'Customer'}`;
        // Build the content: user info and order history
        let html = '';
        html += `<p><strong>Name:</strong> ${escapeHtml(user.displayName || user.name || user.username || 'Customer')}</p>`;
        html += `<p><strong>Email:</strong> ${user.email || 'N/A'}</p>`;
        html += `<p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>`;
        html += `<p><strong>Verified:</strong> ${user.verified ? 'Yes' : 'No'}</p>`;
        // Gather this user's orders
        const orders = appState.orders.filter((o) => o.userId === userId);
        if (orders.length === 0) {
          html += '<p style="margin-top:10px;">This customer has not placed any orders yet.</p>';
        } else {
          html += '<h4 style="margin-top:15px;">Order History</h4>';
          html += '<table class="table"><thead><tr><th>Order ID</th><th>Date & Time</th><th>Items</th><th>Total (AED)</th><th>Status</th></tr></thead><tbody>';
          orders.forEach((order) => {
            const dateStr = new Date(order.date).toLocaleDateString() + ' ' + new Date(order.date).toLocaleTimeString();
            const itemsStr = order.items
              .map((ci) => {
                const itm = appState.menuItems.find((mi) => mi.id === ci.id);
                const baseName = ci.productName || (itm ? itm.name : '');
                return baseName ? `${baseName}${ci.variationName ? ` - ${ci.variationName}` : ''} x ${ci.qty}` : '';
              })
              .filter((s) => s)
              .join('; ');
            html += `<tr><td>${order.id}</td><td>${dateStr}</td><td>${itemsStr}</td><td>${order.total.toFixed(2)}</td><td>${order.status}</td></tr>`;
          });
          html += '</tbody></table>';
        }
        contentEl.innerHTML = html;
        modal.classList.add('active');
      }

      /**
       * Close the user details modal.  Clears its content and hides it.
       */
      function closeUserDetailsModal() {
        const modal = document.getElementById('userDetailsModal');
        const contentEl = document.getElementById('userDetailsContent');
        if (modal) modal.classList.remove('active');
        if (contentEl) contentEl.innerHTML = '';
      }


      function getOrderItemLineRevenue(entry) {
        return Number(entry.lineTotal || (Number(entry.unitPrice || 0) * Number(entry.qty || 0)) || 0);
      }

      function getMenuProductOptionsHtml(selectedId) {
        return (appState.menuItems || [])
          .map((item) => `<option value="${String(item.id).replace(/"/g, '&quot;')}" ${String(item.id) === String(selectedId || '') ? 'selected' : ''}>${escapeHtml(item.name || 'Product')}</option>`)
          .join('');
      }


      function getMenuCategoryOptionsHtml(selectedIndex) {
        return (appState.categories || [])
          .map((cat, idx) => `<option value="${idx}" ${String(idx) === String(selectedIndex || 0) ? 'selected' : ''}>${escapeHtml(cat.name || 'Category')}</option>`)
          .join('');
      }

      function buildAdvancedSalesReport(range, reportType, selectedValue) {
        const orders = (appState.orders || []).filter((order) => isWithinRange(order.date || order.timeline?.placedAt, range));
        const productStats = {};
        let filteredOrders = 0;
        let totalRevenue = 0;
        let totalQty = 0;
        orders.forEach((order) => {
          let orderMatched = false;
          (order.items || []).forEach((entry) => {
            const item = (appState.menuItems || []).find((menuItem) => String(menuItem.id) === String(entry.id));
            const productId = String(entry.id || 'unknown');
            const productName = entry.productName || (item ? item.name : 'Product');
            const categoryIndex = item ? Number(item.category || 0) : -1;
            const categoryName = (appState.categories && appState.categories[categoryIndex] && appState.categories[categoryIndex].name) || 'Uncategorized';
            const matchesCategory = reportType !== 'category' || String(categoryIndex) === String(selectedValue);
            const matchesProduct = reportType !== 'product' || String(productId) === String(selectedValue);
            if (!matchesCategory || !matchesProduct) return;
            const qty = Number(entry.qty || 0);
            const revenue = getOrderItemLineRevenue(entry);
            if (!productStats[productId]) {
              productStats[productId] = { id: productId, name: productName, category: categoryName, qty: 0, revenue: 0, orders: new Set() };
            }
            productStats[productId].qty += qty;
            productStats[productId].revenue += revenue;
            productStats[productId].orders.add(order.id);
            totalQty += qty;
            totalRevenue += revenue;
            orderMatched = true;
          });
          if (orderMatched) filteredOrders += 1;
        });
        const rows = Object.values(productStats)
          .map((item) => ({ ...item, ordersCount: item.orders.size }))
          .sort((a, b) => b.revenue - a.revenue || b.qty - a.qty);
        return { rows, ordersCount: filteredOrders, totalRevenue, totalQty, topProduct: rows[0] || null };
      }

      function renderAdvancedSalesReport(range) {
        const typeSelect = document.getElementById('simpleReportType');
        const categorySelect = document.getElementById('simpleReportCategory');
        const productSelect = document.getElementById('simpleReportProduct');
        const categoryField = document.getElementById('simpleReportCategoryField');
        const productField = document.getElementById('simpleReportProductField');
        const body = document.getElementById('advancedReportBody');
        if (!typeSelect || !categorySelect || !productSelect || !body) return;
        const reportType = typeSelect.value || 'all';
        if (categoryField) categoryField.classList.toggle('is-hidden', reportType !== 'category');
        if (productField) productField.classList.toggle('is-hidden', reportType !== 'product');
        const selectedValue = reportType === 'category' ? categorySelect.value : reportType === 'product' ? productSelect.value : '';
        const report = buildAdvancedSalesReport(range, reportType, selectedValue);
        const title = reportType === 'category'
          ? `Category Wise Report: ${categorySelect.selectedOptions[0] ? categorySelect.selectedOptions[0].textContent : 'Category'}`
          : reportType === 'product'
            ? `Product Wise Report: ${productSelect.selectedOptions[0] ? productSelect.selectedOptions[0].textContent : 'Product'}`
            : 'All Report';
        body.innerHTML = `
          <div class="advanced-reporting-grid">
            <div class="advanced-report-card"><span>Report Type</span><strong>${escapeHtml(title)}</strong><small>Simple sales view</small></div>
            <div class="advanced-report-card"><span>Total Orders</span><strong>${Number(report.ordersCount || 0)}</strong><small>Orders containing matched items</small></div>
            <div class="advanced-report-card"><span>Total Revenue</span><strong>AED ${Number(report.totalRevenue || 0).toFixed(2)}</strong><small>${Number(report.totalQty || 0)} item(s) sold</small></div>
          </div>
          <div class="advanced-report-tables">
            <div class="advanced-report-table-wrap">
              <div class="advanced-report-table-title"><h5>${escapeHtml(title)}</h5><small>Quantity sold, revenue, and order count</small></div>
              <div class="advanced-report-table-scroll">
                <table class="advanced-report-table">
                  <thead><tr><th>Product</th><th>Category</th><th>Quantity Sold</th><th>Revenue</th><th>Orders Count</th></tr></thead>
                  <tbody>${report.rows.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.category)}</td><td>${Number(item.qty || 0)}</td><td>AED ${Number(item.revenue || 0).toFixed(2)}</td><td>${Number(item.ordersCount || 0)}</td></tr>`).join('') || '<tr><td colspan="5">No sales found for this report.</td></tr>'}</tbody>
                </table>
              </div>
            </div>
          </div>
        `;
      }

      function getReservationTimestamp(entry) {
        if (!entry) return 0;
        const scheduled = Date.parse(entry.datetime || '');
        if (Number.isFinite(scheduled)) return scheduled;
        return Number(entry.date || 0);
      }

      function getOrderTimestamp(entry) {
        return Number(entry && (entry.date || entry.timeline?.placedAt) || 0);
      }

      function isTimestampInReportRange(timestamp, range) {
        if (!range) return true;
        if (!timestamp) return false;
        if (range.start && timestamp < range.start.getTime()) return false;
        if (range.end && timestamp > range.end.getTime()) return false;
        return true;
      }

      function getDownloadDateRange() {
        const fromInput = document.getElementById('downloadReportFrom');
        const toInput = document.getElementById('downloadReportTo');
        const start = fromInput && fromInput.value ? new Date(fromInput.value) : null;
        const end = toInput && toInput.value ? new Date(toInput.value) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        return { start, end };
      }

      function getReportTypeTitle(type) {
        switch (type) {
          case 'category': return 'Category-Wise Sales Report';
          case 'product': return 'Product-Wise Sales Report';
          case 'reservations': return 'Reservation Report';
          case 'custom': return 'Custom Date Range Sales Report';
          default: return 'All Sales Report';
        }
      }

      function buildReservationReportRows(range = null) {
        return (appState.reservations || [])
          .filter((entry) => isTimestampInReportRange(getReservationTimestamp(entry), range))
          .slice()
          .sort((a, b) => getReservationTimestamp(b) - getReservationTimestamp(a))
          .map((entry) => {
            const scheduled = entry.datetime ? new Date(entry.datetime) : new Date(getReservationTimestamp(entry));
            return {
              'Reservation ID': entry.id || '-',
              'Customer Name': entry.name || '-',
              'Contact Number': entry.phone || '-',
              'Date': Number.isFinite(scheduled.getTime()) ? scheduled.toLocaleDateString() : '-',
              'Time': Number.isFinite(scheduled.getTime()) ? scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
              'Guest Count': Number(entry.guests || entry.guestCount || 0),
              'Reservation Status': entry.status || 'Pending'
            };
          });
      }

      function buildSalesDownloadRows(type = 'all', range = null, selectedValue = '') {
        const rows = [];
        const money = (value) => Number(value || 0).toFixed(2);
        const serviceChargeValue = (order) => Number(order.serviceCharge || order.serviceCharges || order.serviceFee || 0);
        const advanceTaxValue = (order) => Number(order.advanceTax !== undefined ? order.advanceTax : (order.tax || 0));
        const paymentStatusValue = (order) => order.paymentStatus || (order.paymentDetails && order.paymentDetails.status) || (order.paymentMethod === 'cod' ? 'COD Pending' : 'Pending');
        (appState.orders || [])
          .filter((order) => isTimestampInReportRange(getOrderTimestamp(order), range))
          .forEach((order) => {
            const orderDate = new Date(getOrderTimestamp(order) || Date.now());
            const items = Array.isArray(order.items) ? order.items : [];
            const filteredItems = items.filter((entry) => {
              const menuItem = (appState.menuItems || []).find((item) => String(item.id) === String(entry.id));
              const categoryIndex = menuItem ? Number(menuItem.category || 0) : -1;
              if (type === 'category') return String(categoryIndex) === String(selectedValue);
              if (type === 'product') return String(entry.id) === String(selectedValue);
              return true;
            });
            if (!filteredItems.length && (type === 'category' || type === 'product')) return;
            const productsOrdered = filteredItems.map((entry) => {
              const menuItem = (appState.menuItems || []).find((item) => String(item.id) === String(entry.id));
              const productName = entry.productName || (menuItem ? menuItem.name : 'Product');
              const variation = entry.variationName || 'Regular';
              return `${productName} (${variation}) x${Number(entry.qty || 0)}`;
            }).join(' | ') || '-';
            const productTotals = filteredItems.reduce((sum, entry) => sum + Number(entry.lineTotal || (Number(entry.qty || 0) * Number(entry.unitPrice || 0))), 0);
            const dealDiscounts = Array.isArray(order.discountDetails)
              ? order.discountDetails.reduce((sum, detail) => sum + Number(detail.totalSaved || 0), 0)
              : Number(order.discount || 0);
            const subtotal = Number(order.subtotal || productTotals || 0);
            const totalDiscount = Number(order.discount || 0);
            const delivery = Number(order.deliveryFee || order.deliveryCharge || order.deliveryCharges || 0);
            const advanceTax = advanceTaxValue(order);
            const serviceCharge = serviceChargeValue(order);
            const netAmount = Math.max(0, subtotal - totalDiscount + serviceCharge);
            const grandTotal = Number(order.total || (netAmount + delivery + advanceTax));
            rows.push({
              'Order ID': order.id || '-',
              'Customer Name': order.customer?.name || '-',
              'Contact Number': order.customer?.phone || '-',
              'Order Date': Number.isFinite(orderDate.getTime()) ? orderDate.toLocaleDateString() : '-',
              'Order Time': Number.isFinite(orderDate.getTime()) ? orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
              'Products Ordered': productsOrdered,
              'Product Totals': money(productTotals || subtotal),
              'Discounts Applied': money(totalDiscount),
              'Deal Discounts': money(dealDiscounts),
              'Delivery Charges': money(delivery),
              'Advance Tax': money(advanceTax),
              'Service Charges': money(serviceCharge),
              'Net Amount': money(netAmount),
              'Grand Total': money(grandTotal),
              'Payment Status': paymentStatusValue(order),
              'Order Status': order.status || 'Pending'
            });
          });
        return rows;
      }

      function getDownloadReportPayload() {
        const typeSelect = document.getElementById('downloadReportType');
        const type = typeSelect ? typeSelect.value : 'all';
        const categorySelect = document.getElementById('downloadReportCategory');
        const productSelect = document.getElementById('downloadReportProduct');
        const selectedValue = type === 'category'
          ? (categorySelect ? categorySelect.value : '')
          : type === 'product'
            ? (productSelect ? productSelect.value : '')
            : '';
        const range = type === 'custom' ? getDownloadDateRange() : null;
        const rows = type === 'reservations'
          ? buildReservationReportRows(null)
          : buildSalesDownloadRows(type === 'custom' ? 'all' : type, range, selectedValue);
        const title = getReportTypeTitle(type);
        const moneyNumber = (value) => Number(String(value || '0').replace(/[^0-9.-]+/g, '')) || 0;
        const totalQty = rows.reduce((sum, row) => sum + Number(row['Quantity'] || 0), 0);
        const totalRevenue = rows.reduce((sum, row) => sum + moneyNumber(row['Product Totals'] || row['Total Price']), 0);
        const totalDiscounts = rows.reduce((sum, row) => sum + moneyNumber(row['Discounts Applied'] || row['Order Discount']), 0);
        const totalDelivery = rows.reduce((sum, row) => sum + moneyNumber(row['Delivery Charges']), 0);
        const totalAdvanceTax = rows.reduce((sum, row) => sum + moneyNumber(row['Advance Tax'] || row['Tax']), 0);
        const totalServiceCharges = rows.reduce((sum, row) => sum + moneyNumber(row['Service Charges']), 0);
        const netRevenue = rows.reduce((sum, row) => sum + moneyNumber(row['Net Amount']), 0);
        const grandTotal = rows.reduce((sum, row) => sum + moneyNumber(row['Grand Total']), 0);
        const reservationCount = type === 'reservations' ? rows.length : 0;
        return { type, title, rows, totalQty, totalRevenue, totalDiscounts, totalDelivery, totalAdvanceTax, totalServiceCharges, netRevenue, grandTotal, reservationCount, range };
      }

      function updateDownloadReportControls() {
        const type = (document.getElementById('downloadReportType') || {}).value || 'all';
        const categoryField = document.getElementById('downloadCategoryField');
        const productField = document.getElementById('downloadProductField');
        const fromField = document.getElementById('downloadFromField');
        const toField = document.getElementById('downloadToField');
        if (categoryField) categoryField.classList.toggle('is-hidden', type !== 'category');
        if (productField) productField.classList.toggle('is-hidden', type !== 'product');
        if (fromField) fromField.classList.toggle('is-hidden', type !== 'custom');
        if (toField) toField.classList.toggle('is-hidden', type !== 'custom');
        const hint = document.getElementById('downloadReportHint');
        if (hint) {
          hint.textContent = type === 'reservations'
            ? 'Reservation Reports exports reservation ID, customer, contact number, date, time, guest count, and status.'
            : type === 'custom'
              ? 'Custom Date Range exports order item sales between the selected dates with quantity and revenue totals.'
              : 'Sales exports include products, variations, quantities, revenue, discounts, tax, delivery charges, and grand totals.';
        }
      }

      async function exportDownloadReport(format) {
        if (format !== 'csv' && window.AFGRLoadReportLibrary) {
          try { await window.AFGRLoadReportLibrary(format === 'pdf' ? 'pdf' : 'excel'); }
          catch (error) { alert('Report library unavailable. Please try again online.'); return; }
        }
        const payload = getDownloadReportPayload();
        if (!payload.rows.length) {
          alert('No records found for this report filter.');
          return;
        }
        const safeTitle = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'report';
        const dateSlug = new Date().toISOString().slice(0, 10);
        const summaryRows = payload.type === 'reservations'
          ? [{ 'Metric': 'Reservations', 'Value': payload.reservationCount }]
          : [
              { 'Metric': 'Total Orders', 'Value': payload.rows.length },
              { 'Metric': 'Total Sales', 'Value': `AED ${payload.totalRevenue.toFixed(2)}` },
              { 'Metric': 'Total Discounts', 'Value': `AED ${payload.totalDiscounts.toFixed(2)}` },
              { 'Metric': 'Total Delivery Charges', 'Value': `AED ${payload.totalDelivery.toFixed(2)}` },
              { 'Metric': 'Total Advance Tax', 'Value': `AED ${payload.totalAdvanceTax.toFixed(2)}` },
              { 'Metric': 'Total Service Charges', 'Value': `AED ${payload.totalServiceCharges.toFixed(2)}` },
              { 'Metric': 'Net Revenue', 'Value': `AED ${payload.netRevenue.toFixed(2)}` },
              { 'Metric': 'Grand Total', 'Value': `AED ${payload.grandTotal.toFixed(2)}` }
            ];
        if (format === 'pdf') {
          try {
            const { jsPDF } = window.jspdf || {};
            if (!jsPDF) {
              alert('Unable to export PDF: jsPDF library not loaded');
              return;
            }
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const restaurantName = appState.config?.restaurantName || 'Restaurant';
            doc.setFontSize(15);
            doc.text(restaurantName, 12, 12);
            doc.setFontSize(11);
            doc.text(payload.title, 12, 20);
            doc.setFontSize(8);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 12, 26);
            const summaryHead = [['Metric', 'Value']];
            const summaryBody = summaryRows.map((row) => [row.Metric, row.Value]);
            if (doc.autoTable) {
              doc.autoTable({ head: summaryHead, body: summaryBody, startY: 30, styles: { fontSize: 8 }, theme: 'grid' });
              const keys = Object.keys(payload.rows[0]);
              const body = payload.rows.map((row) => keys.map((key) => String(row[key] ?? '')));
              doc.autoTable({ head: [keys], body, startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : 48, styles: { fontSize: 6, cellPadding: 1.4 }, headStyles: { fillColor: [181, 138, 91] }, theme: 'striped' });
            } else {
              doc.text(JSON.stringify(summaryRows), 12, 36);
            }
            doc.save(`${safeTitle}_${dateSlug}.pdf`);
          } catch (error) {
            console.error('Report PDF export failed', error);
            alert('Unable to export PDF: ' + error.message);
          }
          return;
        }
        try {
          if (window.XLSX && XLSX.utils) {
            const workbook = XLSX.utils.book_new();
            const sheet = XLSX.utils.json_to_sheet(payload.rows);
            XLSX.utils.book_append_sheet(workbook, sheet, payload.type === 'reservations' ? 'Reservations' : 'Sales');
            const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
            XLSX.writeFile(workbook, `${safeTitle}_${dateSlug}.xlsx`);
          } else {
            const keys = Object.keys(payload.rows[0]);
            const summaryKeys = ['Metric', 'Value'];
            const csvRows = [
              keys.join(','),
              ...payload.rows.map((row) => keys.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(',')),
              '',
              summaryKeys.join(','),
              ...summaryRows.map((row) => summaryKeys.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(','))
            ];
            const csv = csvRows.join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${safeTitle}_${dateSlug}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
          }
        } catch (error) {
          console.error('Report Excel/CSV export failed', error);
          alert('Unable to export Excel/CSV: ' + error.message);
        }
      }

      function renderReservationReportTable(range) {
        const tbody = document.getElementById('reservationReportRows');
        if (!tbody) return;
        const rows = buildReservationReportRows(range);
        tbody.innerHTML = rows.map((row) => `
          <tr>
            <td>${escapeHtml(row['Reservation ID'])}</td>
            <td>${escapeHtml(row['Customer Name'])}</td>
            <td>${escapeHtml(row['Contact Number'])}</td>
            <td>${escapeHtml(row['Date'])}</td>
            <td>${escapeHtml(row['Time'])}</td>
            <td>${escapeHtml(String(row['Guest Count']))}</td>
            <td>${escapeHtml(row['Reservation Status'])}</td>
          </tr>
        `).join('') || '<tr><td colspan="7">No reservations found for this range.</td></tr>';
      }

      /**
       * Render the dashboard with high level statistics and a simple bar chart.
       * Allows filtering by preset ranges (week, month, year) or custom date range.
       */
      function renderDashboardSection(container) {
        if (!container) return;
        const customerOptionsHtml = (() => {
          const customerMap = new Map();
          (appState.users || []).filter((user) => user.role === 'customer').forEach((user) => customerMap.set(String(user.id), user.displayName || user.name || user.username || user.email || user.phone || 'Customer'));
          (appState.orders || []).forEach((order) => {
            const key = String(order.userId || order.customer?.phone || order.customer?.email || order.customer?.name || order.id || 'customer');
            if (!customerMap.has(key)) customerMap.set(key, order.customer?.name || order.customer?.phone || order.customer?.email || 'Customer');
          });
          return Array.from(customerMap.entries()).map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('') || '<option value="">No customers</option>';
        })();
        container.innerHTML = `
          <h3>Dashboard</h3>
          <div class="enterprise-dashboard-v2">
            <div class="analytics-surface dashboard-filter-surface">
              <div class="dashboard-filter-copy">
                <h4>Business Analytics</h4>
                <p>Filter dashboard cards and charts without browser zooming or overflow.</p>
              </div>
              <div class="analytics-filter-bar dashboard-summary-filter">
                <label>Dashboard Date
                  <select id="dashRangeSelect">
                    <option value="all" selected>All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </label>
                <label id="dashStartWrap" class="dashboard-date-field is-hidden">From Date
                  <input type="date" id="dashStartDate">
                </label>
                <label id="dashEndWrap" class="dashboard-date-field is-hidden">To Date
                  <input type="date" id="dashEndDate">
                </label>
                <button id="dashApplyBtn" class="btn" type="button">Apply</button>
              </div>
            </div>

            <div id="dashboardMetrics" class="analytics-kpi-grid enterprise-summary-grid"></div>

            <!-- v89: Disabled Products widget — quick monitoring of which
                 menu items are deactivated and won't appear on the public
                 site / accept orders. Re-renders whenever the dashboard
                 re-renders. -->
            <div id="disabledProductsWidget" class="analytics-surface disabled-products-widget"></div>

            <div class="analytics-chart-grid enterprise-chart-grid">
              <div class="analytics-surface analytics-chart-card"><h4>Sales Graph</h4><canvas id="salesTrendChart"></canvas></div>
              <div class="analytics-surface analytics-chart-card"><h4>Orders Trend Graph</h4><canvas id="orderTrendChart"></canvas></div>
              <div class="analytics-surface analytics-chart-card"><h4>Reservation Activity Graph</h4><canvas id="reservationTrendChart"></canvas></div>
              <div class="analytics-surface analytics-chart-card"><h4>Top Selling Products Chart</h4><canvas id="productPerformanceChart"></canvas></div>
            </div>

            <div class="analytics-surface unified-reporting-module">
              <div class="unified-report-header-row">
                <div>
                  <h4>Unified Reporting System</h4>
                  <p>Select filters, preview results, then export the exact filtered report.</p>
                </div>
                <div id="unifiedReportExportActions" class="report-export-actions is-hidden">
                  <button id="unifiedReportPdfBtn" class="btn" type="button">Export PDF</button>
                  <button id="unifiedReportExcelBtn" class="btn" type="button">Export Excel</button>
                </div>
              </div>
              <div class="download-report-controls unified-report-controls">
                <label>Report Type
                  <select id="unifiedReportType">
                    <option value="all">All</option>
                    <option value="product">Product Wise</option>
                    <option value="category">Category Wise</option>
                    <option value="order">Order Wise</option>
                    <option value="customer">Customer Wise</option>
                    <option value="reservation">Reservation</option>
                  </select>
                </label>
                <label>Date Range
                  <select id="unifiedReportRange">
                    <option value="all" selected>All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </label>
                <label id="unifiedProductField" class="download-report-field is-hidden">Product
                  <select id="unifiedReportProduct">${getMenuProductOptionsHtml((appState.menuItems || [])[0]?.id || '')}</select>
                </label>
                <label id="unifiedCategoryField" class="download-report-field is-hidden">Category
                  <select id="unifiedReportCategory">${getMenuCategoryOptionsHtml(0)}</select>
                </label>
                <label id="unifiedCustomerField" class="download-report-field is-hidden">Customer
                  <select id="unifiedReportCustomer">${customerOptionsHtml}</select>
                </label>
                <label id="unifiedReservationStatusField" class="download-report-field is-hidden">Reservation Status
                  <select id="unifiedReportReservationStatus">
                    <option value="all">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Approved">Approved</option>
                    <option value="Completed">Completed</option>
                    <option value="Declined">Declined</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </label>
                <label id="unifiedFromField" class="download-report-field is-hidden">From Date
                  <input type="date" id="unifiedReportFrom">
                </label>
                <label id="unifiedToField" class="download-report-field is-hidden">To Date
                  <input type="date" id="unifiedReportTo">
                </label>
                <button id="unifiedReportShowBtn" class="btn" type="button">Show Results</button>
              </div>
              <div id="unifiedReportPlaceholder" class="unified-report-placeholder">Choose a report type and date range, then click <strong>Show Results</strong> to preview the report before exporting.</div>
              <div id="unifiedReportPreview" class="unified-report-preview unified-report-preview-grid is-hidden">
                <div class="advanced-report-table-wrap unified-report-table-wrap">
                  <div class="advanced-report-table-scroll">
                    <table class="advanced-report-table" id="unifiedReportTable"></table>
                  </div>
                </div>
                <aside class="report-summary-panel" id="unifiedReportSummaryPanel"></aside>
              </div>
            </div>

            <div class="analytics-surface dashboard-detail-surface">
              <div class="analytics-orders-header">
                <div>
                  <h4 style="margin-bottom:4px;">Order Monitor</h4>
                  <p>Compact filtered order list synced with the dashboard date selection.</p>
                </div>
                <div class="analytics-search-sort">
                  <input type="search" id="dashOrderSearch" placeholder="Search orders">
                  <select id="dashOrderSort">
                    <option value="recent">Sort: Most Recent</option>
                    <option value="revenue">Sort: Revenue</option>
                    <option value="status">Sort: Status</option>
                    <option value="delivery">Sort: Delivery Time</option>
                  </select>
                </div>
              </div>
              <div class="analytics-table-wrap" style="margin-top:0;">
                <table class="analytics-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Status</th>
                      <th>Revenue</th>
                      <th>Placed</th>
                      <th>Delivered</th>
                      <th>Delivery Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="analyticsOrdersBody"></tbody>
                </table>
              </div>
            </div>
          </div>
        `;
        let salesTrendChart = null;
        let orderTrendChart = null;
        let reservationTrendChart = null;
        let productPerformanceChart = null;
        let currentReportState = { loaded: false, rows: [], summary: null, typeLabel: '', rangeLabel: '' };
        const currency = (value) => `AED ${Number(value || 0).toFixed(2)}`;
        const parseCurrencyNumber = (value) => Number(String(value || '0').replace(/[^0-9.-]+/g, '')) || 0;
        function getDashboardRange() {
          return getDashboardDateRange(
            document.getElementById('dashRangeSelect').value,
            document.getElementById('dashStartDate').value,
            document.getElementById('dashEndDate').value
          );
        }
        function getUnifiedReportRange() {
          return getDashboardDateRange(
            document.getElementById('unifiedReportRange').value,
            document.getElementById('unifiedReportFrom').value,
            document.getElementById('unifiedReportTo').value
          );
        }
        function getDayKey(timestamp) {
          const date = new Date(timestamp || Date.now());
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }
        function buildSeriesMap(items, getTimestamp, valueGetter) {
          const map = {};
          items.forEach((item) => {
            const key = getDayKey(getTimestamp(item));
            if (!map[key]) map[key] = 0;
            map[key] += valueGetter(item);
          });
          return map;
        }
        function destroyCharts() {
          [salesTrendChart, orderTrendChart, reservationTrendChart, productPerformanceChart].forEach((chart) => chart && chart.destroy && chart.destroy());
          salesTrendChart = null;
          orderTrendChart = null;
          reservationTrendChart = null;
          productPerformanceChart = null;
        }
        function getActiveDealsCount() {
          const now = Date.now();
          return (appState.offers || []).filter((offer) => {
            if (offer.active === false || offer.enabled === false) return false;
            const start = offer.startDate || offer.start ? Date.parse(offer.startDate || offer.start) : null;
            const end = offer.endDate || offer.end ? Date.parse(offer.endDate || offer.end) : null;
            if (start && now < start) return false;
            if (end && now > end + 86400000) return false;
            return true;
          }).length;
        }
        function renderSummaryCards(analytics) {
          const pendingOrders = analytics.orders.filter((order) => String(order.status || 'Pending') === 'Pending').length;
          const totalCustomers = new Set(analytics.orders.map((order) => order.userId || order.customer?.phone || order.customer?.email || order.customer?.name).filter(Boolean)).size || analytics.totalCustomers;
          const cards = [
            { title: 'Total Orders', value: analytics.orders.length, icon: 'fa-receipt', trend: 'Filtered order count' },
            { title: 'Total Reservations', value: analytics.reservations.length, icon: 'fa-calendar-check', trend: 'Filtered bookings' },
            { title: 'Total Sales', value: currency(analytics.totalRevenue), icon: 'fa-sack-dollar', trend: 'Filtered revenue' },
            { title: 'Pending Orders', value: pendingOrders, icon: 'fa-hourglass-half', trend: 'Need action' },
            { title: 'Active Deals/Offers', value: getActiveDealsCount(), icon: 'fa-tags', trend: 'Currently active' },
            { title: 'Total Customers', value: totalCustomers, icon: 'fa-users', trend: 'Customers in scope' }
          ];
          document.getElementById('dashboardMetrics').innerHTML = cards.map((card) => `
            <article class="analytics-kpi-card enterprise-summary-card">
              <div class="analytics-kpi-icon"><i class="fa-solid ${card.icon}" aria-hidden="true"></i></div>
              <div class="analytics-kpi-copy">
                <h4>${escapeHtml(card.title)}</h4>
                <div class="value">${escapeHtml(String(card.value))}</div>
                <div class="meta">${escapeHtml(card.trend)}</div>
              </div>
            </article>
          `).join('');
          // v89: Disabled Products widget. Lists all menu items where
          // mi.enabled === false so admin can monitor pause status at a
          // glance. Renders once per dashboard refresh (every metric
          // recalc). Empty-state shows a friendly "all active" message.
          const dpWidget = document.getElementById('disabledProductsWidget');
          if (dpWidget) {
            const disabledList = (appState.menuItems || []).filter(function (mi) {
              return mi && mi.enabled === false;
            });
            if (disabledList.length === 0) {
              dpWidget.innerHTML =
                '<div class="disabled-products-head">' +
                  '<h4><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Disabled Products</h4>' +
                  '<span class="disabled-products-count is-empty">0</span>' +
                '</div>' +
                '<p class="disabled-products-empty">All products are currently active. Disabled items will appear here.</p>';
            } else {
              const itemsHtml = disabledList.map(function (mi) {
                const catName = (appState.categories[mi.category] || {}).name || 'Uncategorized';
                return '<li><span class="dp-name">' + escapeHtml(mi.name || 'Unnamed product') +
                       '</span><span class="dp-category">' + escapeHtml(catName) + '</span></li>';
              }).join('');
              dpWidget.innerHTML =
                '<div class="disabled-products-head">' +
                  '<h4><i class="fa-solid fa-circle-pause" aria-hidden="true"></i> Disabled Products</h4>' +
                  '<span class="disabled-products-count">' + disabledList.length + '</span>' +
                '</div>' +
                '<p class="disabled-products-sub">You currently have these disabled products:</p>' +
                '<ul class="disabled-products-list">' + itemsHtml + '</ul>';
            }
          }
        }
        function renderCharts(analytics) {
          destroyCharts();
          if (!window.Chart) {
            if (window.AFGRLoadReportLibrary) window.AFGRLoadReportLibrary('chart').then(function () {
              if (document.getElementById('salesTrendChart')) renderCharts(analytics);
            }).catch(function (error) { console.warn('[AFGR] Chart library is unavailable',error); });
            return;
          }
          const orderRevenueMap = buildSeriesMap(analytics.orders, getOrderTimestamp, (order) => Number(order.total || 0));
          const orderCountMap = buildSeriesMap(analytics.orders, getOrderTimestamp, () => 1);
          const reservationMap = buildSeriesMap(analytics.reservations, getReservationTimestamp, () => 1);
          const labels = Array.from(new Set([...Object.keys(orderRevenueMap), ...Object.keys(orderCountMap), ...Object.keys(reservationMap)])).sort();
          const safeLabels = labels.length ? labels : ['No Data'];
          const revenueSeries = safeLabels.map((key) => Number(orderRevenueMap[key] || 0).toFixed(2));
          const orderSeries = safeLabels.map((key) => orderCountMap[key] || 0);
          const reservationSeries = safeLabels.map((key) => reservationMap[key] || 0);
          const chartText = { color: '#385943', font: { size: 11, weight: '600' }, boxWidth: 10, padding: 8 };
          const axis = { ticks: { color: '#536f5f', maxTicksLimit: 5, font: { size: 11 } }, grid: { color: 'rgba(33,76,53,.12)' } };
          const commonOptions = { responsive: true, maintainAspectRatio: false, resizeDelay: 80, plugins: { legend: { labels: chartText } }, scales: { x: axis, y: { ...axis, beginAtZero: true } } };
          salesTrendChart = new Chart(document.getElementById('salesTrendChart'), {
            type: 'line',
            data: { labels: safeLabels, datasets: [{ label: 'Sales', data: revenueSeries, borderColor: 'rgba(212,177,126,1)', backgroundColor: 'rgba(212,177,126,.16)', fill: true, tension: .35, pointRadius: 2 }] },
            options: commonOptions
          });
          orderTrendChart = new Chart(document.getElementById('orderTrendChart'), {
            type: 'bar',
            data: { labels: safeLabels, datasets: [{ label: 'Orders', data: orderSeries, borderRadius: 8, backgroundColor: 'rgba(181,138,91,.84)' }] },
            options: commonOptions
          });
          reservationTrendChart = new Chart(document.getElementById('reservationTrendChart'), {
            type: 'line',
            data: { labels: safeLabels, datasets: [{ label: 'Reservations', data: reservationSeries, borderColor: 'rgba(98,190,255,1)', backgroundColor: 'rgba(98,190,255,.14)', fill: true, tension: .32, pointRadius: 2 }] },
            options: commonOptions
          });
          const topProducts = analytics.bestProducts.slice(0, 5);
          productPerformanceChart = new Chart(document.getElementById('productPerformanceChart'), {
            type: 'doughnut',
            data: {
              labels: topProducts.length ? topProducts.map((item) => String(item.name || 'Product').length > 22 ? `${String(item.name).slice(0, 19)}...` : String(item.name || 'Product')) : ['No Sales'],
              datasets: [{ data: topProducts.length ? topProducts.map((item) => item.qty) : [1], backgroundColor: ['#d4b17e', '#62beff', '#72d6a8', '#ff9a62', '#ff6b57'], borderWidth: 0 }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              resizeDelay: 80,
              cutout: '62%',
              layout: { padding: 2 },
              plugins: { legend: { position: 'bottom', labels: chartText } }
            }
          });
        }
        function renderOrderMonitor(analytics) {
          const search = (document.getElementById('dashOrderSearch')?.value || '').toLowerCase().trim();
          const sort = document.getElementById('dashOrderSort')?.value || 'recent';
          let orderRows = analytics.orders.slice();
          if (search) {
            orderRows = orderRows.filter((order) =>
              String(order.id || '').toLowerCase().includes(search) ||
              String(order.customer?.name || '').toLowerCase().includes(search) ||
              String(order.customer?.phone || '').toLowerCase().includes(search) ||
              String(order.status || '').toLowerCase().includes(search)
            );
          }
          orderRows.sort((a, b) => {
            if (sort === 'revenue') return Number(b.total || 0) - Number(a.total || 0);
            if (sort === 'status') return String(a.status || '').localeCompare(String(b.status || ''));
            if (sort === 'delivery') return (getOrderDurationMinutes(b, 'placedAt', 'deliveredAt') || -1) - (getOrderDurationMinutes(a, 'placedAt', 'deliveredAt') || -1);
            return Number(getOrderTimestamp(b) || 0) - Number(getOrderTimestamp(a) || 0);
          });
          document.getElementById('analyticsOrdersBody').innerHTML = orderRows.slice(0, 80).map((order) => {
            ensureOrderTimeline(order);
            return `
              <tr>
                <td><div class="dashboard-order-cell"><strong>${escapeHtml(order.id || '')}</strong><span>${escapeHtml(order.customer?.name || 'Customer')}</span><span class="dashboard-order-meta">${escapeHtml(order.customer?.phone || '')}</span></div></td>
                <td>${renderOrderStatusPill(order.status || 'Pending')}</td>
                <td>${currency(order.total)}</td>
                <td>${order.timeline.placedAt ? new Date(order.timeline.placedAt).toLocaleString() : '-'}</td>
                <td>${order.timeline.deliveredAt ? new Date(order.timeline.deliveredAt).toLocaleString() : '-'}</td>
                <td>${formatMinutesLabel(getOrderDurationMinutes(order, 'placedAt', 'deliveredAt'))}</td>
                <td><div class="dashboard-order-actions"><button type="button" class="dashboard-action-btn" onclick="openOrderDetailsModal(appState.orders.find((entry) => entry.id === '${String(order.id).replace(/'/g, "\\'")}'))"><i class="fa-solid fa-eye" aria-hidden="true"></i><span>View</span></button></div></td>
              </tr>
            `;
          }).join('') || '<tr><td colspan="7">No orders match this filter.</td></tr>';
        }
        function getFilteredOrders(range) {
          return (appState.orders || []).filter((order) => isTimestampInReportRange(getOrderTimestamp(order), range));
        }
        function getFilteredReservations(range) {
          return (appState.reservations || []).filter((entry) => isTimestampInReportRange(getReservationTimestamp(entry), range));
        }
        function getReportBillHelpers() {
          const money = (value) => Number(value || 0).toFixed(2);
          const serviceChargeValue = (order) => Number(order.serviceCharge || order.serviceCharges || order.serviceFee || 0);
          const advanceTaxValue = (order) => Number(order.advanceTax !== undefined ? order.advanceTax : (order.tax || 0));
          const paymentStatusValue = (order) => order.paymentStatus || (order.paymentDetails && order.paymentDetails.status) || (order.paymentMethod === 'cod' ? 'COD Pending' : 'Pending');
          const dealDiscountValue = (order) => Array.isArray(order.discountDetails)
            ? order.discountDetails.reduce((sum, detail) => sum + Number(detail.totalSaved || 0), 0)
            : Number(order.discount || 0);
          const itemTotal = (entry) => Number(entry.lineTotal || (Number(entry.qty || 0) * Number(entry.unitPrice || 0)) || 0);
          const productLabel = (entry) => {
            const menuItem = (appState.menuItems || []).find((item) => String(item.id) === String(entry.id));
            const productName = entry.productName || (menuItem ? menuItem.name : 'Product');
            const variation = entry.variationName || 'Regular';
            return `${productName} (${variation}) x${Number(entry.qty || 0)}`;
          };
          const categoryIndex = (entry) => {
            const menuItem = (appState.menuItems || []).find((item) => String(item.id) === String(entry.id));
            return menuItem ? Number(menuItem.category || 0) : -1;
          };
          const billRow = (order, filteredItems = null) => {
            const orderDate = new Date(getOrderTimestamp(order) || Date.now());
            const items = Array.isArray(filteredItems) ? filteredItems : (Array.isArray(order.items) ? order.items : []);
            const allItems = Array.isArray(order.items) ? order.items : [];
            const selectedProductTotals = items.reduce((sum, entry) => sum + itemTotal(entry), 0);
            const subtotal = Number(order.subtotal || allItems.reduce((sum, entry) => sum + itemTotal(entry), 0) || selectedProductTotals || 0);
            const discount = Number(order.discount || 0);
            const dealDiscount = dealDiscountValue(order);
            const delivery = Number(order.deliveryFee || order.deliveryCharge || order.deliveryCharges || 0);
            const advanceTax = advanceTaxValue(order);
            const serviceCharge = serviceChargeValue(order);
            const netAmount = Math.max(0, subtotal - discount + serviceCharge);
            const grandTotal = Number(order.total || (netAmount + delivery + advanceTax));
            return {
              'Order ID': order.id || '-',
              'Customer Name': order.customer?.name || '-',
              'Contact Number': order.customer?.phone || '-',
              'Order Date & Time': Number.isFinite(orderDate.getTime()) ? orderDate.toLocaleString() : '-',
              'Products Ordered': items.map(productLabel).join(' | ') || '-',
              'Product Totals': currency(selectedProductTotals || subtotal),
              'Discounts Applied': currency(discount),
              'Deal Discounts': currency(dealDiscount),
              'Delivery Charges': currency(delivery),
              'Advance Tax': currency(advanceTax),
              'Service Charges': currency(serviceCharge),
              'Net Amount': currency(netAmount),
              'Grand Total': currency(grandTotal),
              'Payment Status': paymentStatusValue(order),
              'Order Status': order.status || 'Pending'
            };
          };
          return { itemTotal, categoryIndex, billRow, serviceChargeValue, advanceTaxValue, dealDiscountValue };
        }
        function getReportDataset() {
          const type = document.getElementById('unifiedReportType').value;
          const range = getUnifiedReportRange();
          const productId = document.getElementById('unifiedReportProduct').value;
          const categoryId = document.getElementById('unifiedReportCategory').value;
          const customerId = document.getElementById('unifiedReportCustomer').value;
          const reservationStatus = document.getElementById('unifiedReportReservationStatus').value;
          const allOrders = getFilteredOrders(range);
          const allReservations = getFilteredReservations(range);
          const helpers = getReportBillHelpers();
          let rows = [];
          let ordersForSummary = allOrders.slice();
          let reservationsForSummary = allReservations.slice();
          if (type === 'reservation') {
            rows = buildReservationReportRows(range).filter((row) => reservationStatus === 'all' || row['Reservation Status'] === reservationStatus);
            reservationsForSummary = allReservations.filter((entry) => reservationStatus === 'all' || String(entry.status || 'Pending') === reservationStatus);
            ordersForSummary = [];
          } else if (type === 'customer') {
            ordersForSummary = [];
            rows = allOrders.filter((order) => {
              const key = String(order.userId || order.customer?.phone || order.customer?.email || order.customer?.name || 'Guest');
              return !customerId || key === String(customerId);
            }).map((order) => {
              ordersForSummary.push(order);
              return helpers.billRow(order);
            });
          } else if (type === 'product' || type === 'category') {
            ordersForSummary = [];
            rows = allOrders.map((order) => {
              const filteredItems = (order.items || []).filter((entry) => {
                if (type === 'product') return String(entry.id) === String(productId);
                return String(helpers.categoryIndex(entry)) === String(categoryId);
              });
              if (!filteredItems.length) return null;
              ordersForSummary.push(order);
              return helpers.billRow(order, filteredItems);
            }).filter(Boolean);
          } else {
            rows = allOrders.map((order) => helpers.billRow(order));
          }
          return { rows, ordersForSummary, reservationsForSummary, type, range };
        }
        function buildReportSummary(dataset) {
          const helpers = getReportBillHelpers();
          const productQtyFromOrders = dataset.ordersForSummary.reduce((sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0), 0);
          const totalOrders = dataset.ordersForSummary.length;
          const totalReservations = dataset.reservationsForSummary.length;
          const totalProductsSold = productQtyFromOrders || dataset.rows.reduce((sum, row) => sum + Number(row.Qty || row.Quantity || row.Items || 0), 0);
          const totalSales = dataset.ordersForSummary.reduce((sum, order) => sum + Number(order.subtotal || 0), 0);
          const totalDiscounts = dataset.ordersForSummary.reduce((sum, order) => sum + Number(order.discount || 0), 0);
          const totalDeliveryCharges = dataset.ordersForSummary.reduce((sum, order) => sum + Number(order.deliveryFee || order.deliveryCharge || order.deliveryCharges || 0), 0);
          const totalAdvanceTax = dataset.ordersForSummary.reduce((sum, order) => sum + helpers.advanceTaxValue(order), 0);
          const totalServiceCharges = dataset.ordersForSummary.reduce((sum, order) => sum + helpers.serviceChargeValue(order), 0);
          const grandTotal = dataset.ordersForSummary.length
            ? dataset.ordersForSummary.reduce((sum, order) => sum + Number(order.total || 0), 0)
            : dataset.rows.reduce((sum, row) => sum + parseCurrencyNumber(row['Grand Total'] || row.Revenue || row['Total Price']), 0);
          const netRevenue = Math.max(0, totalSales - totalDiscounts + totalServiceCharges);
          return {
            totalOrders,
            totalReservations,
            totalProductsSold,
            totalSales,
            totalDiscounts,
            totalDeliveryCharges,
            totalAdvanceTax,
            totalServiceCharges,
            netRevenue,
            grandTotal,
            totalDiscount: totalDiscounts,
            tax: totalAdvanceTax,
            delivery: totalDeliveryCharges,
            netSales: netRevenue
          };
        }
        function renderReportSummaryPanel(summary) {
          return `
            <h5>Report Summary</h5>
            <div class="report-summary-list">
              <div class="report-summary-line"><span>Total Orders</span><strong>${summary.totalOrders}</strong></div>
              <div class="report-summary-line"><span>Total Sales</span><strong>${currency(summary.totalSales)}</strong></div>
              <div class="report-summary-line"><span>Total Reservations</span><strong>${summary.totalReservations}</strong></div>
              <div class="report-summary-line"><span>Total Products Sold</span><strong>${summary.totalProductsSold}</strong></div>
              <div class="report-summary-line"><span>Total Discounts</span><strong>${currency(summary.totalDiscounts)}</strong></div>
              <div class="report-summary-line"><span>Total Delivery Charges</span><strong>${currency(summary.totalDeliveryCharges)}</strong></div>
              <div class="report-summary-line"><span>Total Advance Tax</span><strong>${currency(summary.totalAdvanceTax)}</strong></div>
              <div class="report-summary-line"><span>Total Service Charges</span><strong>${currency(summary.totalServiceCharges)}</strong></div>
              <div class="report-summary-line"><span>Net Revenue</span><strong>${currency(summary.netRevenue)}</strong></div>
              <div class="report-summary-line is-total"><span>Grand Total</span><strong>${currency(summary.grandTotal)}</strong></div>
            </div>
          `;
        }
        function renderUnifiedReportPreview() {
          const dataset = getReportDataset();
          const rows = dataset.rows;
          const summary = buildReportSummary(dataset);
          const table = document.getElementById('unifiedReportTable');
          const summaryPanel = document.getElementById('unifiedReportSummaryPanel');
          const preview = document.getElementById('unifiedReportPreview');
          const placeholder = document.getElementById('unifiedReportPlaceholder');
          const exportActions = document.getElementById('unifiedReportExportActions');
          const keys = rows[0] ? Object.keys(rows[0]) : ['Report'];
          table.innerHTML = rows.length
            ? `<thead><tr>${keys.map((key) => `<th>${escapeHtml(key)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, 180).map((row) => `<tr>${keys.map((key) => `<td class="${key === 'Products Ordered' ? 'bill-products-cell' : ''}">${escapeHtml(String(row[key] ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody>`
            : '<tbody><tr><td>No records found for this report filter.</td></tr></tbody>';
          summaryPanel.innerHTML = renderReportSummaryPanel(summary);
          preview.classList.remove('is-hidden');
          placeholder.classList.add('is-hidden');
          exportActions.classList.toggle('is-hidden', rows.length === 0);
          currentReportState = {
            loaded: true,
            rows,
            summary,
            typeLabel: document.getElementById('unifiedReportType').selectedOptions[0].textContent,
            rangeLabel: document.getElementById('unifiedReportRange').selectedOptions[0].textContent
          };
        }
        function resetUnifiedReportPreview() {
          currentReportState = { loaded: false, rows: [], summary: null, typeLabel: '', rangeLabel: '' };
          const preview = document.getElementById('unifiedReportPreview');
          const placeholder = document.getElementById('unifiedReportPlaceholder');
          const exportActions = document.getElementById('unifiedReportExportActions');
          if (preview) preview.classList.add('is-hidden');
          if (placeholder) {
            placeholder.classList.remove('is-hidden');
            placeholder.innerHTML = 'Filters changed. Click <strong>Show Results</strong> to preview the updated report.';
          }
          if (exportActions) exportActions.classList.add('is-hidden');
        }
        function updateUnifiedReportControls() {
          const type = document.getElementById('unifiedReportType').value;
          const rangeType = document.getElementById('unifiedReportRange').value;
          document.getElementById('unifiedProductField').classList.toggle('is-hidden', type !== 'product');
          document.getElementById('unifiedCategoryField').classList.toggle('is-hidden', type !== 'category');
          document.getElementById('unifiedCustomerField').classList.toggle('is-hidden', type !== 'customer');
          document.getElementById('unifiedReservationStatusField').classList.toggle('is-hidden', type !== 'reservation');
          document.getElementById('unifiedFromField').classList.toggle('is-hidden', rangeType !== 'custom');
          document.getElementById('unifiedToField').classList.toggle('is-hidden', rangeType !== 'custom');
          resetUnifiedReportPreview();
        }
        function getSummaryRows(summary) {
          return [
            { Metric: 'Total Orders', Value: summary.totalOrders },
            { Metric: 'Total Sales', Value: currency(summary.totalSales) },
            { Metric: 'Total Reservations', Value: summary.totalReservations },
            { Metric: 'Total Products Sold', Value: summary.totalProductsSold },
            { Metric: 'Total Discounts', Value: currency(summary.totalDiscounts) },
            { Metric: 'Total Delivery Charges', Value: currency(summary.totalDeliveryCharges) },
            { Metric: 'Total Advance Tax', Value: currency(summary.totalAdvanceTax) },
            { Metric: 'Total Service Charges', Value: currency(summary.totalServiceCharges) },
            { Metric: 'Net Revenue', Value: currency(summary.netRevenue) },
            { Metric: 'Grand Total', Value: currency(summary.grandTotal) }
          ];
        }
        async function exportUnifiedReport(format) {
          if (window.AFGRLoadReportLibrary) {
            try { await window.AFGRLoadReportLibrary(format === 'pdf' ? 'pdf' : 'excel'); }
            catch (error) { alert('Export library unavailable. Please try again online.'); return; }
          }
          if (!currentReportState.loaded) {
            alert('Click Show Results before exporting.');
            return;
          }
          const rows = currentReportState.rows || [];
          const summary = currentReportState.summary || buildReportSummary(getReportDataset());
          if (!rows.length) { alert('No records found for this report filter.'); return; }
          const typeLabel = currentReportState.typeLabel || document.getElementById('unifiedReportType').selectedOptions[0].textContent;
          const rangeLabel = currentReportState.rangeLabel || document.getElementById('unifiedReportRange').selectedOptions[0].textContent;
          const safeTitle = `${typeLabel}_${rangeLabel}`.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'report';
          const dateSlug = new Date().toISOString().slice(0, 10);
          const summaryRows = getSummaryRows(summary);
          if (format === 'pdf') {
            const { jsPDF } = window.jspdf || {};
            if (!jsPDF) { alert('Unable to export PDF: jsPDF library not loaded'); return; }
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            doc.setFontSize(15); doc.text(appState.config?.restaurantName || 'Restaurant', 12, 12);
            doc.setFontSize(10); doc.text(`${typeLabel} Report - ${rangeLabel}`, 12, 19);
            doc.setFontSize(8); doc.text(`Generated: ${new Date().toLocaleString()}`, 12, 25);
            const keys = Object.keys(rows[0]);
            if (doc.autoTable) {
              doc.autoTable({ head: [keys], body: rows.map((row) => keys.map((key) => String(row[key] ?? ''))), startY: 30, styles: { fontSize: 6.5, cellPadding: 1.4, overflow: 'linebreak' }, headStyles: { fillColor: [181, 138, 91], textColor: [20, 15, 10] }, theme: 'striped', margin: { left: 10, right: 10 } });
              const finalY = Math.min((doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : 34) + 8, 185);
              if (finalY > 172) doc.addPage();
              const startY = finalY > 172 ? 15 : finalY;
              doc.setFontSize(11);
              doc.text('Report Summary', 12, startY);
              doc.autoTable({ head: [['Metric', 'Value']], body: summaryRows.map((row) => [row.Metric, String(row.Value)]), startY: startY + 4, styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [181, 138, 91], textColor: [20, 15, 10] }, theme: 'grid', margin: { left: 12, right: 190 } });
            } else {
              doc.text(JSON.stringify(rows.slice(0, 8)), 12, 34);
              doc.text('Summary: ' + JSON.stringify(summaryRows), 12, 120);
            }
            doc.save(`${safeTitle}_${dateSlug}.pdf`);
            return;
          }
          if (window.XLSX && XLSX.utils) {
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Report');
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
            XLSX.writeFile(workbook, `${safeTitle}_${dateSlug}.xlsx`);
          } else {
            const keys = Object.keys(rows[0]);
            const csvRows = [keys.join(','), ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(',')), '', 'Report Summary', 'Metric,Value', ...summaryRows.map((row) => `"${row.Metric}","${String(row.Value).replace(/"/g, '""')}"`)];
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${safeTitle}_${dateSlug}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
          }
        }
        function updateDashboard() {
          const range = getDashboardRange();
          const analytics = collectAnalytics(range);
          renderSummaryCards(analytics);
          renderCharts(analytics);
          renderOrderMonitor(analytics);
        }
        document.getElementById('dashRangeSelect').onchange = function () {
          const isCustom = this.value === 'custom';
          document.getElementById('dashStartWrap').classList.toggle('is-hidden', !isCustom);
          document.getElementById('dashEndWrap').classList.toggle('is-hidden', !isCustom);
          if (!isCustom) updateDashboard();
        };
        document.getElementById('dashApplyBtn').onclick = updateDashboard;
        document.getElementById('dashOrderSearch').oninput = updateDashboard;
        document.getElementById('dashOrderSort').onchange = updateDashboard;
        ['unifiedReportType', 'unifiedReportRange', 'unifiedReportProduct', 'unifiedReportCategory', 'unifiedReportCustomer', 'unifiedReportReservationStatus', 'unifiedReportFrom', 'unifiedReportTo'].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.onchange = updateUnifiedReportControls;
        });
        document.getElementById('unifiedReportShowBtn').onclick = renderUnifiedReportPreview;
        document.getElementById('unifiedReportPdfBtn').onclick = () => exportUnifiedReport('pdf');
        document.getElementById('unifiedReportExcelBtn').onclick = () => exportUnifiedReport('excel');
        updateUnifiedReportControls();
        updateDashboard();
      }

      /**
       * Export the current dashboard metrics to a PDF file.  This uses the jsPDF library,
       * which must be loaded separately.  If the library is unavailable, the function
       * will not attempt to export.
       */
      async function exportDashboardToPdf(reportTitle = 'Analytics Report') {
        if (window.AFGRLoadReportLibrary) {
          try { await window.AFGRLoadReportLibrary('pdf'); }
          catch (error) { alert('PDF library unavailable. Please try again online.'); return; }
        }
        try {
          const { jsPDF } = window.jspdf || {};
          if (!jsPDF) {
            alert('Unable to export PDF: jsPDF library not loaded');
            return;
          }
          const doc = new jsPDF({ unit: 'mm', format: 'a4' });
          const restName = (appState && appState.config && appState.config.restaurantName) || 'Restaurant';
          const contact = (appState && appState.config && appState.config.contact) || {};
          let accentHex = '#d4b17e';
          if (appState && appState.config && appState.config.themeColors && appState.config.themeColors.accent) {
            accentHex = appState.config.themeColors.accent;
          }
          function darkenHex(hex, factor) {
            const cleaned = String(hex || '').replace('#', '');
            const safe = cleaned.length === 6 ? cleaned : 'd4b17e';
            const bigint = parseInt(safe, 16);
            const r = Math.max(0, Math.min(255, Math.round(((bigint >> 16) & 255) * factor)));
            const g = Math.max(0, Math.min(255, Math.round(((bigint >> 8) & 255) * factor)));
            const b = Math.max(0, Math.min(255, Math.round((bigint & 255) * factor)));
            return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
          }
          function hexToRgb(hex) {
            const cleaned = hex.replace('#', '');
            const bigint = parseInt(cleaned, 16);
            const r = (bigint >> 16) & 255;
            const g = (bigint >> 8) & 255;
            const b = bigint & 255;
            return [r, g, b];
          }
          const reportAccentHex = darkenHex(accentHex, 0.76);
          const [ar, ag, ab] = hexToRgb(reportAccentHex);
          const rangeKey = document.getElementById('dashRangeSelect') ? document.getElementById('dashRangeSelect').value : 'week';
          const range = getDashboardDateRange(
            rangeKey,
            document.getElementById('dashStartDate') ? document.getElementById('dashStartDate').value : '',
            document.getElementById('dashEndDate') ? document.getElementById('dashEndDate').value : ''
          );
          const analytics = collectAnalytics(range);
          const rangeLabel = document.getElementById('dashRangeSelect')
            ? document.getElementById('dashRangeSelect').selectedOptions[0].textContent
            : 'Selected Range';
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = 10;
          const contentWidth = pageWidth - (margin * 2);
          const bottomMargin = 12;
          const textColor = [34, 29, 24];
          const mutedColor = [102, 93, 84];
          const lineColor = [214, 198, 170];
          const panelFill = [252, 249, 244];
          const summaryFill = [248, 242, 232];
          let y = 12;
          const sortedOrders = analytics.orders.slice().sort((a, b) => Number(b.date || b.timeline?.placedAt || 0) - Number(a.date || a.timeline?.placedAt || 0));
          const totalTaxCollected = sortedOrders.reduce((sum, order) => sum + Number(order.tax || 0), 0);
          const totalDiscountsGiven = sortedOrders.reduce((sum, order) => sum + Number(order.discount || 0), 0);
          const netSales = analytics.totalRevenue - totalTaxCollected;
          const logoEl = document.getElementById('site-logo');
          const logoSource = appState && appState.config && appState.config.logo ? appState.config.logo : (logoEl ? logoEl.src : '');
          const generatedAt = new Date();
          const reportDateLabel = generatedAt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

          function ensureSpace(heightNeeded) {
            if (y + heightNeeded <= pageHeight - bottomMargin) return;
            doc.addPage();
            y = 12;
            drawPageHeader(true);
          }
          function formatDateTime(value, compact) {
            if (!value) return compact ? 'N/A' : 'Pending';
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) return compact ? 'N/A' : 'Pending';
            if (compact) {
              return parsed.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
            }
            return parsed.toLocaleString();
          }
          function writeWrappedLine(text, x, maxWidth, options = {}) {
            const lines = doc.splitTextToSize(String(text || ''), maxWidth);
            const fontSize = options.fontSize || 9;
            const lineHeight = options.lineHeight || 4.1;
            ensureSpace(lines.length * lineHeight + 2);
            doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
            doc.setFontSize(fontSize);
            doc.setTextColor(...(options.color || textColor));
            doc.text(lines, x, y);
            y += lines.length * lineHeight;
          }
          function drawDivider(spacingTop = 1.8, spacingBottom = 2.6) {
            y += spacingTop;
            ensureSpace(2);
            doc.setDrawColor(...lineColor);
            doc.setLineWidth(0.3);
            doc.line(margin, y, pageWidth - margin, y);
            y += spacingBottom;
          }
          function formatInlineValue(value, fallback = 'Not provided') {
            const text = String(value === undefined || value === null ? '' : value).trim();
            return text || fallback;
          }
          function getOrderItemSummary(order) {
            const orderItems = Array.isArray(order.items) ? order.items : [];
            return orderItems.map((it) => {
              const item = appState.menuItems.find((mi) => mi.id === it.id);
              const itemName = it.productName || (item ? item.name : 'Item');
              return `${itemName}${it.variationName ? ` - ${it.variationName}` : ''} x${Number(it.qty || 0)}`;
            }).join(', ') || 'No items';
          }
          function getDiscountSummary(order) {
            const discountDetails = Array.isArray(order.discountDetails)
              ? order.discountDetails.filter((detail) => Number(detail.totalSaved || 0) > 0 || (detail.labels || []).length)
              : [];
            const labels = [];
            discountDetails.forEach((detail) => {
              if (Array.isArray(detail.labels) && detail.labels.length) {
                detail.labels.forEach((label) => {
                  const cleaned = String(label || '').trim();
                  if (cleaned && !labels.includes(cleaned)) labels.push(cleaned);
                });
              } else if (detail.name) {
                const cleaned = String(detail.name || '').trim();
                if (cleaned && !labels.includes(cleaned)) labels.push(cleaned);
              }
            });
            if (!labels.length && Number(order.discount || 0) > 0) {
              labels.push('Order Discount');
            }
            return labels.length ? labels.join(' + ') : 'No discounts applied';
          }
          function writeSplitRow(leftLabel, leftValue, rightLabel, rightValue) {
            const leftX = margin;
            const rightX = margin + (contentWidth / 2) + 2;
            const columnWidth = (contentWidth / 2) - 2;
            const leftLabelText = `${leftLabel}: `;
            const rightLabelText = `${rightLabel}: `;
            const leftValueText = formatInlineValue(leftValue);
            const rightValueText = formatInlineValue(rightValue);
            const leftLines = doc.splitTextToSize(`${leftLabelText}${leftValueText}`, columnWidth);
            const rightLines = doc.splitTextToSize(`${rightLabelText}${rightValueText}`, columnWidth);
            const rowHeight = Math.max(leftLines.length, rightLines.length) * 4 + 0.4;
            ensureSpace(rowHeight + 1);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.8);
            doc.setTextColor(ar, ag, ab);
            doc.text(leftLabelText, leftX, y);
            const leftLabelWidth = doc.getTextWidth(leftLabelText);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...textColor);
            doc.text(doc.splitTextToSize(leftValueText, columnWidth - leftLabelWidth), leftX + leftLabelWidth, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(ar, ag, ab);
            doc.text(rightLabelText, rightX, y);
            const rightLabelWidth = doc.getTextWidth(rightLabelText);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...textColor);
            doc.text(doc.splitTextToSize(rightValueText, columnWidth - rightLabelWidth), rightX + rightLabelWidth, y);
            y += rowHeight;
          }
          function writeFullRow(label, value, options = {}) {
            const labelText = `${label}: `;
            const usableWidth = contentWidth - (options.indent || 0);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(options.fontSize || 8.8);
            doc.setTextColor(ar, ag, ab);
            const labelWidth = doc.getTextWidth(labelText);
            const valueLines = doc.splitTextToSize(formatInlineValue(value, options.fallback || '-'), usableWidth - labelWidth);
            const lineHeight = options.lineHeight || 4;
            ensureSpace((valueLines.length * lineHeight) + 1);
            doc.text(labelText, margin + (options.indent || 0), y);
            doc.setFont('helvetica', options.valueBold ? 'bold' : 'normal');
            doc.setTextColor(...(options.valueColor || textColor));
            doc.text(valueLines, margin + (options.indent || 0) + labelWidth, y);
            y += valueLines.length * lineHeight;
          }
          function drawLogo(x, topY, size) {
            if (!logoSource || !logoEl || !logoEl.complete || !logoEl.naturalWidth) return;
            try {
              doc.setDrawColor(ar, ag, ab);
              doc.setLineWidth(0.5);
              doc.roundedRect(x, topY, size, size, 3, 3);
              const imageFormat = /^data:image\/jpe?g/i.test(logoSource) ? 'JPEG' : 'PNG';
              doc.addImage(logoEl, imageFormat, x + 1.4, topY + 1.4, size - 2.8, size - 2.8);
            } catch (imageError) {
              console.warn('Unable to render logo in PDF', imageError);
            }
          }
          function drawPageHeader(isContinuation) {
            const logoSize = 16;
            const textStartX = margin + (logoSource ? logoSize + 4 : 0);
            if (logoSource) {
              drawLogo(margin, y - 1, logoSize);
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(15);
            doc.setTextColor(ar, ag, ab);
            doc.text(restName, textStartX, y + 4.5);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(reportTitle, textStartX, y + 10.2);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.4);
            doc.setTextColor(...mutedColor);
            const headerMeta = [
              contact.phone || '',
              contact.email || '',
              contact.address || ''
            ].filter(Boolean).join('  |  ');
            if (headerMeta) {
              doc.text(doc.splitTextToSize(headerMeta, contentWidth - (textStartX - margin)), textStartX, y + 14.8);
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.8);
            doc.setTextColor(ar, ag, ab);
            doc.text('Report Date:', pageWidth - margin - 35, y + 4.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...textColor);
            doc.text(reportDateLabel, pageWidth - margin, y + 4.5, { align: 'right' });
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(ar, ag, ab);
            doc.text('Range:', pageWidth - margin - 35, y + 9.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...textColor);
            doc.text(rangeLabel, pageWidth - margin, y + 9.5, { align: 'right' });
            if (isContinuation) {
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(7.8);
              doc.setTextColor(...mutedColor);
              doc.text('Continued report', pageWidth - margin, y + 14.8, { align: 'right' });
            }
            y += 19;
            drawDivider(0.8, 2.2);
          }
          function writeOrderSummary(order) {
            ensureOrderTimeline(order);
            const customerEmail = order.customer && order.customer.email ? order.customer.email : '';
            const itemsText = getOrderItemSummary(order);
            const discountsText = getDiscountSummary(order);
            const itemLines = doc.splitTextToSize(itemsText, contentWidth - doc.getTextWidth('Items: '));
            const discountLines = doc.splitTextToSize(discountsText, contentWidth - doc.getTextWidth('Discounts Applied: '));
            const estimatedHeight = 19 + (itemLines.length * 4) + (discountLines.length * 4);
            ensureSpace(estimatedHeight + 4);
            doc.setFillColor(...panelFill);
            doc.setDrawColor(...lineColor);
            doc.setLineWidth(0.2);
            const startY = y - 1.4;
            const blockHeight = estimatedHeight + 1.6;
            doc.roundedRect(margin, startY, contentWidth, blockHeight, 2, 2, 'FD');
            y += 2.6;
            writeSplitRow('Customer', order.customer?.name || 'Customer', 'Phone', order.customer?.phone || 'Not provided');
            writeSplitRow('Email', customerEmail || 'Not provided', 'Order ID', order.id || '-');
            writeSplitRow('Status', order.status || 'Pending', 'Date', formatDateTime(order.date || order.timeline?.placedAt, true));
            writeFullRow('Items', itemsText);
            writeFullRow('Discounts Applied', discountsText);
            writeFullRow('Total Amount', formatOrderCurrency(order.total), { valueBold: true, valueColor: [24, 24, 24] });
            y += 1.4;
          }
          function drawSummarySection() {
            const metrics = [
              { label: 'Total Orders', value: String(analytics.orders.length) },
              { label: 'Total Revenue', value: formatOrderCurrency(analytics.totalRevenue) },
              { label: 'Total Discounts', value: formatOrderCurrency(totalDiscountsGiven) },
              { label: 'Net Sales', value: formatOrderCurrency(netSales) }
            ];
            ensureSpace(34);
            drawDivider(0.6, 2.2);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(ar, ag, ab);
            doc.text('Report Summary', margin, y);
            y += 4.8;
            const gap = 4;
            const boxWidth = (contentWidth - gap) / 2;
            const boxHeight = 11;
            metrics.forEach((metric, index) => {
              const boxX = margin + ((index % 2) * (boxWidth + gap));
              const boxY = y + (Math.floor(index / 2) * (boxHeight + 3));
              doc.setFillColor(...summaryFill);
              doc.setDrawColor(...lineColor);
              doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'FD');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(8);
              doc.setTextColor(...mutedColor);
              doc.text(metric.label, boxX + 3, boxY + 4);
              doc.setFontSize(10);
              doc.setTextColor(...textColor);
              doc.text(metric.value, boxX + 3, boxY + 8.3);
            });
            y += 2 * (boxHeight + 3);
          }
          function stampPageNumbers() {
            const pageCount = doc.getNumberOfPages();
            for (let pageIndex = 1; pageIndex <= pageCount; pageIndex++) {
              doc.setPage(pageIndex);
              doc.setDrawColor(...lineColor);
              doc.setLineWidth(0.2);
              doc.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7.5);
              doc.setTextColor(...mutedColor);
              doc.text(`Page ${pageIndex} of ${pageCount}`, pageWidth - margin, pageHeight - 4.2, { align: 'right' });
            }
          }

          drawPageHeader(false);
          if (!sortedOrders.length) {
            writeWrappedLine('No orders were found for the selected range.', margin, contentWidth, { color: mutedColor });
          } else {
            sortedOrders.forEach((order) => writeOrderSummary(order));
          }
          drawSummarySection();
          stampPageNumbers();
          const fileTs = new Date().toISOString().split('T')[0];
          doc.save(`${restName.toLowerCase().replace(/\s+/g, '_')}_${reportTitle.toLowerCase().replace(/\s+/g, '_')}_${fileTs}.pdf`);
        } catch (err) {
          console.error(err);
          alert('Failed to generate PDF');
        }
      }
      // Attach event handler for password save button.  This listener is added
      // once on page load and operates on the currently logged in session.  It
      // validates the current password, ensures the new passwords match and
      // updates the user object accordingly.  After a successful update the
      // modal closes and a success message is shown.  Errors are displayed
      // inline within the modal.
      document.addEventListener('DOMContentLoaded', function () {
        const saveBtn = document.getElementById('savePasswordBtn');
        if (saveBtn) {
          saveBtn.onclick = async function () {
            const current = document.getElementById('currentPasswordInput').value;
            const password = document.getElementById('newPasswordInput').value;
            const confirmPassword = document.getElementById('confirmNewPasswordInput').value;
            const alertDiv = document.getElementById('changePasswordAlert');
            function feedback(text, isError) {
              if (alertDiv) { alertDiv.textContent = text; alertDiv.className = isError ? 'afgr-password-error' : 'afgr-password-success'; }
            }
            const sb = App.Supabase && App.Supabase.client;
            const verified = App.Services.Auth && App.Services.Auth.isVerified && App.Services.Auth.isVerified();
            if (!verified || !sb) { feedback('Please sign in again before changing your password.', true); return; }
            if (!current) { feedback('Enter your current password.', true); return; }
            if (password.length < 8) { feedback('New password must be at least 8 characters.', true); return; }
            if (password !== confirmPassword) { feedback('New passwords do not match.', true); return; }
            if (password === current) { feedback('Choose a different new password.', true); return; }
            saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
            try {
              // updateUser is authenticated and validates current_password on
              // the server. Never write passwords to appState, JSONB or storage.
              const result = await sb.auth.updateUser({ password: password, current_password: current });
              if (result && result.error) throw result.error;
              closeChangePasswordModal();
              const notice = document.createElement('p');
              notice.className = 'afgr-account-password-updated';
              notice.textContent = 'Password changed successfully.';
              const container = document.getElementById('accountContent');
              if (container) {
                const old = container.querySelector('.afgr-account-password-updated');
                if (old) old.remove();
                container.prepend(notice);
              }
            } catch (error) {
              feedback((error && error.message) || 'Could not change password. Check your current password and try again.', true);
            } finally { saveBtn.disabled = false; saveBtn.textContent = 'Save Password'; }
          };
        }
      });

      // ===== loginForm submit (rewritten phase 3 - calls App.Services.Auth.login) =====
      // ===== loginForm submit (rewritten phase 5 - awaits Supabase Auth) =====
      // ===== fixed: routes by the role actually applied to the session, =====
      // ===== not the role embedded in the result.user object             =====
      document.getElementById('loginForm').addEventListener('submit', function (e) {
        e.preventDefault();
        App.Services.Auth.login(
          document.getElementById('loginEmail').value.trim(),
          document.getElementById('loginPassword').value.trim()
        ).then(function (result) {
          if (!result.ok) {
            showAlert('loginAlert', result.error || 'Invalid credentials', 'error');
            return;
          }
          closeLoginModal();
          // Route based on the freshly applied session role. This is the
          // single source of truth: Auth.login already ran the admins
          // table check and updated the session.
          var sess = App.Services.Auth.session();
          var role = (sess && sess.role) || (result.user && result.user.role) || 'customer';
          console.info('[Login] routing by role:', role);
          // Successful sign-in returns to the restaurant, regardless of role.
          // The Account shortcut and notification deep links are the only
          // ways to enter a management panel after sign-in.
          document.getElementById('adminPanel').classList.remove('active');
          document.getElementById('staffPanel').classList.remove('active');
          document.getElementById('website').style.display = 'block';
          buildWebsite();
          if (window.AFGRWorkspace && window.AFGRWorkspace.onLoggedIn) {
            Promise.resolve(window.AFGRWorkspace.onLoggedIn()).catch(function (e) {
              console.warn('[Login] notification navigation unavailable', e);
            });
          }
        });
      });

      // ========== Sign‑up handling ========== //
      // ===== signupForm submit (rewritten phase 3 - calls App.Services.Auth.signup) =====
      // ===== signupForm submit (rewritten phase 5 - awaits Supabase Auth) =====
      document.getElementById('signupForm').addEventListener('submit', function (e) {
        e.preventDefault();
        // Mandatory consent is checked before initiating a Supabase sign-up.
        // The native required checkbox also blocks ordinary invalid submissions.
        var legalConsent = document.getElementById('signupLegalConsent');
        if (!legalConsent || !legalConsent.checked) {
          showAlert('signupAlert', 'Please agree to the Privacy Policy and Terms & Conditions before creating an account.', 'error');
          if (legalConsent) legalConsent.focus();
          return;
        }
        App.Services.Auth.signup({
          name:     document.getElementById('signupName').value.trim(),
          email:    document.getElementById('signupEmail').value.trim(),
          phone:    document.getElementById('signupPhone').value.trim(),
          password: document.getElementById('signupPassword').value.trim(),
          confirm:  document.getElementById('signupConfirm').value.trim()
        }).then(function (result) {
          if (!result.ok) {
            showAlert('signupAlert', result.error || 'Sign-up failed.', 'error');
            return;
          }
          showAlert('signupAlert', 'Account created! Please log in.', 'success');
          setTimeout(function () {
            closeSignupModal();
            openLoginModal();
          }, 1000);
          e.target.reset();
        });
      });

      // ===== logout (rewritten phase 5 - signs out via Supabase Auth) =====
      function logout() {
        // Unsubscribe from push notifications BEFORE clearing auth.
        // This is critical: deleting the push_subscriptions row requires
        // an authenticated request (RLS), so we must unsubscribe while
        // the auth session is still active. Errors are non-fatal.
        var unsubPromise = Promise.resolve();
        try {
          if (typeof window.unsubscribeFromPushNotifications === 'function') {
            unsubPromise = Promise.resolve(window.unsubscribeFromPushNotifications()).catch(function (e) {
              console.warn('[Logout] push unsubscribe failed (continuing):', e);
            });
          }
        } catch (e) {}
        unsubPromise.finally(function () {
          if (window.AFGRWorkspace && window.AFGRWorkspace.onLoggedOut) {
            window.AFGRWorkspace.onLoggedOut();
          }
          App.Services.Auth.logout().finally(function () {
            try { sessionStorage.removeItem('lastPanel'); } catch (e) {}
            document.getElementById('adminPanel').classList.remove('active');
            document.getElementById('staffPanel').classList.remove('active');
            document.getElementById('website').style.display = 'block';
            // Hide audio unlock banner if it was showing
            if (typeof hideAudioUnlockBanner === 'function') hideAudioUnlockBanner();
            if (typeof buildWebsite === 'function') {
              try { buildWebsite(); } catch (err) { /* ignore */ }
            }
          });
        });
      }

      /*
       * ================================
       * Item editing modal handlers
       * ================================
       */
      /**
       * Open the item edit modal.  Populates the form with existing values when editing
       * an item and clears fields for a new item.  The modal stores the item id in
       * a data attribute for later use when saving.
       * @param {Object|null} item The menu item to edit, or null to create a new one.
       */
      function getVariationDraftRow(variation = null, fallbackItem = null) {
        const normalized = normalizeVariationRecord(variation || {}, fallbackItem || {}, 0);
        return {
          id: normalized.id || generateId(),
          name: normalized.name || '',
          sellingPrice: Number.isFinite(Number(normalized.sellingPrice)) ? Number(normalized.sellingPrice) : '',
          originalPrice: normalized.originalPrice === null ? '' : normalized.originalPrice,
          enabled: normalized.enabled !== false
        };
      }

      function renderEditItemVariationRows(variations = []) {
        const rowsContainer = document.getElementById('editItemVariationsRows');
        const enabledToggle = document.getElementById('editItemVariationsEnabled');
        const addBtn = document.getElementById('addVariationRowBtn');
        if (!rowsContainer || !enabledToggle || !addBtn) return;
        rowsContainer.innerHTML = '';
        addBtn.style.display = enabledToggle.checked ? 'inline-flex' : 'none';
        if (!enabledToggle.checked) {
          rowsContainer.innerHTML = '<div class="variation-admin-empty">Variations are currently disabled for this product.</div>';
          return;
        }
        if (!variations.length) {
          rowsContainer.innerHTML = '<div class="variation-admin-empty">Add at least one option such as Small, Medium, Large, Half Plate, or 1kg.</div>';
          return;
        }
        variations.forEach((variation, index) => {
          const row = document.createElement('div');
          row.className = 'variation-admin-row';
          row.dataset.variationId = variation.id || generateId();
          row.innerHTML = `
            <div class="form-group">
              <label>Variation Name</label>
              <input type="text" data-variation-field="name" value="${escapeHtml(String(variation.name || '')).replace(/"/g, '&quot;')}" placeholder="e.g. Small, Full Plate, 500g" />
            </div>
            <div class="form-group">
              <label>Dummy Price</label>
              <input type="number" data-variation-field="originalPrice" value="${variation.originalPrice === '' ? '' : variation.originalPrice}" step="0.01" min="0" placeholder="Optional" />
            </div>
            <div class="form-group">
              <label>Selling Price</label>
              <input type="number" data-variation-field="sellingPrice" value="${variation.sellingPrice === '' ? '' : variation.sellingPrice}" step="0.01" min="0" placeholder="Required" />
            </div>
            <label class="variation-admin-toggle">
              <input type="checkbox" data-variation-field="enabled" ${variation.enabled !== false ? 'checked' : ''} />
              <span>Enabled</span>
            </label>
            <button type="button" class="variation-admin-remove" data-remove-variation="${index}">Remove</button>
          `;
          rowsContainer.appendChild(row);
        });
      }

      function readEditItemVariationsFromModal() {
        const rowsContainer = document.getElementById('editItemVariationsRows');
        const enabledToggle = document.getElementById('editItemVariationsEnabled');
        if (!rowsContainer || !enabledToggle || !enabledToggle.checked) return [];
        return Array.from(rowsContainer.querySelectorAll('.variation-admin-row')).map((row) => {
          const getField = (field) => row.querySelector(`[data-variation-field="${field}"]`);
          const originalField = getField('originalPrice');
          const sellingField = getField('sellingPrice');
          return {
            id: row.dataset.variationId || generateId(),
            name: getField('name') ? getField('name').value.trim() : '',
            originalPrice: originalField && originalField.value.trim() !== '' ? Number(originalField.value) : '',
            sellingPrice: sellingField && sellingField.value.trim() !== '' ? Number(sellingField.value) : '',
            enabled: !!(getField('enabled') && getField('enabled').checked)
          };
        });
      }

      function openEditItemModal(item) {
        const modal = document.getElementById('editItemModal');
        modal.dataset.existingImage = item && item.image ? item.image : '';
        // Store the id (or blank) on the modal for reference
        modal.dataset.itemId = item && item.id ? item.id : '';
        document.getElementById('editItemTitle').textContent = item ? 'Edit Item' : 'Add Item';
        document.getElementById('editItemName').value = item ? item.name : '';
        document.getElementById('editItemDesc').value = item ? item.description : '';
        document.getElementById('editItemOriginalPrice').value = item && getOriginalPrice(item) !== null ? getOriginalPrice(item) : '';
        document.getElementById('editItemPrice').value = item ? getSellingPrice(item) : '';
        const imageFileInput = document.getElementById('editItemImageFile');
        if (imageFileInput) imageFileInput.value = '';
        setEditItemImagePreview(item ? item.image : '');
        var enabledToggle = document.getElementById('editItemEnabled');
        enabledToggle.checked = item ? !!item.enabled : true;
        // Wire status label to update live as admin toggles
        var statusEl = document.getElementById('editItemEnabledStatus');
        function refreshProductEnableStatus() {
          if (!statusEl) return;
          var on = enabledToggle.checked;
          statusEl.classList.toggle('is-enabled', on);
          statusEl.classList.toggle('is-disabled', !on);
          var labelEl = statusEl.querySelector('.status-label');
          if (labelEl) {
            labelEl.textContent = on
              ? 'Enabled — customers can order this item'
              : 'Disabled — visible on menu but cannot be ordered';
          }
        }
        // Avoid stacking listeners on repeated modal opens
        if (!enabledToggle.dataset.statusWired) {
          enabledToggle.dataset.statusWired = '1';
          enabledToggle.addEventListener('change', refreshProductEnableStatus);
        }
        refreshProductEnableStatus();
        const editItemVariationsEnabled = document.getElementById('editItemVariationsEnabled');
        if (editItemVariationsEnabled) {
          editItemVariationsEnabled.checked = item ? !!item.variationsEnabled : false;
        }
        renderEditItemVariationRows(item && hasEnabledVariations(item)
          ? getItemVariations(item).map((variation) => getVariationDraftRow(variation, item))
          : []);
        // Populate category select options
        const catSel = document.getElementById('editItemCategory');
        catSel.innerHTML = '';
        appState.categories.forEach((c, idx) => {
          const opt = document.createElement('option');
          opt.value = idx;
          opt.textContent = c.name;
          if (item && item.category == idx) opt.selected = true;
          catSel.appendChild(opt);
        });
        modal.classList.add('active');
      }

      /** Close the item edit modal */
      function closeEditItemModal() {
        document.getElementById('editItemModal').classList.remove('active');
      }

      function setEditItemImagePreview(src) {
        const preview = document.getElementById('editItemImagePreview');
        if (!preview) return;
        if (src) {
          preview.src = src;
          preview.classList.add('is-visible');
        } else {
          preview.removeAttribute('src');
          preview.classList.remove('is-visible');
        }
      }

      function readImageFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
          if (!file) {
            resolve('');
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => reject(new Error('Unable to read image file.'));
          reader.readAsDataURL(file);
        });
      }

      /**
       * Resize an image file to a target max dimension on the largest edge.
       * Returns a compressed JPEG Blob. Mirrors the v66 hero-upload helper
       * but available at top level for any upload path (menu, etc).
       */
      function resizeImageFileGeneric(file, maxDimension, quality) {
        maxDimension = maxDimension || 1200;
        quality      = quality      || 0.85;
        return new Promise(function (resolve, reject) {
          // Validate file is actually a File/Blob with content. Some mobile
          // browsers return a 0-byte placeholder when permissions are wonky
          // or the file picker is interrupted — fail clearly here rather
          // than getting an opaque "File read failed" later.
          if (!file || typeof file !== 'object') {
            return reject(new Error('No file selected.'));
          }
          if (typeof file.size === 'number' && file.size === 0) {
            return reject(new Error('Selected file is empty (0 bytes). Try picking it again, or try a different image.'));
          }
          // HEIC (iPhone default format) can't be decoded by browser canvas.
          // Detect early and give a clear error rather than a vague decode failure.
          var nameLower = String(file.name || '').toLowerCase();
          var typeLower = String(file.type || '').toLowerCase();
          if (nameLower.endsWith('.heic') || nameLower.endsWith('.heif')
              || typeLower.indexOf('heic') !== -1 || typeLower.indexOf('heif') !== -1) {
            return reject(new Error('HEIC/HEIF images (iPhone default) are not supported. Please convert to JPG or PNG first, or change your phone\'s camera setting to JPEG.'));
          }

          // PRIMARY PATH: URL.createObjectURL is more robust than
          // FileReader on Android Chrome — it avoids the "File read failed"
          // error that can happen when FileReader times out or hits a
          // sandboxing quirk with certain photo apps.
          var objectUrl = null;
          try {
            objectUrl = URL.createObjectURL(file);
          } catch (e) {
            // Fall back to FileReader if createObjectURL fails (very rare)
            return resizeViaFileReader(file, maxDimension, quality).then(resolve, reject);
          }

          var img = new Image();
          img.onload = function () {
            try {
              var w = img.width, h = img.height;
              if (w === 0 || h === 0) {
                URL.revokeObjectURL(objectUrl);
                return reject(new Error('Image has zero dimensions — file may be corrupted.'));
              }
              if (w > maxDimension || h > maxDimension) {
                if (w >= h) {
                  h = Math.round(h * (maxDimension / w));
                  w = maxDimension;
                } else {
                  w = Math.round(w * (maxDimension / h));
                  h = maxDimension;
                }
              }
              var canvas = document.createElement('canvas');
              canvas.width  = w;
              canvas.height = h;
              var ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              canvas.toBlob(function (blob) {
                URL.revokeObjectURL(objectUrl);
                if (!blob) return reject(new Error('Image compression failed. The file may be in an unsupported format.'));
                resolve(blob);
              }, 'image/jpeg', quality);
            } catch (err) {
              URL.revokeObjectURL(objectUrl);
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          };
          img.onerror = function () {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Could not decode image. Make sure the file is a valid JPG, PNG, or WEBP.'));
          };
          img.src = objectUrl;
        });
      }

      // Fallback path (kept for very edge cases) — FileReader-based resize.
      function resizeViaFileReader(file, maxDimension, quality) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
              var w = img.width, h = img.height;
              if (w > maxDimension || h > maxDimension) {
                if (w >= h) { h = Math.round(h * (maxDimension / w)); w = maxDimension; }
                else        { w = Math.round(w * (maxDimension / h)); h = maxDimension; }
              }
              var canvas = document.createElement('canvas');
              canvas.width = w; canvas.height = h;
              canvas.getContext('2d').drawImage(img, 0, 0, w, h);
              canvas.toBlob(function (blob) {
                if (!blob) return reject(new Error('Image compression failed'));
                resolve(blob);
              }, 'image/jpeg', quality);
            };
            img.onerror = function () { reject(new Error('Image decode failed')); };
            img.src = e.target.result;
          };
          reader.onerror = function () {
            reject(new Error('Could not read file. Try picking the image again, or try a different image.'));
          };
          reader.readAsDataURL(file);
        });
      }

      /**
       * Upload a Blob/File to a named Supabase Storage bucket and return
       * its public URL. Generic helper for any feature that needs to put
       * an image in Storage instead of base64-in-config.
       */
      async function uploadImageToStorage(blobOrFile, bucket, prefix, extension) {
        if (!App.Supabase || !App.Supabase.client) {
          throw new Error('Supabase client not ready');
        }
        var ext = extension || 'jpg';
        var safePrefix = (prefix || 'item').replace(/[^A-Za-z0-9_-]/g, '');
        var filename = safePrefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
        var res = await App.Supabase.client.storage
          .from(bucket)
          .upload(filename, blobOrFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: blobOrFile.type || 'image/jpeg'
          });
        if (res.error) {
          console.error('[Storage upload] failed:', bucket, res.error);
          // Specific error: bucket doesn't exist. This means the one-time
          // SQL setup wasn't run. Surface a more helpful message than the
          // raw "Bucket not found" so the admin/Harold understands what
          // needs to happen.
          var msg = String(res.error.message || res.error.statusText || res.error);
          if (msg.toLowerCase().indexOf('bucket') !== -1 && msg.toLowerCase().indexOf('not found') !== -1) {
            throw new Error('The "' + bucket + '" storage bucket is missing. The one-time Supabase setup SQL needs to be run by the database admin to create this bucket. The image cannot be uploaded until this is done.');
          }
          throw res.error;
        }
        var pubRes = App.Supabase.client.storage.from(bucket).getPublicUrl(filename);
        var publicUrl = (pubRes && pubRes.data && pubRes.data.publicUrl) || '';
        if (!publicUrl) throw new Error('Could not resolve public URL');
        console.info('[Storage upload] success:', bucket + '/' + filename);
        return publicUrl;
      }
      // Expose on window so other modules can call them too
      window.resizeImageFileGeneric = resizeImageFileGeneric;
      window.uploadImageToStorage   = uploadImageToStorage;

      const editItemImageFileInput = document.getElementById('editItemImageFile');
      const editItemVariationsEnabled = document.getElementById('editItemVariationsEnabled');
      const addVariationRowBtn = document.getElementById('addVariationRowBtn');
      if (editItemVariationsEnabled) {
        editItemVariationsEnabled.addEventListener('change', function () {
          const currentRows = readEditItemVariationsFromModal();
          renderEditItemVariationRows(this.checked ? (currentRows.length ? currentRows : [getVariationDraftRow()]) : currentRows);
        });
      }
      if (addVariationRowBtn) {
        addVariationRowBtn.addEventListener('click', function () {
          const currentRows = readEditItemVariationsFromModal();
          currentRows.push(getVariationDraftRow());
          renderEditItemVariationRows(currentRows);
        });
      }
      document.addEventListener('click', function (event) {
        const removeBtn = event.target.closest('[data-remove-variation]');
        if (!removeBtn) return;
        const removeIndex = Number(removeBtn.getAttribute('data-remove-variation'));
        const currentRows = readEditItemVariationsFromModal();
        renderEditItemVariationRows(currentRows.filter((_, index) => index !== removeIndex));
      });
      if (editItemImageFileInput) {
        editItemImageFileInput.addEventListener('change', async function () {
          const file = this.files && this.files[0] ? this.files[0] : null;
          if (!file) {
            setEditItemImagePreview(document.getElementById('editItemModal')?.dataset.existingImage || '');
            return;
          }
          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
          if (!allowedTypes.includes(file.type)) {
            showAlert('editItemAlert', 'Please upload a JPG, PNG, or WEBP image.', 'error');
            this.value = '';
            setEditItemImagePreview(document.getElementById('editItemModal')?.dataset.existingImage || '');
            return;
          }
          try {
            const dataUrl = await readImageFileAsDataUrl(file);
            setEditItemImagePreview(dataUrl);
          } catch (error) {
            showAlert('editItemAlert', 'Image upload failed. Please try again.', 'error');
          }
        });
      }

      // Handle item form submission
      document.getElementById('editItemForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const modal = document.getElementById('editItemModal');
        const id = modal.dataset.itemId || generateId();
        const name = document.getElementById('editItemName').value.trim();
        const description = document.getElementById('editItemDesc').value.trim();
        const sellingPrice = parseFloat(document.getElementById('editItemPrice').value);
        const originalPriceInput = document.getElementById('editItemOriginalPrice').value.trim();
        const originalPrice = originalPriceInput === '' ? '' : parseFloat(originalPriceInput);
        const catIdx = parseInt(document.getElementById('editItemCategory').value);
        const imageFile = document.getElementById('editItemImageFile').files && document.getElementById('editItemImageFile').files[0]
          ? document.getElementById('editItemImageFile').files[0]
          : null;
        const enabled = document.getElementById('editItemEnabled').checked;
        const variationsEnabled = !!(document.getElementById('editItemVariationsEnabled') && document.getElementById('editItemVariationsEnabled').checked);
        const variationRows = readEditItemVariationsFromModal();
        if (
          !name ||
          isNaN(sellingPrice) ||
          sellingPrice < 0 ||
          (originalPriceInput !== '' && (isNaN(originalPrice) || originalPrice < 0))
        ) {
          showAlert('editItemAlert', 'Please fill all required fields.', 'error');
          return;
        }
        if (variationsEnabled) {
          const validVariationRows = variationRows.filter((variation) => variation.name && variation.sellingPrice !== '' && !isNaN(Number(variation.sellingPrice)) && Number(variation.sellingPrice) >= 0);
          if (!validVariationRows.length) {
            showAlert('editItemAlert', 'Add at least one valid variation with a name and selling price.', 'error');
            return;
          }
          if (validVariationRows.some((variation) => variation.originalPrice !== '' && (isNaN(Number(variation.originalPrice)) || Number(variation.originalPrice) < 0))) {
            showAlert('editItemAlert', 'Variation dummy prices must be valid positive numbers.', 'error');
            return;
          }
        }
        let image = modal.dataset.existingImage || '';
        if (imageFile) {
          try {
            // NEW (v72): compress image → upload to Supabase 'menu' bucket
            //   → store public URL only (not base64). Mirrors the v66 hero
            //   upload fix. Keeps localStorage small + makes image visible
            //   on all devices via the URL.
            const compressedBlob = await resizeImageFileGeneric(imageFile, 1200, 0.85);
            console.info('[Menu upload] compressed size:', compressedBlob.size, 'bytes');
            // File extension: always JPEG since resize re-encodes to JPEG
            image = await uploadImageToStorage(compressedBlob, 'menu', 'item_' + id, 'jpg');
          } catch (error) {
            console.error('[Menu upload] failed:', error);
            showAlert('editItemAlert',
              'Image upload failed: ' + (error.message || 'unknown error')
                + '. Please make sure you are logged in as admin and try again.',
              'error');
            return;
          }
        }
        const newItem = {
          id: id,
          name: name,
          description: description,
          price: sellingPrice,
          sellingPrice: sellingPrice,
          originalPrice: originalPriceInput === '' ? '' : originalPrice,
          category: isNaN(catIdx) ? 0 : catIdx,
          image: image,
          enabled: enabled,
          variationsEnabled: variationsEnabled && variationRows.length > 0,
          variations: variationsEnabled
            ? variationRows
                .filter((variation) => variation.name && variation.sellingPrice !== '' && !isNaN(Number(variation.sellingPrice)))
                .map((variation, index) => normalizeVariationRecord(variation, { sellingPrice, price: sellingPrice, originalPrice }, index))
            : []
        };
        const existingIndex = appState.menuItems.findIndex((mi) => mi.id === id);
        if (existingIndex >= 0) {
          App.Repo.Menu.replace(id, newItem);
        } else {
          App.Repo.Menu.create(newItem);
        }
        // Force the sync queue to fire immediately so the write reaches
        // Supabase BEFORE the user has any chance to refresh. Without this,
        // a user who clicks Save and immediately presses F5 sees their edit
        // disappear because the queued write never fires before reload.
        if (App.SupabaseSync && App.SupabaseSync.flushNow) {
          App.SupabaseSync.flushNow();
        }
        // Refresh the appropriate admin/staff UI section
        const targetContainerId = appState.session && appState.session.role === 'admin' ? 'adminContent' : 'staffContent';
        const targetContainer = document.getElementById(targetContainerId);
        if (targetContainer) {
          renderMenuManagement(targetContainer);
        }
        // Rebuild front end menu
        buildWebsite();
        closeEditItemModal();
      });

      /*
       * ================================
       * Staff editing modal handlers
       * ================================
       */
      /**
       * Open the staff edit modal.  Populates the form with existing values when editing
       * a staff member and clears fields for a new one.  Permissions are displayed
       * as checkboxes so the admin can toggle them individually.
       * @param {Object|null} user The staff user to edit, or null to create a new one.
       */
      function openEditStaffModal(user) {
        const modal = document.getElementById('editStaffModal');
        modal.dataset.staffId = user && user.id ? user.id : '';
        document.getElementById('editStaffTitle').textContent = user ? 'Edit Staff Account' : 'Invite New Staff';
        const emailInput = document.getElementById('editStaffEmail');
        if (emailInput) {
          emailInput.value = user ? (user.email || '') : '';
          // Email cannot be changed for existing linked staff — it's the
          // anchor that links the role/permissions to the Supabase Auth
          // account. Changing it would orphan the auth link.
          emailInput.readOnly = !!(user && user.email && user.auth_user_id);
        }
        document.getElementById('editStaffDisplayName').value = user
          ? (user.displayName || user.email || '')
          : '';
        const roleSelect = document.getElementById('editStaffRole');
        if (roleSelect) roleSelect.value = user && user.role === 'owner' ? 'owner' : 'staff';
        // Show the "next step" invite hint only when creating a new staff
        // member who hasn't yet linked to a Supabase Auth account.
        const inviteInfo = document.getElementById('editStaffInviteInfo');
        if (inviteInfo) {
          inviteInfo.style.display = (user && user.auth_user_id) ? 'none' : 'block';
        }
        // Section-only access model: each entry maps a logical access
        // key to (a) the admin nav id used by renderAdminSection /
        // renderStaffSection (so staff get the EXACT same view as admin)
        // and (b) a short description shown in the UI.
        //
        // To add/remove sections from the staff invite form: edit this
        // one list. Nothing else needs to change — the form, the staff
        // sidebar, and the access validator all derive from it.
        const sectionDefs = [
          { key: 'dashboard',     navId: 'dashboard',    label: 'Dashboard',     desc: 'Overview stats and quick access' },
          { key: 'orders',        navId: 'orders',       label: 'Orders',        desc: 'View, accept, and update order status' },
          { key: 'reservations',  navId: 'reservations', label: 'Reservations',  desc: 'View and approve table reservations' },
          { key: 'requests',      navId: 'requests',     label: 'Requests',      desc: 'Customer contact form submissions' },
          { key: 'menu',          navId: 'menuMgmt',     label: 'Menu',          desc: 'Add, edit, and manage menu items + categories' },
          { key: 'offers',        navId: 'offersMgmt',   label: 'Offers',        desc: 'Promotional offers and discounts' },
          { key: 'gallery',       navId: 'galleryMgmt',  label: 'Gallery',       desc: 'Restaurant photo gallery management' },
          { key: 'reviews',       navId: 'reviewsMgmt',  label: 'Reviews',       desc: 'Customer testimonials and reviews' },
          { key: 'customers',     navId: 'usersMgmt',    label: 'Customers',     desc: 'Customer account list and export' },
          { key: 'staff',         navId: 'staffMgmt',    label: 'Staff',         desc: 'Manage staff accounts (admin-only typically)' },
          { key: 'settings',      navId: 'settings',     label: 'Settings',      desc: 'Site configuration and branding' },
          // v87: Popup section permission (companion to v85 sidebar entry)
          { key: 'popup',         navId: 'popupMgmt',    label: 'Popup',         desc: 'Manage the announcement popup shown on landing' },
          // v92: About section permission
          { key: 'about',         navId: 'aboutMgmt',    label: 'About',         desc: 'Manage the public About page content (text, images, features)' }
        ];
        // Expose for the staff nav builder and access validator
        window.__staffSectionDefs = sectionDefs;
        const sectionsContainer = document.getElementById('editStaffSections');
        sectionsContainer.innerHTML = '';
        const selectedSections = Array.isArray(user && user.sectionsAccess) ? user.sectionsAccess : [];
        // Section cards grid — clean, mobile-friendly, no clutter
        sectionDefs.forEach((section) => {
          const card = document.createElement('label');
          card.className = 'staff-section-card';
          card.dataset.section = section.key;
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.value = section.key;
          checkbox.className = 'staff-section-card-check';
          if (selectedSections.includes(section.key)) checkbox.checked = true;
          // Update visual state on toggle
          checkbox.addEventListener('change', function () {
            card.classList.toggle('staff-section-card-active', checkbox.checked);
          });
          if (checkbox.checked) card.classList.add('staff-section-card-active');

          const body = document.createElement('div');
          body.className = 'staff-section-card-body';
          const title = document.createElement('div');
          title.className = 'staff-section-card-title';
          title.textContent = section.label;
          const desc = document.createElement('div');
          desc.className = 'staff-section-card-desc';
          desc.textContent = section.desc || '';

          body.appendChild(title);
          body.appendChild(desc);
          card.appendChild(checkbox);
          card.appendChild(body);
          sectionsContainer.appendChild(card);
        });
        // Notification preferences — kept separate as requested. Sound
        // alerts + push notifications for the listed sections only.
        const notificationDefs = [
          { key: 'orders',       label: 'Order Alerts' },
          { key: 'reservations', label: 'Reservation Alerts' },
          { key: 'requests',     label: 'Request Alerts' }
        ];
        const notificationContainer = document.getElementById('editStaffNotifications');
        notificationContainer.innerHTML = '';
        const userNotificationSections = user && user.notificationPrefs && user.notificationPrefs.sections ? user.notificationPrefs.sections : {};
        notificationDefs.forEach((section) => {
          const chip = document.createElement('label');
          chip.className = 'staff-notif-chip';
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.value = section.key;
          checkbox.checked = user ? userNotificationSections[section.key] !== false : true;
          checkbox.addEventListener('change', function () {
            chip.classList.toggle('staff-notif-chip-active', checkbox.checked);
          });
          if (checkbox.checked) chip.classList.add('staff-notif-chip-active');
          const span = document.createElement('span');
          span.textContent = section.label;
          chip.appendChild(checkbox);
          chip.appendChild(span);
          notificationContainer.appendChild(chip);
        });
        modal.classList.add('active');
      }

      /** Close the staff edit modal */
      function closeEditStaffModal() {
        document.getElementById('editStaffModal').classList.remove('active');
      }

      // Handle staff form submission. Security model:
      //  - We NEVER store a password on the staff user record.
      //  - The staff record carries role + permissions + display name +
      //    email. The email is the anchor for the future Supabase Auth
      //    link.
      //  - When the staff member signs up with the same email, the
      //    _ensureProfile() function in 09-services-auth.js auto-merges
      //    their auth account into this pre-staged role record.
      document.getElementById('editStaffForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const modal = document.getElementById('editStaffModal');
        const id = modal.dataset.staffId || generateId();
        const email = document.getElementById('editStaffEmail').value.trim().toLowerCase();
        const displayName = document.getElementById('editStaffDisplayName').value.trim();
        const selectedRole = document.getElementById('editStaffRole').value === 'owner' ? 'owner' : 'staff';
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          showAlert('editStaffAlert', 'A valid email address is required.', 'error');
          return;
        }
        // Block duplicate emails — including against customer accounts
        const dupe = (appState.users || []).find((u) =>
          u && u.id !== id && (u.email || '').toLowerCase() === email
        );
        if (dupe) {
          showAlert('editStaffAlert',
            'Another user already has this email. Edit that account instead.',
            'error');
          return;
        }
        const sectionSelection = Array.from(
          document.querySelectorAll('#editStaffSections input[type="checkbox"]')
        ).filter((cb) => cb.checked).map((cb) => cb.value);
        // Permissions are intentionally not collected — access is purely
        // section-based now. Any legacy `permissions` array on existing
        // records will be cleared on update so it stops affecting behavior.
        const notificationSections = Array.from(
          document.querySelectorAll('#editStaffNotifications input[type="checkbox"]')
        ).reduce((acc, cb) => {
          acc[cb.value] = cb.checked;
          return acc;
        }, {});
        const existing = appState.users.find((u) => u.id === id);
        if (existing) {
          // Update existing staff. NEVER write a password here.
          existing.email = email;
          existing.displayName = displayName || email.split('@')[0];
          existing.role = selectedRole;
          existing.sectionsAccess = sectionSelection;
          // Wipe legacy permissions array — section-based access now
          existing.permissions = [];
          // Strip any legacy password field for security
          delete existing.password;
          delete existing.username;
          if (!existing.notificationPrefs || typeof existing.notificationPrefs !== 'object') {
            existing.notificationPrefs = {};
          }
          existing.notificationPrefs.soundEnabled = Object.values(notificationSections).some(Boolean);
          existing.notificationPrefs.sectionSeenAt = existing.notificationPrefs.sectionSeenAt || { orders: 0, reservations: 0, requests: 0 };
          existing.notificationPrefs.sections = notificationSections;
          // Publish update
          if (App.Repo && App.Repo.Users && App.Repo.Users.update) {
            App.Repo.Users.update(existing.id, existing);
          }
        } else {
          // Create new staff record. Email is the link to a future auth
          // account; role + section access are pre-staged. No password stored.
          var __staffUser = {
            id: id,
            email: email,
            role: selectedRole,
            displayName: displayName || email.split('@')[0],
            sectionsAccess: sectionSelection,
            permissions: [],           // section-only model: no action perms
            verified: false,           // becomes true when they confirm via auth signup
            invitedAt: Date.now(),
            createdAt: Date.now(),
            notificationPrefs: {
              soundEnabled: Object.values(notificationSections).some(Boolean),
              sectionSeenAt: { orders: 0, reservations: 0, requests: 0 },
              sections: notificationSections
            }
          };
          App.Repo.Users.create(__staffUser);
        }
        saveData();
        if (App.SupabaseSync && App.SupabaseSync.flushNow) {
          App.SupabaseSync.flushNow();
        }
        // Refresh staff management section
        renderStaffManagement(document.getElementById('adminContent'));
        showAlert('editStaffAlert',
          existing ? 'Staff updated.' : 'Staff invited. They can now sign up with ' + email + '.',
          'success');
        setTimeout(closeEditStaffModal, 1500);
      });

      // ========== Admin & Staff Panel ========== //
      /** Build admin navigation and load default section */
      function loadAdminPanel() {
        try { sessionStorage.setItem('lastPanel', 'admin'); } catch (e) {}
        // Try to prime audio. On a fresh login (clicked Login button)
        // this succeeds. On refresh-restored session, it likely fails
        // because no user gesture has happened yet — in that case we
        // schedule a check that shows the audio unlock banner if still
        // unprimed after 2 seconds.
        try {
          if (typeof primeRealtimeAudio === 'function') primeRealtimeAudio();
          setTimeout(function () {
            if (!realtimeAudioReady && typeof maybeShowAudioUnlockBanner === 'function') {
              maybeShowAudioUnlockBanner();
            }
          }, 2000);
        } catch (e) {}
        // Permission restoration must not trigger a browser prompt automatically.
        document.getElementById('website').style.display = 'none';
        const panel = document.getElementById('adminPanel');
        panel.classList.add('active');
        // v220: guarantee the panel is visible even when opened via the
        // session-restore path (which doesn't run the website render that
        // normally clears app-loading). app-loading carries visibility:hidden.
        document.body.classList.remove('app-loading');
        var _pre = document.getElementById('preloader');
        if (_pre) _pre.style.display = 'none';
        document.getElementById('adminPanelTitle').textContent =
          'Admin – ' + appState.config.restaurantName;
        // Build nav entries
        const nav = document.getElementById('adminNav');
        nav.innerHTML = '';
        const sections = [
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'settings', label: 'Settings' },
          { id: 'menuMgmt', label: 'Menu' },
          { id: 'orders', label: 'Orders' },
          { id: 'reservations', label: 'Reservations' },
          { id: 'requests', label: 'Requests' },
          { id: 'offersMgmt', label: 'Offers' },
          { id: 'galleryMgmt', label: 'Gallery' },
          { id: 'reviewsMgmt', label: 'Reviews' },
          { id: 'staffMgmt', label: 'Staff' },
          // New section for managing customer accounts
          { id: 'usersMgmt', label: 'Users' },
          // v85: Announcement Popup management — extracted from Settings
          // into its own dedicated section. Same upload / preview /
          // enable-disable / device-specific media. Has its own Save
          // button so it doesn't touch the rest of Settings on save.
          { id: 'popupMgmt', label: 'Popup' },
          // v92: About page management — customize the public About
          // section's images, text, and feature cards.
          { id: 'aboutMgmt', label: 'About' }
        ];
        sections.forEach((sec, idx) => {
          const li = document.createElement('li');
          decorateNavItem(li, sec.label);
          li.dataset.target = sec.id;
          li.onclick = () => {
            setActiveNavItem('adminNav', sec.id);
            renderAdminSection(sec.id);
          };
          if (idx === 0) li.classList.add('active');
          nav.appendChild(li);
        });
        if (!consumePendingRealtimeSection('adminNav', renderAdminSection)) {
          renderAdminSection(sections[0].id);
        }
        updateRealtimeDots();
        if (window.AFGRWorkspace) window.AFGRWorkspace.panelReady();
      }

      /** Build staff navigation and load default section based on permissions */
      function loadStaffPanel() {
        try { sessionStorage.setItem('lastPanel', 'staff'); } catch (e) {}
        // Try to prime audio (same logic as admin panel).
        try {
          if (typeof primeRealtimeAudio === 'function') primeRealtimeAudio();
          setTimeout(function () {
            if (!realtimeAudioReady && typeof maybeShowAudioUnlockBanner === 'function') {
              maybeShowAudioUnlockBanner();
            }
          }, 2000);
        } catch (e) {}
        // Resume authorized push subscriptions only if permission is already granted.
        document.getElementById('website').style.display = 'none';
        const panel = document.getElementById('staffPanel');
        panel.classList.add('active');
        // v220: same visibility safeguard as the admin panel.
        document.body.classList.remove('app-loading');
        var _preStaff = document.getElementById('preloader');
        if (_preStaff) _preStaff.style.display = 'none';
        let sessionUser = appState.users.find((u) => u.id === appState.session.id);
        // SAFETY: if the user row isn't in appState yet, do NOT render the
        // full panel with placeholder access. The previous version
        // created a stub with `sectionsAccess: [all admin sections]`
        // which (a) showed every section to anyone briefly and (b)
        // displayed "Owner - Owner" as the title for owner-role staff.
        //
        // Instead: render a clean loading state, poll for the real row,
        // and re-render once it arrives. If after 8 seconds nothing
        // shows up, logout — the session is broken.
        if (!sessionUser) {
          console.info('[StaffPanel] user row not in appState yet — showing loading state, polling for real row');
          var titleEl = document.getElementById('staffPanelTitle');
          if (titleEl) titleEl.textContent = 'Loading…';
          var navEl = document.getElementById('staffNav');
          if (navEl) navEl.innerHTML = '';
          var contentEl = document.getElementById('staffContent');
          if (contentEl) {
            contentEl.innerHTML =
              '<div style="padding:40px;text-align:center;color:rgba(255,248,239,0.65);">' +
                '<div style="font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:var(--accent);">Loading your account</div>' +
                '<p style="margin-top:12px;font-size:13px;">Restoring your session and section access…</p>' +
              '</div>';
          }
          var attempts = 0;
          var maxAttempts = 40;   // 40 × 200ms = 8 seconds
          var realUserPoll = setInterval(function () {
            attempts++;
            var realUser = appState.users.find(function (u) { return u && u.id === appState.session.id; });
            if (realUser) {
              clearInterval(realUserPoll);
              try { loadStaffPanel(); } catch (e) {
                console.warn('[StaffPanel] re-render with real user failed', e);
              }
            } else if (attempts >= maxAttempts) {
              clearInterval(realUserPoll);
              console.warn('[StaffPanel] gave up waiting for user row — logging out');
              try {
                if (App.Services && App.Services.Auth && typeof App.Services.Auth.logout === 'function') {
                  App.Services.Auth.logout();
                }
              } catch (e) {}
              location.reload();
            }
          }, 200);
          return;   // do NOT render the rest of the panel
        }
        // Server-side role re-verification: confirm the user's current
        // role in the database matches what local state says. Deferred
        // by 2 seconds so Supabase Auth has time to restore its session
        // on page refresh — otherwise RLS would return nothing,
        // confusing this check into thinking the role was revoked.
        //
        // Only forces logout on a CONFIRMED mismatch (row exists, role
        // is wrong). If the row can't be read (network/auth blip), the
        // panel stays open.
        if (App.Supabase && App.Supabase.client && sessionUser && sessionUser.auth_user_id) {
          setTimeout(function () {
            App.Supabase.client.from('users')
              .select('data')
              .eq('id', sessionUser.id)
              .maybeSingle()
              .then(function (res) {
                if (!res || res.error) return;       // can't read — assume still valid
                if (!res.data) return;               // row not visible to us — assume RLS hiccup
                var dbRow = res.data.data;
                var dbRole = dbRow && dbRow.role;
                if (dbRole && dbRole !== 'staff' && dbRole !== 'owner') {
                  console.warn('[StaffPanel] role mismatch — DB role:', dbRole, '— closing panel.');
                  panel.classList.remove('active');
                  if (typeof App.Services.Auth.logout === 'function') {
                    App.Services.Auth.logout();
                  }
                  location.reload();
                }
              })
              .catch(function () { /* network blip — keep panel open */ });
          }, 2000);
        }
        document.getElementById('staffPanelTitle').textContent =
          getUserRoleLabel(sessionUser) + ' - ' + (sessionUser.displayName || sessionUser.username || sessionUser.email || 'Staff Member');
        const nav = document.getElementById('staffNav');
        nav.innerHTML = '';
        // Section-only access: build the staff nav from the single source
        // of truth (window.__staffSectionDefs, populated when the staff
        // form was last opened) OR a default list if admin hasn't opened
        // the form yet this session. Either way, the navId field maps to
        // the SAME id renderAdminSection uses — so staff get the EXACT
        // admin view of every assigned section.
        const defaultDefs = [
          { key: 'dashboard',    navId: 'dashboard',    label: 'Dashboard' },
          { key: 'orders',       navId: 'orders',       label: 'Orders' },
          { key: 'reservations', navId: 'reservations', label: 'Reservations' },
          { key: 'requests',     navId: 'requests',     label: 'Requests' },
          { key: 'menu',         navId: 'menuMgmt',     label: 'Menu' },
          { key: 'offers',       navId: 'offersMgmt',   label: 'Offers' },
          { key: 'gallery',      navId: 'galleryMgmt',  label: 'Gallery' },
          { key: 'reviews',      navId: 'reviewsMgmt',  label: 'Reviews' },
          { key: 'customers',    navId: 'usersMgmt',    label: 'Customers' },
          { key: 'staff',        navId: 'staffMgmt',    label: 'Staff' },
          { key: 'settings',     navId: 'settings',     label: 'Settings' },
          // v88: Popup section. Must mirror the sectionDefs list in
          // the staff edit modal — without this fallback entry, staff
          // who logged in on a fresh browser session never see the
          // section in their sidebar even if admin granted permission.
          { key: 'popup',        navId: 'popupMgmt',    label: 'Popup' },
          // v92: About section
          { key: 'about',        navId: 'aboutMgmt',    label: 'About' }
        ];
        const sectionList = (Array.isArray(window.__staffSectionDefs) && window.__staffSectionDefs.length)
          ? window.__staffSectionDefs
          : defaultDefs;
        const accessKeys = getUserAccessibleSections(sessionUser) || [];
        const navAdded = new Set();
        sectionList.forEach((p) => {
          if (!accessKeys.includes(p.key)) return;
          if (navAdded.has(p.navId)) return;
          navAdded.add(p.navId);
          const li = document.createElement('li');
          decorateNavItem(li, p.label);
          li.dataset.target = p.navId;
          li.onclick = () => {
            setActiveNavItem('staffNav', p.navId);
            renderStaffSection(p.navId);
          };
          nav.appendChild(li);
        });
        // default first nav item active
        if (nav.firstChild) {
          nav.firstChild.classList.add('active');
          if (!consumePendingRealtimeSection('staffNav', renderStaffSection)) {
            renderStaffSection(nav.firstChild.dataset.target);
          }
        } else {
          // Staff has no accessible sections — show a friendly message
          var staffContent = document.getElementById('staffContent');
          if (staffContent) {
            staffContent.innerHTML =
              '<div style="padding:30px;text-align:center;color:#aaa;">' +
              '<h3 style="color:var(--accent);">No Sections Assigned</h3>' +
              '<p>You currently have no section access. Contact your administrator to be granted access.</p>' +
              '</div>';
          }
        }
        updateRealtimeDots();
        if (window.AFGRWorkspace) window.AFGRWorkspace.panelReady();
      }

      /** Render an admin section based on its ID */
      function renderAdminSection(sectionId) {
        const container = document.getElementById('adminContent');
        container.innerHTML = '';
        if (['orders', 'reservations', 'requests'].includes(sectionId)) {
          markSectionAsSeen(sectionId, true);
        } else {
          updateRealtimeDots();
        }
        switch (sectionId) {
          case 'dashboard':
            renderDashboardSection(container);
            break;
          case 'settings':
            renderSettingsSection(container);
            break;
          case 'menuMgmt':
            renderMenuManagement(container);
            break;
          case 'orders':
            renderOrdersSection(container, true);
            break;
          case 'reservations':
            renderReservationsSection(container, true);
            break;
          case 'requests':
            renderRequestsManagement(container);
            break;
          case 'offersMgmt':
            renderOffersManagement(container);
            break;
          case 'galleryMgmt':
            renderGalleryManagement(container);
            break;
          case 'reviewsMgmt':
            renderReviewsManagement(container);
            break;
          case 'staffMgmt':
            renderStaffManagement(container);
            break;
          case 'usersMgmt':
            renderUsersManagement(container);
            break;
          case 'popupMgmt':
            renderPopupSection(container);
            break;
          case 'aboutMgmt':
            renderAboutSection(container);
            break;
          default:
            container.textContent = 'Section not found.';
        }
      }

      /** Render a staff section based on permission mapping */
      function renderStaffSection(sectionId) {
        const container = document.getElementById('staffContent');
        container.innerHTML = '';
        if (['orders', 'reservations', 'requests'].includes(sectionId)) {
          markSectionAsSeen(sectionId, true);
        } else {
          updateRealtimeDots();
        }
        // Section-based access only: staff get the EXACT same render as
        // admin for every section they're assigned. No per-action gating
        // (e.g. previously orders were rendered read-only unless
        // user.permissions had 'updateOrderStatus' — that fragmentation
        // broke realtime visibility and is removed).
        switch (sectionId) {
          case 'dashboard':
            renderDashboardSection(container);
            break;
          case 'orders':
            renderOrdersSection(container, true);
            break;
          case 'reservations':
            renderReservationsSection(container, true);
            break;
          case 'requests':
            renderRequestsManagement(container);
            break;
          case 'menuMgmt':
          case 'menuEdit':              // legacy nav id alias
            renderMenuManagement(container);
            break;
          case 'offersMgmt':
            renderOffersManagement(container);
            break;
          case 'galleryMgmt':
            renderGalleryManagement(container);
            break;
          case 'reviewsMgmt':
            renderReviewsManagement(container);
            break;
          case 'usersMgmt':
            renderUsersManagement(container);
            break;
          case 'staffMgmt':
            renderStaffManagement(container);
            break;
          case 'settings':
            renderSettingsSection(container);
            break;
          case 'popupMgmt':
            renderPopupSection(container);
            break;
          case 'aboutMgmt':
            renderAboutSection(container);
            break;
          case 'menuView':              // legacy read-only menu (no longer assigned by default)
            renderMenuView(container);
            break;
          case 'notifications':         // legacy alias — was a duplicate of dashboard
            renderDashboardSection(container);
            break;
          default:
            container.textContent = 'No access to this section.';
        }
      }

      /** Render settings section allowing changes to basic configuration */
      /**
       * v85: Announcement Popup management — extracted from Settings
       * into its own dedicated sidebar section. Owns the device-specific
       * popup media uploads (desktop / tablet / mobile, image + video)
       * plus the master enable toggle. Has its own Save button that
       * persists ONLY the popup config — doesn't touch the rest of
       * cfg, so saving Settings and saving Popup are independent.
       */
      /**
       * v92: About page management. Admin can configure:
       *  - Master enabled toggle (hides the public section entirely)
       *  - Title + subtitle text
       *  - Banner image at the top (Storage upload)
       *  - Body text (multi-paragraph, blank-line separated)
       *  - Three feature cards (icon name + title + description each)
       *  - Optional secondary image
       *
       * Has its own Save button. Saving here doesn't touch anything
       * else in cfg — independent from Settings save.
       */
      function renderAboutSection(container) {
        const cfg = appState.config;
        // Ensure default shape exists (v93 uses single `image` field;
        // legacy bannerImage/midImage are still read for back-compat).
        if (!cfg.about) {
          cfg.about = {
            enabled: true,
            image: '',
            title: 'About Us',
            subtitle: 'Our Story',
            bodyText: '',
            features: [
              { icon: 'fa-utensils', title: '', description: '' },
              { icon: 'fa-leaf',     title: '', description: '' },
              { icon: 'fa-heart',    title: '', description: '' }
            ]
          };
        }
        const aboutCfg = cfg.about;
        // Resolve current image: prefer new `image`, then back-compat
        // bannerImage / midImage from v92 configs.
        const currentImage = aboutCfg.image || aboutCfg.bannerImage || aboutCfg.midImage || '';
        // Staged URL — null = no change, '' = removed
        let stagedImageUrl = null;
        let isAboutUploading = false;

        // Make sure features array has 3 slots
        if (!Array.isArray(aboutCfg.features)) aboutCfg.features = [];
        while (aboutCfg.features.length < 3) {
          aboutCfg.features.push({ icon: 'fa-circle', title: '', description: '' });
        }

        container.innerHTML = `
          <h3>About Page Management</h3>
          <p style="margin:0 0 16px 0;color:rgba(255,248,239,0.65);font-size:13px;line-height:1.5;">
            Customize the public About section. Upload one image, set the title and body copy, and configure three feature highlights.
          </p>

          <div class="notification-setting-card" style="margin-bottom:16px;">
            <div class="toggle-row">
              <span>Show About section on the public site</span>
              <label class="switch">
                <input type="checkbox" id="setAboutEnabled" ${aboutCfg.enabled !== false ? 'checked' : ''} />
                <span class="switch-slider"></span>
              </label>
            </div>
            <p class="announcement-settings-hint">When disabled, the About section is hidden from the homepage and the nav button.</p>
          </div>

          <div class="about-admin-grid">
            <div class="about-admin-card">
              <h5>Header</h5>
              <div class="form-group">
                <label for="setAboutSubtitle">Subtitle (kicker)</label>
                <input type="text" id="setAboutSubtitle" value="${escapeHtml(aboutCfg.subtitle || '')}" placeholder="e.g. Our Story" />
              </div>
              <div class="form-group">
                <label for="setAboutTitle">Title</label>
                <input type="text" id="setAboutTitle" value="${escapeHtml(aboutCfg.title || '')}" placeholder="e.g. About Us" />
              </div>
            </div>

            <div class="about-admin-card">
              <h5>Main Image</h5>
              <p style="margin:0 0 10px 0;color:rgba(255,248,239,0.55);font-size:12px;line-height:1.45;">
                One image displayed beside your About text. Recommended dimensions: roughly square (1:1) or portrait, ~1000×1000 px.
              </p>
              <div class="form-group">
                <label>Upload Image</label>
                <input type="file" id="setAboutImage" accept="image/png,image/jpeg,image/jpg,image/webp" />
              </div>
              <div id="aboutImagePreview" class="hero-media-preview-box">
                ${currentImage ? '<img src="' + escapeHtml(currentImage) + '" alt="About preview" style="max-width:100%;border-radius:8px;display:block;" />' : '<span style="color:rgba(255,248,239,0.4);font-size:12px;">No image uploaded yet</span>'}
              </div>
              <div class="hero-media-actions">
                <button type="button" class="btn" id="removeAboutImage">Remove Image</button>
              </div>
            </div>

            <div class="about-admin-card about-admin-card-full">
              <h5>Body Text</h5>
              <div class="form-group">
                <label for="setAboutBody">Main description (keep it concise — 2-3 short paragraphs)</label>
                <textarea id="setAboutBody" rows="6" placeholder="Tell your story briefly. Separate paragraphs with a blank line." style="width:100%;min-height:140px;resize:vertical;font-family:inherit;">${escapeHtml(aboutCfg.bodyText || '')}</textarea>
                <small style="display:block;margin-top:4px;color:rgba(255,248,239,0.45);font-size:11px;">
                  Tip: shorter is better. The About section is designed to fit one screen without scrolling.
                </small>
              </div>
            </div>

            <div class="about-admin-card about-admin-card-full">
              <h5>Feature Highlights (three)</h5>
              <p style="margin:0 0 12px 0;color:rgba(255,248,239,0.55);font-size:12px;">
                Three short highlights displayed as compact pills below the text. Icon names are FontAwesome solid icons (e.g. <code>fa-utensils</code>, <code>fa-leaf</code>, <code>fa-heart</code>, <code>fa-star</code>, <code>fa-fire</code>, <code>fa-award</code>).
              </p>
              <div class="about-features-admin-grid">
                ${[0, 1, 2].map(function (i) {
                  const f = aboutCfg.features[i] || {};
                  return `
                    <div class="about-feature-admin-card">
                      <strong style="display:block;margin-bottom:6px;color:var(--accent);font-size:12px;">Highlight ${i + 1}</strong>
                      <div class="form-group">
                        <label>Icon</label>
                        <input type="text" data-about-feature="${i}" data-about-field="icon" value="${escapeHtml(f.icon || '')}" placeholder="fa-utensils" />
                      </div>
                      <div class="form-group">
                        <label>Title</label>
                        <input type="text" data-about-feature="${i}" data-about-field="title" value="${escapeHtml(f.title || '')}" placeholder="e.g. Authentic" />
                      </div>
                      <div class="form-group">
                        <label>Short description</label>
                        <input type="text" data-about-feature="${i}" data-about-field="description" value="${escapeHtml(f.description || '')}" placeholder="One short line" />
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <div style="margin-top:18px;">
            <button class="btn" id="saveAboutSettings">Save About Page</button>
          </div>
        `;

        // Wire single image upload
        const imageInput = document.getElementById('setAboutImage');
        const imagePreview = document.getElementById('aboutImagePreview');
        const removeBtn = document.getElementById('removeAboutImage');
        if (imageInput) {
          imageInput.onchange = function () {
            const file = this.files && this.files[0];
            if (!file) return;
            if (!/^image\//.test(file.type || '')) {
              alert('Please upload an image (JPG, PNG, or WEBP).');
              this.value = '';
              return;
            }
            if (file.size > 8 * 1024 * 1024) {
              alert('Image exceeds 8 MB.');
              this.value = '';
              return;
            }
            isAboutUploading = true;
            const saveBtnEl = document.getElementById('saveAboutSettings');
            if (saveBtnEl) saveBtnEl.disabled = true;
            if (imagePreview) imagePreview.style.opacity = '0.55';
            window.resizeImageFileGeneric(file, 1400, 0.88)
              .then(function (blob) {
                return window.uploadImageToStorage(blob, 'hero', 'about_image', 'jpg');
              })
              .then(function (publicUrl) {
                stagedImageUrl = publicUrl;
                if (imagePreview) {
                  imagePreview.innerHTML = '<img src="' + publicUrl + '" alt="Preview" style="max-width:100%;border-radius:8px;display:block;" />';
                  imagePreview.style.opacity = '1';
                }
                isAboutUploading = false;
                if (saveBtnEl) saveBtnEl.disabled = false;
                console.info('[About upload] success:', publicUrl);
              })
              .catch(function (err) {
                console.error('[About upload] failed:', err);
                alert('Upload failed: ' + (err && err.message ? err.message : err));
                isAboutUploading = false;
                if (saveBtnEl) saveBtnEl.disabled = false;
                if (imagePreview) imagePreview.style.opacity = '1';
              });
          };
        }
        if (removeBtn) {
          removeBtn.onclick = function () {
            stagedImageUrl = '';
            if (imagePreview) {
              imagePreview.innerHTML = '<span style="color:rgba(255,248,239,0.4);font-size:12px;">No image uploaded yet</span>';
            }
          };
        }

        // Save handler
        const saveBtn = document.getElementById('saveAboutSettings');
        if (saveBtn) {
          saveBtn.onclick = function () {
            if (isAboutUploading) {
              alert('Please wait for upload to finish.');
              return;
            }
            try {
              cfg.about = cfg.about || {};
              const enabledToggle = document.getElementById('setAboutEnabled');
              cfg.about.enabled = !!(enabledToggle && enabledToggle.checked);
              cfg.about.title    = (document.getElementById('setAboutTitle')    || {}).value || '';
              cfg.about.subtitle = (document.getElementById('setAboutSubtitle') || {}).value || '';
              cfg.about.bodyText = (document.getElementById('setAboutBody')     || {}).value || '';
              // Single image — apply staged value if changed
              if (stagedImageUrl !== null) {
                cfg.about.image = stagedImageUrl;
                // Clear legacy fields so they don't override the new
                // single-image render path
                cfg.about.bannerImage = '';
                cfg.about.midImage = '';
              }
              // Feature cards
              if (!Array.isArray(cfg.about.features)) cfg.about.features = [];
              for (var i = 0; i < 3; i++) {
                cfg.about.features[i] = cfg.about.features[i] || {};
                container.querySelectorAll('[data-about-feature="' + i + '"]').forEach(function (el) {
                  const field = el.dataset.aboutField;
                  cfg.about.features[i][field] = el.value || '';
                });
              }
              if (!cfg.showSections) cfg.showSections = {};
              cfg.showSections.about = cfg.about.enabled;
              saveData();
              if (App.SupabaseSync && App.SupabaseSync.flushNow) {
                App.SupabaseSync.flushNow();
              }
              buildWebsite();
              window.showToast ? window.showToast('About page saved', 'success') : alert('About page saved');
            } catch (e) {
              console.error('[Save About] failed:', e);
              alert('Failed to save About page: ' + (e && e.message ? e.message : e));
            }
          };
        }
      }

      function renderPopupSection(container) {
        const cfg = appState.config;
        const announcementCfg = cfg.announcementPopup || {
          enabled: false,
          media: {
            desktop: { image: '', video: '' },
            tablet: { image: '', video: '' },
            mobile: { image: '', video: '' }
          }
        };
        const announcementMediaCfg = announcementCfg.media || {
          desktop: { image: '', video: '' },
          tablet: { image: '', video: '' },
          mobile: { image: '', video: '' }
        };
        // Staged uploads — null means "no change", string means
        // "replace with this URL" (Storage), '' means "remove this".
        let uploadedAnnouncementMedia = {
          desktop: { image: null, video: null },
          tablet: { image: null, video: null },
          mobile: { image: null, video: null }
        };
        let isPopupUploading = false;

        container.innerHTML = `
          <h3>Announcement Popup</h3>
          <p style="margin:0 0 16px 0;color:rgba(255,248,239,0.65);font-size:13px;line-height:1.5;">
            Show a promotional popup to customers the first time they land on the home page. Upload separate media for desktop, tablet, and mobile so each device gets the right aspect ratio. If no media is uploaded, the popup stays hidden automatically.
          </p>
          <div class="notification-setting-card" style="margin-bottom:16px;">
            <div class="toggle-row">
              <span>Show announcement popup on landing</span>
              <label class="switch">
                <input type="checkbox" id="setAnnouncementEnabled" ${announcementCfg.enabled !== false && ['desktop', 'tablet', 'mobile'].some((device) => (announcementMediaCfg[device] || {}).image || (announcementMediaCfg[device] || {}).video) ? 'checked' : ''} />
                <span class="switch-slider"></span>
              </label>
            </div>
            <p class="announcement-settings-hint">If no media is uploaded, the popup stays hidden automatically.</p>
          </div>
          <div class="announcement-settings-grid">
            <div class="announcement-settings-card">
              <h5>Desktop Popup Media</h5>
              <div class="form-group">
                <label>Upload Image Banner</label>
                <input type="file" id="setDesktopAnnouncementImage" accept="image/png,image/jpeg,image/jpg,image/webp" />
              </div>
              <div class="form-group">
                <label>Upload Video</label>
                <input type="file" id="setDesktopAnnouncementVideo" accept="video/mp4,video/webm" />
              </div>
              <div id="desktopAnnouncementMediaPreview" class="hero-media-preview-box"></div>
              <div class="hero-media-actions">
                <button type="button" class="btn" id="removeDesktopAnnouncementImage">Remove Image</button>
                <button type="button" class="btn" id="removeDesktopAnnouncementVideo">Remove Video</button>
              </div>
            </div>
            <div class="announcement-settings-card">
              <h5>Tablet Popup Media</h5>
              <div class="form-group">
                <label>Upload Image Banner</label>
                <input type="file" id="setTabletAnnouncementImage" accept="image/png,image/jpeg,image/jpg,image/webp" />
              </div>
              <div class="form-group">
                <label>Upload Video</label>
                <input type="file" id="setTabletAnnouncementVideo" accept="video/mp4,video/webm" />
              </div>
              <div id="tabletAnnouncementMediaPreview" class="hero-media-preview-box"></div>
              <div class="hero-media-actions">
                <button type="button" class="btn" id="removeTabletAnnouncementImage">Remove Image</button>
                <button type="button" class="btn" id="removeTabletAnnouncementVideo">Remove Video</button>
              </div>
            </div>
            <div class="announcement-settings-card">
              <h5>Mobile Popup Media</h5>
              <div class="form-group">
                <label>Upload Image Banner</label>
                <input type="file" id="setMobileAnnouncementImage" accept="image/png,image/jpeg,image/jpg,image/webp" />
              </div>
              <div class="form-group">
                <label>Upload Video</label>
                <input type="file" id="setMobileAnnouncementVideo" accept="video/mp4,video/webm" />
              </div>
              <div id="mobileAnnouncementMediaPreview" class="hero-media-preview-box"></div>
              <div class="hero-media-actions">
                <button type="button" class="btn" id="removeMobileAnnouncementImage">Remove Image</button>
                <button type="button" class="btn" id="removeMobileAnnouncementVideo">Remove Video</button>
              </div>
            </div>
          </div>
          <div style="margin-top:18px;">
            <button class="btn" id="savePopupSettings">Save Popup</button>
          </div>
        `;

        // Render preview for one device — shows the staged or saved URL
        function renderPopupPreview(device) {
          const preview = document.getElementById(device + 'AnnouncementMediaPreview');
          if (!preview) return;
          const saved = announcementMediaCfg[device] || { image: '', video: '' };
          const staged = uploadedAnnouncementMedia[device] || { image: null, video: null };
          preview.innerHTML = '';
          const imgUrl = staged.image !== null ? staged.image : saved.image;
          const vidUrl = staged.video !== null ? staged.video : saved.video;
          if (imgUrl) {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = 'Popup image preview';
            img.style.maxWidth = '100%';
            img.style.borderRadius = '8px';
            img.style.display = 'block';
            img.style.marginBottom = '8px';
            preview.appendChild(img);
          }
          if (vidUrl) {
            const vid = document.createElement('video');
            vid.src = vidUrl;
            vid.controls = true;
            vid.muted = true;
            vid.style.maxWidth = '100%';
            vid.style.borderRadius = '8px';
            preview.appendChild(vid);
          }
          if (!imgUrl && !vidUrl) {
            preview.innerHTML = '<span style="color:rgba(255,248,239,0.4);font-size:12px;">No media uploaded yet</span>';
          }
        }

        // Bind one file input (device × kind) — same flow as in v75
        function bindPopupInput(device, kind) {
          const input = document.getElementById(`set${device.charAt(0).toUpperCase() + device.slice(1)}Announcement${kind.charAt(0).toUpperCase() + kind.slice(1)}`);
          if (!input) return;
          input.onchange = function () {
            const file = this.files && this.files[0];
            if (!file) return;
            const isImage = kind === 'image';
            const validType = isImage
              ? /^image\/(png|jpeg|jpg|webp)/.test(file.type || '')
              : ['video/mp4', 'video/webm'].includes(file.type || '');
            if (!validType) {
              alert(isImage ? 'Please upload JPG, PNG, or WEBP image.' : 'Please upload MP4 or WEBM video.');
              this.value = '';
              return;
            }
            const maxSize = isImage ? 15 * 1024 * 1024 : 50 * 1024 * 1024;
            if (file.size > maxSize) {
              alert(isImage ? 'Image exceeds the maximum size of 15MB.' : 'Video exceeds the maximum size of 50MB.');
              this.value = '';
              return;
            }
            isPopupUploading = true;
            const saveBtnEl = document.getElementById('savePopupSettings');
            if (saveBtnEl) saveBtnEl.disabled = true;
            const prep = isImage
              ? window.resizeImageFileGeneric(file, 1600, 0.85)
              : Promise.resolve(file);
            prep
              .then(function (preparedBlob) {
                console.info('[Popup upload]', isImage ? 'compressed' : 'video',
                  'size:', preparedBlob.size, 'bytes — uploading to Storage...');
                const ext = isImage
                  ? 'jpg'
                  : ((file.name && file.name.split('.').pop()) || 'mp4').toLowerCase();
                return window.uploadImageToStorage(preparedBlob, 'announcement',
                  'announce_' + device + '_' + kind, ext);
              })
              .then(function (publicUrl) {
                uploadedAnnouncementMedia[device][kind] = publicUrl;
                renderPopupPreview(device);
                isPopupUploading = false;
                if (saveBtnEl) saveBtnEl.disabled = false;
              })
              .catch(function (err) {
                console.error('[Popup upload] failed:', err);
                alert('Upload failed: ' + (err.message || err)
                  + '\n\nMake sure you are logged in as admin and the network is stable.');
                isPopupUploading = false;
                if (saveBtnEl) saveBtnEl.disabled = false;
                renderPopupPreview(device);
              });
          };
        }

        // Bind remove buttons (device × kind)
        function bindPopupRemoval(device, kind) {
          const btn = document.getElementById(`remove${device.charAt(0).toUpperCase() + device.slice(1)}Announcement${kind.charAt(0).toUpperCase() + kind.slice(1)}`);
          if (!btn) return;
          btn.onclick = function () {
            uploadedAnnouncementMedia[device][kind] = '';   // empty string = "remove"
            announcementMediaCfg[device][kind] = '';
            renderPopupPreview(device);
          };
        }

        // Wire up all device × kind combinations
        ['desktop', 'tablet', 'mobile'].forEach(function (device) {
          renderPopupPreview(device);
          bindPopupInput(device, 'image');
          bindPopupInput(device, 'video');
          bindPopupRemoval(device, 'image');
          bindPopupRemoval(device, 'video');
        });

        // Save handler — writes ONLY the announcementPopup config, leaves
        // the rest of cfg untouched. Independent from Settings save.
        const saveBtn = document.getElementById('savePopupSettings');
        if (saveBtn) {
          saveBtn.onclick = function () {
            if (isPopupUploading) {
              alert('Please wait for upload to finish.');
              return;
            }
            try {
              cfg.announcementPopup = cfg.announcementPopup || {
                enabled: false,
                media: {
                  desktop: { image: '', video: '' },
                  tablet: { image: '', video: '' },
                  mobile: { image: '', video: '' }
                }
              };
              cfg.announcementPopup.media = cfg.announcementPopup.media || {
                desktop: { image: '', video: '' },
                tablet: { image: '', video: '' },
                mobile: { image: '', video: '' }
              };
              ['desktop', 'tablet', 'mobile'].forEach(function (device) {
                cfg.announcementPopup.media[device] = cfg.announcementPopup.media[device] || { image: '', video: '' };
                const stagedImg = uploadedAnnouncementMedia[device].image;
                const stagedVid = uploadedAnnouncementMedia[device].video;
                if (stagedImg !== null) cfg.announcementPopup.media[device].image = stagedImg;
                if (stagedVid !== null) cfg.announcementPopup.media[device].video = stagedVid;
              });
              const popupHasMedia = ['desktop', 'tablet', 'mobile'].some(function (device) {
                const entry = cfg.announcementPopup.media[device] || {};
                return !!(entry.image || entry.video);
              });
              const toggle = document.getElementById('setAnnouncementEnabled');
              cfg.announcementPopup.enabled = !!(toggle && toggle.checked && popupHasMedia);
              saveData();
              if (App.SupabaseSync && App.SupabaseSync.flushNow) {
                App.SupabaseSync.flushNow();
              }
              buildWebsite();
              window.showToast ? window.showToast('Popup saved', 'success') : alert('Popup saved');
            } catch (saveErr) {
              console.error('[Save Popup] failed:', saveErr);
              alert('Failed to save popup: ' + (saveErr && saveErr.message ? saveErr.message : saveErr));
            }
          };
        }
      }

      function renderSettingsSection(container) {
        const cfg = appState.config;
        const currentSettingsUser = getCurrentSessionUser();
        // Detect admin context: either session is explicitly admin, OR
        // the container is inside the admin panel (works even if session
        // is null/loading — admin panel can only be opened by admin).
        // This guarantees admin sees notification toggles even on slow
        // session restore.
        const adminPanelEl = document.getElementById('adminPanel');
        const inAdminPanel = !!(adminPanelEl && adminPanelEl.classList.contains('active') && container && adminPanelEl.contains(container));
        const isAdminSettings = !!(currentSettingsUser && currentSettingsUser.role === 'admin') || inAdminPanel;
        console.info('[Settings] render — session role:', currentSettingsUser && currentSettingsUser.role,
                     '| in admin panel:', inAdminPanel, '| isAdminSettings:', isAdminSettings);
        const form = document.createElement('div');
        const heroMediaCfg = cfg.heroBackgroundMedia || {
          desktop: { image: '', video: '' },
          tablet: { image: '', video: '' },
          mobile: { image: '', video: '' }
        };
        let uploadedHeroMedia = {
          desktop: { image: null, video: null },
          tablet: { image: null, video: null },
          mobile: { image: null, video: null }
        };
        const announcementCfg = cfg.announcementPopup || {
          enabled: false,
          media: {
            desktop: { image: '', video: '' },
            tablet: { image: '', video: '' },
            mobile: { image: '', video: '' }
          }
        };
        const announcementMediaCfg = announcementCfg.media || {
          desktop: { image: '', video: '' },
          tablet: { image: '', video: '' },
          mobile: { image: '', video: '' }
        };
        let uploadedAnnouncementMedia = {
          desktop: { image: null, video: null },
          tablet: { image: null, video: null },
          mobile: { image: null, video: null }
        };
        // Flag to track whether any file is currently uploading (reading).  This prevents saving until reading completes.
        let isUploading = false;
        form.innerHTML = `
          <h3>Site Settings</h3>

          ${isAdminSettings ? `
          <!-- ADMIN NOTIFICATION CONTROLS — placed at the very top of
               Settings so they're the first thing admin sees. Master
               toggle + three per-section toggles + test button. -->
          <div class="admin-notif-section-block" id="adminNotifBlockTop">
            <div class="admin-notif-block-head">
              <div>
                <h5>🔔 Admin Panel Notifications</h5>
                <p>Enable alerts for your admin account. Saved per-user and synced across all your devices.</p>
              </div>
              <label class="switch" title="Master switch — disable to silence ALL alerts for your account">
                <input type="checkbox" id="adminNotifMaster" data-notif-master />
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="admin-notif-pref-list" id="adminNotifPerSection">
              <div class="toggle-row">
                <span>
                  <strong>Enable Order Notifications</strong>
                  <small>Ringtone + banner + red dot for new orders.</small>
                </span>
                <label class="switch">
                  <input type="checkbox" id="adminNotifOrders" data-notif-section="orders" />
                  <span class="switch-slider"></span>
                </label>
              </div>
              <div class="toggle-row">
                <span>
                  <strong>Enable Reservation Notifications</strong>
                  <small>Ringtone + banner + red dot for new reservations.</small>
                </span>
                <label class="switch">
                  <input type="checkbox" id="adminNotifReservations" data-notif-section="reservations" />
                  <span class="switch-slider"></span>
                </label>
              </div>
              <div class="toggle-row">
                <span>
                  <strong>Enable Request Notifications</strong>
                  <small>Ringtone + banner + red dot for new customer requests.</small>
                </span>
                <label class="switch">
                  <input type="checkbox" id="adminNotifRequests" data-notif-section="requests" />
                  <span class="switch-slider"></span>
                </label>
              </div>
            </div>
            <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
              <button class="btn" id="adminNotifTestBtn" type="button">🔔 Test In-App Alert</button>
              <small style="color:rgba(255,248,239,0.55);font-size:11px;line-height:1.5;align-self:center;">Checks the on-screen banner and ringtone only—not background push.</small>
            </div>
          </div>
          ` : ''}

          <div class="form-group">
            <label>Restaurant Name</label>
            <input type="text" id="setName" value="${cfg.restaurantName}" />
          </div>
          <!-- v238: hero tagline boxes + tagline fonts removed -->
          <!-- Logo upload field -->
          <div class="form-group">
            <label>Logo</label>
            <input type="file" id="setLogo" accept="image/*" />
            <div style="margin-top:10px;">
              <img id="logoPreview" src="${cfg.logo || 'assets/logo.png'}" style="height:60px;border-radius:50%; border:1px solid #444;" alt="Logo preview" />
            </div>
          </div>
          <div class="form-group">
            <label>Top Bar Text</label>
            <input type="text" id="setTopBarText" value="${cfg.topBarText || ''}" />
          </div>
          <div class="form-group">
            <label>Order Address Note</label>
            <textarea id="setAddressNote" rows="3" style="width:100%;" placeholder="e.g. We currently deliver only inside Dubai. Outside-Dubai orders will not be processed.">${escapeHtml(cfg.addressNote || '')}</textarea>
            <small style="display:block;margin-top:4px;color:#aaa;font-size:12px;">
              Shown to customers above the delivery address field during checkout.
              Use this to communicate service areas, delivery limits, or address instructions.
            </small>
          </div>
          <!-- Pricing configuration fields -->
          <h4>Pricing & Discounts</h4>
          <div class="form-group">
            <label>Delivery Fee (AED)</label>
            <input type="number" id="setDeliveryFee" min="0" step="0.01" value="${cfg.deliveryFee}" />
          </div>
          <div class="form-group">
            <label>Tax (AED)</label>
            <input type="number" id="setTaxRate" min="0" step="0.01" value="${cfg.taxRate}" />
          </div>
          ${isAdminSettings ? `
          <h4>Realtime Notifications</h4>
          <div id="browserNotificationStatus" style="margin-bottom:12px;"></div>

          <!-- (Admin Panel Notifications block moved to top of Settings) -->

          <div class="notification-settings-grid">
            <div class="notification-setting-card">
              <h5>Site-Wide Sound</h5>
              <p>Global ringtone control that applies to all admin and staff devices.</p>
              <div class="toggle-row">
                <span>Enable Notification Sound (site-wide)</span>
                <label class="switch">
                  <input type="checkbox" id="setNotificationSound" ${cfg.notifications && cfg.notifications.soundEnabled !== false ? 'checked' : ''} />
                  <span class="switch-slider"></span>
                </label>
              </div>
            </div>
            <div class="notification-setting-card">
              <h5>Upload Notification Tone</h5>
              <p>Supported formats: MP3 and WAV. This tone plays for order, reservation, and request alerts.</p>
              <input type="file" id="setNotificationToneFile" accept="audio/mpeg,audio/mp3,audio/wav,.mp3,.wav" />
              <div class="hero-media-actions">
                <button class="btn" id="removeNotificationToneBtn" type="button">Remove Tone</button>
              </div>
              <div id="notificationTonePreview" class="hero-media-preview-box"></div>
            </div>
          </div>` : ''}
          <div style="margin: 10px 0;">
            <button class="btn" id="changePasswordBtn">Change Password</button>
          </div>
          <!-- About fields removed -->
          <h4>Contact</h4>
          <div class="form-group">
            <label>Phone</label>
            <input type="text" id="setPhone" value="${cfg.contact.phone}" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="text" id="setEmail" value="${cfg.contact.email}" />
          </div>
          <div class="form-group">
            <label>Address</label>
            <input type="text" id="setAddress" value="${cfg.contact.address}" />
          </div>
          <div class="form-group">
            <label>Open Hours</label>
            <input type="text" id="setOpenHours" value="${cfg.contact.openHours}" />
          </div>
          <div class="form-group">
            <label>WhatsApp</label>
            <input type="text" id="setWhatsApp" value="${cfg.contact.whatsapp}" />
          </div>
          <div class="form-group">
            <label>Map Link</label>
            <input type="text" id="setMap" value="${cfg.contact.map}" />
          </div>
          <h4>Social Links</h4>
          <div class="form-group">
            <label>Facebook</label>
            <input type="text" id="setFacebook" value="${cfg.contact.socials?.facebook || ''}" />
          </div>
          <div class="form-group">
            <label>Instagram</label>
            <input type="text" id="setInstagram" value="${cfg.contact.socials?.instagram || ''}" />
          </div>
          <div class="form-group">
            <label>TikTok</label>
            <input type="text" id="setTikTok" value="${cfg.contact.socials?.tiktok || ''}" />
          </div>
          <h4>Developer Info Settings</h4>
          <div class="form-group">
            <label>Name</label>
            <input type="text" id="setDeveloperName" value="${cfg.developerInfo?.name || ''}" />
          </div>
          <div class="form-group">
            <label>Profile Image Upload</label>
            <input type="file" id="setDeveloperProfileImage" accept="image/*" />
            <div style="margin-top:10px;">
              <img id="developerProfilePreview" src="${cfg.developerInfo?.profileImage || ''}" style="${cfg.developerInfo?.profileImage ? '' : 'display:none;'}height:70px;width:70px;object-fit:cover;border-radius:50%;border:1px solid #444;" alt="Developer profile preview" />
            </div>
          </div>
          <div class="form-group">
            <label>Short Intro</label>
            <textarea id="setDeveloperIntro" rows="2">${cfg.developerInfo?.intro || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="text" id="setDeveloperEmail" value="${cfg.developerInfo?.email || ''}" />
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="text" id="setDeveloperPhone" value="${cfg.developerInfo?.phone || cfg.developerContact || ''}" />
          </div>
          <div class="form-group">
            <label>LinkedIn URL</label>
            <input type="text" id="setDeveloperLinkedIn" value="${cfg.developerInfo?.links?.linkedin || ''}" placeholder="https://linkedin.com/in/yourprofile" />
          </div>

          <h4>Legal Documents</h4>
          <p style="margin:0 0 12px 0;color:rgba(255,248,239,0.55);font-size:12px;line-height:1.45;">
            Paste your Privacy Policy and Terms of Service text below. The Privacy Policy and Terms of Service links in the site footer open these documents on dedicated pages. If left blank, customers see a "not published yet" placeholder.
          </p>
          <div class="form-group">
            <label for="setPrivacyPolicy">Privacy Policy</label>
            <textarea id="setPrivacyPolicy" rows="8" placeholder="Paste your full Privacy Policy text here..." style="width:100%;min-height:160px;resize:vertical;font-family:inherit;">${escapeHtml(cfg.legal?.privacyPolicy || '')}</textarea>
            <small style="display:block;margin-top:4px;color:rgba(255,248,239,0.45);font-size:11px;">
              Tip: separate paragraphs with a blank line. Line breaks inside a paragraph are preserved.
            </small>
          </div>
          <div class="form-group">
            <label for="setTermsOfService">Terms of Service</label>
            <textarea id="setTermsOfService" rows="8" placeholder="Paste your full Terms of Service text here..." style="width:100%;min-height:160px;resize:vertical;font-family:inherit;">${escapeHtml(cfg.legal?.termsOfService || '')}</textarea>
            <small style="display:block;margin-top:4px;color:rgba(255,248,239,0.45);font-size:11px;">
              Same formatting rule as above.
            </small>
          </div>

          <!-- v238: theme colours removed -->
          <h4>Reports</h4>
          <div class="form-group">
            <label>Report View Mode</label>
            <select id="reportViewMode">
              <option value="order"${cfg.reportViewMode === 'customer' ? '' : ' selected'}>Order-wise View</option>
              <option value="customer"${cfg.reportViewMode === 'customer' ? ' selected' : ''}>Customer-wise Grouped View</option>
            </select>
          </div>
          <!-- v238: hero background settings removed -->
          <button class="btn" id="saveSettings">Save Settings</button>
        `;
        container.appendChild(form);
        // Handle logo file upload: update configuration and preview instantly
        (function () {
          const logoInput = form.querySelector('#setLogo');
          const logoPreview = form.querySelector('#logoPreview');
          if (logoInput) {
            logoInput.addEventListener('change', async function () {
              const file = this.files && this.files[0];
              if (!file) return;
              // Validate file type
              if (!/^image\//.test(file.type || '')) {
                alert('Please upload an image file (JPG, PNG, or WEBP).');
                this.value = '';
                return;
              }
              if (file.size > 5 * 1024 * 1024) {
                alert('Logo image must be under 5 MB.');
                this.value = '';
                return;
              }
              // Show "uploading" state on the preview
              const origPreviewSrc = logoPreview ? logoPreview.src : '';
              if (logoPreview) logoPreview.style.opacity = '0.5';
              try {
                // Logo is typically displayed at ~60-80px so 400px max
                // edge is plenty sharp. Smaller than menu/hero (1200px).
                const blob = await window.resizeImageFileGeneric(file, 400, 0.9);
                const publicUrl = await window.uploadImageToStorage(
                  blob, 'hero', 'logo', 'jpg'
                );
                cfg.logo = publicUrl;
                if (logoPreview) {
                  logoPreview.src = publicUrl;
                  logoPreview.style.opacity = '1';
                }
                const siteLogoEl = document.getElementById('site-logo');
                if (siteLogoEl) siteLogoEl.src = publicUrl;
                // saveData() persists the URL string (~100 bytes) to
                // localStorage, then SupabaseSync publishes the new
                // config row so other devices receive the URL via the
                // realtime subscription on app_config.
                saveData();
                if (App.SupabaseSync && App.SupabaseSync.flushNow) {
                  App.SupabaseSync.flushNow();
                }
                buildWebsite();
                console.info('[Logo upload] success:', publicUrl);
              } catch (err) {
                console.error('[Logo upload] failed:', err);
                if (logoPreview) {
                  logoPreview.style.opacity = '1';
                  logoPreview.src = origPreviewSrc;
                }
                alert('Logo upload failed: ' + (err.message || err)
                  + '\n\nMake sure you are logged in as admin and the network is stable.');
              }
            });
          }
        })();
        // ================================================================
        // Hero media: image compression + Supabase Storage upload helpers
        // ================================================================
        // Why these exist: previously hero images/videos were base64-encoded
        // and stored inline in appState.config.heroBackgroundMedia, which
        // gets persisted to localStorage as a giant JSON blob. A typical
        // phone photo (4 MB raw) becomes ~5.3 MB base64 — combined with
        // the rest of appState, this blows past the browser's 5-10 MB
        // localStorage limit and triggers a QuotaExceededError, blocking
        // both local persistence AND Supabase publish.
        //
        // New approach:
        //   1. Resize image client-side to 1920px wide max @ JPEG q=0.85
        //   2. Upload the compressed Blob to the 'hero' Storage bucket
        //   3. Store ONLY the public URL in config (~100 bytes)
        //
        // Videos: uploaded as-is (no compression — that's too heavy for
        // the browser to do client-side) but to Storage, not localStorage.
        // ================================================================

        // Resize an image file to a target max dimension. Returns a Blob
        // (compressed JPEG by default) suitable for upload.
        function resizeImageFile(file, maxDimension, quality) {
          maxDimension = maxDimension || 1920;
          quality      = quality      || 0.85;
          return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function (e) {
              var img = new Image();
              img.onload = function () {
                var w = img.width, h = img.height;
                // Don't upscale — only shrink. If image is already smaller
                // than maxDimension in both dimensions, keep original size.
                if (w > maxDimension || h > maxDimension) {
                  if (w >= h) {
                    h = Math.round(h * (maxDimension / w));
                    w = maxDimension;
                  } else {
                    w = Math.round(w * (maxDimension / h));
                    h = maxDimension;
                  }
                }
                var canvas = document.createElement('canvas');
                canvas.width  = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob(function (blob) {
                  if (!blob) return reject(new Error('Image compression failed'));
                  resolve(blob);
                }, 'image/jpeg', quality);
              };
              img.onerror = function () { reject(new Error('Image decode failed')); };
              img.src = e.target.result;
            };
            reader.onerror = function () { reject(new Error('File read failed')); };
            reader.readAsDataURL(file);
          });
        }

        // Upload a Blob/File to the 'hero' Supabase Storage bucket and
        // return its public URL. Filename includes device + kind + a
        // timestamp so overwrites are explicit (no conflicts).
        async function uploadHeroMediaToStorage(blobOrFile, device, kind, extension) {
          if (!App.Supabase || !App.Supabase.client) {
            throw new Error('Supabase client not ready');
          }
          var ext = extension || (kind === 'video' ? 'mp4' : 'jpg');
          var filename = device + '_' + kind + '_' + Date.now() + '.' + ext;
          var res = await App.Supabase.client.storage
            .from('hero')
            .upload(filename, blobOrFile, {
              cacheControl: '3600',
              upsert: true,
              contentType: blobOrFile.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg')
            });
          if (res.error) {
            console.error('[Hero upload] storage upload failed', res.error);
            throw res.error;
          }
          var pubRes = App.Supabase.client.storage.from('hero').getPublicUrl(filename);
          var publicUrl = (pubRes && pubRes.data && pubRes.data.publicUrl) || '';
          if (!publicUrl) throw new Error('Could not resolve public URL');
          console.info('[Hero upload] success:', filename, '→', publicUrl);
          return publicUrl;
        }

        function renderHeroMediaPreview(device) {
          const preview = document.getElementById(device + 'HeroMediaPreview');
          if (!preview) return;
          const saved = heroMediaCfg[device] || { image: '', video: '' };
          const staged = uploadedHeroMedia[device] || { image: null, video: null };
          preview.innerHTML = '';
          const videoSrc = staged.video !== null ? staged.video : (saved.video || '');
          const imageSrc = staged.image !== null ? staged.image : (saved.image || '');
          if (videoSrc) {
            const video = document.createElement('video');
            video.src = videoSrc;
            video.muted = true;
            video.loop = true;
            video.autoplay = true;
            video.playsInline = true;
            preview.appendChild(video);
          }
          if (imageSrc) {
            const img = document.createElement('img');
            img.src = imageSrc;
            img.alt = device + ' hero preview';
            preview.appendChild(img);
          }
          if (!videoSrc && !imageSrc) {
            const empty = document.createElement('div');
            empty.style.color = 'rgba(255,246,232,.62)';
            empty.style.fontSize = '13px';
            empty.textContent = device === 'mobile'
              ? 'Uses tablet, then desktop as fallback.'
              : (device === 'tablet' ? 'Uses desktop background as fallback.' : 'Uses tablet, then mobile if desktop is missing.');
            preview.appendChild(empty);
          }
        }

        function bindHeroMediaInput(device, kind) {
          const input = document.getElementById(`set${device.charAt(0).toUpperCase() + device.slice(1)}Hero${kind.charAt(0).toUpperCase() + kind.slice(1)}`);
          if (!input) return;
          input.onchange = function () {
            const file = this.files && this.files[0];
            if (!file) return;
            const isImage = kind === 'image';
            const validType = isImage ? /^image\/(png|jpeg|jpg)/.test(file.type || '') : (file.type || '') === 'video/mp4';
            if (!validType) {
              alert(isImage ? 'Please upload JPG or PNG image.' : 'Please upload MP4 video.');
              this.value = '';
              return;
            }
            const maxSize = isImage ? 15 * 1024 * 1024 : 50 * 1024 * 1024;
            if (file.size > maxSize) {
              alert(isImage ? 'Image exceeds the maximum size of 15MB.' : 'Video exceeds the maximum size of 50MB.');
              this.value = '';
              return;
            }
            isUploading = true;
            const saveBtnEl = document.getElementById('saveSettings');
            if (saveBtnEl) saveBtnEl.disabled = true;
            // Show "Uploading..." state on the file input row
            const previewEl = document.getElementById(device + 'HeroMediaPreview');
            if (previewEl) {
              previewEl.innerHTML = '<div style="padding:10px;color:rgba(255,248,239,0.65);font-size:13px;">Uploading ' + kind + '... please wait.</div>';
            }
            // NEW UPLOAD FLOW (v66):
            //   - Image: resize to ≤1920px @ JPEG q=0.85, then upload to
            //     the 'hero' Supabase Storage bucket. Saves ~13× file size.
            //   - Video: upload as-is (compression in-browser is impractical),
            //     also to Storage. Max 50MB enforced by bucket policy.
            //   - Result: localStorage stays small (just URLs), no quota
            //     errors, and sync to other devices works reliably.
            var prep = isImage
              ? resizeImageFile(file, 1920, 0.85)
              : Promise.resolve(file);
            prep
              .then(function (preparedBlob) {
                console.info('[Hero upload]', isImage ? 'compressed' : 'video',
                  'size:', preparedBlob.size, 'bytes — uploading to Storage...');
                var ext = (file.name && file.name.split('.').pop()) || (isImage ? 'jpg' : 'mp4');
                return uploadHeroMediaToStorage(preparedBlob, device, kind, ext.toLowerCase());
              })
              .then(function (publicUrl) {
                // Store the PUBLIC URL (not base64). Tiny string, fits in
                // localStorage easily, served fast by Supabase Storage CDN.
                uploadedHeroMedia[device][kind] = publicUrl;
                renderHeroMediaPreview(device);
                isUploading = false;
                if (saveBtnEl) saveBtnEl.disabled = false;
              })
              .catch(function (err) {
                console.error('[Hero upload] failed:', err);
                alert('Upload failed: ' + (err.message || err)
                  + '\n\nMake sure you are logged in as admin and the network is stable.');
                isUploading = false;
                if (saveBtnEl) saveBtnEl.disabled = false;
                renderHeroMediaPreview(device);
              });
          };
        }

        function bindHeroMediaRemoval(device, kind) {
          const button = document.getElementById(`remove${device.charAt(0).toUpperCase() + device.slice(1)}Hero${kind.charAt(0).toUpperCase() + kind.slice(1)}`);
          if (!button) return;
          button.onclick = function () {
            uploadedHeroMedia[device][kind] = '';
            heroMediaCfg[device][kind] = '';
            const input = document.getElementById(`set${device.charAt(0).toUpperCase() + device.slice(1)}Hero${kind.charAt(0).toUpperCase() + kind.slice(1)}`);
            if (input) input.value = '';
            renderHeroMediaPreview(device);
          };
        }

        ['desktop', 'tablet', 'mobile'].forEach((device) => {
          renderHeroMediaPreview(device);
          bindHeroMediaInput(device, 'image');
          bindHeroMediaInput(device, 'video');
          bindHeroMediaRemoval(device, 'image');
          bindHeroMediaRemoval(device, 'video');
        });

        function renderAnnouncementMediaPreview(device) {
          const preview = document.getElementById(device + 'AnnouncementMediaPreview');
          if (!preview) return;
          const saved = announcementMediaCfg[device] || { image: '', video: '' };
          const staged = uploadedAnnouncementMedia[device] || { image: null, video: null };
          preview.innerHTML = '';
          const videoSrc = staged.video !== null ? staged.video : (saved.video || '');
          const imageSrc = staged.image !== null ? staged.image : (saved.image || '');
          if (videoSrc) {
            const video = document.createElement('video');
            video.src = videoSrc;
            video.muted = true;
            video.loop = true;
            video.autoplay = true;
            video.playsInline = true;
            video.controls = true;
            preview.appendChild(video);
          }
          if (imageSrc) {
            const img = document.createElement('img');
            img.src = imageSrc;
            img.alt = device + ' announcement preview';
            preview.appendChild(img);
          }
          if (!videoSrc && !imageSrc) {
            const empty = document.createElement('div');
            empty.style.color = 'rgba(255,246,232,.62)';
            empty.style.fontSize = '13px';
            empty.textContent = device === 'mobile'
              ? 'Uses tablet, then desktop media as fallback.'
              : (device === 'tablet' ? 'Uses desktop popup media as fallback.' : 'Uses tablet, then mobile if desktop is missing.');
            preview.appendChild(empty);
          }
        }

        function bindAnnouncementMediaInput(device, kind) {
          const input = document.getElementById(`set${device.charAt(0).toUpperCase() + device.slice(1)}Announcement${kind.charAt(0).toUpperCase() + kind.slice(1)}`);
          if (!input) return;
          input.onchange = function () {
            const file = this.files && this.files[0];
            if (!file) return;
            const isImage = kind === 'image';
            const validType = isImage
              ? /^image\/(png|jpeg|jpg|webp)/.test(file.type || '')
              : ['video/mp4', 'video/webm'].includes(file.type || '');
            if (!validType) {
              alert(isImage ? 'Please upload JPG, PNG, or WEBP image.' : 'Please upload MP4 or WEBM video.');
              this.value = '';
              return;
            }
            // With Storage backing we can allow larger files (50 MB bucket limit for video)
            const maxSize = isImage ? 15 * 1024 * 1024 : 50 * 1024 * 1024;
            if (file.size > maxSize) {
              alert(isImage ? 'Image exceeds the maximum size of 15MB.' : 'Video exceeds the maximum size of 50MB.');
              this.value = '';
              return;
            }
            isUploading = true;
            const saveBtnEl = document.getElementById('saveSettings');
            if (saveBtnEl) saveBtnEl.disabled = true;
            // NEW (v75): announcement media uploads to Supabase 'announcement'
            // Storage bucket instead of base64 in config. Mirrors the v66 hero
            // upload + v72 menu upload pattern. Image resized client-side;
            // video uploaded as-is.
            var prep = isImage
              ? window.resizeImageFileGeneric(file, 1600, 0.85)
              : Promise.resolve(file);
            prep
              .then(function (preparedBlob) {
                console.info('[Announcement upload]', isImage ? 'compressed' : 'video',
                  'size:', preparedBlob.size, 'bytes — uploading to Storage...');
                var ext = isImage
                  ? 'jpg'
                  : ((file.name && file.name.split('.').pop()) || 'mp4').toLowerCase();
                return window.uploadImageToStorage(preparedBlob, 'announcement',
                  'announce_' + device + '_' + kind, ext);
              })
              .then(function (publicUrl) {
                uploadedAnnouncementMedia[device][kind] = publicUrl;
                renderAnnouncementMediaPreview(device);
                isUploading = false;
                if (saveBtnEl) saveBtnEl.disabled = false;
              })
              .catch(function (err) {
                console.error('[Announcement upload] failed:', err);
                alert('Upload failed: ' + (err.message || err)
                  + '\n\nMake sure you are logged in as admin and the network is stable.');
                isUploading = false;
                if (saveBtnEl) saveBtnEl.disabled = false;
                renderAnnouncementMediaPreview(device);
              });
          };
        }

        function bindAnnouncementMediaRemoval(device, kind) {
          const button = document.getElementById(`remove${device.charAt(0).toUpperCase() + device.slice(1)}Announcement${kind.charAt(0).toUpperCase() + kind.slice(1)}`);
          if (!button) return;
          button.onclick = function () {
            uploadedAnnouncementMedia[device][kind] = '';
            announcementMediaCfg[device][kind] = '';
            const input = document.getElementById(`set${device.charAt(0).toUpperCase() + device.slice(1)}Announcement${kind.charAt(0).toUpperCase() + kind.slice(1)}`);
            if (input) input.value = '';
            renderAnnouncementMediaPreview(device);
          };
        }

        if (isAdminSettings) {
          ['desktop', 'tablet', 'mobile'].forEach((device) => {
            renderAnnouncementMediaPreview(device);
            bindAnnouncementMediaInput(device, 'image');
            bindAnnouncementMediaInput(device, 'video');
            bindAnnouncementMediaRemoval(device, 'image');
            bindAnnouncementMediaRemoval(device, 'video');
          });
        }

        let uploadedDeveloperProfileImageData = cfg.developerInfo?.profileImage || '';
        let uploadedNotificationToneData = isAdminSettings && cfg.notifications ? (cfg.notifications.toneUrl || '') : '';
        const developerProfileInput = form.querySelector('#setDeveloperProfileImage');
        const developerProfilePreview = form.querySelector('#developerProfilePreview');
        if (developerProfileInput) {
          developerProfileInput.onchange = function () {
            const file = this.files && this.files[0];
            if (!file) return;
            if (!file.type || !file.type.startsWith('image/')) {
              alert('Unsupported image format. Please select an image file.');
              this.value = '';
              return;
            }
            const reader = new FileReader();
            reader.onload = function (ev) {
              uploadedDeveloperProfileImageData = ev.target.result;
              if (developerProfilePreview) {
                developerProfilePreview.src = uploadedDeveloperProfileImageData;
                developerProfilePreview.style.display = 'block';
              }
            };
            reader.onerror = function () {
              alert('Failed to read developer profile image.');
              developerProfileInput.value = '';
            };
            reader.readAsDataURL(file);
          };
        }
        function renderNotificationTonePreview() {
          const preview = document.getElementById('notificationTonePreview');
          if (!preview) return;
          preview.innerHTML = '';
          if (!uploadedNotificationToneData) {
            const empty = document.createElement('div');
            empty.style.color = 'rgba(255,246,232,.62)';
            empty.style.fontSize = '13px';
            empty.textContent = 'No custom tone uploaded.';
            preview.appendChild(empty);
            return;
          }
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.src = uploadedNotificationToneData;
          preview.appendChild(audio);
        }
        if (isAdminSettings) {
          renderNotificationTonePreview();
          const toneInput = document.getElementById('setNotificationToneFile');
          const removeToneBtn = document.getElementById('removeNotificationToneBtn');
          if (toneInput) {
            toneInput.onchange = function () {
              const file = this.files && this.files[0];
              if (!file) return;
              const validType = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav'].includes(file.type || '') || /\.(mp3|wav)$/i.test(file.name || '');
              if (!validType) {
                alert('Please upload MP3 or WAV file.');
                this.value = '';
                return;
              }
              if (file.size > 6 * 1024 * 1024) {
                alert('Tone exceeds the maximum size of 6MB.');
                this.value = '';
                return;
              }
              isUploading = true;
              const saveBtnEl = document.getElementById('saveSettings');
              if (saveBtnEl) saveBtnEl.disabled = true;
              const reader = new FileReader();
              reader.onload = function (ev) {
                uploadedNotificationToneData = ev.target.result;
                renderNotificationTonePreview();
                isUploading = false;
                if (saveBtnEl) saveBtnEl.disabled = false;
              };
              reader.onerror = function () {
                alert('Failed to read tone file.');
                isUploading = false;
                if (saveBtnEl) saveBtnEl.disabled = false;
              };
              reader.readAsDataURL(file);
            };
          }
          if (removeToneBtn) {
            removeToneBtn.onclick = function () {
              uploadedNotificationToneData = '';
              if (toneInput) toneInput.value = '';
              renderNotificationTonePreview();
            };
          }
        }
        document.getElementById('saveSettings').onclick = () => {
          // Prevent saving while files are still uploading
          if (isUploading) {
            alert('Please wait for file upload to finish.');
            return;
          }
          // Defensive helper: returns the trimmed value of an input by id,
          // or fallback if the element doesn't exist. Prevents the save
          // handler from throwing "Cannot read properties of null" when a
          // form field is missing (e.g. if a recent code change removed
          // a field but didn't update the save handler).
          const _v = function (id, fallback) {
            const el = document.getElementById(id);
            if (!el) {
              console.warn('[Save Settings] field missing:', id, '— using fallback');
              return fallback !== undefined ? fallback : '';
            }
            return (el.value || '').trim();
          };
          try {
          cfg.restaurantName = _v('setName', cfg.restaurantName || '');
          // Keep saved brand typography unchanged; no font/style controls in Settings.
          // Save main and sub taglines separately so the hero can display both independently
          var _mtEl = document.getElementById('setMainTagline'); if (_mtEl) cfg.mainTagline = _mtEl.value;
          var _stEl = document.getElementById('setSubTagline'); if (_stEl) cfg.subTagline = _stEl.value;
          // Save main tagline font and size from the admin controls.  These fields
          // allow administrators to choose a premium Arabic typeface and control the size
          // of the main headline in the hero.  Store the values in the configuration
          // so they persist and apply immediately when the site rebuilds.
          const mtFontEl = document.getElementById('setMainTaglineFont');
          const mtSizeEl = document.getElementById('setMainTaglineFontSize');
          if (mtFontEl) {
            cfg.mainTaglineFont = mtFontEl.value;
          }
          if (mtSizeEl) {
            const sizeVal = parseInt(mtSizeEl.value, 10);
            // Clamp to sensible bounds to prevent absurd sizes
            cfg.mainTaglineFontSize = isNaN(sizeVal) ? 32 : Math.min(Math.max(sizeVal, 18), 72);
          }
          // Main tagline MOBILE size — independent value applied when
          // viewport width <= 768px (the hero render reads this).
          const mtMobileEl = document.getElementById('setMainTaglineFontSizeMobile');
          if (mtMobileEl) {
            const v = parseInt(mtMobileEl.value, 10);
            cfg.mainTaglineFontSizeMobile = isNaN(v) ? 22 : Math.min(Math.max(v, 14), 48);
          }
          // Sub tagline desktop + mobile sizes (new in v77). Both
          // independently editable in Settings; render picks the one
          // matching the current viewport.
          const stSizeEl = document.getElementById('setSubTaglineSize');
          if (stSizeEl) {
            const v = parseInt(stSizeEl.value, 10);
            cfg.subTaglineSize = isNaN(v) ? 18 : Math.min(Math.max(v, 10), 48);
          }
          const stMobileEl = document.getElementById('setSubTaglineSizeMobile');
          if (stMobileEl) {
            const v = parseInt(stMobileEl.value, 10);
            cfg.subTaglineSizeMobile = isNaN(v) ? 14 : Math.min(Math.max(v, 8), 36);
          }
          cfg.topBarText = _v('setTopBarText');
          var addressNoteEl = document.getElementById('setAddressNote');
          if (addressNoteEl) cfg.addressNote = addressNoteEl.value.trim();
          // aboutTitle/aboutContent removed – no longer saved
          cfg.deliveryFee = parseFloat(document.getElementById('setDeliveryFee').value) || 0;
          // Tax is now stored as an AED amount (flat fee), not a decimal rate.
          // The field id `setTaxRate` is kept for backward compatibility but
          // the config key stays `taxRate` and now holds a flat AED value.
          cfg.taxRate = parseFloat(document.getElementById('setTaxRate').value) || 0;
          // Discount Rate and Discount Threshold removed from the form.
          // Force them to 0 so any legacy multiplier in storage no longer
          // applies to bills.
          cfg.discountRate = 0;
          cfg.discountThreshold = 0;
          cfg.notifications = cfg.notifications || {};
          if (isAdminSettings) {
            const soundToggle = document.getElementById('setNotificationSound');
            cfg.notifications.soundEnabled = !!(soundToggle && soundToggle.checked);
            cfg.notifications.toneUrl = uploadedNotificationToneData || '';
            realtimeAudio = null;
            realtimeAudioReady = false;
            if (!cfg.notifications.soundEnabled) {
              stopRealtimeRingtone();
            }
          }
          cfg.notifications.pushEnabled = true;
          cfg.reportViewMode = document.getElementById('reportViewMode') ? document.getElementById('reportViewMode').value : (cfg.reportViewMode || 'order');
          cfg.contact = cfg.contact || {};
          cfg.contact.phone = _v('setPhone');
          cfg.contact.email = _v('setEmail');
          cfg.contact.address = _v('setAddress');
          cfg.contact.openHours = _v('setOpenHours');
          cfg.contact.whatsapp = _v('setWhatsApp');
          cfg.contact.map = _v('setMap');
          cfg.contact.socials = {
            facebook: _v('setFacebook'),
            instagram: _v('setInstagram'),
            tiktok: _v('setTikTok')
          };
          cfg.developerInfo = cfg.developerInfo || {};
          cfg.developerInfo.name = _v('setDeveloperName');
          cfg.developerInfo.profileImage = uploadedDeveloperProfileImageData || cfg.developerInfo.profileImage || '';
          cfg.developerInfo.intro = _v('setDeveloperIntro');
          cfg.developerInfo.email = _v('setDeveloperEmail');
          cfg.developerInfo.phone = _v('setDeveloperPhone');
          // Preserve other entries in `links` (if any future ones added)
          // while updating just the LinkedIn URL from the form.
          cfg.developerInfo.links = cfg.developerInfo.links && typeof cfg.developerInfo.links === 'object'
            ? cfg.developerInfo.links
            : {};
          const linkedInEl = document.getElementById('setDeveloperLinkedIn');
          if (linkedInEl) {
            cfg.developerInfo.links.linkedin = linkedInEl.value.trim();
          }
          cfg.developerContact = cfg.developerInfo.phone || '';
          // Legal documents (v79). Stored as plain text in cfg.legal.
          // Footer links open these in a dedicated full-page view. Empty
          // strings render a "not published yet" placeholder.
          cfg.legal = cfg.legal || {};
          const privPolEl  = document.getElementById('setPrivacyPolicy');
          const termsEl    = document.getElementById('setTermsOfService');
          if (privPolEl) cfg.legal.privacyPolicy   = privPolEl.value;
          if (termsEl)   cfg.legal.termsOfService = termsEl.value;
          cfg.themeColors = cfg.themeColors || {};
          const primEl = document.getElementById('setPrimary');
          const secEl  = document.getElementById('setSecondary');
          const accEl  = document.getElementById('setAccent');
          if (primEl) cfg.themeColors.primary   = primEl.value;
          if (secEl)  cfg.themeColors.secondary = secEl.value;
          if (accEl)  cfg.themeColors.accent    = accEl.value;
          cfg.heroBackgroundMedia = cfg.heroBackgroundMedia || {
            desktop: { image: '', video: '' },
            tablet: { image: '', video: '' },
            mobile: { image: '', video: '' }
          };
          ['desktop', 'tablet', 'mobile'].forEach((device) => {
            cfg.heroBackgroundMedia[device] = cfg.heroBackgroundMedia[device] || { image: '', video: '' };
            const stagedImage = uploadedHeroMedia[device].image;
            const stagedVideo = uploadedHeroMedia[device].video;
            if (stagedImage !== null) cfg.heroBackgroundMedia[device].image = stagedImage;
            if (stagedVideo !== null) cfg.heroBackgroundMedia[device].video = stagedVideo;
            // ONE-TIME LEGACY CLEANUP (v66):
            // If any existing hero image/video is still stored as a
            // base64 data URL (legacy from pre-v66 uploads), STRIP it.
            // Those big strings are what's blowing past the localStorage
            // quota. Admin will see empty hero preview and can re-upload
            // — the new flow uses Storage and won't overflow.
            ['image', 'video'].forEach(function (k) {
              var v = cfg.heroBackgroundMedia[device][k];
              if (typeof v === 'string' && v.indexOf('data:') === 0) {
                console.warn('[Hero cleanup] stripping legacy base64', device, k,
                  '(size:', Math.round(v.length / 1024), 'KB) — re-upload to use Storage');
                cfg.heroBackgroundMedia[device][k] = '';
              }
            });
          });
          const desktopMedia = cfg.heroBackgroundMedia.desktop || {};
          if (desktopMedia.video) {
            cfg.heroBackground = { type: 'video', url: desktopMedia.video };
          } else if (desktopMedia.image) {
            cfg.heroBackground = { type: 'image', url: desktopMedia.image };
          } else {
            cfg.heroBackground = { type: 'slides', url: '' };
          }
          // NOTE (v85): announcement popup save logic moved to the
          // dedicated Popup section (popupMgmt). Save Settings no longer
          // touches cfg.announcementPopup so changes admin made in Popup
          // section aren't wiped out by saving Settings.
          saveData();
          applyTheme();
          buildWebsite();
          // If the admin panel is currently showing the dashboard, refresh it to reflect updated settings
          const activeNav = document.querySelector('#adminNav li.active');
          if (activeNav && activeNav.dataset.target === 'dashboard') {
            renderDashboardSection(document.getElementById('adminContent'));
          }
          window.showToast ? window.showToast('Settings saved', 'success') : alert('Settings saved');
          } catch (saveErr) {
            // Surface the error visibly instead of failing silently. The
            // user previously saw "Save Settings button not working" when
            // any field access threw — now they see the actual error.
            console.error('[Save Settings] failed:', saveErr);
            alert('Failed to save settings: ' + (saveErr && saveErr.message ? saveErr.message : saveErr)
              + '\n\nCheck the browser console (F12 → Console tab) for full details, and send me the message.');
          }
        };
        // Attach change password handler within the settings panel
        const pwBtn = document.getElementById('changePasswordBtn');
        if (pwBtn) {
          pwBtn.onclick = () => {
            openChangePasswordModal();
          };
        }
        // Render the browser-notification permission status + request button.
        // Phase B: lets admin enable system-level notifications so that
        // alerts appear even when the admin panel tab is not focused.
        renderBrowserNotificationStatus();
        renderAdminMyAlertsChips();
        // Removed unused restaurant-name typography preview controls.
      }

      function renderAdminMyAlertsChips() {
        // Wire up the admin notification toggles in Settings.
        // - Master switch: enables/disables ALL alerts at once
        // - Per-section toggles: control orders/reservations/requests
        // Each toggle persists to the admin's user record so the
        // preference syncs across devices via the standard users-table
        // realtime path.
        var user = ensureCurrentUserNotificationPrefs();
        if (!user) return;

        function getAdminRow() {
          var u = appState.users.find(function (x) { return x && x.id === appState.session.id; });
          if (!u) {
            // Admin row not in local state — synthesize one so the
            // preference still gets persisted + published.
            u = {
              id: appState.session.id,
              role: 'admin',
              auth_user_id: appState.session.authUserId,
              notificationPrefs: { sections: {} }
            };
            appState.users.push(u);
          }
          if (!u.notificationPrefs) u.notificationPrefs = {};
          if (!u.notificationPrefs.sections) u.notificationPrefs.sections = {};
          return u;
        }

        function persistAdminRow() {
          saveData();
          if (App.SupabaseSync && App.SupabaseSync.flushNow) App.SupabaseSync.flushNow();
        }

        var sections = (user.notificationPrefs && user.notificationPrefs.sections) || {};

        // Master toggle: enables/disables the whole block. Reflects the
        // soundEnabled flag on the admin's notificationPrefs (per-user).
        var masterToggle = document.querySelector('[data-notif-master]');
        var perSectionList = document.getElementById('adminNotifPerSection');
        if (masterToggle) {
          var masterEnabled = !user.notificationPrefs || user.notificationPrefs.soundEnabled !== false;
          masterToggle.checked = masterEnabled;
          if (perSectionList) {
            perSectionList.classList.toggle('admin-notif-disabled', !masterEnabled);
          }
          masterToggle.onchange = function () {
            var u = getAdminRow();
            u.notificationPrefs.soundEnabled = !!masterToggle.checked;
            if (perSectionList) {
              perSectionList.classList.toggle('admin-notif-disabled', !masterToggle.checked);
            }
            persistAdminRow();
            console.info('[Admin] notification master toggle:', masterToggle.checked);
          };
        }

        // Per-section toggles
        var toggles = document.querySelectorAll('[data-notif-section]');
        if (toggles && toggles.length) {
          toggles.forEach(function (cb) {
            var key = cb.getAttribute('data-notif-section');
            cb.checked = sections[key] !== false;
            cb.onchange = function () {
              var u = getAdminRow();
              u.notificationPrefs.sections[key] = cb.checked;
              persistAdminRow();
              console.info('[Admin] notification pref saved:', key, '=', cb.checked);
            };
          });
        }

        // Test Notification button: fires a fake alert so admin can
        // verify ringtone + banner are working on this device.
        var testBtn = document.getElementById('adminNotifTestBtn');
        if (testBtn) {
          testBtn.onclick = function () {
            // Prime audio (some browsers need a click before audio plays)
            try {
              if (typeof primeRealtimeAudio === 'function') primeRealtimeAudio();
            } catch (e) {}
            // Pick orders by default for the test
            var fakeOrder = {
              id: 'test-' + Date.now(),
              customerName: 'Test Customer',
              date: Date.now(),
              total: 99.99,
              items: []
            };
            console.info('[Admin] Test notification triggered');
            try {
              if (typeof window.notifyRealtimeInsertFromRemote === 'function') {
                window.notifyRealtimeInsertFromRemote('orders', fakeOrder);
              } else if (typeof startRealtimeRingtone === 'function') {
                startRealtimeRingtone('orders', fakeOrder.id);
              }
            } catch (e) {
              console.warn('[Admin] test notification failed', e);
              alert('Notification test failed: ' + (e.message || e));
            }
          };
        }
      }

      function renderBrowserNotificationStatus() {
        var box = document.getElementById('browserNotificationStatus');
        if (!box) return;
        if (!('Notification' in window)) {
          box.innerHTML =
            '<div style="padding:10px 14px;background:rgba(220,80,80,0.10);border:1px solid rgba(220,80,80,0.30);border-radius:6px;color:#f9b0b0;font-size:13px;">' +
            'Browser notifications are not supported in this browser.</div>';
          return;
        }
        var perm = Notification.permission;
        if (perm === 'granted') {
          // Phase C: also show push subscription status
          var pushStatus = '';
          if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(function (reg) {
              return reg.pushManager.getSubscription();
            }).then(function (sub) {
              var indicator = document.getElementById('pushSubStatus');
              if (!indicator) return;
              if (sub) {
                indicator.textContent = ' · Background push: active ✓';
                indicator.style.color = '#b6e0b6';
              } else {
                indicator.textContent = ' · Background push: not subscribed (reload page)';
                indicator.style.color = '#f0c890';
                // Try to subscribe now
                if (typeof window.subscribeToPushNotifications === 'function') {
                  window.subscribeToPushNotifications();
                }
              }
            }).catch(function () {});
          }
          box.innerHTML =
            '<div style="padding:10px 14px;background:rgba(120,200,120,0.10);border:1px solid rgba(120,200,120,0.30);border-radius:6px;color:#b6e0b6;font-size:13px;">' +
            '✓ AFGR notifications are allowed on this device.' +
            '<span id="pushSubStatus" style="font-size:12px;opacity:0.8;"> · Checking background push…</span></div>';
          return;
        }
        if (perm === 'denied') {
          box.innerHTML =
            '<div style="padding:10px 14px;background:rgba(220,160,80,0.10);border:1px solid rgba(220,160,80,0.30);border-radius:6px;color:#f0c890;font-size:13px;">' +
            '⚠ Browser notifications are blocked. To enable, open your browser site settings and allow notifications for this site, then reload.</div>';
          return;
        }
        // perm === 'default' — not yet asked
        box.innerHTML =
          '<button type="button" class="notification-permission-prompt" id="requestNotificationPermBtn">' +
          '<span>🔔</span><span>Enable AFGR notifications</span></button>';
        var btn = document.getElementById('requestNotificationPermBtn');
        if (btn) {
          btn.onclick = function () {
            Notification.requestPermission().then(function (result) {
              renderBrowserNotificationStatus();
              // If just granted, subscribe to push immediately
              if (result === 'granted' && typeof window.subscribeToPushNotifications === 'function') {
                window.subscribeToPushNotifications().catch(function () {});
              }
            }).catch(function () {});
          };
        }
      }
      window.renderBrowserNotificationStatus = renderBrowserNotificationStatus;

      /** Render menu management section for admin and staff with edit permission */
      function renderMenuManagement(container) {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'admin-menu-manager';
        wrapper.innerHTML = `
          <div class="admin-menu-header">
            <div>
              <h3>Menu Management</h3>
              <p>Manage categories and menu products from one clean workspace.</p>
            </div>
            <div class="admin-menu-search-wrap">
              <i class="fa-solid fa-magnifying-glass admin-menu-search-icon" aria-hidden="true"></i>
              <input
                type="search"
                id="adminMenuSearchInput"
                class="admin-menu-search-input"
                placeholder="Search categories or products..."
                autocomplete="off"
                aria-label="Search categories or products"
              />
              <button type="button" class="admin-menu-search-clear" id="adminMenuSearchClear" aria-label="Clear search" hidden>
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        `;

        // Add Category Section
        const catDiv = document.createElement('section');
        catDiv.className = 'admin-menu-card admin-menu-categories-card';
        catDiv.innerHTML = `
          <div class="admin-menu-card-head">
            <div>
              <h4>Category Management</h4>
              <p>Create, edit, or remove menu categories.</p>
            </div>
          </div>
        `;
        const catTable = document.createElement('table');
        catTable.className = 'table admin-compact-table';
        const catHead = document.createElement('thead');
        catHead.innerHTML = '<tr><th>Name</th><th>Actions</th></tr>';
        const catBody = document.createElement('tbody');
        appState.categories.forEach((cat, idx) => {
          const tr = document.createElement('tr');
          // v91: tag every row with its searchable name so the live
          // search bar at the top can filter without re-rendering.
          tr.classList.add('admin-menu-search-row');
          tr.dataset.searchText = (cat.name || '').toLowerCase();
          const tdName = document.createElement('td');
          tdName.textContent = cat.name;
          const tdActions = document.createElement('td');
          tdActions.className = 'admin-row-actions';
          const editBtn = document.createElement('button');
          editBtn.className = 'btn';
          editBtn.textContent = 'Edit';
          editBtn.onclick = () => {
            openEditCategoryModal(idx);
          };
          const delBtn = document.createElement('button');
          delBtn.className = 'btn';
          delBtn.textContent = 'Delete';
          delBtn.onclick = () => {
            if (confirm('Delete this category?')) {
              const firstCat = 0;
              // Capture the category id before splicing for explicit publishRemove
              var __delCatId = appState.categories[idx] && appState.categories[idx].id;
              var __updatedMenuItems = [];
              appState.menuItems.forEach((mi) => {
                var changed = false;
                if (mi.category === idx) { mi.category = firstCat; changed = true; }
                else if (mi.category > idx) { mi.category--; changed = true; }
                if (changed && mi.id) __updatedMenuItems.push(mi);
              });
              appState.categories.splice(idx, 1);
              saveData();
              // Explicit publish so the cloud reflects the changes even if
              // the diff engine misses them.
              if (App.SupabaseSync) {
                if (__delCatId) App.SupabaseSync.publishRemove('categories', __delCatId);
                __updatedMenuItems.forEach(function (mi) {
                  App.SupabaseSync.publishUpdate('menuItems', mi.id, mi);
                });
              }
              renderMenuManagement(container);
              buildWebsite();
            }
          };
          tdActions.appendChild(editBtn);
          if (appState.categories.length > 1) tdActions.appendChild(delBtn);
          tr.appendChild(tdName);
          tr.appendChild(tdActions);
          catBody.appendChild(tr);
        });
        // v91: empty-state row shown when search filters out all
        // categories. Hidden by default; shown when zero visible rows.
        var catEmptyRow = document.createElement('tr');
        catEmptyRow.className = 'admin-menu-search-empty';
        catEmptyRow.hidden = true;
        catEmptyRow.innerHTML = '<td colspan="2" style="text-align:center;padding:18px;color:rgba(255,248,239,0.5);font-style:italic;">No categories match your search.</td>';
        catBody.appendChild(catEmptyRow);
        catTable.appendChild(catHead);
        catTable.appendChild(catBody);
        catDiv.appendChild(catTable);
        const addCatBtn = document.createElement('button');
        addCatBtn.className = 'btn admin-primary-action';
        addCatBtn.textContent = 'Add Category';
        addCatBtn.onclick = () => {
          openEditCategoryModal(null);
        };
        catDiv.appendChild(addCatBtn);
        wrapper.appendChild(catDiv);

        // Add Items/Product Section
        const itemsDiv = document.createElement('section');
        itemsDiv.className = 'admin-menu-card admin-menu-products-card';
        itemsDiv.innerHTML = `
          <div class="admin-menu-card-head">
            <div>
              <h4>Products Management</h4>
              <p>Add products, update prices, manage variations, and control visibility.</p>
            </div>
          </div>
        `;
        const itemsTable = document.createElement('table');
        itemsTable.className = 'table admin-compact-table';
        const itemsHead = document.createElement('thead');
        // v89: removed the "Enabled" yes/no text column. Replaced with
        // an inline toggle inside Actions (after Edit + Delete) so admin
        // can flip product availability without opening the edit modal.
        itemsHead.innerHTML = '<tr><th>Name</th><th>Category</th><th>Variations</th><th>Dummy Price</th><th>Selling Price</th><th>Actions</th></tr>';
        const itemsBody = document.createElement('tbody');
        appState.menuItems.forEach((mi, idx) => {
          const pricing = getMenuPricing(mi);
          const variationSummary = hasEnabledVariations(mi)
            ? `${getItemVariations(mi).filter((variation) => variation.enabled !== false).length} option(s)`
            : 'Base Price';
          const tr = document.createElement('tr');
          // v91: searchable text combines the product name AND its
          // category name, so typing a category in the search box also
          // shows all products under that category. Lowercased for
          // case-insensitive matching.
          const _catName = (appState.categories[mi.category] || {}).name || '';
          tr.classList.add('admin-menu-search-row');
          tr.dataset.searchText = ((mi.name || '') + ' ' + _catName).toLowerCase();
          tr.innerHTML = `<td>${mi.name}</td><td>${appState.categories[mi.category]?.name || ''}</td><td>${variationSummary}</td><td>${pricing.hasDiscount ? formatMenuPrice(pricing.originalPrice) : '—'}</td><td>${formatMenuPrice(pricing.sellingPrice)}</td>`;
          const tdActions = document.createElement('td');
          tdActions.className = 'admin-row-actions';
          const edit = document.createElement('button');
          edit.className = 'btn';
          edit.textContent = 'Edit';
          edit.onclick = () => {
            editMenuItem(mi);
          };
          const del = document.createElement('button');
          del.className = 'btn';
          del.textContent = 'Delete';
          del.onclick = () => {
            if (confirm('Delete this item?')) {
              var __delMiId = appState.menuItems[idx] && appState.menuItems[idx].id;
              appState.menuItems.splice(idx, 1);
              saveData();
              if (App.SupabaseSync && __delMiId) {
                App.SupabaseSync.publishRemove('menuItems', __delMiId);
              }
              renderMenuManagement(container);
              buildWebsite();
            }
          };
          // Inline enable/disable toggle (v89). Wired with same logic as
          // the toggle inside the edit modal — flips mi.enabled, saves,
          // publishes, rebuilds the public site. No re-render needed for
          // the local row since the toggle itself is the only visible
          // state in this row that changes.
          const toggleLabel = document.createElement('label');
          toggleLabel.className = 'switch menu-row-toggle';
          toggleLabel.title = mi.enabled !== false
            ? 'Product is active — tap to disable'
            : 'Product is disabled — tap to enable';
          const toggleInput = document.createElement('input');
          toggleInput.type = 'checkbox';
          toggleInput.checked = mi.enabled !== false;
          toggleInput.onchange = function () {
            mi.enabled = this.checked;
            toggleLabel.title = mi.enabled
              ? 'Product is active — tap to disable'
              : 'Product is disabled — tap to enable';
            try {
              saveData();
              if (App.SupabaseSync && App.SupabaseSync.flushNow) {
                App.SupabaseSync.flushNow();
              }
              buildWebsite();
            } catch (err) {
              console.error('[Menu toggle] save failed:', err);
              alert('Failed to update product status. Please try again.');
              // Roll back UI state on failure
              this.checked = !this.checked;
              mi.enabled = this.checked;
            }
          };
          const toggleSlider = document.createElement('span');
          toggleSlider.className = 'switch-slider';
          toggleLabel.appendChild(toggleInput);
          toggleLabel.appendChild(toggleSlider);
          tdActions.appendChild(edit);
          tdActions.appendChild(del);
          tdActions.appendChild(toggleLabel);
          tr.appendChild(tdActions);
          itemsBody.appendChild(tr);
        });
        // v91: empty-state row for products table
        var itemsEmptyRow = document.createElement('tr');
        itemsEmptyRow.className = 'admin-menu-search-empty';
        itemsEmptyRow.hidden = true;
        itemsEmptyRow.innerHTML = '<td colspan="6" style="text-align:center;padding:18px;color:rgba(255,248,239,0.5);font-style:italic;">No products match your search.</td>';
        itemsBody.appendChild(itemsEmptyRow);
        itemsTable.appendChild(itemsHead);
        itemsTable.appendChild(itemsBody);
        itemsDiv.appendChild(itemsTable);
        const addItemBtn = document.createElement('button');
        addItemBtn.className = 'btn admin-primary-action';
        addItemBtn.textContent = 'Add Item';
        addItemBtn.onclick = () => {
          editMenuItem(null);
        };
        itemsDiv.appendChild(addItemBtn);
        wrapper.appendChild(itemsDiv);
        container.appendChild(wrapper);

        // v91: live search wiring. Filters BOTH the categories table
        // and the products table case-insensitively. Each row was
        // tagged with `data-search-text` during render. We just walk
        // those rows on every keystroke and toggle a `hidden` attr.
        //
        // Products use combined "name + category" search text so
        // typing a category name reveals all products in that category.
        // Categories search their own name only.
        const searchInput = wrapper.querySelector('#adminMenuSearchInput');
        const searchClear = wrapper.querySelector('#adminMenuSearchClear');
        if (searchInput) {
          const applyFilter = function () {
            const q = (searchInput.value || '').trim().toLowerCase();
            // Toggle the clear (X) button visibility
            if (searchClear) searchClear.hidden = (q === '');
            const allRows = wrapper.querySelectorAll('tr.admin-menu-search-row');
            let visibleCats = 0;
            let visibleItems = 0;
            allRows.forEach(function (row) {
              const text = row.dataset.searchText || '';
              const match = (q === '') || (text.indexOf(q) !== -1);
              row.hidden = !match;
              if (!match) return;
              // Count visible rows per section to decide whether to
              // show the empty-state placeholder
              if (row.closest('.admin-menu-categories-card')) visibleCats++;
              else if (row.closest('.admin-menu-products-card')) visibleItems++;
            });
            // Toggle empty-state rows (only show when search is active
            // AND no rows match in that section)
            if (catEmptyRow)   catEmptyRow.hidden   = (q === '' || visibleCats > 0);
            if (itemsEmptyRow) itemsEmptyRow.hidden = (q === '' || visibleItems > 0);
          };
          searchInput.addEventListener('input', applyFilter);
          if (searchClear) {
            searchClear.addEventListener('click', function () {
              searchInput.value = '';
              applyFilter();
              searchInput.focus();
            });
          }
        }
      }

      /** Create or edit a menu item.  Opens a modal form for professional editing. */
      function editMenuItem(item) {
        openEditItemModal(item);
      }

      /** Render orders section.  If canUpdate is true then allow status updates */
      function renderOrdersSection(container, canUpdate) {
        container.innerHTML = '<h3>Orders</h3>';
        const statusRow = document.createElement('div');
        statusRow.className = 'realtime-chip-row';
        statusRow.innerHTML = `
          <div class="realtime-chip"><span class="status-pulse"></span><span>Live updates active</span></div>
          <div class="realtime-chip"><span>${getSectionUnreadCount('orders')}</span><span>new item(s)</span></div>
        `;
        container.appendChild(statusRow);
        if (appState.orders.length === 0) {
          container.innerHTML += '<p>No orders yet.</p>';
          return;
        }
        const tableToolbar = document.createElement('div');
        tableToolbar.className = 'table-toolbar';
        tableToolbar.innerHTML = `
          <div class="table-title-group">
            <strong style="color:#fff8ef;font-size:18px;">Order Queue</strong>
            <p>Compact inspection table with direct detail access and status control.</p>
          </div>
          <div class="order-filter-bar">
            <select id="ordersFilterSelect" aria-label="Filter orders">
              <option value="recent" ${selectedOrderFilter === 'recent' ? 'selected' : ''}>Recent</option>
              <option value="today" ${selectedOrderFilter === 'today' ? 'selected' : ''}>Today</option>
              <option value="last7" ${selectedOrderFilter === 'last7' ? 'selected' : ''}>Last 7 Days</option>
              <option value="last30" ${selectedOrderFilter === 'last30' ? 'selected' : ''}>Last 30 Days</option>
              <option value="thisMonth" ${selectedOrderFilter === 'thisMonth' ? 'selected' : ''}>This Month</option>
              <option value="all" ${selectedOrderFilter === 'all' ? 'selected' : ''}>All Orders</option>
            </select>
          </div>
        `;
        container.appendChild(tableToolbar);
        const tableWrap = document.createElement('div');
        tableWrap.className = 'compact-table-wrap';
        const table = document.createElement('table');
        table.className = 'table afgr-order-table';
        table.setAttribute('aria-label','Orders');
        tableWrap.classList.add('afgr-order-list');
        table.innerHTML = '<thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Timeline</th><th>Actions</th></tr></thead>';
        const tbody = document.createElement('tbody');
        filterOrdersBySelection(appState.orders || [], selectedOrderFilter)
          .forEach((order) => {
            ensureOrderTimeline(order);
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>
                <div class="orders-table-customer">
                  <strong>${order.id}</strong>
                  <small>${new Date(order.date).toLocaleString()}</small>
                </div>
              </td>
              <td>
                <div class="orders-table-customer">
                  <strong>${escapeHtml(order.customer.name)}</strong>
                  <small>${escapeHtml(order.customer.phone || 'No phone')}</small>
                  <small>${escapeHtml(order.customer.address || 'No address')}</small>
                </div>
              </td>
              <td>${formatOrderCurrency(order.total)}</td>
              <td>${renderOrderStatusPill(order.status)}</td>
              <td>
                <div class="orders-table-customer">
                  <small>Placed ${order.timeline.placedAt ? new Date(order.timeline.placedAt).toLocaleTimeString() : '-'}</small>
                  <small>Delivered ${order.timeline.deliveredAt ? new Date(order.timeline.deliveredAt).toLocaleTimeString() : 'Pending'}</small>
                </div>
              </td>
            `;
            const tdActions = document.createElement('td');
            // View button to see full order details
            const viewBtn = document.createElement('button');
            viewBtn.className = 'dashboard-action-btn';
            viewBtn.style.marginRight = '6px';
            viewBtn.innerHTML = '<i class="fa-solid fa-eye" aria-hidden="true"></i><span>View Details</span>';
            viewBtn.onclick = () => {
              openOrderDetailsModal(order);
            };
            tdActions.appendChild(viewBtn);
            if (canUpdate) {
              const statusSelect = document.createElement('select');
              statusSelect.style.minHeight = '38px';
              statusSelect.style.borderRadius = '12px';
              statusSelect.style.marginTop = '8px';
              ['Pending', 'Accepted', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'].forEach((st) => {
                const opt = document.createElement('option');
                opt.value = st;
                opt.textContent = st;
                opt.selected = order.status === st;
                statusSelect.appendChild(opt);
              });
              statusSelect.onchange = () => {
                updateOrderStatusTimeline(order, statusSelect.value);
                saveData();
                // Explicitly sync the status change. Direct mutation + saveData()
                // relies on the diff engine, but publishUpdate here guarantees the
                // upsert fires regardless of snapshot state.
                if (App.SupabaseSync) App.SupabaseSync.publishUpdate('orders', order.id, order);
                if (['Accepted', 'Delivered', 'Cancelled'].includes(statusSelect.value)) {
                  stopRealtimeRingtone('orders', order.id);
                }
                // If dashboard is open refresh it to reflect new status counts
                if (document.getElementById('adminPanel').classList.contains('active')) {
                  const activeNav = document.querySelector('#adminNav li.active');
                  if (activeNav && activeNav.dataset.target === 'dashboard') {
                    renderDashboardSection(document.getElementById('adminContent'));
                  }
                }
              };
              tdActions.appendChild(statusSelect);
            } else {
              // show status text only
              const statusSpan = document.createElement('span');
              statusSpan.textContent = order.status;
              tdActions.appendChild(statusSpan);
            }
            tr.appendChild(tdActions);
            // Labels remain available for both screen readers and stacked mobile cards.
            ['Order','Customer','Total','Status','Timeline','Actions'].forEach(function(label,i){
              if(tr.children[i])tr.children[i].setAttribute('data-label',label);
            });
            tr.classList.add('afgr-order-card-row');
            tbody.appendChild(tr);
          });
        table.appendChild(tbody);
        tableWrap.appendChild(table);
        container.appendChild(tableWrap);
        const ordersFilterSelect = document.getElementById('ordersFilterSelect');
        if (ordersFilterSelect) {
          ordersFilterSelect.onchange = function () {
            selectedOrderFilter = this.value;
            renderOrdersSection(container, canUpdate);
          };
        }
      }

      /** Render reservations section with optional approval controls */
      function renderReservationsSection(container, canApprove) {
        const reservations = (appState.reservations || []).slice().sort((a, b) => getReservationTimestamp(b) - getReservationTimestamp(a));
        const total = reservations.length;
        const pending = reservations.filter((res) => String(res.status || 'Pending') === 'Pending').length;
        const accepted = reservations.filter((res) => ['Accepted', 'Approved'].includes(String(res.status || ''))).length;
        const completed = reservations.filter((res) => String(res.status || '') === 'Completed').length;

        // ---- Upcoming reservations box ----
        // Reservations whose datetime is in the future and not cancelled.
        // Sorted ASCending (soonest first) so the next booking is on top.
        const nowMs = Date.now();
        const upcoming = reservations
          .filter((res) => {
            const ts = getReservationTimestamp(res);
            const status = String(res.status || 'Pending');
            if (['Cancelled', 'Rejected', 'Declined', 'Completed'].includes(status)) return false;
            return ts && ts >= nowMs;
          })
          .sort((a, b) => getReservationTimestamp(a) - getReservationTimestamp(b));

        function fmtDate(res) {
          const ts = getReservationTimestamp(res);
          const d = new Date(ts || Date.now());
          return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : '-';
        }
        function fmtTime(res) {
          const ts = getReservationTimestamp(res);
          const d = new Date(ts || Date.now());
          return Number.isFinite(d.getTime())
            ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '-';
        }

        var upcomingHtml = '';
        if (upcoming.length) {
          upcomingHtml = `
            <div class="reservation-upcoming-box">
              <div class="reservation-upcoming-header">
                <h4 style="margin:0;">Upcoming Reservations</h4>
                <span class="reservation-upcoming-count">${upcoming.length}</span>
              </div>
              <div class="reservation-upcoming-list">
                ${upcoming.slice(0, 10).map(function (res) {
                  const name   = escapeHtml(res.name || 'Guest');
                  const guests = Number(res.guests || 0);
                  const phone  = escapeHtml(res.phone || '');
                  const status = escapeHtml(res.status || 'Pending');
                  return `
                    <div class="reservation-upcoming-item">
                      <div class="reservation-upcoming-when">
                        <strong>${escapeHtml(fmtDate(res))}</strong>
                        <span>${escapeHtml(fmtTime(res))}</span>
                      </div>
                      <div class="reservation-upcoming-who">
                        <strong>${name}</strong>
                        <span>${guests} guest${guests === 1 ? '' : 's'}${phone ? ' • ' + phone : ''}</span>
                      </div>
                      <div class="reservation-upcoming-status">${status}</div>
                    </div>
                  `;
                }).join('')}
                ${upcoming.length > 10 ? '<div class="reservation-upcoming-more">…and ' + (upcoming.length - 10) + ' more below</div>' : ''}
              </div>
            </div>
          `;
        } else {
          upcomingHtml = `
            <div class="reservation-upcoming-box reservation-upcoming-empty">
              <div class="reservation-upcoming-header">
                <h4 style="margin:0;">Upcoming Reservations</h4>
              </div>
              <p style="margin:8px 0 0;opacity:0.7;font-size:13px;">No upcoming reservations.</p>
            </div>
          `;
        }

        container.innerHTML = `
          <div class="reservation-admin-page">
            <div class="reservation-admin-header">
              <div>
                <h3>Reservations</h3>
                <p>Review booking requests, customer details, and status actions in a compact management view.</p>
              </div>
              <div class="reservation-admin-stats">
                <div class="reservation-admin-stat"><span>Total</span><strong>${total}</strong></div>
                <div class="reservation-admin-stat"><span>Pending</span><strong>${pending}</strong></div>
                <div class="reservation-admin-stat"><span>Accepted</span><strong>${accepted}</strong></div>
                <div class="reservation-admin-stat"><span>Completed</span><strong>${completed}</strong></div>
              </div>
            </div>
            ${upcomingHtml}
            <div class="realtime-chip-row">
              <div class="realtime-chip"><span class="status-pulse"></span><span>Live updates active</span></div>
              <div class="realtime-chip"><span>${getSectionUnreadCount('reservations')}</span><span>new item(s)</span></div>
            </div>
            <div class="reservation-admin-list" id="reservationAdminList"></div>
          </div>
        `;
        const list = document.getElementById('reservationAdminList');
        if (!list) return;
        if (!reservations.length) {
          list.innerHTML = '<div class="reservation-empty-state">No reservations yet.</div>';
          return;
        }
        function reservationStatusPill(status) {
          return renderOrderStatusPill(status || 'Pending');
        }
        function formatReservationDate(res) {
          const ts = getReservationTimestamp(res);
          const date = new Date(ts || Date.now());
          return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : '-';
        }
        function formatReservationTime(res) {
          const ts = getReservationTimestamp(res);
          const date = new Date(ts || Date.now());
          return Number.isFinite(date.getTime()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
        }
        list.innerHTML = reservations.map((res) => {
          const status = res.status || 'Pending';
          const notes = res.notes || res.message || res.request || res.specialRequest || '';
          return `
            <article class="reservation-admin-card" data-reservation-id="${escapeHtml(String(res.id || ''))}">
              <div class="reservation-admin-cell">
                <span class="reservation-admin-label">Customer</span>
                <div class="reservation-admin-value">${escapeHtml(res.name || 'Customer')}</div>
                <span class="reservation-admin-muted">${escapeHtml(res.phone || '-')}</span>
              </div>
              <div class="reservation-admin-cell">
                <span class="reservation-admin-label">Date</span>
                <div class="reservation-admin-value">${escapeHtml(formatReservationDate(res))}</div>
              </div>
              <div class="reservation-admin-cell">
                <span class="reservation-admin-label">Time</span>
                <div class="reservation-admin-value">${escapeHtml(formatReservationTime(res))}</div>
              </div>
              <div class="reservation-admin-cell">
                <span class="reservation-admin-label">Guests</span>
                <div class="reservation-admin-value">${Number(res.guests || res.guestCount || 0)}</div>
              </div>
              <div class="reservation-admin-cell">
                <span class="reservation-admin-label">Status</span>
                ${reservationStatusPill(status)}
              </div>
              <div class="reservation-actions">
                <button type="button" class="reservation-action-btn" data-action="view">View Details</button>
                <button type="button" class="reservation-action-btn primary" data-action="accept" ${!canApprove || ['Accepted', 'Approved', 'Completed'].includes(status) ? 'disabled' : ''}>Accept</button>
                <button type="button" class="reservation-action-btn warn" data-action="decline" ${!canApprove || ['Declined', 'Rejected', 'Cancelled', 'Completed'].includes(status) ? 'disabled' : ''}>Decline</button>
                <button type="button" class="reservation-action-btn success" data-action="complete" ${!canApprove || status === 'Completed' ? 'disabled' : ''}>Completed</button>
              </div>
              ${notes ? `<div class="reservation-admin-cell" style="grid-column:1/-1;"><span class="reservation-admin-label">Notes Preview</span><div class="reservation-admin-muted">${escapeHtml(String(notes).slice(0, 140))}${String(notes).length > 140 ? '...' : ''}</div></div>` : ''}
            </article>
          `;
        }).join('');
        function setReservationStatus(reservationId, nextStatus) {
          const entry = (appState.reservations || []).find((res) => String(res.id) === String(reservationId));
          if (!entry) return;
          entry.status = nextStatus;
          entry.updatedAt = Date.now();
          saveData();
          // Explicitly sync the status change. Direct mutation + saveData()
          // relies on the diff engine, but publishUpdate here guarantees the
          // upsert fires regardless of snapshot state.
          if (App.SupabaseSync) App.SupabaseSync.publishUpdate('reservations', entry.id, entry);
          stopRealtimeRingtone('reservations', entry.id);
          renderReservationsSection(container, canApprove);
          const adminPanel = document.getElementById('adminPanel');
          const activeNav = document.querySelector('#adminNav li.active');
          if (adminPanel && adminPanel.classList.contains('active') && activeNav && activeNav.dataset.target === 'dashboard') {
            renderDashboardSection(document.getElementById('adminContent'));
          }
        }
        function openReservationDetails(res) {
          let modal = document.getElementById('reservationDetailsModal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'reservationDetailsModal';
            modal.className = 'modal reservation-detail-modal';
            document.body.appendChild(modal);
          }
          const status = res.status || 'Pending';
          const notes = res.notes || res.message || res.request || res.specialRequest || 'No notes added.';
          modal.innerHTML = `
            <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="reservationDetailTitle" tabindex="-1">
              <div class="reservation-detail-shell">
                <div class="reservation-detail-topbar">
                  <div>
                    <h3 id="reservationDetailTitle">Reservation Details</h3>
                    <p>${escapeHtml(res.id || 'Reservation')}</p>
                  </div>
                  <button type="button" class="reservation-detail-close" aria-label="Close reservation details">&times;</button>
                </div>
                <div class="reservation-detail-grid">
                  <div class="reservation-detail-card"><span>Customer Name</span><strong>${escapeHtml(res.name || 'Customer')}</strong></div>
                  <div class="reservation-detail-card"><span>Status</span>${reservationStatusPill(status)}</div>
                  <div class="reservation-detail-card"><span>Contact Number</span><strong>${escapeHtml(res.phone || '-')}</strong></div>
                  <div class="reservation-detail-card"><span>Email</span><strong>${escapeHtml(res.email || '-')}</strong></div>
                  <div class="reservation-detail-card"><span>Reservation Date</span><strong>${escapeHtml(formatReservationDate(res))}</strong></div>
                  <div class="reservation-detail-card"><span>Reservation Time</span><strong>${escapeHtml(formatReservationTime(res))}</strong></div>
                  <div class="reservation-detail-card"><span>Guests Count</span><strong>${Number(res.guests || res.guestCount || 0)}</strong></div>
                  <div class="reservation-detail-card"><span>Created</span><strong>${res.date ? new Date(res.date).toLocaleString() : '-'}</strong></div>
                  <div class="reservation-detail-card full"><span>Notes / Message</span><p>${escapeHtml(notes)}</p></div>
                </div>
              </div>
            </div>
          `;
          modal.classList.add('active');
          const closeReservationDetail = () => modal.classList.remove('active');
          modal.querySelector('.reservation-detail-close').onclick = closeReservationDetail;
          modal.onclick = (event) => {
            if (event.target === modal) closeReservationDetail();
          };
          modal.onkeydown = (event) => {
            if (event.key === 'Escape') { event.preventDefault(); closeReservationDetail(); }
          };
          modal.querySelector('.reservation-detail-close').focus();
        }
        list.querySelectorAll('.reservation-admin-card').forEach((card) => {
          const reservationId = card.getAttribute('data-reservation-id');
          const reservation = reservations.find((res) => String(res.id) === String(reservationId));
          card.querySelectorAll('[data-action]').forEach((button) => {
            button.addEventListener('click', () => {
              const action = button.getAttribute('data-action');
              if (action === 'view') return openReservationDetails(reservation);
              if (action === 'accept') return setReservationStatus(reservationId, 'Accepted');
              if (action === 'decline') return setReservationStatus(reservationId, 'Declined');
              if (action === 'complete') return setReservationStatus(reservationId, 'Completed');
            });
          });
        });
      }

      /** Render offers management section */
      function renderOffersManagement(container) {
        const now = Date.now();
        const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'Not set';
        const getOfferStatus = (offer) => {
          if (offer.enabled === false || offer.active === false) return { label: 'Disabled', cls: 'is-disabled' };
          const start = offer.start || offer.startDate ? Date.parse(offer.start || offer.startDate) : null;
          const end = offer.end || offer.endDate ? Date.parse(offer.end || offer.endDate) : null;
          if (start && now < start) return { label: 'Scheduled', cls: 'is-paused' };
          if (end && now > end + 86400000) return { label: 'Expired', cls: 'is-expired' };
          return { label: 'Active', cls: 'is-active' };
        };
        const getScopeLabel = (offer) => {
          const offerProduct = offer.productId ? appState.menuItems.find((item) => item.id === offer.productId) : null;
          const variationLabel = offerProduct && offer.productVariationId ? getVariationLabel(offerProduct, offer.productVariationId) : '';
          if (offer.type === 'product') return `${offerProduct ? offerProduct.name : 'Product'}${variationLabel ? ` - ${variationLabel}` : ''}`;
          if (offer.type === 'combo') return getOfferProductNames(offer).join(', ') || 'Selected Products';
          return 'Entire Bill';
        };
        const getTypeLabel = (offer) => offer.type === 'product' ? 'Product Discount' : offer.type === 'combo' ? 'Combo Deal' : 'Bill Discount';
        const getConditions = (offer) => {
          if (offer.type === 'bill') return offer.minValue ? `Minimum bill AED ${Number(offer.minValue).toFixed(2)}` : 'No minimum bill';
          if (offer.type === 'combo') return `${(getOfferProductNames(offer) || []).length || 0} product combo`;
          return offer.productVariationId ? 'Specific variation' : 'Any variation';
        };
        const rows = (appState.offers || []).map((offer, idx) => {
          const status = getOfferStatus(offer);
          const safeTitle = escapeHtml(offer.title || 'Untitled Offer');
          const scope = escapeHtml(getScopeLabel(offer));
          const type = escapeHtml(getTypeLabel(offer));
          const conditions = escapeHtml(getConditions(offer));
          return { offer, idx, status, safeTitle, scope, type, conditions };
        });
        container.innerHTML = `
          <div class="admin-page-shell offers-admin-shell">
            <div class="admin-page-head">
              <div class="admin-page-title-block">
                <span class="admin-page-eyebrow">Promotion Control</span>
                <h3>Offers Management</h3>
                <p>Manage restaurant deals with clear scope, timing, status, and discount rules.</p>
              </div>
              <div class="admin-toolbar">
                <button class="btn" type="button" id="adminAddOfferBtn"><i class="fa-solid fa-plus" aria-hidden="true"></i> Add Offer</button>
              </div>
            </div>
            <div class="admin-data-card">
              <div class="erp-table-wrap">
                <table class="erp-table">
                  <thead>
                    <tr>
                      <th>Offer Name</th>
                      <th>Discount Type</th>
                      <th>Discount Value</th>
                      <th>Products/Categories Applied</th>
                      <th>Deal Conditions</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows.map(({ offer, idx, status, safeTitle, scope, type, conditions }) => `
                      <tr>
                        <td><div class="erp-identity-cell"><strong>${safeTitle}</strong><span>${escapeHtml(offer.id || `Offer ${idx + 1}`)}</span></div></td>
                        <td>${type}</td>
                        <td><span class="admin-chip">${Number(offer.discount || 0)}% OFF</span></td>
                        <td>${scope}</td>
                        <td>${conditions}</td>
                        <td>${escapeHtml(formatDate(offer.start || offer.startDate))}</td>
                        <td>${escapeHtml(formatDate(offer.end || offer.endDate))}</td>
                        <td><span class="admin-status-badge ${status.cls}">${escapeHtml(status.label)}</span></td>
                        <td><div class="inline-action-row"><button class="btn admin-action-btn secondary" type="button" data-offer-action="edit" data-offer-id="${escapeHtml(offer.id || '')}">Edit</button><button class="btn admin-action-btn danger" type="button" data-offer-action="delete" data-offer-id="${escapeHtml(offer.id || '')}">Delete</button></div></td>
                      </tr>
                    `).join('') || '<tr><td colspan="9">No offers created yet.</td></tr>'}
                  </tbody>
                </table>
              </div>
              <div class="admin-mobile-card-list">
                ${rows.map(({ offer, status, safeTitle, scope, type, conditions }) => `
                  <article class="admin-mobile-card">
                    <div class="erp-identity-cell"><strong>${safeTitle}</strong><span>${type} • ${Number(offer.discount || 0)}% OFF</span></div>
                    <div class="admin-mobile-grid">
                      <div class="admin-mobile-field"><span>Applied To</span><p>${scope}</p></div>
                      <div class="admin-mobile-field"><span>Conditions</span><p>${conditions}</p></div>
                      <div class="admin-mobile-field"><span>Start</span><strong>${escapeHtml(formatDate(offer.start || offer.startDate))}</strong></div>
                      <div class="admin-mobile-field"><span>End</span><strong>${escapeHtml(formatDate(offer.end || offer.endDate))}</strong></div>
                      <div class="admin-mobile-field"><span>Status</span><strong><span class="admin-status-badge ${status.cls}">${escapeHtml(status.label)}</span></strong></div>
                    </div>
                    <div class="inline-action-row"><button class="btn admin-action-btn secondary" type="button" data-offer-action="edit" data-offer-id="${escapeHtml(offer.id || '')}">Edit</button><button class="btn admin-action-btn danger" type="button" data-offer-action="delete" data-offer-id="${escapeHtml(offer.id || '')}">Delete</button></div>
                  </article>
                `).join('') || '<div class="admin-mobile-card">No offers created yet.</div>'}
              </div>
            </div>
          </div>
        `;
        const addBtn = container.querySelector('#adminAddOfferBtn');
        if (addBtn) addBtn.onclick = () => openEditOfferModal(null);
        container.querySelectorAll('[data-offer-action]').forEach((button) => {
          button.addEventListener('click', () => {
            const id = button.getAttribute('data-offer-id');
            const idx = (appState.offers || []).findIndex((offer) => String(offer.id || '') === String(id));
            if (idx < 0) return;
            if (button.getAttribute('data-offer-action') === 'edit') {
              openEditOfferModal(idx);
            } else if (confirm('Delete this offer?')) {
              var __delOfferId = appState.offers[idx] && appState.offers[idx].id;
              appState.offers.splice(idx, 1);
              saveData();
              if (App.SupabaseSync && __delOfferId) {
                App.SupabaseSync.publishRemove('offers', __delOfferId);
              }
              renderOffersManagement(container);
              buildWebsite();
            }
          });
        });
      }

      /** Editing offers is now handled via a modal.  See openEditOfferModal() for details. */

      /** Render gallery management section */
      function renderGalleryManagement(container) {
        // Clear and set title
        container.innerHTML = '<h3>Gallery Management</h3>';
        // Display existing gallery images in a clean responsive grid.
        // Uses a dedicated class (.admin-gallery-grid) instead of the
        // public-site .gallery-grid which is a marquee container with
        // overflow:hidden — that container leaves child <img> elements
        // unsized, causing them to render at natural file dimensions
        // and bust the admin layout.
        const grid = document.createElement('div');
        grid.className = 'admin-gallery-grid';
        appState.gallery.forEach((imgObj, idx) => {
          const img = document.createElement('img');
          img.alt = 'gallery';
          // Lazy loading for performance
          img.loading = 'lazy';
          img.style.position = 'relative';
          img.title = 'Click to delete';
          // Assign source if data is already loaded.  Otherwise load asynchronously
          if (imgObj.url || imgObj.data) {
            img.src = imgObj.url || imgObj.data;
          } else {
            // Tiny placeholder while loading
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
            if (imgObj.id) {
              getImageFromDB(imgObj.id)
                .then((data) => {
                  if (data) {
                    // Populate in‑memory data and update UI
                    imgObj.data = data;
                    img.src = data;
                    // Refresh the live site gallery
                    buildWebsite();
                  } else {
                    // The record is missing; remove from state and DOM
                    const index = appState.gallery.indexOf(imgObj);
                    if (index > -1) {
                      appState.gallery.splice(index, 1);
                      try {
                        saveData();
                      } catch (e) {
                        console.warn('Failed to save after removing missing gallery image in admin', e);
                      }
                    }
                    if (img && img.parentNode) {
                      img.parentNode.removeChild(img);
                    }
                    // Re-render the management UI and live site
                    renderGalleryManagement(container);
                    buildWebsite();
                  }
                })
                .catch((err) => {
                  console.error('Failed to load gallery image in admin', err);
                });
            }
          }
          img.onclick = async () => {
            if (confirm('Delete this image?')) {
              // Remove the image entry from the gallery array
              const removed = appState.gallery.splice(idx, 1)[0];
              // Attempt to delete from IndexedDB as well
              if (removed && removed.id) {
                try {
                  await removeImageFromDB(removed.id);
                } catch (delErr) {
                  console.error('Failed to remove image from IndexedDB', delErr);
                }
                // Explicit publishRemove so the gallery metadata is removed
                // from Supabase. The diff engine doesn't track gallery (it's
                // excluded for performance because gallery items contain
                // base64 image bytes), so without this explicit call the
                // delete would never reach the cloud.
                if (App.SupabaseSync) {
                  App.SupabaseSync.publishRemove('gallery', removed.id);
                }
              }
              saveData();
              if (App.SupabaseSync && App.SupabaseSync.flushNow) {
                App.SupabaseSync.flushNow();
              }
              renderGalleryManagement(container);
              buildWebsite();
            }
          };
          grid.appendChild(img);
        });
        container.appendChild(grid);
        // Multi-file input for selecting images
        const multiInput = document.createElement('input');
        multiInput.type = 'file';
        multiInput.accept = 'image/*';
        multiInput.multiple = true;
        // Selected files state (each item: { file, progressBar, previewURL, div })
        let selectedFiles = [];
        // Label styled like a button that wraps the file input
        const selectLabel = document.createElement('label');
        selectLabel.className = 'btn';
        selectLabel.textContent = 'Select Images';
        selectLabel.style.display = 'inline-block';
        selectLabel.style.position = 'relative';
        // Hide actual input visually but still clickable
        multiInput.style.opacity = 0;
        multiInput.style.position = 'absolute';
        multiInput.style.left = 0;
        multiInput.style.top = 0;
        multiInput.style.width = '100%';
        multiInput.style.height = '100%';
        selectLabel.appendChild(multiInput);
        container.appendChild(selectLabel);
        // Container to preview selected images with progress bars, remove and drag handles
        const previewContainer = document.createElement('div');
        previewContainer.className = 'gallery-upload-preview';
        container.appendChild(previewContainer);
        // Messages container for errors/success
        const messages = document.createElement('div');
        messages.className = 'upload-messages';
        container.appendChild(messages);
        // Upload button
        const uploadBtn = document.createElement('button');
        uploadBtn.className = 'btn';
        uploadBtn.textContent = 'Upload Selected';
        uploadBtn.style.display = 'block';
        uploadBtn.style.marginTop = '8px';
        uploadBtn.disabled = true;
        container.appendChild(uploadBtn);

        // Drag and drop handlers for reordering
        let dragSrcEl = null;
        function handleDragStart(e) {
          dragSrcEl = this;
          this.style.opacity = '0.4';
          e.dataTransfer.effectAllowed = 'move';
          try {
            // Firefox requires dataTransfer data to be set for drag to work
            e.dataTransfer.setData('text/plain', '');
          } catch (ex) {}
        }
        function handleDragEnd() {
          this.style.opacity = '1';
        }
        function handleDragOver(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }
        function handleDrop(e) {
          e.stopPropagation();
          if (dragSrcEl && dragSrcEl !== this) {
            // Determine indices
            const children = Array.from(previewContainer.children);
            const srcIndex = children.indexOf(dragSrcEl);
            const destIndex = children.indexOf(this);
            if (srcIndex >= 0 && destIndex >= 0) {
              // Move element in DOM
              if (destIndex > srcIndex) {
                previewContainer.insertBefore(dragSrcEl, this.nextSibling);
              } else {
                previewContainer.insertBefore(dragSrcEl, this);
              }
              // Also update selectedFiles order
              const moved = selectedFiles.splice(srcIndex, 1)[0];
              selectedFiles.splice(destIndex, 0, moved);
            }
          }
          return false;
        }

        // Remove preview item function
        function removePreviewItem(index) {
          const removed = selectedFiles.splice(index, 1)[0];
          // Revoke object URL
          if (removed && removed.previewURL) {
            URL.revokeObjectURL(removed.previewURL);
          }
          // Remove DOM element
          const child = previewContainer.children[index];
          if (child) previewContainer.removeChild(child);
          // Disable upload button if no files left
          uploadBtn.disabled = selectedFiles.length === 0;
        }

        // Handle file selection event
        multiInput.onchange = () => {
          // Clear previous selection and UI
          selectedFiles.forEach((item) => {
            if (item.previewURL) URL.revokeObjectURL(item.previewURL);
          });
          selectedFiles = [];
          previewContainer.innerHTML = '';
          messages.innerHTML = '';
          uploadBtn.disabled = true;
          // Allow larger uploads by raising the size limit.  Images exceeding
          // this threshold will still be compressed before storage to reduce
          // their footprint in localStorage.  Setting a high limit avoids
          // outright rejection of legitimate high-resolution photos while
          // preventing excessively huge files.
          const MAX_SIZE = 15 * 1024 * 1024; // 15MB limit per image
          const files = Array.from(multiInput.files || []);
          files.forEach((file) => {
            // Validate file type.  Accept any image/* MIME type, but also
            // fall back to checking the file extension if the type is
            // unavailable or unknown.  This ensures that uncommon image
            // formats (e.g. BMP, WEBP, SVG) without a type still pass.
            const ext = (file.name || '').split('.').pop().toLowerCase();
            const validExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
            const hasValidExt = validExts.includes(ext);
            if (!file.type || !file.type.startsWith('image/')) {
              if (!hasValidExt) {
                const err = document.createElement('div');
                err.textContent = file.name + ' is not a supported image file.';
                err.className = 'error-msg';
                messages.appendChild(err);
                return;
              }
            }
            // Validate size
            if (file.size > MAX_SIZE) {
              const err = document.createElement('div');
              err.textContent = file.name + ' exceeds the maximum size of ' + (MAX_SIZE / (1024 * 1024)).toFixed(0) + 'MB.';
              err.className = 'error-msg';
              messages.appendChild(err);
              return;
            }
            // Check for duplicate by file name within selectedFiles
            if (selectedFiles.some((sf) => sf.file && sf.file.name === file.name)) {
              const warn = document.createElement('div');
              warn.textContent = file.name + ' is already selected.';
              warn.className = 'error-msg';
              messages.appendChild(warn);
              return;
            }
            // Create preview item
            const previewDiv = document.createElement('div');
            previewDiv.className = 'upload-preview-item';
            previewDiv.draggable = true;
            // Thumbnail
            const imgEl = document.createElement('img');
            const objURL = URL.createObjectURL(file);
            imgEl.src = objURL;
            imgEl.alt = file.name;
            previewDiv.appendChild(imgEl);
            // Remove button
            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-image-btn';
            removeBtn.title = 'Remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.onclick = (ev) => {
              ev.stopPropagation();
              const idx = Array.from(previewContainer.children).indexOf(previewDiv);
              if (idx >= 0) {
                removePreviewItem(idx);
              }
            };
            previewDiv.appendChild(removeBtn);
            // Progress bar container
            const progContainer = document.createElement('div');
            progContainer.className = 'progress-bar-container';
            const bar = document.createElement('div');
            bar.className = 'progress-bar';
            progContainer.appendChild(bar);
            previewDiv.appendChild(progContainer);
            // Attach drag event listeners
            previewDiv.addEventListener('dragstart', handleDragStart);
            previewDiv.addEventListener('dragend', handleDragEnd);
            previewDiv.addEventListener('dragover', handleDragOver);
            previewDiv.addEventListener('drop', handleDrop);
            previewContainer.appendChild(previewDiv);
            // Store file and progress bar references
            selectedFiles.push({ file: file, progressBar: bar, previewURL: objURL, div: previewDiv });
          });
          // Enable upload button if we have valid files
          if (selectedFiles.length > 0) {
            uploadBtn.disabled = false;
          }
          // Reset file input to allow selecting same files again
          multiInput.value = '';
        };

        // Handle upload process
        uploadBtn.onclick = async () => {
          // If no selected files, do nothing
          if (selectedFiles.length === 0) return;
          console.log('Gallery upload started, files:', selectedFiles.map(f => f.file.name));
          // Disable only the upload button; leave other UI elements active
          uploadBtn.disabled = true;
          messages.innerHTML = '';
          let successCount = 0;
          let errorCount = 0;
          let skippedCount = 0;
          const errorMessages = [];
          // Helper to read a single file as a Data URL with progress
          async function readFile(item) {
            const { file, progressBar } = item;
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onprogress = function(ev) {
                if (ev.lengthComputable) {
                  const percent = (ev.loaded / ev.total) * 100;
                  progressBar.style.width = percent.toFixed(2) + '%';
                }
              };
              reader.onload = function(ev) {
                resolve({ data: ev.target.result });
              };
              reader.onerror = function() {
                const errMsg = 'Failed to read ' + file.name;
                console.error(errMsg);
                progressBar.style.width = '100%';
                progressBar.style.background = 'red';
                errorMessages.push(errMsg);
                resolve({ error: true });
              };
              try {
                reader.readAsDataURL(file);
              } catch (e) {
                const errMsg = 'Error reading ' + file.name + ': ' + e.message;
                console.error(errMsg);
                progressBar.style.width = '100%';
                progressBar.style.background = 'red';
                errorMessages.push(errMsg);
                resolve({ error: true });
              }
            });
          }
          // Helper to attempt server upload. If server returns a valid response with a data field, return it. Otherwise return null.
          async function tryServerUpload(file) {
            try {
              const formData = new FormData();
              formData.append('file', file);
              const response = await fetch('/api/upload-gallery', {
                method: 'POST',
                body: formData
              });
              if (response.ok) {
                const data = await response.json();
                if (data && (data.success || data.data)) {
                  return { data: data.data };
                }
                return { error: 'Unexpected response' };
              } else {
                return { error: 'Server responded with status ' + response.status };
              }
            } catch (e) {
              return { error: e.message || 'Network error' };
            }
          }

          // Compress an image file using an offscreen canvas.  This
          // function downsizes the image to at most 1024 pixels on the
          // largest dimension and encodes it as a JPEG at medium quality.
          // Compression helps keep image sizes manageable so they can be
          // stored within browser storage limits.  GIFs are returned
          // without compression to preserve animation.
          async function compressImage(file) {
            // Do not compress GIFs because converting to JPEG would
            // remove animation frames.  Just return null to indicate
            // no compression is performed.
            if (file.type && file.type.toLowerCase() === 'image/gif') {
              return null;
            }
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = function(ev) {
                const img = new Image();
                img.onload = function() {
                  try {
                    const maxDim = 1024;
                    let { width, height } = img;
                    // Compute new dimensions preserving aspect ratio
                    if (width > maxDim || height > maxDim) {
                      if (width > height) {
                        height = (height / width) * maxDim;
                        width = maxDim;
                      } else {
                        width = (width / height) * maxDim;
                        height = maxDim;
                      }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(width);
                    canvas.height = Math.round(height);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    // Convert to JPEG at 0.7 quality to balance size and quality
                    canvas.toBlob(
                      (blob) => {
                        if (!blob) {
                          return reject(new Error('Compression failed'));
                        }
                        const compReader = new FileReader();
                        compReader.onload = function(e2) {
                          resolve(e2.target.result);
                        };
                        compReader.onerror = function() {
                          reject(new Error('Compression read error'));
                        };
                        compReader.readAsDataURL(blob);
                      },
                      'image/jpeg',
                      0.7
                    );
                  } catch (err) {
                    reject(err);
                  }
                };
                img.onerror = function() {
                  reject(new Error('Image load failed for compression'));
                };
                img.src = ev.target.result;
              };
              reader.onerror = function() {
                reject(new Error('Failed to read file for compression'));
              };
              reader.readAsDataURL(file);
            });
          }
          // Process each selected file sequentially.
          //
          // NEW FLOW (v75): Uploads go to the Supabase 'gallery' Storage
          // bucket. The gallery row stores {id, url} — short, syncs to all
          // devices via SupabaseSync.publish, IndexedDB no longer needed
          // for new uploads. Old IndexedDB entries from pre-v75 keep
          // working because the render code already supports both `url`
          // and `data` fields.
          //
          // The previous server-upload path (`/api/upload-gallery`) was
          // dead code — GitHub Pages doesn't have that endpoint so every
          // request 404'd before falling back to local. Removed.
          for (const item of selectedFiles) {
            const { file, previewURL } = item;
            if (item.progressBar) {
              item.progressBar.style.width = '0%';
              item.progressBar.style.background = '';
            }
            let publicUrl = null;
            try {
              // Compress image: 1600px max edge, JPEG q=85.
              // Gallery images are shown larger than menu cards, so we
              // use a bigger max dimension (1600 vs 1200 for menu).
              // GIFs would lose animation — skip compression for them.
              let blobToUpload;
              const isGif = file.type && file.type.toLowerCase() === 'image/gif';
              if (isGif) {
                blobToUpload = file;  // upload original to preserve animation
              } else {
                blobToUpload = await window.resizeImageFileGeneric(file, 1600, 0.85);
              }
              if (item.progressBar) {
                item.progressBar.style.width = '50%';
              }
              const ext = isGif
                ? 'gif'
                : 'jpg';
              publicUrl = await window.uploadImageToStorage(blobToUpload, 'gallery', 'gal', ext);
              if (item.progressBar) {
                item.progressBar.style.width = '100%';
                item.progressBar.style.background = 'green';
              }
            } catch (err) {
              console.error('[Gallery upload] failed for', file.name, err);
              const errMsg = 'Upload failed for ' + file.name + ': ' + (err.message || err);
              errorMessages.push(errMsg);
              if (item.progressBar) {
                item.progressBar.style.width = '100%';
                item.progressBar.style.background = 'red';
              }
              item.state = 'error';
              errorCount++;
              if (previewURL) {
                try { URL.revokeObjectURL(previewURL); } catch (ex) {}
              }
              continue;
            }
            // Clean up preview URL
            if (previewURL) {
              try { URL.revokeObjectURL(previewURL); } catch (ex) {}
            }
            // Duplicate check by URL.
            // Two distinct uploads will always produce distinct URLs (filename
            // includes timestamp + random suffix), so URL collisions effectively
            // can't happen for legitimately new uploads. Old base64-only
            // entries are kept as-is and not deduped against URLs.
            if (appState.gallery.some(function (g) {
              return g && g.url && g.url === publicUrl;
            })) {
              if (item.progressBar) {
                item.progressBar.style.background = '#ccc';
              }
              item.state = 'skipped';
              skippedCount++;
              continue;
            }
            // Add to gallery as a URL-only entry (no `data` field).
            const newId = generateId();
            const galleryEntry = { id: newId, url: publicUrl };
            App.Repo.Gallery._pushMeta(galleryEntry);
            // Explicit sync publish — the diff engine excludes gallery for
            // performance reasons (legacy: it used to contain huge base64
            // strings). With URLs the entries are tiny, but we still keep
            // them out of the diff path and use explicit publishes for
            // both insert and remove (parallels the delete path).
            try {
              if (App.SupabaseSync && App.SupabaseSync.publishCreate) {
                App.SupabaseSync.publishCreate('gallery', galleryEntry);
              }
            } catch (pubErr) {
              console.warn('[Gallery upload] sync publish failed (non-fatal)', pubErr);
            }
            item.state = 'success';
            successCount++;
          }
          // Persist and update UI if there were any processed files
          if (successCount > 0 || skippedCount > 0 || errorCount > 0) {
            saveData();
            if (App.SupabaseSync && App.SupabaseSync.flushNow) {
              App.SupabaseSync.flushNow();
            }
            buildWebsite();
          }
          // Display messages
          if (successCount > 0) {
            const succ = document.createElement('div');
            succ.textContent =
              successCount +
              ' image' +
              (successCount > 1 ? 's' : '') +
              ' uploaded successfully.';
            succ.className = 'success-msg';
            messages.appendChild(succ);
          }
          if (errorCount > 0) {
            // Show each error message for clarity
            errorMessages.forEach((msg) => {
              const errDiv = document.createElement('div');
              errDiv.textContent = msg;
              errDiv.className = 'error-msg';
              messages.appendChild(errDiv);
            });
          }
          if (skippedCount > 0) {
            const skip = document.createElement('div');
            skip.textContent =
              skippedCount +
              ' duplicate image' +
              (skippedCount > 1 ? 's were' : ' was') +
              ' skipped.';
            skip.className = 'error-msg';
            messages.appendChild(skip);
          }
          // Re-render the gallery management after a short delay to clear selections
          setTimeout(() => {
            renderGalleryManagement(container);
          }, 500);
          console.log('Gallery upload finished, successes:', successCount, 'errors:', errorCount, 'skipped:', skippedCount);
        };
      }

      /** Render reviews management section */
      function renderReviewsManagement(container) {
        container.innerHTML = '<h3>Reviews Management</h3>';
        const table = document.createElement('table');
        table.className = 'table';
        table.innerHTML = '<thead><tr><th>Name</th><th>Rating</th><th>Message</th><th>Actions</th></tr></thead>';
        const tbody = document.createElement('tbody');
        appState.reviews.forEach((rev, idx) => {
          const tr = document.createElement('tr');
          [rev.name, rev.rating, rev.message].forEach((value) => {
            const td = document.createElement('td');
            td.textContent = String(value == null ? '' : value);
            tr.appendChild(td);
          });
          const tdActions = document.createElement('td');
          const editBtn = document.createElement('button');
          editBtn.className = 'btn';
          editBtn.style.marginRight = '6px';
          editBtn.textContent = 'Edit';
          editBtn.onclick = () => {
            openEditReviewModal(idx);
          };
          const del = document.createElement('button');
          del.className = 'btn';
          del.textContent = 'Delete';
          del.onclick = () => {
            if (confirm('Delete this review?')) {
              var __delReviewId = appState.reviews[idx] && appState.reviews[idx].id;
              appState.reviews.splice(idx, 1);
              saveData();
              if (App.SupabaseSync && __delReviewId) {
                App.SupabaseSync.publishRemove('reviews', __delReviewId);
              }
              renderReviewsManagement(container);
              buildWebsite();
            }
          };
          tdActions.appendChild(editBtn);
          tdActions.appendChild(del);
          tr.appendChild(tdActions);
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
        const addBtn = document.createElement('button');
        addBtn.className = 'btn';
        addBtn.textContent = 'Add Review';
        addBtn.onclick = () => {
          openEditReviewModal(null);
        };
        container.appendChild(addBtn);
      }

      /** Render staff management section for admin */
      function renderStaffManagement(container) {
        container.innerHTML = '<h3>Staff Management</h3>';
        const table = document.createElement('table');
        table.className = 'table';
        table.innerHTML = '<thead><tr><th>Role</th><th>Email</th><th>Name</th><th>Status</th><th>Sections</th><th>Notifications</th><th>Actions</th></tr></thead>';
        const tbody = document.createElement('tbody');
        appState.users.forEach((user, idx) => {
          if (!['staff', 'owner'].includes(user.role)) return;
          const tr = document.createElement('tr');
          const sections = (user.sectionsAccess || []).join(', ');
          const notificationLabels = [];
          const notificationSections = user.notificationPrefs && user.notificationPrefs.sections ? user.notificationPrefs.sections : {};
          if (notificationSections.orders) notificationLabels.push('Orders');
          if (notificationSections.reservations) notificationLabels.push('Reservations');
          if (notificationSections.requests) notificationLabels.push('Requests');
          // Status: shows whether the staff member has completed sign-up.
          //  - "Linked" means they've signed up with this email and the
          //    auth_user_id is on the row (they can log in).
          //  - "Awaiting Sign-up" means the invite is pending — the
          //    staff member hasn't yet completed signup with this email.
          const linked = !!user.auth_user_id;
          const statusBadge = linked
            ? '<span style="color:#7ed957;font-weight:600;">✓ Linked</span>'
            : '<span style="color:#f0a868;font-weight:600;">Awaiting Sign-up</span>';
          tr.innerHTML = `<td>${getUserRoleLabel(user)}</td>
            <td>${escapeHtml(user.email || user.username || '-')}</td>
            <td>${escapeHtml(user.displayName || '')}</td>
            <td>${statusBadge}</td>
            <td>${escapeHtml(sections || 'None')}</td>
            <td>${escapeHtml(notificationLabels.join(', ') || 'Silent')}</td>`;
          const tdActions = document.createElement('td');
          const edit = document.createElement('button');
          edit.className = 'btn';
          edit.style.marginRight = '6px';
          edit.textContent = 'Edit';
          edit.onclick = () => editStaff(user);
          const del = document.createElement('button');
          del.className = 'btn';
          del.textContent = 'Delete';
          del.onclick = () => {
            if (confirm('Delete this staff user?')) {
              var __delStaffId = appState.users[idx] && appState.users[idx].id;
              appState.users.splice(idx, 1);
              saveData();
              if (App.SupabaseSync && __delStaffId) {
                App.SupabaseSync.publishRemove('users', __delStaffId);
              }
              renderStaffManagement(container);
            }
          };
          tdActions.appendChild(edit);
          tdActions.appendChild(del);
          tr.appendChild(tdActions);
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
        const addBtn = document.createElement('button');
        addBtn.className = 'btn';
        addBtn.textContent = 'Add Account';
        addBtn.onclick = () => editStaff(null);
        container.appendChild(addBtn);
      }

      /**
       * Add or edit staff user.  Opens the staff modal instead of using prompts.
       */
      function editStaff(user) {
        openEditStaffModal(user);
      }

      /**
       * Render submitted contact requests for the administrator.
       * Requests are created only by logged-in customer accounts and include
       * the account email, customer name, message, and timestamp.
       */
      function renderRequestsManagement(container) {
        container.innerHTML = '<h3>Contact Requests</h3>';
        const intro = document.createElement('p');
        intro.textContent = 'Messages submitted from logged-in customer accounts appear here.';
        container.appendChild(intro);
        const statusRow = document.createElement('div');
        statusRow.className = 'realtime-chip-row';
        statusRow.innerHTML = `
          <div class="realtime-chip"><span class="status-pulse"></span><span>Live updates active</span></div>
          <div class="realtime-chip"><span>${getSectionUnreadCount('requests')}</span><span>new item(s)</span></div>
        `;
        container.appendChild(statusRow);
        const requests = Array.isArray(appState.requests) ? appState.requests : [];
        if (requests.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'alert';
          empty.textContent = 'No contact requests have been submitted yet.';
          container.appendChild(empty);
          return;
        }
        const list = document.createElement('div');
        list.className = 'request-card-list';
        requests.forEach((request) => {
          const time = request.timestamp || request.createdAt || Date.now();
          const card = document.createElement('div');
          card.className = 'request-card';
          const details = document.createElement('div');
          details.innerHTML = `
            <strong>${escapeHtml(request.name || 'Customer')}</strong>
            <span>${escapeHtml(request.email || 'No email provided')}</span>
            <div class="request-meta">
              <small>${new Date(time).toLocaleString()}</small>
            </div>
          `;
          const action = document.createElement('div');
          const viewBtn = document.createElement('button');
          viewBtn.className = 'btn';
          viewBtn.textContent = 'View';
          viewBtn.onclick = () => openRequestDetailsModal(request.id);
          action.appendChild(viewBtn);
          card.appendChild(details);
          card.appendChild(action);
          list.appendChild(card);
        });
        container.appendChild(list);
      }

      /**
       * Render the customer management section for the admin.  Lists all
       * registered customers with basic details and allows removal of
       * accounts.  This function is invoked when the admin selects the
       * "Users" section from the navigation.  It intentionally excludes
       * staff and admin roles from the listing.
       */
      function renderUsersManagement(container) {
        const getRole = (user) => getUserRoleLabel ? getUserRoleLabel(user) : (user.role || 'User');
        const getPermissions = (user) => {
          if (user.role === 'customer') return ['Ordering', 'Contact Requests'];
          const perms = [];
          (user.sectionsAccess || []).forEach((section) => perms.push(section));
          (user.permissions || []).forEach((permission) => perms.push(permission));
          return Array.from(new Set(perms)).slice(0, 6);
        };
        const getStatus = (user) => {
          if (user.role === 'customer') return user.verified ? { label: 'Verified', cls: 'is-verified' } : { label: 'Unverified', cls: 'is-unverified' };
          return { label: user.disabled ? 'Disabled' : 'Active', cls: user.disabled ? 'is-disabled' : 'is-active' };
        };
        const getLastActivity = (user) => {
          const orderTimes = (appState.orders || [])
            .filter((order) => String(order.userId || '') === String(user.id || ''))
            .map((order) => getOrderTimestamp(order) || order.date || 0)
            .filter(Boolean);
          const requestTimes = (appState.requests || [])
            .filter((request) => String(request.userId || '') === String(user.id || '') || String(request.email || '') === String(user.email || ''))
            .map((request) => request.timestamp || request.createdAt || 0)
            .filter(Boolean);
          const last = Math.max(Number(user.lastActivity || 0), Number(user.lastLogin || 0), Number(user.updatedAt || 0), ...orderTimes, ...requestTimes, 0);
          return last ? new Date(last).toLocaleString() : 'No activity yet';
        };
        const users = (appState.users || []).filter((user) => user.role !== 'admin');
        container.innerHTML = `
          <div class="admin-page-shell users-admin-shell">
            <div class="admin-page-head">
              <div class="admin-page-title-block">
                <span class="admin-page-eyebrow">Account Directory</span>
                <h3>Users</h3>
                <p>Review customer and team accounts with roles, contact details, access scope, account status, and recent activity.</p>
              </div>
              <div class="admin-toolbar">
                <button class="btn" type="button" id="adminExportUsersBtn"><i class="fa-solid fa-file-export" aria-hidden="true"></i> Export</button>
              </div>
            </div>
            <div class="admin-data-card">
              <div class="erp-table-wrap">
                <table class="erp-table">
                  <thead>
                    <tr>
                      <th style="width:36px;text-align:center;"><input type="checkbox" id="usersSelectAll" title="Select all" /></th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Contact</th>
                      <th>Email</th>
                      <th>Permissions</th>
                      <th>Status</th>
                      <th>Last Activity</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${users.map((user) => {
                      const status = getStatus(user);
                      const permissions = getPermissions(user);
                      const contact = user.phone || user.contact || user.mobile || '-';
                      const name = user.displayName || user.name || user.username || 'User';
                      return `
                        <tr>
                          <td style="text-align:center;"><input type="checkbox" class="user-select-checkbox" data-user-id="${escapeHtml(user.id || '')}" /></td>
                          <td><div class="erp-identity-cell"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(user.username || user.id || '')}</span></div></td>
                          <td>${escapeHtml(getRole(user))}</td>
                          <td>${escapeHtml(contact)}</td>
                          <td>${escapeHtml(user.email || '-')}</td>
                          <td><div class="admin-chip-list">${permissions.length ? permissions.map((permission) => `<span class="admin-chip">${escapeHtml(permission)}</span>`).join('') : '<span class="admin-chip">Standard</span>'}</div></td>
                          <td><span class="admin-status-badge ${status.cls}">${escapeHtml(status.label)}</span></td>
                          <td>${escapeHtml(getLastActivity(user))}</td>
                          <td><div class="inline-action-row">${user.role === 'customer' ? `<button class="btn admin-action-btn secondary" type="button" data-user-action="view" data-user-id="${escapeHtml(user.id || '')}">View</button>` : `<button class="btn admin-action-btn secondary" type="button" data-user-action="edit" data-user-id="${escapeHtml(user.id || '')}">Edit</button>`}<button class="btn admin-action-btn danger" type="button" data-user-action="delete" data-user-id="${escapeHtml(user.id || '')}">Delete</button></div></td>
                        </tr>
                      `;
                    }).join('') || '<tr><td colspan="9">No users found.</td></tr>'}
                  </tbody>
                </table>
              </div>
              <div class="admin-mobile-card-list">
                ${users.map((user) => {
                  const status = getStatus(user);
                  const permissions = getPermissions(user);
                  const contact = user.phone || user.contact || user.mobile || '-';
                  const name = user.displayName || user.name || user.username || 'User';
                  return `
                    <article class="admin-mobile-card">
                      <div class="admin-mobile-card-head">
                        <input type="checkbox" class="user-select-checkbox" data-user-id="${escapeHtml(user.id || '')}" />
                        <div class="erp-identity-cell"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(getRole(user))} • ${escapeHtml(user.username || user.id || '')}</span></div>
                      </div>
                      <div class="admin-mobile-grid">
                        <div class="admin-mobile-field"><span>Contact</span><strong>${escapeHtml(contact)}</strong></div>
                        <div class="admin-mobile-field"><span>Email</span><strong>${escapeHtml(user.email || '-')}</strong></div>
                        <div class="admin-mobile-field"><span>Status</span><strong><span class="admin-status-badge ${status.cls}">${escapeHtml(status.label)}</span></strong></div>
                        <div class="admin-mobile-field"><span>Last Activity</span><strong>${escapeHtml(getLastActivity(user))}</strong></div>
                      </div>
                      <div class="admin-chip-list">${permissions.length ? permissions.map((permission) => `<span class="admin-chip">${escapeHtml(permission)}</span>`).join('') : '<span class="admin-chip">Standard</span>'}</div>
                      <div class="inline-action-row">${user.role === 'customer' ? `<button class="btn admin-action-btn secondary" type="button" data-user-action="view" data-user-id="${escapeHtml(user.id || '')}">View</button>` : `<button class="btn admin-action-btn secondary" type="button" data-user-action="edit" data-user-id="${escapeHtml(user.id || '')}">Edit</button>`}<button class="btn admin-action-btn danger" type="button" data-user-action="delete" data-user-id="${escapeHtml(user.id || '')}">Delete</button></div>
                    </article>
                  `;
                }).join('') || '<div class="admin-mobile-card">No users found.</div>'}
              </div>
            </div>
          </div>
        `;
        // Select-all checkbox toggles every per-row checkbox
        const selectAllUsers = container.querySelector('#usersSelectAll');
        if (selectAllUsers) {
          selectAllUsers.onchange = () => {
            const boxes = container.querySelectorAll('.user-select-checkbox');
            boxes.forEach((b) => { b.checked = selectAllUsers.checked; });
          };
        }
        const exportBtn = container.querySelector('#adminExportUsersBtn');
        if (exportBtn) {
          exportBtn.onclick = () => {
            // Collect any per-row checked user IDs. If none are checked,
            // export modal applies to all users (existing default).
            const selectedIds = Array.from(
              container.querySelectorAll('.user-select-checkbox')
            )
              .filter((cb) => cb.checked)
              .map((cb) => cb.getAttribute('data-user-id'))
              .filter(Boolean);
            window.__exportSelectedUserIds = selectedIds;
            openExportUsersModal();
          };
        }
        container.querySelectorAll('[data-user-action]').forEach((button) => {
          button.addEventListener('click', () => {
            const id = button.getAttribute('data-user-id');
            const user = (appState.users || []).find((entry) => String(entry.id || '') === String(id));
            if (!user) return;
            const action = button.getAttribute('data-user-action');
            if (action === 'view') {
              openUserDetailsModal(user.id);
            } else if (action === 'edit') {
              editStaff(user);
            } else if (action === 'delete' && confirm('Delete this user?')) {
              const index = appState.users.findIndex((entry) => String(entry.id || '') === String(id));
              if (index !== -1) {
                var __delUserId = appState.users[index] && appState.users[index].id;
                appState.users.splice(index, 1);
                saveData();
                if (App.SupabaseSync && __delUserId) {
                  App.SupabaseSync.publishRemove('users', __delUserId);
                }
                renderUsersManagement(container);
              }
            }
          });
        });
      }

    /**
     * Render the password management section for the administrator.  This section
     * presents a simple call‑to‑action to update the currently logged in user's
     * password via a professional modal.  When the "Change Password" button is
     * clicked, a modal containing fields for the current password, a new
     * password and a confirmation will be displayed.  Updating the password
     * persists the change to localStorage and closes the modal.
     */
    function renderPasswordSection(container) {
      container.innerHTML = '<h3>Change Password</h3>';
      const info = document.createElement('p');
      info.textContent = 'Click the button below to update your password.';
      container.appendChild(info);
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = 'Change Password';
      btn.onclick = () => {
        openChangePasswordModal();
      };
      container.appendChild(btn);
    }

      /** Render readonly menu view for staff */
      function renderMenuView(container) {
        container.innerHTML = '<h3>Menu</h3>';
        const grid = document.createElement('div');
        grid.className = 'items';
        appState.menuItems.forEach((item) => {
          // Disabled items are shown to staff too (dimmed) so they have
          // the same view as customers and know what's marked unavailable.
          const isItemDisabled = (item.enabled === false);
          const pricing = getMenuPricing(item);
          const card = document.createElement('div');
          card.className = 'menu-card';
          if (isItemDisabled) card.classList.add('menu-card-disabled');
          const media = document.createElement('div');
          media.className = 'media';
          appendProductBadges(media, item, pricing);
          if (isItemDisabled) {
            const unavailableBadge = document.createElement('div');
            unavailableBadge.className = 'unavailable-badge';
            unavailableBadge.textContent = (window.translateUiText
              ? window.translateUiText('Sold Out')
              : 'Sold Out');
            media.appendChild(unavailableBadge);
          }
          const img = document.createElement('img');
          img.src = item.image ||
            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=60';
          img.alt = item.name;
          media.appendChild(img);
          const content = document.createElement('div');
          content.className = 'content';
          const title = document.createElement('h4');
          title.textContent = item.name;
          const desc = document.createElement('p');
          desc.textContent = item.description;
          const price = document.createElement('div');
          price.className = 'price';
          price.appendChild(createPriceStack(pricing));
          content.appendChild(title);
          content.appendChild(desc);
          content.appendChild(price);
          card.appendChild(media);
          card.appendChild(content);
          grid.appendChild(card);
        });
        container.appendChild(grid);
      }

      // Keep the default menu count responsive when switching between desktop and mobile widths
      // without collapsing an already expanded menu. Only the View Less button collapses products.
      let menuResizeTimer = null;
      window.addEventListener('resize', () => {
        clearTimeout(menuResizeTimer);
        menuResizeTimer = setTimeout(() => {
        buildMenuItems(selectedMenuCategory);
        const nextMode = getHeroDeviceMode();
        if (nextMode !== heroViewportMode) {
          heroViewportMode = nextMode;
          applyHeroBackgroundMedia();
          renderAnnouncementPopup();
        }
      }, 180);
    });

      // ========== Application bootstrapping ========== //
      function afgrStartApp() {
        // The restaurant's static HTML is visible immediately. No secondary
        // HTML loading screen and no waiting for image/CDN load events.
        // Verify Auth before rendering any cached customer/account data.
        var websiteEl = document.getElementById('website');

        // Restore and VERIFY the persisted Supabase Auth session first.
        // Cloud sync must not race ahead of auth restoration (RLS uses auth.uid()).
        var authBootPromise = Promise.resolve();
        try {
          if (App.Services && App.Services.Auth && typeof App.Services.Auth.bootstrap === 'function') {
            authBootPromise = Promise.resolve(App.Services.Auth.bootstrap());
          }
        } catch (e) { console.warn('[Boot] auth bootstrap dispatch failed', e); }

        var bootstrapPromise = authBootPromise.catch(function (e) {
          console.warn('[Boot] auth bootstrap rejected', e);
        }).then(function () {
          // First account-safe render starts as soon as Auth is verified,
          // rather than waiting for ten remote Supabase table queries.
          doInitialRender('auth-restored');
          // Start Realtime immediately once Auth is restored. Staff should
          // receive an in-app alert even while the ten cloud tables load.
          if (App.SupabaseSync && App.SupabaseSync.subscribe) {
            try { App.SupabaseSync.subscribe(); }
            catch (error) { console.warn('[AFGR] early realtime unavailable', error); }
          }
          // Cloud data still refreshes in the background; the sync service
          // rebuilds the public view and any active workspace when ready.
          if (App.SupabaseSync && App.SupabaseSync.bootstrap) return App.SupabaseSync.bootstrap();
        }).catch(function (e) {
          console.warn('[Boot] sync bootstrap rejected', e);
        });

        // Start gallery load in parallel (independent of render path)
        var galleryPromise = loadGalleryImages().catch(function (err) {
          console.error('Error loading gallery images', err);
        });

        // Set up render path immediately. Bootstrap typically resolves
        // in 1-2s on a fast connection; we don't wait for gallery
        // (which can be slow on first visit because images are loaded
        // from IndexedDB into memory).
        var initialRenderDone = false;
        function doInitialRender(source) {
          if (initialRenderDone) return;
          initialRenderDone = true;
          try { buildWebsite(); } catch (e) {
            console.warn('[Boot] initial buildWebsite failed', e);
          }
          try {
            if (websiteEl) websiteEl.style.visibility = '';
            // Remove the body-level loading class so #website,
            // #adminPanel, and #staffPanel become visible. The
            // anti-flash inline CSS in <head> kept them hidden up
            // to this point.
            document.body.classList.remove('app-loading');
            var pre = document.getElementById('preloader');
            if (pre) pre.style.display = 'none';
          } catch (e) {}
          console.info('[Boot] initial render complete via', source,
            '— elapsed:', Math.round(performance.now()), 'ms');
        }

        // Init realtime system right away — it doesn't need any data
        initRealtimeSystem();
        updateCartUI();

        // Primary render path: fires as soon as bootstrap resolves.
        if (bootstrapPromise) {
          bootstrapPromise.then(function () { doInitialRender('supabase-bootstrap'); });
        } else {
          doInitialRender('no-bootstrap');
        }

        // Once gallery finishes loading (or 5s timeout), re-render to
        // pick up gallery images. This doesn't block the initial render
        // — if bootstrap already completed, the site is already visible
        // with placeholder gallery images; this second render swaps in
        // the real ones.
        var galleryTimeout = new Promise(function (resolve) { setTimeout(resolve, 5000); });
        Promise.race([galleryPromise, galleryTimeout]).then(function () {
          if (initialRenderDone) {
            try { buildWebsite(); } catch (e) {}
          }
        });

        setTimeout(() => {
          const announcementCloseBtn = document.getElementById('announcementPopupClose');
          if (announcementCloseBtn && !announcementCloseBtn.dataset.bound) {
            announcementCloseBtn.dataset.bound = 'true';
            announcementCloseBtn.addEventListener('click', () => closeAnnouncementPopup(true));
          }
          const announcementPopup = document.getElementById('announcementPopup');
          if (announcementPopup && !announcementPopup.dataset.bound) {
            announcementPopup.dataset.bound = 'true';
            announcementPopup.addEventListener('click', (event) => {
              if (event.target === announcementPopup) closeAnnouncementPopup(true);
            });
          }
          // The public homepage is already visible; a slow network cannot trap the visitor behind a loader.
        }, 0);


            // Restore a verified session in Restaurant View. Notification
            // deep links alone may open a management panel on launch.
            if (window.AFGRWorkspace && window.AFGRWorkspace.start) {
              window.AFGRWorkspace.start();
            }
  // Removed obsolete simple tagline settings panel.  Tagline editing is handled in the main admin panel.
      }
      // DOMContentLoaded does not wait for all images, external async scripts,
      // or background fonts. This is the earliest safe point for startup.
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', afgrStartApp, {once:true});
      else afgrStartApp();
      window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeAnnouncementPopup(true);
      });
      (function () {
        const KEY = 'restaurantSessionLanguage';
        let lang = sessionStorage.getItem(KEY) === 'ar' ? 'ar' : 'en';
        let applying = false;
        let observer = null;
        let frameId = 0;
        const pendingRoots = new Set();
        const textCache = new WeakMap();
        const attrCache = new WeakMap();
        // EXCLUDED REGIONS (kept in English regardless of language toggle):
        // - script/style/noscript/svg: never translate
        // - footer: site footer stays in English
        // - #heroHeading: ONLY the main headline (H1 "Welcome") inside the
        //   hero stays English. The sub-tagline (#heroTagline) IS translated.
        // - #navLogo: the restaurant brand name in the navbar stays English.
        //   The nav buttons (Home, Menu, etc.) inside the navbar ARE translated.
        // - #footerText, #developerContactLink: specific brand strings
        // - elements with data-i18n-ignore / data-no-translate / data-language-toggle
        //
        // Note: #topBar (announcement bar) IS translated.
        //       Nav buttons IN .navbar ARE translated (brand stays English via #navLogo).
        //       #heroTagline (sub-tagline) IS translated.
        const EXCLUDE = [
          'script', 'style', 'noscript', 'svg',
          'footer', '.site-footer', '#siteFooter',
          '#heroHeading',
          '[data-language-toggle]', '[data-i18n-ignore]', '[data-no-translate]',
          '#navLogo', '#footerText', '#developerContactLink'
        ].join(',');
        const ATTRS = ['placeholder', 'title', 'aria-label', 'value'];
        const PHONE_RX = /([+]?\d[\d\s().-]{5,}\d)/g;
        const ar = {
          'Welcome': 'مرحباً',
          'Best Grill & Restaurant': 'أفضل مطعم ومشاوي',
          'Authentic Arabic Cuisine': 'مذاق عربي أصيل',
          'Experience the taste of tradition': 'استمتع بمذاق الأصالة',
          'Indulge in mouth‑watering flavours': 'استمتع بنكهات شهية لا تُقاوم',
          'A taste of tradition and luxury': 'مذاق يجمع بين الأصالة والفخامة',
          'Delicious Arabic Specialties': 'أشهى التخصصات العربية',
          'Savour the aroma of heritage': 'تذوّق عبق التراث',
          'Charcoal-grilled to perfection. Every plate at Al Fursan tells a story of heritage, spice, and craft passed down through generations.': 'مشوي على الفحم بإتقان. كل طبق في الفرسان يحكي قصة من التراث والبهارات والحِرفة المتوارثة عبر الأجيال.',
          'Reserve Table': 'احجز طاولة',
          'View Menu': 'عرض القائمة',
          'Chef Special': 'اختيار الشيف',
          'Our Menu': 'قائمتنا',
          'All': 'الكل',
          'Hot Deals': 'العروض الساخنة',
          'Hot Deal': 'عرض ساخن',
          'Grill': 'مشاوي',
          'Seafood': 'مأكولات بحرية',
          'Dessert': 'حلويات',
          'Drinks': 'مشروبات',
          'Mixed Grill Platter': 'طبق مشاوي مشكلة',
          'A sumptuous selection of grilled meats marinated with our signature spices.': 'تشكيلة فاخرة من اللحوم المشوية والمتبّلة بخلطتنا الخاصة.',
          'Seafood Mix Grill': 'مشاوي بحرية مشكلة',
          'Assorted grilled seafood delights including prawns, fish and calamari.': 'تشكيلة شهية من المأكولات البحرية المشوية تشمل الروبيان والسمك والكاليماري.',
          'Kunafa': 'كنافة',
          'Sweet cheese pastry dessert drizzled with rose water and pistachios.': 'حلوى جبنية شرقية مغطاة بماء الورد والفستق.',
          'Arabic Coffee': 'قهوة عربية',
          'Traditional Arabic coffee infused with cardamom and served with dates.': 'قهوة عربية تقليدية بنكهة الهيل وتُقدّم مع التمر.',
          'Add': 'أضف',
          'Add to Cart': 'أضف إلى السلة',
          'View More': 'عرض المزيد',
          'View Less': 'عرض أقل',
          'Reserve Your Table': 'احجز طاولتك',
          'We look forward to welcoming you.': 'نتطلع إلى الترحيب بك.',
          'Choose your preferred date, time, and party size below.': 'اختر التاريخ والوقت وعدد الضيوف المناسب لك أدناه.',
          'Name': 'الاسم',
          'Phone': 'الهاتف',
          'Date': 'التاريخ',
          'Time': 'الوقت',
          'Guests': 'الضيوف',
          'Select party size': 'اختر عدد الضيوف',
          '1 Guest': 'ضيف واحد',
          '2 Guests': 'ضيفان',
          '3 Guests': '3 ضيوف',
          '4 Guests': '4 ضيوف',
          '5 Guests': '5 ضيوف',
          '6 Guests': '6 ضيوف',
          '7 Guests': '7 ضيوف',
          '8 Guests': '8 ضيوف',
          '9 Guests': '9 ضيوف',
          '10+ Guests': '10+ ضيوف',
          'Confirm Reservation': 'تأكيد الحجز',
          'Reservations are available for registered customers and confirmed instantly after submission.': 'الحجوزات متاحة للعملاء المسجلين ويتم تأكيدها فور الإرسال.',
          'Offers': 'العروض',
          'Seasonal Privileges': 'امتيازات موسمية',
          'Offers & Deals': 'العروض والصفقات',
          'Curated dining privileges with a refined finish, crafted to reward every table without crowding the experience.': 'امتيازات طعام مختارة بعناية ولمسة راقية، صُممت لمكافأة كل طاولة دون ازدحام التجربة.',
          'Limited-time indulgences': 'متعة لفترة محدودة',
          'Fresh dining privileges will appear here shortly.': 'ستظهر امتيازات الطعام الجديدة هنا قريباً.',
          'Special': 'مميز',
          'Chef Pick': 'اختيار الشيف',
          'Signature': 'مميز',
          'DEAL': 'عرض',
          'Deal': 'عرض',
          'Deals': 'العروض',
          'Deal Details': 'تفاصيل العرض',
          'Combo Deal': 'عرض مجمع',
          'Single Product Deal': 'عرض منتج واحد',
          'Active Deal': 'عرض نشط',
          'This deal is valid only when you add:': 'هذا العرض صالح فقط عند إضافة:',
          'This product includes an active deal.': 'هذا المنتج يتضمن عرضاً نشطاً.',
          'Available for a limited time': 'متاح لفترة محدودة',
          'Valid until': 'صالح حتى',
          'OFF': 'خصم',
          'Ending Soon': 'ينتهي قريباً',
          'Expired': 'منتهي',
          'remaining': 'متبقية',
          'Valid for': 'صالح لـ',
          'Selected Product': 'منتج مختار',
          // v89: badge text for disabled menu products (replaces older
          // "Currently Unavailable" wording).
          'Sold Out': 'نفدت الكمية',
          // v90: companion sold-out sentences (tooltip + popup) so
          // Arabic users see proper local phrasing.
          'This item is sold out': 'نفدت كمية هذا المنتج',
          'This item is sold out.': 'نفدت كمية هذا المنتج.',
          'Valid for selected products': 'صالح للمنتجات المختارة',
          'Valid on entire bill': 'صالح على كامل الفاتورة',
          'Gallery': 'المعرض',
          'Signature Moments': 'لحظات مميزة',
          'A curated look at our ambience, plating, and dining moments — crafted to feel warm, elegant, and unforgettable.': 'نظرة مختارة على أجوائنا وتقديم أطباقنا ولحظات الطعام — مصممة لتكون دافئة وأنيقة ولا تُنسى.',
          'Reviews': 'التقييمات',
          'Guest Impressions': 'انطباعات الضيوف',
          'Reviews & Testimonials': 'التقييمات وآراء العملاء',
          'A refined collection of guest experiences, crafted to feel warm, credible, and worthy of a premium dining brand.': 'مجموعة راقية من تجارب الضيوف، صُممت لتبدو دافئة وموثوقة وجديرة بعلامة طعام فاخرة.',
          'Loved by our guests': 'محبوب من ضيوفنا',
          'Verified Dining Guest': 'ضيف موثّق',
          'No reviews yet.': 'لا توجد تقييمات بعد.',
          'Contact': 'تواصل',
          'Reserve Your Moment': 'احجز لحظتك',
          'Contact Us': 'تواصل معنا',
          'Whether you are planning an intimate dinner, a family celebration, or a special evening, our team is ready to welcome you with warmth and elegance.': 'سواء كنت تخطط لعشاء هادئ أو احتفال عائلي أو أمسية خاصة، فريقنا جاهز لاستقبالك بكل دفء وأناقة.',
          'Send a Message': 'أرسل رسالة',
          'Share your details and we will get back to you with the care your occasion deserves.': 'شاركنا تفاصيلك وسنعود إليك بالعناية التي تستحقها مناسبتك.',
          'Account Email': 'بريد الحساب',
          'Message': 'الرسالة',
          'Submit Request': 'إرسال الطلب',
          'We usually respond as soon as possible during working hours.': 'نرد عادة في أقرب وقت ممكن خلال ساعات العمل.',
          'Connect With Us': 'تواصل معنا',
          'Follow, call, email, or find us with one tap.': 'تابعنا أو اتصل بنا أو راسلنا أو اعثر علينا بلمسة واحدة.',
          'Home': 'الرئيسية',
          'Menu': 'القائمة',
          'Reservation': 'الحجز',
          'Track': 'تتبع',
          'Track Order': 'تتبع الطلب',
          'Back to hero experience': 'العودة إلى الواجهة الرئيسية',
          'Browse signature dishes': 'تصفح أطباقنا المميزة',
          'Book your dining table': 'احجز طاولة الطعام',
          'See live promotions': 'شاهد العروض الحالية',
          'Follow your current order': 'تابع طلبك الحالي',
          'Manage profile and orders': 'إدارة الملف والطلبات',
          'Access your customer account': 'الدخول إلى حسابك',
          'Login': 'تسجيل الدخول',
          'Logout': 'تسجيل الخروج',
          'Account': 'الحساب',
          'Account login': 'تسجيل دخول الحساب',
          'My Account': 'حسابي',
          'Sign Up': 'إنشاء حساب',
          'Username': 'اسم المستخدم',
          'Username or Email': 'اسم المستخدم أو البريد الإلكتروني',
          'Email': 'البريد الإلكتروني',
          'Contact number (optional)': 'رقم التواصل (اختياري)',
          'Password': 'كلمة المرور',
          'Confirm password': 'تأكيد كلمة المرور',
          'Confirm Password': 'تأكيد كلمة المرور',
          'Create Account': 'إنشاء الحساب',
          'Forgot password?': 'هل نسيت كلمة المرور؟',
          "Don't have an account?": 'ليس لديك حساب؟',
          'Sign up': 'سجّل الآن',
          'Your Cart': 'سلتك',
          'Total:': 'الإجمالي:',
          'Checkout': 'إتمام الطلب',
          'Complete Your Order': 'أكمل طلبك',
          'Subtotal:': 'المجموع الفرعي:',
          'Discount:': 'الخصم:',
          'Delivery Fee:': 'رسوم التوصيل:',
          'Tax:': 'الضريبة:',
          'Payment Method': 'طريقة الدفع',
          'Cash on Delivery': 'الدفع عند الاستلام',
          'Place Order': 'إرسال الطلب',
          'Cancel': 'إلغاء',
          'Close': 'إغلاق',
          'Change Password': 'تغيير كلمة المرور',
          'Current Password': 'كلمة المرور الحالية',
          'New Password': 'كلمة المرور الجديدة',
          'Confirm New Password': 'تأكيد كلمة المرور الجديدة',
          'Save Password': 'حفظ كلمة المرور',
          'Reset Password': 'إعادة تعيين كلمة المرور',
          'Verification Code': 'رمز التحقق',
          'Send Code': 'إرسال الرمز',
          'Order History': 'سجل الطلبات',
          'Order Details': 'تفاصيل الطلب',
          'User Details': 'تفاصيل المستخدم',
          'Track My Order': 'تتبع طلبي',
          'Search': 'بحث',
          'Admin Panel': 'لوحة الإدارة',
          'Staff Panel': 'لوحة الموظفين',
          'Dashboard': 'لوحة التحكم',
          'Settings': 'الإعدادات',
          'Orders': 'الطلبات',
          'Reservations': 'الحجوزات',
          'Categories': 'الفئات',
          'Menu Items': 'عناصر القائمة',
          'Gallery Images': 'صور المعرض',
          'Staff': 'الموظفون',
          'Customers': 'العملاء',
          'Save': 'حفظ',
          'Edit': 'تعديل',
          'Delete': 'حذف',
          'Export': 'تصدير',
          'View': 'عرض',
          'View Details': 'عرض التفاصيل',
          'Enabled': 'مفعّل',
          'Disabled': 'غير مفعّل',
          'Description': 'الوصف',
          'Price': 'السعر',
          'Category': 'الفئة',
          'Image URL or base64 (optional)': 'رابط الصورة أو base64 (اختياري)',
          'Edit Item': 'تعديل العنصر',
          'Edit Staff': 'تعديل الموظف',
          'Permissions': 'الصلاحيات',
          'Display Name': 'اسم العرض',
          'Password (leave blank to keep)': 'كلمة المرور (اتركها فارغة للإبقاء عليها)',
          'Edit Category': 'تعديل الفئة',
          'Category name': 'اسم الفئة',
          'No images yet.': 'لا توجد صور بعد.',
          'Search dishes...': 'ابحث عن الأطباق...',
          'Your full name': 'اسمك الكامل',
          'Your phone number': 'رقم هاتفك',
          'Your name': 'اسمك',
          'Phone number': 'رقم الهاتف',
          'Delivery address': 'عنوان التوصيل',
          'Notes (optional)': 'ملاحظات (اختياري)',
          'Login required': 'يتطلب تسجيل الدخول',
          'Your contact number': 'رقم التواصل',
          'Tell us how we can help...': 'أخبرنا كيف يمكننا مساعدتك...',
          'Enter Order ID': 'أدخل رقم الطلب',
          'Facebook': 'فيسبوك',
          'Instagram': 'إنستغرام',
          'TikTok': 'تيك توك',
          'Gmail': 'جيميل',
          'Google Maps': 'خرائط جوجل',
          'View cart': 'عرض السلة',
          'Close menu': 'إغلاق القائمة',
          'Switch language': 'تبديل اللغة',
          'Language': 'اللغة',
          'Call us: +971 566 583 054 • Monday – Sunday, 8:00AM – 9:00PM': 'اتصل بنا: +971 566 583 054 • من الاثنين إلى الأحد، 8:00 صباحاً – 9:00 مساءً',
          'Monday – Sunday, 8:00AM – 9:00PM': 'من الاثنين إلى الأحد، 8:00 صباحاً – 9:00 مساءً',
          'Downtown Dubai': 'وسط مدينة دبي',
          'Family Feast': 'وليمة عائلية',
          'Get 20% off on orders above AED 150.': 'احصل على خصم 20% على الطلبات التي تزيد عن 150 درهماً.',
          'An unforgettable dining experience! The food was exquisite and the ambience truly luxurious.': 'تجربة طعام لا تُنسى! الطعام كان رائعاً والأجواء فاخرة بحق.',
          'Great service and authentic flavours. Highly recommend the mixed grill platter.': 'خدمة رائعة ونكهات أصيلة. أنصح بشدة بطبق المشاوي المشكلة.',
          'Delete this user?': 'هل تريد حذف هذا المستخدم؟',
          'Please fill all required fields.': 'يرجى تعبئة جميع الحقول المطلوبة.',
          'Please fill all required fields correctly.': 'يرجى تعبئة جميع الحقول المطلوبة بشكل صحيح.',
          'Name is required.': 'الاسم مطلوب.',
          'Username is required.': 'اسم المستخدم مطلوب.',
          'Pending': 'قيد الانتظار',
          'Accepted': 'تم القبول',
          'Preparing': 'قيد التحضير',
          'Out for Delivery': 'خرج للتوصيل',
          'Delivered': 'تم التسليم',
          'Cancelled': 'تم الإلغاء',
          'Accept Order': 'قبول الطلب',
          'Mark Preparing': 'تحديد كقيد التحضير',
          'Mark Dispatch': 'تحديد كقيد التوصيل',
          'Mark Delivered': 'تحديد كمُسلَّم',
          'Cancel Order': 'إلغاء الطلب',
          'Discounts & Deal Information': 'معلومات الخصومات والعروض',
          'Order Timeline': 'تسلسل الطلب',
          'Status Controls': 'التحكم في الحالة',
          'Order-wise View': 'عرض حسب الطلب',
          'Customer-wise Grouped View': 'عرض مجمّع حسب العميل',
          'Deals': 'العروض',
          'Hot Deal Orders': 'طلبات العروض الساخنة',
          'Average preparation time': 'متوسط وقت التحضير',
          'Accepted to prep start': 'من القبول إلى بدء التحضير',
          'Previous gallery collage': 'اللوحة السابقة للمعرض',
          'Show gallery collage': 'عرض لوحة المعرض',
          'Report Summary': 'ملخص التقرير',
          'Report Date:': 'تاريخ التقرير:',
          'Range:': 'النطاق:',
          'Continued report': 'متابعة التقرير',
          'No email saved on account': 'لا يوجد بريد إلكتروني محفوظ في الحساب',
          'Please login to send a request': 'يرجى تسجيل الدخول لإرسال الطلب',
          'Please add an email to your account before sending a request': 'يرجى إضافة بريد إلكتروني إلى حسابك قبل إرسال الطلب',
          'Please enter your message': 'يرجى إدخال رسالتك',
          'Thank you. Your request has been sent.': 'شكراً لك. تم إرسال طلبك.',
          'Open developer information': 'فتح معلومات المطور'
        };

        function getTextRecord(node) {
          let record = textCache.get(node);
          if (!record) {
            record = { source: '', renderedAr: '' };
            textCache.set(node, record);
          }
          return record;
        }

        function normalize(value) {
          return String(value || '').replace(/\s+/g, ' ').trim();
        }

        function protectNumbers(value) {
          return String(value || '').replace(PHONE_RX, '\u2066$1\u2069');
        }

        function isExcluded(el) {
          return !el || !!el.closest(EXCLUDE);
        }

        /* =====================================================================
         * Auto-translation via MyMemory (free public API)
         * =====================================================================
         * For text not covered by the static `ar` dictionary, we asynchronously
         * fetch a translation from MyMemory and cache it. Cached translations
         * are kept in window.__autoArCache for the session AND persisted to
         * appState.config.translations.ar so they survive page reloads and
         * sync across devices via Supabase.
         *
         * Free tier: 5000 requests/day/IP. Each unique English string costs
         * one request the first time it's seen. After caching it costs zero.
         *
         * On request failure or quota exhaustion the text simply stays in
         * English — never breaks the page.
         * ===================================================================== */
        const MIN_AUTO_TRANSLATE_LEN = 2;       // skip 1-character text
        const MAX_AUTO_TRANSLATE_LEN = 500;     // skip absurdly long strings
        const AUTO_TRANSLATE_DEBOUNCE_MS = 500; // batch re-render after fetches
        const REQUEST_TIMEOUT_MS = 5000;

        // In-memory cache (Map for fast lookup)
        if (!window.__autoArCache) window.__autoArCache = new Map();
        // Track which strings are mid-flight so we don't re-request them
        if (!window.__autoArInflight) window.__autoArInflight = new Set();
        // Strings that failed to translate — remember so we don't retry forever
        if (!window.__autoArFailed) window.__autoArFailed = new Set();
        // Strings explicitly known to be non-translatable (numbers, currency, etc.)
        const SKIP_PATTERNS = [
          /^[\d\s.,+\-()\u2066\u2069/:×x]+$/,   // pure numbers / punctuation
          /^AED\s*[\d.,]+\s*$/i,                // currency amounts only
          /^[a-zA-Z]\s*$/,                       // single letter
          /^[\u0600-\u06FF\s\d.,]+$/             // already Arabic
        ];

        function shouldAutoTranslate(text) {
          if (lang !== 'ar') return false;
          if (!text) return false;
          const t = String(text).trim();
          if (t.length < MIN_AUTO_TRANSLATE_LEN) return false;
          if (t.length > MAX_AUTO_TRANSLATE_LEN) return false;
          if (ar[t]) return false;
          if (window.__autoArCache.has(t)) return false;
          if (window.__autoArFailed.has(t)) return false;
          if (window.__autoArInflight.has(t)) return false;
          for (var i = 0; i < SKIP_PATTERNS.length; i++) {
            if (SKIP_PATTERNS[i].test(t)) return false;
          }
          // Skip strings that are mostly digits / symbols (less than 40% letters)
          var letterCount = (t.match(/[a-zA-Z]/g) || []).length;
          if (letterCount / t.length < 0.4) return false;
          return true;
        }

        // Restore any previously cached translations from appState config.
        // This runs once on boot and any time syncRestoreAutoTranslations
        // is called (e.g. after Supabase bootstrap completes).
        function syncRestoreAutoTranslations() {
          try {
            var saved = window.appState && window.appState.config
              && window.appState.config.translations
              && window.appState.config.translations.ar;
            if (!saved || typeof saved !== 'object') return;
            Object.keys(saved).forEach(function (en) {
              if (typeof saved[en] === 'string' && saved[en].trim()) {
                window.__autoArCache.set(en, saved[en]);
              }
            });
          } catch (e) {}
        }
        // Run once now in case appState is already loaded.
        syncRestoreAutoTranslations();
        // Re-run when sync bootstrap completes
        window.__syncAutoTranslations = syncRestoreAutoTranslations;

        // Persist cached translations back into appState config.
        // Debounced because we may fetch many at once.
        var persistTimer = null;
        function persistAutoTranslations() {
          if (persistTimer) clearTimeout(persistTimer);
          persistTimer = setTimeout(function () {
            try {
              if (!window.appState) return;
              if (!window.appState.config) window.appState.config = {};
              if (!window.appState.config.translations) window.appState.config.translations = {};
              var arMap = {};
              window.__autoArCache.forEach(function (v, k) { arMap[k] = v; });
              window.appState.config.translations.ar = arMap;
              if (typeof window.saveData === 'function') {
                try { window.saveData(); } catch (e) {}
              }
            } catch (e) {}
          }, 1200);
        }

        // Debounced re-translation after a batch of fetches finish
        var rerenderTimer = null;
        function scheduleRerender() {
          if (rerenderTimer) clearTimeout(rerenderTimer);
          rerenderTimer = setTimeout(function () {
            rerenderTimer = null;
            if (lang === 'ar' && document.body) {
              try { applyTranslation(document.body); } catch (e) {}
            }
          }, AUTO_TRANSLATE_DEBOUNCE_MS);
        }

        // Fire-and-forget request to MyMemory. On success cache + schedule rerender.
        function requestAutoTranslate(text) {
          if (!shouldAutoTranslate(text)) return;
          window.__autoArInflight.add(text);
          var url = 'https://api.mymemory.translated.net/get?q='
            + encodeURIComponent(text) + '&langpair=en|ar';
          var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
          var timeoutId = ctrl ? setTimeout(function () {
            try { ctrl.abort(); } catch (e) {}
          }, REQUEST_TIMEOUT_MS) : null;
          fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
            .then(function (res) {
              if (timeoutId) clearTimeout(timeoutId);
              if (!res.ok) throw new Error('HTTP ' + res.status);
              return res.json();
            })
            .then(function (data) {
              window.__autoArInflight.delete(text);
              var translated = data && data.responseData && data.responseData.translatedText;
              if (!translated || typeof translated !== 'string') throw new Error('No translation');
              // Reject obviously bad results (echoes of the original or empty)
              if (translated.trim().toLowerCase() === text.trim().toLowerCase()) {
                window.__autoArFailed.add(text);
                return;
              }
              window.__autoArCache.set(text, translated);
              persistAutoTranslations();
              scheduleRerender();
            })
            .catch(function () {
              window.__autoArInflight.delete(text);
              window.__autoArFailed.add(text);
            });
        }

        // Look up auto-translated value for a string, or trigger a fetch
        // for it if we don't have one yet. Returns the Arabic string if
        // cached, otherwise null (and starts an async fetch).
        function getAutoArabic(text) {
          if (!text || lang !== 'ar') return null;
          var t = String(text).trim();
          if (window.__autoArCache.has(t)) return window.__autoArCache.get(t);
          if (shouldAutoTranslate(t)) requestAutoTranslate(t);
          return null;
        }

        function translatePhrase(value) {
          const raw = String(value || '');
          const trimmed = normalize(raw);
          if (!trimmed || lang !== 'ar') return raw;
          if (ar[trimmed]) return protectNumbers(raw.replace(trimmed, ar[trimmed]));
          let translated = trimmed;
          translated = translated
            .replace(/^©\s*(\d{4})\s+(.+)$/g, '© $1 $2')
            .replace(/\bGrills & Restaurant LLC\b/g, 'للمشاوي والمطعم ذ.م.م')
            .replace(/\bRestaurant LLC\b/g, 'المطعم ذ.م.م')
            .replace(/\bDEAL\b/g, ar.DEAL || 'عرض')
            .replace(/\bDeal Details\b/g, ar['Deal Details'] || 'تفاصيل العرض')
            .replace(/\bHot Deals\b/g, ar['Hot Deals'] || 'العروض الساخنة')
            .replace(/\bHot Deal\b/g, ar['Hot Deal'] || 'عرض ساخن')
            .replace(/\bCombo Deal\b/g, ar['Combo Deal'] || 'عرض المجموعة')
            .replace(/\bSingle Product Deal\b/g, ar['Single Product Deal'] || 'عرض منتج واحد')
            .replace(/\bActive Deal\b/g, ar['Active Deal'] || 'عرض نشط')
            // Dynamic percent labels: "40% OFF", "10% off", "20%  off"
            .replace(/(\d+)\s*%\s*OFF/gi, '$1% ' + (ar.OFF || 'خصم'))
            .replace(/(\d+)\s*%\s*off/g, '$1% ' + (ar.OFF || 'خصم'))
            // Dynamic "Saved AED X" labels in checkout product cards
            .replace(/\bSaved\s+AED\s+([\d.]+)/g, 'وفرت AED $1')
            .replace(/\bsaved\s+AED\s+([\d.]+)/g, 'وفرت AED $1')
            .replace(/\bsaved\s+([\d.]+)\s+AED/gi, 'وفرت $1 AED')
            .replace(/—\s*saved\s+/gi, '— وفرت ')
            .replace(/per item\b/gi, 'لكل قطعة')
            // Common bill summary labels (already in dictionary but
            // included here for substring matches in larger strings)
            .replace(/\bSubtotal\b/g, ar['Subtotal'] || 'المجموع الفرعي')
            .replace(/\bDiscount\b/g, ar['Discount'] || 'الخصم')
            .replace(/\bDelivery Charges\b/g, ar['Delivery Charges'] || 'رسوم التوصيل')
            .replace(/\bService Charges\b/g, ar['Service Charges'] || 'رسوم الخدمة')
            .replace(/\bAdvance Tax\b/g, ar['Advance Tax'] || 'الضريبة')
            .replace(/\bGrand Total\b/g, ar['Grand Total'] || 'المجموع الكلي')
            // Quantity / unit / total labels on checkout cards
            .replace(/\bQty\b/g, ar['Qty'] || 'الكمية')
            .replace(/\bUnit\b/g, ar['Unit'] || 'الوحدة')
            .replace(/\bTotal\b/g, ar['Total'] || 'المجموع')
            // Common product description patterns
            .replace(/(\d+)\s+out of 5 stars/g, '$1 من 5 نجوم')
            .replace(/Valid until\s+/g, (ar['Valid until'] || 'صالح حتى') + ' ')
            .replace(/Available for a limited time/g, ar['Available for a limited time'] || 'متاح لفترة محدودة')
            .replace(/Valid for selected products/g, ar['Valid for selected products'] || 'صالح للمنتجات المحددة')
            .replace(/Valid on entire bill/g, ar['Valid on entire bill'] || 'صالح على الفاتورة الكاملة')
            .replace(/Selected Product/g, ar['Selected Product'] || 'منتج محدد')
            .replace(/Valid for /g, (ar['Valid for'] || 'صالح لـ') + ' ')
            .replace(/min AED/g, 'الحد الأدنى AED')
            .replace(/This deal is valid only when you add:/g, ar['This deal is valid only when you add:'] || 'هذا العرض صالح فقط عند إضافة:')
            .replace(/This product includes an active deal\./g, ar['This product includes an active deal.'] || 'يتضمن هذا المنتج عرضًا نشطًا.')
            // Generic "Apply X% OFF when you order:" wrap for combo descriptions
            .replace(/apply\s+(\d+)%\s+OFF\s+when you order:/gi, 'احصل على $1% خصم عند طلب:');
          // If after all dictionary + regex passes the string is unchanged,
          // try the MyMemory auto-translator. Returns cached translation if
          // available; otherwise fires async fetch and returns null (text
          // stays English this render; will re-render when fetch completes).
          if (translated === trimmed) {
            var auto = getAutoArabic(trimmed);
            if (auto) {
              return protectNumbers(raw.replace(trimmed, auto));
            }
          }
          return protectNumbers(translated !== trimmed ? raw.replace(trimmed, translated) : raw);
        }

        function formatCountdown(diff) {
          if (lang !== 'ar') {
            const d = Math.floor(diff / (24 * 60 * 60 * 1000));
            const h = Math.floor((diff / (60 * 60 * 1000)) % 24);
            const m = Math.floor((diff / (60 * 1000)) % 60);
            return d + 'd ' + h + 'h ' + m + 'm remaining';
          }
          const d = Math.floor(diff / (24 * 60 * 60 * 1000));
          const h = Math.floor((diff / (60 * 60 * 1000)) % 24);
          const m = Math.floor((diff / (60 * 1000)) % 60);
          return protectNumbers(d + ' يوم ' + h + ' ساعة ' + m + ' دقيقة متبقية');
        }

        function rememberAttr(el, attr) {
          let cache = attrCache.get(el);
          if (!cache) {
            cache = {};
            attrCache.set(el, cache);
          }
          if (cache[attr] === undefined) cache[attr] = el.getAttribute(attr);
          return cache[attr];
        }

        function translateTextNode(node) {
          if (!node || !node.nodeValue || !node.nodeValue.trim()) return;
          const parent = node.parentElement;
          if (!parent || isExcluded(parent) || parent.closest('input,textarea')) return;
          const record = getTextRecord(node);
          const currentValue = node.nodeValue;
          if (!record.source) {
            record.source = currentValue;
          }
          const next = lang === 'ar' ? translatePhrase(record.source) : record.source;
          if (lang === 'ar') record.renderedAr = next;
          if (node.nodeValue !== next) node.nodeValue = next;
        }

        function translateAttributes(root) {
          const nodes = [];
          if (root.nodeType === 1 && !isExcluded(root)) nodes.push(root);
          if (root.querySelectorAll) nodes.push(...root.querySelectorAll('*:not(script):not(style):not(noscript)'));
          nodes.forEach((el) => {
            if (!el.getAttribute || isExcluded(el)) return;
            ATTRS.forEach((attr) => {
              if (!el.hasAttribute(attr)) return;
              if (attr === 'value' && !/^(BUTTON|INPUT|OPTION)$/i.test(el.tagName)) return;
              if (attr === 'value' && el.tagName === 'INPUT' && !['button', 'submit', 'reset'].includes((el.type || '').toLowerCase())) return;
              const original = rememberAttr(el, attr);
              if (original == null) return;
              const next = lang === 'ar' ? translatePhrase(original) : original;
              if (el.getAttribute(attr) !== next) el.setAttribute(attr, next);
            });
          });
        }

        function applyTranslation(root) {
          if (!document.body) return;
          applying = true;
          const target = root && root.nodeType === 1 ? root : document.body;
          document.documentElement.lang = lang;
          document.documentElement.dataset.lang = lang;
          const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
              return node.nodeValue && node.nodeValue.trim() && !isExcluded(node.parentElement)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
            }
          });
          const nodes = [];
          while (walker.nextNode()) nodes.push(walker.currentNode);
          nodes.forEach(translateTextNode);
          translateAttributes(target);
          document.querySelectorAll('[data-language-toggle]').forEach((button) => {
            button.dataset.activeLang = lang;
            button.setAttribute('aria-label', lang === 'ar' ? 'تبديل اللغة' : 'Switch language');
          });
          document.querySelectorAll('a[href^="tel"],input[type="tel"],.phone-ltr,.numeric-ltr').forEach((el) => {
            el.classList.add('force-ltr');
          });
          // v85: auto-tag any element whose text content includes a
          // phone-number-like pattern OR a timing range (e.g. "8:00 AM",
          // "9:00PM") so the BiDi algorithm doesn't reorder the digit
          // groups when the page is RTL (Arabic). Phone-like = "+" plus
          // any digits, OR 7+ consecutive digits with optional spaces.
          // Timing = digit colon digit (e.g. "8:00").
          //
          // We only inspect text nodes whose parent element doesn't
          // already have force-ltr, to avoid re-walking covered nodes.
          const ltrTextPattern = /\+\s*\d|\d{3,}\s*\d{3,}|\d+:\d+/;
          const ltrWalker = document.createTreeWalker(
            target, NodeFilter.SHOW_TEXT,
            { acceptNode: function (n) {
                if (!n.nodeValue) return NodeFilter.FILTER_REJECT;
                if (!ltrTextPattern.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
                const p = n.parentElement;
                if (!p || p.classList.contains('force-ltr')) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
              }
            }
          );
          while (ltrWalker.nextNode()) {
            const tn = ltrWalker.currentNode;
            if (tn.parentElement) tn.parentElement.classList.add('force-ltr');
          }
          applying = false;
        }

        function captureOriginalText(root) {
          if (!root || !document.body) return;
          const target = root && root.nodeType === 1 ? root : document.body;
          const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
              return node.nodeValue && node.nodeValue.trim() && !isExcluded(node.parentElement)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
            }
          });
          while (walker.nextNode()) {
            const node = walker.currentNode;
            const record = getTextRecord(node);
            record.source = node.nodeValue;
            record.renderedAr = '';
          }
          const nodes = [];
          if (target.nodeType === 1 && !isExcluded(target)) nodes.push(target);
          if (target.querySelectorAll) nodes.push(...target.querySelectorAll('*:not(script):not(style):not(noscript)'));
          nodes.forEach((el) => {
            if (!el.getAttribute || isExcluded(el)) return;
            let cache = attrCache.get(el);
            if (!cache) {
              cache = {};
              attrCache.set(el, cache);
            }
            ATTRS.forEach((attr) => {
              if (!el.hasAttribute(attr)) return;
              if (attr === 'value' && !/^(BUTTON|INPUT|OPTION)$/i.test(el.tagName)) return;
              if (attr === 'value' && el.tagName === 'INPUT' && !['button', 'submit', 'reset'].includes((el.type || '').toLowerCase())) return;
              cache[attr] = el.getAttribute(attr);
            });
          });
        }

        function queueApply(root) {
          if (!root) return;
          pendingRoots.add(root);
          if (frameId) return;
          frameId = requestAnimationFrame(() => {
            const roots = Array.from(pendingRoots);
            pendingRoots.clear();
            frameId = 0;
            roots.forEach((entry) => applyTranslation(entry));
          });
        }

        window.translateUiText = function (value) {
          return lang === 'ar' ? translatePhrase(value) : String(value || '');
        };
        window.formatOfferCountdown = formatCountdown;
        window.applyRestaurantTranslations = function (root) {
          applyTranslation(root || document.body);
        };
        // Allow runtime extension of the dictionary so admin-added items can
        // be made translatable without editing source. Example usage from
        // browser console or from a future "Translations" admin tab:
        //   App.addArabicTranslations({
        //     "Spicy Karahi Special": "كاراهي حار خاص",
        //     "Family Combo": "وجبة العائلة"
        //   });
        // Then call App.retranslate() to re-render with the new entries.
        window.addArabicTranslations = function (map) {
          if (!map || typeof map !== 'object') return;
          Object.keys(map).forEach(function (k) {
            if (typeof map[k] === 'string' && map[k].trim()) {
              ar[k] = map[k];
            }
          });
          if (lang === 'ar') applyTranslation(document.body);
        };
        // Force a full re-translation pass. Call this after any admin save
        // that adds new dynamic content to the page (new menu items, new
        // categories, new offers). The MutationObserver should catch most
        // cases automatically, but this is a guaranteed catch-all.
        window.retranslateSite = function () {
          if (lang === 'ar') {
            applyTranslation(document.body);
          }
        };
        if (window.App && typeof window.App === 'object') {
          window.App.addArabicTranslations = window.addArabicTranslations;
          window.App.retranslate = window.retranslateSite;
        }
        window.getRestaurantLanguage = function () {
          return lang;
        };
        window.setRestaurantLanguage = function (value) {
          const next = value === 'ar' ? 'ar' : 'en';
          if (next === lang && document.documentElement.dataset.lang === next) return;
          if (next === 'ar') {
            captureOriginalText(document.body);
          }
          lang = next;
          sessionStorage.setItem(KEY, lang);
          queueApply(document.body);
        };
        window.toggleRestaurantLanguage = function () {
          window.setRestaurantLanguage(lang === 'ar' ? 'en' : 'ar');
        };

        document.addEventListener('click', (event) => {
          const button = event.target.closest('[data-language-toggle]');
          if (!button) return;
          event.preventDefault();
          window.toggleRestaurantLanguage();
        });

        function boot() {
          applyTranslation(document.body);
          if (observer) observer.disconnect();
          observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                  if (node.nodeType === 1 && !isExcluded(node)) {
                    if (lang === 'en') {
                      captureOriginalText(node);
                    } else if (!applying) {
                      queueApply(node);
                    }
                  }
                  if (node.nodeType === 3 && node.parentElement && !isExcluded(node.parentElement)) {
                    if (lang === 'en') {
                      captureOriginalText(node.parentElement);
                    } else if (!applying) {
                      queueApply(node.parentElement);
                    }
                  }
                });
              } else if (mutation.type === 'characterData') {
                // Text inside an existing element changed (e.g. admin
                // updated an announcement message). Re-translate the
                // affected element so the new text gets translated.
                const node = mutation.target;
                if (node && node.parentElement && !isExcluded(node.parentElement) && !applying) {
                  if (lang === 'en') {
                    captureOriginalText(node.parentElement);
                  } else {
                    queueApply(node.parentElement);
                  }
                }
              }
            });
          });
          observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
          });
        }

        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
        else boot();

        // ── Expose key functions on window so App.SupabaseSync (which lives
        //    outside this IIFE) can call them after bootstrap / realtime events.
        window.buildWebsite = buildWebsite;
        window.updateRealtimeDots = updateRealtimeDots;
        // Expose renderAdminSection so SupabaseSync.bootstrap() can force-refresh
        // the admin panel after replacing appState with Supabase data. Without this,
        // the panel shows stale localStorage IDs and every admin edit hits the wrong
        // code path (create instead of update → 409 Conflict on Supabase).
        window.renderAdminSectionByTarget = renderAdminSection;

        // refreshAdminSectionIfActive(stateKey) — called by the realtime
        // handler when a remote change arrives. Refreshes the currently-open
        // admin OR staff section so admins AND staff see new orders/
        // reservations/requests live without a page reload.
        //
        // CRITICAL: previously this only handled the admin panel, so
        // staff never saw realtime updates even when they had the
        // section open. Now both panels refresh.
        window.refreshAdminSectionIfActive = function (stateKey) {
          var adminPanel = document.getElementById('adminPanel');
          var staffPanel = document.getElementById('staffPanel');
          var adminActive = adminPanel && adminPanel.classList.contains('active');
          var staffActive = staffPanel && staffPanel.classList.contains('active');

          // Map stateKey (camelCase) → admin/staff nav target id
          var keyToTarget = {
            orders:       'orders',
            reservations: 'reservations',
            requests:     'requests',
            gallery:      'galleryMgmt',
            menuItems:    'menuMgmt',
            offers:       'offersMgmt',
            reviews:      'reviewsMgmt',
            users:        'usersMgmt'
          };

          // Public-site rebuild triggers. When data that's displayed on
          // the public-facing website changes, rebuild so customers
          // browsing the site see the update without manual refresh.
          //
          // Gallery is always rebuilt (image stripe is on the home page).
          // Menu items, categories, offers, and reviews are also visible
          // on the public site, so any change to them needs to flow
          // through buildWebsite() too. Without this, a customer browsing
          // the menu page would not see admin's new product until reload.
          if (stateKey === 'gallery'
              || stateKey === 'menuItems'
              || stateKey === 'categories'
              || stateKey === 'offers'
              || stateKey === 'reviews') {
            try {
              if (typeof buildWebsite === 'function') buildWebsite();
            } catch (e) {}
          }

          // Re-render whichever section is open, in whichever panel
          // is active. If both panels are closed, just bump the dots.
          if (!adminActive && !staffActive) {
            updateRealtimeDots();
            return;
          }

          var navSel  = adminActive ? '#adminNav li.active' : '#staffNav li.active';
          var content = document.getElementById(adminActive ? 'adminContent' : 'staffContent');
          var render  = adminActive ? (typeof renderAdminSection === 'function' ? renderAdminSection : null)
                                    : (typeof renderStaffSection === 'function' ? renderStaffSection : null);
          var activeNav = document.querySelector(navSel);
          if (!activeNav || !content || !render) {
            updateRealtimeDots();
            return;
          }
          var target = activeNav.dataset.target;

          // Always refresh dashboard if it's open (shows counts for all three)
          if (target === 'dashboard') {
            try { renderDashboardSection(content); } catch (e) {}
            updateRealtimeDots();
            return;
          }

          // Refresh the specific section if it matches the changed stateKey
          if (target === keyToTarget[stateKey]) {
            try { render(target); } catch (e) {}
          }
          // Also refresh dashboard counters silently
          updateRealtimeDots();
        };
      })();

