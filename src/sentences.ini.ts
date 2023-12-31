import * as fs       from "fs";
import {sql}         from "@databases/sqlite";
import writtenNumber from "written-number";

import {dbQuery}  from "./db";
import {readJson} from "./utils";

import {
  EntityFilterType,
  NumberMap,
  VoxSentence,
} from "./types";

import { loadConfig } from "./config";
const { ALIAS } = await loadConfig();

const years        = readJson("./data/years.json") as NumberMap;
const decades      = readJson("./data/decades.json") as NumberMap;
const ordinalWords = readJson("./data/ordinalWords.json");

const ordinalLabels = ordinalWords.map((x: string[]) => x[1]);

const numbers = [...Array(30)].map(n => writtenNumber(n).replace(/-/g, " "));

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

  const fromYear   = '(from | of) [the] [year]';
  const fromDecade = '(from | of) [the] [decade] [nineteen]';

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
albumnum = (latest | ${ordinalLabels.join(" | ")}){albumnum}
<PlayTrack.playaction> [the] <albumnum> album [(of | by | from)] <PlayArtist.artist>
<PlayTrack.playaction> [the] <albumnum> <PlayArtist.artist> album

[PlayAlbum]
<PlayTrack.playaction> [the] album <album> (starting | beginning) (at | with) [the] <tracknumword> track
<PlayTrack.playaction> [the] album <album> (starting | beginning) (at | with) track <tracknum>
<PlayTrack.playaction> [the] album <album> [and] (jump | go) [to] [the] <tracknumword> track
<PlayTrack.playaction> [the] album <album> [and] (jump | go) [to] track <tracknum>
<PlayTrack.playaction> [the] album <album>
tracknumword = (${ordinalLabels.join(" | ")}){tracknumword}
tracknum = (${numbers.join(" | ")}){tracknum}
album = (${albumKeys.join(" | ")}){album}

[PlayGenreBest]
year = (${Object.keys(years).join(" | ")}){year}
decade = (${Object.keys(decades).join(" | ")}){decade}
genre = (${genreKeys.join(" | ")}){genre}
<PlayTrack.playaction> [some] (great | awesome | [the] best [of]) [genre] <genre>
<PlayTrack.playaction> [some] (great | awesome | [the] best [of]) [genre] <genre> ${fromYear} <year>
<PlayTrack.playaction> [some] (great | awesome | [the] best [of]) [genre] <genre> ${fromDecade} <decade>

[PlayGenre]
<PlayTrack.playaction> [(some | genre)] <PlayGenreBest.genre>
<PlayTrack.playaction> [(some | genre)] <PlayGenreBest.genre> ${fromYear} <PlayGenreBest.year>
<PlayTrack.playaction> [(some | genre)] <PlayGenreBest.genre> ${fromDecade} <PlayGenreBest.decade>
<PlayTrack.playaction> [some] <PlayGenreBest.decade> <PlayGenreBest.genre>

[PlayYearBest]
<PlayTrack.playaction> ([the] best | some [thing] great | some [thing] awesome) [music] ${fromYear} <PlayGenreBest.year>
<PlayTrack.playaction> ([the] best | some [thing] great | some [thing] awesome) [music] ${fromDecade} <PlayGenreBest.decade>

[PlayYear]
<PlayTrack.playaction> (something | [some] music | a track | tracks) ${fromYear} <PlayGenreBest.year>
<PlayTrack.playaction> (something | [some] music | a track | tracks) ${fromDecade} <PlayGenreBest.decade>

[PlayAlbumYear]
<PlayTrack.playaction> [an] album ${fromYear} <PlayGenreBest.year>
<PlayTrack.playaction> [an] album ${fromDecade} <PlayGenreBest.decade>

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

[WhatIsPlaying]
what is playing [right now]
what [track | song | artist] is this
who is this

[JumpToTrack]
tracknum = (1..30){tracknum}
tracknumword = (${ordinalLabels.join(" | ")}){tracknumword}
(jump | go) to track [number] <tracknum>
(jump | go) to [the] <tracknumword> track

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
restart music server

[Nevermind]
nevermind
never mind
do nothing
  `;

  fs.writeFileSync("data/sentences.ini", sentences_ini);
}

go();
