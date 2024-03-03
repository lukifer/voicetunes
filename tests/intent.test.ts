import * as fs from "fs";
import os      from "os";

import { dbRaw }                   from "../src/db";
import { doIntent, playTracks }    from "../src/intent";
import { locationUriToPath, wait } from "../src/utils";

import SFX from "../src/sfx";

import {
  allegaeonConcertoEp,
  bannedOnVulcan,
  danseFiles,
} from "./mockData";

import {
  acesHigh,
  acesHighByIronMaiden,
  acesHighBySteveAndSeagulls,
  albumBannedOnVulcan,
  albumBannedOnVulcanTrack2,
  artistPowerGlove,
  bestOfAllegaeon,
  bestOfSixtyFive,
  bestProgRockAughtThree,
  fiftiesSwing,
  genreBlues,
  jumpToTrackThree,
  junoReactorAlbum,
  latestAlbumByNirvana,
  previousTrack,
  progRockSeventySix,
  queueAhHa,
  shufflePlaylistDanse,
  startPlaylistDanse,
  seventhAlbumByAllegaeon,
  whatIsPlaying,
} from "./mockIntents";

const basePath = "/home/pi/music/";
const basePathUri = `file://${basePath}`;
const itunesPath = `${os.homedir()}/Music/iTunes/iTunes Media/Music/`;
const testDbSql = fs.readFileSync(`${__dirname}/testDb.sql`, {encoding: "utf-8"})

jest.mock("../src/config", () => {
  const originalModule = jest.requireActual("../src/config");
  return {
    ...originalModule.default,
    PATH_DATABASE: "",
    PLAYER: "mopidy"
  };
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
  mockMopidy.playback.next.mockClear();
  mockMopidy.tracklist.add.mockClear();
  mockMopidy.tracklist.clear.mockClear();
});

test("plays a track", async () => {
  await playTracks(["foo.mp3"]);
  const {mockMopidy} = (global as any);
  expect(mockMopidy.tracklist.clear).toHaveBeenCalled();
  expectTracksAdded([`${basePathUri}foo.mp3`])
  expect(mockMopidy.playback.play).toHaveBeenCalled();
});

test("queues a track", async () => {
  await playTracks(["foo.mp3"], { queue: true });
  const {mockMopidy} = (global as any);
  expect(mockMopidy.tracklist.clear).not.toHaveBeenCalled();
  expectTracksAdded([`${basePathUri}foo.mp3`])
});

test("handles a 'queue by artist' intent", async () => {
  await doIntent(queueAhHa);
  const {mockMopidy} = (global as any);
  expect(mockMopidy.tracklist.clear).not.toHaveBeenCalled();
  expectTracksAdded([`${basePathUri}Ah%20Ha/Unknown%20Album/Take%20On%20Me.mp3`]);
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
  const testFiles = allegaeonConcertoEp.map(mp3 => `${basePathUri}${mp3}`);
  expect(allTracks.includes(testFiles[0])).toBeTruthy();
  expect(allTracks.includes(testFiles[1])).toBeFalsy();
});

test("handles a 'play nth album by artist' intent", async () => {
  await doIntent(seventhAlbumByAllegaeon);
  const testFiles = allegaeonConcertoEp.map(mp3 => `${basePathUri}${mp3}`);
  await wait(300);
  for (const file of testFiles) expectTracksAdded([ file ]);
});

test("handles a 'play latest album by artist' intent", async () => {
  await doIntent(latestAlbumByNirvana);
  expectTracksAdded([ `${basePathUri}Nirvana/Unplugged%20In%20New%20York/01%20About%20A%20Girl.mp3` ]);
});

test("handles a 'play random album by artist' intent", async () => {
  await doIntent(junoReactorAlbum);
  const testFiles = [
    `01%20Conga%20Fury.mp3`,
    `02%20Magnetic%20(Robert%20Liener%20Remix).mp3`,
    `03%20Feel%20The%20Universe%20(Kox%20Box%20Remix).mp3`,
  ].map(mp3 => `${basePathUri}Juno%20Reactor/Conga%20Fury%20(EP)/${mp3}`);
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
  const {mockMopidy} = (global as any);
  await doIntent(albumBannedOnVulcan);
  const testFiles = bannedOnVulcan.map(mp3 => `${basePathUri}${mp3}`)
  const [first, ...remainder] = testFiles;
  expectTracksAdded([first]);
  expectTracksAdded(remainder);

  mockMopidy.tracklist.getTracks = jest.fn().mockImplementation(() =>
    testFiles.map(uri => ({uri: locationUriToPath(uri).replace(basePath, itunesPath)}))
  );

  await doIntent(jumpToTrackThree);
  expect(mockMopidy.playback.pause).toHaveBeenCalled();
  expect(mockMopidy.playback.next).toHaveBeenCalledTimes(2);
  expect(mockMopidy.playback.play).toHaveBeenCalled();

  mockMopidy.tracklist.getTracks = jest.fn(() => []);
});

