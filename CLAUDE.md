# CLAUDE.md — Инструкции для Claude Code

## 🎮 О ПРОЕКТЕ

Ты работаешь над браузерной игрой **«Epic Refund»** — Reverse-Metroidvania / Action-RPG.
Игрок начинает с 20 навыками и постепенно теряет их, чтобы продвигаться дальше.
Потеря навыков — это основная механика, а не наказание.

**Технологический стек:**
- Язык: JavaScript (ES2022+, ESM модули, НЕ TypeScript)
- Рендеринг: PixiJS 7+
- Физика: Matter.js
- Звук: Howler.js
- Сборка: Vite
- Тайлмапы: Tiled Map Editor → JSON
- Диалоги: Ink.js
- Анимации: Spine Web Runtime
- Платформа: Web (Chrome, Firefox, Safari, Edge)
- Целевой FPS: 60
- Целевое разрешение: 1920x1080 (адаптив до 1280x720)

---

## 📐 АРХИТЕКТУРА ПРОЕКТА

### Структура папок

```
epic-refund/
├── index.html
├── vite.config.js
├── package.json
├── CLAUDE.md                    ← этот файл
├── docs/
│   ├── GDD.md                   ← Game Design Document (полный)
│   ├── BALANCE.md               ← Таблицы баланса
│   └── LEVEL_DESIGN.md          ← Схемы уровней
├── src/
│   ├── main.js                  ← Точка входа
│   ├── core/
│   │   ├── Game.js              ← Главный класс, игровой цикл
│   │   ├── SceneManager.js      ← Управление сценами
│   │   ├── InputManager.js      ← Ввод (клавиатура + геймпад)
│   │   ├── SaveManager.js       ← localStorage + IndexedDB
│   │   ├── AudioManager.js      ← Музыка и SFX через Howler.js
│   │   ├── EventBus.js          ← Publish/Subscribe события
│   │   ├── Camera.js            ← Камера с плавным следованием
│   │   └── AssetLoader.js       ← Ленивая загрузка ассетов
│   ├── entities/
│   │   ├── Player.js
│   │   ├── Enemy.js             ← Базовый класс врага
│   │   ├── enemies/
│   │   │   ├── Slime.js
│   │   │   ├── Goblin.js
│   │   │   ├── Skeleton.js
│   │   │   ├── Orc.js
│   │   │   ├── DarkKnight.js
│   │   │   └── bosses/
│   │   │       ├── Homunculus.js
│   │   │       ├── Drowned.js
│   │   │       └── SlimeOfReckoning.js
│   │   ├── NPC.js
│   │   ├── npcs/
│   │   │   ├── Lira.js
│   │   │   ├── Gribl.js
│   │   │   └── MalahorShadow.js
│   │   └── Projectile.js
│   ├── systems/
│   │   ├── SkillTree.js         ← Обратное дерево навыков
│   │   ├── EchoSystem.js        ← Пассивные эхо-бонусы
│   │   ├── CombatSystem.js      ← Расчёт урона, хитбоксы
│   │   ├── FearSystem.js        ← Уровень страха врагов
│   │   ├── WeightSystem.js      ← Вес инвентаря
│   │   ├── HUDManager.js        ← Деградирующий интерфейс
│   │   ├── DialogueSystem.js    ← Ink.js интеграция
│   │   ├── GateSystem.js        ← Врата Забвения
│   │   ├── ParticleSystem.js    ← Частицы и VFX
│   │   └── LiraAI.js           ← Поведение спутницы
│   ├── levels/
│   │   ├── Level.js             ← Базовый класс уровня
│   │   ├── LevelLoader.js       ← Загрузка Tiled JSON
│   │   ├── Room.js              ← Класс комнаты
│   │   └── rooms/               ← Логика конкретных комнат
│   ├── ui/
│   │   ├── MainMenu.js
│   │   ├── PauseMenu.js
│   │   ├── SkillTreeUI.js
│   │   ├── GateUI.js
│   │   ├── DialogueUI.js
│   │   ├── InventoryUI.js
│   │   └── HUD.js
│   ├── data/
│   │   ├── skills.js            ← Все навыки, их параметры и эхо
│   │   ├── enemies.js           ← Статы всех врагов
│   │   ├── echoes.js            ← Данные эхо-эффектов
│   │   ├── dialogues/           ← .ink файлы
│   │   ├── levels/              ← .json файлы из Tiled
│   │   └── balance.js           ← Глобальные константы баланса
│   └── utils/
│       ├── MathUtils.js
│       ├── CollisionUtils.js
│       ├── AnimationUtils.js
│       ├── ObjectPool.js        ← Пул объектов (снаряды, частицы)
│       └── PerformanceMonitor.js
├── public/
│   ├── sprites/
│   ├── audio/
│   │   ├── music/
│   │   └── sfx/
│   ├── fonts/
│   └── tilemaps/
└── tests/
    ├── systems/
    │   ├── SkillTree.test.js
    │   ├── CombatSystem.test.js
    │   ├── FearSystem.test.js
    │   └── EchoSystem.test.js
    └── entities/
        ├── Player.test.js
        └── Enemy.test.js
```

