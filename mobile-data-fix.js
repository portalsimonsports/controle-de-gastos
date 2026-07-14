'use strict';

(function () {
  let updateQueued = false;

  function hideIrrelevantStatus() {
    const busInfo = document.getElementById('busInfo');
    const fidelityStatus = document.getElementById('fidelityStatus');

    if (busInfo) {
      if (!busInfo.hidden) busInfo.hidden = true;
      if (busInfo.textContent) busInfo.textContent = '';
    }

    if (fidelityStatus) {
      if (!fidelityStatus.hidden) fidelityStatus.hidden = true;
      if (fidelityStatus.textContent) fidelityStatus.textContent = '';
    }
  }

  function updateTableHeaders() {
    ['#viewBus table', '#viewFidelity table'].forEach(function (selector) {
      const table = document.querySelector(selector);
      if (!table) return;

      const firstHeader = table.querySelector('thead th:first-child');
      if (
        firstHeader &&
        firstHeader.textContent !== 'Data e hora'
      ) {
        firstHeader.textContent = 'Data e hora';
      }
    });
  }

  function keepActiveMenuVisible() {
    const active = document.querySelector('.tabs .tab.active');
    if (!active) return;

    active.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth'
    });
  }

  function applyFixes() {
    hideIrrelevantStatus();
    updateTableHeaders();
  }

  function queueFixes() {
    if (updateQueued) return;
    updateQueued = true;

    requestAnimationFrame(function () {
      updateQueued = false;
      applyFixes();
    });
  }

  function start() {
    applyFixes();
    setTimeout(keepActiveMenuVisible, 0);

    const observer = new MutationObserver(queueFixes);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    document.addEventListener('click', function (event) {
      if (event.target.closest('.tab')) {
        setTimeout(function () {
          applyFixes();
          keepActiveMenuVisible();
        }, 0);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {
      once: true
    });
  } else {
    start();
  }
})();