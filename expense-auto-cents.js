'use strict';

(function () {
  const TARGET_IDS = [
    'expenseValue',
    'editExpenseValue'
  ];

  function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function trimLeadingZeros(value) {
    return onlyDigits(value).replace(/^0+(?=\d)/, '');
  }

  function formatDigitsAsMoney(digits) {
    const clean = trimLeadingZeros(digits);

    if (!clean) return '';

    const cents = clean.slice(-2).padStart(2, '0');
    const integerRaw = clean.length > 2
      ? clean.slice(0, -2)
      : '0';

    const integer = integerRaw.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      '.'
    );

    return integer + ',' + cents;
  }

  function currentDigits(input) {
    const stored = trimLeadingZeros(input.dataset.moneyDigits || '');
    if (stored) return stored;

    const value = String(input.value || '').trim();
    if (!value) return '';

    const normalized = value
      .replace(/R\$/gi, '')
      .replace(/\u00a0/g, '')
      .replace(/\s/g, '');

    const hasSeparator = normalized.includes(',') ||
      normalized.includes('.');

    if (!hasSeparator) {
      return trimLeadingZeros(normalized);
    }

    let numeric = normalized;
    const comma = numeric.lastIndexOf(',');
    const dot = numeric.lastIndexOf('.');

    if (comma >= 0 && dot >= 0) {
      numeric = comma > dot
        ? numeric.replace(/\./g, '').replace(',', '.')
        : numeric.replace(/,/g, '');
    } else if (comma >= 0) {
      numeric = numeric.replace(/\./g, '').replace(',', '.');
    } else {
      const parts = numeric.split('.');
      if (parts.length > 2) {
        const decimal = parts.pop();
        numeric = parts.join('') + '.' + decimal;
      }
    }

    const number = Number(numeric);
    if (!Number.isFinite(number)) return '';

    return String(Math.round(number * 100));
  }

  function setAutoValue(input, digits) {
    const clean = trimLeadingZeros(digits);
    input.dataset.moneyMode = 'auto';
    input.dataset.moneyDigits = clean;
    input.value = formatDigitsAsMoney(clean);

    requestAnimationFrame(function () {
      try {
        const end = input.value.length;
        input.setSelectionRange(end, end);
      } catch (ignore) {}
    });
  }

  function sanitizeManualValue(value) {
    let text = String(value || '')
      .replace(/R\$/gi, '')
      .replace(/\u00a0/g, '')
      .replace(/\s/g, '')
      .replace(/[^\d,.\-]/g, '');

    const negative = text.startsWith('-');
    text = text.replace(/-/g, '');

    const comma = text.lastIndexOf(',');
    const dot = text.lastIndexOf('.');
    const separatorIndex = Math.max(comma, dot);

    if (separatorIndex >= 0) {
      const integer = text
        .slice(0, separatorIndex)
        .replace(/[.,]/g, '');

      const decimal = text
        .slice(separatorIndex + 1)
        .replace(/[.,]/g, '')
        .slice(0, 2);

      text = (integer || '0') + ',' + decimal;
    } else {
      text = text.replace(/[.,]/g, '');
    }

    return negative ? '-' + text : text;
  }

  function parseManualValue(value) {
    const clean = sanitizeManualValue(value);
    if (!clean) return NaN;

    const number = Number(
      clean.replace(/\./g, '').replace(',', '.')
    );

    return Number.isFinite(number) ? number : NaN;
  }

  function formatManualOnBlur(input) {
    if (!String(input.value || '').trim()) {
      input.dataset.moneyDigits = '';
      input.dataset.moneyMode = 'auto';
      return;
    }

    const number = parseManualValue(input.value);
    if (!Number.isFinite(number)) return;

    input.value = number.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    input.dataset.moneyDigits = String(Math.round(number * 100));
    input.dataset.moneyMode = 'auto';
  }

  function switchToManual(input) {
    const digits = currentDigits(input);
    const integer = digits || '0';

    input.dataset.moneyMode = 'manual';
    input.dataset.moneyDigits = '';
    input.value = integer + ',';

    requestAnimationFrame(function () {
      try {
        const end = input.value.length;
        input.setSelectionRange(end, end);
      } catch (ignore) {}
    });
  }

  function handleBeforeInput(event) {
    const input = event.currentTarget;
    const data = String(event.data || '');

    if (event.inputType === 'insertText' && /[,.]/.test(data)) {
      event.preventDefault();
      switchToManual(input);
      return;
    }

    if (input.dataset.moneyMode === 'manual') return;

    if (event.inputType === 'insertText' && /^\d+$/.test(data)) {
      event.preventDefault();

      let digits = currentDigits(input);
      const selectedAll = input.selectionStart === 0 &&
        input.selectionEnd === input.value.length;

      if (selectedAll) digits = '';

      setAutoValue(input, digits + data);
      return;
    }

    if (
      event.inputType === 'deleteContentBackward' ||
      event.inputType === 'deleteContentForward' ||
      event.inputType === 'deleteByCut'
    ) {
      event.preventDefault();

      const selectedAll = input.selectionStart === 0 &&
        input.selectionEnd === input.value.length;

      const digits = selectedAll
        ? ''
        : currentDigits(input).slice(0, -1);

      setAutoValue(input, digits);
    }
  }

  function handleInput(event) {
    const input = event.currentTarget;

    if (input.dataset.moneyMode === 'manual') {
      const sanitized = sanitizeManualValue(input.value);
      if (input.value !== sanitized) input.value = sanitized;
      return;
    }

    setAutoValue(input, trimLeadingZeros(input.value));
  }

  function handlePaste(event) {
    const input = event.currentTarget;
    const text = String(
      event.clipboardData?.getData('text') || ''
    ).trim();

    if (!text) return;

    event.preventDefault();

    if (/[,.]/.test(text)) {
      input.dataset.moneyMode = 'manual';
      input.dataset.moneyDigits = '';
      input.value = sanitizeManualValue(text);
    } else {
      setAutoValue(input, onlyDigits(text));
    }
  }

  function prepareInput(input) {
    if (!input || input.dataset.autoCentsReady === '1') return;

    input.dataset.autoCentsReady = '1';
    input.dataset.moneyMode = 'auto';
    input.dataset.moneyDigits = currentDigits(input);
    input.type = 'text';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.placeholder = '0,00';

    input.addEventListener('beforeinput', handleBeforeInput);
    input.addEventListener('input', handleInput);
    input.addEventListener('paste', handlePaste);
    input.addEventListener('blur', function () {
      if (input.dataset.moneyMode === 'manual') {
        formatManualOnBlur(input);
      }
    });
  }

  function prepareAll() {
    TARGET_IDS.forEach(function (id) {
      prepareInput(document.getElementById(id));
    });
  }

  let scheduled = false;

  function schedulePrepare() {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(function () {
      scheduled = false;
      prepareAll();
    });
  }

  const observer = new MutationObserver(schedulePrepare);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  prepareAll();
})();
