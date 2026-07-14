'use strict';

(function () {
  function canInsertCalendar() {
    return state.role === 'admin' || state.role === 'editor';
  }

  function firstUpper(value) {
    const text = String(value || '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) return '';

    return text.charAt(0).toLocaleUpperCase('pt-BR') +
      text.slice(1);
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
        '<input id="calendarEntryType" ',
        'list="calendarEntryTypeList" ',
        'maxlength="220" ',
        'placeholder="Selecione ou digite um novo tipo" ',
        'autocomplete="off">',
        '<datalist id="calendarEntryTypeList"></datalist>',
        '<p class="calendar-entry-hint">',
        'A lista é carregada da coluna K. ',
        'Também é possível digitar um novo tipo.',
        '</p>',
        '</div>',
        '<div class="col-3">',
        '<label for="calendarEntryDate">',
        'Data da última troca',
        '</label>',
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

      document
        .getElementById('calendarEntryType')
        .addEventListener('blur', function (event) {
          event.target.value = firstUpper(event.target.value);
        });
    }

    return panel;
  }

  function populateCalendarTypes(options) {
    const input = document.getElementById('calendarEntryType');
    const list = document.getElementById('calendarEntryTypeList');

    if (!input || !list) return;

    const current = input.value;
    list.innerHTML = '';

    (options || []).forEach(function (value) {
      const normalized = firstUpper(value);

      if (!normalized) return;

      const option = document.createElement('option');
      option.value = normalized;
      list.appendChild(option);
    });

    input.value = current;
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

    rows[0].forEach(function (value, index) {
      const th = document.createElement('th');
      th.textContent = value;

      if (index >= 2 && index <= 6) {
        th.classList.add('calendar-centered-column');
      }

      headerRow.appendChild(th);
    });

    head.appendChild(headerRow);

    rows.slice(1).forEach(function (values) {
      const row = document.createElement('tr');

      values.forEach(function (value, index) {
        const cell = document.createElement('td');
        cell.textContent = value == null ? '' : value;

        if (index >= 2 && index <= 6) {
          cell.classList.add('calendar-centered-column');
        }

        row.appendChild(cell);
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
    const typeInput = document.getElementById(
      'calendarEntryType'
    );

    const type = firstUpper(typeInput.value);

    const date = document.getElementById(
      'calendarEntryDate'
    ).value;

    typeInput.value = type;

    if (!type || !date) {
      toast(
        'Informe o tipo e a data.',
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
