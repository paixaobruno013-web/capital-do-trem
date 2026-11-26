import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const config = await readFile('capacitor.config.ts', 'utf8');
const html = await readFile('index.html', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const updater = await readFile('live-update-entry.js', 'utf8');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(pkg.dependencies?.['@capawesome/capacitor-live-update']?.startsWith('8.'), 'SDK de atualização precisa ser compatível com Capacitor 8.');
assert(pkg.devDependencies?.esbuild, 'Empacotador do módulo de atualização ausente.');
assert(config.includes('readyTimeout: 10000'), 'Proteção de rollback precisa ter prazo de inicialização.');
assert(config.includes('autoBlockRolledBackBundles: true'), 'Pacotes que falharem precisam ser bloqueados após rollback.');
assert(html.includes('src="./live-update.js"'), 'Carregador do atualizador não está ligado à página principal.');
const shim = await readFile('live-update.js', 'utf8');
assert(shim.includes('isNativePlatform()') && shim.includes("import('./live-update-native.js')"), 'A PWA deve ignorar o SDK nativo e carregá-lo apenas em WebView.');
assert(sw.includes("'./live-update.js'"), 'Service worker não inclui o carregador compartilhado.');
assert(sw.includes("'./live-update-native.js'"), 'Service worker não inclui o módulo nativo gerado.');
assert(updater.includes("startsWith('web-update-')"), 'Filtro de publicação precisa aceitar somente releases de atualização web.');
assert(updater.includes('checksum: latest.checksum'), 'Download precisa validar SHA-256.');
assert(updater.includes('release.body') && updater.includes('SHA-256:'), 'Checksum precisa vir dos metadados HTTPS da release.');
assert(updater.includes("Capacitor.getPlatform() !== 'android'"), 'Download remoto precisa ser restrito ao Android nativo.');
assert(updater.includes('await LiveUpdate.ready()'), 'O app precisa confirmar prontidão antes de buscar atualização.');
assert(updater.indexOf('await LiveUpdate.ready()') < updater.indexOf("if (Capacitor.getPlatform() !== 'android') return;"), 'A prontidão também precisa ser confirmada em WebViews nativas iOS.');
assert(updater.includes('setNextBundle'), 'Pacote baixado precisa ser preparado para a próxima abertura.');
assert(!updater.includes('LiveUpdate.reload()'), 'Atualização não pode reiniciar a interface no meio do uso.');
assert(updater.includes('CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000'), 'Verificação deve respeitar intervalo para economizar bateria.');
assert(/if \(!latest\)[\s\S]*LAST_CHECK_KEY/.test(updater), 'Ausência de release também precisa respeitar o intervalo de consulta.');

console.log('Atualizador remoto: compatibilidade, checksum, rollback, intervalo e aplicação na próxima abertura conferidos.');
