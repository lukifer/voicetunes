import * as fs from "fs";

import { dbRaw }                      from "../src/db";
import { textToIntent }               from "../src/intent";
import { MessageBase, MessageIntent } from "../src/types";

import {
  acesHigh,
  acesHighByIronMaiden,
  acesHighBySteveAndSeagulls,
  albumBannedOnVulcan,
  albumBannedOnVulcanTrack2,
  bestOfAllegaeon,
  bestOfSixtyFive,
  bestProgRockAughtThree,
  fiftiesSwing,
  genreBlues,
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

const testDbSql = fs.readFileSync(`${__dirname}/testDb.sql`, {encoding: "utf-8"})

jest.mock("../src/config", () => {
  const originalModule = jest.requireActual("../src/config");
  return {
    ...originalModule.default,
    BT_BUTTON_NAME: null,
    PATH_DATABASE: "",
    PLAYER: "mqtt"
  };
});

beforeEach(async () => {
  const sqls = testDbSql.split("\n\n");
  for (const sql of sqls) await dbRaw(sql);
  global.Math.random = () => 0.38;
});

async function getIntent(msg: MessageBase, allowedIntents?: MessageIntent[]) {
  const { text } = msg;
  const result = await textToIntent(text, allowedIntents);
  const { recognize_seconds, ...intent } = result;
  return intent;
}

test.skip("parses 'queue something by ah ha'", async () => {
  expect(await getIntent(queueAhHa)).toMatchObject(queueAhHa);
});

test.skip("parses 'play track aces high'", async () => {
  expect(await getIntent(acesHigh)).toMatchObject(acesHigh);
});

test.skip("parses 'play track aces high by iron maiden'", async () => {
  expect(await getIntent(acesHighByIronMaiden)).toMatchObject(acesHighByIronMaiden);
});

test.skip("parses 'play track aces high by steve and seagulls'", async () => {
  expect(await getIntent(acesHighBySteveAndSeagulls)).toMatchObject(acesHighBySteveAndSeagulls);
});

test("parses 'play latest album by nirvana'", async () => {
  expect(await getIntent(latestAlbumByNirvana)).toMatchObject(latestAlbumByNirvana);
});

test("parses 'play seventh album by allegaeon'", async () => {
  expect(await getIntent(seventhAlbumByAllegaeon)).toMatchObject(seventhAlbumByAllegaeon);
});

test("parses 'play the album banned on vulcan'", async () => {
  expect(await getIntent(albumBannedOnVulcan)).toMatchObject(albumBannedOnVulcan);
});

test.skip("parses 'play the album banned on vulcan and jump to the second track'", async () => {
  expect(await getIntent(albumBannedOnVulcanTrack2)).toMatchObject(albumBannedOnVulcanTrack2);
});

test("parses 'play an album by juno reactor'", async () => {
  // FIXME: why is this misfiring without the intent filter?
  expect(await getIntent(junoReactorAlbum, ["PlayRandomAlbumByArtist"])).toMatchObject(junoReactorAlbum);
});

test.skip("parses 'play the best of allegaeon'", async () => {
  expect(await getIntent(bestOfAllegaeon)).toMatchObject(bestOfAllegaeon);
});

test("parses 'start playlist danse'", async () => {
  expect(await getIntent(startPlaylistDanse)).toMatchObject(startPlaylistDanse);
});

test("parses 'shuffle playlist danse'", async () => {
  expect(await getIntent(shufflePlaylistDanse)).toMatchObject(shufflePlaylistDanse);
});

test("parses 'play some blues'", async () => {
  expect(await getIntent(genreBlues)).toMatchObject(genreBlues);
});

test("parses 'play some progressive rock from nineteen seventy six'", async () => {
  expect(await getIntent(progRockSeventySix)).toMatchObject(progRockSeventySix);
});

test("parses 'play the best progressive rock from two thousand and three'", async () => {
  expect(await getIntent(bestProgRockAughtThree)).toMatchObject(bestProgRockAughtThree);
});

test("parses 'play some swing from the fifties'", async () => {
  expect(await getIntent(fiftiesSwing)).toMatchObject(fiftiesSwing);
});

test("parses 'play best of nineteen sixty five'", async () => {
  expect(await getIntent(bestOfSixtyFive)).toMatchObject(bestOfSixtyFive);
});

test("parses 'previous track'", async () => {
  expect(await getIntent(previousTrack)).toMatchObject(previousTrack);
});

test("parses 'what is playing'", async () => {
  expect(await getIntent(whatIsPlaying)).toMatchObject(whatIsPlaying);
});
