import { MiniFramework, Component } from './framework/src/MiniFramework.js';
import { NetworkManager } from './game/NetworkManager.js';
import { InputManager } from './game/InputManager.js';
import { getAudioManager } from './game/AudioManager.js';
import { GAME_CONFIG, TILE_TYPES } from './game/constants.js';

// Player movement uses imperative DOM updates to bypass Virtual DOM work in the hot path.

function createPlayerElement(playerData) {
  const { TILE_SIZE, PLAYER_SIZE } = GAME_CONFIG;
  const el = document.createElement('div');
  el.id = `player-${playerData.id}`;
  el.className = `player player-${playerData.slot + 1}`;
  el.setAttribute('data-player-id', playerData.id);

  el.style.width = `${PLAYER_SIZE}px`;
  el.style.height = `${PLAYER_SIZE}px`;
  el.style.left = '0px';
  el.style.top = '0px';

  const pixelX = playerData.x * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;
  const pixelY = playerData.y * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;
  
  el.style.transform = `translate3d(${pixelX}px, ${pixelY}px, 0)`;

  const label = document.createElement('div');
  label.className = 'player-label';
  label.textContent = playerData.nickname || `P${playerData.slot + 1}`;
  el.appendChild(label);

  return el;
}

function updatePlayerPosition(playerElements, playerId, x, y) {
  const { TILE_SIZE, PLAYER_SIZE } = GAME_CONFIG;
  const el = playerElements.get(playerId);
  if (!el) return;
  const pixelX = x * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;
  const pixelY = y * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;
  
  el.style.transform = `translate3d(${pixelX}px, ${pixelY}px, 0)`;
}

class LobbyScreen extends Component {
  render() {
    const { framework, players, gameState, countdown, onJoin, nickname, onNicknameChange, joined, joining, error, connected, lobbyRemainingMs } = this.props;

    if (!joined) {
      return framework.createElement('div', { class: 'lobby-screen' },
        framework.createElement('div', { class: 'lobby-card' },
          framework.createElement('h1', { class: 'lobby-title' }, '💣 Bomberman'),
          framework.createElement('p', { class: 'lobby-subtitle' }, 'Multiplayer Arena'),
          framework.createElement('div', { class: 'nickname-form' },
            framework.createElement('input', {
              type: 'text',
              class: 'nickname-input',
              id: 'nickname-input',
              placeholder: 'Enter your nickname...',
              maxLength: 15,
              value: nickname || '',
              onInput: (e) => {
                onNicknameChange(e.target.value);
                const btn = document.getElementById('join-btn');
                if (btn) btn.disabled = joining || !connected || !e.target.value.trim();
              },
              onKeyDown: (e) => {
                if (e.key === 'Enter' && e.target.value.trim()) onJoin();
              }
            }),
            framework.createElement('button', {
              class: 'btn-join',
              id: 'join-btn',
              onClick: () => onJoin(),
              disabled: joining || !connected || !nickname.trim()
            }, joining ? 'Joining...' : connected ? '🎮 Join Game' : 'Connecting...'),
            error ? framework.createElement('p', { class: 'join-error', role: 'alert' }, error) : null
          )
        )
      );
    }

    const playerSlots = [];
    for (let i = 0; i < GAME_CONFIG.MAX_PLAYERS; i++) {
      const p = players.find(player => player.slot === i);
      playerSlots.push(
        framework.createElement('div', {
          class: `player-slot ${p ? 'filled' : 'empty'} ${p ? `slot-player-${i + 1}` : ''}`
        },
          p
            ? framework.createElement('span', {}, `🎮 ${p.nickname}`)
            : framework.createElement('span', { class: 'waiting-text' }, 'Waiting...')
        )
      );
    }

    return framework.createElement('div', { class: 'lobby-screen' },
      framework.createElement('div', { class: 'lobby-card waiting-card' },
        framework.createElement('h1', { class: 'lobby-title' }, '💣 Bomberman'),
        framework.createElement('div', { class: 'player-counter' },
          framework.createElement('span', { class: 'counter-number' }, `${players.length}`),
          framework.createElement('span', { class: 'counter-label' }, ` / ${GAME_CONFIG.MAX_PLAYERS} Players`)
        ),
        framework.createElement('div', { class: 'player-slots' }, ...playerSlots),
        gameState === 'countdown'
          ? framework.createElement('div', { class: 'countdown-display' },
              framework.createElement('span', { class: 'countdown-label' }, 'Game starts in'),
              framework.createElement('span', { class: 'countdown-number' }, `${countdown}`)
            )
          : framework.createElement('div', { class: 'waiting-message' },
              players.length < GAME_CONFIG.MIN_PLAYERS
                ? `Need at least ${GAME_CONFIG.MIN_PLAYERS} players to start...`
                : `Waiting up to ${GAME_CONFIG.LOBBY_WAIT_TIME / 1000} seconds for more players...`
            )
      )
    );
  }
}

