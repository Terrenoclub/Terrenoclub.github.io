(function () {
  'use strict';

  var PARTIAL_EVENT = 'partials:loaded';
  window.__partialsLoaded = false;

  function loadPartials() {
    var placeholders = Array.prototype.slice.call(document.querySelectorAll('[data-include]'));

    if (!placeholders.length) {
      window.__partialsLoaded = true;
      document.dispatchEvent(new CustomEvent(PARTIAL_EVENT));
      return;
    }

    Promise.all(
      placeholders.map(function (placeholder) {
        var src = placeholder.getAttribute('data-include');
        if (!src) {
          return Promise.resolve();
        }

        return fetch(src)
          .then(function (response) {
            if (!response.ok) {
              throw new Error('Failed to load partial: ' + src + ' (' + response.status + ')');
            }
            return response.text();
          })
          .then(function (markup) {
            var template = document.createElement('template');
            template.innerHTML = markup.trim();
            placeholder.replaceWith(template.content);
          })
          .catch(function (error) {
            console.error('[layout] Unable to load partial', src, error);
          });
      })
    ).then(function () {
      window.__partialsLoaded = true;
      document.dispatchEvent(new CustomEvent(PARTIAL_EVENT));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPartials);
  } else {
    loadPartials();
  }
})();
