// Topo da ficha: botão de modo, campos calculados, menu ⋯, tela cheia e vinheta.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, novaPessoa } from './fixtures.mjs';
import { criarConta, criarFicha, novoEmail } from './helpers.mjs';

const PRINTS = process.env.KIROCREW_SCRATCH ? join(process.env.KIROCREW_SCRATCH, 'prints-topo') : null;

/** Cria conta e ficha, abre a ficha e espera o modo Regras estar aplicado. */
async function abrirFicha(page, nome = 'Topo') {
  await criarConta(page, novoEmail('topo'));
  await criarFicha(page, nome);
  await page.getByRole('button', { name: 'Abrir' }).click();
  await page.waitForURL(/\/ficha\?sheetId=/);
  await expect(page.locator('input[data-field="pv-total"][data-calculado]')).toHaveCount(1);
  // Deixa a hidratação terminar (ela ignora o que é digitado antes).
  await page.waitForTimeout(400);
}

const modo = (page) => page.locator('#autocalc-switch');

test('botão de modo: texto Regras/Livre, cadeado e troca', async ({ page }) => {
  await abrirFicha(page);
  await expect(modo(page)).toContainText('Regras');
  await expect(modo(page).locator('.mode-ico')).toHaveText('lock');
  await expect(modo(page)).toHaveAttribute('aria-label', /Modo Regras/);
  await modo(page).click();
  await expect(modo(page)).toContainText('Livre');
  await expect(modo(page).locator('.mode-ico')).toHaveText('lock_open');
  await expect(modo(page)).toHaveAttribute('title', /Modo Livre/);
  // Nada de verde no botão em Livre.
  const cor = await modo(page).evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(cor).not.toMatch(/rgb\(\s*\d+,\s*(1[6-9]\d|2\d\d),\s*\d{1,2}\)/);
  await modo(page).click();
  await expect(modo(page)).toContainText('Regras');
});

test('campos calculados em Regras: nenhum indício visual de trava', async ({ page }) => {
  await abrirFicha(page);
  const campo = page.locator('input[data-field="pv-total"]');
  await expect(campo).toHaveJSProperty('readOnly', true);
  const info = await campo.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      classe: el.className,
      title: el.getAttribute('title') || '',
      sombra: cs.boxShadow,
      cadeado: [...(el.parentElement?.parentElement?.querySelectorAll('.material-symbols-outlined') || [])]
        .some((i) => /lock/.test(i.textContent)),
    };
  });
  expect(info.classe).not.toMatch(/is-livro|readonly/);
  expect(info.title).toBe('');
  expect(info.sombra).toBe('none');
  expect(info.cadeado).toBe(false);
  expect(await page.locator('.is-livro').count()).toBe(0);
});

