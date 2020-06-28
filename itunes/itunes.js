const fs            = require("fs");
const removeAccents = require("remove-accents");
const writtenNumber = require("written-number");

const romanNumerals = require("./romanNumerals.json");
const ordinalWords  = require("./ordinalWords.json");

let albumsJson    = []; // require("./data/albums.json");
let artistsJson   = require("./data/artists.json");
let playlistsJson = require("./data/playlists.json");
let tracksJson    = require("./data/tracks.json");

const albumsBlacklist    = require("./custom/albums_blacklist.json");
const albumsWhitelist    = require("./custom/albums_whitelist.json");
const artistsBlacklist   = require("./custom/artists_blacklist.json");
const artistsWhitelist   = require("./custom/artists_whitelist.json");
const playlistsBlacklist = require("./custom/playlists_blacklist.json");
const playlistsWhitelist = require("./custom/playlists_whitelist.json");
const tracksBlacklist    = require("./custom/tracks_blacklist.json");
const tracksWhitelist    = require("./custom/tracks_whitelist.json");
const substitutions      = require("./custom/substitutions.json");

ordinalWords.reverse();
const romanNumeralsRegex = romanNumerals.map(x => ([ new RegExp(x[0]), x[1] ]));

const fourStarArtistFilter =
  playlistsJson
    .filter(x => x.Name === "Business" || x.Name === "Comedy")
    .reduce((acc, playlist) => ([ ...acc, ...playlist.Tracks ]), [])
    .reduce((acc, track) => {
      if(!track || !track.Artist) return acc;
      const artistName = track["Album Artist"] || track.Artist;
      return {...acc, [artistName]: true}
    }, {})
    ;

const fourStarTrackFilter =
  playlistsJson
    .find(x => x.Name === "Business")
    .Tracks
    .reduce((acc, track) => {
      if(!track || !track.Name) return acc;
      return {...acc, [track.Name]: true}
    }, {})
    ;

String.prototype.replaceAll = function(tuples) {
  return tuples.reduce((str, t) => str.replace(t[0], t[1]), this);
};

function albumTrackSort(a, b) {
  if(a.Disc && b.Disc && a.Disc !== b.Disc) {
    return a.Disc > b.Disc ? 1 : -1;
  } else {
    return a.Number > b.Number ? 1 : -1;
  }
}

function scrub(str) {
  return removeAccents(str.toLowerCase())
    .replace(/\./g, " ")
    .replace(/[&\+]/g, " and ")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\sn\s/g, " and ")
    ;
}