class ChatPanel extends Component {
  render() {
    const { framework, messages, onSendMessage, error } = this.props;

    return framework.createElement('div', { class: 'chat-panel' },
      framework.createElement('div', { class: 'chat-title' }, '💬 Chat'),
      framework.createElement('p', { id: 'chat-error', class: 'join-error', role: 'alert' }, error || ''),
      framework.createElement('div', { class: 'chat-messages', id: 'chat-messages' },
        ...(messages || []).map((msg, i) =>
          framework.createElement('div', { class: `chat-msg chat-player-${msg.slot + 1}`, key: `msg-${i}` },
            framework.createElement('span', { class: 'chat-nick' }, `${msg.nickname}: `),
            framework.createElement('span', { class: 'chat-text' }, msg.message)
          )
        )
      ),
      framework.createElement('div', { class: 'chat-input-row' },
        framework.createElement('input', {
          type: 'text',
          class: 'chat-input',
          id: 'chat-input',
          placeholder: 'Type a message...',
          maxLength: 200,
          onKeyDown: (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              onSendMessage(e.target.value.trim());
              e.target.value = '';
            }
          }
        }),
        framework.createElement('button', {
          class: 'chat-send-btn',
          onClick: () => {
            const input = document.getElementById('chat-input');
            if (input && input.value.trim()) {
              onSendMessage(input.value.trim());
              input.value = '';
              input.focus();
            }
          }
        }, '→')
      )
    );
  }
}

class GameOverScreen extends Component {
  render() {
    const { framework, winner } = this.props;

    return framework.createElement('div', { class: 'gameover-overlay' },
      framework.createElement('div', { class: 'gameover-card' },
        framework.createElement('h1', { class: 'gameover-title' },
          winner ? '🏆 Victory!' : '💀 Game Over!'
        ),
        winner
          ? framework.createElement('p', { class: 'gameover-winner' }, `${winner.nickname} wins!`)
          : framework.createElement('p', { class: 'gameover-draw' }, "It's a draw!"),
        framework.createElement('p', { class: 'gameover-info' }, 'Returning to lobby...')
      )
    );
  }
}

class BombermanApp extends Component {
  constructor(props) {
    super(props);
    this.network = new NetworkManager();
    this.inputManager = null;
    this.gameLoopId = null;
    this._loopRunning = null;

    this.localState = {
      screen: 'lobby',
      nickname: '',
      joined: false,
      joining: false,
      error: '',
      mySlot: null,
      lobbyRemainingMs: null,
      players: [],
      myPlayerId: null,
      gameState: 'lobby',
      countdown: 10,
      map: null,
      chatMessages: [],
      chatInput: '',
      winner: null,
    };

    this.playerElements = new Map();
    this.tileElements = new Map();
    this.bombElements = new Map();     
    this.powerUpElements = new Map();  
    this._playerVisualState = new Map(); 

    this._fpsFrameCount = 0;
    this._fpsLastTime = 0;
    this._fpsPrevFrame = 0;
    this._fpsValue = 0;
    this._fpsMin = 999;
    this._fpsFrameTimes = [];
    this._fpsElement = null;
    this._playerFlashing = new Set();
    this._playerMotion = new Map();
    this._reconnectTimer = null;
    this._disposed = false;
    this._resizeBoard = () => this.resizeBoard();
  }

  onStateChange() {
    // Screen rendering is explicit; framework state changes must not rebuild the game DOM.
  }

  onMount() {
    this.setupNetworkHandlers();
    window.addEventListener('resize', this._resizeBoard);
    this.connectToServer();
  }

  onUnmount() {
    this._disposed = true;
    clearTimeout(this._reconnectTimer);
    window.removeEventListener('resize', this._resizeBoard);
    this.resetSession();
    this.network.disconnect();
  }

  async connectToServer() {
    try {
      await this.network.connect();
      if (!this._disposed) this.renderScreen();
    } catch (err) {
      console.error('Failed to connect:', err);
      this.scheduleReconnect();
    }
  }

