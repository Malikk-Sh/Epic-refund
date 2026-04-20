// HUD — рендер на Canvas поверх мира. Деградирует вместе с игроком.

import { BALANCE } from '../data/balance.js';

const HB = BALANCE.hud;

const BRANCH_COLORS = {
  strength: '#e74c3c',
  magic:    '#3498db',
  defense:  '#f1c40f',
  agility:  '#2ecc71',
  aura:     '#9b59b6',
};

export class HUD {
  #renderer;
  #skillTree;
  #hudManager;
  #eventBus;

  // Элементы с alpha для плавного исчезновения
  #elementAlpha = {
    hpBar: 1, manaBar: 1, staminaBar: 1,
    skillPanel: 1, minimap: 1, phaseText: 1,
  };

  constructor(renderer, hudManager, skillTree, eventBus) {
    this.#renderer = renderer;
    this.#skillTree = skillTree;
    this.#hudManager = hudManager;
    this.#eventBus = eventBus;

    eventBus.on('skill:lost', () => this.#updateVisibility());
    this.#updateVisibility();
  }

  #updateVisibility() {
    const count = this.#skillTree.getActiveSkillCount();
    // Устанавливаем целевые alpha — плавно сведём в update()
    this._targetAlpha = {
      hpBar:       count > HB.hideAllAt ? 1 : 0,
      manaBar:     count > HB.hideManaAt ? 1 : 0,
      staminaBar:  count > HB.hideStaminaAt ? 1 : 0,
      skillPanel:  count > HB.hideSkillPanelAt ? 1 : 0,
      minimap:     count > HB.hideMinimapAt ? 1 : 0,
      phaseText:   count > HB.hideAllAt ? 1 : 0,
    };
  }

  // === ГЛАВНЫЙ МЕТОД ===

  draw(dt, player) {
    const ctx = this.#renderer.ctx;
    const W = this.#renderer.logicalWidth;
    const H = this.#renderer.logicalHeight;

    this.#updateFade(dt);

    // Полосы в левом верхнем углу
    this.#drawHPBar(ctx, player, 8, 8);
    this.#drawManaBar(ctx, player, 8, 22);
    this.#drawStaminaBar(ctx, player, 8, 32);

    // Фаза и счётчик
    this.#drawPhaseInfo(ctx, 8, 42);

    // Панель навыков внизу
    this.#drawSkillPanel(ctx, W, H);

    // Мини-карта в правом верхнем углу (если есть комнатные данные)
    // Рисуется снаружи через GameScene, если включена
  }

  #updateFade(dt) {
    if (!this._targetAlpha) return;
    const speed = 1 / HB.fadeDuration;
    for (const key of Object.keys(this.#elementAlpha)) {
      const target = this._targetAlpha[key] ?? 1;
      const cur = this.#elementAlpha[key];
      if (cur < target) this.#elementAlpha[key] = Math.min(target, cur + speed * dt);
      if (cur > target) this.#elementAlpha[key] = Math.max(target, cur - speed * dt);
    }
  }

  // === HP ===

  #drawHPBar(ctx, player, x, y) {
    const alpha = this.#elementAlpha.hpBar;
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    const barW = 110, barH = 9;

    // Фон (тонкая рамка)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);

    ctx.fillStyle = '#2a0808';
    ctx.fillRect(x, y, barW, barH);

    // Заливка
    const pct = player.hp / player.maxHP;
    const fillW = Math.round(barW * pct);
    let hpColor = '#cc2222';
    if (pct < 0.3) hpColor = '#ff3333';
    else if (pct > 0.7) hpColor = '#44aa44';

    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, fillW, barH);

    // Блик сверху
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x, y, fillW, 2);

    // Текст HP
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`HP ${Math.ceil(player.hp)}/${player.maxHP}`, x + 3, y + barH / 2 + 0.5);

    ctx.restore();
  }

  // === МАНА ===

  #drawManaBar(ctx, player, x, y) {
    if (player.maxMana === 0) return;
    const alpha = this.#elementAlpha.manaBar;
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    const barW = 90, barH = 5;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#051830';
    ctx.fillRect(x, y, barW, barH);

    const pct = player.mana / player.maxMana;
    ctx.fillStyle = '#3399ff';
    ctx.fillRect(x, y, Math.round(barW * pct), barH);

    ctx.restore();
  }

  // === СТАМИНА ===

  #drawStaminaBar(ctx, player, x, y) {
    const alpha = this.#elementAlpha.staminaBar;
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    const barW = 90, barH = 4;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#302010';
    ctx.fillRect(x, y, barW, barH);

    const pct = player.stamina / player.maxStamina;
    ctx.fillStyle = '#d8b868';
    ctx.fillRect(x, y, Math.round(barW * pct), barH);

    ctx.restore();
  }

  // === ФАЗА ===

  #drawPhaseInfo(ctx, x, y) {
    const alpha = this.#elementAlpha.phaseText;
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    const phase = this.#skillTree.getPlayerPhase();
    const count = this.#skillTree.getActiveSkillCount();

    const phaseLabels = {
      god: 'БОГ', hero: 'Герой', veteran: 'Ветеран',
      survivor: 'Выживающий', nobody: '...',
    };
    const phaseColors = {
      god: '#FFD700', hero: '#C0C0C0', veteran: '#CD7F32',
      survivor: '#8B5A2B', nobody: '#666',
    };

    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = phaseColors[phase];
    ctx.fillText(`${phaseLabels[phase]}  •  ${count}/20 навыков`, x, y);

    ctx.restore();
  }

  // === ПАНЕЛЬ НАВЫКОВ ===

  #drawSkillPanel(ctx, W, H) {
    const alpha = this.#elementAlpha.skillPanel;
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    const active = this.#skillTree.getActiveSkills();
    const echoes = this.#skillTree.getActiveEchoes();

    const iconSize = 10;
    const gap = 2;
    const totalWidth = active.length * (iconSize + gap) + 4 + echoes.length * (iconSize * 0.6 + 1);
    let x = Math.round((W - totalWidth) / 2);
    const y = H - iconSize - 6;

    // Активные навыки
    for (const skill of active) {
      const color = BRANCH_COLORS[skill.branch] ?? '#888';
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - 1, y - 1, iconSize + 2, iconSize + 2);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, iconSize, iconSize);

      // Полоска тира снизу
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x + 1, y + iconSize - 2, (skill.tier + 1) * 2, 1);

      // Золотая рамка для ультимативных
      if (skill.isUltima) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, iconSize - 1, iconSize - 1);
      }

      x += iconSize + gap;
    }

    // Разделитель и эхо
    if (echoes.length > 0) {
      x += 2;
      ctx.fillStyle = 'rgba(136,136,136,0.4)';
      ctx.fillRect(x, y, 1, iconSize);
      x += 2;

      for (const echo of echoes) {
        const color = BRANCH_COLORS[echo.branch] ?? '#666';
        const small = Math.round(iconSize * 0.6);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(x - 1, y + 2 - 1, small + 2, small + 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillRect(x, y + 2, small, small);
        ctx.globalAlpha = alpha;
        x += small + 1;
      }
    }

    ctx.restore();
  }

  // === ПОДСКАЗКИ ===

  drawInteractHint(text) {
    const ctx = this.#renderer.ctx;
    const W = this.#renderer.logicalWidth;
    const H = this.#renderer.logicalHeight;

    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width;
    const x = W / 2;
    const y = H - 30;

    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(x - tw / 2 - 6, y - 8, tw + 12, 16);

    ctx.strokeStyle = '#c8a96e';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - tw / 2 - 6 + 0.5, y - 8 + 0.5, tw + 12 - 1, 16 - 1);

    ctx.fillStyle = '#FFCC44';
    ctx.fillText(text, x, y);
  }

  // === МИНИ-КАРТА КОМНАТ ===

  drawMinimap(level, currentRoomId) {
    const alpha = this.#elementAlpha.minimap;
    if (alpha <= 0.01) return;

    const ctx = this.#renderer.ctx;
    const W = this.#renderer.logicalWidth;
    const x0 = W - 80;
    const y0 = 8;

    ctx.save();
    ctx.globalAlpha = alpha;

    const layout = level.minimapLayout;
    if (!layout) {
      ctx.restore();
      return;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x0 - 4, y0 - 4, 76, 50);

    const cellSize = 10;
    const gap = 2;

    for (const [roomId, room] of level.rooms) {
      const pos = layout[roomId];
      if (!pos) continue;
      const cx = x0 + pos.col * (cellSize + gap);
      const cy = y0 + pos.row * (cellSize + gap);

      if (!room.isVisited) continue;

      let color = '#444';
      if (room.isCleared) color = '#666';
      if (roomId === currentRoomId) color = '#c8a96e';
      if (room.gate) color = '#9b59b6';

      ctx.fillStyle = color;
      ctx.fillRect(cx, cy, cellSize, cellSize);
    }

    ctx.restore();
  }
}
