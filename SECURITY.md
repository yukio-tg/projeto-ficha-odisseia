# Política de Segurança

## Reportar uma vulnerabilidade

Se você encontrou uma vulnerabilidade de segurança neste projeto, por favor **não abra uma issue pública**. Entre em contato diretamente pelo perfil do GitHub.

Inclua na mensagem:
- Descrição do problema e potencial impacto
- Passos para reproduzir
- Versão/commit afetado

Você receberá uma resposta em até 72 horas.

---

## Decisões de segurança documentadas

### API Key do Firebase exposta no histórico git

A `apiKey` do Firebase Web SDK ficou presente no histórico de commits anteriores ao commit
`feat: segurança e infraestrutura — firebase-config isolado, README e SECURITY`.

**Por que isso não é crítico para este projeto:**

A `apiKey` do Firebase Web SDK não é um segredo no sentido tradicional. Ela é projetada para
ser pública e embutida em aplicações client-side. A própria documentação do Google afirma:

> *"It is okay to include your Firebase config in your version-controlled code because it only
> identifies your Firebase project. Access to your Firebase project's services is controlled
> by Firebase Security Rules, not by the API key."*
>
> — [Firebase Docs: API Keys](https://firebase.google.com/docs/projects/api-keys)

**O que realmente protege os dados são as Security Rules do Firestore**, que neste projeto:
- Exigem autenticação para toda operação de leitura e escrita
- Restringem escrita ao dono da ficha (`owner`)
- Implementam controle granular de compartilhamento por UID

**Mitigações adicionais aplicadas:**
- A API Key está restrita no Firebase Console para aceitar requisições apenas dos
  domínios autorizados do projeto (`fichas-odisseia.web.app`, `fichas-odisseia.firebaseapp.com`)
- A configuração foi movida para `actual-development/firebase-config.js` (gitignored)
  a partir deste commit — novos commits não expõem credenciais

### Por que o histórico não foi reescrito

Reescrever o histórico git (`git filter-repo`) destrói a rastreabilidade de todos os commits
anteriores, dificulta a auditoria do projeto e não mitiga o risco real (a chave já estaria
em clones anteriores). A mitigação correta é a restrição de domínio no console Firebase,
que foi aplicada.

---

## Modelo de permissão do Firestore

As Security Rules implementam o seguinte modelo:

| Operação | Quem pode |
|---|---|
| Ler ficha | Dono + usuários com `sharedUids` + fichas públicas |
| Criar ficha | Qualquer usuário autenticado (torna-se dono) |
| Editar ficha | Dono + usuários com `sharedUidsEdit` |
| Deletar ficha | Apenas o dono |
| Ler perfil de usuário | Qualquer usuário autenticado (necessário para busca por e-mail no compartilhamento) |
| Editar perfil | Apenas o próprio usuário |
| Registrar presença | Apenas o próprio usuário no seu documento de presença |

O arquivo `firestore.rules` é a fonte de verdade para essas regras.
