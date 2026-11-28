import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const calls = await readFile(new URL("../supabase/functions/calls-api/index.ts", import.meta.url), "utf8");
const lives = await readFile(new URL("../supabase/functions/lives-api/index.ts", import.meta.url), "utf8");
const webhook = await readFile(new URL("../supabase/functions/lives-webhook/index.ts", import.meta.url), "utf8");
const guide = await readFile(new URL("../docs/chamadas-voz-video-arquitetura.md", import.meta.url), "utf8");

assert.match(calls, /status:\s*410/, "Chamadas de voz e vídeo devem continuar pausadas.");
assert.match(calls, /available:\s*false/, "A API deve informar que chamadas não estão disponíveis.");
assert.doesNotMatch(calls, /createClient\(|issueToken\(|AccessToken|RoomServiceClient/, "A API pausada não pode acessar o banco nem emitir tokens.");

assert.match(lives, /available:\s*false/);
assert.match(lives, /410/);
assert.doesNotMatch(lives, /createRoom\(|new AccessToken\(|RoomServiceClient|AccessToken/, "A API pausada não pode criar salas nem emitir tokens.");

assert.match(webhook, /ignored:\s*true/);
assert.doesNotMatch(webhook, /WebhookReceiver|egress_started|egress_ended|createClient\(/, "O webhook pausado não pode processar nem persistir gravações.");

assert.match(guide, /chamadas de voz, videochamadas, transmissões ao vivo e gravações estão temporariamente pausadas/);
assert.match(guide, /Nenhum conteúdo foi apagado/);
console.log("Chamadas, lives e gravações pausadas; sem emissão de tokens, criação de salas ou processamento de gravações.");
