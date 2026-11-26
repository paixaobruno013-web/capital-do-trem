import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const update = await readFile('update.js', 'utf8');
const diagnostic = await readFile('diagnostico.html', 'utf8');

assert.match(update, /window\.CapitalDoTremHealth\s*=/, 'API de saúde deve estar exposta');
assert.match(update, /unhandledrejection/, 'promises rejeitadas devem ser detectadas');
assert.match(update, /addEventListener\('error'/, 'erros de execução e recursos devem ser detectados');
assert.match(update, /MAX_ITEMS\s*=\s*30/, 'histórico deve ter limite de tamanho');
assert.match(update, /localStorage\.setItem\(STORAGE_KEY/, 'eventos devem persistir localmente');
assert.match(update, /safeFileName/, 'caminhos devem ser reduzidos ao nome do arquivo');
assert.match(diagnostic, /Histórico de falhas deste aparelho/, 'diagnóstico deve exibir histórico local');
assert.match(diagnostic, /isCurrentUserAdmin/, 'painel técnico deve validar o papel administrativo no servidor antes de exibir dados');
assert.match(diagnostic, /admin-gate-pending/, 'conteúdo técnico deve permanecer oculto durante a validação de acesso');
assert.match(diagnostic, /window\.location\.replace\('\.\/'\)/, 'acesso não autorizado deve retornar ao aplicativo');
assert.match(diagnostic, /Exportar relatório/, 'diagnóstico deve permitir exportar relatório');
assert.match(diagnostic, /clearIncidents/, 'diagnóstico deve permitir limpar histórico');
assert.match(update, /item\.kind==='javascript'\|\|item\.kind==='promise'/, 'tarefas longas e falhas de recursos não devem disparar falso alerta de instabilidade');
assert.match(update, /duplicate\|\|recoveryShown/, 'erros repetidos em sequência devem ser deduplicados no alerta');
assert.match(update, /window\.setInterval\(verifyRealConnection,30000\)/, 'sondagem periódica deve respeitar intervalo de 30 segundos para poupar dados e bateria');

console.log('Monitoramento local de falhas e painel de diagnóstico verificados.');
