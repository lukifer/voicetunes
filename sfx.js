const { exec }      = require('child_process');
const { promisify } = require('util');
const execp         = promisify(exec);
const {
	PATH_RAMDISK = "/tmp/ramdisk",
} = require("./config.local");

// TODO: Move to config
const WAV = {
	OK:    "ok",
	BEEP:  "beep",
	ERROR: "error",
};

let audiohw = "";

async function init(device) {
	audiohw = device ? `-D ${device}` : "";
	await execp(`mkdir -p ${PATH_RAMDISK}`);
	await execp(`sudo mount -t tmpfs -o size=100m myramdisk ${PATH_RAMDISK}`);
	Object.values(WAV).map(async (f) => {
		await execp(`cp ./sounds/${f}.wav ${PATH_RAMDISK}/`);
	});
}

function play(sound) {
	// FIXME: share audio out with mopidy
	//playFile(`${PATH_RAMDISK}/${WAV[sound]}.wav`);
}

async function playFile(file) {
	const { stdout, stderr } = await execp(`sudo aplay ${audiohw} ${file}`);
	//console.log(stdout, stderr);
}

async function speak(string) {
	const speakWav = `${PATH_RAMDISK}/speak.wav`;
	await execp(`flite -t "${string}" -voice slt -o ${speakWav}`);
	await execp(`sleep 0.05`);
	//const { stdout, stderr } = await execp(`wc -c ${speakWav}`);
	//console.log("speak bytes "+stdout, stderr);
	playFile(speakWav);
}

const playFuncs = Object.keys(WAV).reduce((acc, x) => ({...acc, [x.toLowerCase()]: () => play(x)}), {})

module.exports = {
	...playFuncs,
	init,
	play,
	playFile,
	speak,
};