test('dica no mouse e aviso "Passar para Livre" ao clicar', async ({ page }) => {
  await abrirFicha(page);
  const campo = page.locator('input[data-field="pv-total"]');
  // A ficha ainda arruma o layout logo após abrir (o campo muda de lugar): repete o hover.
  await expect(async () => {
    await campo.hover();
    await expect(page.locator('#calc-dica')).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10_000 });
  await expect(page.locator('#calc-dica')).toHaveText('Calculado pelas regras. Passe para o modo Livre para editar.');
  await page.mouse.move(5, 5);
  await expect(page.locator('#calc-dica')).toBeHidden();

  await campo.click();
  await expect(page.locator('#calc-aviso')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#calc-aviso')).toBeHidden();

  await campo.click();
  await page.mouse.click(5, 5);
  await expect(page.locator('#calc-aviso')).toBeHidden();

  await campo.click();
  await page.getByRole('button', { name: 'Passar para Livre' }).click();
  await expect(modo(page)).toContainText('Livre');
  await expect(page.locator('#calc-aviso')).toBeHidden();
  await expect(campo).toHaveJSProperty('readOnly', false);
  // No Livre não há dica nem aviso.
  await campo.hover();
  await page.waitForTimeout(600);
  await expect(page.locator('#calc-dica')).toBeHidden();
});

test('valor editado no Livre sobrevive à volta para Regras', async ({ page }) => {
  await abrirFicha(page);
  const campo = page.locator('input[data-field="pv-total"]');
  await modo(page).click();
  await expect(campo).toHaveJSProperty('readOnly', false);
  await campo.fill('77');
  await campo.blur();
  await modo(page).click();
  await expect(modo(page)).toContainText('Regras');
  await expect(campo).toHaveJSProperty('readOnly', true);
  await expect(campo).toHaveValue('77');
  // E de novo no Livre.
  await modo(page).click();
  await expect(campo).toHaveValue('77');
});

test('menu ⋯: itens com texto, Esc, clique fora e escolher fecham; teclado navega', async ({ page }) => {
  await abrirFicha(page);
  const menu = page.locator('#more-menu');
  const botao = page.locator('#more-btn');
  await expect(menu).toBeHidden();
  await botao.click();
  await expect(menu).toBeVisible();
  await expect(botao).toHaveAttribute('aria-expanded', 'true');
  for (const t of ['Compartilhar', 'Exportar JSON', 'Recalcular', 'Auto-save: ligado', 'Tela cheia']) {
    await expect(menu.getByRole('menuitem', { name: t })).toBeVisible();
  }
  // ids mantidos
  for (const id of ['share-btn', 'export-json-btn', 'recalc-btn', 'autosave-switch']) {
    await expect(menu.locator(`#${id}`)).toHaveCount(1);
  }

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(botao).toBeFocused();

  await botao.click();
  await page.mouse.click(5, 300);
  await expect(menu).toBeHidden();

  // Teclado: seta para baixo abre e anda pelos itens.
  await botao.focus();
  await page.keyboard.press('ArrowDown');
  await expect(menu).toBeVisible();
  const primeiro = await page.evaluate(() => document.activeElement?.textContent?.trim());
  await page.keyboard.press('ArrowDown');
  const segundo = await page.evaluate(() => document.activeElement?.textContent?.trim());
  expect(segundo).not.toBe(primeiro);
  await page.keyboard.press('Escape');

  // Auto-save: o texto troca e o menu fecha ao escolher.
  await botao.click();
  await menu.locator('#autosave-switch').click();
  await expect(menu).toBeHidden();
  await botao.click();
  await expect(menu.locator('#autosave-switch')).toContainText('Auto-save: desligado');
  await menu.locator('#autosave-switch').click();
  await botao.click();
  await expect(menu.locator('#autosave-switch')).toContainText('Auto-save: ligado');
  await page.keyboard.press('Escape');

  // Recalcular dispara o recálculo sem quebrar e fecha o menu.
  await botao.click();
  await menu.locator('#recalc-btn').click();
  await expect(menu).toBeHidden();
});

test('topo mostra um nome só; indicador de salvo e Salvar continuam à vista', async ({ page }) => {
  await abrirFicha(page);
  await expect(page.locator('.logged')).toBeVisible();
  await expect(page.locator('.owner-sheet')).toBeHidden();
  await expect(page.locator('.your-account-name')).not.toContainText('@');
  await expect(page.locator('.logged')).toHaveAttribute('title', /@teste\.local/);
  await expect(page.locator('#saved')).toBeVisible();
  await expect(page.locator('#manual-save')).toBeVisible();
  await expect(page.locator('#grimorio-btn')).toHaveAttribute('aria-controls', 'grimorio-panel');
  await expect(page.locator('#theme-btn')).toBeVisible();
});

test('quem vê a ficha de outra pessoa vê o dono com a coroa', async ({ browser }) => {
  const dono = await novaPessoa(browser);
  const emailDono = novoEmail('dono');
  await criarConta(dono, emailDono);
  await criarFicha(dono, 'Emprestada');
  await dono.getByRole('button', { name: 'Abrir' }).click();
  await dono.waitForURL(/sheetId=/);
  await expect(dono.locator('.logged')).toBeVisible();
  const url = dono.url();
  // Compartilha como pública (leitura) pelo menu do topo.
  await dono.locator('#more-btn').click();
  await dono.locator('#share-btn').click();
  await expect(dono.locator('#share-overlay')).toBeVisible();
  const publico = dono.locator('#share-public-toggle');
  await publico.evaluate((el) => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await expect(dono.locator('#share-public-options')).toBeVisible();

  const outro = await novaPessoa(browser);
  await criarConta(outro, novoEmail('outro'));
  await outro.goto(url);
  await expect(outro.locator('.owner-sheet')).toBeVisible();
  await expect(outro.locator('.logged')).toBeHidden();
  await expect(outro.locator('.owner-sheet')).toHaveAttribute('title', new RegExp(emailDono.replace(/[.+]/g, '\\$&')));
  // Modo leitura: sem botão de modo, sem Compartilhar nem Recalcular no menu.
  await expect(outro.locator('#autocalc-switch')).toBeHidden();
  await outro.locator('#more-btn').click();
  await expect(outro.locator('#share-btn')).toBeHidden();
  await expect(outro.locator('#recalc-btn')).toBeHidden();
  await expect(outro.locator('#export-json-btn')).toBeVisible();
  await expect(outro.locator('#largura-btn')).toBeVisible();
});

test('tela cheia liga/desliga e persiste depois de recarregar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await abrirFicha(page);
  const larguraApp = () => page.locator('.app').evaluate((el) => Math.round(el.getBoundingClientRect().width));
  expect(await larguraApp()).toBe(1020);

  await page.locator('#more-btn').click();
  await page.locator('#largura-btn').click();
  await expect(page.locator('body')).toHaveClass(/largura-total/);
  expect(await larguraApp()).toBeGreaterThan(1400);
  expect(await page.evaluate(() => localStorage.getItem('odisseia-largura-v1'))).toBe('total');

  await page.reload();
  await expect(page.locator('body')).toHaveClass(/largura-total/);
  expect(await larguraApp()).toBeGreaterThan(1400);
  await page.locator('#more-btn').click();
  await expect(page.locator('#largura-btn')).toContainText('Largura normal');

  // A preferência não vai para a ficha: nada de largura no que foi salvo.
  await page.locator('#largura-btn').click();
  await expect(page.locator('body')).not.toHaveClass(/largura-total/);
  expect(await larguraApp()).toBe(1020);
  expect(await page.evaluate(() => localStorage.getItem('odisseia-largura-v1'))).toBe('normal');
});

test('tela cheia respeita o espaço do Grimório (--grimorio-largura)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await abrirFicha(page);
  await page.locator('#more-btn').click();
  await page.locator('#largura-btn').click();
  await page.evaluate(() => document.documentElement.style.setProperty('--grimorio-largura', '400px'));
  const w = await page.locator('.app').evaluate((el) => Math.round(el.getBoundingClientRect().width));
  expect(w).toBe(1040);
});

