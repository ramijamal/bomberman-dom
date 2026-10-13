import { GAME_CONFIG, TILE_TYPES, SPAWN_POSITIONS, POWERUP_TYPES } from '../game/constants.js';

const powerUpTypes = Object.values(POWERUP_TYPES);
const directions = [
  { dx: 0, dy: -1, type: 'vertical' },
  { dx: 0, dy: 1, type: 'vertical' },
  { dx: -1, dy: 0, type: 'horizontal' },
  { dx: 1, dy: 0, type: 'horizontal' },
];

export function generateMap(random = Math.random) {
  const { MAP_WIDTH: width, MAP_HEIGHT: height } = GAME_CONFIG;
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1 || (x % 2 === 0 && y % 2 === 0)) {
      return TILE_TYPES.WALL;
    }
    // Two clear steps from each corner guarantee a cell beyond the initial blast.
    if (SPAWN_POSITIONS.some(spawn =>
      (y === spawn.y && Math.abs(x - spawn.x) <= 2) ||
      (x === spawn.x && Math.abs(y - spawn.y) <= 2))) {
      return TILE_TYPES.EMPTY;
    }
    return random() < 0.4 ? TILE_TYPES.BLOCK : TILE_TYPES.EMPTY;
  }));
}

export class GameServer {
  constructor({ now = Date.now, random = Math.random, timers = globalThis } = {}) {
    this.now = now;
    this.random = random;
    this.timers = timers;
    this.players = new Map();
    this.bombs = new Map();
    this.explosions = new Map();
    this.powerUps = new Map();
    this.map = null;
    this.gameState = 'lobby';
    this.nextPlayerId = 0;
    this.nextBombId = 1;
    this.nextPowerUpId = 1;
    this.lobbyTimer = null;
    this.countdownTimer = null;
    this.gameLoopInterval = null;
    this.resetTimer = null;
    this.lobbyDeadline = 0;
    this.countdownDeadline = 0;
    this.countdownValue = 0;
    this.chatMessages = [];
  }

  reject(ws, message) {
    this.send(ws, { type: 'ERROR', message });
    return null;
  }

  addPlayer(ws, nickname) {
    if (this.players.has(ws)) return this.reject(ws, 'You have already joined');
    if (typeof nickname !== 'string' || !nickname.trim() || nickname.trim().length > 15 || /[\u0000-\u001f\u007f]/.test(nickname)) {
      return this.reject(ws, 'Enter a nickname of 1–15 characters');
    }
    if (this.players.size >= GAME_CONFIG.MAX_PLAYERS) return this.reject(ws, 'Game is full');
    if (this.gameState === 'playing' || this.gameState === 'gameOver') return this.reject(ws, 'Game already in progress');
    const occupied = new Set([...this.players.values()].map(player => player.slot));
    const slot = SPAWN_POSITIONS.findIndex((_, index) => !occupied.has(index));
    const player = { id: this.nextPlayerId++, slot, nickname: nickname.trim(), ws };
    this.resetPlayer(player);
    this.players.set(ws, player);
    this.send(ws, {
      type: 'PLAYER_JOINED', playerId: player.id, slot, player: this.sanitizePlayer(player),
      ...this.lobbySnapshot(), chatMessages: this.chatMessages,
    });
    this.broadcastExcept(ws, { type: 'PLAYER_JOINED', player: this.sanitizePlayer(player), ...this.lobbySnapshot() });
    this.checkLobbyState();
    return player;
  }

  resetPlayer(player) {
    Object.assign(player, SPAWN_POSITIONS[player.slot], {
      lives: GAME_CONFIG.PLAYER_LIVES,
      bombCount: GAME_CONFIG.DEFAULT_BOMB_COUNT,
      flameRange: GAME_CONFIG.DEFAULT_FLAME_RANGE,
      speed: 1, isAlive: true, isInvulnerable: false, invulnerableUntil: 0,
      activeBombs: 0, direction: null, lastMoveTime: null,
    });
  }

  removePlayer(ws) {
    const player = this.players.get(ws);
    if (!player) return;
    this.players.delete(ws);
    this.broadcast({ type: 'PLAYER_LEFT', playerId: player.id, players: this.getAllPlayersData() });
    if (this.players.size === 0) {
      this.resetGame();
      this.chatMessages = [];
    } else if (this.gameState === 'playing') {
      this.checkGameOver();
    } else if (this.gameState !== 'gameOver') {
      this.checkLobbyState();
    }
  }

  sanitizePlayer(player) {
    const { ws, lastMoveTime, ...data } = player;
    return data;
  }

