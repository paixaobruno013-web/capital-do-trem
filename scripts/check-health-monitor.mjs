import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const update = await readFile('update.js', 'utf8');
const diagnostic = await readFile('diagnostico.html', 'utf8');
const auth = await readFile('supabase/auth.js', 'utf8');

assert.match(auth, /reconnectAfterMs:\s*\(tries\)\s*=>/, 'Realtime deve usar retentativa adaptativa');
assert.match(auth, /\[10000, 30000, 60000, 120000\]/, 'falhas persistentes devem espaçar as reconexões até 2 minutos');
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
assert.match(update, /\(connectionDebounceTimer\|\|confirmedOffline\)\?1000:\(lowPowerMode\(\)\?45000:30000\)/, 'monitor deve verificar a cada segundo durante queda/retorno e reduzir a frequência em economia de bateria/dados');
assert.match(update, /if\(document\.hidden\)return/, 'sondagens devem ser pausadas quando o app está em segundo plano');
assert.match(update, /battery\.addEventListener\('levelchange'/, 'mudanças no nível da bateria devem recalibrar o monitor');
assert.match(update, /battery\.addEventListener\('chargingchange'/, 'estado de carregamento deve recalibrar o monitor');
assert.match(update, /else resumeConnectionMonitor\(\)/, 'retorno ao primeiro plano deve verificar a conexão imediatamente');
assert.match(update, /window\.addEventListener\('offline',showOffline\)/, 'evento offline do aparelho deve iniciar a confirmação automática de 13 segundos');
assert.match(update, /connectionDebounceTimer=window\.setTimeout\(\(\)=>\{[\s\S]*?\},13000\)/, 'alerta offline só dispara após 13 segundos contínuos sem internet');
assert.match(update, /window\.addEventListener\('online',\(\)=>window\.setTimeout\(resumeConnectionMonitor,300\)\)/, 'evento online deve confirmar a conexão assim que a rede voltar');

console.log('Monitoramento local de falhas e painel de diagnóstico verificados.');
