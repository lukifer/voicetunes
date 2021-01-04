import { exec }      from "child_process";
import { promisify } from "util";

import config from "./config";
const {
	PATH_RAMDISK,
	WAV_BEEP,
	WAV_ERROR,
	WAV_OK,
	WAV_UNRECOGNIZED,
} = config;

const execp = promisify(exec);

let audiohw = "";
export async function init(device: string) {
	audiohw = device ? `-D ${device}` : "";
	await execp(`mkdir -p ${PATH_RAMDISK}`);
	await execp(`sudo mount -t tmpfs -o size=50m myramdisk ${PATH_RAMDISK}`);
	[WAV_BEEP, WAV_ERROR, WAV_OK, WAV_UNRECOGNIZED].map(async (f) => {
		f && await execp(`cp ./sounds/${f}.wav ${PATH_RAMDISK}/`);
	});
}

export async function play(sound: string) {
	sound && await playFile(`${PATH_RAMDISK}/${sound}.wav`);
}

export async function playFile(file: string) {
	await execp(`sudo aplay ${audiohw} ${file}`);
}

export async function speak(string: string) {
	const tmpWav   = `${PATH_RAMDISK}/_tmp.wav`;
	const speakWav = `${PATH_RAMDISK}/_speak.wav`;
	await execp(`flite -t "${string}" -voice slt -o ${tmpWav}`);
	await execp(`sox ${tmpWav} -c 2 -r 48k ${speakWav}`);
	playFile(speakWav);
}

export default {
	init,
	play,
	speak,
	beep:         async () => await play(WAV_BEEP),
	error:        async () => await play(WAV_ERROR),
	ok:           async () => await play(WAV_OK),
	unrecognized: async () => await play(WAV_UNRECOGNIZED),
};
