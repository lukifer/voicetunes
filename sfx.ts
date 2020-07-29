import { exec }      from "child_process";
import { promisify } from "util";

import { Sfx } from "./itunes/types";

import config from "./config.local";

const execp = promisify(exec);

const {
	PATH_RAMDISK = "/tmp/ramdisk",
} = config as any;

// TODO: Move to config
const WAV = {
	OK:    "ok",
	BEEP:  "beep",
	ERROR: "error",
};

let audiohw = "";

export async function init(device: string) {
	audiohw = device ? `-D ${device}` : "";
	await execp(`mkdir -p ${PATH_RAMDISK}`);
	await execp(`sudo mount -t tmpfs -o size=100m myramdisk ${PATH_RAMDISK}`);
	Object.values(WAV).map(async (f) => {
		await execp(`cp ./sounds/${f}.wav ${PATH_RAMDISK}/`);
	});
}

export function play(sound: string) {
	playFile(`${PATH_RAMDISK}/${WAV[sound]}.wav`);
}

export async function playFile(file: string) {
	//console.log(`sudo aplay ${audiohw} ${file}`);
	const { stdout, stderr } = await execp(`sudo aplay ${audiohw} ${file}`);
	//console.log(stdout, stderr);
}

export async function speak(string: string) {
	const tmpWav   = `${PATH_RAMDISK}/tmp.wav`;
	const speakWav = `${PATH_RAMDISK}/speak.wav`;
	await execp(`flite -t "${string}" -voice slt -o ${tmpWav}`);
	await execp(`sox ${tmpWav} -c 2 -r 48k ${speakWav}`);
	playFile(speakWav);
}

const playFuncs: Sfx = Object.keys(WAV).reduce((acc, x) => ({...acc, [x.toLowerCase()]: () => play(x)}), {} as Sfx)

export default {
	init,
	play,
	speak,
	...playFuncs,
};
