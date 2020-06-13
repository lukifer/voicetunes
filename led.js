const Apa102spi = require('apa102-spi')
const { Gpio }  = require('onoff');
const util      = require('util');

const { between, rnd } = require('./utils.js');

const LED_MS = 80;
const rndColor = (base, change) => Math.min(255, Math.max(100, base - change + rnd(change*2)));

let timer = false;
let pos = 0;
let curColor = [100+rnd(156), 100+rnd(156), 100+rnd(156)];
let ledColors = [...Array(12)].fill([0, 0, 0]);

const led = new Gpio(5, 'out');
function open() { led.writeSync(1); }
const LedDriver = new Apa102spi(12, 100);

function startSpin(speed = LED_MS) {
	if(speed < 5) speed *= LED_MS;
	if(timer) clearInterval(timer)
	timer = setInterval(() => {
		pos = (pos + 1) % 12;
		curColor = curColor.map(x => rndColor(x, speed < 100 ? 7 : 3));
		ledColors[pos] = curColor;
		ledColors.map((cols, n) => {
			const bright = (11 - pos + n) % 12;
			const colorDiff = (10*(11-bright));
			const dimmed = cols.map(x => Math.max(0, x - colorDiff));
			LedDriver.setLedColor(n, bright+1, ...dimmed);
		});
		LedDriver.sendLeds();
		LedDriver.sendLeds();
	}, speed);
}

function stopSpin() {
	if(timer) {
		clearInterval(timer);
		timer = false;
	}
	ledColors.map((_, n) => {
		LedDriver.setLedColor(n, 0, 0, 0, 0);
	});
	LedDriver.sendLeds();
	LedDriver.sendLeds();
}

function flair(speed = 40) {
	startSpin(speed);
	setTimeout(() => stopSpin(), speed*13);
}

function volumeChange(oldVol, newVol) {
	//console.log(`${oldVol} -> ${newVol}`);
	const up = newVol > oldVol;
	const maxBright = 4;
	let   curBright = 0;
	const lights = 1 + parseInt(Math.max(oldVol, newVol) / 10);
	if(timer) clearInterval(timer)
	timer = setInterval(() => {
		if(curBright > (maxBright*2.5)) {
			clearInterval(timer);
			timer = false;
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
					const filteredBright = Math.max(0, Math.min(maxBright, bright))
					//if(n === lights) console.log(`lights:${lights} n:${n} bright:${bright}`);
					const color = n === lights
						? curColor.map(x => parseInt(x * filteredBright / maxBright))
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

module.exports = {
	open,
	flair,
	startSpin,
	stopSpin,
	volumeChange,
};