import * as fs from "fs";
const albums         = fs.readFileSync('out/albums.ini',          'utf8');
const albumByArtist  = fs.readFileSync('out/albumByArtist.ini',   'utf8');
const artist         = fs.readFileSync('out/artist.ini',          'utf8');
// const artistAlbums   = fs.readFileSync('out/artistAlbums.ini',    'utf8');
const playlist       = fs.readFileSync('out/playlistTracks.ini',  'utf8');
const tracks         = fs.readFileSync('out/tracks.ini',          'utf8');

const sentences_ini = `
[PlayArtist]
play [something] [(by | from)] <artist>
play artist <artist>
artist = ${artist}{artist}

[PlayRandomAlbumByArtist]
play [an] album [by] <PlayArtist.artist>

[PlayAlbum]
play [the] album <album>
album = ${albums}{album}

[PlayAlbumByArtist]
play [album] <albumByArtist>
albumByArtist = ${albumByArtist}{albumByArtist}

[StartPlaylist]
<playtype> play list <playlist>
playtype = (start | play | shuffle){action}
playlist = ${playlist}{playlist}

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
