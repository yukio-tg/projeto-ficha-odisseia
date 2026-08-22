export const HERANCA_DATA = {
    'amaldiçoado': {
        hierarquia: 'pobre', dinheiro: 50,
        bonus: { type: 'fixed', attr: 'SAB', value: 1 },
        poder: 'Marca da Maldição', poderPt: 0, poderOtherCosts: '',
        poderDesc: 'Você recebe um Aspecto Biológico de Besta à sua escolha.'
    },
    'artista': {
        hierarquia: 'pobre', dinheiro: 50,
        bonus: { type: 'fixed', attr: 'CAR', value: 2 },
        poder: 'Impulso Criativo', poderPt: 0, poderOtherCosts: '',
        poderDesc: 'Uma vez por cena, você pode escolher utilizar como recurso sua criatividade, para receber uma vantagem em um teste à sua escolha.'
    },
    'assassino': {
        hierarquia: 'trabalhador', dinheiro: 100,
        bonus: { type: 'fixed', attr: 'DES', value: 1 },
        poder: 'Fugaz e Letal', poderPt: 5, poderOtherCosts: '',
        poderDesc: 'Recebe +1d de dano contra seres desprevenidos e sempre recebe vantagem no primeiro teste de ataque realizado numa cena.'
    },
    'canibal': {
        hierarquia: 'trabalhador', dinheiro: 0,
        bonus: { type: 'choice', choices: ['DES', 'CON'] },
        poder: 'Celebração Canibal', poderPt: 0, poderOtherCosts: '',
        poderDesc: 'Como ação protagonista você pode finalizar um alvo adjacente em Morrendo o devorando. Assim recuperando em Pontos de Vida um valor igual a metade dos Pontos de Vida Totais do ser devorado.'
    },
    'carcereiro': {
        hierarquia: 'trabalhador', dinheiro: 80,
        bonus: { type: 'fixed', attr: 'FOR', value: 1 },
        poder: 'Enjaular', poderPt: 4, poderOtherCosts: '-3 PM',
        poderDesc: 'Uma vez por cena, pode gastar 3 PM para realizar uma manobra especial que deixa o alvo Imóvel por uma rodada.'
    },
    'chef': {
        hierarquia: 'trabalhador', dinheiro: 80,
        bonus: { type: 'fixed', attr: 'INT', value: 1 },
        poder: 'Cozinha Perfeita', poderPt: 1, poderOtherCosts: '',
        poderDesc: 'Pratos cozinhados por você numa cena de Descanso não gastam ingredientes ou oferecem 2 bônus por prato.'
    },
    'criminoso': {
        hierarquia: 'trabalhador', dinheiro: 100,
        bonus: { type: 'choice', choices: ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'] },
        poder: 'Contrabando', poderPt: 0, poderOtherCosts: '',
        poderDesc: 'Uma de suas armas têm sua raridade reduzida em 1.'
    },
    'diplomata': {
        hierarquia: 'vendedor', dinheiro: 50,
        bonus: { type: 'fixed', attr: 'CAR', value: 1 },
        poder: 'Diplomacia', poderPt: 0, poderOtherCosts: '',
        poderDesc: 'Você recebe +1 ponto de Grau de Proficiência em Convencer, Mentir ou Ameaçar.'
    },
    'domador': {
        hierarquia: 'trabalhador', dinheiro: 30,
        bonus: { type: 'fixed', attr: 'CAR', value: 1 },
        poder: 'Parceria Animal', poderPt: 3, poderOtherCosts: '',
        poderDesc: 'Você possui um animal como aliado. Ele seguirá as regras de Besta mas não possuirá PM, apenas PV. Ele não conta como um vínculo e poderá aprender livremente Aspectos Biológicos (exceto Optativos que não sejam: Imponente, Sentidos Aguçados ou Venenoso). PV: 10 + CON, aumentando (2 + CON/2) por nível. Ele pode aprender Aspectos de Treino e Individuais.'
    },
    'educador': {
        hierarquia: 'trabalhador', dinheiro: 80,
        bonus: { type: 'fixed', attr: 'INT', value: 1 },
        poder: 'Aula Prática', poderPt: 2, poderOtherCosts: '-2 PM',
        poderDesc: 'Em uma cena de Descanso, pode gastar 2 PM e reduzir temporariamente 1 Grau de Treinamento de uma de suas perícias para ofertar outro Grau de Treinamento a um aliado. Um aliado só pode ser alvo deste poder uma vez. No próximo Descanso, o aliado perde o ponto extra e você recupera os seus.'
    },
    'errante': {
        hierarquia: 'pobre', dinheiro: 30,
        bonus: { type: 'fixed', attr: 'CON', value: 1 },
        poder: 'Calejado', poderPt: 2, poderOtherCosts: '',
        poderDesc: 'Recebe +2 PV por nível.'
    },
    'espirituoso': {
        hierarquia: 'trabalhador', dinheiro: 30,
        bonus: { type: 'fixed', attr: 'SAB', value: 1 },
        poder: 'Relação Mágica', poderPt: 4, poderOtherCosts: '',
        poderDesc: 'Sempre que sofrer de um efeito mágico recebe +1 PM temporário.'
    },
    'estudante': {
        hierarquia: 'trabalhador', dinheiro: 50,
        bonus: { type: 'fixed', attr: 'INT', value: 1 },
        poder: 'Aprendizado Acadêmico', poderPt: 1, poderOtherCosts: '',
        poderDesc: 'Você pode aumentar +1 grau de proficiência de qualquer perícia que não seja baseada em Força ou Constituição.'
    },
    'explorador': {
        hierarquia: 'trabalhador', dinheiro: 50,
        bonus: { type: 'choice', choices: ['FOR', 'CON'] },
        poder: 'Cuidado Onde Pisa!', poderPt: 0, poderOtherCosts: '',
        poderDesc: 'Recebe +2 em testes para lidar com o terreno, é imune a terreno difícil e não perde deslocamento por escalada. Tem RD 2 a danos por queda.'
    },
    'guarda': {
        hierarquia: 'trabalhador', dinheiro: 50,
        bonus: { type: 'fixed', attr: 'FOR', value: 1 },
        poder: 'Patrulha', poderPt: 1, poderOtherCosts: '',
        poderDesc: '+3 de Defesa.'
    },
    'homem da mata': {
        hierarquia: 'pobre', dinheiro: 0,
        bonus: { type: 'choice', choices: ['DES', 'FOR'] },
        poder: 'Primitivo', poderPt: 1, poderOtherCosts: '',
        poderDesc: 'Você recebe vantagem em testes de resistência contra inimigos não antropomórficos.'
    },
    'honroso': {
        hierarquia: 'pobre', dinheiro: 50,
        bonus: { type: 'fixed', attr: 'SAB', value: 1 },
        poder: 'Virtude', poderPt: 0, poderOtherCosts: '',
        poderDesc: 'Ao cometer uma atitude moralmente honrável recupera 1 PM.'
    },
    'infâme': {
        hierarquia: 'trabalhador', dinheiro: 50,
        bonus: { type: 'fixed', attr: 'CAR', value: 1 },
        poder: 'Indigno', poderPt: 0, poderOtherCosts: '',
        poderDesc: 'Ao cometer uma atitude moralmente condenável recupera 1 PM.'
    },
    'injustiçado': {
        hierarquia: 'trabalhador', dinheiro: 50,
        bonus: { type: 'choice', choices: ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'] },
        poder: 'Matar um Certo Alguém', poderPt: 0, poderOtherCosts: '',
        poderDesc: 'Defina no início da campanha contra quem você quer se vingar (até 3 pessoas). Contra eles: vantagem em testes de resistência de efeitos proporcionados por eles, vantagem em testes de ataque e +2 na margem de ameaça.'
    },
    'ladrão': {
        hierarquia: 'pobre', dinheiro: 60,
        bonus: { type: 'fixed', attr: 'DES', value: 1 },
        poder: 'Orgulho dos Achados', poderPt: 0, poderOtherCosts: '',
        poderDesc: 'Para cada item que você roubar de ao menos raridade Comum, você aumenta seu PM máximo em +1. Incomum: +2, Raro: +3, Épico: +4, Lendário: +5.'
    },
    'médico': {
        hierarquia: 'trabalhador', dinheiro: 50,
        bonus: { type: 'fixed', attr: 'INT', value: 1 },
        poder: 'Enfermaria', poderPt: 1, poderOtherCosts: '',
        poderDesc: 'Pode pagar uma ação protagonista uma vez por cena para recuperar de um aliado adjacente 1d8 PV.'
    },
    'mercante': {
        hierarquia: 'vendedor', dinheiro: 100,
        bonus: { type: 'fixed', attr: 'CAR', value: 1 },
        poder: 'Lucro!', poderPt: 0, poderOtherCosts: '',
        poderDesc: 'Ao vender um item, ele valoriza em +25%.'
    },
    'navegador': {
        hierarquia: 'trabalhador', dinheiro: 100,
        bonus: { type: 'fixed', attr: 'CON', value: 1 },
        poder: 'Mão no Leme', poderPt: 2, poderOtherCosts: '',
        poderDesc: 'Quando em uma navegação você pode assumir a liderança, recebendo sem custo adicional de PT o poder Distribuição Prudente de Coração Prudente. Se já tiver este poder, o custo de PT dele é cortado pela metade.'
    },
    'olímpico': {
        hierarquia: 'trabalhador', dinheiro: 40,
        bonus: { type: 'fixed', attr: 'CON', value: 1 },
        poder: 'Atlético', poderPt: 2, poderOtherCosts: '-2 PM',
        poderDesc: 'Pode gastar 2 PM para receber +5 em testes de Trabalho, Acrobacia, Esforço ou Reflexos.'
    },
    'prisioneiro': {
        hierarquia: 'pobre', dinheiro: 50,
        bonus: { type: 'fixed', attr: 'CON', value: 2 },
        poder: 'Casca Grossa', poderPt: 0, poderOtherCosts: '',
        poderDesc: 'A cada 3 níveis (a partir de nível 1) você recebe +2 RD a dano mundano.'
    },
    'sacerdócio': {
        hierarquia: 'trabalhador', dinheiro: 50,
        bonus: { type: 'fixed', attr: 'SAB', value: 1 },
        poder: 'Filho da Deusa', poderPt: 0, poderOtherCosts: '',
        poderDesc: 'Caso batizar, recebe +5 pontos de Fé.'
    },
    'sangue real': {
        hierarquia: 'vendedor', dinheiro: 300,
        bonus: { type: 'fixed', attr: 'CAR', value: 1 },
        poder: 'Podre de Rico', poderPt: 6, poderOtherCosts: '',
        poderDesc: 'Recebe um item extra de raridade igual à maior que tens disponível. Exemplo: se a maior raridade que pode ter é 1 raro, ao invés disso torna-se 2 raros.'
    },
    'sobrevivente': {
        hierarquia: 'pobre', dinheiro: 0,
        bonus: { type: 'choice', choices: ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'] },
        poder: 'Instinto de Sobrevivência', poderPt: 0, poderOtherCosts: '',
        poderDesc: 'Uma vez por sessão, pode ganhar vantagem em qualquer teste, trazendo à tona uma memória específica de seu passado.'
    },
    'sussurrado': {
        hierarquia: 'trabalhador', dinheiro: 20,
        bonus: { type: 'fixed', attr: 'CAR', value: 1 },
        poder: 'Rumores', poderPt: 0, poderOtherCosts: '',
        poderDesc: 'Todas as vezes que interagir com um novo personagem recebe vantagem em seu primeiro teste baseado em Carisma contra ele.'
    },
    'veterano': {
        hierarquia: 'trabalhador', dinheiro: 50,
        bonus: { type: 'fixed', attr: 'INT', value: 1 },
        poder: 'Evolução Consagrada', poderPt: 3, poderOtherCosts: '',
        poderDesc: 'Na evolução de Classe, você está sempre um passo à frente (ex.: nível 1 já tem acesso a Ramos, nível 2 já teria Individualidade). Entretanto, a experiência já lhe custou a juventude: você é permanentemente Fraco ou Frustrado.'
    },
};

export const HIERARQUIA_ORDEM = ['pobre', 'trabalhador', 'vendedor', 'burgues', 'barao', 'duque', 'herdeiro', 'imperador'];

export const HERANCAS_PADRAO = Object.keys(HERANCA_DATA).map(nome =>
    nome.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
);
