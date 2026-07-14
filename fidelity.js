'use strict';

(function () {
  const VIEW_ID = 'viewFidelity';

  function canWrite() {
    return state.role === 'admin' || state.role === 'editor';
  }

  function ensureTab() {
    if (!tabs.some(function (tab) { return tab.id === VIEW_ID; })) {
      tabs.push({
        id: VIEW_ID,
        label: 'Bilhete Fidelidade',
        roles: ['admin', 'editor', 'viewer']
      });
    }
  }

  function ensureView() {
    const privateView = document.getElementById('privateView');
    if (!privateView) return null;

    let view = document.getElementById(VIEW_ID);

    if (!view) {
      view = document.createElement('article');
      view.className = 'card view';
      view.id = VIEW_ID;
      view.hidden = true;

      view.innerHTML = [
        '<h3>Bilhete Fidelidade</h3>',
        '<div class="fidelity-panel">',
        '<div class="fidelity-field">',
        '<label for="fidelityQuantity">Quantidade de passagens</label>',
        '<input type="number" min="0" max="999" step="1" ',
        'value="1" id="fidelityQuantity" inputmode="numeric">',
        '</div>',
        '<div class="fidelity-actions">',
        '<button type="button" class="btn" ',
        'id="registerFidelityUse">Registrar passagens</button>',
        '<button type="button" class="btn ghost" ',
        'id="clearFidelityUse">Limpar</button>',
        '</div>',
        '</div>',
        '<div class="fidelity-status" id="fidelityStatus">',
        'Carregando informações…',
        '</div>'
      ].join('');

      privateView.appendChild(view);

      document
        .getElementById('registerFidelityUse')
        .addEventListener('click', registerFidelityUse);

      document
        .getElementById('clearFidelityUse')
        .addEventListener('click', function () {
          document.getElementById('fidelityQuantity').value = '1';
        });
    }

    return view;
  }

  function adjustBilheteUnicoQuantity() {
    const input = document.getElementById('busQuantity');
    if (!input) return;

    input.min = '0';
    input.max = '999';
    input.step = '1';

    if (input.value === '') {
      input.value = '1';
    }

    const label = document.querySelector(
      'label[for="busQuantity"]'
    );

    if (label) {
      label.textContent = 'Quantidade de passagens';
    }
  }

  function paintFidelityInfo(result) {
    const status = document.getElementById('fidelityStatus');
    if (!status) return;

    const last = result && result.ultimo
      ? result.ultimo
      : null;

    const total = Number(
      result && result.totalRegistros
        ? result.totalRegistros
        : 0
    );

    if (!last) {
      status.innerHTML = [
        '<strong>Nenhum lançamento localizado.</strong>',
        '<span>O primeiro registro será inserido na primeira célula vazia da coluna C.</span>'
      ].join('');
      return;
    }

    status.innerHTML = [
      '<strong>Último lançamento:</strong>',
      '<span>',
      String(last.quantidade),
      ' passagem(ns) • linha ',
      String(last.linha),
      ' • ',
      String(total),
      ' registro(s)',
      '</span>'
    ].join('');
  }

  async function refreshFidelity() {
    const view = ensureView();
    if (!view) return;

    const button = document.getElementById('registerFidelityUse');
    const quantity = document.getElementById('fidelityQuantity');

    if (button) button.hidden = !canWrite();
    if (quantity) quantity.disabled = !canWrite();

    try {
      const result = await call(
        'bfInfo',
        { token: state.token },
        false
      );

      paintFidelityInfo(result);
    } catch (error) {
      const status = document.getElementById('fidelityStatus');
      if (status) status.textContent = error.message;
      toast(error.message, 'error');
    }
  }

  async function registerFidelityUse() {
    const input = document.getElementById('fidelityQuantity');
    const raw = String(input.value || '').trim();

    if (!/^\d+$/.test(raw)) {
      toast(
        'Informe uma quantidade inteira igual ou maior que zero.',
        'error'
      );
      return;
    }

    const quantity = Number(raw);

    if (quantity < 0 || quantity > 999) {
      toast('A quantidade deve estar entre 0 e 999.', 'error');
      return;
    }

    const button = document.getElementById('registerFidelityUse');
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = 'Registrando...';

    try {
      const result = await call(
        'bfUse',
        {
          token: state.token,
          qtd: quantity
        },
        false
      );

      toast(result.msg || 'Passagens registradas.');
      input.value = '1';
      await refreshFidelity();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  ensureTab();
  ensureView();
  adjustBilheteUnicoQuantity();

  const originalShowView = showView;

  showView = async function (id) {
    await originalShowView(id);

    if (id === VIEW_ID) {
      await refreshFidelity();
    }
  };

  if (state.token) {
    renderTabs();
  }

  if (state.token && state.activeView === VIEW_ID) {
    setTimeout(refreshFidelity, 0);
  }
})();
