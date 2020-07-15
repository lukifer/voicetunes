import Apa102spi from "apa102-spi";
import { Gpio }  from "onoff";

import { between, rnd } from "./utils.js";
import { LedPixel }     from "./itunes/types";

const LED_MS = 80;
const rndColor = (base: number, change: number) => between(100, base - change + rnd(change*2), 255);

let timer: NodeJS.Timeout = null;
let pos = 0;
let curColor: LedPixel = [100+rnd(156), 100+rnd(156), 100+rnd(156)];
let ledColors: LedPixel[] = [...Array(12)].fill([0, 0, 0]);

const led = new Gpio(5, 'out');
export function open() { led.writeSync(1); }
const LedDriver = new Apa102spi(12, 100);

export function startSpin(speed = LED_MS) {
	if(speed < 5) speed *= LED_MS;
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
	//console.log(`${oldVol} -> ${newVol}`);
	const up = newVol > oldVol;
	const maxBright = 4;
	let   curBright = 0;
	const lights = 1 + Number(Math.max(oldVol, newVol) / 10);
	if(timer) clearInterval(timer)
	timer = setInterval(() => {
		if(curBright > (maxBright*2.5)) {
			clearInterval(timer);
			timer = null;
			[...Array(12)].map((_, n) => LedDriver.setLedColor(n, 0, 0, 0, 0));
		} else {
			[...Array(12)].map((_, n) => {
				if (n > lights) {
					LedDriver.setLedColor(n, 0, 0, 0, 0);
				} else {
					const bright = n === lights
						? oldVol !== newVol
							? up
								? 0         + curBright
								: maxBright - curBright
							: oldVol === 0
								? 0
								: maxBright
						: maxBright;
					const filteredBright = between(0, bright, maxBright);
					//if(n === lights) console.log(`lights:${lights} n:${n} bright:${bright}`);
					const color = n === lights
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
