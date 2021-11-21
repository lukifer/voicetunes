import Mopidy from "mopidy";
import { textToIntent } from "../intent";
import { MessageBase }  from "../types";

import { mockMopidy } from "./mockData";

import {
  acesHigh,
  acesHighByIronMaiden,
  acesHighBySteveAndSeagulls,
  bestOfAllegaeon,
  genreBlues,
  latestAlbumByNirvana,
  previousTrack,
  queueAhHa,
  shufflePlaylistDanse,
  startPlaylistDanse,
  seventhAlbumByAllegaeon,
} from "./mockIntents";

jest.mock("mopidy", () => {
  (global as any).mockMopidy = { on: jest.fn() } as any as Mopidy;
  return jest.fn().mockImplementation(() => (global as any).mockMopidy);
});

async function getIntent(msg: MessageBase) {
  const { text } = msg;
  const result = await textToIntent(text);
  const { recognize_seconds, ...intent } = result;
  return intent;
}

test("parses 'queue something by ah ha'", async () => {
  expect(await getIntent(queueAhHa)).toMatchObject(queueAhHa);
});

test("parses 'play track aces high'", async () => {
  expect(await getIntent(acesHigh)).toMatchObject(acesHigh);
});

test("parses 'play track aces high by iron maiden'", async () => {
  expect(await getIntent(acesHighByIronMaiden)).toMatchObject(acesHighByIronMaiden);
});

test("parses 'play track aces high by steve and seagulls'", async () => {
  expect(await getIntent(acesHighBySteveAndSeagulls)).toMatchObject(acesHighBySteveAndSeagulls);
});

test("parses 'play latest album by nirvana'", async () => {
  expect(await getIntent(latestAlbumByNirvana)).toMatchObject(latestAlbumByNirvana);
});

test("parses 'play seventh album by allegaeon'", async () => {
  expect(await getIntent(seventhAlbumByAllegaeon)).toMatchObject(seventhAlbumByAllegaeon);
});

test("parses 'play the best of allegaeon'", async () => {
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

test("parses 'previous track'", async () => {
  expect(await getIntent(previousTrack)).toMatchObject(previousTrack);
});
