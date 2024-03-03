import HID from "node-hid";
import { RingBuffer } from 'ring-buffer-ts';
import { doIntent, textToIntent } from "./intent";
import { now } from "./utils";

// DEPRECATED

import config from "./config";
const {
  BT_BUTTON_NAME,
  BT_BYTE_IS_DOWN,
  BT_BYTE_KEY_CODE,
  // BT_DEVICE_EVENT,
  BT_USAGE_PAGE,
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
let lastListenTime   = 0;
let buttonTimers     = {};
let buttonPressCount = {};

let buttonTimestamps = Object.keys(buttons).reduce((acc, button) => ({
  ...acc,
  [button]: new RingBuffer<number>(3),
}), {} as Record<BtButton, RingBuffer<number>>)

const lastPressWithin = (b: BtButton, ms: number) => now() - buttonTimestamps[b].getLast() < ms;

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
    try {
    // console.log({driveType: HID.setDriverType()})
    const doConnect = () => {
      const hidDevices = HID.devices();
      //console.log({BT_BUTTON_NAME})
      //console.log({hidDevices})
      //console.log(hidDevices.map(x => x.product).join(','))
      if(hidDevices.find(x => x.product === BT_BUTTON_NAME && (!BT_USAGE_PAGE || x.usagePage === BT_USAGE_PAGE))) {
        // resolve(new HID.HID(BT_DEVICE_EVENT || "/dev/input/event0"));
        resolve(new HID.HID("/dev/input/event0"));
      } else {
        setTimeout(() => doConnect(), 3000);
      }
    };
    doConnect();
    } catch(err) { console.log('btConnect_err', err); }
  });
}

let btRemote: NodeJS.EventEmitter;
export async function connect() {
  try {
  btRemote = await btConnect() as NodeJS.EventEmitter;
  } catch(err) { console.log('connect_err', err) }
}

export async function listen(buttonCallbacks: BtButtonListeners) {
  if(!btRemote) await connect();
  btRemote.on("error", async (error) => console.log("on_error", error))
  btRemote.on("data", async function(data: Buffer) {
    try {
    const isDown  = data[BT_BYTE_IS_DOWN];
    const keyCode = data[BT_BYTE_KEY_CODE];
    const keyName = mapButtonCodesToNames[keyCode];

    //console.log(keyName, keyCode, "isDown="+isDown);

    if(!buttonCallbacks[keyName]) return;

    // FIXME: WTF
    //if(keyCode === KEY_LISTEN && press[10] != 9) return;

    const doubleClickCmd = CLICK_DOUBLE[keyName];
    const tripleClickCmd = CLICK_TRIPLE[keyName];
    const hasMultiClickCmd = !!doubleClickCmd || !!tripleClickCmd;

    // Reject duplicate presses if multi-click is not being used
    if(!isDown) {
      if(!hasMultiClickCmd && lastPressWithin(keyName, CLICK_DELAY_MS))
        return;
      buttonTimestamps[keyName].add(now());
    }

    if(isDown) {
      //console.log(keyCode, KEY_LISTEN, keyCode === KEY_LISTEN);
      //console.log(keyName+" hasMultiClickCmd="+hasMultiClickCmd, "hasTimeout="+!!buttonTimers[keyName]);
      if(WALKIE_TALKIE && keyCode === KEY_LISTEN && buttonCallbacks.LISTEN_START) {
        const now = + new Date();
        //console.log({lastListenTime}, now - lastListenTime);
        if (lastListenTime && (now - lastListenTime < 500)) return;
        lastListenTime = now;
        //return buttonCallbacks.LISTEN_START();
      } else if(hasMultiClickCmd && buttonTimers[keyName]) {
        clearButtonTimer(keyName);
      }
      //console.log("ignoring keydown")
      return; // Listen uses "walkie-talkie" mode; other actions trigger on keyup only
    }
    const singleClick = () => {
      //console.log("singleClick fire="+keyName);
      clearButtonTimer(keyName);
      buttonPressCount[keyName] = 0;
      //console.log('singleClick '+keyCode, 'KEY_LISTEN='+KEY_LISTEN)
      if (!WALKIE_TALKIE && keyCode === KEY_LISTEN) {
        const now = + new Date();
        //console.log({lastListenTime}, now - lastListenTime);
        if (lastListenTime && (now - lastListenTime < 500)) return;
        lastListenTime = now;

        isListening = !isListening;
        //console.log({isListening}, "will "+(isListening ? "start" : "stop"))
        if (isListening) buttonCallbacks.LISTEN_START();
        else             buttonCallbacks.LISTEN_DONE();
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
    } catch(err) { console.log("bt_listen_err", err); }
  });
}