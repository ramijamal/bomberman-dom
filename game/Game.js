import { GAME_CONFIG, GAME_STATES } from './constants.js';

export class Game {
  constructor(framework) {
    this.framework = framework;
    
    this.isRunning = false;
    this.lastFrameTime = 0;
    this.deltaTime = 0;
    this.animationFrameId = null;
    
    this.fps = 0;
    this.frameCount = 0;
    this.fpsUpdateTime = 0;
    this.frameTimes = [];
    this.maxFrameTimeHistory = 60; 
    
    this.gameState = GAME_STATES.LOBBY;
    
    this.updateCallbacks = [];
    this.renderCallbacks = [];
    
    this.gameLoop = this.gameLoop.bind(this);
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = this.lastFrameTime;
    this.frameCount = 0;
    
    console.log('🎮 Game loop started');
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log('🛑 Game loop stopped');
  }

  gameLoop(currentTime) {
    if (!this.isRunning) return;

    this.deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.frameTimes.push(this.deltaTime);
    if (this.frameTimes.length > this.maxFrameTimeHistory) {
      this.frameTimes.shift();
    }

    this.frameCount++;
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
      
      this.framework.dispatch({
        reducer: (state) => ({
          ...state,
          performance: {
            fps: this.fps,
            avgFrameTime: this.getAverageFrameTime(),
            minFps: this.getMinFps(),
          }
        })
      });
    }

    this.update(this.deltaTime);

    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  // deltaTime is in milliseconds.
  update(deltaTime) {
    // Normalize delta time to prevent huge jumps
    const normalizedDelta = Math.min(deltaTime, GAME_CONFIG.FRAME_TIME * 2);
    
    for (const callback of this.updateCallbacks) {
      callback(normalizedDelta);
    }
  }

  render() {
    for (const callback of this.renderCallbacks) {
      callback();
    }
  }

  onUpdate(callback) {
    this.updateCallbacks.push(callback);
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) this.updateCallbacks.splice(index, 1);
    };
  }

  onRender(callback) {
    this.renderCallbacks.push(callback);
    return () => {
      const index = this.renderCallbacks.indexOf(callback);
      if (index > -1) this.renderCallbacks.splice(index, 1);
    };
  }

  getAverageFrameTime() {
    if (this.frameTimes.length === 0) return 0;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    return (sum / this.frameTimes.length).toFixed(2);
  }

  getMinFps() {
    if (this.frameTimes.length === 0) return 0;
    const maxFrameTime = Math.max(...this.frameTimes);
    return Math.round(1000 / maxFrameTime);
  }

  isPerformanceGood() {
    return this.fps >= GAME_CONFIG.TARGET_FPS - 5; // Allow 5fps tolerance
  }

  setGameState(state) {
    this.gameState = state;
    this.framework.dispatch({
      reducer: (s) => ({ ...s, gameState: state })
    });
  }

  getGameState() {
    return this.gameState;
  }
}
