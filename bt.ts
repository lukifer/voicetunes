import HID from "node-hid";

import config from "./config.local";

const {
	BT_BUTTON_NAME,
	BT_DEVICE_EVENT,
	KEY_UP,
	KEY_DOWN,
	KEY_LEFT,
	KEY_RIGHT,
	KEY_PLAY,
	KEY_LISTEN,
} = config as any;

const buttons = {
	UP:           KEY_UP,
	DOWN:         KEY_DOWN,
	LEFT:         KEY_LEFT,
	RIGHT:        KEY_RIGHT,
	PLAY:         KEY_PLAY,
	LISTEN_START: KEY_LISTEN,
	LISTEN_DONE:  KEY_LISTEN,
}

type BtButtons = keyof typeof buttons;
type BtButtonListeners = Partial<Record<BtButtons, () => void>>;

const mapButtonCodesToNames = Object.keys(buttons).reduce((acc, k) => (
	buttons[k] === KEY_LISTEN ? acc : { ...acc, [buttons[k]]: k }
), {});

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
		const press   = data.map(x => x);
		const isDown  = press[28];
		const keyCode = press[12];
		const keyName = mapButtonCodesToNames[keyCode];

		if(buttonCallbacks[keyName] && !isDown) {
			buttonCallbacks[keyName]();
		}

		else if(keyCode === KEY_LISTEN) {
			if(isDown && buttonCallbacks.LISTEN_START) {
				buttonCallbacks.LISTEN_START();
			} else if(buttonCallbacks.LISTEN_DONE) {
				buttonCallbacks.LISTEN_DONE();
			}
		}
	});
}
