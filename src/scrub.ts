import removeAccents from "remove-accents";
import writtenNumber from "written-number";
import {readJson} from "./utils";
import {
  StringReplaceTuple,
  ArtistSentence,
  AlbumSentence,
  GenreSentence,
  TrackSentence,
  EntityFilterType,
  EntityFilter,
  iTunesSubstitutions,
} from "./types";

import { loadConfig } from "./config";

const config = await loadConfig()
const {
  FILTER_DENY,
  FILTER_ONLY,
  SUBSTITUTIONS,
} = config;

declare global { interface String { replaceAll(tuples: StringReplaceTuple[]): string; } }
String.prototype.replaceAll = function(tuples: StringReplaceTuple[]): string {
  return tuples.reduce((str, t) => str.replace(t[0], t[1]), this);
};

const filterKeys = ["albums", "artists", "genres", "playlists", "tracks"];
const readFilters = (filterType: string, empty: [] | {}) => {
  const customFilters = {
    filter_deny: FILTER_DENY,
    filter_only: FILTER_ONLY,
    substitutions: SUBSTITUTIONS,
  };
  return filterKeys.reduce((acc, k) => ({ [k]: empty, ...acc }), customFilters[filterType]);
}

export const substitutions: iTunesSubstitutions = readFilters("substitutions", {});
export const filterDeny: EntityFilter           = readFilters("filter_deny",   []);
export const filterOnly: EntityFilter           = readFilters("filter_only",   []);

const wordSubstitutions: StringReplaceTuple[] = Object.keys(substitutions.words || {})
  .reduce((acc, word) => [
    ...acc,
    [new RegExp(`\\b${word}\\b`, "g"), substitutions.words[word]]
  ], [] as StringReplaceTuple[])
  ;

const ordinalWordsJson = readJson("./data/ordinalWords.json");
const ordinalWords = ordinalWordsJson.reverse() as StringReplaceTuple[];

const numberWords = (x: string) => ` ${writtenNumber(parseInt(x), {noAnd: true}).replace(/-/g, " ")} `;

const romanNumerals = readJson("./data/romanNumerals.json") as string[];
const romanNumeralsRegex: StringReplaceTuple[] =
  romanNumerals.reduce((acc: StringReplaceTuple[], roman, n) => [
    ...acc,
    [ new RegExp(`\\s${roman}$`), ` ${numberWords(`${n+1}`)}` ],
    [ new RegExp(`\\s${roman}:`), ` ${numberWords(`${n+1}`)}` ],
  ], [] as StringReplaceTuple[])
  ;

export function scrub(str: string) {
  return removeAccents(str.toLowerCase())
    .replace(      /\[.+$/, "")
    .replace(     /[.\-_]/g, " ")
    .replace(      /[&\+]/g, " and ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(      /\sn\s/g, " and ")
    .replace(        /\s+/g, " ")
    .replaceAll(wordSubstitutions)
    ;
}

export function scrubTrackName(trackName: string): TrackSentence {
  const trackNameBase = (substitutions.tracks[trackName] || trackName)
    .replace(/\(?Pt\.\s([0-9])\)?$/, "Part $1")
    .replace(/No\.\s?([0-9])/, "Number $1")
    .replace(/\[.+$/, "")
    ;
  return scrub(trackNameBase.toLowerCase())
    .replaceAll(ordinalWords)
    .replaceAll(romanNumeralsRegex)
    .replace(/\sbonus\strack$/, "")
    .replace(/[0-9]+/g, numberWords)
    .replace(   /\s+/g, " ")
    .trim()
    ;
}

export function scrubArtistName(artistName: string): ArtistSentence {
  const artistLower = (substitutions.artists[artistName] || artistName).toLowerCase();
  return scrub(artistLower)
    .replace( /^mr\s/g, "mister ")
    .replace(/[0-9]+/g, numberWords)
    .replace(   /\s+/g, " ")
    .trim()
    ;
}

export function scrubAlbumName(albumName: string): AlbumSentence {
  const albumLower = (substitutions.albums[albumName] || albumName)
    .toLowerCase()
    .replace(/\[.+$/, "")
    ;
  return scrub(albumLower)
    .replaceAll(ordinalWords)
    .replaceAll(romanNumeralsRegex)
    .replace(/original broadway cast (album|recording)$/, "")
    .replace(/ ost$/, "")
    .replace(/original (motion picture )?(game )?soundtrack/, "soundtrack")
    .replace(  /\sep$/g, "")
    .replace( /^vol\s/g, " volume ")
    .replace(/\svol\s/g, " volume ")
    .replace( /[0-9]+/g, numberWords)
    .replace(/\s+/g, " ")
    .trim()
}

export function scrubGenre(genreName: string): GenreSentence {
  const genreLower = (substitutions.genres[genreName] || genreName).toLowerCase();
  return scrub(genreLower).trim();
}

export const entityFilter = (entity: string, entityType: EntityFilterType) => {
  if (!entity) return false;
  return (filterOnly[entityType].length)
       ?  filterOnly[entityType].includes(entity)
       : !filterDeny[entityType].includes(entity);
};

export const filterAlbums    = (str: string) => entityFilter(str, "albums");
export const filterArtists   = (str: string) => entityFilter(str, "artists");
export const filterGenres    = (str: string) => entityFilter(str, "genres");
export const filterPlaylists = (str: string) => entityFilter(str, "playlists");
export const filterTracks    = (str: string) => entityFilter(str, "tracks");
