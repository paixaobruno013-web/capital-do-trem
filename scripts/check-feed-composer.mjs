import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [html, js, sw] = await Promise.all([read('index.html'), read('home-feed.js'), read('sw.js')]);
const checks = [
  ['atalhos antigos de foto e vídeo não aparecem antes de abrir o compositor', !html.includes('data-feed-quick-media')],
  ['música, editar e cortar são controles separados', html.includes('id="home-feed-music-toggle"') && html.includes('id="home-feed-edit-toggle"') && html.includes('id="home-feed-crop-toggle"')],
  ['galeria permite seleção múltipla', /id="home-feed-media"[^>]*multiple/.test(html)],
  ['galeria limita seleção a dez fotos e um vídeo isolado', js.includes('chosen.length>10') && js.includes('hasVideo&&chosen.length>1')],
  ['seleção do seletor é copiada antes de limpar o input', js.includes('const chosen=Array.from(files||[]);clearSelectedMedia()')],
  ['fotos são enviadas em sequência e vinculadas em ordem', js.includes('for(let index=0;index<files.length;index++)') && js.includes('sort_order:index') && js.includes('insert(mediaRows)')],
  ['falhas limpam os arquivos já enviados', js.includes('remove(uploadedPaths)')],
  ['Feed mostra mídia em galeria horizontal', js.includes('home-feed-post-gallery') && html.includes('.home-feed-post-gallery{display:flex')],
  ['edição aplica brilho, contraste e cores a todas as fotos selecionadas', js.includes('const sources=selectedFiles.filter(file=>file.type.startsWith(\'image/\'))') && js.includes('editedImageFiles.push') && js.includes('ctx.filter=') && js.includes('canvas.toBlob')],
  ['corte quadrado é aplicado a todas as fotos antes de publicar', js.includes('files=await Promise.all(files.map(async file=>') && js.includes('return cropImageToSquare(file)') && js.includes('cropSelectedImage?await cropImageToSquare(sources[index]):sources[index]')],
  ['cache foi atualizado para a nova interface', Number(sw.match(/capital-do-trem-v(\d+)/)?.[1]||0)>=350]
];
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'FAIL') + ' ' + name);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) { console.error(failed.length + ' Feed composer check(s) failed.'); process.exit(1); }
console.log('Feed composer checks passed: ' + checks.length + '/' + checks.length + '.');
