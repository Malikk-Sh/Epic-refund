# 📘 GAME DESIGN DOCUMENT (GDD)

# «EPIC REFUND»

**Платформа:** Web (Browser-based)
**Технологии:** HTML5 Canvas / WebGL
**Движок:** Phaser 3 / PixiJS + собственные системы
**Разрешение:** 1920x1080 (адаптив до 1280x720)
**Управление:** Клавиатура + Мышь (основное), Геймпад (опционально)
**Целевой FPS:** 60

---

## ЧАСТЬ 1: ТЕХНИЧЕСКАЯ АРХИТЕКТУРА

### 1.1. Выбор Технологий

| Компонент | Технология | Обоснование |
|---|---|---|
| Рендеринг | PixiJS 7+ (WebGL2, fallback Canvas) | Лучшая производительность для 2D в браузере, поддержка шейдеров |
| Физика | Matter.js | Лёгкая, достаточная для платформера, хорошая интеграция |
| Звук | Howler.js | Кроссбраузерный, поддержка спрайтов, 3D-позиционирование |
| Сохранения | localStorage + IndexedDB (fallback) | Оффлайн-доступ, без сервера |
| Сборка | Vite + TypeScript | Быстрая разработка, типизация, tree-shaking |
| Тайлмапы | Tiled Map Editor → JSON export | Индустриальный стандарт, удобный для левел-дизайна |
| Анимации | Spine Web Runtime / DragonBones | Скелетная анимация, малый вес файлов |
| Диалоги | Yarn Spinner (JS порт) / Ink.js | Ветвящиеся диалоги, локализация |

### 1.2. Архитектура Кода

```
src/
├── core/
│   ├── Game.ts              // Главный цикл
│   ├── SceneManager.ts      // Управление сценами/уровнями
│   ├── InputManager.ts      // Обработка ввода (клавиатура/геймпад)
│   ├── SaveManager.ts       // Сохранение/загрузка
│   ├── AudioManager.ts      // Музыка и звуки
│   └── EventBus.ts          // Глобальная система событий
│
├── entities/
│   ├── Player.ts            // Класс игрока
│   ├── Enemy.ts             // Базовый класс врага
│   ├── enemies/
│   │   ├── Slime.ts
│   │   ├── Goblin.ts
│   │   ├── Skeleton.ts
│   │   ├── Orc.ts
│   │   ├── DarkKnight.ts
│   │   └── bosses/
│   │       ├── Homunculus.ts
│   │       ├── Drowned.ts
│   │       └── SlimeOfReckoning.ts
│   ├── NPC.ts               // Базовый класс NPC
│   ├── npcs/
│   │   ├── Lira.ts          // Спутница
│   │   ├── Gribl.ts         // Торговец
│   │   └── MalahorShadow.ts // Тень Малахора
│   └── Projectile.ts       // Снаряды
│
├── systems/
│   ├── SkillTree.ts         // Обратное дерево навыков
│   ├── EchoSystem.ts        // Система Эхо
│   ├── CombatSystem.ts      // Боевая система
│   ├── FearSystem.ts        // Уровень страха врагов
│   ├── WeightSystem.ts      // Система веса инвентаря
│   ├── HUDManager.ts        // Деградирующий интерфейс
│   ├── DialogueSystem.ts    // Диалоги
│   └── GateSystem.ts        // Врата Забвения
│
├── levels/
│   ├── Level.ts             // Базовый класс уровня
│   ├── LevelLoader.ts       // Загрузка из Tiled JSON
│   ├── Level01_ThroneRoom.ts
│   ├── Level02_Barracks.ts
│   ├── Level03_Laboratories.ts
│   ├── Level04_Bazaar.ts
│   ├── Level05_Gardens.ts
│   ├── Level06_Arsenal.ts
│   ├── Level07_Catacombs.ts
│   ├── Level08_Galleries.ts
│   ├── Level09_VoidThrone.ts
│   └── Level10_GateOfLight.ts
│
├── ui/
│   ├── MainMenu.ts
│   ├── PauseMenu.ts
│   ├── SkillTreeUI.ts       // Визуализация дерева навыков
│   ├── GateUI.ts            // Интерфейс Врат Забвения
│   ├── DialogueUI.ts
│   ├── InventoryUI.ts
│   └── HUD.ts
│
├── data/
│   ├── skills.json          // Данные всех навыков
│   ├── enemies.json         // Статы врагов
│   ├── echoes.json          // Данные Эхо
│   ├── dialogues/           // Yarn/Ink файлы диалогов
│   ├── levels/              // Tiled JSON карты
│   └── balance.json         // Таблицы баланса
│
└── utils/
    ├── MathUtils.ts
    ├── CollisionUtils.ts
    ├── AnimationUtils.ts
    └── PerformanceMonitor.ts
```

### 1.3. Игровой Цикл (Game Loop)

```
┌──────────────────────────────────────────┐
│              GAME LOOP (60 FPS)          │
│                                          │
│  1. Input Phase                          │
│     └─ InputManager.poll()               │
│                                          │
│  2. Update Phase (delta time)            │
│     ├─ Player.update(dt)                 │
│     │   ├─ SkillTree.getActiveSkills()   │
│     │   ├─ CombatSystem.update(dt)       │
│     │   ├─ WeightSystem.calculate()      │
│     │   └─ EchoSystem.applyPassives()    │
│     ├─ Enemies.forEach(e => e.update(dt))│
│     │   └─ FearSystem.evaluate(player)   │
│     ├─ Lira.update(dt, playerState)      │
│     ├─ Physics.step(dt)                  │
│     ├─ CollisionSystem.resolve()         │
│     └─ LevelTriggers.check()             │
│                                          │
│  3. Late Update                          │
│     ├─ Camera.follow(player)             │
│     ├─ HUDManager.update(playerState)    │
│     └─ ParticleSystem.update(dt)         │
│                                          │
│  4. Render Phase                         │
│     ├─ Background layers (parallax)      │
│     ├─ Tilemap                           │
│     ├─ Entities (sorted by Y)            │
│     ├─ Particles & VFX                   │
│     ├─ Foreground layers                 │
│     └─ HUD overlay                       │
│                                          │
└──────────────────────────────────────────┘
```

### 1.4. Система Сохранений

**Автосохранение:** При входе в каждую новую комнату и при взаимодействии с Вратами Забвения.

**Структура SaveData:**

```typescript
interface SaveData {
  version: string;                    // "1.0.0"
  timestamp: number;                  // Unix timestamp
  
  // Прогресс
  currentLevel: number;               // 1-10
  currentRoom: string;                // ID комнаты
  checkpointPosition: {x: number, y: number};
  
  // Дерево навыков
  skillTree: {
    [skillId: string]: {
      active: boolean;
      echoActive: boolean;
      lostAtLevel: number | null;     // На каком уровне потерян
      lostOrder: number | null;       // Порядковый номер потери
    }
  };
  
  // Состояние игрока
  player: {
    maxHP: number;
    currentHP: number;
    maxMana: number;
    currentMana: number;
    maxStamina: number;
    currentStamina: number;
    inventory: InventoryItem[];
    totalWeight: number;
    deathCount: number;
  };
  
  // Состояние мира
  world: {
    enemiesKilled: {[enemyId: string]: boolean};
    chestsOpened: {[chestId: string]: boolean};
    secretsFound: {[secretId: string]: boolean};
    npcDialogueState: {[npcId: string]: number};
    liraAbility: LiraAbilityTier;
  };
  
  // Мета
  totalPlayTime: number;              // В секундах
  skillsLostTotal: number;
  currentPath: string;                // Автоопределение "пути" игрока
}
```

### 1.5. Оптимизация для Web

| Проблема | Решение |
|---|---|
| Большой размер ассетов | Ленивая загрузка уровней. Каждый уровень — отдельный бандл. Спрайтшиты через TexturePacker |
| Производительность на слабых машинах | Object pooling для снарядов/частиц. Culling невидимых объектов. Опция «Низкое качество» (отключает шейдеры и частицы) |
| Потеря фокуса вкладки | Автопауза при потере фокуса. Сохранение delta time для корректного возврата |
| Загрузка | Прогресс-бар с подсказками и лором во время загрузки уровней |
| Размер билда | Tree-shaking, минификация, сжатие текстур (WebP), аудио (OGG Vorbis) |
| Целевой размер | Начальная загрузка ≤ 5MB, каждый уровень ≤ 3MB |

---

## ЧАСТЬ 2: СИСТЕМА УПРАВЛЕНИЯ

### 2.1. Раскладка Клавиатуры

```
╔══════════════════════════════════════════════════╗
║                  УПРАВЛЕНИЕ                      ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  Движение:          [W][A][S][D] или стрелки     ║
║  Прыжок:            [Space]                      ║
║  Лёгкий удар:       [J] или ЛКМ                 ║
║  Тяжёлый удар:      [K] или ПКМ                 ║
║  Навык 1:           [U]                          ║
║  Навык 2:           [I]                          ║
║  Навык 3:           [O]                          ║
║  Навык 4 (Ультима): [P]                          ║
║  Перекат/Уклонение: [Shift]                      ║
║  Взаимодействие:    [E]                          ║
║  Инвентарь:         [Tab]                        ║
║  Дерево навыков:    [T]                          ║
║  Пауза:             [Esc]                        ║
║                                                  ║
║  Камера не управляется — автоследование          ║
╚══════════════════════════════════════════════════╝
```

### 2.2. Адаптация Управления к Потере Навыков

Когда навык потерян, его клавиша **не исчезает мгновенно**. Вместо этого:

1. **Первое нажатие после потери:** Кейн пытается использовать навык — анимация неудачи (сжимает кулак, из него вылетает искра и гаснет). Звук — приглушённый «пшик».
2. **Последующие нажатия:** Кейн качает головой. Лира комментирует: *«Ты опять забыл, что забыл это»*.
3. **Через 5 нажатий:** Клавиша деактивируется, иконка на HUD угасает.

**Цель:** Игрок **физически ощущает** потерю через мышечную память. Он по привычке жмёт кнопку — и ничего не происходит. Это создаёт эмоциональный эффект, невозможный через катсцены.

### 2.3. Геймпад (Опционально)

```
╔══════════════════════════════════════════════════╗
║              ГЕЙМПАД (Xbox Layout)               ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  Левый стик:        Движение                     ║
║  A:                 Прыжок                       ║
║  X:                 Лёгкий удар                  ║
║  Y:                 Тяжёлый удар                 ║
║  B:                 Взаимодействие               ║
║  RB:                Перекат                       ║
║  LB:                Модификатор навыков           ║
║  LB + X/Y/A/B:      Навыки 1/2/3/4              ║
║  D-Pad:             Быстрый доступ к предметам   ║
║  Start:             Пауза                        ║
║  Select:            Дерево навыков               ║
║                                                  ║
╚══════════════════════════════════════════════════╝
```

---

## ЧАСТЬ 3: ЧИСЛОВОЙ БАЛАНС

### 3.1. Базовые Статы Игрока

```typescript
const PLAYER_BASE_STATS = {
  // === ЗДОРОВЬЕ ===
  maxHP: 100,              // Базовое (без модификаторов навыков)
  hpWithArmor: 150,        // С навыком "Тяжёлая броня" (+50%)
  hpRegenPerSec: 0,        // Без навыка "Регенерация"
  hpRegenWithSkill: 2,     // С навыком "Регенерация" (HP/сек вне боя)
  
  // === МАНА ===
  maxMana: 0,              // Без навыка "Базовая магия"
  maxManaWithSkill: 100,   // С навыком "Базовая магия"
  manaRegenPerSec: 3,      // Пассивная регенерация маны
  
  // === СТАМИНА ===
  maxStamina: 100,         // Всегда доступна
  staminaRegenPerSec: 25,  // Быстрое восстановление
  staminaRegenDelay: 0.8,  // Секунд перед началом регенерации
  
  // === ДВИЖЕНИЕ ===
  walkSpeed: 150,          // Пикселей/сек
  sprintSpeed: 300,        // С навыком "Спринт"
  sprintStaminaCost: 20,   // Стамина/сек при спринте
  jumpForce: 400,          // Сила прыжка
  doubleJumpForce: 350,    // С навыком "Акробатика"
  rollSpeed: 350,          // Скорость перекатa
  rollDuration: 0.4,       // Секунд
  rollStaminaCost: 25,     // За один перекат
  rollCooldown: 0.6,       // Секунд между перекатами
  iFrameDuration: 0.25,    // Кадры неуязвимости (с "Акробатикой")
  iFrameWithoutSkill: 0,   // Без "Акробатики" — нет i-frames
  
  // === ВЕС ===
  baseWeight: 0,           // Голый персонаж
  weightCapacity: 100,     // Максимальная грузоподъёмность
};
```

