# Odisseia RPG — Bestiário & Enciclopédia
## Especificação Técnica Completa

---

## 1. Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│              Next.js 14 (App Router)                         │
│   React + Tailwind CSS + radar-rpg.js (Canvas/SVG)           │
│                 Firebase Hosting                              │
└───────────────────────┬─────────────────────────────────────┘
                        │ SDK Firebase (client-side)
┌───────────────────────▼─────────────────────────────────────┐
│                      FIREBASE                                 │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │   Firestore     │  │  Authentication  │  │  Storage   │  │
│  │ (banco de dados)│  │ (email/password) │  │  (imagens) │  │
│  └─────────────────┘  └──────────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Stack completa:**
- **Framework:** Next.js 14 com App Router
- **Estilização:** Tailwind CSS
- **Banco de dados:** Firebase Firestore (NoSQL)
- **Auth:** Firebase Authentication (email/senha)
- **Storage:** Firebase Storage (imagens das entidades)
- **Deploy:** Firebase Hosting (via `firebase deploy`)
- **Radar tático:** `radar-rpg.js` (componente vanilla JS, integrado via `useEffect`)

---

## 2. Estrutura de Diretórios

```
odisseia/
├── app/
│   ├── layout.tsx                  # Layout raiz (Providers, nav)
│   ├── page.tsx                    # Home / página de busca
│   ├── criaturas/
│   │   ├── page.tsx                # Listagem de criaturas
│   │   └── [id]/page.tsx           # Detalhe de criatura
│   ├── espacos/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── personagens/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── admin/
│       ├── layout.tsx              # Guard de autenticação admin
│       ├── page.tsx                # Dashboard admin
│       ├── criaturas/
│       │   ├── page.tsx            # Lista com botões editar/deletar
│       │   ├── nova/page.tsx       # Formulário criação
│       │   └── [id]/editar/page.tsx
│       ├── espacos/ (mesma estrutura)
│       └── personagens/ (mesma estrutura)
├── components/
│   ├── ui/
│   │   ├── SearchBar.tsx
│   │   ├── EntityCard.tsx          # Card reutilizável (criatura/espaço/personagem)
│   │   ├── ImageGallery.tsx
│   │   └── LoadingSpinner.tsx
│   ├── radar/
│   │   └── RadarChart.tsx          # Wrapper React para radar-rpg.js
│   ├── powers/
│   │   └── PowerTree.tsx           # Árvore de poderes interativa
│   ├── admin/
│   │   ├── EntityForm.tsx          # Formulário genérico de entidade
│   │   └── ImageUploader.tsx
│   └── layout/
│       ├── Navbar.tsx
│       └── AuthProvider.tsx
├── lib/
│   ├── firebase.ts                 # Inicialização Firebase
│   ├── firestore.ts                # Funções CRUD por coleção
│   ├── storage.ts                  # Upload/delete de imagens
│   ├── auth.ts                     # Login, logout, verificar role
│   └── types.ts                    # TypeScript interfaces
├── hooks/
│   ├── useAuth.ts
│   ├── useSearch.ts
│   └── useEntity.ts
├── public/
│   └── radar-rpg.js                # Componente de radar (copiado aqui)
├── firebase.json
├── .firebaserc
└── firestore.rules
```

---

## 3. Esquemas JSON — Firestore

### 3.1 Coleção: `criaturas`

