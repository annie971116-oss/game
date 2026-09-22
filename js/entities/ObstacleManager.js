import { Entity } from './Entity.js';
import { Cell } from './Cell.js';

/**
 * 障礙/地雷管理類別 (Obstacle / Bow Hazard Manager)
 * 負責地雷棋盤生成、首擊安全防護、相鄰數字計算、泛洪揭開與和弦雙向展開
 */
export class ObstacleManager extends Entity {
  constructor() {
    super(0, 0, 'obstacle-manager');
    this.rows = 0;
    this.cols = 0;
    this.bowCount = 0;
    this.totalSafeCells = 0;
    this.revealedSafeCount = 0;
    this.firstClickDone = false;
    this.grid = []; // Cell[][]
  }

  /**
   * 初始化棋盤資料矩陣
   */
  initGrid(rows, cols, bowCount) {
    this.rows = rows;
    this.cols = cols;
    this.bowCount = bowCount;
    this.totalSafeCells = rows * cols - bowCount;
    this.revealedSafeCount = 0;
    this.firstClickDone = false;

    this.grid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push(new Cell(r, c));
      }
      this.grid.push(row);
    }
  }

  getCell(row, col) {
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      return this.grid[row][col];
    }
    return null;
  }

  /**
   * 佈署地雷 (以首擊安全座標為中心 3x3 區域排除地雷)
   */
  placeBows(safeR, safeC) {
    const forbidden = new Set();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = safeR + dr;
        const cc = safeC + dc;
        if (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols) {
          forbidden.add(`${rr}-${cc}`);
        }
      }
    }

    let placed = 0;
    while (placed < this.bowCount) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);
      const key = `${r}-${c}`;

      if (forbidden.has(key)) continue;
      if (this.grid[r][c].isBow) continue;

      this.grid[r][c].isBow = true;
      placed++;
    }

    this.computeAdjacents();
    this.firstClickDone = true;
  }

  /**
   * 計算非地雷格周圍九宮格的地雷數
   */
  computeAdjacents() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c].isBow) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const rr = r + dr;
            const cc = c + dc;
            if (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols && this.grid[rr][cc].isBow) {
              count++;
            }
          }
        }
        this.grid[r][c].adjacent = count;
      }
    }
  }

  /**
   * 泛洪擴展揭開演算法 (當點擊周圍地雷數為 0 時連鎖展開)
   */
  floodReveal(startR, startC, player) {
    const stack = [[startR, startC]];
    const seen = new Set();
    const affected = [];

    while (stack.length > 0) {
      const [cr, cc] = stack.pop();
      const key = `${cr}-${cc}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const cell = this.grid[cr][cc];
      if (cell.revealed || cell.flagged) continue;

      cell.revealed = true;
      this.revealedSafeCount++;
      if (player) player.addRevealScore();
      affected.push(cell);

      if (cell.adjacent === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const rr = cr + dr;
            const ccx = cc + dc;
            if (rr >= 0 && rr < this.rows && ccx >= 0 && ccx < this.cols && !this.grid[rr][ccx].revealed) {
              stack.push([rr, ccx]);
            }
          }
        }
      }
    }

    return affected;
  }

  /**
   * 雙向展開和弦 (Chord) 判定
   */
  handleChord(r, c, player) {
    const cell = this.grid[r][c];
    if (!cell.revealed || cell.adjacent === 0) return { performed: false };

    let flagCount = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols) {
          if (this.grid[rr][cc].flagged) flagCount++;
        }
      }
    }

    if (flagCount !== cell.adjacent) {
      return { performed: false };
    }

    // 旗子數量吻合，展開剩餘鄰近格子
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols) {
          const target = this.grid[rr][cc];
          if (!target.revealed && !target.flagged) {
            if (target.isBow) {
              // 標記錯誤踩爆地雷
              return { performed: true, hit: true, hitRow: rr, hitCol: cc };
            }
            this.floodReveal(rr, cc, player);
          }
        }
      }
    }

    return { performed: true, hit: false };
  }

  /**
   * 翻開全部蝴蝶結地雷 (觸雷遊戲結束時)
   */
  revealAllBows(hitR, hitC) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (cell.isBow) {
          cell.revealed = true;
          if (r === hitR && c === hitC) {
            cell.isHit = true;
          }
        }
      }
    }
  }

  /**
   * 通關時將所有蝴蝶結標記為旗幟
   */
  flagAllBows() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c].isBow) {
          this.grid[r][c].flagged = true;
        }
      }
    }
  }

  isWinConditionMet() {
    return this.revealedSafeCount >= this.totalSafeCells;
  }
}
