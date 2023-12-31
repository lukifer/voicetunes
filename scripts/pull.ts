import { loadConfig } from "../src/config";
const { PULL } = await loadConfig();

if (!PULL) {
  console.log("No pull target found; please add it to `config.local.ts` or `config.local.json`");
  process.abort();
}