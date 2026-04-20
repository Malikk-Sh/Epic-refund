// Все числовые параметры игры. Никаких хардкодов в логике.

export const BALANCE = {
  // Размеры тайла и логического viewport
  tileSize: 24,            // Один тайл карты = 24×24 логических пикселя
  viewportWidth: 480,      // Что камера показывает (мировых пикселей)
  viewportHeight: 270,

  player: {
    baseHP: 100,
    baseSpeed: 110,          // пикселей в секунду
    baseDamage: 5,           // "палка" без навыков
    width: 14,               // Хитбокс игрока
    height: 14,
    rollSpeed: 240,
    rollDuration: 0.3,
    rollCooldown: 0.55,
    staminaMax: 100,
    staminaRegen: 25,
    staminaRegenDelay: 0.8,
  },

  combat: {
    iFrameDuration: 0.3,     // Неуязвимость при перекате (с "Акробатикой")
    iFrameDurationBase: 0.15,// Без навыка — короткие i-frames при получении урона
    comboWindow: 0.5,
    comboMultipliers: [1.0, 1.2, 1.5],
    parryWindow: 0.2,
    perfectParryWindow: 0.08,
    perfectParryReflect: 0.5,
    knockbackBase: 40,       // Меньше для top-down
    attackDuration: 0.25,    // Сколько длится анимация атаки
    attackRangeLight: 28,    // Радиус лёгкой атаки
    attackRangeHeavy: 36,
    attackArcLight: Math.PI * 0.7,  // Угол конуса атаки
    attackArcHeavy: Math.PI * 0.9,
    staminaCostLight: 10,
    staminaCostHeavy: 30,
    staminaCostRoll: 25,
    staminaCostParry: 15,
  },

  fear: {
    recentKillWeight: 0.5,
    recentKillDecay: 10,
    lowHPPenalty: -3,
    criticalHPPenalty: -5,
    auraFearBonus: 3,
    deathDanceBonus: 2,
    invulnerabilityBonus: 2,
  },

  hud: {
    hideStaminaAt: 10,
    hideManaAt: 10,
    hideMinimapAt: 10,
    hideEnemyBarsAt: 8,
    hideDamageNumbersAt: 12,
    hideSkillPanelAt: 5,
    hideCompassAt: 15,
    hideAllAt: 2,
    fadeDuration: 2.0,
  },

  weight: {
    lightThreshold: 0.3,
    mediumThreshold: 0.6,
    heavyThreshold: 0.9,
    lightSpeedMod: 1.0,
    mediumSpeedMod: 0.8,
    heavySpeedMod: 0.6,
    overloadSpeedMod: 0.4,
    // В top-down прыжка нет, но "canJump" семантически означает
    // "можешь ли перепрыгнуть препятствие" (расщелины и т.п.) — на будущее.
    overloadDisablesJump: true,
    heavyBreaksBridges: true,
  },

  echo: {
    bladeDamageBonus: 0.05,
    forceWallBreakHits: 5,
    vortexKnockback: 15,
    danceAttackSpeedBonus: 1.1,
    danceBuffDuration: 2.0,
    fireBurnChance: 0.05,
    fireBurnDamage: 2,
    fireBurnDuration: 2,
    iceSlowAmount: 0.7,
    iceSlowDuration: 0.2,
    armageddonExplosionRadius: 30,
    armageddonExplosionDamage: 1,
    armorHPBonus: 5,
    reflexIndicatorTime: 0.3,
    shieldAutoBlockInterval: 60,
    invulnDeathSaveHP: 1,
    invulnDeathSaveUsesPerLevel: 1,
    speedWalkBonus: 1.1,
    acrobaticsDodgeBonus: 1.15,
    shadowDetectionMod: 1.2,
    lifeHealOnRoomEnter: 1,
    heatPassiveDamage: 1,
    heatPassiveInterval: 5,
    heatRadius: 30,
    presenceHesitation: 1.0,
    destructibleHPReduction: 1,
  },

  camera: {
    lerpSpeed: 0.15,
    shakeDecay: 0.85,
    snapOnRoomEnter: true,   // Мгновенно центрируем при смене комнаты
  },

  performance: {
    targetFPS: 60,
    minFPS: 30,
    maxParticles: 150,
  },
};
