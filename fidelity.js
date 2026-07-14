'use strict';

(function () {
  const VIEW_ID = 'viewFidelity';

  let selectedFidelityUse = null;
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
        '<th>Quantidade</th>',
        '<th>Valor unitário</th>',
        '<th>Recarga</th>',
        '<th>Ações</th>',
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
          : String(item.quantidade)
      );
      appendCell(
        row,
        moneyOrDash(item.valorUnitario)
      );
      appendCell(
        row,
        moneyOrDash(item.recarga)
      );

      const actionCell = document.createElement('td');

      if (
        canWrite() &&
        result.permiteEdicao !== false &&
        item.editavel !== false &&
        item.quantidade !== null &&
        item.quantidade !== undefined
      ) {
        const actions = document.createElement('div');
        actions.className =
          'bus-row-actions fidelity-row-actions';

        actions.appendChild(
          createActionButton(
            'Editar',
            'btn-mini btn-edit',
            function () {
              openFidelityEdit(item);
            }
          )
        );

        actions.appendChild(
          createActionButton(
            'Excluir',
            'btn-mini btn-delete',
            function () {
              openFidelityDelete(item);
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

  function ensureFidelityEditModal() {
    let overlay = document.getElementById(
      'fidelityEditOverlay'
    );

    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'fidelityEditOverlay';
    overlay.className = 'bus-modal-overlay';
    overlay.hidden = true;

    overlay.innerHTML = [
      '<section class="bus-modal" role="dialog" ',
      'aria-modal="true" aria-labelledby="fidelityEditTitle">',
      '<button type="button" class="bus-modal-close" ',
      'id="fidelityEditClose" aria-label="Fechar">×</button>',
      '<p class="bus-modal-eyebrow">Bilhete Fidelidade</p>',
      '<h3 id="fidelityEditTitle">Editar passagens</h3>',
      '<p class="bus-modal-description">',
      'Altere somente a quantidade registrada na coluna C.',
      '</p>',
      '<div class="bus-modal-details">',
      '<div><span>Linha</span>',
      '<strong id="fidelityEditLine">—</strong></div>',
      '<div><span>Data</span>',
      '<strong id="fidelityEditDate">—</strong></div>',
      '<div class="bus-modal-detail-wide">',
      '<span>Tipo</span>',
      '<strong id="fidelityEditType">—</strong>',
      '</div>',
      '</div>',
      '<label for="fidelityEditQuantity">',
      'Quantidade de passagens',
      '</label>',
      '<input type="number" min="0" max="999" step="1" ',
      'id="fidelityEditQuantity" inputmode="numeric">',
      '<div class="bus-modal-actions">',
      '<button type="button" class="btn ghost" ',
      'id="fidelityEditCancel">Cancelar</button>',
      '<button type="button" class="btn" ',
      'id="fidelityEditSave">Salvar alteração</button>',
      '</div>',
      '</section>'
    ].join('');

    document.body.appendChild(overlay);

    document
      .getElementById('fidelityEditClose')
      .addEventListener('click', closeFidelityEdit);

    document
      .getElementById('fidelityEditCancel')
      .addEventListener('click', closeFidelityEdit);

    document
      .getElementById('fidelityEditSave')
      .addEventListener('click', saveFidelityEdit);

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeFidelityEdit();
      }
    });

    return overlay;
  }

  function openFidelityEdit(item) {
    selectedFidelityUse = item;
    lastFocusedElement = document.activeElement;

    const overlay = ensureFidelityEditModal();

    document.getElementById('fidelityEditLine').textContent =
      String(item.linha || '—');

    document.getElementById('fidelityEditDate').textContent =
      item.data || '—';

    document.getElementById('fidelityEditType').textContent =
      item.tipo || '—';

    document.getElementById('fidelityEditQuantity').value =
      String(item.quantidade ?? 0);

    overlay.hidden = false;

    requestAnimationFrame(function () {
      const input = document.getElementById(
        'fidelityEditQuantity'
      );

      input.focus();
      input.select();
    });
  }

  function closeFidelityEdit() {
    const overlay = document.getElementById(
      'fidelityEditOverlay'
    );

    if (overlay) {
      overlay.hidden = true;
    }

    selectedFidelityUse = null;
    restoreFocus();
  }

  async function saveFidelityEdit() {
    if (
      !selectedFidelityUse ||
      !selectedFidelityUse.linha
    ) {
      return;
    }

    const input = document.getElementById(
      'fidelityEditQuantity'
    );

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
      'fidelityEditSave'
    );

    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = 'Salvando...';

    try {
      const result = await call(
        'bfUpdateUse',
        {
          token: state.token,
          linha: selectedFidelityUse.linha,
          qtd: quantity
        },
        false
      );

      closeFidelityEdit();
      toast(result.msg || 'Registro atualizado.');
      await refreshFidelity();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function ensureFidelityDeleteModal() {
    let overlay = document.getElementById(
      'fidelityDeleteOverlay'
    );

    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'fidelityDeleteOverlay';
    overlay.className = 'bus-modal-overlay';
    overlay.hidden = true;

    overlay.innerHTML = [
      '<section class="bus-modal bus-modal-danger" ',
      'role="alertdialog" aria-modal="true" ',
      'aria-labelledby="fidelityDeleteTitle">',
      '<button type="button" class="bus-modal-close" ',
      'id="fidelityDeleteClose" aria-label="Fechar">×</button>',
      '<p class="bus-modal-eyebrow">Confirmação necessária</p>',
      '<h3 id="fidelityDeleteTitle">',
      'Excluir registro de passagens?',
      '</h3>',
      '<p class="bus-modal-description">',
      'Será apagada somente a quantidade da coluna C.',
      '</p>',
      '<div class="bus-modal-details">',
      '<div><span>Linha</span>',
      '<strong id="fidelityDeleteLine">—</strong></div>',
      '<div><span>Data</span>',
      '<strong id="fidelityDeleteDate">—</strong></div>',
      '<div><span>Quantidade</span>',
      '<strong id="fidelityDeleteQuantity">—</strong></div>',
      '<div class="bus-modal-detail-wide">',
      '<span>Tipo</span>',
      '<strong id="fidelityDeleteType">—</strong>',
      '</div>',
      '</div>',
      '<p class="bus-modal-warning">',
      'As fórmulas, a formatação e eventual recarga da coluna G ',
      'serão preservadas.',
      '</p>',
      '<div class="bus-modal-actions">',
      '<button type="button" class="btn ghost" ',
      'id="fidelityDeleteCancel">Cancelar</button>',
      '<button type="button" class="bus-danger-button" ',
      'id="fidelityDeleteConfirm">Excluir registro</button>',
      '</div>',
      '</section>'
    ].join('');

    document.body.appendChild(overlay);

    document
      .getElementById('fidelityDeleteClose')
      .addEventListener('click', closeFidelityDelete);

    document
      .getElementById('fidelityDeleteCancel')
      .addEventListener('click', closeFidelityDelete);

    document
      .getElementById('fidelityDeleteConfirm')
      .addEventListener('click', confirmFidelityDelete);

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeFidelityDelete();
      }
    });

    return overlay;
  }

  function openFidelityDelete(item) {
    selectedFidelityUse = item;
    lastFocusedElement = document.activeElement;

    const overlay = ensureFidelityDeleteModal();

    document.getElementById(
      'fidelityDeleteLine'
    ).textContent = String(item.linha || '—');

    document.getElementById(
      'fidelityDeleteDate'
    ).textContent = item.data || '—';

    document.getElementById(
      'fidelityDeleteQuantity'
    ).textContent = String(item.quantidade ?? 0);

    document.getElementById(
      'fidelityDeleteType'
    ).textContent = item.tipo || '—';

    const button = document.getElementById(
      'fidelityDeleteConfirm'
    );

    button.disabled = false;
    button.textContent = 'Excluir registro';

    overlay.hidden = false;

    requestAnimationFrame(function () {
      document.getElementById(
        'fidelityDeleteCancel'
      ).focus();
    });
  }

  function closeFidelityDelete() {
    const overlay = document.getElementById(
      'fidelityDeleteOverlay'
    );

    if (overlay) {
      overlay.hidden = true;
    }

    selectedFidelityUse = null;
    restoreFocus();
  }

  async function confirmFidelityDelete() {
    if (
      !selectedFidelityUse ||
      !selectedFidelityUse.linha
    ) {
      return;
    }

    const button = document.getElementById(
      'fidelityDeleteConfirm'
    );

    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = 'Excluindo...';

    try {
      const result = await call(
        'bfDeleteUse',
        {
          token: state.token,
          linha: selectedFidelityUse.linha
        },
        false
      );

      closeFidelityDelete();
      toast(result.msg || 'Registro excluído.');
      await refreshFidelity();
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

    const editOverlay = document.getElementById(
      'fidelityEditOverlay'
    );

    const deleteOverlay = document.getElementById(
      'fidelityDeleteOverlay'
    );

    if (editOverlay && !editOverlay.hidden) {
      closeFidelityEdit();
    }

    if (deleteOverlay && !deleteOverlay.hidden) {
      closeFidelityDelete();
    }
  });

  ensureTab();
  ensureView();
  ensureFidelityEditModal();
  ensureFidelityDeleteModal();

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
