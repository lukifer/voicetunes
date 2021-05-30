import * as fs from "fs";

import {
  artistsJson,
  playlistsJson,
  tracksJson,
} from "./data";
import {
  filterAlbum,
  filterArtist,
  filterPlaylist,
  filterTrack,
  scrubAlbumName,
  scrubArtistName,
  scrubTrackName,
  substitutions,
} from "./scrub";
import {
  iTunesArtist,
  iTunesAlbum,
  iTunesAlbumTrack,
  iTunesPlaylist,
  iTunesTrack,
  Artist,
  ArtistAndAlbum,
  Album,
  Track,
  ArtistMap,
  ArtistAlbumsMap,
  ArtistTracksMap,
  AlbumsMap,
  PlaylistTracksMap,
  TracksMap,
  OutputEntity,
  OutputMaps,
} from "./types";

import config from "../config";
const {
  EXCLUDE_GENRES,
  FILTER_ARTISTS_BY_PLAYLISTS,
  FILTER_TRACKS_BY_PLAYLISTS,
  PATH_ITUNES,
} = config;

const artistsData   = artistsJson();
const playlistsData = playlistsJson();
const tracksData    = tracksJson();

const home = process.env["HOME"];
const iTunesPath = "file://" + (PATH_ITUNES || `${home}/Music/iTunes/iTunes%20Media/Music/`);

// itunes-data appears to be bugged on exporting albums, so we collate this ourselves
let albumsBuildMap: Record<ArtistAndAlbum, iTunesAlbum> = {};

function albumTrackSort(a: iTunesAlbumTrack, b: iTunesAlbumTrack) {
  const { ["Disc Number"]: aDisc, ["Track Number"]: aNumber } = a;
  const { ["Disc Number"]: bDisc, ["Track Number"]: bNumber } = b;

  return (aDisc && bDisc && aDisc !== bDisc)
    ? aDisc   > bDisc   ? 1 : -1
    : aNumber > bNumber ? 1 : -1
    ;
}

function chronologicalAlbumSort(a: Album, b: Album) {
  return (a.year && b.year && a.year !== b.year)
    ? a.year > b.year ? 1 : -1
    : a.name.localeCompare(b.name)
    ;
}

function albumYear(album: iTunesAlbum) {
  const yearCount = album.Tracks
    .reduce((acc, t) => t.Year ? {
      ...acc,
      [t.Year]: (acc[t.Year] || 0) + 1,
    } : acc, {})
  const yearModeTuple = Object.keys(yearCount)
    .reduce((yearTuple, year) => (
      yearCount[year] > yearTuple[0]
        ? [yearCount[year], year]
        : yearTuple
    ), [0, null]);
  return yearModeTuple[1];
}

const songFileRegex = /\.m(p3|4a)$/i;

// Optional: only support playing by artist by artists in specific playlist(s)
const playByArtistFilter: Record<Artist, boolean> | null =
  FILTER_ARTISTS_BY_PLAYLISTS &&
  playlistsData
    .filter(({ Name }) => FILTER_ARTISTS_BY_PLAYLISTS?.includes(Name))
    .reduce((acc, { Tracks }) => ([ ...acc, ...Tracks ]), [] as iTunesTrack[])
    .filter(track => !!track)
    .reduce((acc, track) => ({
      ...acc,
      [track["Album Artist"] || track.Artist]: true
    }), {} as Record<Artist, boolean>)
    ;

// Optional: only support playing by track name for tracks in specific playlist(s)
const playTrackFilter: Record<iTunesTrack["Track ID"], boolean> | null =
  FILTER_TRACKS_BY_PLAYLISTS &&
  playlistsData
    .filter(({ Name }) => FILTER_TRACKS_BY_PLAYLISTS?.includes(Name))
    .reduce((acc, { Tracks }) => ([ ...acc, ...Tracks ]), [] as iTunesTrack[])
    .filter(track => !!track)
    .reduce((acc, { ["Track ID"]: TrackID }) => ({
      ...acc,
      [TrackID]: true,
    }), {} as Record<iTunesTrack["Track ID"], boolean>)
    ;

