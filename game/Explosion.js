import { GAME_CONFIG } from './constants.js';

export class Explosion {
  constructor(id, cells) {
    this.id = id;
    this.cells = cells; // Array of { x, y, type } where type is 'center', 'horizontal', 'vertical'
    this.createdAt = Date.now();
    this.duration = 500; // Explosion lasts 500ms
    this.finished = false;
    
    this.elements = [];
  }

  isFinished() {
    return Date.now() - this.createdAt >= this.duration;
  }

  markFinished() {
    this.finished = true;
  }

  getPixelPosition(x, y) {
    const { TILE_SIZE } = GAME_CONFIG;
    return {
      x: x * TILE_SIZE,
      y: y * TILE_SIZE
    };
  }

  createElements() {
    const { TILE_SIZE } = GAME_CONFIG;
    const fragment = document.createDocumentFragment();
    
    this.cells.forEach((cell, index) => {
      const pos = this.getPixelPosition(cell.x, cell.y);
      
      const el = document.createElement('div');
      el.className = `explosion explosion-${cell.type || 'center'}`;
      el.setAttribute('data-explosion-id', this.id);
      
      el.style.width = `${TILE_SIZE}px`;
      el.style.height = `${TILE_SIZE}px`;
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
      
      this.elements.push(el);
      fragment.appendChild(el);
    });
    
    return fragment;
  }

  removeElements() {
    this.elements.forEach(el => {
      if (el && el.parentNode) {
        el.remove();
      }
    });
    this.elements = [];
  }

  containsPosition(x, y) {
    return this.cells.some(cell => cell.x === x && cell.y === y);
  }
}

export function calculateExplosionCells(x, y, flameRange, gameMap) {
  const cells = [];
  
  cells.push({ x, y, type: 'center', hitBlock: false });
  
  const directions = [
    { dx: 0, dy: -1, type: 'vertical' },   
    { dx: 0, dy: 1, type: 'vertical' },    
    { dx: -1, dy: 0, type: 'horizontal' }, 
    { dx: 1, dy: 0, type: 'horizontal' }   
  ];
  
  for (const dir of directions) {
    for (let i = 1; i <= flameRange; i++) {
      const newX = x + (dir.dx * i);
      const newY = y + (dir.dy * i);
      
      if (gameMap.isWall(newX, newY)) {
        break;
      }
      
      if (gameMap.isDestructible(newX, newY)) {
        cells.push({ x: newX, y: newY, type: dir.type, hitBlock: true });
        break; 
      }
      
      cells.push({ x: newX, y: newY, type: dir.type, hitBlock: false });
    }
  }
  
  return cells;
}