### 3.2. Полная Таблица Навыков — Числовые Значения

#### ВЕТКА СИЛЫ

```typescript
const SKILL_STRENGTH = {
  // ---- БАЗА: Владение мечом ----
  swordMastery: {
    id: "str_base",
    branch: "strength",
    tier: 0,
    name: "Владение мечом",
    description: "Позволяет использовать мечи. Комбо из 3 ударов.",
    effects: {
      enableSwords: true,
      lightAttackDamage: 15,      // Урон за удар
      comboMultipliers: [1.0, 1.2, 1.5], // Множители за 1й, 2й, 3й удар
      attackSpeed: 0.4,           // Секунд между ударами
      attackRange: 80,            // Пикселей
    },
    staminaCost: 10,              // За удар
    echo: {
      id: "echo_blade",
      name: "Эхо Клинка",
      description: "Удары палкой наносят +5% урона",
      effect: { damageMultiplier: 1.05 }
    },
    prerequisites: [],            // Корневой навык ветки
    dependents: ["str_t2"]        // Что зависит от этого навыка
  },

  // ---- Ур.2: Силовой замах ----
  powerStrike: {
    id: "str_t2",
    branch: "strength",
    tier: 1,
    name: "Силовой замах",
    description: "Медленный мощный удар. Ломает щиты и хрупкие стены.",
    effects: {
      heavyAttackDamage: 45,
      chargeTime: 0.8,            // Секунд зарядки
      shieldBreak: true,
      wallBreak: true,            // Ломает хрупкие стены за 1 удар
      knockback: 120,             // Пикселей отброса
      attackRange: 100,
    },
    staminaCost: 30,
    echo: {
      id: "echo_force",
      name: "Эхо Силы",
      description: "Хрупкие стены ломаются за 5 ударов палкой",
      effect: { wallBreakHits: 5 }
    },
    prerequisites: ["str_base"],
    dependents: ["str_t3"]
  },

  // ---- Ур.3: Вихрь Клинков ----
  bladeVortex: {
    id: "str_t3",
    branch: "strength",
    tier: 2,
    name: "Вихрь Клинков",
    description: "Вращающаяся атака по площади.",
    effects: {
      damage: 25,                 // За тик
      tickRate: 0.3,              // Секунд между тиками
      duration: 2.0,              // Секунд
      radius: 120,                // Пикселей
      movementDuringVortex: 0.5,  // 50% скорости движения
    },
    staminaCost: 50,
    manaCost: 0,
    cooldown: 8,                  // Секунд
    echo: {
      id: "echo_vortex",
      name: "Эхо Вихря",
      description: "Лёгкий откат врагов при ударе палкой",
      effect: { knockbackOnHit: 20 }
    },
    prerequisites: ["str_t2"],
    dependents: ["str_t4"]
  },

  // ---- Ур.4: Танец Смерти (УЛЬТИМА) ----
  deathDance: {
    id: "str_t4",
    branch: "strength",
    tier: 3,
    name: "Танец Смерти",
    description: "УЛЬТИМА: 10 секунд неудержимых атак, уничтожающих всё.",
    effects: {
      damagePerHit: 60,
      hitsPerSecond: 5,
      duration: 10,
      radius: 150,
      invulnerable: true,         // Неуязвим во время танца
      autoTarget: true,           // Автоматически бьёт ближайших
    },
    staminaCost: 0,               // Ультима не тратит стамину
    cooldown: 120,                // 2 минуты
    echo: {
      id: "echo_dance",
      name: "Эхо Танца",
      description: "После убийства: +10% скорость атаки на 2 сек",
      effect: { 
        onKillBuff: {
          attackSpeedMultiplier: 1.1,
          duration: 2.0 
        }
      }
    },
    prerequisites: ["str_t3"],
    dependents: []
  }
};
```

#### ВЕТКА МАГИИ

```typescript
const SKILL_MAGIC = {
  // ---- БАЗА: Базовая магия ----
  basicMagic: {
    id: "mag_base",
    branch: "magic",
    tier: 0,
    name: "Базовая магия",
    effects: {
      enableMana: true,
      magicBoltDamage: 8,
      magicBoltSpeed: 400,        // Пикс/сек
      magicBoltRange: 500,        // Пикс (затем исчезает)
      magicBoltCost: 8,           // Маны
      castTime: 0.3,              // Секунд
    },
    echo: {
      id: "echo_mana",
      name: "Эхо Маны",
      description: "Магические объекты подсвечиваются",
      effect: { highlightMagicObjects: true }
    },
    prerequisites: [],
    dependents: ["mag_t2a", "mag_t2b"]  // Ветвление!
  },

  // ---- Ур.2a: Огненный шар ----
  fireball: {
    id: "mag_t2a",
    branch: "magic",
    tier: 1,
    name: "Огненный шар",
    effects: {
      damage: 30,
      splashRadius: 80,
      splashDamage: 15,           // 50% от основного
      burnDamage: 5,              // Горение
      burnDuration: 3,            // Секунд
      burnTickRate: 1,            // Раз в секунду
      ignitesEnvironment: true,   // Поджигает горючее
      projectileSpeed: 250,
    },
    manaCost: 20,
    cooldown: 3,
    echo: {
      id: "echo_fire",
      name: "Эхо Огня",
      description: "5% шанс поджечь при ударе палкой",
      effect: { 
        onHitBurnChance: 0.05,
        burnDamage: 2,
        burnDuration: 2 
      }
    },
    prerequisites: ["mag_base"],
    dependents: ["mag_t3"]
  },

  // ---- Ур.2b: Ледяные оковы ----
  iceShackles: {
    id: "mag_t2b",
    branch: "magic",
    tier: 1,
    name: "Ледяные оковы",
    effects: {
      freezeDuration: 5,          // Полная заморозка цели
      slowRadius: 100,            // Радиус замедления вокруг
      slowAmount: 0.5,            // 50% замедление
      slowDuration: 3,
      damage: 10,                 // Урон при заморозке
      frozenDamageMultiplier: 1.5,// Замороженные получают +50% урона
    },
    manaCost: 25,
    cooldown: 10,
    echo: {
      id: "echo_ice",
      name: "Эхо Льда",
      description: "Враги замедляются на 0.2 сек при получении удара",
      effect: { onHitSlow: { amount: 0.7, duration: 0.2 } }
    },
    prerequisites: ["mag_base"],
    dependents: ["mag_t3"]
  },

  // ---- Ур.3: Огненный шторм ----
  firestorm: {
    id: "mag_t3",
    branch: "magic",
    tier: 2,
    name: "Огненный шторм",
    effects: {
      damagePerTick: 20,
      tickRate: 0.5,
      duration: 5,
      radius: 200,
      castTime: 1.2,              // Длинная анимация каста
      ignitesEverything: true,
    },
    manaCost: 40,
    cooldown: 15,
    echo: {
      id: "echo_storm",
      name: "Эхо Шторма",
      description: "При убийстве магией: маленький взрыв (20 пикс, 3 урона)",
      effect: { onMagicKillExplosion: { radius: 20, damage: 3 } }
    },
    prerequisites: ["mag_t2a"],   // Нужен огненный шар ИЛИ ледяные оковы
    alternativePrereq: ["mag_t2b"],
    dependents: ["mag_t4"]
  },

  // ---- Ур.4: Армагеддон (УЛЬТИМА) ----
  armageddon: {
    id: "mag_t4",
    branch: "magic",
    tier: 3,
    name: "Армагеддон",
    effects: {
      meteorCount: 12,
      damagePerMeteor: 80,
      meteorRadius: 60,
      totalDuration: 4,           // Секунд (метеоры падают волнами)
      screenShake: true,
      destroysEnvironment: true,
    },
    manaCost: 80,                 // Почти вся мана
    cooldown: 180,                // 3 минуты
    echo: {
      id: "echo_armageddon",
      name: "Эхо Армагеддона",
      description: "При смерти врага: 1 урон всем в радиусе 30 пикс",
      effect: { onAnyKillExplosion: { radius: 30, damage: 1 } }
    },
    prerequisites: ["mag_t3"],
    dependents: []
  }
};
```

#### ВЕТКА ЗАЩИТЫ

```typescript
const SKILL_DEFENSE = {
  // ---- БАЗА: Тяжёлая броня ----
  heavyArmor: {
    id: "def_base",
    branch: "defense",
    tier: 0,
    name: "Тяжёлая броня",
    effects: {
      maxHPBonus: 50,             // +50 к максимальному HP
      damageReduction: 0.3,       // -30% входящего урона
      weightAdded: 30,            // Единиц веса
    },
    echo: {
      id: "echo_armor",
      name: "Эхо Брони",
      description: "+5 к максимальному HP",
      effect: { maxHPBonus: 5 }
    },
    prerequisites: [],
    dependents: ["def_t2"]
  },

  // ---- Ур.2: Парирование ----
  parry: {
    id: "def_t2",
    branch: "defense",
    tier: 1,
    name: "Парирование",
    effects: {
      parryWindow: 0.2,           // Секунд (окно успешного парирования)
      parryStunDuration: 1.5,     // Оглушение врага при успехе
      perfectParryWindow: 0.08,   // Идеальное парирование
      perfectParryDamageReflect: 0.5, // Отражение 50% урона
      parryAnyDirection: true,    // Парирует с любого направления
    },
    staminaCost: 15,              // За попытку
    echo: {
      id: "echo_reflex",
      name: "Эхо Рефлексa",
      description: "Враги подсвечиваются за 0.3 сек до атаки",
      effect: { enemyAttackIndicatorTime: 0.3 }
    },
    prerequisites: ["def_base"],
    dependents: ["def_t3"]
  },

  // ---- Ур.3: Магический щит ----
  manaShield: {
    id: "def_t3",
    branch: "defense",
    tier: 2,
    name: "Магический щит",
    effects: {
      charges: 3,                 // Поглощает 3 удара
      absorbAnyDamage: true,      // Любой урон = 0
      rechargeCooldown: 15,       // Секунд до полной перезарядки
      shieldRadius: 40,           // Визуальный радиус
    },
    echo: {
      id: "echo_shield",
      name: "Эхо Щита",
      description: "Раз в 60 сек автоматически блокируется 1 удар",
      effect: { autoBlockInterval: 60, autoBlockCharges: 1 }
    },
    prerequisites: ["def_t2"],
    dependents: ["def_t4"]
  },

  // ---- Ур.4: Неуязвимость (УЛЬТИМА) ----
  invulnerability: {
    id: "def_t4",
    branch: "defense",
    tier: 3,
    name: "Неуязвимость",
    effects: {
      duration: 8,
      immuneToAllDamage: true,
      immuneToCC: true,           // Иммунитет к контролю
      canAttackDuring: true,
    },
    cooldown: 120,
    echo: {
      id: "echo_invuln",
      name: "Эхо Неуязвимости",
      description: "При смертельном ударе: 1 HP вместо смерти (раз за уровень)",
      effect: { deathSave: { hpAfter: 1, usesPerLevel: 1 } }
    },
    prerequisites: ["def_t3"],
    dependents: []
  }
};
```

#### ВЕТКА ЛОВКОСТИ

