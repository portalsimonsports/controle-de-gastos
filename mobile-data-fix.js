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
    keepActiveMenuVisible();
  }

  document.addEventListener('click', function (event) {
    if (event.target.closest('.tab')) {
      setTimeout(applyFixes, 0);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFixes, {
      once: true
    });
  } else {
    applyFixes();
  }
})();
