import * as fs from "fs";
import {sql}   from "@databases/sqlite";

import {dbQuery} from "./db";
import {readJson} from "./utils";

import {
  EntityFilterType,
  VoxSentence,
} from "./types";

import config from "./config";
const {
  ALIAS,
  STARTING_YEAR,
} = config;

const currentYear = (new Date()).getFullYear();
const years = [...Array(currentYear - STARTING_YEAR + 1)].map((x, n) => currentYear - n)

const decades          = readJson("./data/decades.json");
const ordinalWordsJson = readJson("./data/ordinalWords.json");

async function get(which: EntityFilterType) {
  const sentences = await dbQuery(sql`SELECT sentence FROM ${sql.ident(`vox_${which}`)}`) as VoxSentence[] || []
  return sentences.map(({sentence}) => sentence);
}

async function go() {
  const albumKeys    = await get("albums");
  const artistKeys   = await get("artists");
  const playlistKeys = await get("playlists");
  const trackKeys    = await get("tracks");
  const genreKeys    = await get("genres");

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
albumnum = (latest | ${ordinalWordsJson.map((x: string[]) => x[1]).join(" | ")}){albumnum}
<PlayTrack.playaction> [the] <albumnum> album [(of | by | from)] <PlayArtist.artist>
<PlayTrack.playaction> [the] <albumnum> <PlayArtist.artist> album

[PlayAlbum]
<PlayTrack.playaction> [the] album <album>
album = (${albumKeys.join(" | ")}){album}

[PlayGenre]
genre = (${genreKeys.join(" | ")}){genre}
<PlayTrack.playaction> some <genre>
<PlayTrack.playaction> genre <genre>

[PlayGenreBest]
<PlayTrack.playaction> [the] best [of] [genre] <PlayGenre.genre>
<PlayTrack.playaction> some (great | awesome) <PlayGenre.genre>

<PlayTrack.playaction> [the] album <album>
album = (${albumKeys.join(" | ")}){album}

[PlayYear]
year = (${years.join(" | ")})
decade = (${decades.map((d: string) => d[0]).join(" | ")})
<PlayTrack.playaction> [something] from [the] [year] <year>
<PlayTrack.playaction> [something] from [the] [nineteen] <decade>

[StartPlaylist]
playlistaction = (start | play | shuffle | queue){playlistaction}
<playlistaction> (play list | playlist) <playlist>
playlist = (${playlistKeys.join(" | ")}){playlist}

[Alias]
${Object.keys(ALIAS).join("\n")}

[ReadLog]
what is the last log entry

[WhatIsTime]
what time is it
what is the time

[PreviousTrack]
previous track

[NextTrack]
next track

[SaveTracklist]
preserve state
preserve track list
save state
save track list

[RestoreTracklist]
restore state
restore track list

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
