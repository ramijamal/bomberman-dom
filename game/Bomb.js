import { GAME_CONFIG } from './constants.js';

export class Bomb {
  constructor(id, x, y, playerId, flameRange) {
    this.id = id;
    this.x = x;  // Grid position
    this.y = y;
    this.playerId = playerId;
    this.flameRange = flameRange;
    
    this.placedAt = Date.now();
    this.fuseTime = GAME_CONFIG.BOMB_TIMER; 
    this.exploded = false;
    
    this.element = null;
  }

  // Time remaining is in milliseconds.
  getTimeRemaining() {
    const elapsed = Date.now() - this.placedAt;
    return Math.max(0, this.fuseTime - elapsed);
  }

  shouldExplode() {
    return !this.exploded && this.getTimeRemaining() <= 0;
  }

  // The final 500ms is the warning window.
  isAboutToExplode() {
    return this.getTimeRemaining() < 500;
  }

  markExploded() {
    this.exploded = true;
  }

  getPixelPosition() {
    const { TILE_SIZE } = GAME_CONFIG;
    return {
      x: this.x * TILE_SIZE,
      y: this.y * TILE_SIZE
    };
  }

  createElement() {
    const { TILE_SIZE } = GAME_CONFIG;
    const pos = this.getPixelPosition();
    
    const el = document.createElement('div');
    el.id = `bomb-${this.id}`;
    el.className = 'bomb';
    el.setAttribute('data-bomb-id', this.id);
    
    el.style.width = `${TILE_SIZE}px`;
    el.style.height = `${TILE_SIZE}px`;
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    
    this.element = el;
    return el;
  }

  updateElement() {
    if (!this.element) return;
    
    // Add "about to explode" class for faster pulsing
    if (this.isAboutToExplode() && !this.element.classList.contains('about-to-explode')) {
      this.element.classList.add('about-to-explode');
    }
  }

  removeElement() {
    if (this.element && this.element.parentNode) {
      this.element.remove();
      this.element = null;
    }
  }
}