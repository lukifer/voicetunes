import Mopidy from "mopidy";
import { connect } from "mqtt";

import { doIntent } from "./intent";
import config       from "./config";

const { MQTT_IP, URL_MOPIDY } = config;

const mqttClient = connect(`mqtt://${MQTT_IP}`);

mqttClient.on("connect", () => {
  mqttClient.subscribe(["voice2json"], () => {});
});

const mopidy = new Mopidy({ webSocketUrl: URL_MOPIDY });

mopidy.on("state:online", async () => {
  await mopidy.tracklist.clear();

  mqttClient.on("message", (_topic, message) => {
    doIntent(JSON.parse(message.toString()));
  });
});
