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
	URL_MOPIDY,
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
		UP:    () => changeVol(mopidy, 10),
		DOWN:  () => changeVol(mopidy, -10),

		LEFT:  async () => await mopidy.playback.previous(),
		RIGHT: async () => await mopidy.playback.next(),
		PLAY:  async () => await togglePlayback(mopidy),

		LISTEN_START: async () => startListening(),
		LISTEN_DONE:  async () => stopListening(),
	});
});

async function startListening() {
	await mopidy.playback.pause();
	await execp(`if pgrep arecord;    then sudo killall -q arecord;    fi`);
	await execp(`if pgrep voice2json; then sudo killall -q voice2json; fi`);
	LED.startSpinSlow();
	SFX.beep();
	const { stdout } = await execp([
		`sudo arecord -q -D ${AUDIO_DEVICE_IN} --duration=20 --rate=16000 --format=S16_LE`,
		`voice2json transcribe-stream -c 1 -a -`,
		`voice2json recognize-intent`,
	].join(" | "));

	const msg = stdout[0] === "{" && JSON.parse(stdout);
	if(msg) {
		await doIntent(mopidy, msg);
	} else {
		err("invalid json", stdout);
	}
	LED.stopSpin();
}

async function stopListening() {
	LED.startSpinFast();
	await wait(200); // a little trailing audio seems to help accuracy
	await execp("sudo killall -q arecord");
	SFX.ok();
}

function err(msg: string, also: unknown) {
	console.log(`err: ${msg}`, also);
	SFX.error();
}
