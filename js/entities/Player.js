import { Entity } from './Entity.js';
import { SCORE_CONFIG } from '../config.js';

/**
 * 玩家實體 (代表當前遊玩者之狀態、插旗計數與分數管理)
 */
export class Player extends Entity {
  constructor() {
    super(0, 0, 'player-1');
    this.score = 0;
    this.flagsPlaced = 0;
    this.revealedCount = 0;
  }

  reset() {
    this.score = 0;
    this.flagsPlaced = 0;
    this.revealedCount = 0;
  }

  addRevealScore() {
    this.score += SCORE_CONFIG.revealSafeCellPoints;
    this.revealedCount++;
  }

  addWinBonus(timeSpent) {
    const timeBonus = Math.max(0, SCORE_CONFIG.timeBonusMax - timeSpent * SCORE_CONFIG.timeBonusDecayRate);
    const totalBonus = timeBonus + SCORE_CONFIG.winBaseBonus;
    this.score += totalBonus;
    return totalBonus;
  }

  /**
   * 變更旗幟標記狀態
   * @returns {boolean|null} true: 成功插旗, false: 成功拔旗, null: 無法操作 (達到上限或已翻開)
   */
  toggleFlag(cell, maxFlags) {
    if (cell.revealed) return null;

    if (!cell.flagged && this.flagsPlaced >= maxFlags) {
      return null; // 超過最大蝴蝶結數量限制
    }

    cell.flagged = !cell.flagged;
    this.flagsPlaced += cell.flagged ? 1 : -1;
    cell.render();

    return cell.flagged;
  }
}