```json
{
  "id": "criatura_sombravore",
  "slug": "sombravore",
  "nome": "Sombravore",
  "subtitulo": "O Devorador das Almas Perdidas",
  "tipo": "criatura",
  "categoria": "Não-Morto",
  "raridade": "Raro",
  "ameaca": 4,

  "narrativa": {
    "resumo": "Criatura espectral que se alimenta da essência vital dos vivos, nascida das sombras do Abismo de Kael'drath.",
    "descricao_longa": "Dizem os anciãos que o Sombravore não escolhe suas vítimas ao acaso...",
    "lore": "Nas eras antes da Grande Cisão, quando os véus entre os planos ainda eram finos...",
    "habitat": "Ruínas de Kael'drath, cavernas profundas, locais de morte em massa",
    "comportamento": "Solitário, crepuscular, territorialista"
  },

  "imagens": [
    {
      "url": "gs://odisseia-app.appspot.com/criaturas/sombravore/principal.jpg",
      "urlPublica": "https://firebasestorage.googleapis.com/...",
      "tipo": "principal",
      "legenda": "Sombravore emergindo das névoas de Kael'drath"
    },
    {
      "url": "gs://odisseia-app.appspot.com/criaturas/sombravore/detalhe.jpg",
      "urlPublica": "https://...",
      "tipo": "detalhe",
      "legenda": "Garra do Sombravore"
    }
  ],

  "tatico": {
    "nivel": 8,
    "atributos": {
      "FOR": 12,
      "DES": 15,
      "CAR": 6,
      "SAB": 9,
      "INT": 7,
      "CON": 14
    },
    "modificadores": {
      "FOR": "",
      "DES": "+2",
      "CAR": "",
      "SAB": "",
      "INT": "",
      "CON": "+3"
    },
    "poderes": [
      {
        "id": "toque_drenante",
        "nome": "Toque Drenante",
        "tier": 1,
        "descricao": "Drena 1d6 de vitalidade ao acertar um alvo.",
        "efeitos": ["Cura o Sombravore em 1d6 PV", "Alvo fica com Enfraquecido por 1 turno"],
        "pre_requisitos": [],
        "tipo": "ativo",
        "cooldown": "1/turno"
      },
      {
        "id": "forma_nebulosa",
        "nome": "Forma Nebulosa",
        "tier": 2,
        "descricao": "Transforma-se em névoa por até 3 turnos, tornando-se intangível.",
        "efeitos": ["Imune a dano físico", "Não pode atacar", "Velocidade de movimento dobrada"],
        "pre_requisitos": ["toque_drenante"],
        "tipo": "ativo",
        "cooldown": "1/combate"
      },
      {
        "id": "aura_medo",
        "nome": "Aura de Medo",
        "tier": 3,
        "descricao": "Passiva. Criaturas a menos de 5m fazem teste de Sabedoria CD 14 ou ficam Amedrontadas.",
        "efeitos": ["Amedrontado: -2 em ataques contra o Sombravore"],
        "pre_requisitos": ["forma_nebulosa"],
        "tipo": "passivo",
        "cooldown": null
      }
    ]
  },

  "relacoes": {
    "espacos": ["espaco_kael_drath"],
    "personagens": [],
    "criaturas_relacionadas": ["espectro_menor"]
  },

  "meta": {
    "criadoPor": "uid_admin_123",
    "criadoEm": "2024-03-15T14:30:00Z",
    "atualizadoEm": "2024-03-20T10:00:00Z",
    "versao": 2,
    "publicado": true
  }
}
```

### 3.2 Coleção: `espacos`

```json
{
  "id": "espaco_kael_drath",
  "slug": "abismo-de-kaeldrath",
  "nome": "Abismo de Kael'drath",
  "subtitulo": "Onde a Luz Jamais Tocou o Chão",
  "tipo": "espaco",
  "categoria": "Dungeon",
  "tags": ["perigoso", "magico", "subterraneo"],

  "narrativa": {
    "resumo": "Uma fenda sobrenatural que corta as montanhas de Valdrath, onde o tecido da realidade é mais fino.",
    "descricao_longa": "O Abismo de Kael'drath não foi escavado por mãos — ele rasgou a si mesmo...",
    "historia": "Formado durante a Grande Cisão de 412 do Calendário Arcano...",
    "atmosfera": "Névoa constante, temperatura sempre abaixo do natural, sons distantes sem origem aparente",
    "pontos_de_interesse": [
      "O Trono de Sombra — pedra central onde o sumo sacerdote Kael'drath foi transformado",
      "Os Portais Selados — seis arcos que outrora conectavam outros planos",
      "A Câmara das Lamentações — onde ecos de almas presas ainda sussurram"
    ]
  },

  "imagens": [
    {
      "url": "gs://odisseia-app.appspot.com/espacos/kaeldrath/entrada.jpg",
      "urlPublica": "https://...",
      "tipo": "principal",
      "legenda": "A entrada do Abismo, coberta de névoa perpétua"
    }
  ],

  "dados_mecanicos": {
    "nivel_recomendado": "7-10",
    "dificuldade": "Alta",
    "tipo_terreno": "Subterrâneo / Espectral",
    "modificadores_ambientais": [
      "Magia de luz tem alcance reduzido à metade",
      "Criaturas não-mortas recebem +2 em todos os testes",
      "Descanso longo não restaura pontos de magia"
    ]
  },

  "relacoes": {
    "criaturas": ["criatura_sombravore", "espectro_menor"],
    "personagens": ["personagem_kael_antigo"],
    "espacos_conectados": ["espaco_montanhas_valdrath"]
  },

  "meta": {
    "criadoPor": "uid_admin_123",
    "criadoEm": "2024-03-10T09:00:00Z",
    "atualizadoEm": "2024-03-18T16:00:00Z",
    "versao": 1,
    "publicado": true
  }
}
```

