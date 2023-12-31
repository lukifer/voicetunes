import mpdapi, { MPDApi } from "mpd-api";
// import { MPD } from "mpd2";

import { Player } from "../player";

import {
  MpdStatus,
  MpdTrack,
  PlayerType,
} from "../types";

import { loadConfig } from "../config";
const { PATH_MUSIC } = await loadConfig();

export class MpdPlayer implements Player<MpdTrack> {
  type = "mpd" as PlayerType;
  client: null | MPDApi.ClientAPI = null;
  constructor() {}
  async start() {
    this.client = await mpdapi.connect({
      path: '/run/mpd/socket',
      // host: 'localhost',
      // port: 6600,
    })
    // await this.client.api.queue.add('Nirvana/Bleach')
    // await this.play()
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
    // await this.client.api.queue.clear();
  }
  async addTracks(files: string[], at_position?: number) {
    try {
      // return mopidy.tracklist.add({
      //   uris: uris.map(u => `file://${PATH_MUSIC}/${u}`),
      //   at_position,
      // });
      // await this.client.api.queue.add('Nirvana/Bleach/School')
      // await this.client.api.queue.add('/home/pi/music/Nirvana/Bleach/04 School.flac')

      files.forEach(async (file) => {
        console.log(`${PATH_MUSIC}/${decodeURIComponent(file)}`)
        // const taco = new MPD.Command("add")
        await this.client.api.queue.add(`${PATH_MUSIC}/${decodeURIComponent(file)}`)
        // await this.client.api.queue.add(file)
        // await this.client.api.queue.add(decodeURIComponent(file))
      })
      // console.log({uris}, decodeURIComponent(uris[0]))
      // await this.client.api.queue.add(decodeURIComponent(uris[0]));
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
