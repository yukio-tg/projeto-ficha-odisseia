# Ficha de Personagem — Odisseia

> Aplicação web para criação, gestão e compartilhamento de fichas de personagem de RPG de mesa. Projeto pessoal desenvolvido para uso com amigos e família.

**[→ Acessar o projeto](https://fichas-odisseia.web.app)**

---

## O que é

Uma ficha de personagem digital do sistema Odisseia, com colaboração em tempo real:

- Dois modos visíveis: **Regras** (a fórmula preenche os derivados) e **Livre** (o número escrito fica até a pessoa pedir Recalcular)
- Herança, perícias, combate, magias, poderes, inventário e besta companheira
- Anotações em um editor; a aba Geral mostra a prévia
- Compartilhamento com leitura ou edição; ficha pública ainda exige conta no site
- Presença: quem está com a ficha aberta
- Tema de cor gravado na ficha
- Dashboard com as fichas da pessoa e as que foram compartilhadas com ela
- Wiki (Enciclopédia Ascalon) na mesma origem

---

## Stack

**Frontend:** HTML, CSS e JavaScript com ES Modules nativos. Sem framework e sem bundler. O Firebase Hosting publica a pasta `actual-development/`.

**Backend:** Firebase Auth, Firestore e Hosting. A autorização é a das Security Rules; não há servidor próprio.

O dashboard entra com o SDK compat (script clássico, login por `onclick`). A ficha e a wiki usam o SDK modular. Os três não compartilham um cliente só: reescrever o login do dashboard para unificar a inicialização arriscaria a sessão. A paleta, sim, é uma só (`actual-development/css/palette.css` e `actual-development/js/theme-palette.js`).

---

## Árvore

```
actual-development/                 ← o que o Hosting publica
├── index.html                      # Dashboard: login e lista de fichas
├── dashboard.css
├── css/palette.css                 # Cores compartilhadas
├── js/theme-palette.js             # Geradores de tema (ficha, wiki, ícone do dashboard)
├── firebase-config.example.js
├── ficha/
│   ├── ficha.html                  # Ficha (rota /ficha)
│   ├── css/                        # Um arquivo por seção; tokens.css importa a paleta
│   ├── js/
│   │   ├── main.js                 # Auth, carga, fila de save, realtime
│   │   ├── core/                   # Serializer, trava de save, cálculos, Firebase
│   │   ├── ui/                     # Abas, tema, compartilhamento, combate, …
│   │   └── vendor/radar-rpg.js
│   └── data/                       # Catálogos JSON (poderes, magias, itens)
└── wiki/                           # Enciclopédia (rotas /wiki, /wiki/doc, …)
```

`reference/` guarda o bestiário em Next.js e não entra no deploy.

---

## Como a ficha guarda o estado

O save não fotografa o DOM no meio de um recálculo. `serializeSheet` grava um snapshot em memória (campos, radar, cards, `manualOverrides`, `protectionBases`, `bonusAprendizadoFlag`, `sheetMode`). Enquanto a ficha está hidratando, o save devolve essa cópia estável. O DOM é a vista: a hidratação preenche a tela sem disparar o cálculo de novo.

O realtime ignora o eco da gravação que este cliente acabou de enviar e não aplica snapshot remoto enquanto um save local está na fila ou em voo (`save-guard.js`).

No modo Regras o cálculo pode escrever os derivados, exceto onde há override manual. No modo Livre o número escrito permanece até o Recalcular daquele bloco. A flag de Aprendizado de Vida e as bases de proteção, quando restauradas, impedem que o bônus seja somado outra vez no load seguinte.

---

## Teste

Na raiz de `projeto-ficha-odisseia`:

```bash
node --test actual-development/ficha/js/core/sheet-trust.test.mjs
```

Cobre a ida e volta do snapshot (número não editado permanece), o eco do save, o override manual e o bônus de herança/proteção que não empilha no segundo load. Não há jsdom: o que depende de DOM fica de fora.

---

## Licença

[MIT](LICENSE)
