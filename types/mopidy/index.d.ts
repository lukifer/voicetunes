declare module "mopidy" {
  type addArgs = {
    uris: string[];
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
      getState: () => Promise<string>
      pause:    () => Promise<void>,
      play:     () => Promise<void>,
      previous: () => Promise<void>,
      next:     () => Promise<void>,
      resume:   () => Promise<void>,
    };
    tracklist: {
      add:     (args: addArgs)  => Promise<void>,
      clear:   ()               => Promise<void>,
      shuffle: (args: number[]) => Promise<void>,
    };
  }

  export = Mopidy;
}
