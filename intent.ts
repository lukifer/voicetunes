import Mopidy   from "mopidy";
import Shuffler from "shuffle-array";
import { exec } from "child_process";

import config       from "./config.local";
import { readJson } from "./itunes/data";
import SFX          from "./sfx";
import { rnd }      from "./utils";

const {
	MUSIC_URL = "file:///home/pi/music",
	MAX_TRACKS = 60,
} = config as any;

import {
  ArtistMap,
  ArtistAlbumsMap,
  ArtistTracksMap,
  AlbumsMap,
  PlaylistTracksMap,
  TracksMap,
	Message,
} from "./itunes/types";

export const albumsMapJson         = (): AlbumsMap         => readJson("./itunes/maps/albums.json");
export const artistMapJson         = (): ArtistMap         => readJson("./itunes/maps/artist.json");
export const artistAlbumsMapJson   = (): ArtistAlbumsMap   => readJson("./itunes/maps/artistAlbums.json");
export const artistTracksMapJson   = (): ArtistTracksMap   => readJson("./itunes/maps/artistTracks.json");
export const playlistTracksMapJson = (): PlaylistTracksMap => readJson("./itunes/maps/playlistTracks.json");
export const tracksMapJson         = (): TracksMap         => readJson("./itunes/maps/tracks.json");

const albumsMap         = albumsMapJson();
const artistMap         = artistMapJson();
const artistAlbumsMap   = artistAlbumsMapJson();
const artistTracksMap   = artistTracksMapJson();
const playlistTracksMap = playlistTracksMapJson();
const tracksMap         = tracksMapJson();

export async function doIntent(mopidy: Mopidy, msg: Message) {
	log(["intent msg", msg]);
	if(!msg || !msg.intent || !msg.intent.name || !msg.slots) {
		return err("no intent", msg);
	}
	const { intent, slots } = msg;
	switch(intent.name) {
		case "PlayArtist":

			if(!slots?.artist || !artistMap[slots.artist]) {
				return err("no artist", msg);
			}

			let tracks = artistTracksMap[slots.artist];
			//console.log(`${tracks?.length} tracks found for ${artistMap[slots.artist]}`);

			if(!tracks?.length) {
				return err("no tracks", msg);
			} else {
				playTracks(mopidy, tracks.map(x => x.file), true);
			}
			break;

		case "PlayRandomAlbumByArtist":
			if(!slots?.artist || !artistAlbumsMap[slots.artist]?.length) {
				return err("no albums for artist", msg);
			}
			const albumsOfArtist = artistAlbumsMap[slots.artist];
			const rndAlbum = albumsOfArtist[rnd(albumsOfArtist.length)];
			if(!rndAlbum?.tracks?.length) {
				return err("no tracks", [ msg, rndAlbum ]);
			} else {
				playTracks(mopidy, rndAlbum.tracks.map(x => x.file));
			}
			break;

		case "PlayAlbum":
			if(!slots?.album || !albumsMap[slots.album]) {
				return err("no album", msg);
			}
			const albums = albumsMap[slots.album];
			const which = albums.length === 1 ? 0 : rnd(albums.length);
			playTracks(mopidy, albums[which].tracks.map(x => x.file));
			break;

		case "StartPlaylist":
			if(!slots?.playlist || !playlistTracksMap[slots.playlist]) {
				return err("no playlist", msg);
			}
			playTracks(mopidy, playlistTracksMap[slots.playlist].map(x => x.file), true);
			break;

		case "PlayTrack":
			if(!slots?.track || !tracksMap[slots.track]) {
				return err("no track", msg);
			}
			playTracks(mopidy, tracksMap[slots.track].map(x => x.file), true);
			break;

		case "WhatIsTime":
			const { stdout } = exec([
				`if [ $(date +%M) != "00" ]`,
				`then date '+%-H %M %p'`,
				`else echo -n $(date +%-H)`,
				`echo -n " oh clock "`,
				`date +%p`,
				`fi`
			].join(";"));
			log(stdout);
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

export async function playTracks(mopidy: Mopidy, tracks: string[], shuffle: boolean = false) {
	const { playback, tracklist } = mopidy;

	// cue a random track and start playing immediately
	const start = shuffle ? rnd(tracks.length) : 0;
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
			await tracklist.add({ uris: Object.values(remainingTracks).slice(0, picks).map(file => `${MUSIC_URL}/${file}`) });
		}
	}
}

function log(msg: unknown) {
	console.log(msg);
}

function err(msg: string, also: unknown) {
	console.log(`err: ${msg}`, also);
	SFX.error();
}
