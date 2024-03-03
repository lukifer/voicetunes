import { sql } from "@databases/sqlite";

import {
  dbQuery,
  dbRawValue,
} from "./db";

import {
  TrackEntity,
} from "./generated/dbTypes";

import {
  readJson,
  rnd,
} from "./utils";

import {
  MessagePlayAlbum,
  MessagePlayArtist,
  MessagePlayArtistAlbumByNumber,
  MessagePlayRandomAlbumByArtist,
  MessagePlayGenre,
  MessagePlayTrack,
  MessagePlayYear,
  MessageStartPlaylist,
  NumberMap,
  StringTuple,
} from "./types";

export type Tracks = Array<Pick<TrackEntity, 'location' | 'persistent_id'>>
export type ArtistTracks = Array<Pick<TrackEntity, 'artist' | 'location' | 'persistent_id'>>

const {log} = console;
function err(msg: string, also: unknown) {
  log(`err: ${msg}`, also);
  return null;
}

const years   = readJson("./data/years.json");
const decades = readJson("./data/decades.json");

const ord = readJson("./data/ordinalWords.json");
const ordinalToNum: NumberMap =
  ord.reduce((acc: NumberMap, x: StringTuple) => ({
    ...acc,
    [x[1]]: parseInt(x[0]) - 1,
  }), {} as NumberMap);

export function trackLocations(files: Tracks | null, usePersistentId = false) {
  return files?.map(f =>
    usePersistentId
    ? f.persistent_id
    : f.location.split("/iTunes%20Media/Music/")[1] || ""
  ) ?? [];
}

export const whereYear = (year: number, range?: number) =>
  range
  ? sql`AND t.year >= ${year} AND t.year <= ${year+range}`
  : sql`AND t.year = ${year}`;

export async function queryTracksByArtist(msg: MessagePlayArtist, minRating: number): Promise<Tracks | null> {
  const { slots } = msg;
  if(!slots?.artist) return err("no artist", msg);

  const artistTracks = await dbQuery(sql`
    SELECT t.location, t.persistent_id
    FROM vox_artists va
    INNER JOIN tracks t ON va.artist = t.artist
    WHERE va.sentence = ${slots.artist} AND t.rating >= ${minRating}
  `) as Tracks;

  if(!artistTracks?.length) {
    return err(`no tracks for ${slots.artist}`, msg);
  } else {
    return artistTracks;
  }
}

export async function queryRandomAlbumByArtist(msg: MessagePlayRandomAlbumByArtist): Promise<Tracks | null> {
  const { slots } = msg;
  if(!slots?.artist) return err("no albums for artist", msg);

  const [{ count }] = await dbQuery(sql`
    SELECT COUNT(DISTINCT t.album) as count
    FROM vox_artists va
    INNER JOIN tracks t ON va.artist = IFNULL(t.album_artist, t.artist)
    WHERE va.sentence = ${slots.artist} AND album IS NOT NULL AND year IS NOT NULL
    GROUP BY va.sentence
  `) as Array<{count: number}>;

  if (!count) {
    return err(`no albums for ${slots.artist}`, msg);
  } else {
    return queryTracksByArtistAlbumNumber({
      ...msg,
      intentName: "PlayArtistAlbumByNumber",
      slots: {
        playaction: msg.slots.playaction,
        artist: slots.artist,
        albumnum: ord[rnd(count)]?.[1] || "first",
      },
    })
  }
}

export async function queryTracksByArtistAlbumNumber(msg: MessagePlayArtistAlbumByNumber): Promise<Tracks | null> {
  const { slots } = msg;
  if(!slots?.albumnum || !slots?.artist) return err("no artist or album number", msg);
  const albumIndex = ordinalToNum[slots.albumnum] || 0;
  const direction = dbRawValue(slots.albumnum === "latest" ? "DESC" : "ASC");
  const albumNumTracks = await dbQuery(sql`
    SELECT tracks.location, tracks.persistent_id
    FROM tracks
    INNER JOIN (
      SELECT t.album, IFNULL(t.album_artist, t.artist) as album_artist
      FROM vox_artists va
      INNER JOIN tracks t ON va.artist = IFNULL(t.album_artist, t.artist)
      WHERE va.sentence = ${slots.artist}
        AND t.album IS NOT NULL
        AND t.year IS NOT NULL
        AND t.compilation IS NULL
      GROUP BY t.album, t.year
      ORDER BY t.year ${direction}
      LIMIT 1 OFFSET ${albumIndex}
    ) as a ON a.album = tracks.album AND a.album_artist = IFNULL(tracks.album_artist, tracks.artist)
    ORDER BY tracks.disc_number ASC, tracks.track_number ASC
  `) as Tracks;

  if(!albumNumTracks?.length) {
    return err(`no tracks found for ${slots.artist} album #${albumIndex}`, msg);
  } else {
    return albumNumTracks;
  }
}

