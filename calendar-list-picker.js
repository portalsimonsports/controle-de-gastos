'use strict';

(function () {
  function element(id) {
    return document.getElementById(id);
  }

  function syncPicker() {
    const input = element('calendarEntryType');
    const dataList = element('calendarEntryTypeList');
    const picker = element('calendarEntryTypePicker');

    if (!input || !dataList || !picker) return;

    const current = picker.value;
    const values = Array.from(dataList.options)
      .map(function (option) {
        return String(option.value || '').trim();
      })
      .filter(Boolean);

    picker.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = values.length
      ? 'Selecione um tipo da lista'
      : 'Carregando lista da coluna K...';
    picker.appendChild(placeholder);

    values.forEach(function (value) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      picker.appendChild(option);
    });

    picker.disabled = values.length === 0;

    if (current && values.includes(current)) {
      picker.value = current;
    } else {
      picker.value = '';
    }
  }

  function install() {
    const input = element('calendarEntryType');
    const dataList = element('calendarEntryTypeList');

    if (!input || !dataList) return false;
    if (element('calendarEntryTypePicker')) return true;

    const label = document.createElement('label');
    label.htmlFor = 'calendarEntryTypePicker';
    label.textContent = 'Lista pré-carregada da coluna K';
    label.style.marginTop = '10px';

    const picker = document.createElement('select');
    picker.id = 'calendarEntryTypePicker';
    picker.style.marginTop = '6px';
    picker.disabled = true;

    input.insertAdjacentElement('afterend', label);
    label.insertAdjacentElement('afterend', picker);

    picker.addEventListener('change', function () {
      if (!picker.value) return;
      input.value = picker.value;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    input.addEventListener('input', function () {
      const match = Array.from(picker.options).some(function (option) {
        return option.value === input.value;
      });
      picker.value = match ? input.value : '';
    });

    input.addEventListener('click', function () {
      if (
        typeof input.showPicker === 'function' &&
        dataList.options.length
      ) {
        try {
          input.showPicker();
        } catch (ignore) {}
      }
    });

    const observer = new MutationObserver(syncPicker);
    observer.observe(dataList, {
      childList: true,
      subtree: true
    });

    syncPicker();
    return true;
  }

  function start() {
    if (install()) return;

    const observer = new MutationObserver(function () {
      if (install()) observer.disconnect();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
