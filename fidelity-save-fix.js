'use strict';

(function () {
  if (window.__cgFidelitySaveFixApplied) return;
  window.__cgFidelitySaveFixApplied = true;

  function element(id) {
    return document.getElementById(id);
  }

  function stopOriginal(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function newRequestId(prefix) {
    const uuid =
      window.crypto && typeof window.crypto.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : String(Date.now()) + '-' + Math.random().toString(36).slice(2);

    return prefix + '-' + uuid;
  }

  function requestIdFor(button, payloadKey, prefix) {
    const previousPayload = button.dataset.cgPendingPayload || '';
    let requestId = button.dataset.cgPendingRequestId || '';

    if (!requestId || previousPayload !== payloadKey) {
      requestId = newRequestId(prefix);
      button.dataset.cgPendingRequestId = requestId;
      button.dataset.cgPendingPayload = payloadKey;
    }

    return requestId;
  }

  function clearPending(button) {
    delete button.dataset.cgPendingRequestId;
    delete button.dataset.cgPendingPayload;
  }

  function refreshFidelitySilently() {
    if (typeof showView !== 'function') return;

    const originalToast = window.toast;

    if (typeof originalToast === 'function') {
      window.toast = function (message, type) {
        if (type === 'error') {
          console.warn('Atualização silenciosa do Bilhete Fidelidade:', message);
          return;
        }

        return originalToast(message, type);
      };
    }

    Promise.resolve(showView('viewFidelity'))
      .catch(function (error) {
        console.warn('Falha ao atualizar Bilhete Fidelidade:', error);
      })
      .finally(function () {
        if (typeof originalToast === 'function') {
          window.toast = originalToast;
        }
      });
  }

  async function registerUseSafe(event) {
    stopOriginal(event);

    const button = element('registerFidelityUse');
    const input = element('fidelityQuantity');

    if (!button || !input) return;
    if (button.dataset.cgSubmitting === '1') return;

    const raw = String(input.value || '').trim();

    if (!/^\d+$/.test(raw)) {
      toast('Informe uma quantidade inteira igual ou maior que zero.', 'error');
      return;
    }

    const quantity = Number(raw);

    if (quantity < 0 || quantity > 999) {
      toast('A quantidade deve estar entre 0 e 999.', 'error');
      return;
    }

    const requestId = requestIdFor(button, raw, 'bf-use');
    const originalText = button.textContent;

    button.dataset.cgSubmitting = '1';
    button.disabled = true;
    button.textContent = 'Registrando...';

    try {
      const result = await call(
        'bfUse',
        {
          token: state.token,
          qtd: quantity,
          requestId: requestId
        },
        false
      );

      input.value = '';
      clearPending(button);

      toast(
        result.duplicadoIgnorado
          ? 'Este lançamento já havia sido gravado. Nenhuma duplicação foi criada.'
          : (result.msg || 'Passagens registradas.')
      );

      setTimeout(refreshFidelitySilently, 0);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      delete button.dataset.cgSubmitting;
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  async function registerRechargeSafe(event) {
    stopOriginal(event);

    const button = element('registerFidelityRecharge');
    const input = element('fidelityRecharge');

    if (!button || !input) return;
    if (button.dataset.cgSubmitting === '1') return;

    const raw = String(input.value || '')
      .replace(/R\$/gi, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

    const value = Number(raw);

    if (!Number.isFinite(value) || value <= 0) {
      toast('Informe um valor de recarga válido.', 'error');
      return;
    }

    const payloadKey = value.toFixed(2);
    const requestId = requestIdFor(button, payloadKey, 'bf-recharge');
    const originalText = button.textContent;

    button.dataset.cgSubmitting = '1';
    button.disabled = true;
    button.textContent = 'Registrando...';

    try {
      const result = await call(
        'bfRecharge',
        {
          token: state.token,
          valor: value,
          requestId: requestId
        },
        false
      );

      input.value = '';
      clearPending(button);

      toast(
        result.duplicadoIgnorado
          ? 'Esta recarga já havia sido gravada. Nenhuma duplicação foi criada.'
          : (result.msg || 'Recarga registrada.')
      );

      setTimeout(refreshFidelitySilently, 0);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      delete button.dataset.cgSubmitting;
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function clearUseField(event) {
    stopOriginal(event);

    const input = element('fidelityQuantity');
    const button = element('registerFidelityUse');

    if (input) input.value = '';
    if (button) clearPending(button);
  }

  function bind() {
    const useButton = element('registerFidelityUse');
    const rechargeButton = element('registerFidelityRecharge');
    const clearButton = element('clearFidelityUse');

    if (useButton && useButton.dataset.cgSafeBound !== '1') {
      useButton.dataset.cgSafeBound = '1';
      useButton.addEventListener('click', registerUseSafe, true);
    }

    if (rechargeButton && rechargeButton.dataset.cgSafeBound !== '1') {
      rechargeButton.dataset.cgSafeBound = '1';
      rechargeButton.addEventListener('click', registerRechargeSafe, true);
    }

    if (clearButton && clearButton.dataset.cgSafeBound !== '1') {
      clearButton.dataset.cgSafeBound = '1';
      clearButton.addEventListener('click', clearUseField, true);
    }
  }

  bind();

  const observer = new MutationObserver(bind);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
