import fs   from "fs";
import path from "path";

import { Config, PlayerType } from "./types";

export const emptyKeys = {
  KEY_UP: "",
  KEY_DOWN: "",
  KEY_LEFT: "",
  KEY_RIGHT: "",
  KEY_PLAY: "",
  KEY_LISTEN: "",
} as const

let defaultConfig: Config = {
  ALIAS: {},
  ALLOW_SHUTDOWN: false,
  AUDIO_DEVICE_IN: "ac108",
  AUDIO_DEVICE_OUT: "dmixer",
  BT_BUTTON_NAME: "Tunai Button",
  CLICK_DOUBLE: emptyKeys, // current unused
  CLICK_TRIPLE: emptyKeys, // current unused
  EXCLUDE_GENRES: null,
  FILE_EXTENSIONS: ["mp3", "m4a", "wav", "aiff", "flac", "alac"],
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
  MOPIDY_URL: "ws://localhost:6680/mopidy/ws/",
  PATH_DATABASE: "./itunes.sqlite3",
  PATH_MUSIC: "/home/pi/music",
  PATH_RAMDISK: "/tmp/ramdisk",
  PLAYER: "mopidy" as PlayerType,
  PLAYLIST_NAME: "voicetunes",
  PREV_TRACK_MS: 15000,
  REC_BIN: "sudo arecord -q -t raw --duration=20 --rate=16000 --format=S16_LE",
  // REC_BIN: `sudo parec --raw --format=s16le --channels=1 --rate=16000`
  RECSTOP_BIN: "sudo killall -q arecord",
  STARTING_YEAR: 1900,
  USE_LED: false,
  VOICE2JSON_CMD: "",
  VOICE2JSON_BIN: "voice2json",
  VOICE2JSON_PROFILE: "/home/pi/.config/voice2json",
};

let config: Config = null;

export async function loadConfig(): Promise<Config> {
  const tsConfigPath = path.resolve(__dirname, "../config.local.ts");
  const jsonConfigPath = path.resolve(__dirname, "../config.local.json");

  if (config) return config;

  let localConfig: Partial<Config> = null;
  if (fs.existsSync(tsConfigPath)) {
    localConfig = (await import(tsConfigPath)).default;
  }
  else if (fs.existsSync(jsonConfigPath)) {
    localConfig = await import(jsonConfigPath);
  }
  // else {
  //   // throw new Error("No configuration found!");
  // }

  if (localConfig) {
    config = {
      ...defaultConfig,
      ...(localConfig ?? {}),
    }
  }

  return config;
}
