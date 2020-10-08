import * as fs from "fs";

import { readJson } from "./data";
const jsonKeys = (str: string) => Object.keys(readJson(`./maps/${str}.json`));

const albumKeys    = jsonKeys("albums");
const artistKeys   = jsonKeys("artist");
const trackKeys    = jsonKeys("tracks");
const playlistKeys = jsonKeys("playlistTracks");

const sentences_ini = `

[PlayTrack]
playaction = (play | queue){playaction}
<playaction> [the] [(track | song)] <track>
track = (${trackKeys.join(" | ")}){track}

[PlayArtist]
artist = (${artistKeys.join(" | ")}){artist}
<PlayTrack.playaction> [something] [(by | from)] [artist] <artist>

[PlayRandomAlbumByArtist]
<PlayTrack.playaction> [an] album [by] <PlayArtist.artist>

[PlayAlbum]
<PlayTrack.playaction> [the] album <album>
album = (${albumKeys.join(" | ")}){album}

[StartPlaylist]
playlistaction = (start | play | shuffle | queue | queue shuffle){action}
<playlistaction> (play list | playlist) <playlist>
playlist = (${playlistKeys.join(" | ")}){playlist}

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
pause
pause music

[Resume]
resume
resume playing
resume music

[MusicVolumeChange]
music volume <direction>
turn music <direction>
direction = (up | down){direction}

[MusicVolumeSet]
\\[set] music volume [to] (0..100){volume}

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
