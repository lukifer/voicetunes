import * as fs from "fs";

import { dbRaw } from "../src/db";

import {
  queryRandomAlbumByArtist,
  queryTrack,
  queryTracksByAlbum,
  queryTracksByArtist,
  queryTracksByArtistAlbumNumber,
  queryTracksByGenre,
  queryTracksByPlaylist,
  queryTracksByYear,
  trackLocations,
  Tracks,
} from "../src/query";

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
  artistPowerGlove,
  bestOfAllegaeon,
  bestOfSixtyFive,
  bestProgRockAughtThree,
  fiftiesSwing,
  genreBlues,
  junoReactorAlbum,
  latestAlbumByNirvana,
  progRockSeventySix,
  queueAhHa,
  startPlaylistDanse,
  seventhAlbumByAllegaeon,
} from "./mockIntents";

import {
  MessagePlayAlbum,
  MessagePlayArtist,
  MessagePlayArtistAlbumByNumber,
  MessagePlayGenre,
  MessagePlayRandomAlbumByArtist,
  MessagePlayTrack,
  MessagePlayYear,
  MessageStartPlaylist,
} from "../src/types";

const testDbSql = fs.readFileSync(`${__dirname}/testDb.sql`, {encoding: "utf-8"})

function expectTrackLocations(tracks: Tracks | null, locations: string[]) {
  expect(trackLocations(tracks)).toEqual(locations);
}

jest.mock("../src/config", () => {
  const originalModule = jest.requireActual("../src/config");
  return {
    ...originalModule.default,
    PATH_DATABASE: "",
  };
});

beforeEach(async () => {
  const sqls = testDbSql.split("\n\n");
  for (const sql of sqls) await dbRaw(sql);
  global.Math.random = () => 0.38;
});

test("handles a 'queue by artist' intent", async () => {
  const tracks = await queryTracksByArtist(queueAhHa as MessagePlayArtist, 80);
  expectTrackLocations(tracks, [`Ah%20Ha/Unknown%20Album/Take%20On%20Me.mp3`]);
});

test("handles a 'play best by artist' intent", async () => {
  const tracks = await queryTracksByArtist(bestOfAllegaeon as MessagePlayArtist, 100);
  expect(trackLocations(tracks).includes(allegaeonConcertoEp[0])).toBeTruthy();
  expect(trackLocations(tracks).includes(allegaeonConcertoEp[1])).toBeFalsy();
});

test("handles a 'play nth album by artist' intent", async () => {
  const tracks = await queryTracksByArtistAlbumNumber(seventhAlbumByAllegaeon as MessagePlayArtistAlbumByNumber);
  expectTrackLocations(tracks, allegaeonConcertoEp);
});

test("handles a 'play latest album by artist' intent", async () => {
  const tracks = await queryTracksByArtistAlbumNumber(latestAlbumByNirvana as MessagePlayArtistAlbumByNumber);
  expectTrackLocations(
    tracks.slice(0, 1),
    [ `Nirvana/Unplugged%20In%20New%20York/01%20About%20A%20Girl.mp3`]
  );
});

test("handles a 'play random album by artist' intent", async () => {
  const tracks = await queryRandomAlbumByArtist(junoReactorAlbum as MessagePlayRandomAlbumByArtist);
  const testFiles = [
    `01%20Conga%20Fury.mp3`,
    `02%20Magnetic%20(Robert%20Liener%20Remix).mp3`,
    `03%20Feel%20The%20Universe%20(Kox%20Box%20Remix).mp3`,
  ].map(mp3 => `Juno%20Reactor/Conga%20Fury%20(EP)/${mp3}`);
  expectTrackLocations(tracks, testFiles);
});

test("parses a 'play album' intent", async () => {
  const tracks = await queryTracksByAlbum(albumBannedOnVulcan as MessagePlayAlbum);
  expectTrackLocations(tracks, bannedOnVulcan);
});

test("handles a 'start playlist' intent", async () => {
  const tracks = await queryTracksByPlaylist(startPlaylistDanse as MessageStartPlaylist);
  expectTrackLocations(tracks, danseFiles);
});

test("handles a 'play track' intent", async () => {
  const intents = [
    acesHigh,
    acesHighBySteveAndSeagulls,
    acesHighByIronMaiden,
  ] as MessagePlayTrack[];
  const testFiles = {
    "":                   "Iron%20Maiden/Powerslave/01%20Aces%20High.mp3",
    "iron maiden":        "Iron%20Maiden/Powerslave/01%20Aces%20High.mp3",
    "steve and seagulls": "Steve%20'n'%20Seagulls/Brothers%20In%20Farms/01%20Aces%20High.mp3",
  }
  Object.entries(testFiles).forEach(async ([artist, file], idx) => {
    const tracks = await queryTrack(intents.find(x =>
      x.text === `play track aces high${artist ? ` by ${artist}` : ""}`)
    );
    expectTrackLocations(tracks, idx === 0 ? Object.values(testFiles).slice(1) : [file])
  })
});

test("handles a 'play genre' intent", async () => {
  const tracks = await queryTracksByGenre(genreBlues as MessagePlayGenre, 80);
  expectTrackLocations(tracks, [`The%20Blues%20Brothers/The%20Definitive%20Collection/18%20Shake%20Your%20Tailfeather%20[feat.%20Ray%20Charles].mp3`]);
});

test("handles a 'play some progressive rock from nineteen seventy six' intent", async () => {
  const tracks = await queryTracksByGenre(progRockSeventySix as MessagePlayGenre, 80);
  expectTrackLocations(tracks, [`Rush/2112/02%20A%20Passage%20To%20Bangkok.mp3`]);
});

test("handles a 'play the best progressive rock from two thousand and three' intent", async () => {
  const tracks = await queryTracksByGenre(bestProgRockAughtThree as MessagePlayGenre, 80);
  expectTrackLocations(tracks, [
    `The%20Mars%20Volta/Unknown%20Album/This%20Apparatus%20Must%20Be%20Unearthed.mp3`,
    `The%20Mars%20Volta/Unknown%20Album/Inertiatic%20ESP.mp3`
  ]);
});

test("handles a 'play some swing from the fifties' intent", async () => {
  const tracks = await queryTracksByGenre(fiftiesSwing as MessagePlayGenre, 80);
  expectTrackLocations(tracks, [`Dean%20Martin/Unknown%20Album/How%20D'ya%20Like%20Your%20Eggs.mp3`]);
});

test("handles a 'play best of nineteen sixty five' intent", async () => {
  const tracks = await queryTracksByYear(bestOfSixtyFive as MessagePlayYear, 100);
  expectTrackLocations(tracks, [`Compilations/Pulp%20Fiction/13%20Flowers%20On%20The%20Wall.mp3`]);
});

test("matches an artist with different spelling but the same pronounciation", async () => {
  const tracks = await queryTracksByArtist(artistPowerGlove as MessagePlayArtist, 80);
  expectTrackLocations(tracks, [
    `Power%20Glove/EP%20I/01%20Streets%20of%202043.mp3`,
    `Powerglove/Saturday%20Morning%20Apocalypse/06%20Transformers.mp3`,
  ]);
});
