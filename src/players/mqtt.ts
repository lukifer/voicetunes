import { connect, MqttClient } from "mqtt";
import { Player }              from "../player";
import { PlayerType }          from "../types";

let mqttClient: MqttClient = null;

// export function mqtt(ip: string) {
//   console.log(`connecting mqtt player to ${mqtt}`)
//   if (!mqttClient) mqttClient = connect(`mqtt://${ip}`);
//   return mqttClient
// }

export class MqttPlayer implements Player {
  type = "mqtt" as PlayerType;
  constructor() {
    (async () => {
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
    console.log('mqtt play')
  }
  async pause() {
  }
  async togglePlayback() {
    if (await this.playerState() === "play") {
    } else {
    }
  }
  async previous() {
    console.log('previous')
  }
  async next() {
    console.log('next')
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
    console.log('mqtt addTracks', uris)
  }
  async tracklistLength() {
    return 0 // fixme
  }
  async getTracks() {
    return []
  }
}
