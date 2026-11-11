import fs from 'node:fs';
import assert from 'node:assert/strict';

const auth = fs.readFileSync('supabase/auth.js', 'utf8');
const admin = fs.readFileSync('admin.html', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20261111025244_private_gallery_admin_only_reads.sql', 'utf8');

assert.match(migration, /drop policy if exists private_gallery_read_owner_or_admin/i);
assert.match(migration, /create policy private_gallery_admin_only_read/i);
assert.match(migration, /using \(\(select private\.is_admin\(\)\)\)/i);
assert.match(auth, /export async function getAdminPrivateGallery\(\)/);
assert.match(auth, /isCurrentUserAdmin\(\)/);
assert.match(auth, /createSignedUrl\(item\.storage_path, 15 \* 60\)/);
assert.match(auth, /capital-do-trem-private-gallery/);
assert.match(auth, /export async function uploadAdminPrivateGalleryItem\(file\)/);
assert.match(auth, /export async function deleteAdminPrivateGalleryItem\(id\)/);
assert.match(admin, /id="private-gallery-section"/);
assert.match(admin, /id="private-gallery-upload"/);
assert.match(admin, /id="private-gallery-refresh"/);
assert.match(admin, /await loadPrivateGallery\(\)/);
console.log('Álbum privado: leitura administrativa, URLs temporárias, upload e exclusão verificados.');
