'use strict';

// https://github.com/mischah/itunes-remote/

/* global Application */

module.exports = {
  method: function () {
    var app = Application('{{application}}'); // eslint-disable-line new-cap
    app.run();

    var list = (function(name) {
      try { return app.userPlaylists[name](); }
      catch (err) {
        app.make({new: 'playlist', withProperties: {name}});
        return app.userPlaylists[name];
      }
    })('{{voicetunesPlaylist}}');

    '{{trackIds}}'.split(',').forEach(function (trackId, n) {
      var track = app.libraryPlaylists[0].fileTracks.whose({persistentID: trackId})
      app.duplicate(track, {
        to: list
      });
    });
  }
};
