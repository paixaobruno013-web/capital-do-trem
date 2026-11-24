import { readFile } from 'node:fs/promises';

const config = await readFile('supabase-config.js', 'utf8');
const urlMatch = config.match(/CAPITAL_SUPABASE_URL\s*=\s*["']([^"']+)["']/);
const keyMatch = config.match(/CAPITAL_SUPABASE_KEY\s*=\s*["']([^"']+)["']/);

if (!urlMatch || !keyMatch) {
  throw new Error('Configuração pública do Supabase não encontrada; nenhum segredo foi exibido.');
}

const baseUrl = new URL(urlMatch[1]);
if (baseUrl.protocol !== 'https:' || !baseUrl.hostname.endsWith('.supabase.co')) {
  throw new Error('URL pública do Supabase inválida ou fora do domínio esperado.');
}

const response = await fetch(new URL('/auth/v1/health', baseUrl), {
  headers: { apikey: keyMatch[1] },
  signal: AbortSignal.timeout(15000)
});

if (!response.ok) {
  throw new Error(`Supabase de produção respondeu HTTP ${response.status} no health check.`);
}

console.log('OK: endpoint Auth do Supabase de produção respondeu via chave publicável.');
console.log('Teste somente de conectividade; não cria, lê ou altera dados de usuários.');
