import * as fs from "fs";

import { readJson } from "./data";
const jsonKeys = (str: string) => Object.keys(readJson(`./maps/${str}.json`));

const albumKeys    = jsonKeys("albums");
const artistKeys   = jsonKeys("artist");
const trackKeys    = jsonKeys("tracks");
const playlistKeys = jsonKeys("playlistTracks");

const sentences_ini = `
[PlayArtist]
play [something] [(by | from)] <artist>
play artist <artist>
artist = (${artistKeys.join(" | ")}){artist}

[PlayRandomAlbumByArtist]
play [an] album [by] <PlayArtist.artist>

[PlayAlbum]
play [the] album <album>
album = (${albumKeys.join(" | ")}){album}

[StartPlaylist]
<playtype> (play list | playlist) <playlist>
playtype = (start | play | shuffle){action}
playlist = (${playlistKeys.join(" | ")}){playlist}

[PlayTrack]
play [the] [(track | song)] <track>
track = (${trackKeys.join(" | ")}){track}

[ReadLog]
what is the last log entry

[WhatIsTime]
what time is it
what is the time

[PreviousTrack]
previous track

[NextTrack]
next track

[Stop]
stop
stop playing
stop music

[Resume]
resume
resume playing
resume music

[MusicVolumeChange]
music volume <direction>
turn music <direction>
direction = (up | down){direction}

[MusicVolumeSet]
[set] music volume [to] (0..100){volume}

[Reboot]
reboot device

[Shutdown]
shut down device

[Nevermind]
nevermind
never mind
do nothing
`;

fs.writeFileSync("sentences.ini", sentences_ini);
