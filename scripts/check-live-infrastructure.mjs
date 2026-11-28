import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const calls = await readFile(new URL("../supabase/functions/calls-api/index.ts", import.meta.url), "utf8");
const lives = await readFile(new URL("../supabase/functions/lives-api/index.ts", import.meta.url), "utf8");
const webhook = await readFile(new URL("../supabase/functions/lives-webhook/index.ts", import.meta.url), "utf8");
const guide = await readFile(new URL("../docs/chamadas-voz-video-arquitetura.md", import.meta.url), "utf8");

assert.match(calls, /callType !== "audio"/, "Videochamadas devem permanecer desativadas.");
assert.match(calls, /temporariamente adiadas/, "A API deve informar que videochamadas foram adiadas.");
assert.match(calls, /issueToken\(call\.id\)/, "O fluxo técnico de chamadas de voz deve continuar preservado.");
assert.match(lives, /available: false/);
assert.match(lives, /status = 410|status: 410|json\([\s\S]*410/);
assert.doesNotMatch(lives, /createRoom\(|new AccessToken\(/, "A API pausada não pode criar salas nem emitir tokens.");
assert.match(webhook, /ignored: true/);
assert.doesNotMatch(webhook, /WebhookReceiver|egress_started|egress_ended/);
assert.match(guide, /videochamadas e transmissões ao vivo foram adiadas/);
assert.match(guide, /não garante por si só/);
console.log("Escopo reduzido validado: videochamadas e lives pausadas; chamadas de voz preservadas.");