```typescript
const SKILL_AGILITY = {
  // ---- БАЗА: Спринт ----
  sprint: {
    id: "agi_base",
    branch: "agility",
    tier: 0,
    name: "Спринт",
    effects: {
      sprintSpeedMultiplier: 2.0, // x2 скорости ходьбы
      sprintStaminaCost: 20,      // /сек
    },
    echo: {
      id: "echo_speed",
      name: "Эхо Скорости",
      description: "Базовая скорость ходьбы +10%",
      effect: { walkSpeedMultiplier: 1.1 }
    },
    prerequisites: [],
    dependents: ["agi_t2"]
  },

  // ---- Ур.2: Акробатика ----
  acrobatics: {
    id: "agi_t2",
    branch: "agility",
    tier: 1,
    name: "Акробатика",
    effects: {
      doubleJump: true,
      doubleJumpForce: 350,
      rollIFrames: true,          // Кувырок даёт неуязвимость
      iFrameDuration: 0.25,
      wallJump: true,             // Прыжок от стены
      wallJumpForce: 300,
    },
    echo: {
      id: "echo_acrobatics",
      name: "Эхо Акробатики",
      description: "Обычный прыжок на 15% выше",
      effect: { jumpForceMultiplier: 1.15 }
    },
    prerequisites: ["agi_base"],
    dependents: ["agi_t3"]
  },

  // ---- Ур.3: Скрытность ----
  stealth: {
    id: "agi_t3",
    branch: "agility",
    tier: 2,
    name: "Скрытность",
    effects: {
      stealthMode: true,          // Активный стелс-режим
      stealthSpeedMultiplier: 0.6,// 60% от базовой скорости
      detectionRadiusReduction: 0.5, // Враги видят на 50% ближе
      backstabMultiplier: 3.0,    // x3 урона из стелса
      noiseReduction: true,       // Шаги бесшумны
      shadowInvisibility: true,   // Невидим в тёмных зонах
    },
    staminaCost: 10,              // /сек в режиме стелса
    echo: {
      id: "echo_shadow",
      name: "Эхо Тени",
      description: "Враги замечают на 20% медленнее",
      effect: { enemyDetectionTimeMultiplier: 1.2 }
    },
    prerequisites: ["agi_t2"],
    dependents: ["agi_t4"]
  },

  // ---- Ур.4: Телепортация (УЛЬТИМА) ----
  teleport: {
    id: "agi_t4",
    branch: "agility",
    tier: 3,
    name: "Телепортация",
    effects: {
      teleportRange: 250,         // Пикселей
      passThroughWalls: true,
      passThroughEnemies: true,
      damageOnArrival: 20,        // Урон врагам в точке появления
      cooldown: 5,
    },
    staminaCost: 35,
    echo: {
      id: "echo_teleport",
      name: "Эхо Телепорта",
      description: "Кувырок проходит сквозь врагов",
      effect: { rollThroughEnemies: true }
    },
    prerequisites: ["agi_t3"],
    dependents: []
  }
};
```

#### ВЕТКА АУРЫ

```typescript
const SKILL_AURA = {
  // ---- БАЗА: Регенерация ----
  regeneration: {
    id: "aur_base",
    branch: "aura",
    tier: 0,
    name: "Регенерация",
    effects: {
      hpRegenOutOfCombat: 2,      // HP/сек вне боя
      hpRegenInCombat: 0.5,       // HP/сек в бою (слабая)
      outOfCombatDelay: 5,        // Секунд без урона = "вне боя"
    },
    echo: {
      id: "echo_life",
      name: "Эхо Жизни",
      description: "+1 HP при входе в новую комнату",
      effect: { healOnRoomEnter: 1 }
    },
    prerequisites: [],
    dependents: ["aur_t2"]
  },

  // ---- Ур.2: Аура Огня ----
  fireAura: {
    id: "aur_t2",
    branch: "aura",
    tier: 1,
    name: "Аура Огня",
    effects: {
      damagePerSecond: 5,
      radius: 60,                 // Пикселей от центра персонажа
      ignitesNearby: true,        // Поджигает горючее
      lightRadius: 100,           // Освещает темноту
    },
    echo: {
      id: "echo_heat",
      name: "Эхо Жара",
      description: "Враги в радиусе 30 пикс: 1 урон/5сек",
      effect: { passiveDamage: { radius: 30, damage: 1, interval: 5 } }
    },
    prerequisites: ["aur_base"],
    dependents: ["aur_t3"]
  },

  // ---- Ур.3: Аура Страха ----
  fearAura: {
    id: "aur_t3",
    branch: "aura",
    tier: 2,
    name: "Аура Страха",
    effects: {
      fearRadius: 150,
      weakEnemyFlee: true,        // Слабые убегают
      mediumEnemySlow: 0.3,       // Средние замедлены на 30%
      strongEnemySlow: 0.1,       // Сильные замедлены на 10%
      fearReducesAttack: 0.15,    // Все в ауре: -15% урона
    },
    echo: {
      id: "echo_presence",
      name: "Эхо Присутствия",
      description: "Слабые враги колеблются 1 сек перед атакой",
      effect: { weakEnemyHesitation: 1.0 }
    },
    prerequisites: ["aur_t2"],
    dependents: ["aur_t4"]
  },

  // ---- Ур.4: Аура Аннигиляции (УЛЬТИМА) ----
  annihilationAura: {
    id: "aur_t4",
    branch: "aura",
    tier: 3,
    name: "Аура Аннигиляции",
    effects: {
      damagePerSecond: 40,
      radius: 100,
      destroysProjectiles: true,  // Уничтожает снаряды
      destroysEnvironment: true,  // Ломает стены, полы
      duration: 15,               // Не постоянная — активируемая
    },
    cooldown: 180,
    echo: {
      id: "echo_destruction",
      name: "Эхо Разрушения",
      description: "Разрушаемые объекты ломаются на 1 удар быстрее",
      effect: { destructibleHPReduction: 1 }
    },
    prerequisites: ["aur_t3"],
    dependents: []
  }
};
```

### 3.3. Таблица Врагов — Полные Статы

```typescript
const ENEMIES = {
  // =========================================
  //            БАЗОВЫЕ ВРАГИ
  // =========================================
  
  slime: {
    id: "slime",
    name: "Слизь",
    hp: 10,
    damage: 3,
    attackSpeed: 1.5,           // Секунд между атаками
    moveSpeed: 40,              // Пикс/сек
    detectionRange: 100,        // Пикс
    attackRange: 30,            // Пикс (контактный урон)
    fearThreshold: 2,           // Навыков у игрока для страха
    xpValue: 0,                 // XP не нужен
    
    behavior: {
      aboveFear: "flee",        // Убегает при > 2 навыков
      belowFear: "aggressive",  // Атакует при ≤ 2 навыков
      patrol: "random_walk",
      attackPattern: "hop_towards_player",
    },
    
    variants: {
      fireSlime: { hp: 8, damage: 5, immuneToFire: true },
      iceSlime: { hp: 12, damage: 2, slowOnHit: 0.3 },
      giantSlime: { hp: 30, damage: 8, moveSpeed: 25, size: 2.0 },
    }
  },

  goblin: {
    id: "goblin",
    name: "Гоблин",
    hp: 25,
    damage: 8,
    attackSpeed: 1.0,
    moveSpeed: 120,
    detectionRange: 200,
    attackRange: 50,
    fearThreshold: 5,
    
    behavior: {
      aboveFear: "panic_flee",
      belowFear: "ambush_tactics",   // Прячется, ждёт, атакует в спину
      patrol: "group_patrol",        // Ходят группами по 2-3
      attackPattern: "quick_stab",
      specialAbility: "call_reinforcements", // Зовёт других
      reinforcementRange: 300,
    },
    
    variants: {
      goblinArcher: { 
        attackRange: 350, 
        projectileSpeed: 300,
        damage: 6,
        behavior: { attackPattern: "ranged_shoot" }
      },
      goblinShaman: {
        hp: 20,
        damage: 12,
        attackRange: 250,
        behavior: { 
          attackPattern: "magic_bolt",
          specialAbility: "heal_allies",
          healAmount: 10,
          healRange: 150,
        }
      },
      goblinBomber: {
        hp: 15,
        damage: 20,               // Высокий урон, но...
        behavior: {
          attackPattern: "throw_bomb",
          bombFuseTime: 2.0,      // Можно отбить или убежать
          bombRadius: 80,
          selfDamage: true,       // Может убить сам себя
        }
      }
    }
  },

  skeleton: {
    id: "skeleton",
    name: "Скелет-Воин",
    hp: 40,
    damage: 12,
    attackSpeed: 1.2,
    moveSpeed: 80,
    detectionRange: 250,
    attackRange: 70,              // Меч
    fearThreshold: 8,
    armor: 5,                    // Плоское снижение урона
    
    behavior: {
      aboveFear: "cautious_retreat",
      belowFear: "formation_attack",  // Атакуют строем
      patrol: "guard_position",
      attackPattern: "sword_combo_2hit",
      specialAbility: "shield_block", // Блокирует фронтальные атаки
      blockChance: 0.3,
    },
    
    variants: {
      skeletonKnight: {
        hp: 60, armor: 10, damage: 15,
        behavior: { blockChance: 0.5, attackPattern: "sword_combo_3hit" }
      },
      skeletonArcher: {
        hp: 25, armor: 2,
        attackRange: 400,
        behavior: { attackPattern: "ranged_volley", volleyCount: 3 }
      },
      skeletonMage: {
        hp: 30, armor: 0,
        damage: 18,
        attackRange: 300,
        behavior: { 
          attackPattern: "dark_bolt",
          specialAbility: "resurrect_skeleton",  // Поднимает убитых скелетов!
          resurrectRange: 200,
          resurrectCooldown: 20,
        }
      }
    }
  },

  orc: {
    id: "orc",
    name: "Орк-Берсерк",
    hp: 80,
    damage: 20,
    attackSpeed: 1.8,            // Медленный, но мощный
    moveSpeed: 100,
    detectionRange: 300,
    attackRange: 90,
    fearThreshold: 12,
    armor: 8,
    
    behavior: {
      aboveFear: "honorable_duel",   // Вызывает на честный бой
      belowFear: "gang_attack",      // Нападает толпой
      patrol: "aggressive_patrol",
      attackPattern: "heavy_swing",
      specialAbility: "enrage",      // При < 30% HP: +50% урон, +30% скорость
      enrageThreshold: 0.3,
      enrageDamageBonus: 1.5,
      enrageSpeedBonus: 1.3,
    },
    
    variants: {
      orcWarchief: {
        hp: 120, damage: 25, armor: 12,
        behavior: {
          specialAbility: "war_cry",  // Баффает всех орков в радиусе
          warCryRadius: 200,
          warCryDamageBonus: 1.3,
          warCryCooldown: 15,
        }
      }
    }
  },

  darkKnight: {
    id: "dark_knight",
    name: "Тёмный Рыцарь",
    hp: 120,
    damage: 25,
    attackSpeed: 1.4,
    moveSpeed: 90,
    detectionRange: 350,
    attackRange: 80,
    fearThreshold: 16,
    armor: 15,
    
    behavior: {
      aboveFear: "respectful_bow_then_fight",
      belowFear: "ruthless_assassin",
      patrol: "sentinel",
      attackPattern: "dark_sword_combo_4hit",
      specialAbility: "dark_charge",  // Рывок на 200 пикс с уроном
      chargeDamage: 35,
      chargeRange: 200,
      chargeCooldown: 8,
      canParry: true,                // Парирует атаки игрока!
      parryChance: 0.2,
    }
  }
};
```

### 3.4. Формулы Урона

