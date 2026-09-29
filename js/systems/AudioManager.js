/**
 * 音效與背景白噪音音訊管理器 (Web Audio API 模組)
 * 支援：
 * 1. 舒緩聚焦背景白噪音（粉紅噪音低通濾波，模擬溫柔細雨與微風，安撫專注）
 * 2. 翻開格子、和弦展開、插旗之點擊回饋音效
 * 3. 勝利歡慶大和弦琶音音效 (Victory Fanfare)
 * 4. 失敗萌感踩雷音效 (Defeat SFX)
 * 5. 瀏覽器 Autoplay 規範自動解鎖與個別開關狀態記憶 (localStorage)
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.bgmNode = null;
    this.bgmGainNode = null;
    this.sfxGainNode = null;
    this.masterGainNode = null;

    // 狀態設定（從 localStorage 讀取或預設啟用）
    this.isMuted = localStorage.getItem('bow_minesweeper_muted') === 'true';
    this.bgmEnabled = localStorage.getItem('bow_minesweeper_bgm') !== 'false';
    this.sfxEnabled = localStorage.getItem('bow_minesweeper_sfx') !== 'false';

    this.isInitialized = false;
    this.bgmVolume = 0.16; // 白噪音舒緩背景音量
    this.sfxVolume = 0.32; // 音效適中音量
  }

  /**
   * 初始化 Web Audio 上下文 (遵守瀏覽器手勢互動解鎖政策)
   */
  init() {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('此瀏覽器不支援 Web Audio API');
        return;
      }

      this.ctx = new AudioCtx();

      // 建立主音量與子音量節點
      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
      this.masterGainNode.connect(this.ctx.destination);

      this.bgmGainNode = this.ctx.createGain();
      this.bgmGainNode.gain.setValueAtTime(this.bgmEnabled && !this.isMuted ? this.bgmVolume : 0, this.ctx.currentTime);
      this.bgmGainNode.connect(this.masterGainNode);

      this.sfxGainNode = this.ctx.createGain();
      this.sfxGainNode.gain.setValueAtTime(this.sfxEnabled && !this.isMuted ? this.sfxVolume : 0, this.ctx.currentTime);
      this.sfxGainNode.connect(this.masterGainNode);

      // 產生柔和粉紅/白噪音音軌並啟動
      this.setupWhiteNoiseBGM();

      this.isInitialized = true;
    } catch (err) {
      console.error('AudioManager 初始化失敗:', err);
    }
  }

  /**
   * 確保 AudioContext 已從 suspended 狀態喚醒
   */
  ensureContextRunning() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * 建立多重低通濾波之舒緩白噪音/粉紅噪音 (5秒無縫循環)
   */
  setupWhiteNoiseBGM() {
    if (!this.ctx) return;

    const sampleRate = this.ctx.sampleRate;
    const duration = 5;
    const bufferSize = sampleRate * duration;
    const noiseBuffer = this.ctx.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const output = noiseBuffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      // 使用 Paul Kellet 濾波算法產生柔和的 1/f 粉紅噪音（聽感如同舒適細雨，徹底去除刺耳高頻）
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;
        output[i] = pink * 0.085;
      }
    }

    this.bgmNode = this.ctx.createBufferSource();
    this.bgmNode.buffer = noiseBuffer;
    this.bgmNode.loop = true;

    // 通過低通濾波器與微共鳴，營造冥想放鬆感
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.6, this.ctx.currentTime);

    this.bgmNode.connect(filter);
    filter.connect(this.bgmGainNode);
    this.bgmNode.start(0);
  }

  /**
   * 點擊音效：支援安全翻開 (reveal)、插旗 (flag)、和弦展開 (chord)
   */
  playClick(type = 'reveal') {
    this.ensureContextRunning();
    if (!this.ctx || this.isMuted || !this.sfxEnabled) return;

    const t = this.ctx.currentTime;

    if (type === 'flag') {
      // 蝴蝶結插旗音效：清脆靈巧的雙音高音風鈴 (880Hz -> 1320Hz)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(1320, t + 0.08);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGainNode);

      osc.start(t);
      osc.stop(t + 0.12);
    } else if (type === 'chord') {
      // 和弦雙擊展開：雙重快速氣泡音
      this.playBubblePop(t, 520, 260, 0.04);
      this.playBubblePop(t + 0.045, 680, 340, 0.045);
    } else {
      // 一般安全翻格：Q彈水滴氣泡點擊音
      this.playBubblePop(t, 460 + Math.random() * 80, 220, 0.05);
    }
  }

  /**
   * 輔助合成單次微秒氣泡彈出音 (Bubble Pop)
   */
  playBubblePop(startTime, startFreq, endFreq, duration) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

    gain.gain.setValueAtTime(0.22, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * 勝利音效 (Victory Fanfare)：大三和弦喜悅琶音 + 閃爍共鳴
   */
  playVictory() {
    this.ensureContextRunning();
    if (!this.ctx || this.isMuted || !this.sfxEnabled) return;

    const t = this.ctx.currentTime;
    // 勝利歡慶音階：C5, E5, G5, B5, C6, E6, G6
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.18 },
      { freq: 659.25, time: 0.12, dur: 0.18 },
      { freq: 783.99, time: 0.24, dur: 0.20 },
      { freq: 987.77, time: 0.36, dur: 0.22 },
      { freq: 1046.50, time: 0.48, dur: 0.28 },
      { freq: 1318.51, time: 0.62, dur: 0.35 },
      { freq: 1567.98, time: 0.80, dur: 0.85 },
    ];

    notes.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, t + note.time);

      gain.gain.setValueAtTime(0.24, t + note.time);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.time + note.dur);

      osc.connect(gain);
      gain.connect(this.sfxGainNode);

      osc.start(t + note.time);
      osc.stop(t + note.time + note.dur);
    });
  }

  /**
   * 失敗音效 (Defeat SFX)：萌感踩雷噗通低頻滑音 + 柔和碎裂聲
   */
  playDefeat() {
    this.ensureContextRunning();
    if (!this.ctx || this.isMuted || !this.sfxEnabled) return;

    const t = this.ctx.currentTime;

    // 1. 溫和的低頻悶響滑音 (320Hz -> 65Hz)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.42);

    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(t);
    osc.stop(t + 0.45);

    // 2. 伴隨低通白噪音微爆聲（模擬蝴蝶結碎屑飄散）
    const noiseLen = 0.28;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * noiseLen, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.25));
    }

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(450, t);
    noiseFilter.Q.setValueAtTime(1.5, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + noiseLen);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGainNode);

    noiseSrc.start(t);
  }

  /**
   * 切換背景白噪音開關
   */
  toggleBGM() {
    this.ensureContextRunning();
    this.bgmEnabled = !this.bgmEnabled;
    localStorage.setItem('bow_minesweeper_bgm', this.bgmEnabled);

    if (this.bgmGainNode && this.ctx) {
      const targetGain = this.bgmEnabled && !this.isMuted ? this.bgmVolume : 0;
      this.bgmGainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bgmGainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
    }
    return this.bgmEnabled;
  }

  /**
   * 切換點擊與勝負音效開關
   */
  toggleSFX() {
    this.ensureContextRunning();
    this.sfxEnabled = !this.sfxEnabled;
    localStorage.setItem('bow_minesweeper_sfx', this.sfxEnabled);

    if (this.sfxGainNode && this.ctx) {
      const targetGain = this.sfxEnabled && !this.isMuted ? this.sfxVolume : 0;
      this.sfxGainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.sfxGainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    return this.sfxEnabled;
  }
}
