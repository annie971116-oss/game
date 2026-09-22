import { Entity } from './Entity.js';

/**
 * 棋盤格子實體 (代表地雷格或安全格)
 */
export class Cell extends Entity {
  constructor(row, col) {
    super(col, row, `cell-${row}-${col}`);
    this.row = row;
    this.col = col;

    this.isBow = false;      // 是否為蝴蝶結地雷
    this.adjacent = 0;       // 周圍蝴蝶結地雷數量 (0~8)
    this.revealed = false;   // 是否已被翻開
    this.flagged = false;    // 是否已被標記旗子
    this.isHit = false;      // 是否為直接踩爆的蝴蝶結

    this.element = null;     // 對應之 DOM 元素參照
  }

  reset() {
    this.isBow = false;
    this.adjacent = 0;
    this.revealed = false;
    this.flagged = false;
    this.isHit = false;
  }

  /**
   * 根據當前狀態更新 DOM 節點渲染外觀
   */
  render() {
    if (!this.element) return;

    this.element.className = 'cell';
    this.element.innerHTML = '';

    if (this.revealed) {
      this.element.classList.add('revealed');
      if (this.isBow) {
        this.element.textContent = '🎀';
        if (this.isHit) {
          this.element.classList.add('bow-hit');
        }
      } else if (this.adjacent > 0) {
        this.element.textContent = this.adjacent;
        this.element.classList.add(`n${this.adjacent}`);
      }
    } else {
      if (this.flagged) {
        const flagSpan = document.createElement('span');
        flagSpan.className = 'flag';
        flagSpan.textContent = '🎗️';
        this.element.appendChild(flagSpan);
      }
    }
  }
}
