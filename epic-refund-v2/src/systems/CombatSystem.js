// Все формулы урона централизованы здесь.
// Никаких расчётов урона в Player.js или Enemy.js — только через CombatSystem.

import { BALANCE } from '../data/balance.js';

const B = BALANCE.combat;

export class CombatSystem {
  #eventBus;

  constructor(eventBus) {
    this.#eventBus = eventBus;
  }

  // ===== ИСХОДЯЩИЙ УРОН (от игрока) =====

  calculatePlayerDamage(params) {
    const {
      baseDamage,
      comboIndex = 0,         // 0, 1, 2 — номер удара в комбо
      echoBonuses,
      backstabMultiplier = 1.0,
      targetArmor = 0,
      targetFrozen = false,
    } = params;

    let damage = baseDamage;

    // 1. Множитель комбо
    const comboMult = B.comboMultipliers[Math.min(comboIndex, B.comboMultipliers.length - 1)];
    damage *= comboMult;

    // 2. Эхо-бонусы к урону (аддитивно от базы)
    damage *= echoBonuses.meleeDamageMultiplier;

    // 3. Удар из стелса
    damage *= backstabMultiplier;

    // 4. Бонус по замороженным
    if (targetFrozen) damage *= 1.5;

    // 5. Вычитание брони (плоское)
    damage = Math.max(1, damage - targetArmor);

    return Math.floor(damage);
  }

  // ===== ВХОДЯЩИЙ УРОН (по игроку) =====

  calculateDamageToPlayer(params) {
    const {
      baseDamage,
      armorReduction = 0,
      shieldActive = false,
      shieldCharges = 0,
      parrySuccess = false,
      parryPerfect = false,
      echoAutoBlockReady = false,
      fearAuraReduction = 0,
    } = params;

    // Парирование — полная блокировка
    if (parrySuccess) {
      const reflected = parryPerfect ? Math.floor(baseDamage * B.perfectParryReflect) : 0;
      return { damage: 0, stunEnemy: true, reflected, parryConsumed: true };
    }

    // Магический щит — полное поглощение
    if (shieldActive && shieldCharges > 0) {
      return { damage: 0, shieldChargeConsumed: true, stunEnemy: false, reflected: 0 };
    }

    // Эхо щита — одноразовая автоблокировка
    if (echoAutoBlockReady) {
      return { damage: 0, echoShieldConsumed: true, stunEnemy: false, reflected: 0 };
    }

    let damage = baseDamage;

    // Снижение от брони
    damage *= (1 - armorReduction);

    // Снижение от Ауры Страха (уменьшает урон врагов)
    damage *= (1 - fearAuraReduction);

    damage = Math.max(1, Math.floor(damage));

    return { damage, stunEnemy: false, reflected: 0 };
  }

  // ===== ПАРИРОВАНИЕ =====

  // Проверяет, попадает ли нажатие в окно парирования
  checkParry(timeSinceInput, hasParrySkill) {
    if (!hasParrySkill) return { success: false, perfect: false };

    const success = timeSinceInput <= B.parryWindow;
    const perfect = timeSinceInput <= B.perfectParryWindow;

    return { success, perfect };
  }

  // ===== НОКБЭК =====

  calculateKnockback(basePower, echoBonuses) {
    const base = B.knockbackBase + (basePower || 0);
    // Дополнительный нокбэк от "Эхо Вихря"
    const echoBonus = echoBonuses.knockbackOnHit || 0;
    return base + echoBonus;
  }

  // ===== ИЗЛУЧЕНИЕ УРОНА (АОЕ) =====

  // Для "Эхо Армагеддона" и взрывов — урон всем в радиусе
  applySplashDamage(origin, radius, damage, enemies) {
    const hit = [];
    for (const enemy of enemies) {
      const dx = enemy.x - origin.x;
      const dy = enemy.y - origin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        hit.push({ enemy, damage });
      }
    }
    return hit;
  }
}
