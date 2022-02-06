'use strict';

// https://github.com/mischah/itunes-remote/

/* global Application */

module.exports = {
  method: function () {
    var app = Application('{{application}}'); // eslint-disable-line new-cap
    app.run();

    var newVal = '{{to}}';
         if (/^[0-9.]+$/.test(newVal)) newVal = parseFloat(newVal);
    else if (/^[0-9]+$/.test(newVal))  newVal = parseInt(newVal);

    app['{{set}}'] = newVal;
  }
};
