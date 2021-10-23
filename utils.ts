import * as fs from "fs";
import { connect, MqttClient } from "mqtt";

export const rnd = (ceil: number) => Math.floor(ceil * Math.random());
export const between = (min: number, val: number, max: number) => Math.min(max, Math.max(min, val));
export const wait = (ms: number) => new Promise<void>((resolve: () => void) => setTimeout(resolve, ms));
export const arrayWrap = (x: unknown) => Array.isArray(x) ? x : [ x ];
export const now = () => new Date().getTime();

export function removeNth<T>(arr: Array<T>, n: number): Array<T> {
  return [...arr.slice(0, n), ...arr.slice(n+1)];
}

export const readJson = (file: string) => fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file, {encoding: "utf-8"}))
  : {};

let mqttClient: MqttClient = null;

export function mqtt(ip: string) {
  if (!mqttClient) mqttClient = connect(`mqtt://${ip}`);
  return mqttClient
}
