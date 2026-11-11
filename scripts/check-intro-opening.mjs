import { readFile } from 'node:fs/promises';
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const checks = [
  ['bloqueio da marca antiga é ativado no head antes da abertura', index.indexOf("classList.add('intro-brand-pending')") < index.indexOf('<body')],
  ['CSS mantém a marca padrão invisível enquanto carrega a arte oficial', /intro-brand-pending \.intro-smoke__brand\{opacity:0!important;visibility:hidden!important\}/.test(index)],
  ['imagem de abertura só aparece depois de carregar ou cair no fallback', /intro\.addEventListener\('load',[\s\S]*?intro-brand-pending/.test(index) && /intro\.addEventListener\('error',[\s\S]*?marca\.svg[\s\S]*?intro-brand-pending/.test(index)],
  ['vídeo usa poster estático prioritário antes da reprodução', /posterLayer\.src=currentOpeningImage[\s\S]*?fetchPriority='high'[\s\S]*?screen\.insertBefore\(posterLayer/.test(index)],
  ['poster reaparece em espera ou travamento do vídeo', /video\.addEventListener\('waiting',[\s\S]*?showPoster/.test(index) && /video\.addEventListener\('stalled',[\s\S]*?showPoster/.test(index)],
  ['abertura inicia o relógio junto do poster e permanece em 10 segundos mesmo com vídeo lento', /beginOpeningClock\(\);[\s\S]*?video\.addEventListener\('loadeddata'/.test(index) && /finishTimer=window\.setTimeout\(finish,10000\)/.test(index) && !/12000/.test(index)],
  ['trem de três vagões mantém a travessia configurada em 9,8 segundos', /opening-train-cross-sky 9\.8s/.test(index) && /opening-wagon-rear/.test(index) && /opening-wagon-dancers/.test(index) && /opening-wagon-front/.test(index)]
];
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO ') + name);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log('Abertura: ' + checks.length + ' verificações aprovadas.');