### 3.3 Coleção: `personagens`

```json
{
  "id": "personagem_valdris_arcano",
  "slug": "valdris-o-arcano",
  "nome": "Valdris, o Arcano",
  "subtitulo": "Arquimago do Conselho das Sete Torres",
  "tipo": "personagem",
  "categoria": "Aliado",
  "alinhamento": "Neutro Bom",
  "faccao": "Conselho das Sete Torres",

  "narrativa": {
    "resumo": "O mais velho dos arquimagos vivos, guardião dos segredos da Grande Cisão.",
    "biografia": "Nascido na cidade de Arethas há mais de 200 anos, Valdris descobriu sua aptidão mágica...",
    "personalidade": "Frio em aparência, profundamente compassivo em seus atos. Fala em meias palavras.",
    "objetivos": "Impedir que os Portais Selados de Kael'drath sejam reabertos.",
    "segredos": "Esteve presente na Grande Cisão e carrega parte da culpa pelo que aconteceu."
  },

  "imagens": [
    {
      "url": "gs://odisseia-app.appspot.com/personagens/valdris/retrato.jpg",
      "urlPublica": "https://...",
      "tipo": "principal",
      "legenda": "Valdris em seus aposentos na Torre Prateada"
    }
  ],

  "tatico": {
    "nivel": 17,
    "classe": "Mago / Arquimago",
    "atributos": {
      "FOR": 6,
      "DES": 9,
      "CAR": 13,
      "SAB": 16,
      "INT": 20,
      "CON": 10
    },
    "modificadores": {
      "FOR": "",
      "DES": "",
      "CAR": "",
      "SAB": "+3",
      "INT": "+5",
      "CON": ""
    },
    "poderes": [
      {
        "id": "magia_arcana",
        "nome": "Magia Arcana",
        "tier": 1,
        "descricao": "Acesso a magias de até círculo 9.",
        "efeitos": ["Pode lançar qualquer magia do grimório"],
        "pre_requisitos": [],
        "tipo": "passivo",
        "cooldown": null
      },
      {
        "id": "maestria_temporal",
        "nome": "Maestria Temporal",
        "tier": 3,
        "descricao": "Uma vez por dia, pode repetir uma magia como ação bônus.",
        "efeitos": ["Duplica o efeito de uma magia já lançada"],
        "pre_requisitos": ["magia_arcana"],
        "tipo": "ativo",
        "cooldown": "1/dia"
      }
    ]
  },

  "relacoes": {
    "espacos": ["espaco_torre_prateada"],
    "criaturas": [],
    "personagens_relacionados": ["personagem_kael_antigo"]
  },

  "meta": {
    "criadoPor": "uid_admin_123",
    "criadoEm": "2024-03-12T11:00:00Z",
    "atualizadoEm": "2024-03-12T11:00:00Z",
    "versao": 1,
    "publicado": true
  }
}
```

### 3.4 Coleção: `usuarios` (roles)

```json
{
  "uid": "uid_admin_123",
  "email": "admin@odisseia.com",
  "role": "admin",
  "criadoEm": "2024-01-01T00:00:00Z"
}
```

