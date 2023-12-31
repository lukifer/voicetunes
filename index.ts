import * as LED         from "./src/led";
import { buttonListen } from "./src/listeners/button";
import { mqttListen }   from "./src/mqttlisten";
import { getPlayer }    from "./src/player";
import SFX              from "./src/sfx";

import { loadConfig } from "./src/config";
const {
  AUDIO_DEVICE_OUT,
  BT_BUTTON_NAME,
  MQTT_FORWARD_IP,
  MQTT_LISTEN_IP,
  PLAYER,
} = await loadConfig();

export const player = getPlayer(PLAYER);

if (MQTT_FORWARD_IP && MQTT_LISTEN_IP === MQTT_LISTEN_IP) {
  console.log("MQTT listening and forwarding IPs cannot match, because Infinity");
  process.exit();
}

player.start().then(async () => {
  SFX.init(AUDIO_DEVICE_OUT);
  LED.open();
  LED.flair();

  if (BT_BUTTON_NAME) buttonListen(BT_BUTTON_NAME);
  if (MQTT_LISTEN_IP) mqttListen(MQTT_LISTEN_IP)

  LED.flair();
  await player.pause();
  await player.clearTracks();
  SFX.beep();
  console.log("ready")
});
