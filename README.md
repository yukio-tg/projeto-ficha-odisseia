# Ficha de Personagem — Odisseia

> Aplicação web para criação, gestão e compartilhamento de fichas de personagem do RPG **Odisseia**. Funciona com autenticação real, persistência em nuvem e colaboração em tempo real.

**[→ Acessar o projeto ao vivo](https://fichas-odisseia.web.app)**

---

## O que é este projeto

**Odisseia** é um sistema de RPG de mesa brasileiro. Este projeto é uma ficha de personagem digital que substitui a versão impressa, adicionando automação e colaboração:

- Cálculo automático de atributos derivados (modificadores, totais, herança de classe e raça)
- Sistema de herança encadeada: bonificações se propagam de raça → classe → habilidades desbloqueadas
- Gerenciamento de inventário com efeitos automáticos sobre atributos
- Sistema de magias, poderes e habilidades da besta companheira
- Compartilhamento de fichas com controle granular de permissão (leitura / edição)
- Presença em tempo real: veja quem está visualizando a mesma ficha simultaneamente
- Temas de cor personalizáveis por ficha
- Dashboard pessoal com todas as fichas do usuário

---

## Stack e decisões técnicas

### Por que Vanilla JS sem framework?

Este projeto usa **JavaScript puro com ES Modules nativos** — sem React, Vue, Angular ou bundler.

A decisão foi deliberada:

- A ficha tem estado localizado por seção — não há benefício real em um VDOM ou reatividade global
- ES Modules nativos nos navegadores modernos eliminam a necessidade de bundler para este escopo
- Um arquivo por seção da UI (`js/ui/*.js`) torna a navegação e manutenção direta
- Exercício consciente de domínio das APIs do browser sem abstrações intermediárias

### Firebase como backend

| Serviço | Uso |
|---|---|
| **Firebase Auth** | Autenticação por e-mail e senha |
| **Firestore** | Persistência de fichas, perfis e metadados de compartilhamento |
| **Firebase Hosting** | Deploy estático com rewrites de rota |

As **Security Rules do Firestore** são o mecanismo central de autorização — não existe servidor intermediário. Todo controle de acesso é declarativo no banco.

---

## Arquitetura

```
actual-development/          ← Diretório servido pelo Firebase Hosting
├── index.html               # Dashboard: login + lista de fichas
├── ficha.html               # Ficha de personagem (página principal)
│
├── css/                     # CSS modular — um arquivo por seção visual
│   ├── tokens.css           # Variáveis de design (cores, espaçamento, tipografia)
│   ├── theme.css            # Temas dinâmicos de cor (personalizável por ficha)
│   └── [besta|combate|magias|pericias|...].css
│
├── js/
│   ├── main.js              # Entry point: inicialização e orquestração dos módulos
│   │
│   ├── config/              # Dados estáticos do sistema de regras (sem lógica)
│   │   ├── classes.js       # Definição de classes e atributos base
│   │   ├── herancas.js      # Tabelas de bônus racial e de classe
│   │   ├── aspectos-besta.js   # Aspectos e habilidades da besta companheira
│   │   ├── onus.js          # Sistema de ônus
│   │   └── condicoes.js, efeitos-condicoes.js
│   │
│   ├── core/                # Lógica de negócio — sem acesso direto ao DOM
│   │   ├── firebase-service.js   # Abstração de todas as operações Firebase
│   │   ├── sheet-serializer.js   # Serialização e restauração do estado da ficha
│   │   ├── calculation.js        # Cálculos de atributos derivados
│   │   ├── heranca-logic.js      # Propagação encadeada de bônus de herança
│   │   ├── item-effects.js       # Efeitos de itens sobre atributos
│   │   └── state.js, autocomplete.js, data-loader.js, dom-helpers.js, utils.js
│   │
│   ├── ui/                  # Componentes de UI — manipulam o DOM
│   │   ├── besta.js         # Sistema da besta companheira
│   │   ├── combat.js        # Seção de combate
│   │   ├── inventory.js     # Inventário e equipamentos
│   │   ├── magias.js        # Magias e magia de herança
│   │   ├── skills.js        # Perícias
│   │   ├── powers.js        # Poderes
│   │   ├── vitals.js        # Vida, mana e atributos principais
│   │   ├── share.js         # Interface de compartilhamento e colaboração
│   │   └── [header|tabs|theme|portrait|anotacoes|...].js
│   │
│   └── vendor/
│       └── radar-rpg.js     # Gráfico de radar para perfil de atributos
│
├── data/                    # JSON com catálogos do sistema de regras
│   ├── itens.json
│   ├── magias.json
│   └── poderes.json
│
├── image/                   # Ícones e assets por classe e elemento
└── firebase-config.example.js   # Template de configuração Firebase (ver abaixo)
```

### Fluxo principal de dados

```
Usuário abre ficha.html
        ↓
main.js inicializa Firebase e aguarda autenticação (waitForAuth)
        ↓
sheet-serializer.js carrega dados do Firestore via firebase-service.js
        ↓
Cada módulo ui/*.js recebe os dados e renderiza sua seção
        ↓
Usuário edita → cálculos em calculation.js + heranca-logic.js atualizam state.js
        ↓
Auto-save: sheet-serializer.js serializa e envia ao Firestore
        ↓
listenToSheet() propaga mudanças em tempo real para outros usuários na mesma ficha
```

---

## Como rodar localmente

### Pré-requisitos

- Navegador moderno com suporte a ES Modules (Chrome 80+, Firefox 80+, Edge 80+)
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- Conta Google com um projeto Firebase próprio

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/projeto-de-ficha-odisseia.git
cd projeto-de-ficha-odisseia
```

### 2. Configure o Firebase

Crie um projeto no [Firebase Console](https://console.firebase.google.com) com:
- **Authentication** habilitado (método: E-mail/senha)
- **Firestore Database** criado (modo produção)

Copie o template e preencha com suas credenciais:

```bash
cp actual-development/firebase-config.example.js actual-development/firebase-config.js
```

Edite `actual-development/firebase-config.js` com os dados do seu projeto:

```js
export const FIREBASE_CONFIG = {
    apiKey: "SUA_API_KEY",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto",
    storageBucket: "seu-projeto.firebasestorage.app",
    messagingSenderId: "SEU_ID",
    appId: "SEU_APP_ID"
};
```

> O arquivo `firebase-config.js` está no `.gitignore` — suas credenciais não serão commitadas.

### 3. Publique as regras do Firestore

```bash
firebase login
firebase use --add     # selecione seu projeto
firebase deploy --only firestore:rules
```

### 4. Rode localmente

```bash
firebase serve
```

Acesse `http://localhost:5000`.

> **Por que `firebase serve` e não abrir o HTML diretamente?**  
> O projeto usa ES Modules com imports relativos e rewrites de rota (`/ficha` → `ficha.html`). Um servidor HTTP é necessário para o CORS e os rewrites funcionarem corretamente.

---

## Decisões de design notáveis

### Separação `core/` vs `ui/`

Todo código com lógica de negócio (cálculos, serialização, acesso ao Firebase) fica em `core/` sem tocar no DOM. Os módulos em `ui/` são responsáveis apenas por renderização e captura de eventos. Isso mantém a lógica testável e isolada das variações de UI.

### Herança encadeada

O sistema Odisseia tem bonificações que se propagam: raça → classe → habilidades desbloqueadas. O módulo `heranca-logic.js` calcula esse grafo de dependências de forma declarativa a partir dos dados em `config/herancas.js`, sem lógica hardcoded por classe.

### Security Rules como contrato de dados

As Firestore Security Rules não são apenas proteção — elas definem explicitamente o modelo de permissão: quem é dono (`owner`), quem pode editar (`sharedUidsEdit`), quem pode só ler (`sharedUids`). Qualquer mudança no modelo de compartilhamento começa pelas rules, não pelo código JS.

---

## Sobre o sistema Odisseia

[Odisseia](https://www.burobrasil.com/odisseia) é um RPG de mesa brasileiro publicado pela Buro Brasil. Este projeto é um fan project pessoal sem vínculo oficial com a editora.

---

## Licença

[MIT](LICENSE) — sinta-se livre para usar como referência, fazer fork ou adaptar para outros sistemas de RPG.

---

## Segurança

Para informações sobre a política de segurança e como reportar vulnerabilidades, veja [SECURITY.md](SECURITY.md).