function albumArtistOfTrack(track: iTunesTrack): Artist {
  return /\/Compilations\//.test(track.Location)
    ? "Compilation"
    : track["Album Artist"] || track.Artist
}

function albumLocationOfTrack(track: iTunesTrack) {
  return track.Location.replace(iTunesPath, "").replace(/\/[^/]+\.m(p3|4a)$/i, "")
}

function writeOut(entity: OutputEntity, map: OutputMaps) {
  fs.writeFileSync(`maps/${entity}.json`, JSON.stringify(map, null, "\t"));
  process.stdout.write(`${Object.keys(map).length} ${entity} written\n`);
}

function processTracks(tracks: iTunesAlbumTrack[]): Track[] {
  return tracks.map((track: iTunesAlbumTrack) => {
    if(!track || !track.Name) {
      // console.log(`Missing track #${n}`, track);
      return null;
    }
    if(!track.Location) {
      // console.log("Missing track location!", track);
      return null;
    }
    return {
      name:        track.Name,
      artist:      track.Artist,
      album:       track.Album,
      albumArtist: track["Album Artist"],
      number:      track["Track Number"],
      disc:        track["Disc Number"] || 1,
      file:        track.Location.replace(iTunesPath, ""),
      year:        track.Year,
    };
  }).filter(track => track && songFileRegex.test(track.file));
}

function processAlbum(album: iTunesAlbum): Album {
  if(!album.Location) {
    //console.log(`Missing album location`, album);
    return null;
  }
  return {
    name:   album.Name,
    artist: album.Artist,
    path:   album.Location.replace(iTunesPath, ""),
    year:   albumYear(album),
    tracks: processTracks(album.Tracks.sort(albumTrackSort)),
  };
}

function addTrackToAlbums(track: iTunesTrack) {
  const albumArtist = albumArtistOfTrack(track);
  const albumKey = `${track.Album} | ${albumArtist}` as ArtistAndAlbum;
  if(!albumsBuildMap[albumKey]) {
    albumsBuildMap[albumKey] = {
      Name:   track.Album,
      Artist: albumArtist,
      Location: albumLocationOfTrack(track),
      Tracks: [],
    } as iTunesAlbum;
  }
  albumsBuildMap[albumKey].Tracks.push({
    Name:           track.Name,
    Artist:         track.Artist,
    Album:          track.Album,
    "Album Artist": track["Album Artist"],
    "Track Number": track["Track Number"],
    "Disc Number":  track["Disc Number"] || 1,
    Location:       track.Location.replace(iTunesPath, ""),
    Year:           track.Year,
  } as iTunesAlbumTrack);
}


// TRACKS

const tracksMap: TracksMap =
  tracksData
    .filter(filterTrack)
    .filter(({ Location }) => Location && songFileRegex.test(Location))
    .filter(({ Genre }) => !EXCLUDE_GENRES || !EXCLUDE_GENRES.includes(Genre))
    .filter(({ Artist }) => !!Artist)
    .filter(track => {
      track.Album && track.Location && addTrackToAlbums(track);
      return !playTrackFilter || !!playTrackFilter[track["Track ID"]];
    })
    .reduce((acc: TracksMap, track: iTunesTrack) => {
      const trackSentence  = scrubTrackName(track.Name);
      const artistSentence = scrubArtistName(track.Artist);
      const trackByArtistSentence = `${trackSentence} by ${artistSentence}`;
      const processedTracks = processTracks([track]);
      if(trackSentence) {
        acc[trackSentence] = [
          ...(acc[trackSentence] || []),
          ...processedTracks,
        ];
        acc[trackByArtistSentence] = [
          ...(acc[trackByArtistSentence] || []),
          ...processedTracks,
        ];
      }
      return acc;
    }, {} as TracksMap);
writeOut("tracks", tracksMap);

const artistTracksMap: ArtistTracksMap = tracksData
  .filter(filterTrack)
  .filter(track => !playTrackFilter || playTrackFilter[track["Track ID"]])
  .filter(({ Location }) => Location && songFileRegex.test(Location))
  .filter(({ Genre }) => !EXCLUDE_GENRES || !EXCLUDE_GENRES.includes(Genre))
  .filter(({ Artist }) => !!Artist)
  .reduce((acc: ArtistTracksMap, track: iTunesTrack): ArtistTracksMap => {
    const artistSentence = scrubArtistName(track.Artist);
    acc[artistSentence] = [
      ...(acc[artistSentence] || []),
      ...processTracks([track]),
    ];
    return acc;
  }, {} as ArtistTracksMap);
