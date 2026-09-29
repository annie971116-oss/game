import { DIFFICULTIES, DEFAULT_DIFFICULTY, getCellSize } from '../config.js';
import { GameLoop } from './GameLoop.js';
import { InputHandler } from './InputHandler.js';
import { Player } from '../entities/Player.js';
import { ObstacleManager } from '../entities/ObstacleManager.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { AudioManager } from '../systems/AudioManager.js';
import { HUD } from '../ui/HUD.js';

/**
 * 遊戲主控制器 (Game State Machine & Coordinator)
 */
export class Game {
  constructor() {
    this.currentDiffKey = DEFAULT_DIFFICULTY;
    this.timer = 0;
    this.timerInterval = null;
    this.gameOver = false;
    this.won = false;

    // 子系統與實體實例化
    this.player = new Player();
    this.obstacleManager = new ObstacleManager();
    this.audioManager = new AudioManager();

    this.containerEl = document.getElementById('game-container');
    this.canvasEl = document.getElementById('fx-canvas');

    this.hud = new HUD(this.containerEl);
    this.particleSystem = new ParticleSystem(this.canvasEl);

    // 輸入處理器綁定遊戲回呼
    this.inputHandler = new InputHandler({
      onCellClick: (r, c, el, e) => this.handleCellClick(r, c, el, e),
      onCellRightClick: (r, c, el, e) => this.handleCellRightClick(r, c, el, e),
      onRestart: () => this.restart(),
      onDifficultyChange: (diffKey) => this.changeDifficulty(diffKey),
    });

    // 遊戲主循環 (以 Delta Time 驅動粒子系統與物理演算)
    this.gameLoop = new GameLoop(
      (dt) => this.update(dt),
      () => this.render()
    );
  }

  /**
   * 初始化遊戲環境
   */
  init() {
    this.hud.mount();
    this.inputHandler.bindGlobalEvents({
      restartBtn: this.hud.restartBtn,
      diffRowElement: this.hud.diffRowEl,
    });

    // 綁定音訊開關按鈕與狀態
    this.bindAudioEvents();
    this.hud.updateAudioButtons(this.audioManager.bgmEnabled, this.audioManager.sfxEnabled);

    // 首次使用者點擊/手勢互動解鎖音訊上下文與白噪音
    const unlockAudio = () => {
      this.audioManager.ensureContextRunning();
      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
    document.addEventListener('pointerdown', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });

    this.gameLoop.start();
    this.restart();
  }