> Usuários comuns **não** precisam de documento nesta coleção — a ausência de documento (ou `role !== 'admin'`) já implica acesso de leitura.

---

## 4. Configuração Firebase

### 4.1 Regras do Firestore (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Função auxiliar: verifica se é admin
    function isAdmin() {
      return request.auth != null
        && exists(/databases/$(database)/documents/usuarios/$(request.auth.uid))
        && get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.role == 'admin';
    }

    // Entidades públicas: qualquer autenticado pode ler; só admin escreve
    match /criaturas/{id} {
      allow read: if resource.data.publicado == true || isAdmin();
      allow create, update, delete: if isAdmin();
    }

    match /espacos/{id} {
      allow read: if resource.data.publicado == true || isAdmin();
      allow create, update, delete: if isAdmin();
    }

    match /personagens/{id} {
      allow read: if resource.data.publicado == true || isAdmin();
      allow create, update, delete: if isAdmin();
    }

    // Roles: só admin lê e escreve
    match /usuarios/{uid} {
      allow read: if request.auth.uid == uid || isAdmin();
      allow write: if isAdmin();
    }
  }
}
```

### 4.2 Regras do Storage (`storage.rules`)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function isAdmin() {
      return request.auth != null
        && firestore.exists(/databases/(default)/documents/usuarios/$(request.auth.uid))
        && firestore.get(/databases/(default)/documents/usuarios/$(request.auth.uid)).data.role == 'admin';
    }

    // Imagens: qualquer um lê; só admin faz upload/delete
    match /criaturas/{allPaths=**} {
      allow read: if true;
      allow write: if isAdmin() && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }

    match /espacos/{allPaths=**} {
      allow read: if true;
      allow write: if isAdmin() && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }

    match /personagens/{allPaths=**} {
      allow read: if true;
      allow write: if isAdmin() && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

### 4.3 Índices Firestore (`firestore.indexes.json`)

```json
{
  "indexes": [
    {
      "collectionGroup": "criaturas",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "publicado", "order": "ASCENDING" },
        { "fieldPath": "nome", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "criaturas",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "publicado", "order": "ASCENDING" },
        { "fieldPath": "categoria", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "espacos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "publicado", "order": "ASCENDING" },
        { "fieldPath": "nome", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "personagens",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "publicado", "order": "ASCENDING" },
        { "fieldPath": "nome", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 5. Implementação do Frontend

### 5.1 Inicialização Firebase (`lib/firebase.ts`)

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
```

### 5.2 Funções Firestore (`lib/firestore.ts`)

```typescript
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit, startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

type Colecao = 'criaturas' | 'espacos' | 'personagens';

// ── Leitura ──────────────────────────────────────────────────
export async function listarEntidades(col: Colecao, cursor?: DocumentSnapshot) {
  let q = query(
    collection(db, col),
    where('meta.publicado', '==', true),
    orderBy('nome'),
    limit(50)
  );
  if (cursor) q = query(q, startAfter(cursor));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function buscarEntidade(col: Colecao, id: string) {
  const snap = await getDoc(doc(db, col, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// Busca por nome (prefix match, client-side filtering para <50 docs)
export async function buscarPorNome(termo: string) {
  const colecoes: Colecao[] = ['criaturas', 'espacos', 'personagens'];
  const termoLower = termo.toLowerCase();
  const resultados = await Promise.all(
    colecoes.map(async col => {
      const todos = await listarEntidades(col);
      return todos
        .filter(e => (e as any).nome.toLowerCase().includes(termoLower))
        .map(e => ({ ...e, _colecao: col }));
    })
  );
  return resultados.flat();
}

// ── Admin: escrita ───────────────────────────────────────────
export async function criarEntidade(col: Colecao, dados: object) {
  return addDoc(collection(db, col), dados);
}

export async function atualizarEntidade(col: Colecao, id: string, dados: object) {
  return updateDoc(doc(db, col, id), dados);
}

export async function deletarEntidade(col: Colecao, id: string) {
  return deleteDoc(doc(db, col, id));
}
```

### 5.3 Autenticação (`lib/auth.ts`)

```typescript
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function login(email: string, senha: string) {
  return signInWithEmailAndPassword(auth, email, senha);
}

export async function logout() {
  return firebaseSignOut(auth);
}

export async function verificarRole(uid: string): Promise<'admin' | 'user'> {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  if (snap.exists() && snap.data().role === 'admin') return 'admin';
  return 'user';
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
```

### 5.4 Hook de Auth (`hooks/useAuth.ts`)

```typescript
'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, verificarRole } from '@/lib/auth';

interface AuthState {
  user: User | null;
  role: 'admin' | 'user' | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthState>({
  user: null, role: null, loading: true
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, role: null, loading: true
  });

  useEffect(() => {
    return onAuthChange(async (user) => {
      if (user) {
        const role = await verificarRole(user.uid);
        setState({ user, role, loading: false });
      } else {
        setState({ user: null, role: null, loading: false });
      }
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
```

---

## 6. Integração do radar-rpg.js

### 6.1 Wrapper React (`components/radar/RadarChart.tsx`)

```typescript
'use client';
import { useEffect, useRef } from 'react';

interface AtributosRPG {
  FOR: number;
  DES: number;
  CAR: number;
  SAB: number;
  INT: number;
  CON: number;
}

interface ModificadoresRPG {
  FOR?: string;
  DES?: string;
  CAR?: string;
  SAB?: string;
  INT?: string;
  CON?: string;
}

interface RadarChartProps {
  atributos: AtributosRPG;
  modificadores?: ModificadoresRPG;
  nivel?: number;
  onChange?: (atributos: AtributosRPG, nivel: number) => void;
  somenteLeitura?: boolean;
}

// Ordem dos atributos deve corresponder à ordem em radar-rpg.js
const ORDEM_ATRIBUTOS = ['FOR', 'DES', 'CAR', 'SAB', 'INT', 'CON'] as const;

export default function RadarChart({
  atributos,
  modificadores = {},
  nivel = 1,
  onChange,
  somenteLeitura = true,
}: RadarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const listenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Carregar script dinamicamente se ainda não carregado
    const inicializar = () => {
      const container = containerRef.current!;
      const RadarRPG = (window as any).RadarRPG;
      if (!RadarRPG) return;

      // Destruir instância anterior se existir
      if (instanceRef.current?.ro) {
        instanceRef.current.ro.disconnect();
      }

      const values = ORDEM_ATRIBUTOS.map(k => atributos[k]);
      const modValues = ORDEM_ATRIBUTOS.map(k => modificadores[k] || '');

      instanceRef.current = RadarRPG.create(container, {
        values,
        modValues,
        level: nivel,
        mode: 'raw',
      });

      // Capturar mudanças se não for só leitura
      if (!somenteLeitura && onChange) {
        const onInput = () => {
          const inst = instanceRef.current;
          const novosAtributos = ORDEM_ATRIBUTOS.reduce((acc, key, i) => {
            acc[key] = inst.values[i];
            return acc;
          }, {} as AtributosRPG);
          onChange(novosAtributos, inst.levelVal);
        };

        container.addEventListener('input', onInput);
        listenerRef.current = () => container.removeEventListener('input', onInput);
      }

      // Bloquear inputs se for só leitura
      if (somenteLeitura) {
        setTimeout(() => {
          container.querySelectorAll('input').forEach((inp: HTMLInputElement) => {
            inp.setAttribute('readonly', 'true');
            inp.style.pointerEvents = 'none';
            inp.style.cursor = 'default';
          });
        }, 100);
      }
    };

    if (!(window as any).RadarRPG) {
      const script = document.createElement('script');
      script.src = '/radar-rpg.js';
      script.onload = inicializar;
      document.head.appendChild(script);
    } else {
      inicializar();
    }

    return () => {
      if (listenerRef.current) listenerRef.current();
      if (instanceRef.current?.ro) instanceRef.current.ro.disconnect();
    };
  }, []);

  // Atualizar valores sem recriar a instância quando atributos mudam
  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst) return;
    ORDEM_ATRIBUTOS.forEach((key, i) => {
      inst.values[i] = atributos[key];
    });
    inst.levelVal = nivel;
    inst.maxPoints = 10 + nivel;
    inst.draw?.();
    inst.updateTotal?.();
    inst.updateHexGlow?.();
  }, [atributos, nivel]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}
    />
  );
}
```

### 6.2 Uso na página de detalhe

```typescript
// app/criaturas/[id]/page.tsx (trecho relevante)
import RadarChart from '@/components/radar/RadarChart';

export default function CriaturaDetalhe({ criatura }) {
  return (
    <section>
      <h2>Atributos Táticos</h2>
      <RadarChart
        atributos={criatura.tatico.atributos}
        modificadores={criatura.tatico.modificadores}
        nivel={criatura.tatico.nivel}
        somenteLeitura={true}
      />
    </section>
  );
}

// No formulário de admin (criação/edição):
function FormularioAdmin({ inicial }) {
  const [atributos, setAtributos] = useState(inicial.tatico.atributos);
  const [nivel, setNivel] = useState(inicial.tatico.nivel);

  return (
    <RadarChart
      atributos={atributos}
      nivel={nivel}
      somenteLeitura={false}
      onChange={(novosAtrs, novoNivel) => {
        setAtributos(novosAtrs);
        setNivel(novoNivel);
      }}
    />
  );
}
```

---

## 7. Árvore de Poderes (`components/powers/PowerTree.tsx`)

```typescript
'use client';
import { useState } from 'react';

interface Poder {
  id: string;
  nome: string;
  tier: number;
  descricao: string;
  efeitos: string[];
  pre_requisitos: string[];
  tipo: 'ativo' | 'passivo';
  cooldown: string | null;
}

interface PowerTreeProps {
  poderes: Poder[];
}

export default function PowerTree({ poderes }: PowerTreeProps) {
  const [selecionado, setSelecionado] = useState<Poder | null>(null);

  // Agrupar por tier
  const tiers = poderes.reduce((acc, p) => {
    if (!acc[p.tier]) acc[p.tier] = [];
    acc[p.tier].push(p);
    return acc;
  }, {} as Record<number, Poder[]>);

  return (
    <div className="power-tree">
      {Object.entries(tiers).map(([tier, pods]) => (
        <div key={tier} className="tier-row">
          <span className="tier-label">Tier {tier}</span>
          <div className="pods-row">
            {pods.map(poder => (
              <div key={poder.id}>
                {/* Linhas de conexão para pré-requisitos */}
                {poder.pre_requisitos.map(req => (
                  <div key={req} className="prereq-line" data-from={req} data-to={poder.id} />
                ))}
                <button
                  className={`poder-card ${poder.tipo} ${selecionado?.id === poder.id ? 'ativo' : ''}`}
                  onClick={() => setSelecionado(selecionado?.id === poder.id ? null : poder)}
                >
                  <span className="poder-nome">{poder.nome}</span>
                  <span className="poder-tipo">{poder.tipo}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {selecionado && (
        <div className="poder-detalhe">
          <h3>{selecionado.nome}</h3>
          <p>{selecionado.descricao}</p>
          <ul>
            {selecionado.efeitos.map((ef, i) => <li key={i}>{ef}</li>)}
          </ul>
          {selecionado.cooldown && <p>Cooldown: {selecionado.cooldown}</p>}
        </div>
      )}
    </div>
  );
}
```

---

## 8. Fluxo de Navegação e UI

```
HOME (/)
├── Barra de busca global (todos os tipos)
├── Cards de destaque: 3 criaturas + 2 espaços + 1 personagem
└── Links para as 3 seções

CRIATURAS (/criaturas)
├── Filtro por categoria
├── Grid de cards (imagem, nome, subtítulo, raridade)
└── → DETALHE (/criaturas/[id])
    ├── Imagem principal + galeria
    ├── Resumo narrativo
    ├── Descrição longa + lore
    ├── RadarChart (atributos táticos)
    ├── PowerTree (árvore de poderes)
    └── Seção de relações (links para espaços/personagens)

ESPAÇOS (/espacos) — estrutura similar

PERSONAGENS (/personagens) — estrutura similar (com radar)

ADMIN (/admin) — requer role=admin
├── Dashboard (contagem de entidades)
├── /admin/criaturas → lista com editar/deletar
├── /admin/criaturas/nova → formulário
└── /admin/criaturas/[id]/editar → formulário pré-preenchido
```

---

## 9. Segurança e Permissões

### Estratégia em camadas:

**Camada 1 — Firestore Rules (backend):**
Conforme seção 4.1 — a fonte de verdade. Mesmo se o frontend for bypassado, o banco não permite escrita sem role `admin`.

**Camada 2 — Middleware Next.js (rota `/admin`):**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Rotas admin: verificar cookie de sessão Firebase
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = request.cookies.get('__session');
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  return NextResponse.next();
}
```

**Camada 3 — Guard no componente:**
```typescript
// app/admin/layout.tsx
export default function AdminLayout({ children }) {
  const { role, loading } = useAuth();
  if (loading) return <Loading />;
  if (role !== 'admin') redirect('/');
  return <>{children}</>;
}
```

**Adicionando um admin (uma vez, via Firebase Console):**
Criar documento manualmente em `usuarios/{uid}` com `{ role: 'admin' }`.

---

## 10. Upload de Imagens (`lib/storage.ts`)

```typescript
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadImagem(
  colecao: string,
  entityId: string,
  file: File,
  tipo: string
): Promise<{ url: string; urlPublica: string }> {
  const ext = file.name.split('.').pop();
  const path = `${colecao}/${entityId}/${tipo}-${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, { contentType: file.type });
  const urlPublica = await getDownloadURL(storageRef);

  return { url: `gs://${storageRef.bucket}/${storageRef.fullPath}`, urlPublica };
}

export async function deletarImagem(urlPublica: string) {
  const storageRef = ref(storage, urlPublica);
  return deleteObject(storageRef);
}
```

---

## 11. Expansão Futura (Módulos Previstos)

O design modular da coleção e dos schemas permite adicionar nos próximos 6–12 meses:

| Módulo | Coleção Firestore | Observações |
|--------|------------------|-------------|
| Quests | `quests` | Relações com personagens/espaços existentes |
| Timeline | `eventos` | Campo `data_arcana` (número inteiro) para ordenação |
| Mapas | `mapas` | URL de imagem + array de `pontos` com lat/lng ficcionais |
| Itens Mágicos | `itens` | Atributos táticos reutilizam mesmo padrão do radar |
| Facções | `faccoes` | Relação N:N com personagens |

Nenhuma mudança nas regras de segurança existentes é necessária — apenas adicionar novos blocos `match` no `firestore.rules`.

---

## 12. Comandos de Setup

```bash
# 1. Criar projeto Next.js
npx create-next-app@latest odisseia --typescript --tailwind --app

# 2. Instalar Firebase SDK
npm install firebase

# 3. Instalar Firebase CLI e fazer login
npm install -g firebase-tools
firebase login

# 4. Inicializar Firebase no projeto
firebase init
# Selecionar: Firestore, Storage, Hosting
# Hosting: pasta de output = 'out' (para export estático) ou '.next' (para SSR)

# 5. Copiar radar-rpg.js para pasta pública
cp radar-rpg.js public/radar-rpg.js

# 6. Configurar variáveis de ambiente
# Criar .env.local com as chaves do Firebase Console

# 7. Deploy
npm run build
firebase deploy
```

---

## 13. Notas Finais

- **Busca:** Com menos de 50 entidades, a busca client-side (carregar tudo e filtrar) é suficiente e mais simples do que Algolia ou índices full-text. Revisitar se o acervo crescer acima de 200 entidades.
- **SSG vs SSR:** Para as páginas públicas de listagem e detalhe, use `generateStaticParams` do Next.js para gerar páginas estáticas no build, com revalidação periódica (`revalidate: 3600`). O painel admin usa renderização dinâmica.
- **Versionamento:** O campo `meta.versao` incrementa a cada edição via `updateDoc`. Histórico completo de revisões pode ser implementado futuramente com uma subcoleção `historico` dentro de cada documento.
- **Autenticação:** O site não exige login para leitura. A tela de login (`/login`) é acessada apenas por admins. Usuários comuns navegam sem conta.
