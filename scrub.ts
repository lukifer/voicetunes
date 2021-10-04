import removeAccents from "remove-accents";
import writtenNumber from "written-number";
import {readJson} from "./utils";
import {
  StringReplaceTuple,
  ArtistSentence,
  AlbumSentence,
  TrackSentence,
  EntityFilterType,
} from "./types";

declare global { interface String { replaceAll(tuples: StringReplaceTuple[]): string; } }
String.prototype.replaceAll = function(tuples: StringReplaceTuple[]): string {
  return tuples.reduce((str, t) => str.replace(t[0], t[1]), this);
};

export const substitutionsJson = (): iTunesSubstitutions => readFilters("substitutions", {});
export const filterDenyJson    = (): EntityFilter        => readFilters("filter_deny",   []);
export const filterOnlyJson    = (): EntityFilter        => readFilters("filter_only",   []);

export const substitutions = substitutionsJson();
export const filterDeny = filterDenyJson();
export const filterOnly = filterOnlyJson();

const filterKeys = ["albums", "artists", "genres", "playlists", "tracks"];
const readFilters = (filterType: string, empty: [] | {}) => {
  const customFilters = { filter_deny, filter_only, substitutions };
  return filterKeys.reduce((acc, k) => ({ [k]: empty, ...acc }), customFilters[filterType]);
};

const wordSubstitutions: StringReplaceTuple[] = Object.keys(substitutions.words || {})
  .reduce((acc, word) => [
    ...acc,
    [new RegExp(`\\b${word}\\b`, "g"), substitutions.words[word]]
  ], [] as StringReplaceTuple[]);

const ordinalWordsJson = readJson("./data/ordinalWords.json");
const ordinalWords = ordinalWordsJson.reverse() as StringReplaceTuple[];

const romanNumerals = readJson("./data/romanNumerals.json");
const romanNumeralsRegex: StringReplaceTuple[] = romanNumerals.map((x: StringReplaceTuple) => (
  [ new RegExp(x[0]), x[1] ])
);

const numberWords = (x: string) => ` ${writtenNumber(parseInt(x), {noAnd: true}).replace(/-/g, " ")} `;

export function scrub(str: string) {
  return removeAccents(str.toLowerCase())
    .replace(         /\./g, " ")
    .replace(      /[&\+]/g, " and ")
    .replace(        /\s+/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(      /\sn\s/g, " and ")
    .replaceAll(wordSubstitutions)
    ;
}

export function scrubTrackName(trackName: string): TrackSentence {
  const trackNameBase = (substitutions.tracks[trackName] || trackName)
    .replace(/\(?Pt\.\s([0-9])\)?$/, "Part $1")
    .replace(/No\.\s?([0-9])/, "Number $1")
    .replace(/\[.+$/, "");
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
  const albumLower = (substitutions.albums[albumName] || albumName).toLowerCase();
  return scrub(albumLower)
    .replaceAll(ordinalWords)
    .replaceAll(romanNumeralsRegex)
    .replace(/\[.+$/, "")
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
