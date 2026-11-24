import { test as base, expect } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CACHE = join(import.meta.dirname, '.cdn-cache');

/**
 * Prepara o contexto do navegador para teste:
 * - bloqueia as fontes do Google (o site abre igual);
 * - guarda em disco os scripts do Firebase vindos do CDN da Google.
 *   Na primeira vez baixa (com novas tentativas). Depois lê do disco,
 *   assim o teste não depende de uma rede externa lenta.
 */
export async function prepararContexto(context) {
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

  await context.route(/www\.gstatic\.com\/firebasejs\//, async (route) => {
    const url = new URL(route.request().url());
    const arquivo = join(CACHE, url.pathname.replace(/[^\w.-]/g, '_'));
    if (existsSync(arquivo)) {
      return route.fulfill({
        status: 200,
        contentType: 'text/javascript; charset=utf-8',
        headers: { 'access-control-allow-origin': '*' },
        body: readFileSync(arquivo),
      });
    }
    let ultimoErro;
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      try {
        const resposta = await route.fetch({ timeout: 20_000 });
        const corpo = await resposta.body();
        if (resposta.ok()) {
          mkdirSync(CACHE, { recursive: true });
          writeFileSync(arquivo, corpo);
        }
        return route.fulfill({ response: resposta, body: corpo });
      } catch (e) {
        ultimoErro = e;
      }
    }
    return route.abort().catch(() => ultimoErro);
  });
  return context;
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await prepararContexto(context);
    await use(context);
  },
});

export { expect };

/** Abre uma página em um contexto novo (outra pessoa, outra sessão). */
export async function novaPessoa(browser) {
  const context = await prepararContexto(await browser.newContext());
  return context.newPage();
}
