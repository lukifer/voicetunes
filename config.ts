import { readJson } from "./itunes/data";

const configDefaults = {
	ALLOW_SHUTDOWN: false,
	AUDIO_DEVICE_IN: "ac108",
	AUDIO_DEVICE_OUT: "dmixer",
	BT_BUTTON_NAME: "Tunai Button",
	BT_DEVICE_EVENT: "/dev/input/event0",
	CLICK_DELAY_MS: 500,
	CLICK_DOUBLE: {
		KEY_UP: "",
		KEY_DOWN: "",
		KEY_LEFT: "",
		KEY_RIGHT: "",
		KEY_PLAY: "",
		KEY_LISTEN: "",
	},
	CLICK_TRIPLE: {
		KEY_UP: "",
		KEY_DOWN: "",
		KEY_LEFT: "",
		KEY_RIGHT: "",
		KEY_PLAY: "",
		KEY_LISTEN: "",
	},
	DENOISE_BIN: "",
	DENOISE_SOX: false as boolean | number,
	KEY_UP: 233,
	KEY_DOWN: 234,
	KEY_LEFT: 182,
	KEY_RIGHT: 181,
	KEY_PLAY: 205,
	KEY_LISTEN: 35,
	LED_MS: 80,
	MAX_QUEUED_TRACKS: 100,
	MIN_LISTEN_DURATION_MS: 1000,
	MQTT_PASSTHROUGH_INTENTS: [],
	MQTT_IP: "",
	PATH_RAMDISK: "/tmp/ramdisk",
	URL_MOPIDY: "ws://localhost:6680/mopidy/ws/",
	URL_MUSIC: "file:///home/pi/music",
	URL_ITUNES: "",
	USE_LED: false,
	VOICE2JSON_BIN: "voice2json",
	VOICE2JSON_PROFILE: "/home/pi/.config/voice2json",
	WAV_BEEP: "",
	WAV_ERROR: "",
	WAV_OK: "",
	WAV_UNRECOGNIZED: "",
};

// To override defaults, create a config.local.json with matching keys
const config = Object.assign(
	{},
	configDefaults,
	readJson("./config.local.json")
) as typeof configDefaults;

export default {
	...config,
	"VOICE2JSON": `${config["VOICE2JSON_BIN"]} --profile ${config["VOICE2JSON_PROFILE"]}`
};
