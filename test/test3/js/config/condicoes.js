// js/config/condicoes.js
export const CONDICOES_LISTA = [
  {
    nome: "Asfixiado",
    desc: "O personagem não consegue respirar. No começo de toda rodada que um personagem está Asfixiado ele deve realizar um teste de Esforço DT 5, a cada rodada que o personagem está Asfixiado a DT aumenta em +10. Se um personagem falha neste teste ele fica Inconsciente. Se no começo de uma rodada um personagem está Asfixiado e Inconsciente, ele entra em Morrendo, só podendo ser salvo se for tirado da primeira condição. Se um personagem começa sua rodada Asfixiado e Morrendo, ele morre."
  },
  {
    nome: "Caído",
    desc: "O personagem está deitado no chão. Ele sofre -5 em testes de Luta, mas recebe +5 de Defesa contra testes de ataque à distância. Seu deslocamento é reduzido para 1,5m."
  },
  {
    nome: "Debilitado",
    desc: "Sofre -10 em testes de Destreza, Força e Constituição. Se ficar Debilitado novamente, fica Inconsciente."
  },
  {
    nome: "Desprevenido",
    desc: "Despreparado para reagir. Você não pode usar Reações Complexas e tem -5 em testes de Reflexos."
  },
  {
    nome: "Doente",
    desc: "Sob efeito de uma doença."
  },
  {
    nome: "Em Chamas",
    desc: "O personagem está pegando fogo. Todo começo de rodada você sofre 1d8+2 pontos de dano de Fogo. Você ou um aliado adjacente pode gastar uma ação protagonista para apagar as chamas. Imersão em água também apaga as chamas."
  },
  {
    nome: "Enjoado",
    desc: "O personagem não pode realizar ações de coesão."
  },
  {
    nome: "Envenenado",
    desc: "O efeito da condição varia de acordo com o veneno. Venenos podem se acumular. Quando não há especificação da duração, adote “cena”. Quando não há especificação do dano, adote “perde 1d4 pontos de vida todo começo de turno”."
  },
  {
    nome: "Fraco",
    desc: "Tem desvantagem em testes baseados em Destreza, Força e Constituição."
  },
  {
    nome: "Inconsciente",
    desc: "O personagem está desacordado. Não pode fazer ações. Balançar um ser e acordá-lo é uma ação protagonista."
  },
  {
    nome: "Indefeso",
    desc: "Falha automaticamente em testes de Reflexos, é considerado desprevenido, mas sofre -10 em sua Defesa. Pode sofrer golpes de misericórdia."
  },
  {
    nome: "Machucado",
    desc: "O personagem tem menos da metade de seus pontos de vida totais."
  },
  {
    nome: "Morrendo",
    desc: "Com 0 ou menos pontos de vida. Um personagem Morrendo está Inconsciente. A condição se encerra caso o personagem ficar pontos de vida igual ou acima de 1."
  },
  {
    nome: "Petrificado",
    desc: "O personagem fica inconsciente e recebe resistência a dano 10."
  },
  {
    nome: "Sangrando",
    desc: "Com um ferimento aberto. No início de seus turnos, o personagem perde 1d8+2 pontos de vida. A condição se encerra caso o personagem recuperar pelo menos 1 PV."
  },
  {
    nome: "Surpreendido",
    desc: "Não ciente de seus inimigos. O personagem fica Desprevenido e não pode fazer ações. Dura uma rodada."
  },
  {
    nome: "Vulnerável à dano",
    desc: "O personagem sofre dano dobrado de um tipo de dano específico."
  },
  // Condições de Fadiga
  {
    nome: "Exausto",
    desc: "O personagem fica Debilitado, lento e com -5 de Defesa. Se ficar Exausto novamente, fica Inconsciente."
  },
  {
    nome: "Fatigado",
    desc: "O personagem fica Fraco e com -2 na Defesa. Se o personagem ficar fatigado novamente, fica Exausto."
  },
  // Condições de Paralisia
  {
    nome: "Agarrado",
    desc: "O personagem fica desprevenido e imóvel, sofre desvantagem em testes de ataque e só pode atacar com armas leves. Um personagem atacando à distância contra um alvo envolvido na manobra de agarrar tem 50% de chance de acertar o alvo errado."
  },
  {
    nome: "Enredado",
    desc: "O personagem fica Lento, -10 na Defesa e sofre desvantagem em testes de ataque."
  },
  {
    nome: "Imóvel",
    desc: "Todas as formas de deslocamento do personagem são reduzidas a 0m."
  },
  {
    nome: "Lento",
    desc: "Todas as formas de deslocamento do personagem são reduzidas à metade."
  },
  {
    nome: "Paralisado",
    desc: "O personagem fica Imóvel e Indefeso e só pode realizar ações puramente mentais."
  },
  // Condições de Sentidos
  {
    nome: "Cego",
    desc: "O personagem fica Desprevenido e Lento, não pode fazer testes de Perspicácia para observar e sofre -5 em todos os testes de Destreza, Força e de ataque. Todos os alvos de seus ataques recebem camuflagem total. Você é cego quando está numa área de escuridão total, a menos que haja luz."
  },
  {
    nome: "Ofuscado",
    desc: "O personagem sofre -5 em testes de ataque e Perspicácia."
  },
  {
    nome: "Surdo",
    desc: "O personagem não pode fazer testes de Perspicácia para ouvir e sofre -5 em testes de Reflexos."
  },
  // Condições Mentais
  {
    nome: "Abalado",
    desc: "O personagem sofre desvantagem em testes. Se ficar Abalado novamente, fica Apavorado."
  },
  {
    nome: "Alquebrado",
    desc: "Todo gasto de PM em 1."
  },
  {
    nome: "Apavorado",
    desc: "O personagem sofre -10 em testes. Deve fugir da fonte de medo da maneira mais eficiente possível (só parando quando não tem mais visão ou estiver além de alcance médio) e não pode se aproximar voluntariamente dela."
  },
  {
    nome: "Atordoado",
    desc: "O personagem fica desprevenido e não pode fazer ações."
  },
  {
    nome: "Confuso",
    desc: "O personagem comporta-se de modo aleatório. Role 1d6 no inicio de seus turnos: 1) O personagem corre para uma direção aleatória (role 1d4); 2) O personagem não pode realizar ações; 3) Ataca o ser mais próximo independente de ser ou não aliado; 4) O personagem larga qualquer item que empunhar em suas mãos e não o poderá pegar até o fim da condição; 5) O personagem se joga no chão, sofrendo 1d4 pontos de dano de Impacto e ficando Caído; 6) A condição se encerra."
  },
  {
    nome: "Esmorecido",
    desc: "O personagem sofre -10 em testes de Inteligência, Carisma e Sabedoria."
  },
  {
    nome: "Fascinado",
    desc: "Com a atenção presa a alguma coisa. O personagem sofre -10 em testes de Perspicácia e não pode fazer ações, exceto observar aquilo que o fascinou. Qualquer ação hostil contra o personagem anula esta condição. Balançar um ser fascinado para tirá-lo desse estado é uma ação protagonista."
  },
  {
    nome: "Frustrado",
    desc: "O personagem tem desvantagem em testes de Inteligência, Carisma e Sabedoria."
  },
  {
    nome: "Pasmo",
    desc: "O personagem não pode fazer ações."
  }
];