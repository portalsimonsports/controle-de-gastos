'use strict';

(function () {
  function byId(id) {
    return document.getElementById(id);
  }

  function formatMoney(value) {
    if (typeof window.money === 'function') {
      return window.money(value || 0);
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value || 0));
  }

  /*
   * O campo busFare é removido visualmente por bilhete-controls.js.
   * A função original tentava escrever nesse elemento já removido e
   * gerava: Cannot set properties of null (setting 'value').
   */
  window.paintBus = function (result) {
    result = result || {};

    const balance = byId('busBalance');
    const fare = byId('busFare');
    const info = byId('busInfo');

    if (balance) {
      balance.value = formatMoney(result.saldo || 0);
    }

    if (fare) {
      fare.value = formatMoney(result.tarifa || 0);
    }

    if (info) {
      const lastUse = result.ultUso
        ? [
            result.ultUso.data || '',
            result.ultUso.hora || '',
            result.ultUso.tipo || 'Uso',
            result.ultUso.valor != null
              ? formatMoney(result.ultUso.valor)
              : String(result.ultUso.qtd || 0) + ' uso(s)'
          ].filter(Boolean).join(' • ')
        : '—';

      const lastRecharge = result.ultRec
        ? [
            result.ultRec.data || '',
            formatMoney(result.ultRec.valor)
          ].filter(Boolean).join(' • ')
        : '—';

      info.textContent =
        'Último uso: ' + lastUse +
        ' | Última recarga: ' + lastRecharge;
    }
  };
})();