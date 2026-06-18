export const HERANCA_DATA = {
            'amaldiçoado': { hierarquia: 'pobre', dinheiro: 50, bonus: { type: 'fixed', attr: 'SAB', value: 1 }, poder: 'Raízes da Maldição' },
            'artista': { hierarquia: 'pobre', dinheiro: 50, bonus: { type: 'fixed', attr: 'CAR', value: 2 }, poder: 'Impulso Criativo' },
            'assassino': { hierarquia: 'pobre', dinheiro: 50, bonus: { type: 'fixed', attr: 'DES', value: 1 }, poder: 'Fugaz e Letal' },
            'carcereiro': { hierarquia: 'trabalhador', dinheiro: 80, bonus: { type: 'fixed', attr: 'FOR', value: 1 }, poder: 'Enjaular' },
            'chef': { hierarquia: 'trabalhador', dinheiro: 80, bonus: { type: 'fixed', attr: 'INT', value: 1 }, poder: 'Cozinha Perfeita' },
            'contador de estórias': { hierarquia: 'pobre', dinheiro: 60, bonus: { type: 'fixed', attr: 'CAR', value: 1 }, poder: 'Era Uma Vez...' },
            'culposo': { hierarquia: 'trabalhador', dinheiro: 30, bonus: { type: 'fixed', attr: 'SAB', value: 1 }, poder: 'Tão Ruim Assim?' },
            'educador': { hierarquia: 'trabalhador', dinheiro: 80, bonus: { type: 'fixed', attr: 'INT', value: 1 }, poder: 'Lição Diária' },
            'errante': { hierarquia: 'pobre', dinheiro: 0, bonus: { type: 'fixed', attr: 'CON', value: 1 }, poder: 'Calejado' },
            'espirituoso': { hierarquia: 'trabalhador', dinheiro: 30, bonus: { type: 'fixed', attr: 'SAB', value: 1 }, poder: 'Relação Mágica' },
            'estudante': { hierarquia: 'trabalhador', dinheiro: 50, bonus: { type: 'fixed', attr: 'INT', value: 1 }, poder: 'Aprendizado Acadêmico' },
            'explorador': { hierarquia: 'trabalhador', dinheiro: 50, bonus: { type: 'choice', choices: ['FOR', 'CON'] }, poder: 'Cuidado Onde Pisa!' },
            'guarda': { hierarquia: 'trabalhador', dinheiro: 50, bonus: { type: 'fixed', attr: 'FOR', value: 1 }, poder: 'Patrulha' },
            'homem da mata': { hierarquia: 'pobre', dinheiro: 0, bonus: { type: 'fixed', attr: 'DES', value: 1 }, poder: 'Primitivo' },
            'honroso': { hierarquia: 'pobre', dinheiro: 50, bonus: { type: 'fixed', attr: 'SAB', value: 1 }, poder: 'Virtude' },
            'injustiçado': { hierarquia: 'trabalhador', dinheiro: 50, bonus: { type: 'choice', choices: ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'] }, poder: 'Matar um Certo Alguém' },
            'ladrão': { hierarquia: 'pobre', dinheiro: 60, bonus: { type: 'fixed', attr: 'DES', value: 1 }, poder: 'Corre Viado!' },
            'mercante': { hierarquia: 'vendedor', dinheiro: 100, bonus: { type: 'fixed', attr: 'CAR', value: 1 }, poder: 'Lucro!' },
            'olímpico': { hierarquia: 'trabalhador', dinheiro: 10, bonus: { type: 'fixed', attr: 'CON', value: 1 }, poder: 'Atlético' },
            'renegado': { hierarquia: 'pobre', dinheiro: 50, bonus: { type: 'fixed', attr: 'CAR', value: 1 }, poder: 'Indigno' },
            'sacerdócio': { hierarquia: 'trabalhador', dinheiro: 30, bonus: { type: 'fixed', attr: 'SAB', value: 1 }, poder: 'Filho da Deusa' },
            'sangue real': { hierarquia: 'vendedor', dinheiro: 300, bonus: { type: 'fixed', attr: 'CAR', value: 1 }, poder: 'Podre de Rico' },
            'sussurrado': { hierarquia: 'trabalhador', dinheiro: 20, bonus: { type: 'fixed', attr: 'CAR', value: 1 }, poder: 'Rumores' }
        };

export const HIERARQUIA_ORDEM = ['pobre', 'trabalhador', 'vendedor', 'burgues', 'barao', 'duque', 'herdeiro', 'imperador'];

export const HERANCAS_PADRAO = Object.keys(HERANCA_DATA).map(nome => nome.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()));