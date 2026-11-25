# Glossário de passivas incondicionais

Fonte: `actual-development/ficha/data/poderes.json` (336 poderes), `js/config/aspectos-besta.js` (aspectos de Besta), `data/itens.json` (62 itens), `js/core/item-effects.js` (efeitos de itens), `js/config/onus.js` (ônus).

## Regras de inclusão

Entra aqui o que segue:

- Efeito fixo, sem gatilho e sem condição de situação.
- Altera um valor da ficha: PV, PM, PT, FÉ, LA, Defesa, RD, deslocamento, inventário, atributo, perícia, dano, crítico ou custo.
- Efeito que escala com nível, com perícia ou com outro atributo. Cada escala aparece na coluna Tipo.
- Efeito em porcentagem.
- Ônus fixo.

Fica de fora o que depende de:

- Gatilho (ao sofrer dano, ao acertar, ao crítico, ao morrer).
- Situação (Machucado, Morrendo, cena de combate, terreno, distância do inimigo).
- Uso ou custo em PM, PV ou FÉ por ativação.
- Limite de uso (uma vez por cena, por rodada, por descanso).
- Ação ou reação.
- Escolha por evento.

Legenda: PV = pontos de vida. PM = pontos de mana. PT = pontos de treino. FÉ = pontos de fé. LA = limite arcano. DEF = Defesa. RD = redução de dano. Desl = deslocamento.

## 1. Poderes

Custo PT é o preço do poder. Não altera a ficha.

### Poderes de classe e de ramo

| Poder | Origem | Efeito fixo | Custo PT | Tipo |
|---|---|---|---|---|
| Mira Boa | Certeiro | Dano de ataques à distância +2 | 3 | fixo |
| Disparo Pesado | Certeiro | Dano +1d em todos os golpes | 16 | fixo |
| Benefício da Distância | Certeiro (ramo) | Testes de ataque à distância +5; alcance das armas à distância +1 passo | 24 | fixo |
| Coronhar | Certeiro (ramo) | Dano corpo a corpo +DES (arma Leve: +2 x DES) | 9 | fórmula |
| Vigor Flecha | Certeiro (ramo) | PV máximo +2 x nível | 16 | escala por nível |
| Camuflagem Perfeita | Certeiro (ramo) | Quietude +5 | 30 | fixo |
| Treino de Resistência | Coração | PV +2 por nível, acumulado | 13 | escala por nível |
| Ataque Pesado | Terrível | Dano corpo a corpo +1d | 16 | fixo |
| Recuperação Rápida | Coração | Em cena de Descanso: PV e PM recuperados +2d12 | 3 | regeneração por descanso |
| Parede de Carne | Coração (ramo) | Tamanho Grande (o +20 PV exige Fisiculturismo, fica fora) | 10 | fixo (tamanho) |
| Concessão por Mérito | Teurgista | FÉ +1 ao fim de cada cena | 22 | regeneração por cena |
| Movimento Tático | Geral | Resistência +5 contra efeitos do chão; ignora terreno difícil | 10 | fixo |
| Magia do Saber | Arcanista | Dano e cura de magias +SAB ou +INT (escolha) | 18 | escala por atributo |
| Requintes do Treino | Arcanista | LA +grau de proficiência em Magia | 2 | escala por perícia |
| Facilito | Feromântico | Testes de produto-caos (Feromancia) +2 | 6 | fixo |
| Vigor da Alma | Feromântico | PV calculado com SAB no lugar de CON | 20 | troca de fórmula |
| Divino Inerente | Teurgista | FÉ total +10; PV total -10 | 0 | fixo com ônus |
| Sorte da Deusa | Teurgista | Todos os testes de perícia +1; PM máximo -20% | 0 | fixo com ônus, % |
| Provação da Deusa | Teurgista | Todos os testes de perícia -1; FÉ total +25% | 0 | fixo com ônus, % |
| Mutação Deísta | Teurgista | Escolha de deusa: RD 10 ao elemento da deusa (Nixya: +10 dano e RD 10 Radiante; Aurorya: RD 10 a danos e RD 20 a Trevas). Exige nível 7 | 4 | fixo por escolha |
| Voto Puro | Teurgista (ramo) | Dano de magia -1d; cura de magia +1d | 8 | fixo com ônus |
| Voto Imundo | Teurgista (ramo) | Cura de magia -1d; dano de magia +1d | 10 | fixo com ônus |
| Conexão Premeditada | Teurgista (ramo) | Vantagem em todos os testes de Fé | 25 | fixo |
| Aplicação Correta | Engenhoso (ramo) | Cura de itens aplicados por você +1d | 7 | fixo |
| Confiança Cordial | Treinador (ramo) | RD 3 a dano enquanto vinculado à Besta | 12 | fixo, depende de vínculo |
| Descanso por Canalização | Treinador | PM da Besta +2 x nível dela, a cada Descanso | 10 | regeneração por descanso |

