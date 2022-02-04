import Mopidy from "mopidy";

import {
  PlayerType
} from "./types";

import config from "./config";
const { URL_MOPIDY } = config;

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

export class Player {
  mopidy: Mopidy | null;
  type: PlayerType;
  constructor(type: PlayerType) {
    this.type = type
  }
  start() { return new Promise<void>(resolve => resolve())}
  async getVolume() { return 0; }
  async setVolume(_vol: number) {}
  async playerState() { return ""; }
  async play() {}
  async pause() {}
  async resume() {}
  async previous() {}
  async next() {}
  async position() { return 0; }
  async seek(_pos: number) {}
  async clearTracks() {}
  async currentTrackIndex() { return 0; }
  async getTimePosition() { return 0; }
  async addTracks(_uris: string[], _at_position?: number) {}
  async tracklistLength() { return 0; }
  async getTracks(): Promise<MopidyTrack[]> { return [] }
}

export class AppleMusicPlayer extends Player {
  constructor() {
    super("applemusic")
    // TODO
  }
}

let mopidy: Mopidy | null = null;

export class MopidyPlayer extends Player {
  constructor() {
    super("mopidy")
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
  async playState() {
    return mopidy.playback.getState();
  }
  async play() {
    return mopidy.playback.play();
  }
  async pause() {
    return mopidy.playback.pause();
  }
  async resume() {
    return mopidy.playback.resume();
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
  async position() {
    return mopidy.playback.getTimePosition();
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
    return mopidy.tracklist.add({ uris, at_position });
  }
  async tracklistLength() {
    return mopidy.tracklist.getLength();
  }
  async getTracks() {
    return mopidy.tracklist.getTracks();
  }
}

export function getPlayer(type: PlayerType) {
  if (type === "mopidy")
    return new MopidyPlayer();
  else if (type === "applemusic")
    return new AppleMusicPlayer();
}
