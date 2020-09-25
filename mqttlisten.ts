import Mopidy from "mopidy";
import { connect } from "mqtt";

import { doIntent } from "./intent";
import config       from "./config";

const { MQTT_IP, URL_MOPIDY } = config;

const mqttClient = connect(`mqtt://${MQTT_IP}`);

const mopidy = new Mopidy({ webSocketUrl: URL_MOPIDY });

mopidy.on("state:online", async () => {
	await mopidy.tracklist.clear();

	mqttClient.on("connect", () => {
		mqttClient.subscribe(["voice2json"], () => {});
	});

	mqttClient.on("message", (_topic, message) => {
		doIntent(mopidy, JSON.parse(message.toString()));
	});
});
