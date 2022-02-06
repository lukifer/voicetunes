'use strict';

// https://github.com/mischah/itunes-remote/

/* global Application */

module.exports = {
  method: function () {
    (function () {
      var app = Application('{{application}}'); // eslint-disable-line new-cap
      app.run();

      return app['{{command}}']();
    })();
  }
};
