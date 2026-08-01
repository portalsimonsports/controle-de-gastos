'use strict';

(function () {
  function element(id) {
    return document.getElementById(id);
  }

  function bindCapture(id, handler) {
    const target = element(id);

    if (!target || target.dataset.fastSaveBound === '1') {
      return;
    }

    target.dataset.fastSaveBound = '1';
    target.addEventListener('click', handler, true);
  }

  function stopOriginal(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function backgroundRefresh(viewId) {
    setTimeout(function () {
      try {
        if (typeof showView === 'function') {
          Promise.resolve(showView(viewId)).catch(function (error) {
            console.error(error);
          });
        }
      } catch (error) {
        console.error(error);
      }
    }, 0);
  }

  async function saveExpenseFast(event) {
    stopOriginal(event);

    const button = element('saveExpense');
    const description = element('expenseDescription');
    const recurring = element('expenseRecurring');
    const interval = element('expenseRecurrenceInterval');
    const repetitions = element('expenseRecurrenceCount');
    const account = element('expenseAccount');

    const params = {
      token: state.token,
      data: element('expenseDate')?.value || '',
      descricao: description?.value || '',
      valorTotal: element('expenseValue')?.value || '',
      refCartao: element('expenseCard')?.value || '',
      nParcelas: element('expenseInstallments')?.value || '1',
      divididoSN: element('expenseDivided')?.value || 'false',
      modoData: element('expenseMode')?.value || 'mesmo_dia',
      recorrenteSN: recurring?.value || 'false',
      intervaloMeses: interval?.value || '1',
      repeticoes: repetitions?.value || '1',
      responsavel: account?.value || 'PESSOAL',
      adiarOrdenacaoFinal: 'true'
    };

    if (
      !params.data ||
      !params.descricao.trim() ||
      Number(params.valorTotal) <= 0 ||
      !params.refCartao
    ) {
      toast('Preencha data, descrição, valor e cartão.', 'error');
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
      }

      if (typeof resetExpenseExtras === 'function') {
        resetExpenseExtras();
      }

      setTimeout(function () {
        call(
          'organizarDespesas',
          { token: state.token },
          false
        ).catch(function (error) {
          toast(
            'A despesa foi gravada, mas a organização automática falhou: ' +
              error.message,
            'error'
          );
        });
      }, 0);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  async function saveCalendarFast(event) {
    stopOriginal(event);

    const button = element('calendarEntrySave');
    const typeInput = element('calendarEntryType');
    const dateInput = element('calendarEntryDate');

    const type = String(typeInput?.value || '')
      .replace(/\s+/g, ' ')
      .trim();

    const date = dateInput?.value || '';

    if (!type || !date) {
      toast('Informe o tipo e a data.', 'error');
      return;
    }

    const title = element('calendarEntryTitle');
    const rowMatch = String(title?.textContent || '')
      .match(/linha\s+(\d+)/i);

    const editingRow = rowMatch ? Number(rowMatch[1]) : 0;
    const action = editingRow
      ? 'calendarUpdate'
      : 'calendarSave';

    const params = {
      token: state.token,
      tipo: type,
      data: date
    };

    if (editingRow) {
      params.linha = editingRow;
    }

    const originalText = button.textContent;
    let completed = false;

    button.disabled = true;
    button.textContent = editingRow
      ? 'Salvando...'
      : 'Gravando...';

    try {
      const result = await call(action, params, false);
      toast(
        result.msg ||
          (
            editingRow
              ? 'Registro do Calendário atualizado.'
              : 'Registro do Calendário gravado.'
          )
      );

      typeInput.value = '';
      dateInput.value = typeof localIso === 'function'
        ? localIso()
        : '';

      if (title) title.textContent = 'Novo registro';
      button.textContent = 'Gravar';

      const clearButton = element('calendarEntryClear');
      if (clearButton) clearButton.textContent = 'Limpar';

      completed = true;
      backgroundRefresh('viewCalendar');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = completed
        ? 'Gravar'
        : originalText;
    }
  }

  async function saveJuniorFast(event) {
    stopOriginal(event);

    const button = element('juniorSave');
    const rawValue = String(element('juniorValue')?.value || '')
      .replace(/R\$/gi, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

    const value = Number(rawValue);

    const params = {
      token: state.token,
      data: element('juniorDate')?.value || '',
      tipo: element('juniorType')?.value || '',
      descricao: element('juniorDescription')?.value || '',
      valor: Number.isFinite(value) ? value.toFixed(2) : ''
    };

    if (
      !params.data ||
      !params.descricao.trim() ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      toast('Preencha data, descrição e valor.', 'error');
      return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Gravando...';

    try {
      const result = await call('juniorSave', params, false);

      element('juniorDate').value =
        typeof localIso === 'function' ? localIso() : '';
      element('juniorType').value = 'RECEBIDO';
      element('juniorDescription').value = '';
      element('juniorValue').value = '';

      toast(result.msg || 'Movimento registrado.');
      backgroundRefresh('viewJunior');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  async function saveIncomeFast(event) {
    stopOriginal(event);

    const button = element('saveIncome');
    const params = {
      token: state.token,
      data: element('incomeDate')?.value || '',
      salario: element('incomeSalary')?.value || '',
      outros: element('incomeOthers')?.value || '',
      aluguel: element('incomeRent')?.value || '',
      restituicao: element('incomeRefund')?.value || '',
      rendAplic: element('incomeReturn')?.value || ''
    };

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Gravando...';

    try {
      const result = await call('invrecSave', params, false);
      toast(result.msg || 'Registro gravado.');

      [
        'incomeSalary',
        'incomeOthers',
        'incomeRent',
        'incomeRefund',
        'incomeReturn'
      ].forEach(function (id) {
        const input = element(id);
        if (input) input.value = '';
      });
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  async function registerBusUseFast(event) {
    stopOriginal(event);

    const button = element('registerUse');
    const input = element('busQuantity');
    const raw = String(input?.value || '').trim();

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

      input.value = '1';
      toast(result.msg || 'Passagens registradas.');
      backgroundRefresh('viewBus');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  async function registerBusRechargeFast(event) {
    stopOriginal(event);

    const button = element('registerRecharge');
    const input = element('busRecharge');
    const value = Number(
      String(input?.value || '').replace(',', '.')
    );

    if (!Number.isFinite(value) || value <= 0) {
      toast('Informe um valor de recarga válido.', 'error');
      return;
    }

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

      input.value = '';
      toast(result.msg || 'Recarga registrada.');
      backgroundRefresh('viewBus');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function install() {
    bindCapture('saveExpense', saveExpenseFast);
    bindCapture('calendarEntrySave', saveCalendarFast);
    bindCapture('juniorSave', saveJuniorFast);
    bindCapture('saveIncome', saveIncomeFast);
    bindCapture('registerUse', registerBusUseFast);
    bindCapture('registerRecharge', registerBusRechargeFast);
  }

  install();

  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
