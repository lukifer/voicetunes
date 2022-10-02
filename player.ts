import Mopidy              from "mopidy";
import mpdapi, {MPDApi}    from "mpd-api";
import stringify           from "js-function-string";
import {eval as osascript} from "osascript";
import requireDir          from "require-dir";

import {
  PlayerType,
  StringMap,
} from "./types";

type AppleMusicJxa = { method: () => void };
var apple = requireDir('./applelib') as Record<string, AppleMusicJxa>;

import config from "./config";
const {
  PATH_MUSIC,
  PLAYLIST_NAME,
  URL_MOPIDY,
} = config;

// TEMP/TODO: Dedupe these from types/mopidy
type MopidyArtist = {
  name: string;
}
type MopidyAlbum = {
  name: string;
  artists: MopidyArtist[];
  num_tracks: number,
  num_discs: number,
  date: string,
}
type MopidyTrack = {
  uri: string;
  name: string;
  artists: MopidyArtist[];
  album?: MopidyAlbum;
  genre?: string;
  track_no?: number;
  disc_no?: number;
  date?: string;
  length: number;
  comment?: string;
};

interface Player {
  type: PlayerType;
  start: () => Promise<void>;
  getVolume: () => Promise<number>;
  setVolume: (vol: number) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayback: () => Promise<void>;
  previous: () => Promise<void>;
  next: () => Promise<void>;
  seek: (vol: number) => Promise<void>;
  clearTracks: () => Promise<void>;
  currentTrackIndex: () => Promise<number>;
  getTimePosition: () => Promise<number>;
  addTracks: (uris: string[], at_position?: number) => Promise<void>;
  tracklistLength: () => Promise<number>;
  getTracks: () => Promise<MopidyTrack[]>;
};

export class AppleMusicPlayer implements Player {
  type = "applemusic" as PlayerType;
  constructor(type: PlayerType) {
    this.type = type;
  }
  // jxa<T = void>(foo: AppleMusicJxa, replace: StringMap = {}) {
  jxa<T = void>(foo: {method: () => void}, replace: StringMap = {}) {
    const {method} = foo
    return new Promise<T>((resolve, reject) => {
      const methodStr = stringify(method);
      const replacePairs = Object.entries({
        "application": this.type === "itunes" ? "iTunes" : "Music",
        "voicetunesPlaylist": PLAYLIST_NAME,
        ...replace,
      });
      const cmd = replacePairs.reduce((fn, [k, v]) => fn.replace(`{{${k}}}`, v), methodStr);

      osascript(cmd, ['-s', 's'], function (err: object, json: string) {
        if (err) {
          reject(err);
        } else {
          try {
            resolve(JSON.parse(json));
          } catch(err) {
            // console.log({err, json});
            const response = /^[0-9.]+$/.test(json) ? parseInt(json) : json;
            resolve(response as any as T); // FIXME: type
          }
        }
      })
    })
  }
  async start() {}
  async getVolume() {
    return await this.jxa<number>(apple.soundVolume);
  }
  async setVolume(vol: number) {
    await this.jxa<number>(apple.set, {'set': 'soundVolume', 'to': `${vol}`});
  }
  async playerState() {
    return await this.jxa<string>(apple.command, {'command': 'playerState'});
  }
  async play() {
    if (await this.playerState() === "paused") {
      if (await this.currentTrackIndex() > -1)
        return await this.jxa(apple.play);
    }
    return await this.jxa(apple.startPlaylist);
  }
  async pause() {
    await this.jxa(apple.command, {'command': 'pause'});
  }
  async togglePlayback() {
    await this.jxa(apple.command, {'command': 'playpause'});
  }
  async previous() {
    await this.jxa(apple.command, {'command': 'previousTrack'});
  }
  async next() {
    await this.jxa(apple.command, {'command': 'nextTrack'});
  }
  async seek(pos: number) {
    await this.jxa<number>(apple.set, {'set': 'playerPosition', 'to': `${pos}`});
  }
  async currentTrackIndex() {
    const index = await this.jxa<string>(apple.currentTrackIndex);
    return parseInt(index) || -1;
  }
  async getTimePosition() {
    const timePosition = await this.jxa<string>(apple.command, {'command': 'playerPosition'});
    return parseFloat(timePosition) || 0;
  }
  async clearTracks() {
    await this.jxa(apple.clear);
  }
  async addTracks(persistentIds: string[]) {
    // await this.jxa(apple.clear);
    await this.jxa(apple.addTracks, {'trackIds': persistentIds.join(',')});
  }
  async tracklistLength() {
    const tracklist = await this.getTracks()
    return tracklist?.length || 0;
  }
  async getTracks() {
    const trackPersistentIds = await this.jxa<string[]>(apple.getTracks);
    // FIXME: Database lookups, types
    return trackPersistentIds as any[];
  }
}

