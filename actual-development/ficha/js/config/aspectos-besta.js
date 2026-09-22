// js/config/aspectos-besta.js — Base de dados dos Aspectos da Besta
'use strict';

// ── Aspectos Biológicos ────────────────────────────────────────────────────────
// custo: nível romano (I, II, III)
// subtipo: Ofensivo | Defensivo | Temperamental | Movimentacional | Optativo

export const ASPECTOS_BIO = [
    // ─── Ofensivos ───
    { nome:"Disparo",         nivel:"I",   subtipo:"Ofensivo",
      desc:"A Besta pode realizar um ataque à alcance curto de um Disparo usando Atirar. O ataque desfere 3d6 de dano de Perfuração e possui crítico x19/x1.5. Atacar um ser em alcance corpo-a-corpo com esse ataque lhe impõe uma desvantagem no teste de ataque." },
    { nome:"Disparo II",      nivel:"II",  subtipo:"Ofensivo",
      desc:"O dano passa a somar seu valor de Destreza. Pagando 2 PM você recebe +5 no teste de ataque." },
    { nome:"Disparo III",     nivel:"III", subtipo:"Ofensivo",
      desc:"O alcance aumenta para médio e o crítico para 17/x2.5. Além disso, pode atacar até 2x um mesmo alvo ou diferentes, somando um total de dois disparos." },

    { nome:"Ferrão",          nivel:"I",   subtipo:"Ofensivo",
      desc:"A Besta pode realizar um ataque corpo-a-corpo de Ferrão usando Lutar com Destreza como ação de Coesão. O ataque desfere 2d4 + FOR de dano de Perfuração e possui crítico 19/x1.5. Caso a Besta possua também o Aspecto Biológico Optativo Venenoso, o dado base de dano aumenta para d8." },
    { nome:"Ferrão II",       nivel:"II",  subtipo:"Ofensivo",
      desc:"Você pode realizar a manobra Agarrar como ação de coesão." },
    { nome:"Ferrão III",      nivel:"III", subtipo:"Ofensivo",
      desc:"Aumenta o crítico para 18/x1.5. Além disso, o dano de Ferrão ignora RD a dano." },

    { nome:"Garras",          nivel:"I",   subtipo:"Ofensivo",
      desc:"A Besta pode realizar um ataque corpo-a-corpo de Garras usando Lutar com Destreza ou Força. O ataque desfere 2d8 + FOR ou DES de dano de Corte ou Impacto e possui crítico 19/x1.5. Escolha o tipo e o atributo somado de dano assim que escolher tal Ofensiva." },
    { nome:"Garras II",       nivel:"II",  subtipo:"Ofensivo",
      desc:"Aumenta o dano em +1d8 e aumenta o crítico para 18/x1.5. Além disso, pode atacar até 2x um mesmo alvo ou diferentes, somando um total de duas garradas." },
    { nome:"Garras III",      nivel:"III", subtipo:"Ofensivo",
      desc:"Aumenta o dano em +1d8 e aumenta o crítico para 18/x2. Além disso, pode realizar um terceiro ataque de garras pagando 2 PM." },

    { nome:"Mordida",         nivel:"I",   subtipo:"Ofensivo",
      desc:"A Besta pode realizar um ataque corpo-a-corpo de Mordida usando Lutar. O ataque desfere 3d8 + 3 + FOR de dano de Perfuração e possui crítico x2." },
    { nome:"Mordida II",      nivel:"II",  subtipo:"Ofensivo",
      desc:"Aumenta o dano em +2d8 e aumenta o crítico para x2.5." },
    { nome:"Mordida III",     nivel:"III", subtipo:"Ofensivo",
      desc:"Um ser que sofrer um acerto crítico fica Sangrando. Além disso, pode realizar um segundo ataque de mordida no mesmo alvo pagando 4 PM." },

    // ─── Defensivos ───
    { nome:"Ágil",            nivel:"I",   subtipo:"Defensivo",
      desc:"Aumenta a Defesa em +5." },
    { nome:"Ágil II",         nivel:"II",  subtipo:"Defensivo",
      desc:"Aumenta a Defesa em +2 e aumenta seu deslocamento padrão em +3." },
    { nome:"Ágil III",        nivel:"III", subtipo:"Defensivo",
      desc:"Pode realizar a Reação Complexa Esquivar como Reação Simples." },

    { nome:"Camuflagem",      nivel:"I",   subtipo:"Defensivo",
      desc:"Aumenta a Defesa em +3 e recebe +3 em testes de Quietude. Além disso, pode, como ação de coesão, se esconder. Isso te confere Camuflagem até ser percebido." },
    { nome:"Camuflagem II",   nivel:"II",  subtipo:"Defensivo",
      desc:"Enquanto sob Camuflagem você recebe +3 em seus testes. Além disso, pode se mover mesmo escondido com seu deslocamento padrão." },
    { nome:"Camuflagem III",  nivel:"III", subtipo:"Defensivo",
      desc:"Enquanto em Camuflagem todos os seus ataques são críticos." },

    { nome:"Cascudo",         nivel:"I",   subtipo:"Defensivo",
      desc:"Recebe RD a danos mundanos 5." },
    { nome:"Cascudo II",      nivel:"II",  subtipo:"Defensivo",
      desc:"Aumenta a RD a danos mundanos para 10." },
    { nome:"Cascudo III",     nivel:"III", subtipo:"Defensivo",
      desc:"Aumenta a RD a danos mundanos para 20. E recebe RD mágica 10." },

    { nome:"Volátil",         nivel:"I",   subtipo:"Defensivo",
      desc:"Recebe 2 PV por nível." },
    { nome:"Volátil II",      nivel:"II",  subtipo:"Defensivo",
      desc:"Recebe 3 PV por nível." },
    { nome:"Volátil III",     nivel:"III", subtipo:"Defensivo",
      desc:"Recebe 5 PV por nível." },

    // ─── Temperamentais ───
    { nome:"Apaixonado",      nivel:"I",   subtipo:"Temperamental",
      desc:"Todas as habilidades invocadas pela Besta custa -1 PM." },
    { nome:"Apaixonado II",   nivel:"II",  subtipo:"Temperamental",
      desc:"Todas as habilidades invocadas pela Besta custam -2 PM." },
    { nome:"Apaixonado III",  nivel:"III", subtipo:"Temperamental",
      desc:"Uma vez por cena, recebe uma ação protagonista extra." },

    { nome:"Apático",         nivel:"I",   subtipo:"Temperamental",
      desc:"Tem resistência de dano equivalente ao seu nível." },
    { nome:"Apático II",      nivel:"II",  subtipo:"Temperamental",
      desc:"Soma seu nível em seus Pontos de Vida." },
    { nome:"Apático III",     nivel:"III", subtipo:"Temperamental",
      desc:"Soma seu nível em sua Defesa." },

    { nome:"Cruel",           nivel:"I",   subtipo:"Temperamental",
      desc:"Soma seu nível em uma de suas fontes de dano." },
    { nome:"Cruel II",        nivel:"II",  subtipo:"Temperamental",
      desc:"Soma seu nível em todas as suas fontes de dano." },
    { nome:"Cruel III",       nivel:"III", subtipo:"Temperamental",
      desc:"Sempre que mata alguém recupera 3d20 pontos de Vida." },

    { nome:"Curioso",         nivel:"I",   subtipo:"Temperamental",
      desc:"Todos os Aspectos de Treino tem seu custo de PT reduzido em 1." },
    { nome:"Curioso II",      nivel:"II",  subtipo:"Temperamental",
      desc:"Todos os Aspectos de Treino tem seu custo reduzido em 3." },
    { nome:"Curioso III",     nivel:"III", subtipo:"Temperamental",
      desc:"Reduza o custo de uma habilidade de Aspecto de Treino em 20." },

    // ─── Movimentacionais ───
    { nome:"Cavo",            nivel:"I",   subtipo:"Movimentacional",
      desc:"Pode cavar um túnel como ação de coesão, este apenas a largura necessária para a Besta, e todos os seres de tamanho igual ou menor podem passar como terreno difícil. Uma Besta cava até 4m." },
    { nome:"Cavo II",         nivel:"II",  subtipo:"Movimentacional",
      desc:"Aumenta o deslocamento de cavo para até 9m." },
    { nome:"Cavo III",        nivel:"III", subtipo:"Movimentacional",
      desc:"Ataques desferidos de dentro da terra contra quem está fora, sempre serão dano crítico se acertarem." },

    { nome:"Corrida",         nivel:"I",   subtipo:"Movimentacional",
      desc:"Deslocamento aumenta para 9m." },
    { nome:"Corrida II",      nivel:"II",  subtipo:"Movimentacional",
      desc:"Deslocamento aumenta para 14m." },
    { nome:"Corrida III",     nivel:"III", subtipo:"Movimentacional",
      desc:"Deslocamento aumenta para 18m. Enquanto correndo, soma ⅓ de seu deslocamento em dano e defesa." },

    { nome:"Nado",            nivel:"I",   subtipo:"Movimentacional",
      desc:"Deslocamento de nado é 9m." },
    { nome:"Nado II",         nivel:"II",  subtipo:"Movimentacional",
      desc:"Deslocamento de nado é 15m e não é capaz de se afogar em água." },
    { nome:"Nado III",        nivel:"III", subtipo:"Movimentacional",
      desc:"Testes realizados enquanto nada possuem bônus de +1d10, incluindo dano." },

    { nome:"Voo",             nivel:"I",   subtipo:"Movimentacional",
      desc:"Pode voar, com deslocamento de 6m." },
    { nome:"Voo II",          nivel:"II",  subtipo:"Movimentacional",
      desc:"Aumenta o deslocamento do voo para 12m." },
    { nome:"Voo III",         nivel:"III", subtipo:"Movimentacional",
      desc:"(-2 PM) Se você estiver voando, pode desferir um rasante, desde que o seu alvo esteja à até 7m de você. Um ataque é desferido como normal, mas após a realização você parte voo em seguida, recuperando uma altitude equivalente à metragem de deslocamento restante." },

    // ─── Optativos ───
    { nome:"Adepto de Magia",      nivel:"I",   subtipo:"Optativo",
      desc:"Recebe 10 pontos de Limite Arcano e pode aprender qualquer magia de até Grau 1. Isso inclui magias de Teurgia que passam a custar o dobro dos PM ao invés de FE. Não é necessário Fontes ou Cetros para conjurarem magias desse poder." },
    { nome:"Adepto de Magia II",   nivel:"II",  subtipo:"Optativo",
      desc:"Aumenta seu Limite Arcano para 20 e pode aprender qualquer magia de até Grau 2." },
    { nome:"Adepto de Magia III",  nivel:"III", subtipo:"Optativo",
      desc:"Aumenta seu Limite Arcano para 30 e pode aprender qualquer magia de até Grau 3." },

    { nome:"Alterar Forma",        nivel:"I",   subtipo:"Optativo",
      desc:"(-6 PM) Pagando 6 PM e uma como ação protagonista, pode aumentar ou reduzir seu tamanho em até 1 passo, pela duração de uma cena. Neste caso, escolha uma perícia à sua escolha, para ter vantagem em testes enquanto transformado." },
    { nome:"Alterar Forma II",     nivel:"II",  subtipo:"Optativo",
      desc:"(-10 PM) Pagando 10 PM você assume a forma de algum animal ou pessoa, replicando-a. Então você possui +5 em testes de Carisma. Você pode sustentar essa aparência além de uma cena, pagando 2 PM." },
    { nome:"Alterar Forma III",    nivel:"III", subtipo:"Optativo",
      desc:"Ao usar Alterar Forma I, você pode escolher aprender um novo aspecto biológico não temperamental ou optativo. Mantendo-o em seu catálogo de poderes até o fim da cena." },

    { nome:"Físico Espectro",      nivel:"I",   subtipo:"Optativo",
      desc:"Todos os danos não-mágicos desferidos por essa criatura são reduzidos pela metade, mas todo dano não-mágico que a Besta sofrer também é reduzido à metade. Além disso a Besta é incapaz de usar itens não feitos de magia." },
    { nome:"Físico Espectro II",   nivel:"II",  subtipo:"Optativo",
      desc:"(-1 PM) Pode pagar 1 PM para atravessar uma parede ou evitar uma manobra." },
    { nome:"Físico Espectro III",  nivel:"III", subtipo:"Optativo",
      desc:"Você pode interagir com qualquer tipo de item, se esta for sua vontade. Além disso, pode possuir seres que estiverem adjacentes à você como uma ação complexa. Eles devem ter sucesso num teste de Poder contra sua Magia, se você vencer, eles realizam uma ordem e depois disso ficam imunes ao efeito. Seres 10 níveis abaixo, ficam indefinidamente sob seu controle uma vez que possuídos." },

    { nome:"Guloso",               nivel:"I",   subtipo:"Optativo",
      desc:"Toda criatura que sua Besta finalizar com uma ação complexa pode ser devorada, recuperando em Pontos de Vida da Besta a metade dos pontos de vida totais da criatura morta." },
    { nome:"Guloso II",            nivel:"II",  subtipo:"Optativo",
      desc:"Ao consumir uma criatura, recebe +1d10 em uma perícia até o dia seguinte." },
    { nome:"Guloso III",           nivel:"III", subtipo:"Optativo",
      desc:"Sempre que desfere dano com o ataque Mordida, recupera 2d8 pontos de vida." },

    { nome:"Imponente",            nivel:"I",   subtipo:"Optativo",
      desc:"Recebe vantagem testes de Carisma." },
    { nome:"Imponente II",         nivel:"II",  subtipo:"Optativo",
      desc:"Como ação de coesão, uma vez por cena, pode realizar um teste de Convencer ou Ameaçar contra um alvo que possa ver. O ser deve ter sucesso num teste de Perspicácia, se não, fica Fascinado por duas rodadas." },
    { nome:"Imponente III",        nivel:"III", subtipo:"Optativo",
      desc:"Todo teste realizado contra sua Besta por um ser de nível abaixo tem desvantagem." },

    { nome:"Invocação",            nivel:"I",   subtipo:"Optativo",
      desc:"(-8 PM) Sua Besta é retida e não pode ser atacada por nenhuma maneira quando nesse estado, ela pode ser trazida de volta ao custo de 8 PM e uma ação protagonista. Para retê-la é necessário usar uma ação complexa adjacente à ela. Caso você morrer e sua Besta estiver retida, ela reaparece sob seu cadáver." },
    { nome:"Invocação II",         nivel:"II",  subtipo:"Optativo",
      desc:"Você pode invocar sua Besta como ação de Coesão. E pode retê-la desde que está esteja à até alcance curto de você." },
    { nome:"Invocação III",        nivel:"III", subtipo:"Optativo",
      desc:"Enquanto retida, a Besta recupera 2 PV por rodada ou 20 PV todo fim de cena." },

    { nome:"Parasita",             nivel:"I",   subtipo:"Optativo",
      desc:"Sua Besta pode gastar uma ação complexa para fundir-se a você, sendo todo ataque desferido contra você ou ela, repartido igualmente entre os 2. Neste estado você se beneficia de todos os Aspectos Biológicos da Besta." },
    { nome:"Parasita II",          nivel:"II",  subtipo:"Optativo",
      desc:"Enquanto fundido à sua Besta, você ou ela podem realizar testes de perícia, usufruindo um dos Atributos e Perícias do outro. Exemplo, você pode atacar usando a Luta dela e sua Destreza." },
    { nome:"Parasita III",         nivel:"III", subtipo:"Optativo",
      desc:"Sua Besta pode saltar em direção à um inimigo adjacente e parasitá-lo como ação protagonista. Em termos mecânicos, eles estão Agarrados um ao outro, com o inimigo tendo uma chance por rodada para realizar um teste de Luta contra o da Besta para se soltar. Um inimigo parasitado, é Vulnerável à todos os ataques da Besta e do Treinador." },

    { nome:"Membros Extras",       nivel:"I",   subtipo:"Optativo",
      desc:"Escolha 1 membro extra entre: cabeça extra, braços extras, auxiliares extras. Cabeça extra: tem vantagem em testes de Perspicácia, Poder e Ameaçar e desvantagem em testes de Acrobacia, Reflexos e Quietude. Braços extras: pode pagar 10 PM para realizar um segundo ataque contra um inimigo em alcance. Auxiliares extras: Escolha uma perícia para ter um bônus de +2 e recebe +3 de deslocamento." },
    { nome:"Membros Extras II",    nivel:"II",  subtipo:"Optativo",
      desc:"Receba um segundo bônus de membro extra." },
    { nome:"Membros Extras III",   nivel:"III", subtipo:"Optativo",
      desc:"Receba um terceiro bônus de membro extra." },

    { nome:"Sentidos Aguçados",    nivel:"I",   subtipo:"Optativo",
      desc:"(-1 PM) Pode pagar 1 PM para receber +5 em um teste de Perspicácia." },
    { nome:"Sentidos Aguçados II", nivel:"II",  subtipo:"Optativo",
      desc:"(-5 PM) Pode pagar 5 PM, para até o fim da cena ter um bônus de +2 em todos os testes de perícia." },
    { nome:"Sentidos Aguçados III",nivel:"III", subtipo:"Optativo",
      desc:"Recebe +3 de Defesa e fica imune à desprevenido. Além disso, pode realizar a ação Vigiar num Descanso sem gastar ações." },

    { nome:"Venenoso",             nivel:"I",   subtipo:"Optativo",
      desc:"Ao critar em um ataque de Aspecto Biológico Ofensivo, você deixa o inimigo Envenenado. Este sofrerá 2d6 pontos de dano de magia por 1d4 rodadas. Caso o crítico seja desferido através do Ferrão, ele também fica Fraco pela duração do veneno." },
    { nome:"Venenoso II",          nivel:"II",  subtipo:"Optativo",
      desc:"O dano do veneno aumenta para 2d6+6. Além disso, sempre que atacar um inimigo agarrado ele ficará Envenenado, independente do crítico." },
    { nome:"Venenoso III",         nivel:"III", subtipo:"Optativo",
      desc:"Você é imune à venenos. O dano do veneno aumenta para 3d6+6, e sempre que você deixar um inimigo Envenenado ele também fica Fraco pela duração do veneno. Se o crítico for desferido através do Ferrão, o inimigo fica Fraco até o fim do dia." },
];

