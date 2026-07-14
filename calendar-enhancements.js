'use strict';

(function () {
  let editingCalendarRow = 0;
  let calendarRecordMap = {};

  function canManageCalendar() {
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
        '<h4 id="calendarEntryTitle">Novo registro</h4>',
        '<div class="calendar-entry-row">',
        '<div class="calendar-entry-type">',
        '<label for="calendarEntryType">Tipo</label>',
        '<input id="calendarEntryType" ',
        'list="calendarEntryTypeList" ',
        'maxlength="220" ',
        'placeholder="Selecione ou digite um novo tipo" ',
        'autocomplete="off">',
        '<datalist id="calendarEntryTypeList"></datalist>',
        '</div>',
        '<div class="calendar-entry-date">',
        '<label for="calendarEntryDate">',
        'Data da última troca',
        '</label>',
        '<input type="date" id="calendarEntryDate">',
        '</div>',
        '<div class="calendar-entry-actions">',
        '<button type="button" class="btn" ',
        'id="calendarEntrySave">Gravar</button>',
        '<button type="button" class="btn ghost" ',
        'id="calendarEntryClear">Limpar</button>',
        '</div>',
        '</div>',
        '<p class="calendar-entry-hint">',
        'A lista é carregada da coluna K. ',
        'Também é possível digitar um novo tipo.',
        '</p>'
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

  function setCalendarEditMode(record) {
    editingCalendarRow = record ? Number(record.linha) : 0;

    const title = document.getElementById('calendarEntryTitle');
    const saveButton = document.getElementById('calendarEntrySave');
    const clearButton = document.getElementById('calendarEntryClear');

    if (editingCalendarRow) {
      title.textContent =
        'Editar registro — linha ' + editingCalendarRow;
      saveButton.textContent = 'Salvar';
      clearButton.textContent = 'Cancelar';
    } else {
      title.textContent = 'Novo registro';
      saveButton.textContent = 'Gravar';
      clearButton.textContent = 'Limpar';
    }
  }

  function clearCalendarEntry() {
    const type = document.getElementById('calendarEntryType');
    const date = document.getElementById('calendarEntryDate');

    if (type) type.value = '';
    if (date) date.value = localIso();

    setCalendarEditMode(null);
  }

  function openCalendarEditor(record) {
    const panel = ensureCalendarEntryPanel();

    document.getElementById('calendarEntryType').value =
      record.tipo || '';

    document.getElementById('calendarEntryDate').value =
      record.dataIso || '';

    setCalendarEditMode(record);

    panel.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    setTimeout(function () {
      document.getElementById('calendarEntryType').focus();
    }, 250);
  }

  function createCalendarActionButton(
    label,
    className,
    handler
  ) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = className;
    button.addEventListener('click', handler);
    return button;
  }

  function appendCalendarActions(row, record) {
    const cell = document.createElement('td');
    cell.className = 'calendar-actions-cell';

    if (record) {
      const actions = document.createElement('div');
      actions.className = 'calendar-row-actions';

      actions.appendChild(
        createCalendarActionButton(
          'Editar',
          'calendar-action-btn calendar-edit-btn',
          function () {
            openCalendarEditor(record);
          }
        )
      );

      actions.appendChild(
        createCalendarActionButton(
          'Excluir',
          'calendar-action-btn calendar-delete-btn',
          function () {
            deleteCalendarEntry(record);
          }
        )
      );

      cell.appendChild(actions);
    }

    row.appendChild(cell);
  }

  function renderCalendarResult(result) {
    document.getElementById('calendarTitle').textContent =
      result.title || 'Calendário';

    const head = document.getElementById('calendarHead');
    const body = document.getElementById('calendarBody');

    head.innerHTML = '';
    body.innerHTML = '';

    const rows = Array.isArray(result.rows) ? result.rows : [];
    const records = Array.isArray(result.registros)
      ? result.registros
      : [];

    const showActions =
      canManageCalendar() &&
      result.permiteEditar !== false;

    calendarRecordMap = {};

    records.forEach(function (record) {
      calendarRecordMap[String(record.linha)] = record;
    });

    if (!rows.length) {
      emptyRow(body, showActions ? 8 : 7);
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

    if (showActions) {
      const actionTopHeader = document.createElement('th');
      actionTopHeader.textContent = '';
      actionTopHeader.className = 'calendar-actions-cell';
      headerRow.appendChild(actionTopHeader);
    }

    head.appendChild(headerRow);

    rows.slice(1).forEach(function (values, index) {
      const sheetRow = index + 2;
      const record = calendarRecordMap[String(sheetRow)];
      const row = document.createElement('tr');

      values.forEach(function (value, columnIndex) {
        const cell = document.createElement('td');
        cell.textContent = value == null ? '' : value;

        if (columnIndex >= 2 && columnIndex <= 6) {
          cell.classList.add('calendar-centered-column');
        }

        if (sheetRow === 2) {
          cell.classList.add('calendar-data-header');
        }

        row.appendChild(cell);
      });

      if (showActions) {
        if (sheetRow === 2) {
          const headerCell = document.createElement('td');
          headerCell.textContent = 'Ações';
          headerCell.className =
            'calendar-actions-cell calendar-data-header';
          row.appendChild(headerCell);
        } else {
          appendCalendarActions(row, record);
        }
      }

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
          canManageCalendar() &&
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
      toast('Informe o tipo e a data.', 'error');
      return;
    }

    const button = document.getElementById(
      'calendarEntrySave'
    );

    button.disabled = true;
    button.textContent = editingCalendarRow
      ? 'Salvando...'
      : 'Gravando...';

    try {
      const action = editingCalendarRow
        ? 'calendarUpdate'
        : 'calendarSave';

      const params = {
        token: state.token,
        tipo: type,
        data: date
      };

      if (editingCalendarRow) {
        params.linha = editingCalendarRow;
      }

      const result = await call(action, params, false);

      toast(
        result.msg ||
        (
          editingCalendarRow
            ? 'Registro do Calendário atualizado.'
            : 'Registro do Calendário gravado.'
        )
      );

      clearCalendarEntry();
      await enhancedLoadCalendar();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = editingCalendarRow
        ? 'Salvar'
        : 'Gravar';
    }
  }

  async function deleteCalendarEntry(record) {
    const confirmed = window.confirm(
      'Excluir este registro do Calendário?\n\n' +
      record.tipo +
      '\nData: ' +
      record.data +
      '\nLinha: ' +
      record.linha +
      '\n\nA linha será esvaziada sem deslocar os demais registros.'
    );

    if (!confirmed) return;

    try {
      const result = await call(
        'calendarDelete',
        {
          token: state.token,
          linha: record.linha
        },
        false
      );

      toast(
        result.msg ||
        'Registro do Calendário excluído.'
      );

      if (editingCalendarRow === Number(record.linha)) {
        clearCalendarEntry();
      }

      await enhancedLoadCalendar();
    } catch (error) {
      toast(error.message, 'error');
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
