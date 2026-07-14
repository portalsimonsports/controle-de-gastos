'use strict';

(function () {
  let editingExpense = null;

  function canManageExpenses() {
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

  function prepareQueryTable(showActions) {
    const table = document.querySelector('#viewQuery table');
    if (!table) return;

    const headerRow = table.querySelector('thead tr');
    let actionHeader = headerRow.querySelector(
      '[data-query-actions-header]'
    );

    if (showActions && !actionHeader) {
      actionHeader = document.createElement('th');
      actionHeader.textContent = 'Ações';
      actionHeader.className = 'right';
      actionHeader.dataset.queryActionsHeader = '1';
      headerRow.appendChild(actionHeader);
    }

    if (!showActions && actionHeader) {
      actionHeader.remove();
    }

    const footerLabel = table.querySelector('tfoot th[colspan]');
    if (footerLabel) {
      footerLabel.colSpan = showActions ? 5 : 4;
    }
  }

  function renderEnhancedQuery(result) {
    const body = document.getElementById('queryBody');
    const showActions =
      canManageExpenses() && result.permiteEdicao !== false;

    prepareQueryTable(showActions);
    body.innerHTML = '';

    const rows = Array.isArray(result.rows) ? result.rows : [];

    if (!rows.length) {
      emptyRow(body, showActions ? 6 : 5);
      document.getElementById('queryTotal').textContent = money(0);
      return;
    }

    rows.forEach(function (item) {
      const row = document.createElement('tr');

      appendCell(row, item.data);
      appendCell(row, item.descricao);
      appendCell(row, item.cartao);
      appendCell(row, item.ref || '');
      appendCell(row, money(item.valor), 'right');

      if (showActions) {
        const cell = document.createElement('td');
        cell.className = 'right';

        const actions = document.createElement('div');
        actions.className = 'query-actions';

        actions.appendChild(
          createActionButton(
            'Editar',
            'btn-mini btn-edit',
            function () {
              openExpenseEditor(item);
            }
          )
        );

        actions.appendChild(
          createActionButton(
            'Excluir',
            'btn-mini btn-delete',
            function () {
              deleteExpense(item);
            }
          )
        );

        cell.appendChild(actions);
        row.appendChild(cell);
      }

      body.appendChild(row);
    });

    document.getElementById('queryTotal').textContent =
      money(result.total);
  }

  async function enhancedLoadQuery() {
    const start = document.getElementById('queryStart').value;
    const end = document.getElementById('queryEnd').value;

    if (!start || !end) {
      toast('Informe o período.', 'error');
      return;
    }

    const button = document.getElementById('loadQuery');
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = 'Consultando...';

    try {
      const result = await call(
        'listDespesas',
        {
          token: state.token,
          inicio: start,
          fim: end
        },
        false
      );

      document.getElementById('queryHeader').textContent =
        result.header || '';

      renderEnhancedQuery(result);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function ensureExpenseEditor() {
    let overlay = document.getElementById('expenseEditOverlay');

    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'expenseEditOverlay';
    overlay.className = 'expense-modal-overlay';
    overlay.hidden = true;

    overlay.innerHTML = [
      '<div class="expense-modal" role="dialog" ',
      'aria-modal="true" aria-labelledby="expenseEditTitle">',
      '<div class="expense-modal-header">',
      '<h3 id="expenseEditTitle">Editar despesa</h3>',
      '<button type="button" class="btn ghost expense-modal-close" ',
      'id="expenseEditClose">Fechar</button>',
      '</div>',
      '<p class="expense-modal-note" id="expenseEditNote"></p>',
      '<div class="grid">',
      '<div class="col-4">',
      '<label for="editExpenseDate">Data</label>',
      '<input type="date" id="editExpenseDate">',
      '</div>',
      '<div class="col-4">',
      '<label for="editExpenseCard">Cartão</label>',
      '<select id="editExpenseCard"></select>',
      '</div>',
      '<div class="col-4">',
      '<label for="editExpenseValue">Valor total da compra</label>',
      '<input type="number" min="0.01" step="0.01" ',
      'id="editExpenseValue">',
      '</div>',
      '<div class="col-12">',
      '<label for="editExpenseDescription">Descrição</label>',
      '<input id="editExpenseDescription" maxlength="220">',
      '</div>',
      '<div class="col-4">',
      '<label for="editExpenseInstallments">Parcelas</label>',
      '<input type="number" min="1" max="240" ',
      'id="editExpenseInstallments">',
      '</div>',
      '<div class="col-4">',
      '<label for="editExpenseDivided">Dividido?</label>',
      '<select id="editExpenseDivided">',
      '<option value="false">Não</option>',
      '<option value="true">Sim</option>',
      '</select>',
      '</div>',
      '<div class="col-4 actions">',
      '<button type="button" class="btn" ',
      'id="editExpenseSave">Salvar alteração</button>',
      '<button type="button" class="btn ghost" ',
      'id="editExpenseCancel">Cancelar</button>',
      '</div>',
      '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);

    document
      .getElementById('expenseEditClose')
      .addEventListener('click', closeExpenseEditor);

    document
      .getElementById('editExpenseCancel')
      .addEventListener('click', closeExpenseEditor);

    document
      .getElementById('editExpenseSave')
      .addEventListener('click', saveExpenseEdit);

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeExpenseEditor();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !overlay.hidden) {
        closeExpenseEditor();
      }
    });

    return overlay;
  }

  function populateEditCards(selectedValue) {
    const target = document.getElementById('editExpenseCard');
    const source = document.getElementById('expenseCard');

    target.innerHTML = '';

    Array.from(source.options).forEach(function (option) {
      const copy = document.createElement('option');
      copy.value = option.value;
      copy.textContent = option.textContent;
      copy.selected =
        String(option.value) === String(selectedValue);
      target.appendChild(copy);
    });
  }

  function openExpenseEditor(item) {
    editingExpense = item;
    const overlay = ensureExpenseEditor();

    populateEditCards(item.refCartao);

    document.getElementById('expenseEditNote').textContent =
      'Editando somente a linha ' +
      item.linha +
      ' da planilha.';

    document.getElementById('editExpenseDate').value =
      item.dataIso || '';

    document.getElementById('editExpenseDescription').value =
      item.descricao || '';

    document.getElementById('editExpenseValue').value =
      Number(item.valorTotal || 0).toFixed(2);

    document.getElementById('editExpenseInstallments').value =
      item.parcelas || 1;

    document.getElementById('editExpenseDivided').value =
      item.dividido ? 'true' : 'false';

    overlay.hidden = false;

    setTimeout(function () {
      document.getElementById('editExpenseDescription').focus();
    }, 20);
  }

  function closeExpenseEditor() {
    const overlay = document.getElementById('expenseEditOverlay');

    if (overlay) {
      overlay.hidden = true;
    }

    editingExpense = null;
  }

  async function saveExpenseEdit() {
    if (!editingExpense) return;

    const params = {
      token: state.token,
      linha: editingExpense.linha,
      data: document.getElementById('editExpenseDate').value,
      descricao:
        document.getElementById('editExpenseDescription').value,
      valorTotal:
        document.getElementById('editExpenseValue').value,
      refCartao:
        document.getElementById('editExpenseCard').value,
      nParcelas:
        document.getElementById('editExpenseInstallments').value,
      divididoSN:
        document.getElementById('editExpenseDivided').value
    };

    if (
      !params.data ||
      !params.descricao.trim() ||
      Number(params.valorTotal) <= 0 ||
      !params.refCartao
    ) {
      toast(
        'Preencha data, descrição, valor e cartão.',
        'error'
      );
      return;
    }

    const button = document.getElementById('editExpenseSave');
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = 'Salvando...';

    try {
      const result = await call(
        'updateDespesa',
        params,
        false
      );

      toast(result.msg || 'Despesa atualizada.');
      closeExpenseEditor();
      await enhancedLoadQuery();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  async function deleteExpense(item) {
    const confirmed = window.confirm(
      'Excluir o lançamento da linha ' +
      item.linha +
      '?\n\n' +
      item.data +
      ' — ' +
      item.descricao +
      '\n' +
      money(item.valor) +
      '\n\nA linha será esvaziada sem deslocar os demais registros.'
    );

    if (!confirmed) return;

    try {
      const result = await call(
        'deleteDespesa',
        {
          token: state.token,
          linha: item.linha
        },
        false
      );

      toast(result.msg || 'Despesa excluída.');
      await enhancedLoadQuery();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  const saveButton = document.getElementById('saveExpense');

  if (saveButton) {
    saveButton.addEventListener(
      'click',
      async function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const params = {
          token: state.token,
          data: document.getElementById('expenseDate').value,
          descricao:
            document.getElementById('expenseDescription').value,
          valorTotal:
            document.getElementById('expenseValue').value,
          refCartao:
            document.getElementById('expenseCard').value,
          nParcelas:
            document.getElementById('expenseInstallments').value,
          divididoSN:
            document.getElementById('expenseDivided').value,
          modoData:
            document.getElementById('expenseMode').value
        };

        if (
          !params.data ||
          !params.descricao.trim() ||
          Number(params.valorTotal) <= 0 ||
          !params.refCartao
        ) {
          toast(
            'Preencha data, descrição, valor e cartão.',
            'error'
          );
          return;
        }

        const originalText = saveButton.textContent;
        saveButton.disabled = true;
        saveButton.textContent = 'Gravando...';

        try {
          const result = await call(
            'saveDespesa',
            params,
            false
          );

          toast(result.msg || 'Despesa gravada.');
          clearExpense();
        } catch (error) {
          toast(error.message, 'error');
        } finally {
          saveButton.disabled = false;
          saveButton.textContent = originalText;
        }
      },
      true
    );
  }

  const queryButton = document.getElementById('loadQuery');

  if (queryButton) {
    queryButton.addEventListener(
      'click',
      function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        enhancedLoadQuery();
      },
      true
    );
  }

  ensureExpenseEditor();
})();
