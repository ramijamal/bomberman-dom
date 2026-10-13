import { GAME_CONFIG, PLAYER_COLORS } from './constants.js';

export class Player {
  constructor(id, gameMap) {
    this.id = id;
    this.gameMap = gameMap;
    
    const spawn = this.getSpawnGridPosition(id);
    
    // Position in GRID coordinates (not pixels)
    this.x = spawn.x;
    this.y = spawn.y;
    
    this.lives = GAME_CONFIG.PLAYER_LIVES;
    this.bombCount = GAME_CONFIG.DEFAULT_BOMB_COUNT;
    this.flameRange = GAME_CONFIG.DEFAULT_FLAME_RANGE;
    this.speed = 1;
    this.activeBombs = 0;
    
    this.isAlive = true;
    this.isInvulnerable = false;
    this.invulnerableTimer = 0;
    this.direction = null; 
    
    this.color = PLAYER_COLORS[id] || PLAYER_COLORS[0];
    this.nickname = `Player ${id + 1}`;
    
    this.element = null;
  }

  getSpawnGridPosition(playerIndex) {
    const { MAP_WIDTH, MAP_HEIGHT } = GAME_CONFIG;
    const spawnPoints = [
      { x: 1, y: 1 },                           
      { x: MAP_WIDTH - 2, y: MAP_HEIGHT - 2 },  
      { x: MAP_WIDTH - 2, y: 1 },               
      { x: 1, y: MAP_HEIGHT - 2 }               
    ];
    return spawnPoints[playerIndex] || spawnPoints[0];
  }

  move(direction) {
    if (!this.isAlive) return false;

    let newX = this.x;
    let newY = this.y;

    switch (direction) {
      case 'up':
        newY -= 1;
        break;
      case 'down':
        newY += 1;
        break;
      case 'left':
        newX -= 1;
        break;
      case 'right':
        newX += 1;
        break;
      default:
        return false;
    }

    if (!this.gameMap.isWalkable(newX, newY)) {
      return false;
    }

    this.x = newX;
    this.y = newY;
    this.direction = direction;

    return true;
  }

  // deltaTime is in milliseconds.
  update(deltaTime) {
    if (!this.isAlive) return;

    if (this.isInvulnerable) {
      this.invulnerableTimer -= deltaTime;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
      }
    }
  }

  getGridPosition() {
    return { x: this.x, y: this.y };
  }

  getPixelPosition() {
    const { TILE_SIZE } = GAME_CONFIG;
    return {
      x: this.x * TILE_SIZE,
      y: this.y * TILE_SIZE
    };
  }

  canPlaceBomb() {
    return this.isAlive && this.activeBombs < this.bombCount;
  }

  placeBomb() {
    if (!this.canPlaceBomb()) return null;
    
    this.activeBombs++;
    
    return {
      gridX: this.x,
      gridY: this.y,
      playerId: this.id,
      flameRange: this.flameRange
    };
  }

  onBombExploded() {
    this.activeBombs = Math.max(0, this.activeBombs - 1);
  }

  takeDamage() {
    if (this.isInvulnerable || !this.isAlive) return false;

    this.lives--;
    console.log(`Player ${this.id + 1} hit! Lives: ${this.lives}`);

    if (this.lives <= 0) {
      this.die();
    } else {
      // Brief invulnerability after being hit
      this.isInvulnerable = true;
      this.invulnerableTimer = 2000; // 2 seconds
    }

    return true;
  }

  die() {
    this.isAlive = false;
    console.log(`Player ${this.id + 1} eliminated!`);
  }

  applyPowerUp(type) {
    switch (type) {
      case 'bomb':
        this.bombCount++;
        break;
      case 'flame':
        this.flameRange++;
        break;
      case 'speed':
        this.speed++;
        break;
    }
  }

  getRenderData() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      lives: this.lives,
      bombCount: this.bombCount,
      flameRange: this.flameRange,
      speed: this.speed,
      isAlive: this.isAlive,
      isInvulnerable: this.isInvulnerable,
      direction: this.direction,
      color: this.color,
      nickname: this.nickname
    };
  }
}