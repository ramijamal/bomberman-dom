export class AudioManager {
  constructor() {
    this.sounds = new Map();
    this.pools = new Map();       
    this.poolIndex = new Map();   
    this.musicVolume = 0.1;
    this.sfxVolume = 0.5;
    this.muted = false;
    this.initialized = false;

    this.audioFiles = {
      bombPlace: './assets/audio/sfx_bomb_drop.wav',
      explosion: './assets/audio/sfx_explosion.wav',
      playerHit: './assets/audio/sfx_damage.wav',
      powerup: './assets/audio/sfx_powerup.wav',
      gameStart: './assets/audio/sfx_game_start.mp3',
      gameOver: './assets/audio/sfx_game_over.mp3',
      countdown: './assets/audio/sfx_countdown.mp3',
      background: './assets/audio/sfx_background.mp3',
    };

    this.poolSizes = {
      bombPlace: 3,
      explosion: 5,    
      playerHit: 3,
      powerup: 2,
      gameStart: 1,
      gameOver: 1,
      countdown: 1,
    };

    this.backgroundMusic = null;
    this.musicRequested = false;
    this.pendingAudio = new Set();
    this.retryAudio = () => {
      if (this.muted) return;
      const pending = [...this.pendingAudio];
      this.pendingAudio.clear();
      for (const audio of pending) this.tryPlay(audio);
    };
  }

  init() {
    if (this.initialized) return;

    for (const [name, path] of Object.entries(this.audioFiles)) {
      this.preloadSound(name, path);
      const poolSize = this.poolSizes[name];
      if (poolSize) {
        this.createPool(name, path, poolSize);
      }
    }

    window.addEventListener('pointerdown', this.retryAudio);
    window.addEventListener('keydown', this.retryAudio);
    this.initialized = true;
    console.log('🔊 AudioManager initialized (pooled)');
  }

  preloadSound(name, path) {
    const audio = new Audio();
    audio.src = path;
    audio.preload = 'auto';

    audio.onerror = () => {
      console.warn(`⚠️ Could not load audio: ${path}`);
    };

    this.sounds.set(name, audio);
  }


  createPool(name, path, size) {
    const pool = [];
    for (let i = 0; i < size; i++) {
      const audio = new Audio();
      audio.src = path;
      audio.preload = 'auto';
      pool.push(audio);
    }
    this.pools.set(name, pool);
    this.poolIndex.set(name, 0);
  }


  tryPlay(audio) {
    audio.play().then(() => this.pendingAudio.delete(audio)).catch(error => {
      if (error.name === 'NotAllowedError' && !this.muted &&
          (audio !== this.backgroundMusic || this.musicRequested)) {
        this.pendingAudio.add(audio);
      }
    });
  }

  play(name, volume = null) {
    if (this.muted) return;

    const pool = this.pools.get(name);
    if (!pool || pool.length === 0) {
      // Fallback for sounds without a pool (shouldn't happen for SFX)
      const sound = this.sounds.get(name);
      if (!sound) return;
      const clone = sound.cloneNode();
      clone.volume = volume !== null ? volume : this.sfxVolume;
      this.tryPlay(clone);
      return;
    }

    let idx = this.poolIndex.get(name);
    const audio = pool[idx];
    idx = (idx + 1) % pool.length;
    this.poolIndex.set(name, idx);

    audio.currentTime = 0;
    audio.volume = volume !== null ? volume : this.sfxVolume;
    this.tryPlay(audio);
  }

  playBombPlace() {
    this.play('bombPlace', 0.4);
  }

  playExplosion() {
    this.play('explosion', 0.6);
  }

  playPlayerHit() {
    this.play('playerHit', 0.5);
  }

  playPowerUp() {
    this.play('powerup', 0.5);
  }

  playGameStart() {
    this.play('gameStart', 0.5);
  }

  playGameOver() {
    this.play('gameOver', 0.5);
  }

  playCountdown() {
    this.play('countdown', 0.6);
  }

  startBackgroundMusic() {
    if (this.muted) return;

    const music = this.sounds.get('background');
    if (!music) return;

    this.backgroundMusic = music;
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = this.musicVolume;

    this.musicRequested = true;
    this.tryPlay(this.backgroundMusic);
  }

  stopBackgroundMusic() {
    this.musicRequested = false;
    this.pendingAudio.clear();
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }
  }

  toggleMute() {
    this.muted = !this.muted;

    if (this.muted) {
      this.stopBackgroundMusic();
    } else {
      this.startBackgroundMusic();
    }

    return this.muted;
  }

  // Volume is clamped to 0–1.
  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  // Volume is clamped to 0–1.
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.musicVolume;
    }
  }
}

let audioManagerInstance = null;

export function getAudioManager() {
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager();
  }
  return audioManagerInstance;
}