### Poderes gerais e de herança

| Poder | Origem | Efeito fixo | Custo PT | Tipo |
|---|---|---|---|---|
| A Teoria Supera a Prática | Geral | PT +5; PV máximo -8; PM máximo -5 | 0 | fixo com ônus |
| A Prática Supera a Teoria | Geral | PV máximo +8; PM máximo +5 | 5 | fixo |
| Acrescento | Geral | +1 em testes de uma perícia escolhida (repetível em perícias diferentes) | 1 | fixo por escolha |
| Inventário por Tamanho | Geral | Inventário +CON | 4 | escala por atributo |
| Treinamento de Perícia | Geral | +1 grau em uma perícia escolhida (repetível) | 6 | fixo por escolha |
| Atributo Extra | Hábito | +1 em um atributo escolhido | 0 | fixo por escolha |
| Auto-análise | Hábito | PM +6 | 0 | fixo |
| Auto-didata | Hábito | PT +5 | 0 | fixo |
| Auto-preservação | Hábito | PV +10 | 0 | fixo |
| Passo Largo | Hábito | Desl +3 | 0 | fixo |
| Recuperação Acelerada | Hábito | Em cena de Descanso: PV e PM +10 | 0 | regeneração por descanso |
| Cultura Própria | Hábito | Recebe os 3 bônus da Herança escolhida. Valores em `herancas.js`, não expandidos aqui | 0 | depende de Herança |
| Fisiculturismo | Hábito (luta) | Tamanho Grande; CAR +2 | 0 | fixo |
| Multi Alcance | Hábito (luta) | Grau de Lutar igual ao grau de Atirar | 0 | vínculo de grau |
| Auto-arcano | Hábito (magia) | LA +5 | 0 | fixo |
| Bolso Mágico | Hábito (magia) | Inventário +2 | 0 | fixo |
| Ler Aura | Hábito (magia) | CAR +2 | 0 | fixo |
| Mana Sensível | Hábito (magia) | DEF +2 | 0 | fixo |
| Potência Mágica | Hábito (magia) | DT de resistência das magias +2; produto-caos +2 | 0 | fixo |
| Atrair Mana | Hábito (magia) | PM +2 ao fim de cada cena | 0 | regeneração por cena |
| Diplomacia | Herança | +1 grau em Convencer, Mentir ou Ameaçar | 0 | fixo |
| Aprendizado Acadêmico | Herança | +1 grau em uma perícia que não seja FOR ou CON | 1 | fixo por escolha |
| Cuidado Onde Pisa! | Herança | +2 em testes de terreno; imune a terreno difícil; RD 2 a dano de queda | 0 | fixo |
| Lucro | Herança | Valor de venda de itens +25% | 0 | % |
| Calejado | Herança | PV +2 por nível | 2 | escala por nível |
| Patrulha | Herança | DEF +3 | 1 | fixo |
| Casca Grossa | Herança | RD a dano mundano +2 a cada 3 níveis (a partir do nível 1) | 0 | escala por nível |
| Parceria Animal | Herança | Animal aliado: PV = 10 + CON, +(2 + CON/2) por nível. Ficha do aliado, não a sua | 3 | escala por nível |
| Evolução Consagrada | Herança | Antecipa acesso a ramos em 1 nível. Ônus: Fraco ou Frustrado permanente (ver seção 4) | 3 | ônus |

## 2. Aspectos de Besta

Os aspectos biológicos custam PT 2 cada. Os de treino têm custo próprio.

### Aspectos Biológicos

