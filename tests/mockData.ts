// import Mopidy from "mopidy";

// FIXME:
// ReferenceError: Cannot access 'mockData_1' before initialization

// export const mockMopidy = () => {
//   tracklist: {
//     add:     jest.fn(),
//     clear:   jest.fn(),
//     shuffle: jest.fn(),
//   },
//   playback: {
//     play: jest.fn(),
//   },
//   on: jest.fn(),
// } as any as Partial<Mopidy>;

export const allegaeonConcertoEp = [
  `01%20Concerto%20in%20Dm.mp3`,
  `02%20In%20Flanders%20Fields.mp3`,
].map(mp3 => `Allegaeon/Concerto%20in%20Dm/${mp3}`);

export const danseFiles = [
  `Kent/Unknown%20Album/Vy%20Ett%20Luftslott.mp3`,
  `Roxette/Unknown%20Album/The%20Look.mp3`,
  `Scissor%20Sisters/Night%20Work/01%20Night%20Work.mp3`,
  `Ray%20Charles/Unknown%20Album/Shake%20Your%20Tailfeathers.mp3`,
  `Party%20Ben/Unknown%20Album/Callin'%20Up%20the%20Pieces%20%5BLyrics%20Born%20vs.%20Average%20White%20Band%5D.mp3`,
  `Morris%20Day%20and%20The%20Time/Unknown%20Album/Jungle%20Love.mp3`,
  `Monae/Unknown%20Album/Tightrope%20%5Bfeat.%20Leftfoot%5D.mp3`,
  `Jamiroquai/Unknown%20Album/Canned%20Heat.mp3`,
  `Rejoice/Unknown%20Album/Peace%20Love%20&%20Harmony.mp3`,
  `C+C%20Music%20Factory/Unknown%20Album/Everybody%20Dance%20Now.mp3`,
  `KWS/Unknown%20Album/Please%20Don't%20Go.mp3`,
];
