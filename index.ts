import Mopidy from "mopidy";
import { exec }      from "child_process";
import { promisify } from "util";

import * as LED      from "./led";
import * as BT       from "./bt";
import SFX           from "./sfx";
import { now, wait } from "./utils";
import config        from "./config";

import {
	changeVol,
	doIntent,
	togglePlayback,
} from "./intent";

const {
	AUDIO_DEVICE_IN,
	AUDIO_DEVICE_OUT,
	DENOISE_BIN,
	MIN_RECORD_SECONDS,
	PATH_RAMDISK,
	URL_MOPIDY,
	VOICE2JSON_BIN,
} = config;

const execp = promisify(exec);

SFX.init(AUDIO_DEVICE_OUT);
const mopidy = new Mopidy({ webSocketUrl: URL_MOPIDY });
LED.open();

mopidy.on("state:online", async () => {
	await BT.connect();
	LED.flair();
	await mopidy.tracklist.clear();
	SFX.beep();

	BT.listen({
		UP:    () => changeVol(mopidy,  10, true),
		DOWN:  () => changeVol(mopidy, -10, true),

		LEFT:  async () => await mopidy.playback.previous(),
		RIGHT: async () => await mopidy.playback.next(),
		PLAY:  async () => await togglePlayback(mopidy),

		LISTEN_START: async () => startListening(),
		LISTEN_DONE:  async () => stopListening(),
	});
});

let listenTimestamp;

async function startListening() {
	listenTimestamp = now();
	await mopidy.playback.pause();
	await execp(`if pgrep arecord;    then sudo killall -q arecord;    fi`);
	await execp(`if pgrep voice2json; then sudo killall -q voice2json; fi`);
	LED.startSpinSlow();
	SFX.beep();
	const { stdout } = await execp([
		`sudo arecord -q -D ${AUDIO_DEVICE_IN} --duration=20 --rate=16000 --format=S16_LE`,
		`tee ${PATH_RAMDISK}/input.wav`,
		`${VOICE2JSON_BIN} transcribe-stream -c 1 -a -`,
		`tee ${PATH_RAMDISK}/input.txt`,
		`${VOICE2JSON_BIN} recognize-intent`,
	].join(" | "));

	const msg = stdout[0] === "{" && JSON.parse(stdout);
	if(msg) {
		await doIntent(mopidy, msg);
		LED.stopSpin();
	} else {
		if(DENOISE_BIN) {
			await execp([
				`cd ${PATH_RAMDISK}`,
				`cat input.wav | tail -c +45 > input.pcm`,
				`${DENOISE_BIN} input.pcm denoised.pcm`,
				`sox -t raw -r 16000 -b 16 -c 1 -L -e signed-integer denoised.pcm denoised.wav`,
			].join(";"));
			const { stdout } = await execp([
				`${VOICE2JSON_BIN} transcribe-wav < ${PATH_RAMDISK}/denoised.wav`,
				`tee ${PATH_RAMDISK}/denoised.txt`,
				`${VOICE2JSON_BIN} recognize-intent`,
			].join(" | "));
			const msg2 = stdout[0] === "{" && JSON.parse(stdout);
			if(msg2) {
				await doIntent(mopidy, msg2);
				LED.stopSpin();
				return;
			}
		}
		err("invalid json", stdout);
	}
}

async function stopListening() {
	if(now() - listenTimestamp < MIN_RECORD_SECONDS) {
		LED.stopSpin();
	} else {
		LED.startSpinFast();
		await wait(200); // a little trailing audio seems to help accuracy
		await execp("sudo killall -q arecord");
		SFX.ok();
	}
}

function err(msg: string, also: unknown) {
	console.log(`err: ${msg}`, also);
	SFX.error();
}
