'use strict';

(function () {
  function ensurePeriodBadge() {
    const label = document.querySelector(
      'label[for="cardMonth"]'
    );

    if (!label) return null;

    label.classList.add('card-month-label');

    let badge = document.getElementById(
      'cardSummaryPeriod'
    );

    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'cardSummaryPeriod';
      badge.className = 'card-summary-period';
      badge.hidden = true;
      badge.setAttribute('aria-live', 'polite');
      label.appendChild(badge);
    }

    return badge;
  }

  function updatePeriodBadge(result) {
    const badge = ensurePeriodBadge();

    if (!badge) return;

    const period = String(
      result && result.periodoLabel
        ? result.periodoLabel
        : ''
    ).trim();

    if (!period) {
      badge.textContent = '';
      badge.hidden = true;
      return;
    }

    badge.textContent = 'Período: ' + period;
    badge.hidden = false;
  }

  const originalCall = window.call;

  if (
    typeof originalCall === 'function' &&
    !originalCall.__cardPeriodWrapped
  ) {
    const wrappedCall = async function (
      action,
      params,
      showLoading
    ) {
      const result = await originalCall(
        action,
        params,
        showLoading
      );

      if (action === 'getResumoCartao') {
        updatePeriodBadge(result);
      }

      return result;
    };

    wrappedCall.__cardPeriodWrapped = true;
    window.call = wrappedCall;
  }

  ensurePeriodBadge();
})();
