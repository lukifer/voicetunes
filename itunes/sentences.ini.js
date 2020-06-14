const fs = require("fs");
const albums         = fs.readFileSync('out/albums.ini', 'utf8');
const albumsByArtist = fs.readFileSync('out/albumsByArtist.ini', 'utf8');
const artists        = fs.readFileSync('out/artists.ini', 'utf8');
const playlists      = fs.readFileSync('out/playlists.ini', 'utf8');
const tracks         = fs.readFileSync('out/tracks.ini', 'utf8');

const sentences_ini = `
[PlayArtist]
play [something] [(by | from)] <artist>
play artist <artist>
artist = ${artists}{artist}

[PlayRandomAlbumByArtist]
play [an] album [by] <PlayArtist.artist>

[PlayAlbum]
play [the] album <album>
album = ${albums}{album}

[PlayAlbumByArtist]
play [album] <albumByArtist>
albumByArtist = ${albumsByArtist}{albumByArtist}

[StartPlaylist]
<playtype> play list <playlist>
playtype = (start | play | shuffle){action}
playlist = ${playlists}{playlist}

[PlayTrack]
play [the] [(track | song)] <track>
track = ${tracks}{track}

[WhatIsTime]
what time is it
what is the time

[Shutdown]
shut down device confirm

[Nevermind]
nevermind
never mind
do nothing
`;
fs.writeFileSync("sentences.ini", sentences_ini);
