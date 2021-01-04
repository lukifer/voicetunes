import removeAccents from "remove-accents";
import writtenNumber from "written-number";
import {
  readJson,
  filterDenyJson,
  filterOnlyJson,
  substitutionsJson,
} from "./data";
import {
  iTunesAlbum,
  iTunesArtist,
  iTunesPlaylist,
  iTunesTrack,
  iTunesEntity,
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

const ordinalWordsJson = readJson("./ordinalWords.json");
const ordinalWords = ordinalWordsJson.reverse() as StringReplaceTuple[];

const romanNumerals = readJson("./romanNumerals.json");
const romanNumeralsRegex: StringReplaceTuple[] = romanNumerals.map((x: StringReplaceTuple) => (
  [ new RegExp(x[0]), x[1] ])
);

export const substitutions = substitutionsJson();

const numberWords = (x: string) => ` ${writtenNumber(parseInt(x), {noAnd: true}).replace(/-/g, " ")} `;

const wordSubstitutions: StringReplaceTuple[] = Object.keys(substitutions.words || {})
  .reduce((acc, word) => [
    ...acc,
    [new RegExp(`\\b${word}\\b`, "g"), substitutions.words[word]]
  ], [] as StringReplaceTuple[]);

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

const filterDeny = filterDenyJson();
const filterOnly = filterOnlyJson();

export const entityFilter = (entity: iTunesEntity, entityType: EntityFilterType) => {
  const { Name } = entity;
  return (filterOnly[entityType].length)
       ?  filterOnly[entityType].includes(Name)
       : !filterDeny[entityType].includes(Name);
};

export const filterAlbum    = (album:    iTunesAlbum)    => entityFilter(album,    "albums");
export const filterArtist   = (artist:   iTunesArtist)   => entityFilter(artist,   "artists");
export const filterPlaylist = (playlist: iTunesPlaylist) => entityFilter(playlist, "playlists");
export const filterTrack    = (track:    iTunesTrack)    => entityFilter(track,    "tracks");
