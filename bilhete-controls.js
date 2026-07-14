'use strict';

(function () {
  function moneyDisplay(value) {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    return money(value);
  }

  function closestField(id) {
    const element = document.getElementById(id);
    return element ? element.closest('div') : null;
  }

  function prepareBusControls() {
    const view = document.getElementById('viewBus');
    if (!view) return;

    const grid = view.querySelector('.grid');
    if (!grid) return;

    grid.classList.add('bus-compact-controls');

    const fare = closestField('busFare');
    if (fare) {
      fare.remove();
    }

    const balance = closestField('busBalance');
    const quantity = closestField('busQuantity');
    const registerUse = closestField('registerUse');
    const recharge = closestField('busRecharge');
    const registerRecharge = closestField('registerRecharge');

    if (balance) balance.classList.add('bus-balance-field');
    if (quantity) quantity.classList.add('bus-quantity-field');
    if (registerUse) registerUse.classList.add('bus-use-action');
    if (recharge) recharge.classList.add('bus-recharge-field');
    if (registerRecharge) {
      registerRecharge.classList.add('bus-recharge-action');
    }

    ['busStart', 'busEnd', 'loadBus'].forEach(function (id) {
      const field = closestField(id);
      if (field) field.classList.add('bus-hidden-control');
    });
  }

  function ensureFidelityBalance() {
    const view = document.getElementById('viewFidelity');
    if (!view) return null;

    const panel = view.querySelector('.fidelity-panel');
    if (!panel) return null;

    panel.classList.add('fidelity-compact-controls');

    let input = document.getElementById('fidelityBalance');

    if (!input) {
      const field = document.createElement('div');
      field.className = 'fidelity-field fidelity-balance-field';

      const label = document.createElement('label');
      label.htmlFor = 'fidelityBalance';
      label.textContent = 'Saldo';

      input = document.createElement('input');
      input.id = 'fidelityBalance';
      input.disabled = true;
      input.value = '—';

      field.appendChild(label);
      field.appendChild(input);
      panel.insertBefore(field, panel.firstChild);
    }

    return input;
  }

  function paintFidelityBalance(result) {
    const input = ensureFidelityBalance();
    if (!input) return;

    input.value = result && Object.prototype.hasOwnProperty.call(
      result,
      'saldo'
    )
      ? moneyDisplay(result.saldo)
      : '—';
  }

  function installCallWrapper() {
    if (
      typeof window.call !== 'function' ||
      window.call.__bilheteControlsWrapped
    ) {
      return;
    }

    const originalCall = window.call;

    async function wrappedCall(action, params, showLoading) {
      const result = await originalCall(action, params, showLoading);

      if (action === 'bfList') {
        setTimeout(function () {
          paintFidelityBalance(result);
        }, 0);
      }

      return result;
    }

    wrappedCall.__bilheteControlsWrapped = true;
    window.call = wrappedCall;
  }

  let scheduled = false;

  function schedulePrepare() {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(function () {
      scheduled = false;
      installCallWrapper();
      prepareBusControls();
      ensureFidelityBalance();
    });
  }

  function start() {
    schedulePrepare();

    document.addEventListener('click', function (event) {
      if (event.target.closest('.tab')) {
        setTimeout(schedulePrepare, 0);
      }
    });

    const observer = new MutationObserver(schedulePrepare);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();