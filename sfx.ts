import { exec }      from "child_process";
import { promisify } from "util";

import config from "./config";
const {
	PATH_RAMDISK,
	WAV_BEEP,
	WAV_ERROR,
	WAV_OK,
} = config;

const execp = promisify(exec);

let audiohw = "";
export async function init(device: string) {
	audiohw = device ? `-D ${device}` : "";
	await execp(`mkdir -p ${PATH_RAMDISK}`);
	await execp(`sudo mount -t tmpfs -o size=50m myramdisk ${PATH_RAMDISK}`);
	[WAV_BEEP, WAV_ERROR, WAV_OK].map(async (f) => {
		if(f) await execp(`cp ./sounds/${f}.wav ${PATH_RAMDISK}/`);
	});
}

export function play(sound: string) {
	sound && playFile(`${PATH_RAMDISK}/${sound}.wav`);
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
	beep:  play("beep"),
	error: play("error"),
	ok:    play("ok"),
};
