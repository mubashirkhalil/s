/* AFGR | THE ARABIAN TABLE — public app experience.
 * No alternate orders, pricing engine, customers or Supabase writes.
 * Live state, cart, checkout, reservations, management & authentication
 * remain owned by the original application. This module only builds UI.
 */
(function () {
  'use strict';
  var app = document.getElementById('aoApp');
  var website = document.getElementById('website');
  if (!app || !website) return;
  var $ = function (id) { return document.getElementById(id); };
  var state = function () { return window.appState || (window.App && App.Store && App.Store.state) || {}; };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(pointer:fine)').matches;
  var activeRoute = 'home';
  var activeCategory = 'All';
  var currentItem = null, currentVariation = '', detailQty = 1;
  var favoriteIds = [];
  try { favoriteIds = JSON.parse(localStorage.getItem('afgr-delicious-favorites') || '[]'); if (!Array.isArray(favoriteIds)) favoriteIds = []; } catch (_) { favoriteIds = []; }
  var fallback = {
    grill: 'assets/arabic/hero-platter.webp', kebab: 'assets/arabic/charcoal-skewers.webp',
    chicken: 'assets/arabic/spicy-chicken.webp', lamb: 'assets/arabic/lamb-chops.webp',
    rice: 'assets/arabic/food-rice-reference.webp', seafood: 'assets/arabic/king-prawns.webp',
    dessert: 'assets/arabic/arabic-dessert.webp', drink: 'assets/arabic/arabic-coffee.webp',
    salad: 'assets/arabic/tawook.webp'
  };
  // Category labels are owned by Admin -> Menu Categories. Do not invent or
  // duplicate discovery categories in this public-facing view.
  function normalizedCategoryName(name){
    return String(name||'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
  }
  function configuredCategories(){
    var configured=Array.isArray(state().categories)?state().categories:[];
    var seen=new Set();
    return configured.filter(function(entry){
      if(!entry || entry.enabled===false || entry.active===false) return false;
      var label=String(entry.name||'').trim().replace(/\s+/g,' ');
      if(!label || ['all','hot deals','hot-deals'].includes(normalizedCategoryName(label)))return false;
      // Singular and plural duplicates such as Grill/Grills or Dessert/Desserts
      // should not appear twice in Discover; keep the first admin-defined name.
      var key=normalizedCategoryName(label).replace(/s$/,'');
      if(seen.has(key))return false;
      seen.add(key);return true;
    });
  }
  function discoverCategoryArt(label){
    var first=items().find(function(it){
      return it && normalizedCategoryName(categoryText(it))===normalizedCategoryName(label);
    });
    // The first real product is authoritative, even if later products have
    // images and the category has a manually assigned illustration.
    return first ? art(first) : (fallback[kind(label)]||fallback.grill);
  }
  function firstHotDeal(){
    return items().find(function(item){
      if(!item)return false;
      try {if(typeof window.itemHasAnyDiscountOrDeal==='function')return window.itemHasAnyDiscountOrDeal(item);}
      catch (_) {}
      var price=Number(item.sellingPrice!=null?item.sellingPrice:item.price);
      return (Number(item.originalPrice)>price && price>=0) || Number(item.discount)>0 ||
        (state().offers||[]).some(function(offer){return offer && offer.enabled!==false &&
           (!offer.end || Number(offer.end)>Date.now()) &&
           (String(offer.productId)===String(item.id) ||
            (Array.isArray(offer.products) && offer.products.some(function(product){return String(product.id||product.productId||product)===String(item.id);})));});
    });
  }
  function categoryTint(label){
    var t=kind(label);
    return ({rice:'#f6e9ba',seafood:'#dbece9',chicken:'#f7dece',dessert:'#fbe8d4',
      drink:'#efe4cd',salad:'#e1efd8',kebab:'#f3d9c3',grill:'#f3e5c3'})[t]||'#f3e8d5';
  }
  function icon(name) { return '<svg aria-hidden="true"><use href="#ao-' + name + '"></use></svg>'; }
  function make(tag, className, text) { var el=document.createElement(tag); if(className)el.className=className; if(text!=null)el.textContent=String(text);return el; }
  function categoryText(item) {
    var cats=state().categories || [], val = item && item.category;
    var byIndex=Number.isInteger(Number(val)) ? cats[Number(val)] : null;
    var byId=cats.find(function(c){return c && String(c.id)===String(val);});
    return (byIndex && byIndex.name) || (byId && byId.name) || (item && item.categoryName) || '';
  }
  function kind(value) {
    var text=String(value||'').toLowerCase();
    if (/biryani|biriyani|rice|kabsa|mandi|pulao|pilaf|maqluba|maklouba/.test(text))return 'rice';
    if (/sea|fish|prawn|shrimp|lobster|calamari/.test(text))return 'seafood';
    if (/tea|coffee|drink|juice|mojito|lassi|beverage|water|karak|cola/.test(text))return 'drink';
    if (/dessert|sweet|cake|kunafa|baklava|ice.?cream|pudding|halwa/.test(text))return 'dessert';
    if (/salad|tabbouleh|fattoush|hummus|mezze|dip/.test(text))return 'salad';
    if (/tawook|chicken|wings|broast/.test(text))return 'chicken';
    if (/lamb|chop|mutton/.test(text))return 'lamb';
    if (/kebab|kabab|kofta|tikka|seekh|skewer/.test(text))return 'kebab';
    return 'grill';
  }
  function art(item) {
    if(item && typeof item.image==='string' && item.image.trim()) return item.image.trim();
    var k=kind((item && item.name || '')+' '+categoryText(item));
    return fallback[k]||fallback.grill;
  }
  // Preserve uploaded photos and cover local-only data with appropriate grill artwork.
  var originalImage = window.getMenuItemImage;
  if(typeof originalImage==='function'){
    window.getMenuItemImage=function(item){
      if(item&&item.image&&String(item.image).trim())return originalImage.apply(this,arguments);
      return art(item);
    };
  }
  function items(){ return Array.isArray(state().menuItems)?state().menuItems.filter(Boolean):[]; }
  function priceFor(item, variationId){
    if(!item)return 0;
    var variant = item.variationsEnabled && Array.isArray(item.variations) ? item.variations.find(function(x){return x && x.enabled!==false && (!variationId || String(x.id)===String(variationId));}) : null;
    var val=variant && (variant.sellingPrice != null ? variant.sellingPrice : variant.price);
    if(val==null || val==='')val=(item.sellingPrice != null && item.sellingPrice!=='' ? item.sellingPrice : item.price);
    var num=Number(val); return Number.isFinite(num)?num:0;
  }
  function fmt(val){return 'AED '+Number(val||0).toFixed(2);}
  function fav(id){return favoriteIds.includes(String(id));}
  function showToast(message){var toast=$('aoToast'),t=$('aoToastText');if(!toast||!t)return;t.textContent=message;toast.hidden=false;toast.classList.remove('ao-visible');void toast.offsetWidth;toast.classList.add('ao-visible');clearTimeout(showToast.timer);showToast.timer=setTimeout(function(){toast.hidden=true;},2300);}
  function favoriteToggle(itemId){
    var key=String(itemId);favoriteIds=fav(key)?favoriteIds.filter(function(i){return i!==key;}):favoriteIds.concat([key]);
    try{localStorage.setItem('afgr-delicious-favorites',JSON.stringify(favoriteIds));}catch(_){}
    renderCards();decorateNative();showToast(fav(key)?'Saved to favorites':'Removed from favorites');
  }
  function matchesCategory(item,category){
    if(!category||category==='All')return true;
    var exact=configuredCategories().find(function(c){return normalizedCategoryName(c.name)===normalizedCategoryName(category)});
    if(exact)return normalizedCategoryName(categoryText(item))===normalizedCategoryName(exact.name);
    var label=(String(item.name||'')+' '+String(categoryText(item))).toLowerCase();
    var k=kind(label);
    if(category==='Grills')return /grill|kebab|kabab|kofta|tikka|skewer|steak|mixed|lamb|beef|barbecue/i.test(label)||['grill','kebab','lamb'].includes(k);
    if(category==='Biryani')return k==='rice';
    if(category==='Chicken')return k==='chicken';
    if(category==='Seafood')return k==='seafood';
    if(category==='Desserts')return k==='dessert';
    if(category==='Drinks')return k==='drink';
    return label.includes(String(category).toLowerCase());
  }
  function allFiltered(){
    var q=String($('aoMainSearch')?.value||'').toLowerCase().trim();
    return items().filter(function(item){return matchesCategory(item,activeCategory)&&(!q || (item.name+' '+(item.description||'')+' '+categoryText(item)).toLowerCase().includes(q));});
  }
  function renderCategories(){
    var track=$('aoCategoryTrack');if(!track)return;
    var allFirst=items()[0];
    var current=[{key:'All',label:'All',art:allFirst?art(allFirst):fallback.grill,color:'#f6e4bb'}];
    // Hot Deals uses a crisp flame emoji in place of any product photograph.
    // Other categories continue to use their first matching product image.
    current.push({key:'hot-deals',label:'Hot Deals',flame:true,color:'#48160b'});
    configuredCategories().forEach(function(cat){
      var name=String(cat.name||'').trim();
      current.push({key:name,label:name,art:discoverCategoryArt(name),color:categoryTint(name)});
    });
    // If the administrator removed a previously selected category, recover
    // gracefully without showing a phantom pill/filter.
    if(!current.some(function(c){return c.key===activeCategory;}))activeCategory='All';
    track.replaceChildren();
    current.forEach(function(category){
      var btn=make('button','ao-category'+(activeCategory===category.key?' is-active':''));btn.type='button';btn.dataset.aoCategory=category.key;
      btn.setAttribute('aria-label','Browse '+category.label);btn.setAttribute('aria-pressed',String(activeCategory===category.key));
      var thumb=make('span','ao-category-image'+(category.flame?' afgr-hot-flame-disc':''));
      thumb.style.background=category.color;
      if(category.flame){
        var flame=make('span','afgr-fire-emoji','🔥');
        flame.setAttribute('aria-hidden','true');
        thumb.appendChild(flame);
      }else{
        var img=make('img');img.src=category.art;img.loading='lazy';img.alt='';thumb.appendChild(img);
      }
      btn.append(thumb,make('strong','',category.label));track.appendChild(btn);
    });
  }
  function card(item,index){
    var el=make('article','ao-product'+(item.enabled===false?' is-unavailable':''));el.dataset.aoItem=String(item.id);
    var picture=make('div','ao-product-art');picture.dataset.aoDetail=String(item.id);picture.setAttribute('role','button');picture.tabIndex=0;picture.setAttribute('aria-label','View '+item.name);
    var img=make('img');img.alt=item.name||'Arabic grill dish';img.src=art(item);img.loading=index<4?'eager':'lazy';img.decoding='async';picture.appendChild(img);
    if(item.enabled===false)picture.appendChild(make('span','ao-product-sticker','SOLD OUT'));
    var heart=make('button','ao-product-heart'+(fav(item.id)?' saved':''));heart.type='button';heart.dataset.aoFavorite=String(item.id);heart.setAttribute('aria-label',fav(item.id)?'Remove '+item.name+' from favorites':'Save '+item.name+' as favorite');heart.setAttribute('aria-pressed',String(fav(item.id)));heart.innerHTML=icon('heart');picture.appendChild(heart);
    var content=make('div','ao-product-content');if(categoryText(item))content.appendChild(make('small','',categoryText(item)));
    var title=make('h3','',item.name||'Freshly prepared dish');title.dataset.aoDetail=String(item.id);content.appendChild(title);
    if(item.description && String(item.description).trim()) content.appendChild(make('p','',item.description));
    var bottom=make('div','ao-product-bottom');
    var priceGroup=make('div','ao-price-group');
    var sale=priceFor(item);
    var firstVariation=getVariations(item)[0];
    var rawOriginal=firstVariation && firstVariation.originalPrice!=null && firstVariation.originalPrice!=='' ? firstVariation.originalPrice : item.originalPrice;
    var was=rawOriginal!=null && rawOriginal!=='' ? Number(rawOriginal) : 0;
    if(Number.isFinite(was) && was>sale)priceGroup.appendChild(make('del','ao-price-before',fmt(was)));
    priceGroup.appendChild(make('strong','ao-price-current',fmt(sale)));
    bottom.appendChild(priceGroup);
    var add=make('button','');add.type='button';add.disabled=item.enabled===false;add.dataset.aoAdd=String(item.id);add.setAttribute('aria-label','Add '+item.name+' to bag');add.innerHTML=icon('plus');bottom.appendChild(add);content.appendChild(bottom);
    el.append(picture,content);return el;
  }
  function renderCards(){
    var dest=$('aoPopularGrid'),favs=$('aoFavoritesGrid');if(!dest||!favs)return;
    var full=items();var choice=full.slice();
    // Populate the home with genuine dishes. Prioritize the restaurant's grills
    // without filtering or relabeling live menu data.
    choice.sort(function(a,b){var aa=matchesCategory(a,'Grills')?1:0,bb=matchesCategory(b,'Grills')?1:0;return bb-aa;});
    dest.replaceChildren();
    var picks=choice.slice(0,8);
    if(!picks.length){var empty=make('div','ao-empty');empty.innerHTML=icon('fire')+'<strong>Our menu is warming up.</strong><p>As soon as our dishes are listed, you’ll find them here.</p>';dest.appendChild(empty);}
    picks.forEach(function(it,i){dest.appendChild(card(it,i));});
    favs.replaceChildren();var selected=full.filter(function(x){return fav(x.id);});
    if(!selected.length){var empty2=make('div','ao-empty');empty2.innerHTML=icon('heart')+'<strong>Your favorites start here.</strong><p>Tap the heart on a dish to save it for later.</p><button type="button" data-ao-route-target="menu">Discover dishes</button>';favs.appendChild(empty2);}
    selected.forEach(function(it,i){favs.appendChild(card(it,i));});
    observeReveal();
  }
  function nativeFilter(category){
    var catIndex=null;var q='';var cats=state().categories||[];
    var exact=cats.findIndex(function(c){return c && normalizedCategoryName(c.name)===normalizedCategoryName(category)});
    if(category==='hot-deals')catIndex='hot-deals';
    else if(category==='All')catIndex='explore';
    else if(exact>=0)catIndex=exact;
    else if(category==='Biryani')q='biryani';
    else if(category==='Chicken')q='chicken';
    else if(category==='Grills'){
      var g=cats.findIndex(function(c){return c&&/grill|kebab|arabic|meat/i.test(c.name||'');});
      if(g>=0)catIndex=g;else q='grill';
    }else if(category==='Seafood'){
      var si=cats.findIndex(function(c){return c&&/sea|fish|prawn/i.test(c.name||'');});
      if(si>=0)catIndex=si;else q='seafood';
    }else if(category==='Desserts'){
      var de=cats.findIndex(function(c){return c&&/dessert|sweet/i.test(c.name||'');});
      if(de>=0)catIndex=de;else q='dessert';
    }else if(category==='Drinks'){
      var dr=cats.findIndex(function(c){return c&&/drink|beverage|coffee/i.test(c.name||'');});
      if(dr>=0)catIndex=dr;else q='coffee';
    }else q=category;
    var mainSearch=$('aoMainSearch'),search=$('menuSearch');
    if(search)search.value=q || (mainSearch ? mainSearch.value : '') || '';
    if(typeof window.filterMenu==='function')window.filterMenu(catIndex===null?'explore':catIndex);
    if(search && q){
      search.value=q;
      if(typeof window.filterMenu==='function')window.filterMenu('explore');
    }
  }
  // The Offers shortcut lives inside More on mobile. Both corners display a
  // dot only while a published, date-valid offer exists. Use the exact same
  // availability function as the original Offers navigation (no DB writes).
  function syncOfferDots(){
    var active=false;
    try {
      if(typeof window.getActiveOffers==='function'){
        active=window.getActiveOffers().length>0;
      }else{
        var now=Date.now(),all=state().offers;
        active=Array.isArray(all)&&all.some(function(o){
          if(!o || o.enabled!==true)return false;
          return (!o.start || Number(o.start)<=now)&&(!o.end || Number(o.end)>=now);
        });
      }
    }catch(err){active=false;}
    app.querySelectorAll('[data-ao-offer-dot]').forEach(function(dot){
      dot.hidden=!active;
      dot.parentElement.classList.toggle('has-live-offer',active);
    });
    var more=app.querySelector('[data-ao-more-toggle]');
    if(more)more.setAttribute('aria-label',active?'More options, special offers available':'More options');
  }
  // Mobile dock mirrors the selected app page, including the extra pages
  // accessed via More. Cart gets a temporary active state while open.
  function syncMobileDock(){
    syncOfferDots();
    if(!window.matchMedia || !window.matchMedia('(max-width:935px)').matches)return;
    var cartPanel=$('cartPanel'), moreLayer=$('aoMoreLayer');
    var cartOpen=!!(cartPanel && cartPanel.classList.contains('active'));
    var moreOpen=!!(moreLayer && !moreLayer.hidden);
    var selected=cartOpen?'cart':moreOpen?'more':
      (activeRoute==='home' || activeRoute==='menu' || activeRoute==='reservation')
      ? activeRoute : 'more';
    app.querySelectorAll('.ao-dock [data-ao-tab]').forEach(function(button){
      var active=button.dataset.aoTab===selected;
      button.classList.toggle('is-active',active);
      if(active)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
  }
  function closeMore(){
    var layer=$('aoMoreLayer');
    if(!layer || layer.hidden) return;
    layer.hidden=true;
    document.body.classList.remove('ao-more-open');
    app.querySelectorAll('[data-ao-more-toggle]').forEach(function(x){x.setAttribute('aria-expanded','false');x.classList.remove('is-active')});
    syncMobileDock();
  }
  function toggleMore(){
    var layer=$('aoMoreLayer');if(!layer)return;
    var open=layer.hidden;
    layer.hidden=!open;
    document.body.classList.toggle('ao-more-open',open);
    app.querySelectorAll('[data-ao-more-toggle]').forEach(function(x){x.setAttribute('aria-expanded',String(open));x.classList.toggle('is-active',open)});
    syncMobileDock();
    if(open)layer.querySelector('.ao-more-sheet')?.focus();
  }
  function showRoute(name,options){
    closeMore();
    options=options||{};
    if(name==='account'){if(typeof window.openAccountOrLogin==='function')window.openAccountOrLogin();return;}
    if(name==='tracking'){if(typeof window.openTrackOrderModal==='function')window.openTrackOrderModal();else if(typeof window.scrollToSection==='function')window.scrollToSection('tracking');return;}
    if(name==='cart'){if(typeof window.openCart==='function')window.openCart();return;}
    if(!['home','menu','favorites','offers','reservation','about','gallery','testimonials','contact'].includes(name))name='home';
    activeRoute=name;app.dataset.aoRoute=name;
    var isHome=name==='home', isFav=name==='favorites';
    $('aoHome')?.classList.toggle('is-active',isHome);
    $('aoFavorites')?.classList.toggle('is-active',isFav);
    document.querySelectorAll('#aoNativePages > section').forEach(function(p){p.classList.toggle('ao-native-active',p.id===name)});
    document.querySelectorAll('#aoApp [data-ao-route-target]').forEach(function(btn){var match=btn.dataset.aoRouteTarget===name;btn.classList.toggle('is-active',match);if(btn.hasAttribute('data-ao-tab')){btn.classList.toggle('is-active',match);}});
    if(name==='menu'){
      if(!options.keepFilter){activeCategory='All';if($('aoMainSearch'))$('aoMainSearch').value='';}
      nativeFilter(activeCategory);decorateNative();
    }
    var greet=$('aoToolbarGreeting');if(greet)greet.textContent=(name==='menu'?'Find your favorite flavors':name==='favorites'?'Your favorite dishes':name==='reservation'?'Your table is waiting':'Al Fursan Grills & Restaurant');
    if(name==='favorites')renderCards();
    if(name==='testimonials')renderGuestReviews();
    if(!options.noScroll){window.scrollTo({top:0,behavior:reduced?'auto':'smooth'});}
    renderCategories();
    app.querySelectorAll('[data-ao-filter-chip]').forEach(function(button){
      var selected=button.dataset.aoCategory===activeCategory;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    observeReveal();
    syncMobileDock();
  }
  function navigateCategory(key){
    if($('aoMainSearch'))$('aoMainSearch').value='';
    var isConfigured=key==='All'||key==='hot-deals'||configuredCategories().some(function(c){return normalizedCategoryName(c.name)===normalizedCategoryName(key)});
    activeCategory=isConfigured?key:'All';
    renderCategories();showRoute('menu',{keepFilter:true});
    // Promotional art is editorial, not an extra Admin menu category. If
    // there is no matching category, search real menu products by its term.
    if(!isConfigured){
      var nativeSearch=$('menuSearch');
      if(nativeSearch){nativeSearch.value=String(key||'').trim();
        if(typeof window.filterMenu==='function')window.filterMenu('explore');}
    }
  }
  function originalCart(){try{return App.Services.Cart.items()}catch(_){return window.cart||[];}}
  function cartCount(){try{return App.Services.Cart.count()}catch(_){return originalCart().reduce(function(n,l){return n+(Number(l.qty)||0)},0)}}
  function renderCart(){
    var count=cartCount(),labels=app.querySelectorAll('[data-ao-count]');labels.forEach(function(el){el.textContent=count;el.hidden=!count;});
    // Native cart uses the original checkout flow. Never invite checkout
    // when the bag is empty, and re-enable the action as soon as it has items.
    var checkoutButton=document.querySelector('#cartPanel .cart-checkout button');
    if(checkoutButton){checkoutButton.disabled=count===0;checkoutButton.setAttribute('aria-disabled',String(count===0));}
    var total=$('cartTotal')?.textContent?.trim();if($('aoOrderSubtotal'))$('aoOrderSubtotal').textContent=total && total!=='0'?total:fmt(0);
    var rows=$('aoOrderLines');if(!rows)return;
    var cartRows=originalCart();rows.replaceChildren();
    if(!cartRows.length){var empty=make('div','ao-order-empty');empty.innerHTML='<span>'+icon('bag')+'</span><strong>Your feast starts here.</strong><p>Choose a dish and we’ll take care of the rest.</p>';rows.appendChild(empty);return;}
    var currentItems=items();
    cartRows.forEach(function(line){var item=currentItems.find(function(x){return String(x.id)===String(line.id);});if(!item)return;
      var row=make('div','ao-order-line');var img=make('img');img.alt='';img.src=art(item);img.loading='lazy';row.appendChild(img);var col=make('div');col.appendChild(make('strong','',item.name));
      var variant=Array.isArray(item.variations)?item.variations.find(function(v){return String(v.id)===String(line.variationId)}):null;
      col.appendChild(make('small','',variant&&variant.name?variant.name:fmt(priceFor(item,line.variationId))));
      var controls=make('div','ao-order-qty');var minus=make('button','', '−');minus.type='button';minus.dataset.aoAdjust=String(line.id);minus.dataset.aoVariation=String(line.variationId||'');minus.dataset.aoDelta='-1';minus.setAttribute('aria-label','Decrease '+item.name);
      var plus=make('button','', '+');plus.type='button';plus.dataset.aoAdjust=String(line.id);plus.dataset.aoVariation=String(line.variationId||'');plus.dataset.aoDelta='1';plus.setAttribute('aria-label','Increase '+item.name);
      controls.append(minus,make('span','',line.qty||0),plus);col.appendChild(controls);row.appendChild(col);rows.appendChild(row);
    });
  }
  var oldCartUI=window.updateCartUI;
  if(typeof oldCartUI==='function'){window.updateCartUI=function(){var v=oldCartUI.apply(this,arguments);renderCart();return v;}}
  function getVariations(item){if(!item||!item.variationsEnabled||!Array.isArray(item.variations))return [];return item.variations.filter(function(v){return v && v.enabled!==false;});}
  function detailUpdate(){if(!currentItem)return;
    $('aoDetailPrice').textContent=fmt(priceFor(currentItem,currentVariation));if($('aoDetailTotal'))$('aoDetailTotal').textContent=fmt(priceFor(currentItem,currentVariation)*detailQty);
    $('aoDetailQty').textContent=detailQty;
    document.querySelectorAll('#aoDetailVariationOptions button').forEach(function(b){b.classList.toggle('is-active',b.dataset.aoVariation===currentVariation);b.setAttribute('aria-pressed',String(b.dataset.aoVariation===currentVariation));});
  }
  function pairingCandidates(item) {
    // Change the food combinations for the selected meal: grilled meats go with
    // rice/mezzes, rice with kebabs/salads, sweets with coffee, coffee with sweets.
    // Every suggestion is an actual enabled item from the live menu.
    var type=kind((item.name||'')+' '+categoryText(item));
    var priorities={
      grill:['rice','salad','drink','dessert','seafood'],
      kebab:['rice','salad','drink','dessert','seafood'],
      lamb:['rice','salad','drink','dessert','chicken'],
      chicken:['rice','salad','drink','dessert','seafood'],
      rice:['kebab','chicken','salad','drink','dessert'],
      seafood:['rice','salad','grill','drink','dessert'],
      salad:['grill','kebab','chicken','rice','drink'],
      dessert:['drink','salad','rice','grill','chicken'],
      drink:['dessert','kebab','salad','grill','rice']
    };
    var headings={
      grill:'Sides for your grill',kebab:'Complete your kebab plate',
      lamb:'Sides for your lamb',chicken:'With your chicken',
      rice:'Alongside your rice',seafood:'A little more with seafood',
      salad:'Make it a meal',dessert:'Enjoy something to sip',
      drink:'A bite with your drink'
    };
    var wanted=priorities[type]||priorities.grill;
    var choices=items().filter(function(it){return it && it.enabled!==false && String(it.id)!==String(item.id);});
    var hash=String(item.id||item.name||'').split('').reduce(function(h,char){return (h*31+char.charCodeAt(0))>>>0;},7);
    var selected=[],seen=new Set();
    wanted.forEach(function(k,index){
      if(selected.length>=2)return;
      var viable=choices.filter(function(it){return !seen.has(String(it.id)) && kind((it.name||'')+' '+categoryText(it))===k;});
      if(!viable.length)return;
      var candidate=viable[(hash+index)%viable.length];
      seen.add(String(candidate.id));selected.push(candidate);
    });
    // When the available menu contains fewer categories, offer other genuine dishes.
    if(selected.length<2){
      choices.filter(function(it){return !seen.has(String(it.id));}).sort(function(a,b){
        var aHash=String(a.id).split('').reduce(function(h,c){return (h*37+c.charCodeAt(0))>>>0;},hash);
        var bHash=String(b.id).split('').reduce(function(h,c){return (h*37+c.charCodeAt(0))>>>0;},hash);
        return aHash-bHash;
      }).slice(0,2-selected.length).forEach(function(it){selected.push(it);});
    }
    return {title:headings[type]||'Complete your table',products:selected.slice(0,2)};
  }
  // A familiar location-review feed, backed solely by AFGR's own reviews.
  // Names and messages are always written through textContent (never innerHTML).
  var reviewPage = 1;
  var reviewPageSize = 3;
  function renderGuestReviews() {
    var grid=$('aoGuestReviewsGrid');if(!grid)return;
    var data=Array.isArray(state().reviews)?state().reviews.filter(function(r){return r && r.approved!==false;}):[];
    var count=data.length,total=data.reduce(function(s,r){return s+Math.max(1,Math.min(5,Math.round(Number(r.rating)||5)));},0);
    var avg=count ? (total/count) : 0;
    if($('aoReviewAverage'))$('aoReviewAverage').textContent=count?avg.toFixed(1):'—';
    if($('aoReviewAvgStars'))$('aoReviewAvgStars').textContent=count?'★'.repeat(Math.round(avg))+'☆'.repeat(5-Math.round(avg)):'☆☆☆☆☆';
    if($('aoReviewCount'))$('aoReviewCount').textContent=count+' guest '+(count===1?'review':'reviews');
    var hist=$('aoReviewHistogram');if(hist){hist.replaceChildren();
      [5,4,3,2,1].forEach(function(rating){
        var n=data.filter(function(r){return Math.round(Number(r.rating)||5)===rating}).length;
        var row=make('div','afgr-hist-row');row.append(make('span','',String(rating)+' ★'));
        var track=make('div','afgr-hist-track');var fill=make('span','afgr-hist-fill');fill.style.width=(count?Math.round(n/count*100):0)+'%';track.appendChild(fill);
        row.append(track,make('span','afgr-hist-count',String(n)));hist.appendChild(row);
      });
    }
    var sort=$('aoReviewSort') ? $('aoReviewSort').value : 'newest';
    var rows=data.slice().sort(function(a,b){
      if(sort==='highest')return (Number(b.rating)||0)-(Number(a.rating)||0);
      if(sort==='lowest')return (Number(a.rating)||0)-(Number(b.rating)||0);
      return Date.parse(b.createdAt||'')-Date.parse(a.createdAt||'') || 0;
    });
    var totalPages=Math.max(1,Math.ceil(rows.length/reviewPageSize));
    reviewPage=Math.min(Math.max(1,reviewPage),totalPages);
    var pagination=$('aoReviewPagination');
    if(pagination){
      pagination.replaceChildren();
      pagination.hidden=rows.length<=reviewPageSize;
      if(!pagination.hidden){
        var count=make('span','afgr-review-page-count','Page '+reviewPage+' of '+totalPages);
        var controls=make('div','afgr-review-page-controls');
        function addPageControl(label,next,disabled,aria,current){
          var b=make('button','afgr-review-page-button'+(current?' is-active':''),label);
          b.type='button';b.disabled=!!disabled;b.setAttribute('aria-label',aria);
          if(current)b.setAttribute('aria-current','page');
          b.addEventListener('click',function(){
            if(disabled||reviewPage===next)return;
            reviewPage=next;renderGuestReviews();
            document.getElementById('aoReviewPagination')?.scrollIntoView({block:'nearest',behavior:'smooth'});
          });controls.appendChild(b);
        }
        addPageControl('‹',Math.max(1,reviewPage-1),reviewPage===1,'Previous reviews page',false);
        for(var pi=1;pi<=totalPages;pi++){
          if(totalPages>8 && pi>2 && pi<totalPages-1 && Math.abs(pi-reviewPage)>1){
            if(pi===3 || pi===totalPages-2)controls.appendChild(make('span','afgr-review-ellipsis','…'));
            continue;
          }
          addPageControl(String(pi),pi,false,'Go to reviews page '+pi,pi===reviewPage);
        }
        addPageControl('›',Math.min(totalPages,reviewPage+1),reviewPage===totalPages,'Next reviews page',false);
        pagination.append(count,controls);
      }
    }
    grid.replaceChildren();
    if(!rows.length){
      var empty=make('div','afgr-review-feed-empty');empty.append(make('div','afgr-empty-stars','☆☆☆☆☆'));
      empty.append(make('h3','','Be the first to share your experience'),make('p','','Visit us, enjoy your favorite grills, then tell others what you loved.'));
      var action=make('button','', 'Write the first review');action.type='button';action.addEventListener('click',openGuestReviewForm);empty.appendChild(action);grid.appendChild(empty);return;
    }
    rows.slice((reviewPage-1)*reviewPageSize,reviewPage*reviewPageSize).forEach(function(rev){
      var row=make('article','afgr-review-entry');
      var head=make('div','afgr-review-person');
      var name=String(rev.name||'Guest').trim().slice(0,70)||'Guest';
      var avatar=make('span','afgr-review-person-avatar',name.charAt(0).toUpperCase());
      if(rev.avatarUrl && /^(https?:|data:image\/|assets\/)/i.test(String(rev.avatarUrl))){
        var image=make('img');image.src=String(rev.avatarUrl);image.alt='';image.loading='lazy';avatar.replaceChildren(image);
      }
      // Keep the rating inline AFTER the guest name without a separate star row.
      var rating=Math.max(1,Math.min(5,Math.round(Number(rev.rating)||5)));
      var starRow=make('span','afgr-review-rating-line');
      var stars=make('span','afgr-review-stars','★'.repeat(rating)+'☆'.repeat(5-rating));
      stars.setAttribute('aria-label',rating+' of 5 stars');starRow.appendChild(stars);
      var person=make('div','afgr-review-person-name');
      var nameLine=make('div','afgr-review-name-line');
      nameLine.append(make('strong','',name),starRow);person.append(nameLine);
      if(rev.subtitle && rev.source!=='customer')person.appendChild(make('small','afgr-review-subtitle',String(rev.subtitle).slice(0,90)));
      head.append(avatar,person);
      var date=make('time','afgr-review-date');var stamp=Date.parse(rev.createdAt||'');
      if(Number.isFinite(stamp)){date.dateTime=new Date(stamp).toISOString();date.textContent=new Date(stamp).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});}
      else date.textContent=String(rev.timeAgo||'').trim();
      head.appendChild(date);row.appendChild(head);
      row.appendChild(make('p','afgr-review-copy',String(rev.message||'')));
      grid.appendChild(row);
    });
  }
  var chosenReviewRating=0;
  function setReviewRating(n){chosenReviewRating=n;app.querySelectorAll('#aoReviewStarPicker button').forEach(function(b){
    var score=Number(b.dataset.reviewStar);b.classList.toggle('is-active',score<=n);b.setAttribute('aria-pressed',String(score===n));
  });if($('aoReviewRatingText'))$('aoReviewRatingText').textContent=n?n+' out of 5 stars':'Select a rating';}
  function openGuestReviewForm(){
    var modal=$('aoReviewModal');if(!modal)return;
    var me=window.App&&App.Services&&App.Services.Auth&&App.Services.Auth.currentUser?App.Services.Auth.currentUser():null;
    var identity=$('aoReviewerIdentity');
    var accountName=String(me&&(me.displayName||me.name||me.username)||'').trim();
    if(identity)identity.textContent='';
    if($('aoReviewFeedback'))$('aoReviewFeedback').textContent='';
    if(!chosenReviewRating)setReviewRating(5);
    modal.hidden=false;document.body.classList.add('afgr-review-open');$('aoReviewClose')?.focus();
  }
  function closeGuestReviewForm(){if($('aoReviewModal'))$('aoReviewModal').hidden=true;document.body.classList.remove('afgr-review-open');}
  async function submitGuestReview(event){
    event.preventDefault();var button=$('aoReviewSubmit'),info=$('aoReviewFeedback');
    if(button.disabled)return;
    var auth=window.App&&App.Services&&App.Services.Auth;
    var profile=auth&&typeof auth.currentUser==='function'?auth.currentUser():null;
    var name=String(profile&&(profile.displayName||profile.name||profile.username)||'').trim().slice(0,70);
    var message=String($('aoReviewMessage')?.value||'').trim();
    if(message.length<10||message.length>2000||chosenReviewRating<1||chosenReviewRating>5){info.textContent='Select a star rating and enter at least 10 characters about your visit.';return;}
    if(!name||name.length<2){info.textContent='Please sign in with an account that has a profile name before publishing.';return;}
    var sb=App.Supabase&&App.Supabase.client;
    if(!auth||!auth.session||!auth.session()){
      info.textContent='Sign in to your AFGR account to publish a review.';
      if(typeof window.openAccountOrLogin==='function')window.openAccountOrLogin();return;
    }
    if(!sb||!sb.auth||!sb.from){info.textContent='Reviews require an online connection to the restaurant database. Please try on the deployed website.';return;}
    button.disabled=true;button.textContent='Publishing…';info.textContent='Saving your review securely…';
    try{
      var authResult=await sb.auth.getUser();var user=authResult&&authResult.data&&authResult.data.user;
      if(!user||authResult.error)throw new Error('Your session has expired. Please sign in again.');
      if(profile.authUserId && String(profile.authUserId)!==String(user.id))throw new Error('Your profile session is out of date. Sign in again to post a review.');
      var id=window.App&&App.Util&&App.Util.generateId?App.Util.generateId():'review-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
      var review={id:id,name:name,rating:chosenReviewRating,message:message,source:'customer',authUserId:String(user.id),createdAt:new Date().toISOString(),subtitle:''};
      // Direct INSERT, not Repo.upsert: customers have INSERT-only permission.
      // The confirmed row is inserted into the local review feed afterward,
      // and Supabase Realtime delivers it to Admin -> Reviews Management.
      var result=await sb.from('reviews').insert({id:id,data:review});
      if(result && result.error)throw result.error;
      var live=state();if(!Array.isArray(live.reviews))live.reviews=[];
      if(!live.reviews.some(function(r){return String(r.id)===id}))live.reviews.unshift(review);
      if(App.Store&&App.Store.resetSyncBaseline)App.Store.resetSyncBaseline();
      if(App.Store&&App.Store.save)App.Store.save();
      reviewPage=1;if($('aoReviewSort'))$('aoReviewSort').value='newest';
      renderGuestReviews();
      $('aoReviewForm')?.reset();setReviewRating(0);info.textContent='';closeGuestReviewForm();
      showToast('Thank you! Your review is published.');
      document.dispatchEvent(new CustomEvent('afgr:customer-review-published',{detail:{id:id}}));
    }catch(error){
      var detail=String(error&&error.message||error||'Please try again.');
      if(/row.level.security|permission.denied|42501/i.test(detail))detail='Review submission is not enabled in the database yet. Ask the restaurant administrator to apply the customer-review SQL setup.';
      info.textContent='Review not published: '+detail;
    }finally{button.disabled=false;button.textContent='Publish review ↗';}
  }
  function openDetail(id){var item=items().find(function(x){return String(x.id)===String(id)});if(!item)return;
    currentItem=item;var v=getVariations(item);currentVariation=v.length?String(v[0].id||''):'';detailQty=1;
    $('aoDetailName').textContent=item.name||'Arabic grill dish';$('aoDetailDescription').textContent=item.description||'';var im=$('aoDetailImage');im.src=art(item);im.alt=item.name||'Arabic grill dish';
    var variants=$('aoDetailVariations');var options=$('aoDetailVariationOptions');options.replaceChildren();variants.hidden=!v.length;
    v.forEach(function(variation){var button=make('button','',variation.name||'Option');button.type='button';button.dataset.aoVariation=String(variation.id||'');button.addEventListener('click',function(){currentVariation=button.dataset.aoVariation;detailUpdate();});options.appendChild(button);});
    var extra=$('aoDetailComplementItems'),extraBox=$('aoDetailComplements');
    if(extra){
      extra.replaceChildren();
      var pairing=pairingCandidates(item);
      if($('aoPairingHeading'))$('aoPairingHeading').textContent=pairing.title;
      pairing.products.forEach(function(it){
        var tile=make('div','ao-complement');var thumb=make('img');thumb.src=art(it);thumb.alt='';thumb.loading='lazy';
        var copy=make('div','ao-complement-copy');copy.append(make('strong','',it.name),make('small','',fmt(priceFor(it))));
        var action=make('button','');action.type='button';action.dataset.aoAdd=String(it.id);action.setAttribute('aria-label','Add '+it.name+' to bag');action.innerHTML=icon('plus');
        tile.append(thumb,copy,action);extra.appendChild(tile);
      });
      if(extraBox)extraBox.hidden=!extra.children.length;
    }
    var add=$('aoDetailAdd');add.disabled=item.enabled===false;
    if(item.enabled===false){add.textContent='Currently unavailable';}else{add.innerHTML='Add to bag <span id="aoDetailTotal"></span>'+icon('arrow');}
    $('aoDetailOverlay').hidden=false;document.body.classList.add('ao-detail-open');detailUpdate();$('aoDetailClose')?.focus();
  }
  function closeDetail(){if($('aoDetailOverlay'))$('aoDetailOverlay').hidden=true;document.body.classList.remove('ao-detail-open');currentItem=null;}
  function addItem(id,variationId,qty,from){
    var item=items().find(function(x){return String(x.id)===String(id)});if(!item)return;
    if(item.enabled===false){showToast('This dish is currently unavailable');return;}
    var variants=getVariations(item);if(variants.length&&!variationId){openDetail(id);return;}
    // Capture geometry before any cart/state-driven redraw can detach a card.
    var flightOrigin=from && from.getBoundingClientRect ? from.getBoundingClientRect() : from;
    var sourceCard=from && from.closest ? from.closest('.ao-product, .menu-card') : null;
    var before=cartCount(), service=window.App&&App.Services&&App.Services.Cart;
    for(var k=0;k<Math.min(12,Math.max(1,Number(qty)||1));k++){
      if(typeof window.addToCart==='function')window.addToCart(item.id,variationId||'');
      else if(service&&service.add)service.add(item.id,variationId||'');
    }
    var success=cartCount()>before;
    if(success){renderCart();showToast(item.name+' added to your bag');}
  }
  function liftCard(card){
    if(!card||!card.isConnected)return;
    card.classList.remove('ao-fly-initiated');void card.offsetWidth;
    card.classList.add('ao-fly-initiated');
    setTimeout(function(){card.classList.remove('ao-fly-initiated');},580);
  }
  function cartFlightTarget(){
    var header=app.querySelector('.ao-toolbar-cart');
    var r=header&&header.getBoundingClientRect();
    if(r&&r.width>10&&r.height>10&&r.bottom>0&&r.top<innerHeight)return header;
    var dock=app.querySelector('.ao-dock-cart');
    r=dock&&dock.getBoundingClientRect();
    if(r&&r.width>10&&r.height>10&&r.bottom>0&&r.top<innerHeight)return dock;
    return header;
  }
  // Capture the real visible food photo BEFORE the original cart service
  // redraws any parts of the UI.  Covers Discover, Menu, favorites, detail
  // sheet and paired-item cards.  We never animate an unsuccessful add.
  var pendingFlightIntent=null;
  function captureFlightIntent(event){
    var button=event.target && event.target.closest && event.target.closest(
      '[data-ao-add], #aoDetailAdd, #menu .menu-card .price button'
    );
    if(!button || button.disabled || !app.contains(button))return;
    var card=button.closest('.ao-product, .menu-card, .ao-complement, .ao-detail-sheet');
    var image=(card && card.querySelector('.ao-product-art img, .media img, .ao-complement img, #aoDetailImage')) || button;
    // Product-detail modal is inside the app but the source is its large photo.
    if(button.id==='aoDetailAdd')image=$('aoDetailImage') || image;
    var r=image.getBoundingClientRect();
    if(!r.width || !r.height)return;
    pendingFlightIntent={
      rect:{left:r.left,top:r.top,width:r.width,height:r.height},
      src:image.tagName==='IMG' ? (image.currentSrc || image.src) : '',
      card:card,
      stamp:performance.now(),used:false,launched:false,originalCount:cartCount()
    };
    const intent = pendingFlightIntent;
    // Some legacy menu button handlers execute outside the normal service
    // wrapper (or after another render). This guarded fallback watches for
    // a REAL quantity increase; it never animates a failed/disabled add.
    [90,320,750].forEach(function(delay){
      setTimeout(function(){
        if (!intent || intent.launched || cartCount() <= intent.originalCount) return;
        if (performance.now()-intent.stamp > 1700) return;
        const card = intent.card;
        const dishId = button.dataset.aoAdd || (card && card.dataset.aoItem) ||
          (card && card.querySelector('[data-ao-add]')?.dataset.aoAdd) ||
          (card && card.querySelector('.content h4')?.textContent);
        const chosen = items().find(function(x){return String(x.id) === String(dishId) || String(x.name) === String(dishId)}) || currentItem;
        if (!chosen) return;
        intent.launched = true;
        if (card && card.isConnected) liftCard(card);
        animateFly(intent.rect, chosen, intent.src);
      }, delay);
    });
  }
  function landCart(target){
    if(!target)return;
    target.classList.remove('ao-cart-land');void target.offsetWidth;
    target.classList.add('ao-cart-land');
    setTimeout(function(){target.classList.remove('ao-cart-land')},600);
  }
  // The only launch point: a real successful App.Services.Cart.add.
  // Native legacy menu buttons do not call addItem(), so listening only to
  // that UI handler was not reliable.  This wrapper preserves Cart.add's
  // original arguments, this context, return value and side effects.
  function wireSuccessfulCartFlights(){
    if(!window.App || !App.Services || !App.Services.Cart)return;
    var cart=App.Services.Cart;
    if(cart.add.__afgrFlightWrapped)return;
    var originalAdd=cart.add;
    function observedAdd(id,variationId){
      var before=cartCount();
      var result=originalAdd.apply(this,arguments);
      if(cartCount()>before){
        var intent=pendingFlightIntent;
        if(intent && !intent.launched && performance.now()-intent.stamp<1800){
          intent.used=true;
          intent.launched=true;
          var item=items().find(function(x){return String(x.id)===String(id)});
          if(item){
            if(intent.card && intent.card.isConnected)liftCard(intent.card);
            animateFly(intent.rect,item,intent.src);
          }
          // Original Menu additions need the same feedback as Discover.
          if(intent.card && intent.card.classList.contains('menu-card') && item){
            showToast(item.name+' added to your bag');
          }
        }
      }
      return result;
    }
    observedAdd.__afgrFlightWrapped=true;
    cart.add=observedAdd;
    app.addEventListener('click',captureFlightIntent,true);
  }
  // Cart photo flight: no Web Animations or hidden legacy .ao-fly-photo.
  // A requestAnimationFrame path moves the actual dish image from its original
  // position into the VISIBLE header cart, including on browsers configured
  // to limit page animations. This animation responds to an explicit add click.
  function animateFly(origin,item,imageUrl){
    var target=cartFlightTarget();if(!target||!origin)return;
    var destination=target.getBoundingClientRect();
    if(destination.width<10||destination.height<10||origin.width<2)return;
    var prefersReduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var size=Math.min(106,Math.max(74,origin.width*.51));
    var startX=Math.max(0,Math.min(innerWidth-size,origin.left+origin.width/2-size/2));
    var startY=Math.max(0,Math.min(innerHeight-size,origin.top+origin.height/2-size/2));
    var endX=destination.left+destination.width/2-size/2;
    var endY=destination.top+destination.height/2-size/2;
    var dx=endX-startX,dy=endY-startY;
    var arc=prefersReduced?30:Math.min(73,Math.max(43,Math.abs(dx)*.065));
    var photo=document.createElement('img');photo.className='afgr-cart-flight-photo';
    photo.src=imageUrl||art(item);photo.alt='';photo.draggable=false;
    photo.setAttribute('aria-hidden','true');photo.dataset.afgrDish=String(item.id);
    photo.onerror=function(){photo.onerror=null;photo.src=art(item);};
    photo.style.setProperty('width',size+'px','important');photo.style.setProperty('height',size+'px','important');
    photo.style.setProperty('left','0','important');photo.style.setProperty('top','0','important');
    photo.style.setProperty('display','block','important');photo.style.setProperty('visibility','visible','important');
    document.body.appendChild(photo);
    var started=performance.now(),duration=prefersReduced?510:1050;
    var stateLog=window.__AFGR_FLIGHT_STATE=window.__AFGR_FLIGHT_STATE||{starts:0,lands:0,last:null};
    stateLog.starts++;stateLog.last={itemId:String(item.id),startX:startX,startY:startY,endX:endX,endY:endY,progress:0,completed:false,target:target.className};
    window.__AFGR_CART_FLIGHTS=(window.__AFGR_CART_FLIGHTS||0)+1;
    var testData=stateLog.last;
    var burst=document.createElement('span');burst.className='afgr-cart-flight-burst';burst.textContent='+';
    burst.setAttribute('aria-hidden','true');document.body.appendChild(burst);
    var finished=false;
    function finish(){if(finished)return;finished=true;photo.remove();burst.remove();landCart(target);
      testData.completed=true;testData.progress=1;stateLog.lands++;
      document.dispatchEvent(new CustomEvent('afgr:cart-flight-landed',{detail:{dishId:String(item.id)}}));}
    function step(now){
      if(finished)return;
      var t=Math.min(1,(now-started)/duration);
      // Ease in/out horizontal movement; a parabola makes the flight
      // visibly lift above the card and smoothly drop into the cart.
      var ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
      var x=startX+dx*ease,y=startY+dy*ease-arc*4*t*(1-t);
      var scale=t<.18?1+.36*t/.18:1.36-(1.2*Math.pow((t-.18)/.82,1.35));
      /* Keep the photographed dish visibly inside the browser while it heads
         to the fixed top cart; a high arc previously went above the viewport. */
      y=Math.max(6-size*(1-scale)/2,y);
      var angle=-11+24*ease;
      var opacity=t>.88?Math.max(.04,1-(t-.88)/.12):1;
      photo.style.setProperty('transform','translate3d('+x+'px,'+y+'px,0) rotate('+angle+'deg) scale('+scale+')','important');
      photo.style.setProperty('opacity',String(opacity),'important');
      photo.style.setProperty('filter','drop-shadow(0 13px 17px rgba(27,41,24,.3)) saturate(1.18)','important');
      burst.style.transform='translate3d('+(x+size*.7)+'px,'+(y+size*.08)+'px,0) scale('+(1+Math.sin(Math.PI*t)*.55)+')';
      burst.style.opacity=String(t>.3&&t<.83?1:0);
      testData.progress=t;testData.x=x;testData.y=y;
      if(t<1)requestAnimationFrame(step);else finish();
    }
    requestAnimationFrame(step);
    // Robust cleanup if a browser throttles the tab or pauses RAF.
    setTimeout(finish,duration+420);
  }

  function decorateNative(){var grid=$('menuItems');if(!grid)return;
    grid.querySelectorAll('.menu-card').forEach(function(card){var title=card.querySelector('h4');if(!title)return;
      var item=items().find(function(x){return String(x.name)===String(title.textContent)});if(!item)return;
      var media=card.querySelector('.media');if(!media)return;
      var content=card.querySelector('.content');
      if(content && !content.querySelector('.ao-menu-category')){
        if(categoryText(item))content.insertBefore(make('small','ao-menu-category',categoryText(item)),title);
      }
      if(item.enabled===false && !media.querySelector('.ao-native-sticker')){
        media.appendChild(make('span','ao-native-sticker','UNAVAILABLE'));
      } else if(item.enabled!==false) { media.querySelector('.ao-native-sticker')?.remove(); }
      if(!media.querySelector('.ao-native-heart')){var h=make('button','ao-native-heart');h.type='button';h.innerHTML=icon('heart');h.dataset.aoFavorite=String(item.id);h.setAttribute('aria-label','Save '+item.name);media.appendChild(h);}
      media.querySelector('.ao-native-heart').classList.toggle('saved',fav(item.id));
      media.dataset.aoDetail=String(item.id);media.tabIndex=0;media.setAttribute('role','button');media.setAttribute('aria-label','View '+item.name);
      var add=card.querySelector('.price button');if(add){add.title='Add '+item.name+' to your bag';}
    });
  }
  function observeReveal(){var elements=app.querySelectorAll('.ao-reveal:not(.ao-visible)');if(reduced||!('IntersectionObserver' in window)){elements.forEach(function(x){x.classList.add('ao-visible')});return;}
    if(!observeReveal.io){observeReveal.io=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('ao-visible');observeReveal.io.unobserve(entry.target);}})},{threshold:.05,rootMargin:'0px 0px 120px 0px'});}
    elements.forEach(function(n){observeReveal.io.observe(n);});
  }
  function renderAll(){renderCategories();renderCards();decorateNative();renderCart();renderGuestReviews();syncOfferDots();}
  function mountLegacyRoutes(){var dest=$('aoNativePages');if(!dest)return;
    ['menu','reservation','offers','about','gallery','testimonials','contact'].forEach(function(id){var section=$(id);if(section&&section.parentNode!==dest){dest.appendChild(section);}});
  }
  function safeSearch(){var search=$('aoMainSearch'),native=$('menuSearch');if(native)native.value=search?search.value:'';
    if(search&&search.value.trim()){activeCategory='All';showRoute('menu',{keepFilter:true,noScroll:true});if(native)native.value=search.value;if(typeof window.filterMenu==='function')window.filterMenu('explore');}
    else if(activeRoute==='menu'){nativeFilter(activeCategory);} }
  function init(){mountLegacyRoutes();app.dataset.aoRoute='home';
    var year=document.getElementById('aoCopyrightYear');if(year)year.textContent=String(new Date().getFullYear());
    if(typeof window.addArabicTranslations==='function')window.addArabicTranslations({
      'Discover':'اكتشف','Explore menu':'تصفح القائمة','Saved dishes':'الأطباق المحفوظة',
      'Explore':'اكتشف','flavors':'النكهات','Popular':'الأشهر','See all':'عرض الكل','View all':'عرض الكل',
      'FIND YOUR CRAVING':'اكتشف ما تشتهي','FROM OUR KITCHEN':'من مطبخنا',
      'Biryani & rice':'برياني وأرز','Grills':'مشاوي','Chicken':'دجاج','Seafood':'مأكولات بحرية',
      'Desserts':'حلويات','Coffee & drinks':'قهوة ومشروبات',
      'FRESHLY MADE':'محضّر طازجًا','CHEF’S PICK':'اختيار الشيف',
      'Special offers':'العروض الخاصة','Book a table':'احجز طاولة',
      'Track an order':'تتبع الطلب','YOUR FOOD JOURNEY':'رحلتك مع الطعام',
      'BEYOND THE TABLE':'ما وراء المائدة','Our story':'قصتنا',
      'The gallery':'معرض الصور','Contact us':'اتصل بنا',
      'Guest reviews':'آراء الضيوف','Reviews':'التقييمات','What our guests are saying.':'ماذا يقول ضيوفنا.',
      'Developer information':'معلومات المطور','Developed By':'تطوير','Privacy Policy':'سياسة الخصوصية',
      'Terms & Conditions':'الشروط والأحكام','Gallery':'معرض الصور',
      'Reservations':'الحجوزات','Offers':'العروض',
      'Explore flavors':'اكتشف النكهات','Popular dishes':'الأطباق الأكثر طلبًا',
      'Authentic':'أصيل','Arabic Grill':'مشاوي عربية',
      'Where charcoal meets tradition. Generous grills, aromatic rice and flavors made for sharing.':'حيث يلتقي الفحم بالأصالة. مشاوي شهية وأرز عطري ونكهات للمشاركة.',
      'Find a dish':'ابحث عن طبق','Search grills, biryani, kebabs...':'ابحث عن مشاوي أو برياني أو كباب...',
      'Saved':'المحفوظات','dishes':'الأطباق', 'Offers & Deals':'العروض والتخفيضات',
      'Contact Us':'تواصل معنا','Send a Message':'أرسل رسالة',
      'Name':'الاسم','Phone':'الهاتف','Date':'التاريخ','Time':'الوقت','Guests':'الضيوف',
      'Reserve Your Table':'احجز طاولتك','Confirm Reservation':'تأكيد الحجز',
      'All rights reserved.':'جميع الحقوق محفوظة.',
      'Our location':'موقعنا','Your experience matters':'تجربتك تهمنا',
      'Guest reviews will appear here when they are published.':'ستظهر آراء الضيوف هنا عند نشرها.',
      'Sides for your grill':'أطباق جانبية لمشاويك',
      'Complete your kebab plate':'أكمل طبق الكباب',
      'Sides for your lamb':'أطباق جانبية للحم الضأن',
      'With your chicken':'مع طبق الدجاج',
      'Alongside your rice':'مع طبق الأرز',
      'A little more with seafood':'إضافات مع المأكولات البحرية',
      'Make it a meal':'اجعلها وجبة متكاملة',
      'Enjoy something to sip':'استمتع بمشروب معها',
      'A bite with your drink':'لقمة لذيذة مع مشروبك',
      'I have read and agree to the':'لقد قرأت وأوافق على',
      'Create Account':'إنشاء حساب'
    });
    // Keep the original data-backed cards available for variations/checkout.
    var nativeGrid=$('menuItems');if(nativeGrid){new MutationObserver(function(){clearTimeout(init.menuTimer);init.menuTimer=setTimeout(function(){decorateNative();renderCards();},110);}).observe(nativeGrid,{childList:true});}
    var originalCartList=$('cartItems');if(originalCartList){new MutationObserver(function(){clearTimeout(init.cartTimer);init.cartTimer=setTimeout(renderCart,55)}).observe(originalCartList,{childList:true,subtree:true,characterData:true});}
    var dockCartPanel=$('cartPanel');
    if(dockCartPanel){new MutationObserver(syncMobileDock).observe(dockCartPanel,{attributes:true,attributeFilter:['class']});}
    window.addEventListener('resize',syncMobileDock);
    syncMobileDock();
    var nativeCategory=$('menuCategories');if(nativeCategory){new MutationObserver(function(){clearTimeout(init.categoryTimer);init.categoryTimer=setTimeout(function(){renderCategories();renderCards();},170)}).observe(nativeCategory,{childList:true});}
    app.addEventListener('click',function(e){
      var a=e.target.closest('[data-ao-more-toggle]');if(a){toggleMore();return;}
      a=e.target.closest('[data-ao-more-close]');if(a){closeMore();return;}
      a=e.target.closest('[data-ao-developer]');if(a){closeMore();if(typeof window.openDeveloperInfoModal==='function')window.openDeveloperInfoModal();return;}
      a=e.target.closest('[data-ao-legal]');if(a){closeMore();if(typeof window.openLegalPage==='function')window.openLegalPage(a.dataset.aoLegal);return;}
      a=e.target.closest('[data-ao-route-target]');if(a){showRoute(a.dataset.aoRouteTarget);return;}
      a=e.target.closest('[data-ao-category]');if(a){navigateCategory(a.dataset.aoCategory);return;}
      a=e.target.closest('[data-ao-account]');if(a){showRoute('account');return;}
      a=e.target.closest('[data-ao-cart]');if(a){if(typeof window.openCart==='function')window.openCart();return;}
      a=e.target.closest('[data-ao-favorite]');if(a){favoriteToggle(a.dataset.aoFavorite);return;}
      a=e.target.closest('[data-ao-add]');if(a){
        var item=items().find(function(it){return String(it.id)===a.dataset.aoAdd});
        var origin=(a.closest('.ao-product')&&a.closest('.ao-product').querySelector('.ao-product-art img')) ||
                   (a.closest('.ao-complement')&&a.closest('.ao-complement').querySelector('img')) || a;
        if(item)addItem(item.id,'',1,origin);return;
      }
      a=e.target.closest('[data-ao-adjust]');if(a){if(App&&App.Services&&App.Services.Cart)App.Services.Cart.adjustQty(a.dataset.aoAdjust,a.dataset.aoVariation||'',Number(a.dataset.aoDelta)||0);return;}
      a=e.target.closest('[data-ao-detail]');if(a){openDetail(a.dataset.aoDetail);return;}
      a=e.target.closest('[data-ao-detail-qty]');if(a){detailQty=Math.max(1,Math.min(12,detailQty+Number(a.dataset.aoDetailQty)));detailUpdate();return;}
    });
    app.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.matches('[data-ao-detail]')){e.preventDefault();openDetail(e.target.dataset.aoDetail);}if(e.key==='Escape'){closeMore();closeDetail();}});
    $('aoDetailClose')?.addEventListener('click',closeDetail);
    $('aoDetailOverlay')?.addEventListener('mousedown',function(e){if(e.target===$('aoDetailOverlay'))closeDetail();});
    $('aoDetailAdd')?.addEventListener('click',function(){if(!currentItem)return;var item=currentItem,qty=detailQty,variant=currentVariation;var source=$('aoDetailImage')||$('aoDetailAdd');var origin=source.getBoundingClientRect();closeDetail();addItem(item.id,variant,qty,origin);});
    $('aoTrackingButton')?.addEventListener('click',function(){showRoute('tracking')});
    $('aoMainSearch')?.addEventListener('input',function(){clearTimeout(init.searchTimer);init.searchTimer=setTimeout(safeSearch,140)});
    // Portal the form to the application root. The native route pane is
    // clipped/stacked beneath the mobile bottom dock; leaving the dialog
    // there hides its submit button on phones.
    if($('aoReviewModal') && $('aoReviewModal').parentNode!==app)app.appendChild($('aoReviewModal'));
    $('aoWriteReview')?.addEventListener('click',openGuestReviewForm);
    $('aoReviewClose')?.addEventListener('click',closeGuestReviewForm);
    $('aoReviewCloseBackdrop')?.addEventListener('click',closeGuestReviewForm);
    $('aoReviewStarPicker')?.addEventListener('click',function(event){var b=event.target.closest('[data-review-star]');if(b)setReviewRating(Number(b.dataset.reviewStar));});
    $('aoReviewSort')?.addEventListener('change',function(){reviewPage=1;renderGuestReviews();});
    $('aoReviewForm')?.addEventListener('submit',submitGuestReview);
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('aoReviewModal')?.hidden)closeGuestReviewForm();});
    wireSuccessfulCartFlights();
    // Avoid interfering with original admin/owner panel navigation.
    renderAll();observeReveal();
    // SupabaseSync can replace in-memory data without dispatching an app event.
    // Check only a small fingerprint; never write or poll the database.
    var previous='';
    setInterval(function(){if(document.hidden || (!website.offsetParent && getComputedStyle(website).display==='none'))return;
      var s=state(),list=Array.isArray(s.menuItems)?s.menuItems:[],cats=Array.isArray(s.categories)?s.categories:[];
      var mark=list.length+'|'+list.map(function(x){return x.id+':'+x.name+':'+x.sellingPrice+':'+x.image+':'+x.enabled+':'+x.description+':'+JSON.stringify(x.variations||[]);}).join('~')+'|'+cats.map(function(x){return x.name;}).join('~')+'|'+(s.reviews||[]).map(function(r){return (r.id||'')+':'+(r.name||'')+':'+(r.message||'')+':'+(r.rating||'');}).join('~');
      if(previous!==mark){previous=mark;renderAll();}
      else syncOfferDots(); // react to admin changes and offer expiry even when menu data is unchanged
    },5000);
    if(fine&&!reduced){var hero=app.querySelector('.ao-hero'),food=app.querySelector('.ao-big-food');if(hero&&food){var frame=0;hero.addEventListener('pointermove',function(e){if(innerWidth<960)return;var b=hero.getBoundingClientRect();var dx=((e.clientX-b.left)/b.width-.5)*14,dy=((e.clientY-b.top)/b.height-.5)*11;if(frame)return;frame=requestAnimationFrame(function(){food.style.translate=dx+'px '+dy+'px';frame=0})},{passive:true});hero.addEventListener('pointerleave',function(){food.style.translate='0 0'});}}
    window.AFGRArabianApp={showRoute:showRoute,showDetail:openDetail,refresh:renderAll};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
