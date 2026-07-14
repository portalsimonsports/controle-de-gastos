'use strict';

(function () {
  let selectedUse = null;
  let lastFocusedElement = null;

  function canWrite() {
    return state.role === 'admin' || state.role === 'editor';
  }

  function moneyOrDash(value) {
    return value === null || value === undefined || value === ''
      ? '—'
      : money(value);
  }

  function createActionButton(text, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.className = className;
    button.addEventListener('click', handler);
    return button;
  }

  function prepareBusView() {
    const quantity = document.getElementById('busQuantity');

    if (quantity) {
      quantity.min = '0';
      quantity.max = '999';
      quantity.step = '1';

      if (quantity.value === '') {
        quantity.value = '1';
      }
    }

    const quantityLabel = document.querySelector(
      'label[for="busQuantity"]'
    );

    if (quantityLabel) {
      quantityLabel.textContent = 'Quantidade de passagens';
    }

    ['busStart', 'busEnd', 'loadBus'].forEach(function (id) {
      const element = document.getElementById(id);

      if (element && element.closest('.col-3')) {
        element.closest('.col-3').hidden = true;
      }
    });

    const table = document.querySelector('#viewBus table');

    if (!table) return;

    const wrap = table.closest('.table-wrap');

    if (
      wrap &&
      !document.getElementById('busHistoryTitle')
    ) {
      const title = document.createElement('h4');
      title.id = 'busHistoryTitle';
      title.className = 'passage-history-title';
      title.textContent = 'Últimos 10 lançamentos';
      wrap.parentNode.insertBefore(title, wrap);
    }

    const headerRow = table.querySelector('thead tr');

    if (headerRow) {
      headerRow.innerHTML = [
        '<th>Data</th>',
        '<th>Tipo</th>',
        '<th class="right">Quantidade</th>',
        '<th class="right">Valor unitário</th>',
        '<th class="right">Recarga</th>',
        '<th class="right">Ações</th>'
      ].join('');
    }
  }

  function renderBusRows(result) {
    const body = document.getElementById('busBody');
    const rows = Array.isArray(result.rows)
      ? result.rows
      : [];

    body.innerHTML = '';

    if (!rows.length) {
      emptyRow(
        body,
        6,
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

      const actionCell = document.createElement('td');
      actionCell.className = 'right';

      if (
        canWrite() &&
        result.permiteEdicao !== false &&
        item.editavel !== false &&
        item.quantidade !== null &&
        item.quantidade !== undefined
      ) {
        const actions = document.createElement('div');
        actions.className = 'bus-row-actions';

        actions.appendChild(
          createActionButton(
            'Editar',
            'btn-mini btn-edit',
            function () {
              openBusEdit(item);
            }
          )
        );

        actions.appendChild(
          createActionButton(
            'Excluir',
            'btn-mini btn-delete',
            function () {
              openBusDelete(item);
            }
          )
        );

        actionCell.appendChild(actions);
      } else {
        actionCell.textContent = '—';
      }

      row.appendChild(actionCell);
      body.appendChild(row);
    });
  }

  function paintBusHistoryInfo(result) {
    const info = document.getElementById('busInfo');

    if (!info) return;

    const visible = Array.isArray(result.rows)
      ? result.rows.length
      : 0;

    const total = Number(result.totalRegistros || 0);

    info.textContent =
      'Exibindo ' +
      visible +
      ' dos ' +
      total +
      ' lançamento(s) mais recentes, em ordem crescente.';
  }

  async function loadLastTenBus() {
    prepareBusView();

    try {
      const result = await call(
        'buList',
        { token: state.token },
        false
      );

      if (typeof paintBus === 'function') {
        paintBus(result);
      }

      renderBusRows(result);
      paintBusHistoryInfo(result);
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function registerBusUse() {
    const input = document.getElementById('busQuantity');
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

    const button = document.getElementById('registerUse');
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = 'Registrando...';

    try {
      const result = await call(
        'buUse',
        {
          token: state.token,
          qtd: quantity
        },
        false
      );

      toast(result.msg || 'Passagens registradas.');
      input.value = '1';
      await loadLastTenBus();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  async function registerBusRecharge() {
    const input = document.getElementById('busRecharge');
    const value = Number(
      String(input.value || '').replace(',', '.')
    );

    if (!Number.isFinite(value) || value <= 0) {
      toast('Informe um valor de recarga válido.', 'error');
      return;
    }

    const button = document.getElementById('registerRecharge');
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = 'Registrando...';

    try {
      const result = await call(
        'buRecharge',
        {
          token: state.token,
          valor: value
        },
        false
      );

      toast(result.msg || 'Recarga registrada.');
      input.value = '';
      await loadLastTenBus();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function ensureBusEditModal() {
    let overlay = document.getElementById('busEditOverlay');

    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'busEditOverlay';
    overlay.className = 'bus-modal-overlay';
    overlay.hidden = true;

    overlay.innerHTML = [
      '<section class="bus-modal" role="dialog" ',
      'aria-modal="true" aria-labelledby="busEditTitle">',
      '<button type="button" class="bus-modal-close" ',
      'id="busEditClose" aria-label="Fechar">×</button>',
      '<p class="bus-modal-eyebrow">Bilhete Único</p>',
      '<h3 id="busEditTitle">Editar passagens</h3>',
      '<p class="bus-modal-description">',
      'Altere somente a quantidade registrada na coluna C.',
      '</p>',
      '<div class="bus-modal-details">',
      '<div><span>Linha</span><strong id="busEditLine">—</strong></div>',
      '<div><span>Data</span><strong id="busEditDate">—</strong></div>',
      '<div class="bus-modal-detail-wide">',
      '<span>Tipo</span><strong id="busEditType">—</strong>',
      '</div>',
      '</div>',
      '<label for="busEditQuantity">Quantidade de passagens</label>',
      '<input type="number" min="0" max="999" step="1" ',
      'id="busEditQuantity" inputmode="numeric">',
      '<div class="bus-modal-actions">',
      '<button type="button" class="btn ghost" ',
      'id="busEditCancel">Cancelar</button>',
      '<button type="button" class="btn" ',
      'id="busEditSave">Salvar alteração</button>',
      '</div>',
      '</section>'
    ].join('');

    document.body.appendChild(overlay);

    document
      .getElementById('busEditClose')
      .addEventListener('click', closeBusEdit);

    document
      .getElementById('busEditCancel')
      .addEventListener('click', closeBusEdit);

    document
      .getElementById('busEditSave')
      .addEventListener('click', saveBusEdit);

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeBusEdit();
      }
    });

    return overlay;
  }

  function openBusEdit(item) {
    selectedUse = item;
    lastFocusedElement = document.activeElement;

    const overlay = ensureBusEditModal();

    document.getElementById('busEditLine').textContent =
      String(item.linha || '—');

    document.getElementById('busEditDate').textContent =
      item.data || '—';

    document.getElementById('busEditType').textContent =
      item.tipo || '—';

    document.getElementById('busEditQuantity').value =
      String(item.quantidade ?? 0);

    overlay.hidden = false;

    requestAnimationFrame(function () {
      const input = document.getElementById('busEditQuantity');
      input.focus();
      input.select();
    });
  }

  function closeBusEdit() {
    const overlay = document.getElementById('busEditOverlay');

    if (overlay) {
      overlay.hidden = true;
    }

    selectedUse = null;
    restoreFocus();
  }

  async function saveBusEdit() {
    if (!selectedUse || !selectedUse.linha) return;

    const input = document.getElementById('busEditQuantity');
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

    const button = document.getElementById('busEditSave');
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = 'Salvando...';

    try {
      const result = await call(
        'buUpdateUse',
        {
          token: state.token,
          linha: selectedUse.linha,
          qtd: quantity
        },
        false
      );

      closeBusEdit();
      toast(result.msg || 'Registro atualizado.');
      await loadLastTenBus();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function ensureBusDeleteModal() {
    let overlay = document.getElementById('busDeleteOverlay');

    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'busDeleteOverlay';
    overlay.className = 'bus-modal-overlay';
    overlay.hidden = true;

    overlay.innerHTML = [
      '<section class="bus-modal bus-modal-danger" ',
      'role="alertdialog" aria-modal="true" ',
      'aria-labelledby="busDeleteTitle">',
      '<button type="button" class="bus-modal-close" ',
      'id="busDeleteClose" aria-label="Fechar">×</button>',
      '<p class="bus-modal-eyebrow">Confirmação necessária</p>',
      '<h3 id="busDeleteTitle">Excluir registro de passagens?</h3>',
      '<p class="bus-modal-description">',
      'Será apagada somente a quantidade da coluna C.',
      '</p>',
      '<div class="bus-modal-details">',
      '<div><span>Linha</span><strong id="busDeleteLine">—</strong></div>',
      '<div><span>Data</span><strong id="busDeleteDate">—</strong></div>',
      '<div><span>Quantidade</span>',
      '<strong id="busDeleteQuantity">—</strong></div>',
      '<div class="bus-modal-detail-wide">',
      '<span>Tipo</span><strong id="busDeleteType">—</strong>',
      '</div>',
      '</div>',
      '<p class="bus-modal-warning">',
      'As fórmulas, a formatação e eventual recarga da coluna G ',
      'serão preservadas.',
      '</p>',
      '<div class="bus-modal-actions">',
      '<button type="button" class="btn ghost" ',
      'id="busDeleteCancel">Cancelar</button>',
      '<button type="button" class="bus-danger-button" ',
      'id="busDeleteConfirm">Excluir registro</button>',
      '</div>',
      '</section>'
    ].join('');

    document.body.appendChild(overlay);

    document
      .getElementById('busDeleteClose')
      .addEventListener('click', closeBusDelete);

    document
      .getElementById('busDeleteCancel')
      .addEventListener('click', closeBusDelete);

    document
      .getElementById('busDeleteConfirm')
      .addEventListener('click', confirmBusDelete);

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeBusDelete();
      }
    });

    return overlay;
  }

  function openBusDelete(item) {
    selectedUse = item;
    lastFocusedElement = document.activeElement;

    const overlay = ensureBusDeleteModal();

    document.getElementById('busDeleteLine').textContent =
      String(item.linha || '—');

    document.getElementById('busDeleteDate').textContent =
      item.data || '—';

    document.getElementById('busDeleteQuantity').textContent =
      String(item.quantidade ?? 0);

    document.getElementById('busDeleteType').textContent =
      item.tipo || '—';

    const button = document.getElementById('busDeleteConfirm');
    button.disabled = false;
    button.textContent = 'Excluir registro';

    overlay.hidden = false;

    requestAnimationFrame(function () {
      document.getElementById('busDeleteCancel').focus();
    });
  }

  function closeBusDelete() {
    const overlay = document.getElementById('busDeleteOverlay');

    if (overlay) {
      overlay.hidden = true;
    }

    selectedUse = null;
    restoreFocus();
  }

  async function confirmBusDelete() {
    if (!selectedUse || !selectedUse.linha) return;

    const button = document.getElementById('busDeleteConfirm');
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = 'Excluindo...';

    try {
      const result = await call(
        'buDeleteUse',
        {
          token: state.token,
          linha: selectedUse.linha
        },
        false
      );

      closeBusDelete();
      toast(result.msg || 'Registro excluído.');
      await loadLastTenBus();
    } catch (error) {
      button.disabled = false;
      button.textContent = originalText;
      toast(error.message, 'error');
    }
  }

  function restoreFocus() {
    if (
      lastFocusedElement &&
      typeof lastFocusedElement.focus === 'function'
    ) {
      lastFocusedElement.focus();
    }

    lastFocusedElement = null;
  }

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;

    const editOverlay = document.getElementById('busEditOverlay');
    const deleteOverlay = document.getElementById('busDeleteOverlay');

    if (editOverlay && !editOverlay.hidden) {
      closeBusEdit();
    }

    if (deleteOverlay && !deleteOverlay.hidden) {
      closeBusDelete();
    }
  });

  const useButton = document.getElementById('registerUse');

  if (useButton) {
    useButton.addEventListener(
      'click',
      function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        registerBusUse();
      },
      true
    );
  }

  const rechargeButton = document.getElementById(
    'registerRecharge'
  );

  if (rechargeButton) {
    rechargeButton.addEventListener(
      'click',
      function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        registerBusRecharge();
      },
      true
    );
  }

  const originalShowView = showView;

  showView = async function (id) {
    await originalShowView(id);

    if (id === 'viewBus') {
      await loadLastTenBus();
    }
  };

  prepareBusView();
  ensureBusEditModal();
  ensureBusDeleteModal();

  if (state.token && state.activeView === 'viewBus') {
    setTimeout(loadLastTenBus, 0);
  }
})();
