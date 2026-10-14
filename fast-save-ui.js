'use strict';

(function () {
  let expenseOrganizeTimer = null;
  window.__cgExpenseSaveLock = window.__cgExpenseSaveLock || false;

  function setButtonState(button, state, label) {
    if (!button) return;
    button.classList.remove('saving', 'saved', 'save-error');
    if (state) button.classList.add(state);
    if (label) button.textContent = label;
  }

  function element(id) {
    return document.getElementById(id);
  }

  function bindCapture(id, handler) {
    const target = element(id);
    if (!target || target.dataset.fastSaveBound === '1') return;
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
          Promise.resolve(showView(viewId)).catch(console.error);
        }
      } catch (error) {
        console.error(error);
      }
    }, 0);
  }

  function scheduleExpenseOrganization() {
    clearTimeout(expenseOrganizeTimer);
    expenseOrganizeTimer = setTimeout(function () {
      if (!state || !state.token || typeof call !== 'function') return;
      call('organizarDespesas', { token: state.token }, false).catch(function (error) {
        console.error('Falha ao organizar despesas em segundo plano:', error);
      });
    }, 8000);
  }

  function parseExpenseMoney(raw) {
    const text = String(raw || '').replace(/R\\$/gi, '').replace(/\\s/g, '');
    if (!text) return NaN;
    const comma = text.lastIndexOf(',');
    const dot = text.lastIndexOf('.');
    let normalized = text;
    if (comma >= 0 && (comma > dot)) normalized = text.replace(/\\./g, '').replace(',', '.');
    else if (dot >= 0 && comma >= 0) normalized = text.replace(/,/g, '');
    else if (comma >= 0) normalized = text.replace(',', '.');
    const value = Number(normalized);
    return Number.isFinite(value) ? value : NaN;
  }

  function expenseFeedback() {
    let status = element('cgExpenseSaveFeedback');
    if (status) return status;
    const button = element('saveExpense');
    if (!button) return null;
    status = document.createElement('div');
    status.id = 'cgExpenseSaveFeedback';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.style.cssText = 'display:none;width:100%;margin:12px 0;padding:14px;border-radius:12px;text-align:center;font-weight:700;line-height:1.45;';
    const parent = button.closest('.actions') || button.parentElement;
    parent.insertAdjacentElement('afterend', status);
    return status;
  }

  function setExpenseFeedback(message, kind) {
    const box = expenseFeedback();
    if (!box) return;
    box.textContent = message;
    box.style.display = 'block';
    box.style.color = kind === 'error' ? '#ffb6b6' : kind === 'success' ? '#abf2c6' : '#d8e5ff';
    box.style.background = kind === 'error' ? '#482128' : kind === 'success' ? '#123a2a' : '#172b49';
    box.style.border = '1px solid ' + (kind === 'error' ? '#ab5364' : kind === 'success' ? '#28865c' : '#496d9a');
  }

  async function inspectExpenseAfterFailure(params) {
    // Apenas leitura. Nunca reenvia saveDespesa após falha de comunicação.
    const result = await call('listDespesas', {
      token: params.token,
      inicio: params.data,
      fim: params.data
    }, false);
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    const targetValue = Number(params.valorTotal);
    const normalize = value => String(value || '').trim().replace(/\\s+/g, ' ').toLocaleUpperCase('pt-BR');
    const targetName = normalize(params.descricao);
    return rows.filter(row => {
      const amount = typeof row.valor === 'number' ? row.valor : parseExpenseMoney(row.valor);
      return normalize(row.descricao) === targetName
        && Number.isFinite(amount)
        && Math.abs(amount - targetValue) < 0.005;
    }).length;
  }

  async function saveExpenseFast(event) {
    stopOriginal(event);
    const button = element('saveExpense');
    if (!button || button.dataset.saving === '1' || window.__cgExpenseSaveLock) return;
    const value = parseExpenseMoney(element('expenseValue')?.value);
    const params = {
      token: state.token,
      data: element('expenseDate')?.value || '',
      descricao: element('expenseDescription')?.value || '',
      valorTotal: Number.isFinite(value) ? value.toFixed(2) : '',
      refCartao: element('expenseCard')?.value || '',
      nParcelas: element('expenseInstallments')?.value || '1',
      divididoSN: element('expenseDivided')?.value || 'false',
      modoData: element('expenseMode')?.value || 'mesmo_dia',
      recorrenteSN: element('expenseRecurring')?.value || 'false',
      intervaloMeses: element('expenseRecurrenceInterval')?.value || '1',
      repeticoes: element('expenseRecurrenceCount')?.value || '1',
      responsavel: element('expenseAccount')?.value || 'PESSOAL',
      adiarOrdenacaoFinal: 'true'
    };
    if (!params.data || !params.descricao.trim() || !Number.isFinite(value) || value <= 0 || !params.refCartao) {
      setExpenseFeedback('Preencha data, descrição, valor e cartão.', 'error');
      return;
    }
    if (params.recorrenteSN === 'true' && (!Number.isInteger(Number(params.intervaloMeses)) || Number(params.intervaloMeses) < 1 || !Number.isInteger(Number(params.repeticoes)) || Number(params.repeticoes) < 1)) {
      setExpenseFeedback('Confira o intervalo e a quantidade de repetições.', 'error');
      return;
    }
    const originalText = button.textContent;
    const started = performance.now();
    window.__cgExpenseSaveLock = true;
    button.dataset.saving = '1';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    setButtonState(button, 'saving', '⏳ Gravando...');
    setExpenseFeedback('Enviando despesa para a planilha. Aguarde a confirmação.', 'pending');
    try {
      const result = await call('saveDespesa', params, false);
      if (!result || result.ok === false) throw new Error(result?.msg || 'Gravação não confirmada.');
      if (typeof clearExpense === 'function') clearExpense();
      else {
        ['expenseDescription', 'expenseValue'].forEach(id => { const el = element(id); if (el) el.value = ''; });
        const money = element('expenseValue');
        if (money) { money.dataset.moneyDigits = ''; money.dataset.moneyMode = 'auto'; }
      }
      if (typeof resetExpenseExtras === 'function') resetExpenseExtras();
      const elapsed = ((performance.now() - started) / 1000).toFixed(1).replace('.', ',');
      setExpenseFeedback('✓ DESPESA GRAVADA NA PLANILHA! Campos limpos. Tempo de resposta: ' + elapsed + ' s.', 'success');
      setButtonState(button, 'saved', '✓ Gravado');
      // A ordenação automática concorria com novas gravações; executar apenas por rotina dedicada.
    } catch (error) {
      const errorMessage = String(error?.message || 'Falha de comunicação');
      setButtonState(button, 'saving', 'Verificando...');
      setExpenseFeedback('O servidor não confirmou a solicitação. Consultando a planilha sem reenviar a despesa...', 'pending');
      try {
        const matches = await inspectExpenseAfterFailure(params);
        if (matches > 0) {
          setExpenseFeedback('ATENÇÃO: foi encontrado ' + matches + ' lançamento(s) com a mesma data, descrição e valor. A resposta da gravação falhou; confira o registro na Consulta antes de tentar novamente. Seus campos foram preservados.', 'pending');
          setButtonState(button, 'save-error', 'Conferir registro');
        } else {
          setExpenseFeedback('Gravação não confirmada. A consulta não encontrou registro correspondente; como a execução pode ainda estar terminando, confira novamente antes de reenviar. Dados preservados. ' + errorMessage, 'error');
          setButtonState(button, 'save-error', 'Não confirmado');
        }
      } catch (verificationError) {
        setExpenseFeedback('Sem confirmação do servidor e sem resposta da consulta. Não tente gravar outra vez antes de conferir na aba Consulta. Dados preservados. ' + errorMessage, 'error');
        setButtonState(button, 'save-error', 'Conferir planilha');
      }
    } finally {
      delete button.dataset.saving;
      window.__cgExpenseSaveLock = false;
      button.removeAttribute('aria-busy');
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  async function saveCalendarFast(event) {
    stopOriginal(event);
    const button = element('calendarEntrySave');
    const typeInput = element('calendarEntryType');
    const dateInput = element('calendarEntryDate');
    const type = String(typeInput?.value || '').replace(/\s+/g, ' ').trim();
    const date = dateInput?.value || '';
    if (!type || !date) return toast('Informe o tipo e a data.', 'error');

    const title = element('calendarEntryTitle');
    const rowMatch = String(title?.textContent || '').match(/linha\s+(\d+)/i);
    const editingRow = rowMatch ? Number(rowMatch[1]) : 0;
    const action = editingRow ? 'calendarUpdate' : 'calendarSave';
    const params = { token: state.token, tipo: type, data: date };
    if (editingRow) params.linha = editingRow;

    const originalText = button.textContent;
    let completed = false;
    button.disabled = true;
    button.textContent = editingRow ? 'Salvando...' : 'Gravando...';

    try {
      const result = await call(action, params, false);
      toast(result.msg || (editingRow ? 'Registro do Calendário atualizado.' : 'Registro do Calendário gravado.'));
      typeInput.value = '';
      dateInput.value = typeof localIso === 'function' ? localIso() : '';
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
      button.textContent = completed ? 'Gravar' : originalText;
    }
  }

  async function saveJuniorFast(event) {
    stopOriginal(event);
    const button = element('juniorSave');
    const rawValue = String(element('juniorValue')?.value || '').replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const value = Number(rawValue);
    const params = {
      token: state.token,
      data: element('juniorDate')?.value || '',
      tipo: element('juniorType')?.value || '',
      descricao: element('juniorDescription')?.value || '',
      valor: Number.isFinite(value) ? value.toFixed(2) : ''
    };
    if (!params.data || !params.descricao.trim() || !Number.isFinite(value) || value <= 0) return toast('Preencha data, descrição e valor.', 'error');

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Gravando...';
    try {
      const result = await call('juniorSave', params, false);
      element('juniorDate').value = typeof localIso === 'function' ? localIso() : '';
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
      ['incomeSalary', 'incomeOthers', 'incomeRent', 'incomeRefund', 'incomeReturn'].forEach(function (id) {
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
    if (!/^\d+$/.test(raw)) return toast('Informe uma quantidade inteira igual ou maior que zero.', 'error');
    const quantity = Number(raw);
    if (quantity < 0 || quantity > 999) return toast('A quantidade deve estar entre 0 e 999.', 'error');

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Registrando...';
    try {
      const result = await call('buUse', { token: state.token, qtd: quantity }, false);
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
    const value = Number(String(input?.value || '').replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return toast('Informe um valor de recarga válido.', 'error');

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Registrando...';
    try {
      const result = await call('buRecharge', { token: state.token, valor: value }, false);
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
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
