// app.js
import ListaPoderes from './lista-poderes.js';
import { cardsIniciais1, cardsIniciais2 } from './dados-iniciais.js';

// Quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  const lista1 = new ListaPoderes(document.getElementById('lista1'), 'lista1', cardsIniciais1);
  const lista2 = new ListaPoderes(document.getElementById('lista2'), 'lista2', cardsIniciais2);
  // Adicione quantas listas precisar
});