import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const calls = await readFile(new URL("../supabase/functions/calls-api/index.ts", import.meta.url), "utf8");
assert.match(calls, /available: false/);
assert.match(calls, /status: 410/);
assert.match(calls, /Chamadas de voz e vídeo estão temporariamente pausadas/);
assert.doesNotMatch(calls, /createClient|AccessToken|issueToken|LIVEKIT_API_SECRET/);
console.log("Chamadas de voz e vídeo pausadas sem acesso ao banco ou ao provedor de mídia.");