---

## 🔧 СТАНДАРТЫ КОДА

### Общие правила

1. **Язык — чистый JavaScript (ES2022+).** НЕ используй TypeScript. НЕ используй JSDoc-аннотации типов вроде `@param {string}`. Код должен быть понятным из названий переменных и структуры.

2. **Модули — ESM (import/export).** Никаких `require()` или CommonJS.

3. **Классы — ES6 classes.** Используй `class`, `extends`, приватные поля через `#`. Никаких прототипов вручную.

4. **Константы — UPPER_SNAKE_CASE.** Переменные и функции — camelCase. Классы — PascalCase. Файлы — PascalCase для классов, camelCase для утилит.

5. **Нет глобальных переменных.** Всё через импорты, EventBus или передачу зависимостей.

6. **Каждый файл — один класс или один модуль утилит.** Не больше 300 строк на файл. Если файл растёт — декомпозируй.

7. **Комментарии — только "почему", не "что".** Код должен быть самодокументируемым. Комментируй неочевидные решения, хаки, и формулы баланса.

### Пример эталонного кода

```javascript
// src/systems/SkillTree.js

import { EventBus } from '../core/EventBus.js';
import { SKILLS } from '../data/skills.js';

const BRANCH_NAMES = ['strength', 'magic', 'defense', 'agility', 'aura'];

export class SkillTree {
  #skills = new Map();
  #lostOrder = [];
  #eventBus;

  constructor(eventBus) {
    this.#eventBus = eventBus;
    this.#initializeSkills();
  }

  #initializeSkills() {
    for (const [id, data] of Object.entries(SKILLS)) {
      this.#skills.set(id, {
        ...data,
        active: true,
        echoActive: false,
        lostAtLevel: null,
      });
    }
  }

  getActiveSkills() {
    const active = [];
    for (const [id, skill] of this.#skills) {
      if (skill.active) active.push({ id, ...skill });
    }
    return active;
  }

  getActiveSkillCount() {
    let count = 0;
    for (const skill of this.#skills.values()) {
      if (skill.active) count++;
    }
    return count;
  }

  canRemoveSkill(skillId) {
    const skill = this.#skills.get(skillId);
    if (!skill || !skill.active) return false;

    // Проверяем: все зависимые навыки (выше по ветке) уже удалены?
    for (const dependentId of skill.dependents) {
      const dependent = this.#skills.get(dependentId);
      if (dependent && dependent.active) return false;
    }

    return true;
  }

  getRemovableSkills(gateRequirement) {
    const removable = [];

    for (const [id, skill] of this.#skills) {
      if (!skill.active) continue;
      if (!this.canRemoveSkill(id)) continue;

      if (gateRequirement === 'any' || skill.branch === gateRequirement) {
        removable.push({ id, ...skill });
      }
    }

    return removable;
  }

  removeSkill(skillId, currentLevel) {
    if (!this.canRemoveSkill(skillId)) {
      throw new Error(`Cannot remove skill: ${skillId}`);
    }

    const skill = this.#skills.get(skillId);
    skill.active = false;
    skill.echoActive = true;
    skill.lostAtLevel = currentLevel;

    this.#lostOrder.push(skillId);

    this.#eventBus.emit('skill:lost', {
      skillId,
      skillName: skill.name,
      branch: skill.branch,
      remainingCount: this.getActiveSkillCount(),
      echo: skill.echo,
    });

    return skill.echo;
  }

  isSkillActive(skillId) {
    const skill = this.#skills.get(skillId);
    return skill ? skill.active : false;
  }

  isEchoActive(skillId) {
    const skill = this.#skills.get(skillId);
    return skill ? skill.echoActive : false;
  }

  getActiveEchoes() {
    const echoes = [];
    for (const skill of this.#skills.values()) {
      if (skill.echoActive && skill.echo) {
        echoes.push(skill.echo);
      }
    }
    return echoes;
  }

  serialize() {
    const data = {};
    for (const [id, skill] of this.#skills) {
      data[id] = {
        active: skill.active,
        echoActive: skill.echoActive,
        lostAtLevel: skill.lostAtLevel,
      };
    }
    return { skills: data, lostOrder: [...this.#lostOrder] };
  }

  deserialize(data) {
    for (const [id, state] of Object.entries(data.skills)) {
      const skill = this.#skills.get(id);
      if (skill) Object.assign(skill, state);
    }
    this.#lostOrder = [...data.lostOrder];
  }
}
```