writeOut("artistTracks", artistTracksMap);

const artistAlbumsMap: ArtistAlbumsMap = Object.keys(albumsBuildMap)
  .reduce((acc: ArtistAlbumsMap, artistAlbumKey: ArtistAndAlbum): ArtistAlbumsMap => {
    const artist = artistAlbumKey.split(" | ")[1];
    if(playByArtistFilter && !playByArtistFilter[artist]) return acc;
    const artistSentence = scrubArtistName(artist);
    acc[artistSentence] = [
      ...(acc[artistSentence] || []),
      processAlbum(albumsBuildMap[artistAlbumKey])
    ];
    return acc;
  }, {} as ArtistAlbumsMap);
const artistAlbumsMapSorted: ArtistAlbumsMap = Object.keys(artistAlbumsMap)
  .reduce((acc: ArtistAlbumsMap, artistAlbumKey: ArtistAndAlbum): ArtistAlbumsMap => ({
    ...acc,
    [artistAlbumKey]: artistAlbumsMap[artistAlbumKey].sort(chronologicalAlbumSort),
  }), {} as ArtistAlbumsMap);
writeOut("artistAlbums", artistAlbumsMapSorted);

const albumsData = Object.values(albumsBuildMap).map((album: iTunesAlbum) => ({
  ...album,
  Tracks: album.Tracks.sort(albumTrackSort)
}));
fs.writeFileSync(`data/albums.json`, JSON.stringify(albumsData, null, "\t"));


// ALBUMS

const albumsMap: AlbumsMap =
  albumsData
    .filter(filterAlbum)
    .reduce((acc: AlbumsMap, album: iTunesAlbum): AlbumsMap => {
      const albumSentence  = scrubAlbumName(album.Name);
      const artistSentence = scrubArtistName(album.Artist);
      const albumByArtistSentence = `${albumSentence} by ${artistSentence}`;
      if(albumSentence) {
        const processedAlbum = processAlbum(album);
        acc[albumSentence] = [ ...(acc[albumSentence] || []), processedAlbum ];
        if(artistSentence !== "compilation") {
          acc[albumByArtistSentence] = [ processedAlbum ];
        }
      }
      return acc;
    }, {} as AlbumsMap);

writeOut("albums", albumsMap);


// ARTISTS

const artistMap: ArtistMap =
  artistsData
    .filter(filterArtist)
    .filter(({ Name }) => !playByArtistFilter || playByArtistFilter[Name])
    .reduce((acc: ArtistMap, artist: iTunesArtist) => {
      const artistSentence = scrubArtistName(artist.Name);
      return !artistSentence ? acc : { ...acc, [artistSentence]: artist.Name };
    }, {} as ArtistMap);

writeOut("artist", artistMap);


// PLAYLISTS

// let debugLast: iTunesTrack | undefined;

const playlistsTracksMap: PlaylistTracksMap =
  playlistsData
    .filter(filterPlaylist)
    .reduce((acc: PlaylistTracksMap, playlist: iTunesPlaylist) => {
      const name = playlist.Name;
      const playlistSentence = (substitutions.playlists[name] || name).toLowerCase();
      const playlistTracks = playlist.Tracks.map((track: iTunesTrack) => {
        // if(!track || !track.Name) {
        //   console.log(`Missing track in ${name}, after:`, debugLast);
        // }
        // debugLast = track;
        if(!track?.Name || !track?.Location) return null;
        return {
          name:   track.Name,
          artist: track.Artist,
          album:  track.Album,
          file:   track.Location.replace(iTunesPath, ""),
        };
      }).filter(track => track && songFileRegex.test(track.file));
      return { ...acc, [playlistSentence]: playlistTracks }
    }, {} as PlaylistTracksMap);

writeOut("playlistTracks", playlistsTracksMap);
