'use strict';

(function () {
  let descriptionsLoaded = false;

  function el(id) {
    return document.getElementById(id);
  }

  function createField(className, id, labelText, control) {
    const field = document.createElement('div');
    field.className = className;
    field.id = id + 'Field';

    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;

    control.id = id;
    field.append(label, control);
    return field;
  }

  async function loadDescriptions() {
    if (descriptionsLoaded) return;

    try {
      const result = await originalCall(
        'getDescricoesDespesas',
        { token: state.token },
        false
      );

      const list = el('queryDescriptionList');
      if (!list) return;

      list.innerHTML = '';
      (result.rows || []).forEach(function (value) {
        const option = document.createElement('option');
        option.value = value;
        list.appendChild(option);
      });

      descriptionsLoaded = true;
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function updateMode() {
    const mode = el('queryMode');
    if (!mode) return;

    const byDescription = mode.value === 'descricao';
    const startField = el('queryStart')?.closest('.col-3');
    const endField = el('queryEnd')?.closest('.col-3');
    const descriptionField = el('queryDescriptionField');
    const button = el('loadQuery');

    if (startField) startField.hidden = byDescription;
    if (endField) endField.hidden = byDescription;
    if (descriptionField) descriptionField.hidden = !byDescription;

    if (button) {
      button.textContent = byDescription
        ? 'Consultar histórico'
        : 'Consultar';
    }

    if (byDescription) {
      loadDescriptions();
      setTimeout(function () {
        el('queryDescription')?.focus();
      }, 20);
    }
  }

  function installControls() {
    const view = el('viewQuery');
    const grid = view?.querySelector('.grid');

    if (!grid || el('queryMode')) return;

    const mode = document.createElement('select');
    mode.innerHTML =
      '<option value="periodo">Por período</option>' +
      '<option value="descricao">Por descrição — histórico completo</option>';

    const description = document.createElement('input');
    description.setAttribute('list', 'queryDescriptionList');
    description.setAttribute('maxlength', '300');
    description.setAttribute('autocomplete', 'off');
    description.placeholder =
      'Ex.: Plano de Saúde Notre Dame, sonda';

    const list = document.createElement('datalist');
    list.id = 'queryDescriptionList';

    const modeField = createField(
      'col-3',
      'queryMode',
      'Tipo de consulta',
      mode
    );

    const descriptionField = createField(
      'col-6',
      'queryDescription',
      'Descrição contém',
      description
    );

    descriptionField.appendChild(list);
    descriptionField.hidden = true;

    grid.insertBefore(modeField, grid.firstElementChild);
    grid.insertBefore(descriptionField, modeField.nextSibling);

    mode.addEventListener('change', updateMode);
    description.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        el('loadQuery')?.click();
      }
    });

    updateMode();
  }

  const originalCall = window.call;

  if (typeof originalCall !== 'function') return;

  window.call = function (action, params, showLoading) {
    if (
      action === 'listDespesas' &&
      el('queryMode')?.value === 'descricao'
    ) {
      const description = el('queryDescription')?.value.trim() || '';

      if (!description) {
        return Promise.reject(
          new Error('Informe a descrição que deseja consultar.')
        );
      }

      params = {
        token: params?.token || state.token,
        descricao: description
      };
    }

    return originalCall(action, params, showLoading);
  };

  installControls();
})();
