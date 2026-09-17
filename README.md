# Ficha de Personagem — Odisseia

> Aplicação web para criação, gestão e compartilhamento de fichas de personagem de RPG de mesa. Projeto pessoal desenvolvido para uso com amigos e família.

**[→ Acessar o projeto](https://fichas-odisseia.web.app)**

---

## O que é

Uma ficha de personagem digital que substitui a versão em papel, com automação de regras e colaboração em tempo real:

- Cálculo automático de atributos derivados (modificadores, totais, herança de classe e raça)
- Sistema de herança encadeada: bonificações se propagam de raça → classe → habilidades desbloqueadas
- Gerenciamento de inventário com efeitos automáticos sobre atributos
- Sistema de magias, poderes e habilidades da besta companheira
- Compartilhamento de fichas com controle granular de permissão (leitura / edição)
- Presença em tempo real: veja quem está visualizando a mesma ficha simultaneamente
- Temas de cor personalizáveis por ficha
- Dashboard pessoal com todas as fichas do usuário

---

## Stack

**Frontend:** JavaScript puro com ES Modules nativos — sem framework, sem bundler.

A decisão foi deliberada: o estado da aplicação é localizado por seção, sem necessidade de reatividade global. Um arquivo por seção da UI (`js/ui/*.js`) mantém a estrutura direta e navegável. ES Modules nativos nos navegadores modernos tornam o bundler desnecessário para este escopo.

**Backend:** Firebase

| Serviço | Uso |
|---|---|
| Firebase Auth | Autenticação por e-mail e senha |
| Firestore | Persistência de fichas, perfis e metadados de compartilhamento |
| Firebase Hosting | Deploy estático com rewrites de rota |

As Security Rules do Firestore são o mecanismo central de autorização — não existe servidor intermediário. Todo controle de acesso é declarativo no banco.

---

## Arquitetura

```
actual-development/               ← Diretório servido pelo Firebase Hosting
├── index.html                    # Dashboard: login + lista de fichas
├── ficha.html                    # Ficha de personagem
│
├── css/                          # CSS modular — um arquivo por seção visual
│   ├── tokens.css                # Variáveis de design (cores, espaçamento, tipografia)
│   ├── theme.css                 # Temas dinâmicos de cor personalizáveis por ficha
│   └── [besta|combate|magias|pericias|...].css
│
├── js/
│   ├── main.js                   # Entry point: inicialização e orquestração
│   │
│   ├── config/                   # Dados estáticos das regras (sem lógica)
│   │   ├── classes.js            # Definição de classes e atributos base
│   │   ├── herancas.js           # Tabelas de bônus racial e de classe
│   │   ├── aspectos-besta.js     # Aspectos e habilidades da besta companheira
│   │   ├── onus.js               # Sistema de ônus
│   │   └── condicoes.js, efeitos-condicoes.js
│   │
│   ├── core/                     # Lógica de negócio — sem acesso ao DOM
│   │   ├── firebase-service.js   # Abstração de todas as operações Firebase
│   │   ├── sheet-serializer.js   # Serialização e restauração do estado da ficha
│   │   ├── calculation.js        # Cálculos de atributos derivados
│   │   ├── heranca-logic.js      # Propagação encadeada de bônus de herança
│   │   ├── item-effects.js       # Efeitos de itens sobre atributos
│   │   └── state.js, autocomplete.js, data-loader.js, dom-helpers.js, utils.js
│   │
│   ├── ui/                       # Componentes de UI — manipulam o DOM
│   │   ├── besta.js              # Sistema da besta companheira
│   │   ├── combat.js             # Seção de combate
│   │   ├── inventory.js          # Inventário e equipamentos
│   │   ├── magias.js             # Magias e magia de herança
│   │   ├── skills.js             # Perícias
│   │   ├── powers.js             # Poderes
│   │   ├── vitals.js             # Vida, mana e atributos principais
│   │   ├── share.js              # Interface de compartilhamento e colaboração
│   │   └── [header|tabs|theme|portrait|anotacoes|...].js
│   │
│   └── vendor/
│       └── radar-rpg.js          # Gráfico de radar para perfil de atributos
│
├── data/                         # Catálogos do sistema em JSON
│   ├── itens.json
│   ├── magias.json
│   └── poderes.json
│
└── image/                        # Ícones SVG/ICO por classe e elemento
```

### Fluxo de dados

```
Usuário abre ficha.html
        ↓
main.js inicializa Firebase e aguarda autenticação
        ↓
sheet-serializer.js carrega os dados do Firestore
        ↓
Cada módulo ui/*.js renderiza sua seção
        ↓
Usuário edita → calculation.js + heranca-logic.js recalculam e atualizam state.js
        ↓
Auto-save: sheet-serializer.js serializa e persiste no Firestore
        ↓
listenToSheet() propaga as mudanças em tempo real para outros usuários na mesma ficha
```

---

## Decisões de design

**Separação `core/` vs `ui/`** — Toda lógica de negócio (cálculos, serialização, acesso ao Firebase) fica em `core/` sem tocar no DOM. Os módulos em `ui/` são responsáveis apenas por renderização e eventos. A lógica é isolada e substituível sem afetar a UI.

**Herança encadeada** — As bonificações do sistema se propagam: raça → classe → habilidades desbloqueadas. O módulo `heranca-logic.js` resolve esse grafo de forma declarativa a partir dos dados em `config/herancas.js`, sem lógica hardcoded por classe.

**Security Rules como contrato** — As Firestore Security Rules definem o modelo de permissão completo: dono (`owner`), editores (`sharedUidsEdit`), leitores (`sharedUids`). Mudanças no modelo de compartilhamento começam pelas rules, não pelo código JS.

---

## Licença

[MIT](LICENSE)
