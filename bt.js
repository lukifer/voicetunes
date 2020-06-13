const HID = require('node-hid');
const {
	BT_BUTTON_NAME,
	BT_DEVICE_EVENT,
	KEY_UP,
	KEY_DOWN,
	KEY_LEFT,
	KEY_RIGHT,
	KEY_PLAY,
	KEY_LISTEN,
} = require('./config.local');

const buttons = {
	UP:           KEY_UP,
	DOWN:         KEY_DOWN,
	LEFT:         KEY_LEFT,
	RIGHT:        KEY_RIGHT,
	PLAY:         KEY_PLAY,
	LISTEN_START: KEY_LISTEN,
	LISTEN_DONE:  KEY_LISTEN,
}

const mapButtonCodesToNames = Object.keys(buttons).reduce((acc, k) => (
	buttons[k] === KEY_LISTEN ? acc : { ...acc, [buttons[k]]: k }
), {});

async function btConnect() {
	return new Promise((resolve, reject) => {
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

let btRemote;
async function connect() {
	btRemote = await btConnect();
}

async function listen(buttonCallbacks) {
	if(!btRemote) btRemote = await connect();
	btRemote.on("data", async function(data) {
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

module.exports = {
	connect,
	listen,
	buttons,
}