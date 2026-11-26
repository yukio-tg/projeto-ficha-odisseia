import { test, expect, novaPessoa } from './fixtures.mjs';
import { criarConta, criarFicha, novoEmail } from './helpers.mjs';

test('criar ficha: aparece na lista e continua depois de recarregar', async ({ page }) => {
  await criarConta(page, novoEmail());
  await criarFicha(page, 'Persistente');
  await page.reload();
  await expect(page.locator('.ficha-nome', { hasText: 'Persistente' })).toBeVisible();
});

test('renomear e excluir a ficha', async ({ page }) => {
  await criarConta(page, novoEmail());
  await criarFicha(page, 'Antigo');

  page.once('dialog', (d) => d.accept('Renomeada'));
  await page.locator('.ficha-nome', { hasText: 'Antigo' }).click();
  await expect(page.locator('.ficha-nome', { hasText: 'Renomeada' })).toBeVisible();

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Excluir' }).click();
  await expect(page.locator('#lista-fichas')).toContainText('Nenhuma ficha encontrada');
});

test('abrir a ficha, editar um campo e ver o valor salvo depois de recarregar', async ({ page }) => {
  await criarConta(page, novoEmail());
  await criarFicha(page, 'Gandalf');
  await page.getByRole('button', { name: 'Abrir' }).click();
  await page.waitForURL(/\/ficha\?sheetId=/);

  const campo = page.locator('input[data-field="personagem-nome"]');
  await expect(campo).toHaveValue('Gandalf');
  // Enquanto a ficha ainda carrega, ela ignora a digitação. Repete até ela marcar "não salvo".
  await expect(async () => {
    await campo.fill('Gandalf o Cinzento');
    await expect(page.locator('#non-saved')).toBeVisible({ timeout: 800 });
  }).toPass({ timeout: 15_000 });
  // O salvamento automático espera 30 s sozinho. Aqui usamos o botão de salvar.
  await page.click('#manual-save');
  await expect(page.locator('#saved')).toBeVisible();
  await expect(page.locator('#problem-save')).toBeHidden();

  await page.reload();
  await expect(page.locator('input[data-field="personagem-nome"]')).toHaveValue('Gandalf o Cinzento');
});

test('outra pessoa não consegue abrir a ficha privada', async ({ browser }) => {
  const dono = await novaPessoa(browser);
  await criarConta(dono, novoEmail('dono'));
  await criarFicha(dono, 'Secreta');
  await dono.getByRole('button', { name: 'Abrir' }).click();
  await dono.waitForURL(/sheetId=/);
  const url = dono.url();

  const intruso = await novaPessoa(browser);
  await criarConta(intruso, novoEmail('intruso'));
  await intruso.goto(url);
  // A ficha manda a pessoa sem acesso de volta ao dashboard.
  await intruso.waitForURL((u) => !u.pathname.startsWith('/ficha'));
  await expect(intruso.locator('input[data-field="personagem-nome"]')).toHaveCount(0);
});
