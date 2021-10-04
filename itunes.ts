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

import { dbConnect, dbExec, dbQuery } from "./utils";

import config from "./config";
const {
  EXCLUDE_GENRES,
  FILE_EXTENSIONS,
  PATH_DATABASE,
} = config;

const [db, knex] = dbConnect(PATH_DATABASE);

const fileExtensionWhere = FILE_EXTENSIONS.map(ext => `location LIKE "%${ext}"`).join(" OR ")

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
  Object.entries(voxTables).forEach(async ([table, fields]) => {
    await dbExec(`DROP TABLE IF EXISTS "${table}"`);
    const fieldsStr = Object.entries(fields).map(([name, type]) => `"${name}" ${type}`).join(", ");
    let createSql = `CREATE TABLE "${table}" ('id' integer, ${fieldsStr}, PRIMARY KEY (id)`;
    if (foreignKeys[table]) {
      const [foreignKey, foreignTable] = foreignKeys[table];
      createSql += `, FOREIGN KEY(${foreignKey}) REFERENCES ${foreignTable}(${foreignKey})`;
    }
    createSql += ')';
    await dbExec(createSql)
  });
}

async function doAlbums() {
  const albumsSql = `
    SELECT artist, album, compilation, year, MAX(rating) as max_rating, iif(album_artist IS NOT NULL OR compilation = 1, album_artist, artist) as derived_artist
    FROM tracks
    WHERE album IS NOT NULL
    AND track_number IS NOT NULL
    AND (${fileExtensionWhere})
    GROUP BY album, derived_artist
    HAVING max_rating >= 80
  `;
  const albums = await dbQuery(albumsSql) as SqlTrack[] || [];
  albums.filter(({album}) => filterAlbums(album)).forEach(async (album) => {
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
    newRows.forEach(async (newRow) =>
      await dbExec(knex('vox_albums').insert(newRow).toString())
    );
  });
}

async function doArtists() {
  const artistSql = `
    SELECT artist
    FROM tracks
    WHERE (${fileExtensionWhere})
    GROUP by artist
    HAVING rating >= 80
  `;
  const artistsRows = await dbQuery(artistSql);
  const artistNames = (artistsRows as SqlTrack[]).map(x => x.artist)

  artistNames.filter(filterArtists).forEach(async (artist: string) => {
    const artistSentence = scrubArtistName(artist);
    await dbExec(knex('vox_artists').insert({
      sentence: artistSentence,
      artist,
    }).toString())
  });
}

async function doGenres() {
  const genresSql = `
    SELECT genre
    FROM tracks
    WHERE genre IS NOT NULL
    AND (${fileExtensionWhere})
    GROUP BY genre
  `;
  const genres = await dbQuery(genresSql) as SqlTrack[] || [];
  genres.filter(({genre}) => filterGenres(genre)).forEach(async ({genre}) => {
    // const genreSentence = (substitutions.genres[genre] || genre).toLowerCase();
    const genreSentence = genre.toLowerCase();
    const newRow = {
      sentence: genreSentence,
      genre,
    }
    await dbExec(knex('vox_genres').insert(newRow).toString());
  });
}

async function doPlaylists() {
  const playlistsSql = `
    SELECT name, playlist_id
    FROM playlists
    WHERE master IS NULL
    AND distinguished_kind IS NULL
    AND folder IS NULL
  `;
  const playlists = await dbQuery(playlistsSql) as SqlPlaylist[] || [];
  playlists.filter(({name}) => filterPlaylists(name)).forEach(async ({name, playlist_id}) => {
    const playlistSentence = (substitutions.playlists[name] || name).toLowerCase();
    const newRow = {
      sentence: playlistSentence,
      playlist_id,
    }
    await dbExec(knex('vox_playlists').insert(newRow).toString());
  });
}

async function doTracks() {
  const tracksSql = `
    SELECT artist, name, track_id
    FROM tracks
    WHERE rating >= 80
    AND (${fileExtensionWhere})
    AND genre NOT IN ("${EXCLUDE_GENRES.join('","')}")
  `;
  const tracks = await dbQuery(tracksSql) as SqlTrack[] || [];
  tracks.filter(({name}) => filterTracks(name)).forEach(async ({artist, name, track_id}) => {
    const trackSentence = scrubTrackName(name);
    const trackByArtistSentence = `${trackSentence} by ${scrubArtistName(artist)}`;
    [
      { sentence: trackSentence },
      { sentence: trackByArtistSentence },
    ].forEach(async (newRow) => {
      await dbExec(knex('vox_tracks').insert({
        ...newRow,
        track_id,
      }).toString());
    })
  });
}

async function go() {
  await resetTables();
  await doAlbums();
  await doArtists();
  await doGenres();
  await doPlaylists();
  await doTracks();
  db.close()
}

go();
