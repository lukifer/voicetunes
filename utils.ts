import { exec }                from "child_process";
import * as fs                 from "fs";
import { connect, MqttClient } from "mqtt";
import { promisify }           from "util";

import { PlayStateCache } from "./types";

export const execp = promisify(exec);

export const rnd = (ceil: number) => Math.floor(ceil * Math.random());
export const between = (min: number, val: number, max: number) => Math.min(max, Math.max(min, val));
export const wait = (ms: number) => new Promise<void>((resolve: () => void) => setTimeout(resolve, ms));
export const arrayWrap = (x: unknown) => Array.isArray(x) ? x : [ x ];
export const now = () => new Date().getTime();

export function removeNth<T>(arr: Array<T>, n: number): Array<T> {
  return [...arr.slice(0, n), ...arr.slice(n+1)];
}

export const readJson = (path: string) => fs.existsSync(path)
  ? JSON.parse(fs.readFileSync(path, {encoding: "utf-8"}))
  : {};

export const writeCache = (data: PlayStateCache) => fs.writeFileSync(
  `${__dirname}/cache.local.json`,
  JSON.stringify(data, undefined, 2)
);

let mqttClient: MqttClient = null;

export function mqtt(ip: string) {
  if (!mqttClient) mqttClient = connect(`mqtt://${ip}`);
  return mqttClient
}

export async function ffprobeTags(file: string, tags: string[]) {
  const flags = `-show_entries format_tags=${tags.join(',')} -v 16`;
  const { stdout } = await execp(
    `ffprobe ${flags} -of default=noprint_wrappers=1:nokey=1 ${file}`
  );
  const result = stdout.split("\n");
  return tags.reduce((out, tag, n) => ({ ...out, [tag]: result[n] }), {} as Record<string, string>);
}
