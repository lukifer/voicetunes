import Mopidy from "mopidy";
import { exec }      from "child_process";
import { promisify } from "util";

import * as LED          from "./led";
import * as BT           from "./bt";
import SFX               from "./sfx";
import { doIntent }      from "./intent";
import { between, wait } from "./utils";

import config from "./config.local";
const {
	PATH_RAMDISK = "/tmp/ramdisk",
} = config as any;
const PATH_INPUT_WAV = `${PATH_RAMDISK}/input.wav`;

const execp = promisify(exec);

SFX.init("dmixer");
const mopidy = new Mopidy({ webSocketUrl: "ws://localhost:6680/mopidy/ws/" });
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

async function changeVol(diff: number) {
	const { mixer } = mopidy;
	SFX.beep();
	const oldVol = await mixer.getVolume();
	const newVol = between(0, oldVol + diff, 100);
	LED.volumeChange(oldVol, newVol);
	return mixer.setVolume([newVol])
}

let cachedVolume: number | null = null;
async function togglePlayback() {
	const { mixer, playback } = mopidy;
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

async function startListening() {
	await mopidy.playback.pause();
	await execp(`if pgrep arecord; then killall -q arecord; fi`);
	LED.startSpinSlow();
	SFX.beep();
	const { stdout } = await execp([
		`sudo arecord -q -D ac108 --duration=20 --rate=16000 --format=S16_LE`,
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
	await execp("sudo killall -q arecord");
	SFX.ok();
}

function err(msg: string, also: unknown) {
	console.log(`err: ${msg}`, also);
	SFX.error();
}
