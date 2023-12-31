export type NumberMap = Record<string, number>;
export type StringMap = Record<string, string>;
export type StringTuple = [string, string];
export type StringReplaceTuple = [string | RegExp, string];

export type SqlPlaylist = {
  name: string;
  playlist_id: number;
}

export type SqlTrack = {
  album_artist: string;
  album: string;
  artist: string;
  compilation: boolean;
  disc_number: number;
  genre: string;
  kind: string;
  location: string;
  name: string;
  normalization: number;
  persistent_id: string;
  rating: number;
  track_count: number;
  track_id: number;
  year: number;
}

export type VoxSentence = {
  sentence: string;
}
export type VoxAlbum = VoxSentence & {
  album: string;
  artist: string | null;
}
export type VoxArtist = VoxSentence & {
  artist: string;
}
export type VoxGenre = VoxSentence & {
  genre: string;
}
export type VoxPlaylist = VoxSentence & {
  playlist_id: number;
}
export type VoxTrack = VoxSentence & {
  track_id: number;
}

export interface iTunesAlbumTrack {
  Name:            string;
  Artist?:         string | null;
  Album?:          string | null;
  "Album Artist"?: string;
  Location:        string | undefined;
  "Disc Number"?:  number | null;
  "Track Number"?: number | null;
  "Year"?:         number | null;
}

export interface iTunesAlbum {
  Name:     string;
  Artist:   string;
  Location: string;
  Tracks?:  iTunesAlbumTrack[] | null;
}

export interface iTunesArtist {
  Name:          string;
  "Track Count": number;
  "Play Count":  number;
}

export interface iTunesTrack extends iTunesAlbumTrack {
  "Track ID":               number;
  Size:                     number;
  "Total Time":             number;
  "Disc Count"?:            number | null;
  "Track Count"?:           number | null;
  "Date Modified"?:         string | null;
  "Date Added"?:            string | null;
  "Play Count"?:            number | null;
  "Release Date"?:          string | null;
  "Artwork Count"?:         number | null;
  Season?:                  number | null;
  "Episode Order"?:         number | null;
  "Persistent ID":          string;
  "Track Type":             string;
  Purchased?:               string | null;
  "TV Show"?:               string | null;
  "Has Video"?:             string | null;
  Genre?:                   string | null;
  Kind:                     string;
  "Sort Name"?:             string | null;
  "Sort Album"?:            string | null;
  "Sort Artist"?:           string | null;
  "Content Rating"?:        string | null;
  Series?:                  string | null;
  Episode?:                 string | null;
  "Bit Rate"?:              number | null;
  "Sample Rate"?:           number | null;
  Protected?:               string | null;
  "File Folder Count"?:     number | null;
  "Library Folder Count"?:  number | null;
  Composer?:                string | null;
  "Sort Album Artist"?:     string | null;
  Explicit?:                string | null;
  Movie?:                   string | null;
  "Skip Count"?:            number | null;
  "Skip Date"?:             string | null;
  Rating?:                  number | null;
  "Rating Computed"?:       string | null;
  "Album Rating"?:          number | null;
  "Album Rating Computed"?: string | null;
  "Play Date"?:             number | null;
  "Play Date UTC"?:         string | null;
  "Sort Series"?:           string | null;
  Compilation?:             string | null;
  Comments?:                string | null;
  Clean?:                   string | null;
  "Music Video"?:           string | null;
  Grouping?:                string | null;
  Work?:                    string | null;
  Disabled?:                string | null;
  "Start Time"?:            number | null;
  "Stop Time"?:             number | null;
  "Sort Composer"?:         string | null;
  BPM?:                     number | null;
  "Volume Adjustment"?:     number | null;
  "Part Of Gapless Album"?: string | null;
}

export interface iTunesPlaylist {
  Master?:                  string | null;
  "Playlist ID":            number;
  "Playlist Persistent ID": string;
  "All Items":              string;
  Visible?:                 string | null;
  Name:                     string;
  Tracks?:                  (iTunesTrack | null)[] | null;
  "Distinguished Kind"?:    number | null;
  "Smart Info"?:            string | null;
  "Smart Criteria"?:        string | null;
  Folder?:                  string | null;
  "Parent Persistent ID"?:  string | null;
}

export interface iTunesSubstitutions {
  iTunesPath?: string;
  words?:      Record<string, string>;
  albums:      Record<string, string>;
  artists:     Record<string, string>;
  genres:      Record<string, string>;
  playlists:   Record<string, string>;
  tracks:      Record<string, string>;
}

export type Artist         = string;
export type ArtistAndAlbum = string;

export type ArtistSentence   = string;
export type AlbumSentence    = string;
export type GenreSentence    = string;
export type PlaylistSentence = string;
export type TrackSentence    = string;

