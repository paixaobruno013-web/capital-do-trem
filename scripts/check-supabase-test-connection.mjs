const rawUrl = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;

if (!rawUrl || !anonKey) {
  console.log('IGNORADO: configure SUPABASE_TEST_URL e SUPABASE_TEST_ANON_KEY no GitHub Actions.');
  process.exit(0);
}

const base = rawUrl.replace(/\/+$/, '');
const healthUrl = base + '/auth/v1/health';
const response = await fetch(healthUrl, {
  headers: { apikey: anonKey },
  signal: AbortSignal.timeout(15000)
});

if (!response.ok) {
  const body = (await response.text()).slice(0, 500);
  throw new Error(`Supabase de teste respondeu HTTP ${response.status}: ${body}`);
}

console.log('OK: serviço de autenticação do Supabase de teste respondeu.');
console.log('Este teste confirma conectividade, não valida login, Storage, políticas RLS ou gravações no banco.');
