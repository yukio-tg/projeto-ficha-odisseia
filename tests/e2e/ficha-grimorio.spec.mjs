// Grimório: painel lateral acoplado, abas, regras de acesso, claro/escuro e gaveta no celular.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from './fixtures.mjs';
import { criarConta, criarFicha, novoEmail } from './helpers.mjs';

const PRINTS = process.env.KIROCREW_SCRATCH ? join(process.env.KIROCREW_SCRATCH, 'prints-grimorio') : null;
if (PRINTS) mkdirSync(PRINTS, { recursive: true });

const painel = (page) => page.locator('#grimorio-panel');
const botao = (page) => page.locator('#grimorio-btn');
const aba = (page, nome) => painel(page).getByRole('tab', { name: nome });

async function abrirFicha(page, nome = 'Grim') {
  // Erros de script derrubam o teste; o desenho do radar com tamanho zero (fora do Grimório) é ignorado.
  const erros = [];
  page.on('pageerror', (e) => { if (!/createRadialGradient/.test(e.message)) erros.push(e.message); });
  page.erros = erros;
  await criarConta(page, novoEmail('grim'));
  await criarFicha(page, nome);
  await page.getByRole('button', { name: 'Abrir' }).click();
  await page.waitForURL(/\/ficha\?sheetId=/);
  await expect(page.locator('input[data-field="pv-total"][data-calculado]')).toHaveCount(1);
  await page.waitForTimeout(400);
}

/** Preenche um campo da ficha como o jogador (evento de entrada e de mudança). */
async function campo(page, nomeCampo, valor) {
  const el = page.locator(`[data-field="${nomeCampo}"]`);
  if ((await el.evaluate((e) => e.tagName)) === 'SELECT') await el.selectOption(valor);
  else await el.evaluate((e, v) => {
    e.value = v;
    e.dispatchEvent(new Event('input', { bubbles: true }));
    e.dispatchEvent(new Event('change', { bubbles: true }));
  }, String(valor));
}

/** Dá PT, LA e inventário folgados (os campos são editáveis no modo Livre). */
async function darRecursos(page) {
  await page.locator('#autocalc-switch').click();
  await campo(page, 'pt-total', 40);
  await campo(page, 'la-total', 12);
  await campo(page, 'inv-total', 30);
  await page.locator('#autocalc-switch').click();
}

async function nivel(page, n) {
  await page.locator('#secao-radar .level-input').evaluate((e, v) => {
    e.value = v;
    e.dispatchEvent(new Event('input', { bubbles: true }));
    e.dispatchEvent(new Event('change', { bubbles: true }));
  }, String(n));
}

async function abrirGrimorio(page) {
  await botao(page).click();
  await expect(painel(page)).toHaveClass(/is-aberto/);
  await page.waitForTimeout(450);
}

/** Escolhe um tema pronto no painel de cores (slug) ou o primeiro tema claro (sem slug). */
async function escolherTema(page, slug) {
  await page.locator('#theme-btn').click();
  const cartao = slug ? page.locator(`#cp-grid .theme-card[data-slug="${slug}"]`) : page.locator('#cp-grid .theme-card').first();
  await cartao.click();
  await page.locator('#theme-btn').click();
  await page.waitForTimeout(250);
}

async function print(page, nome) {
  if (PRINTS) await page.screenshot({ path: join(PRINTS, `${nome}.png`) });
}