| Aspecto | Efeito fixo | Tipo |
|---|---|---|
| Disparo II | Dano do Disparo +DES | fixo |
| Disparo III | Alcance do Disparo: médio; crítico 17/x2.5 | fixo |
| Ferrão III | Crítico do Ferrão 18/x1.5; dano do Ferrão ignora RD | fixo |
| Garras II | Dano das Garras +1d8; crítico 18/x1.5 | fixo |
| Garras III | Dano das Garras +1d8 (soma com Garras II: +2d8); crítico 18/x2 | fixo |
| Mordida II | Dano da Mordida +2d8; crítico x2.5 | fixo |
| Ágil | DEF +5 | fixo |
| Ágil II | DEF +2; Desl +3 | fixo |
| Camuflagem | DEF +3; Quietude +3 | fixo |
| Cascudo | RD a dano mundano 5 | fixo |
| Cascudo II | RD a dano mundano 10 (substitui Cascudo) | fixo |
| Cascudo III | RD a dano mundano 20 e RD mágica 10 (substitui Cascudo II) | fixo |
| Volátil | PV +2 por nível | escala por nível |
| Volátil II | PV +3 por nível (substitui Volátil) | escala por nível |
| Volátil III | PV +5 por nível (substitui Volátil II) | escala por nível |
| Apaixonado | Habilidades invocadas pela Besta custam -1 PM | fixo |
| Apaixonado II | Habilidades invocadas pela Besta custam -2 PM | fixo |
| Apático | RD a dano igual ao nível | escala por nível |
| Apático II | PV +1 por nível | escala por nível |
| Apático III | DEF +1 por nível | escala por nível |
| Cruel | Dano de uma fonte escolhida +nível | escala por nível |
| Cruel II | Dano de todas as fontes +nível | escala por nível |
| Curioso | Custo PT dos Aspectos de Treino -1 | fixo |
| Curioso II | Custo PT dos Aspectos de Treino -3 | fixo |
| Curioso III | Custo PT de um Aspecto de Treino -20 (uma vez) | fixo, único |
| Corrida | Deslocamento 9 m | fixo |
| Corrida II | Deslocamento 14 m | fixo |
| Corrida III | Deslocamento 18 m | fixo |
| Nado | Deslocamento de nado 9 m | fixo |
| Nado II | Deslocamento de nado 15 m | fixo |
| Voo | Deslocamento de voo 6 m | fixo |
| Voo II | Deslocamento de voo 12 m | fixo |
| Adepto de Magia | LA +10. Ônus: magias de Teurgia custam PM dobrado | fixo com ônus |
| Adepto de Magia II | LA 20 (substitui) | fixo |
| Adepto de Magia III | LA 30 (substitui) | fixo |
| Físico Espectro | Dano não mágico causado -50%; dano não mágico sofrido -50%. Ônus: não usa itens não feitos de magia | fixo com ônus, % |
| Imponente | Vantagem em testes de Carisma | fixo |
| Membros Extras | Escolha: Cabeça extra (vantagem em Perspicácia, Poder e Ameaçar; desvantagem em Acrobacia, Reflexos e Quietude) ou Auxiliares extras (+2 em uma perícia escolhida; Desl +3) | fixo por escolha |
| Membros Extras II | Segunda escolha de membro extra | fixo por escolha |
| Membros Extras III | Terceira escolha de membro extra | fixo por escolha |
| Sentidos Aguçados III | DEF +3 | fixo |

### Aspectos de Treino

| Aspecto | Efeito fixo | Custo PT | Tipo |
|---|---|---|---|
| Imparável | Deslocamento de escalada igual ao deslocamento em terra; ignora terreno difícil | 5 | fixo |
| Postura Baixa | Vantagem em testes de manobra (realizar e resistir) | 10 | fixo |

## 3. Itens

Itens entram pelo que dão enquanto estão equipados ou guardados. Consumíveis ficam de fora.

| Item | Efeito fixo | Peso | Tipo |
|---|---|---|---|
| Armadura Leve | DEF +5 | 2 | fixo |
| Armadura Média | DEF +7; RD +5; Desl -25% | 5 | fixo, % |
| Armadura Pesada | DEF +10; RD +10; Desl -50% | 10 | fixo, % |
| Escudo Leve | DEF +2; RD +1. Precisa estar empunhado | 3 | fixo |
| Escudo Pesado | DEF +5; RD +3. Precisa de Força 5 | 6 | fixo |
| Escudo de Pulso | DEF +1. Não soma com escudo Leve ou Pesado | 1 | fixo |
| Calçado de Marcha | Desl +3; +5 em testes de resistência contra efeitos ao nível do solo | 1 | fixo |
| Mochilão | Inventário +5 | 0 | fixo |
| Utensílio | +2 em uma perícia (exceto Luta e Atirar). Precisa estar empunhado | 1 | fixo |
| Vestimenta | +2 em uma perícia (exceto Luta e Atirar). Máximo de 2 vestimentas | 1 | fixo |
| Capa Anti-queda | RD 5 a dano de Vento; dano de queda -50% | 1 | fixo, % |
| Fonte | LA máximo pela raridade: Banal 3; Comum 5; Incomum 8; Raro 12; Épico 18; Lendário 25 | 1 | fixo por raridade |

Armas são perfis de ataque (dado, atributo, crítico, alcance). Não entram como bônus.

## 4. Ônus

