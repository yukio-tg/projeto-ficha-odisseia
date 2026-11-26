// Testa as regras de acesso (firestore.rules) contra o emulador.
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let env;
before(async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-odisseia',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'sheets/privada'), { owner: 'ana', name: 'Privada', sharedUids: [], sharedUidsEdit: [], isPublic: false });
    await setDoc(doc(db, 'sheets/leitura'), { owner: 'ana', name: 'Leitura', sharedUids: ['bia'], sharedUidsEdit: [], isPublic: false });
    await setDoc(doc(db, 'sheets/edicao'), { owner: 'ana', name: 'Edicao', sharedUids: ['bia'], sharedUidsEdit: ['bia'], isPublic: false });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

test('sem login: não lê nem cria ficha', async () => {
  await assertFails(getDoc(doc(anon(), 'sheets/privada')));
  await assertFails(setDoc(doc(anon(), 'sheets/nova'), { owner: 'ana' }));
});

test('dono lê, edita e apaga a própria ficha', async () => {
  const db = as('ana');
  await assertSucceeds(getDoc(doc(db, 'sheets/privada')));
  await assertSucceeds(updateDoc(doc(db, 'sheets/privada'), { name: 'Novo nome' }));
  await assertSucceeds(deleteDoc(doc(db, 'sheets/privada')));
});

test('qualquer conta cria ficha só em seu nome', async () => {
  await assertSucceeds(setDoc(doc(as('bia'), 'sheets/da-bia'), { owner: 'bia', name: 'X' }));
  await assertFails(setDoc(doc(as('bia'), 'sheets/falsa'), { owner: 'ana', name: 'X' }));
});

test('outra pessoa não lê ficha privada', async () => {
  await assertFails(getDoc(doc(as('caio'), 'sheets/privada')));
});

test('compartilhada só para leitura: lê, mas não edita', async () => {
  const db = as('bia');
  await assertSucceeds(getDoc(doc(db, 'sheets/leitura')));
  await assertFails(updateDoc(doc(db, 'sheets/leitura'), { name: 'Hack' }));
});

test('compartilhada com edição: edita os dados, mas não troca o dono nem apaga', async () => {
  const db = as('bia');
  await assertSucceeds(updateDoc(doc(db, 'sheets/edicao'), { name: 'Editada' }));
  await assertFails(updateDoc(doc(db, 'sheets/edicao'), { owner: 'bia' }));
  await assertFails(deleteDoc(doc(db, 'sheets/edicao')));
});

test('ficha pública ainda exige conta', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'sheets/publica'), { owner: 'ana', isPublic: true, publicPermission: 'read' });
  });
  await assertFails(getDoc(doc(anon(), 'sheets/publica')));
  await assertSucceeds(getDoc(doc(as('caio'), 'sheets/publica')));
});

test('perfil: cada pessoa escreve só o próprio', async () => {
  await assertSucceeds(setDoc(doc(as('ana'), 'users/ana'), { email: 'ana@x.com' }));
  await assertFails(setDoc(doc(as('bia'), 'users/ana'), { email: 'hack@x.com' }));
});

test('wiki: leitura aberta; comunidade exige login; canônico exige admin', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'wiki_docs/d1'), { authorId: 'ana', status: 'community' });
    await setDoc(doc(ctx.firestore(), 'admins/root'), { ok: true });
  });
  await assertSucceeds(getDoc(doc(anon(), 'wiki_docs/d1')));
  await assertFails(setDoc(doc(anon(), 'wiki_docs/d2'), { authorId: 'x', status: 'community' }));
  await assertSucceeds(setDoc(doc(as('bia'), 'wiki_docs/d3'), { authorId: 'bia', status: 'community' }));
  await assertFails(setDoc(doc(as('bia'), 'wiki_docs/d4'), { authorId: 'bia', status: 'canonical' }));
  await assertSucceeds(setDoc(doc(as('root'), 'wiki_docs/d5'), { authorId: 'root', status: 'canonical' }));
});
