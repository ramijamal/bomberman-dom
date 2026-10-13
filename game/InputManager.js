import { GAME_CONFIG, KEY_BINDINGS } from './constants.js';

export class InputManager {
  constructor() {
    this.keyState = {
      up: false,
      down: false,
      left: false,
      right: false,
      bomb: false
    };
    
    // Track keys just pressed this frame
    this.justPressed = {
      up: false,
      down: false,
      left: false,
      right: false,
      bomb: false
    };
    
    this.moveCooldown = 0;
    this.moveDelay = GAME_CONFIG.MOVE_DELAY;
    
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.clearHeld = this.clearHeld.bind(this);
    this.handleFocus = (event) => {
      if (this.isTypingTarget(event.target)) this.clearHeld();
    };
    
    this.init();
  }

  init() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.clearHeld);
    document.addEventListener('visibilitychange', this.clearHeld);
    document.addEventListener('focusin', this.handleFocus);
    console.log('🎮 InputManager initialized');
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.clearHeld);
    document.removeEventListener('visibilitychange', this.clearHeld);
    document.removeEventListener('focusin', this.handleFocus);
    this.clearHeld();
  }

  clearHeld() {
    for (const action of Object.keys(this.keyState)) {
      this.keyState[action] = false;
      this.justPressed[action] = false;
    }
    this.moveCooldown = 0;
  }

  isTypingTarget(target) {
    return target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName);
  }

  handleKeyDown(event) {
    const key = event.key;
    const code = event.code;
    
    if (this.isTypingTarget(event.target)) {
      this.clearHeld();
      return;
    }
    
    if (this.isGameKey(key, code)) {
      event.preventDefault();
    }

    if (KEY_BINDINGS.UP.includes(code) || key === 'ArrowUp' || key.toLowerCase() === 'w') {
      if (!this.keyState.up) this.justPressed.up = true;
      this.keyState.up = true;
    }
    if (KEY_BINDINGS.DOWN.includes(code) || key === 'ArrowDown' || key.toLowerCase() === 's') {
      if (!this.keyState.down) this.justPressed.down = true;
      this.keyState.down = true;
    }
    if (KEY_BINDINGS.LEFT.includes(code) || key === 'ArrowLeft' || key.toLowerCase() === 'a') {
      if (!this.keyState.left) this.justPressed.left = true;
      this.keyState.left = true;
    }
    if (KEY_BINDINGS.RIGHT.includes(code) || key === 'ArrowRight' || key.toLowerCase() === 'd') {
      if (!this.keyState.right) this.justPressed.right = true;
      this.keyState.right = true;
    }
    if (KEY_BINDINGS.BOMB.includes(code) || key === ' ') {
      if (!this.keyState.bomb) this.justPressed.bomb = true;
      this.keyState.bomb = true;
    }
  }

  handleKeyUp(event) {
    const key = event.key;
    const code = event.code;

    if (KEY_BINDINGS.UP.includes(code) || key === 'ArrowUp' || key.toLowerCase() === 'w') {
      this.keyState.up = false;
    }
    if (KEY_BINDINGS.DOWN.includes(code) || key === 'ArrowDown' || key.toLowerCase() === 's') {
      this.keyState.down = false;
    }
    if (KEY_BINDINGS.LEFT.includes(code) || key === 'ArrowLeft' || key.toLowerCase() === 'a') {
      this.keyState.left = false;
    }
    if (KEY_BINDINGS.RIGHT.includes(code) || key === 'ArrowRight' || key.toLowerCase() === 'd') {
      this.keyState.right = false;
    }
    if (KEY_BINDINGS.BOMB.includes(code) || key === ' ') {
      this.keyState.bomb = false;
    }
  }

  isGameKey(key, code) {
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'];
    return keys.includes(key) || 
           KEY_BINDINGS.UP.includes(code) ||
           KEY_BINDINGS.DOWN.includes(code) ||
           KEY_BINDINGS.LEFT.includes(code) ||
           KEY_BINDINGS.RIGHT.includes(code) ||
           KEY_BINDINGS.BOMB.includes(code);
  }

  update(deltaTime) {
    if (this.moveCooldown > 0) {
      this.moveCooldown -= deltaTime;
    }
  }

  getMovementDirection() {
    if (this.moveCooldown > 0) {
      return null;
    }

    // Priority: up, down, left, right (can change this order)
    // Only return one direction at a time for grid-based movement
    if (this.keyState.up) return 'up';
    if (this.keyState.down) return 'down';
    if (this.keyState.left) return 'left';
    if (this.keyState.right) return 'right';

    return null;
  }

  onMoveExecuted(speedMultiplier = 1) {
    this.moveCooldown = Math.max(GAME_CONFIG.MIN_MOVE_DELAY, this.moveDelay / (speedMultiplier || 1));
  }

  isBombJustPressed() {
    return this.justPressed.bomb;
  }

  // Call at the end of each frame.
  clearFrameStates() {
    this.justPressed.up = false;
    this.justPressed.down = false;
    this.justPressed.left = false;
    this.justPressed.right = false;
    this.justPressed.bomb = false;
  }

  isAnyMovementKeyPressed() {
    return this.keyState.up || this.keyState.down || 
           this.keyState.left || this.keyState.right;
  }
}