  setupNetworkHandlers() {
    if (this._handlersRegistered) return;
    this._handlersRegistered = true;
    const n = this.network;

    n.on('ERROR', (data) => {
      this.localState.joining = false;
      this.localState.error = data.message || data.error || 'Request rejected';
      if (this.localState.screen === 'lobby') this.renderScreen();
      else {
        const error = document.getElementById('chat-error');
        if (error) error.textContent = this.localState.error;
      }
    });
    n.on('LOBBY_UPDATE', (data) => this.applyLobbySnapshot(data));

    n.on('PLAYER_JOINED', (data) => {
      if (data.playerId !== undefined) {
        this.localState.myPlayerId = data.playerId;
        this.localState.mySlot = data.slot;
        this.localState.joined = true;
        this.localState.joining = false;
        this.localState.error = '';
        if (Array.isArray(data.chatMessages)) {
          this.localState.chatMessages = data.chatMessages.slice(-50).map(message => ({
            ...message,
            slot: message.slot ?? data.players?.find(player => player.id === message.playerId)?.slot
          }));
        }
      }
      this.applyLobbySnapshot(data);
    });

    n.on('PLAYER_LEFT', (data) => {
      this.removePlayerElement(data.playerId);
      this.applyLobbySnapshot(data);
    });

    n.on('COUNTDOWN_START', (data) => {
      if (!this.localState.joined || this.localState.screen !== 'lobby') return;
      this.localState.gameState = 'countdown';
      this.localState.countdown = data.seconds;
      getAudioManager().init();
      getAudioManager().playCountdown();
      this.renderScreen();
    });

    n.on('COUNTDOWN_TICK', (data) => {
      if (this.localState.gameState !== 'countdown') return;
      this.localState.countdown = data.seconds;
      const el = document.querySelector('.countdown-number');
      if (el) el.textContent = `${data.seconds}`;
    });

    n.on('GAME_START', (data) => {
      if (!this.localState.joined) return;
      this.stopGameLoop();
      this.clearGameDOM();
      this.localState.screen = 'game';
      this.localState.gameState = 'playing';
      this.localState.map = data.map;
      this.localState.players = data.players;
      this.renderScreen();

      this.addAllPlayers(data.players);
      this.tileElements.clear();
      document.querySelectorAll('.tile[data-tx]').forEach(el => {
        this.tileElements.set(`${el.dataset.tx},${el.dataset.ty}`, el);
      });
      this.bombElements.clear();
      this.powerUpElements.clear();
      this._playerVisualState.clear();
      this._playerFlashing.clear();
      this.createFPSCounter();
      this.startGameLoop();
      getAudioManager().init();
      getAudioManager().playGameStart();
      getAudioManager().startBackgroundMusic();
    });

    n.on('PLAYER_MOVE', (data) => {
      const p = this.localState.players.find(pl => pl.id === data.playerId);
      if (!p || this.localState.screen !== 'game') return;
      this.queuePlayerMotion(p, data.x, data.y);
      p.x = data.x; p.y = data.y; p.direction = data.direction;
    });

    n.on('BOMB_PLACED', (data) => {
      this.addBombElement(data.bomb);
      getAudioManager().playBombPlace();
    });

    n.on('BOMB_EXPLODE', (data) => {
      this.removeBombElement(data.bombId);
      this.addExplosionElements(data.bombId, data.cells);
      getAudioManager().playExplosion();
      for (const block of data.destroyedBlocks) {
        if (this.localState.map?.[block.y]) this.localState.map[block.y][block.x] = TILE_TYPES.EMPTY;
        this.updateTileElement(block.x, block.y, 'tile-empty');
      }
      for (const pu of data.powerUps) {
        this.addPowerUpElement(pu);
      }
    });

    n.on('EXPLOSION_END', (data) => {
      this.removeExplosionElements(data.explosionId);
    });

    n.on('POWERUP_COLLECTED', (data) => {
      this.removePowerUpElement(data.powerUpId);
      getAudioManager().playPowerUp();
      const p = this.localState.players.find(pl => pl.id === data.playerId);
      if (p && data.playerStats) {
        p.bombCount = data.playerStats.bombCount;
        p.flameRange = data.playerStats.flameRange;
        p.speed = data.playerStats.speed;
      }
      if (data.playerId === this.localState.myPlayerId) this.updatePlayerInfoUI();
    });

    n.on('PLAYER_HIT', (data) => {
      const p = this.localState.players.find(pl => pl.id === data.playerId);
      if (p) p.lives = data.lives;
      getAudioManager().playPlayerHit();
      const el = this.playerElements.get(data.playerId);
      if (el) {
        el.classList.add('hit-flash');
        
        this._playerFlashing.add(data.playerId);
        if (el._hitTimer) clearTimeout(el._hitTimer);
        el._hitTimer = setTimeout(() => {
          el.classList.remove('hit-flash');
          el._hitTimer = null;
          this._playerFlashing.delete(data.playerId);
          this._playerVisualState.delete(data.playerId);
        }, GAME_CONFIG.INVULNERABILITY_MS);
      }
      this.updateAllPlayersStatusUI();
      if (data.playerId === this.localState.myPlayerId) this.updatePlayerInfoUI();
    });

    n.on('PLAYER_DIED', (data) => {
      const p = this.localState.players.find(pl => pl.id === data.playerId);
      if (p) { p.isAlive = false; p.lives = 0; }
      const el = this.playerElements.get(data.playerId);
      if (el) el.style.display = 'none';
      getAudioManager().playPlayerHit();
      this.updateAllPlayersStatusUI();
      if (data.playerId === this.localState.myPlayerId) this.updatePlayerInfoUI();
    });

    n.on('GAME_OVER', (data) => {
      this.localState.screen = 'gameOver';
      this.localState.gameState = 'gameOver';
      this.localState.winner = data.winner;
      this.stopGameLoop();
      getAudioManager().stopBackgroundMusic();
      getAudioManager().playGameOver();
      this.renderScreen();
    });

    n.on('GAME_RESET', (data) => {
      this.stopGameLoop();
      this.clearGameDOM();
      this.localState.countdown = 0;
      this.localState.lobbyRemainingMs = data.lobbyRemainingMs ?? null;
      this.localState.screen = 'lobby';
      this.localState.gameState = 'lobby';
      this.localState.players = data.players;
      this.localState.map = null;
      this.localState.winner = null;
      this.playerElements.clear();
      this.bombElements.clear();
      this.powerUpElements.clear();
      this._playerVisualState.clear();
      this._playerFlashing.clear();
      getAudioManager().stopBackgroundMusic();
      this.renderScreen();
    });

    n.on('CHAT_MESSAGE', (data) => {
      data = { ...data, slot: data.slot ?? this.localState.players.find(p => p.id === data.playerId)?.slot };
      this.localState.chatMessages.push(data);
      if (this.localState.chatMessages.length > 50) this.localState.chatMessages.shift();
      this.updateChatUI(data);
    });

    n.on('disconnected', () => {
      this.resetSession();
      if (!this._disposed) {
        this.renderScreen();
        this.scheduleReconnect();
      }
    });
  }

