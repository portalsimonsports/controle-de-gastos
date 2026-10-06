'use strict';

(function () {
  let pendingDelete = null;
  let lastFocusedElement = null;
  let genericResolver = null;

  function parseExpenseDeleteMessage(message) {
    const text = String(message || '');
    const lineMatch = text.match(/Excluir o lançamento da linha\s+(\d+)\?/i);
    if (!lineMatch) return null;

    const lines = text
      .split('\n')
      .map(function (line) { return line.trim(); })
      .filter(Boolean);

    const detailLine = lines[1] || '';
    const value = lines[2] || '';
    const parts = detailLine.split(/\s+[—–-]\s+/);

    return {
      linha: Number(lineMatch[1]),
      data: parts[0] || '',
      descricao: parts.slice(1).join(' — ') || '',
      valor: value,
      aviso:
        lines.slice(3).join(' ') ||
        'A linha será esvaziada sem deslocar os demais registros.'
    };
  }

  function ensureProfessionalConfirm() {
    let overlay = document.getElementById('professionalConfirmOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'professionalConfirmOverlay';
    overlay.className = 'professional-confirm-overlay';
    overlay.hidden = true;

    overlay.innerHTML = [
      '<section class="professional-confirm" role="alertdialog" aria-modal="true" ',
      'aria-labelledby="professionalConfirmTitle" aria-describedby="professionalConfirmDescription">',
      '<button type="button" class="professional-confirm-close" id="professionalConfirmClose" aria-label="Fechar">×</button>',
      '<div class="professional-confirm-heading">',
      '<div class="professional-confirm-icon" aria-hidden="true">!</div>',
      '<div>',
      '<p class="professional-confirm-eyebrow">Confirmação necessária</p>',
      '<h3 id="professionalConfirmTitle">Confirmar ação?</h3>',
      '<p id="professionalConfirmDescription">Revise os dados antes de continuar.</p>',
      '</div>',
      '</div>',
      '<div class="professional-confirm-details" id="professionalConfirmDetails"></div>',
      '<p class="professional-confirm-warning" id="professionalConfirmWarning"></p>',
      '<div class="professional-confirm-actions">',
      '<button type="button" class="professional-confirm-cancel" id="professionalConfirmCancel">Cancelar</button>',
      '<button type="button" class="professional-confirm-delete" id="professionalConfirmDelete">Confirmar</button>',
      '</div>',
      '</section>'
    ].join('');

    document.body.appendChild(overlay);

    document.getElementById('professionalConfirmClose')
      .addEventListener('click', function () { closeProfessionalConfirm(false); });

    document.getElementById('professionalConfirmCancel')
      .addEventListener('click', function () { closeProfessionalConfirm(false); });

    document.getElementById('professionalConfirmDelete')
      .addEventListener('click', handleConfirm);

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeProfessionalConfirm(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !overlay.hidden) {
        closeProfessionalConfirm(false);
      }
    });

    return overlay;
  }

  function renderDetails(items) {
    const box = document.getElementById('professionalConfirmDetails');
    box.innerHTML = '';

    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!list.length) {
      box.hidden = true;
      return;
    }

    box.hidden = false;

    list.forEach(function (item) {
      const div = document.createElement('div');
      if (item.wide) div.className = 'professional-confirm-detail-wide';

      const span = document.createElement('span');
      span.textContent = item.label || '';

      const strong = document.createElement('strong');
      strong.textContent = item.value == null || item.value === '' ? '—' : String(item.value);

      div.append(span, strong);
      box.appendChild(div);
    });
  }

  function openGenericConfirm(options) {
    const overlay = ensureProfessionalConfirm();
    const opts = options || {};

    pendingDelete = null;
    lastFocusedElement = document.activeElement;

    document.querySelector('.professional-confirm-eyebrow').textContent =
      opts.eyebrow || 'Confirmação necessária';

    document.getElementById('professionalConfirmTitle').textContent =
      opts.title || 'Confirmar ação?';

    document.getElementById('professionalConfirmDescription').textContent =
      opts.description || 'Revise os dados antes de continuar.';

    renderDetails(opts.details);

    const warning = document.getElementById('professionalConfirmWarning');
    warning.textContent = opts.warning || '';
    warning.hidden = !opts.warning;

    const cancelButton = document.getElementById('professionalConfirmCancel');
    cancelButton.textContent = opts.cancelText || 'Cancelar';

    const confirmButton = document.getElementById('professionalConfirmDelete');
    confirmButton.disabled = false;
    confirmButton.textContent = opts.confirmText || 'Confirmar';

    overlay.hidden = false;

    requestAnimationFrame(function () {
      cancelButton.focus();
    });
  }

  function openExpenseDelete(data) {
    pendingDelete = data;

    openGenericConfirm({
      title: 'Excluir lançamento?',
      description: 'Confira os dados do lançamento antes de excluir.',
      details: [
        { label: 'Linha', value: data.linha },
        { label: 'Data', value: data.data },
        { label: 'Descrição', value: data.descricao, wide: true },
        { label: 'Valor', value: data.valor, wide: true }
      ],
      warning: data.aviso,
      confirmText: 'Excluir lançamento',
      cancelText: 'Cancelar',
      variant: 'danger'
    });

    pendingDelete = data;
  }

  function closeProfessionalConfirm(result) {
    const overlay = document.getElementById('professionalConfirmOverlay');
    if (overlay) overlay.hidden = true;

    pendingDelete = null;

    const resolver = genericResolver;
    genericResolver = null;
    if (resolver) resolver(Boolean(result));

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  async function handleConfirm() {
    if (pendingDelete && pendingDelete.linha) {
      return confirmExpenseDelete();
    }
    closeProfessionalConfirm(true);
  }

  async function confirmExpenseDelete() {
    if (!pendingDelete || !pendingDelete.linha) return;

    const line = pendingDelete.linha;
    const deleteButton = document.getElementById('professionalConfirmDelete');

    deleteButton.disabled = true;
    deleteButton.textContent = 'Excluindo...';

    try {
      const result = await call(
        'deleteDespesa',
        { token: state.token, linha: line },
        false
      );

      closeProfessionalConfirm(false);
      toast(result.msg || 'Despesa excluída.');

      const queryButton = document.getElementById('loadQuery');
      if (queryButton) queryButton.click();
    } catch (error) {
      deleteButton.disabled = false;
      deleteButton.textContent = 'Excluir lançamento';
      toast(error.message, 'error');
    }
  }

  window.professionalConfirm = function (options) {
    if (genericResolver) {
      genericResolver(false);
      genericResolver = null;
    }

    return new Promise(function (resolve) {
      genericResolver = resolve;
      openGenericConfirm(options || {});
    });
  };

  const nativeConfirm = window.confirm.bind(window);

  window.confirm = function (message) {
    const parsed = parseExpenseDeleteMessage(message);

    if (parsed) {
      openExpenseDelete(parsed);
      return false;
    }

    console.warn('Confirmação nativa bloqueada pelo padrão do sistema:', message);
    return false;
  };

  ensureProfessionalConfirm();
})();