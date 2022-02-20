import { exec }   from "child_process";
import InputEvent from "input-event";

import { promisify } from "util";

const execp = promisify(exec);

const NL = `
`;
 
/*
const input = new InputEvent('/dev/input/event2');

const keyboard = new InputEvent.Keyboard(input);
 
keyboard.on('error'   , (m: any) => console.log('error', m));
keyboard.on('opened'  , (m: any) => console.log('opened', m));
keyboard.on('keyup'   , (m: any) => console.log('keyup', m));
keyboard.on('keydown' , (m: any) => console.log('keydown', m));
keyboard.on('keypress', (m: any) => console.log('keypress', m));
*/

const parseDevices = (devsStr: string) => devsStr.trim().split(NL+NL).map(dev =>
  dev
    .split(NL).map(line => line.match(/^[A-Z]: ([a-zA-Z]+)=(.+)$/))
    .reduce((acc, line) => {
      if (line?.length === 3)
        acc[line[1]] = line[2].replace(/^"/, "").replace(/"$/, "");
      return acc;
    }, {} as Record<string, string>)
);

let keyboard: NodeJS.EventEmitter | null = null;
let keyboardConnectTimer = null;

async function findDeviceInput(deviceName: string) {
  let { stdout } = await execp("cat /proc/bus/input/devices");
  const device = parseDevices(stdout).find(dev => dev.Name === deviceName);
  const evt = device?.Handlers?.trim().replace(/^.+(event[0-9]+)$/, "$1") || "";
  console.log({deviceName, evt})
  return evt && `/dev/input/${evt}`;
}

export function start(deviceName: string): Promise<NodeJS.EventEmitter> {

  return new Promise((resolve, _reject) => {
    // If this is a reconnect, we need to kill the old object first
    if (keyboard) {
      keyboard.removeAllListeners();
      keyboard = null;
    }
    if (keyboardConnectTimer) {
      clearTimeout(keyboardConnectTimer);
      keyboardConnectTimer = null;
    }
    (async function keyboardConnect() {
      console.log('keyboardConnect')
      const inputPath = await findDeviceInput(deviceName);
      if (inputPath) {
        try {
        keyboard = new InputEvent.Keyboard(new InputEvent(inputPath));
//         keyboard.on('keypress', (m: any) => console.log('derp keypress', m));
//         keyboard.on('data', (m: any) => console.log('derp data', m));
//         keyboard.on('close', (m: any) => console.log('derp close', m));
        } catch(err) { console.log("catch", err); }
      }
      console.log({keyboard_yes: !!keyboard})
      if (keyboard) {
//         console.log({keyboard, on: keyboard.on})
        keyboardConnectTimer = null;
        keyboard.on("error", (m: any) => console.log("kb_error", m));
        resolve(keyboard);
      } else {
        keyboardConnectTimer = setTimeout(keyboardConnect, 3000);
      }
    })();
  });
}
