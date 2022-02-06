'use strict';

// https://github.com/mischah/itunes-remote/

/* global Application */

module.exports = {
  method: function () {
    (function () {
      var app = Application('{{application}}'); // eslint-disable-line new-cap
      app.run();

      var currentTrack = app.currentTrack()
      if(!currentTrack) return -1;

      var list = (function(name) {
        try { return app.userPlaylists[name](); }
        catch (err) {
          app.make({new: 'playlist', withProperties: {name}});
          return app.userPlaylists[name];
        }
      })('{{voicetunesPlaylist}}');

      var currentTrackId = currentTrack.persistentID()
      return list.tracks().findIndex(t => t.persistentID() === currentTrackId);
    })();
  }
};
