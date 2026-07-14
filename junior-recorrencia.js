'use strict';

(function () {
  const JUNIOR_VIEW_ID = 'viewJunior';
  const JUNIOR_TAB = {
    id: JUNIOR_VIEW_ID,
    label: 'Saldo Junior',
    roles: ['admin', 'editor', 'viewer']
  };

  function element(id) {
    return document.getElementById(id);
  }

  function parseMoneyPtBr(rawValue) {
    let value = String(rawValue || '')
      .replace(/R\$/gi, '')
      .replace(/\u00a0/g, '')
      .replace(/\s/g, '')
      .replace(/[^\d,.\-]/g, '');

    if (!value) return NaN;

    const comma = value.lastIndexOf(',');
    const dot = value.lastIndexOf('.');

    if (comma >= 0 && dot >= 0) {
      value = comma > dot
        ? value.replace(/\./g, '').replace(',', '.')
        : value.replace(/,/g, '');
    } else if (comma >= 0) {
      value = value.replace(/\./g, '').replace(',', '.');
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : NaN;
  }

  function createField(config) {
    const wrapper = document.createElement('div');
    wrapper.className = config.className || 'expense-extra-field col-3';
    wrapper.id = config.wrapperId || '';

    const label = document.createElement('label');
    label.htmlFor = config.id;
    label.textContent = config.label;

    let input;

    if (config.options) {
      input = document.createElement('select');
      config.options.forEach(function (optionData) {
        const option = document.createElement('option');
        option.value = optionData.value;
        option.textContent = optionData.label;
        input.appendChild(option);
      });
    } else {
      input = document.createElement('input');
      input.type = config.type || 'text';
      if (config.min !== undefined) input.min = config.min;
      if (config.max !== undefined) input.max = config.max;
      if (config.step !== undefined) input.step = config.step;
      if (config.inputMode) input.inputMode = config.inputMode;
    }

    input.id = config.id;
    input.value = config.value || '';

    wrapper.append(label, input);
    return wrapper;
  }

  function injectExpenseFields() {
    const view = element('viewExpenses');
    if (!view || element('expenseRecurring')) return;

    const grid = view.querySelector('.grid');
    const actions = element('saveExpense')
      ? element('saveExpense').closest('.actions')
      : null;

    if (!grid || !actions) return;

    const recurring = createField({
      id: 'expenseRecurring',
      label: 'Recorrente?',
      options: [
        { value: 'false', label: 'Não' },
        { value: 'true', label: 'Sim' }
      ]
    });

    const interval = createField({
      id: 'expenseRecurrenceInterval',
      wrapperId: 'expenseRecurrenceIntervalField',
      label: 'Intervalo em meses',
      type: 'number',
      min: '1',
      max: '120',
      step: '1',
      value: '1'
    });

    const repetitions = createField({
      id: 'expenseRecurrenceCount',
      wrapperId: 'expenseRecurrenceCountField',
      label: 'Quantidade de repetições',
      type: 'number',
      min: '1',
      max: '240',
      step: '1',
      value: '1'
    });

    const account = createField({
      id: 'expenseAccount',
      label: 'Conta / responsável',
      options: [
        { value: 'PESSOAL', label: 'Pessoal' },
        { value: 'JUNIOR', label: 'Junior' }
      ]
    });

    const recurrenceNote = document.createElement('p');
    recurrenceNote.className = 'expense-recurrence-note';
    recurrenceNote.id = 'expenseRecurrenceNote';

    const accountNote = document.createElement('p');
    accountNote.className = 'expense-account-note';
    accountNote.id = 'expenseAccountNote';
    accountNote.textContent =
      'Ao selecionar Junior, o sistema utiliza a referência de cartão 6 para alimentar a aba DespesasJuniorII.';

    grid.insertBefore(recurring, actions);
    grid.insertBefore(interval, actions);
    grid.insertBefore(repetitions, actions);
    grid.insertBefore(account, actions);
    grid.insertBefore(recurrenceNote, actions);
    grid.insertBefore(accountNote, actions);

    element('expenseRecurring').addEventListener(
      'change',
      updateRecurrenceFields
    );

    element('expenseRecurrenceInterval').addEventListener(
      'input',
      updateRecurrenceNote
    );

    element('expenseRecurrenceCount').addEventListener(
      'input',
      updateRecurrenceNote
    );

    element('expenseAccount').addEventListener(
      'change',
      updateExpenseAccount
    );

    const clearButton = element('clearExpense');
    if (clearButton) {
      clearButton.addEventListener('click', function () {
        setTimeout(resetExpenseExtras, 0);
      });
    }

    resetExpenseExtras();
  }

  function updateRecurrenceFields() {
    const enabled = element('expenseRecurring').value === 'true';
    const interval = element('expenseRecurrenceInterval');
    const count = element('expenseRecurrenceCount');

    interval.disabled = !enabled;
    count.disabled = !enabled;

    element('expenseRecurrenceIntervalField').hidden = !enabled;
    element('expenseRecurrenceCountField').hidden = !enabled;

    if (!enabled) {
      interval.value = '1';
      count.value = '1';
    }

    updateRecurrenceNote();
  }

  function updateRecurrenceNote() {
    const note = element('expenseRecurrenceNote');
    if (!note) return;

    if (element('expenseRecurring').value !== 'true') {
      note.textContent = '';
      note.hidden = true;
      return;
    }

    const interval = Math.max(
      1,
      Number(element('expenseRecurrenceInterval').value || 1)
    );
    const count = Math.max(
      1,
      Number(element('expenseRecurrenceCount').value || 1)
    );

    note.hidden = false;
    note.textContent =
      'O valor será repetido ' +
      count +
      ' vez(es), a cada ' +
      interval +
      ' mês(es), mantendo as regras de parcelas e divisão.';
  }

  function updateExpenseAccount() {
    const account = element('expenseAccount');
    const card = element('expenseCard');

    if (!account || !card) return;

    if (account.value === 'JUNIOR') {
      const option = Array.from(card.options).find(function (item) {
        return String(item.value) === '6';
      });

      if (option) card.value = '6';
    }
  }

  function resetExpenseExtras() {
    if (!element('expenseRecurring')) return;

    element('expenseRecurring').value = 'false';
    element('expenseRecurrenceInterval').value = '1';
    element('expenseRecurrenceCount').value = '1';
    element('expenseAccount').value = 'PESSOAL';
    updateRecurrenceFields();
  }

  function buildJuniorView() {
    if (element(JUNIOR_VIEW_ID)) return;

    const privateView = element('privateView');
    if (!privateView) return;

    const article = document.createElement('article');
    article.className = 'card view';
    article.id = JUNIOR_VIEW_ID;
    article.hidden = true;
    article.innerHTML = `
      <h3>Saldo Junior</h3>
      <div class="junior-summary">
        <div class="junior-summary-card balance">
          <span>Saldo atual</span>
          <strong id="juniorBalance">R$ 0,00</strong>
        </div>
        <div class="junior-summary-card">
          <span>Valores recebidos</span>
          <strong id="juniorReceived">R$ 0,00</strong>
        </div>
        <div class="junior-summary-card">
          <span>Despesas Junior</span>
          <strong id="juniorExpenses">R$ 0,00</strong>
        </div>
        <div class="junior-summary-card">
          <span>Outros descontos</span>
          <strong id="juniorDiscounts">R$ 0,00</strong>
        </div>
      </div>

      <div class="junior-form">
        <div>
          <label for="juniorDate">Data</label>
          <input type="date" id="juniorDate">
        </div>
        <div>
          <label for="juniorType">Tipo</label>
          <select id="juniorType">
            <option value="RECEBIDO">Valor recebido</option>
            <option value="DESCONTO">Desconto manual</option>
            <option value="AJUSTE_POSITIVO">Ajuste positivo</option>
            <option value="AJUSTE_NEGATIVO">Ajuste negativo</option>
          </select>
        </div>
        <div class="description-field">
          <label for="juniorDescription">Descrição</label>
          <input id="juniorDescription" maxlength="220" placeholder="Ex.: Transferência recebida">
        </div>
        <div>
          <label for="juniorValue">Valor</label>
          <input id="juniorValue" inputmode="decimal" placeholder="0,00">
        </div>
        <div class="actions">
          <button class="btn" id="juniorSave">Gravar</button>
          <button class="btn ghost" id="juniorClear">Limpar</button>
        </div>
      </div>

      <p class="junior-source-note" id="juniorSourceNote"></p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th class="right">Crédito</th>
              <th class="right">Débito</th>
              <th>Origem</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="juniorBody"></tbody>
        </table>
      </div>
    `;

    privateView.appendChild(article);
    buildJuniorModals();

    element('juniorDate').value = localIso();
    element('juniorSave').addEventListener('click', saveJuniorMovement);
    element('juniorClear').addEventListener('click', clearJuniorForm);
    element('juniorBody').addEventListener('click', juniorTableClick);
  }

  function buildJuniorModals() {
    if (element('juniorEditOverlay')) return;

    const editOverlay = document.createElement('div');
    editOverlay.className = 'junior-modal-overlay';
    editOverlay.id = 'juniorEditOverlay';
    editOverlay.hidden = true;
    editOverlay.innerHTML = `
      <section class="junior-modal" role="dialog" aria-modal="true" aria-labelledby="juniorEditTitle">
        <h3 id="juniorEditTitle">Editar movimento</h3>
        <div class="junior-modal-grid">
          <div>
            <label for="juniorEditDate">Data</label>
            <input type="date" id="juniorEditDate">
          </div>
          <div>
            <label for="juniorEditType">Tipo</label>
            <select id="juniorEditType">
              <option value="RECEBIDO">Valor recebido</option>
              <option value="DESCONTO">Desconto manual</option>
              <option value="AJUSTE_POSITIVO">Ajuste positivo</option>
              <option value="AJUSTE_NEGATIVO">Ajuste negativo</option>
            </select>
          </div>
          <div class="wide">
            <label for="juniorEditDescription">Descrição</label>
            <input id="juniorEditDescription" maxlength="220">
          </div>
          <div class="wide">
            <label for="juniorEditValue">Valor</label>
            <input id="juniorEditValue" inputmode="decimal" placeholder="0,00">
          </div>
        </div>
        <div class="junior-modal-actions">
          <button class="btn ghost" id="juniorEditCancel">Cancelar</button>
          <button class="btn" id="juniorEditSave">Salvar alteração</button>
        </div>
      </section>
    `;

    const deleteOverlay = document.createElement('div');
    deleteOverlay.className = 'junior-modal-overlay';
    deleteOverlay.id = 'juniorDeleteOverlay';
    deleteOverlay.hidden = true;
    deleteOverlay.innerHTML = `
      <section class="junior-modal" role="dialog" aria-modal="true" aria-labelledby="juniorDeleteTitle">
        <h3 id="juniorDeleteTitle">Excluir movimento?</h3>
        <p id="juniorDeleteText" class="muted"></p>
        <div class="junior-modal-actions">
          <button class="btn ghost" id="juniorDeleteCancel">Cancelar</button>
          <button class="btn danger" id="juniorDeleteConfirm">Excluir movimento</button>
        </div>
      </section>
    `;

    document.body.append(editOverlay, deleteOverlay);

    element('juniorEditCancel').addEventListener('click', closeJuniorEdit);
    element('juniorEditSave').addEventListener('click', saveJuniorEdit);
    element('juniorDeleteCancel').addEventListener('click', closeJuniorDelete);
    element('juniorDeleteConfirm').addEventListener('click', confirmJuniorDelete);
  }

  function installTabs() {
    if (window.__juniorTabsInstalled) return;
    if (typeof renderTabs !== 'function' || typeof showView !== 'function') return;

    window.__juniorTabsInstalled = true;
    const originalShowView = showView;

    window.renderTabs = function () {
      const nav = element('tabs');
      if (!nav) return;

      nav.innerHTML = '';
      const allTabs = tabs.concat([JUNIOR_TAB]);
      const visibleTabs = allTabs.filter(function (tab) {
        return tab.roles.includes(state.role);
      });

      if (!visibleTabs.some(function (tab) {
        return tab.id === state.activeView;
      })) {
        state.activeView = visibleTabs[0]
          ? visibleTabs[0].id
          : 'viewDashboard';
      }

      visibleTabs.forEach(function (tab) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className =
          'tab' +
          (tab.id === state.activeView ? ' active' : '');
        button.textContent = tab.label;
        button.addEventListener('click', function () {
          showView(tab.id);
        });
        nav.appendChild(button);
      });

      nav.hidden = false;
    };

    window.showView = async function (id) {
      await originalShowView(id);

      if (id === JUNIOR_VIEW_ID) {
        await loadJunior();
      }
    };

    if (!element('privateView').hidden) {
      renderTabs();
    }
  }

  function clearJuniorForm() {
    element('juniorDate').value = localIso();
    element('juniorType').value = 'RECEBIDO';
    element('juniorDescription').value = '';
    element('juniorValue').value = '';
  }

  async function saveJuniorMovement() {
    const value = parseMoneyPtBr(element('juniorValue').value);
    const params = {
      token: state.token,
      data: element('juniorDate').value,
      tipo: element('juniorType').value,
      descricao: element('juniorDescription').value,
      valor: Number.isFinite(value) ? value.toFixed(2) : ''
    };

    if (!params.data || !params.descricao.trim() || !Number.isFinite(value) || value <= 0) {
      toast('Preencha data, descrição e valor.', 'error');
      return;
    }

    const button = element('juniorSave');
    const text = button.textContent;
    button.disabled = true;
    button.textContent = 'Gravando...';

    try {
      const result = await call('juniorSave', params, false);
      paintJunior(result);
      clearJuniorForm();
      toast(result.msg || 'Movimento registrado.');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = text;
    }
  }

  async function loadJunior() {
    try {
      const result = await call(
        'juniorGet',
        { token: state.token },
        false
      );
      paintJunior(result);
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function paintJunior(result) {
    element('juniorBalance').textContent = money(result.saldo || 0);
    element('juniorReceived').textContent = money(result.recebido || 0);
    element('juniorExpenses').textContent = money(result.despesas || 0);
    element('juniorDiscounts').textContent = money(result.outrosDescontos || 0);

    element('juniorSourceNote').textContent = result.abaDespesasEncontrada
      ? 'As despesas são lidas automaticamente da aba ' + result.abaDespesas + '.'
      : 'A aba DespesasJuniorII não foi encontrada. O saldo considera apenas os movimentos manuais.';

    const body = element('juniorBody');
    body.innerHTML = '';

    if (!result.rows || !result.rows.length) {
      emptyRow(body, 7, 'Nenhum movimento encontrado.');
      return;
    }

    result.rows.forEach(function (item) {
      const row = document.createElement('tr');
      appendCell(row, item.data || '');
      appendCell(row, item.tipoLabel || item.tipo || '');
      appendCell(row, item.descricao || '');
      appendCell(row, item.credito > 0 ? money(item.credito) : '—', 'right');
      appendCell(row, item.debito > 0 ? money(item.debito) : '—', 'right');

      const originCell = document.createElement('td');
      const origin = document.createElement('span');
      origin.className =
        'junior-origin' +
        (item.origem === 'DESPESA' ? ' expense' : '');
      origin.textContent = item.origem === 'DESPESA'
        ? 'DespesasJuniorII'
        : 'Manual';
      originCell.appendChild(origin);
      row.appendChild(originCell);

      const actionsCell = document.createElement('td');
      const actions = document.createElement('div');
      actions.className = 'junior-row-actions';

      if (item.editavel && result.permiteEditar) {
        const edit = document.createElement('button');
        edit.className = 'btn ghost small junior-edit';
        edit.type = 'button';
        edit.textContent = 'Editar';
        edit.dataset.item = JSON.stringify(item);

        const remove = document.createElement('button');
        remove.className = 'btn danger small junior-delete';
        remove.type = 'button';
        remove.textContent = 'Excluir';
        remove.dataset.item = JSON.stringify(item);

        actions.append(edit, remove);
      } else {
        actions.textContent = '—';
      }

      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);
      body.appendChild(row);
    });
  }

  function juniorTableClick(event) {
    const edit = event.target.closest('.junior-edit');
    const remove = event.target.closest('.junior-delete');

    if (edit) {
      openJuniorEdit(JSON.parse(edit.dataset.item));
    }

    if (remove) {
      openJuniorDelete(JSON.parse(remove.dataset.item));
    }
  }

  function openJuniorEdit(item) {
    const overlay = element('juniorEditOverlay');
    overlay.dataset.row = item.linha;
    element('juniorEditDate').value = item.dataIso || '';
    element('juniorEditType').value = item.tipo || 'RECEBIDO';
    element('juniorEditDescription').value = item.descricao || '';
    element('juniorEditValue').value = Number(item.valor || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    overlay.hidden = false;
  }

  function closeJuniorEdit() {
    element('juniorEditOverlay').hidden = true;
  }

  async function saveJuniorEdit() {
    const overlay = element('juniorEditOverlay');
    const value = parseMoneyPtBr(element('juniorEditValue').value);
    const params = {
      token: state.token,
      linha: overlay.dataset.row,
      data: element('juniorEditDate').value,
      tipo: element('juniorEditType').value,
      descricao: element('juniorEditDescription').value,
      valor: Number.isFinite(value) ? value.toFixed(2) : ''
    };

    if (!params.data || !params.descricao.trim() || !Number.isFinite(value) || value <= 0) {
      toast('Preencha data, descrição e valor.', 'error');
      return;
    }

    const button = element('juniorEditSave');
    const text = button.textContent;
    button.disabled = true;
    button.textContent = 'Salvando...';

    try {
      const result = await call('juniorUpdate', params, false);
      closeJuniorEdit();
      paintJunior(result);
      toast(result.msg || 'Movimento atualizado.');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = text;
    }
  }

  function openJuniorDelete(item) {
    const overlay = element('juniorDeleteOverlay');
    overlay.dataset.row = item.linha;
    element('juniorDeleteText').textContent =
      item.data +
      ' — ' +
      item.descricao +
      ' — ' +
      money(item.valor || 0);
    overlay.hidden = false;
  }

  function closeJuniorDelete() {
    element('juniorDeleteOverlay').hidden = true;
  }

  async function confirmJuniorDelete() {
    const overlay = element('juniorDeleteOverlay');
    const button = element('juniorDeleteConfirm');
    const text = button.textContent;
    button.disabled = true;
    button.textContent = 'Excluindo...';

    try {
      const result = await call(
        'juniorDelete',
        {
          token: state.token,
          linha: overlay.dataset.row
        },
        false
      );
      closeJuniorDelete();
      paintJunior(result);
      toast(result.msg || 'Movimento excluído.');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = text;
    }
  }

  function start() {
    injectExpenseFields();
    buildJuniorView();
    installTabs();

    const observer = new MutationObserver(function () {
      injectExpenseFields();
      buildJuniorView();
      installTabs();
    });

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

  window.resetExpenseExtras = resetExpenseExtras;
})();