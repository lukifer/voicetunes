import Mopidy from "mopidy";
import { exec }      from "child_process";
import { promisify } from "util";

import * as LED      from "./led";
import * as BT       from "./bt";
import SFX           from "./sfx";
import { now, wait } from "./utils";
import config        from "./config";

import {
  changeVol,
  doIntent,
  togglePlayback,
} from "./intent";

const {
  AUDIO_DEVICE_IN,
  AUDIO_DEVICE_OUT,
  DENOISE_BIN,
  DENOISE_SOX,
  MIN_LISTEN_DURATION_MS,
  PATH_RAMDISK,
  URL_MOPIDY,
  VOICE2JSON_BIN,
} = config;

const execp = promisify(exec);

export const mopidy = new Mopidy({ webSocketUrl: URL_MOPIDY });

mopidy.on("state:online", async () => {
  SFX.init(AUDIO_DEVICE_OUT);
  LED.open();

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

async function denoise() {
  const fmtRaw = "-t raw -r 16000 -b 16 -c 1 -L -e signed-integer";
  let cmd: string[] = [`cd ${PATH_RAMDISK}`];
  if(DENOISE_BIN) {
    cmd = [
      ...cmd,
      `cat input.raw | ${DENOISE_BIN} > denoised.raw`,
      `sox ${fmtRaw} denoised.raw denoised.wav`,
    ];
  } else if(DENOISE_SOX) {
    const denoiseNum = DENOISE_SOX === true ? 0.15 : DENOISE_SOX;
    cmd = [
      ...cmd,
      `sox ${fmtRaw} input.raw --null trim 0 0.3 noiseprof`,
      `sox ${fmtRaw} input.raw -t wav denoised.wav noisered - ${denoiseNum} 2> /dev/null`,
    ];
  } else {
    cmd = [
      ...cmd,
      `sox ${fmtRaw} input.raw denoised.wav`,
    ];
  }
  await execp(cmd.join(";"));
}

let listenStartTimestamp = 0;
let listenDurationMs     = 0;

async function startListening() {
  listenStartTimestamp = now();
  await mopidy.playback.pause();
  // FIXME: SIG_STOP
  await execp(`if pgrep arecord;    then sudo killall -q arecord;    fi`);
  await execp(`if pgrep voice2json; then sudo killall -q voice2json; fi`);
  await execp(`if pgrep sox;        then sudo killall -q sox;        fi`);
  await execp(`if pgrep rnnoise;    then sudo killall -q rnnoise;    fi`);
  LED.startSpinSlow();
  SFX.beep();
  let { stdout } = await execp([
    `sudo arecord -q -D ${AUDIO_DEVICE_IN} -t raw --duration=20 --rate=16000 --format=S16_LE`,
    `tee ${PATH_RAMDISK}/input.raw`,
    `${VOICE2JSON_BIN} transcribe-stream -c 1 -a -`,
    `tee ${PATH_RAMDISK}/input.txt`,
    `${VOICE2JSON_BIN} recognize-intent`,
  ].join(" | "));

  if(listenDurationMs < MIN_LISTEN_DURATION_MS) {
    console.log(`negatory: ${listenDurationMs}ms`);
    return;
  }

  let msg = stdout[0] === "{" && JSON.parse(stdout);

  if(msg) {
    await doIntent({...msg, intentName: msg.intent.name});
    LED.stopSpin();
    return;
  }

  LED.startSpinFaster();
  await denoise();
  ({ stdout } = await execp([
    `${VOICE2JSON_BIN} transcribe-wav < ${PATH_RAMDISK}/denoised.wav`,
    `tee ${PATH_RAMDISK}/denoised.txt`,
    `${VOICE2JSON_BIN} recognize-intent`,
  ].join(" | ")));
  msg = stdout[0] === "{" && JSON.parse(stdout);
  if(msg) {
    await doIntent(msg);
    LED.stopSpin();
    return;
  }

  LED.stopSpin();
}

async function stopListening() {
  listenDurationMs = now() - listenStartTimestamp;
  await wait(100); // a little trailing audio seems to help accuracy
  await execp("sudo killall -q arecord");
  if(listenDurationMs < MIN_LISTEN_DURATION_MS) {
    LED.stopSpin();
  } else {
    LED.startSpinFast();
    SFX.ok();
  }
}

// function err(msg: string, also: unknown) {
//   console.log(`err: ${msg}`, also);
//   SFX.error();
// }
