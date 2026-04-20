// Всплывающие уведомления в центре экрана и числа урона над врагами.

export class Notifications {
  #renderer;
  #camera;

  #notifications = [];  // Центр экрана
  #damageNumbers = [];  // Над сущностями (в мировых координатах)

  constructor(renderer, camera) {
    this.#renderer = renderer;
    this.#camera = camera;
  }

  // Уведомление по центру экрана
  show(text, duration = 2.5, color = '#ffffff', yOffset = 0) {
    this.#notifications.push({
      text, duration, color, yOffset,
      timer: 0, fadeIn: 0.25,
    });
  }

  // Число урона в мировых координатах
  showDamage(amount, worldX, worldY, color = '#ffffff') {
    this.#damageNumbers.push({
      text: String(Math.floor(amount)),
      worldX: worldX + (Math.random() - 0.5) * 8,
      worldY,
      color,
      vy: -40,   // Плывёт вверх
      timer: 0,
      duration: 0.8,
    });
  }

  update(dt) {
    this.#notifications = this.#notifications.filter(n => {
      n.timer += dt;
      return n.timer < n.duration;
    });

    for (const d of this.#damageNumbers) {
      d.timer += dt;
      d.worldY += d.vy * dt;
      d.vy *= 0.92;  // Замедление подъёма
    }
    this.#damageNumbers = this.#damageNumbers.filter(d => d.timer < d.duration);
  }

  draw() {
    const ctx = this.#renderer.ctx;
    const W = this.#renderer.logicalWidth;
    const H = this.#renderer.logicalHeight;

    // Центральные уведомления
    for (let i = 0; i < this.#notifications.length; i++) {
      const n = this.#notifications[i];
      const t = n.timer / n.duration;

      let alpha;
      if (n.timer < n.fadeIn) alpha = n.timer / n.fadeIn;
      else if (t > 0.7) alpha = 1 - (t - 0.7) / 0.3;
      else alpha = 1;

      const y = H * 0.35 - n.yOffset - i * 14;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 10px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Тень
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillText(n.text, W / 2 + 1, y + 1);
      // Основной
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, W / 2, y);
      ctx.restore();
    }

    // Числа урона
    for (const d of this.#damageNumbers) {
      const screen = this.#camera.worldToScreen(d.worldX, d.worldY);
      const t = d.timer / d.duration;
      const alpha = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillText(d.text, screen.x + 1, screen.y + 1);
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, screen.x, screen.y);
      ctx.restore();
    }
  }
}
