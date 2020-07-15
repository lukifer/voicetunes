import Mopidy from "mopidy";
import { exec }      from "child_process";
import { promisify } from "util";

import * as LED     from "./led";
import * as BT      from "./bt";
import SFX          from "./sfx";
import { doIntent } from "./intent";
import { between }  from "./utils";

import config from "./config.local";
const {
	PATH_RAMDISK = "/tmp/ramdisk",
} = config as any;
const PATH_INPUT_WAV = `${PATH_RAMDISK}/input.wav`;

const execp = promisify(exec);

SFX.init("duplex");
const mopidy = new Mopidy({ webSocketUrl: "ws://localhost:6680/mopidy/ws/" });
LED.open();

mopidy.on("state:online", async () => {
	await BT.connect();
	LED.flair();
	await mopidy.tracklist.clear();
	//SFX.beep();

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
	mixer.setVolume([newVol])
}

async function togglePlayback() {
	const { playback } = mopidy;
	return ("playing" === await playback.getState())
		? playback.pause()
		: playback.resume()
		;
}

async function startListening() {
	await execp(`if pgrep arecord; then pkill arecord; fi`);
	SFX.beep();
	LED.startSpin(3);
	await mopidy.playback.pause();
	await execp(`sudo arecord --duration=20 --rate=16000 --format=S16_LE ${PATH_INPUT_WAV}`);
}

async function stopListening() {
	await execp("pkill arecord");
	SFX.ok();
	await execp("sleep 0.01"); // FIXME
	LED.startSpin(1);
	const { stdout } = await execp([
		`cat ${PATH_INPUT_WAV}`,
		`voice2json transcribe-wav`,
		`voice2json recognize-intent`,
	].join(" | "));
	const msg = stdout[0] === "{" && JSON.parse(stdout);
	LED.startSpin(0.5);
	if(msg) {
		await doIntent(mopidy, msg);
	} else {
		err("invalid json", stdout);
	}
	LED.stopSpin();
}

function err(msg: string, also: unknown) {
	console.log(`err: ${msg}`, also);
	SFX.error();
}
