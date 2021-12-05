import { between, ffprobeTags, removeNth } from "../utils";

test("removeNth() returns array without a specific entry", () => {
  const arr = ["a", "b", "c", "d", "e"];
  expect(removeNth(arr, 0)).toEqual(["b", "c", "d", "e"]);
  expect(removeNth(arr, 2)).toEqual(["a", "b", "d", "e"]);
  expect(removeNth(arr, 4)).toEqual(["a", "b", "c", "d"]);
});

test("between() coalesces number within a range", () => {
  const [low, high] = [1, 3];
  expect(between(low, low+1,  high)).toStrictEqual(low+1);
  expect(between(low, low-1,  high)).toStrictEqual(low);
  expect(between(low, high+1, high)).toStrictEqual(high);
});

test("ffprobe gets ID3 tags", async () => {
  const file = "~/Music/iTunes/iTunes\\ Media/Music/Allegaeon/Concerto\\ in\\ Dm/01\\ Concerto\\ in\\ Dm.mp3";
  const id3Tags = await ffprobeTags(file, ["album", "artist", "title", "track"]);
  expect(id3Tags).toEqual({
    "album": "Concerto in Dm",
    "artist": "Allegaeon",
    "title": "Concerto in Dm",
    "track": "1/2",
  });
});
