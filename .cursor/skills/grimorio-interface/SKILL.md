---
name: grimorio-interface
description: >-
  Conserta a interface do Grimório da ficha Odisseia com runas, glifos,
  sigilos, ornamento vitoriano e uma cor só do livro. O painel entra e sai
  deslizando de lado, sem reformatar a ficha. Use ao mexer em grimorio.css,
  grimorio-ui.js, no painel do Grimório, ou quando o usuário falar de
  Grimório, identidade visual, runas, glifos, sigilos, ornamento ou animação.
---

# Grimório — interface

quero montar essa parte da interface com bastante identidade.

O Grimório é o assistente da ficha. A regra de quem aparece e quem pode ser adicionado fica em `actual-development/ficha/js/core/grimorio-acesso.js`. Esta skill mexe na apresentação, em `css/grimorio.css` e `js/ui/grimorio-ui.js`.

## Antes de alterar

1. Leia `grimorio.css`, `grimorio-ui.js` e `actual-development/css/palette.css`.
2. Explique o plano em poucas linhas. Só então edite.
3. Mudança pequena. Preserve busca, filtros, besta, abrir a descrição, **Colocar na ficha**, a escolha do mal e o modo leitura.
4. Não altere quem é visível nem quem pode ser adicionado, a menos que o pedido seja explicitamente de regra.
5. Não redesenhe dashboard, header, ficha nem wiki. Não faça deploy. Não commite, a menos que peçam.

## O que está errado

Todos os itens usam o mesmo card: borda dourada e um selo único de custo. A etapa só aparece como título grudado. O painel parece um menu, não um livro.

Ouro, mana, túnica, sangue e verde já significam regra na ficha. Etapa, valor e estado se leem por marca. O livro tem uma cor própria, declarada só em `.grimorio`. O fundo é escuro, com gradiente da própria tinta. Filete, runa, glifo e sigilo são o fio claro por cima. Essa cor não separa PT de magia nem de raridade.

Hoje, no desktop, `body.grimorio-dock .app` encolhe a ficha para abrir coluna. Isso acaba. A ficha mantém largura, margem e centralização. O Grimório entra por cima do lado direito e sai pelo mesmo caminho.

## Quatro ofícios

Cada marca tem um emprego. Não enfeite o card com as quatro ao mesmo tempo.

- **Ornamento vitoriano** estrutura a capa e o capítulo: filete duplo, cantoneira, florão entre dois fios. Não entra em cada card. A capa usa a tinta do livro, não o ouro da ficha.
- **Runa** diz a etapa. Uma por card, cerca de 16 px, à esquerda do nome.
- **Glifo** diz o tipo do valor, ao lado do número. O número continua escrito.
- **Sigilo** diz o estado: círculo aberto se pode colocar, fechado se está mudo, partido na escolha do mal.

As marcas são SVG de um traço, num sprite único criado por `grimorio-ui.js`. Não use fonte rúnica, emoji nem ícone pronto. Não carregue fonte nova: Cinzel só no título e no capítulo; descrição em IM Fell English.

## Entrada e saída

É crucial que o Grimório entre com uma animação lateral e saia com a mesma animação.

- Painel `position: fixed` à direita, por cima da ficha. Largura no desktop: `min(400px, 38vw)`. No celular, a largura da tela.
- Fechado: `transform: translateX(100%)`. Aberto: `translateX(0)`.
- A mesma duração e a mesma curva nos dois sentidos. Cerca de 320ms, `ease`. Sem salto na ida e curva diferente na volta.
- Se o botão for acionado no meio do trajeto, a transição inverte de onde está.
- `hidden` só depois de `transitionend` na saída. Na entrada, tire `hidden` e só então aplique a classe aberta, no frame seguinte, para a ida também correr.
- `prefers-reduced-motion: reduce` mostra e esconde no lugar, sem deslocar.
- Apague a regra que altera `.app` quando o Grimório abre. Não mude `width`, `max-width` nem `margin` da ficha.
- O que ficar descoberto continua clicável. O botão do header que abre o Grimório continua no lugar.
- No celular, fechar fica fora da rolagem da lista. A ficha por baixo não reflowa.

Animação extra, curta e uma vez por abertura: o filete da lombada se desenha quando o painel termina de entrar. Sem loop. Filtrar, abrir card, colocar na ficha e repintar não animam layout.

## A página

Miolo escuro, com gradiente, margem com filete e uma linha vertical de lombada. O traço é claro.

- Cabeçalho, contexto, busca e filtros ficam fixos.
- Só `.grimorio__lista` rola. Com poucos cards, o pergaminho ainda preenche o painel.
- Filtros são palavras entre filetes.
- O capítulo é um florão entre dois filetes, com o nome e a contagem.

## Runas e filetes

A ordem das seções que já existe permanece. A classe no card sai da origem, do grau ou do grupo que a UI já calcula. Não duplique a regra de acesso no CSS.

| Etapa | Runa | Filete |
| --- | --- | --- |
| Classe | Pilar com dois travessões | Borda dupla |
| Ramo | Forquilha | Filete com cantos em L |
| Geral | Um traço com entalhe | Filete simples |
| Hábito | Anel | Filete simples |
| Magia 1°–4° | Arco com um a quatro travessões | De uma linha até a faixa no topo |
| Magia S | Círculo selado | Moldura dupla, miolo um tom mais escuro de tinta |
| Item | Quadrado com tampa | Filete simples |
| Aspecto biológico | Chevron aberto | Filete simples |
| Aspecto de treino | Chevron com cruz | Filete simples |
| Aspecto de monstro | Losango fechado | Filete simples |

## Glifos

| Valor | Glifo | Texto |
| --- | --- | --- |
| Pontos de treino | Traço com entalhe | Número e PT |
| Hábito | Anel pequeno | Hábito |
| Grau | Tantos pontos quanto o grau | 1°, 2°, 3°, 4° ou S |
| Limite arcano | Arco curto, segundo glifo | LA e o número |
| Raridade | Pontas, de uma a seis | Nome da raridade |
| Peso | Traço curto | Número do peso |

Card mudo usa filete mais fino e o motivo em texto. Não esmaeça a linha inteira. Os males pendentes são selos com o nome.

## O que não muda

- Filtros: Pode receber, Poderes, Magias, Itens, Aspectos.
- Busca por nome e descrição.
- Troca de besta e a trilha monstro.
- Card mudo, motivo e aviso.
- Botão **Colocar na ficha** e **Colocar e escolher mal**.
- Escape fecha. `ficha:changed` repinta se o painel estiver aberto.

## Verificação

Sirva a ficha localmente. Não publique.

1. Abra o Grimório numa ficha com classe, nível, magia e item. Se não houver sessão, use uma ficha local que não grave.
2. Confira desktop e uma largura abaixo de 960px. Ao abrir e ao fechar, a ficha não muda de largura nem de posição. O painel desliza para dentro e para fora com o mesmo tempo.
3. Role só a lista. Cabeçalho, busca, filtros e fechar permanecem visíveis. O trecho da ficha que o painel não cobre continua utilizável.
4. Troque os filtros e abra um card. A descrição e o botão de colocar continuam.
5. Confira um poder de classe, um de hábito, uma magia de grau baixo, uma de grau S e um item: runa, glifo e filete distintos, custo ainda legível em texto, sem cor de regra no card.
6. Com a lista vazia, o pergaminho ainda preenche o painel e a mensagem de vazio continua legível.

Se o navegador não estiver disponível, diga o que não foi visto.
