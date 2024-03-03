// jest.mock("mopidy", () => {
//   global.mockMopidy = { on: jest.fn() };
//   return jest.fn().mockImplementation(() => global.mockMopidy);
// });

jest.mock("mopidy", () => {
  let seekPos = 0;
  global.mockMopidy = {
    tracklist: {
      add:       jest.fn(),
      clear:     jest.fn(),
      index:     jest.fn(() => 0),
      shuffle:   jest.fn(),
      getTracks: jest.fn(() => []),
    },
    playback: {
      play: jest.fn(),
      seek: jest.fn().mockImplementation((ms) => seekPos = ms),
      next: jest.fn(),
      previous: jest.fn(),
      pause: jest.fn(),
      getTimePosition: jest.fn().mockImplementation(() => seekPos),
    },
    on: jest.fn(),
  };
  return jest.fn().mockImplementation(() => global.mockMopidy);
});

jest.mock("rpio", () => ({
  open: jest.fn(),
  read: jest.fn(() => 1),
  write: jest.fn(),
}));

jest.mock("onoff", () => ({
  Gpio: jest.fn().mockImplementation(() => ({
    writeSync: jest.fn(),
    readSync: jest.fn(),
    unexport: jest.fn(),
  })),
}));

jest.mock("./src/kb", () => {
  return {
    start: () => {},
  };
});