### Паттерн EventBus

```javascript
// src/core/EventBus.js

export class EventBus {
  #listeners = new Map();

  on(event, callback) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(callback);

    // Возвращаем функцию отписки
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const set = this.#listeners.get(event);
    if (set) set.delete(callback);
  }

  emit(event, data) {
    const set = this.#listeners.get(event);
    if (set) {
      for (const callback of set) {
        callback(data);
      }
    }
  }

  clear() {
    this.#listeners.clear();
  }
}
```

---

## 🎮 КЛЮЧЕВЫЕ СИСТЕМЫ — КАК РЕАЛИЗОВЫВАТЬ

### Обратное дерево навыков

Это ГЛАВНАЯ механика игры. Всё остальное строится вокруг неё.

**Правила:**
1. Навык можно удалить только если ВСЕ его зависимые навыки (dependents) уже удалены
2. Удаление необратимо
3. При удалении навыка активируется его Эхо (слабая пассивная версия)
4. Корень (базовый удар + ходьба) удаляется последним — только перед финальным боссом
5. Врата Забвения требуют определённый ТИП навыка, но конкретный выбор за игроком

**Данные навыков хранятся в `src/data/skills.js`.** Это единственный источник правды. Все системы (боевая, HUD, визуал) читают из SkillTree, а не хранят свои копии.

### Система страха

Враги меняют поведение в зависимости от силы игрока. Каждый тип врага имеет `fearThreshold`. Если количество активных навыков игрока превышает порог — враг боится. Если ниже — враг становится агрессивным.

**Это критически важно для ощущения деградации.** Один и тот же гоблин должен убегать в Акте 1 и устраивать засады в Акте 3.

### Система Эхо

Каждый потерянный навык оставляет Эхо — слабый пассивный бонус. Эхо применяются через EchoSystem, который собирает все активные Эхо и модифицирует статы игрока.

Эхо должны ОЩУЩАТЬСЯ, но не РЕШАТЬ. Они смягчают потерю, но не компенсируют её.

### Деградация HUD

HUD элементы скрываются по мере потери навыков. При 0 навыков — пустой экран, здоровье определяется визуально (хромота, красный экран, кашель).

### Спутница Лира

Лира НЕ управляется игроком. Она автономный NPC с собственным ИИ. Её полезность растёт по мере ослабления Кейна. Она реализуется через LiraAI.js как отдельная система.

---

## ⚠️ КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА

### Что ДЕЛАТЬ:

1. **Всегда проверяй существующий код перед созданием нового.** Не дублируй функциональность. Если система уже есть — расширяй её.

2. **Следуй архитектуре.** Новые файлы кладутся в соответствующие папки. Системы — в `systems/`, сущности — в `entities/`, данные — в `data/`.

3. **Используй EventBus для коммуникации между системами.** Не создавай прямые зависимости между несвязанными модулями. SkillTree не должен знать о HUD — он просто эмитит событие `skill:lost`, а HUD подписывается.

4. **Object Pooling для часто создаваемых объектов.** Снаряды, частицы, урон-числа — через ObjectPool. НЕ создавай new объекты каждый кадр.

5. **Тестируй баланс.** При изменении числовых значений (урон, HP, скорости) проверяй, что значения соответствуют таблицам в `docs/BALANCE.md` и `src/data/balance.js`.

6. **Сохраняй производительность.** Максимум 200 спрайтов на экране. Culling невидимых объектов. Проверяй FPS после каждого крупного изменения.

