import { PHYSICS_CONFIG } from '../config.js';
import { Physics } from './Physics.js';

/**
 * 粒子特效系統 (Particle System)
 * 負責觸雷爆炸與通關彩色緞帶紙花之物理動態運算與 Canvas 渲染
 */
export class ParticleSystem {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.particles = [];
    this.confettiInterval = null;

    if (this.canvas) {
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }
  }

  resize() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
  }

  /**
   * 觸雷爆炸特效 (向周圍發散)
   */
  triggerExplosion(x, y) {
    const config = PHYSICS_CONFIG.explosion;
    for (let i = 0; i < config.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin);
      const icon = config.icons[Math.floor(Math.random() * config.icons.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 240,
        drag: PHYSICS_CONFIG.drag,
        size: 20 + Math.random() * 12,
        icon,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 8,
        life: config.lifeTime,
        maxLife: config.lifeTime,
      });
    }
  }

  /**
   * 獲勝紙花與蝴蝶結飄落特效
   */
  triggerWinConfetti() {
    const config = PHYSICS_CONFIG.confetti;
    let spawned = 0;

    if (this.confettiInterval) {
      clearInterval(this.confettiInterval);
    }

    this.confettiInterval = setInterval(() => {
      if (spawned >= config.count) {
        clearInterval(this.confettiInterval);
        this.confettiInterval = null;
        return;
      }

      const icon = config.icons[Math.floor(Math.random() * config.icons.length)];
      const startX = Math.random() * window.innerWidth;
      const speedY = config.speedYMin + Math.random() * (config.speedYMax - config.speedYMin);
      const speedX = (Math.random() - 0.5) * config.spreadX;

      this.particles.push({
        x: startX,
        y: -30,
        vx: speedX,
        vy: speedY,
        gravity: 180,
        drag: 0.99,
        size: 22 + Math.random() * 10,
        icon,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 4,
        life: config.lifeTime + Math.random() * 0.5,
        maxLife: config.lifeTime + 0.5,
      });

      spawned++;
    }, config.spawnInterval);
  }

  /**
   * 清除所有粒子與計時器
   */
  clear() {
    this.particles = [];
    if (this.confettiInterval) {
      clearInterval(this.confettiInterval);
      this.confettiInterval = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  /**
   * 依據 Delta Time 更新所有粒子
   */
  update(dt) {
    if (this.particles.length === 0) return;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      Physics.integrate(p, p.gravity, p.drag, dt);
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * 渲染粒子至 Overlay Canvas
   */
  render() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (this.particles.length === 0) return;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.font = `${p.size}px 'Nunito', 'Segoe UI Emoji', sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(p.icon, 0, 0);
      this.ctx.restore();
    }
  }
}
