import { connect, MqttClient } from "mqtt";
import { Player }              from "../player";
import { PlayerType }          from "../types";

let mqttClient: MqttClient = null;

export function mqtt(ip: string) {
  if (!mqttClient) mqttClient = connect(`mqtt://${ip}`);
  return mqttClient
}

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
  async setVolume(_vol: number) {
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
  async seek(_pos: number) {
  }
  async currentTrackIndex() {
    return 0; // TODO fixme
  }
  async getTimePosition() {
    return 0;
  }
  async clearTracks() {
  }
  async addTracks(_uris: string[], _at_position?: number) {
  }
  async tracklistLength() {
    return 0 // fixme
  }
  async getTracks() {
    return []
  }
}