export type ArtistMap         = Record<ArtistSentence,   Artist >;
export type ArtistAlbumsMap   = Record<ArtistSentence,   Album[]>;
export type ArtistTracksMap   = Record<ArtistSentence,   Track[]>;
export type AlbumsMap         = Record<AlbumSentence,    Album[]>;
export type PlaylistTracksMap = Record<PlaylistSentence, Track[]>;
export type TracksMap         = Record<TrackSentence,    Track[]>;

export type Track = {
  name:         string;
  artist:       Artist;
  album:        string;
  albumArtist?: Artist;
  file:         string;
  number?:      number;
  disc?:        number;
  year?:        number;
};

export type Album = {
  name:   string;
  artist: Artist;
  path:   string;
  tracks: Track[];
  year?:  number;
};

export type iTunesEntity = iTunesAlbum | iTunesArtist | iTunesPlaylist | iTunesTrack;
export type EntityFilterType = "albums" | "artists" | "genres" | "playlists" | "tracks";
export type EntityFilter = Required<Record<EntityFilterType, string[]>>

export type LedPixel = [number, number, number];

export type PlayerType = "mopidy" | "mpd" | "applemusic" | "itunes" | "mqtt";

export type PlayStateCache = {
  index: number;
  playbackPosition: number;
  tracks: string[];
};

export interface PlayOptions {
  shuffle?: boolean;
  queue?: boolean;
  seekMs?: number;
  jumpTo?: number;
}

export interface MessageSlots {
  album?:          string;
  albumnum?:       string;
  artist?:         string;
  direction?:      "down" | "up";
  genre?:          string;
  playaction?:     "play" | "queue";
  playlist?:       string;
  playlistaction?: string;
  track?:          string;
  tracknum?:       number;
  tracknumword?:   string;
  volume?:         number;
}

export type Message = MessagePlayArtist
                    | MessagePlayArtistAlbumByNumber
                    | MessagePlayRandomAlbumByArtist
                    | MessagePlayAlbum
                    | MessagePlayGenre
                    | MessagePlayTrack
                    | MessagePlayYear
                    | MessageStartPlaylist
                    | MessageJumpToTrack
                    | MessageMusicVolumeSet
                    | MessageMusicVolumeChange
                    | MessageMisc
                    ;

export type MessageIntent =
  "PlayArtistBest"
| "PlayArtist"
| "PlayRandomAlbumByArtist"
| "PlayArtistAlbumByNumber"
| "PlayAlbum"
| "PlayGenre"
| "PlayGenreBest"
| "PlayYear"
| "PlayYearBest"
| "StartPlaylist"
| "PlayTrack"
| "JumpToTrack"
| "MusicVolumeSet"
| "MusicVolumeChange"
| "Alias"
| "RestoreTracklist"
| "SaveTracklist"
| "PreviousTrack"
| "Resume"
| "Stop"
| "WhatIsTime"
| "WhatIsPlaying"
| "RestartMopidy"
| "Nevermind"
| "Restart"
| "Shutdown"
;

export interface MessageBase {
  text: string;
  intent: {
    name: MessageIntent,
  }
  slots: MessageSlots;
  recognize_seconds?: number;
}

export interface MessagePlayArtist extends MessageBase {
  intentName: "PlayArtist" | "PlayArtistBest";
  slots: {
    artist: string;
    playaction: "play" | "queue",
  }
}

export interface MessagePlayRandomAlbumByArtist extends MessageBase {
  intentName: "PlayRandomAlbumByArtist";
  slots: {
    artist: string;
    playaction: "play" | "queue",
  }
}

export interface MessagePlayArtistAlbumByNumber extends MessageBase {
  intentName: "PlayArtistAlbumByNumber";
  slots: {
    albumnum: string; // "seventh", not 7
    artist: string;
    playaction: "play" | "queue",
  }
}

export interface MessagePlayAlbum extends MessageBase {
  intentName: "PlayAlbum";
  slots: {
    album: string;
    playaction: "play" | "queue",
    tracknumword?: string;
    tracknum?: number;
  }
}

export interface MessageStartPlaylist extends MessageBase {
  intentName: "StartPlaylist";
  slots: {
    playlist: string;
    playlistaction: "start" | "play" | "shuffle" | "queue";
  }
}

export interface MessagePlayTrack extends MessageBase {
  intentName: "PlayTrack";
  slots: {
    track: string;
    playaction: "play" | "queue";
  }
}

export interface MessagePlayYear extends MessageBase {
  intentName: "PlayYear" | "PlayYearBest";
  slots: {
    playaction: "play" | "queue";
    year?: string;
    decade?: string;
  }
}

export interface MessagePlayGenre extends MessageBase {
  intentName: "PlayGenre" | "PlayGenreBest";
  slots: {
    genre: string;
    playaction: "play" | "queue";
    year?: string;
    decade?: string;
  }
}

export interface MessageJumpToTrack extends MessageBase {
  intentName: "JumpToTrack";
  slots: {
    tracknum?: number;
    tracknumword?: string;
  }
}

