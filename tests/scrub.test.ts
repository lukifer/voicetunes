import {
  scrubAlbumName,
  scrubArtistName,
  scrubTrackName,
} from "../src/scrub";

test("track names are scrubbed", async () => {
  const tracks = {
    "Amazing Grace [feat. Pat Dimitri]": "amazing grace",
    "Industry 1-8-7 [feat. Weerd Science]": "industry one eight seven",
    "executive_command.html [feat. Mikey]": "executive command html",
    "Bound & Gagged": "bound and gagged",
    "Part IX": "part nine",
  }
  Object.entries(tracks).forEach(([orig, scrubbed]) => {
    expect(scrubTrackName(orig)).toEqual(scrubbed);
  })
});

test("artist names are scrubbed", async () => {
  const artists = {
    "Angels and Filth™": "angels and filth",
    "Crosby, Stills, Nash & Young": "crosby stills nash and young",
    "Kill_mR_DJ": "kill mr dj",
  };
  Object.entries(artists).forEach(([orig, scrubbed]) => {
    expect(scrubArtistName(orig)).toEqual(scrubbed);
  })
});

test("album names are scrubbed", async () => {
  const albums = {
    "Guardian Angel (EP)": "guardian angel",
    "Hackers Vol. 3 Soundtrack": "hackers volume three soundtrack",
    "Hamilton: Original Broadway Cast Recording": "hamilton",
    "Interstellar: Original Motion Picture Soundtrack [Deluxe Version]": "interstellar soundtrack",
    // "Inception (Music From The Motion Picture)": "inception",
    "Peace Sells... But Who's Buying?": "peace sells but whos buying",
  };
  Object.entries(albums).forEach(([orig, scrubbed]) => {
    expect(scrubAlbumName(orig)).toEqual(scrubbed);
  })
})
