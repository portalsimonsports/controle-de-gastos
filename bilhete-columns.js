'use strict';

(function () {
  const cache = {
    buList: [],
    bfList: []
  };

  function moneyOrDash(value) {
    return value === null || value === undefined || value === ''
      ? '—'
      : money(value);
  }

  function setHeaders(table) {
    if (!table) return;

    const headerRow = table.querySelector('thead tr');

    if (!headerRow) return;

    headerRow.innerHTML = [
      '<th>Data</th>',
      '<th>Tipo</th>',
      '<th>Total</th>',
      '<th>Hora</th>',
      '<th>Valor unitário</th>',
      '<th>Recarga</th>',
      '<th>Ações</th>'
    ].join('');
  }

  function patchRows(viewSelector, bodyId, rows) {
    const table = document.querySelector(viewSelector + ' table');
    const body = document.getElementById(bodyId);

    if (!table || !body) return;

    setHeaders(table);

    const renderedRows = Array.from(body.querySelectorAll('tr'));

    if (
      renderedRows.length === 1 &&
      renderedRows[0].children.length === 1 &&
      renderedRows[0].children[0].classList.contains('empty')
    ) {
      renderedRows[0].children[0].colSpan = 7;
      return;
    }

    renderedRows.forEach(function (row, index) {
      const item = rows[index];

      if (!item) return;

      let cells = Array.from(row.children);

      if (cells.length === 6) {
        const hourCell = document.createElement('td');
        hourCell.textContent = item.hora || '—';
        row.insertBefore(hourCell, cells[3]);
        cells = Array.from(row.children);
      }

      if (cells.length < 7) return;

      cells[0].textContent = item.data || '—';
      cells[1].textContent = item.tipo || '—';
      cells[2].textContent =
        item.quantidade === null ||
        item.quantidade === undefined
          ? '—'
          : String(item.quantidade);
      cells[3].textContent = item.hora || '—';
      cells[4].textContent = moneyOrDash(item.valorUnitario);
      cells[5].textContent = moneyOrDash(item.recarga);

      for (let i = 0; i < 6; i++) {
        cells[i].classList.add('right');
      }
    });
  }

  function patchAll() {
    patchRows('#viewBus', 'busBody', cache.buList);
    patchRows(
      '#viewFidelity',
      'fidelityHistoryBody',
      cache.bfList
    );
  }

  function installCallWrapper() {
    if (
      typeof window.call !== 'function' ||
      window.call.__bilheteColumnsWrapped
    ) {
      return;
    }

    const originalCall = window.call;

    async function wrappedCall(action, params, showLoading) {
      const result = await originalCall(
        action,
        params,
        showLoading
      );

      if (
        (action === 'buList' || action === 'bfList') &&
        result &&
        Array.isArray(result.rows)
      ) {
        cache[action] = result.rows.slice();
        setTimeout(patchAll, 0);
      }

      return result;
    }

    wrappedCall.__bilheteColumnsWrapped = true;
    window.call = wrappedCall;
  }

  function start() {
    installCallWrapper();
    patchAll();

    document.addEventListener('click', function (event) {
      if (event.target.closest('.tab')) {
        setTimeout(function () {
          installCallWrapper();
          patchAll();
        }, 0);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {
      once: true
    });
  } else {
    start();
  }
})();
