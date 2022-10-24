import * as KB       from "./src/kb";
import * as LED      from "./src/led";
import { getPlayer } from "./src/player";
import SFX           from "./src/sfx";
import config        from "./src/config";

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
  AUDIO_DEVICE_OUT,
  BT_BUTTON_NAME,
  KEY_DOWN,
  KEY_LEFT,
  KEY_LISTEN,
  KEY_PLAY,
  KEY_RIGHT,
  KEY_UP,
  PLAYER,
  WALKIE_TALKIE,
} = config;

export const player = getPlayer(PLAYER);

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

  await buttonListen();

  LED.flair();
  await player.pause();
  await player.clearTracks();
  SFX.beep();
});