test('vinheta só aparece no modo Livre e nunca pega clique', async ({ page }) => {
  await abrirFicha(page);
  const v = page.locator('#vinheta-livre');
  const opac = () => v.evaluate((el) => getComputedStyle(el).opacity);
  expect(await opac()).toBe('0');
  expect(await v.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
  expect(Number(await v.evaluate((el) => getComputedStyle(el).zIndex))).toBeLessThan(20);
  await modo(page).click();
  await expect.poll(opac).toBe('1');
  await modo(page).click();
  await expect.poll(opac).toBe('0');
});

test('abas em 1440 e 1920 com tela cheia: nada estoura a janela', async ({ page }) => {
  test.setTimeout(120_000);
  if (PRINTS) await page.context().unroute(/fonts\.(googleapis|gstatic)\.com/);
  await page.setViewportSize({ width: 1920, height: 1000 });
  await abrirFicha(page);
  await page.locator('#more-btn').click();
  await page.locator('#largura-btn').click();
  const abas = ['geral', 'pericias', 'combate', 'habilidades', 'magias', 'inventario', 'besta', 'anotacoes'];
  for (const largura of [1440, 1920]) {
    await page.setViewportSize({ width: largura, height: 1000 });
    for (const aba of abas) {
      const li = page.locator(`.sidebar li[data-tab="${aba}"]`).first();
      // A aba Besta só aparece quando a ficha tem besta: liga pelo próprio módulo de abas.
      if (await li.isVisible()) await li.click();
      else await page.evaluate((t) => document.querySelector(`.sidebar li[data-tab="${t}"]`)?.click(), aba);
      await page.waitForTimeout(150);
      const estoura = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(estoura, `aba ${aba} em ${largura}px`).toBe(false);
      if (PRINTS) {
        mkdirSync(PRINTS, { recursive: true });
        await page.screenshot({ path: join(PRINTS, `aba-${aba}-${largura}.png`) });
      }
    }
  }
});

test('celular 390px: topo usável e barra de abas intacta', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await abrirFicha(page);
  for (const sel of ['.header-title', '#manual-save', '#autocalc-switch', '#more-btn', '#theme-btn', '#grimorio-btn']) {
    await expect(page.locator(sel)).toBeVisible();
  }
  // Os botões cabem numa linha só, dentro da janela.
  const caixas = await page.evaluate(() =>
    ['#manual-save', '#autocalc-switch', '#more-btn'].map((s) => document.querySelector(s).getBoundingClientRect()).map((r) => ({ t: Math.round(r.top + r.height / 2), d: Math.round(r.right) })));
  // Mesma linha: centros verticais a menos de 3px um do outro.
  expect(Math.max(...caixas.map((c) => c.t)) - Math.min(...caixas.map((c) => c.t))).toBeLessThan(3);
  expect(Math.max(...caixas.map((c) => c.d))).toBeLessThanOrEqual(390);
  await expect(page.locator('#mobile-tabs')).toBeVisible();
  await expect(page.locator('#largura-btn')).toBeHidden().catch(() => {});
  await page.locator('#more-btn').click();
  await expect(page.locator('#more-menu')).toBeVisible();
  await expect(page.locator('#largura-btn')).toBeHidden();
  await page.keyboard.press('Escape');
  // Abas móveis seguem trocando de aba.
  await page.locator('#mobile-tabs li[data-tab="combate"]').click();
  await expect(page.locator('#mobile-tabs li[data-tab="combate"]')).toHaveClass(/active/);
});

