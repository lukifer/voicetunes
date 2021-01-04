import Mopidy from "mopidy";
import { exec }      from "child_process";
import { promisify } from "util";

import * as LED from "./led";
import * as BT  from "./bt";
import SFX      from "./sfx";
import { wait } from "./utils";
import config   from "./config";

import {
	changeVol,
	doIntent,
	togglePlayback,
} from "./intent";

const {
	AUDIO_DEVICE_IN,
	AUDIO_DEVICE_OUT,
	MIN_LISTEN_DURATION_MS,
	PATH_RAMDISK,
	URL_MOPIDY,
} = config;

const execp = promisify(exec);

SFX.init(AUDIO_DEVICE_OUT);
export const mopidy = new Mopidy({ webSocketUrl: URL_MOPIDY });
LED.open();

mopidy.on("state:online", async () => {
	await BT.connect();
	LED.flair();
	await mopidy.tracklist.clear();
	SFX.beep();

	BT.listen({
		UP:    () => changeVol( 10),
		DOWN:  () => changeVol(-10),

		LEFT:  async () => await mopidy.playback.previous(),
		RIGHT: async () => await mopidy.playback.next(),
		PLAY:  async () => await togglePlayback(),

		LISTEN_START: async () => startListening(),
		LISTEN_DONE:  async () => stopListening(),
	});
});

let listenStartTimestamp = 0;

async function startListening() {
	listenStartTimestamp = +(new Date);
	await mopidy.playback.pause();
	// FIXME: SIG_STOP
	await execp(`if pgrep arecord;    then sudo killall -q arecord;    fi`);
	await execp(`if pgrep voice2json; then sudo killall -q voice2json; fi`);
	LED.startSpinSlow();
	SFX.beep();
	const { stdout } = await execp([
		`sudo arecord -q -D ${AUDIO_DEVICE_IN} -t raw --duration=20 --rate=16000 --format=S16_LE`,
		`tee ${PATH_RAMDISK}/input.raw`,
		`voice2json transcribe-stream -c 1 -a -`,
		`voice2json recognize-intent`,
	].join(" | "));

	const msg = stdout[0] === "{" && JSON.parse(stdout);
	if(msg) {
		await doIntent(msg);
	} else {
		err("invalid json", stdout);
	}
	LED.stopSpin();
}

async function stopListening() {
	const listenDurationMs = +(new Date) - listenStartTimestamp;
	if(listenDurationMs > MIN_LISTEN_DURATION_MS) {
		LED.startSpinFast();
		await wait(100); // a little trailing audio seems to help accuracy
		await execp("sudo killall -q arecord");
		SFX.ok();
	} else {
		LED.stopSpin();
	}
}

function err(msg: string, also: unknown) {
	console.log(`err: ${msg}`, also);
	SFX.error();
}