test('abre e fecha pelo botão do topo; ficha continua editável com o painel aberto', async ({ page }) => {
  await abrirFicha(page);
  await expect(botao(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(botao(page)).toHaveAttribute('aria-controls', 'grimorio-panel');
  await expect(page.locator('#grimorio-fab')).toHaveCount(0);
  await abrirGrimorio(page);
  await expect(botao(page)).toHaveAttribute('aria-expanded', 'true');
  // Sem véu e sem modal: o painel é um complemento, não um diálogo.
  await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);

  const nome = page.locator('[data-field="personagem-nome"]');
  await nome.fill('Aldric');
  await expect(nome).toHaveValue('Aldric');
  await page.locator('#tabs li[data-tab="pericias"]').click();
  await expect(page.locator('#tabs li[data-tab="pericias"]')).toHaveClass(/active/);
  await expect(painel(page)).toHaveClass(/is-aberto/);

  // A ficha cedeu espaço: a largura do painel é descontada da área da ficha.
  const sobra = await page.evaluate(() => ({
    largura: getComputedStyle(document.body).getPropertyValue('--grimorio-largura').trim(),
    app: document.querySelector('.app').getBoundingClientRect().right,
    painel: document.getElementById('grimorio-panel').getBoundingClientRect().left,
  }));
  expect(sobra.largura).toBe('400px');
  expect(sobra.app).toBeLessThanOrEqual(sobra.painel + 1);

  await page.getByRole('button', { name: 'Fechar o Grimório' }).click();
  await expect(painel(page)).not.toHaveClass(/is-aberto/);
  await expect(botao(page)).toHaveAttribute('aria-expanded', 'false');
});

test('Esc fecha só com o foco dentro do Grimório', async ({ page }) => {
  await abrirFicha(page);
  await abrirGrimorio(page);
  await page.locator('[data-field="personagem-nome"]').focus();
  await page.keyboard.press('Escape');
  await expect(painel(page)).toHaveClass(/is-aberto/);
  await page.locator('#grimorio-busca').focus();
  await page.keyboard.press('Escape');
  await expect(painel(page)).not.toHaveClass(/is-aberto/);
});

test('abas: papéis ARIA, setas do teclado e Besta só para quem tem Besta', async ({ page }) => {
  await abrirFicha(page);
  await abrirGrimorio(page);
  await expect(painel(page).getByRole('tablist')).toBeVisible();
  await expect(painel(page).getByRole('tab')).toHaveCount(4);
  await expect(aba(page, 'Besta')).toHaveCount(0);
  await expect(aba(page, 'Sugestões')).toHaveAttribute('aria-selected', 'true');
  await campo(page, 'classe-nome', 'Treinador');
  const cortadas = await painel(page).locator('.grimorio__aba').evaluateAll((l) => l.filter((a) => a.scrollWidth > a.clientWidth).length);
  expect(cortadas).toBe(0);
  await campo(page, 'classe-nome', '');
  await page.waitForTimeout(400);
  await aba(page, 'Sugestões').focus();
  await page.keyboard.press('ArrowRight');
  await expect(aba(page, 'Poderes')).toHaveAttribute('aria-selected', 'true');
  await expect(aba(page, 'Poderes')).toBeFocused();
  await page.keyboard.press('End');
  await expect(aba(page, 'Itens')).toHaveAttribute('aria-selected', 'true');

  await campo(page, 'classe-nome', 'Treinador');
  await expect(aba(page, 'Besta')).toBeVisible();
  await expect(painel(page).getByRole('tab')).toHaveCount(5);
});

test('colocar poder, magia e item: aparece na ficha e a lista segue com a aba aberta', async ({ page }) => {
  await abrirFicha(page);
  await darRecursos(page);
  await campo(page, 'classe-nome', 'Arcanista');
  await nivel(page, 6);
  await abrirGrimorio(page);

  // Poder
  await aba(page, 'Poderes').click();
  const botaoPoder = painel(page).getByRole('button', { name: /^Colocar .* na ficha$/ }).first();
  const nomePoder = (await botaoPoder.getAttribute('aria-label')).replace(/^Colocar (.*) na ficha$/, '$1');
  await botaoPoder.click();
  await expect(page.locator('.powers-container .power-name-input').first()).toHaveValue(nomePoder);
  await expect(aba(page, 'Poderes')).toHaveAttribute('aria-selected', 'true');

  // Magia
  await aba(page, 'Magias').click();
  await expect(painel(page).getByRole('heading', { name: /Arcanismo/ })).toBeVisible();
  const botaoMagia = painel(page).getByRole('button', { name: /^Colocar .* na ficha$/ }).first();
  const nomeMagia = (await botaoMagia.getAttribute('aria-label')).replace(/^Colocar (.*) na ficha$/, '$1');
  await botaoMagia.click();
  await expect(page.locator('.magic-card .magic-nome', { hasText: nomeMagia }).first()).toBeAttached({ timeout: 5000 });
  await expect(painel(page).getByText('Na ficha').first()).toBeVisible();

  // Item: aparece no inventário e o contador de Inv. sobe
  await aba(page, 'Itens').click();
  const antes = await page.locator('.item-card').count();
  await painel(page).getByRole('button', { name: /^Colocar .* na ficha$/ }).first().click();
  await expect(page.locator('.item-card')).toHaveCount(antes + 1);
});

test('itens: raridade, "Inv." sem kg, limites da hierarquia e itens bloqueados somem', async ({ page }) => {
  await abrirFicha(page);
  await darRecursos(page);
  await campo(page, 'hierarquia', 'trabalhador');
  await abrirGrimorio(page);
  await aba(page, 'Itens').click();
  const lista = painel(page).locator('.grimorio__lista');

  await expect(lista).toContainText('Limites da hierarquia');
  await expect(lista).toContainText('Comum 0/2');
  await expect(lista).toContainText('Incomum 0/1');
  await expect(lista).toContainText('Raro, Épico, Lendário não aparecem.');
  await expect(lista).toContainText(/\d+ Inv\./);
  expect(await painel(page).innerText()).not.toMatch(/\bkg\b/i);
  await expect(lista.locator('.grimorio__tag', { hasText: 'Comum' }).first()).toBeVisible();
  await expect(lista.locator('.grimorio__tag', { hasText: 'Banal' }).first()).toBeVisible();
  // Raridades que a hierarquia não permite não aparecem (nem em "Ver o que falta").
  await expect(lista.locator('.grimorio__tag', { hasText: /^(Raro|Épico|Lendário)$/ })).toHaveCount(0);
  await print(page, 'itens-trabalhador');

  // Ordenado por raridade dentro do grupo: Banal vem antes de Comum.
  const tags = await lista.locator('.grimorio__secao').first().locator('.grimorio__tag').allInnerTexts();
  const ordem = ['Banal', 'Comum', 'Incomum'];
  const indices = tags.map((t) => ordem.indexOf(t));
  expect(indices).toEqual([...indices].sort((a, b) => a - b));

  // Trocar a hierarquia muda o que aparece.
  await campo(page, 'hierarquia', 'duque');
  await expect(lista).toContainText('Lendário 0/1');
  await expect(lista).not.toContainText('não aparecem');
  await campo(page, 'hierarquia', 'trabalhador');
  await expect(lista).toContainText('Raro, Épico, Lendário não aparecem.');

  // Cota esgotada: itens Incomum vão para "Ver o que falta" com o motivo.
  await painel(page).locator('.grimorio__tag', { hasText: /^Incomum$/ }).first()
    .locator('xpath=ancestor::div[contains(@class,"grimorio__item")][1]')
    .getByRole('button', { name: /^Colocar/ }).click();
  const falta = lista.getByRole('button', { name: /Ver o que falta/ });
  await expect(falta).toBeVisible();
  await falta.click();
  await expect(lista.locator('.grimorio__motivo', { hasText: 'cota de raridade esgotada' }).first()).toBeVisible();
});

test('Besta: aspectos biológicos por subtipo, limite e aspectos de treino em seção separada', async ({ page }) => {
  await abrirFicha(page);
  await darRecursos(page);
  await campo(page, 'classe-nome', 'Treinador');
  await nivel(page, 6);
  // Cria uma besta pela aba Besta da ficha.
  await page.locator('#tabs li[data-tab="besta"]').click();
  await page.getByRole('button', { name: /Adicionar Nova Besta/ }).first().click();
  await abrirGrimorio(page);
  await aba(page, 'Besta').click();
  const lista = painel(page).locator('.grimorio__lista');

  await expect(lista.getByRole('heading', { name: /Aspectos biológicos · \d+\/\d+/ })).toBeVisible();
  for (const sub of ['Ofensivo', 'Defensivo', 'Movimentacional', 'Temperamental', 'Optativo']) {
    await expect(lista.locator('.grimorio__sub-rot', { hasText: new RegExp(`^${sub}`) })).toBeVisible();
  }
  await expect(lista.getByRole('heading', { name: /Aspectos de treino/ })).toBeVisible();
  // Níveis II/III só depois do anterior.
  await expect(lista.getByRole('button', { name: 'Disparo II', exact: true })).toHaveCount(0);
  await print(page, 'besta');
  await lista.getByRole('button', { name: 'Colocar Disparo na ficha' }).click();
  await expect(lista.getByRole('button', { name: 'Colocar Disparo II na ficha' })).toBeVisible();
});

test('claro/escuro automático segue o brilho do pergaminho', async ({ page }) => {
  await abrirFicha(page);
  await abrirGrimorio(page);
  const escuro = () => painel(page).evaluate((e) => e.classList.contains('grimorio--escuro'));
  expect(await escuro()).toBe(false);
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--sheet-bg', '#1a1424');
    document.dispatchEvent(new CustomEvent('ficha:tema-mudou'));
  });
  expect(await escuro()).toBe(true);
  await print(page, 'escuro-sugestoes');
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--sheet-bg', '#efe3c4');
    document.dispatchEvent(new CustomEvent('ficha:tema-mudou'));
  });
  expect(await escuro()).toBe(false);
});

