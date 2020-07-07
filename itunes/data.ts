import * as fs from "fs";
import {
  iTunesAlbum,
  iTunesArtist,
  iTunesPlaylist,
  iTunesTrack,

  EntityFilter,
  iTunesSubstitutions,
} from "./types";

export const readJson = (file: string) => JSON.parse(fs.readFileSync(file, {encoding: "utf-8"}));

export const albumsJson    = (): iTunesAlbum[]    => readJson("./data/albums.json");
export const artistsJson   = (): iTunesArtist[]   => readJson("./data/artists.json");
export const playlistsJson = (): iTunesPlaylist[] => readJson("./data/playlists.json");
export const tracksJson    = (): iTunesTrack[]    => readJson("./data/tracks.json");

export const substitutionsJson = (): iTunesSubstitutions => readJson("./custom/substitutions.json");

export const filterDenyJson = (): EntityFilter => readJson("./custom/filter_deny.json");
export const filterOnlyJson = (): EntityFilter => readJson("./custom/filter_only.json");
