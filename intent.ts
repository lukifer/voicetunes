import Shuffler        from "shuffle-array";
import { exec, spawn } from "child_process";
import { promisify }   from "util";
import { connect }     from "mqtt";

import config     from "./config";
import { mopidy } from "./index";
import * as LED   from "./led";
import SFX        from "./sfx";
import { train }  from "./train";
import {
  arrayWrap,
  between,
  dbConnect,
  dbQuery,
  readJson,
  rnd,
  wait,
} from "./utils";

const execp = promisify(exec);

import {
  PlayOptions,
  Message,
  SqlTrack,
  StringMap,
  StringTuple,
} from "./types";

const {
  ALLOW_SHUTDOWN,
  MAX_QUEUED_TRACKS,
  MQTT_IP,
  MQTT_PASSTHROUGH_INTENTS,
  PATH_DATABASE,
  PATH_MUSIC,
  USE_LED,
} = config;

dbConnect(PATH_DATABASE);

const mqttClient = MQTT_IP && connect(`mqtt://${MQTT_IP}`);

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

export async function doIntent(msg: Message) {
  //log(["intent msg", msg]);
  if(!msg || !msg.intent || !msg.intent.name || !msg.slots) {
    SFX.unrecognized();
    return err("no intent", msg);
  }
  const { playback, tracklist } = mopidy;
  const { intent, slots } = msg;
  const { playaction, playlistaction } = slots;
  const shuffle = ["shuffle", "queue shuffle"].includes(playlistaction);
  const queue = playaction === "queue" || ["queue", "queue shuffle"].includes(playlistaction);

  switch(intent.name) {
    case "PlayArtistBest":
    // TODO
    //   if(BEST_TRACKS_PLAYLIST) {
    //     const playlistFiles = playlistTracksMap[BEST_TRACKS_PLAYLIST];
    //     const bestTracks = playlistFiles.filter(({ artist }) => artist === slots.artist)
    //     playTracks(bestTracks.map(({ file }) => file), { shuffle: true, queue });
    //     break;
    //   }
    case "PlayArtist":
      if(!slots?.artist) return err("no artist", msg);
      const artistTracks = await dbQuery(`
        SELECT t.location
        FROM vox_artists va
        INNER JOIN tracks t ON va.artist = t.artist
        WHERE va.sentence = ? AND t.rating >= 80
      `, [slots.artist]) as SqlTrack[];
      if(!artistTracks?.length) {
        return err("no tracks", msg);
      } else {
        playTracks(trackLocations(artistTracks), { shuffle: true, queue });
      }
      break;

    case "PlayRandomAlbumByArtist":
      if(!slots?.artist) return err("no albums for artist", msg);
      const [{ count }] = await dbQuery(`
        SELECT COUNT(DISTINCT t.album) as count
        FROM vox_artists va
        INNER JOIN tracks t ON va.artist = IFNULL(t.album_artist, t.artist)
        WHERE va.sentence = ? AND album IS NOT NULL AND year IS NOT NULL
        GROUP BY va.sentence
      `, [slots.artist]) as Array<{count: number}>;

      if(count) doIntent({
        ...msg,
        intent: { name: "PlayArtistAlbumByNumber" },
        slots: {
          artist: slots.artist,
          albumnum: (Math.random() * count).toFixed(),
        },
      });
      break;

    case "PlayArtistAlbumByNumber":
      if(!slots?.albumnum || !slots?.artist) return err("no artist or album number", msg);
      const albumIndex = ordinalToNum[slots.albumnum] || 1;
      const albumNumTracks = await dbQuery(`
        SELECT tracks.location
        FROM tracks
        INNER JOIN (
          SELECT t.album, t.album_artist
          FROM vox_artists va
          INNER JOIN tracks t ON va.artist = IFNULL(t.album_artist, t.artist)
          WHERE va.sentence = ? AND album IS NOT NULL AND year IS NOT NULL
          GROUP BY t.album, t.year
          ORDER BY t.year ASC
          LIMIT 1 OFFSET ?
        ) as a ON a.album = tracks.album AND a.album_artist = tracks.album_artist
      `, [slots.artist, albumIndex - 1]) as SqlTrack[];
      if(!albumNumTracks?.length) {
        return err(`no tracks found for ${slots.artist} album #${albumIndex}`, msg);
      } else {
        playTracks(trackLocations(albumNumTracks), { queue });
      }
      break;

    case "PlayAlbum":
      if(!slots?.album) return err("no album", msg);
      const albumTracks = await dbQuery(`
        SELECT t.location
        FROM vox_albums va
        INNER JOIN tracks t ON va.album = t.album AND (va.artist IS NULL OR va.artist = IFNULL(t.album_artist, t.artist))
        WHERE va.sentence = ?
        GROUP BY t.track_id
        ORDER BY t.album
      `, [slots.album]) as SqlTrack[];
      // FIXME: handle multiple albums
      // const which = albums.length === 1 ? 0 : rnd(albums.length);
      // playTracks(albums[which].tracks.map(x => x.file), { queue });
      playTracks(trackLocations(albumTracks), { queue });
      break;

    case "StartPlaylist":
      if(!slots?.playlist) return err("no playlist", msg);
      const playlistTracks = await dbQuery(`
        SELECT t.location
        FROM vox_playlists vp
        INNER JOIN playlist_items pi ON vp.playlist_id = pi.playlist_id
        INNER JOIN tracks t ON pi.track_id = t.track_id
        WHERE vp.sentence = ?
        ${shuffle ? "ORDER BY RANDOM()" : ""}
        ${MAX_QUEUED_TRACKS ? `LIMIT ${MAX_QUEUED_TRACKS}` : ""}
      `, [slots.playlist]) as SqlTrack[];

      playTracks(trackLocations(playlistTracks), { shuffle, queue });
      break;

    case "PlayTrack":
      if(!slots?.track) return err("no track", msg);
      const tracks = await dbQuery(`
        SELECT t.location
        FROM vox_tracks vt
        INNER JOIN tracks t ON vt.track_id = t.track_id
        WHERE vt.sentence = ?
        ORDER BY RANDOM()
        ${shuffle ? "ORDER BY RANDOM()" : ""}
        ${MAX_QUEUED_TRACKS ? `LIMIT ${MAX_QUEUED_TRACKS}` : ""}
      `, [slots.playlist]) as SqlTrack[];

      playTracks(trackLocations(tracks), { shuffle: true, queue });
      break;

    case "Alias":
      // TODO
      break;

    case "MusicVolumeSet":
      if(!slots?.volume) {
        return err("no volume", msg);
      }
      setVol(between(0, slots.volume, 100));
      break;

    case "MusicVolumeChange":
      if(!slots?.direction) {
        return err("no direction", msg);
      }
      if(slots.direction === "up") {
        changeVol(10);
      } else if(slots.direction === "down") {
        changeVol(-10);
      }
      break;

    case "WhatIsPlaying":
      const currentTracks = await tracklist.getTracks();
      const i = await tracklist.index();
      const file = decodeURIComponent(currentTracks[i].replace(/^file:\/\//, ""));
      const tags = "format_tags=artist,title,album";
      const probe = await execp(
        `ffprobe -show_entries ${tags} -of default=noprint_wrappers=1:nokey=1 ${file}`
      );
      console.log(probe.stdout);
      break;

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

    case "ReadLog":
      const log = await execp(`tail -n 1 ${__dirname}/log.txt`);
      console.log(log.stdout);
      SFX.speak(log.stdout);
      break;

    case "NextTrack":
      await playback.next();
      break;

    case "PreviousTrack":
      await playback.previous();
      break;

    case "Resume":
      playback.resume();
      break;

    case "Stop":
      playback.pause();
      break;

    case "RestartMopidy":
      //TODO
      break;

    case "Retrain":
      await train();
      break;

    case "Restart":
      if(ALLOW_SHUTDOWN) {
        SFX.ok();
        exec("sudo reboot now");
      } else {
        SFX.error();
        if(USE_LED) LED.flashErr();
      }
      break;

    case "Shutdown":
      if(ALLOW_SHUTDOWN) {
        SFX.ok();
        exec("sudo shutdown now");
      } else {
        SFX.error();
        if(USE_LED) LED.flashErr();
      }
      break;

    case "Nevermind":
      SFX.ok();
      break;

    default:
      if(mqttClient && MQTT_PASSTHROUGH_INTENTS.includes(intent.name)) {
        mqttClient.publish("voice2json", msg.toString());
      } else {
        if(USE_LED) LED.flashErr();
        return err("command unrecognized", msg);
      }
  }
}

let loadingTimer: ReturnType<typeof setTimeout> | null = null;

async function cueRemainingTracks(tracks: string[]) {
  const { tracklist } = mopidy;
  console.log("cueing "+tracks.length);
  await tracklist.add({ uris: tracks.slice(0, 5).map(file => `file://${PATH_MUSIC}/${file}`) });
  if(tracks.length > 5) {
    await wait(500);
    await cueRemainingTracks(tracks.slice(5));
  }
}

export async function playTracks(tracks: string[], opts: PlayOptions = {}) {
  const { playback, tracklist } = mopidy;
  const { shuffle = false, queue = false } = opts;

  if(loadingTimer) {
    console.log("clearTimeout");
    clearTimeout(loadingTimer);
    loadingTimer = null;
  }

  // cue a random track and start playing immediately
  const start = shuffle ? rnd(tracks.length) : 0;
  if(!queue) await tracklist.clear();
  await tracklist.add({ "uris": [ `file://${PATH_MUSIC}/${tracks[start]}` ] });
  if(!queue) await playback.play();

  // then add the remainder asynchronously (shuffling if needed)
  const { [start]: firstTrack, ...remainingTracks } = tracks;
  const picks = Math.min(MAX_QUEUED_TRACKS, Object.values(remainingTracks).length);
  if(picks) {
    if(shuffle) {
      const shuffled = Shuffler.pick(Object.values(remainingTracks), { picks });
      cueRemainingTracks(arrayWrap(shuffled));
    } else {
      cueRemainingTracks(Object.values(remainingTracks).slice(0, picks));
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
  if(USE_LED) LED.volumeChange(oldVol, newVol);
  return setPromise;
}

export async function setVol(newVol: number) {
  const { mixer } = mopidy;
  if(USE_LED) {
    const oldVol = await mixer.getVolume();
    //console.log("volumeChange", oldVol, newVol);
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

function log(msg: unknown) {
  console.log(msg);
}

function err(msg: string, also: unknown) {
  console.log(`err: ${msg}`, also);
  if(USE_LED) LED.flashErr();
  SFX.error();
}
