/* ============================================================================
   AFGR MODERN UI ENHANCEMENTS
   Progressive enhancement only. It does not change authentication, RLS, menu
   pricing, checkout, reservation, or Supabase write behavior.
   ============================================================================ */
(function () {
  'use strict';

  var SVG_PATHS = {"dashboard": "<rect x=\"3\" y=\"3\" width=\"7\" height=\"8\" rx=\"1.4\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"5\" rx=\"1.4\"/><rect x=\"14\" y=\"12\" width=\"7\" height=\"9\" rx=\"1.4\"/><rect x=\"3\" y=\"15\" width=\"7\" height=\"6\" rx=\"1.4\"/>", "orders": "<path d=\"M6 8h12l2 13H4L6 8zM9 9V6a3 3 0 0 1 6 0v3\"/>", "reservations": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M7 3v4M17 3v4M3 10h18m-12 5 2 2 4-4\"/>", "requests": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m4 7 8 6 8-6\"/>", "menuMgmt": "<path d=\"M4 3v8m3-8v8m-6-8v5a5 5 0 0 0 10 0V3m-5 8v10m11-18c-3 2-4 7-4 11h4v7m0-18v18\"/>", "offersMgmt": "<path d=\"M4 5h9l8 8-8 8-9-9V5z\"/><circle cx=\"9\" cy=\"10\" r=\"1\"/>", "galleryMgmt": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"3\"/><circle cx=\"8\" cy=\"8\" r=\"2\"/><path d=\"m4 18 5-5 3 3 3-4 5 6\"/>", "reviewsMgmt": "<path d=\"m12 2 3 6 6 .9-4.5 4.3L17.5 20 12 17l-5.5 3 1-6.8L3 8.9 9 8l3-6z\"/>", "staffMgmt": "<circle cx=\"9\" cy=\"8\" r=\"3\"/><path d=\"M3 21v-2a6 6 0 0 1 12 0v2M16 5c3 0 4 4 1 6m1 4c2 1 3 3 3 6\"/>", "usersMgmt": "<circle cx=\"9\" cy=\"8\" r=\"3\"/><path d=\"M3 21v-2a6 6 0 0 1 12 0v2M16 5c3 0 4 4 1 6m1 4c2 1 3 3 3 6\"/>", "settings": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M10 2h4l1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3L1 9l2-4 3 1 3-1z\"/>", "popupMgmt": "<path d=\"M3 10h4l11-6v16L7 14H3v-4zm4 4 2 7\"/>", "aboutMgmt": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v6m0-10v1\"/>", "default": "<circle cx=\"12\" cy=\"12\" r=\"8\"/>"};
  var SECTION_LABELS = {
    dashboard: ['Overview', 'A snapshot of your restaurant today'],
    settings: ['Restaurant settings', 'Manage your restaurant and website preferences'],
    menuMgmt: ['Menu management', 'Organize dishes, variations and availability'],
    orders: ['Orders', 'Stay on top of incoming and active orders'],
    reservations: ['Reservations', 'Manage your upcoming guests and bookings'],
    requests: ['Customer requests', 'Follow up on messages and inquiries'],
    offersMgmt: ['Offers & deals', 'Create and manage special promotions'],
    galleryMgmt: ['Gallery', 'Keep your restaurant gallery up to date'],
    reviewsMgmt: ['Guest reviews', 'See what people are saying about your food'],
    staffMgmt: ['Staff management', 'Manage your team and section access'],
    usersMgmt: ['Customers', 'Review customer profiles and activity'],
    popupMgmt: ['Announcements', 'Manage on-site promotions and announcements'],
    aboutMgmt: ['Our story', 'Edit the restaurant introduction']
  };
  var BODY_PANELS = ['adminPanel', 'staffPanel'];
  var pendingAdminFrame = 0;
  var pendingCartFrame = 0;
  var lastVisibleSection = 'home';

  // Keep media that administrators uploaded. Only give products that have no
  // photo a polished LOCAL fallback rather than the same remote image 4 times.
  var oldGetMenuItemImage = window.getMenuItemImage;
  if (typeof oldGetMenuItemImage === 'function') {
    window.getMenuItemImage = function (item) {
      if (item && typeof item.image === 'string' && item.image.trim()) {
        return oldGetMenuItemImage(item);
      }
      var name = String(item && item.name || '').toLowerCase();
      if (/coffee|tea|drink|juice|latte|karak/.test(name)) return 'assets/dish-coffee.svg';
      if (/kunafa|dessert|sweet|cake|ice|baklava/.test(name)) return 'assets/dish-dessert.svg';
      if (/seafood|fish|prawn|shrimp|lobster|calamari/.test(name)) return 'assets/dish-seafood.svg';
      return 'assets/dish-grill.svg';
    };
  }

  function getPanel() {
    if (document.getElementById('adminPanel')?.classList.contains('active')) return document.getElementById('adminPanel');
    if (document.getElementById('staffPanel')?.classList.contains('active')) return document.getElementById('staffPanel');
    return null;
  }
  function currentSection(panel) {
    if (!panel) return null;
    var li = panel.querySelector('nav li.active[data-target]');
    return li ? li.dataset.target : null;
  }
  function presentDate() {
    try { return new Intl.DateTimeFormat(document.documentElement.lang === 'ar' ? 'ar' : 'en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date()); }
    catch (e) { return ''; }
  }
  function decorateWorkspaceNav(nav) {
    if (!nav) return;
    nav.querySelectorAll('li[data-target]').forEach(function (li) {
      if (li.querySelector('.workspace-nav-icon')) return;
      var ico = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      ico.setAttribute('class','workspace-nav-icon');
      ico.setAttribute('viewBox','0 0 24 24');
      ico.setAttribute('fill','none');
      ico.setAttribute('stroke','currentColor');
      ico.setAttribute('stroke-width','1.8');
      ico.setAttribute('stroke-linecap','round');
      ico.setAttribute('stroke-linejoin','round');
      ico.setAttribute('aria-hidden','true');
      ico.innerHTML=SVG_PATHS[li.dataset.target] || SVG_PATHS.default;
      li.insertBefore(ico, li.firstChild);
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); }
      });
    });
  }
  function enhanceSection(panel) {
    if (!panel) return;
    var content = panel.querySelector('.content');
    if (!content || !content.firstElementChild) return;
    var key = currentSection(panel);
    if (!key) return;
    var previous = content.querySelector(':scope > .workspace-section-intro');
    if (previous) {
      if (previous.dataset.section === key) return;
      previous.remove();
    }
    var desc = SECTION_LABELS[key] || [key, 'Manage your restaurant'];
    var sectionIntro = document.createElement('div');
    sectionIntro.className = 'workspace-section-intro';
    sectionIntro.dataset.section = key;
    var left = document.createElement('div');
    var eyebrow = document.createElement('span');
    eyebrow.textContent = 'YOUR WORKSPACE';
    var h = document.createElement('h2');
    h.textContent = desc[0];
    var p = document.createElement('p');
    p.textContent = desc[1];
    left.append(eyebrow,h,p);
    var d = document.createElement('div');
    d.className='workspace-section-date';
    var icon = document.createElement('i');
    icon.className='fa-regular fa-calendar';
    icon.setAttribute('aria-hidden','true');
    d.append(icon,document.createTextNode(presentDate()));
    sectionIntro.append(left,d);
    content.insertBefore(sectionIntro,content.firstChild);
    // The original direct child Dashboard heading is duplicated by the new
    // workspace heading. Hide only that one; nested section headings remain.
    var firstH3 = content.querySelector(':scope > h3');
    if (firstH3) firstH3.classList.add('workspace-original-heading');
  }
  // The panel itself is a z-index:1 stacking context. Appending the backdrop
  // to document.body put it ABOVE the whole panel, intercepting every tap
  // even when the sidebar was visibly open. Keep the overlay inside its panel.
  function ensureWorkspaceOverlay(panel) {
    var overlay=document.getElementById('workspaceDrawerOverlay');
    if (!overlay) {
      overlay=document.createElement('button');
      overlay.type='button';
      overlay.className='workspace-drawer-overlay';
      overlay.id='workspaceDrawerOverlay';
      overlay.setAttribute('aria-label','Close navigation');
      overlay.hidden=true;
      overlay.addEventListener('click',closeWorkspaceDrawer);
    }
    if(panel && overlay.parentElement!==panel)panel.appendChild(overlay);
    return overlay;
  }
  function closeWorkspaceDrawer() {
    BODY_PANELS.forEach(function (id) {
      var panel=document.getElementById(id);
      if (!panel) return;
      panel.classList.remove('workspace-nav-open');
      var btn=panel.querySelector('.workspace-menu-toggle');
      if (btn) btn.setAttribute('aria-expanded','false');
    });
    var overlay=document.getElementById('workspaceDrawerOverlay');
    if(overlay) overlay.hidden=true;
  }
  function toggleWorkspaceDrawer(panel) {
    if(!panel)return;
    var opening=!panel.classList.contains('workspace-nav-open');
    closeWorkspaceDrawer();
    if(opening){
      panel.classList.add('workspace-nav-open');
      var b=panel.querySelector('.workspace-menu-toggle');
      if(b)b.setAttribute('aria-expanded','true');
      ensureWorkspaceOverlay(panel).hidden=false;
    }
  }
  // Legacy staff/user/order screens sometimes append wide tables directly to
  // the panel content. Give those a local horizontal scroller instead of
  // clipping columns or forcing the entire mobile viewport sideways.
  function containWorkspaceTables(content) {
    if (!content) return;
    content.querySelectorAll(':scope > table').forEach(function(table) {
      if (table.parentElement && table.parentElement.classList.contains('workspace-table-scroll')) return;
      var wrapper=document.createElement('div');
      wrapper.className='workspace-table-scroll';
      wrapper.setAttribute('role','region');
      wrapper.setAttribute('aria-label','Scrollable management table');
      wrapper.setAttribute('tabindex','0');
      content.insertBefore(wrapper,table);
      wrapper.appendChild(table);
    });
  }
  function updateWorkspaceUi() {
    BODY_PANELS.forEach(function (id) {
      var panel = document.getElementById(id);
      if (!panel) return;
      decorateWorkspaceNav(panel.querySelector('nav'));
      if (panel.classList.contains('active')) {
        containWorkspaceTables(panel.querySelector('.content'));
        enhanceSection(panel);
      }
    });
    if (!getPanel()) closeWorkspaceDrawer();
  }
  function scheduleWorkspaceUi() {
    if (pendingAdminFrame) return;
    pendingAdminFrame=requestAnimationFrame(function () {
      pendingAdminFrame=0;
      updateWorkspaceUi();
    });
  }

  function updateCartShortcut() {
    var countTarget = document.getElementById('cartCount');
    var tabCount = document.getElementById('appBottomCartCount');
    var float = document.getElementById('appFloatingCart');
    var count = 0;
    try { count = App.Services.Cart.count(); }
    catch(e) { count = Number(countTarget?.textContent || 0) || 0; }
    if (tabCount) {
      tabCount.textContent=String(count);
      tabCount.hidden=count<=0;
    }
    if (float) {
      var cartPanel=document.getElementById('cartPanel');
      var checkout=document.getElementById('checkoutModal');
      var nav=document.getElementById('mobileNav');
      var hide = count<=0 || window.innerWidth>700 || !!getPanel() ||
        !!cartPanel?.classList.contains('active') || !!checkout?.classList.contains('active') || !!nav?.classList.contains('active');
      float.hidden=hide;
      var items=document.getElementById('appFloatingCartItems');
      if(items)items.textContent=count + (count===1 ? ' item' : ' items');
      var total=document.getElementById('appFloatingCartTotal');
      if(total) {
        try {
          var pricing = App.Services.Cart.pricing();
          total.textContent='AED ' + Number(pricing && pricing.subtotal || 0).toFixed(2);
        } catch(e) { total.textContent='View cart'; }
      }
    }
  }
  function scheduleCartUi() {
    if (pendingCartFrame) return;
    pendingCartFrame=requestAnimationFrame(function () {pendingCartFrame=0;updateCartShortcut();});
  }
  // Do not modify the cart data: decorate the existing updateUI routine only.
  var oldUpdateCartUI=window.updateCartUI;
  if (typeof oldUpdateCartUI==='function') {
    window.updateCartUI=function(){
      var result=oldUpdateCartUI.apply(this,arguments);
      scheduleCartUi();
      return result;
    };
  }

  function setBottomTab(section) {
    if (!section) return;
    var mapped = section === 'heroSection' ? 'home' : section;
    if (mapped === 'home' || mapped === 'menu' || mapped === 'offers' || mapped === 'reservation') {
      lastVisibleSection=mapped;
      document.querySelectorAll('#appBottomNav button[data-app-tab]').forEach(function(b){
        var active=b.dataset.appTab===mapped;
        b.classList.toggle('active',active);
        if(active)b.setAttribute('aria-current','page');
        else b.removeAttribute('aria-current');
      });
    }
  }
  function initScrollSpy() {
    if (!('IntersectionObserver' in window)) return;
    var list=['heroSection','menu','reservation','offers'];
    var sections=list.map(function(x){return document.getElementById(x);}).filter(Boolean);
    var observer=new IntersectionObserver(function(entries){
      var candidates=entries.filter(function(entry){return entry.isIntersecting;});
      if(!candidates.length)return;
      candidates.sort(function(a,b){return b.intersectionRatio-a.intersectionRatio;});
      setBottomTab(candidates[0].target.id);
    },{rootMargin:'-27% 0px -53% 0px',threshold:[0,.05,.25,.5]});
    sections.forEach(function(section){observer.observe(section);});
    // Existing scrollToSection() is responsible for scrolling and translation.
    var oldScrollToSection=window.scrollToSection;
    if(typeof oldScrollToSection==='function'){
      window.scrollToSection=function(id){
        setBottomTab(id);
        return oldScrollToSection.apply(this,arguments);
      };
    }
  }
  function assignRoleAndObserver(){
    var navs=[document.getElementById('adminNav'),document.getElementById('staffNav')];
    var contents=[document.getElementById('adminContent'),document.getElementById('staffContent')];
    navs.concat(contents).forEach(function(node){
      if(!node)return;
      var observer=new MutationObserver(scheduleWorkspaceUi);
      // Observing direct children avoids expensive deep dashboard watchers.
      observer.observe(node,{childList:true,subtree:false});
    });
    BODY_PANELS.forEach(function(id){
      var panel=document.getElementById(id);
      if(!panel)return;
      new MutationObserver(scheduleWorkspaceUi).observe(panel,{attributes:true,attributeFilter:['class']});
      var drawerBrand=panel.querySelector('nav .workspace-brand');
      if(drawerBrand && !drawerBrand.querySelector('.workspace-drawer-close')) {
        var closer=document.createElement('button');
        closer.type='button';closer.className='workspace-drawer-close';
        closer.setAttribute('aria-label','Close navigation menu');
        closer.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>';
        closer.addEventListener('click',closeWorkspaceDrawer);
        drawerBrand.appendChild(closer);
      }
      panel.querySelector('.workspace-menu-toggle')?.addEventListener('click',function(){toggleWorkspaceDrawer(panel);});
      panel.querySelector('nav')?.addEventListener('click',function(e){
        if(e.target.closest('li[data-target]')&&window.innerWidth<=1120)closeWorkspaceDrawer();
      });
    });
    window.addEventListener('keydown',function(e){if(e.key==='Escape')closeWorkspaceDrawer();});
  }
  function initCartObserver() {
    var count=document.getElementById('cartCount');
    if(count)new MutationObserver(scheduleCartUi).observe(count,{childList:true,characterData:true,subtree:true});
    ['cartPanel','checkoutModal','mobileNav'].forEach(function(id){
      var el=document.getElementById(id);
      if(el)new MutationObserver(scheduleCartUi).observe(el,{attributes:true,attributeFilter:['class']});
    });
    window.addEventListener('resize',function(){
      if(window.innerWidth>1120)closeWorkspaceDrawer();
      scheduleCartUi();
    },{passive:true});
  }
  function fixLogoFallback() {
    var img=document.getElementById('site-logo');
    if(!img)return;
    img.addEventListener('error',function(){
      if(!img.src.endsWith('assets/logo.png'))img.src='assets/logo.png';
    });
  }
  function appStart() {
    fixLogoFallback();
    assignRoleAndObserver();
    initCartObserver();
    initScrollSpy();
    scheduleWorkspaceUi();
    scheduleCartUi();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',appStart,{once:true});
  else appStart();
})();