let mopidy: Mopidy | null = null;

export class MopidyPlayer implements Player {
  type = "mopidy" as PlayerType;
  constructor() {
    if (!mopidy) mopidy = new Mopidy({ webSocketUrl: URL_MOPIDY });
  }
  start() {
    return new Promise<void>((resolve) => {
      mopidy.on("state:online", async () => resolve())
    })
  }
  async getVolume() {
    return mopidy.mixer.getVolume();
  }
  async setVolume(vol: number) {
    return mopidy.mixer.setVolume([vol]);
  }
  async playerState() {
    return mopidy.playback.getState();
  }
  async play() {
    return mopidy.playback.play();
  }
  async pause() {
    return await mopidy.playback.pause();
  }
  async togglePlayback() {
    if (await this.playerState() === "playing") {
      await this.play();
    } else {
      await mopidy.playback.resume();
    }
  }
  async previous() {
    return mopidy.playback.previous();
  }
  async next() {
    return mopidy.playback.next();
  }
  async seek(pos: number) {
    return mopidy.playback.seek([pos]);
  }
  async currentTrackIndex() {
    return mopidy.tracklist.index();
  }
  async getTimePosition() {
    return mopidy.playback.getTimePosition()
  }
  async clearTracks() {
    return mopidy.tracklist.clear();
  }
  async addTracks(uris: string[], at_position?: number) {
    return mopidy.tracklist.add({
      uris: uris.map(u => `file://${PATH_MUSIC}/${u}`),
      at_position,
    });
  }
  async tracklistLength() {
    return mopidy.tracklist.getLength();
  }
  async getTracks() {
    return mopidy.tracklist.getTracks();
  }
}

type MpdStatus = {
  volume: number;
  repeat: boolean;
  playlist: number;
  state: 'play' | 'stop' | 'pause';
  elapsed: number;
}

export class MpdPlayer implements Player {
  type = "mpd" as PlayerType;
  client: null | MPDApi.ClientAPI = null;
  constructor() {
    (async () => {
      this.client = await mpdapi.connect({
        host: 'localhost',
        port: 6600,
      })
    })()
  }
  async start() {}
  async getVolume() {
    // return await this.client.api.playback.getvol<number>()
    const status = await this.client.api.status.get<MpdStatus>();
    return status.volume;
  }
  async setVolume(vol: number) {
    await this.client.api.playback.setvol(`${vol}`);
    // return mopidy.mixer.setVolume([vol]);
  }
  async playerState() {
    const status = await this.client.api.status.get<MpdStatus>();
    return status.state;
  }
  async play() {
    await this.client.api.playback.play();
    // return mopidy.playback.play();
  }
  async pause() {
    await this.client.api.playback.pause();
    // return await mopidy.playback.pause();
  }
  async togglePlayback() {
    if (await this.playerState() === "play") {
      await this.play();
    } else {
      await this.client.api.playback.resume();
    }
  }
  async previous() {
    await this.client.api.playback.prev();
  }
  async next() {
    await this.client.api.playback.next();
  }
  async seek(pos: number) {
    await this.client.api.playback.seek(`${pos}`);
    // return mopidy.playback.seek([pos]);
  }
  async currentTrackIndex() {
    return 0; // TODO fixme
    // return mopidy.tracklist.index();
  }
  async getTimePosition() {
    const status = await this.client.api.status.get<MpdStatus>();
    return status.elapsed;
  }
  async clearTracks() {
    await this.client.api.queue.clear();
  }
  async addTracks(uris: string[], at_position?: number) {
    await this.client.api.queue.add(uris[0], `${at_position}`);
  }
  async tracklistLength() {
    return 0 // fixme
    // return mopidy.tracklist.getLength();
  }
  async getTracks() {
    return await this.client.api.queue.info() as MopidyTrack[]; // fixme
    // return mopidy.tracklist.getTracks();
  }
}

export function getPlayer(type: PlayerType) {
  if (type === "mopidy")
    return new MopidyPlayer();
  else if (type === "mpd")
    return new MpdPlayer();
  else if (["applemusic", "itunes"].includes(type))
    return new AppleMusicPlayer(type);
}