  getAllPlayersData() {
    return [...this.players.values()].map(player => this.sanitizePlayer(player));
  }

  lobbySnapshot() {
    const countdown = this.gameState === 'countdown' ? Math.max(0, Math.ceil((this.countdownDeadline - this.now()) / 1000)) : 0;
    return {
      players: this.getAllPlayersData(), gameState: this.gameState,
      countdown, countdownValue: countdown,
      lobbyRemainingMs: this.lobbyDeadline ? Math.max(0, this.lobbyDeadline - this.now()) : 0,
    };
  }

  checkLobbyState() {
    if (this.gameState === 'playing' || this.gameState === 'gameOver') return;
    if (this.players.size < GAME_CONFIG.MIN_PLAYERS) {
      this.clearLobbyTimer();
      this.clearCountdown();
      this.gameState = 'lobby';
    } else if (this.players.size === GAME_CONFIG.MAX_PLAYERS) {
      this.startCountdown();
    } else if (this.gameState === 'lobby' && this.lobbyTimer === null) {
      this.lobbyDeadline = this.now() + GAME_CONFIG.LOBBY_WAIT_TIME;
      this.lobbyTimer = this.timers.setTimeout(() => {
        this.lobbyTimer = null;
        this.lobbyDeadline = 0;
        if (this.gameState === 'lobby' && this.players.size >= GAME_CONFIG.MIN_PLAYERS) this.startCountdown();
      }, GAME_CONFIG.LOBBY_WAIT_TIME);
      this.broadcast({ type: 'LOBBY_TIMER_START', duration: GAME_CONFIG.LOBBY_WAIT_TIME });
    }
    this.broadcast({ type: 'LOBBY_UPDATE', ...this.lobbySnapshot() });
  }

  clearLobbyTimer() {
    if (this.lobbyTimer !== null) this.timers.clearTimeout(this.lobbyTimer);
    this.lobbyTimer = null;
    this.lobbyDeadline = 0;
  }

  clearCountdown() {
    if (this.countdownTimer !== null) this.timers.clearInterval(this.countdownTimer);
    this.countdownTimer = null;
    this.countdownDeadline = 0;
    this.countdownValue = 0;
  }

  startCountdown() {
    if (this.gameState !== 'lobby' || this.players.size < GAME_CONFIG.MIN_PLAYERS) return;
    this.clearLobbyTimer();
    this.gameState = 'countdown';
    this.countdownDeadline = this.now() + GAME_CONFIG.GAME_START_COUNTDOWN;
    this.countdownValue = Math.ceil(GAME_CONFIG.GAME_START_COUNTDOWN / 1000);
    this.broadcast({ type: 'COUNTDOWN_START', seconds: this.countdownValue });
    this.countdownTimer = this.timers.setInterval(() => {
      this.countdownValue = Math.max(0, Math.ceil((this.countdownDeadline - this.now()) / 1000));
      if (this.countdownValue === 0) this.startGame();
      else this.broadcast({ type: 'COUNTDOWN_TICK', seconds: this.countdownValue });
    }, 1000);
  }

  startGame() {
    if (this.gameState === 'playing' || this.gameState === 'gameOver' || this.players.size < GAME_CONFIG.MIN_PLAYERS) return;
    this.clearLobbyTimer();
    this.clearCountdown();
    this.gameState = 'playing';
    this.map = generateMap(this.random);
    for (const player of this.players.values()) this.resetPlayer(player);
    this.broadcast({ type: 'GAME_START', map: this.map, players: this.getAllPlayersData() });
    this.gameLoopInterval = this.timers.setInterval(() => this.gameLoop(), GAME_CONFIG.SERVER_TICK_MS);
  }

  gameLoop() {
    if (this.gameState !== 'playing') return;
    const now = this.now();
    for (const player of this.players.values()) {
      if (player.isInvulnerable && now >= player.invulnerableUntil) player.isInvulnerable = false;
    }
    for (const [id, explosion] of this.explosions) {
      if (now >= explosion.expireAt) {
        this.explosions.delete(id);
        this.broadcast({ type: 'EXPLOSION_END', explosionId: id });
      }
    }
    const due = [...this.bombs.values()].filter(bomb => now >= bomb.explodeAt);
    this.resolveBombs(due);
    for (const player of this.players.values()) this.checkExplosionHit(player);
    // All damage in a tick is resolved before selecting a winner.
    this.checkGameOver();
  }

