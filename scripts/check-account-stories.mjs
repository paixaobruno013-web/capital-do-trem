import fs from 'node:fs';
import assert from 'node:assert/strict';

const page = fs.readFileSync('conta.html', 'utf8');
const script = fs.readFileSync('account-stories.js', 'utf8');
const auth = fs.readFileSync('supabase/auth.js', 'utf8');

assert.match(page, /class="story-profile-actions"/);
assert.match(page, /id="my-story-avatar"/);
assert.match(page, /id="my-story-add"/);
assert.match(page, /aria-controls="my-story-file"/);
assert.match(page, /id="my-story-file"[^>]*hidden/);
assert.match(page, /id="my-story-compose-fields" hidden/);
assert.match(page, /id="my-story-preview"/);
assert.match(script, /addButton\?\.addEventListener\('click',[\s\S]*?fileInput\?\.click\(\)/);
assert.match(script, /fileInput\?\.addEventListener\('change'/);
assert.match(script, /URL\.createObjectURL\(file\)/);
assert.match(script, /URL\.revokeObjectURL\(previewUrl\)/);
assert.match(script, /function characterAvatarData\(data\)/);
assert.match(script, /profileAvatar\?\.avatar_type === 'character'/);
assert.match(script, /auth\.createMyStory\(\{ file, caption: captionInput\.value \}\)/);
assert.match(auth, /export async function createMyStory\(\{ file, caption = '' \}\)/);
assert.match(auth, /expires_at: new Date\(Date\.now\(\) \+ 24 \* 60 \* 60 \* 1000\)\.toISOString\(\)/);
console.log('Stories: botão + ao lado do avatar, seletor de mídia, prévia, avatar sincronizado e publicação verificados.');
