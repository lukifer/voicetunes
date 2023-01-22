import { exec }                from "child_process";
import { connect, MqttClient } from "mqtt";
import { promisify }           from "util";

// import { getPlayer }              from "./player";
import { startListening, stopListening } from "./listen";
import { doIntent, textToIntent }        from "./intent";
import { player }                        from "../index";

import { VoiceTunesPayload } from "./types";

import config from "./config";

const {
  AUDIO_DEVICE_IN,
  REC_BIN,
  RECSTOP_BIN,
  VOICE2JSON_BIN,
  VOICE2JSON_PROFILE,
} = config;

export let mqttClient: MqttClient;

// mqttClient.on("connect", () => {
//   mqttClient.subscribe(["voice", "voice2json", "text2json"], () => {});
// });

const execp = promisify(exec);

export async function mqtt(payload: VoiceTunesPayload, topic = "voicetunes") {
  mqttClient?.publish(topic, JSON.stringify(payload))
}

// const player = getPlayer(PLAYER);

export function mqttListen(listenIp: string) {
  if (!mqttClient) mqttClient = connect(`mqtt://${listenIp}`)

  mqttClient.on("connect", () => {
    mqttClient.subscribe(["voicetunes", "voice2json", "text2json"], () => {
      mqttClient.on("message", async (topic: string, message: string) => {
        const msg = message.toString()
        let json: Record<string, string> = {}
        try { json = JSON.parse(msg); } catch(err) {}
        const action = json.action || msg
        // console.log({topic, msg, action})
        switch(topic) {
          case "voicetunes":
            if (action === "StartListening") {
              // console.log('mqtt start')
              startListening();
            } else if (action === "StopListening") {
              // console.log('mqtt stop')
              stopListening();
            } else if (action === "NextTrack") {
              player.next()
            } else if (action === "PreviousTrack") {
              player.previous()
            } else if (action === "TogglePlayback") {
              player.togglePlayback()
            } else if (action === "ChangeVolume") {
              // console.log("mqttListen ChangeVolume", {json})
              // player.setVolume
            }
            break;
          case "voice2json":
            try {
              const json = JSON.parse(msg)
              // console.log(json)
              await doIntent(json);
            } catch(err) { console.log("voice2json parse went awry", msg); }
            break;
          case "text2json":
            const intent = await textToIntent(msg);
            // console.log(intent)
            await doIntent(intent);
            break;
        }
      });
    });
  });

  return mqttClient;

  // mqttClient.on("message", async (topic, message) => {
  //   const msg = message.toString()
  //   console.log({topic, msg})
  //   switch(topic) {
  //     case "voice":
  //       // TODO: replace with direct socket capture of mic data
  //       if (msg === "startrec") {
  //         player.pause();
  //         let V2J = VOICE2JSON_BIN;
  //         if (VOICE2JSON_PROFILE) V2J += ` -p ${VOICE2JSON_PROFILE}`;
  //         await execp([
  //           REC_BIN || `sudo arecord -q -D ${AUDIO_DEVICE_IN} -t raw --duration=20 --rate=16000 --format=S16_LE`,
  //           // `tee input.raw`,
  //           `${V2J} transcribe-stream -c 1 -a -`,
  //           // `tee input.txt`,
  //           `${V2J} recognize-intent`,
  //           // `tee input.json`,
  //           "mosquitto_pub -l -t voice2json",
  //         ].join(" | "));
  //       } else if(msg === "stoprec") {
  //         await execp(RECSTOP_BIN || "killall -q arecord")
  //       }
  //       break;
  //     case "voice2json":
  //       console.log(JSON.parse(msg))
  //       await doIntent(JSON.parse(msg));
  //       break;
  //     case "text2json":
  //       const intent = await textToIntent(msg);
  //       console.log(intent)
  //       await doIntent(intent);
  //       break;
  //   }
  // });
}
