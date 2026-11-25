// Poderes com bônus fixo escrevem no log de incrementos e mexem na ficha sozinhos.
import { test, expect } from './fixtures.mjs';
import { criarConta, criarFicha, novoEmail } from './helpers.mjs';

async function abrirFicha(page, nome) {
  await criarConta(page, novoEmail('passivas'));
  await criarFicha(page, nome);
  await page.getByRole('button', { name: 'Abrir' }).click();
  await page.waitForURL(/\/ficha\?sheetId=/);
  await expect(page.locator('input[data-field="pv-total"][data-calculado]')).toHaveCount(1);
  await page.waitForTimeout(1500);
}

const definir = async (page, campo, valor) => {
  const el = page.locator(`[data-field="${campo}"]`);
  if ((await el.evaluate((e) => e.tagName)) === 'SELECT') await el.selectOption(valor);
  else await el.evaluate((e, v) => {
    e.value = v;
    e.dispatchEvent(new Event('input', { bubbles: true }));
    e.dispatchEvent(new Event('change', { bubbles: true }));
  }, String(valor));
};

const nivel = (page, n) => page.locator('#secao-radar .level-input').evaluate((e, v) => {
  e.value = v;
  e.dispatchEvent(new Event('input', { bubbles: true }));
  e.dispatchEvent(new Event('change', { bubbles: true }));
}, String(n));

const pv = async (page) => parseInt(await page.locator('input[data-field="pv-total"]').inputValue(), 10);
const pm = async (page) => parseInt(await page.locator('input[data-field="mana-total"]').inputValue(), 10);

async function adicionarPoder(page, nome) {
  await page.locator('.sidebar [data-tab="habilidades"]').click();
  await expect(page.locator('#tab-habilidades')).toBeVisible();
  const busca = page.locator('.power-searchbox input');
  await busca.fill(nome);
  await page.click('#btn-add-power');
  await expect(page.locator(`.powers-container .power-name-input[value="${nome}"]`)).toHaveCount(1);
}

test('poder fixo e poder por nível mexem em PV e PM, e saem ao remover', async ({ page }) => {
  await abrirFicha(page, 'Passivas');
  await definir(page, 'classe-nome', 'Coração');
  await expect.poll(() => pv(page), { timeout: 10_000 }).toBeGreaterThan(0);
  const pv0 = await pv(page);
  const pm0 = await pm(page);
  expect(pv0).toBeGreaterThan(0);

  await adicionarPoder(page, 'A Prática Supera a Teoria');
  await expect.poll(() => pv(page)).toBe(pv0 + 8);
  await expect.poll(() => pm(page)).toBe(pm0 + 5);

  await adicionarPoder(page, 'Calejado');
  const nv = parseInt(await page.locator('#secao-radar .level-input').inputValue(), 10) || 1;
  await expect.poll(() => pv(page)).toBe(pv0 + 8 + 2 * nv);

  // Sobe o nível: Calejado acompanha (+2 por nível). A base também muda, então comparo só a diferença do bônus.
  await nivel(page, nv + 3);
  await page.waitForTimeout(1500);
  const comPoderes = await pv(page);
  await page.locator('.powers-container .card-power', { has: page.locator('input[value="Calejado"]') })
    .locator('.btn-remove-power').click();
  await expect.poll(() => pv(page)).toBe(comPoderes - 2 * (nv + 3));
});

