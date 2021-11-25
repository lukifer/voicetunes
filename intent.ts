import Shuffler        from "shuffle-array";
import { exec, spawn } from "child_process";
import { promisify }   from "util";
import { sql }         from '@databases/sqlite';

import config     from "./config";
import { mopidy } from "./index";
import * as LED   from "./led";
import SFX        from "./sfx";

import {
  dbQuery,
  dbRawValue,
} from "./db";

import {
  arrayWrap,
  between,
  // mqtt,
  readJson,
  removeNth,
  rnd,
  wait,
  writeCache,
} from "./utils";

const execp = promisify(exec);

import {
  PlayOptions,
  MessageBase,
  Message,
  MessageIntent,
  MessagePlayAlbum,
  MessagePlayArtist,
  MessagePlayArtistAlbumByNumber,
  MessagePlayRandomAlbumByArtist,
  MessagePlayGenre,
  MessagePlayTrack,
  MessagePlayYear,
  MessageStartPlaylist,
  NumberMap,
  PlayStateCache,
  SqlTrack,
  StringTuple,
} from "./types";

const {
  ALIAS,
  DEFAULT_ACTION,
  MAX_QUEUED_TRACKS,
  // MQTT_IP,
  // MQTT_PASSTHROUGH_INTENTS,
  PATH_MUSIC,
  MIN_RATING,
  MIN_RATING_BEST,
  PREV_TRACK_MS,
  USE_LED,
  VOICE2JSON_BIN,
  VOICE2JSON_PROFILE,
} = config;

const years   = readJson("./data/years.json");
const decades = readJson("./data/decades.json");

const ord = readJson("./data/ordinalWords.json");
const ordinalToNum: NumberMap =
  ord.reduce((acc: NumberMap, x: StringTuple) => ({
    ...acc,
    [x[1]]: parseInt(x[0]) - 1,
  }), {} as NumberMap);

const trackLocations = (files: SqlTrack[]) => files.map(x => x.location.split("/iTunes%20Media/Music/")[1] || "")

export const whereYear = (year: number, range?: number) =>
  range
  ? sql`AND t.year >= ${year} AND t.year <= ${year+range}`
  : sql`AND t.year = ${year}`;

let cachedIntents: {[text: string]: Message} = {};
export async function textToIntent(text: string, allowedIntents?: MessageIntent[]): Promise<Message | null> {
  if(!cachedIntents[text]) {
    const flags = `--text-input --replace-numbers ${allowedIntents ? `-f ${allowedIntents.join(',')}` : ''}`;
    const { stdout } = await execp([
      `echo '${text}'`,
      `${VOICE2JSON_BIN} --profile ${VOICE2JSON_PROFILE} recognize-intent ${flags}`,
    ].join(" | "));

    try {
      cachedIntents[text] = JSON.parse(stdout) as Message;
      return cachedIntents[text];
    } catch(err: any) {
      return null;
    }

    // var recognizeProc = spawn("voice2json", [
    //   "recognize-intent",
    //   "--replace-numbers",
    //   "--text-input",
    // ]);
    // return new Promise((resolve, reject) => {
    //   recognizeProc.stdout.on("data", (messageJson) => {
    //     //console.log("messageJson", messageJson.toString());
    //     try {
    //       const message = JSON.parse(messageJson.toString()) as Message;
    //       cachedIntents[text] = message as Message;
    //       resolve(message as Message);
    //     } catch(err) {
    //       reject(err);
    //     }
    //   });
    //   recognizeProc.stdin.write(text);
    //   recognizeProc.stdin.end();
    // });
  } else {
    return cachedIntents[text] as Message;
  }
}

async function doPlayArtist(msg: MessagePlayArtist, best: boolean = false) {
  const { slots } = msg;
  const queue = slots.playaction === "queue";
  if(!slots?.artist) return err("no artist", msg);
  const minRating = best ? MIN_RATING_BEST : MIN_RATING;
  const artistTracks = await dbQuery(sql`
    SELECT t.location
    FROM vox_artists va
    INNER JOIN tracks t ON va.artist = t.artist
    WHERE va.sentence = ${slots.artist} AND t.rating >= ${minRating}
  `) as SqlTrack[];
  if(!artistTracks?.length) {
    return err("no tracks", msg);
  } else {
    await playTracks(trackLocations(artistTracks), { shuffle: true, queue });
  }
}

