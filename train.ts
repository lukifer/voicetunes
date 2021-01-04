import { exec }      from "child_process";
import { promisify } from "util";

import SFX    from "./sfx";
import config from "./config";

const {
	AUDIO_DEVICE_OUT,
	VOICE2JSON_BIN,
	WAV_BEEP,
	WAV_OK,
} = config;

const execp = promisify(exec);

export async function train() {
	const hasSfx = AUDIO_DEVICE_OUT && (WAV_BEEP || WAV_OK);
	if(hasSfx) SFX.init(AUDIO_DEVICE_OUT);
	const { stdout } = await execp(`${VOICE2JSON_BIN} train-profile`);
	console.log(stdout);
	if(hasSfx) {
		if(WAV_OK) SFX.ok();
		else       SFX.beep();
	}
}

//train();