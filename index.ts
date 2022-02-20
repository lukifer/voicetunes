import { exec }      from "child_process";
import { promisify } from "util";

import * as KB       from "./kb";
import * as LED      from "./led";
import { getPlayer } from "./player";
import SFX           from "./sfx";
import { now, wait } from "./utils";
import config        from "./config";

import {
  changeVol,
  doIntent,
  previousTrack,
  nextTrack,
  togglePlayback,
} from "./intent";

const {
  AUDIO_DEVICE_IN,
  AUDIO_DEVICE_OUT,
  BT_BUTTON_NAME,
  DENOISE_BIN,
  DENOISE_SOX,
  KEY_DOWN,
  KEY_LEFT,
  KEY_LISTEN,
  KEY_PLAY,
  KEY_RIGHT,
  KEY_UP,
  MIN_LISTEN_DURATION_MS,
  PATH_RAMDISK,
  REC_BIN,
  VOICE2JSON_BIN,
  WALKIE_TALKIE,
} = config;

const execp = promisify(exec);

export const player = getPlayer("mopidy");

async function buttonListen() {
  const button = await KB.start(BT_BUTTON_NAME);

  button.on("disconnect", async () => {
    console.log("button disconnected")
    await buttonListen();
  });

  let isListening = false;
  button.on("keypress", async (m: any) => {
    if (!m || typeof m !== "object") return; // Remove after adding types
    const {code} = m;
    console.log(`key code: ${code || "unknown"}`);
    switch (code) {
      case KEY_UP:   return changeVol( 10);
      case KEY_DOWN: return changeVol(-10);

      case KEY_LEFT:  return await previousTrack();
      case KEY_RIGHT: return await nextTrack();
      case KEY_PLAY:  return await togglePlayback();

      case KEY_LISTEN:
        if (WALKIE_TALKIE) {
          await startListening();
        } else {
          isListening = !isListening;
          if (isListening) await startListening();
          else             await stopListening();
        }
        break;
    }
  });
  if (WALKIE_TALKIE) button.on("keyup", async (m: any) => {
    const {code} = m;
    console.log("keyup", code)
    if (code === KEY_LISTEN) await stopListening();
  });
}

player.start().then(async () => {
  SFX.init(AUDIO_DEVICE_OUT);
  LED.open();

  await buttonListen();
  // await BT.connect();

  LED.flair();
  await player.pause();
  await player.clearTracks();
  SFX.beep();

/*
  BT.listen({
    UP:    () => changeVol( 10),
    DOWN:  () => changeVol(-10),

    LEFT:  async () => await previousTrack(),
    RIGHT: async () => await nextTrack(),
    PLAY:  async () => await togglePlayback(),

    LISTEN_START: async () => startListening(),
    LISTEN_DONE:  async () => stopListening(),
  });
*/
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
  await player.pause();
  // FIXME: SIG_STOP
  await execp(`if pgrep arecord;    then sudo killall -q arecord;    fi`);
  await execp(`if pgrep voice2json; then sudo killall -q voice2json; fi`);
  //await execp(`if pgrep sox;        then sudo killall -q sox;        fi`);
  //await execp(`if pgrep rnnoise;    then sudo killall -q rnnoise;    fi`);
  LED.startSpinSlow();
  SFX.beep();
  let { stdout } = await execp([
    REC_BIN || `sudo arecord -q -D ${AUDIO_DEVICE_IN} -t raw --duration=20 --rate=16000 --format=S16_LE`,
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
  //await execp("sudo killall -q arecord");
  await execp(`if pgrep arecord; then sudo killall -q arecord; fi`);
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