7. **Поддерживай все пути прохождения.** Игра должна быть проходима при ЛЮБОМ порядке потери навыков. Если создаёшь головоломку, требующую конкретный навык — обязательно создай альтернативный путь.

8. **Каждый коммит — рабочее состояние.** Игра должна запускаться и быть играбельной после каждого изменения. Нет "сломанных" промежуточных состояний.

### Что НЕ ДЕЛАТЬ:

1. **НЕ используй TypeScript.** Ни типы, ни интерфейсы, ни дженерики, ни `.ts` файлы. Чистый JavaScript.

2. **НЕ используй `var`.** Только `const` и `let`. Предпочитай `const`.

3. **НЕ мутируй данные из `data/`.** Файлы в `src/data/` — это константы. Если нужно изменяемое состояние на основе данных — создавай копию.

4. **НЕ используй `setInterval` / `setTimeout` для игровой логики.** Всё через `requestAnimationFrame` и delta time в игровом цикле.

5. **НЕ хардкодь числа в логике.** Все числовые параметры (урон, HP, скорости, кулдауны) берутся из файлов данных или `balance.js`. Магических чисел в коде быть НЕ должно.

6. **НЕ создавай DOM элементы для игрового UI.** Весь UI рендерится через PixiJS. DOM используется только для HTML-обёртки и загрузочного экрана.

7. **НЕ загружай все ассеты сразу.** Ленивая загрузка: начальный экран ≤ 5MB, каждый уровень подгружается отдельно.

8. **НЕ ломай сохранения.** При изменении структуры SaveData — обеспечь миграцию старых сохранений. Проверяй `version` при загрузке.

9. **НЕ игнорируй edge cases потери навыков.** Всегда проверяй: "что если у игрока нет этого навыка?" в каждой системе, которая его использует.

---

## 📋 ПРИОРИТЕТЫ РАЗРАБОТКИ

### Текущий этап: Вертикальный Срез (Milestone 1)

Цель: **один полностью играбельный уровень** (Уровень 2: Казармы Тьмы).

**Порядок реализации:**

1. **Ядро (core/):**
   - Game.js — игровой цикл с delta time
   - InputManager.js — клавиатура (WASD + JK + UIO + Space + Shift + E)
   - EventBus.js — система событий
   - Camera.js — следование за игроком с плавным lerp

2. **Игрок (entities/Player.js):**
   - Движение (ходьба, прыжок, перекат)
   - Базовая атака палкой
   - 5 навыков (по одному из ветки): Владение мечом, Огненный шар, Парирование, Спринт, Регенерация
   - Визуальное состояние (хотя бы 2 из 5 вариантов спрайтов)

3. **Дерево навыков (systems/SkillTree.js):**
   - Полная реализация дерева с 5 навыками
   - Правила удаления (проверка зависимостей)
   - Эмиты событий при потере

4. **Эхо (systems/EchoSystem.js):**
   - Активация Эхо при потере навыка
   - Применение пассивных бонусов к игроку

5. **Враги (entities/enemies/):**
   - Slime.js — базовый враг
   - Goblin.js — враг с поведением страха
   - Skeleton.js — враг со щитом
   - Базовый FSM для поведения

6. **Система страха (systems/FearSystem.js):**
   - Расчёт угрозы игрока
   - Переключение поведения врагов

7. **Бой (systems/CombatSystem.js):**
   - Формулы урона (исходящий и входящий)
   - Хитбоксы (AABB)
   - Парирование с окном

8. **Врата (systems/GateSystem.js):**
   - Интерфейс выбора навыка для жертвы
   - Кинематографика потери

9. **HUD (systems/HUDManager.js):**
   - HP-бар
   - Панель навыков
   - Деградация при потере навыков

10. **Уровень (levels/):**
    - LevelLoader.js — загрузка Tiled JSON
    - Уровень 2 из 7 комнат
    - Переходы между комнатами

---

## 🔢 КЛЮЧЕВЫЕ КОНСТАНТЫ

Все игровые константы хранятся в `src/data/balance.js`:

