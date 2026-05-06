export default class ListaPoderes {
  constructor(containerElement, listId, defaultCards = []) {
  this.container = containerElement;
  this.listId = listId;
  this.storageKey = `powers_data_${listId}`;
  this.defaultCards = defaultCards;

  // Estado do drag (isolado)
  this.dragActive = false;
  this.originalCard = null;
  this.placeholder = null;
  this.ghost = null;

  // Bind dos métodos usados em eventos
  this.onMouseMove = this.onMouseMove.bind(this);
  this.onMouseUp = this.onMouseUp.bind(this);
  this.onClickContainer = this.onClickContainer.bind(this);
  this.onMouseDownContainer = this.onMouseDownContainer.bind(this);

  this.init();
}

  escapeHtml(str) {
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]);
  }

  createCardElement(cardData) {
    const card = document.createElement('div');
    card.className = 'card-power';
    card.setAttribute('data-id', cardData.id);
    card.innerHTML = `
      <div class="card-header">
        <span class="pt-cost">${cardData.pt}</span>
        <span class="name-power">${this.escapeHtml(cardData.name)}</span>
        <span class="others-costs">${this.escapeHtml(cardData.otherCost)}</span>
      </div>
      <div class="card-toolbar">
        <button class="edit-btn">✎ Editar</button>
        <button class="delete-btn">🗑 Excluir</button>
        <button class="drag-handle">☰</button>
      </div>
      <div class="card-content"><p>${this.escapeHtml(cardData.desc)}</p></div>
    `;
    return card;
  }

  loadData() {
    const json = localStorage.getItem(this.storageKey);
    if (!json) return null;
    try {
      const data = JSON.parse(json);
      if (data && Array.isArray(data.items) && Array.isArray(data.order)) {
        return data;
      }
    } catch (e) {}
    return null;
  }

  saveData(order, items) {
    localStorage.setItem(this.storageKey, JSON.stringify({ order, items }));
  }

  getItemsMap() {
    const map = new Map();
    this.container.querySelectorAll('.card-power').forEach(card => {
      const id = card.dataset.id;
      if (!id) return;
      const name = card.querySelector('.name-power')?.innerText || '';
      const pt = card.querySelector('.pt-cost')?.innerText || '0';
      const otherCost = card.querySelector('.others-costs')?.innerText || '';
      const desc = card.querySelector('.card-content p')?.innerText || '';
      map.set(id, {
        id,
        pt: parseInt(pt) || 0,
        name,
        otherCost,
        desc
      });
    });
    return map;
  }

  persist() {
    const cards = Array.from(this.container.querySelectorAll('.card-power'));
    const order = cards.map(c => c.dataset.id);
    const items = [];
    const itemsMap = this.getItemsMap();
    order.forEach(id => {
      if (itemsMap.has(id)) items.push(itemsMap.get(id));
    });
    this.saveData(order, items);
  }

  render() {
    const data = this.loadData();
    let cardsData = this.defaultCards;

    if (data && data.items.length > 0) {
      const itemsMap = new Map(data.items.map(i => [i.id, i]));
      cardsData = data.order.map(id => itemsMap.get(id)).filter(Boolean);
      data.items.forEach(item => {
        if (!cardsData.some(c => c.id === item.id)) cardsData.push(item);
      });
    }

    this.container.querySelectorAll('.card-power').forEach(c => c.remove());

    cardsData.forEach(cardData => {
      const cardEl = this.createCardElement(cardData);
      this.container.appendChild(cardEl);
    });

    this.persist();
  }

  createNewCard() {
    let maxId = 0;
    this.container.querySelectorAll('.card-power').forEach(c => {
      const id = parseInt(c.dataset.id);
      if (id > maxId) maxId = id;
    });
    const newId = maxId + 1;

    const newCardData = {
      id: newId,
      pt: 10,
      name: `Novo Poder ${newId}`,
      otherCost: '-0 PM',
      desc: 'Descrição editável.'
    };

    const oldPos = this.capturePositions();
    const newCard = this.createCardElement(newCardData);
    this.container.appendChild(newCard);
    const newPos = this.capturePositions();
    this.animateCards(oldPos, newPos);
    this.persist();
    newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  editCard(card) {
    const nameSpan = card.querySelector('.name-power');
    const descP = card.querySelector('.card-content p');
    const ptSpan = card.querySelector('.pt-cost');
    const costSpan = card.querySelector('.others-costs');

    const newName = prompt('✏️ Nome do poder:', nameSpan.innerText);
    if (newName !== null) nameSpan.innerText = newName;

    const newDesc = prompt('📝 Descrição:', descP.innerText);
    if (newDesc !== null) descP.innerText = newDesc;

    const newPt = prompt('🔢 Custo em PT:', ptSpan.innerText);
    if (newPt !== null && !isNaN(parseInt(newPt))) ptSpan.innerText = parseInt(newPt);

    const newCost = prompt('⚡ Outros custos:', costSpan.innerText);
    if (newCost !== null) costSpan.innerText = newCost;

    this.persist();
  }

  deleteCard(card) {
    if (confirm(`Excluir "${card.querySelector('.name-power').innerText}" permanentemente?`)) {
      const oldPos = this.capturePositions();
      card.remove();
      const newPos = this.capturePositions();
      this.animateCards(oldPos, newPos);
      this.persist();
    }
  }

  capturePositions() {
    const pos = {};
    this.container.querySelectorAll('.card-power').forEach(card => {
      if (card.dataset.id) pos[card.dataset.id] = card.getBoundingClientRect().top;
    });
    return pos;
  }

  animateCards(oldPositions, newPositions) {
    const cards = this.container.querySelectorAll('.card-power');
    cards.forEach(card => {
      const oldTop = oldPositions[card.dataset.id];
      const newTop = newPositions[card.dataset.id];
      if (oldTop !== undefined && newTop !== undefined && Math.abs(oldTop - newTop) > 0.5) {
        card.style.transform = `translateY(${oldTop - newTop}px)`;
        card.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1)';
        requestAnimationFrame(() => {
          card.style.transform = '';
          card.addEventListener('transitionend', () => {
            card.style.transition = '';
          }, { once: true });
        });
      }
    });
  }

  getCards() {
    return Array.from(this.container.querySelectorAll('.card-power:not(.dragging-original)'));
  }

  createPlaceholder(card) {
    const ph = document.createElement('div');
    ph.className = 'card-placeholder';
    ph.style.height = `${card.offsetHeight}px`;
    ph.style.marginBottom = '16px';
    return ph;
  }

  createGhost(card, e) {
    const rect = card.getBoundingClientRect();
    const clone = card.cloneNode(true);
    clone.classList.add('dragging-ghost');
    clone.style.position = 'fixed';
    clone.style.top = `${rect.top}px`;
    clone.style.left = `${rect.left}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.opacity = '0.95';
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);
    return clone;
  }

  updateGhostPosition(e) {
    if (this.ghost) {
      this.ghost.style.left = `${e.clientX - 20}px`;
      this.ghost.style.top = `${e.clientY - 15}px`;
    }
  }

  getTargetIndex(mouseY) {
    const cards = this.getCards().filter(c => c !== this.placeholder);
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      const middle = rect.top + rect.height / 2;
      if (mouseY < middle) return i;
    }
    return cards.length;
  }

  movePlaceholder(mouseY) {
    if (!this.placeholder) return;
    const targetIndex = this.getTargetIndex(mouseY);
    const cardsOnly = this.getCards().filter(c => c !== this.placeholder);
    let refNode = null;
    if (targetIndex < cardsOnly.length) refNode = cardsOnly[targetIndex];
    const currentIdx = Array.from(this.container.children).indexOf(this.placeholder);
    const newIdx = refNode ? Array.from(this.container.children).indexOf(refNode) : this.container.children.length;
    if (currentIdx !== newIdx) {
      if (refNode) this.container.insertBefore(this.placeholder, refNode);
      else this.container.appendChild(this.placeholder);
    }
  }

  startDrag(e, card) {
    if (this.dragActive) return;
    e.preventDefault();
    this.dragActive = true;
    this.originalCard = card;

    const beforePositions = this.capturePositions();
    card.classList.add('dragging-original');
    this.placeholder = this.createPlaceholder(card);
    this.container.appendChild(this.placeholder);
    this.ghost = this.createGhost(card, e);
    this.updateGhostPosition(e);

    const afterPositions = this.capturePositions();
    this.animateCards(beforePositions, afterPositions);

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  onMouseMove(e) {
    if (!this.dragActive) return;
    e.preventDefault();
    this.updateGhostPosition(e);
    this.movePlaceholder(e.clientY);
  }

  onMouseUp(e) {
    if (!this.dragActive) return;
    this.finishDrag();
  }

  finishDrag() {
    if (!this.dragActive) return;
    const beforePositions = this.capturePositions();
    if (this.placeholder && this.originalCard) {
      this.container.insertBefore(this.originalCard, this.placeholder);
      this.placeholder.remove();
    }
    if (this.originalCard) this.originalCard.classList.remove('dragging-original');
    const afterPositions = this.capturePositions();
    this.animateCards(beforePositions, afterPositions);

    if (this.ghost) this.ghost.remove();
    this.dragActive = false;
    this.originalCard = null;
    this.placeholder = null;
    this.ghost = null;

    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);

    this.persist();
  }

  onClickContainer(e) {
    const createBtn = e.target.closest('.createCardBtn');
    if (createBtn) {
      this.createNewCard();
      return;
    }
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
      const card = editBtn.closest('.card-power');
      if (card) this.editCard(card);
      return;
    }
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
      const card = deleteBtn.closest('.card-power');
      if (card) this.deleteCard(card);
      return;
    }
  }

  onMouseDownContainer(e) {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;
    e.preventDefault();
    const card = handle.closest('.card-power');
    if (card && !this.dragActive) {
      this.startDrag(e, card);
    }
  }

  init() {
    this.render();
    this.container.addEventListener('click', this.onClickContainer);
    this.container.addEventListener('mousedown', this.onMouseDownContainer);
    this.container.addEventListener('dragstart', e => e.preventDefault());
  }
  // ... todos os outros métodos (persist, render, createNewCard, editCard, drag, etc.) ...
}