'use strict';

(function () {
  const $id = id => document.getElementById(id);
  const numberPt = value => {
    if (typeof value === 'number') return value;
    const raw = String(value ?? '').trim().replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  };
  const moneyPt = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  function dateIso(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function normalizeDate(value) {
    const text = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : text;
  }

  function refundKey(item) {
    const basis = [item.data || '', item.descricao || '', item.cartao || '', item.ref || '', Number(item.valor || 0).toFixed(2)].join('|');
    let hash = 2166136261;
    for (let i = 0; i < basis.length; i += 1) {
      hash ^= basis.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36).toUpperCase();
  }

  function installTabsAndViews() {
    if (!Array.isArray(window.tabs) && typeof tabs === 'undefined') return false;
    const tabsRef = typeof tabs !== 'undefined' ? tabs : window.tabs;
    if (!tabsRef.some(item => item.id === 'viewRefunds')) {
      tabsRef.splice(2, 0, { id: 'viewRefunds', label: 'Estorno / Devolução', roles: ['admin', 'editor'] });
    }
    if (!tabsRef.some(item => item.id === 'viewCalculator')) {
      tabsRef.push({ id: 'viewCalculator', label: 'Calculadora', roles: ['admin', 'editor', 'viewer'] });
    }

    const privateView = $id('privateView');
    if (!privateView) return false;

    if (!$id('viewRefunds')) {
      const article = document.createElement('article');
      article.className = 'card view';
      article.id = 'viewRefunds';
      article.hidden = true;
      article.innerHTML = `
        <h3>Estorno / Devolução</h3>
        <div class="grid">
          <div class="col-3"><label for="refundStart">Compras desde</label><input type="date" id="refundStart"></div>
          <div class="col-3"><label for="refundEnd">Até</label><input type="date" id="refundEnd"></div>
          <div class="col-3"><label for="refundSearch">Pesquisar</label><input id="refundSearch" placeholder="Descrição, cartão ou valor"></div>
          <div class="col-3 actions"><button class="btn primary" id="refundLoad">Carregar compras</button></div>
        </div>
        <div class="finance-tools-summary">
          <div class="finance-tools-kpi"><span>Compras encontradas</span><strong id="refundCount">0</strong></div>
          <div class="finance-tools-kpi"><span>Compra selecionada</span><strong id="refundSelectedValue">R$ 0,00</strong></div>
          <div class="finance-tools-kpi"><span>Saldo disponível</span><strong id="refundAvailable">R$ 0,00</strong></div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Descrição</th><th>Cartão</th><th class="right">Valor</th><th></th></tr></thead>
            <tbody id="refundBody"></tbody>
          </table>
        </div>
        <div class="refund-purchase" id="refundForm" hidden>
          <strong id="refundPurchaseTitle"></strong>
          <div class="grid">
            <div class="col-3"><label for="refundDate">Data do estorno</label><input type="date" id="refundDate"></div>
            <div class="col-3"><label for="refundValue">Valor a estornar</label><input type="number" min="0.01" step="0.01" id="refundValue"></div>
            <div class="col-6"><label for="refundReason">Motivo / observação</label><input id="refundReason" maxlength="120" placeholder="Ex.: compra cancelada, produto devolvido"></div>
            <div class="col-12 refund-actions"><button class="btn" id="refundSave">Gravar estorno</button><button class="btn ghost" id="refundClear">Cancelar seleção</button></div>
          </div>
          <p class="muted small">A compra original permanece intacta. O estorno é enviado como novo movimento negativo e identificado pelo código da compra selecionada.</p>
        </div>`;
      privateView.appendChild(article);
    }

    if (!$id('viewCalculator')) {
      const article = document.createElement('article');
      article.className = 'card view';
      article.id = 'viewCalculator';
      article.hidden = true;
      article.innerHTML = `
        <h3>Calculadora</h3>
        <div class="calc-shell">
          <input id="calcDisplay" class="calc-display" inputmode="decimal" value="0" aria-label="Visor da calculadora">
          <div class="calc-grid" id="calcGrid">
            <button class="calc-clear" data-calc="clear">C</button><button data-calc="back">⌫</button><button data-calc="percent">%</button><button class="calc-op" data-calc="/">÷</button>
            <button data-calc="7">7</button><button data-calc="8">8</button><button data-calc="9">9</button><button class="calc-op" data-calc="*">×</button>
            <button data-calc="4">4</button><button data-calc="5">5</button><button data-calc="6">6</button><button class="calc-op" data-calc="-">−</button>
            <button data-calc="1">1</button><button data-calc="2">2</button><button data-calc="3">3</button><button class="calc-op" data-calc="+">+</button>
            <button data-calc="0">0</button><button data-calc=".">,</button><button data-calc="copy">Copiar</button><button class="calc-eq" data-calc="=">=</button>
          </div>
          <div class="calc-note">Funciona somente no navegador e não grava dados na planilha.</div>
        </div>`;
      privateView.appendChild(article);
    }

    return true;
  }

  const refundState = { rows: [], selected: null, estornos: new Map() };

  function cardRefFor(item) {
    const select = $id('expenseCard');
    if (!select) return '';
    const options = Array.from(select.options || []);
    const ref = String(item.ref || '').trim();
    const card = String(item.cartao || '').trim().toLowerCase();
    const exact = options.find(o => o.value === ref);
    if (exact) return exact.value;
    const byText = options.find(o => String(o.textContent || '').toLowerCase().includes(card));
    return byText ? byText.value : '';
  }

  function computeRefunds(rows) {
    const map = new Map();
    rows.forEach(item => {
      const description = String(item.descricao || '');
      const match = description.match(/^ESTORNO\s+\[([A-Z0-9]+)\]/i);
      const value = numberPt(item.valor);
      if (match && value < 0) map.set(match[1].toUpperCase(), (map.get(match[1].toUpperCase()) || 0) + Math.abs(value));
    });
    refundState.estornos = map;
  }

  function availableFor(item) {
    const original = Math.abs(numberPt(item.valor));
    return Math.max(0, original - (refundState.estornos.get(refundKey(item)) || 0));
  }

  function filterPurchases() {
    const q = String($id('refundSearch')?.value || '').trim().toLowerCase();
    return refundState.rows.filter(item => {
      const value = numberPt(item.valor);
      const description = String(item.descricao || '');
      if (value <= 0 || /^ESTORNO\s+\[/i.test(description)) return false;
      if (!q) return true;
      return [item.data, item.descricao, item.cartao, item.ref, String(item.valor)].some(v => String(v || '').toLowerCase().includes(q));
    });
  }

  function renderRefunds() {
    const body = $id('refundBody');
    if (!body) return;
    const purchases = filterPurchases();
    $id('refundCount').textContent = String(purchases.length);
    body.innerHTML = '';
    if (!purchases.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td'); td.colSpan = 5; td.className = 'empty'; td.textContent = 'Nenhuma compra encontrada no período.'; tr.appendChild(td); body.appendChild(tr);
      return;
    }
    purchases.forEach(item => {
      const key = refundKey(item);
      const tr = document.createElement('tr');
      if (refundState.selected && refundKey(refundState.selected) === key) tr.className = 'refund-row-selected';
      [item.data || '', item.descricao || '', item.cartao || ''].forEach(text => { const td = document.createElement('td'); td.textContent = text; tr.appendChild(td); });
      const tdValue = document.createElement('td'); tdValue.className = 'right'; tdValue.textContent = moneyPt(item.valor); tr.appendChild(tdValue);
      const tdAction = document.createElement('td'); const button = document.createElement('button'); button.className = 'btn ghost'; button.textContent = 'Selecionar'; button.addEventListener('click', () => selectRefund(item)); tdAction.appendChild(button); tr.appendChild(tdAction);
      body.appendChild(tr);
    });
  }

  function selectRefund(item) {
    refundState.selected = item;
    const available = availableFor(item);
    $id('refundForm').hidden = false;
    $id('refundDate').value = dateIso(new Date());
    $id('refundValue').value = available > 0 ? available.toFixed(2) : '';
    $id('refundValue').max = available.toFixed(2);
    $id('refundReason').value = '';
    $id('refundPurchaseTitle').textContent = `${item.data || ''} — ${item.descricao || ''} — ${moneyPt(item.valor)}`;
    $id('refundSelectedValue').textContent = moneyPt(item.valor);
    $id('refundAvailable').textContent = moneyPt(available);
    $id('refundSave').disabled = available <= 0;
    renderRefunds();
  }

  function clearRefundSelection() {
    refundState.selected = null;
    if ($id('refundForm')) $id('refundForm').hidden = true;
    if ($id('refundSelectedValue')) $id('refundSelectedValue').textContent = moneyPt(0);
    if ($id('refundAvailable')) $id('refundAvailable').textContent = moneyPt(0);
    renderRefunds();
  }

  async function loadRefundPurchases() {
    const start = $id('refundStart').value;
    const end = $id('refundEnd').value;
    if (!start || !end) return toast('Informe o período das compras.', 'error');
    try {
      const result = await call('listDespesas', { token: state.token, inicio: start, fim: end });
      refundState.rows = Array.isArray(result.rows) ? result.rows : [];
      computeRefunds(refundState.rows);
      clearRefundSelection();
      renderRefunds();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function saveRefund() {
    const item = refundState.selected;
    if (!item) return toast('Selecione a compra que será estornada.', 'error');
    const available = availableFor(item);
    const value = numberPt($id('refundValue').value);
    const date = $id('refundDate').value;
    const reason = String($id('refundReason').value || '').trim();
    const cardRef = cardRefFor(item);
    if (!date || value <= 0) return toast('Informe a data e o valor do estorno.', 'error');
    if (value > available + 0.0001) return toast(`O máximo disponível para esta compra é ${moneyPt(available)}.`, 'error');
    if (!cardRef) return toast('Não foi possível identificar o cartão da compra original.', 'error');

    const key = refundKey(item);
    const description = `ESTORNO [${key}] ${item.descricao || 'Compra'}${reason ? ` — ${reason}` : ''}`.slice(0, 220);
    const button = $id('refundSave');
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = 'Gravando...';
    try {
      const result = await call('saveDespesa', {
        token: state.token,
        data: date,
        descricao: description,
        valorTotal: (-Math.abs(value)).toFixed(2),
        refCartao: cardRef,
        nParcelas: '1',
        divididoSN: 'false',
        modoData: 'mesmo_dia',
        tipoMovimento: 'ESTORNO',
        compraOrigem: key,
        adiarOrdenacaoFinal: 'true'
      }, false);
      toast(result.msg || 'Estorno gravado.');
      await loadRefundPurchases();
      if (typeof call === 'function') {
        setTimeout(() => call('organizarDespesas', { token: state.token }, false).catch(() => {}), 1800);
      }
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  let calcExpr = '';
  function calcDisplay(text) { if ($id('calcDisplay')) $id('calcDisplay').value = text || '0'; }
  function safeEvaluate(expr) {
    if (!expr || !/^[0-9+\-*/().\s]+$/.test(expr)) throw new Error('Expressão inválida');
    return Function(`"use strict"; return (${expr})`)();
  }
  function calcAction(action) {
    try {
      if (action === 'clear') { calcExpr = ''; calcDisplay('0'); return; }
      if (action === 'back') { calcExpr = calcExpr.slice(0, -1); calcDisplay(calcExpr || '0'); return; }
      if (action === 'percent') { const value = Number(safeEvaluate(calcExpr || '0')) / 100; calcExpr = String(value); calcDisplay(calcExpr); return; }
      if (action === '=') { const value = safeEvaluate(calcExpr || '0'); if (!Number.isFinite(value)) throw new Error('Resultado inválido'); calcExpr = String(value); calcDisplay(calcExpr.replace('.', ',')); return; }
      if (action === 'copy') { navigator.clipboard?.writeText(String($id('calcDisplay').value || '0')); toast('Resultado copiado.'); return; }
      calcExpr += action;
      calcDisplay(calcExpr.replace(/\*/g, '×').replace(/\//g, '÷').replace(/\./g, ','));
    } catch (_) {
      calcExpr = '';
      calcDisplay('Erro');
    }
  }

  function bind() {
    const load = $id('refundLoad'); if (load && !load.dataset.bound) { load.dataset.bound = '1'; load.addEventListener('click', loadRefundPurchases); }
    const search = $id('refundSearch'); if (search && !search.dataset.bound) { search.dataset.bound = '1'; search.addEventListener('input', renderRefunds); }
    const save = $id('refundSave'); if (save && !save.dataset.bound) { save.dataset.bound = '1'; save.addEventListener('click', saveRefund); }
    const clear = $id('refundClear'); if (clear && !clear.dataset.bound) { clear.dataset.bound = '1'; clear.addEventListener('click', clearRefundSelection); }
    const grid = $id('calcGrid'); if (grid && !grid.dataset.bound) { grid.dataset.bound = '1'; grid.addEventListener('click', event => { const button = event.target.closest('[data-calc]'); if (button) calcAction(button.dataset.calc); }); }
  }

  function initDefaults() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    if ($id('refundStart') && !$id('refundStart').value) $id('refundStart').value = dateIso(start);
    if ($id('refundEnd') && !$id('refundEnd').value) $id('refundEnd').value = dateIso(now);
    if ($id('refundDate') && !$id('refundDate').value) $id('refundDate').value = dateIso(now);
  }

  function install() {
    if (!installTabsAndViews()) return;
    bind();
    initDefaults();
    if (typeof renderTabs === 'function' && state?.token) renderTabs();
  }

  install();
  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
