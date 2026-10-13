import { GAME_CONFIG } from './constants.js';
import { getAudioManager } from './AudioManager.js';

export const POWERUP_TYPES = {
  BOMB: 'bomb',
  FLAME: 'flame',
  SPEED: 'speed'
};

export class PowerUp {
  constructor(id, x, y, type) {
    this.id = id;
    this.x = x;  // Grid position
    this.y = y;
    this.type = type;
    this.collected = false;
    
    this.element = null;
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
    el.id = `powerup-${this.id}`;
    el.className = `powerup powerup-${this.type}`;
    el.setAttribute('data-powerup-id', this.id);
    el.setAttribute('data-powerup-type', this.type);
    
    el.style.width = `${TILE_SIZE}px`;
    el.style.height = `${TILE_SIZE}px`;
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    
    this.element = el;
    return el;
  }

  collect() {
    this.collected = true;
  }

  removeElement() {
    if (this.element && this.element.parentNode) {
      this.element.remove();
      this.element = null;
    }
  }

  applyTo(player) {
    switch (this.type) {
      case POWERUP_TYPES.BOMB:
        player.bombCount++;
        console.log(`🔥 Player ${player.id + 1} bomb count: ${player.bombCount}`);
        break;
      case POWERUP_TYPES.FLAME:
        player.flameRange++;
        console.log(`🔥 Player ${player.id + 1} flame range: ${player.flameRange}`);
        break;
      case POWERUP_TYPES.SPEED:
        player.speed++;
        console.log(`🔥 Player ${player.id + 1} speed: ${player.speed}`);
        break;
    }
    
    getAudioManager().playPowerUp();
    
    this.collect();
  }
}

export function getRandomPowerUpType() {
  const types = [POWERUP_TYPES.BOMB, POWERUP_TYPES.FLAME, POWERUP_TYPES.SPEED];
  return types[Math.floor(Math.random() * types.length)];
}

export function shouldSpawnPowerUp() {
  return Math.random() < GAME_CONFIG.POWERUP_SPAWN_CHANCE;
}