```typescript
// === ФОРМУЛА ИСХОДЯЩЕГО УРОНА (от игрока) ===
function calculatePlayerDamage(
  baseDamage: number,           // Базовый урон навыка/оружия
  comboMultiplier: number,      // Множитель комбо (1.0, 1.2, 1.5)
  echoBonuses: EchoBonus[],     // Все активные Эхо
  backstabMultiplier: number,   // 1.0 (обычно) или 3.0 (из стелса)
  targetArmor: number,          // Броня врага
  targetFrozen: boolean,        // Заморожен?
  targetBurning: boolean        // Горит?
): number {
  
  let damage = baseDamage;
  
  // 1. Комбо множитель
  damage *= comboMultiplier;
  
  // 2. Эхо бонусы (аддитивно)
  let echoBonus = 1.0;
  for (const echo of echoBonuses) {
    echoBonus += (echo.damageMultiplier - 1.0);
  }
  damage *= echoBonus;
  
  // 3. Удар из стелса
  damage *= backstabMultiplier;
  
  // 4. Бонус по замороженным
  if (targetFrozen) damage *= 1.5;
  
  // 5. Вычитание брони (плоское)
  damage = Math.max(1, damage - targetArmor);
  
  return Math.floor(damage);
}


// === ФОРМУЛА ВХОДЯЩЕГО УРОНА (по игроку) ===
function calculateDamageToPlayer(
  baseDamage: number,           // Базовый урон врага
  armorReduction: number,       // 0.3 (с бронёй) или 0 (без)
  shieldActive: boolean,        // Магический щит?
  parrySuccess: boolean,        // Успешное парирование?
  echoShieldReady: boolean,     // Эхо Щита готово?
  fearAuraReduction: number     // 0.15 (с Аурой Страха) или 0
): DamageResult {
  
  // Парирование — полная блокировка
  if (parrySuccess) {
    return { damage: 0, stunEnemy: true, reflected: baseDamage * 0.5 };
  }
  
  // Магический щит — полное поглощение
  if (shieldActive) {
    return { damage: 0, shieldChargeConsumed: true };
  }
  
  // Эхо Щита — одноразовая блокировка
  if (echoShieldReady) {
    return { damage: 0, echoShieldConsumed: true };
  }
  
  let damage = baseDamage;
  
  // Снижение от брони (процентное)
  damage *= (1 - armorReduction);
  
  // Снижение от Ауры Страха
  damage *= (1 - fearAuraReduction);
  
  // Минимальный урон всегда 1
  damage = Math.max(1, Math.floor(damage));
  
  return { damage, stunEnemy: false, reflected: 0 };
}
```

### 3.5. Таблица Баланса HP Игрока по Фазам

```
╔════════════════╦══════════╦════════════╦══════════════════════╗
║   Фаза         ║ Макс HP  ║ Эфф. HP*   ║ Удары до смерти**   ║
╠════════════════╬══════════╬════════════╬══════════════════════╣
║ Бог (20)       ║   150    ║   ~600     ║ ~50 (от гоблина)    ║
║ Герой (15)     ║   150    ║   ~300     ║ ~25                 ║
║ Ветеран (10)   ║   100    ║   ~150     ║ ~12                 ║
║ Выживающий (5) ║   100    ║   ~110     ║ ~8                  ║
║ Никто (0)      ║   105*** ║   ~105     ║ ~3 (от орка)        ║
╚════════════════╩══════════╩════════════╩══════════════════════╝

*  Эфф. HP = учитывает броню, щиты, регенерацию, неуязвимость
** От среднего врага текущего акта
*** 100 базовых + 5 от Эхо Брони
```

### 3.6. Скорость Потери Навыков По Уровням

```
╔═══════════╦═══════════════╦══════════╦══════════════════════════════════╗
║ Уровень   ║ Навыков до/   ║ Потеря   ║ Тип Врат                        ║
║           ║ после         ║          ║                                  ║
╠═══════════╬═══════════════╬══════════╬══════════════════════════════════╣
║ 1 (пролог)║ 20/20         ║ 0        ║ —                                ║
║ 2         ║ 20/18         ║ 2        ║ 1 Сила + 1 Движение             ║
║ 3         ║ 18/15         ║ 3        ║ 2 Любых + 1 Защита              ║
║ БОСС 1   ║ 15/15         ║ 0        ║ —                                ║
║ 4         ║ 15/13         ║ 2        ║ 1 Сила + 1 Любой                ║
║ 5         ║ 13/10         ║ 3        ║ 2 Защита/Аура + 1 Движение      ║
║ 6         ║ 10/7          ║ 3        ║ 3 Любых (Великие Врата)          ║
║ БОСС 2   ║ 7/7           ║ 0        ║ —                                ║
║ 7         ║ 7/5           ║ 2        ║ 1 Любой + 1 Сила                ║
║ 8         ║ 5/3           ║ 2        ║ 2 Любых                         ║
║ 9         ║ 3/1           ║ 2        ║ 1 Любой + 1 Любой               ║
║ 10        ║ 1/0           ║ 1        ║ 1 Любой (последний)             ║
║ ФИНАЛ     ║ 0/0           ║ —        ║ —                                ║
╠═══════════╬═══════════════╬══════════╬══════════════════════════════════╣
║ ИТОГО     ║ 20 → 0        ║ 20       ║                                  ║
╚═══════════╩═══════════════╩══════════╩══════════════════════════════════╝
```

---

## ЧАСТЬ 4: ДИЗАЙН УРОВНЕЙ — ДЕТАЛЬНЫЕ СХЕМЫ

### 4.1. Система Комнат

Каждый уровень состоит из **комнат** — отдельных экранов/секций, соединённых переходами. Камера фиксируется на комнате или плавно скроллится в крупных комнатах.

**Типы комнат:**

```typescript
enum RoomType {
  COMBAT,         // Враги, двери закрываются до зачистки
  PUZZLE,         // Головоломка, нет/мало врагов
  PLATFORMING,    // Прыжки и платформинг
  EXPLORATION,    // Свободное исследование, секреты
  GATE,           // Врата Забвения
  SAFE,           // Безопасная зона (сохранение, NPC, торговля)
  BOSS,           // Арена босса
  TRANSITION,     // Коридор между секциями
  SECRET,         // Секретная комната (скрытый вход)
}
```

**Размеры комнат:**
- Малая: 1920x1080 (один экран)
- Средняя: 3840x1080 (два экрана горизонтально) или 1920x2160 (два экрана вертикально)
- Большая: 3840x2160 (четыре экрана)
- Арена Босса: 2880x1620 (полтора экрана с запасом)

### 4.2. Уровень 2: Казармы Тьмы — Покомнатная Карта

```
    ┌─────────────────────────────────────────────────────┐
    │                  УРОВЕНЬ 2: КАЗАРМЫ                  │
    │                                                     │
    │   [START]                                           │
    │     ║                                               │
    │   ╔═══╗     ╔═══╗                                   │
    │   ║2-1║═════║2-2║           ЛЕГЕНДА:                 │
    │   ╚═╤═╝     ╚═╤═╝           C = Combat              │
    │     │         │              P = Puzzle              │
    │   ╔═╧═╗     ╔═╧═══╗         S = Safe                │
    │   ║2-3║═════║2-4   ║         G = Gate                │
    │   ╚═╤═╝     ╚══╤══╝         E = Exploration         │
    │     │          │             ! = Secret              │
    │     │        ╔═╧═╗                                   │
    │     │        ║2-5║                                   │
    │     │        ╚═╤═╝                                   │
    │   ╔═╧═══════╗  │                                    │
    │   ║  2-6    ╠══╝                                    │
    │   ╚════╤════╝                                       │
    │        │                                            │
    │      ╔═╧═╗                                          │
    │      ║2-7║                                          │
    │      ╚═╤═╝                                          │
    │     [EXIT → Уровень 3]                              │
    └─────────────────────────────────────────────────────┘
```

**Комната 2-1: «Столовая» (Combat/Exploration — Средняя)**
```
┌──────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │   ▓ = стена
│ ▓                                  ▓ │   ═ = платформа
│ ▓   ☗  ☗        ☗                  ▓ │   ☗ = стол (разрушаемый)
│ ▓ ════════   ═══════               ▓ │   G = гоблин (паникующий)
│ ▓                      G  G        ▓ │   ○ = еда (лечение 5 HP)
│ ▓   ○  ○  ○                        ▓ │   ⇒ = переход
│ ▓ ══════════════════════════════    ▓ │   ! = секрет за столом
│ ▓         G    G    G              ▓ │
│ ▓   ☗  ☗        ☗  ☗    !         ▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓⇒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│             ↓                        │
│          [к 2-3]                     │
└──────────────────────────────────────┘

Поведение: Гоблины G паникуют и убегают от Кейна (страх > 5).
Если игрок уже потерял 15+ навыков (маловероятно на уровне 2, 
но возможно в NG+), гоблины атакуют.

Секрет (!): За разрушаемым столом — щель в стене. 
Доступна только если убрана Тяжёлая Броня (Кейн пролезает).
Внутри — записка и монеты.
```

**Комната 2-5: «Тренировочный Зал» (Combat — Средняя)**
```
┌──────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓                                  ▓ │   S = Скелет-Воин
│ ▓   ╔══╗          ╔══╗             ▓ │   T = тренировочный манекен
│ ▓   ║T ║    S     ║T ║     S      ▓ │   ♦ = оружейная стойка
│ ▓   ╚══╝          ╚══╝             ▓ │       (декорация/разрушаемая)
│ ▓ ══════════  ══════════════════   ▓ │
│ ▓         S          S             ▓ │   Двери закрываются при входе!
│ ▓   ♦  ♦      ♦  ♦      ♦  ♦     ▓ │   Нужно убить всех скелетов.
│ ▓                                  ▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└──────────────────────────────────────┘

Скелеты (4 шт.) - первый настоящий бой.
На уровне 18-20 навыков — тривиально.
Цель: показать паттерны атак скелетов, которые 
станут опасны в Акте 3.
```

**Комната 2-6: «Врата Забвения #1» (Gate — Малая)**
```
┌──────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓                                  ▓ │
│ ▓            ╔═══════╗             ▓ │   ╬ = Врата Забвения
│ ▓            ║       ║             ▓ │       (пульсирующее свечение)
│ ▓            ╬ ВРАТА ╬             ▓ │
│ ▓            ║       ║             ▓ │   Требование:
│ ▓            ╚═══════╝             ▓ │   "Пожертвуй навыком Силы"
│ ▓                                  ▓ │   + "Пожертвуй навыком Движения"
│ ▓      [алтарь сохранения]         ▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└──────────────────────────────────────┘

Первые Врата в игре.
Атмосфера: тревожная музыка, свет мерцает.
Подробная кинематографика потери навыка.
```

### 4.3. Уровень 7: Катакомбы Забытых — Покомнатная Карта

*Пример уровня из Акта 3, когда у игрока мало навыков и геймплей стелсовый.*

```
    ┌─────────────────────────────────────────────────────┐
    │              УРОВЕНЬ 7: КАТАКОМБЫ                    │
    │                                                     │
    │   [ВХОД из Уровня 6]                                │
    │         ║                                           │
    │       ╔═╧═╗                                         │
    │       ║7-1║ (Safe — Лагерь)                         │
    │       ╚═╤═╝                                         │
    │     ┌───┴───┐                                       │
    │   ╔═╧═╗   ╔═╧═╗                                    │
    │   ║7-2║   ║7-3║  (Два маршрута)                     │
    │   ╚═╤═╝   ╚═╤═╝                                    │
    │     │       │         ╔═══╗                          │
    │   ╔═╧═╗   ╔═╧═╗      ║7-!║ (Секрет)                │
    │   ║7-4║   ║7-5╠══════╝   ║                          │
    │   ╚═╤═╝   ╚═╤═╝      ╚═══╝                         │
    │     └───┬───┘                                       │
    │       ╔═╧═╗                                         │
    │       ║7-6║ (Gate — Врата)                           │
    │       ╚═╤═╝                                         │
    │       ╔═╧═╗                                         │
    │       ║7-7║ (Combat — Мини-босс)                    │
    │       ╚═╤═╝                                         │
    │       ╔═╧═╗                                         │
    │       ║7-8║ (Gate — Врата)                           │
    │       ╚═╤═╝                                         │
    │   [ВЫХОД → Уровень 8]                               │
    └─────────────────────────────────────────────────────┘
```

