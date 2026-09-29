import { DIFFICULTIES } from '../config.js';

/**
 * HUD 介面渲染管理器
 * 負責計時、得分、剩餘蝴蝶結計量、難度切換與勝負橫幅繪製
 */
export class HUD {
  constructor(rootContainer) {
    this.root = rootContainer;

    this.cardEl = null;
    this.diffRowEl = null;
    this.bannerEl = null;
    this.timeValEl = null;
    this.bowsValEl = null;
    this.scoreValEl = null;
    this.boardEl = null;
    this.restartBtn = null;
    this.bgmToggleBtn = null;
    this.sfxToggleBtn = null;
  }

  /**
   * 初始化並渲染完整遊戲卡片介面骨架
   */
  mount() {
    this.root.innerHTML = `
      <div class="game-card">
        <div class="author-tag" title="遊戲作者：小小">
          <span class="author-bow">🎀</span>
          <span class="author-name">作者：小小</span>
        </div>
        <h1>🎀 蝴蝶結踩地雷</h1>
        <p class="subtitle">小心翻開，蝴蝶結藏在格子裡呦～</p>

        <div class="diff-row" id="diffRow">
          ${Object.values(DIFFICULTIES).map(d => `
            <button class="diff-btn" data-diff="${d.id}">${d.name}</button>
          `).join('')}
        </div>

        <div id="banner" class="banner"></div>

        <div class="stats-row">
          <div class="stat-pill">
            <div class="label">⏱ 時間</div>
            <div class="value" id="timeVal">0</div>
          </div>
          <div class="stat-pill">
            <div class="label">🎀 剩餘</div>
            <div class="value" id="bowsVal">0</div>
          </div>
          <div class="stat-pill">
            <div class="label">⭐ 分數</div>
            <div class="value" id="scoreVal">0</div>
          </div>
        </div>

        <div class="board-wrap">
          <div id="board"></div>
        </div>

        <div class="controls-row">
          <button id="restartBtn">🔄 重新開始</button>
          <button id="bgmToggleBtn" class="audio-btn" title="切換背景白噪音">🎵 白噪音: 開</button>
          <button id="sfxToggleBtn" class="audio-btn" title="切換點擊與勝負音效">🔊 音效: 開</button>
        </div>

        <p class="hint">左鍵翻開・右鍵（長按）插旗・點擊數字快速展開 🎗️</p>
      </div>
    `;

    this.cardEl = this.root.querySelector('.game-card');
    this.diffRowEl = this.root.querySelector('#diffRow');
    this.bannerEl = this.root.querySelector('#banner');
    this.timeValEl = this.root.querySelector('#timeVal');
    this.bowsValEl = this.root.querySelector('#bowsVal');
    this.scoreValEl = this.root.querySelector('#scoreVal');
    this.boardEl = this.root.querySelector('#board');
    this.restartBtn = this.root.querySelector('#restartBtn');
    this.bgmToggleBtn = this.root.querySelector('#bgmToggleBtn');
    this.sfxToggleBtn = this.root.querySelector('#sfxToggleBtn');
  }

  /**
   * 更新音訊開關按鈕顯示狀態
   */
  updateAudioButtons(bgmEnabled, sfxEnabled) {
    if (this.bgmToggleBtn) {
      this.bgmToggleBtn.textContent = bgmEnabled ? '🎵 白噪音: 開' : '🎵 白噪音: 關';
      this.bgmToggleBtn.classList.toggle('off', !bgmEnabled);
    }
    if (this.sfxToggleBtn) {
      this.sfxToggleBtn.textContent = sfxEnabled ? '🔊 音效: 開' : '🔇 音效: 關';
      this.sfxToggleBtn.classList.toggle('off', !sfxEnabled);
    }
  }

  /**
   * 更新活躍難度按鈕樣式
   */
  setActiveDifficulty(currentDiff) {
    if (!this.diffRowEl) return;
    const buttons = this.diffRowEl.querySelectorAll('.diff-btn');
    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.diff === currentDiff);
    });
  }

  /**
   * 更新即時資訊 (時間、剩餘蝴蝶結、分數)
   */
  updateStats(time, bowsRemaining, score) {
    if (this.timeValEl) this.timeValEl.textContent = time;
    if (this.bowsValEl) this.bowsValEl.textContent = Math.max(0, bowsRemaining);
    if (this.scoreValEl) this.scoreValEl.textContent = score;
  }

  /**
   * 顯示勝負橫幅狀態
   */
  showBanner(type, message) {
    if (!this.bannerEl) return;
    this.bannerEl.className = `banner ${type}`;
    this.bannerEl.textContent = message;
  }

  /**
   * 隱藏橫幅
   */
  hideBanner() {
    if (!this.bannerEl) return;
    this.bannerEl.className = 'banner';
    this.bannerEl.textContent = '';
  }

  /**
   * 配置棋盤網格樣式與尺寸
   */
  setupBoard(cols, cellSize) {
    if (!this.boardEl) return;
    this.boardEl.style.setProperty('--cell-size', `${cellSize}px`);
    this.boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
    this.boardEl.innerHTML = '';
  }
}
