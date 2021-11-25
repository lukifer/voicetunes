import * as fs from "fs";
import Mopidy  from "mopidy";

import { dbRaw }                from "../db";
import { doIntent, playTracks } from "../intent";
import { wait }                 from "../utils";

import {
  allegaeonConcertoEp,
  danseFiles,
} from "./mockData";

import {
  acesHigh,
  acesHighByIronMaiden,
  acesHighBySteveAndSeagulls,
  bestOfAllegaeon,
  fiftiesSwing,
  genreBlues,
  latestAlbumByNirvana,
  previousTrack,
  progRockSeventySix,
  queueAhHa,
  shufflePlaylistDanse,
  startPlaylistDanse,
  seventhAlbumByAllegaeon,
} from "./mockIntents";

const basePath = "file:///home/pi/music/";
const testDbSql = fs.readFileSync(`${__dirname}/testDb.sql`, {encoding: "utf-8"})

jest.mock("../config", () => {
  const originalModule = jest.requireActual("../config");
  return {
    ...originalModule.default,
    PATH_DATABASE: "",
  };
});

jest.mock("mopidy", () => {
  let seekPos = 0;
  (global as any).mockMopidy = {
    tracklist: {
      add:     jest.fn(),
      clear:   jest.fn(),
      index:   jest.fn(() => 0),
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

beforeEach(async () => {
  const sqls = testDbSql.split("\n\n");
  for (const sql of sqls) await dbRaw(sql);
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

test("handles a 'queue by artist' intent", async () => {
  await doIntent(queueAhHa);
  const {mockMopidy} = (global as any);
  expect(mockMopidy.tracklist.clear).not.toHaveBeenCalled();
  expectTracksAdded([`${basePath}Ah%20Ha/Unknown%20Album/Take%20On%20Me.mp3`]);
});

test("handles a 'play best by artist' intent", async () => {
  await doIntent(bestOfAllegaeon);
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

test("handles a 'play nth album by artist' intent", async () => {
  await doIntent(seventhAlbumByAllegaeon);
  const testFiles = allegaeonConcertoEp.map(mp3 => `${basePath}${mp3}`);
  await wait(300);
  for (const file of testFiles) expectTracksAdded([ file ]);
});

test("handles a 'play latest album by artist' intent", async () => {
  await doIntent(latestAlbumByNirvana);
  expectTracksAdded([ `${basePath}Nirvana/Unplugged%20In%20New%20York/01%20About%20A%20Girl.mp3` ]);
});

test("handles a 'play random album by artist' intent", async () => {
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

test("handles a 'start playlist' intent", async () => {
  await doIntent(startPlaylistDanse);
  const testFiles = danseFiles.map(mp3 => `${basePath}${mp3}`);
  await wait(300);
  expectTracksAdded([testFiles[0]]);
  expectTracksAdded(testFiles.slice(1, 6));
  expectTracksAdded(testFiles.slice(6, 11));
});

test("handles a 'shuffle playlist' intent", async () => {
  const {mockMopidy} = (global as any);
  await doIntent(shufflePlaylistDanse);
  const testFiles = danseFiles.map(mp3 => `${basePath}${mp3}`);
  await wait(300);
  const {tracklist} = mockMopidy;
  expect(tracklist.add).toHaveBeenCalled();
  expect(tracklist.add).not.toHaveBeenCalledWith({ uris: testFiles.slice(1, 6) });
  expect(tracklist.add).not.toHaveBeenCalledWith({ uris: testFiles.slice(6, 11) });
});

test("handles a 'play track' intent", async () => {
  const intents = [
    acesHigh,
    acesHighBySteveAndSeagulls,
    acesHighByIronMaiden,
  ];
  const testFiles = {
    "":                   "Iron%20Maiden/Powerslave/01%20Aces%20High.mp3",
    "iron maiden":        "Iron%20Maiden/Powerslave/01%20Aces%20High.mp3",
    "steve and seagulls": "Steve%20'n'%20Seagulls/Brothers%20In%20Farms/01%20Aces%20High.mp3",
  }
  Object.entries(testFiles).forEach(async ([artist, file]) => {
    await doIntent(intents.find(x =>
      x.text === `play track aces high${artist ? ` by ${artist}` : ""}`)
    );
    expectTracksAdded([`${basePath}${file}`]);
  })
});

test("handles a 'play genre' intent", async () => {
  await doIntent(genreBlues);
  expectTracksAdded([`${basePath}Ray%20Charles/Unknown%20Album/Shake%20Your%20Tailfeathers.mp3`]);
});

test("handles a 'play some progressive rock from nineteen seventy six' intent", async () => {
  await doIntent(progRockSeventySix);
  expectTracksAdded([`${basePath}Rush/2112/02%20A%20Passage%20To%20Bangkok.mp3`]);
});

test("handles a 'play some swing from the fifties' intent", async () => {
  await doIntent(fiftiesSwing);
  expectTracksAdded([`${basePath}Dean%20Martin/Unknown%20Album/How%20D'ya%20Like%20Your%20Eggs.mp3`]);
});

test("previous track returns to start of track after a cutoff", async () => {
  await playTracks(["foo.mp3", "bar.mp3"]);
  const {mockMopidy} = (global as any);
  const {playback, tracklist} = mockMopidy;

  // 1st track, pre-cutoff: seek to start
  await playback.seek(5 * 1000);
  expect(await playback.getTimePosition()).toEqual(5 * 1000);
  mockMopidy.playback.seek.mockClear();
  await doIntent(previousTrack);
  expect(playback.seek).toHaveBeenCalledWith([0]);

  // 2nd track, pre-cutoff: go to previous
  tracklist.index = jest.fn().mockImplementation(() => 1);
  await playback.seek(5 * 1000);
  await doIntent(previousTrack);
  expect(playback.previous).toHaveBeenCalled();

  // 2nd track, post-cutoff: seek to start
  await playback.seek(60 * 1000);
  await doIntent(previousTrack);
  expect(playback.seek).toHaveBeenCalledWith([0]);
});