**Комната 7-2: «Склеп Воинов» (Stealth/Combat — Средняя)**
```
┌──────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▓ │  ░ = тень (стелс-зона)
│ ▓░░╔═══╗░░░░░░╔═══╗░░░░░░╔═══╗░░░░░░░░░░░░░░░░▓ │  ☠ = нежить (патрулирует)
│ ▓░░║SAR║░░░☠░░║SAR║░░░☠░░║SAR║░░░░░☠░░░░░░░░░░▓ │  SAR = саркофаг
│ ▓░░╚═══╝░░░░░░╚═══╝░░░░░░╚═══╝░░░░░░░░░░░░░░░░▓ │  ◊ = нажимная плита
│ ▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▓ │      (активирует ловушку)
│ ▓░░░◊░░░░░░░░░░◊░░░░░░░░░░◊░░░░░░░░░░░░░░░░░░░▓ │  💀 = шипы (мгновенная
│ ▓░░░💀░░░░░░░░░💀░░░░░░░░░💀░░░░░░░░░░░░░░░░░░░▓ │      смерть при 5 навыках)
│ ▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▓ │  🕯 = свеча (единственный
│ ▓░░░░░░░░░🕯░░░░░░░░░░🕯░░░░░░░░░🕯░░░░░░░░░░▓ │      источник света)
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└──────────────────────────────────────────────────┘

МАРШРУТ А (со Скрытностью):
Активировать стелс → пройти между патрулями нежити → 
обойти нажимные плиты → безопасный выход.

МАРШРУТ Б (без Скрытности, с Магией):
Использовать магический снаряд, чтобы отвлечь нежить →
подсветить плиты Эхо Маны → пройти осторожно.

МАРШРУТ В (без Скрытности, без Магии):
Медленная ходьба (минимальный шум) → 
запомнить паттерны патрулей (3 нежити, циклы 8 секунд) →
пробежать между безопасными зонами у свечей.
Нежить не заходит в освещённые зоны.

СМЕРТЬ: Нежить убивает за 2-3 удара на этом уровне силы.
Нажимные плиты → шипы = мгновенная смерть.
```

---

## ЧАСТЬ 5: СИСТЕМА ВРАГОВ — ИИ И ПОВЕДЕНИЕ

### 5.1. Конечный Автомат Врага (FSM)

```typescript
enum EnemyState {
  IDLE,           // Стоит на месте
  PATROL,         // Патрулирует маршрут
  ALERT,          // Заметил что-то подозрительное
  CHASE,          // Преследует игрока
  ATTACK,         // Атакует
  FLEE,           // Убегает
  STUN,           // Оглушён
  FEAR,           // Под действием Ауры Страха
  DEAD,           // Мёртв (анимация смерти)
  SPECIAL,        // Особое поведение (лечение, призыв и т.д.)
}

// Переходы между состояниями:
const STATE_TRANSITIONS = {
  IDLE: {
    playerDetected: (fear) => fear > threshold ? "FLEE" : "ALERT",
    patrolTimerExpired: "PATROL",
    damaged: "ALERT",
  },
  PATROL: {
    playerDetected: (fear) => fear > threshold ? "FLEE" : "ALERT",
    endOfRoute: "IDLE",
    damaged: "ALERT",
  },
  ALERT: {
    playerConfirmed: (fear) => fear > threshold ? "FLEE" : "CHASE",
    lostPlayer: "PATROL",   // Через 5 секунд
    damaged: "CHASE",       // Атака всегда провоцирует
  },
  CHASE: {
    inAttackRange: "ATTACK",
    lostPlayer: "ALERT",    // Через 8 секунд
    healthLow: (type) => type === "orc" ? "SPECIAL" : "FLEE", // Орки впадают в ярость
  },
  ATTACK: {
    targetOutOfRange: "CHASE",
    attackFinished: "CHASE",
    stunned: "STUN",
  },
  FLEE: {
    reachedSafeDistance: "IDLE",
    cornered: "ATTACK",     // Загнанный враг атакует!
    alliesNearby: (count) => count >= 3 ? "CHASE" : "FLEE", // В толпе смелеет
  },
  STUN: {
    stunExpired: "CHASE",
  },
};
```

### 5.2. Система Страха — Подробная Реализация

```typescript
class FearSystem {
  
  // Вычисляет текущий "уровень угрозы" игрока
  calculatePlayerThreat(player: Player): number {
    let threat = 0;
    
    // Каждый активный навык = +1 к угрозе
    threat += player.skillTree.getActiveSkillCount();
    
    // Бонус за определённые навыки
    if (player.hasSkill("aur_t3")) threat += 3;   // Аура Страха = +3
    if (player.hasSkill("str_t4")) threat += 2;   // Танец Смерти = +2
    if (player.hasSkill("def_t4")) threat += 2;   // Неуязвимость = +2
    
    // Штраф за низкое здоровье (враги чуют слабость)
    const hpPercent = player.currentHP / player.maxHP;
    if (hpPercent < 0.3) threat -= 3;
    if (hpPercent < 0.1) threat -= 5;
    
    // Бонус за недавние убийства
    threat += player.recentKills * 0.5; // Затухает за 10 секунд
    
    return Math.max(0, threat);
  }
  
  // Определяет поведение конкретного врага
  evaluateEnemyBehavior(enemy: Enemy, threat: number): BehaviorMode {
    const threshold = enemy.fearThreshold;
    
    if (threat >= threshold * 2) {
      return "PANIC_FLEE";       // Бросает оружие и убегает
    } else if (threat >= threshold) {
      return "CAUTIOUS";         // Держит дистанцию, атакует осторожно
    } else if (threat >= threshold * 0.5) {
      return "NORMAL";           // Стандартное поведение
    } else {
      return "AGGRESSIVE";       // Агрессивно нападает, использует тактики
    }
  }
}
```

### 5.3. Групповое Поведение

```typescript
class GroupAI {
  
  // Гоблины координируют атаки
  evaluateGoblinGroup(goblins: Goblin[], player: Player) {
    const groupSize = goblins.length;
    const threat = fearSystem.calculatePlayerThreat(player);
    
    if (threat < 5 && groupSize >= 3) {
      // Тактика "Окружение"
      this.assignFlankPositions(goblins, player);
      // Один отвлекает спереди, двое заходят с боков
      goblins[0].setBehavior("DISTRACT_FRONT");
      goblins[1].setBehavior("FLANK_LEFT");
      goblins[2].setBehavior("FLANK_RIGHT");
      
    } else if (threat < 5 && groupSize >= 2) {
      // Тактика "Приманка"
      goblins[0].setBehavior("BAIT");  // Подбегает и убегает, заманивая
      goblins[1].setBehavior("AMBUSH"); // Ждёт в засаде
      
    } else if (threat < 5 && groupSize === 1) {
      // Одинокий гоблин против слабого игрока
      goblins[0].setBehavior("HIT_AND_RUN");
      
    } else {
      // Игрок слишком силён — все бегут
      goblins.forEach(g => g.setBehavior("FLEE"));
    }
  }
  
  // Скелеты формируют строй
  evaluateSkeletonFormation(skeletons: Skeleton[], player: Player) {
    const threat = fearSystem.calculatePlayerThreat(player);
    
    if (threat < 8 && skeletons.length >= 2) {
      // Щитовой строй: первый ряд блокирует, второй атакует
      const shieldLine = skeletons.filter(s => s.hasShield);
      const attackLine = skeletons.filter(s => !s.hasShield);
      
      shieldLine.forEach(s => s.setBehavior("SHIELD_WALL"));
      attackLine.forEach(s => s.setBehavior("ATTACK_BEHIND_SHIELD"));
    }
  }
}
```

---

## ЧАСТЬ 6: БОССЫ — ДЕТАЛЬНЫЙ ДИЗАЙН

### 6.1. Финальный Босс: Слизь Возмездия — Полная Механика

```typescript
const SLIME_OF_RECKONING = {
  name: "Слизь Возмездия",
  
  // ===== ФАЗА 1: "Твоё Прошлое" =====
  phase1: {
    hp: 500,
    triggerAt: "start",
    
    // Слизь использует УЛЬТИМЫ, но криво
    attackRotation: [
      {
        name: "Плохой Танец Смерти",
        basedOn: "str_t4",
        damage: 15,                // Оригинал: 60. Слизь слабее
        duration: 6,               // Оригинал: 10
        pattern: "random_spin",    // Хаотичное вращение с окнами
        safeZones: 3,              // 3 безопасных зоны на арене
        telegraph: 2.0,            // Секунд предупреждения
      },
      {
        name: "Кривой Армагеддон",
        basedOn: "mag_t4",
        meteorCount: 6,            // Оригинал: 12
        damagePerMeteor: 25,       // Оригинал: 80
        pattern: "slow_falling",   // Метеоры падают медленно
        shadowWarning: true,       // Тени на полу за 1.5 сек
        telegraph: 1.5,
      },
      {
        name: "Глючная Телепортация",
        basedOn: "agi_t4",
        teleportCount: 3,          // Телепортируется 3 раза подряд
        stuckInWallChance: 0.3,    // 30% — застревает в стене на 3 сек
        damageOnArrival: 10,
        telegraph: 0.8,
      },
      {
        name: "Нестабильная Неуязвимость",
        basedOn: "def_t4",
        duration: 4,               // Оригинал: 8
        flickering: true,          // Мерцает — есть окна уязвимости (0.5 сек каждые 2 сек)
      },
      {
        name: "Аура Хаоса",
        basedOn: "aur_t4",
        damage: 8,                 // /сек. Оригинал: 40
        radius: 60,                // Оригинал: 100
        duration: 5,
        telegraph: 1.0,            // Слизь раздувается перед активацией
      }
    ],
    
    // Ротация: случайная, но без повторов подряд
    attackCooldown: 3,             // Секунд между атаками
    
    // Окна для атаки:
    vulnerableAfterAttack: 2.0,    // Секунд уязвимости после каждой атаки
    
    // Переход к фазе 2:
    transitionHP: 0,               // При 0 HP фазы 1
    transitionCinematic: "slime_splits", // Кинематографика разделения
  },
  
  // ===== ФАЗА 2: "Твоё Настоящее" =====
  phase2: {
    triggerAt: "phase1_end",
    
    miniSlimes: [
      {
        name: "Красная Слизь (Сила)",
        color: "red",
        hp: 100,
        attacks: ["sword_slash", "power_strike"],
        speed: 80,
        puddle: {                  // Лужа после смерти
          skill: "str_base",       // Временно даёт "Владение мечом"
          duration: 15,            // Секунд
          radius: 60,              // Пикселей
        }
      },
      {
        name: "Синяя Слизь (Магия)",
        color: "blue",
        hp: 80,
        attacks: ["fireball", "ice_bolt"],
        speed: 60,
        puddle: {
          skill: "mag_base",
          duration: 15,
          radius: 60,
        }
      },
      {
        name: "Жёлтая Слизь (Защита)",
        color: "yellow",
        hp: 150,
        attacks: ["shield_bash"],
        speed: 50,
        hasShield: true,           // Блокирует фронтальные атаки
        puddle: {
          skill: "def_base",
          duration: 15,
          radius: 60,
        }
      },
      {
        name: "Зелёная Слизь (Ловкость)",
        color: "green",
        hp: 60,
        attacks: ["quick_dash_attack"],
        speed: 150,                // Очень быстрая
        puddle: {
          skill: "agi_base",
          duration: 15,
          radius: 60,
        }
      },
      {
        name: "Фиолетовая Слизь (Аура)",
        color: "purple",
        hp: 120,
        attacks: ["aura_pulse"],   // Периодический урон вокруг
        speed: 40,
        puddle: {
          skill: "aur_base",
          duration: 15,
          radius: 60,
        }
      }
    ],
    
    // Все 5 слизей активны одновременно
    // Порядок убийства — стратегический выбор игрока
    
    // Рекомендуемая стратегия:
    // 1. Убить зелёную (самая раздражающая, быстрая)
    // 2. Встать в лужу ловкости → использовать спринт
    // 3. Убить синюю → использовать магию на жёлтую (обход щита)
    // 4. Убить жёлтую → убить красную → убить фиолетовую
    
    // Но любой порядок работает!
  },
  
  // ===== ФАЗА 3: "Ты" =====
  phase3: {
    triggerAt: "all_mini_slimes_dead",
    
    // Маленькая оригинальная слизь
    hp: 1,
    damage: 0,
    speed: 0,                      // Не двигается
    behavior: "tremble",           // Дрожит
    
    // Игрок подходит и наносит финальный удар
    // Замедленная камера. Один удар палкой.
    
    onDeath: "final_cinematic",
  }
};
```

### 6.2. Арена Финального Босса

