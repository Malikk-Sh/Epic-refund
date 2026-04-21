// HUD — рендер на Canvas поверх мира. Деградирует вместе с игроком.
// Skill-панель показывает все 20 навыков (для дебаггинга).

import { BALANCE } from '../data/balance.js';
import { SKILLS, SKILL_BRANCHES } from '../data/skills.js';

const HB = BALANCE.hud;

const BRANCH_COLORS = {
  strength: '#e74c3c',
  magic:    '#3498db',
  defense:  '#f1c40f',
  agility:  '#2ecc71',
  aura:     '#9b59b6',
};

const BRANCH_LABELS = {
  strength: 'Сила',
  magic:    'Магия',
  defense:  'Защита',
  agility:  'Лов.',
  aura:     'Аура',
};

export class HUD {
  #renderer;
  #skillTree;
  #hudManager;
  #eventBus;

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
    this._targetAlpha = {
      hpBar:      count > HB.hideAllAt ? 1 : 0,
      manaBar:    count > HB.hideManaAt ? 1 : 0,
      staminaBar: count > HB.hideStaminaAt ? 1 : 0,
      skillPanel: count > HB.hideSkillPanelAt ? 1 : 0,
      minimap:    count > HB.hideMinimapAt ? 1 : 0,
      phaseText:  count > HB.hideAllAt ? 1 : 0,
    };
  }

  // === ГЛАВНЫЙ МЕТОД ===

  draw(dt, player) {
    const ctx = this.#renderer.ctx;
    const W = this.#renderer.logicalWidth;
    const H = this.#renderer.logicalHeight;

    this.#updateFade(dt);

    this.#drawHPBar(ctx, player, 10, 10);
    this.#drawManaBar(ctx, player, 10, 30);
    this.#drawStaminaBar(ctx, player, 10, 43);
    this.#drawPhaseInfo(ctx, 10, 56);
    this.#drawSkillPanel(ctx, W, H);
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

    const barW = HB.hpBarW, barH = HB.hpBarH;

    // Рамка
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x - 2, y - 2, barW + 4, barH + 4);
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 1.5, y - 1.5, barW + 3, barH + 3);

    // Фон полоски
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

    // Блик
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, y, fillW, 3);

    // Текст
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 2;
    ctx.fillText(`HP  ${Math.ceil(player.hp)} / ${player.maxHP}`, x + 4, y + barH / 2 + 0.5);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // === МАНА ===

  #drawManaBar(ctx, player, x, y) {
    if (player.maxMana === 0) return;
    const alpha = this.#elementAlpha.manaBar;
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    const barW = HB.manaBarW, barH = HB.manaBarH;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x - 2, y - 2, barW + 4, barH + 4);
    ctx.strokeStyle = '#1a3a5a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 1.5, y - 1.5, barW + 3, barH + 3);

    ctx.fillStyle = '#051830';
    ctx.fillRect(x, y, barW, barH);

    const pct = player.mana / player.maxMana;
    ctx.fillStyle = '#3399ff';
    ctx.fillRect(x, y, Math.round(barW * pct), barH);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y, Math.round(barW * pct), 2);

    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = '#aaccff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`MP  ${Math.ceil(player.mana)} / ${player.maxMana}`, x + 4, y + barH / 2 + 0.5);

    ctx.restore();
  }

  // === СТАМИНА ===

  #drawStaminaBar(ctx, player, x, y) {
    const alpha = this.#elementAlpha.staminaBar;
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    const barW = HB.staminaBarW, barH = HB.staminaBarH;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x - 2, y - 2, barW + 4, barH + 4);
    ctx.strokeStyle = '#3a2a10';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 1.5, y - 1.5, barW + 3, barH + 3);

    ctx.fillStyle = '#302010';
    ctx.fillRect(x, y, barW, barH);

    const pct = player.stamina / player.maxStamina;
    ctx.fillStyle = pct < 0.2 ? '#ff9900' : '#d8b868';
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
      god: '✦ БОГ', hero: '★ Герой', veteran: '◆ Ветеран',
      survivor: '◇ Выживший', nobody: '· · ·',
    };
    const phaseColors = {
      god: '#FFD700', hero: '#C0C0C0', veteran: '#CD7F32',
      survivor: '#8B5A2B', nobody: '#666',
    };

    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = phaseColors[phase];
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText(`${phaseLabels[phase]}   ${count}/20`, x, y);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // === ПАНЕЛЬ НАВЫКОВ (дебаг: 20 квадратов, 5 веток по 4) ===

  #drawSkillPanel(ctx, W, H) {
    const alpha = this.#elementAlpha.skillPanel;
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    const iconSize = HB.skillIconSize;   // 22
    const iconGap  = HB.skillIconGap;    // 3
    const groupGap = HB.skillGroupGap;   // 8

    const branches = Object.keys(SKILL_BRANCHES);
    const groupW = 4 * iconSize + 3 * iconGap;  // ширина одной ветки
    const totalW = branches.length * groupW + (branches.length - 1) * groupGap;

    const labelH = 10;   // высота строки с именем ветки
    const panelH = labelH + 4 + iconSize + 8; // метка + отступ + иконки + нижний отступ
    const panelX = Math.round((W - totalW) / 2) - 6;
    const panelY = H - panelH - 4;

    // Фоновая панель
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(panelX - 2, panelY - 2, totalW + 16, panelH + 2);
    ctx.strokeStyle = 'rgba(200,169,110,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX - 1.5, panelY - 1.5, totalW + 15, panelH + 1);

    let gx = panelX + 4;
    const iconY = panelY + labelH + 4;

    for (const branch of branches) {
      const branchColor = BRANCH_COLORS[branch];
      const skillIds = SKILL_BRANCHES[branch];

      // Цветная полоска-заголовок ветки
      ctx.fillStyle = branchColor;
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillRect(gx, panelY + 1, groupW, 2);
      ctx.globalAlpha = alpha;

      // Метка ветки
      ctx.font = 'bold 6px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = branchColor;
      ctx.fillText(BRANCH_LABELS[branch], gx + groupW / 2, panelY + 4);

      // Иконки навыков
      for (let i = 0; i < skillIds.length; i++) {
        const skillId = skillIds[i];
        const skillData = SKILLS[skillId];
        const ix = gx + i * (iconSize + iconGap);
        const iy = iconY;

        const isActive = this.#skillTree.isSkillActive(skillId);
        const isEcho   = this.#skillTree.isEchoActive(skillId);

        this.#drawSkillIcon(ctx, skillData, ix, iy, iconSize, isActive, isEcho, alpha);
      }

      gx += groupW + groupGap;
    }

    ctx.restore();
  }

  #drawSkillIcon(ctx, skill, x, y, size, isActive, isEcho, panelAlpha) {
    const color = BRANCH_COLORS[skill.branch] ?? '#888';

    ctx.globalAlpha = panelAlpha;

    if (isActive) {
      // Фон — насыщенный цвет ветки
      ctx.fillStyle = color;
      ctx.fillRect(x, y, size, size);

      // Лёгкий градиент сверху
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x, y, size, size / 3);
    } else {
      // Потерян: тёмный фон с цветным оттенком
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = color;
      ctx.globalAlpha = panelAlpha * 0.25;
      ctx.fillRect(x, y, size, size);
      ctx.globalAlpha = panelAlpha;
    }

    // Рамка
    if (skill.isUltima) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1.5;
    } else {
      ctx.strokeStyle = isActive ? 'rgba(0,0,0,0.5)' : 'rgba(80,80,80,0.5)';
      ctx.lineWidth = 1;
    }
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

    // Аббревиатура (первые 3 символа имени)
    const abbr = skill.name.substring(0, 3);
    ctx.font = `bold ${isActive ? 6 : 5}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isActive ? '#fff' : 'rgba(160,160,160,0.7)';
    ctx.fillText(abbr, x + size / 2, y + size / 2 - 2);

    // Тир-индикатор внизу (tier+1 точек)
    const dotCount = skill.tier + 1;
    const dotSize  = 3;
    const dotGap   = 2;
    const dotsW    = dotCount * dotSize + (dotCount - 1) * dotGap;
    let dx = x + (size - dotsW) / 2;
    const dy = y + size - 5;
    ctx.fillStyle = isActive ? 'rgba(255,255,255,0.85)' : 'rgba(120,120,120,0.5)';
    for (let d = 0; d < dotCount; d++) {
      ctx.fillRect(dx, dy, dotSize, dotSize);
      dx += dotSize + dotGap;
    }

    // Эхо: маленькая искра в правом верхнем углу
    if (isEcho && !isActive) {
      ctx.fillStyle = BRANCH_COLORS[skill.branch];
      ctx.globalAlpha = panelAlpha * 0.8;
      ctx.beginPath();
      ctx.arc(x + size - 3, y + 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = panelAlpha;
    }

    // Крест поверх потерянного навыка без эхо (полностью ушёл)
    if (!isActive && !isEcho) {
      ctx.strokeStyle = 'rgba(180,60,60,0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 3);
      ctx.lineTo(x + size - 3, y + size - 3);
      ctx.moveTo(x + size - 3, y + 3);
      ctx.lineTo(x + 3, y + size - 3);
      ctx.stroke();
    }
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
    const y = H - 100;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(x - tw / 2 - 8, y - 9, tw + 16, 18);

    ctx.strokeStyle = '#c8a96e';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - tw / 2 - 7.5, y - 8.5, tw + 15, 17);

    ctx.fillStyle = '#FFCC44';
    ctx.fillText(text, x, y);
  }

  // === БОСС ===

  drawBossBar(room) {
    if (!room) return;
    let boss = null;
    for (const enemy of room.enemies) {
      if (enemy.isBoss && enemy.isAlive) { boss = enemy; break; }
    }
    if (!boss) return;

    const ctx = this.#renderer.ctx;
    const W = this.#renderer.logicalWidth;
    const H = this.#renderer.logicalHeight;

    const barW = Math.min(280, W - 60);
    const barH = 12;
    const x = Math.round((W - barW) / 2);
    const y = H - 130;

    ctx.save();

    // Внешняя рамка
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(x - 3, y - 3, barW + 6, barH + 6);
    ctx.strokeStyle = '#6a1a3a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 2.5, y - 2.5, barW + 5, barH + 5);

    ctx.fillStyle = '#180818';
    ctx.fillRect(x, y, barW, barH);

    const pct = Math.max(0, boss.hp / boss.maxHP);
    // Цвет зависит от здоровья босса
    const bossColor = pct > 0.6 ? '#8a2a4a' : pct > 0.3 ? '#cc4422' : '#ff2200';
    ctx.fillStyle = bossColor;
    ctx.fillRect(x, y, Math.round(barW * pct), barH);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y, Math.round(barW * pct), 3);

    // Засечки по 25%
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const px = x + Math.round(barW * i / 4);
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px, y + barH);
      ctx.stroke();
    }

    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#f0d090';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    const phase = boss.phases?.[boss.currentPhase]?.name;
    const label = phase ? `${boss.displayName} — ${phase}` : boss.displayName;
    ctx.fillText(label, W / 2, y - 4);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // === МИНИ-КАРТА ===

  drawMinimap(level, currentRoomId) {
    const alpha = this.#elementAlpha.minimap;
    if (alpha <= 0.01) return;

    const ctx = this.#renderer.ctx;
    const W = this.#renderer.logicalWidth;
    const cellSize = HB.minimapCellSize;
    const gap      = HB.minimapCellGap;
    const x0 = W - 90;
    const y0 = 10;

    ctx.save();
    ctx.globalAlpha = alpha;

    const layout = level.minimapLayout;
    if (!layout) { ctx.restore(); return; }

    // Размер области: определяем диапазон col/row
    let maxCol = 0, maxRow = 0;
    for (const pos of Object.values(layout)) {
      maxCol = Math.max(maxCol, pos.col);
      maxRow = Math.max(maxRow, pos.row);
    }
    const mapW = (maxCol + 1) * (cellSize + gap) - gap + 8;
    const mapH = (maxRow + 1) * (cellSize + gap) - gap + 8;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x0 - 4, y0 - 4, mapW, mapH);
    ctx.strokeStyle = 'rgba(200,169,110,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 - 3.5, y0 - 3.5, mapW - 1, mapH - 1);

    for (const [roomId, room] of level.rooms) {
      const pos = layout[roomId];
      if (!pos) continue;
      const cx = x0 + pos.col * (cellSize + gap);
      const cy = y0 + pos.row * (cellSize + gap);

      if (!room.isSeen) continue;

      if (!room.isVisited) {
        ctx.fillStyle = 'rgba(120,120,120,0.3)';
        ctx.fillRect(cx, cy, cellSize, cellSize);
        continue;
      }

      let color = '#444';
      if (room.isCleared) color = '#666';
      if (room.gate)      color = '#7a3a9a';
      if (roomId === currentRoomId) color = '#c8a96e';

      ctx.fillStyle = color;
      ctx.fillRect(cx, cy, cellSize, cellSize);

      // Текущая комната — яркий контур
      if (roomId === currentRoomId) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx + 0.5, cy + 0.5, cellSize - 1, cellSize - 1);
      }
    }

    ctx.restore();
  }
}
