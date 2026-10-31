/* AFGR public Menu category imagery: decorate existing native buttons without
   replacing their filtering, live data or event handlers. */
(function(){
  'use strict';
  var host = document.getElementById('menuCategories');
  if (!host || host.__afgrCircularArtInitialized) return;
  host.__afgrCircularArtInitialized = true;
  var fallback={
    grill:'assets/arabic/feature-charcoal-premium.webp',
    kebab:'assets/arabic/charcoal-skewers.webp',
    seafood:'assets/arabic/feature-seafood-card-sharp.webp',
    rice:'assets/arabic/feature-biryani-premium.webp',
    chicken:'assets/arabic/spicy-chicken.webp',
    salad:'assets/arabic/arabic-mixed-platter.webp',
    dessert:'assets/arabic/arabic-dessert.webp',
    soup:'assets/arabic/arabic-dessert.webp',
    drink:'assets/arabic/arabic-coffee.webp',
    default:'assets/arabic/hero-charcoal-feast-hd.webp',
    deals:'assets/arabic/feature-feast-premium.webp'
  };
  function state(){return window.appState||(window.App&&App.Store&&App.Store.state)||{};}
  function categoryKind(value){
    var label=String(value||'').toLowerCase();
    if (/biryani|biriyani|rice|mandi|kabsa|pulao|pilaf/.test(label)) return 'rice';
    if (/fish|prawn|shrimp|seafood|lobster|calamari/.test(label)) return 'seafood';
    if (/tea|coffee|drink|juice|beverage|refreshment|shake/.test(label)) return 'drink';
    if (/dessert|sweet|kunafa|baklava|cake|ice.?cream/.test(label)) return 'dessert';
    if (/salad|appetizer|starter|mezze|hummus/.test(label)) return 'salad';
    if (/soup|shorba|lentil/.test(label)) return 'soup';
    if (/chicken|tawook|broast/.test(label)) return 'chicken';
    if (/kebab|kabab|kofta|tikka|skewer/.test(label)) return 'kebab';
    return 'grill';
  }
  function validImage(src){
    var s=String(src||'').trim();
    return (s.startsWith('assets/')||s.startsWith('data:image/')||/^https?:\/\//i.test(s))?s:null;
  }
  function photoFor(category, label, idx){
    var s=state();
    var menu=Array.isArray(s.menuItems)?s.menuItems:[];
    var cats=Array.isArray(s.categories)?s.categories:[];
    if(idx==='explore') {
      var first=menu.find(Boolean);
      return first && validImage(first.image) || fallback.default;
    }
    if(idx==='hot-deals') {
      var firstDeal=menu.find(function(item){
        if(!item)return false;
        try {if(typeof window.itemHasAnyDiscountOrDeal==='function')return window.itemHasAnyDiscountOrDeal(item);}
        catch (_) {}
        var p=Number(item.sellingPrice!=null?item.sellingPrice:item.price);
        return (p>=0 && Number(item.originalPrice)>p) || Number(item.discount)>0 ||
          (s.offers||[]).some(function(o){return o && o.enabled!==false &&
            (!o.end || Number(o.end)>Date.now()) && String(o.productId)===String(item.id);});
      });
      return firstDeal && validImage(firstDeal.image) || fallback.deals;
    }
    var firstProduct=menu.find(function(item){
      if(!item)return false;
      var id=item.category;
      var name=item.categoryName||'';
      if(id!=null){
        var v=Number(id);
        if(Number.isInteger(v) && cats[v]) name=cats[v].name||name;
        var match=cats.find(function(c){return c && String(c.id)===String(id);});
        if(match) name=match.name||name;
      }
      return String(name).trim().toLowerCase()===String(label).trim().toLowerCase();
    });
    // Never substitute a category-level photo or a later product for the first.
    if(firstProduct)return validImage(firstProduct.image)||fallback[categoryKind(label)]||fallback.default;
    return fallback[categoryKind(label)]||fallback.default;
  }
  function tone(label){
    var k=categoryKind(label);
    return ({grill:['#f4e6c9','#ead6ac'],kebab:['#f5e0c7','#f3d9c3'],seafood:['#dceeea','#ccdfd9'],rice:['#f6e9c2','#f3dfad'],chicken:['#f4dfd0','#f3d5c3'],salad:['#e7f0dd','#d9e8c9'],dessert:['#f9e8d2','#f4daba'],soup:['#f3e5cd','#e5d8bd'],drink:['#eee9dd','#dfd5c7']})[k]||['#f5e8d2','#e8d8b8'];
  }
  function enhance(){
    var categories=Array.isArray(state().categories)?state().categories:[];
    var buttons=Array.from(host.querySelectorAll(':scope > button'));
    buttons.forEach(function(button){
      if(button.querySelector('.afgr-cat-visual'))return;
      var key=button.dataset.cat;
      var idx=Number(key),cat=Number.isInteger(idx)&&key!==''?categories[idx]:null;
      var label=button.textContent.trim()||(cat&&cat.name)||'Category';
      var hotDeal=(key==='hot-deals');
      var src=hotDeal?null:photoFor(cat,label,key);
      var wrap=document.createElement('span');wrap.className='afgr-cat-visual'+(hotDeal?' afgr-hot-flame-menu':'');
      var colors=hotDeal?['#48160b','#ffb65d']:tone(label);
      wrap.style.setProperty('--afgr-cat-tone',colors[0]);
      wrap.style.setProperty('--afgr-cat-ring',colors[1]);
      if(hotDeal){
        var flame=document.createElement('span');
        flame.className='afgr-fire-emoji';
        flame.textContent='🔥';
        flame.setAttribute('aria-hidden','true');
        wrap.appendChild(flame);
      }else{
        var img=document.createElement('img');img.src=src;img.alt='';img.loading='lazy';img.decoding='async';
        img.onerror=function(){if(img.getAttribute('src')!==fallback.default) img.src=fallback.default;};
        wrap.appendChild(img);
      }
      var text=document.createElement('span');text.className='afgr-cat-label';text.textContent=label;
      button.replaceChildren(wrap,text);
      button.setAttribute('aria-label','Browse '+label);
    });
  }
  // The native menu is regenerated after category edits and Supabase sync.
  // Observe direct child additions only, never mutations inside a decorated button.
  var timer=null;
  var obs=new MutationObserver(function(mutations){
    if(mutations.some(function(m){return m.type==='childList';})){
      clearTimeout(timer);
      timer=setTimeout(enhance,35);
    }
  });
  obs.observe(host,{childList:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enhance,{once:true});
  else enhance();
  window.addEventListener('load',enhance,{once:true});
})();
