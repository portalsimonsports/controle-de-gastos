'use strict';

(function () {
  function applyMenuFix() {
    const nav = document.getElementById('tabs');
    if (!nav) return;

    nav.scrollLeft = 0;
    nav.scrollTop = 0;
    nav.style.setProperty('display', 'grid', 'important');
    nav.style.setProperty('grid-template-columns', window.innerWidth <= 700 ? 'repeat(2,minmax(0,1fr))' : 'repeat(auto-fit,minmax(118px,1fr))', 'important');
    nav.style.setProperty('gap', '8px', 'important');
    nav.style.setProperty('width', '100%', 'important');
    nav.style.setProperty('max-width', '100%', 'important');
    nav.style.setProperty('height', 'auto', 'important');
    nav.style.setProperty('max-height', 'none', 'important');
    nav.style.setProperty('overflow', 'visible', 'important');
    nav.style.setProperty('overflow-x', 'visible', 'important');
    nav.style.setProperty('overflow-y', 'visible', 'important');
    nav.style.setProperty('transform', 'none', 'important');
    nav.style.setProperty('margin', '2px 0 0', 'important');

    nav.querySelectorAll('.tab').forEach(function (button) {
      button.style.setProperty('display', 'flex', 'important');
      button.style.setProperty('align-items', 'center', 'important');
      button.style.setProperty('justify-content', 'center', 'important');
      button.style.setProperty('width', '100%', 'important');
      button.style.setProperty('min-width', '0', 'important');
      button.style.setProperty('max-width', 'none', 'important');
      button.style.setProperty('min-height', '42px', 'important');
      button.style.setProperty('white-space', 'normal', 'important');
      button.style.setProperty('text-align', 'center', 'important');
      button.style.setProperty('transform', 'none', 'important');
    });

    const topbar = document.querySelector('.topbar');
    if (topbar) {
      topbar.style.setProperty('height', 'auto', 'important');
      topbar.style.setProperty('max-height', 'none', 'important');
      topbar.style.setProperty('overflow', 'visible', 'important');
    }
  }

  async function restoreBusValues() {
    try {
      if (state && state.token && typeof refreshBus === 'function') await refreshBus();
    } catch (_) {}
  }

  applyMenuFix();
  window.addEventListener('resize', applyMenuFix);

  if (typeof showView === 'function') {
    const oldShowView = showView;
    showView = async function (id) {
      await oldShowView(id);
      applyMenuFix();
      if (id === 'viewBus') await restoreBusValues();
    };
  }

  let n = 0;
  const timer = setInterval(function () {
    applyMenuFix();
    n += 1;
    if (n >= 40) clearInterval(timer);
  }, 250);

  setTimeout(function () {
    applyMenuFix();
    if (state && state.activeView === 'viewBus') restoreBusValues();
  }, 200);
})();
