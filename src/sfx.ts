import { exec }      from "child_process";
import { promisify } from "util";

import { loadConfig } from "./config";
const {
  PATH_RAMDISK,
  WAV,
} = await loadConfig();

const execp = promisify(exec);

let audiohw = "";
export async function init(device: string) {
  audiohw = device ? `-D ${device}` : "";
  // await execp(`mkdir -p ${PATH_RAMDISK}`);
  // await execp(`sudo mount -t tmpfs -o size=50m myramdisk ${PATH_RAMDISK}`);
  // [WAV_BEEP, WAV_ERROR, WAV_OK, WAV_UNRECOGNIZED].map(async (f) => {
  //   f && await execp(`cp ./sounds/${f}.wav ${PATH_RAMDISK}/`);
  // });
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
  beep:         async () => WAV.BEEP         && await play(WAV.BEEP),
  error:        async () => WAV.ERROR        && await play(WAV.ERROR),
  ok:           async () => WAV.OK           && await play(WAV.OK),
  unrecognized: async () => WAV.UNRECOGNIZED && await play(WAV.UNRECOGNIZED),
};
