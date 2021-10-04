#!/usr/bin/env node-ts

// adapted from https://github.com/drien/itunes-to-sql

import {ArgumentParser} from "argparse";
import * as fs from "fs";
import Moment from "moment";
import plistlib from "plistlib";
import sqlite3 from "sqlite3";

type Args = {
  db: string;
  library: string;
  overwrite?: boolean;
}
export type PlistPlaylistItem = {
  ["Track ID"]: number;
}
export type PlistPlaylist = {
  ["Playlist Items"]?: Array<PlistPlaylistItem>;
  Name: string;
  ["Playlist ID"]: string;
  ["Playlist Persistent ID"]: string;
  Folder: boolean;
  ["All Items"]: boolean;
  Master: boolean;
  Visible: boolean;
}
export type PlistTrack = {
  "Track ID": number;
  "Name": string;
  "Artist": string;
  "Album Artist": string;
  "Composer": string;
  "Album": string;
  "Genre": string;
  "Kind": string;
  "Size": number;
  "Total Time": number;
  "Disc Number": number;
  "Disc Count": number;
  "Track Number": number;
  "Track Count": number;
  "Year": number;
  "Date Modified": Moment | string;
  "Date Added": Moment | string;
  "Bit Rate": number;
  "Sample Rate": number;
  "Release Date": Moment | string;
  "Normalization": number;
  "Sort Album": string;
  "Sort Album Artist": string;
  "Sort Artist": string;
  "Sort Name": string;
  "Persistent ID": string;
  "Track Type": string;
  "Protected": boolean,
  "Purchased": boolean,
  "Location": string;
  "File Folder Count": number;
  "Library Folder Count": number;
}
export type PlistLibrary = {
  Playlists: Array<PlistPlaylist>
  Tracks: Record<string, PlistTrack>;
}
export type Playlist = {
  ["Playlist Items"]: Array<number>;
  Name: string;
  ["Playlist ID"]: string;
  ["Playlist Persistent ID"]: string;
  Folder: boolean;
  ["All Items"]: boolean;
  Master: boolean;
  Visible: boolean;
}
export type Library = {
  Tracks: Record<string, Record<string, string>>;
  Playlists: Array<Playlist>;
}

type SqlInsert = [
  string,
  Array<string|number|boolean>,
];

const slugify = (name: string) => name.toLowerCase().replace(/ /g, "_");

const num_to_str = (num: number) => Buffer.from(num.toString(16), "hex").toString()

const map_types = (map: Record<string, string[]>) =>
  Object.entries(map).reduce((types_map, [data_type, keys]) => ({
    ...types_map,
    ...keys.reduce((acc, k) => ({ ...acc, [k]: data_type }), {})
  }), {})

const get_parameterized = (table: string, keys: string[], len: number) =>
  `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${[...Array(len)].fill("?")})`;

const db_run = (db: sqlite3.Database, sql: string, vals: Array<string|boolean|number> = []) =>
  new Promise(resolve => db.run(sql, vals, (err: Error) => {
    if(err) console.log(err, sql, vals);
    return resolve();
  }));

export function strip_plist(item: any) {
  if (typeof item !== "object" || !item?.type)
    return item

  const {value} = item
  switch (item.type) {
    case "array": return value.map((x: any) => strip_plist(x))
    case "dict": return Object.keys(value).reduce((acc, k) => ({...acc, [k]: strip_plist(value[k])}), {})
    case "Buffer": return {}; // TODO
    default: return value;
  }
}

export const plist_load = (plist_path: string) =>
  new Promise(resolve => (plistlib as any).load(plist_path.replace(/^~/, process.env.HOME),
    (err: Error, pre_result: unknown) => {
      if(err || !pre_result) { console.log(err || `Could not read file ${plist_path}`); process.exit(); }
      const result = strip_plist(pre_result) as PlistLibrary
      return resolve({
        Tracks: Object.values(result.Tracks || {}).map((track: PlistTrack) =>
          Object.entries(track)
            .reduce((acc, [k, v]) => ({...acc, [k]: v instanceof Moment ? v.toISOString() : v}), {})
        ),
        Playlists: (result.Playlists || []).map(playlist => ({
          ...playlist,
          ["Playlist Items"]: (playlist["Playlist Items"] || []).map(playlistItem => playlistItem["Track ID"]),
        })),
      });
    }
  ));

