export const SENHA = 'senha-teste-123';

export function novoEmail(prefixo = 'user') {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@teste.local`;
}

/** Cria conta pela tela do dashboard e espera a lista de fichas aparecer. */
export async function criarConta(page, email, senha = SENHA) {
  await page.goto('/');
  await page.fill('#email', email);
  await page.fill('#password', senha);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.locator('#dashboard').waitFor({ state: 'visible' });
}

/** Cria uma ficha pelo dashboard (responde o prompt do navegador). */
export async function criarFicha(page, nome) {
  page.once('dialog', (d) => d.accept(nome));
  await page.getByRole('button', { name: 'Nova ficha' }).click();
  await page.locator('.ficha-nome', { hasText: nome }).waitFor();
}
