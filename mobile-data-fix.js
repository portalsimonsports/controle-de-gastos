'use strict';

(function () {
  function hideIrrelevantStatus() {
    const busInfo = document.getElementById('busInfo');
    const fidelityStatus = document.getElementById('fidelityStatus');

    if (busInfo) {
      busInfo.hidden = true;
      busInfo.textContent = '';
    }

    if (fidelityStatus) {
      fidelityStatus.hidden = true;
      fidelityStatus.textContent = '';
    }
  }

  function updateTableHeaders() {
    ['#viewBus table', '#viewFidelity table'].forEach(function (selector) {
      const table = document.querySelector(selector);
      if (!table) return;

      const firstHeader = table.querySelector('thead th:first-child');
      if (firstHeader) firstHeader.textContent = 'Data e hora';
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

  const observer = new MutationObserver(function () {
    applyFixes();
  });

  observer.observe(document.documentElement, {
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

  applyFixes();
  setTimeout(keepActiveMenuVisible, 0);
})();