// HUD деградирует вместе с игроком.
// При 0 навыков — пустой экран. Здоровье определяется визуально по состоянию персонажа.

import { BALANCE } from '../data/balance.js';

const B = BALANCE.hud;

// Стили рамок HUD в зависимости от количества навыков
const HUD_STYLES = [
  { minSkills: 16, style: 'ornate_gold' },
  { minSkills: 11, style: 'clean_silver' },
  { minSkills: 6,  style: 'worn_bronze' },
  { minSkills: 3,  style: 'cracked_stone' },
  { minSkills: 0,  style: 'none' },
];

export class HUDManager {
  #container;         // PixiJS контейнер для HUD
  #skillCount = 20;
  #fadeTimers = {};   // { elementId: { alpha, timer } }
  #eventBus;

  // Визуальные элементы (устанавливаются при init)
  #elements = {
    hpBar: null,
    manaBar: null,
    staminaBar: null,
    minimap: null,
    skillPanel: null,
    compass: null,
    enemyHealthBars: null,
    damageNumbers: null,
  };

  constructor(eventBus) {
    this.#eventBus = eventBus;
    this.#setupListeners();
  }

  #setupListeners() {
    this.#eventBus.on('skill:lost', ({ remainingCount }) => {
      this.#skillCount = remainingCount;
      this.#updateVisibility();
    });
  }

  // Привязываем PixiJS объекты к элементам HUD
  registerElement(name, pixiObject) {
    if (name in this.#elements) {
      this.#elements[name] = pixiObject;
    }
  }

  update(dt, playerState) {
    this.#updateFadeTimers(dt);
    if (this.#elements.hpBar) this.#updateHPBar(playerState);
    if (this.#elements.manaBar) this.#updateManaBar(playerState);
    if (this.#elements.staminaBar) this.#updateStaminaBar(playerState);
  }

  #updateHPBar(playerState) {
    if (this.#skillCount <= B.hideAllAt) return; // Нет HUD — нет полосы

    const { hp, maxHP } = playerState;
    const pct = hp / maxHP;
    const bar = this.#elements.hpBar;

    if (bar) {
      bar.fill.width = bar.maxWidth * pct;
      // Красный оттенок при низком HP
      bar.fill.tint = pct < 0.3 ? 0xff3333 : pct < 0.6 ? 0xff8833 : 0x44ff44;
    }
  }

  #updateManaBar(playerState) {
    const bar = this.#elements.manaBar;
    if (!bar || this.#skillCount <= B.hideManaAt) return;

    const pct = playerState.mana / (playerState.maxMana || 1);
    bar.fill.width = bar.maxWidth * pct;
  }

  #updateStaminaBar(playerState) {
    const bar = this.#elements.staminaBar;
    if (!bar || this.#skillCount <= B.hideStaminaAt) return;

    const pct = playerState.stamina / playerState.maxStamina;
    bar.fill.width = bar.maxWidth * pct;
  }

  #updateVisibility() {
    const count = this.#skillCount;

    this.#setVisible('manaBar',       count > B.hideManaAt);
    this.#setVisible('staminaBar',    count > B.hideStaminaAt);
    this.#setVisible('minimap',       count > B.hideMinimapAt);
    this.#setVisible('skillPanel',    count > B.hideSkillPanelAt);
    this.#setVisible('compass',       count > B.hideCompassAt);
    this.#setVisible('enemyHealthBars', count > B.hideEnemyBarsAt);
    this.#setVisible('damageNumbers', count > B.hideDamageNumbersAt);

    // При 0-2 навыках — прячем даже HP-бар (визуальное здоровье)
    this.#setVisible('hpBar', count > B.hideAllAt);

    this.#emitStyleChange();
  }

  #setVisible(elementName, visible) {
    const el = this.#elements[elementName];
    if (!el) return;

    if (!visible && el.alpha > 0) {
      // Запускаем fade-out
      this.#fadeTimers[elementName] = { target: 0, speed: 1 / B.fadeDuration };
    } else if (visible && el.alpha < 1) {
      this.#fadeTimers[elementName] = { target: 1, speed: 1 / B.fadeDuration };
    }
  }

  #updateFadeTimers(dt) {
    for (const [name, timer] of Object.entries(this.#fadeTimers)) {
      const el = this.#elements[name];
      if (!el) continue;

      if (timer.target === 0) {
        el.alpha = Math.max(0, el.alpha - timer.speed * dt);
      } else {
        el.alpha = Math.min(1, el.alpha + timer.speed * dt);
      }

      if (el.alpha === timer.target) {
        delete this.#fadeTimers[name];
      }
    }
  }

  #emitStyleChange() {
    const count = this.#skillCount;
    const { style } = HUD_STYLES.find(s => count >= s.minSkills) ?? HUD_STYLES.at(-1);
    this.#eventBus.emit('hud:styleChange', { style, skillCount: count });
  }

  getStyle() {
    const count = this.#skillCount;
    return HUD_STYLES.find(s => count >= s.minSkills)?.style ?? 'none';
  }

  // Нужен ли полностью пустой экран?
  isEmptyScreen() {
    return this.#skillCount <= B.hideAllAt;
  }
}
