import Mopidy from "mopidy";
import {doIntent, playTracks} from "../intent";
import {wait}                 from "../utils";
import {MessageBase}          from "../types";

import {
  allegaeonConcertoEp,
  danseFiles,
} from "./mockData";

jest.mock("mopidy", () => {
  let seekPos = 0;
  (global as any).mockMopidy = {
    tracklist: {
      add:     jest.fn(),
      clear:   jest.fn(),
      shuffle: jest.fn(),
    },
    playback: {
      play: jest.fn(),
      seek: jest.fn().mockImplementation((ms: number) => seekPos = ms),
      next: jest.fn(),
      previous: jest.fn(),
      getTimePosition: jest.fn().mockImplementation(() => seekPos),
    },
    on: jest.fn(),
  } as any as Mopidy;
  return jest.fn().mockImplementation(() => (global as any).mockMopidy);
});

function expectTracksAdded(uris: string[]) {
  const {mockMopidy} = (global as any);
  expect(mockMopidy.tracklist.add).toHaveBeenCalledWith({ uris });
}

const basePath = "file:///home/pi/music/";

beforeEach(() => {
  global.Math.random = () => 0.38;
  const {mockMopidy} = (global as any);
  mockMopidy.playback.play.mockClear();
  mockMopidy.tracklist.add.mockClear();
  mockMopidy.tracklist.clear.mockClear();
});

test("plays a track", async () => {
  await playTracks(["foo.mp3"]);
  const {mockMopidy} = (global as any);
  expect(mockMopidy.tracklist.clear).toHaveBeenCalled();
  expectTracksAdded([`${basePath}foo.mp3`])
  expect(mockMopidy.playback.play).toHaveBeenCalled();
});

test("queues a track", async () => {
  await playTracks(["foo.mp3"], { queue: true });
  const {mockMopidy} = (global as any);
  expect(mockMopidy.tracklist.clear).not.toHaveBeenCalled();
  expectTracksAdded([`${basePath}foo.mp3`])
});

test("parses a 'queue by artist' intent", async () => {
  await doIntent({
    text: "queue something by ah ha",
    intent: {name: "PlayArtist"},
    slots: {artist: "ah ha", playaction: "queue"},
  });
  const {mockMopidy} = (global as any);
  expect(mockMopidy.tracklist.clear).not.toHaveBeenCalled();
  expectTracksAdded([`${basePath}Ah%20Ha/Unknown%20Album/Take%20On%20Me.mp3`]);
});

test("parses a 'play best by artist' intent", async () => {
  await doIntent({
    text: "play the best of allegaeon",
    intent: {name: "PlayArtistBest"},
    slots: {artist: "allegaeon", playaction: "play"},
  });
  const {mockMopidy} = (global as any);

  const allTracks = mockMopidy.tracklist.add.mock.calls.reduce(
      (all: string[], calls: {uris: string[]}[]) => ([
      ...all,
      ...calls[0].uris,
    ]), [] as string[]
  );
  const testFiles = allegaeonConcertoEp.map(mp3 => `${basePath}${mp3}`);
  expect(allTracks.includes(testFiles[0])).toBeTruthy();
  expect(allTracks.includes(testFiles[1])).toBeFalsy();
});

test("parses a 'play nth album by artist' intent", async () => {
  await doIntent({
    text: "play seventh album by allegaeon",
    intent: {name: "PlayArtistAlbumByNumber"},
    slots: {artist: "allegaeon", albumnum: "seventh"},
  });
  const testFiles = allegaeonConcertoEp.map(mp3 => `${basePath}${mp3}`);
  await wait(300);
  for (const file of testFiles) expectTracksAdded([ file ]);
});

test("parses a 'play random album by artist' intent", async () => {
  await doIntent({
    text: "play an album by juno reactor",
    intent: {name: "PlayRandomAlbumByArtist"},
    slots: {artist: "juno reactor"},
  });
  const testFiles = [
    `01%20Conga%20Fury.mp3`,
    `02%20Magnetic%20(Robert%20Liener%20Remix).mp3`,
    `03%20Feel%20The%20Universe%20(Kox%20Box%20Remix).mp3`,
  ].map(mp3 => `${basePath}Juno%20Reactor/Conga%20Fury%20(EP)/${mp3}`);
  const [first, ...remainder] = testFiles;
  expectTracksAdded([first]);
  expectTracksAdded(remainder);
});

