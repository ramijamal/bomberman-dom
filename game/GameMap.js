import { GAME_CONFIG, TILE_TYPES, SPAWN_POSITIONS } from './constants.js';

export class GameMap {
  constructor() {
    this.width = GAME_CONFIG.MAP_WIDTH;
    this.height = GAME_CONFIG.MAP_HEIGHT;
    this.tileSize = GAME_CONFIG.TILE_SIZE;
    
    this.tiles = [];
    
    this.powerups = new Map(); // key: "x,y", value: powerup type
    this.bombs = new Map();    // key: "x,y", value: bomb data
    
    this.generate();
  }

  generate() {
    this.tiles = [];
    
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        row.push(this.determineTileType(x, y));
      }
      this.tiles.push(row);
    }
    
    console.log('🗺️ Map generated:', this.width, 'x', this.height);
  }

  determineTileType(x, y) {
    if (x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1) {
      return TILE_TYPES.WALL;
    }
    
    // Internal walls - classic Bomberman pattern (every even row AND column)
    if (x % 2 === 0 && y % 2 === 0) {
      return TILE_TYPES.WALL;
    }
    
    // Safe spawn zones - these areas must be empty for players to start and escape
    if (this.isInSpawnZone(x, y)) {
      return TILE_TYPES.EMPTY;
    }
    
    if (Math.random() < 0.4) {
      return TILE_TYPES.BLOCK;
    }
    
    return TILE_TYPES.EMPTY;
  }

  isInSpawnZone(x, y) {
    if (x >= 1 && x <= 2 && y >= 1 && y <= 2) return true;
    
    if (x >= this.width - 3 && x <= this.width - 2 && y >= 1 && y <= 2) return true;
    
    if (x >= 1 && x <= 2 && y >= this.height - 3 && y <= this.height - 2) return true;
    
    if (x >= this.width - 3 && x <= this.width - 2 && y >= this.height - 3 && y <= this.height - 2) return true;
    
    return false;
  }

  getTile(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return TILE_TYPES.WALL; // Out of bounds = wall
    }
    return this.tiles[y][x];
  }

  setTile(x, y, type) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.tiles[y][x] = type;
    }
  }

  isWalkable(x, y) {
    const tile = this.getTile(x, y);
    return tile === TILE_TYPES.EMPTY;
  }

  isWall(x, y) {
    return this.getTile(x, y) === TILE_TYPES.WALL;
  }

  isDestructible(x, y) {
    return this.getTile(x, y) === TILE_TYPES.BLOCK;
  }

  destroyBlock(x, y) {
    if (this.isDestructible(x, y)) {
      this.setTile(x, y, TILE_TYPES.EMPTY);
      return true;
    }
    return false;
  }

  pixelToGrid(pixelX, pixelY) {
    return {
      x: Math.floor(pixelX / this.tileSize),
      y: Math.floor(pixelY / this.tileSize)
    };
  }

  // Pixel coordinates refer to the top-left of the tile.
  gridToPixel(gridX, gridY) {
    return {
      x: gridX * this.tileSize,
      y: gridY * this.tileSize
    };
  }

  gridToCenterPixel(gridX, gridY) {
    return {
      x: gridX * this.tileSize + this.tileSize / 2,
      y: gridY * this.tileSize + this.tileSize / 2
    };
  }

  checkCollision(x, y, width, height) {
    const corners = [
      { x: x, y: y },                           
      { x: x + width - 1, y: y },               
      { x: x, y: y + height - 1 },              
      { x: x + width - 1, y: y + height - 1 }   
    ];

    for (const corner of corners) {
      const gridPos = this.pixelToGrid(corner.x, corner.y);
      if (!this.isWalkable(gridPos.x, gridPos.y)) {
        return {
          collided: true,
          gridX: gridPos.x,
          gridY: gridPos.y,
          tileType: this.getTile(gridPos.x, gridPos.y)
        };
      }
    }

    return { collided: false };
  }

  // Spawn positions are in pixels, centered within the tile.
  getSpawnPosition(playerIndex) {
    const spawnPoints = [
      { gridX: 1, gridY: 1 },                           
      { gridX: this.width - 2, gridY: 1 },              
      { gridX: 1, gridY: this.height - 2 },             
      { gridX: this.width - 2, gridY: this.height - 2 } 
    ];

    const spawn = spawnPoints[playerIndex] || spawnPoints[0];
    return this.gridToCenterPixel(spawn.gridX, spawn.gridY);
  }

  getAllTiles() {
    const tiles = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        tiles.push({
          x,
          y,
          type: this.tiles[y][x],
          pixelX: x * this.tileSize,
          pixelY: y * this.tileSize
        });
      }
    }
    return tiles;
  }

  debugPrint() {
    const symbols = {
      [TILE_TYPES.EMPTY]: '.',
      [TILE_TYPES.WALL]: '#',
      [TILE_TYPES.BLOCK]: 'B'
    };
    
    console.log('Map:');
    for (let y = 0; y < this.height; y++) {
      let row = '';
      for (let x = 0; x < this.width; x++) {
        row += symbols[this.tiles[y][x]] || '?';
      }
      console.log(row);
    }
  }
}