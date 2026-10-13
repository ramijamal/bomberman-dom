import { GAME_CONFIG } from './constants.js';
import { Bomb } from './Bomb.js';
import { Explosion, calculateExplosionCells } from './Explosion.js';
import { PowerUp, getRandomPowerUpType, shouldSpawnPowerUp } from './PowerUp.js';
import { getAudioManager } from './AudioManager.js';

export class BombManager {
  constructor(gameMap) {
    this.gameMap = gameMap;
    
    this.bombs = new Map();      // id -> Bomb
    this.explosions = new Map(); // id -> Explosion
    this.powerUps = new Map();   // id -> PowerUp
    
    this.nextBombId = 1;
    this.nextExplosionId = 1;
    this.nextPowerUpId = 1;
    
    this.bombsLayer = null;
    this.explosionsLayer = null;
    this.powerUpsLayer = null;
    
    this.onBlockDestroyed = null;
    this.onPlayerHit = null;
    this.onBombExploded = null;
  }

  init() {
    this.bombsLayer = document.getElementById('bombs-layer');
    this.explosionsLayer = document.getElementById('explosions-layer');
    
    this.powerUpsLayer = document.getElementById('powerups-layer');
    if (!this.powerUpsLayer) {
      const gameBoard = document.getElementById('game-board');
      if (gameBoard) {
        this.powerUpsLayer = document.createElement('div');
        this.powerUpsLayer.id = 'powerups-layer';
        this.powerUpsLayer.className = 'powerups-layer';
        gameBoard.appendChild(this.powerUpsLayer);
      }
    }
    
    console.log('💣 BombManager initialized');
  }

  placeBomb(x, y, playerId, flameRange) {
    if (this.hasBombAt(x, y)) {
      return null;
    }
    
    const id = this.nextBombId++;
    const bomb = new Bomb(id, x, y, playerId, flameRange);
    
    this.bombs.set(id, bomb);
    
    if (this.bombsLayer) {
      const el = bomb.createElement();
      this.bombsLayer.appendChild(el);
    }
    
    getAudioManager().playBombPlace();
    
    console.log(`💣 Bomb ${id} placed at (${x}, ${y}) by player ${playerId}`);
    return bomb;
  }

  hasBombAt(x, y) {
    for (const bomb of this.bombs.values()) {
      if (bomb.x === x && bomb.y === y && !bomb.exploded) {
        return true;
      }
    }
    return false;
  }

  getBombAt(x, y) {
    for (const bomb of this.bombs.values()) {
      if (bomb.x === x && bomb.y === y && !bomb.exploded) {
        return bomb;
      }
    }
    return null;
  }

  explodeBomb(bomb) {
    if (bomb.exploded) return;
    
    bomb.markExploded();
    bomb.removeElement();
    
    const cells = calculateExplosionCells(
      bomb.x, 
      bomb.y, 
      bomb.flameRange, 
      this.gameMap
    );
    
    const explosionId = this.nextExplosionId++;
    const explosion = new Explosion(explosionId, cells);
    this.explosions.set(explosionId, explosion);
    
    if (this.explosionsLayer) {
      const fragment = explosion.createElements();
      this.explosionsLayer.appendChild(fragment);
    }
    
    const destroyedBlocks = [];
    for (const cell of cells) {
      if (cell.hitBlock) {
        this.gameMap.destroyBlock(cell.x, cell.y);
        destroyedBlocks.push({ x: cell.x, y: cell.y });
        
        if (shouldSpawnPowerUp()) {
          this.spawnPowerUp(cell.x, cell.y);
        }
        
        if (this.onBlockDestroyed) {
          this.onBlockDestroyed(cell.x, cell.y);
        }
      }
      
      const bombAtCell = this.getBombAt(cell.x, cell.y);
      if (bombAtCell && bombAtCell.id !== bomb.id) {
        setTimeout(() => this.explodeBomb(bombAtCell), 50);
      }
    }
    
    if (this.onBombExploded) {
      this.onBombExploded(bomb, explosion);
    }
    
    this.bombs.delete(bomb.id);
    
    getAudioManager().playExplosion();
    
    console.log(`💥 Bomb ${bomb.id} exploded! Cells: ${cells.length}, Blocks destroyed: ${destroyedBlocks.length}`);
    
    return explosion;
  }

  spawnPowerUp(x, y) {
    const id = this.nextPowerUpId++;
    const type = getRandomPowerUpType();
    const powerUp = new PowerUp(id, x, y, type);
    
    this.powerUps.set(id, powerUp);
    
    if (this.powerUpsLayer) {
      const el = powerUp.createElement();
      this.powerUpsLayer.appendChild(el);
    }
    
    console.log(`⭐ PowerUp ${type} spawned at (${x}, ${y})`);
    return powerUp;
  }

  checkPowerUpCollection(player) {
    const collected = [];
    
    for (const powerUp of this.powerUps.values()) {
      if (!powerUp.collected && powerUp.x === player.x && powerUp.y === player.y) {
        powerUp.applyTo(player);
        powerUp.removeElement();
        collected.push(powerUp);
        this.powerUps.delete(powerUp.id);
      }
    }
    
    return collected;
  }

  checkExplosionHit(player) {
    for (const explosion of this.explosions.values()) {
      if (!explosion.finished && explosion.containsPosition(player.x, player.y)) {
        return explosion;
      }
    }
    return null;
  }

  update(deltaTime) {
    for (const bomb of this.bombs.values()) {
      bomb.updateElement();
      
      if (bomb.shouldExplode()) {
        this.explodeBomb(bomb);
      }
    }
    
    for (const [id, explosion] of this.explosions.entries()) {
      if (explosion.isFinished()) {
        explosion.removeElements();
        explosion.markFinished();
        this.explosions.delete(id);
      }
    }
  }

  getPlayerActiveBombs(playerId) {
    let count = 0;
    for (const bomb of this.bombs.values()) {
      if (bomb.playerId === playerId && !bomb.exploded) {
        count++;
      }
    }
    return count;
  }

  canPlayerPlaceBomb(player) {
    const activeBombs = this.getPlayerActiveBombs(player.id);
    return activeBombs < player.bombCount && !this.hasBombAt(player.x, player.y);
  }

  reset() {
    for (const bomb of this.bombs.values()) {
      bomb.removeElement();
    }
    this.bombs.clear();
    
    for (const explosion of this.explosions.values()) {
      explosion.removeElements();
    }
    this.explosions.clear();
    
    for (const powerUp of this.powerUps.values()) {
      powerUp.removeElement();
    }
    this.powerUps.clear();
    
    this.nextBombId = 1;
    this.nextExplosionId = 1;
    this.nextPowerUpId = 1;
  }

  setGameMap(gameMap) {
    this.gameMap = gameMap;
    this.reset();
  }
}