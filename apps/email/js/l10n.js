'use strict';
define({
  load: function(id, require, onload, config) {
    if (config.isBuild) {
      return onload();
    }

window.performance.mark('l10n-before-require');
    require(['l10nbase', 'l10ndate'], function() {
window.performance.mark('l10n-after-require');
      //navigator.mozL10n.once(function() {
window.performance.mark('l10n-after-once');
        // The html cache restore in html_cache_restore could have set the ltr
        // direction incorrectly. If the language goes from an RTL one to a LTR
        // one while the app is closed, this could lead to a stale value.
        var dir = navigator.mozL10n.language.direction,
            htmlNode = document.querySelector('html');

        if (htmlNode.getAttribute('dir') !== dir) {
          console.log('email l10n updating html dir to ' + dir);
          htmlNode.setAttribute('dir', dir);
        }

        onload(navigator.mozL10n);
      //});
    });
  }
});