test('Volátil na besta: vida da besta sobe por nível e volta ao remover', async ({ page }) => {
  await abrirFicha(page, 'Passivas Besta');
  await definir(page, 'classe-nome', 'Treinador');
  await page.locator('#tabs li[data-tab="besta"]').click();
  await page.click('#besta-add-new');
  const inst = page.locator('#tab-besta .besta-instance');
  await expect(inst).toHaveCount(1);
  const vida = async () => parseInt(await inst.locator('.besta-pm-max-display').inputValue(), 10);
  const v0 = await vida();

  await inst.locator('.besta-expand-btn').first().click().catch(() => {});
  const busca = inst.locator('[data-aspects-search]');
  await busca.fill('Volátil II');
  await inst.locator('[data-aspects-searcher] [data-besta-add="aspecto-search"]').click();
  await expect.poll(vida).toBe(v0 + 3);

  const nivelBesta = inst.locator('.level-input');
  await nivelBesta.evaluate((e) => {
    e.value = '4';
    e.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const comAspecto = await vida();
  await inst.locator('.besta-del-bio').first().click();
  await expect.poll(vida).toBe(comAspecto - 3 * 4);
});

const irPara = async (page, aba) => {
  await page.locator(`.sidebar [data-tab="${aba}"]`).click();
  await expect(page.locator(`#tab-${aba}`)).toBeVisible();
};

const defesa = async (page) => parseInt(await page.locator('[data-field="defesa"]').inputValue(), 10);
const invTotal = async (page) => parseInt(await page.locator('[data-field="inv-total"]').inputValue(), 10);

test('perícia, atributo, grau e item equipado mexem na ficha', async ({ page }) => {
  await abrirFicha(page, 'Passivas Perícia');
  await definir(page, 'classe-nome', 'Coração');
  await expect.poll(() => pv(page), { timeout: 10_000 }).toBeGreaterThan(0);
  const def0 = await defesa(page);
  const inv0 = await invTotal(page);

  // Sorte da Deusa: +1 em todas as perícias
  await adicionarPoder(page, 'Sorte da Deusa');
  await irPara(page, 'pericias');
  await expect(page.locator('#skill-tbody tr[data-idx="0"] .pericia-auto')).toHaveText('+1');
  await expect(page.locator('#skill-tbody tr[data-idx="0"] .pericia-total')).toContainText('+1');

  // Atributo Extra com escolha DES: Defesa +1
  await adicionarPoder(page, 'Atributo Extra');
  const cartao = (nome) => page.locator('.powers-container .card-power', { has: page.locator(`.power-name-input[value="${nome}"]`) });
  const escolhaAttr = cartao('Atributo Extra').locator('.power-escolha');
  await expect(escolhaAttr).toBeVisible();
  await escolhaAttr.selectOption('DES');
  await expect.poll(() => defesa(page)).toBe(def0 + 1);

  // Treinamento de Perícia: grau grátis em Lutar (aparece como "grau +1")
  await adicionarPoder(page, 'Treinamento de Perícia');
  await cartao('Treinamento de Perícia').locator('.power-escolha').selectOption('Lutar');
  await irPara(page, 'pericias');
  await expect(page.locator('#skill-tbody tr[data-idx="0"] .pericia-auto')).toContainText('grau +1');

  // Mochilão equipado: inventário +5
  await irPara(page, 'inventario');
  await page.locator('.item-searchbox input').fill('Mochilão');
  await page.click('#btn-add-item');
  const item = page.locator('.items-container .item-card').last();
  await item.locator('.btn-item-minimize').click().catch(() => {});
  const cb = item.locator('.item-equipado');
  await expect(cb).toBeAttached();
  await cb.check({ force: true });
  await expect.poll(() => invTotal(page)).toBe(inv0 + 5);
  await cb.uncheck({ force: true });
  await expect.poll(() => invTotal(page)).toBe(inv0);
});

test('escolhas e itens equipados voltam iguais depois de salvar e recarregar, sem somar em dobro', async ({ page }) => {
  await abrirFicha(page, 'Passivas Salvar');
  await definir(page, 'classe-nome', 'Coração');
  await expect.poll(() => pv(page), { timeout: 10_000 }).toBeGreaterThan(0);
  const def0 = await defesa(page);
  const inv0 = await invTotal(page);

  await adicionarPoder(page, 'Atributo Extra');
  const cartao = page.locator('.powers-container .card-power', { has: page.locator('.power-name-input[value="Atributo Extra"]') });
  await cartao.locator('.power-escolha').selectOption('DES');
  await expect.poll(() => defesa(page)).toBe(def0 + 1);

  await irPara(page, 'inventario');
  await page.locator('.item-searchbox input').fill('Mochilão');
  await page.click('#btn-add-item');
  await page.locator('.items-container .item-card .btn-item-minimize').click();
  await page.locator('.items-container .item-card .item-equipado').check();
  await expect.poll(() => invTotal(page)).toBe(inv0 + 5);

  await page.evaluate(() => document.getElementById('manual-save').click());
  await expect(page.locator('#saved')).toBeVisible();
  await page.reload();
  await expect(page.locator('input[data-field="pv-total"][data-calculado]')).toHaveCount(1);
  await page.waitForTimeout(2500);

  await expect.poll(() => defesa(page)).toBe(def0 + 1);
  await expect.poll(() => invTotal(page)).toBe(inv0 + 5);
  await page.locator('.sidebar [data-tab="habilidades"]').click();
  await expect(page.locator('.power-escolha')).toHaveValue('DES');
  await irPara(page, 'inventario');
  await expect(page.locator('.items-container .item-equipado')).toBeChecked();
});

test('painel de incrementos: mostra as linhas do poder no modo Regras e o texto fica claro no papel escuro', async ({ page }) => {
  await abrirFicha(page, 'Passivas Painel');
  await definir(page, 'classe-nome', 'Coração');
  await expect.poll(() => pv(page), { timeout: 10_000 }).toBeGreaterThan(0);
  const painel = page.locator('#incr-panel, .incr-panel').first();
  await expect(painel).toBeHidden();

  await adicionarPoder(page, 'A Prática Supera a Teoria');
  await expect(painel).toBeVisible();
  await expect(painel.locator('.incr-row')).toHaveCount(2);
  await expect(painel.locator('.incr-row__tag').first()).toHaveText('A Prática Supera a Teoria');

  // Papel escuro: --p0 vira quase preto. O texto do painel (fundo de couro) não pode seguir.
  await page.evaluate(() => {
    document.body.classList.add('theme-dark-paper');
    document.documentElement.style.setProperty('--p0', 'hsl(30,40%,10%)');
  });
  const claro = await painel.locator('.incr-row__valor').first().evaluate((el) => {
    const [r, g, b] = getComputedStyle(el).color.match(/\d+(\.\d+)?/g).map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  });
  expect(claro).toBeGreaterThan(0.6);

  // Remover o poder tira as linhas e esconde o painel no modo Regras.
  await page.locator('.sidebar [data-tab="habilidades"]').click();
  await page.locator('.powers-container .btn-remove-power').first().click();
  await expect(painel).toBeHidden();
});
