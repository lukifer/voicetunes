import { doIntent, playTracks } from "../intent";
import Mopidy from "mopidy";

const mopidyFactory = () => ({
  tracklist: {
    add:     jest.fn(),
    clear:   jest.fn(),
    shuffle: jest.fn(),
  },
  playback: {
    play: jest.fn(),
  },
} as any as Mopidy);

test('plays a track', async () => {
  const mopidy = mopidyFactory();
  await playTracks(mopidy, ["foo.mp3"]);
  expect(mopidy.tracklist.clear).toHaveBeenCalled();
  expect(mopidy.tracklist.add).toHaveBeenCalledWith({uris: [ "file:///home/pi/music/foo.mp3" ]});
  expect(mopidy.playback.play).toHaveBeenCalled();
});

test("parses a 'play by arist' intent", async () => {
  const mopidy = mopidyFactory();
  await doIntent(mopidy, {
    intent: {name: "PlayArtist"},
    slots: {artist: "ah ha"},
  });
  const testFile = "file:///home/pi/music/Ah%20Ha/Unknown%20Album/Take%20On%20Me.mp3";
  expect(mopidy.tracklist.add).toHaveBeenCalledWith({uris: [ testFile ]});
})