| Ônus | Efeito fixo | Tipo |
|---|---|---|
| Burro | Primeira evolução de perícia só no nível 3 (-2 perícias) | fixo |
| Frágil | Morte imediata ao cair em Morrendo | regra sem número |
| Impedido de Sentidos | Cego ou Surdo permanente (escolha) | condição permanente |
| Instável | Perde 2 PM ao fim de cada cena (não letal) | regeneração negativa por cena |
| Macabro | CAR -5 em testes | fixo |
| Malformado | PV máximo -20% | %, fixo |
| Sem Membros | Pernas: Caído permanente. Braços: não empunha itens | regra sem número |
| Evolução Consagrada (poder) | Fraco ou Frustrado permanente. Fraco: desvantagem em DES, FOR e CON. Frustrado: desvantagem em INT, CAR e SAB | condição permanente |

## 5. Notas

- A Prática Supera a Teoria dá PV +8 e PM +5. O custo é 5 PT. A ideia de "+4 PM" não confere com a lista.
- Os poderes que escalam (Treino de Resistência, Calejado, Vigor Flecha, Volátil, Apático) precisam de regra de nível na ficha para virar número.
- Cultura Própria depende de `herancas.js`. Esse arquivo não foi expandido aqui.
- O índice completo abaixo mostra o status de cada entrada do JSON.

## 6. Índice completo

Cada entrada da fonte aparece aqui. "Dentro" quer dizer que entra no glossário. "Fora" quer dizer condicional, ativo, único ou sem efeito fixo em status.

### 6.1 Poderes (336 entradas, 96 dentro)

