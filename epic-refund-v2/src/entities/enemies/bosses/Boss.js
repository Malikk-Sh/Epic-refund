// Базовый класс босса. Расширяет Enemy и добавляет систему фаз:
// при падении HP ниже порогов каждая фаза применяет свои статы и
// эмитит boss:phaseChange. На смерть — boss:defeat.
//
// phases: [{ hpThreshold, moveSpeed?, damage?, attackSpeed?, attackRange?, armor?, name? }]
// Пороги в убывающем порядке: [1.0, 0.66, 0.33]. Первая фаза
// (threshold = 1.0) соответствует стартовым статам из подкласса.

import { Enemy } from '../../Enemy.js';

export class Boss extends Enemy {
  isBoss = true;
  phases = [];
  currentPhase = 0;

  #eventBus;
  #wasAlive = true;

  constructor(x, y, eventBus = null) {
    super(x, y);
    this.#eventBus = eventBus;
  }

  update(dt, player, fearSystem, skillTree, tilemap) {
    super.update(dt, player, fearSystem, skillTree, tilemap);

    if (this.isAlive) this.#checkPhaseTransition();

    // Урон проходит вне update (через takeDamage), поэтому переход
    // «живой → мёртвый» мы ловим по флагу #wasAlive, а не по снапшоту.
    if (!this.isAlive && this.#wasAlive) {
      this.#wasAlive = false;
      this.#eventBus?.emit('boss:defeat', {
        bossId: this.typeName,
        displayName: this.displayName,
      });
    }
  }

  #checkPhaseTransition() {
    if (this.phases.length === 0) return;

    const hpPercent = this.hp / this.maxHP;

    // Находим самую "глубокую" фазу, в которую попадаем.
    // Ожидается убывающий порядок порогов.
    let newPhase = 0;
    for (let i = 0; i < this.phases.length; i++) {
      if (hpPercent <= this.phases[i].hpThreshold) newPhase = i;
    }

    if (newPhase !== this.currentPhase) {
      this.currentPhase = newPhase;
      this.#applyPhaseStats(this.phases[newPhase]);
      this.#eventBus?.emit('boss:phaseChange', {
        bossId: this.typeName,
        displayName: this.displayName,
        phase: newPhase + 1,
        totalPhases: this.phases.length,
        name: this.phases[newPhase].name ?? null,
      });
    }
  }

  #applyPhaseStats(phase) {
    if (phase.moveSpeed   !== undefined) this.moveSpeed = phase.moveSpeed;
    if (phase.damage      !== undefined) this.damage = phase.damage;
    if (phase.attackSpeed !== undefined) this.attackSpeed = phase.attackSpeed;
    if (phase.attackRange !== undefined) this.attackRange = phase.attackRange;
    if (phase.armor       !== undefined) this.armor = phase.armor;
  }
}
