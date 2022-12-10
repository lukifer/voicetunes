import { exec }      from "child_process";
import { promisify } from "util";

import * as KB        from "./src/kb";
import * as LED       from "./src/led";
import { mqttListen } from "./src/mqttlisten";
import { getPlayer }  from "./src/player";
import SFX            from "./src/sfx";
import config         from "./src/config";

import {
  startListening,
  stopListening,
} from './src/listen'

import {
  changeVol,
  previousTrack,
  nextTrack,
  togglePlayback,
} from "./src/intent";

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
  MQTT_LISTEN_IP,
  PATH_RAMDISK,
  PLAYER,
  REC_BIN,
  VOICE2JSON_BIN,
  WALKIE_TALKIE,
} = config;

const execp = promisify(exec);

export const player = getPlayer(PLAYER);

async function buttonListen(buttonName: string) {
  const button = await KB.start(buttonName);

  button.on("disconnect", async () => {
    console.log("button disconnected")
    await buttonListen(BT_BUTTON_NAME);
  });

  let isListening = false;
  button.on("keypress", async (m: any) => {
    if (!m || typeof m !== "object") return; // Remove after adding types
    const {code} = m;
    switch (code) {
      case KEY_UP:   return changeVol( 10);
      case KEY_DOWN: return changeVol(-10);

      case KEY_LEFT:  return await previousTrack();
      case KEY_RIGHT: return await nextTrack();
      case KEY_PLAY:  return await togglePlayback();

      case KEY_LISTEN:
        if (WALKIE_TALKIE) {
          await player.pause();
          await startListening();
        } else {
          isListening = !isListening;
          if (isListening) {
            await player.pause();
            await startListening();
          } else {
            await stopListening();
          }
        }
        break;
    }
  });
  if (WALKIE_TALKIE) button.on("keyup", async (m: any) => {
    const {code} = m;
    if (code === KEY_LISTEN) await stopListening();
  });
}

player.start().then(async () => {
  SFX.init(AUDIO_DEVICE_OUT);
  LED.open();

  if (BT_BUTTON_NAME) await buttonListen(BT_BUTTON_NAME);
  if (MQTT_LISTEN_IP) mqttListen(MQTT_LISTEN_IP)

  LED.flair();
  await player.pause();
  await player.clearTracks();
  SFX.beep();
});
