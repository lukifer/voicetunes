declare module "mopidy" {
  type addArgs = {
    uris: string[];
    at_position?: number;
  };

  type MopidyArtist = {
    name: string;
  }

  type MopidyAlbum = {
    name: string;
    artists: MopidyArtist[];
    num_tracks: number,
    num_discs: number,
    date: string,
  }

  type MopidyTrack = {
    uri: string;
    name: string;
    artists: MopidyArtist[];
    album?: MopidyAlbum;
    genre?: string;
    track_no?: number;
    disc_no?: number;
    date?: string;
    length: number;
    comment?: string;
  };

  type constructorArgs = {
    webSocketUrl: string;
  }

  class Mopidy {
    constructor(args: constructorArgs);
    on: (eventType: string, callback: () => Promise<void>) => void;
    mixer: {
      getVolume: ()                 => Promise<number>,
      setVolume: (volume: number[]) => Promise<void>,
    };
    playback: {
      getState:        ()              => Promise<string>
      pause:           ()              => Promise<void>,
      play:            ()              => Promise<void>,
      previous:        ()              => Promise<void>,
      next:            ()              => Promise<void>,
      resume:          ()              => Promise<void>,
      seek:            (pos: number[]) => Promise<void>,
      getTimePosition: ()              => Promise<number>,
    };
    tracklist: {
      add:       (args: addArgs)  => Promise<void>,
      clear:     ()               => Promise<void>,
      shuffle:   (args: number[]) => Promise<void>,
      getTracks: ()               => Promise<MopidyTrack[]>,
      getLength: ()               => Promise<number>,
      index:     ()               => Promise<number>,
    };
  }

  export = Mopidy;
}
