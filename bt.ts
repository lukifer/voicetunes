import HID from "node-hid";
import { doIntent, textToIntent } from "./intent";

import config from "./config";
const {
  BT_BUTTON_NAME,
  BT_DEVICE_EVENT,
  CLICK_DELAY_MS,
  CLICK_DOUBLE,
  CLICK_TRIPLE,
  KEY_UP,
  KEY_DOWN,
  KEY_LEFT,
  KEY_RIGHT,
  KEY_PLAY,
  KEY_LISTEN,
  WALKIE_TALKIE,
} = config;

const buttons = {
  UP:           KEY_UP,
  DOWN:         KEY_DOWN,
  LEFT:         KEY_LEFT,
  RIGHT:        KEY_RIGHT,
  PLAY:         KEY_PLAY,
  LISTEN_START: KEY_LISTEN,
  LISTEN_DONE:  KEY_LISTEN,
}

type BtButton = keyof typeof buttons;
type BtButtonListeners = Partial<Record<BtButton, () => void>>;

let isListening      = false;
let buttonTimers     = {};
let buttonPressCount = {};

const clearButtonTimer = (k: BtButton) => {
  //console.log("clearButtonTimer", k, !!buttonTimers[k]);
  if(buttonTimers[k]) clearTimeout(buttonTimers[k]);
  buttonTimers[k] = false;
}

const resolveMultiClick = async (k: string, cmd: string) => {
  buttonPressCount[k] = 0;
  doIntent(await textToIntent(cmd));
};

const mapButtonCodesToNames = Object.keys(buttons).reduce((acc, k: BtButton) => (
  { ...acc, [buttons[k]]: k }
), {} as Record<number, BtButton>);

export async function btConnect() {
  return new Promise((resolve, _reject) => {
    const doConnect = () => {
      const hidDevices = HID.devices();
      if(hidDevices.find(x => x.product === BT_BUTTON_NAME)) {
        resolve(new HID.HID(BT_DEVICE_EVENT || "/dev/input/event0"));
      } else {
        setTimeout(() => doConnect(), 3000);
      }
    };
    doConnect();
  });
}

let btRemote: NodeJS.EventEmitter;
export async function connect() {
  btRemote = await btConnect() as NodeJS.EventEmitter;
}

export async function listen(buttonCallbacks: BtButtonListeners) {
  if(!btRemote) await connect();
  btRemote.on("data", async function(data: Buffer) {
    // FIXME: there's likely a performanter way to do this
    const press   = data.map(x => x);
    const isDown  = press[28];
    const keyCode = press[12];
    const keyName = mapButtonCodesToNames[keyCode];

    if(!buttonCallbacks[keyName]) return;

    //console.log(keyName, "isDown="+isDown);

    const doubleClickCmd = CLICK_DOUBLE[keyName];
    const tripleClickCmd = CLICK_TRIPLE[keyName];
    const hasMultiClickCmd = !!doubleClickCmd || !!tripleClickCmd;

    if(isDown) {
      //console.log(keyCode, KEY_LISTEN, keyCode === KEY_LISTEN);
      //console.log(keyName+" hasMultiClickCmd="+hasMultiClickCmd, "hasTimeout="+!!buttonTimers[keyName]);
      if(WALKIE_TALKIE && keyCode === KEY_LISTEN && buttonCallbacks.LISTEN_START) {
        return buttonCallbacks.LISTEN_START();
      } else if(hasMultiClickCmd && buttonTimers[keyName]) {
        clearButtonTimer(keyName);
      }
      return; // Listen uses "walkie-talkie" mode; other actions trigger on keyup only
    }
    const singleClick = () => {
      //console.log("singleClick fire="+keyName);
      clearButtonTimer(keyName);
      buttonPressCount[keyName] = 0;
      if (!WALKIE_TALKIE && keyCode === KEY_LISTEN) {
        if (isListening) buttonCallbacks.LISTEN_START();
        else             buttonCallbacks.LISTEN_DONE();
        isListening = !isListening;
      } else {
        buttonCallbacks[keyName]();
      }
    }

    if(hasMultiClickCmd) {
      buttonPressCount[keyName] = 1 + (buttonPressCount[keyName] || 0);
      //console.log(keyName+" pressCount", buttonPressCount[keyName]);
      if(buttonPressCount[keyName] === 2 && doubleClickCmd) {
        //clearButtonTimer(keyName);
        const doubleClick = async () => resolveMultiClick(keyName, doubleClickCmd);
        if(CLICK_TRIPLE[keyName]) {
          //console.log("doubleClick timeout", keyName, CLICK_DELAY);
          buttonTimers[keyName] = setTimeout(doubleClick, CLICK_DELAY_MS);
        } else {
          doubleClick();
        }
      } else if(buttonPressCount[keyName] === 3 && tripleClickCmd) {
        resolveMultiClick(keyName, tripleClickCmd);
      } else {
        buttonTimers[keyName] = setTimeout(singleClick, CLICK_DELAY_MS);
        //console.log("singleClick timeout", keyName, typeof buttonTimers[keyName]);
      }
    } else {
      singleClick();
    }
  });
}
