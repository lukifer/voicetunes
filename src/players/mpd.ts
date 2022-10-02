import mpdapi, { MPDApi } from "mpd-api";

import { MopidyTrack } from "./mopidy";
import { Player }      from "../player";
import { PlayerType }  from "../types";

export type MpdStatus = {
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
  }
  async pause() {
    await this.client.api.playback.pause();
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
