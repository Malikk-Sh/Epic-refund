// Один и тот же гоблин убегает в Акте 1 и устраивает засады в Акте 3.
// Это главный инструмент ощущения деградации силы.

import { BALANCE } from '../data/balance.js';

const B = BALANCE.fear;

export class FearSystem {
  #recentKills = [];    // { timestamp } — недавние убийства

  // Вызывается при каждом убийстве врага
  recordKill() {
    this.#recentKills.push({ timestamp: Date.now() });
  }

  // Вычисляет суммарную "угрозу" игрока
  calculateThreat(skillTree, player) {
    let threat = 0;

    // Каждый активный навык = +1
    threat += skillTree.getActiveSkillCount();

    // Бонусы от особых навыков
    if (skillTree.isActive('aur_t3')) threat += B.auraFearBonus;
    if (skillTree.isActive('str_t4')) threat += B.deathDanceBonus;
    if (skillTree.isActive('def_t4')) threat += B.invulnerabilityBonus;

    // Штраф за низкое HP (враги чуют слабость)
    const hpPercent = player.hp / player.maxHP;
    if (hpPercent < 0.1) threat += B.criticalHPPenalty;
    else if (hpPercent < 0.3) threat += B.lowHPPenalty;

    // Бонус за недавние убийства
    const now = Date.now();
    this.#recentKills = this.#recentKills.filter(
      k => now - k.timestamp < B.recentKillDecay * 1000
    );
    threat += this.#recentKills.length * B.recentKillWeight;

    return Math.max(0, threat);
  }

  // Возвращает режим поведения врага в зависимости от угрозы
  evaluateBehavior(enemy, threat) {
    const threshold = enemy.fearThreshold;

    if (threat >= threshold * 2) return 'panic';      // Бросает оружие, убегает
    if (threat >= threshold)     return 'cautious';   // Держит дистанцию
    if (threat >= threshold * 0.5) return 'normal';   // Стандарт
    return 'aggressive';                               // Тактики, засады
  }

  // Должен ли враг сейчас бояться?
  isFearful(enemy, threat) {
    return threat >= enemy.fearThreshold;
  }
}