test("parses a 'play album starting at track number' intent", async () => {
  const {mockMopidy} = (global as any);

  const testFiles = bannedOnVulcan.map(mp3 => `${basePathUri}${mp3}`)
  mockMopidy.tracklist.getTracks = jest.fn().mockImplementation(() =>
    testFiles.map(uri => ({uri: locationUriToPath(uri).replace(basePath, itunesPath)}))
  );

  await doIntent(albumBannedOnVulcanTrack2);

  const [first, ...remainder] = testFiles;
  expectTracksAdded([first]);
  expectTracksAdded(remainder);

  expect(mockMopidy.playback.next).toHaveBeenCalledTimes(1);
  expect(mockMopidy.playback.play).toHaveBeenCalled();

  mockMopidy.tracklist.getTracks = jest.fn(() => []);
});

test("handles a 'start playlist' intent", async () => {
  await doIntent(startPlaylistDanse);
  const testFiles = danseFiles.map(mp3 => `${basePathUri}${mp3}`);
  await wait(300);
  expectTracksAdded([testFiles[0]]);
  expectTracksAdded(testFiles.slice(1, 6));
  expectTracksAdded(testFiles.slice(6, 11));
});

test("handles a 'shuffle playlist' intent", async () => {
  const {mockMopidy} = (global as any);
  await doIntent(shufflePlaylistDanse);
  const testFiles = danseFiles.map(mp3 => `${basePathUri}${mp3}`);
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
    expectTracksAdded([`${basePathUri}${file}`]);
  })
});

test("handles a 'play genre' intent", async () => {
  await doIntent(genreBlues);
  expectTracksAdded([`${basePathUri}The%20Blues%20Brothers/The%20Definitive%20Collection/18%20Shake%20Your%20Tailfeather%20[feat.%20Ray%20Charles].mp3`]);
});

test("handles a 'play some progressive rock from nineteen seventy six' intent", async () => {
  await doIntent(progRockSeventySix);
  expectTracksAdded([`${basePathUri}Rush/2112/02%20A%20Passage%20To%20Bangkok.mp3`]);
});

test("handles a 'play the best progressive rock from two thousand and three' intent", async () => {
  await doIntent(bestProgRockAughtThree);
  expectTracksAdded([`${basePathUri}The%20Mars%20Volta/Unknown%20Album/This%20Apparatus%20Must%20Be%20Unearthed.mp3`]);
});

test("handles a 'play some swing from the fifties' intent", async () => {
  await doIntent(fiftiesSwing);
  expectTracksAdded([`${basePathUri}Dean%20Martin/Unknown%20Album/How%20D'ya%20Like%20Your%20Eggs.mp3`]);
});

test("handles a 'play best of nineteen sixty five' intent", async () => {
  await doIntent(bestOfSixtyFive);
  expectTracksAdded([`${basePathUri}Compilations/Pulp%20Fiction/13%20Flowers%20On%20The%20Wall.mp3`]);
});

test("handles a 'what is playing' intent", async () => {
  const {mockMopidy} = (global as any);
  SFX.speak = jest.fn();
  mockMopidy.tracklist.getTracks = jest.fn().mockImplementation(() => [
    { uri: `${itunesPath}${locationUriToPath(danseFiles[3])}` },
  ]);

  await doIntent(whatIsPlaying);
  expect(SFX.speak).toHaveBeenCalledWith("shake your tailfeather by the blues brothers");

  mockMopidy.tracklist.getTracks = jest.fn(() => []);
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

test("matches an artist with different spelling but the same pronounciation", async () => {
  await doIntent(artistPowerGlove);
  expectTracksAdded([`${basePathUri}Powerglove/Saturday%20Morning%20Apocalypse/06%20Transformers.mp3`]);
  expectTracksAdded([`${basePathUri}Power%20Glove/EP%20I/01%20Streets%20of%202043.mp3`]);
});
