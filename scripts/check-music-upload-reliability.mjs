import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const auth = read('../supabase/auth.js');
const upload = read('../music-upload.js');
const player = read('../capital-music-player.js');
const home = read('../index.html');
const prepare = read('./prepare-web.mjs');
const sw = read('../sw.js');

assert.ok(auth.includes('uploadSongAudioObject'), 'O envio de áudio precisa usar o fluxo resiliente');
assert.ok(auth.includes('tus-js-client@4'), 'Arquivos de áudio maiores devem usar TUS');
assert.ok(auth.includes('retryDelays: [0, 2000, 5000, 10000, 20000]'), 'O TUS precisa repetir tentativas em falhas de rede');
assert.ok(auth.includes('attempt <= 3'), 'O fallback de upload precisa limitar tentativas');
assert.ok(auth.includes('export async function getSongPlaybackUrl'), 'O aplicativo precisa renovar links expirados');
assert.ok(upload.includes('onProgress: percent =>'), 'A tela precisa mostrar o progresso sem sair de Músicas');
assert.ok(upload.includes('event.preventDefault()'), 'O formulário não pode navegar/recarregar a página');
assert.ok(upload.includes('fileInput.value=\'\';titleInput.value=\'\''), 'Os campos só devem limpar após upload concluído');
assert.ok(player.includes('onRefreshAudio=null'), 'O player precisa aceitar renovação de link');
assert.ok(player.includes('o Android não reconheceu a codificação deste áudio'), 'O player precisa explicar falhas de decodificação');
assert.ok(home.includes('onRefreshAudio:song=>api.getSongPlaybackUrl(song.id)'), 'A página precisa conectar o player à renovação do link');
for (const file of ['music-upload.js','capital-music-player.js','supabase/auth.js']) {
  assert.ok(prepare.includes(file), file + ' precisa entrar no pacote Android/iOS');
  assert.ok(sw.includes(file), file + ' precisa entrar no cache PWA');
}
console.log('Upload resiliente, permanência na tela Músicas e recuperação do player: 12 verificações aprovadas.');
