'use strict';

(function () {
  function localIsoDate() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 10);
  }

  function moneyPtBr(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function ensureExpenseExtras() {
    const view = document.getElementById('viewExpenses');
    if (!view || document.getElementById('expenseRecurring')) return;

    const grid = view.querySelector('.grid');
    const actionBlock = document.getElementById('saveExpense')?.closest('div');
    if (!grid || !actionBlock) return;

    const recurring = document.createElement('div');
    recurring.className = 'col-2 expense-extra-field';
    recurring.innerHTML = `
      <label for="expenseRecurring">Recorrente?</label>
      <select id="expenseRecurring">
        <option value="false">Não</option>
        <option value="true">Sim</option>
      </select>
    `;

    const interval = document.createElement('div');
    interval.className = 'col-2 expense-extra-field recurrence-only';
    interval.innerHTML = `
      <label for="expenseRecurrenceInterval">Intervalo (meses)</label>
      <input id="expenseRecurrenceInterval" type="number" min="1" max="120" value="1">
    `;

    const count = document.createElement('div');
    count.className = 'col-2 expense-extra-field recurrence-only';
    count.innerHTML = `
      <label for="expenseRecurrenceCount">Repetições</label>
      <input id="expenseRecurrenceCount" type="number" min="1" max="240" value="1">
    `;

    const account = document.createElement('div');
    account.className = 'col-2 expense-extra-field';
    account.innerHTML = `
      <label for="expenseAccount">Conta/Responsável</label>
      <select id="expenseAccount">
        <option value="PESSOAL">Pessoal</option>
        <option value="JUNIOR">Junior</option>
      </select>
    `;

    grid.insertBefore(recurring, actionBlock);
    grid.insertBefore(interval, actionBlock);
    grid.insertBefore(count, actionBlock);
    grid.insertBefore(account, actionBlock);

    document.getElementById('expenseRecurring')
      .addEventListener('change', toggleRecurrenceFields);

    toggleRecurrenceFields();
  }

  function toggleRecurrenceFields() {
    const enabled = document.getElementById('expenseRecurring')?.value === 'true';
    document.querySelectorAll('.recurrence-only').forEach(function (element) {
      element.hidden = !enabled;
    });
  }

  window.resetExpenseExtras = function () {
    const recurring = document.getElementById('expenseRecurring');
    const interval = document.getElementById('expenseRecurrenceInterval');
    const count = document.getElementById('expenseRecurrenceCount');
    const account = document.getElementById('expenseAccount');

    if (recurring) recurring.value = 'false';
    if (interval) interval.value = '1';
    if (count) count.value = '1';
    if (account) account.value = 'PESSOAL';
    toggleRecurrenceFields();
  };

  function ensureJuniorView() {
    const privateView = document.getElementById('privateView');
    if (!privateView || document.getElementById('viewJunior')) return;

    const article = document.createElement('article');
    article.className = 'card view junior-view';
    article.id = 'viewJunior';
    article.hidden = true;
    article.innerHTML = `
      <div class="junior-heading">
        <div>
          <h3>Saldo Junior</h3>
          <p class="muted small">Créditos recebidos menos despesas e ajustes descontados.</p>
        </div>
        <button class="btn primary" id="juniorRefresh">Atualizar</button>
      </div>

      <div class="junior-summary">
        <div class="junior-stat">
          <span>Total recebido</span>
          <strong id="juniorReceived">R$ 0,00</strong>
        </div>
        <div class="junior-stat">
          <span>Total descontado</span>
          <strong id="juniorDebited">R$ 0,00</strong>
        </div>
        <div class="junior-stat junior-balance">
          <span>Saldo atual</span>
          <strong id="juniorBalance">R$ 0,00</strong>
        </div>
      </div>

      <div class="junior-form">
        <div>
          <label for="juniorDate">Data</label>
          <input id="juniorDate" type="date">
        </div>
        <div>
          <label for="juniorType">Tipo</label>
          <select id="juniorType">
            <option value="CREDITO">Valor recebido</option>
            <option value="DEBITO">Desconto manual</option>
            <option value="AJUSTE_POSITIVO">Ajuste positivo</option>
            <option value="AJUSTE_NEGATIVO">Ajuste negativo</option>
          </select>
        </div>
        <div class="junior-description-field">
          <label for="juniorDescription">Descrição</label>
          <input id="juniorDescription" maxlength="220" placeholder="Ex.: Transferência recebida">
        </div>
        <div>
          <label for="juniorValue">Valor</label>
          <input id="juniorValue" type="text" inputmode="decimal" placeholder="0,00">
        </div>
        <button class="btn" id="juniorSave">Gravar</button>
      </div>

      <div class="table-wrap junior-table-wrap">
        <table class="junior-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th class="right">Crédito</th>
              <th class="right">Débito</th>
              <th class="right">Saldo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="juniorBody"></tbody>
        </table>
      </div>

      <div class="junior-confirm" id="juniorConfirm" hidden>
        <div class="junior-confirm-card">
          <h3>Excluir movimento?</h3>
          <p>O movimento selecionado será apagado do histórico do Saldo Junior.</p>
          <div class="actions">
            <button class="btn ghost" id="juniorCancelDelete">Cancelar</button>
            <button class="btn danger" id="juniorConfirmDelete">Excluir</button>
          </div>
        </div>
      </div>
    `;

    privateView.appendChild(article);
    document.getElementById('juniorDate').value = localIsoDate();

    document.getElementById('juniorRefresh').addEventListener('click', loadJunior);
    document.getElementById('juniorSave').addEventListener('click', saveJunior);
    document.getElementById('juniorCancelDelete').addEventListener('click', closeJuniorDelete);
    document.getElementById('juniorConfirmDelete').addEventListener('click', confirmJuniorDelete);
  }

  function ensureJuniorTab() {
    const tabs = document.getElementById('tabs');
    if (!tabs || tabs.hidden || document.getElementById('tabJunior')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tab';
    button.id = 'tabJunior';
    button.textContent = 'Saldo Junior';
    button.addEventListener('click', showJunior);
    tabs.appendChild(button);
  }

  async function showJunior() {
    document.querySelectorAll('#privateView .view').forEach(function (view) {
      view.hidden = view.id !== 'viewJunior';
    });

    document.querySelectorAll('#tabs .tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.id === 'tabJunior');
    });

    await loadJunior();
  }

  function parseMoney(value) {
    const normalized = String(value || '')
      .replace(/R\$/gi, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const number = Number(normalized);
    return Number.isFinite(number) ? number : NaN;
  }

  async function loadJunior() {
    try {
      const [summary, list] = await Promise.all([
        call('juniorResumo', { token: state.token }, false),
        call('juniorList', { token: state.token }, false)
      ]);

      document.getElementById('juniorReceived').textContent = moneyPtBr(summary.totalRecebido);
      document.getElementById('juniorDebited').textContent = moneyPtBr(summary.totalDescontado);
      document.getElementById('juniorBalance').textContent = moneyPtBr(summary.saldo);

      const body = document.getElementById('juniorBody');
      body.innerHTML = '';

      if (!list.rows || !list.rows.length) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="7" class="empty">Nenhum movimento registrado.</td>';
        body.appendChild(row);
        return;
      }

      list.rows.forEach(function (item) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.data || ''}</td>
          <td>${item.tipo || ''}</td>
          <td>${item.descricao || ''}</td>
          <td class="right">${item.credito ? moneyPtBr(item.credito) : '—'}</td>
          <td class="right">${item.debito ? moneyPtBr(item.debito) : '—'}</td>
          <td class="right">${moneyPtBr(item.saldo)}</td>
          <td><button class="btn danger junior-delete" data-line="${item.linha}">Excluir</button></td>
        `;
        body.appendChild(row);
      });

      body.querySelectorAll('.junior-delete').forEach(function (button) {
        button.addEventListener('click', function () {
          openJuniorDelete(button.dataset.line);
        });
      });
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function saveJunior() {
    const value = parseMoney(document.getElementById('juniorValue').value);
    const params = {
      token: state.token,
      data: document.getElementById('juniorDate').value,
      tipo: document.getElementById('juniorType').value,
      descricao: document.getElementById('juniorDescription').value,
      valor: Number.isFinite(value) ? value.toFixed(2) : ''
    };

    if (!params.data || !params.descricao.trim() || !Number.isFinite(value) || value <= 0) {
      toast('Preencha data, descrição e valor.', 'error');
      return;
    }

    const button = document.getElementById('juniorSave');
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Gravando...';

    try {
      const result = await call('juniorSave', params, false);
      toast(result.msg || 'Movimento gravado.');
      document.getElementById('juniorDescription').value = '';
      document.getElementById('juniorValue').value = '';
      await loadJunior();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  }

  let pendingJuniorDelete = 0;

  function openJuniorDelete(line) {
    pendingJuniorDelete = Number(line || 0);
    document.getElementById('juniorConfirm').hidden = false;
  }

  function closeJuniorDelete() {
    pendingJuniorDelete = 0;
    document.getElementById('juniorConfirm').hidden = true;
  }

  async function confirmJuniorDelete() {
    if (!pendingJuniorDelete) return;

    const button = document.getElementById('juniorConfirmDelete');
    button.disabled = true;
    button.textContent = 'Excluindo...';

    try {
      const result = await call('juniorDelete', {
        token: state.token,
        linha: pendingJuniorDelete
      }, false);
      toast(result.msg || 'Movimento excluído.');
      closeJuniorDelete();
      await loadJunior();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Excluir';
    }
  }

  function keepBaseTabsWorking() {
    document.addEventListener('click', function (event) {
      const tab = event.target.closest('#tabs .tab');
      if (!tab || tab.id === 'tabJunior') return;
      const junior = document.getElementById('viewJunior');
      if (junior) junior.hidden = true;
    });
  }

  let scheduled = false;
  function scheduleEnsure() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      ensureExpenseExtras();
      ensureJuniorView();
      ensureJuniorTab();
    });
  }

  function start() {
    scheduleEnsure();
    keepBaseTabsWorking();
    const observer = new MutationObserver(scheduleEnsure);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();