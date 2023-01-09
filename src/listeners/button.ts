import * as KB  from "../kb";
import config   from "../config";
import { mqtt } from "../mqttlisten";

const {
  BT_BUTTON_NAME,
  KEY_DOWN,
  KEY_LEFT,
  KEY_LISTEN,
  KEY_PLAY,
  KEY_RIGHT,
  KEY_UP,
  WALKIE_TALKIE,
} = config;

type Keypress = {
  code: number;
  tssec: number;
}

const lastPressTimestamps: Partial<Record<number, number>> = {}

function checkDuplicatePress(code: number, ts: number) {
  const isDiff = !lastPressTimestamps[code] || lastPressTimestamps[code] !== ts;
  lastPressTimestamps[code] = ts;
  return !isDiff;
}

export async function buttonListen(buttonName: string) {
  const button = await KB.start(buttonName);

  button.on("disconnect", async () => {
    // console.log("button disconnected")
    await buttonListen(BT_BUTTON_NAME);
  });

  let isListening = false;
  button.on("keypress", async (m?: Keypress) => {
    if (!m || typeof m !== "object") return;
    const {code, tssec} = m;
    if (checkDuplicatePress(code, tssec)) return;
    // console.log({code, m})
    switch (code) {
      case KEY_UP:   return mqtt({action: "ChangeVolume", volume:  10});
      case KEY_DOWN: return mqtt({action: "ChangeVolume", volume: -10});

      case KEY_LEFT:  return mqtt({action: "PreviousTrack"});
      case KEY_RIGHT: return mqtt({action: "NextTrack"});
      case KEY_PLAY:  return mqtt({action: "TogglePlayback"});

      case KEY_LISTEN:
        if (WALKIE_TALKIE) {
          return mqtt({action: "StartListening"});
        } else {
          isListening = !isListening;
          if (isListening) {
            return mqtt({action: "StartListening"});
          } else {
            return mqtt({action: "StopListening"});
          }
        }
        break;
    }
  });
  if (WALKIE_TALKIE) button.on("keyup", async (m: {code: number}) => {
    const {code} = m;
    if (code === KEY_LISTEN) return mqtt({action: "StopListening"});
  });
}