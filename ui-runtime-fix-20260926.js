'use strict';

(function () {
  function installMenuFix() {
    if (document.getElementById('cgUiRuntimeFix20260926')) return;
    const style = document.createElement('style');
    style.id = 'cgUiRuntimeFix20260926';
    style.textContent = `
      #tabs.tabs{
        display:grid!important;
        grid-template-columns:repeat(auto-fit,minmax(120px,1fr))!important;
        gap:8px!important;
        width:100%!important;
        overflow:visible!important;
        flex-wrap:wrap!important;
        padding:2px 0!important;
      }
      #tabs.tabs .tab{
        width:100%!important;
        min-width:0!important;
        max-width:none!important;
        white-space:normal!important;
        text-align:center!important;
        line-height:1.15!important;
      }
      @media (max-width:700px){
        #tabs.tabs{grid-template-columns:repeat(2,minmax(0,1fr))!important;}
      }
      @media (max-width:360px){
        #tabs.tabs{grid-template-columns:1fr!important;}
      }
      #viewBus #busBalance,
      #viewBus #busFare{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
        color:#fff!important;
        -webkit-text-fill-color:#fff!important;
      }
    `;
    document.head.appendChild(style);
  }

  async function restoreBusValues() {
    try {
      if (!state || !state.token || typeof refreshBus !== 'function') return;
      await refreshBus();
    } catch (_) {}
  }

  installMenuFix();

  if (typeof showView === 'function') {
    const previousShowView = showView;
    showView = async function (id) {
      await previousShowView(id);
      installMenuFix();
      if (id === 'viewBus') await restoreBusValues();
    };
  }

  document.addEventListener('click', function (event) {
    const button = event.target && event.target.closest ? event.target.closest('#tabs .tab') : null;
    if (!button) return;
    setTimeout(function () {
      installMenuFix();
      if (state && state.activeView === 'viewBus') restoreBusValues();
    }, 80);
  }, true);

  if (state && state.token) {
    setTimeout(function () {
      installMenuFix();
      if (state.activeView === 'viewBus') restoreBusValues();
    }, 250);
  }
})();