async function doPlayRandomAlbumByArtist(msg: MessagePlayRandomAlbumByArtist) {
  const { slots } = msg;
  if(!slots?.artist) return err("no albums for artist", msg);
  const [{ count }] = await dbQuery(sql`
    SELECT COUNT(DISTINCT t.album) as count
    FROM vox_artists va
    INNER JOIN tracks t ON va.artist = IFNULL(t.album_artist, t.artist)
    WHERE va.sentence = ${slots.artist} AND album IS NOT NULL AND year IS NOT NULL
    GROUP BY va.sentence
  `) as Array<{count: number}>;
  if(count) await doIntent({
    ...msg,
    intent: { name: "PlayArtistAlbumByNumber" },
    slots: {
      artist: slots.artist,
      // albumnum: ord[(Math.random() * count).toFixed()]?.[1] || "first",
      albumnum: ord[rnd(count)]?.[1] || "first",
    },
  });
}

async function doPlayArtistAlbumByNumber(msg: MessagePlayArtistAlbumByNumber) {
  const { slots } = msg;
  if(!slots?.albumnum || !slots?.artist) return err("no artist or album number", msg);
  const queue = slots.playaction === "queue";
  const albumIndex = ordinalToNum[slots.albumnum] || 0;
  const direction = dbRawValue(slots.albumnum === "latest" ? "DESC" : "ASC");
  const albumNumTracks = await dbQuery(sql`
    SELECT tracks.location
    FROM tracks
    INNER JOIN (
      SELECT t.album, IFNULL(t.album_artist, t.artist) as album_artist
      FROM vox_artists va
      INNER JOIN tracks t ON va.artist = IFNULL(t.album_artist, t.artist)
      WHERE va.sentence = ${slots.artist}
        AND t.album IS NOT NULL
        AND t.year IS NOT NULL
        AND t.compilation IS NULL
      GROUP BY t.album, t.year
      ORDER BY t.year ${direction}
      LIMIT 1 OFFSET ${albumIndex}
    ) as a ON a.album = tracks.album AND a.album_artist = IFNULL(tracks.album_artist, tracks.artist)
    ORDER BY tracks.disc_number ASC, tracks.track_number ASC
  `) as SqlTrack[];
  if(!albumNumTracks?.length) {
    return err(`no tracks found for ${slots.artist} album #${albumIndex}`, msg);
  } else {
    playTracks(trackLocations(albumNumTracks), { queue });
  }
}

export async function doPlayAlbum(msg: MessagePlayAlbum) {
  const { slots } = msg;
  const queue = slots.playaction === "queue";
  const albumTracks = await dbQuery(sql`
    SELECT t.location, t.artist
    FROM vox_albums va
    INNER JOIN tracks t ON va.album = t.album AND (va.artist IS NULL OR va.artist = IFNULL(t.album_artist, t.artist))
    WHERE va.sentence = ${slots.album}
    GROUP BY t.track_id
    ORDER BY t.disc_number ASC, t.track_number ASC
  `) as SqlTrack[];
  if(!albumTracks?.length) {
    return err(`no tracks found for album ${slots.album}`, msg);
  } else {
    // FIXME: handle multiple albums with the same name
    await playTracks(trackLocations(albumTracks), { queue });
  }
}

