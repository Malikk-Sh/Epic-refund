// Лёгкая система частиц на Canvas 2D.
// Используем ObjectPool для переиспользования.

import { ObjectPool } from '../utils/ObjectPool.js';
import { BALANCE } from '../data/balance.js';

const MAX = BALANCE.performance.maxParticles;

export class ParticleSystem {
  #pool;
  #camera;

  constructor(camera) {
    this.#camera = camera;

    this.#pool = new ObjectPool(
      () => ({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1,
        color: '#fff', size: 2,
        gravity: 0,
        update(dt) {
          this.life -= dt;
          if (this.life <= 0) return false;
          this.x += this.vx * dt;
          this.y += this.vy * dt;
          this.vy += this.gravity * dt;
          // Затухание скорости
          this.vx *= 0.98;
          this.vy *= 0.98;
          return true;
        },
      }),
      (p, opts) => {
        p.x = opts.x;
        p.y = opts.y;
        p.vx = opts.vx ?? 0;
        p.vy = opts.vy ?? 0;
        p.life = p.maxLife = opts.life ?? 0.5;
        p.color = opts.color ?? '#fff';
        p.size = opts.size ?? 2;
        p.gravity = opts.gravity ?? 0;
      },
      MAX
    );
  }

  update(dt) {
    this.#pool.update(dt);
  }

  draw() {
    const ctx = this.#camera ? null : null;  // получаем ctx через camera? нет
    // Этот метод будет вызван из GameScene с переданным ctx — см. ниже
  }

  // Рендер вызывается явно из сцены (чтобы использовать тот же ctx)
  render(ctx) {
    this.#pool.forEach(p => {
      const alpha = Math.max(0, p.life / p.maxLife);
      const screen = this.#camera.worldToScreen(p.x, p.y);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(
        Math.round(screen.x - p.size / 2),
        Math.round(screen.y - p.size / 2),
        p.size,
        p.size
      );
      ctx.restore();
    });
  }

  // === ГОТОВЫЕ ЭФФЕКТЫ ===

  hitSparks(x, y, color = '#ffcc44', count = 5) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 40;
      this.#pool.acquire({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.25 + Math.random() * 0.15,
        color, size: 2,
      });
    }
  }

  blood(x, y, dirX, dirY, count = 8) {
    for (let i = 0; i < count; i++) {
      const a = Math.atan2(dirY, dirX) + (Math.random() - 0.5);
      const s = 40 + Math.random() * 60;
      this.#pool.acquire({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.3 + Math.random() * 0.2,
        color: '#aa2222', size: 2,
      });
    }
  }

  skillShatter(x, y, color) {
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 50 + Math.random() * 80;
      this.#pool.acquire({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.8 + Math.random() * 0.4,
        color, size: 2,
      });
    }
  }

  dust(x, y, count = 4) {
    for (let i = 0; i < count; i++) {
      this.#pool.acquire({
        x: x + (Math.random() - 0.5) * 10,
        y,
        vx: (Math.random() - 0.5) * 20,
        vy: -20 - Math.random() * 20,
        life: 0.4,
        color: '#8a7a6a', size: 2,
      });
    }
  }
}
