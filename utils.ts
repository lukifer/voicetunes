export const rnd = (ceil: number) => Math.floor(ceil * Math.random());
export const between = (min: number, val: number, max: number) => Math.min(max, Math.max(min, val));
export const wait = (ms: number) => new Promise((resolve: () => void) => setTimeout(resolve, ms));
export const arrayWrap = (x: unknown) => Array.isArray(x) ? x : [ x ];
export const now = () => new Date().getTime();