test('tema escolhido no painel de cores muda o Grimório sozinho, sem opção própria', async ({ page }) => {
  await abrirFicha(page);
  await abrirGrimorio(page);
  const escuro = () => painel(page).evaluate((e) => e.classList.contains('grimorio--escuro'));
  await escolherTema(page, 'noite');
  expect(await escuro()).toBe(true);
  await print(page, 'tema-noite-sugestoes');
  await escolherTema(page, null);
  expect(await escuro()).toBe(false);
  await expect(painel(page).getByRole('button', { name: /claro|escuro|tema/i })).toHaveCount(0);
});

test('linhas e cabeçalhos sem fundo retangular; runas atrás do texto e sem tampar nada', async ({ page }) => {
  await abrirFicha(page);
  await darRecursos(page);
  await abrirGrimorio(page);
  await aba(page, 'Itens').click();
  const fundos = await painel(page).evaluate((raiz) => {
    const seletores = '.grimorio__item, .grimorio__item-cab, .grimorio__grupo, .grimorio__nota, .grimorio__aba, .grimorio__abas, .grimorio__busca input, .grimorio__cab, .grimorio__falta-bt, .grimorio__sub-rot, .grimorio__nome, .grimorio__corpo';
    return [...raiz.querySelectorAll(seletores)]
      .map((e) => [e.className, getComputedStyle(e).backgroundColor, getComputedStyle(e).backgroundImage])
      .filter(([, cor, img]) => (cor !== 'rgba(0, 0, 0, 0)' && cor !== 'transparent') || img !== 'none');
  });
  expect(fundos).toEqual([]);

  const runas = await painel(page).evaluate((raiz) => {
    const caixas = [...raiz.querySelectorAll('.grimorio__flutua')];
    const cs = (e) => getComputedStyle(e);
    return {
      total: raiz.querySelectorAll('.grimorio__fl').length,
      atras: caixas.every((c) => cs(c).pointerEvents === 'none' && cs(c).overflow === 'hidden' && Number(cs(c).zIndex) === 0),
      listaAcima: Number(cs(raiz.querySelector('.grimorio__lista')).zIndex) >= 1,
      animando: [...raiz.querySelectorAll('.grimorio__fl')].some((r) => cs(r).animationName !== 'none'),
    };
  });
  expect(runas.total).toBeLessThanOrEqual(24);
  expect(runas.total).toBeGreaterThanOrEqual(14);
  expect(runas.atras).toBe(true);
  expect(runas.listaAcima).toBe(true);
  expect(runas.animando).toBe(true);

  // Em vários quadros, nenhuma runa visível entra na área do texto (margem de 30px de cada lado).
  for (let quadro = 0; quadro < 6; quadro += 1) {
    const invasoras = await painel(page).evaluate((raiz) => {
      const r = raiz.getBoundingClientRect();
      // Caixas de texto reais (linhas de texto, não a largura do bloco).
      const textos = [...raiz.querySelectorAll('.grimorio__nome, .grimorio__custo, .grimorio__colocar, .grimorio__grupo, .grimorio__nota, .grimorio__titulo, .grimorio__sub')]
        .flatMap((e) => { const g = document.createRange(); g.selectNodeContents(e); return [...g.getClientRects()]; })
        .filter((b) => b.width > 0);
      return [...raiz.querySelectorAll('.grimorio__fl')]
        .filter((f) => Number(getComputedStyle(f).opacity) > 0.05)
        .map((f) => f.getBoundingClientRect())
        .filter((b) => b.right > r.left && b.left < r.right && b.bottom > r.top && b.top < r.bottom)
        .filter((b) => textos.some((t) => b.left < t.right && b.right > t.left && b.top < t.bottom && b.bottom > t.top)).length;
    });
    expect(invasoras).toBe(0);
    await page.waitForTimeout(1300);
  }
  await print(page, 'runas-quadro');
});

