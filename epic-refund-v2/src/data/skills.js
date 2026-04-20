// Единственный источник правды о навыках.
// НИКОГДА не мутировать этот объект — только читать.
// Изменяемое состояние хранится в SkillTree.

export const SKILLS = {

  // =====================================================================
  // ВЕТКА СИЛЫ (Красная)
  // =====================================================================

  str_base: {
    id: 'str_base',
    branch: 'strength',
    tier: 0,
    name: 'Владение мечом',
    description: 'Позволяет использовать мечи. Комбо из 3 ударов.',
    color: 0xe74c3c,
    effects: {
      enableSwords: true,
      lightAttackDamage: 15,
      comboMultipliers: [1.0, 1.2, 1.5],
      attackSpeed: 0.4,      // сек между ударами
      attackRange: 80,       // пикс
    },
    staminaCost: 10,
    echo: {
      id: 'echo_blade',
      name: 'Эхо Клинка',
      description: 'Удары палкой наносят +5% урона',
    },
    prerequisites: [],
    dependents: ['str_t2'],
  },

  str_t2: {
    id: 'str_t2',
    branch: 'strength',
    tier: 1,
    name: 'Силовой замах',
    description: 'Медленный мощный удар. Ломает щиты и хрупкие стены.',
    color: 0xe74c3c,
    effects: {
      heavyAttackDamage: 45,
      chargeTime: 0.8,
      shieldBreak: true,
      wallBreak: true,
      knockback: 120,
      attackRange: 100,
    },
    staminaCost: 30,
    echo: {
      id: 'echo_force',
      name: 'Эхо Силы',
      description: 'Хрупкие стены ломаются за 5 ударов палкой',
    },
    prerequisites: ['str_base'],
    dependents: ['str_t3'],
  },

  str_t3: {
    id: 'str_t3',
    branch: 'strength',
    tier: 2,
    name: 'Вихрь Клинков',
    description: 'Вращающаяся атака по площади.',
    color: 0xe74c3c,
    effects: {
      damage: 25,
      tickRate: 0.3,
      duration: 2.0,
      radius: 120,
      movementDuringVortex: 0.5,
    },
    staminaCost: 50,
    cooldown: 8,
    echo: {
      id: 'echo_vortex',
      name: 'Эхо Вихря',
      description: 'Лёгкий откат врагов при ударе палкой',
    },
    prerequisites: ['str_t2'],
    dependents: ['str_t4'],
  },

  str_t4: {
    id: 'str_t4',
    branch: 'strength',
    tier: 3,
    name: 'Танец Смерти',
    description: 'УЛЬТИМА: 10 секунд неудержимых атак.',
    color: 0xe74c3c,
    isUltima: true,
    effects: {
      damagePerHit: 60,
      hitsPerSecond: 5,
      duration: 10,
      radius: 150,
      invulnerable: true,
      autoTarget: true,
    },
    staminaCost: 0,
    cooldown: 120,
    echo: {
      id: 'echo_dance',
      name: 'Эхо Танца',
      description: 'После убийства: +10% скорость атаки на 2 сек',
    },
    prerequisites: ['str_t3'],
    dependents: [],
  },

  // =====================================================================
  // ВЕТКА МАГИИ (Синяя)
  // =====================================================================

  mag_base: {
    id: 'mag_base',
    branch: 'magic',
    tier: 0,
    name: 'Базовая магия',
    description: 'Позволяет кастовать заклинания. Даёт шкалу маны. Магический снаряд.',
    color: 0x3498db,
    effects: {
      enableMana: true,
      maxMana: 100,
      magicBoltDamage: 8,
      magicBoltSpeed: 400,
      magicBoltRange: 500,
      magicBoltCost: 8,
      castTime: 0.3,
    },
    echo: {
      id: 'echo_mana',
      name: 'Эхо Маны',
      description: 'Магические объекты подсвечиваются',
    },
    prerequisites: [],
    dependents: ['mag_t2'],
  },

  mag_t2: {
    id: 'mag_t2',
    branch: 'magic',
    tier: 1,
    name: 'Огненный шар',
    description: 'Средний урон по площади, поджигает врагов и окружение.',
    color: 0xe67e22,
    effects: {
      damage: 30,
      splashRadius: 80,
      splashDamage: 15,
      burnDamage: 5,
      burnDuration: 3,
      burnTickRate: 1,
      ignitesEnvironment: true,
      projectileSpeed: 250,
    },
    manaCost: 20,
    cooldown: 3,
    echo: {
      id: 'echo_fire',
      name: 'Эхо Огня',
      description: '5% шанс поджечь при ударе палкой',
    },
    prerequisites: ['mag_base'],
    dependents: ['mag_t3'],
  },

  mag_t3: {
    id: 'mag_t3',
    branch: 'magic',
    tier: 2,
    name: 'Огненный шторм',
    description: 'Область горящего дождя.',
    color: 0xe74c3c,
    effects: {
      damagePerTick: 20,
      tickRate: 0.5,
      duration: 5,
      radius: 200,
      castTime: 1.2,
      ignitesEverything: true,
    },
    manaCost: 40,
    cooldown: 15,
    echo: {
      id: 'echo_storm',
      name: 'Эхо Шторма',
      description: 'При убийстве: маленький взрыв (20 пикс, 3 урона)',
    },
    prerequisites: ['mag_t2'],
    dependents: ['mag_t4'],
  },

  mag_t4: {
    id: 'mag_t4',
    branch: 'magic',
    tier: 3,
    name: 'Армагеддон',
    description: 'УЛЬТИМА: Огненный дождь с неба.',
    color: 0xe74c3c,
    isUltima: true,
    effects: {
      meteorCount: 12,
      damagePerMeteor: 80,
      meteorRadius: 60,
      totalDuration: 4,
      screenShake: true,
      destroysEnvironment: true,
    },
    manaCost: 80,
    cooldown: 180,
    echo: {
      id: 'echo_armageddon',
      name: 'Эхо Армагеддона',
      description: 'При смерти врага: 1 урон всем в радиусе 30 пикс',
    },
    prerequisites: ['mag_t3'],
    dependents: [],
  },

  // =====================================================================
  // ВЕТКА ЗАЩИТЫ (Жёлтая)
  // =====================================================================

  def_base: {
    id: 'def_base',
    branch: 'defense',
    tier: 0,
    name: 'Тяжёлая броня',
    description: '+50% к максимальному HP, снижение входящего урона на 30%.',
    color: 0xf1c40f,
    effects: {
      maxHPBonus: 50,
      damageReduction: 0.3,
      weightAdded: 30,
    },
    echo: {
      id: 'echo_armor',
      name: 'Эхо Брони',
      description: '+5 к максимальному HP',
    },
    prerequisites: [],
    dependents: ['def_t2'],
  },

  def_t2: {
    id: 'def_t2',
    branch: 'defense',
    tier: 1,
    name: 'Парирование',
    description: 'Точное нажатие в момент удара — полная блокировка + оглушение врага на 1.5 сек.',
    color: 0xf1c40f,
    effects: {
      parryWindow: 0.2,
      parryStunDuration: 1.5,
      perfectParryWindow: 0.08,
      perfectParryDamageReflect: 0.5,
    },
    staminaCost: 15,
    echo: {
      id: 'echo_reflex',
      name: 'Эхо Рефлекса',
      description: 'Враги подсвечиваются за 0.3 сек до атаки',
    },
    prerequisites: ['def_base'],
    dependents: ['def_t3'],
  },

  def_t3: {
    id: 'def_t3',
    branch: 'defense',
    tier: 2,
    name: 'Магический щит',
    description: 'Активный щит, поглощающий 3 удара. Перезарядка 15 сек.',
    color: 0xf1c40f,
    effects: {
      charges: 3,
      absorbAnyDamage: true,
      rechargeCooldown: 15,
    },
    echo: {
      id: 'echo_shield',
      name: 'Эхо Щита',
      description: 'Раз в 60 сек автоматически блокируется 1 удар',
    },
    prerequisites: ['def_t2'],
    dependents: ['def_t4'],
  },

  def_t4: {
    id: 'def_t4',
    branch: 'defense',
    tier: 3,
    name: 'Неуязвимость',
    description: 'УЛЬТИМА: 8 секунд полной неуязвимости. Перезарядка 2 минуты.',
    color: 0xf1c40f,
    isUltima: true,
    effects: {
      duration: 8,
      immuneToAllDamage: true,
      immuneToCC: true,
      canAttackDuring: true,
    },
    cooldown: 120,
    echo: {
      id: 'echo_invuln',
      name: 'Эхо Неуязвимости',
      description: 'При смертельном ударе: 1 HP вместо смерти (раз за уровень)',
    },
    prerequisites: ['def_t3'],
    dependents: [],
  },

  // =====================================================================
  // ВЕТКА ЛОВКОСТИ (Зелёная)
  // =====================================================================

  agi_base: {
    id: 'agi_base',
    branch: 'agility',
    tier: 0,
    name: 'Спринт',
    description: 'Быстрый бег (в 2 раза быстрее ходьбы), потребляет стамину.',
    color: 0x2ecc71,
    effects: {
      sprintSpeedMultiplier: 2.0,
      sprintStaminaCost: 20,  // /сек
    },
    echo: {
      id: 'echo_speed',
      name: 'Эхо Скорости',
      description: 'Базовая скорость ходьбы +10%',
    },
    prerequisites: [],
    dependents: ['agi_t2'],
  },

  agi_t2: {
    id: 'agi_t2',
    branch: 'agility',
    tier: 1,
    name: 'Акробатика',
    description: 'Двойной прыжок + кувырок с i-frames (кадры неуязвимости).',
    color: 0x2ecc71,
    effects: {
      doubleJump: true,
      rollIFrames: true,
      iFrameDuration: 0.25,
      wallJump: true,
    },
    echo: {
      id: 'echo_acrobatics',
      name: 'Эхо Акробатики',
      description: 'Обычный прыжок на 15% выше',
    },
    prerequisites: ['agi_base'],
    dependents: ['agi_t3'],
  },

  agi_t3: {
    id: 'agi_t3',
    branch: 'agility',
    tier: 2,
    name: 'Скрытность',
    description: 'Режим стелса: враги не видят в тенях, удар из стелса x3 урона.',
    color: 0x2ecc71,
    effects: {
      stealthMode: true,
      stealthSpeedMultiplier: 0.6,
      detectionRadiusReduction: 0.5,
      backstabMultiplier: 3.0,
      noiseReduction: true,
      shadowInvisibility: true,
    },
    staminaCost: 10,  // /сек в режиме стелса
    echo: {
      id: 'echo_shadow',
      name: 'Эхо Тени',
      description: 'Враги замечают на 20% медленнее',
    },
    prerequisites: ['agi_t2'],
    dependents: ['agi_t4'],
  },

  agi_t4: {
    id: 'agi_t4',
    branch: 'agility',
    tier: 3,
    name: 'Телепортация',
    description: 'УЛЬТИМА: мгновенное перемещение на 250 пикс. Проходит сквозь стены.',
    color: 0x2ecc71,
    isUltima: true,
    effects: {
      teleportRange: 250,
      passThroughWalls: true,
      passThroughEnemies: true,
      damageOnArrival: 20,
    },
    staminaCost: 35,
    cooldown: 5,
    echo: {
      id: 'echo_teleport',
      name: 'Эхо Телепорта',
      description: 'Кувырок проходит сквозь врагов',
    },
    prerequisites: ['agi_t3'],
    dependents: [],
  },

  // =====================================================================
  // ВЕТКА АУРЫ (Фиолетовая)
  // =====================================================================

  aur_base: {
    id: 'aur_base',
    branch: 'aura',
    tier: 0,
    name: 'Регенерация',
    description: 'Пассивное восстановление HP вне боя.',
    color: 0x9b59b6,
    effects: {
      hpRegenOutOfCombat: 2,   // HP/сек вне боя
      hpRegenInCombat: 0.5,    // HP/сек в бою (слабая)
      outOfCombatDelay: 5,     // сек без урона
    },
    echo: {
      id: 'echo_life',
      name: 'Эхо Жизни',
      description: '+1 HP при входе в новую комнату',
    },
    prerequisites: [],
    dependents: ['aur_t2'],
  },

  aur_t2: {
    id: 'aur_t2',
    branch: 'aura',
    tier: 1,
    name: 'Аура Огня',
    description: 'Пассивный урон всем врагам в радиусе 3м. Освещает темноту.',
    color: 0xe67e22,
    effects: {
      damagePerSecond: 5,
      radius: 60,
      ignitesNearby: true,
      lightRadius: 100,
    },
    echo: {
      id: 'echo_heat',
      name: 'Эхо Жара',
      description: 'Враги в радиусе 30 пикс: 1 урон/5сек',
    },
    prerequisites: ['aur_base'],
    dependents: ['aur_t3'],
  },

  aur_t3: {
    id: 'aur_t3',
    branch: 'aura',
    tier: 2,
    name: 'Аура Страха',
    description: 'Слабые враги убегают, средние — заторможены.',
    color: 0x9b59b6,
    effects: {
      fearRadius: 150,
      weakEnemyFlee: true,
      mediumEnemySlow: 0.3,
      strongEnemySlow: 0.1,
      fearReducesAttack: 0.15,
    },
    echo: {
      id: 'echo_presence',
      name: 'Эхо Присутствия',
      description: 'Слабые враги колеблются 1 сек перед атакой',
    },
    prerequisites: ['aur_t2'],
    dependents: ['aur_t4'],
  },

  aur_t4: {
    id: 'aur_t4',
    branch: 'aura',
    tier: 3,
    name: 'Аура Аннигиляции',
    description: 'УЛЬТИМА: всё в радиусе 5м получает массивный урон.',
    color: 0x8e44ad,
    isUltima: true,
    effects: {
      damagePerSecond: 40,
      radius: 100,
      destroysProjectiles: true,
      destroysEnvironment: true,
      duration: 15,
    },
    cooldown: 180,
    echo: {
      id: 'echo_destruction',
      name: 'Эхо Разрушения',
      description: 'Разрушаемые объекты ломаются на 1 удар быстрее',
    },
    prerequisites: ['aur_t3'],
    dependents: [],
  },
};

// Группировка для удобного обхода
export const SKILL_BRANCHES = {
  strength: ['str_base', 'str_t2', 'str_t3', 'str_t4'],
  magic:    ['mag_base', 'mag_t2', 'mag_t3', 'mag_t4'],
  defense:  ['def_base', 'def_t2', 'def_t3', 'def_t4'],
  agility:  ['agi_base', 'agi_t2', 'agi_t3', 'agi_t4'],
  aura:     ['aur_base', 'aur_t2', 'aur_t3', 'aur_t4'],
};

export const TOTAL_SKILLS = Object.keys(SKILLS).length;  // 20
