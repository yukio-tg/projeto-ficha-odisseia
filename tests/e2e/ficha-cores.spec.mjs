import { test, expect } from './fixtures.mjs';
import { criarConta, criarFicha, novoEmail } from './helpers.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PRINTS = join(process.env.KIROCREW_SCRATCH || '/tmp', 'prints-cores');
mkdirSync(PRINTS, { recursive: true });

async function abrirFicha(page, nome) {
  await criarConta(page, novoEmail('cores'));
  await criarFicha(page, nome);
  await page.getByRole('button', { name: 'Abrir' }).click();
  await page.waitForURL(/\/ficha\?sheetId=/);
  await expect(page.locator('input[data-field="personagem-nome"]')).toHaveValue(nome);
}

const abrirPainel = async (page) => {
  await page.click('#theme-btn');
  await expect(page.locator('#theme-panel')).toBeVisible();
};
const escuro = (page) => page.evaluate(() => document.body.classList.contains('theme-dark-paper'));
const variavel = (page, nome) => page.evaluate((n) => document.documentElement.style.getPropertyValue(n), nome);
const escolherTema = (page, nome) => page.locator('#cp-grid .theme-card', { has: page.locator('.theme-name', { hasText: new RegExp(`^${nome}$`) }) }).click();
const limparCache = (page) => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('odisseia-theme')).forEach(k => localStorage.removeItem(k)));

test('painel mostra 10 + 10 temas em dois grupos, abre por cima sem deslocar a ficha e fecha com Esc e clique fora', async ({ page }) => {
  await abrirFicha(page, 'Painel');
  const topoAntes = await page.locator('.page-wrap').boundingBox();
  await abrirPainel(page);

  await expect(page.locator('#cp-grid .cp-sub')).toHaveText(['Pergaminho claro', 'Pergaminho escuro']);
  await expect(page.locator('#cp-grid .theme-card')).toHaveCount(20);
  await expect(page.locator('#cp-grid .theme-card .theme-thumb i')).toHaveCount(60);
  await expect(page.locator('#cp-grid .theme-card.active .theme-name')).toHaveText('Pergaminho clássico');

  const topoDepois = await page.locator('.page-wrap').boundingBox();
  expect(topoDepois.y).toBe(topoAntes.y);

  await page.keyboard.press('Escape');
  await expect(page.locator('#theme-panel')).toBeHidden();

  await abrirPainel(page);
  await page.mouse.click(300, 700);
  await expect(page.locator('#theme-panel')).toBeHidden();
});

test('tema claro e escuro ajustam body.theme-dark-paper e variáveis; persiste ao recarregar', async ({ page }) => {
  await abrirFicha(page, 'Temas');
  expect(await escuro(page)).toBe(false);
  const p0Padrao = await variavel(page, '--p0');

  await abrirPainel(page);
  await escolherTema(page, 'Nord');
  expect(await escuro(page)).toBe(false);
  const p0Nord = await variavel(page, '--p0');
  expect(p0Nord).not.toBe('');
  expect(p0Nord).not.toBe(p0Padrao);

  await escolherTema(page, 'Tokyo Night');
  expect(await escuro(page)).toBe(true);
  const p0Noite = await variavel(page, '--p0');
  expect(p0Noite).not.toBe(p0Nord);
  await expect(page.locator('#cp-grid .theme-card.active .theme-name')).toHaveText('Tokyo Night');

  // Espera o Firestore confirmar; apaga o cache local para provar que o servidor guarda o tema
  await page.waitForTimeout(800);
  await limparCache(page);
  await page.reload();
  await expect(async () => {
    expect(await escuro(page)).toBe(true);
    expect(await variavel(page, '--p0')).toBe(p0Noite);
  }).toPass({ timeout: 10_000 });
  await abrirPainel(page);
  await expect(page.locator('#cp-grid .theme-card.active .theme-name')).toHaveText('Tokyo Night');

  await page.click('#cp-reset');
  expect(await escuro(page)).toBe(false);
  expect(await variavel(page, '--p0')).toBe('');
  expect(await variavel(page, '--leath0')).toBe('');
});

