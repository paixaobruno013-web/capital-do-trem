import { test, expect } from '@playwright/test';

test('abre a página inicial e navega para Música e volta ao Feed', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push({ message: error.message, stack: error.stack }));

  await page.goto('/index.html');
  await page.addStyleTag({ content: '#intro-smoke{display:none!important}' });
  await expect(page).toHaveTitle(/Capital do Trem/i);
  await expect(page.locator('#nav')).toBeVisible();

  await page.locator('#nav button[data-page="musicas"]').click();
  await expect(page.locator('#musicas')).toHaveClass(/active/);
  await expect(page.locator('#music-upload-area')).toBeVisible();

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
