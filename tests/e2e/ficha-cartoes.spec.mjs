// Cartões da aba Combate (sem "x", Excluir dentro do aberto, Desfazer) e
// cartões que lembram aberto/fechado (itens, magias, poderes, combate), por pessoa.
import { test, expect, novaPessoa } from './fixtures.mjs';
import { criarConta, criarFicha, novoEmail } from './helpers.mjs';

async function abrirFichaNova(page, nome, email = novoEmail()) {
  await criarConta(page, email);
  await criarFicha(page, nome);
  await page.getByRole('button', { name: 'Abrir' }).click();
  await page.waitForURL(/\/ficha\?sheetId=/);
  await esperarFicha(page);
  return email;
}

async function esperarFicha(page) {
  await expect(page.locator('input[data-field="personagem-nome"]')).toBeVisible();
  // Espera a ficha terminar de carregar: os módulos de combate criam o ataque "Porrada".
  await expect(page.locator('#ataques-container .combat-card--ataque').first()).toBeAttached({ timeout: 15_000 });
  await page.waitForTimeout(500);
}

async function irPara(page, aba) {
  await page.locator(`.sidebar [data-tab="${aba}"]`).click();
  await expect(page.locator(`#tab-${aba}`)).toBeVisible();
}

async function salvar(page) {
  // Clique por script: outro botão do topo pode cobrir o de salvar enquanto o cabeçalho é redesenhado.
  await page.evaluate(() => document.getElementById('manual-save').click());
  await expect(page.locator('#saved')).toBeVisible();
}

async function recarregar(page) {
  await page.reload();
  await esperarFicha(page);
}

// Lê o que está gravado de verdade no emulador do Firestore (token "owner" do emulador).
async function cartoesGravados(page) {
  const id = new URL(page.url()).searchParams.get('sheetId');
  const r = await fetch(`http://127.0.0.1:8080/v1/projects/demo-odisseia/databases/(default)/documents/sheets/${id}`,
    { headers: { Authorization: 'Bearer owner' } });
  const doc = await r.json();
  return JSON.stringify(doc.fields?.data?.mapValue?.fields?.cartoesAbertos ?? {});
}

// O salvamento silencioso acontece sozinho (até ~30 s se já havia um autosave agendado).
async function esperarGravar(page, trecho) {
  await expect.poll(() => cartoesGravados(page), { timeout: 45_000, intervals: [1000] }).toContain(trecho);
}

const naoSalvoVisivel = (page) => page.locator('#non-saved').isVisible();

// Cria um cartão de cada tipo de combate (fechados) e devolve os locators.
async function criarCartoesDeCombate(page) {
  await irPara(page, 'combate');
  await page.click('#add-ataque-btn');
  await page.click('#add-reacao-btn');
  await page.click('#add-bonus-onus-btn');
  await page.click('#add-condicao-btn');
}

