# Odisseia — Bestiário & Enciclopédia

Site de bestiário e enciclopédia do mundo de RPG **Odisseia**: criaturas, espaços e personagens com dados narrativos e táticos.

## Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Backend:** Firebase (Firestore, Auth, Storage)
- **Radar tático:** `radar-rpg.js` (Canvas/SVG)
- **Deploy:** Firebase Hosting

## Setup

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.local.example .env.local
# Preencher com as credenciais do Firebase Console

# 3. Copiar radar-rpg.js real para public/
cp /caminho/para/radar-rpg.js public/radar-rpg.js

# 4. Rodar localmente
npm run dev

# 5. Deploy
npm run build
firebase deploy
```

## Estrutura

```
odisseia/
├── app/           # Páginas (App Router)
├── components/    # Componentes React
├── hooks/         # Custom hooks
├── lib/           # Firebase, Firestore, Auth, Storage, Types
├── public/        # Assets estáticos (radar-rpg.js)
├── firestore.rules
├── storage.rules
└── firebase.json
```

## Admin

1. Criar projeto no Firebase Console
2. Ativar Authentication (Email/Password)
3. Criar coleção `usuarios` no Firestore
4. Adicionar documento: `usuarios/{seu-uid}` com `{ role: "admin", email: "...", criadoEm: "..." }`
5. Acessar `/login` e entrar com as credenciais