  /**
   * 綁定音訊介面控制事件
   */
  bindAudioEvents() {
    if (this.hud.bgmToggleBtn) {
      this.hud.bgmToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const enabled = this.audioManager.toggleBGM();
        this.hud.updateAudioButtons(enabled, this.audioManager.sfxEnabled);
        this.audioManager.playClick('reveal');
      });
    }

    if (this.hud.sfxToggleBtn) {
      this.hud.sfxToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const enabled = this.audioManager.toggleSFX();
        this.hud.updateAudioButtons(this.audioManager.bgmEnabled, enabled);
        if (enabled) this.audioManager.playClick('flag');
      });
    }
  }

  /**
   * 切換難度並重置遊戲
   */
  changeDifficulty(diffKey) {
    if (!DIFFICULTIES[diffKey]) return;
    this.currentDiffKey = diffKey;
    this.restart();
  }

  /**
   * 重置並啟動新局
   */
  restart() {
    const config = DIFFICULTIES[this.currentDiffKey];
    this.gameOver = false;
    this.won = false;
    this.timer = 0;
    clearInterval(this.timerInterval);
    this.timerInterval = null;

    if (this.audioManager && this.audioManager.isInitialized) {
      this.audioManager.playClick('reveal');
    }

    this.player.reset();
    this.obstacleManager.initGrid(config.rows, config.cols, config.bows);
    this.particleSystem.clear();

    this.hud.setActiveDifficulty(this.currentDiffKey);
    this.hud.hideBanner();
    this.updateStats();

    // 建立棋盤 DOM 節點並綁定事件
    const cellSize = getCellSize(config.cols);
    this.hud.setupBoard(config.cols, cellSize);

    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const cell = this.obstacleManager.getCell(r, c);
        const btn = document.createElement('button');
        btn.className = 'cell';
        btn.dataset.r = r;
        btn.dataset.c = c;

        cell.element = btn;
        this.inputHandler.bindCellEvents(btn, r, c);
        this.hud.boardEl.appendChild(btn);
        cell.render();
      }
    }
  }

  /**
   * 處理格子左鍵點擊 (翻開或和弦雙向展開)
   */
  handleCellClick(r, c, cellElement, event) {
    if (this.gameOver) return;

    const cell = this.obstacleManager.getCell(r, c);
    if (!cell || cell.flagged) return;

    // 若已翻開且有相鄰地雷數字，觸發和弦雙向展開 (Chord)
    if (cell.revealed && cell.adjacent > 0) {
      const chordResult = this.obstacleManager.handleChord(r, c, this.player);
      if (chordResult.performed) {
        if (chordResult.hit) {
          // 標記錯誤踩爆蝴蝶結
          this.audioManager.playDefeat();
          const hitCell = this.obstacleManager.getCell(chordResult.hitRow, chordResult.hitCol);
          this.triggerBowExplosion(hitCell.element);
          this.obstacleManager.revealAllBows(chordResult.hitRow, chordResult.hitCol);
          this.endGame(false);
          return;
        }
        this.audioManager.playClick('chord');
        this.checkWin();
        this.renderAllCells();
      }
      return;
    }

    if (cell.revealed) return;

    // 首擊防雷安全保護機制
    if (!this.obstacleManager.firstClickDone) {
      this.obstacleManager.placeBows(r, c);
      this.startTimer();
    }

    // 踩雷判定
    if (cell.isBow) {
      this.audioManager.playDefeat();
      this.triggerBowExplosion(cellElement);
      this.obstacleManager.revealAllBows(r, c);
      this.endGame(false);
      return;
    }

    // 安全格泛洪展開
    this.audioManager.playClick('reveal');
    this.obstacleManager.floodReveal(r, c, this.player);
    this.checkWin();
    this.renderAllCells();
  }

  /**
   * 處理格子右鍵或長按插旗
   */
  handleCellRightClick(r, c, cellElement, event) {
    if (this.gameOver) return;

    const cell = this.obstacleManager.getCell(r, c);
    if (!cell) return;

    const flagResult = this.player.toggleFlag(cell, this.obstacleManager.bowCount);
    if (flagResult !== null) {
      this.audioManager.playClick('flag');
    }
    this.updateStats();
  }

  /**
   * 觸發爆炸粒子特效
   */
  triggerBowExplosion(element) {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    this.particleSystem.triggerExplosion(centerX, centerY);
  }

  /**
   * 檢驗勝負條件
   */
  checkWin() {
    if (this.obstacleManager.isWinConditionMet()) {
      this.endGame(true);
    }
  }

  /**
   * 遊戲結束流程結算
   */
  endGame(isWin) {
    this.gameOver = true;
    this.won = isWin;
    clearInterval(this.timerInterval);
    this.timerInterval = null;

    if (isWin) {
      this.audioManager.playVictory();
      const bonus = this.player.addWinBonus(this.timer);
      this.hud.showBanner('win', `🎉 太棒了！全部蝴蝶結都找出來了！ +${bonus} 分獎勵`);
      this.obstacleManager.flagAllBows();
      this.particleSystem.triggerWinConfetti();
    } else {
      this.audioManager.playDefeat();
      this.hud.showBanner('lose', '💔 踩到蝴蝶結了，再試一次吧！');
    }

    this.updateStats();
    this.renderAllCells();
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timer++;
      this.hud.updateStats(
        this.timer,
        this.obstacleManager.bowCount - this.player.flagsPlaced,
        this.player.score
      );
    }, 1000);
  }

  updateStats() {
    this.hud.updateStats(
      this.timer,
      this.obstacleManager.bowCount - this.player.flagsPlaced,
      this.player.score
    );
  }

  renderAllCells() {
    for (let r = 0; r < this.obstacleManager.rows; r++) {
      for (let c = 0; c < this.obstacleManager.cols; c++) {
        this.obstacleManager.getCell(r, c)?.render();
      }
    }
    this.updateStats();
  }

  /**
   * 循環物理更新
   */
  update(dt) {
    this.particleSystem.update(dt);
  }

  /**
   * 循環特效渲染
   */
  render() {
    this.particleSystem.render();
  }
}
