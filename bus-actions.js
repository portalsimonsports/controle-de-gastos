'use strict';

(function () {
  let selectedUse = null;
  let lastFocusedElement = null;

  function canWrite() {
    return state.role === 'admin' || state.role === 'editor';
  }

  function createActionButton(text, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.className = className;
    button.addEventListener('click', handler);
    return button;
  }

  function prepareBusTable(showActions) {
    const table = document.querySelector('#viewBus table');
    if (!table) return;

    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;

    let actionHeader = headerRow.querySelector(
      '[data-bus-actions-header]'
    );

    if (showActions && !actionHeader) {
      actionHeader = document.createElement('th');
      actionHeader.textContent = 'Ações';
      actionHeader.className = 'right';
      actionHeader.dataset.busActionsHeader = '1';
      headerRow.appendChild(actionHeader);
    }

    if (!showActions && actionHeader) {
      actionHeader.remove();
    }
  }

  function renderBusRows(result) {
    const body = document.getElementById('busBody');
    const showActions =
      canWrite() && result.permiteEdicao !== false;

    prepareBusTable(showActions);
    body.innerHTML = '';

    const rows = Array.isArray(result.rows)
      ? result.rows
      : [];

    if (!rows.length) {
      emptyRow(body, showActions ? 5 : 4);
      return;
    }

    rows.forEach(function (item) {
      const row = document.createElement('tr');

      appendCell(row, item.data);
      appendCell(row, item.hora || '');
      appendCell(row, item.tipo);
      appendCell(row, money(item.valor), 'right');

      if (showActions) {
        const cell = document.createElement('td');
        cell.className = 'right';

        if (
          item.registro === 'uso' &&
          item.editavel !== false
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

          cell.appendChild(actions);
        } else {
          cell.textContent = '—';
        }

        row.appendChild(cell);
      }

      body.appendChild(row);
    });
  }

  async function enhancedLoadBus() {
    const start = document.getElementById('busStart').value;
    const end = document.getElementById('busEnd').value;

    if (!start || !end) {
      toast('Informe o período.', 'error');
      return;
    }

    const button = document.getElementById('loadBus');
    const originalText = button ? button.textContent : '';

    if (button) {
      button.disabled = true;
      button.textContent = 'Carregando...';
    }

    try {
      const result = await call(
        'buList',
        {
          token: state.token,
          inicio: start,
          fim: end
        },
        false
      );

      paintBus(result);
      renderBusRows(result);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  async function enhancedRegisterUse() {
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
      await refreshBus();
      await enhancedLoadBus();
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
      '<p class="bus-modal-description" id="busEditDescription"></p>',
      '<div class="bus-modal-details">',
      '<div><span>Linha</span><strong id="busEditLine">—</strong></div>',
      '<div><span>Data</span><strong id="busEditDate">—</strong></div>',
      '<div><span>Tipo</span><strong id="busEditType">—</strong></div>',
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

    document.getElementById('busEditDescription').textContent =
      'Altere somente a quantidade registrada na coluna C.';

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

    if (
      lastFocusedElement &&
      typeof lastFocusedElement.focus === 'function'
    ) {
      lastFocusedElement.focus();
    }

    lastFocusedElement = null;
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
      await refreshBus();
      await enhancedLoadBus();
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
      'Esta ação limpará somente a quantidade da coluna C.',
      '</p>',
      '<div class="bus-modal-details">',
      '<div><span>Linha</span><strong id="busDeleteLine">—</strong></div>',
      '<div><span>Data</span><strong id="busDeleteDate">—</strong></div>',
      '<div><span>Quantidade</span><strong id="busDeleteQuantity">—</strong></div>',
      '<div class="bus-modal-detail-wide">',
      '<span>Tipo</span><strong id="busDeleteType">—</strong>',
      '</div>',
      '</div>',
      '<p class="bus-modal-warning">',
      'As fórmulas e a formatação da linha serão preservadas.',
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

    if (
      lastFocusedElement &&
      typeof lastFocusedElement.focus === 'function'
    ) {
      lastFocusedElement.focus();
    }

    lastFocusedElement = null;
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
      await refreshBus();
      await enhancedLoadBus();
    } catch (error) {
      button.disabled = false;
      button.textContent = originalText;
      toast(error.message, 'error');
    }
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

  const loadButton = document.getElementById('loadBus');

  if (loadButton) {
    loadButton.addEventListener(
      'click',
      function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        enhancedLoadBus();
      },
      true
    );
  }

  const useButton = document.getElementById('registerUse');

  if (useButton) {
    useButton.addEventListener(
      'click',
      function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        enhancedRegisterUse();
      },
      true
    );
  }

  const originalShowView = showView;

  showView = async function (id) {
    await originalShowView(id);

    if (id === 'viewBus') {
      await enhancedLoadBus();
    }
  };

  ensureBusEditModal();
  ensureBusDeleteModal();

  if (state.token && state.activeView === 'viewBus') {
    setTimeout(enhancedLoadBus, 0);
  }
})();
