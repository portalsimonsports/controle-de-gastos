'use strict';

(function () {
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
      if (comma > dot) {
        value = value.replace(/\./g, '').replace(',', '.');
      } else {
        value = value.replace(/,/g, '');
      }
    } else if (comma >= 0) {
      value = value.replace(/\./g, '').replace(',', '.');
    } else if ((value.match(/\./g) || []).length > 1) {
      const lastDot = value.lastIndexOf('.');
      const decimals = value.length - lastDot - 1;

      if (decimals === 1 || decimals === 2) {
        value =
          value.slice(0, lastDot).replace(/\./g, '') +
          '.' +
          value.slice(lastDot + 1);
      } else {
        value = value.replace(/\./g, '');
      }
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : NaN;
  }

  function formatMoneyInput(input) {
    if (!input || !String(input.value || '').trim()) return;

    const value = parseMoneyPtBr(input.value);
    if (!Number.isFinite(value)) return;

    input.value = value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function prepareMoneyInput(input) {
    if (!input || input.dataset.ptbrMoneyReady === '1') return;

    input.dataset.ptbrMoneyReady = '1';
    input.type = 'text';
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    input.placeholder = '0,00';

    input.addEventListener('blur', function () {
      formatMoneyInput(input);
    });
  }

  function prepareInputs() {
    prepareMoneyInput(document.getElementById('expenseValue'));
    prepareMoneyInput(document.getElementById('editExpenseValue'));
    prepareMoneyInput(document.getElementById('juniorValue'));
  }

  function fieldValue(id, fallback) {
    const field = document.getElementById(id);
    return field ? field.value : fallback;
  }

  function validateCommon(params, numericValue) {
    return Boolean(
      params.data &&
      params.descricao.trim() &&
      Number.isFinite(numericValue) &&
      numericValue > 0 &&
      params.refCartao
    );
  }

  function validateRecurrence(params) {
    if (params.recorrenteSN !== 'true') return true;

    const interval = Number(params.intervaloMeses || 0);
    const count = Number(params.repeticoes || 0);

    return Number.isInteger(interval) &&
      interval >= 1 &&
      Number.isInteger(count) &&
      count >= 1;
  }

  async function saveNewExpense(button) {
    const valueInput = document.getElementById('expenseValue');
    const numericValue = parseMoneyPtBr(valueInput.value);

    const params = {
      token: state.token,
      data: document.getElementById('expenseDate').value,
      descricao: document.getElementById('expenseDescription').value,
      valorTotal: Number.isFinite(numericValue)
        ? numericValue.toFixed(2)
        : '',
      refCartao: document.getElementById('expenseCard').value,
      nParcelas: document.getElementById('expenseInstallments').value,
      divididoSN: document.getElementById('expenseDivided').value,
      modoData: document.getElementById('expenseMode').value,
      recorrenteSN: fieldValue('expenseRecurring', 'false'),
      intervaloMeses: fieldValue('expenseRecurrenceInterval', '1'),
      repeticoes: fieldValue('expenseRecurrenceCount', '1'),
      responsavel: fieldValue('expenseAccount', 'PESSOAL')
    };

    if (!validateCommon(params, numericValue)) {
      toast('Preencha data, descrição, valor e cartão.', 'error');
      return;
    }

    if (!validateRecurrence(params)) {
      toast('Informe o intervalo e a quantidade de repetições.', 'error');
      return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Gravando...';

    try {
      const result = await call('saveDespesa', params, false);
      toast(result.msg || 'Despesa gravada.');

      if (typeof clearExpense === 'function') {
        clearExpense();
      } else {
        valueInput.value = '';
      }

      if (typeof window.resetExpenseExtras === 'function') {
        window.resetExpenseExtras();
      }
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function expenseRowFromModal() {
    const note = document.getElementById('expenseEditNote');
    const match = String(note ? note.textContent : '').match(/linha\s+(\d+)/i);
    return match ? Number(match[1]) : 0;
  }

  async function saveEditedExpense(button) {
    const valueInput = document.getElementById('editExpenseValue');
    const numericValue = parseMoneyPtBr(valueInput.value);

    const params = {
      token: state.token,
      linha: expenseRowFromModal(),
      data: document.getElementById('editExpenseDate').value,
      descricao: document.getElementById('editExpenseDescription').value,
      valorTotal: Number.isFinite(numericValue)
        ? numericValue.toFixed(2)
        : '',
      refCartao: document.getElementById('editExpenseCard').value,
      nParcelas: document.getElementById('editExpenseInstallments').value,
      divididoSN: document.getElementById('editExpenseDivided').value
    };

    if (!params.linha || !validateCommon(params, numericValue)) {
      toast('Preencha data, descrição, valor e cartão.', 'error');
      return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Salvando...';

    try {
      const result = await call('updateDespesa', params, false);
      toast(result.msg || 'Despesa atualizada.');

      const overlay = document.getElementById('expenseEditOverlay');
      if (overlay) overlay.hidden = true;

      const queryButton = document.getElementById('loadQuery');
      if (queryButton) queryButton.click();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  document.addEventListener(
    'click',
    function (event) {
      const newButton = event.target.closest('#saveExpense');
      const editButton = event.target.closest('#editExpenseSave');

      if (!newButton && !editButton) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (newButton) {
        saveNewExpense(newButton);
      } else {
        saveEditedExpense(editButton);
      }
    },
    true
  );

  let scheduled = false;

  function schedulePrepare() {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(function () {
      scheduled = false;
      prepareInputs();
    });
  }

  const observer = new MutationObserver(schedulePrepare);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  prepareInputs();
})();