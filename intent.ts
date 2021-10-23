import Shuffler        from "shuffle-array";
import { exec, spawn } from "child_process";
import { promisify }   from "util";
import { sql }         from '@databases/sqlite';

import config      from "./config";
import { mopidy }  from "./index";
import * as LED    from "./led";
import SFX         from "./sfx";
import { dbQuery } from "./db";
import {
  arrayWrap,
  between,
  mqtt,
  readJson,
  removeNth,
  rnd,
  wait,
} from "./utils";

const execp = promisify(exec);

import {
  PlayOptions,
  MessageBase,
  Message,
  MessagePlayAlbum,
  MessagePlayArtist,
  MessagePlayArtistAlbumByNumber,
  MessagePlayRandomAlbumByArtist,
  MessagePlayTrack,
  MessageStartPlaylist,
  SqlTrack,
  StringMap,
  StringTuple,
} from "./types";

const {
  ALIAS,
  MAX_QUEUED_TRACKS,
  MQTT_IP,
  MQTT_PASSTHROUGH_INTENTS,
  PATH_MUSIC,
  USE_LED,
} = config;

const ord = readJson("./data/ordinalWords.json");
const ordinalToNum =
  ord.reduce((acc: StringMap, x: StringTuple) => ({
    ...acc,
    [x[1]]: parseInt(x[0]) - 1,
  }), {} as StringMap);

const trackLocations = (files: SqlTrack[]) => files.map(x => x.location.split("/iTunes%20Media/Music/")[1] || "")

let cachedIntents: {[text: string]: Message} = {};
export async function textToIntent(text: string): Promise<Message> {
  //console.log("textToIntent", text, "cached="+(!!cachedIntents[text]));
  if(!cachedIntents[text]) {
    var recognizeProc = spawn("voice2json", [
      "recognize-intent",
      "--replace-numbers",
      "--text-input",
    ]);
    return new Promise((resolve, reject) => {
      recognizeProc.stdout.on("data", (messageJson) => {
        //console.log("messageJson", messageJson.toString());
        try {
          const message = JSON.parse(messageJson.toString()) as Message;
          cachedIntents[text] = message as Message;
          resolve(message as Message);
        } catch(err) {
          reject(err);
        }
      });
      recognizeProc.stdin.write(text);
      recognizeProc.stdin.end();
    });
  } else {
    return cachedIntents[text] as Message;
  }
}

async function doPlayArtist(msg: MessagePlayArtist) {
  const { slots } = msg;
  // const { playaction, playlistaction } = slots;
  if(!slots?.artist) return err("no artist", msg);
  const artistTracks = await dbQuery(sql`
    SELECT t.location
    FROM vox_artists va
    INNER JOIN tracks t ON va.artist = t.artist
    WHERE va.sentence = ${slots.artist} AND t.rating >= 80
  `) as SqlTrack[];
  if(!artistTracks?.length) {
    return err("no tracks", msg);
  } else {
    // await playTracks(trackLocations(artistTracks), { shuffle: true, queue });
    await playTracks(trackLocations(artistTracks), { shuffle: true, queue: false });
  }
}

async function doPlayRandomAlbumByArtist(msg: MessagePlayRandomAlbumByArtist) {
  const { slots } = msg;
  // const { playaction, playlistaction } = slots;
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
  // const { playaction, playlistaction } = slots;
  if(!slots?.albumnum || !slots?.artist) return err("no artist or album number", msg);
  const albumIndex = ordinalToNum[slots.albumnum] || 0;
  const albumNumTracks = await dbQuery(sql`
    SELECT tracks.location
    FROM tracks
    INNER JOIN (
      SELECT t.album, IFNULL(t.album_artist, t.artist) as album_artist
      FROM vox_artists va
      INNER JOIN tracks t ON va.artist = IFNULL(t.album_artist, t.artist)
      WHERE va.sentence = ${slots.artist} AND album IS NOT NULL AND year IS NOT NULL
      GROUP BY t.album, t.year
      ORDER BY t.year ASC
      LIMIT 1 OFFSET ${albumIndex}
    ) as a ON a.album = tracks.album AND a.album_artist = IFNULL(tracks.album_artist, tracks.artist)
    ORDER BY tracks.disc_number ASC, tracks.track_number ASC
  `) as SqlTrack[];
  if(!albumNumTracks?.length) {
    return err(`no tracks found for ${slots.artist} album #${albumIndex}`, msg);
  } else {
    // playTracks(trackLocations(albumNumTracks), { queue });
    await playTracks(trackLocations(albumNumTracks), { queue: false });
  }
}

