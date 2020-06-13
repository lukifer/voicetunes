const Mopidy   = require("mopidy");
const HID      = require('node-hid');
const Shuffler = require('shuffle-array');
const { exec } = require('child_process');

const SFX     = require("./sfx.js");
const { rnd } = require('./utils.js');
const {
	MUSIC_URL = "file:///home/pi/music",
	MAX_TRACKS = 60,
} = require("./config.local");

const albumsMap            = require("./data/albums.map.json");
const albumsByArtistMap    = require("./data/albumsByArtist.map.json");
const allAlbumsOfArtistMap = require("./data/allAlbumsOfArtist.map.json");
const artistsMap           = require("./data/artists.map.json");
const playlistsMap         = require("./data/playlists.map.json");
const tracksMap            = require("./data/tracks.map.json");

async function doIntent(mopidy, msg) {
	log("intent msg", msg);
	if(!msg || !msg.intent || !msg.intent.name || !msg.slots) {
		return err("no intent", msg);
	}
	const { intent, slots } = msg;
	switch(msg.intent.name) {
		case "PlayArtist":
			if(!slots.artist || !artistsMap[slots.artist]) {
				return err("no has artist", msg);
			}

			// convert from syllables to actual artist name
			const artist = artistsMap[slots.artist];
			
			// FIXME: move this upstream in data sources
			let tracks = playlistsMap.business.filter(x => x.artist === artist);
			if(!tracks.length) {
				tracks = playlistsMap.comedy.filter(x => x.artist === artist);
			}
			console.log(`${tracks.length} tracks found for ${artist}`);

			if(!tracks.length) {
				return err("No tracks", msg);
			} else {
				playTracks(mopidy, tracks.map(x => x.file), true);
			}
			break;
		
		case "PlayRandomAlbumByArtist":
			if(!slots.artist || !allAlbumsOfArtistMap[slots.artist]) {
				return err("no artist", msg);
			}
			const albumsOfArtist = allAlbumsOfArtistMap[slots.artist];
			const rndAlbum = albumsOfArtist[rnd(albumsOfArtist.length)];
			if(!rndAlbum || !rndAlbum.Tracks || !rndAlbum.Tracks.length) {
				return err("No tracks", [ msg, rndAlbum ]);
			} else {
				playTracks(mopidy, rndAlbum.Tracks.map(x => x.Location));
			}
			break;

		case "PlayAlbumByArtist":
			if(!slots.albumByArtist || !albumsByArtistMap[slots.albumByArtist]) {
				return err("no has albumByArtist", msg);
			}
			const album = albumsByArtistMap[slots.albumByArtist];
			playTracks(mopidy, album.map(x => x.file));
			break;

		case "PlayAlbum":
			if(!slots.album || !albumsMap[slots.album]) {
				return err("no has album", msg);
			}
			const albums = albumsMap[slots.album];
			const which = albums.length === 1 ? 0 : rnd(albums.length);
			playTracks(mopidy, albums[which].map(x => x.file));
			break;
			
		case "StartPlaylist":
			if(!slots.playlist || !playlistsMap[slots.playlist]) {
				return err("no has playlist", msg);
			}
			playTracks(mopidy, playlistsMap[slots.playlist].map(x => x.file), true);
			break;

		case "PlayTrack":
			if(!slots.track || !tracksMap[slots.track]) {
				return err("no has track", msg);
			}
			playTracks(mopidy, tracksMap[slots.track].map(x => x.file), true);
			break;

		case "WhatIsTime":
			const { stdout } = await execp([
				`if [ $(date +%M) != "00" ]`,
				`then date '+%-H %M %p'`,
				`else echo -n $(date +%-H)`,
				`echo -n " oh clock "`,
				`date +%p`,
				`fi`
			].join(";"));
			//SFX.speak(stdout); // FIXME
			break;

		case "ShutdownConfirm":
			SFX.ok();
			exec("sudo shutdown now");
			break;

		case "Nevermind":
			SFX.ok();
			break;
		
		default:
			return err("command unrecognized", msg);
	}
}

async function playTracks(mopidy, tracks, shuffle) {
	const { playback, tracklist } = mopidy;

	// cue a random track and start playing immediately
	const start = shuffle ? rnd(tracks.length) : 0;
	//log(tracks[start]);
	await tracklist.clear();
	await tracklist.add({ "uris": [ `${MUSIC_URL}/${tracks[start]}` ] });
	await playback.play();
	
	// FIXME: Increase MAX_TRACKS, load tracks async to reduce play start delay

	// then add the remainder, shuffling if needed
	const { [start]: firstTrack, ...remainingTracks } = tracks;
	const picks = Math.min(MAX_TRACKS, Object.values(remainingTracks).length);
	if(picks) {
		if(shuffle) {
			const picked = Shuffler.pick(Object.values(remainingTracks), { picks });
			const shuffled = Array.isArray(picked) ? picked : [ picked ];
			await tracklist.add({ uris: shuffled.map(file => `${MUSIC_URL}/${file}`) });
			tracklist.shuffle([1]); // equivalent to slice(1, Infinity)
		} else {
			//log(tracks, remainingTracks);
			await tracklist.add({ uris: Object.values(remainingTracks).slice(0, picks).map(file => `${MUSIC_URL}/${file}`) });
		}
	}
}

function log(msg) {
	console.log(msg);
}

function err(msg, also) {
	console.log(`err: ${msg}`, also);
	SFX.error();
}

module.exports = doIntent;
