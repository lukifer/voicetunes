import { exec }      from "child_process";
import { connect }   from "mqtt";
import { promisify } from "util";

import { getPlayer }              from "./player";
import { doIntent, textToIntent } from "./intent";

import config from "./config";
const {
  AUDIO_DEVICE_IN,
  MQTT_IP,
  PLAYER,
  REC_BIN,
  RECSTOP_BIN,
  VOICE2JSON_BIN,
  VOICE2JSON_PROFILE,
} = config;

const mqttClient = connect(`mqtt://${MQTT_IP}`);

mqttClient.on("connect", () => {
  mqttClient.subscribe(["voice", "voice2json", "text2json"], () => {});
});

const execp = promisify(exec);

const player = getPlayer(PLAYER);

player.start().then(async () => {
  await player.clearTracks();

  mqttClient.on("message", async (topic, message) => {
    const msg = message.toString()
    console.log({topic, msg})
    switch(topic) {
      case "voice":
        // TODO: replace with direct socket capture of mic data
        if (msg === "startrec") {
          player.pause();
          let V2J = VOICE2JSON_BIN;
          if (VOICE2JSON_PROFILE) V2J += ` -p ${VOICE2JSON_PROFILE}`;
          await execp([
            REC_BIN || `sudo arecord -q -D ${AUDIO_DEVICE_IN} -t raw --duration=20 --rate=16000 --format=S16_LE`,
            // `tee input.raw`,
            `${V2J} transcribe-stream -c 1 -a -`,
            // `tee input.txt`,
            `${V2J} recognize-intent`,
            // `tee input.json`,
            "mosquitto_pub -l -t voice2json",
          ].join(" | "));
        } else if(msg === "stoprec") {
          await execp(RECSTOP_BIN || "killall -q arecord")
        }
        break;
      case "voice2json":
        console.log(JSON.parse(msg))
        await doIntent(JSON.parse(msg));
        break;
      case "text2json":
        const intent = await textToIntent(msg);
        console.log(intent)
        await doIntent(intent);
        break;
    }
  });
});
