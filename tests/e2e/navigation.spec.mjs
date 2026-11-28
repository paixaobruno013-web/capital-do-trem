import { test, expect } from '@playwright/test';

// Os testes de navegação usam o banco real apenas para conferir a integração leve.
// Arquivos de mídia do Storage não devem ser baixados pelo Chromium de CI: isso
// consome a franquia de egress de produção sem testar a reprodução no aparelho.
test.beforeEach(async ({ page }) => {
  // A navegação visual não deve gerar tráfego no Supabase de produção.
  // A conectividade real é verificada separadamente por um health check leve.
  await page.route(/https:\/\/[^/]+\.supabase\.co\//, async route => {
    const url = route.request().url();
    const method = route.request().method();
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
      'access-control-allow-headers': '*'
    };

    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: cors });
    }
    if (url.includes('/auth/v1/health')) {
      return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: '{}' });
    }
    if (url.includes('/auth/v1/')) {
      return route.fulfill({ status: 401, headers: { ...cors, 'content-type': 'application/json' }, body: '{"message":"Sessão de teste não autenticada"}' });
    }
    if (url.includes('/storage/v1/')) {
      if (method === 'GET' || method === 'HEAD') return route.abort();
      return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: '[]' });
    }
    if (url.includes('/rest/v1/')) {
      if (method === 'HEAD') return route.fulfill({ status: 200, headers: cors, body: '' });
      return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: '[]' });
    }
    return route.continue();
  });

  // Não abre WebSockets reais durante testes de interface.
  await page.routeWebSocket(/\/realtime\/v1\/websocket/, socket => socket.close());
});

test('abre a página inicial e navega para Música e volta ao Feed', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push({ message: error.message, stack: error.stack }));

  await page.goto('/index.html');
  await expect(page).toHaveTitle(/Capital do Trem/i);
  await expect(page.locator('#nav')).toBeVisible();

  await page.locator('#nav button[data-page="musicas"]').click();
  await expect(page.locator('#musicas')).toHaveClass(/active/);
  // A área de envio pode ficar oculta para visitantes sem permissão; o catálogo público deve permanecer acessível.
  await expect(page.locator('#music-catalog-heading')).toBeVisible();

  await page.locator('#nav button[data-page="inicio"]').click();
  await expect(page.locator('#inicio')).toHaveClass(/active/);

  expect(pageErrors, 'Erros JavaScript não tratados durante a navegação').toEqual([]);
});

test('mantém as áreas prioritárias presentes na interface', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('#inicio')).toHaveCount(1);
  await expect(page.locator('#musicas')).toHaveCount(1);
  await expect(page.locator('#home-feed-composer')).toHaveCount(1);
  await expect(page.locator('#music-upload-form')).toHaveCount(1);
});

test('exibe o novo cabeçalho e os atalhos da experiência Música', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('#nav button[data-page="musicas"]').click();

  await expect(page.locator('#musicas .music-brandbar')).toContainText('CAPITAL DO TREM');
  await expect(page.locator('#musicas .music-brandbar')).toContainText('AO VIVO');
  await expect(page.locator('#musicas .music-tagline')).toContainText('Seu universo do Funk');
  await expect(page.locator('#musicas .music-quick-actions a')).toHaveCount(3);
  await expect(page.locator('#musicas .music-quick-actions a[href="#music-upload-file"]')).toHaveCount(1);
  await expect(page.locator('#music-upload-file')).toHaveCount(1);
});
