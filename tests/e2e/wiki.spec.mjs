import { test, expect } from './fixtures.mjs';
import { criarConta, novoEmail } from './helpers.mjs';

/** Os chips acesos na linha do atributo. */
function chipsAcesos(page, chave) {
  return page.locator('.wiki-attr-row', { has: page.locator(`#attr-${chave}`) })
    .locator('.wiki-attr-chip.filled');
}

test('editor: atributo 0 mostra zero chips acesos (e não 5)', async ({ page }) => {
  await criarConta(page, novoEmail());
  await page.goto('/wiki/criar');
  await page.selectOption('#field-type', 'creature');

  // Valor inicial do formulário: 5 chips.
  await expect(chipsAcesos(page, 'corpo')).toHaveCount(5);

  await page.fill('#attr-corpo', '0');
  await expect(chipsAcesos(page, 'corpo')).toHaveCount(0);

  await page.fill('#attr-corpo', '7');
  await expect(chipsAcesos(page, 'corpo')).toHaveCount(7);

  // Campo apagado também fica vazio.
  await page.fill('#attr-corpo', '');
  await expect(chipsAcesos(page, 'corpo')).toHaveCount(0);
});

test('atributo 0 é salvo e aparece como 0 na página do artigo', async ({ page }) => {
  await criarConta(page, novoEmail());
  await page.goto('/wiki/criar');
  await page.selectOption('#field-type', 'creature');
  await page.fill('#field-title', `Criatura ${Date.now()}`);
  await page.fill('#field-summary', 'Resumo de teste.');
  await page.fill('#attr-velocidade', '0');
  await page.click('#wiki-submit-btn');

  await page.waitForURL(/\/wiki\/doc\?id=/);
  const linha = page.locator('.wiki-attr-bar-row', { hasText: 'Velocidade' });
  await expect(linha.locator('.wiki-attr-bar-num')).toHaveText('0');
  await expect(linha.locator('.wiki-attr-chip.filled')).toHaveCount(0);
});

// ── Usabilidade do editor ────────────────────────────────────────────────────

async function abrirEditor(page, tipo = 'creature') {
  await criarConta(page, novoEmail());
  await page.goto('/wiki/criar');
  await page.waitForSelector('#field-title');
  await page.selectOption('#field-type', tipo);
}

