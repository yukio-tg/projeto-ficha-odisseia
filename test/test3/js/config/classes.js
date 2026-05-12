export const CLASSES_PADRAO = [
    'Coração', 'Arcanista', 'Certeiro',
    'Terrível', 'Feromântico', 'Teurgista',
    'Engenhoso', 'Treinador'
];

export const CLASSE_RAMOS = {
    'Coração':       ['Abençoado', 'Altruísta', 'Prudente'],
    'Arcanista':     ['da Criação', 'Raiz', 'Lúdico'],
    'Certeiro':      ['Mão Ampla', 'Mão Dupla', 'Mão Nula'],
    'Terrível':      ['Atroz', 'Poderoso', 'Versátil'],
    'Feromântico':   ['Radical', 'Necromântico', 'Mulambeiro'],
    'Teurgista':     ['Milagroso', 'Ruinoso', 'Ancestral'],
    'Engenhoso':     ['da Máquina', 'do Encanto', 'da Cura'],
    'Treinador':     ['Alfa', 'Catalisador', 'Cavaleiro']
};

export const TODOS_RAMOS = Object.values(CLASSE_RAMOS).flat();