export async function doPlayGenre(msg: MessagePlayGenre, best: boolean = false) {
  const { slots } = msg;
  if(!slots?.genre) return err("no genre", msg);
  const { decade, genre, year } = slots;
  const queue = slots.playaction === "queue";
  const minRating = best ? MIN_RATING_BEST : MIN_RATING;
  const genreTracks = await dbQuery(sql`
    SELECT t.location
    FROM vox_genres vg
    INNER JOIN tracks t ON vg.genre = t.genre
    WHERE vg.sentence = ${genre}
      AND t.rating >= ${minRating}
      ${year   ? whereYear(years[year])        : sql``}
      ${decade ? whereYear(decades[decade], 9) : sql``}
  `) as SqlTrack[];
  if(!genreTracks?.length) {
    return err(`no tracks found for genre ${genre}`, msg);
  } else {
    // FIXME: handle multiple albums with the same name
    await playTracks(trackLocations(genreTracks), { shuffle: true, queue });
  }
}

export async function doStartPlaylist(msg: MessageStartPlaylist) {
  const { slots } = msg;
  const { playlistaction } = slots;
  if(!slots?.playlist) return err("no playlist", msg);
  const shuffle = (playlistaction === "shuffle");
  const orderBy = shuffle
    ? dbRawValue("ORDER BY RANDOM()")
    : sql`ORDER BY ${sql.ident("pi", "pos")}`;
  const playlistTracks = await dbQuery(sql`
    SELECT t.location
    FROM vox_playlists vp
    INNER JOIN playlist_items pi ON vp.playlist_id = pi.playlist_id
    INNER JOIN tracks t ON pi.track_id = t.track_id
    WHERE vp.sentence = ${slots.playlist}
    ${orderBy}
    LIMIT ${MAX_QUEUED_TRACKS || 99999}
  `) as SqlTrack[];
  if(!playlistTracks?.length) {
    return err(`no tracks found for playlist ${slots.playlist}`, msg);
  } else {
    // await playTracks(trackLocations(playlistTracks), { shuffle, queue });
    await playTracks(trackLocations(playlistTracks), { shuffle, queue: false });
  }
}

export async function doPlayTrack(msg: MessagePlayTrack) {
  const { slots } = msg;
  if(!slots?.track) return err("no track", msg);
  const queue = slots.playaction === "queue";
  const tracks = await dbQuery(sql`
    SELECT t.location
    FROM vox_tracks vt
    INNER JOIN tracks t ON vt.track_id = t.track_id
    WHERE vt.sentence = ${slots.track}
    LIMIT ${MAX_QUEUED_TRACKS || 99999}
  `) as SqlTrack[];
  if(!tracks?.length) {
    return err(`no tracks found for ${slots.track}`, msg);
  } else {
    playTracks(trackLocations(tracks), { shuffle: true, queue });
  }
}

export async function doPlayYear(msg: MessagePlayYear) {
  const { slots } = msg;
  if(!slots?.year && !slots?.decade) return err("no track", msg);
  // TODO
}