test('movimento reduzido: sem runas animadas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await abrirFicha(page);
  await abrirGrimorio(page);
  await expect(painel(page).locator('.grimorio__flutua').first()).toBeHidden();
});

test('celular: gaveta inferior, ficha rola acima, abas numa linha e busca dentro da borda', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await abrirFicha(page);
  await campo(page, 'classe-nome', 'Treinador'); // com a aba Besta são 5 abas
  await abrirGrimorio(page);
  const geo = await page.evaluate(() => {
    const p = document.getElementById('grimorio-panel').getBoundingClientRect();
    const abas = [...document.querySelectorAll('.grimorio__aba')].map((a) => a.getBoundingClientRect());
    const busca = document.querySelector('.grimorio__busca input').getBoundingClientRect();
    return {
      topo: p.top, base: p.bottom, alt: window.innerHeight, largura: p.width,
      pad: parseFloat(getComputedStyle(document.body).paddingBottom),
      abasMesmaLinha: new Set(abas.map((a) => Math.round(a.top))).size === 1,
      abasCortadas: [...document.querySelectorAll('.grimorio__aba')].filter((a) => a.scrollWidth > a.clientWidth).length,
      larguras: [...document.querySelectorAll('.grimorio__aba')].map((a) => [a.textContent, a.scrollWidth, a.clientWidth]),
      abasDentro: abas.every((a) => a.left >= p.left && a.right <= p.right),
      buscaDentro: busca.left >= p.left && busca.right <= p.right,
      botaoTopo: document.getElementById('grimorio-btn').getBoundingClientRect().bottom,
    };
  });
  expect(geo.largura).toBeGreaterThanOrEqual(389);
  expect(geo.topo).toBeGreaterThan(geo.alt * 0.45);
  expect(geo.base).toBeLessThanOrEqual(geo.alt + 1);
  expect(geo.pad).toBeGreaterThan(geo.alt * 0.4);
  expect(geo.abasMesmaLinha).toBe(true);
  expect(geo.abasCortadas, JSON.stringify(geo.larguras)).toBe(0);
  expect(geo.abasDentro).toBe(true);
  expect(geo.buscaDentro).toBe(true);
  // O botão do topo continua livre (fora da gaveta) e a ficha segue editável.
  expect(geo.botaoTopo).toBeLessThan(geo.topo);
  // A página ganha área rolável abaixo da ficha e rola de verdade, sem fechar a gaveta.
  const rolagem = await page.evaluate(async () => {
    const total = document.documentElement.scrollHeight;
    window.scrollTo(0, 10000);
    await new Promise((r) => setTimeout(r, 200));
    return { total, y: window.scrollY, alt: window.innerHeight };
  });
  expect(rolagem.total).toBeGreaterThan(rolagem.alt * 1.3);
  expect(rolagem.y).toBeGreaterThan(rolagem.alt * 0.3);
  await expect(painel(page)).toHaveClass(/is-aberto/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await print(page, 'mobile-sugestoes-claro');
  expect(page.erros).toEqual([]);
});

test('prints: abas em claro e escuro, 1440 e 390', async ({ page }) => {
  test.setTimeout(120_000);
  await abrirFicha(page);
  await darRecursos(page);
  await campo(page, 'classe-nome', 'Treinador');
  await campo(page, 'hierarquia', 'trabalhador');
  await nivel(page, 8);
  await darRecursos(page);
  await page.locator('#tabs li[data-tab="besta"]').click();
  await page.getByRole('button', { name: /Adicionar Nova Besta/ }).first().click();
  await page.locator('#tabs li[data-tab="geral"]').click();
  await abrirGrimorio(page);
  for (const [tema, slug] of [['claro', null], ['escuro', 'noite']]) {
    await escolherTema(page, slug);
    for (const [largura, altura] of [[1440, 900], [390, 800]]) {
      await page.setViewportSize({ width: largura, height: altura });
      await page.waitForTimeout(500);
      for (const nome of ['Sugestões', 'Poderes', 'Magias', 'Itens', 'Besta']) {
        if (await aba(page, nome).count()) await aba(page, nome).click();
        await page.waitForTimeout(250);
        await print(page, `${nome.toLowerCase().replace('õ', 'o')}-${tema}-${largura}`);
      }
    }
  }
});