test('RGB livre: muda variáveis, a classe dark segue a luminância e persiste', async ({ page }) => {
  await abrirFicha(page, 'Livre');
  await abrirPainel(page);
  await page.click('#cp-custom');
  await expect(page.locator('#cp-rgb')).toBeVisible();
  const linhas = page.locator('#rgb-groups .rgb-row');
  await expect(linhas).toHaveCount(3);

  const perg = linhas.nth(2);
  const hex = perg.locator('input.hex');
  const antes = await variavel(page, '--sheet-bg');

  await hex.fill('#101820');
  expect(await escuro(page)).toBe(true);
  const sheetEscuro = await variavel(page, '--sheet-bg');
  expect(sheetEscuro).not.toBe(antes);
  await expect(perg.locator('input[type=number]').nth(0)).toHaveValue('16');

  const [r, g, b] = [0, 1, 2].map(i => perg.locator('input[type=number]').nth(i));
  await r.fill('250'); await g.fill('240'); await b.fill('215');
  expect(await escuro(page)).toBe(false);
  await expect(hex).toHaveValue('#faf0d7');

  // Azul saturado: luminância baixa, conta como escuro
  await hex.fill('#2020ff');
  expect(await escuro(page)).toBe(true);
  await hex.fill('#ffff00');
  expect(await escuro(page)).toBe(false);

  const fundoAntes = await variavel(page, '--leath2');
  await linhas.nth(0).locator('input.hex').fill('#ff00ff');
  expect(await variavel(page, '--leath2')).not.toBe(fundoAntes);
  const ouroAntes = await variavel(page, '--gold2');
  await linhas.nth(1).locator('input.hex').fill('#00ffff');
  expect(await variavel(page, '--gold2')).not.toBe(ouroAntes);

  // Hex inválido é ignorado
  const p0 = await variavel(page, '--p0');
  await hex.fill('#zzz');
  expect(await variavel(page, '--p0')).toBe(p0);

  await hex.fill('#101820');
  const sheetFinal = await variavel(page, '--sheet-bg');
  await page.waitForTimeout(800);
  await limparCache(page);
  await page.reload();
  await expect(async () => {
    expect(await escuro(page)).toBe(true);
    expect(await variavel(page, '--sheet-bg')).toBe(sheetFinal);
  }).toPass({ timeout: 10_000 });
});

test('tema muda em tempo real em outra aba e dispara ficha:tema-mudou; valor inválido volta ao padrão', async ({ page, context }) => {
  await abrirFicha(page, 'Tempo real');
  const outra = await context.newPage();
  await outra.goto(page.url());
  await expect(outra.locator('input[data-field="personagem-nome"]')).toHaveValue('Tempo real');
  await outra.evaluate(() => { window.__temaEventos = 0; document.addEventListener('ficha:tema-mudou', () => window.__temaEventos++); });

  await abrirPainel(page);
  await escolherTema(page, 'Ametista');
  await expect(async () => expect(await escuro(outra)).toBe(true)).toPass({ timeout: 10_000 });
  expect(await outra.evaluate(() => window.__temaEventos)).toBeGreaterThan(0);

  await escolherTema(page, 'Gruvbox');
  await expect(async () => expect(await escuro(outra)).toBe(false)).toPass({ timeout: 10_000 });

  await page.click('#cp-reset');
  await expect(async () => expect(await variavel(outra, '--p0')).toBe('')).toPass({ timeout: 10_000 });

  // Valor inválido no cache volta ao padrão, sem quebrar a página
  const id = new URL(page.url()).searchParams.get('sheetId');
  await page.evaluate((i) => localStorage.setItem('odisseia-theme-v1-' + i, JSON.stringify({ preset: 'nao-existe', custom: { fundo: 'x' } })), id);
  await page.reload();
  await expect(page.locator('input[data-field="personagem-nome"]')).toHaveValue('Tempo real');
  expect(await variavel(page, '--p0')).toBe('');
  await outra.close();
});

test('formato antigo {fundo, metalico, pergaminho} continua sendo aceito', async ({ page }) => {
  await abrirFicha(page, 'Antiga');
  const id = new URL(page.url()).searchParams.get('sheetId');
  await page.evaluate((i) => localStorage.setItem('odisseia-theme-v1-' + i, JSON.stringify({ fundo: 'azul-escuro', metalico: 'amarelo-escuro', pergaminho: 'azul-escuro' })), id);
  await page.reload();
  await expect(async () => expect(await escuro(page)).toBe(true)).toPass({ timeout: 10_000 });
  await abrirPainel(page);
  await expect(page.locator('#cp-grid .theme-card.active')).toHaveCount(0);
});

test('prints: painel claro/escuro/celular, grupos, RGB e ficha em 4 temas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await abrirFicha(page, 'Prints');
  await abrirPainel(page);
  await page.screenshot({ path: join(PRINTS, '01-painel-claro.png') });
  await page.locator('#cp-grid .cp-sub').nth(1).scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(PRINTS, '02-painel-grupo-escuro.png') });
  await escolherTema(page, 'One Dark');
  await page.screenshot({ path: join(PRINTS, '03-painel-escuro.png') });
  await page.click('#cp-custom');
  await page.screenshot({ path: join(PRINTS, '04-painel-rgb.png') });
  await page.click('#cp-back');
  await page.click('#cp-reset');
  await page.keyboard.press('Escape');

  for (const [i, tema] of ['Pergaminho clássico', 'Nord', 'Rubi', 'Solarized'].entries()) {
    await abrirPainel(page);
    await escolherTema(page, tema);
    await page.keyboard.press('Escape');
    await page.screenshot({ path: join(PRINTS, `05-ficha-${i + 1}-${tema.replace(/\s/g, '-')}.png`) });
  }

  await page.setViewportSize({ width: 390, height: 800 });
  await abrirPainel(page);
  await page.screenshot({ path: join(PRINTS, '06-painel-celular.png') });
  await page.click('#cp-custom');
  await page.screenshot({ path: join(PRINTS, '07-painel-rgb-celular.png') });
  const caixa = await page.locator('#theme-panel').boundingBox();
  expect(caixa.x).toBeGreaterThanOrEqual(0);
  expect(caixa.x + caixa.width).toBeLessThanOrEqual(390);
});
