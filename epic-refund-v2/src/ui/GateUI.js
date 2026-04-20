// UI Врат Забвения. Открывается при взаимодействии с Вратами.
// Показывает список удаляемых навыков, клавишами 1-7 выбирается жертва.

const BRANCH_COLORS = {
  strength: '#e74c3c',
  magic:    '#3498db',
  defense:  '#f1c40f',
  agility:  '#2ecc71',
  aura:     '#9b59b6',
};

export class GateUI {
  #renderer;
  #gateSystem;
  #eventBus;

  #visible = false;
  #removableList = [];
  #selectedIndex = 0;

  constructor(renderer, gateSystem, eventBus) {
    this.#renderer = renderer;
    this.#gateSystem = gateSystem;
    this.#eventBus = eventBus;
  }

  show() {
    if (!this.#gateSystem.isActive()) return;
    this.#removableList = this.#gateSystem.getRemovableForCurrentGate();
    if (this.#removableList.length === 0) return;
    this.#visible = true;
    this.#selectedIndex = 0;
  }

  hide() {
    this.#visible = false;
  }

  update(dt, input) {
    if (!this.#visible) return;

    // Навигация стрелками / WASD
    if (input.isPressed('up') || input.isPressed('left')) {
      this.#selectedIndex = (this.#selectedIndex - 1 + this.#removableList.length) % this.#removableList.length;
    }
    if (input.isPressed('down') || input.isPressed('right')) {
      this.#selectedIndex = (this.#selectedIndex + 1) % this.#removableList.length;
    }

    // Enter/E/J — подтвердить выбор (J чтобы не конфликтовать с E для следующего взаимодействия)
    if (input.isPressed('attackLight') || input.isPressed('interact')) {
      const skill = this.#removableList[this.#selectedIndex];
      if (skill) {
        this.#gateSystem.sacrifice(skill.id);
        this.hide();
        // Если нужны ещё жертвы (major) — откроемся снова
        setTimeout(() => {
          if (this.#gateSystem.isActive() && this.#gateSystem.getSacrificesRemaining() > 0) {
            this.show();
          }
        }, 300);
      }
    }

    // Esc — отмена
    if (input.isPressed('pause')) {
      this.#gateSystem.cancel();
      this.hide();
    }
  }

  draw() {
    if (!this.#visible) return;
    const ctx = this.#renderer.ctx;
    const W = this.#renderer.logicalWidth;
    const H = this.#renderer.logicalHeight;

    // Затемнение всего экрана
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, W, H);

    // Панель по центру
    const panelW = 320;
    const panelH = 200;
    const px = Math.round((W - panelW) / 2);
    const py = Math.round((H - panelH) / 2);

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(px, py, panelW, panelH);

    // Двойная рамка (фиолетовая)
    ctx.strokeStyle = '#8b00ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, panelW - 1, panelH - 1);
    ctx.strokeStyle = 'rgba(85, 51, 138, 0.5)';
    ctx.strokeRect(px + 3.5, py + 3.5, panelW - 7, panelH - 7);

    // Заголовок
    ctx.font = 'bold 13px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#bb88ff';
    ctx.fillText('ВРАТА ЗАБВЕНИЯ', px + panelW / 2, py + 10);

    // Сабтайтл
    const gate = this.#gateSystem.getActiveGate();
    ctx.font = 'italic 8px serif';
    ctx.fillStyle = '#886699';
    ctx.fillText(gate?.sublabel ?? 'Пожертвуй навыком', px + panelW / 2, py + 28);

    // Счётчик
    const remaining = this.#gateSystem.getSacrificesRemaining();
    ctx.font = '7px monospace';
    ctx.fillStyle = '#c8a96e';
    ctx.fillText(`Жертв требуется: ${remaining}`, px + panelW / 2, py + 42);

    // Список навыков
    const listY = py + 58;
    const rowH = 18;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    for (let i = 0; i < Math.min(this.#removableList.length, 6); i++) {
      const skill = this.#removableList[i];
      const y = listY + i * rowH;
      const selected = i === this.#selectedIndex;
      const color = BRANCH_COLORS[skill.branch] ?? '#888';

      // Фон строки
      ctx.fillStyle = selected ? 'rgba(139, 0, 255, 0.25)' : 'rgba(40, 30, 50, 0.4)';
      ctx.fillRect(px + 10, y, panelW - 20, rowH - 2);

      // Индикатор ветки
      ctx.fillStyle = color;
      ctx.fillRect(px + 10, y, 3, rowH - 2);

      // Имя навыка
      ctx.font = selected ? 'bold 8px monospace' : '8px monospace';
      ctx.fillStyle = selected ? '#fff' : '#bbb';
      ctx.fillText(skill.name, px + 18, y + 2);

      // Тир и ультима
      if (skill.isUltima) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 6px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('УЛЬТ', px + panelW - 14, y + 2);
        ctx.textAlign = 'left';
      }

      // Эхо
      ctx.font = '6px monospace';
      ctx.fillStyle = '#888';
      const echoText = `Эхо: ${skill.echo?.description ?? '—'}`;
      const echoMax = panelW - 30;
      let truncated = echoText;
      while (ctx.measureText(truncated).width > echoMax && truncated.length > 3) {
        truncated = truncated.slice(0, -1);
      }
      if (truncated.length < echoText.length) truncated = truncated.slice(0, -2) + '…';
      ctx.fillText(truncated, px + 18, y + 10);
    }

    // Подсказки
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666';
    ctx.fillText('↑↓ выбор  ·  [J/E] подтвердить  ·  [Esc] отмена', px + panelW / 2, py + panelH - 14);
  }

  get visible() { return this.#visible; }
}
