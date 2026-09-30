/* ==========================================================================
   蝴蝶結踩地雷 - Web Audio API 音樂與音效引擎 (Zero Dependencies)
   ========================================================================== */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.bgmEnabled = localStorage.getItem('kuromi_bgm') !== 'false';
    this.sfxEnabled = localStorage.getItem('kuromi_sfx') !== 'false';
    this.masterVolume = parseFloat(localStorage.getItem('kuromi_vol') || '0.7');
    this.bgmLooping = false;
    this.bgmTimer = null;
    
    // Web Audio synthesizer oscillator notes for Kuromi melody
    this.melodyNotes = [
      659.25, 659.25, 659.25, 523.25, 659.25, 783.99, 392.00,
      523.25, 392.00, 329.63, 440.00, 493.88, 466.16, 440.00,
      392.00, 659.25, 783.99, 880.00, 698.46, 783.99, 659.25
    ];
    this.noteStep = 0;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setBGM(enabled) {
    this.bgmEnabled = enabled;
    localStorage.setItem('kuromi_bgm', enabled);
    if (enabled) {
      this.startBGM();
    } else {
      this.stopBGM();
    }
  }

  setSFX(enabled) {
    this.sfxEnabled = enabled;
    localStorage.setItem('kuromi_sfx', enabled);
  }

  setVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('kuromi_vol', this.masterVolume);
  }

  // 點擊翻開方格音效 (Cute high chime pop)
  playClick() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(this.masterVolume * 0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // 放置/取消骷顱頭標記音效 (Skull tap)
  playFlag() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(this.masterVolume * 0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // 踩雷爆破音效
  playExplosion() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Low noise / frequency drop oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);

    gain.gain.setValueAtTime(this.masterVolume * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  // 勝利歡呼音效
  playVictory() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const startTime = this.ctx.currentTime + idx * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(this.masterVolume * 0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  // 背景音樂 (BGM) 8-Bit Chiptune Lullaby Synthesizer
  startBGM() {
    if (!this.bgmEnabled || this.bgmLooping) return;
    this.initContext();
    if (!this.ctx) return;

    this.bgmLooping = true;
    this.playNextBGMStep();
  }

  playNextBGMStep() {
    if (!this.bgmEnabled || !this.bgmLooping) return;

    const freq = this.melodyNotes[this.noteStep % this.melodyNotes.length];
    this.noteStep++;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(this.masterVolume * 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);

    this.bgmTimer = setTimeout(() => {
      this.playNextBGMStep();
    }, 280);
  }

  stopBGM() {
    this.bgmLooping = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

window.soundEngine = new SoundEngine();