function scrubTrackName(trackName) {
  const trackNameBase = (substitutions.tracks[trackName] || trackName)
    .replace(/\(?Pt\.\s([0-9])\)?$/, "Part $1")
    .replace(/No\.\s?([0-9])/, "Number $1")
    .replace(/\[.+$/, "");
  return scrub(trackNameBase.toLowerCase())
    .replaceAll(ordinalWords)
    .replaceAll(romanNumeralsRegex)
    .replace(/\sbonus\strack$/, "")
    .replace(/[0-9]+/g, x => ` ${writtenNumber(x).replace(/-/g, " ")} `, {noAnd: true})
    .replace(/\s+/g, " ")
    .trim()
    ;
}

function scrubArtistName(artistName) {
  const artistLower = (substitutions.artists[artistName] || artistName).toLowerCase();
  return scrub(artistLower)
    .replace(/dj\s/g, "dee jay ")
    .replace(/mc\s/g, "em see ")
    .replace(/^mr\s/g, "mister ")
    .replace(/\svs\s/g, " versus ")
    .replace(/[0-9]+/g, x => ` ${writtenNumber(x).replace(/-/g, " ")} `, {noAnd: true})
    .replace(/\s+/g, " ")
    .trim()
    ;
}

function scrubAlbumName(albumName) {
  const albumLower = (substitutions.albums[albumName] || albumName).toLowerCase();
  return scrub(albumLower)
    .replaceAll(ordinalWords)
    .replaceAll(romanNumeralsRegex)
    .replace(/\[.+$/, "")
    .replace(/original broadway cast (album|recording)$/, "")
    .replace(/ ost$/, "")
    .replace(/original (motion picture )?(game )?soundtrack/, "soundtrack")
    .replace(/\sep$/g, "")
    .replace(/^vol\s/g, " volume ")
    .replace(/\svol\s/g, " volume ")
    .replace(/[0-9]+/g, x => ` ${writtenNumber(x).replace(/-/g, " ")} `, {noAnd: true})
    .replace(/\s+/g, " ")
    .trim()
}

function albumArtistOfTrack(track) {
  return /\/Compilations\//.test(track.Location)
    ? "Compilation"
    : track["Album Artist"] || track.Artist
}

function albumLocationOfTrack(track) {
  return track.Location.replace(substitutions.itunesBasePath, "").replace(/\/[^/]+\.mp3$/, "")
}

function writeOut(entity, map) {
  fs.writeFileSync(`out/${entity}.ini`, `(${Object.keys(map).join(" | ")})`);
  fs.writeFileSync(`out/${entity}.map.json`, JSON.stringify(map, null, "\t"));
  process.stdout.write(`${Object.keys(map).length} ${entity} written\n`);
}


// TRACKS

const tracksMap =
  tracksJson
    .filter(track => !tracksWhitelist.length || tracksWhitelist.includes(track.Name))
    .filter(track =>                   false == tracksBlacklist.includes(track.Name))
    .filter(track => track.Location && /\.mp3$/.test(track.Location))
    .filter(track => !["Skool", "Audiobook", "Audiobook (Off)"].includes(track.Genre))
    .reduce((acc, track) => {
      if(track.Album) {
        const albumArtist = albumArtistOfTrack(track);
        const albumKey = `${track.Album} | ${albumArtist}`;
        if(!albumsJson[albumKey]) {
          albumsJson[albumKey] = {
            Name:   track.Album,
            Artist: albumArtist,
            Location: albumLocationOfTrack(track),
            Tracks: [],
          };
        }
        albumsJson[albumKey].Tracks.push({
          Name:        track.Name,
          Artist:      track.Artist,
          Album:       track.Album,
          AlbumArtist: track.AlbumArtist,
          Number:      track["Track Number"],
          Disc:        track["Disc Number"] || 1,
          Location:    track.Location.replace(substitutions.itunesBasePath, ""),
        });
      }

      if(!fourStarTrackFilter[track.Name]) {
         return acc;
      }

      const scrubbed = scrubTrackName(track.Name);
      return !scrubbed ? acc : { ...acc, [scrubbed]: !!acc[scrubbed]
        ? [...acc[scrubbed], ...processTracks([track])]
        :                       processTracks([track])
      };
    }, {});

const allAlbumsOfArtist = Object.keys(albumsJson)
  .reduce((acc, albumKey) => {
    const artist = albumKey.split(" | ")[1];
    if(!fourStarArtistFilter[artist]) return acc;
    const scrubbedArtist = scrubArtistName(artist);
    return {
      ...acc,
      [scrubbedArtist]: [
        ...(acc[scrubbedArtist] || []),
        {
          ...albumsJson[albumKey],
          Tracks: albumsJson[albumKey].Tracks.sort(albumTrackSort),
        },
      ],
    };
  }, {});
fs.writeFileSync(`out/allAlbumsOfArtist.map.json`, JSON.stringify(allAlbumsOfArtist, null, "\t"));

albumsJson = Object.values(albumsJson).map(album => ({
  ...album,
  Tracks: album.Tracks.sort(albumTrackSort)
}));
fs.writeFileSync(`data/albums.json`, JSON.stringify(albumsJson, null, "\t"));

writeOut("tracks", tracksMap);


// ALBUMS

function processTracks(tracks) {
  return tracks.map((track, n) => {
    if(!track || !track.Name) {
      console.log(`Missing track #${n} in ${name}`);
      return null;
    }
    return {
      name:        track.Name,
      artist:      track.Artist,
      album:       track.Album,
      albumArtist: track.AlbumArtist,
      number:      track["Track Number"],
      disc:        track["Disc Number"] || 1,
      file:        track.Location.replace(substitutions.itunesBasePath, ""),
    };
  }).filter(track => track && /mp3$/.test(track.file));
}

const albumsMap =
  albumsJson
    .filter(album => !albumsWhitelist.length || albumsWhitelist.includes(album.Name))
    .filter(album =>                   false == albumsBlacklist.includes(album.Name))
    .reduce((acc, album) => {
      const scrubbed = scrubAlbumName(album.Name);
      if(!scrubbed) return acc;
      const albumTracks = processTracks(album.Tracks);
      if(acc[scrubbed]) {
        return { ...acc, [scrubbed]: [ ...acc[scrubbed], albumTracks ] };
      } else {
        return { ...acc, [scrubbed]: [albumTracks] };
      }
    }, {});

writeOut("albums", albumsMap);

const albumsByArtistMap =
  albumsJson.reduce((acc, album) => {
    const albumArtist = album.AlbumArtist || album.Artist;
    const scrubbedAlbum  = scrubAlbumName(album.Name);
    const scrubbedArtist = scrubArtistName(albumArtist);
    //if(albumsMap[scrubbedAlbum] && albumsMap[scrubbedAlbum].length <= 1) return acc;
    return({ ...acc, [`${scrubbedAlbum} by ${scrubbedArtist}`]: processTracks(album.Tracks) });
  }, {});

writeOut("albumsByArtist", albumsByArtistMap);


// ARTISTS

const artistsMap =
  artistsJson
    .filter(artist => !artistsWhitelist.length || artistsWhitelist.includes(artist.Name))
    .filter(artist =>                    false == artistsBlacklist.includes(artist.Name))
    .filter(artist => fourStarArtistFilter[artist.Name])
    .reduce((acc, artist) => {
      const scrubbed = scrubArtistName(artist.Name);
      return !scrubbed ? acc : { ...acc, [scrubbed]: artist.Name };
    }, {});

writeOut("artists", artistsMap);


// PLAYLISTS

const playlistsMap =
  playlistsJson
    .filter(playlist => !playlistsWhitelist.length || playlistsWhitelist.includes(playlist.Name))
    .filter(playlist =>                      false == playlistsBlacklist.includes(playlist.Name))
    .reduce((acc, playlist) => {
      const name = playlist.Name;
      const final = (substitutions.playlists[name] || name).toLowerCase();
      const playlistTracks = playlist.Tracks.map((track, n) => {
        if(!track || !track.Name) {
          console.log(`Missing track #${n} in ${name}`);
          return null;
        }
        return {
          name:   track.Name,
          artist: track.Artist,
          album:  track.Album,
          file:   track.Location.replace(substitutions.itunesBasePath, ""),
        };
      }).filter(track => track && /mp3$/.test(track.file));
      return { ...acc, [final]: playlistTracks }
    }, {});

writeOut("playlists", playlistsMap);

process.exit();
