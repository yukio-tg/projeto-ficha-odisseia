import { test, expect } from './fixtures.mjs';
import { criarConta, criarFicha, novoEmail } from './helpers.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PRINTS = join(process.env.KIROCREW_SCRATCH || '/tmp', 'prints-besta');
mkdirSync(PRINTS, { recursive: true });

const ABA = '#tabs li[data-tab="besta"]';

async function abrirFicha(page, nome, viewport = { width: 1440, height: 900 }) {
  await page.setViewportSize(viewport);
  await criarConta(page, novoEmail('besta'));
  await criarFicha(page, nome);
  await page.getByRole('button', { name: 'Abrir' }).click();
  await page.waitForURL(/\/ficha\?sheetId=/);
  await expect(page.locator('input[data-field="personagem-nome"]')).toHaveValue(nome);
  await expect(page.locator('#tab-besta .besta-add-bar')).toBeAttached();
}

/** Escreve num campo da ficha mesmo que a aba dele esteja escondida. */
const definir = (page, campo, valor) => page.evaluate(([c, v]) => {
  const el = document.querySelector(`[data-field="${c}"]`);
  el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, [campo, valor]);

/** Vira Treinador, abre a aba Besta e cria uma besta. */
async function criarBesta(page) {
  await definir(page, 'classe-nome', 'Treinador');
  await irParaBesta(page);
  await page.click('#besta-add-new');
  await expect(page.locator('#tab-besta .besta-instance')).toHaveCount(1);
}

/** Abre a aba Besta: no computador pela barra, no celular pelo menu "Mais". */
async function irParaBesta(page) {
  if ((page.viewportSize()?.width ?? 1440) <= 600) {
    await page.click('#mobile-more-btn');
    await page.locator('#mobile-more-sheet [data-tab="besta"]').click();
  } else {
    await page.locator(ABA).click();
  }
  await expect(page.locator('#tab-besta')).toBeVisible();
}

// Abrir/fechar cartão não acende "não salvo"; o estado vai no próximo salvamento
// (gravação silenciosa após 4 s, ou o autosave de 30 s se já houver um agendado). Espera os dois.
const esperarGravacaoSilenciosa = (page) => page.waitForTimeout(36_000);

const aba = (page) => page.locator('#tab-besta .besta-instance');
const salvar = async (page) => {
  // clique direto: no topo em obras, o botão Grimório (de outra tarefa) cobre o de salvar
  await page.evaluate(() => document.getElementById('manual-save').click());
  await expect(page.locator('#saved')).toBeVisible();
};

async function escolherTema(page, nome) {
  await page.click('#theme-btn');
  await page.locator('#cp-grid .theme-card', { has: page.locator('.theme-name', { hasText: new RegExp(`^${nome}$`) }) }).click();
  await page.keyboard.press('Escape');
}

/** Treina perícias e preenche atributos de uma besta já criada. */
async function preencherBesta(page) {
  const inst = aba(page);
  await inst.locator('input[data-besta-field="nome"]').fill('Aldric');
  const attrs = inst.locator('.radar-rpg .attr-input');
  for (const [i, v] of [4, 3, 3, 1, 1, 2].entries()) {
    await attrs.nth(i).fill(String(v));
  }
  await inst.locator('.besta-expand-btn').click(); // abre para treinar
  const treinar = async (nome, nivel, bonus) => {
    const linha = inst.locator(`tr[data-skill-row="${nome}"]`);
    await linha.locator(`.prof-pip[data-level="${nivel}"]`).click();
    if (bonus) await linha.locator('.besta-pericia-bonus').fill(bonus);
  };
  await treinar('Lutar', 2, '+1');
  await treinar('Quietude', 2);
  await treinar('Reflexos', 1);
  await treinar('Esforço', 1);
  await inst.locator('.besta-expand-btn').click(); // recolhe
}

async function aspectosDeExemplo(page) {
  const inst = aba(page);
  await inst.locator('[data-besta-add-hab="bio"]').click();
  await inst.locator('.besta-hab-card--bio .besta-hab-nome').last().fill('Garras');
  await inst.locator('[data-besta-add-hab="treino"]').click();
  await inst.locator('.besta-hab-card--treino .besta-hab-nome').last().fill('Imparável');
  await inst.locator('.besta-treino-pt-input').last().fill('5');
  await inst.locator('[data-besta-add="indiv"]').click();
  await inst.locator('.besta-indiv-titulo').last().fill('Pelagem prateada');
  // Tira o foco: o "change" do último campo só dispara ao sair dele.
  await page.evaluate(() => document.activeElement?.blur());
}

test('a aba Besta fica escondida sem Treinador ou Vínculo e aparece com qualquer um dos dois', async ({ page }) => {
  await abrirFicha(page, 'Visivel');
  await expect(page.locator(ABA)).toBeHidden();

  await definir(page, 'classe-nome', 'Guerreiro');
  await expect(page.locator(ABA)).toBeHidden();

  await definir(page, 'classe-nome', 'Treinador');
  await expect(page.locator(ABA)).toBeVisible();
  await definir(page, 'classe-nome', 'Mago');
  await expect(page.locator(ABA)).toBeHidden();

  await definir(page, 'besta-nome', 'Lobo');
  await expect(page.locator(ABA)).toBeVisible();
  await definir(page, 'besta-nome', 'Nenhum');
  await expect(page.locator(ABA)).toBeHidden();
  await definir(page, 'besta-nome', '');
  await expect(page.locator(ABA)).toBeHidden();
});

for (const [rotulo, tela] of [['computador', { width: 1440, height: 900 }], ['celular', { width: 390, height: 800 }]]) {
  test(`abrir e fechar as perícias não muda o que está abaixo (${rotulo})`, async ({ page }) => {
    await abrirFicha(page, 'Janela', tela);
    await criarBesta(page);
    const inst = aba(page);
    await preencherBesta(page);

    const abaixo = inst.locator('.besta-combat-section');
    const janela = inst.locator('.besta-skills-table-wrap');
    const y0 = (await abaixo.boundingBox()).y;
    const h0 = (await janela.boundingBox()).height;

    await inst.locator('.besta-expand-btn').click();
    await expect(inst.locator('.besta-skills-section')).toHaveClass(/is-open/);
    await expect(inst.locator('tr[data-skill-row="Trabalho"]')).toBeVisible();
    expect((await abaixo.boundingBox()).y).toBe(y0);
    expect((await janela.boundingBox()).height).toBe(h0);

    await inst.locator('.besta-expand-btn').click();
    await expect(inst.locator('tr[data-skill-row="Trabalho"]')).toBeHidden();
    await expect(inst.locator('tr[data-skill-row="Lutar"]')).toBeVisible();
    expect((await abaixo.boundingBox()).y).toBe(y0);
    expect((await janela.boundingBox()).height).toBe(h0);

    if (rotulo === 'computador') {
      // A janela ocupa o vazio ao lado do radar e rola por dentro (cerca de 7 linhas visíveis ao abrir).
      const radar = await inst.locator('.radar-column').boundingBox();
      const jan = await janela.boundingBox();
      expect(jan.x + jan.width).toBeLessThan(radar.x);
      expect(jan.y + jan.height).toBeLessThanOrEqual(radar.y + radar.height + 1);
      await inst.locator('.besta-expand-btn').click();
      expect(await janela.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    } else {
      // Os círculos de treino cabem na largura do celular.
      const pip = await inst.locator('tr[data-skill-row="Lutar"] .prof-pip').first().boundingBox();
      expect(pip.width).toBeLessThanOrEqual(30);
      const sem = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      expect(sem).toBe(true);
      const jan = await janela.boundingBox();
      expect(await janela.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(jan.width).toBeLessThan(390);
    }
  });
}

test('a tabela de perícias fica oculta sem nada treinado e aparece quando há treino ou bônus', async ({ page }) => {
  await abrirFicha(page, 'Tabela');
  await criarBesta(page);
  const inst = aba(page);
  const secao = inst.locator('.besta-skills-section');
  const tabela = inst.locator('.besta-skill-table');

  await expect(secao).toHaveClass(/is-vazio/);
  await expect(tabela).toBeHidden();
  await expect(inst.locator('.besta-skills-hint')).toContainText('Nenhuma perícia treinada');

  await inst.locator('.besta-expand-btn').click(); // abrir mostra a lista completa para treinar
  await expect(tabela).toBeVisible();
  await expect(inst.locator('tr[data-skill-row]:visible')).toHaveCount(16);
  await inst.locator('tr[data-skill-row="Lutar"] .prof-pip[data-level="1"]').click();
  await inst.locator('.besta-expand-btn').click();
  await expect(secao).not.toHaveClass(/is-vazio/);
  await expect(tabela).toBeVisible();
  await expect(inst.locator('tr[data-skill-row]:visible')).toHaveCount(1);

  // Só bônus também conta como relevante.
  await inst.locator('.besta-expand-btn').click();
  await inst.locator('tr[data-skill-row="Lutar"] .prof-pip[data-level="1"]').click(); // zera o treino
  await inst.locator('.besta-expand-btn').click();
  await expect(secao).toHaveClass(/is-vazio/);
  await inst.locator('.besta-expand-btn').click();
  await inst.locator('tr[data-skill-row="Reflexos"] .besta-pericia-bonus').fill('+2');
  await inst.locator('.besta-expand-btn').click();
  await expect(tabela).toBeVisible();
  await expect(inst.locator('tr[data-skill-row]:visible')).toHaveCount(1);
});

test('os títulos de seção da Besta têm o mesmo alinhamento dos da aba Combate', async ({ page }) => {
  await abrirFicha(page, 'Titulos');
  await criarBesta(page);
  // Quanto o texto do título está deslocado do centro do próprio título.
  const desvio = (sel) => page.locator(sel).evaluateAll(els => els.map(el => {
    const r = document.createRange();
    r.selectNodeContents(el);
    const t = r.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    return { texto: el.textContent.trim(), dx: Math.abs((t.left + t.width / 2) - (b.left + b.width / 2)) };
  }));

  await page.locator('#tabs li[data-tab="combate"]').click();
  const combate = await desvio('#tab-combate .sh');
  expect(combate.length).toBeGreaterThan(0);
  for (const h of combate) expect(h.dx, h.texto).toBeLessThan(3);

  await page.locator(ABA).click();
  const besta = await desvio('#tab-besta .sh');
  expect(besta.map(h => h.texto)).toEqual(expect.arrayContaining(['Vitalidade & Atributos', 'Ataques', 'Reações Complexas', 'Aspectos']));
  for (const h of besta) expect(h.dx, h.texto).toBeLessThan(3);
  // Nenhum título à esquerda sobrou.
  await expect(page.locator('#tab-besta .besta-sh')).toHaveCount(0);
  // E a Besta não ganhou barra de vida.
  await expect(page.locator('#tab-besta .vital-card-vida, #tab-besta .vital-bar-fill.vida')).toHaveCount(0);
  await expect(page.locator('#tab-besta .vital-card')).toHaveCount(1);
});

test('aspectos: cartões dobráveis lembram aberto/fechado depois de recarregar, sem acender "não salvo"', async ({ page }) => {
  test.setTimeout(150_000);
  await abrirFicha(page, 'Aspectos');
  await criarBesta(page);
  const inst = aba(page);
  await aspectosDeExemplo(page);

  const cartao = (t) => inst.locator(`[data-asp-card="${t}"]`);
  const corpo = (t) => cartao(t).locator('.combat-card__body');
  for (const t of ['bio', 'treino', 'indiv']) await expect(corpo(t)).toBeVisible();

  await salvar(page);
  // Fechar um cartão não conta como alteração da ficha.
  await expect(page.locator('#non-saved')).toBeHidden();
  await cartao('treino').locator('.combat-card__header').click();
  await expect(corpo('treino')).toBeHidden();
  await page.waitForTimeout(600);
  await expect(page.locator('#non-saved')).toBeHidden();

  const idBesta = await inst.getAttribute('data-besta-id');
  await esperarGravacaoSilenciosa(page);
  await expect(page.locator('#non-saved')).toBeHidden();

  await page.reload();
  await expect(page.locator('input[data-field="personagem-nome"]')).toHaveValue('Aspectos');
  await irParaBesta(page);
  await expect(aba(page)).toHaveCount(1);
  await expect(aba(page)).toHaveAttribute('data-besta-id', idBesta);
  await expect(corpo('treino')).toBeHidden();
  await expect(corpo('bio')).toBeVisible();
  await expect(corpo('indiv')).toBeVisible();
  await expect(inst.locator('.besta-hab-card--treino .besta-hab-nome')).toHaveValue('Imparável');

  // Abre de novo, recarrega e continua aberto.
  await cartao('treino').locator('.combat-card__header').click();
  await cartao('bio').locator('.combat-card__header').click();
  await esperarGravacaoSilenciosa(page);
  await page.reload();
  await expect(page.locator('input[data-field="personagem-nome"]')).toHaveValue('Aspectos');
  await irParaBesta(page);
  await expect(corpo('treino')).toBeVisible();
  await expect(corpo('bio')).toBeHidden();
});

test('aspectos: contador biológico, contador de treino e busca', async ({ page }) => {
  await abrirFicha(page, 'Contador');
  await criarBesta(page);
  const inst = aba(page);
  const bio = inst.locator('[data-asp-card="bio"] .combat-card__header-summary');
  const treino = inst.locator('[data-asp-card="treino"] .combat-card__header-summary');

  await expect(bio).toContainText('0/6');
  await expect(treino).toContainText('0 PT');

  // Cada aspecto biológico vale o nível (I=1, II=2, III=3)
  await inst.locator('[data-besta-add-hab="bio"]').click();
  await expect(bio).toContainText('1/6');
  await inst.locator('.besta-hab-card--bio .besta-nivel-btn[data-nivel="III"]').last().click();
  await expect(bio).toContainText('3/6');
  await inst.locator('[data-besta-add-hab="bio"]').click();
  await inst.locator('.besta-hab-card--bio .besta-nivel-btn[data-nivel="III"]').last().click();
  await expect(bio).toContainText('6/6');
  await expect(inst.locator('.besta-bio-warn:visible')).toHaveCount(0);
  await inst.locator('[data-besta-add-hab="bio"]').click();
  await expect(bio).toContainText('7/6');
  await expect(inst.locator('[data-asp-card="bio"] .besta-bio-used')).toHaveCSS('color', /^rgb/);
  await expect(inst.locator('[data-asp-card="bio"] .besta-bio-warn')).toBeVisible();
  await inst.locator('.besta-hab-card--bio .besta-del-bio').last().click();
  await expect(bio).toContainText('6/6');

  // Treino em PT
  await inst.locator('[data-besta-add-hab="treino"]').click();
  await inst.locator('.besta-treino-pt-input').last().fill('4');
  await expect(treino).toContainText('4 PT');

  // Individuais: contagem simples
  const indiv = inst.locator('[data-asp-card="indiv"] .combat-card__header-summary');
  await expect(indiv).toHaveText('—');
  await inst.locator('[data-besta-add="indiv"]').click();
  await expect(indiv).toHaveText('1');

  // Busca: escolhe um aspecto do catálogo; cartão fechado reabre para mostrar o item novo
  await inst.locator('[data-asp-card="bio"] .combat-card__header').click();
  await expect(inst.locator('[data-asp-card="bio"] .combat-card__body')).toBeHidden();
  const busca = inst.locator('.besta-aspects-search-input');
  await busca.fill('Ferr');
  const itens = inst.locator('.besta-aspects-dropdown-item');
  await expect(itens.first()).toBeVisible();
  await itens.first().click();
  await expect(inst.locator('[data-asp-card="bio"] .combat-card__body')).toBeVisible();
  await expect(inst.locator('.besta-hab-card--bio .besta-hab-nome').last()).toHaveValue('Ferrão');
  await expect(bio).toContainText('7/6');
});

test('prints da aba Besta (1440 e 390, claro e escuro)', async ({ page }) => {
  test.setTimeout(240_000);
  await abrirFicha(page, 'Prints');
  await definir(page, 'classe-nome', 'Treinador');
  await irParaBesta(page);
  // Print só da aba (a página rola por dentro; o print de página inteira sai com a vinheta fixa por cima).
  const foto = async (nome) => {
    await page.waitForTimeout(250);
    await page.locator('#tab-besta').screenshot({
      path: join(PRINTS, `${nome}.png`),
      // o topo e a barra do celular são fixos e cobririam partes da aba no print rolado
      style: '.sheet-header, #mobile-tabs, .vinheta-livre, #global-effect-overlay, #dynamic-overlay { visibility: hidden !important; }',
    });
  };

  for (const [tela, vp] of [['1440', { width: 1440, height: 900 }], ['390', { width: 390, height: 800 }]]) {
    await page.setViewportSize(vp);
    if (tela === '390') await irParaBesta(page);
    for (const tema of ['claro', 'escuro']) {
      await escolherTema(page, tema === 'claro' ? 'Pergaminho clássico' : 'Tokyo Night');
      const p = `${tela}-${tema}`;
      if (tela === '1440' && tema === 'claro') {
        await foto(`sem-besta-${p}`);
        await page.click('#besta-add-new');
        await foto(`vazia-${p}`);
        await preencherBesta(page);
        await aspectosDeExemplo(page);
        await page.waitForTimeout(300);
      }
      const inst = aba(page);
      await foto(`preenchida-${p}`);
      await inst.locator('.besta-expand-btn').click();
      await foto(`pericias-abertas-${p}`);
      await inst.locator('.besta-expand-btn').click();
      for (const t of ['bio', 'treino', 'indiv']) {
        if (await inst.locator(`[data-asp-card="${t}"] .combat-card__body`).isHidden()) await inst.locator(`[data-asp-card="${t}"] .combat-card__header`).click();
      }
      await inst.locator('.besta-abilities-section').scrollIntoViewIfNeeded();
      await foto(`aspectos-abertos-${p}`);
      for (const t of ['bio', 'treino', 'indiv']) await inst.locator(`[data-asp-card="${t}"] .combat-card__header`).click();
      await foto(`aspectos-fechados-${p}`);
      for (const t of ['bio', 'treino', 'indiv']) await inst.locator(`[data-asp-card="${t}"] .combat-card__header`).click();
    }
  }
});