export function process_tracks(library: Library): [string, SqlInsert[]] {
  let all_keys = new Set<string>();
  const inserts = [] as SqlInsert[];

  for (const track_id in Object.keys(library['Tracks'])) {
    const track = library['Tracks'][track_id];

    if (track["File Type"] && /^[0-9]+$/.test(`${track["File Type"]}`)) {
      track["File Type"] = num_to_str(parseInt(track["File Type"])).replace(/ /g, '');
    }

    const track_keys = Object.keys(track).map(slugify);
    const track_vals = Object.values(track);

    all_keys = new Set([...Array.from(all_keys), ...track_keys])

    inserts.push([
      get_parameterized('tracks', track_keys, track_vals.length),
      track_vals,
    ]);
  }

  const fields = map_types({
    "TEXT": [
      "name", "composer", "artist", "album_artist", "album", "genre", "kind",
      "file_type", "track_type", "location", "persistent_id", "comments",
      "play_date_utc", "date_modified", "date_added",
    ],
    "INTEGER": [
      "disc_number", "disc_count", "track_number", "track_count", "compilation",
      "size", "total_time", "year", "bit_rate", "sample_rate", "rating",
      "play_count", "play_date", "start_time", "stop_time",
      "disabled", "bpm", "volume_adjustment", "normalization",
    ],
    "INTEGER PRIMARY KEY": ["track_id"],
  })

  const track_fields = Array.from(all_keys).map((k: string) => `${k} ${fields[k] || ''}`)

  return [
    `CREATE TABLE tracks (${track_fields.join(", ")})`,
    inserts,
  ];
}

export function process_playlists(library: Library): [string, string, SqlInsert[]] {
  let all_keys = new Set();
  const inserts = [] as SqlInsert[];

  library["Playlists"].forEach(playlist => {
    const { ["Playlist Items"]: track_ids, ...playlist_data } = playlist

    const playlist_keys = Object.keys(playlist_data).map(slugify);
    const playlist_vals = Object.values(playlist_data);

    all_keys = new Set([...Array.from(all_keys), ...playlist_keys]);

    inserts.push([
      get_parameterized("playlists", playlist_keys, playlist_vals.length),
      playlist_vals,
    ]);

    track_ids.forEach(track_id => {
      inserts.push([
        get_parameterized("playlist_items", ["playlist_id", "track_id"], 2),
        [playlist["Playlist ID"], track_id],
      ]);
    })
  })

  const fields = map_types({
    "TEXT": ["name", "playlist_persistent_id"],
    "INTEGER PRIMARY KEY": ["playlist_id"],
  })

  const playlist_fields = Array.from(all_keys).map((k: string) => `${k} ${fields[k] || ''}`)

  const playlists_table = `CREATE TABLE playlists (${playlist_fields.join(", ")})`;
  const pi_keys = ["playlist_id", "track_id"];
  const foreign_keys = pi_keys.map(k => `FOREIGN KEY(${k}) REFERENCES ${k.replace(/_id$/, "s")}(${k})`).join(", ");
  const items_table = `CREATE TABLE playlist_items (${pi_keys.map(k => k+" INTEGER NOT NULL").join(", ")}, ${foreign_keys})`;

  return [playlists_table, items_table, inserts];
}

export async function convert_to_db(args: Args) {
  if (fs.existsSync(args.db)) {
    if (args.overwrite) {
      fs.unlinkSync(args.db);
    } else {
      console.log(`${args.db} already exists. Use option --overwrite to overwrite it.`)
      process.exit();
    }
  }

  const library = await plist_load(args.library) as any;

  const [table_tracks, insert_tracks] = process_tracks(library);
  const [table_playlists, table_playlist_items, insert_playlists] = process_playlists(library);

  const db = new sqlite3.Database(args.db);

  await db_run(db, table_tracks);
  await db_run(db, table_playlists);
  await db_run(db, table_playlist_items);

  [...insert_tracks, ...insert_playlists].forEach(async ([sql, vals]) => await db_run(db, sql, vals));

  db.close();

  return (insert_tracks.length + insert_playlists.length)
}

async function main() {
  const defaultArgs = {
    library: "~/Music/iTunes/iTunes\ Music\ Library.xml",
    db: "itunes.db",
  } as Args;

  const parser = new ArgumentParser();
  parser.add_argument("--library", {
    help: "Path to XML library file",
    default: defaultArgs.library,
  });
  parser.add_argument("--db", {
    help: "Path to XML library file",
    default: defaultArgs.db,
  });
  parser.add_argument("--overwrite", {
    help: "Overwrite output db file?",
    const: true,
    nargs: "?",
  });
  const args = parser.parse_args();

  const queryCount = await convert_to_db({...args});

  console.log(`${queryCount} queries written to ${args.db}`);
}

const isCLI = !module.parent;
if (isCLI) main();
