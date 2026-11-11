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
assert.match(diagnostic, /Exportar relatório/, 'diagnóstico deve permitir exportar relatório');
assert.match(diagnostic, /clearIncidents/, 'diagnóstico deve permitir limpar histórico');

console.log('Monitoramento local de falhas e painel de diagnóstico verificados.');
