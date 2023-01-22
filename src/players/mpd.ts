import mpdapi, { MPDApi } from "mpd-api";

import { Player } from "../player";

import {
  MpdStatus,
  MpdTrack,
  PlayerType,
} from "../types";

export class MpdPlayer implements Player<MpdTrack> {
  type = "mpd" as PlayerType;
  client: null | MPDApi.ClientAPI = null;
  constructor() {}
  async start() {
    this.client = await mpdapi.connect({
      host: 'localhost',
      port: 6600,
    })
  }
  async getVolume() {
    // const vol = await this.client.api.playback.getvol();
    return 100
  }
  async setVolume(vol: number) {
    // await this.client.api.playback.setvol(`${vol}`);
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
  }
  async currentTrackIndex() {
    const currentsong = await this.client.api.status.currentsong<MpdTrack>()
    return currentsong.pos;
  }
  async getTimePosition() {
    const status = await this.client.api.status.get<MpdStatus>();
    return status.elapsed;
  }
  async clearTracks() {
    await this.client.api.queue.clear();
  }
  async addTracks(uris: string[], at_position?: number) {
    try {
      await this.client.api.queue.add(decodeURIComponent(uris[0]));
    } catch(err) {
      console.log("addTracks err", err)
    }
  }
  async tracklistLength() {
    const info = await this.client.api.queue.info()
    return info.length
  }
  async getTracks() {
    const tracks = await this.client.api.queue.info<MpdTrack>();
    return tracks;
  }
}