// test("parses a 'play album' intent when multiple albums are present", async () => {
//   const {mockMopidy} = (global as any);
//   await doIntent({
//     intent: {name: "PlayAlbum"},
//     slots: {album: "dangerous"},
//   });
// })

test("parses a 'play album' intent", async () => {
  await doIntent({
    text: "play album banned on vulcan",
    intent: {name: "PlayAlbum"},
    slots: {album: "banned on vulcan"},
  });
  const testFiles = [
    `01%20Worf's%20Revenge%20(Klingon%20Rap).mp3`,
    `02%20The%20U.S.S.%20Make-Shit-Up.mp3`,
    `03%20The%20Sexy%20Data%20Tango.mp3`,
    `04%20Screw%20the%20Okampa!%20(I%20Wanna%20Go%20Home).mp3`,
  ].map(mp3 => `${basePath}Voltaire/Banned%20on%20Vulcan/${mp3}`);
  const [first, ...remainder] = testFiles;
  expectTracksAdded([first]);
  expectTracksAdded(remainder);
});

test("parses a 'start playlist' intent", async () => {
  await doIntent({
    text: "start playlist danse",
    intent: {name: "StartPlaylist"},
    slots: {playlist: "danse", playlistaction: "start"},
  });
  const testFiles = danseFiles.map(mp3 => `${basePath}${mp3}`);
  await wait(300);
  expectTracksAdded([testFiles[0]]);
  expectTracksAdded(testFiles.slice(1, 6));
  expectTracksAdded(testFiles.slice(6, 11));
});

test("parses a 'shuffle playlist' intent", async () => {
  const {mockMopidy} = (global as any);
  await doIntent({
    text: "shuffle playlist danse",
    intent: {name: "StartPlaylist"},
    slots: {playlist: "danse", playlistaction: "shuffle"},
  });
  const testFiles = danseFiles.map(mp3 => `${basePath}${mp3}`);
  await wait(300);
  const {tracklist} = mockMopidy;
  expect(tracklist.add).toHaveBeenCalled();
  expect(tracklist.add).not.toHaveBeenCalledWith({ uris: testFiles.slice(1, 6) });
  expect(tracklist.add).not.toHaveBeenCalledWith({ uris: testFiles.slice(6, 11) });
});

test("parses a 'play track' intent", async () => {
  const testFiles = {
    "": "Iron%20Maiden/Powerslave/01%20Aces%20High.mp3",
    "steve and seagulls": "Steve%20'n'%20Seagulls/Brothers%20In%20Farms/01%20Aces%20High.mp3",
    "iron maiden": "Iron%20Maiden/Powerslave/01%20Aces%20High.mp3",
  }
  Object.entries(testFiles).forEach(async ([artist, file]) => {
    const track = `aces high${artist ? " by "+artist : ""}`;
    await doIntent({
      text: `play track ${track}`,
      intent: {name: "PlayTrack"},
      slots: {track},
    });
    expectTracksAdded([`${basePath}${file}`]);
  })
});

test("parses a 'play genre' intent", async () => {
  await doIntent({
    text: "play some blues",
    intent: {name: "PlayGenre"},
    slots: {genre: "blues", playlistaction: "play"},
  });
  expectTracksAdded([`${basePath}Ray%20Charles/Unknown%20Album/Shake%20Your%20Tailfeathers.mp3`]);
});

test("previous track returns to start of track after a cutoff", async () => {
  await playTracks(["foo.mp3", "bar.mp3"]);
  const {mockMopidy} = (global as any);
  const {playback} = mockMopidy;

  const prevTrackIntent: MessageBase = {
    text: "previous track",
    intent: {name: "PreviousTrack"},
    slots: {},
  };

  await playback.seek(5 * 1000);
  const pos = await playback.getTimePosition();
  expect(pos).toEqual(5 * 1000);

  await doIntent(prevTrackIntent);
  expect(playback.previous).toHaveBeenCalled();

  await playback.seek(60 * 1000);
  await doIntent(prevTrackIntent);
  expect(playback.seek).toHaveBeenCalledWith(0);
});
