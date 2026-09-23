'use strict';

(function () {
  const moneyFormatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function el() {
    return document.getElementById('refundValue');
  }

  function formatNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? moneyFormatter.format(number) : '0,00';
  }

  function parseDisplayed(value) {
    const digits = String(value == null ? '' : value).replace(/\D/g, '');
    return digits ? Number(digits) / 100 : 0;
  }

  function formatInput(input) {
    if (!input) return;
    const value = parseDisplayed(input.value);
    input.value = formatNumber(value);
    input.dataset.refundNumericValue = value.toFixed(2);
  }

  function install() {
    const input = el();
    if (!input) return;

    if (input.dataset.moneyPtbrInstalled !== '1') {
      input.dataset.moneyPtbrInstalled = '1';
      input.type = 'text';
      input.inputMode = 'numeric';
      input.autocomplete = 'off';
      input.placeholder = '0,00';

      input.addEventListener('input', function () {
        formatInput(input);
      });

      input.addEventListener('focus', function () {
        setTimeout(function () {
          try { input.select(); } catch (_) {}
        }, 0);
      });

      input.addEventListener('blur', function () {
        formatInput(input);
      });
    }

    if (input.value && !/,\d{2}$/.test(input.value)) {
      const numeric = Number(String(input.value).replace(',', '.'));
      if (Number.isFinite(numeric)) {
        input.value = formatNumber(numeric);
        input.dataset.refundNumericValue = numeric.toFixed(2);
      }
    }
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest('#refundBody button');
    if (!button) return;

    setTimeout(function () {
      install();
      const input = el();
      if (!input) return;

      const raw = String(input.value || '').trim();
      const direct = Number(raw.replace(',', '.'));
      if (Number.isFinite(direct)) {
        input.value = formatNumber(direct);
        input.dataset.refundNumericValue = direct.toFixed(2);
      }
    }, 0);
  }, true);

  const observer = new MutationObserver(function () {
    install();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  install();
  setInterval(install, 1200);
})();
