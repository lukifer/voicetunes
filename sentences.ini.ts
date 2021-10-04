import * as fs from "fs";

import {
  EntityFilterType,
  VoxSentence,
} from "./types";

import config from "./config";
const { PATH_DATABASE } = config;

import { dbConnect, dbQuery, readJson } from "./utils";

const ordinalWordsJson = readJson("./data/ordinalWords.json");

dbConnect(PATH_DATABASE);

async function get(which: EntityFilterType) {
  const sentences = await dbQuery(`SELECT sentence FROM vox_${which}`) as VoxSentence[] || []
  return sentences.map(({sentence}) => sentence);
}

async function go() {
  const albumKeys    = await get("albums");
  const artistKeys   = await get("artists");
  const playlistKeys = await get("playlists");
  const trackKeys    = await get("tracks");

  const sentences_ini = `

[PlayTrack]
playaction = (play | queue){playaction}
<playaction> [the] [(track | song)] <track>
track = (${trackKeys.join(" | ")}){track}

[PlayArtist]
artist = (${artistKeys.join(" | ")}){artist}
<PlayTrack.playaction> [something] [(by | from)] [artist] <artist>

[PlayArtistBest]
<PlayTrack.playaction> [the] best of [artist] <PlayArtist.artist>
<PlayTrack.playaction> something (great | awesome) [(by | from)] [artist] <PlayArtist.artist>

[PlayRandomAlbumByArtist]
<PlayTrack.playaction> [an] album [by] <PlayArtist.artist>

[PlayArtistAlbumByNumber]
albumnum = (${ordinalWordsJson.map((x: string[]) => x[1]).join(" | ")}){albumnum}
<PlayTrack.playaction> [the] <albumnum> album [(of | by | from)] <PlayArtist.artist>
<PlayTrack.playaction> [the] <albumnum> <PlayArtist.artist> album

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

[Skip]
direction = (forward | back){direction}
time = (0..60){time}
time_unit = (second | seconds | minute | minutes){time_unit}
skip <time> <time_unit> <direction>

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

[Retrain]
retrain voice commands

[Reboot]
reboot device

[Shutdown]
shut down device

[RestartMopidy]
restart music player

[Nevermind]
nevermind
never mind
do nothing
  `;

  fs.writeFileSync("data/sentences.ini", sentences_ini);
}

go();