test('prints do topo (claro/escuro, 1440 e 390)', async ({ page }) => {
  test.skip(!PRINTS, 'Sem KIROCREW_SCRATCH: sem prints.');
  test.setTimeout(120_000);
  mkdirSync(PRINTS, { recursive: true });
  const claro = async (largura, altura, sufixo, escuro) => {
    await page.setViewportSize({ width: largura, height: altura });
    // Tema escuro de verdade (Cripta: preto / amarelo-escuro / preto), pela paleta compartilhada.
    await page.evaluate(async (e) => {
      const P = await import('/js/theme-palette.js');
      const achar = (id) => P.PALETTE.find((c) => c.id === id);
      const raiz = document.documentElement;
      if (!e) { P.THEME_CSS_PROPS.forEach((k) => raiz.style.removeProperty(k)); document.body.classList.remove('theme-dark-paper'); return; }
      const vars = P.buildThemeVars(achar('preto'), achar('amarelo-escuro'), achar('preto'));
      for (const [k, v] of Object.entries(vars)) raiz.style.setProperty(k, v);
      document.body.classList.add('theme-dark-paper');
    }, escuro);
    const tema = escuro ? 'escuro' : 'claro';
    const nome = (x) => join(PRINTS, `${x}-${largura}-${tema}.png`);
    await page.screenshot({ path: nome('topo') });
    await page.locator('#more-btn').click();
    await page.waitForTimeout(300); // fim da animação de abrir
    await page.screenshot({ path: nome('menu') });
    await page.keyboard.press('Escape');
    // No celular a aba inicial é a vista de jogo; o PV máximo fica na aba Geral.
    await page.evaluate(() => document.querySelector('.sidebar li[data-tab="geral"]')?.click());
    await page.locator('input[data-field="pv-total"]').scrollIntoViewIfNeeded();
    await page.locator('input[data-field="pv-total"]').click();
    await page.screenshot({ path: nome('aviso') });
    await page.getByRole('button', { name: 'Passar para Livre' }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: nome('livre-vinheta') });
    await modo(page).click();
    await page.waitForTimeout(700);
  };
  // Os prints precisam da fonte de ícones (o fixture bloqueia as fontes do Google).
  await page.context().unroute(/fonts\.(googleapis|gstatic)\.com/);
  await abrirFicha(page, 'Prints');
  await page.evaluate(() => document.fonts.ready);
  await claro(1440, 900, '', false);
  await claro(1440, 900, '', true);
  await claro(390, 800, '', false);
  await claro(390, 800, '', true);
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.locator('#more-btn').click();
  await page.locator('#largura-btn').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(PRINTS, 'tela-cheia-1920.png') });
});
