import { AppleMusicPlayer }          from './players/applemusic'
import { MopidyPlayer, MopidyTrack } from './players/mopidy'
import { MpdPlayer }                 from './players/mpd'

import { PlayerType } from "./types";

export interface Player {
  type: PlayerType;
  start: () => Promise<void>;
  getVolume: () => Promise<number>;
  setVolume: (vol: number) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayback: () => Promise<void>;
  previous: () => Promise<void>;
  next: () => Promise<void>;
  seek: (vol: number) => Promise<void>;
  clearTracks: () => Promise<void>;
  currentTrackIndex: () => Promise<number>;
  getTimePosition: () => Promise<number>;
  addTracks: (uris: string[], at_position?: number) => Promise<void>;
  tracklistLength: () => Promise<number>;
  getTracks: () => Promise<MopidyTrack[]>;
};

export function getPlayer(type: PlayerType) {
  if (type === "mopidy")
    return new MopidyPlayer();
  else if (type === "mpd")
    return new MpdPlayer();
  else if (["applemusic", "itunes"].includes(type))
    return new AppleMusicPlayer(type);
}
