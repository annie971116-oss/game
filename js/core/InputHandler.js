import { INPUT_CONFIG } from '../config.js';

/**
 * 輸入控制處理器 (集中監聽滑鼠、觸控與鍵盤事件)
 */
export class InputHandler {
  constructor(callbacks = {}) {
    this.callbacks = {
      onCellClick: callbacks.onCellClick || (() => {}),
      onCellRightClick: callbacks.onCellRightClick || (() => {}),
      onRestart: callbacks.onRestart || (() => {}),
      onDifficultyChange: callbacks.onDifficultyChange || (() => {}),
      ...callbacks,
    };

    this.isLongPressAction = false;
    this.pressTimer = null;
    this.touchStartTarget = null;
  }

  /**
   * 綁定棋盤方格的事件
   */
  bindCellEvents(cellElement, row, col) {
    // 1. 滑鼠左鍵點擊 (揭開或雙向展開和弦)
    cellElement.addEventListener('click', (e) => {
      if (this.isLongPressAction) {
        this.isLongPressAction = false;
        return;
      }
      this.callbacks.onCellClick(row, col, cellElement, e);
    });

    // 2. 滑鼠右鍵點擊 (插旗/取消插旗)
    cellElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.callbacks.onCellRightClick(row, col, cellElement, e);
    });

    // 3. 行動端長按插旗支援 (防止與點擊手勢衝突)
    cellElement.addEventListener('touchstart', (e) => {
      this.isLongPressAction = false;
      this.touchStartTarget = cellElement;
      this.pressTimer = setTimeout(() => {
        this.isLongPressAction = true;
        this.callbacks.onCellRightClick(row, col, cellElement, e);
      }, INPUT_CONFIG.longPressDelay);
    }, { passive: true });

    cellElement.addEventListener('touchend', () => {
      this.cancelLongPress();
    });

    cellElement.addEventListener('touchmove', () => {
      this.cancelLongPress();
    });

    cellElement.addEventListener('touchcancel', () => {
      this.cancelLongPress();
    });
  }

  cancelLongPress() {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }

  /**
   * 綁定介面控制項 (重新開始、難度切換與鍵盤快捷鍵)
   */
  bindGlobalEvents({ restartBtn, diffRowElement }) {
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.callbacks.onRestart();
      });
    }

    if (diffRowElement) {
      diffRowElement.addEventListener('click', (e) => {
        const btn = e.target.closest('.diff-btn');
        if (!btn || !btn.dataset.diff) return;
        this.callbacks.onDifficultyChange(btn.dataset.diff);
      });
    }

    // 鍵盤快捷鍵監聽 (例如按 R 重新開始)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        if (!['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
          this.callbacks.onRestart();
        }
      }
    });
  }
}
