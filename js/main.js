import { Game } from './core/Game.js';

/**
 * 應用程式進入點 (Main Entry Point)
 * 監聽 DOM 載入後實例化 Game 控制器並啟動遊戲循環
 */
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();

  // 提供開發與測試環境之除錯掛載
  window.__GAME_INSTANCE__ = game;
});