export async function doIntent(raw: MessageBase) {
  // console.log('doIntent', doIntent)
  if(!raw?.text || !raw?.intent?.name || !raw.slots) {
    SFX.unrecognized();
    return err("no intent", raw);
  }
  // const msg: Message = { ...raw, intentName: raw.intent.name }; // FIXME
  const msg = { ...raw, intentName: raw.intent.name } as Message;
  switch(msg.intentName) {
    case "PlayAlbum":               return await doPlayAlbum(msg);
    case "PlayArtist":              return await doPlayArtist(msg);
    case "PlayArtistBest":          return await doPlayArtist(msg, true);
    case "PlayArtistAlbumByNumber": return await doPlayArtistAlbumByNumber(msg);
    case "PlayGenre":               return await doPlayGenre(msg);
    case "PlayGenreBest":           return await doPlayGenre(msg, true);
    case "PlayRandomAlbumByArtist": return await doPlayRandomAlbumByArtist(msg);
    case "StartPlaylist":           return await doStartPlaylist(msg);
    case "PlayTrack":               return await doPlayTrack(msg);
    case "PlayYear":                return await doPlayYear(msg);

    case "RestoreTracklist": return await doRestoreState();
    case "SaveTracklist":    return await doSaveState();

    case "NextTrack":     return await nextTrack();
    case "PreviousTrack": return await previousTrack();

    case "Resume": return await mopidy.playback.resume();
    case "Stop":   return await mopidy.playback.pause();

    case "Nevermind": return await SFX.ok();

    case "Alias":
      const { text } = msg;
      if(!ALIAS[text]) return err("no alias", msg);
      const aliasedIntent = await textToIntent(ALIAS[text]);
      if(aliasedIntent) {
        await doIntent(aliasedIntent);
      } else {
        SFX.error();
      }
      break;

    case "MusicVolumeSet":
      if(!msg?.slots?.volume) return err("no volume", msg);
      setVol(between(0, msg?.slots.volume, 100));
      break;

    case "MusicVolumeChange":
      if(!msg?.slots?.direction) return err("no direction", msg);
      const {direction} = msg.slots;
           if(direction ===   "up") changeVol( 10);
      else if(direction === "down") changeVol(-10);
      break;

    // case "WhatIsPlaying":
    //   const currentTracks = await tracklist.getTracks();
    //   const i = await tracklist.index();
    //   const file = decodeURIComponent(currentTracks[i].replace(/^file:\/\//, ""));
    //   const tags = "format_tags=artist,title,album";
    //   const probe = await execp(
    //     `ffprobe -show_entries ${tags} -of default=noprint_wrappers=1:nokey=1 ${file}`
    //   );
    //   console.log(probe.stdout);
    //   break;

    case "WhatIsTime":
      const { stdout } = await execp([
        `if [ $(date +%M) != "00" ]`,
        `then date '+%-H %M %p'`,
        `else echo -n $(date +%-H)`,
        `echo -n " oh clock "`,
        `date +%p`,
        `fi`
      ].join(";"));
      SFX.speak(stdout.replace("\n", "").replace(/([a|p])m/, "$1 m"));
      break;

    // case "ReadLog":
    //   const log = await execp(`tail -n 1 ${__dirname}/log.txt`);
    //   console.log(log.stdout);
    //   SFX.speak(log.stdout);
    //   break;

    // case "RestartMopidy":
    //   //TODO
    //   break;
    //
    // case "Retrain":
    //   await train();
    //   break;
    //
    // case "Restart":
    //   if(ALLOW_SHUTDOWN) {
    //     SFX.ok();
    //     exec("sudo reboot now");
    //   } else {
    //     SFX.error();
    //     LED.flashErr();
    //   }
    //   break;
    //
    // case "Shutdown":
    //   if(ALLOW_SHUTDOWN) {
    //     SFX.ok();
    //     exec("sudo shutdown now");
    //   } else {
    //     SFX.error();
    //     LED.flashErr();
    //   }
    //   break;

    default:
      // if(MQTT_PASSTHROUGH_INTENTS.includes(msg.intentName)) {
      //   mqtt(MQTT_IP).publish("voice2json", msg.toString());
      // } else {
      //   LED.flashErr();
      //   return err("command unrecognized", msg);
      // }
  }
}

let loadingTimer: ReturnType<typeof setTimeout> | null = null;

async function queueRemainingTracks(tracks: string[]) {
  const batch = 5;
  const { tracklist } = mopidy;
  await tracklist.add({ uris: tracks.slice(0, batch).map(file => `file://${PATH_MUSIC}/${file}`) });
  if(tracks.length > batch) {
    await wait(250);
    await queueRemainingTracks(tracks.slice(batch));
  }
}