| Nº | Nome | Origem | Status |
|---|---|---|---|
| 0 | Fuga | classe | Fora |
| 1 | Mira Boa | classe | Dentro |
| 2 | Recuperar Munição | classe | Fora |
| 3 | Proteção da Distância | classe | Fora |
| 4 | Mirar | classe | Fora |
| 5 | Alvo Crítico | classe | Fora |
| 6 | Rolamento | classe | Fora |
| 7 | Disparo Duplo | classe | Fora |
| 8 | Artilharia de Perfuração | classe | Fora |
| 9 | Munição Mágica | classe | Fora |
| 10 | Disparo Pesado | classe | Dentro |
| 11 | Falsa Segurança | classe | Fora |
| 12 | Treino da Armadura | classe | Fora |
| 13 | Recuperação Rápida | classe | Dentro |
| 14 | Provocar | classe | Fora |
| 15 | Motor Imóvel | classe | Fora |
| 16 | Ameaçar | classe | Fora |
| 17 | Coração Imortal | classe | Fora |
| 18 | Vitalidade Combustível | classe | Fora |
| 19 | Treino de Resistência | classe | Dentro |
| 20 | Irromper Músculo | classe | Fora |
| 21 | Sacrifício | classe | Fora |
| 22 | Imortal | classe | Fora |
| 23 | Resistir a tudo | classe | Fora |
| 24 | Racha-pedra | classe | Fora |
| 25 | Um por Um | classe | Fora |
| 26 | Oportunidade de Ataque | classe | Fora |
| 27 | Saque da Espada | classe | Fora |
| 28 | Investida | classe | Fora |
| 29 | Revidar Violento | classe | Fora |
| 30 | Desvio e te Mato | classe | Fora |
| 31 | Análise de Combate | classe | Fora |
| 32 | Atenção Máxima | classe | Fora |
| 33 | Ataque Pesado | classe | Dentro |
| 34 | Ataque Múltiplo | classe | Fora |
| 35 | Conjuração Inerte | classe | Fora |
| 36 | Requintes do Treino | classe | Dentro |
| 37 | Armazém do Mago | classe | Fora |
| 38 | Magia Parabólica | classe | Fora |
| 39 | Força Sobrenatural | classe | Fora |
| 40 | Arcanismo Especializado | classe | Fora |
| 41 | Fluxo Sustentado | classe | Fora |
| 42 | Magia Intensa | classe | Fora |
| 43 | Magia Estendida | classe | Fora |
| 44 | Círculo Mágico | classe | Fora |
| 45 | Magia do Saber | classe | Dentro |
| 46 | Proteção Aprimorada | classe | Fora |
| 47 | Resistência na Alma | classe | Fora |
| 48 | Compreensão Egóica | classe | Fora |
| 49 | Produto-ordem | classe | Fora |
| 50 | Facilito | classe | Dentro |
| 51 | Olhos da Alma | classe | Fora |
| 52 | Magia Bruta | classe | Fora |
| 53 | Conjuração Marcial | classe | Fora |
| 54 | Esforço Feromântico | classe | Fora |
| 55 | Absorver Mana | classe | Fora |
| 56 | Expansão de Domínio | classe | Fora |
| 57 | Vigor da Alma | classe | Dentro |
| 58 | Loteria Forçada | classe | Fora |
| 59 | Divino Inerente | classe | Dentro |
| 60 | Sorte da Deusa | classe | Dentro |
| 61 | Provação da Deusa | classe | Dentro |
| 62 | Mutação Deísta | classe | Dentro |
| 63 | Fé Saudável | classe | Fora |
| 64 | Súplica Final | classe | Fora |
| 65 | Preparar Santuário | classe | Fora |
| 66 | Abolir Heresia | classe | Fora |
| 67 | Expurgar O Mal | classe | Fora |
| 68 | Expurgar Males | classe | Fora |
| 69 | Concessão por Mérito | classe | Dentro |
| 70 | Conexão Premeditada | classe | Dentro |
| 71 | Conhecedor de Terras | classe | Fora |
| 72 | Eclético | classe | Fora |
| 73 | Incentivo Certeiro | classe | Fora |
| 74 | Especialista | classe | Fora |
| 75 | Produtivo | classe | Fora |
| 76 | Consertador | classe | Fora |
| 77 | Médico de Guerra | classe | Fora |
| 78 | Item de Sucata | classe | Fora |
| 79 | A Arte da Distração | classe | Fora |
| 80 | Autêntico Curador | classe | Fora |
| 81 | Ensino Rápido | classe | Fora |
| 82 | Bons Olhos | classe | Fora |
| 83 | Montagem Rápida | classe | Fora |
| 84 | Aproximação por Instinto | classe | Fora |
| 85 | Descanso por Canalização | classe | Dentro |
| 86 | Analista de Brecha | classe | Fora |
| 87 | Ameaçar | classe | Fora |
| 88 | Janela da Conexão | classe | Fora |
| 89 | Auxílio | classe | Fora |
| 90 | Comando de Ação | classe | Fora |
| 91 | Ordem de Defesa | classe | Fora |
| 92 | Ataque Coordenado | classe | Fora |
| 93 | Vínculo na Dor | classe | Fora |
| 94 | Ação Gatilho | classe | Fora |
| 95 | A Teoria Supera a Prática | geral | Dentro |
| 96 | Acrescento | geral | Dentro |
| 97 | Fundo de Reserva | geral | Fora |
| 98 | Esconder Magia | geral | Fora |
| 99 | Inventário por Tamanho | geral | Dentro |
| 100 | A Prática Supera a Teoria | geral | Dentro |
| 101 | Treinamento de Perícia | geral | Dentro |
| 102 | Hábito Forçado | geral | Fora |
| 103 | Afortunado | geral | Fora |
| 104 | Carismático | geral | Fora |
| 105 | Movimento Tático | geral | Dentro |
| 106 | Fortaleza da Magia | geral | Fora |
| 107 | Aumento Mágico Inatural | geral | Fora |
| 108 | Esforço sob Ataque | geral | Fora |
| 109 | Estilo de Duas Armas | geral | Fora |
| 110 | Arte Marcial | habito | Fora |
| 111 | Fisiculturismo | habito | Dentro |
| 112 | Iniciativa Aprimorada | habito | Fora |
| 113 | Monitoramento Físico | habito | Fora |
| 114 | Multi Alcance | habito | Dentro |
| 115 | Perder o Controle | habito | Fora |
| 116 | Sangue Quente | habito | Fora |
| 117 | Atrair Mana | habito | Dentro |
| 118 | Auto-arcano | habito | Dentro |
| 119 | Bolso Mágico | habito | Dentro |
| 120 | Ler Aura | habito | Dentro |
| 121 | Mana Sensível | habito | Dentro |
| 122 | Olhos da Magia | habito | Fora |
| 123 | Potência Mágica | habito | Dentro |
| 124 | Atributo Extra | habito | Dentro |
| 125 | Auto-análise | habito | Dentro |
| 126 | Auto-didata | habito | Dentro |
| 127 | Auto-preservação | habito | Dentro |
| 128 | Cultura Própria | habito | Dentro |
| 129 | Passo Largo | habito | Dentro |
| 130 | Recuperação Acelerada | habito | Dentro |
| 131 | Tratamentos Rápidos | habito | Fora |
| 132 | Marca da Maldição | heranca | Fora |
| 133 | Impulso Criativo | heranca | Fora |
| 134 | Fugaz e Letal | heranca | Fora |
| 135 | Celebração Canibal | heranca | Fora |
| 136 | Enjaular | heranca | Fora |
| 137 | Cozinha Perfeita | heranca | Fora |
| 138 | Contrabando | heranca | Fora |
| 139 | Diplomacia | heranca | Dentro |
| 140 | Parceria Animal | heranca | Dentro |
| 141 | Aula Prática | heranca | Fora |
| 142 | Calejado | heranca | Dentro |
| 143 | Relação Mágica | heranca | Fora |
| 144 | Aprendizado Acadêmico | heranca | Dentro |
| 145 | Cuidado Onde Pisa! | heranca | Dentro |
| 146 | Patrulha | heranca | Dentro |
| 147 | Primitivo | heranca | Fora |
| 148 | Virtude | heranca | Fora |
| 149 | Indigno | heranca | Fora |
| 150 | Matar um Certo Alguém | heranca | Fora |
| 151 | Orgulho dos Achados | heranca | Fora |
| 152 | Lucro | heranca | Dentro |
| 153 | Enfermaria | heranca | Fora |
| 154 | Mão no Leme | heranca | Fora |
| 155 | Atlético | heranca | Fora |
| 156 | Casca Grossa | heranca | Dentro |
| 157 | Filho da Deusa | heranca | Fora |
| 158 | Podre de Rico | heranca | Fora |
| 159 | Instinto de Sobrevivência | heranca | Fora |
| 160 | Rumores | heranca | Fora |
| 161 | Evolução Consagrada | heranca | Dentro |
| 162 | Nunca a Salvo | ramo | Fora |
| 163 | Disparo Triplo | ramo | Fora |
| 164 | Acerto em Dupla | ramo | Fora |
| 165 | Benefício da Distância | ramo | Dentro |
| 166 | Coronhar | ramo | Dentro |
| 167 | Queima-roupa | ramo | Fora |
| 168 | Golpe Baixo | ramo | Fora |
| 169 | Vigor Flecha | ramo | Dentro |
| 170 | Impacto Inesperado | ramo | Fora |
| 171 | Fugacidade | ramo | Fora |
| 172 | Camuflagem Perfeita | ramo | Dentro |
| 173 | Assassinar | ramo | Fora |
| 174 | Refôlego | ramo | Fora |
| 175 | Profanar Músculo | ramo | Fora |
| 176 | Redirecionar Magia | ramo | Fora |
| 177 | Defletir Magia | ramo | Fora |
| 178 | Falar da Mãe | ramo | Fora |
| 179 | Suspiro de Vida | ramo | Fora |
| 180 | Corpo Fechado | ramo | Fora |
| 181 | Em Guarda | ramo | Fora |
| 182 | Parede de Carne | ramo | Dentro |
| 183 | Tente denovo | ramo | Fora |
| 184 | Espírito Líder | ramo | Fora |
| 185 | Distribuição Prudente | ramo | Fora |
| 186 | Dor do Flagelo | ramo | Fora |
| 187 | Fúria dos Caídos | ramo | Fora |
| 188 | Ataque em Curva | ramo | Fora |
| 189 | Fúria | ramo | Fora |
| 190 | Taumaturgia | ramo | Fora |
| 191 | Extensão em Mana | ramo | Fora |
| 192 | Banhar em Magia | ramo | Fora |
| 193 | Lâmina Sábia | ramo | Fora |
| 194 | Escolta | ramo | Fora |
| 195 | Foco | ramo | Fora |
| 196 | Decifrar Inimigo | ramo | Fora |
| 197 | Fluxo de Ações | ramo | Fora |
| 198 | Transcendência Mágica | ramo | Fora |
| 199 | Homebrew | ramo | Fora |
| 200 | Magnum Opus | ramo | Fora |
| 201 | Copiar | ramo | Fora |
| 202 | Limite Técnico | ramo | Fora |
| 203 | Ecleticidade do Mago | ramo | Fora |
| 204 | Cetro Especial | ramo | Fora |
| 205 | Magia Favorita | ramo | Fora |
| 206 | Arcabouço da Magia | ramo | Fora |
| 207 | Grimório Arcano | ramo | Fora |
| 208 | Overclock | ramo | Fora |
| 209 | Em 2 Décimos de Segundo | ramo | Fora |
| 210 | Mestre do Inanimado | ramo | Fora |
| 211 | Bolso Místico | ramo | Fora |
| 212 | Selo de Alma | ramo | Fora |
| 213 | Jóia da Alma | ramo | Fora |
| 214 | Exército de Mortos | ramo | Fora |
| 215 | Necromancia | ramo | Fora |
| 216 | Capturar Alma | ramo | Fora |
| 217 | Reanimação da Alma | ramo | Fora |
| 218 | Amálgama Vivo | ramo | Fora |
| 219 | Aposta Alta | ramo | Fora |
| 220 | Multiplicidade de Almas | ramo | Fora |
| 221 | Repulsão de Corpos | ramo | Fora |
| 222 | Bênção | ramo | Fora |
| 223 | Oração Sustentada | ramo | Fora |
| 224 | Voto Puro | ramo | Dentro |
| 225 | Prece Iniciadora | ramo | Fora |
| 226 | Presença Marcante | ramo | Fora |
| 227 | Voto Imundo | ramo | Dentro |
| 228 | Expurgo Final | ramo | Fora |
| 229 | Banir Trevas | ramo | Fora |
| 230 | Conselho | ramo | Fora |
| 231 | Pacto de Poder | ramo | Fora |
| 232 | Invocar Técnica | ramo | Fora |
| 233 | Invocar Magia Ancestral | ramo | Fora |
| 234 | Doutorado em Drama | ramo | Fora |
| 235 | Discurso Motivador | ramo | Fora |
| 236 | Leitura Fria | ramo | Fora |
| 237 | Truque de Mestre | ramo | Fora |
| 238 | Pai da Máquina | ramo | Fora |
| 239 | Máquina Retida | ramo | Fora |
| 240 | Aprimorar Torreta | ramo | Fora |
| 241 | Inovação Congênita | ramo | Fora |
| 242 | Auxílio de Doutor | ramo | Fora |
| 243 | Aplicação Correta | ramo | Dentro |
| 244 | Paramédico | ramo | Fora |
| 245 | Cura Simples | ramo | Fora |
| 246 | Defesa de Prioridade | ramo | Fora |
| 247 | Devoção ao Alfa | ramo | Fora |
| 248 | Absorver Alma Inerte | ramo | Fora |
| 249 | Entregar Alma ao Corpo | ramo | Fora |
| 250 | Ajuda na Caça | ramo | Fora |
| 251 | Confiança Cordial | ramo | Dentro |
| 252 | Canalizar Besta | ramo | Fora |
| 253 | Entregar Alma e Corpo | ramo | Fora |
| 254 | Proteção do Guardião | ramo | Fora |
| 255 | Uma Mente, Dois Corpos | ramo | Fora |
| 256 | Brecha Exposta | ramo | Fora |
| 257 | Ação Coordenada | ramo | Fora |
| 258 | Disparo | aspecto | Fora |
| 259 | Disparo II | aspecto | Dentro |
| 260 | Disparo III | aspecto | Dentro |
| 261 | Ferrão | aspecto | Fora |
| 262 | Ferrão II | aspecto | Fora |
| 263 | Ferrão III | aspecto | Dentro |
| 264 | Garras | aspecto | Fora |
| 265 | Garras II | aspecto | Dentro |
| 266 | Garras III | aspecto | Dentro |
| 267 | Mordida | aspecto | Fora |
| 268 | Mordida II | aspecto | Dentro |
| 269 | Mordida III | aspecto | Fora |
| 270 | Ágil I | aspecto | Dentro |
| 271 | Ágil II | aspecto | Dentro |
| 272 | Ágil III | aspecto | Fora |
| 273 | Camuflagem I | aspecto | Dentro |
| 274 | Camuflagem II | aspecto | Fora |
| 275 | Camuflagem III | aspecto | Fora |
| 276 | Cascudo I | aspecto | Dentro |
| 277 | Cascudo II | aspecto | Dentro |
| 278 | Cascudo III | aspecto | Dentro |
| 279 | Volátil I | aspecto | Dentro |
| 280 | Volátil II | aspecto | Dentro |
| 281 | Volátil III | aspecto | Dentro |
| 282 | Apaixonado I | aspecto | Dentro |
| 283 | Apaixonado II | aspecto | Dentro |
| 284 | Apaixonado III | aspecto | Fora |
| 285 | Apático I | aspecto | Dentro |
| 286 | Apático II | aspecto | Dentro |
| 287 | Apático III | aspecto | Dentro |
| 288 | Cruel I | aspecto | Dentro |
| 289 | Cruel II | aspecto | Dentro |
| 290 | Cruel III | aspecto | Fora |
| 291 | Curioso I | aspecto | Dentro |
| 292 | Curioso II | aspecto | Dentro |
| 293 | Curioso III | aspecto | Dentro |
| 294 | Cavo I | aspecto | Fora |
| 295 | Cavo II | aspecto | Fora |
| 296 | Cavo III | aspecto | Fora |
| 297 | Corrida I | aspecto | Dentro |
| 298 | Corrida II | aspecto | Dentro |
| 299 | Corrida III | aspecto | Dentro |
| 300 | Nado I | aspecto | Dentro |
| 301 | Nado II | aspecto | Dentro |
| 302 | Nado III | aspecto | Fora |
| 303 | Voo I | aspecto | Dentro |
| 304 | Voo II | aspecto | Dentro |
| 305 | Voo III | aspecto | Fora |
| 306 | Adepto de Magia I | aspecto | Dentro |
| 307 | Adepto de Magia II | aspecto | Dentro |
| 308 | Adepto de Magia III | aspecto | Dentro |
| 309 | Alterar Forma I | aspecto | Fora |
| 310 | Alterar Forma II | aspecto | Fora |
| 311 | Alterar Forma III | aspecto | Fora |
| 312 | Físico Espectro I | aspecto | Dentro |
| 313 | Físico Espectro II | aspecto | Fora |
| 314 | Físico Espectro III | aspecto | Fora |
| 315 | Guloso I | aspecto | Fora |
| 316 | Guloso II | aspecto | Fora |
| 317 | Guloso III | aspecto | Fora |
| 318 | Imponente I | aspecto | Dentro |
| 319 | Imponente II | aspecto | Fora |
| 320 | Imponente III | aspecto | Fora |
| 321 | Invocação I | aspecto | Fora |
| 322 | Invocação II | aspecto | Fora |
| 323 | Invocação III | aspecto | Fora |
| 324 | Parasita I | aspecto | Fora |
| 325 | Parasita II | aspecto | Fora |
| 326 | Parasita III | aspecto | Fora |
| 327 | Membros Extras I | aspecto | Dentro |
| 328 | Membros Extras II | aspecto | Dentro |
| 329 | Membros Extras III | aspecto | Dentro |
| 330 | Sentidos Aguçados I | aspecto | Fora |
| 331 | Sentidos Aguçados II | aspecto | Fora |
| 332 | Sentidos Aguçados III | aspecto | Dentro |
| 333 | Venenoso I | aspecto | Fora |
| 334 | Venenoso II | aspecto | Fora |
| 335 | Venenoso III | aspecto | Fora |

