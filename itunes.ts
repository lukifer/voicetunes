import {sql} from '@databases/sqlite';
import {
  filterAlbums,
  filterArtists,
  filterGenres,
  filterPlaylists,
  filterTracks,
  scrubAlbumName,
  scrubArtistName,
  scrubTrackName,
  substitutions,
} from "./scrub";

import {
  SqlPlaylist,
  SqlTrack,
} from "./types";

import {
  dbClose,
  dbQuery,
  dbRaw,
  knexConnect,
} from "./db";

import config from "./config";
const {
  EXCLUDE_GENRES,
  FILE_EXTENSIONS,
} = config;

const knex = knexConnect();

const fileExtensionsLike = FILE_EXTENSIONS.map(ext => sql`location LIKE ${"%"+ext}`);
const fileExtensionWhere = sql`${sql.join(fileExtensionsLike, sql`) OR (`)}`;

async function resetTables() {
  const voxTables = {
    "vox_albums": {
      "sentence": "text",
      "album": "text",
      "artist": "text",
    },
    "vox_artists": {
      "sentence": "text",
      "artist": "text",
    },
    "vox_genres": {
      "sentence": "text",
      "genre": "text",
    },
    "vox_playlists": {
      "sentence": "text",
      "playlist_id": "integer",
    },
    "vox_tracks": {
      "sentence": "text",
      "track_id": "integer",
    },
  };
  const foreignKeys = {
    "vox_playlists": ["playlist_id", "playlists"],
    "vox_tracks": ["track_id", "tracks"],
  }
  for (const entry of Object.entries(voxTables)) {
    const [table, fields] = entry;
    await dbQuery(sql`DROP TABLE IF EXISTS ${sql.ident(table)}`);
    const fieldsStr = Object.entries(fields).map(([name, type]) => `"${name}" ${type}`).join(", ");
    let createSql = `CREATE TABLE "${table}" ("id" integer, ${fieldsStr}, PRIMARY KEY (id)`;
    if (foreignKeys[table]) {
      const [foreignKey, foreignTable] = foreignKeys[table];
      createSql += `, FOREIGN KEY(${foreignKey}) REFERENCES ${foreignTable}(${foreignKey})`;
    }
    createSql += ')';
    await dbRaw(createSql);
  }
}

async function doAlbums() {
  const albumsSql = sql`
    SELECT artist, album, compilation, year, MAX(rating) as max_rating,
      (CASE WHEN album_artist IS NOT NULL OR compilation = 1 THEN album_artist ELSE artist END) as derived_artist
    FROM tracks
    WHERE album IS NOT NULL
    AND track_number IS NOT NULL
    AND (${fileExtensionWhere})
    GROUP BY album, derived_artist
    HAVING max_rating >= 80
  `;
  const albums = await dbQuery(albumsSql) as SqlTrack[] || [];
  const filteredAlbums = albums.filter(({album}) => filterAlbums(album));

  for (const album of filteredAlbums) {
    const albumSentence  = scrubAlbumName(album.album);
    if(!albumSentence) return;
    const newRows = [{
      sentence: albumSentence,
      album: album.album,
      artist: null,
    }];
    if (!album.compilation && (album.album_artist || album.artist)) {
      const artistSentence = scrubArtistName(album.album_artist || album.artist);
      newRows.push({
        sentence: `${albumSentence} by ${artistSentence}`,
        album: album.album,
        artist: album.album_artist || album.artist,
      });
    }
    for (const newRow of newRows) {
      await dbRaw(knex('vox_albums').insert(newRow).toString());
    }
  }
}

async function doArtists() {
  const artistSql = sql`
    SELECT artist, MAX(rating) as max_rating
    FROM tracks
    WHERE (${fileExtensionWhere})
    GROUP by artist
    HAVING max_rating >= 80
  `;
  const artistsRows = await dbQuery(artistSql);
  const artistNames = (artistsRows as SqlTrack[]).map(x => x.artist);
  const filteredArtists = artistNames.filter(filterArtists);

  for (const artist of filteredArtists) {
    await dbRaw(knex('vox_artists').insert({
      sentence: scrubArtistName(artist),
      artist,
    }).toString());
  }
}

async function doGenres() {
  const genresSql = sql`
    SELECT genre
    FROM tracks
    WHERE genre IS NOT NULL
    AND (${fileExtensionWhere})
    GROUP BY genre
  `;
  const genres = await dbQuery(genresSql) as SqlTrack[] || [];
  const filteredGenres = genres.filter(({genre}) => filterGenres(genre));

  for (const genreEntry of filteredGenres) {
    // const genreSentence = (substitutions.genres[genre] || genre).toLowerCase();
    const {genre} = genreEntry;
    const genreSentence = genre.toLowerCase();
    const newRow = {
      sentence: genreSentence,
      genre,
    };
    await dbRaw(knex('vox_genres').insert(newRow).toString());
  }
}

async function doPlaylists() {
  const playlistsSql = sql`
    SELECT name, playlist_id
    FROM playlists
    WHERE distinguished_kind IS NULL
    AND folder IS NULL
  `;
  const playlists = await dbQuery(playlistsSql) as SqlPlaylist[] || [];
  const filteredPlaylists = playlists.filter(({name}) => filterPlaylists(name));

  for (const playlist of filteredPlaylists) {
    const {name, playlist_id} = playlist;
    const playlistSentence = (substitutions.playlists[name] || name).toLowerCase();
    const newRow = {
      sentence: playlistSentence,
      playlist_id,
    };
    await dbRaw(knex('vox_playlists').insert(newRow).toString());
  }
}

async function doTracks() {
  const genreExclude = EXCLUDE_GENRES?.length
    ? sql`AND genre NOT IN (${sql.join(EXCLUDE_GENRES.map((x: string) => sql`${x}`), sql`,`)})`
    : sql``;
  const tracksSql = sql`
    SELECT artist, name, track_id
    FROM tracks
    WHERE rating >= 80
    AND (${fileExtensionWhere})
    ${genreExclude}
  `;
  const tracks = await dbQuery(tracksSql) as SqlTrack[] || [];
  const filteredTracks = tracks.filter(({name}) => filterTracks(name));

  for (const track of filteredTracks) {
    const {artist, name, track_id} = track;
    const trackSentence = scrubTrackName(name);
    const trackByArtistSentence = `${trackSentence} by ${scrubArtistName(artist)}`;
    const newRows = [
      { sentence: trackSentence },
      { sentence: trackByArtistSentence },
    ];
    for (const newRow of newRows) {
      console.log(knex('vox_tracks').insert({
        ...newRow,
        track_id,
      }).toString());
      await dbRaw(knex('vox_tracks').insert({
        ...newRow,
        track_id,
      }).toString());
    }
  }
}

async function go() {
  await resetTables();
  await doAlbums();
  await doArtists();
  await doGenres();
  await doPlaylists();
  await doTracks();
  dbClose()
}

go();
