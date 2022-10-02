import stringify           from "js-function-string";
import {eval as osascript} from "osascript";
import requireDir          from "require-dir";

import {
  PlayerType,
  StringMap,
} from "../types";
import { Player } from "../player";

import config from "../config";
const { PLAYLIST_NAME } = config;

type AppleMusicJxa = { method: () => void };
var apple = requireDir('./applelib') as Record<string, AppleMusicJxa>;

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
