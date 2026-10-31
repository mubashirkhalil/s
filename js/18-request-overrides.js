(function(){
  'use strict';

  function escapeHTML(str){
    return String(str || '').replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
    });
  }

  function resolveTopBarText(){
    var appState = window.appState || (window.App && App.Store && App.Store.state) || {};
    var cfg = appState.config || {};
    var txt = String(cfg.topBarText || '').trim();
    if(!txt){
      var contact = cfg.contact || {};
      var phone = String(contact.phone || '').trim();
      var hours = String(contact.openHours || '').trim();
      txt = phone && hours ? phone + ' • ' + hours : (phone || hours || 'Al Fursan Grills & Restaurant');
    }
    return txt;
  }

  function buildTicker(text){
    var safe = escapeHTML(text);
    return '<div class="ao-ticker-track"><span class="ao-ticker-set"><span class="ao-ticker-phrase">'
      + safe + '</span><span class="ao-ticker-separator" aria-hidden="true">•</span><span class="ao-ticker-phrase">'
      + safe + '</span><span class="ao-ticker-separator" aria-hidden="true">•</span><span class="ao-ticker-phrase">'
      + safe + '</span><span class="ao-ticker-separator" aria-hidden="true">•</span></span><span class="ao-ticker-set" aria-hidden="true"><span class="ao-ticker-phrase">'
      + safe + '</span><span class="ao-ticker-separator" aria-hidden="true">•</span><span class="ao-ticker-phrase">'
      + safe + '</span><span class="ao-ticker-separator" aria-hidden="true">•</span><span class="ao-ticker-phrase">'
      + safe + '</span><span class="ao-ticker-separator" aria-hidden="true">•</span></span></div>';
  }

  function syncDiscoverTicker(){
    var strip = document.querySelector('#aoHome .ao-fresh-strip');
    if(!strip) return;
    var text = resolveTopBarText();
    if(strip.dataset.syncedTickerText === text) return;
    strip.setAttribute('aria-label', text);
    strip.innerHTML = buildTicker(text);
    strip.dataset.syncedTickerText = text;
  }


  function signedInCustomer(){
    var appState = window.appState || (window.App && App.Store && App.Store.state) || {};
    var session = appState.session || null;
    if(!session || session.role !== 'customer' || !Array.isArray(appState.users)) return null;
    return appState.users.find(function(user){ return user && String(user.id) === String(session.id); }) || null;
  }

  function hydrateReservationIdentity(){
    var user = signedInCustomer();
    var nameInput = document.getElementById('resName');
    var phoneInput = document.getElementById('resPhone');
    if(nameInput && !String(nameInput.value || '').trim()){
      var name = user && (user.displayName || user.name || user.username || user.email) || '';
      nameInput.value = String(name || 'AFGR Guest').trim();
    }
    if(phoneInput && !String(phoneInput.value || '').trim()){
      var phone = user && (user.phone || user.mobile || user.whatsapp || user.email) || '';
      phoneInput.value = String(phone || 'Not provided').trim();
    }
  }

  function bindReservationHydration(){
    hydrateReservationIdentity();
    document.addEventListener('click', function(event){
      var target = event.target.closest('[data-ao-route-target="reservation"]');
      if(target){
        setTimeout(function(){
          hydrateReservationIdentity();
          var dateInput = document.getElementById('resDate');
          if(dateInput && !window.matchMedia('(pointer: coarse)').matches){
            try { dateInput.focus(); } catch (e) {}
          }
        }, 120);
      }
    });
    var form = document.getElementById('reservationForm');
    if(form && !form.__afgrHydrationBound){
      form.addEventListener('submit', hydrateReservationIdentity, true);
      form.__afgrHydrationBound = true;
    }
  }

  function bindTickerSync(){
    syncDiscoverTicker();
    var topBarInner = document.getElementById('topBarInner');
    if(topBarInner && !topBarInner.__afgrTickerObserver){
      var obs = new MutationObserver(syncDiscoverTicker);
      obs.observe(topBarInner, {childList:true, subtree:true, characterData:true});
      topBarInner.__afgrTickerObserver = obs;
    }
    if(window.App && App.Store && typeof App.Store.save === 'function' && !App.Store.__afgrTickerPatched){
      var save = App.Store.save;
      App.Store.save = function(){
        var out = save.apply(this, arguments);
        setTimeout(syncDiscoverTicker, 0);
        return out;
      };
      App.Store.__afgrTickerPatched = true;
    }
  }

  function initRequestRefresh(){
    bindTickerSync();
    bindReservationHydration();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initRequestRefresh);
  } else {
    initRequestRefresh();
  }
  window.addEventListener('load', function(){
    syncDiscoverTicker();
    hydrateReservationIdentity();
  });
})();
