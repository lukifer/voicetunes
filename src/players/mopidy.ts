import Mopidy from "mopidy";

import { Player }     from "../player";
import { PlayerType } from "../types";

import { loadConfig } from "../config";
const {
  PATH_MUSIC,
  MOPIDY_URL,
} = await loadConfig();

// TEMP/TODO: Dedupe these from types/mopidy
export type MopidyArtist = {
  name: string;
}
export type MopidyAlbum = {
  name: string;
  artists: MopidyArtist[];
  num_tracks: number,
  num_discs: number,
  date: string,
}
export type MopidyTrack = {
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

let mopidy: Mopidy | null = null;

export class MopidyPlayer implements Player<MopidyTrack> {
  type = "mopidy" as PlayerType;
  constructor() {
    if (!mopidy) mopidy = new Mopidy({ webSocketUrl: MOPIDY_URL });
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
