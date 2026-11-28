import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261128130000_retire_legacy_video_interaction_public_access.sql", import.meta.url), "utf8");
assert.match(migration, /revoke all on table public\.video_likes, public\.video_comments from anon/i);
assert.match(migration, /revoke insert, update, delete, truncate, references, trigger[\s\S]*from authenticated/i);
assert.match(migration, /video_likes_read_own_or_admin/);
assert.match(migration, /video_comments_read_own_or_admin/);
assert.match(migration, /user_id = \(select auth\.uid\(\)\) or \(select private\.is_admin\(\)\)/);
assert.doesNotMatch(migration, /drop table|truncate table|delete from/i, "Os registros legados precisam ser preservados.");
console.log("Interações antigas de vídeo sem acesso público ou novas gravações; registros preservados.");
