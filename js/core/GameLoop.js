/**
 * 遊戲循環管理器 (以 requestAnimationFrame 驅動，精確計算 Delta Time)
 */
export class GameLoop {
  constructor(updateFn, renderFn) {
    this.updateFn = updateFn || (() => {});
    this.renderFn = renderFn || (() => {});
    this.lastTime = 0;
    this.rafId = null;
    this.running = false;
    this.boundLoop = this.loop.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.boundLoop);
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  loop(currentTime) {
    if (!this.running) return;

    // 計算以秒為單位的 Delta Time，並加上上限防止切換分頁產生巨大跳躍
    let deltaTime = (currentTime - this.lastTime) / 1000;
    if (deltaTime > 0.1) deltaTime = 0.1;
    this.lastTime = currentTime;

    this.updateFn(deltaTime);
    this.renderFn();

    this.rafId = requestAnimationFrame(this.boundLoop);
  }
}
