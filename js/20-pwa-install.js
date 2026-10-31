/* AFGR PWA installation: browser-owned prompt where supported, accessible instructions elsewhere. */
(function(){
  'use strict';
  var deferredInstall = null;
  var dialog = null;
  var lastTrigger = null;
  var opened = false;

  // Capture this early. Chromium only offers this event when the PWA is eligible.
  window.addEventListener('beforeinstallprompt', function(event){
    event.preventDefault();
    deferredInstall = event;
  });

  function alreadyInstalled(){
    try { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true; }
    catch(err){ return false; }
  }
  function isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);}
  function isAndroid(){return /Android/i.test(navigator.userAgent);}
  function isSafari(){return /Safari/i.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);}

  function closeDialog(){
    if(!dialog || dialog.hidden)return;
    dialog.hidden = true; opened = false;
    document.removeEventListener('keydown', onKeydown);
    if(lastTrigger && document.contains(lastTrigger))lastTrigger.focus();
  }
  function onKeydown(event){
    if(event.key==='Escape'){closeDialog();return;}
    if(event.key==='Tab' && dialog && !dialog.hidden){
      var buttons = Array.from(dialog.querySelectorAll('button:not([disabled])'));
      if(!buttons.length)return;
      var first=buttons[0],last=buttons[buttons.length-1];
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    }
  }
  function showInstructions(message,steps){
    dialog = dialog || document.getElementById('afgrInstallDialog');
    if(!dialog)return;
    document.getElementById('afgrInstallMessage').textContent=message;
    var holder=document.getElementById('afgrInstallSteps');
    holder.textContent='';
    steps.forEach(function(step,i){
      var row=document.createElement('div'); row.className='afgr-install-step';
      var num=document.createElement('b');num.textContent=String(i+1);num.setAttribute('aria-hidden','true');
      var text=document.createElement('span');text.textContent=step;
      row.appendChild(num);row.appendChild(text);holder.appendChild(row);
    });
    dialog.hidden=false;opened=true;
    dialog.querySelector('.afgr-install-x').focus();
    document.addEventListener('keydown',onKeydown);
  }
  function dismissMore(){
    var layer=document.getElementById('aoMoreLayer');
    if(layer && !layer.hidden){
      var close=layer.querySelector('[data-ao-more-close]');
      if(close)close.click();
    }
  }
  function fallback(){
    if(alreadyInstalled()){
      showInstructions('Al Fursan Grills & Restaurant is already running on this device.',
        ['Find Al Fursan Grills & Restaurant in your apps or on your Home Screen to open it again.']);
      return;
    }
    if(isIOS()){
      if(isSafari())showInstructions('Add the app to your iPhone or iPad Home Screen using Safari.',
        ['Tap the Share button in Safari (square with an upward arrow).','Choose Add to Home Screen, then tap Add.']);
      else showInstructions('On iPhone or iPad, open this website in Safari to install it.',
        ['Copy this page address and open it in Safari.','Tap Share, choose Add to Home Screen, and tap Add.']);
      return;
    }
    if(isAndroid()){
      showInstructions('Your browser has not made the direct installation prompt available yet.',
        ['Open the website in Google Chrome, if it is not already open there.','In Chrome, tap the three-dot menu and choose Install app or Add to Home screen.']);
      return;
    }
    if(!window.isSecureContext){
      showInstructions('The app must be opened on its secure, published website to install.',
        ['Open your GitHub Pages website using an https:// address.','Then tap Get App again in Chrome or Edge.']);
      return;
    }
    showInstructions('Your browser is not currently offering a direct installation prompt.',
      ['In Chrome or Edge, look for the Install icon in the address bar.','If it is not visible, open the browser menu and choose Install page as app or Apps → Install this site as an app.']);
  }

  function nativeApkUrl(){
    var configured = (window.App && App.Config && App.Config.NATIVE_ANDROID_APK_URL) || '';
    if(!configured)return null;
    try {
      var url=new URL(configured,window.location.href);
      if(url.protocol==='https:' && /\.apk$/i.test(url.pathname))return url.href;
    } catch(e) {}
    return null;
  }
  function getApp(trigger){
    lastTrigger=trigger;
    // Native installation requires a real, signed APK, an HTTPS hosting URL,
    // and an explicit Android installation confirmation. Never pretend a
    // PWA installation is equivalent to the native FCM-enabled Android app.
    var apk = isAndroid() ? nativeApkUrl() : null;
    if(apk){dismissMore();window.location.assign(apk);return;}

    // Show native prompt synchronously within the click gesture; don't await
    // unrelated work before requesting the browser's installation dialog.
    if(deferredInstall && !alreadyInstalled()){
      var promptEvent=deferredInstall;
      deferredInstall=null; // a BeforeInstallPromptEvent can be used once
      var response;
      try{response=promptEvent.prompt();}
      catch(error){dismissMore();fallback();return;}
      dismissMore();
      Promise.resolve(response || promptEvent.userChoice).then(function(){
        // The browser owns the install result; a dismissed prompt is not installation.
      }).catch(function(){ /* No premature success confirmation. */ });
      return;
    }
    dismissMore();
    fallback();
  }

  document.addEventListener('click',function(event){
    var trigger=event.target.closest('[data-ao-install]');
    if(trigger){event.preventDefault();getApp(trigger);return;}
    if(event.target.closest('[data-install-dismiss]')){event.preventDefault();closeDialog();}
  });
  window.addEventListener('appinstalled',function(){
    deferredInstall=null;
    if(opened)closeDialog();
  });
  window.AFGRInstall = {open: getApp, isInstalled: alreadyInstalled};
})();