```javascript
// src/data/balance.js

export const BALANCE = {
  player: {
    baseHP: 100,
    baseSpeed: 150,           // пикс/сек
    baseDamage: 5,            // урон палкой
    baseJumpForce: 400,
    rollSpeed: 350,
    rollDuration: 0.4,
    rollCooldown: 0.6,
    staminaMax: 100,
    staminaRegen: 25,         // /сек
    staminaRegenDelay: 0.8,   // сек перед началом регена
    gravity: 980,             // пикс/сек²
  },

  combat: {
    iFrameDuration: 0.25,     // секунд неуязвимости при перекате (с навыком)
    comboWindow: 0.5,         // секунд между ударами для комбо
    comboMultipliers: [1.0, 1.2, 1.5],
    parryWindow: 0.2,         // секунд
    perfectParryWindow: 0.08,
    knockbackBase: 80,        // пикселей
  },

  fear: {
    recentKillWeight: 0.5,    // бонус к угрозе за недавние убийства
    recentKillDecay: 10,      // секунд до затухания
    lowHPPenalty: -3,         // штраф при < 30% HP
    criticalHPPenalty: -5,    // штраф при < 10% HP
    auraFearBonus: 3,         // бонус от Ауры Страха
  },

  hud: {
    hideStaminaAt: 10,        // навыков — скрыть полосу стамины
    hideMinimapAt: 10,
    hideEnemyBarsAt: 8,
    hideDamageNumbersAt: 12,
    hideAllAt: 2,             // полностью пустой HUD
    fadeDuration: 2.0,        // секунд fade out
  },

  weight: {
    lightThreshold: 0.3,      // 30% — лёгкий
    mediumThreshold: 0.6,
    heavyThreshold: 0.9,
    lightSpeedMod: 1.0,
    mediumSpeedMod: 0.8,
    heavySpeedMod: 0.6,
    overloadSpeedMod: 0.4,
  },

  lira: {
    appearAtLevel: 4,         // Уровень, где появляется
    distractCooldown: 15,     // секунд перезарядки крика
    saucepanDamage: 8,
    saucepanStun: 1.0,        // секунд оглушения
    carryCapacity: 20,        // единиц веса, которые она может нести
    reviveCharges: 1,         // раз за игру
  },

  performance: {
    maxSpritesOnScreen: 200,
    maxParticles: 150,
    maxPhysicsBodies: 100,
    targetFPS: 60,
    minFPS: 30,
  },
};
```

---

## 📡 СОБЫТИЯ (EventBus)

Стандартизированные имена событий:

```javascript
// === НАВЫКИ ===
'skill:lost'           // { skillId, skillName, branch, remainingCount, echo }
'skill:echoed'         // { echoId, effects }
'skill:attempted'      // { skillId } — попытка использовать потерянный навык

// === БОЙ ===
'combat:damage'        // { source, target, amount, type, isCrit }
'combat:kill'          // { killer, victim, enemyType }
'combat:parry'         // { isPerfect }
'combat:playerHit'     // { damage, remainingHP, source }
'combat:playerDeath'   // { level, room, enemyType, skillsRemaining }

// === УРОВНИ ===
'level:enter'          // { levelNumber, levelName }
'level:roomEnter'      // { roomId, roomType }
'level:roomClear'      // { roomId }
'level:complete'       // { levelNumber, time, deaths }

// === ВРАТА ===
'gate:approach'        // { gateId, requirement, count }
'gate:sacrifice'       // { gateId, skillId, remainingCount }
'gate:open'            // { gateId }

// === ИГРОК ===
'player:stateChange'   // { from, to } — визуальное состояние (god/hero/veteran/survivor/nobody)
'player:weightChange'  // { category, totalWeight }
'player:hpChange'      // { current, max, percent }

// === HUD ===
'hud:elementHide'      // { element, remainingSkills }
'hud:styleChange'      // { newStyle }

// === СТРАХ ===
'fear:evaluated'       // { enemyId, threatLevel, behavior }
'fear:enemyFled'       // { enemyId }
'fear:enemyAggro'      // { enemyId, groupSize }

// === NPC ===
'npc:dialogueStart'    // { npcId }
'npc:dialogueEnd'      // { npcId, choicesMade }
'lira:comment'         // { text, context }
'lira:rescue'          // { type } — 'distract' / 'saucepan' / 'revive'

// === СИСТЕМА ===
'game:save'            // { slot }
'game:load'            // { slot }
'game:pause'           // {}
'game:resume'          // {}
```

---

## 🐛 ОТЛАДКА

### Debug режим

Включается через `?debug=true` в URL или `localStorage.setItem('debug', 'true')`.

