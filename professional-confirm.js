'use strict';

(function () {
  const nativeConfirm = window.confirm.bind(window);
  let pendingDelete = null;
  let lastFocusedElement = null;

  function parseExpenseDeleteMessage(message) {
    const text = String(message || '');
    const lineMatch = text.match(
      /Excluir o lançamento da linha\s+(\d+)\?/i
    );

    if (!lineMatch) return null;

    const lines = text
      .split('\n')
      .map(function (line) {
        return line.trim();
      })
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
    let overlay = document.getElementById(
      'professionalConfirmOverlay'
    );

    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'professionalConfirmOverlay';
    overlay.className = 'professional-confirm-overlay';
    overlay.hidden = true;

    overlay.innerHTML = [
      '<section class="professional-confirm" ',
      'role="alertdialog" aria-modal="true" ',
      'aria-labelledby="professionalConfirmTitle" ',
      'aria-describedby="professionalConfirmDescription">',
      '<button type="button" ',
      'class="professional-confirm-close" ',
      'id="professionalConfirmClose" ',
      'aria-label="Fechar">×</button>',
      '<div class="professional-confirm-heading">',
      '<div class="professional-confirm-icon" ',
      'aria-hidden="true">!</div>',
      '<div>',
      '<p class="professional-confirm-eyebrow">Confirmação necessária</p>',
      '<h3 id="professionalConfirmTitle">Excluir lançamento?</h3>',
      '<p id="professionalConfirmDescription">',
      'Esta ação removerá os dados selecionados.',
      '</p>',
      '</div>',
      '</div>',
      '<div class="professional-confirm-details">',
      '<div>',
      '<span>Linha</span>',
      '<strong id="professionalConfirmLine">—</strong>',
      '</div>',
      '<div>',
      '<span>Data</span>',
      '<strong id="professionalConfirmDate">—</strong>',
      '</div>',
      '<div class="professional-confirm-detail-wide">',
      '<span>Descrição</span>',
      '<strong id="professionalConfirmExpense">—</strong>',
      '</div>',
      '<div class="professional-confirm-detail-wide">',
      '<span>Valor</span>',
      '<strong id="professionalConfirmValue">—</strong>',
      '</div>',
      '</div>',
      '<p class="professional-confirm-warning" ',
      'id="professionalConfirmWarning"></p>',
      '<div class="professional-confirm-actions">',
      '<button type="button" ',
      'class="professional-confirm-cancel" ',
      'id="professionalConfirmCancel">Cancelar</button>',
      '<button type="button" ',
      'class="professional-confirm-delete" ',
      'id="professionalConfirmDelete">Excluir lançamento</button>',
      '</div>',
      '</section>'
    ].join('');

    document.body.appendChild(overlay);

    document
      .getElementById('professionalConfirmClose')
      .addEventListener('click', closeProfessionalConfirm);

    document
      .getElementById('professionalConfirmCancel')
      .addEventListener('click', closeProfessionalConfirm);

    document
      .getElementById('professionalConfirmDelete')
      .addEventListener('click', confirmExpenseDelete);

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeProfessionalConfirm();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (
        event.key === 'Escape' &&
        !overlay.hidden
      ) {
        closeProfessionalConfirm();
      }
    });

    return overlay;
  }

  function openProfessionalConfirm(data) {
    const overlay = ensureProfessionalConfirm();
    pendingDelete = data;
    lastFocusedElement = document.activeElement;

    document.getElementById(
      'professionalConfirmLine'
    ).textContent = String(data.linha || '—');

    document.getElementById(
      'professionalConfirmDate'
    ).textContent = data.data || '—';

    document.getElementById(
      'professionalConfirmExpense'
    ).textContent = data.descricao || '—';

    document.getElementById(
      'professionalConfirmValue'
    ).textContent = data.valor || '—';

    document.getElementById(
      'professionalConfirmWarning'
    ).textContent = data.aviso;

    const deleteButton = document.getElementById(
      'professionalConfirmDelete'
    );

    deleteButton.disabled = false;
    deleteButton.textContent = 'Excluir lançamento';
    overlay.hidden = false;

    requestAnimationFrame(function () {
      document.getElementById(
        'professionalConfirmCancel'
      ).focus();
    });
  }

  function closeProfessionalConfirm() {
    const overlay = document.getElementById(
      'professionalConfirmOverlay'
    );

    if (overlay) {
      overlay.hidden = true;
    }

    pendingDelete = null;

    if (
      lastFocusedElement &&
      typeof lastFocusedElement.focus === 'function'
    ) {
      lastFocusedElement.focus();
    }

    lastFocusedElement = null;
  }

  async function confirmExpenseDelete() {
    if (!pendingDelete || !pendingDelete.linha) return;

    const deleteButton = document.getElementById(
      'professionalConfirmDelete'
    );

    deleteButton.disabled = true;
    deleteButton.textContent = 'Excluindo...';

    try {
      const result = await call(
        'deleteDespesa',
        {
          token: state.token,
          linha: pendingDelete.linha
        },
        false
      );

      closeProfessionalConfirm();
      toast(result.msg || 'Despesa excluída.');

      const queryButton = document.getElementById('loadQuery');

      if (queryButton) {
        queryButton.click();
      }
    } catch (error) {
      deleteButton.disabled = false;
      deleteButton.textContent = 'Excluir lançamento';
      toast(error.message, 'error');
    }
  }

  window.confirm = function (message) {
    const parsed = parseExpenseDeleteMessage(message);

    if (parsed) {
      openProfessionalConfirm(parsed);
      return false;
    }

    return nativeConfirm(message);
  };

  ensureProfessionalConfirm();
})();