```
╔═══════════════════════════════════════════════════════════╗
║                   АРЕНА ФИНАЛЬНОГО БОССА                  ║
║                   (2880 x 1620 пикселей)                  ║
║                                                           ║
║   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   ║
║   ▓                                                   ▓   ║
║   ▓      ╔══╗                          ╔══╗           ▓   ║
║   ▓      ║P1║   Колонна               ║P2║  Колонна   ▓   ║
║   ▓      ╚══╝                          ╚══╝           ▓   ║
║   ▓                                                   ▓   ║
║   ▓               ┌─────────┐                         ▓   ║
║   ▓               │  БОСС   │                         ▓   ║
║   ▓               │ (Слизь) │                         ▓   ║
║   ▓               └─────────┘                         ▓   ║
║   ▓                                                   ▓   ║
║   ▓      ╔══╗                          ╔══╗           ▓   ║
║   ▓      ║P3║   Колонна               ║P4║  Колонна   ▓   ║
║   ▓      ╚══╝                          ╚══╝           ▓   ║
║   ▓                                                   ▓   ║
║   ▓              [ВХОД / Игрок]                       ▓   ║
║   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   ║
║                                                           ║
║   P1-P4 = Разрушаемые колонны (укрытие от метеоров)       ║
║   Каждая выдерживает 3 попадания, потом рушится            ║
║   Центр арены — открытое пространство                      ║
║   Во Фазе 2: лужи слизей появляются где умерла слизь      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

## ЧАСТЬ 7: СИСТЕМА ДИАЛОГОВ И НАРРАТИВ

### 7.1. Структура Диалогов

Используется **Ink.js** — открытая система ветвящихся диалогов.

```ink
// Пример: Диалог с Гриблом при первой встрече (Уровень 4)

=== gribl_first_meeting ===

ГРИБЛ: *потирает руки* Ого-го! Живой герой! И при полном параде!
ГРИБЛ: Ну, почти полном. Я вижу, вам уже пришлось кое с чем расстаться...

* [Мне нужно продать снаряжение]
    КЕЙН: У тебя тут ломбард?
    ГРИБЛ: Ломбард, антикварная лавка, пункт приёма лома — 
    ГРИБЛ: называйте как хотите, лишь бы платили.
    -> gribl_shop

* [Как ты здесь оказался?]
    КЕЙН: Цитадель рушится. Почему ты не бежишь?
    ГРИБЛ: Бежать? БЕЖАТЬ?! Вы хоть представляете, сколько 
    ГРИБЛ: ценного хлама валяется на каждом этаже?!
    ГРИБЛ: Это РАСПРОДАЖА ВЕКА!
    -> gribl_first_meeting

* [Ты скупаешь навыки?]
    КЕЙН: Говорят, ты можешь купить... способности?
    ГРИБЛ: *прищуривается* О, так вы знаете про Врата.
    ГРИБЛ: Я не покупаю навыки. Я покупаю то, что ОСТАЛОСЬ после Врат.
    ГРИБЛ: Обломки силы. Шлак могущества.
    ГРИБЛ: Но из шлака я делаю... полезные вещи.
    -> gribl_shadow_items

=== gribl_shop ===
// Интерфейс магазина

=== gribl_shadow_items ===
ГРИБЛ: Вот, смотрите. «Тень Огненного Шара».
ГРИБЛ: Одноразовая штука. Один раз бабахнет — и всё.
ГРИБЛ: Но в нужный момент... *целует пальцы* ...бесценно.

* [Сколько?]
    ГРИБЛ: Для вас — всего 200 монет!
    КЕЙН: Всего?!
    ГРИБЛ: Ладно, ладно. 180. И это грабёж. Себя граблю!
    -> gribl_shop

* [Я подумаю]
    ГРИБЛ: Думайте, думайте. Только быстро.
    ГРИБЛ: Потолок, знаете ли, долго не продержится. *смотрит вверх*
    -> END
```

### 7.2. Динамические Комментарии Кейна

Кейн комментирует события в зависимости от текущего количества навыков.

```typescript
const CONTEXTUAL_LINES = {
  // При обнаружении слизи
  seeSlime: {
    skills_20_16: "Ох, слизь. Даже не буду останавливаться.",
    skills_15_11: "Слизь. Ладно, один удар — и готово.",
    skills_10_6:  "Слизь... Надо быть осторожным.",
    skills_5_3:   "Слизь. Надеюсь, она меня не заметила.",
    skills_2_0:   "...", // Молчание
  },
  
  // При входе в тёмную комнату
  darkRoom: {
    skills_20_16: "Темно. Не важно — Аура Огня всё осветит.",
    skills_15_11: "Темновато. Где-то тут должен быть факел.",
    skills_10_6:  "Не вижу ни зги. Лира, держись рядом.",
    skills_5_3:   "*тяжело дышит* ...не люблю темноту.",
    skills_2_0:   "*шаги в темноте*", // Только звук
  },
  
  // При смерти и перезагрузке
  onDeath: {
    skills_20_16: "Как я вообще умер? Ладно, ещё раз.",
    skills_15_11: "Так, это было глупо. Попробуем иначе.",
    skills_10_6:  "Думай, Кейн. Думай.",
    skills_5_3:   "*вздох*",
    skills_2_0:   "*тишина*",
  },
  
  // Комментарии Лиры (появляется с Акта 2)
  lira: {
    seeSlime: {
      skills_15_11: "Серьёзно? Ты же справишься со слизью?",
      skills_10_6:  "Осторожно, она может быть ядовитой.",
      skills_5_3:   "Давай обойдём. Не стоит рисковать.",
      skills_2_0:   "Я разберусь. Стой за мной.",
    },
    onPlayerDamaged: {
      skills_15_11: "Ты в порядке?",
      skills_10_6:  "Кейн! Дай посмотрю рану.",
      skills_5_3:   "Нет-нет-нет, ты не можешь тут умереть!",
      skills_2_0:   "*достаёт сковородку* Я СКАЗАЛА, СТОЙ ЗА МНОЙ.",
    }
  }
};
```

### 7.3. Записки и Лор

На каждом уровне — **5-8 записок**, раскрывающих историю Малахора и Цитадели.

```typescript
const LORE_NOTES = {
  level_2: [
    {
      id: "l2_note_1",
      title: "Распорядок дня (Казарма №3)",
      text: `06:00 — Подъём (не касается нежити, они и так не спят)
07:00 — Завтрак (сырое мясо, грибы, кофе)
08:00 — Патрулирование
12:00 — Обед (сырое мясо, грибы, кофе)
13:00 — Тренировка
18:00 — Ужин (угадайте)
19:00 — Свободное время
22:00 — Отбой

PS: Кто опять ест мой кофе — найду и прокляну. 
Это касается тебя, Грунт. — Десятник Крог`,
      location: "На стене столовой",
    },
    {
      id: "l2_note_3",
      title: "Жалоба (без подписи)",
      text: `Уважаемый Тёмный Лорд,

Прошу рассмотреть вопрос замены доспехов. 
Текущие ржавеют после каждого дежурства 
в Затопленном Арсенале. 

Также: в казарме №7 завёлся мимик, 
притворяющийся сундуком с амуницией. 
Двое бойцов госпитализированы.

Прошу выделить бюджет на нового мимика. 
Тьфу. На УДАЛЕНИЕ мимика.`,
      location: "В ящике стола",
    }
  ],
  
  // ... аналогично для каждого уровня

  level_8: [
    {
      id: "l8_note_final",
      title: "Дневник Малахора. Последняя запись.",
      text: `Я больше не помню, каково это — не быть сильным.

Сила стала моим телом. Моим дыханием. 
Я не знаю, где кончаюсь я и начинается магия.

Иногда я пытаюсь вспомнить ту деревню. 
Поле за домом. Запах хлеба.
Но вместо воспоминаний — только формулы заклинаний.

Если кто-то это читает — значит, меня победили.
Значит, я наконец свободен.

Пожалуйста. Не повторяйте моих ошибок. 
Отпустите. Пока можете.`,
      location: "На пьедестале в центре комнаты. Подсвечена лучом.",
    }
  ]
};
```

---

## ЧАСТЬ 8: HUD И ИНТЕРФЕЙС — ТЕХНИЧЕСКАЯ РЕАЛИЗАЦИЯ

### 8.1. Состояния HUD

```typescript
class HUDManager {
  
  private activeSkillCount: number;
  
  update(player: Player) {
    this.activeSkillCount = player.skillTree.getActiveSkillCount();
    this.updateVisibility();
  }
  
  private updateVisibility() {
    const count = this.activeSkillCount;
    
    // === СЛОЙ 1: Всегда видно (20-0 навыков) ===
    // HP-бар
    this.hpBar.visible = count > 2;
    // Вместо HP-бара при 0-2 навыках:
    this.hpVisual.visible = count <= 2;
    // (экран краснеет, персонаж хромает, визуальные подсказки)
    
    // === СЛОЙ 2: Видно при 20-10 навыков ===
    this.manaBar.visible = count > 10 && player.hasSkill("mag_base");
    this.staminaBar.visible = count > 10;
    this.minimap.visible = count > 10;
    
    // === СЛОЙ 3: Видно при 20-15 навыков ===
    this.skillPanel.visible = count > 5;
    this.compass.visible = count > 15;
    this.enemyHealthBars.visible = count > 8;
    
    // === СЛОЙ 4: Только при 20 навыков ===
    this.damageNumbers.visible = count > 12;
    
    // Плавные переходы
    // Элементы не исчезают мгновенно — 
    // fade out за 2 секунды при потере соответствующего навыка
  }
  
