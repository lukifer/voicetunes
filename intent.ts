import Mopidy        from "mopidy";
import Shuffler      from "shuffle-array";
import { exec }      from "child_process";
import { promisify } from "util";

import config                   from "./config";
import { readJson }             from "./itunes/data";
import SFX                      from "./sfx";
import { arrayWrap, rnd, wait } from "./utils";

const execp = promisify(exec);

const {
	URL_MUSIC,
	MAX_QUEUED_TRACKS,
} = config;

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
			const { stdout } = await execp([
				`if [ $(date +%M) != "00" ]`,
				`then date '+%-H %M %p'`,
				`else echo -n $(date +%-H)`,
				`echo -n " oh clock "`,
				`date +%p`,
				`fi`
			].join(";"));
			SFX.speak(stdout.replace("\n", "").replace(/([a|p])m/, "$1 m"));
			break;

		case "ReadLog":
			const log = await execp(`tail -n 1 ${__dirname}/log.txt`);
			console.log(log.stdout);
			SFX.speak(log.stdout);
			break;

		case "Restart":
			SFX.ok();
			exec("sudo reboot now");
			break;

		case "Shutdown":
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

let loadingTimer: ReturnType<typeof setTimeout> | null = null;

async function cueRemainingTracks(mopidy: Mopidy, tracks: string[]) {
	const { tracklist } = mopidy;
	console.log("cueing "+tracks.length);
	await tracklist.add({ uris: tracks.slice(0, 5).map(file => `${URL_MUSIC}/${file}`) });
	if(tracks.length > 5) {
		await wait(500);
		await cueRemainingTracks(mopidy, tracks.slice(5));
	}
}

export async function playTracks(mopidy: Mopidy, tracks: string[], shuffle: boolean = false) {
	const { playback, tracklist } = mopidy;

	if(loadingTimer) {
		console.log("clearTimeout");
		clearTimeout(loadingTimer);
		loadingTimer = null;
	}

	// cue a random track and start playing immediately
	const start = shuffle ? rnd(tracks.length) : 0;
	await tracklist.clear();
	await tracklist.add({ "uris": [ `${URL_MUSIC}/${tracks[start]}` ] });
	await playback.play();

	// then add the remainder asynchronously (shuffling if needed)
	const { [start]: firstTrack, ...remainingTracks } = tracks;
	const picks = Math.min(MAX_QUEUED_TRACKS, Object.values(remainingTracks).length);
	if(picks) {
		if(shuffle) {
			const shuffled = Shuffler.pick(Object.values(remainingTracks), { picks });
			cueRemainingTracks(mopidy, arrayWrap(shuffled));
		} else {
			cueRemainingTracks(mopidy, Object.values(remainingTracks).slice(0, picks));
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
