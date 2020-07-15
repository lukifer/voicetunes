import { between } from "../utils";

test('between() coalesces number within a range', () => {
  const [low, high] = [1, 3];
  expect(between(low, low+1,  high)).toStrictEqual(low+1);
  expect(between(low, low-1,  high)).toStrictEqual(low);
  expect(between(low, high+1, high)).toStrictEqual(high);
});