  // Стиль рамок HUD деградирует
  getHUDStyle(): HUDStyle {
    const count = this.activeSkillCount;
    
    if (count >= 16) return "ornate_gold";      // Золотые узоры
    if (count >= 11) return "clean_silver";      // Серебро, чистые линии
    if (count >= 6)  return "worn_bronze";       // Потёртая бронза
    if (count >= 3)  return "cracked_stone";     // Потрескавшийся камень
    return "none";                               // Никакого HUD
  }
}
```

### 8.2. Макет HUD — Полный Вариант (20 Навыков)

```
╔═══════════════════════════════════════════════════════════════════╗
║ ┌──────────────────┐                            ┌──────────────┐ ║
║ │ HP ████████████░░ │  [🗺 Миникарта]           │ Уровень 2    │ ║
║ │ MP ██████████░░░░ │                            │ Казармы      │ ║
║ │ ST ████████░░░░░░ │                            └──────────────┘ ║
║ └──────────────────┘                                              ║
║                                                                   ║
║                        [ИГРОВОЕ ПОЛЕ]                             ║
║                                                                   ║
║                                                                   ║
║                                                                   ║
║                                                                   ║
║                                                                   ║
║ ┌──────────────────────────────────────────────────────────────┐  ║
║ │ [J] Меч   [K] Замах   [U] Вихрь   [I] Щит   [O] Стелс     │  ║
║ │                         [P] >> ТАНЕЦ СМЕРТИ <<               │  ║
║ └──────────────────────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════════════╝
```

### 8.3. Макет HUD — Минимальный (3 Навыка)

```
╔═══════════════════════════════════════════════════════════════════╗
║ ┌────────────┐                                                    ║
║ │ HP █████░░░ │                                                   ║
║ └────────────┘                                                    ║
║                                                                   ║
║                        [ИГРОВОЕ ПОЛЕ]                             ║
║                                                                   ║
║                                                                   ║
║                                                                   ║
║                                                                   ║
║                                                                   ║
║                                                                   ║
║                                      ┌────────────────────────┐  ║
║                                      │ [U] Парирование        │  ║
║                                      └────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════════════╝
```

### 8.4. Макет HUD — Пустой (0 Навыков)

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║                                                                   ║
║                                                                   ║
║                        [ИГРОВОЕ ПОЛЕ]                             ║
║                                                                   ║
║                    (экран слегка виньетирован                     ║
║                     по краям — красноватый                         ║
║                     оттенок при низком HP)                         ║
║                                                                   ║
║                                                                   ║
║                                                                   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## ЧАСТЬ 9: ВИЗУАЛЬНЫЕ ЭФФЕКТЫ И АНИМАЦИИ

### 9.1. Спрайтшиты Персонажа

**Кейн — 5 визуальных состояний:**

```typescript
const PLAYER_VISUAL_STATES = {
  // Состояние 1: Полная экипировка (20-16 навыков)
  state_god: {
    spriteSheet: "kain_god",
    frameSize: { w: 64, h: 64 },
    animations: {
      idle:         { frames: [0,1,2,3], fps: 4, loop: true },
      walk:         { frames: [4,5,6,7,8,9], fps: 8, loop: true },
      run:          { frames: [10,11,12,13,14,15], fps: 10, loop: true },
      jump:         { frames: [16,17,18], fps: 6, loop: false },
      fall:         { frames: [19,20], fps: 4, loop: true },
      lightAttack:  { frames: [21,22,23,24], fps: 12, loop: false },
      heavyAttack:  { frames: [25,26,27,28,29], fps: 10, loop: false },
      roll:         { frames: [30,31,32,33], fps: 12, loop: false },
      parry:        { frames: [34,35,36], fps: 12, loop: false },
      hurt:         { frames: [37,38], fps: 8, loop: false },
      death:        { frames: [39,40,41,42,43], fps: 6, loop: false },
      skillCast:    { frames: [44,45,46,47], fps: 10, loop: false },
      skillFail:    { frames: [48,49,50], fps: 8, loop: false }, // Попытка использовать утерянный навык
    },
    effects: {
      auraGlow: { color: "#FFD700", radius: 30, alpha: 0.3 },
      trailEffect: true,           // След за персонажем при беге
      capePhysics: true,           // Физика плаща
    }
  },
  
  // Состояние 2: Лёгкая броня (15-11 навыков)
  state_hero: {
    spriteSheet: "kain_hero",
    // ... аналогичная структура, но:
    // - Нет плаща
    // - Ореол слабее
    // - Анимации менее размашистые
    effects: {
      auraGlow: { color: "#C0C0C0", radius: 15, alpha: 0.15 },
      trailEffect: false,
      capePhysics: false,
    }
  },
  
  // Состояние 3: Кожанка (10-6 навыков)
  state_veteran: {
    spriteSheet: "kain_veteran",
    effects: {
      auraGlow: null,              // Нет ореола
      dirtyTexture: true,          // Грязь на одежде
    }
  },
  
  // Состояние 4: Рваная рубаха (5-3 навыка)
  state_survivor: {
    spriteSheet: "kain_survivor",
    effects: {
      limp: true,                  // Хромает при < 30% HP
      heavyBreathing: true,        // Тяжело дышит при < 50% стамины
      bruises: true,               // Синяки на теле
    }
  },
  
  // Состояние 5: Почти голый (2-0 навыков)
  state_nobody: {
    spriteSheet: "kain_nobody",
    // Босой, в рваных штанах
    // Анимации максимально «человечные» — неуклюжие, медленные
    effects: {
      shivering: true,             // Дрожит
      flinchOnLoudNoise: true,     // Вздрагивает от громких звуков
      bruises: true,
      limp: true,
    }
  }
};
```

### 9.2. Частицы и VFX

```typescript
const VFX_DEFINITIONS = {
  
  // При потере навыка
  skillLoss: {
    emitter: "burst",
    particleCount: 30,
    colors: ["branch_color", "#FFFFFF"],  // Цвет ветки навыка
    lifetime: { min: 1.0, max: 2.0 },
    speed: { min: 50, max: 150 },
    direction: "radial_outward",          // Разлетаются от персонажа
    gravity: 50,                          // Медленно падают
    fadeOut: true,
    scale: { start: 1.0, end: 0.0 },
  },
  
  // Лужа Эхо (финальный босс, фаза 2)
  echoPuddle: {
    type: "area",
    shape: "circle",
    radius: 60,
    color: "skill_branch_color",
    alpha: { base: 0.5, pulse: 0.3, pulseSpeed: 2.0 },
    borderGlow: true,
    lifetime: 15.0,                       // Исчезает через 15 сек
    fadeOutDuration: 2.0,
  },
  
  // Эффект входа во Врата Забвения
  gateActivation: {
    stage1_approach: {
      // Руны на Вратах загораются
      type: "sequential_rune_glow",
      color: "#8B00FF",
      duration: 2.0,
    },
    stage2_sacrifice: {
      // Энергия вытягивается из персонажа
      type: "beam",
      from: "player_center",
      to: "gate_center",
      color: "skill_branch_color",
      width: { start: 20, end: 5 },
      duration: 1.5,
      particlesAlongBeam: true,
    },
    stage3_opening: {
      // Врата открываются с вспышкой
      type: "shockwave",
      color: "#FFFFFF",
      radius: { start: 0, end: 300 },
      duration: 0.5,
      screenShake: { intensity: 5, duration: 0.3 },
    }
  },
  
  // Деградация экрана при низком HP (без HUD)
  lowHPOverlay: {
    type: "screen_overlay",
    trigger: "hp_below_30_percent",
    vignette: { color: "#330000", intensity: 0.4 },
    heartbeat: {                          // Пульсация
      frequency: 1.2,                    // Раз в секунду
      intensityPulse: 0.2,
      screenShake: { intensity: 1, duration: 0.1 },
    },
    bloodDroplets: {                      // Капли крови на «камере»
      count: 3,
      fadeTime: 5.0,
    }
  }
};
```

---

## ЧАСТЬ 10: АУДИО-ДИЗАЙН

### 10.1. Музыкальные Треки

```typescript
const MUSIC_TRACKS = {
  // === ГЛАВНОЕ МЕНЮ ===
  mainMenu: {
    file: "music/main_theme.ogg",
    bpm: 90,
    instruments: "full_orchestra",
    mood: "epic_melancholic",           // Эпично, но с ноткой грусти
    loop: true,
  },
  
  // === ПРОЛОГ (Битва с Малахором) ===
  prologue_boss: {
    file: "music/malakhor_battle.ogg",
    bpm: 140,
    instruments: "full_orchestra_choir",
    mood: "epic_triumphant",
    loop: true,
    layers: {                           // Адаптивная музыка
      base: "orchestra",
      phase2: "+choir",                 // Добавляется хор во 2-й фазе
      phase3: "+percussion_heavy",      // Тяжёлая перкуссия в 3-й
      victory: "fanfare_transition",
    }
  },
  
  // === АКТ 1 ===
  act1_exploration: {
    file: "music/act1_explore.ogg",
    bpm: 110,
    instruments: "orchestra_no_choir",
    mood: "adventurous_confident",
    loop: true,
  },
  act1_combat: {
    file: "music/act1_combat.ogg",
    bpm: 130,
    instruments: "orchestra_brass_heavy",
    mood: "energetic",
    loop: true,
    // Переход: crossfade 1.5 сек при обнаружении врагом
  },
  
  // === АКТ 2 ===
  act2_exploration: {
    file: "music/act2_explore.ogg",
    bpm: 85,
    instruments: "strings_piano",       // Камерный ансамбль
    mood: "tense_uncertain",
    loop: true,
  },
  act2_combat: {
    file: "music/act2_combat.ogg",
    bpm: 120,
    instruments: "strings_percussion",
    mood: "desperate",
    loop: true,
  },
  
  // === АКТ 3 ===
  act3_exploration: {
    file: "music/act3_explore.ogg",
    bpm: 60,
    instruments: "solo_cello",          // Одинокая виолончель
    mood: "lonely_fearful",
    loop: true,
    // Иногда — тишина с далёкими звуками (эмбиент)
    silenceChance: 0.3,                 // 30% времени — тишина
    ambientSounds: ["dripping", "distant_collapse", "wind"],
  },
  act3_combat: {
    file: "music/act3_combat.ogg",
    bpm: 100,
    instruments: "solo_cello_distorted",
    mood: "horror_survival",
    loop: true,
  },
  
  // === ФИНАЛЬНЫЙ БОСС ===
  final_boss_phase1: {
    file: "music/final_phase1.ogg",
    bpm: 150,
    instruments: "full_orchestra_choir_return",
    mood: "desperate_hope",
    // Та же тема, что в прологе, но в миноре
    // Хор поёт другие слова (скорбные вместо триумфальных)
  },
  final_boss_phase2: {
    file: "music/final_phase2.ogg",
    bpm: 140,
    instruments: "orchestra_electronic_hybrid",
    mood: "chaotic_frantic",
    // Электронные элементы = "сбой" (слизь нестабильна)
  },
  final_boss_phase3: {
    file: "music/final_phase3.ogg",
    bpm: 0,                            // Нет ритма
    instruments: "solo_piano",
    mood: "quiet_resolution",
    // Одна тихая фортепианная мелодия
    // Контраст с хаосом предыдущих фаз
  },
  
  // === КОНЦОВКА ===
  ending: {
    file: "music/ending.ogg",
    instruments: "acoustic_guitar",
    mood: "peaceful_bittersweet",
    loop: false,                        // Играет один раз
  }
};
```

### 10.2. Звуковые Эффекты

```typescript
const SFX = {
  // === ИГРОК ===
  player: {
    footstep_armor:     { file: "sfx/footstep_metal.ogg", volume: 0.4, variants: 4 },
    footstep_leather:   { file: "sfx/footstep_leather.ogg", volume: 0.3, variants: 4 },
    footstep_barefoot:  { file: "sfx/footstep_bare.ogg", volume: 0.2, variants: 4 },
    
    sword_swing:        { file: "sfx/sword_swing.ogg", volume: 0.5, variants: 3 },
    sword_hit:          { file: "sfx/sword_hit_flesh.ogg", volume: 0.6, variants: 3 },
    stick_swing:        { file: "sfx/stick_swing.ogg", volume: 0.3, variants: 2 },
    stick_hit:          { file: "sfx/stick_hit.ogg", volume: 0.4, variants: 2 },
    
    roll:               { file: "sfx/roll_cloth.ogg", volume: 0.3 },
    jump:               { file: "sfx/jump.ogg", volume: 0.3 },
    land:               { file: "sfx/land.ogg", volume: 0.4 },
    
    hurt:               { file: "sfx/player_hurt.ogg", volume: 0.7, variants: 5 },
    death:              { file: "sfx/player_death.ogg", volume: 0.8 },
    
    parry_success:      { file: "sfx/parry_clang.ogg", volume: 0.8 },
    parry_perfect:      { file: "sfx/parry_perfect.ogg", volume: 0.9 },  // Более сочный звук
    
    skill_fail:         { file: "sfx/skill_fizzle.ogg", volume: 0.5 },   // Попытка использовать потерянный навык
  },
  
  // === МАГИЯ ===
  magic: {
    magic_bolt:         { file: "sfx/magic_bolt.ogg", volume: 0.5 },
    fireball_cast:      { file: "sfx/fireball_cast.ogg", volume: 0.6 },
    fireball_explode:   { file: "sfx/fireball_explode.ogg", volume: 0.7 },
    ice_freeze:         { file: "sfx/ice_freeze.ogg", volume: 0.6 },
    firestorm:          { file: "sfx/firestorm_loop.ogg", volume: 0.7, loop: true },
    armageddon_meteor:  { file: "sfx/meteor_fall.ogg", volume: 0.8, variants: 3 },
    armageddon_impact:  { file: "sfx/meteor_impact.ogg", volume: 0.9 },
  },
  
  // === ИНТЕРФЕЙС ===
  ui: {
    gate_pulse:         { file: "sfx/gate_pulse.ogg", volume: 0.4, loop: true },
    gate_sacrifice:     { file: "sfx/gate_sacrifice.ogg", volume: 0.8 },
    gate_open:          { file: "sfx/gate_open.ogg", volume: 0.9 },
    
    skill_lost:         { file: "sfx/skill_lost.ogg", volume: 0.7 },
    // Звук "угасания" — как будто инструмент замолкает в оркестре
    // Разный для каждой ветки:
    skill_lost_strength:{ file: "sfx/skill_lost_drums.ogg", volume: 0.7 },
    skill_lost_magic:   { file: "sfx/skill_lost_flute.ogg", volume: 0.7 },
    skill_lost_defense: { file: "sfx/skill_lost_horn.ogg", volume: 0.7 },
    skill_lost_agility: { file: "sfx/skill_lost_violin.ogg", volume: 0.7 },
    skill_lost_aura:    { file: "sfx/skill_lost_choir.ogg", volume: 0.7 },
    
    echo_activate:      { file: "sfx/echo_whisper.ogg", volume: 0.3 },
    
    menu_hover:         { file: "sfx/menu_hover.ogg", volume: 0.2 },
    menu_select:        { file: "sfx/menu_select.ogg", volume: 0.3 },
  },
  
  // === ВРАГИ ===
  enemies: {
    slime_hop:          { file: "sfx/slime_hop.ogg", volume: 0.3 },
    slime_death:        { file: "sfx/slime_pop.ogg", volume: 0.4 },
    goblin_alert:       { file: "sfx/goblin_alert.ogg", volume: 0.5 },
    goblin_panic:       { file: "sfx/goblin_scream.ogg", volume: 0.6 },
    skeleton_rattle:    { file: "sfx/bones_rattle.ogg", volume: 0.4 },
    orc_roar:           { file: "sfx/orc_roar.ogg", volume: 0.7 },
    dark_knight_charge: { file: "sfx/dark_charge.ogg", volume: 0.7 },
  },
  
  // === ЭМБИЕНТ ===
  ambient: {
    citadel_crumbling:  { file: "sfx/amb_crumble.ogg", volume: 0.2, loop: true },
    water_drip:         { file: "sfx/amb_drip.ogg", volume: 0.15, loop: true },
    wind_howl:          { file: "sfx/amb_wind.ogg", volume: 0.2, loop: true },
    torch_crackle:      { file: "sfx/amb_torch.ogg", volume: 0.2, loop: true },
  }
};
```

---

## ЧАСТЬ 11: СИСТЕМА СЛОЖНОСТИ

### 11.1. Три Режима

```typescript
const DIFFICULTY_MODES = {
  
  // === ЛЁГКИЙ: "Воспоминание" ===
  easy: {
    name: "Воспоминание",
    description: "История Кейна для тех, кто хочет насладиться сюжетом.",
    
    playerModifiers: {
      damageMultiplier: 1.3,        // Игрок наносит на 30% больше
      damageTakenMultiplier: 0.7,   // Получает на 30% меньше
      staminaRegenMultiplier: 1.5,
      manaRegenMultiplier: 1.5,
    },
    
    enemyModifiers: {
      hpMultiplier: 0.8,
      damageMultiplier: 0.7,
      aggressionMultiplier: 0.8,    // Менее агрессивны
    },
    
    specialRules: {
      keepRootSkill: true,          // Корень НЕ отбирается в финале
      echoPowerMultiplier: 2.0,     // Эхо в 2 раза сильнее
      deathSaveCharges: 3,          // 3 бесплатных воскрешения за уровень
      bossCheckpoints: true,        // Чекпоинты между фазами боссов
    },
    
    hudModifiers: {
      alwaysShowHP: true,           // HP-бар виден всегда
      enemyHealthBars: true,        // Полоски здоровья врагов всегда видны
      attackIndicators: true,       // Индикаторы атак врагов усилены
    }
  },
  
  // === НОРМАЛЬНЫЙ: "Побег" ===
  normal: {
    name: "Побег",
    description: "Как задумано. Полный опыт.",
    
    playerModifiers: {
      damageMultiplier: 1.0,
      damageTakenMultiplier: 1.0,
      staminaRegenMultiplier: 1.0,
      manaRegenMultiplier: 1.0,
    },
    
    enemyModifiers: {
      hpMultiplier: 1.0,
      damageMultiplier: 1.0,
      aggressionMultiplier: 1.0,
    },
    
    specialRules: {
      keepRootSkill: false,
      echoPowerMultiplier: 1.0,
      deathSaveCharges: 0,
      bossCheckpoints: false,
    }
  },
  
  // === ХАРДКОР: "Пустота" ===
  hardcore: {
    name: "Пустота",
    description: "Без Эхо. Без пощады. Без HUD. Ты — ничто.",
    unlockCondition: "Пройти игру на Нормальном",
    
    playerModifiers: {
      damageMultiplier: 0.8,
      damageTakenMultiplier: 1.3,
      staminaRegenMultiplier: 0.8,
      manaRegenMultiplier: 0.8,
    },
    
    enemyModifiers: {
      hpMultiplier: 1.2,
      damageMultiplier: 1.3,
      aggressionMultiplier: 1.3,
    },
    
    specialRules: {
      keepRootSkill: false,
      echoPowerMultiplier: 0,       // Эхо ОТКЛЮЧЕНО
      deathSaveCharges: 0,
      bossCheckpoints: false,
      permadeath: false,            // Не перманентная смерть, но...
      deathPenalty: "lose_gold_50%",// Теряешь 50% золота при смерти
    },
    
    hudModifiers: {
      alwaysShowHP: false,
      enemyHealthBars: false,
      attackIndicators: false,
      hideAllHUDAt: 10,             // HUD исчезает уже при 10 навыках
    }
  }
};
```

---

## ЧАСТЬ 12: PERFORMANCE БЮДЖЕТ И ОПТИМИЗАЦИЯ

### 12.1. Лимиты для Web

```typescript
const PERFORMANCE_BUDGET = {
  
  // === РЕНДЕРИНГ ===
  maxSpritesOnScreen: 200,          // Включая тайлы, частицы, врагов
  maxParticlesSimultaneous: 150,
  maxLightSources: 8,               // WebGL ограничение
  targetFPS: 60,
  minimumFPS: 30,                    // Ниже — автоснижение качества
  
  // === ПАМЯТЬ ===
  maxTextureMemory: "128MB",         // Для всех загруженных текстур
  maxAudioMemory: "32MB",           
  spriteSheetMaxSize: "2048x2048",   // Одна текстура
  
  // === ЗАГРУЗКА ===
  initialLoadMax: "5MB",             // До первого экрана
  levelLoadMax: "3MB",               // Загрузка одного уровня
  totalGameSize: "~50MB",           
  
  // === ТАЙЛМАПЫ ===
  maxTilesPerRoom: 5000,            // 100x50 тайлов
  tileSize: 32,                      // Пикселей
  maxLayers: 5,                      // Background, Ground, Objects, Foreground, Collision
  
  // === ФИЗИКА ===
  maxPhysicsBodies: 100,
  physicsStepRate: 60,               // Совпадает с FPS
};
```

### 12.2. Адаптивное Качество

```typescript
class PerformanceMonitor {
  