export async function doPlayAlbum(msg: MessagePlayAlbum) {
  const { slots } = msg;
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
    // playTracks(trackLocations(albumTracks), { queue });
    await playTracks(trackLocations(albumTracks), { queue: false });
  }
}

export async function doStartPlaylist(msg: MessageStartPlaylist) {
  const { slots } = msg;
  if(!slots?.playlist) return err("no playlist", msg);
  const shuffle = false; // temp
  const orderBy = sql.__dangerous__rawValue(shuffle ? "ORDER BY RANDOM()" : "");
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
    // playTracks(trackLocations(tracks), { shuffle: true, queue });
    playTracks(trackLocations(tracks), { shuffle: true, queue: false });
  }
}

export async function doIntent(raw: MessageBase) {
  // console.log('doIntent', doIntent)
  if(!raw?.text || !raw?.intent?.name || !raw.slots) {
    SFX.unrecognized();
    return err("no intent", raw);
  }
  const msg = { ...raw, intentName: raw.intent.name } as Message;
  switch(msg.intentName) {
    case "PlayArtist":              return doPlayArtist(msg);
    case "PlayRandomAlbumByArtist": return doPlayRandomAlbumByArtist(msg);
    case "PlayArtistAlbumByNumber": return doPlayArtistAlbumByNumber(msg);
    case "PlayAlbum":               return doPlayAlbum(msg);
    case "StartPlaylist":           return doStartPlaylist(msg);
    case "PlayTrack":               return doPlayTrack(msg);

    // case "PlayArtistBest":
    // // TODO
    // //   if(BEST_TRACKS_PLAYLIST) {
    // //     const playlistFiles = playlistTracksMap[BEST_TRACKS_PLAYLIST];
    // //     const bestTracks = playlistFiles.filter(({ artist }) => artist === slots.artist)
    // //     playTracks(bestTracks.map(({ file }) => file), { shuffle: true, queue });
    // //     break;
    // //   }

    case "Alias":
      if (!ALIAS[msg?.text]) return err("no alias", msg);
      await doIntent(await textToIntent(ALIAS[msg.text]));
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

    case "NextTrack":
      await mopidy.playback.next();
      break;

    case "PreviousTrack":
      await mopidy.playback.previous();
      break;

    case "Resume":
      await mopidy.playback.resume();
      break;

    case "Stop":
      await mopidy.playback.pause();
      break;

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

    case "Nevermind":
      SFX.ok();
      break;

    default:
      if(MQTT_PASSTHROUGH_INTENTS.includes(msg.intentName)) {
        mqtt(MQTT_IP).publish("voice2json", msg.toString());
      } else {
        LED.flashErr();
        return err("command unrecognized", msg);
      }
  }
}

let loadingTimer: ReturnType<typeof setTimeout> | null = null;

async function cueRemainingTracks(tracks: string[]) {
  const batch = 5;
  const { tracklist } = mopidy;
  await tracklist.add({ uris: tracks.slice(0, batch).map(file => `file://${PATH_MUSIC}/${file}`) });
  if(tracks.length > batch) {
    await wait(250);
    await cueRemainingTracks(tracks.slice(batch));
  }
}

export async function playTracks(tracks: string[], opts: PlayOptions = {}) {
  const { playback, tracklist } = mopidy;
  const { shuffle = false, queue = false } = opts;

  if(loadingTimer) {
    clearTimeout(loadingTimer);
    loadingTimer = null;
  }

  // cue a random track and start playing immediately
  const start = shuffle ? rnd(tracks.length) : 0;
  if(!queue) await tracklist.clear();
  await tracklist.add({ "uris": [ `file://${PATH_MUSIC}/${tracks[start]}` ] });
  if(!queue) await playback.play();

  // then add the remainder asynchronously (shuffling if needed)
  const remainingTracks = removeNth(tracks, start);
  const picks = Math.min(MAX_QUEUED_TRACKS, remainingTracks.length);
  if(picks) {
    if(shuffle) {
      const shuffled = Shuffler.pick(remainingTracks, { picks });
      await cueRemainingTracks(arrayWrap(shuffled));
    } else {
      await cueRemainingTracks(remainingTracks.slice(0, picks));
    }
  }
}

// let cachedVolume: number | null = null;
export async function togglePlayback() {
  const { playback } = mopidy;
  // const { mixer, playback } = mopidy;
  if("playing" === await playback.getState()) {
    //cachedVolume = await mixer.getVolume();
    //await transitionVolume(cachedVolume, 0);
    return playback.pause();
  } else {
    //await playback.resume();
    //if(cachedVolume !== null) {
    //  await transitionVolume(await mixer.getVolume(), cachedVolume);
    //  cachedVolume = null;
    //}
    return playback.resume();
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
