import { test, expect } from './fixtures.mjs';

test('dashboard abre, sem erro de script e sem pedir o Firebase real', async ({ page }) => {
  const erros = [];
  const externos = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('request', (r) => {
    // Fontes do Google são normais. Só vigiamos o Firebase real.
    if (/(firestore|identitytoolkit|securetoken)\.googleapis\.com|firebaseio\.com/.test(r.url())) externos.push(r.url());
  });
  await page.goto('/');
  await expect(page.locator('h1', { hasText: 'Odisseia' })).toBeVisible();
  await page.waitForTimeout(1000);
  expect(erros).toEqual([]);
  expect(externos).toEqual([]);
});

test('wiki abre sem erro de script', async ({ page }) => {
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/wiki');
  await page.waitForLoadState('load');
  await page.waitForTimeout(1500);
  expect(erros).toEqual([]);
});
