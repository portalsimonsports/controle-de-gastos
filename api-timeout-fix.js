'use strict';

(function () {
  if (window.__cgApiTimeoutFixApplied) return;

  window.__cgApiTimeoutFixApplied = true;

  const nativeSetTimeout = window.setTimeout.bind(window);

  window.setTimeout = function (handler, delay) {
    const args = Array.prototype.slice.call(arguments, 2);
    let effectiveDelay = Number(delay);

    if (
      effectiveDelay === 30000 &&
      typeof handler === 'function'
    ) {
      let source = '';

      try {
        source = Function.prototype.toString.call(handler);
      } catch (_) {}

      if (source.indexOf('A API não respondeu.') >= 0) {
        effectiveDelay = 180000;
      }
    }

    return nativeSetTimeout.apply(
      window,
      [handler, effectiveDelay].concat(args)
    );
  };
})();
