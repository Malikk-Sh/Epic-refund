// Каждый потерянный навык оставляет Эхо — слабый пассивный бонус.
// Цель: смягчить потерю и создать микро-стратегию.
// Эхо должны ОЩУЩАТЬСЯ, но не КОМПЕНСИРОВАТЬ потерю.

import { BALANCE } from '../data/balance.js';
const E = BALANCE.echo;

export class EchoSystem {
  #skillTree;

  constructor(skillTree) {
    this.#skillTree = skillTree;
  }

  // Возвращает агрегированный объект всех активных пассивных бонусов
  getPassiveBonuses() {
    const echoes = this.#skillTree.getActiveEchoes();
    const echoIds = new Set(echoes.map(e => e.id));

    return {
      // Урон
      meleeDamageMultiplier: echoIds.has('echo_blade') ? 1 + E.bladeDamageBonus : 1.0,
      attackSpeedBonusOnKill: echoIds.has('echo_dance') ? E.danceAttackSpeedBonus : 1.0,
      attackSpeedBuffDuration: E.danceBuffDuration,
      knockbackOnHit: echoIds.has('echo_vortex') ? E.vortexKnockback : 0,
      burnChanceOnHit: echoIds.has('echo_fire') ? E.fireBurnChance : 0,
      burnDamage: E.fireBurnDamage,
      burnDuration: E.fireBurnDuration,

      // Защита
      maxHPBonus: echoIds.has('echo_armor') ? E.armorHPBonus : 0,
      autoBlockInterval: echoIds.has('echo_shield') ? E.shieldAutoBlockInterval : 0,
      deathSaveHP: echoIds.has('echo_invuln') ? E.invulnDeathSaveHP : 0,
      deathSaveUsesPerLevel: echoIds.has('echo_invuln') ? E.invulnDeathSaveUsesPerLevel : 0,

      // Движение
      walkSpeedMultiplier: echoIds.has('echo_speed') ? E.speedWalkBonus : 1.0,
      jumpForceMultiplier: echoIds.has('echo_acrobatics') ? E.acrobaticsJumpBonus : 1.0,
      rollThroughEnemies: echoIds.has('echo_teleport'),

      // Информация
      highlightMagicObjects: echoIds.has('echo_mana'),
      enemyAttackIndicatorTime: echoIds.has('echo_reflex') ? E.reflexIndicatorTime : 0,
      enemyDetectionTimeMod: echoIds.has('echo_shadow') ? E.shadowDetectionMod : 1.0,

      // Урон по окружению
      wallBreakHitsReduction: echoIds.has('echo_force') ? E.forceWallBreakHits : Infinity,
      destructibleHPReduction: echoIds.has('echo_destruction') ? E.destructibleHPReduction : 0,

      // Пассивный урон
      heatAuraDamage: echoIds.has('echo_heat') ? E.heatPassiveDamage : 0,
      heatAuraInterval: E.heatPassiveInterval,
      heatAuraRadius: E.heatRadius,

      // Замедление
      iceSlowOnHit: echoIds.has('echo_ice') ? E.iceSlowAmount : 1.0,
      iceSlowDuration: E.iceSlowDuration,

      // Взрывы
      killExplosionRadius: echoIds.has('echo_armageddon') ? E.armageddonExplosionRadius : 0,
      killExplosionDamage: E.armageddonExplosionDamage,
      magicKillExplosion: echoIds.has('echo_storm'),

      // Прочее
      healOnRoomEnter: echoIds.has('echo_life') ? E.lifeHealOnRoomEnter : 0,
      weakEnemyHesitation: echoIds.has('echo_presence') ? E.presenceHesitation : 0,

      // Список активных ID для проверок в других системах
      _activeEchoIds: echoIds,
    };
  }

  // Проверка конкретного эхо
  hasEcho(echoId) {
    return this.#skillTree.getActiveEchoes().some(e => e.id === echoId);
  }
}