В debug режиме:
- Отображаются хитбоксы (зелёные прямоугольники)
- FPS-счётчик в углу
- Можно телепортироваться между комнатами (Ctrl+1..9)
- Можно добавлять/убирать навыки (Ctrl+Shift+1..5 = ветки)
- Консольные логи всех событий EventBus
- Можно убить всех врагов на экране (Ctrl+K)
- Бессмертие (Ctrl+G)

```javascript
// В Game.js
if (this.debugMode) {
  this.debugOverlay.render(this.renderer);
}
```

### Консольные команды (window.game в debug)

```javascript
window.game.debug.setSkillCount(n)     // Установить кол-во навыков
window.game.debug.teleport(roomId)     // Телепорт
window.game.debug.spawnEnemy(type)     // Создать врага
window.game.debug.setHP(n)            // Установить HP
window.game.debug.godMode()           // Бессмертие
window.game.debug.showFear()          // Показать уровни страха над врагами
window.game.debug.showHitboxes()      // Хитбоксы
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Что тестировать обязательно:

1. **SkillTree** — все правила обрезки, порядок зависимостей, крайние случаи (удаление последнего, удаление из пустой ветки, попытка удалить навык с активными зависимыми)

2. **CombatSystem** — формулы урона с разными комбинациями навыков/эхо, парирование, граничные значения (0 урона, максимальный урон, переполнение)

3. **FearSystem** — пороги страха для каждого типа врага, переключение поведения, крайние случаи (0 навыков, 20 навыков, ровно на пороге)

4. **EchoSystem** — комбинации эхо, синергии, корректность модификаторов

5. **SaveManager** — сериализация/десериализация, миграция версий, повреждённые данные

### Формат тестов

```javascript
// tests/systems/SkillTree.test.js

import { describe, it, expect, beforeEach } from 'vitest';
import { SkillTree } from '../../src/systems/SkillTree.js';
import { EventBus } from '../../src/core/EventBus.js';

describe('SkillTree', () => {
  let tree;
  let bus;

  beforeEach(() => {
    bus = new EventBus();
    tree = new SkillTree(bus);
  });

  describe('initialization', () => {
    it('starts with all 20 skills active', () => {
      expect(tree.getActiveSkillCount()).toBe(20);
    });
  });

  describe('skill removal', () => {
    it('cannot remove a skill with active dependents', () => {
      // str_base depends on str_t2 which depends on str_t3...
      expect(tree.canRemoveSkill('str_base')).toBe(false);
    });

    it('can remove a leaf skill (no dependents)', () => {
      expect(tree.canRemoveSkill('str_t4')).toBe(true);
    });

    it('activates echo on removal', () => {
      tree.removeSkill('str_t4', 2);
      expect(tree.isEchoActive('str_t4')).toBe(true);
    });

    it('emits skill:lost event', () => {
      let emitted = null;
      bus.on('skill:lost', (data) => { emitted = data; });

      tree.removeSkill('str_t4', 2);

      expect(emitted).not.toBeNull();
      expect(emitted.skillId).toBe('str_t4');
      expect(emitted.remainingCount).toBe(19);
    });

    it('allows removing parent after child is removed', () => {
      tree.removeSkill('str_t4', 2);
      expect(tree.canRemoveSkill('str_t3')).toBe(true);
    });
  });
});
```

---

## 📝 ЧЕКЛИСТ ПЕРЕД ЗАВЕРШЕНИЕМ ЗАДАЧИ

Перед тем как считать задачу выполненной, проверь:

- [ ] Код следует архитектуре и стандартам из этого документа
- [ ] Нет хардкоженных чисел — все параметры в `data/` или `balance.js`
- [ ] Системы общаются через EventBus, а не прямые вызовы
- [ ] Нет утечек памяти (подписки на события отписываются, объекты возвращаются в пулы)
- [ ] Игра запускается и играется после изменений
- [ ] Нет ошибок в консоли браузера
- [ ] Работает при любом количестве навыков (от 0 до 20)
- [ ] Если затронута боевая система — проверены формулы урона
- [ ] Если затронуты враги — проверена система страха
- [ ] Если затронут HUD — проверена деградация при потере навыков
- [ ] Если затронуто сохранение — проверена сериализация/десериализация
- [ ] Производительность: нет просадок FPS ниже 60 в типичной сцене
```