  scheduleReconnect() {
    if (this._disposed || this._reconnectTimer) return;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this.connectToServer();
    }, 3000);
  }

  clearGameDOM() {
    for (const el of this.playerElements.values()) clearTimeout(el._hitTimer);
    this.playerElements.clear();
    this.tileElements.clear();
    this.bombElements.clear();
    this.powerUpElements.clear();
    this._playerMotion.clear();
    this._playerVisualState.clear();
    this._playerFlashing.clear();
    this._fpsElement = null;
  }

  resetSession() {
    this.stopGameLoop();
    this.clearGameDOM();
    Object.assign(this.localState, {
      screen: 'lobby', joined: false, joining: false, myPlayerId: null,
      mySlot: null, players: [], gameState: 'lobby', countdown: 0,
      lobbyRemainingMs: null, map: null, winner: null, chatMessages: [], error: ''
    });
    getAudioManager().stopBackgroundMusic();
  }

  applyLobbySnapshot(data) {
    if (Array.isArray(data.players)) this.localState.players = data.players;
    if (data.gameState !== undefined) this.localState.gameState = data.gameState;
    this.localState.countdown = this.localState.gameState === 'countdown'
      ? (data.countdown ?? data.countdownValue ?? data.seconds ?? this.localState.countdown) : 0;
    this.localState.lobbyRemainingMs = data.lobbyRemainingMs ?? null;
    if (this.localState.screen === 'game') {
      const ids = new Set(this.localState.players.map(p => p.id));
      for (const id of this.playerElements.keys()) {
        if (!ids.has(id)) this.removePlayerElement(id);
      }
      this.updateAllPlayersStatusUI();
    } else {
      this.renderScreen();
    }
  }

  queuePlayerMotion(player, x, y) {
    const now = performance.now();
    const previous = this._playerMotion.get(player.id);
    const position = previous ? this.samplePlayerMotion(previous, now) : player;
    // Interpolate only accepted tile steps; never cut diagonally across walls.
    const adjacent = Math.abs(x - player.x) + Math.abs(y - player.y) === 1;
    const straight = position.x === x || position.y === y;
    this._playerMotion.set(player.id, {
      fromX: adjacent && straight ? position.x : player.x,
      fromY: adjacent && straight ? position.y : player.y,
      x, y, start: now,
      duration: adjacent ? Math.max(GAME_CONFIG.MIN_MOVE_DELAY, GAME_CONFIG.MOVE_DELAY / (player.speed || 1)) : 0
    });
  }

  samplePlayerMotion(motion, now) {
    const progress = motion.duration ? Math.min(1, Math.max(0, (now - motion.start) / motion.duration)) : 1;
    return { x: motion.fromX + (motion.x - motion.fromX) * progress,
      y: motion.fromY + (motion.y - motion.fromY) * progress };
  }

  updatePlayerTransforms(now) {
    for (const [id, motion] of this._playerMotion) {
      const position = this.samplePlayerMotion(motion, now);
      updatePlayerPosition(this.playerElements, id, position.x, position.y);
      if (now >= motion.start + motion.duration) this._playerMotion.delete(id);
    }
  }

  resizeBoard() {
    const board = document.getElementById('game-board');
    if (!board) return;
    const wrapper = board.parentElement;
    const width = GAME_CONFIG.MAP_WIDTH * GAME_CONFIG.TILE_SIZE;
    const height = GAME_CONFIG.MAP_HEIGHT * GAME_CONFIG.TILE_SIZE;
    const app = wrapper.closest('.bomberman-app');
    const mainPadding = parseFloat(window.getComputedStyle(wrapper.parentElement).paddingBottom) || 0;
    const appPadding = app ? parseFloat(window.getComputedStyle(app).paddingBottom) || 0 : 0;
    // Document-relative top includes the header and top padding, even after scrolling.
    const top = wrapper.getBoundingClientRect().top + window.scrollY;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const availableHeight = Math.max(0, viewportHeight - top - mainPadding - appPadding - 4);
    const scale = Math.min(1, wrapper.clientWidth / width, availableHeight / height);
    board.style.transform = `scale(${scale})`;
    wrapper.style.height = `${height * scale}px`;
  }

  
  startGameLoop() {
    this.stopGameLoop();
    this.inputManager = new InputManager();

    let lastTime = null;

    // Shared ref lets stopGameLoop stop callbacks even if cancellation misses an active frame.
    this._loopRunning = { value: true };
    const loopRef = this._loopRunning;

    const loop = (now) => {
      if (!loopRef.value) return;

      
      this.gameLoopId = requestAnimationFrame(loop);

      if (this.localState.screen !== 'game') return;

      try {
        const deltaTime = lastTime === null ? 0 : now - lastTime;
        lastTime = now;
        this.inputManager.update(deltaTime);

        const myPlayer = this.localState.players.find(p => p.id === this.localState.myPlayerId);
        if (myPlayer?.isAlive) {
          const direction = this.inputManager.getMovementDirection();
          if (direction) {
            this.network.sendMove(direction);
            this.inputManager.onMoveExecuted(myPlayer.speed || 1);
          }
          if (this.inputManager.isBombJustPressed()) this.network.sendPlaceBomb();
        }
        this.inputManager.clearFrameStates();

        
        this.updatePlayerTransforms(now);
        this.updatePlayerVisuals(now);

        // Count rAF callbacks; write the FPS display only once per second.
        if (this._fpsPrevFrame > 0) this._fpsFrameCount++;
        if (this._fpsPrevFrame > 0) {
          this._fpsFrameTimes.push(now - this._fpsPrevFrame);
          if (this._fpsFrameTimes.length > 120) this._fpsFrameTimes.shift();
        }
        this._fpsPrevFrame = now;
        if (this._fpsLastTime === 0) this._fpsLastTime = now;
        if (now - this._fpsLastTime >= 1000) {
          this._fpsValue = Math.round(this._fpsFrameCount * 1000 / (now - this._fpsLastTime));
          this._fpsFrameCount = 0;
          this._fpsLastTime = now;
          // Min FPS is the inverse of the worst frame time in the rolling 120-frame window.
          if (this._fpsFrameTimes.length > 0) {
            const worstFrameTime = Math.max(...this._fpsFrameTimes);
            this._fpsMin = Math.round(1000 / worstFrameTime);
          }
          this.updateFPSCounter();
        }

      } catch (err) {
        console.error('Game loop error (frame continues):', err);
      }
    };

    this.gameLoopId = requestAnimationFrame(loop);
  }

  stopGameLoop() {
    if (this.inputManager) {
      this.inputManager.destroy();
      this.inputManager = null;
    }
    if (this._loopRunning) this._loopRunning.value = false;
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
  }


  createFPSCounter() {
    if (this._fpsElement && this._fpsElement.parentNode) {
      this._fpsElement.remove();
    }

    const el = document.createElement('div');
    el.id = 'fps-counter';
    el.innerHTML = `
      <div class="fps-number">-- FPS</div>
      <div class="fps-detail">Min: --</div>
      <div class="fps-detail">Frame: --ms</div>
    `;
    const board = document.getElementById('game-board');
    if (board) {
      board.appendChild(el);
    } else {
      document.body.appendChild(el);
    }
    this._fpsElement = el;

    this._fpsFrameCount = 0;
    this._fpsLastTime = 0;
    this._fpsPrevFrame = 0;
    this._fpsValue = 0;
    this._fpsMin = 999;
    this._fpsFrameTimes = [];
  }

  updateFPSCounter() {
    if (!this._fpsElement) return;

    const children = this._fpsElement.children;
    if (!children.length) return;

    const fps = this._fpsValue;
    const minFps = this._fpsMin < 999 ? this._fpsMin : 0;
    const avgFrameTime = this._fpsFrameTimes.length
      ? (this._fpsFrameTimes.reduce((sum, time) => sum + time, 0) / this._fpsFrameTimes.length).toFixed(1) : '--';

    const color = fps >= 55 ? '#4f4' : fps >= 40 ? '#ff4' : '#f44';

    children[0].textContent = `${fps} FPS`;
    children[0].style.color = color;
    children[1].textContent = `Min: ${minFps}`;
    children[2].textContent = `Frame: ${avgFrameTime}ms`;
  }

  addAllPlayers(players) {
    const layer = document.getElementById('players-layer');
    if (!layer) return;
    layer.innerHTML = '';
    this.playerElements.clear();
    this._playerVisualState.clear();
    this._playerMotion.clear();
    for (const p of players) {
      const el = createPlayerElement(p);
      layer.appendChild(el);
      this.playerElements.set(p.id, el);
    }
  }

  removePlayerElement(playerId) {
    const el = this.playerElements.get(playerId);
    if (el) {
      clearTimeout(el._hitTimer);
      el.remove();
    }
    this._playerMotion.delete(playerId);
    this._playerFlashing.delete(playerId);
    this.playerElements.delete(playerId);
    this._playerVisualState.delete(playerId);
  }

  addBombElement(bomb) {
    const layer = document.getElementById('bombs-layer');
    if (!layer) return;
    const { TILE_SIZE } = GAME_CONFIG;
    const el = document.createElement('div');
    el.className = 'bomb';
    el.setAttribute('data-bomb-id', bomb.id);
    el.style.width = `${TILE_SIZE}px`;
    el.style.height = `${TILE_SIZE}px`;
    el.style.left = `${bomb.x * TILE_SIZE}px`;
    el.style.top = `${bomb.y * TILE_SIZE}px`;
    layer.appendChild(el);
    this.bombElements.set(bomb.id, el); 
    setTimeout(() => { if (el.parentNode) el.classList.add('about-to-explode'); }, 2500);
  }

  
  removeBombElement(bombId) {
    const el = this.bombElements.get(bombId);
    if (el && el.parentNode) el.remove();
    this.bombElements.delete(bombId);
  }

  addExplosionElements(explosionId, cells) {
    const layer = document.getElementById('explosions-layer');
    if (!layer) return;
    const { TILE_SIZE } = GAME_CONFIG;

    const fragment = document.createDocumentFragment();
    for (const cell of cells) {
      const el = document.createElement('div');
      el.className = `explosion explosion-${cell.type || 'center'}`;
      el.setAttribute('data-explosion-id', explosionId);
      el.style.width = `${TILE_SIZE}px`;
      el.style.height = `${TILE_SIZE}px`;
      el.style.left = `${cell.x * TILE_SIZE}px`;
      el.style.top = `${cell.y * TILE_SIZE}px`;
      fragment.appendChild(el);
    }
    layer.appendChild(fragment);
  }

 
  removeExplosionElements(explosionId) {
    const layer = document.getElementById('explosions-layer');
    if (!layer) return;
    const els = layer.querySelectorAll(`[data-explosion-id="${explosionId}"]`);
    for (let i = 0; i < els.length; i++) {
      els[i].remove();
    }
  }

  addPowerUpElement(powerUp) {
    const layer = document.getElementById('powerups-layer');
    if (!layer) return;
    const { TILE_SIZE } = GAME_CONFIG;
    const el = document.createElement('div');
    el.className = `powerup powerup-${powerUp.type}`;
    el.setAttribute('data-powerup-id', powerUp.id);
    el.style.width = `${TILE_SIZE}px`;
    el.style.height = `${TILE_SIZE}px`;
    el.style.left = `${powerUp.x * TILE_SIZE}px`;
    el.style.top = `${powerUp.y * TILE_SIZE}px`;
    layer.appendChild(el);
    this.powerUpElements.set(powerUp.id, el); 
  }


  removePowerUpElement(powerUpId) {
    const el = this.powerUpElements.get(powerUpId);
    if (el && el.parentNode) el.remove();
    this.powerUpElements.delete(powerUpId);
  }

  updateTileElement(x, y, newClass) {
    const el = this.tileElements.get(`${x},${y}`);
    if (el) el.className = `tile ${newClass}`;
  }

  updatePlayerVisuals(now) {
    const players = this.localState.players;
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const el = this.playerElements.get(p.id);
      if (!el) continue;

      let state = this._playerVisualState.get(p.id);
      if (!state) {
        state = { opacity: '', display: '' };
        this._playerVisualState.set(p.id, state);
      }

      if (!p.isAlive) {
        if (state.display !== 'none') {
          el.style.display = 'none';
          state.display = 'none';
        }
      } else if (this._playerFlashing.has(p.id)) {
        
        const raw = Math.sin(now * 0.01) * 0.3 + 0.7;
        const newOpacity = (Math.round(raw * 50) / 50).toFixed(2);
        if (state.opacity !== newOpacity) {
          el.style.opacity = newOpacity;
          state.opacity = newOpacity;
        }
        if (state.display !== '') {
          el.style.display = '';
          state.display = '';
        }
      } else {
        if (state.opacity !== '1') {
          el.style.opacity = '1';
          state.opacity = '1';
        }
        if (state.display !== '') {
          el.style.display = '';
          state.display = '';
        }
      }
    }
  }

  updatePlayerInfoUI() {
    const myPlayer = this.localState.players.find(p => p.id === this.localState.myPlayerId);
    if (!myPlayer) return;
    const livesEl = document.querySelector('.info-value.lives');
    if (livesEl) livesEl.textContent = '❤️'.repeat(myPlayer.lives);
    const vals = document.querySelectorAll('.info-value');
    if (vals[1]) vals[1].textContent = myPlayer.bombCount;
    if (vals[2]) vals[2].textContent = myPlayer.flameRange;
    if (vals[3]) vals[3].textContent = myPlayer.speed;
  }

  updateAllPlayersStatusUI() {
    const container = document.querySelector('.all-players-status');
    if (!container) return;
    const rows = new Map([...container.querySelectorAll('.player-status-row')]
      .map(row => [row.dataset.playerId, row]));
    this.localState.players.forEach((p) => {
      let row = rows.get(String(p.id));
      rows.delete(String(p.id));
      if (!row) {
        row = document.createElement('div');
        row.dataset.playerId = p.id;
        row.append(document.createElement('span'), document.createElement('span'));
        container.appendChild(row);
      }
      row.className = `player-status-row player-status-${p.slot + 1}`;
      if (p.isAlive) {
        row.classList.remove('dead');
      } else {
        row.classList.add('dead');
      }
      const spans = row.querySelectorAll('span');
      if (spans[0]) spans[0].textContent = `${p.isAlive ? '🟢' : '☠️'} ${p.nickname}`;
      if (spans[1]) spans[1].textContent = '❤️'.repeat(Math.max(0, p.lives));
    });
    for (const row of rows.values()) row.remove();
  }

  updateChatUI(newMsg) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const msgEl = document.createElement('div');
    msgEl.className = `chat-msg chat-player-${newMsg.slot + 1}`;
    const nick = document.createElement('span');
    nick.className = 'chat-nick';
    nick.textContent = `${newMsg.nickname}: `;
    const text = document.createElement('span');
    text.className = 'chat-text';
    text.textContent = newMsg.message;
    msgEl.appendChild(nick);
    msgEl.appendChild(text);
    const nearBottom = container.scrollHeight - (container.clientHeight || 0) - container.scrollTop < 40 || container.children.length === 0;
    container.appendChild(msgEl);
    while (container.children.length > 50) container.firstElementChild.remove();
    if (nearBottom) container.scrollTop = container.scrollHeight;
  }


  handleJoin() {
    const input = document.getElementById('nickname-input');
    const nick = (input ? input.value : this.localState.nickname).trim();
    if (!nick || this.localState.joined || this.localState.joining || !this.network.connected) return;
    this.localState.nickname = nick;
    this.localState.error = '';
    this.localState.joining = this.network.join(nick);
    this.renderScreen();
  }

  handleSendChat(message) {
    if (!this.localState.joined) return;
    this.localState.error = '';
    const error = document.getElementById('chat-error');
    if (error) error.textContent = '';
    this.network.sendChat(message);
  }


  renderScreen() {
    if (!this.container) return;
    const active = document.activeElement;
    const focusId = ['nickname-input', 'chat-input'].includes(active?.id) ? active.id : null;
    const selection = focusId ? [active.selectionStart, active.selectionEnd] : null;
    for (const [id, key] of [['nickname-input', 'nickname'], ['chat-input', 'chatInput']]) {
      const input = document.getElementById(id);
      if (input) this.localState[key] = input.value;
    }
    this.container.innerHTML = '';
    const vnode = this.render();
    this.framework.virtualDOM.render(vnode, this.container);
    const chat = document.getElementById('chat-input');
    if (chat) chat.value = this.localState.chatInput;
    const input = document.getElementById(focusId || 'nickname-input');
    if (input && (focusId || active === document.body)) {
      input.focus();
      if (selection) input.setSelectionRange(...selection);
    }
    this.resizeBoard();
  }

  render() {
    const s = this.localState;

    if (s.screen === 'lobby') {
      return this.framework.createElement('div', { class: 'bomberman-app' },
        this.framework.createElement(LobbyScreen, {
          framework: this.framework, players: s.players, gameState: s.gameState,
          countdown: s.countdown, nickname: s.nickname, joined: s.joined,
          joining: s.joining, error: s.error, connected: this.network.connected,
          lobbyRemainingMs: s.lobbyRemainingMs,
          onJoin: () => this.handleJoin(),
          onNicknameChange: (v) => { s.nickname = v; },
        }),
        s.joined ? this.framework.createElement(ChatPanel, {
          framework: this.framework, messages: s.chatMessages, error: s.error,
          onSendMessage: (msg) => this.handleSendChat(msg),
        }) : null
      );
    }

    if (s.screen === 'game') {
      return this.framework.createElement('div', { class: 'bomberman-app' },
        this.framework.createElement('header', { class: 'game-header' },
          this.framework.createElement('h1', {}, '💣 Bomberman'),
          this.framework.createElement('p', { class: 'phase-info' }, 'Multiplayer Arena')
        ),
        this.framework.createElement('main', { class: 'game-main' },
          this.framework.createElement('div', { class: 'sidebar' },
            this.renderPlayerInfo(),
            this.renderAllPlayersStatus(),
            this.framework.createElement(ChatPanel, {
              framework: this.framework, messages: s.chatMessages, error: s.error,
              onSendMessage: (msg) => this.handleSendChat(msg),
            })
          ),
          this.renderGameBoard()
        )
      );
    }

    if (s.screen === 'gameOver') {
      return this.framework.createElement('div', { class: 'bomberman-app' },
        this.framework.createElement(GameOverScreen, {
          framework: this.framework, winner: s.winner,
        })
      );
    }

    return this.framework.createElement('div', {}, 'Connecting...');
  }

  renderPlayerInfo() {
    const myPlayer = this.localState.players.find(p => p.id === this.localState.myPlayerId);
    if (!myPlayer) return this.framework.createElement('div', {});

    return this.framework.createElement('div', { class: 'player-info' },
      this.framework.createElement('div', { class: 'info-title' }, `🎮 ${myPlayer.nickname}`),
      this.framework.createElement('div', { class: 'info-item' },
        this.framework.createElement('span', { class: 'info-label' }, 'Lives: '),
        this.framework.createElement('span', { class: 'info-value lives' }, '❤️'.repeat(myPlayer.lives))
      ),
      this.framework.createElement('div', { class: 'info-item' },
        this.framework.createElement('span', { class: 'info-label' }, 'Bombs: '),
        this.framework.createElement('span', { class: 'info-value' }, myPlayer.bombCount)
      ),
      this.framework.createElement('div', { class: 'info-item' },
        this.framework.createElement('span', { class: 'info-label' }, 'Flame: '),
        this.framework.createElement('span', { class: 'info-value' }, myPlayer.flameRange)
      ),
      this.framework.createElement('div', { class: 'info-item' },
        this.framework.createElement('span', { class: 'info-label' }, 'Speed: '),
        this.framework.createElement('span', { class: 'info-value' }, myPlayer.speed)
      )
    );
  }

  renderAllPlayersStatus() {
    return this.framework.createElement('div', { class: 'all-players-status' },
      this.framework.createElement('div', { class: 'info-title' }, '👥 Players'),
      ...this.localState.players.map(p =>
        this.framework.createElement('div', {
          class: `player-status-row ${p.isAlive ? '' : 'dead'} player-status-${p.slot + 1}`,
          'data-player-id': p.id
        },
          this.framework.createElement('span', {}, `${p.isAlive ? '🟢' : '☠️'} ${p.nickname}`),
          this.framework.createElement('span', {}, `${'❤️'.repeat(p.lives)}`)
        )
      )
    );
  }

  renderGameBoard() {
    const { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } = GAME_CONFIG;
    const map = this.localState.map;
    if (!map) return this.framework.createElement('div', {}, 'Loading map...');

    const tiles = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileType = map[y][x];
        let tileClass = 'tile tile-empty';
        if (tileType === TILE_TYPES.WALL) tileClass = 'tile tile-wall';
        else if (tileType === TILE_TYPES.BLOCK) tileClass = 'tile tile-block';
        tiles.push(this.framework.createElement('div', {
          class: tileClass,
          'data-tx': x,
          'data-ty': y,
          style: `left: ${x * TILE_SIZE}px; top: ${y * TILE_SIZE}px; width: ${TILE_SIZE}px; height: ${TILE_SIZE}px;`
        }));
      }
    }

    return this.framework.createElement('div', { class: 'game-board-wrapper' },
      this.framework.createElement('div', {
        id: 'game-board', class: 'game-board',
        style: `width: ${MAP_WIDTH * TILE_SIZE}px; height: ${MAP_HEIGHT * TILE_SIZE}px;`
      },
        ...tiles,
        this.framework.createElement('div', { id: 'powerups-layer', class: 'powerups-layer' }),
        this.framework.createElement('div', { id: 'players-layer', class: 'players-layer' }),
        this.framework.createElement('div', { id: 'bombs-layer', class: 'bombs-layer' }),
        this.framework.createElement('div', { id: 'explosions-layer', class: 'explosions-layer' })
      )
    );
  }
}

class BombermanGameApp {
  constructor() {
    this.framework = new MiniFramework();
    this.init();
  }

  init() {
    this.framework.setState({ gameState: 'lobby' });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.render());
    } else {
      this.render();
    }
  }

  render() {
    const appRoot = document.getElementById('app');
    if (!appRoot) return;
    const app = this.framework.createComponent(BombermanApp, {});
    this.framework.render(app, appRoot);
    console.log('🚀 Bomberman Multiplayer initialized');
  }
}

const app = new BombermanGameApp();
export default app;