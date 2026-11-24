import { test, expect } from './fixtures.mjs';
import { criarConta, novoEmail, SENHA } from './helpers.mjs';

test('criar conta mostra o dashboard e esconde o login', async ({ page }) => {
  await criarConta(page, novoEmail());
  await expect(page.locator('#auth-container')).toBeHidden();
  await expect(page.locator('#lista-fichas')).toContainText('Nenhuma ficha encontrada');
});

test('sair volta ao login, e entrar de novo funciona', async ({ page }) => {
  const email = novoEmail();
  await criarConta(page, email);
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.locator('#auth-container')).toBeVisible();

  await page.fill('#email', email);
  await page.fill('#password', SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.locator('#dashboard')).toBeVisible();
});

test('senha errada mostra erro e não entra', async ({ page }) => {
  const email = novoEmail();
  await criarConta(page, email);
  await page.getByRole('button', { name: 'Sair' }).click();

  await page.fill('#email', email);
  await page.fill('#password', 'senha-errada');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.locator('#auth-error')).not.toBeEmpty();
  await expect(page.locator('#dashboard')).toBeHidden();
});

test('e-mail repetido não cria conta de novo', async ({ page }) => {
  const email = novoEmail();
  await criarConta(page, email);
  await page.getByRole('button', { name: 'Sair' }).click();
  await page.fill('#email', email);
  await page.fill('#password', SENHA);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.locator('#auth-error')).not.toBeEmpty();
});

test('a sessão continua depois de recarregar a página', async ({ page }) => {
  await criarConta(page, novoEmail());
  await page.reload();
  await expect(page.locator('#dashboard')).toBeVisible();
});
