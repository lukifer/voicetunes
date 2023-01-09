import { exec, spawn } from "child_process";
import { promisify }   from "util";
import AlsaCapture     from "alsa-capture";
import fs              from 'fs';

import * as LED from "./led";
import * as SFX from "./sfx";
import config   from "./config";

import { now, wait } from "./utils";
import { doIntent }  from "./intent";
import { mqttClient } from "./mqttlisten";

const {
  AUDIO_DEVICE_IN,
  AUDIO_DEVICE_OUT,
  DENOISE_BIN,
  DENOISE_SOX,
  MIN_LISTEN_DURATION_MS,
  PATH_RAMDISK,
  REC_BIN,
  VOICE2JSON_BIN,
} = config;

const execp = promisify(exec);

let listenStartTimestamp = 0;
let listenDurationMs     = 0;

// export async function startListeningBash() {
//   listenStartTimestamp = now();
//   // FIXME: SIG_STOP
//   await execp(`if pgrep arecord;    then sudo killall -q arecord;    fi`);
//   await execp(`if pgrep voice2json; then sudo killall -q voice2json; fi`);
//   //await execp(`if pgrep sox;        then sudo killall -q sox;        fi`);
//   //await execp(`if pgrep rnnoise;    then sudo killall -q rnnoise;    fi`);
//   LED.startSpinSlow();
//   // SFX.beep();
//   let { stdout } = await execp([
//     REC_BIN || `sudo arecord -q -D ${AUDIO_DEVICE_IN} -t raw --duration=20 --rate=16000 --format=S16_LE`,
//     `tee ${PATH_RAMDISK}/input.raw`,
//     `${VOICE2JSON_BIN} transcribe-stream -c 1 -a -`,
//     `tee ${PATH_RAMDISK}/input.txt`,
//     `${VOICE2JSON_BIN} recognize-intent`,
//   ].join(" | "));

//   if(listenDurationMs < MIN_LISTEN_DURATION_MS) {
//     console.log(`negatory: ${listenDurationMs}ms`);
//     return;
//   }

//   let msg = stdout[0] === "{" && JSON.parse(stdout);

//   if(msg) {
//     await doIntent({...msg, intentName: msg.intent.name});
//     LED.stopSpin();
//     return;
//   }

//   LED.startSpinFaster();
//   await denoise();
//   ({ stdout } = await execp([
//     `${VOICE2JSON_BIN} transcribe-wav < ${PATH_RAMDISK}/denoised.wav`,
//     `tee ${PATH_RAMDISK}/denoised.txt`,
//     `${VOICE2JSON_BIN} recognize-intent`,
//   ].join(" | ")));
//   msg = stdout[0] === "{" && JSON.parse(stdout);
//   if(msg) {
//     await doIntent(msg);
//     LED.stopSpin();
//     return;
//   }

//   LED.stopSpin();
// }

// export async function stopListeningBash() {
//   listenDurationMs = now() - listenStartTimestamp;
//   await wait(100); // a little trailing audio seems to help accuracy
//   //await execp("sudo killall -q arecord");
//   await execp(`if pgrep arecord; then sudo killall -q arecord; fi`);
//   if(listenDurationMs < MIN_LISTEN_DURATION_MS) {
//     LED.stopSpin();
//   } else {
//     LED.startSpinFast();
//     // SFX.ok();
//   }
// }

let captureInstance: AlsaCapture
let lograw: string
let transcribe: ReturnType<typeof spawn>

export async function startListening() {
  // await player.pause();

  lograw = `/tmp/ramdisk/${(new Date).toISOString().replace(/[:.]/g, '-')}.raw`;
  fs.writeFileSync(lograw, '');

  // default values for the options object
  captureInstance = new AlsaCapture({
    channels: 1,
    debug: false,
    device: "default",
    format: "S16_LE",
    periodSize: 16,
    periodTime: undefined,
    rate: 16000,
  });

  LED.startSpinSlow();

  transcribe = spawn([
    "voice2json transcribe-stream -c 1 -a -",
    "voice2json recognize-intent"
  ].join(' | '), [], { shell: "/bin/bash" });

  // ({ stdout } = await execp([
  //   rec.stdout.pipe(transcribe.stdin);

  transcribe.stdin.on('error', () => {});

  transcribe.stdout.on("data", (data) => {
    // console.log("transcribe stdout", data.toString())
    try {
      const jsonString = data.toString();
      const json = JSON.parse(jsonString);
      mqttClient?.publish("voice2json", jsonString);

      LED.stopSpin();
    } catch(err) {}
  })

  transcribe.stderr.on("data", (data) => {
    // LOG
    // console.log("transcribe stderr", data.toString())
  })

  captureInstance.on("audio", (data) => {
    // console.log(data.length);
    transcribe.stdin.write(data)
    fs.appendFileSync(lograw, data)
  });
}

export async function stopListening() {

  captureInstance?.on("close", () => {
    // console.log("capture closed");

    transcribe.stdin.end();

    LED.startSpinFast();
  });

  captureInstance?.close();
}

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