### 6.2 Itens (62 entradas, 12 dentro)

| Nome | Categoria | Status |
|---|---|---|
| Poção de Cura | básico | Fora |
| Espada Longa | arma | Fora |
| Faca | arma | Fora |
| Arco Longo | arma | Fora |
| Alabarda | arma | Fora |
| Armadura Leve | proteção | Dentro |
| Armadura Pesada | proteção | Dentro |
| Escudo Leve | proteção | Dentro |
| Armadura Média | proteção | Dentro |
| Fonte | fonte | Dentro |
| Gancho com Corda | básico | Fora |
| Flecha/Virote | básico | Fora |
| Cajado | arma | Fora |
| Chicote | arma | Fora |
| Espada Curta | arma | Fora |
| Florete | arma | Fora |
| Clava | arma | Fora |
| Machadinha | arma | Fora |
| Lança | arma | Fora |
| Marreta | arma | Fora |
| Manoplas | arma | Fora |
| Montante | arma | Fora |
| Machado | arma | Fora |
| Katana | arma | Fora |
| Kusarigama | arma | Fora |
| Foice | arma | Fora |
| Arco Curto | arma | Fora |
| Balestra Leve | arma | Fora |
| Balestra Grande | arma | Fora |
| Revólver | arma | Fora |
| Espingarda | arma | Fora |
| Rifle | arma | Fora |
| Shuriken | arma | Fora |
| Arma Improvisada | arma | Fora |
| Escudo Pesado | proteção | Dentro |
| Munição | básico | Fora |
| Amolador | básico | Fora |
| Antídoto | básico | Fora |
| Armadilha de Espinhos | básico | Fora |
| Bomba | básico | Fora |
| Calçado de Marcha | básico | Dentro |
| Conjunto Cirúrgico | básico | Fora |
| Escudo de Pulso | básico | Dentro |
| Frasco de Veneno | básico | Fora |
| Lamparina | básico | Fora |
| Mochilão | básico | Dentro |
| Utensílio | básico | Dentro |
| Vestimenta | básico | Dentro |
| Capa Anti-queda | básico | Dentro |
| Cetro | básico | Fora |
| Concha Chorosa | básico | Fora |
| Pedra Magno | básico | Fora |
| Contra-temporal | básico | Fora |
| Lampião Carmesim | básico | Fora |
| Pó de Sumiço | básico | Fora |
| Cabeça de Medusa | básico | Fora |
| Poção de Sonhada | básico | Fora |
| Poção de Veia-Pedra | básico | Fora |
| Poção de Dano | básico | Fora |
| Poção de Mana | básico | Fora |
| Poção Mística | básico | Fora |
| Poção Cronos | básico | Fora |

### 6.3 Ônus de onus.js (10 entradas, 7 dentro)

| Ônus | Status |
|---|---|
| Burro | Dentro |
| Descontrolado | Fora |
| Faminto | Fora |
| Frágil | Dentro |
| Impedido de Sentidos | Dentro |
| Instável | Dentro |
| Macabro | Dentro |
| Malformado | Dentro |
| Nichado | Fora |
| Sem Membros | Dentro |

Aspectos de Treino (`js/config/aspectos-besta.js`, 10 entradas) não estão no JSON de poderes. Dentro: Imparável e Postura Baixa. Os outros 8 têm condição, custo em PM ou efeito de ação.