export interface MessageMusicVolumeSet extends MessageBase {
  intentName: "MusicVolumeSet";
  slots: {
    volume: number;
  }
}

export interface MessageMusicVolumeChange extends MessageBase {
  intentName: "MusicVolumeChange";
  slots: {
    direction: "up" | "down";
  }
}

export interface MessageMisc extends MessageBase {
  intentName: "Alias"
            | "NextTrack"
            | "PreviousTrack"
            | "Resume"
            | "Stop"
            | "RestoreTracklist"
            | "SaveTracklist"
            | "WhatIsPlaying"
            | "WhatIsTime"
            | "WhatIsPlaying"
            | "RestartMopidy"
            | "Nevermind"
            | "Restart"
            | "Shutdown"
            ;
}

export type VoiceTunesPayload =
  {action: "ChangeVolume", volume: number}
| {action: "SetVolume",  volume: number}
| {action: "NextTrack"}
| {action: "PreviousTrack"}
| {action: "TogglePlayback"}
| {action: "StartListening"}
| {action: "StopListening"}
;

export type MpdStatus = {
  repeat: boolean;
  random: boolean;
  single: boolean;
  consume: boolean;
  partition: string;
  playlist: number;
  playlistlength: number;
  mixrampdb: number;
  state: 'play' | 'stop' | 'pause';
  song: number;
  songid: number;
  time: { elapsed: number; total: number; };
  elapsed: number;
  bitrate: string;
  duration: number;
  audio: {
    sample_rate: number;
    bits: number;
    channels: number;
    sample_rate_short: { value: number; unit: string; },
    original_value: string;
  },
  nextsong: number;
  nextsongid: number;
}

export type MpdTrack = {
  file: string;
  last_modified: string;
  artist: string;
  albumartist: string;
  title: string;
  album: string;
  track: number;
  date: string;
  genre: string;
  composer: string;
  disc: number;
  time: number;
  duration: number;
  pos: number;
  id: number;
}

export type Keys = {
  KEY_UP: number | string;
  KEY_DOWN: number | string;
  KEY_LEFT: number | string;
  KEY_RIGHT: number | string;
  KEY_PLAY: number | string;
  KEY_LISTEN: number | string;
}

export type Server = {
  ADDRESS: string;
  MUSIC_PATH?: string;
  VOICETUNES_PATH?: string;
}

export type Config = Keys & {
  ALIAS: Record<string, string>;
  ALLOW_SHUTDOWN?: boolean;
  AUDIO_DEVICE_IN: string;
  AUDIO_DEVICE_OUT: string;
  BT_BUTTON_NAME: string;
  // BT_BYTE_IS_DOWN: number;
  // BT_BYTE_KEY_CODE: number;
  // BT_USAGE_PAGE: null | number;
  // CLICK_DELAY_MS: number;
  CLICK_DOUBLE?: Partial<Keys>;
  CLICK_TRIPLE?: Partial<Keys>;
  DEFAULT_ACTION?: string;
  DENOISE_BIN?: string;
  DENOISE_SOX?: boolean | number;
  EXCLUDE_GENRES?: null | string[];
  FILE_EXTENSIONS: string[];
  FILTER_DENY?: Record<EntityFilterType, Array<string>>,
  FILTER_ONLY?: Record<EntityFilterType, Array<string>>,
  FLAC_HACK?: boolean;
  LED_MS: number;
  MAX_QUEUED_TRACKS: number;
  MIN_LISTEN_DURATION_MS: number;
  MIN_RATING: number;
  MIN_RATING_BEST: number;
  MOPIDY_URL?: string;
  MQTT_FORWARD_IP?: string;
  MQTT_LISTEN_IP?: string;
  MQTT_PASSTHROUGH_INTENTS?: string[];
  MQTT_PUBLISH_STATUS?: boolean;
  PATH_ITUNES?: string;
  PATH_DATABASE: string;
  PATH_MUSIC: string;
  PATH_RAMDISK?: string;
  PLAYER: PlayerType;
  PLAYLIST_NAME: string;
  PREV_TRACK_MS: number;
  PULL?: Server & {
    PATH_ITUNES?: string;
  };
  PUSH?: Server & {
    VOICE2JSON_PROFILE?: string
  };
  REC_BIN: string;
  RECSTOP_BIN: string;
  SENTENCE_BLOCKLIST?: string[];
  STARTING_YEAR: number;
  SUBSTITUTIONS?: Record<EntityFilterType, Record<string, string>>,
  USE_LED?: boolean;
  VOICE2JSON_CMD: string;
  VOICE2JSON_BIN: string;
  VOICE2JSON_PROFILE: string;
  WALKIE_TALKIE?: boolean;
  WAV?: {
    BEEP?: string;
    ERROR?: string;
    OK?: string;
    UNRECOGNIZED?: string;
  };
}