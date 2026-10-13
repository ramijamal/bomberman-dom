export const GAME_CONFIG = {
  MAP_WIDTH: 15,      // tiles
  MAP_HEIGHT: 13,     // tiles
  TILE_SIZE: 48,      // pixels
  
  TARGET_FPS: 60,
  FRAME_TIME: 1000 / 60, // ~16.67ms
  
  MAX_PLAYERS: 4,
  MIN_PLAYERS: 2,
  PLAYER_LIVES: 3,
  PLAYER_SPEED: 3,        // pixels per frame (legacy local engine)
  MOVE_DELAY: 120,        // authoritative grid movement interval, ms
  MIN_MOVE_DELAY: 40,
  INVULNERABILITY_MS: 2000,
  SERVER_TICK_MS: 50,
  ROUND_RESET_MS: 5000,
  PLAYER_SIZE: 40,        // pixels (slightly smaller than tile)
  
  BOMB_TIMER: 3000,       // ms before explosion
  DEFAULT_BOMB_COUNT: 1,
  DEFAULT_FLAME_RANGE: 1,
  EXPLOSION_DURATION: 500, // ms
  
  // Power-up spawn chance (0-1)
  POWERUP_SPAWN_CHANCE: 0.3,
  
  LOBBY_WAIT_TIME: 20000,  // 20 seconds
  GAME_START_COUNTDOWN: 10000, // 10 seconds
};

export const TILE_TYPES = {
  EMPTY: 0,
  WALL: 1,      // Indestructible
  BLOCK: 2,     // Destructible
  SPAWN: 3,     // Player spawn point (always empty)
};

export const POWERUP_TYPES = {
  BOMB: 'bomb',      // +1 bomb capacity
  FLAME: 'flame',    // +1 explosion range
  SPEED: 'speed',    // +movement speed
};

export const PLAYER_COLORS = [
  '#FF4444', 
  '#4444FF', 
  '#44FF44', 
  '#FFFF44', 
];

// Player starting positions (corners)
export const SPAWN_POSITIONS = [
  { x: 1, y: 1 },           
  { x: 13, y: 1 },          
  { x: 1, y: 11 },          
  { x: 13, y: 11 },         
];

export const KEY_BINDINGS = {
  UP: ['ArrowUp', 'KeyW'],
  DOWN: ['ArrowDown', 'KeyS'],
  LEFT: ['ArrowLeft', 'KeyA'],
  RIGHT: ['ArrowRight', 'KeyD'],
  BOMB: ['Space'],
};

export const GAME_STATES = {
  LOBBY: 'lobby',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  GAME_OVER: 'gameOver',
};

export const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};