export async function playTracks(tracks: string[], opts: PlayOptions = {}) {
  const { playback, tracklist } = mopidy;
  const {
    jumpTo = 0,
    queue = false,
    seekMs = false,
    shuffle = false,
  } = opts;

  if(loadingTimer) {
    clearTimeout(loadingTimer);
    loadingTimer = null;
  }

  // queue starting track (random or specific) and start playing immediately
  const playIdx = shuffle ? rnd(tracks.length) : jumpTo;
  if(!queue) await tracklist.clear();
  await tracklist.add({ "uris": [ `file://${PATH_MUSIC}/${tracks[playIdx]}` ] });
  if(seekMs) await playback.seek([seekMs]);
  if(!queue) {
    await playback.play();
  }
  if(jumpTo > 0) {
    await tracklist.add({ uris: tracks.slice(0, jumpTo), at_position: 0 });
  }
  LED.stopSpin();

  // then add the remainder asynchronously (shuffling if needed)
  const playedCount = queue ? 0 : 1;
  const picks = Math.min(MAX_QUEUED_TRACKS, tracks.length) - jumpTo - playedCount;
  if(picks > 0) {
    if(shuffle) {
      const remainingTracks = removeNth(tracks, playIdx);
      const shuffled = Shuffler.pick(remainingTracks, { picks });
      await queueRemainingTracks(arrayWrap(shuffled));
    } else {
      const remainderIndex = jumpTo + playedCount;
      await queueRemainingTracks(tracks.slice(remainderIndex, remainderIndex + picks));
    }
  }
}

export async function doRestoreState() {
  const { tracklist } = mopidy;
  const cache = readJson('cache.local.json') as PlayStateCache;
  if(cache?.tracks?.length) {
    await tracklist.clear();
    await playTracks(cache.tracks, {
      jumpTo: cache.index,
      seekMs: cache.playbackPosition,
    });
  } else {
    SFX.error();
  }
}

export async function doSaveState() {
  const { tracklist } = mopidy;
  const tracks = await tracklist.getTracks()
  if(tracks?.length) {
    const pos = await mopidy.playback.getTimePosition();
    writeCache({
      index: await tracklist.index(),
      playbackPosition: (Math.max(pos - 5000, 0)),
      tracks: tracks.map(t => t.uri),
    });
  }
}

export async function previousTrack() {
  const { playback, tracklist } = mopidy;
  const pos = await playback.getTimePosition();
  const idx = await tracklist.index();
  if(pos < PREV_TRACK_MS && idx > 0) {
    await playback.previous();
  } else {
    await playback.seek([0]);
  }
}

export async function nextTrack() {
  await mopidy.playback.next();
}

// let cachedVolume: number | null = null;
export async function togglePlayback() {
  const { playback, tracklist } = mopidy;
  // const { mixer, playback } = mopidy;
  if("playing" === await playback.getState()) {
    //cachedVolume = await mixer.getVolume();
    //await transitionVolume(cachedVolume, 0);
    return playback.pause();
  } else {
    if(await tracklist.getLength() === 0) {
      if(DEFAULT_ACTION) {
        const intent = await textToIntent(DEFAULT_ACTION);
        if(intent) doIntent(intent)
      }
    } else {
      await playback.resume();
    }
    //if(cachedVolume !== null) {
    //  await transitionVolume(await mixer.getVolume(), cachedVolume);
    //  cachedVolume = null;
    //}
  }
}

export async function changeVol(diff: number) {
  const { mixer } = mopidy;
  const oldVol = await mixer.getVolume();
  const newVol = between(0, oldVol + diff, 100);
  const setPromise = mixer.setVolume([newVol])
  LED.volumeChange(oldVol, newVol);
  return setPromise;
}

export async function setVol(newVol: number) {
  const { mixer } = mopidy;
  if(USE_LED) {
    const oldVol = await mixer.getVolume();
    LED.volumeChange(oldVol, newVol);
  }
  return mixer.setVolume([newVol])
}

// FIXME: Mopidy has a volume change delay, and the Promise doesn't wait for it to resolve

//async function transitionVolume(fromVol: number, toVol: number) {
//  const { mixer } = mopidy;
//  let tempVolume = fromVol;
//  const interval = (fromVol < toVol) ? 20 : -20;
//  do {
//    tempVolume += interval;
//    console.log("tempVolume", tempVolume);
//    await mixer.setVolume([between(0, tempVolume, 100)]);
//    await wait(200);
//  } while(interval > 0 ? tempVolume < 100 : tempVolume > 0);
//}

// function log(msg: unknown) {
//   console.log(msg);
// }

function err(msg: string, also: unknown) {
  console.log(`err: ${msg}`, also);
  LED.flashErr();
  SFX.error();
}