function tituloUnico(base = 'Artigo') {
  return `${base} ${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

test('Enter no título não envia o formulário', async ({ page }) => {
  await abrirEditor(page);
  await page.fill('#field-title', tituloUnico());
  await page.fill('#field-summary', 'Resumo.');
  await page.press('#field-title', 'Enter');
  await page.waitForTimeout(800);
  expect(new URL(page.url()).pathname).toBe('/wiki/criar');
});

test('texto digitado em Tipo vira tag ao sair do campo e vai para o artigo', async ({ page }) => {
  await abrirEditor(page);
  await page.fill('#wiki-tipo-input', 'Morto-vivo');
  await page.click('#field-title');
  await expect(page.locator('#wiki-tipos-field .wiki-tag-chip')).toHaveCount(1);
  await expect(page.locator('#wiki-tipo-input')).toHaveValue('');

  // Texto solto na Região também entra ao salvar, sem sair do campo antes.
  await page.fill('#field-title', tituloUnico());
  await page.fill('#field-summary', 'Resumo.');
  await page.fill('#wiki-regiao-input', 'Norte');
  await page.click('#wiki-submit-btn');
  await page.waitForURL(/\/wiki\/doc\?id=/);
  await expect(page.locator('.wiki-doc-tags')).toContainText('Morto-vivo');
  await expect(page.locator('.wiki-doc-tags')).toContainText('Norte');
});

test('setas e Enter escolhem uma sugestão de tag', async ({ page }) => {
  await abrirEditor(page);
  await page.fill('#field-title', tituloUnico());
  await page.fill('#field-summary', 'Resumo.');
  await page.fill('#wiki-tipo-input', 'Dragão');
  await page.click('#wiki-submit-btn');
  await page.waitForURL(/\/wiki\/doc\?id=/);

  await page.goto('/wiki/criar');
  await page.waitForSelector('#field-title');
  await page.waitForTimeout(1500); // as sugestões chegam do banco logo depois da página abrir
  await page.fill('#wiki-tipo-input', 'dra');
  await expect(page.locator('.wiki-autocomplete-item')).toHaveCount(1);
  await page.press('#wiki-tipo-input', 'ArrowDown');
  await expect(page.locator('.wiki-autocomplete-item.active')).toHaveText('Dragão');
  await page.press('#wiki-tipo-input', 'Enter');
  await expect(page.locator('#wiki-tipos-field .wiki-tag-chip')).toContainText('Dragão');
});

test('erro de validação rola até o campo e põe o cursor nele', async ({ page }) => {
  await abrirEditor(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.click('#wiki-submit-btn');
  await expect(page.locator('#field-title')).toBeFocused();
  await expect(page.locator('#field-title')).toBeInViewport();

  // O aviso some quando a pessoa começa a escrever.
  await page.fill('#field-title', 'a');
  await expect(page.locator('#field-title-wrap.error')).toHaveCount(0);
});

test('remover seção com texto pergunta antes; seção vazia sai sem perguntar', async ({ page }) => {
  await abrirEditor(page);
  await page.click('#wiki-add-section');
  await page.fill('.wiki-section-item .wiki-textarea', 'Texto importante.');

  let pergunta = '';
  page.once('dialog', (d) => { pergunta = d.message(); d.dismiss(); });
  await page.click('.wiki-section-control-btn');
  expect(pergunta).toContain('Remover esta seção');
  await expect(page.locator('.wiki-section-item')).toHaveCount(1);

  page.once('dialog', (d) => d.accept());
  await page.click('.wiki-section-control-btn');
  await expect(page.locator('.wiki-section-item')).toHaveCount(0);

  await page.click('#wiki-add-section');
  let perguntou = false;
  page.once('dialog', (d) => { perguntou = true; d.dismiss(); });
  await page.click('.wiki-section-control-btn');
  await expect(page.locator('.wiki-section-item')).toHaveCount(0);
  expect(perguntou).toBe(false);
});

test('sair do editor com rascunho avisa; depois de salvar, não avisa', async ({ page }) => {
  await abrirEditor(page);
  await page.fill('#field-title', tituloUnico());

  let avisou = false;
  page.on('dialog', async (d) => { if (d.type() === 'beforeunload') { avisou = true; await d.dismiss(); } });
  await page.click('.wiki-editor-header-crest-link');
  await page.waitForTimeout(600);
  expect(avisou).toBe(true);
  expect(new URL(page.url()).pathname).toBe('/wiki/criar');

  avisou = false;
  await page.fill('#field-summary', 'Resumo.');
  await page.click('#wiki-submit-btn');
  await page.waitForURL(/\/wiki\/doc\?id=/);
  expect(avisou).toBe(false);
});

test('atributo fora da faixa é corrigido para 0 a 10', async ({ page }) => {
  await abrirEditor(page);
  await page.fill('#attr-corpo', '15');
  await page.press('#attr-corpo', 'Tab');
  await expect(page.locator('#attr-corpo')).toHaveValue('10');
  await page.fill('#attr-velocidade', '-3');
  await page.press('#attr-velocidade', 'Tab');
  await expect(page.locator('#attr-velocidade')).toHaveValue('0');
});

test('"Limpar atributos" salva o artigo sem atributos, e a edição não volta o 5', async ({ page }) => {
  await abrirEditor(page);
  await page.fill('#field-title', tituloUnico());
  await page.fill('#field-summary', 'Resumo.');
  await page.click('#wiki-attrs-clear');
  await expect(page.locator('#attr-corpo')).toHaveValue('');
  await page.click('#wiki-submit-btn');
  await page.waitForURL(/\/wiki\/doc\?id=/);
  await expect(page.locator('.wiki-attr-bars')).toHaveCount(0);

  await page.getByRole('link', { name: /Editar/ }).click();
  await page.waitForURL(/\/wiki\/editar/);
  await expect(page.locator('#field-title')).not.toHaveValue('');
  await expect(page.locator('#attr-corpo')).toHaveValue('');
});

test('imagem com endereço quebrado mostra aviso', async ({ page }) => {
  await abrirEditor(page);
  await page.click('#wiki-add-image');
  await page.fill('.wiki-gallery-item-row .wiki-input', '/imagem-que-nao-existe.png');
  await expect(page.locator('.wiki-gallery-img-error')).toBeVisible();
});

// ── Sem login ────────────────────────────────────────────────────────────────

test('sem login: o editor explica e oferece entrar, sem mandar embora', async ({ page }) => {
  await page.goto('/wiki/criar');
  await expect(page.getByText('Entre na sua conta para criar artigos.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/index.html');
  expect(new URL(page.url()).pathname).toBe('/wiki/criar');
});

test('sem login: a lista mostra "Entrar para criar"', async ({ page }) => {
  await page.goto('/wiki');
  const botao = page.locator('#wiki-create-btn');
  await expect(botao).toBeVisible();
  await expect(botao).toContainText('Entrar para criar');
  await expect(botao).toHaveAttribute('href', '/index.html');
});

// ── Lista e artigo ───────────────────────────────────────────────────────────

test('artigo mostra o nome do autor, sem o e-mail completo', async ({ page }) => {
  await abrirEditor(page);
  await page.fill('#field-title', tituloUnico());
  await page.fill('#field-summary', 'Resumo.');
  await page.click('#wiki-submit-btn');
  await page.waitForURL(/\/wiki\/doc\?id=/);
  await expect(page.locator('.wiki-doc-author')).not.toContainText('@');
  await expect(page.locator('.wiki-doc-author')).not.toContainText('teste.local');
});

test('busca sem resultado cita o termo, tem "Limpar busca" e ordena por nome', async ({ page }) => {
  await abrirEditor(page);
  for (const nome of ['Zebra Alada', 'Abelha Rainha']) {
    await page.goto('/wiki/criar');
    await page.waitForSelector('#field-title');
    await page.fill('#field-title', nome + ' ' + Date.now());
    await page.fill('#field-summary', 'Resumo.');
    await page.click('#wiki-submit-btn');
    await page.waitForURL(/\/wiki\/doc\?id=/);
  }

  await page.goto('/wiki');
  await page.waitForSelector('.wiki-card');

  await page.selectOption('#wiki-sort', 'name');
  const titulos = await page.locator('.wiki-card-title').allInnerTexts();
  expect(titulos).toEqual([...titulos].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })));

  await page.fill('#wiki-search', 'qqqqq');
  await expect(page.locator('.wiki-empty')).toContainText('"qqqqq"');
  await page.getByRole('button', { name: 'Limpar busca' }).click();
  await expect(page.locator('.wiki-card').first()).toBeVisible();
  await expect(page.locator('#wiki-search')).toHaveValue('');
});

test('celular: abas cortadas mostram a sombra de "há mais"', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/wiki');
  await expect(page.locator('.wiki-filter-nav')).toHaveClass(/has-more/);
});
