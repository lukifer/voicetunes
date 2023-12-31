import { assertParse } from "typia";

import { exec }                from "child_process";
import * as fs                 from "fs";
import { promisify }           from "util";

import { PlayStateCache, StringMap } from "./types";

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

export const typedReadJson = <T>(path: string): Partial<T> => fs.existsSync(path)
? assertParse<T>(fs.readFileSync(path, {encoding: "utf-8"}))
: {};

export const writeCache = (data: PlayStateCache) => fs.writeFileSync(
  `${__dirname}/cache.local.json`,
  JSON.stringify(data, undefined, 2)
);

export const escQuotes = (str: string) => str.replace(/["]/g, '\\"')

export async function ffprobeTags(file: string, tags: string[]) {
  const supportedTags = [
    "title",
    "artist",
    "album",
    "track",
  ].filter(t => tags.includes(t))
  const flags = `-show_entries format_tags=${supportedTags.join(',')} -v 16`;
  const cmd = `ffprobe ${flags} -of default=noprint_wrappers=1 "${escQuotes(file)}"`;
  const { stdout } = await execp(cmd);
  const result = stdout.trim().split("\n");
  return result.reduce((out, str) => {
    const match = str.match(/^TAG:([a-z]+)=(.+)$/);
    return match?.length === 3
      ? {...out, [match[1]]: match[2]}
      : out
  }, {} as StringMap)
}

export const locationUriToPath = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ""));
export const pathToLocationUri = (path: string) => `file://${encodeURI(path)}`;