  private fpsHistory: number[] = [];
  private currentQuality: QualityLevel = "high";
  
  update(currentFPS: number) {
    this.fpsHistory.push(currentFPS);
    if (this.fpsHistory.length > 60) this.fpsHistory.shift(); // Последняя секунда
    
    const avgFPS = this.fpsHistory.reduce((a,b) => a+b) / this.fpsHistory.length;
    
    if (avgFPS < 30 && this.currentQuality !== "low") {
      this.downgrade();
    } else if (avgFPS > 55 && this.currentQuality !== "high") {
      this.upgrade();
    }
  }
  
  private downgrade() {
    switch (this.currentQuality) {
      case "high":
        this.currentQuality = "medium";
        // Отключаем:
        settings.particleCount *= 0.5;
        settings.shadowsEnabled = false;
        settings.postProcessing = false;
        break;
      case "medium":
        this.currentQuality = "low";
        // Отключаем:
        settings.particleCount *= 0.5;  // Теперь 25% от оригинала
        settings.lightingQuality = "simple";
        settings.animationFPS = 30;     // Анимации при 30 FPS
        settings.backgroundLayers = 1;  // Один слой фона
        break;
    }
  }
}
```

---

## ЧАСТЬ 13: СПЕЦИФИКАЦИЯ АССЕТОВ

### 13.1. Список Спрайтшитов

| Ассет | Размер | Кадры | Формат |
|---|---|---|---|
| kain_god.png | 2048x2048 | 64 кадра (64x64) | WebP |
| kain_hero.png | 2048x2048 | 64 кадра | WebP |
| kain_veteran.png | 2048x1024 | 50 кадров | WebP |
| kain_survivor.png | 2048x1024 | 50 кадров | WebP |
| kain_nobody.png | 1024x1024 | 40 кадров | WebP |
| lira.png | 1024x1024 | 40 кадров | WebP |
| enemies_common.png | 2048x2048 | 120 кадров (все базовые враги) | WebP |
| enemies_bosses.png | 2048x2048 | 80 кадров (все боссы) | WebP |
| vfx_particles.png | 1024x512 | 32 кадра | WebP |
| ui_hud.png | 1024x512 | — | WebP |
| tileset_act1.png | 2048x2048 | 1024 тайла (32x32) | WebP |
| tileset_act2.png | 2048x2048 | 1024 тайла | WebP |
| tileset_act3.png | 2048x2048 | 1024 тайла | WebP |
| backgrounds_parallax.png | 4096x2048 | 15 слоёв | WebP |

### 13.2. Список Аудио-Файлов

| Категория | Кол-во файлов | Общий размер | Формат |
|---|---|---|---|
| Музыка | 15 треков | ~15MB | OGG Vorbis (128kbps) |
| SFX — Игрок | ~30 файлов | ~2MB | OGG Vorbis (96kbps) |
| SFX — Враги | ~20 файлов | ~1.5MB | OGG |
| SFX — Магия | ~15 файлов | ~1.5MB | OGG |
| SFX — UI | ~10 файлов | ~0.5MB | OGG |
| SFX — Эмбиент | ~8 файлов | ~2MB | OGG |
| Озвучка (Кейн) | ~50 фраз | ~3MB | OGG |
| Озвучка (Лира) | ~40 фраз | ~2.5MB | OGG |
| Озвучка (Грибл) | ~30 фраз | ~2MB | OGG |
| **ИТОГО** | **~220 файлов** | **~30MB** | |

---

## ЧАСТЬ 14: ROADMAP РАЗРАБОТКИ

### 14.1. Вертикальный Срез (Milestone 1 — 3 месяца)

**Цель:** Один полностью играбельный уровень (Уровень 2: Казармы) с работающими:
- Движением и базовой боевкой
- 5-ю навыками (по одному из каждой ветки)
- Одними Вратами Забвения с потерей навыка
- 3 типами врагов (слизь, гоблин, скелет) с системой страха
- Базовым HUD
- Сохранением

### 14.2. Альфа (Milestone 2 — +4 месяца)

**Цель:** Уровни 1-5 полностью играбельны. Все 20 навыков работают. Босс Акта 1.

### 14.3. Бета (Milestone 3 — +4 месяца)

**Цель:** Все 10 уровней. Все боссы. Все диалоги. Система Лиры. New Game+ (базовая).

### 14.4. Полировка и Релиз (Milestone 4 — +3 месяца)

**Цель:** Баланс, QA, звук, VFX, оптимизация, локализация.

**Общий срок: ~14 месяцев.**

---

## ЧАСТЬ 15: МЕТРИКИ УСПЕХА (ANALYTICS)

### 15.1. Ключевые Метрики для Отслеживания

```typescript
const ANALYTICS_EVENTS = {
  // Какие навыки теряют первыми?
  "skill_lost": { skillId, levelNumber, totalSkillsRemaining, playTime },
  
  // Где умирают?
  "player_death": { levelNumber, roomId, enemyType, skillsRemaining, deathCount },
  
  // Сколько тратят времени на выбор у Врат?
  "gate_decision_time": { gateId, timeSpentSeconds, skillChosen },
  
  // Какой "путь" выбирают?
  "path_classification": { pathType, completionTime, deathCount },
  
  // Где бросают игру?
  "session_end": { levelNumber, roomId, playTime, skillsRemaining },
  
  // Проходят ли New Game+?
  "new_game_plus_started": { previousPath, totalPlayTime },
  
  // Финальный босс
  "final_boss_attempts": { attempts, skillRemaining, totalDeaths, timeToKill },
};
```

---

*Документ представляет собой полную техническую спецификацию, достаточную для начала разработки вертикального среза. Все числа подлежат итеративной балансировке в процессе плейтестинга.*