  handlePlayerMove(ws, direction) {
    const player = this.players.get(ws);
    if (!player || !player.isAlive || this.gameState !== 'playing') return;
    const vector = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction];
    if (!Array.isArray(vector)) return;
    const now = this.now();
    const delay = Math.max(GAME_CONFIG.MIN_MOVE_DELAY, GAME_CONFIG.MOVE_DELAY / player.speed);
    if (player.lastMoveTime !== null && now - player.lastMoveTime < delay) return;
    player.lastMoveTime = now;
    const x = player.x + vector[0], y = player.y + vector[1];
    if (!this.isWalkable(x, y) || this.hasBombAt(x, y)) return;
    player.x = x;
    player.y = y;
    player.direction = direction;
    this.checkPowerUpCollection(player);
    this.checkExplosionHit(player);
    this.broadcast({ type: 'PLAYER_MOVE', playerId: player.id, x, y, direction });
    this.checkGameOver();
  }

  handlePlaceBomb(ws) {
    const player = this.players.get(ws);
    if (!player || !player.isAlive || this.gameState !== 'playing' || player.activeBombs >= player.bombCount || this.hasBombAt(player.x, player.y)) return;
    const bomb = {
      id: this.nextBombId++, x: player.x, y: player.y, playerId: player.id,
      flameRange: player.flameRange, placedAt: this.now(), explodeAt: this.now() + GAME_CONFIG.BOMB_TIMER,
    };
    this.bombs.set(bomb.id, bomb);
    player.activeBombs++;
    this.broadcast({ type: 'BOMB_PLACED', bomb: { id: bomb.id, x: bomb.x, y: bomb.y, playerId: bomb.playerId } });
    // A bomb placed inside an existing flame detonates immediately.
    if ([...this.explosions.values()].some(explosion => explosion.expireAt > this.now() && explosion.cells.some(cell => cell.x === bomb.x && cell.y === bomb.y))) {
      this.explodeBomb(bomb.id, bomb);
    }
  }

  explodeBomb(id, bomb = this.bombs.get(id)) {
    if (this.gameState !== 'playing' || !bomb || this.bombs.get(id) !== bomb) return;
    this.resolveBombs([bomb]);
    this.checkGameOver();
  }

  resolveBombs(initialBombs) {
    const queue = [...initialBombs];
    const queued = new Set(queue.map(bomb => bomb.id));
    for (let index = 0; index < queue.length; index++) {
      const bomb = queue[index];
      if (this.bombs.get(bomb.id) !== bomb) continue;
      this.bombs.delete(bomb.id);
      for (const player of this.players.values()) {
        if (player.id === bomb.playerId) player.activeBombs = Math.max(0, player.activeBombs - 1);
      }
      const cells = this.calculateExplosionCells(bomb.x, bomb.y, bomb.flameRange);
      const now = this.now();
      this.explosions.set(bomb.id, { id: bomb.id, cells, createdAt: now, expireAt: now + GAME_CONFIG.EXPLOSION_DURATION });
      const destroyedBlocks = [], powerUps = [];
      for (const cell of cells) {
        if (cell.hitBlock) {
          this.map[cell.y][cell.x] = TILE_TYPES.EMPTY;
          destroyedBlocks.push({ x: cell.x, y: cell.y });
          if (this.random() < GAME_CONFIG.POWERUP_SPAWN_CHANCE) {
            const type = powerUpTypes[Math.min(powerUpTypes.length - 1, Math.floor(this.random() * powerUpTypes.length))];
            const powerUp = { id: this.nextPowerUpId++, x: cell.x, y: cell.y, type };
            this.powerUps.set(powerUp.id, powerUp);
            powerUps.push(powerUp);
          }
        }
        for (const other of this.bombs.values()) {
          if (other.x === cell.x && other.y === cell.y && !queued.has(other.id)) {
            queue.push(other);
            queued.add(other.id);
          }
        }
      }
      this.broadcast({ type: 'BOMB_EXPLODE', bombId: bomb.id, cells, destroyedBlocks, powerUps });
      for (const player of this.players.values()) {
        if (cells.some(cell => cell.x === player.x && cell.y === player.y)) this.hitPlayer(player);
      }
    }
  }

  calculateExplosionCells(x, y, range) {
    const cells = [{ x, y, type: 'center', hitBlock: false }];
    for (const direction of directions) {
      for (let distance = 1; distance <= range; distance++) {
        const nx = x + direction.dx * distance, ny = y + direction.dy * distance;
        const tile = this.map?.[ny]?.[nx];
        if (tile === undefined || tile === TILE_TYPES.WALL) break;
        const hitBlock = tile === TILE_TYPES.BLOCK;
        cells.push({ x: nx, y: ny, type: direction.type, hitBlock });
        if (hitBlock) break;
      }
    }
    return cells;
  }

  hitPlayer(player) {
    if (!player.isAlive) return;
    if (player.isInvulnerable && this.now() < player.invulnerableUntil) return;
    player.lives = Math.max(0, player.lives - 1);
    if (player.lives === 0) {
      player.isAlive = false;
      player.isInvulnerable = false;
      this.broadcast({ type: 'PLAYER_DIED', playerId: player.id, nickname: player.nickname });
    } else {
      player.isInvulnerable = true;
      player.invulnerableUntil = this.now() + GAME_CONFIG.INVULNERABILITY_MS;
      this.broadcast({ type: 'PLAYER_HIT', playerId: player.id, lives: player.lives });
    }
  }

  checkExplosionHit(player) {
    if (!player.isAlive) return;
    for (const explosion of this.explosions.values()) {
      if (explosion.expireAt > this.now() && explosion.cells.some(cell => cell.x === player.x && cell.y === player.y)) {
        this.hitPlayer(player);
        return;
      }
    }
  }

  checkPowerUpCollection(player) {
    for (const [id, powerUp] of this.powerUps) {
      if (powerUp.x !== player.x || powerUp.y !== player.y) continue;
      if (powerUp.type === POWERUP_TYPES.BOMB) player.bombCount++;
      if (powerUp.type === POWERUP_TYPES.FLAME) player.flameRange++;
      if (powerUp.type === POWERUP_TYPES.SPEED) player.speed++;
      this.powerUps.delete(id);
      this.broadcast({
        type: 'POWERUP_COLLECTED', powerUpId: id, playerId: player.id, powerUpType: powerUp.type,
        playerStats: { bombCount: player.bombCount, flameRange: player.flameRange, speed: player.speed },
      });
    }
  }

  checkGameOver() {
    if (this.gameState !== 'playing') return;
    const alive = [...this.players.values()].filter(player => player.isAlive);
    if (alive.length > 1) return;
    this.gameState = 'gameOver';
    if (this.gameLoopInterval !== null) this.timers.clearInterval(this.gameLoopInterval);
    this.gameLoopInterval = null;
    this.broadcast({ type: 'GAME_OVER', winner: alive.length ? this.sanitizePlayer(alive[0]) : null });
    this.resetTimer = this.timers.setTimeout(() => {
      this.resetTimer = null;
      this.resetGame();
    }, GAME_CONFIG.ROUND_RESET_MS);
  }

  handleChat(ws, message) {
    const player = this.players.get(ws);
    if (!player) return this.reject(ws, 'Join before chatting');
    if (typeof message !== 'string' || !message.trim()) return this.reject(ws, 'Enter a chat message');
    const chat = { playerId: player.id, slot: player.slot, nickname: player.nickname, message: message.trim().slice(0, 200), timestamp: this.now() };
    this.chatMessages.push(chat);
    if (this.chatMessages.length > 50) this.chatMessages.shift();
    this.broadcast({ type: 'CHAT_MESSAGE', ...chat });
  }

  isWalkable(x, y) {
    return this.map?.[y]?.[x] === TILE_TYPES.EMPTY;
  }

  hasBombAt(x, y) {
    return [...this.bombs.values()].some(bomb => bomb.x === x && bomb.y === y);
  }

  resetGame() {
    this.dispose();
    this.bombs.clear();
    this.explosions.clear();
    this.powerUps.clear();
    this.map = null;
    this.gameState = 'lobby';
    for (const player of this.players.values()) this.resetPlayer(player);
    this.broadcast({ type: 'GAME_RESET', ...this.lobbySnapshot() });
    this.checkLobbyState();
  }

  dispose() {
    this.clearLobbyTimer();
    this.clearCountdown();
    if (this.gameLoopInterval !== null) this.timers.clearInterval(this.gameLoopInterval);
    if (this.resetTimer !== null) this.timers.clearTimeout(this.resetTimer);
    this.gameLoopInterval = null;
    this.resetTimer = null;
  }

  send(ws, data) {
    if (ws.readyState === 1) ws.send(JSON.stringify(data));
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    for (const ws of this.players.keys()) if (ws.readyState === 1) ws.send(message);
  }

  broadcastExcept(excluded, data) {
    const message = JSON.stringify(data);
    for (const ws of this.players.keys()) if (ws !== excluded && ws.readyState === 1) ws.send(message);
  }
}
