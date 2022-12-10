// if (typeof process.stderr == "undefined") {
//   process.stderr = Bun.stderr;
// }
// console.log('process.stderr', process.stderr)
import * as LED from "./src/led";

// console.log('process.stderr', process.stderr)

LED.open()
LED.flair();

setTimeout(() => {
  LED.startSpin();
  console.log('start')
}, 2000);

setTimeout(() => {
  LED.stopSpin();
  console.log('stop')
}, 4000);