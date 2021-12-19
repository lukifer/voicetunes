import Mopidy from "mopidy";
import { connect } from "mqtt";

import { doIntent, textToIntent } from "./intent";

import config from "./config";
const { MQTT_IP, URL_MOPIDY } = config;

const mqttClient = connect(`mqtt://${MQTT_IP}`);

mqttClient.on("connect", () => {
  mqttClient.subscribe(["voice2json", "text2json"], () => {});
});

const mopidy = new Mopidy({ webSocketUrl: URL_MOPIDY });

mopidy.on("state:online", async () => {
  await mopidy.tracklist.clear();

  mqttClient.on("message", async (topic, message) => {
    // console.log({topic, message})
    switch(topic) {
      case "voice2json":
        await doIntent(JSON.parse(message.toString()));
        break;
      case "text2json":
        const intent = await textToIntent(JSON.parse(message.toString()));
        // console.log({intent})
        await doIntent(intent);
        break;
    }
  });
});
