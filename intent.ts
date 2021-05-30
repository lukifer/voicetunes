import Shuffler        from "shuffle-array";
import { exec, spawn } from "child_process";
import { promisify }   from "util";
import { connect }     from "mqtt";

import config                            from "./config";
import { mopidy }                        from "./index";
import { readJson }                      from "./itunes/data";
import * as LED                          from "./led";
import SFX                               from "./sfx";
import { train }                         from "./train";
import { arrayWrap, between, rnd, wait } from "./utils";

const execp = promisify(exec);

const {
	ALLOW_SHUTDOWN,
	PATH_MUSIC,
	MAX_QUEUED_TRACKS,
	MQTT_IP,
	MQTT_PASSTHROUGH_INTENTS,
	USE_LED,
} = config;

import {
	ArtistMap,
	ArtistAlbumsMap,
	ArtistTracksMap,
	AlbumsMap,
	PlayOptions,
	PlaylistTracksMap,
	TracksMap,
	Message,
	StringMap,
	StringTuple,
} from "./itunes/types";

const mqttClient = MQTT_IP && connect(`mqtt://${MQTT_IP}`);

export const albumsMapJson         = (): AlbumsMap         => readJson("./itunes/maps/albums.json");
export const artistMapJson         = (): ArtistMap         => readJson("./itunes/maps/artist.json");
export const artistAlbumsMapJson   = (): ArtistAlbumsMap   => readJson("./itunes/maps/artistAlbums.json");
export const artistTracksMapJson   = (): ArtistTracksMap   => readJson("./itunes/maps/artistTracks.json");
export const playlistTracksMapJson = (): PlaylistTracksMap => readJson("./itunes/maps/playlistTracks.json");
export const tracksMapJson         = (): TracksMap         => readJson("./itunes/maps/tracks.json");

const ord = readJson("./itunes/ordinalWords.json");
const ordinalToNum =
	ord.reduce((acc: StringMap, x: StringTuple) => ({
		...acc,
		[x[1]]: parseInt(x[0]) - 1,
	}), {} as StringMap);

const albumsMap         =         albumsMapJson();
const artistMap         =         artistMapJson();
const artistAlbumsMap   =   artistAlbumsMapJson();
const artistTracksMap   =   artistTracksMapJson();
const playlistTracksMap = playlistTracksMapJson();
const tracksMap         =         tracksMapJson();

let cachedIntents: {[text: string]: Message} = {};
export async function textToIntent(text: string): Promise<Message> {
	//console.log("textToIntent", text, "cached="+(!!cachedIntents[text]));
	if(!cachedIntents[text]) {
		var recognizeProc = spawn("voice2json", [
			"recognize-intent",
			"--replace-numbers",
			"--text-input",
		]);
		return new Promise((resolve, reject) => {
			recognizeProc.stdout.on("data", (messageJson) => {
				//console.log("messageJson", messageJson.toString());
				try {
					const message = JSON.parse(messageJson.toString()) as Message;
					cachedIntents[text] = message as Message;
					resolve(message as Message);
				} catch(err) {
					reject(err);
				}
			});
			recognizeProc.stdin.write(text);
			recognizeProc.stdin.end();
		});
	} else {
		return cachedIntents[text] as Message;
	}
}