// ── Aspectos de Treino ─────────────────────────────────────────────────────────
// custo: valor em PT (número)

export const ASPECTOS_TREINO = [
    { nome:"Imparável",         custo: 5,
      desc:"Não sofre por terreno difícil e possui deslocamento de escalada igual ao deslocamento em terra." },
    { nome:"Guarda Aprimorada", custo: 8,
      desc:"Têm +3 de Defesa contra ataques realizados a até alcance curto." },
    { nome:"Postura Baixa",     custo:10,
      desc:"Tem vantagem em testes para realizar e resistir à manobras." },
    { nome:"Técnica de Reação", custo:10,
      desc:"Aprende uma Reação Complexa, se já possuir uma, passa a poder realizar até duas Reações Complexas por rodada." },
    { nome:"Queima do Espírito",custo:14,
      desc:"(-5 PM) Para cada 5 PM gastos, recebe +2 em dano e acerto num ataque. Há um limite de até 30 PM por ataque." },
    { nome:"Investida de Besta",custo:15,
      desc:"Como ação complexa você pode disparar em uma corrida em linha reta com o dobro do seu deslocamento normal atacando o primeiro alvo que estiver em seu caminho. O ataque provoca um dano extra igual ao deslocamento percorrido até o alvo, mas possui -5 no teste de ataque." },
    { nome:"Espírito Calmo",    custo:18,
      desc:"Têm +5 em testes para resistir à efeitos mágicos ou aumenta a DT de seus efeitos em +5. Escolha assim que receber o poder." },
    { nome:"Arremesso Monstro", custo:20,
      desc:"Sempre que acertar um ataque crítico corpo-a-corpo e desde que seu alvo tenha tamanho igual ou menor ao da Besta, pode escolher arremessar seu alvo até 3m. Reflexos (DT FOR) reduz o arremesso à metade. A partir de nível 8, arremessa até 6m. E de nível 16 em diante, arremessa até 9m." },
    { nome:"Garra Dupla",       custo:20,
      desc:"(-20 PM) Pagando 20 PM, uma vez por rodada, pode desferir um ataque extra." },
    { nome:"Surto de Ação",     custo:30,
      desc:"(-20 PM) Pagando 20 PM, uma vez por rodada, recebe uma ação protagonista extra." },
];
