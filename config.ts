import { readJson } from "./itunes/data";

const config = {
	ALLOW_SHUTDOWN: false,
	AUDIO_DEVICE_IN: "ac108",
	AUDIO_DEVICE_OUT: "dmixer",
	BT_BUTTON_NAME: "Tunai Button",
	BT_DEVICE_EVENT: "/dev/input/event0",
	KEY_UP: 233,
	KEY_DOWN: 234,
	KEY_LEFT: 182,
	KEY_RIGHT: 181,
	KEY_PLAY: 205,
	KEY_LISTEN: 35,
	LED_MS: 80,
	MAX_QUEUED_TRACKS: 100,
	MQTT_PASSTHROUGH_INTENTS: [],
	MQTT_IP: "",
	PATH_RAMDISK: "/tmp/ramdisk",
	URL_MOPIDY: "ws://localhost:6680/mopidy/ws/",
	URL_MUSIC: "file:///home/pi/music",
	URL_ITUNES: "",
	WAV_BEEP: "",
	WAV_ERROR: "",
	WAV_OK: "",
};

// To override defaults, create a config.local.json with matching keys
export default Object.assign({}, config, readJson("./config.local.json")) as typeof config;