export async function doIntent(msg: Message) {
	//log(["intent msg", msg]);
	if(!msg || !msg.intent || !msg.intent.name || !msg.slots) {
		return err("no intent", msg);
		SFX.unrecognized();
	}
	const { playback, tracklist } = mopidy;
	const { intent, slots } = msg;
	const { playaction, playlistaction } = slots;
	const queue = playaction === "queue" || ["queue", "queue shuffle"].includes(playlistaction);

	switch(intent.name) {
		case "PlayArtist":
			if(!slots?.artist || !artistMap[slots.artist]) {
				return err("no artist", msg);
			}
			let artistTracks = artistTracksMap[slots.artist];
			if(!artistTracks?.length) {
				return err("no tracks", msg);
			} else {
				playTracks(artistTracks.map(x => x.file), { shuffle: true, queue });
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
				playTracks(rndAlbum.tracks.map(x => x.file), { queue });
			}
			break;

		case "PlayArtistAlbumByNumber":
			console.log(msg, slots);
			if(!slots.albumnum || !slots?.artist || !artistAlbumsMap[slots.artist]?.length) {
				return err("no artist or album number", msg);
			}
			const albumIndex = ordinalToNum[slots.albumnum] || 0;
			const artistAlbums = artistAlbumsMap[slots.artist];
			if(!artistAlbums[albumIndex]) {
				return err(`no ${slots.albumnum} album for ${slots.artist}`, msg);
			}
			playTracks(artistAlbums[albumIndex].tracks.map(x => x.file), { queue });
			break;

		case "PlayAlbum":
			if(!slots?.album || !albumsMap[slots.album]) {
				return err("no album", msg);
			}
			const albums = albumsMap[slots.album];
			const which = albums.length === 1 ? 0 : rnd(albums.length);
			playTracks(albums[which].tracks.map(x => x.file), { queue });
			break;

		case "StartPlaylist":
			if(!slots?.playlist || !playlistTracksMap[slots.playlist]) {
				return err("no playlist", msg);
			}
			const playlistFiles = playlistTracksMap[slots.playlist].map(x => x.file);
			playTracks(playlistFiles, { shuffle: true, queue });
			break;

		case "PlayTrack":
			if(!slots?.track || !tracksMap[slots.track]) {
				return err("no track", msg);
			}
			const trackFiles = tracksMap[slots.track].map(x => x.file);
			playTracks(trackFiles, { shuffle: true, queue });
			break;

		case "MusicVolumeSet":
			if(!slots?.volume) {
				return err("no volume", msg);
			}
			setVol(between(0, slots.volume, 100));
			break;

		case "MusicVolumeChange":
			if(!slots?.direction) {
				return err("no direction", msg);
			}
			if(slots.direction === "up") {
				changeVol(10);
			} else if(slots.direction === "down") {
				changeVol(-10);
			}
			break;

		case "WhatIsPlaying":
			const tracks = await tracklist.getTracks();
			const i      = await tracklist.index();
			const file = decodeURIComponent(tracks[i].replace(/^file:\/\//, ""));
			const tags = "format_tags=artist,title,album";
			const probe = await execp(
				`ffprobe -show_entries ${tags} -of default=noprint_wrappers=1:nokey=1 ${file}`
			);
			console.log(probe.stdout);
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

		case "NextTrack":
			await playback.next();
			break;

		case "PreviousTrack":
			await playback.previous();
			break;

		case "Resume":
			playback.resume();
			break;

		case "Stop":
			playback.pause();
			break;

		case "RestartMopidy":
			//TODO
			break;

		case "Retrain":
			await train();
			break;

		case "Restart":
			if(ALLOW_SHUTDOWN) {
				SFX.ok();
				exec("sudo reboot now");
			} else {
				SFX.error();
				if(USE_LED) LED.flashErr();
			}
			break;

		case "Shutdown":
			if(ALLOW_SHUTDOWN) {
				SFX.ok();
				exec("sudo shutdown now");
			} else {
				SFX.error();
				if(USE_LED) LED.flashErr();
			}
			break;

		case "Nevermind":
			SFX.ok();
			break;

		default:
			if(mqttClient && MQTT_PASSTHROUGH_INTENTS.includes(intent.name)) {
				mqttClient.publish("voice2json", msg.toString());
			} else {
				if(USE_LED) LED.flashErr();
				return err("command unrecognized", msg);
			}
	}
}

let loadingTimer: ReturnType<typeof setTimeout> | null = null;

async function cueRemainingTracks(tracks: string[]) {
	const { tracklist } = mopidy;
	console.log("cueing "+tracks.length);
	await tracklist.add({ uris: tracks.slice(0, 5).map(file => `file://${PATH_MUSIC}/${file}`) });
	if(tracks.length > 5) {
		await wait(500);
		await cueRemainingTracks(tracks.slice(5));
	}
}

export async function playTracks(tracks: string[], opts: PlayOptions = {}) {
	const { playback, tracklist } = mopidy;
	const { shuffle = false, queue = false } = opts;

	if(loadingTimer) {
		console.log("clearTimeout");
		clearTimeout(loadingTimer);
		loadingTimer = null;
	}

	// cue a random track and start playing immediately
	const start = shuffle ? rnd(tracks.length) : 0;
	if(!queue) await tracklist.clear();
	await tracklist.add({ "uris": [ `file://${PATH_MUSIC}/${tracks[start]}` ] });
	if(!queue) await playback.play();

	// then add the remainder asynchronously (shuffling if needed)
	const { [start]: firstTrack, ...remainingTracks } = tracks;
	const picks = Math.min(MAX_QUEUED_TRACKS, Object.values(remainingTracks).length);
	if(picks) {
		if(shuffle) {
			const shuffled = Shuffler.pick(Object.values(remainingTracks), { picks });
			cueRemainingTracks(arrayWrap(shuffled));
		} else {
			cueRemainingTracks(Object.values(remainingTracks).slice(0, picks));
		}
	}
}

// let cachedVolume: number | null = null;
export async function togglePlayback() {
	const { playback } = mopidy;
	// const { mixer, playback } = mopidy;
	if("playing" === await playback.getState()) {
		//cachedVolume = await mixer.getVolume();
		//await transitionVolume(cachedVolume, 0);
		return playback.pause();
	} else {
		//await playback.resume();
		//if(cachedVolume !== null) {
		//	await transitionVolume(await mixer.getVolume(), cachedVolume);
		//	cachedVolume = null;
		//}
		return playback.resume();
	}
}

export async function changeVol(diff: number) {
	const { mixer } = mopidy;
	const oldVol = await mixer.getVolume();
	const newVol = between(0, oldVol + diff, 100);
	const setPromise = mixer.setVolume([newVol])
	if(USE_LED) LED.volumeChange(oldVol, newVol);
	return setPromise;
}

export async function setVol(newVol: number) {
	const { mixer } = mopidy;
	if(USE_LED) {
		const oldVol = await mixer.getVolume();
		//console.log("volumeChange", oldVol, newVol);
		LED.volumeChange(oldVol, newVol);
	}
	return mixer.setVolume([newVol])
}

// FIXME: Mopidy has a volume change delay, and the Promise doesn't wait for it to resolve

//async function transitionVolume(fromVol: number, toVol: number) {
//	const { mixer } = mopidy;
//	let tempVolume = fromVol;
//	const interval = (fromVol < toVol) ? 20 : -20;
//	do {
//		tempVolume += interval;
//		console.log("tempVolume", tempVolume);
//		await mixer.setVolume([between(0, tempVolume, 100)]);
//		await wait(200);
//	} while(interval > 0 ? tempVolume < 100 : tempVolume > 0);
//}

function log(msg: unknown) {
	console.log(msg);
}

function err(msg: string, also: unknown) {
	console.log(`err: ${msg}`, also);
	if(USE_LED) LED.flashErr();
	SFX.error();
}
