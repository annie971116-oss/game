/**
 * 遊戲整體常數與設定配置
 */
export const DIFFICULTIES = {
  easy: {
    id: 'easy',
    name: '簡單 8×8・10',
    rows: 8,
    cols: 8,
    bows: 10,
  },
  medium: {
    id: 'medium',
    name: '中等 10×10・16',
    rows: 10,
    cols: 10,
    bows: 16,
  },
  hard: {
    id: 'hard',
    name: '困難 12×12・24',
    rows: 12,
    cols: 12,
    bows: 24,
  },
  extreme: {
    id: 'extreme',
    name: '地獄 20×20・100',
    rows: 20,
    cols: 20,
    bows: 100,
  },
};

export const DEFAULT_DIFFICULTY = 'medium';

/**
 * 依據欄數計算最佳格子尺寸 (px)
 */
export function getCellSize(cols) {
  if (cols <= 8) return 38;
  if (cols <= 10) return 33;
  if (cols <= 12) return 28;
  return 24; // 20x20 地獄模式高解析度配置
}

/**
 * 輸入控制相關設定
 */
export const INPUT_CONFIG = {
  longPressDelay: 380, // 手機觸控長按判定延遲 (ms)
};

/**
 * 分數與計時規則配置
 */
export const SCORE_CONFIG = {
  revealSafeCellPoints: 10,
  winBaseBonus: 100,
  timeBonusMax: 500,
  timeBonusDecayRate: 2,
};

/**
 * 物理引擎與粒子系統設定
 */
export const PHYSICS_CONFIG = {
  gravity: 420, // 重力加速度 (px/s^2)
  drag: 0.985,  // 空氣阻尼
  explosion: {
    count: 24,
    speedMin: 80,
    speedMax: 220,
    lifeTime: 0.85,
    icons: ['🎀', '✨', '🌸', '💖', '💥'],
  },
  confetti: {
    count: 55,
    speedYMin: 220,
    speedYMax: 500,
    spreadX: 160,
    lifeTime: 1.5,
    spawnInterval: 35, // 毫秒生成間隔
    icons: ['🎀', '✨', '🌟', '💖', '🌸', '🎊'],
  },
};
