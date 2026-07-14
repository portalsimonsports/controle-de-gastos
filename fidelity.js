'use strict';

(function () {
  const VIEW_ID = 'viewFidelity';

  function canWrite() {
    return state.role === 'admin' || state.role === 'editor';
  }

  function moneyOrDash(value) {
    return value === null || value === undefined || value === ''
      ? '—'
      : money(value);
  }

  function ensureTab() {
    if (!tabs.some(function (tab) {
      return tab.id === VIEW_ID;
    })) {
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
        '<div class="fidelity-field">',
        '<label for="fidelityRecharge">Valor da recarga</label>',
        '<input type="number" min="0.01" step="0.01" ',
        'id="fidelityRecharge" inputmode="decimal">',
        '</div>',
        '<div class="fidelity-actions">',
        '<button type="button" class="btn primary" ',
        'id="registerFidelityRecharge">Registrar recarga</button>',
        '</div>',
        '</div>',
        '<div class="fidelity-status" id="fidelityStatus">',
        'Carregando lançamentos…',
        '</div>',
        '<h4 class="passage-history-title">',
        'Últimos 10 lançamentos',
        '</h4>',
        '<div class="table-wrap">',
        '<table>',
        '<thead><tr>',
        '<th>Data</th>',
        '<th>Tipo</th>',
        '<th class="right">Quantidade</th>',
        '<th class="right">Valor unitário</th>',
        '<th class="right">Recarga</th>',
        '</tr></thead>',
        '<tbody id="fidelityHistoryBody"></tbody>',
        '</table>',
        '</div>'
      ].join('');

      privateView.appendChild(view);

      document
        .getElementById('registerFidelityUse')
        .addEventListener('click', registerFidelityUse);

      document
        .getElementById('clearFidelityUse')
        .addEventListener('click', function () {
          document.getElementById(
            'fidelityQuantity'
          ).value = '1';
        });

      document
        .getElementById('registerFidelityRecharge')
        .addEventListener('click', registerFidelityRecharge);
    }

    return view;
  }

  function renderHistory(result) {
    const body = document.getElementById(
      'fidelityHistoryBody'
    );

    const rows = Array.isArray(result.rows)
      ? result.rows
      : [];

    body.innerHTML = '';

    if (!rows.length) {
      emptyRow(
        body,
        5,
        'Nenhum lançamento localizado.'
      );
      return;
    }

    rows.forEach(function (item) {
      const row = document.createElement('tr');

      appendCell(row, item.data || '—');
      appendCell(row, item.tipo || '—');
      appendCell(
        row,
        item.quantidade === null ||
        item.quantidade === undefined
          ? '—'
          : String(item.quantidade),
        'right'
      );
      appendCell(
        row,
        moneyOrDash(item.valorUnitario),
        'right'
      );
      appendCell(
        row,
        moneyOrDash(item.recarga),
        'right'
      );

      body.appendChild(row);
    });
  }

  function paintStatus(result) {
    const status = document.getElementById('fidelityStatus');

    if (!status) return;

    const visible = Array.isArray(result.rows)
      ? result.rows.length
      : 0;

    const total = Number(result.totalRegistros || 0);

    status.innerHTML = [
      '<strong>Histórico atualizado:</strong>',
      '<span>',
      'Exibindo ',
      String(visible),
      ' dos ',
      String(total),
      ' lançamento(s) mais recentes, em ordem crescente.',
      '</span>'
    ].join('');
  }

  async function refreshFidelity() {
    const view = ensureView();

    if (!view) return;

    const write = canWrite();

    document.getElementById(
      'registerFidelityUse'
    ).hidden = !write;

    document.getElementById(
      'registerFidelityRecharge'
    ).hidden = !write;

    document.getElementById(
      'fidelityQuantity'
    ).disabled = !write;

    document.getElementById(
      'fidelityRecharge'
    ).disabled = !write;

    try {
      const result = await call(
        'bfList',
        { token: state.token },
        false
      );

      renderHistory(result);
      paintStatus(result);
    } catch (error) {
      const status = document.getElementById('fidelityStatus');

      if (status) {
        status.textContent = error.message;
      }

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

    const button = document.getElementById(
      'registerFidelityUse'
    );

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

  async function registerFidelityRecharge() {
    const input = document.getElementById('fidelityRecharge');
    const value = Number(
      String(input.value || '').replace(',', '.')
    );

    if (!Number.isFinite(value) || value <= 0) {
      toast('Informe um valor de recarga válido.', 'error');
      return;
    }

    const button = document.getElementById(
      'registerFidelityRecharge'
    );

    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = 'Registrando...';

    try {
      const result = await call(
        'bfRecharge',
        {
          token: state.token,
          valor: value
        },
        false
      );

      toast(result.msg || 'Recarga registrada.');
      input.value = '';
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
