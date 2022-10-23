import { Player }      from "../player";
import { PlayerType }  from "../types";

export class MqttPlayer implements Player {
  type = "mqtt" as PlayerType;
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
    return 0;
  }
  async setVolume(vol: number) {
  }
  async playerState() {
    return "paused"
  }
  async play() {
  }
  async pause() {
  }
  async togglePlayback() {
    if (await this.playerState() === "play") {
    } else {
    }
  }
  async previous() {
  }
  async next() {
  }
  async seek(pos: number) {
  }
  async currentTrackIndex() {
    return 0; // TODO fixme
  }
  async getTimePosition() {
    return 0;
  }
  async clearTracks() {
  }
  async addTracks(uris: string[], at_position?: number) {
  }
  async tracklistLength() {
    return 0 // fixme
  }
  async getTracks() {
    return []
  }
}
