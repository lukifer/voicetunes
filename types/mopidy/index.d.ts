declare module "mopidy" {
  type addArgs = {
    uris: string[],
  };
  type Mopidy = {
    playback: {
      play: () => Promise<void>,
    },
    tracklist: {
      add: (args: addArgs) => Promise<void>,
      clear: () => Promise<void>,
      shuffle: (args: number[]) => Promise<void>,
    },
  }

  export = Mopidy;
}
