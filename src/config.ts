import { readJson } from "./utils";

const configDefaults = {
  ALIAS: {},
  ALLOW_SHUTDOWN: false,
  AUDIO_DEVICE_IN: "ac108",
  AUDIO_DEVICE_OUT: "dmixer",
  BT_BUTTON_NAME: "Tunai Button",
  BT_BYTE_IS_DOWN: 28,
  BT_BYTE_KEY_CODE: 12,
  BT_USAGE_PAGE: null as null | number,
  CLICK_DELAY_MS: 500,
  
  // Currently unused
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

  DEFAULT_ACTION: "",
  DENOISE_BIN: "",
  DENOISE_SOX: false as boolean | number,
  EXCLUDE_GENRES: null,
  FILE_EXTENSIONS: ["mp3", "m4a", "wav", "aiff", "flac", "alac"],
  FILTER_DENY: {
    albums: [],
    artists: [],
    genres: [],
    playlists: [],
    tracks: [],
  },
  FILTER_ONLY: {
    albums: [],
    artists: [],
    genres: [],
    playlists: [],
    tracks: [],
  },
  FLAC_HACK: false,
  KEY_UP: 115,
  KEY_DOWN: 114,
  KEY_LEFT: 165,
  KEY_RIGHT: 163,
  KEY_PLAY: 164,
  KEY_LISTEN: 172,
  LED_MS: 80,
  MAX_QUEUED_TRACKS: 100,
  MIN_LISTEN_DURATION_MS: 1000,
  MIN_RATING: 80,
  MIN_RATING_BEST: 100,
  MQTT_PASSTHROUGH_INTENTS: [],
  MQTT_IP: "",
  PATH_ITUNES: "",
  PATH_DATABASE: "./itunes.sqlite3",
  PATH_MUSIC: "/home/pi/music",
  PATH_RAMDISK: "/tmp/ramdisk",
  PLAYER: "mopidy" as "mopidy" | "applemusic" | "itunes",
  PLAYLIST_NAME: "voicetunes",
  PREV_TRACK_MS: 15000,
  REC_BIN: "sudo arecord -q -t raw --duration=20 --rate=16000 --format=S16_LE", // `sudo parec --raw --format=s16le --channels=1 --rate=16000`
  RECSTOP_BIN: "sudo killall -q arecord",
  SENTENCE_BLOCKLIST: [] as string[],
  STARTING_YEAR: 1900,
  SUBSTITUTIONS: {
    albums: {},
    artists: {},
    genres: {},
    playlists: {},
    tracks: {},
  },
  URL_MOPIDY: "ws://localhost:6680/mopidy/ws/",
  USE_LED: false,
  VOICE2JSON_BIN: "voice2json",
  VOICE2JSON_PROFILE: "/home/pi/.config/voice2json",
  WALKIE_TALKIE: true,
  WAV_BEEP: "",
  WAV_ERROR: "",
  WAV_OK: "",
  WAV_UNRECOGNIZED: "",
};

// To override defaults, create a config.local.json with matching keys
const config = Object.assign(
  {},
  configDefaults,
  readJson(`${__dirname}/../config.local.json`),
  readJson(`${__dirname}/../substitutions.local.json`)
) as typeof configDefaults;

export default {
  ...config,
  "VOICE2JSON": `${config["VOICE2JSON_BIN"]} --profile ${config["VOICE2JSON_PROFILE"]}`
};
