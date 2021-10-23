import Mopidy from "mopidy";
import { doIntent, playTracks } from "../intent";
import { wait }                 from "../utils";

global.Math.random = () => 0.38;

jest.mock('mopidy', () => {
  (global as any).mockMopidy = {
    tracklist: {
      add:     jest.fn(),
      clear:   jest.fn(),
      shuffle: jest.fn(),
    },
    playback: {
      play: jest.fn(),
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
  const {mockMopidy} = (global as any);
  mockMopidy.playback.play.mockClear();
  mockMopidy.tracklist.add.mockClear();
  mockMopidy.tracklist.clear.mockClear();
});

test('plays a track', async () => {
  await playTracks(["foo.mp3"]);
  const {mockMopidy} = (global as any);
  expect(mockMopidy.tracklist.clear).toHaveBeenCalled();
  expectTracksAdded([`${basePath}foo.mp3`])
  expect(mockMopidy.playback.play).toHaveBeenCalled();
});

test('queues a track', async () => {
  await playTracks(["foo.mp3"], { queue: true });
  const {mockMopidy} = (global as any);
  expect(mockMopidy.tracklist.clear).not.toHaveBeenCalled();
  expectTracksAdded([`${basePath}foo.mp3`])
  expect(mockMopidy.playback.play).not.toHaveBeenCalled();
});

test("parses a 'play by artist' intent", async () => {
  await doIntent({
    text: "play something by ah ha",
    intent: {name: "PlayArtist"},
    slots: {artist: "ah ha"},
  });
  expectTracksAdded([`${basePath}Ah%20Ha/Unknown%20Album/Take%20On%20Me.mp3`]);
});

test("parses a 'play nth album by artist' intent", async () => {
  await doIntent({
    text: "play seventh album by allegaeon",
    intent: {name: "PlayArtistAlbumByNumber"},
    slots: {artist: "allegaeon", albumnum: "seventh"},
  });
  const testFiles = [
    `01%20Concerto%20in%20Dm.mp3`,
    `02%20In%20Flanders%20Fields.mp3`,
  ].map(mp3 => `${basePath}Allegaeon/Concerto%20in%20Dm/${mp3}`);
  testFiles.forEach(file => expectTracksAdded([ file ]));
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
    slots: {playlist: "danse"},
  });
  const testFiles = [
    `Kent/Unknown%20Album/Vy%20Ett%20Luftslott.mp3`,
    `Roxette/Unknown%20Album/The%20Look.mp3`,
    `Scissor%20Sisters/Night%20Work/01%20Night%20Work.mp3`,
    `Ray%20Charles/Unknown%20Album/Shake%20Your%20Tailfeathers.mp3`,
    `Party%20Ben/Unknown%20Album/Callin'%20Up%20the%20Pieces%20%5BLyrics%20Born%20vs.%20Average%20White%20Band%5D.mp3`,
    `Morris%20Day%20and%20The%20Time/Unknown%20Album/Jungle%20Love.mp3`,
    `KWS/Unknown%20Album/Please%20Don't%20Go.mp3`,
    `Rejoice/Unknown%20Album/Peace%20Love%20&%20Harmony.mp3`,
    `Monae/Unknown%20Album/Tightrope%20%5Bfeat.%20Leftfoot%5D.mp3`,
    `C+C%20Music%20Factory/Unknown%20Album/Everybody%20Dance%20Now.mp3`,
    `Jamiroquai/Unknown%20Album/Canned%20Heat.mp3`,
  ].map(mp3 => `${basePath}${mp3}`);
  const [first, ...remainder] = testFiles;
  await wait(300);
  expectTracksAdded([first]);
  expectTracksAdded(remainder.slice(0, 5));
  expectTracksAdded(remainder.slice(5, 10));
});

// test("parses a 'shuffle playlist' intent", async () => {
//   const {mockMopidy} = (global as any);
//   await doIntent({
//     intent: {name: "StartPlaylist"},
//     slots: {playlist: "danse", playaction: "shuffle"},
//   });
//   const testFiles = [
//     `Kent/Unknown%20Album/Vy%20Ett%20Luftslott.mp3`,
//     `Roxette/Unknown%20Album/The%20Look.mp3`,
//     `Scissor%20Sisters/Night%20Work/01%20Night%20Work.mp3`,
//     `Ray%20Charles/Unknown%20Album/Shake%20Your%20Tailfeathers.mp3`,
//     `Party%20Ben/Unknown%20Album/Callin'%20Up%20the%20Pieces%20%5BLyrics%20Born%20vs.%20Average%20White%20Band%5D.mp3`,
//     `Morris%20Day%20and%20The%20Time/Unknown%20Album/Jungle%20Love.mp3`,
//   ].map(mp3 => `${basePath}${mp3}`);
//   const [first, ...remainder] = testFiles;
//   expect(mockMopidy.tracklist.add).toHaveBeenCalledWith({uris: [ first ]});
//   expect(mockMopidy.tracklist.add).toHaveBeenCalledWith({uris: remainder});
// });

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