test.describe('Aba Combate', () => {
  test('cartão vizinho não estica quando um abre; fechado não tem "x"', async ({ page }) => {
    await abrirFichaNova(page, 'Combate1');
    await irPara(page, 'combate');
    await page.click('#add-ataque-btn');
    const cartoes = page.locator('#ataques-container .combat-card--ataque');
    await expect(cartoes).toHaveCount(2);
    const [a, b] = [cartoes.nth(0), cartoes.nth(1)];

    const alturaAntes = (await b.boundingBox()).height;
    // Os dois estão lado a lado (duas colunas).
    expect(Math.abs((await a.boundingBox()).y - (await b.boundingBox()).y)).toBeLessThan(2);
    await a.locator('.combat-card__chevron').click();
    await expect(a.locator('.combat-card__body')).toBeVisible();
    const alturaDepois = (await b.boundingBox()).height;
    expect(alturaDepois).toBe(alturaAntes);
    expect((await a.boundingBox()).height).toBeGreaterThan(alturaAntes + 50);

    // Cartão fechado: nenhum botão de excluir visível
    await expect(b.locator('.combat-card__excluir')).toBeHidden();
    await expect(b.getByText('x', { exact: true })).toHaveCount(0);
    await expect(page.locator('.combat-card__delete-btn')).toHaveCount(0);
  });

  test('Excluir fica dentro do cartão aberto e Desfazer devolve o mesmo cartão na mesma posição', async ({ page }) => {
    await abrirFichaNova(page, 'Combate2');
    await irPara(page, 'combate');
    await page.click('#add-ataque-btn');
    await page.click('#add-ataque-btn');
    const lista = page.locator('#ataques-container .combat-card--ataque');
    await expect(lista).toHaveCount(3);

    const meio = lista.nth(1);
    await meio.locator('.combat-card__chevron').click();
    await meio.locator('input.combat-card__name-input').fill('Espada do meio');
    await meio.locator('.ataque-dano').fill('2d6+3');
    const idMeio = await meio.getAttribute('data-ataque-id');

    await meio.getByRole('button', { name: /Excluir ataque/ }).click();
    await expect(lista).toHaveCount(2);
    const toast = page.locator('.card-undo-toast');
    await expect(toast).toContainText('Ataque excluído');
    await toast.getByRole('button', { name: 'Desfazer' }).click();

    await expect(lista).toHaveCount(3);
    const volta = lista.nth(1);
    expect(await volta.getAttribute('data-ataque-id')).toBe(idMeio);
    await expect(volta.locator('input.combat-card__name-input')).toHaveValue('Espada do meio');
    await expect(volta.locator('.ataque-dano')).toHaveValue('2d6+3');
    await expect(volta.locator('.combat-card__body')).toBeVisible(); // continua aberto
  });

  test('Excluir + Desfazer em reação, bônus/ônus e condição', async ({ page }) => {
    await abrirFichaNova(page, 'Combate3');
    await criarCartoesDeCombate(page);
    const casos = [
      ['#reacoes-container .combat-card--reacao:not([data-oportunidade])', /Excluir reação/, 'Reação excluída', true],
      ['#bonus-onus-container .combat-card--bonus', /Excluir bônus ou ônus/, 'Bônus/Ônus excluído', true],
      ['#condicoes-container .combat-card--condicao', /Excluir condição/, 'Condição excluída', false],
    ];
    for (const [seletor, nome, aviso, abre] of casos) {
      const cartoes = page.locator(seletor);
      await expect(cartoes).toHaveCount(1);
      const c = cartoes.first();
      if (abre) await c.locator('.combat-card__chevron').click();
      await c.getByRole('button', { name: nome }).click();
      await expect(cartoes).toHaveCount(0);
      await expect(page.locator('.card-undo-toast')).toContainText(aviso);
      await page.locator('.card-undo-toast').getByRole('button', { name: 'Desfazer' }).click();
      await expect(cartoes).toHaveCount(1);
    }
  });

  test('o botão dos efeitos de condição diz o que faz', async ({ page }) => {
    await abrirFichaNova(page, 'Combate4');
    await irPara(page, 'combate');
    const botao = page.locator('#btn-toggle-condition-effects');
    await expect(botao).toContainText('Efeitos');
    await expect(botao).toHaveAttribute('aria-label', /efeitos visuais de condição/i);
    await expect(botao).toHaveAttribute('title', /Efeitos visuais de condição: ligado/);
    await botao.click();
    await expect(botao).toHaveAttribute('title', /desligado/);
    await expect(botao).toHaveAttribute('aria-pressed', 'false');
  });

  test('botões Adicionar têm ícone +, texto e tamanho confortável', async ({ page }) => {
    await abrirFichaNova(page, 'Combate5');
    await irPara(page, 'combate');
    for (const [id, texto] of [['add-ataque-btn', 'Adicionar Ataque'], ['add-reacao-btn', 'Adicionar Reação'],
      ['add-bonus-onus-btn', 'Adicionar Bônus'], ['add-condicao-btn', 'Adicionar Condição']]) {
      const b = page.locator('#' + id);
      await expect(b).toContainText(texto);
      await expect(b.locator('.material-symbols-outlined')).toHaveText('add');
      expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(38);
    }
  });

  test('texto dos dados do ataque aberto é maior que o resto', async ({ page }) => {
    await abrirFichaNova(page, 'Combate6');
    await irPara(page, 'combate');
    const c = page.locator('#ataques-container .combat-card--ataque').first();
    await c.locator('.combat-card__chevron').click();
    const tamanho = (loc) => loc.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(await tamanho(c.locator('.ataque-dano'))).toBeGreaterThanOrEqual(16);
    expect(await tamanho(c.locator('[data-field^="ataque-ameaca-"]'))).toBeGreaterThanOrEqual(16);
    expect(await tamanho(c.locator('.combat-label').first())).toBeLessThanOrEqual(9);
  });
});

