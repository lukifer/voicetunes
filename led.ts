import Apa102spi from "apa102-spi";
import { Gpio }  from "onoff";

import config           from "./config";
import { between, rnd } from "./utils";
import { LedPixel }     from "./itunes/types";

const { LED_MS } = config;
const rndColor = (base: number, change: number) => between(100, base - change + rnd(change*2), 255);
const Array12 = [...Array(12)];

let timer: NodeJS.Timeout = null;
let pos = 0;
let curColor: LedPixel = [100+rnd(156), 100+rnd(156), 100+rnd(156)];
let ledColors: LedPixel[] = [...Array12].fill([0, 0, 0]);

const led = new Gpio(5, 'out');
export function open() { led.writeSync(1); }
const LedDriver = new Apa102spi(12, 100);

export const startSpinFast   = () => startSpin(0.5 * LED_MS);
export const startSpinFaster = () => startSpin(0.3 * LED_MS);
export const startSpinSlow   = () => startSpin(3.0 * LED_MS);

export function startSpin(speed = LED_MS) {
	if(timer) clearInterval(timer)
	timer = setInterval(() => {
		pos = (pos + 1) % 12;
		curColor = curColor.map(x => rndColor(x, speed < 100 ? 7 : 3)) as LedPixel;
		ledColors[pos] = curColor;
		ledColors.map((cols, n) => {
			const bright = (11 - pos + n) % 12;
			const colorDiff = (10*(11-bright));
			const dimmed = cols.map(x => Math.max(0, x - colorDiff)) as LedPixel;
			LedDriver.setLedColor(n, bright+1, ...dimmed);
		});
		LedDriver.sendLeds();
		LedDriver.sendLeds();
	}, speed);
}

export function stopSpin() {
	if(timer) {
		clearInterval(timer);
		timer = null;
	}
	ledColors.map((_, n) => {
		LedDriver.setLedColor(n, 0, 0, 0, 0);
	});
	LedDriver.sendLeds();
	LedDriver.sendLeds();
}

export function flair(speed = 40) {
	startSpin(speed);
	setTimeout(() => stopSpin(), speed*13);
}

export function volumeChange(oldVol: number, newVol: number) {
// 	console.log(`${oldVol} -> ${newVol}`);
	const up = newVol > oldVol;
	const maxBright = 4;
	let   curBright = 0;
	const volDiff = Math.abs(oldVol - newVol);
	const lightsDiff = Math.round(volDiff / 10);
	const lights = 1 + Number(Math.max(oldVol, newVol) / 10);
	if(timer) clearInterval(timer)
	timer = setInterval(() => {
		if(curBright > (maxBright*2.5)) {
			clearInterval(timer);
			timer = null;
			Array12.map((_, n) => LedDriver.setLedColor(n, 0, 0, 0, 0));
		} else {
			let changed = [];
			Array12.map((_, n) => {
				if (n > lights) {
					LedDriver.setLedColor(n, 0, 0, 0, 0);
				} else {
					const lightIsInFlux = n > (lights - lightsDiff);
					const bright = lightIsInFlux
						? oldVol !== newVol
							? up
								? 0         + curBright
								: maxBright - curBright
							: oldVol === 0
								? 0
								: maxBright
						: maxBright;
					const filteredBright = between(0, bright, maxBright);
					const color = lightIsInFlux
						? curColor.map(x => Number(x * filteredBright / maxBright)) as LedPixel
						: curColor
					LedDriver.setLedColor(n, filteredBright, ...color);
				}
			});
		}
		curBright++;
		LedDriver.sendLeds();
		LedDriver.sendLeds();
	}, LED_MS/2);
}