export async function queryTracksByAlbum(msg: MessagePlayAlbum): Promise<ArtistTracks | null> {
  const { slots } = msg;
  const albumTracks = await dbQuery(sql`
    SELECT t.location, t.artist, t.persistent_id
    FROM vox_albums va
    INNER JOIN tracks t ON va.album = t.album AND (va.artist IS NULL OR va.artist = IFNULL(t.album_artist, t.artist))
    WHERE va.sentence = ${slots.album}
    GROUP BY t.track_id
    ORDER BY t.disc_number ASC, t.track_number ASC
  `) as ArtistTracks;

  // FIXME: handle multiple albums with the same name

  if (!albumTracks?.length) {
    return err(`no tracks found for album ${slots.album}`, msg);
  } else {
    return albumTracks;
  }
}

export async function queryTracksByGenre(msg: MessagePlayGenre, minRating: number): Promise<Tracks | null> {
  const { slots } = msg;
  if(!slots?.genre) return err("no genre", msg);
  const { decade, genre, year } = slots;
  const genreTracks = await dbQuery(sql`
    SELECT t.location, t.persistent_id
    FROM vox_genres vg
    INNER JOIN tracks t ON vg.genre = t.genre
    WHERE vg.sentence = ${genre}
      AND t.rating >= ${minRating}
      ${year   ? whereYear(years[year])        : sql``}
      ${decade ? whereYear(decades[decade], 9) : sql``}
  `) as Tracks;

  if (!genreTracks?.length) {
    return err(`no tracks found for genre ${genre}`, msg);
  } else {
    return genreTracks;
  }
}

export async function queryTracksByPlaylist(msg: MessageStartPlaylist, maxTracks?: number): Promise<Tracks | null> {
  const { slots } = msg;
  const { playlistaction } = slots;
  if(!slots?.playlist) return err("no playlist", msg);
  const shuffle = (playlistaction === "shuffle");
  const orderBy = shuffle
    ? dbRawValue("ORDER BY RANDOM()")
    : sql`ORDER BY ${sql.ident("pi", "pos")}`;

  const playlistTracks = await dbQuery(sql`
    SELECT t.location, t.persistent_id
    FROM vox_playlists vp
    INNER JOIN playlist_items pi ON vp.playlist_id = pi.playlist_id
    INNER JOIN tracks t ON pi.track_id = t.track_id
    WHERE vp.sentence = ${slots.playlist}
    ${orderBy}
    LIMIT ${maxTracks || 99999}
  `) as Tracks;

  if(!playlistTracks?.length) {
    return err(`no tracks found for playlist ${slots.playlist}`, msg);
  } else {
    return playlistTracks;
  }
}

export async function queryTrack(msg: MessagePlayTrack): Promise<Tracks | null> {
  const { slots } = msg;
  if(!slots?.track) return err("no track", msg);
  const tracks = await dbQuery(sql`
    SELECT t.location, t.persistent_id
    FROM vox_tracks vt
    INNER JOIN tracks t ON vt.track_id = t.track_id
    WHERE vt.sentence = ${slots.track}
  `) as Tracks;

  if(!tracks?.length) {
    return err(`no tracks found for ${slots.track}`, msg);
  } else {
    return tracks;
  }
}

export async function queryTracksByYear(msg: MessagePlayYear, minRating: number): Promise<Tracks | null> {
  const { slots } = msg;
  const { decade, year } = slots;
  if(!year && !decade) return err("no year", msg);
  const yearTracks = await dbQuery(sql`
    SELECT t.location, t.persistent_id
    FROM tracks t
    WHERE t.rating >= ${minRating}
    ${year   ? whereYear(years[year])        : sql``}
    ${decade ? whereYear(decades[decade], 9) : sql``}
  `) as Tracks;

  if(!yearTracks?.length) {
    return err("no tracks", msg);
  } else {
    return yearTracks;
  }
}
