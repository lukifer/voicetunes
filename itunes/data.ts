import * as fs from "fs";
import {
  iTunesAlbum,
  iTunesArtist,
  iTunesPlaylist,
  iTunesTrack,

  EntityFilter,
  iTunesSubstitutions,
} from "./types";

export const readJson = (file: string) => fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file, {encoding: "utf-8"}))
  : {};

const filterKeys = ["albums", "artists", "playlists", "tracks"];
const readFilters = (file: string, empty: [] | {}) => {
  const fileFilters = readJson(`./custom/${file}.json`);
  return filterKeys.reduce((acc, k) => ({ [k]: empty, ...acc }), fileFilters);
};

export const albumsJson    = (): iTunesAlbum[]    => readJson("./data/albums.json");
export const artistsJson   = (): iTunesArtist[]   => readJson("./data/artists.json");
export const playlistsJson = (): iTunesPlaylist[] => readJson("./data/playlists.json");
export const tracksJson    = (): iTunesTrack[]    => readJson("./data/tracks.json");

export const substitutionsJson = (): iTunesSubstitutions => readFilters("substitutions", {});
export const filterDenyJson    = (): EntityFilter        => readFilters("filter_deny",   []);
export const filterOnlyJson    = (): EntityFilter        => readFilters("filter_only",   []);