/* ==========================================================================
   AFGR Workspace UX v2. Progressive enhancement for management panels only.
   No changes to auth, permissions, data persistence, customer UI or Get App.
   ========================================================================== */
(function () {
  'use strict';
  var panelIds = ['adminPanel', 'staffPanel'];
  var titles = {
    dashboard:'Overview',settings:'Settings',menuMgmt:'Menu',orders:'Orders',
    reservations:'Reservations',requests:'Requests',offersMgmt:'Offers',
    galleryMgmt:'Gallery',reviewsMgmt:'Guest reviews',staffMgmt:'Staff',
    usersMgmt:'Customers',popupMgmt:'Announcements',aboutMgmt:'Our story',
    menuEdit:'Menu',menuView:'Menu',notifications:'Notifications'
  };
  var kpiPaths = {
    orders:'<path d="M5 8h14l2 13H3L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
    reservations:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18m5 5 2 2 4-4"/>',
    sales:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-1.4-1-5.2-1.2-5.9.9-.8 2.4 5.7 1.3 5 4.6-.5 2.2-4.3 2.6-6.1 1.2M12 6v12"/>',
    pending:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 3"/>',
    offers:'<path d="M4 5h9l8 8-8 8-9-9V5Z"/><circle cx="9" cy="10" r="1"/>',
    customers:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5c3 0 4 4 1 6m1 4c2 1 3 3 3 6"/>'
  };
  var scrollRegions = '.workspace-table-scroll,.analytics-table-wrap,.erp-table-wrap,.table-responsive,.table-wrapper,.compact-table-wrap,.data-table-wrap,.advanced-report-table-scroll,.advanced-report-table-wrap,.table-container';
  var pending = 0;
  function getSection(panel) {
    var active = panel.querySelector('nav li.active[data-target]');
    return active ? active.getAttribute('data-target') : '';
  }
  // Managers asked for an uncluttered navigation. The old injected finder
  // was also consuming valuable mobile drawer space; never create it again.
  function navSearch(panel) {
    panel.querySelectorAll('nav .ws-nav-finder,nav .ws-nav-empty').forEach(function(el){el.remove();});
    panel.querySelectorAll('nav li[data-target][hidden]').forEach(function(el){el.hidden=false;});
  }
  function updateHeader(panel, key) {
    var target = panel.querySelector('.workspace-header-title');
    if (!target) return;
    var mobile = target.querySelector('.workspace-header-mobile-page');
    if (!mobile) {
      mobile = document.createElement('strong');
      mobile.className = 'workspace-header-mobile-page';
      target.appendChild(mobile);
    }
    var label = titles[key] || 'Workspace';
    if (mobile.textContent !== label) mobile.textContent = label;
    var toggle = panel.querySelector('.workspace-menu-toggle');
    if (toggle && toggle.getAttribute('aria-label') !== (panel.classList.contains('workspace-nav-open') ? 'Close navigation' : 'Open navigation')) {
      toggle.setAttribute('aria-label', panel.classList.contains('workspace-nav-open') ? 'Close navigation' : 'Open navigation');
    }
  }
  function simplifyHeadings(panel) {
    var content = panel.querySelector('.content');
    if (!content) return;
    var main = content.querySelector(':scope > .workspace-section-intro h2');
    if (!main) return;
    var expected = main.textContent.trim().toLowerCase();
    // Only suppress a redundant heading, never unrelated group titles.
    var groups = content.querySelectorAll(':scope > .admin-menu-manager .admin-menu-header h3,:scope > .reservation-admin-page > h3');
    groups.forEach(function (h) {
      if (h.textContent.trim().toLowerCase() === expected) h.classList.add('ws-duplicate-section-title');
    });
  }
  function decorateKpis(content) {
    content.querySelectorAll('.analytics-kpi-icon:not([data-ws-svg])').forEach(function (el) {
      var card = el.closest('.analytics-kpi-card');
      var label = card && card.querySelector('.analytics-kpi-copy h4');
      var text = (label ? label.textContent : '').toLowerCase();
      var key = /reserv/.test(text) ? 'reservations' : /sales|revenue/.test(text) ? 'sales' : /pending/.test(text) ? 'pending' : /offer|deal/.test(text) ? 'offers' : /customer|user/.test(text) ? 'customers' : 'orders';
      var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','ws-kpi-svg');
      svg.setAttribute('aria-hidden','true');
      svg.innerHTML = kpiPaths[key];
      // Replaces font-only icon with a local SVG to avoid missing glyphs.
      el.replaceChildren(svg);
      el.setAttribute('data-ws-svg',key);
    });
  }
  function improveEmptyState(content) {
    content.querySelectorAll(':scope > p').forEach(function (p) {
      if (/^no (orders|reservations|requests|reviews|customers|items) (yet\.?|found\.?)/i.test(p.textContent.trim())) {
        p.classList.add('ws-v2-empty-state');
      }
    });
  }
  function improveTableAccess(content) {
    content.querySelectorAll('table').forEach(function (table) {
      if (table.closest('.admin-menu-categories-card,.admin-menu-products-card')) return;
      var wrapper = table.closest(scrollRegions);
      if (!wrapper || !content.contains(wrapper)) {
        wrapper = document.createElement('div');
        wrapper.className = 'workspace-table-scroll';
        wrapper.setAttribute('role','region');
        wrapper.setAttribute('aria-label','Scrollable management table');
        wrapper.setAttribute('tabindex','0');
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
      if (!wrapper.classList.contains('ws-v2-scroll-region')) wrapper.classList.add('ws-v2-scroll-region');
      if (wrapper.getAttribute('aria-label')===null) wrapper.setAttribute('aria-label','Scrollable management table');
      if (wrapper.getAttribute('tabindex')===null) wrapper.setAttribute('tabindex','0');
      if (!wrapper.dataset.wsV2Hint) {
        wrapper.dataset.wsV2Hint = 'ready';
        var hint = document.createElement('div');
        hint.className = 'ws-v2-table-hint';
        hint.hidden = true;
        hint.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-12-4-4 4 4 4m8-8 4 4-4 4"/></svg><span>Swipe sideways to see all columns</span>';
        wrapper.parentNode.insertBefore(hint,wrapper);
      }
      var hint = wrapper.previousElementSibling;
      if (hint && hint.classList.contains('ws-v2-table-hint')) {
        var needed = wrapper.offsetWidth > 0 && table.scrollWidth > wrapper.clientWidth+8;
        hint.hidden = !needed;
      }
    });
  }
  function updatePanel(panel) {
    navSearch(panel);
    if (!panel.classList.contains('active')) return;
    var key = getSection(panel);
    var content = panel.querySelector('.content');
    if (!content) return;
    if (key && panel.dataset.wsV2CurrentSection !== key) {
      panel.dataset.wsV2CurrentSection = key;
      content.scrollTop = 0;
    }
    updateHeader(panel,key);
    simplifyHeadings(panel);
    decorateKpis(content);
    improveEmptyState(content);
    improveTableAccess(content);
  }
  function flush() {
    pending=0;
    panelIds.forEach(function (id) {var p=document.getElementById(id);if(p)updatePanel(p);});
  }
  function schedule() {
    if (pending) return;
    pending = requestAnimationFrame(flush);
  }
  function start() {
    panelIds.forEach(function (id) {
      var panel=document.getElementById(id);
      if (!panel) return;
      navSearch(panel);
      var ul=panel.querySelector('nav ul');
      var content=panel.querySelector('.content');
      if (ul) new MutationObserver(schedule).observe(ul,{childList:true});
      if (content) new MutationObserver(schedule).observe(content,{childList:true,subtree:true});
      new MutationObserver(schedule).observe(panel,{attributes:true,attributeFilter:['class']});
      var toggle=panel.querySelector('.workspace-menu-toggle');
      if (toggle) toggle.addEventListener('click',function () {
        schedule();

      });
      var nav=panel.querySelector('nav');
      if (nav)nav.addEventListener('click',function (event) {
        if (!event.target.closest('li[data-target]'))return;
        schedule();
      });
    });
    document.addEventListener('keydown',function (event) {
      if(event.key!=='Escape')return;
      panelIds.forEach(function(id){
        var panel=document.getElementById(id);
        if (!panel || !panel.classList.contains('workspace-nav-open'))return;
        var toggle=panel.querySelector('.workspace-menu-toggle');
        if (toggle)requestAnimationFrame(function(){toggle.focus({preventScroll:true});});
      });
    },true);
    window.addEventListener('resize',schedule,{passive:true});
    schedule();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