test.describe('Cartões lembram aberto/fechado', () => {
  test.setTimeout(120_000);

  test('abrir e fechar não acende "não salvo"', async ({ page }) => {
    await abrirFichaNova(page, 'Lembra1');
    await irPara(page, 'combate');
    await page.click('#add-ataque-btn');
    await salvar(page);
    await expect(page.locator('#non-saved')).toBeHidden();

    const c = page.locator('#ataques-container .combat-card--ataque').nth(1);
    await c.locator('.combat-card__chevron').click();
    await c.locator('.combat-card__chevron').click();
    await c.locator('.combat-card__chevron').click();
    await page.waitForTimeout(1200);
    expect(await naoSalvoVisivel(page)).toBe(false);
  });

  test('persistência de combate, magia, poder e item depois de salvar e recarregar', async ({ page }) => {
    await abrirFichaNova(page, 'Lembra2');

    // Combate: ataque, reação, bônus (abrimos) e um segundo ataque (fica fechado)
    await irPara(page, 'combate');
    await page.click('#add-ataque-btn');
    await page.click('#add-reacao-btn');
    await page.click('#add-bonus-onus-btn');
    const ataques = page.locator('#ataques-container .combat-card--ataque');
    await ataques.nth(0).locator('.combat-card__chevron').click(); // Porrada aberta
    await page.locator('#reacoes-container .combat-card--reacao:not([data-oportunidade])').locator('.combat-card__chevron').click();
    await page.locator('#bonus-onus-container .combat-card--bonus .combat-card__chevron').click();

    // Poder (nasce aberto): fechamos um, deixamos outro aberto
    await irPara(page, 'habilidades');
    await page.click('#btn-add-power');
    await page.click('#btn-add-power');
    const poderes = page.locator('.powers-container .card-power');
    await expect(poderes).toHaveCount(2);
    await poderes.nth(0).locator('.btn-summarize').click(); // fecha o primeiro

    // Magia (nasce fechada): abrimos
    await irPara(page, 'magias');
    await page.locator('.magic-searchbox input').fill('Minha magia');
    await page.click('#btn-add-magic');
    const magias = page.locator('.magic-card');
    await expect(magias).toHaveCount(1);
    await magias.first().locator('.btn-magic-minimize').click(); // abre

    // Item (nasce fechado): abrimos um, outro fica fechado
    await irPara(page, 'inventario');
    await page.locator('.item-searchbox input').fill('Corda');
    await page.click('#btn-add-item');
    await page.locator('.item-searchbox input').fill('Tocha');
    await page.click('#btn-add-item');
    const itens = page.locator('.item-card');
    await expect(itens).toHaveCount(2);
    await itens.nth(0).locator('.btn-item-minimize').click(); // abre o primeiro

    // O indicador "não salvo" acende por causa dos cadastros; salvamos e recarregamos.
    await salvar(page);
    await recarregar(page);

    await irPara(page, 'combate');
    await expect(ataques.nth(0).locator('.combat-card__body')).toBeVisible();
    await expect(ataques.nth(1).locator('.combat-card__body')).toBeHidden();
    await expect(page.locator('#reacoes-container .combat-card--reacao:not([data-oportunidade]) .combat-card__body')).toBeVisible();
    await expect(page.locator('#bonus-onus-container .combat-card--bonus .combat-card__body')).toBeVisible();

    await irPara(page, 'habilidades');
    await expect(poderes.nth(0).locator('.body-power')).toBeHidden();
    await expect(poderes.nth(1).locator('.body-power')).toBeVisible();

    await irPara(page, 'magias');
    await expect(page.locator('.magic-card .magic-card-body').first()).toBeVisible();

    await irPara(page, 'inventario');
    const nomes = await itens.locator('.item-nome-input').evaluateAll((els) => els.map((e) => e.value));
    const iCorda = nomes.indexOf('Corda');
    const iTocha = nomes.indexOf('Tocha');
    await expect(itens.nth(iCorda).locator('.item-card-body')).toBeVisible();
    await expect(itens.nth(iTocha).locator('.item-card-body')).toBeHidden();

    // Fechar também é lembrado, e não acende "não salvo".
    await irPara(page, 'combate');
    await ataques.nth(0).locator('.combat-card__chevron').click();
    await irPara(page, 'magias');
    await page.locator('.magic-card .btn-magic-minimize').first().click();
    expect(await naoSalvoVisivel(page)).toBe(false);
  });

  test('o estado fechado sobrevive ao recarregar sem salvar à mão (salvamento silencioso)', async ({ page }) => {
    await abrirFichaNova(page, 'Lembra3');
    await irPara(page, 'combate');
    await page.click('#add-ataque-btn');
    await salvar(page);
    const c = page.locator('#ataques-container .combat-card--ataque').nth(1);
    await c.locator('.combat-card__chevron').click(); // abre, sem editar nada
    // O main.js grava em silêncio depois de uma pausa, sem acender "não salvo".
    expect(await naoSalvoVisivel(page)).toBe(false);
    await esperarGravar(page, 'ataque:');
    expect(await naoSalvoVisivel(page)).toBe(false);
    await recarregar(page);
    await irPara(page, 'combate');
    await expect(page.locator('#ataques-container .combat-card--ataque').nth(1).locator('.combat-card__body')).toBeVisible();
  });

  test('outra pessoa na mesma ficha tem os seus próprios cartões abertos', async ({ browser }) => {
    const dono = await novaPessoa(browser);
    await abrirFichaNova(dono, 'Compartilhada', novoEmail('dono'));
    const url = dono.url();

    // A segunda pessoa precisa ter conta antes de receber a ficha.
    const outra = await novaPessoa(browser);
    const emailOutra = novoEmail('outra');
    await criarConta(outra, emailOutra);

    // O dono abre o ataque e salva; depois divide a ficha com permissão de edição.
    await irPara(dono, 'combate');
    await dono.locator('#ataques-container .combat-card--ataque').first().locator('.combat-card__chevron').click();
    await dono.click('#add-ataque-btn'); // algo para salvar
    await salvar(dono);
    await dono.evaluate(() => document.getElementById('share-btn')?.click());
    await dono.fill('#share-email-input', emailOutra);
    await dono.selectOption('#share-perm-select', 'edit');
    await dono.click('#share-add-btn');
    await expect(dono.locator('#share-users-list')).toContainText(emailOutra);

    await outra.goto(url);
    await esperarFicha(outra);
    await irPara(outra, 'combate');
    // A outra pessoa vê os cartões fechados, mesmo com o dono tendo salvo um aberto.
    await expect(outra.locator('#ataques-container .combat-card--ataque').first().locator('.combat-card__body')).toBeHidden();

    // Ela abre o outro cartão e o dono não é afetado depois de recarregar.
    await outra.locator('#ataques-container .combat-card--ataque').nth(1).locator('.combat-card__chevron').click();
    // Gravado: agora a ficha guarda os cartões de duas pessoas (a do dono e a dela).
    await expect.poll(async () => Object.keys(JSON.parse(await cartoesGravados(outra)).mapValue?.fields ?? {}).length,
      { timeout: 45_000, intervals: [1000] }).toBe(2);
    await recarregar(dono);
    await irPara(dono, 'combate');
    await expect(dono.locator('#ataques-container .combat-card--ataque').first().locator('.combat-card__body')).toBeVisible();
    await expect(dono.locator('#ataques-container .combat-card--ataque').nth(1).locator('.combat-card__body')).toBeHidden();

    // E a outra pessoa continua com o seu estado depois de recarregar.
    await recarregar(outra);
    await irPara(outra, 'combate');
    await expect(outra.locator('#ataques-container .combat-card--ataque').nth(1).locator('.combat-card__body')).toBeVisible();
    await expect(outra.locator('#ataques-container .combat-card--ataque').first().locator('.combat-card__body')).toBeHidden();
  });
});
