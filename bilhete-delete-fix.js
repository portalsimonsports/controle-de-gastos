'use strict';

(function () {
  function updateModalText() {
    const busDescription = document.querySelector(
      '#busDeleteOverlay .bus-modal-description'
    );
    const busWarning = document.querySelector(
      '#busDeleteOverlay .bus-modal-warning'
    );
    const fidelityDescription = document.querySelector(
      '#fidelityDeleteOverlay .bus-modal-description'
    );
    const fidelityWarning = document.querySelector(
      '#fidelityDeleteOverlay .bus-modal-warning'
    );

    if (busDescription) {
      busDescription.textContent =
        'Serão apagados a quantidade, a data/hora e a recarga da linha.';
    }

    if (busWarning) {
      busWarning.textContent =
        'As fórmulas e a formatação da linha serão preservadas.';
    }

    if (fidelityDescription) {
      fidelityDescription.textContent =
        'Serão apagados a quantidade, a data/hora e a recarga da linha.';
    }

    if (fidelityWarning) {
      fidelityWarning.textContent =
        'As fórmulas e a formatação da linha serão preservadas.';
    }
  }

  let scheduled = false;

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(function () {
      scheduled = false;
      updateModalText();
    });
  }

  const observer = new MutationObserver(scheduleUpdate);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  updateModalText();
})();