const Mopidy   = require("mopidy");
const LED      = require("./led.js");
const BT       = require("./bt.js");
const SFX      = require("./sfx.js");
const doIntent = require("./intent.js");

const { between, rnd } = require('./utils.js');
const {
	PATH_RAMDISK = "/tmp/ramdisk",
} = require("./config.local");

const { exec }      = require('child_process');
const { promisify } = require('util');
const execp         = promisify(exec);

const PATH_INPUT_WAV = `${PATH_RAMDISK}/input.wav`;

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

async function changeVol(diff) {
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

/*
let rec = null;
async function startListening2() {
	SFX.beep();
	LED.startSpin(3);
	await mopidy.playback.pause();
	rec = execa.command("arecord  --duration=20 --rate=16000 --format=S16_LE", { encoding: null });
	const transcribe = execa.command("voice2json transcribe-wav | voice2json recognize-intent", { shell: "/bin/bash" });
	rec.stdout.pipe(transcribe.stdin);
	const text = await transcribe;
	stopLed();
// 	const intent = await execa.command("voice2json recognize-intent", { input: text.stdout });
	const intent = text;
	const msg = intent.stdout[0] === "{" && JSON.parse(intent.stdout);
	if(msg) {
		doIntent(msg);
	} else {
		err("me no ams json", intent.stdout);
	}
}

async function stopListening2() {
	if(rec) {
		try {
			sound(OK_WAV);
			//await rec.cancel();
			await rec.kill("SIGINT");
			rec = null;
		} catch(err) {
			console.log("blerg", err);
		}
	}
}
*/

function err(msg, also) {
	console.log(`err: ${msg}`, also);
	SFX.error();
}

