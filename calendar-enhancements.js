'use strict';

(function () {
  function canInsertCalendar() {
    return state.role === 'admin' || state.role === 'editor';
  }

  function ensureCalendarEntryPanel() {
    const view = document.getElementById('viewCalendar');
    if (!view) return null;

    let panel = document.getElementById('calendarEntryPanel');

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'calendarEntryPanel';
      panel.className = 'calendar-entry-panel';

      panel.innerHTML = [
        '<h4>Novo registro</h4>',
        '<div class="grid">',
        '<div class="col-6">',
        '<label for="calendarEntryType">Tipo</label>',
        '<select id="calendarEntryType"></select>',
        '</div>',
        '<div class="col-3">',
        '<label for="calendarEntryDate">Data da última troca</label>',
        '<input type="date" id="calendarEntryDate">',
        '</div>',
        '<div class="col-3 actions">',
        '<button type="button" class="btn" ',
        'id="calendarEntrySave">Gravar</button>',
        '<button type="button" class="btn ghost" ',
        'id="calendarEntryClear">Limpar</button>',
        '</div>',
        '</div>'
      ].join('');

      const tableWrap = view.querySelector('.table-wrap');
      view.insertBefore(panel, tableWrap);

      document
        .getElementById('calendarEntrySave')
        .addEventListener('click', saveCalendarEntry);

      document
        .getElementById('calendarEntryClear')
        .addEventListener('click', clearCalendarEntry);
    }

    return panel;
  }

  function populateCalendarTypes(options) {
    const select = document.getElementById('calendarEntryType');
    if (!select) return;

    const current = select.value;
    select.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecione';
    select.appendChild(placeholder);

    (options || []).forEach(function (value) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;

      if (value === current) {
        option.selected = true;
      }

      select.appendChild(option);
    });
  }

  function clearCalendarEntry() {
    const type = document.getElementById('calendarEntryType');
    const date = document.getElementById('calendarEntryDate');

    if (type) type.value = '';
    if (date) date.value = localIso();
  }

  function renderCalendarResult(result) {
    document.getElementById('calendarTitle').textContent =
      result.title || 'Calendário';

    const head = document.getElementById('calendarHead');
    const body = document.getElementById('calendarBody');

    head.innerHTML = '';
    body.innerHTML = '';

    const rows = Array.isArray(result.rows) ? result.rows : [];

    if (!rows.length) {
      emptyRow(body, 1);
      return;
    }

    const headerRow = document.createElement('tr');

    rows[0].forEach(function (value) {
      const th = document.createElement('th');
      th.textContent = value;
      headerRow.appendChild(th);
    });

    head.appendChild(headerRow);

    rows.slice(1).forEach(function (values) {
      const row = document.createElement('tr');

      values.forEach(function (value) {
        appendCell(row, value);
      });

      body.appendChild(row);
    });
  }

  async function enhancedLoadCalendar() {
    try {
      const result = await call(
        'calendarGet',
        { token: state.token },
        false
      );

      renderCalendarResult(result);

      const panel = ensureCalendarEntryPanel();

      if (panel) {
        panel.hidden = !(
          canInsertCalendar() &&
          result.permiteInserir !== false
        );

        if (!panel.hidden) {
          populateCalendarTypes(result.opcoesTipo || []);

          const date = document.getElementById(
            'calendarEntryDate'
          );

          if (date && !date.value) {
            date.value = localIso();
          }
        }
      }
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function saveCalendarEntry() {
    const type = document.getElementById(
      'calendarEntryType'
    ).value;

    const date = document.getElementById(
      'calendarEntryDate'
    ).value;

    if (!type || !date) {
      toast(
        'Selecione o tipo e informe a data.',
        'error'
      );
      return;
    }

    const button = document.getElementById(
      'calendarEntrySave'
    );

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Gravando...';

    try {
      const result = await call(
        'calendarSave',
        {
          token: state.token,
          tipo: type,
          data: date
        },
        false
      );

      toast(
        result.msg ||
        'Registro do Calendário gravado.'
      );

      clearCalendarEntry();
      await enhancedLoadCalendar();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  window.loadCalendar = enhancedLoadCalendar;

  ensureCalendarEntryPanel();

  if (
    state.token &&
    state.activeView === 'viewCalendar'
  ) {
    setTimeout(enhancedLoadCalendar, 0);
  }
})();
