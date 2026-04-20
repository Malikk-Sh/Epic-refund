# Epic Refund — Контекст для Claude (следующий чат)

## О проекте

Браузерная reverse-metroidvania / action-RPG **top-down** (вид сверху, как Soul Knight).
Главная механика: игрок начинает с **20 навыками** и теряет их у **Врат Забвения**, чтобы продвигаться дальше. Потеря — не наказание, а основная прогрессия.

**Стек: чистый JavaScript (ES2022, ESM) + Canvas 2D API + WebAudio API. Никаких библиотек рендера. Никакого TypeScript. Никакого vite — запускается через `python3 -m http.server 8000`.**

---

## Текущее состояние

- **Milestone 1** завершён (играбельный вертикальный срез).
- **Milestone 2** — сделаны: Уровень 1 «Гнилой Пик», межуровневые переходы, туман войны, первый босс Гомункул с фазовой системой.
- Ветка: `claude/review-project-context-3VRJt` — **4 коммита поверх main, запушены, PR не создан.**
  1. `Add Level 1 «Гнилой Пик» as intro level before Казармы`
  2. `Add inter-level transition from Level 1 to Level 2`
  3. `Add fog-of-war to minimap`
  4. `Add first boss Homunculus with phase system`
- **43 JS-файла** в `src/`, **163/163 тестов** проходят (`cd epic-refund-v2 && node tests/runner.js`).
- Рабочий корень: `/home/user/Epic-refund/epic-refund-v2`.

---

## Что нового в прошлой сессии

### Уровень 1 «Гнилой Пик» (`src/levels/Level01_RottenPeak.js`)
6 комнат с префиксом `l1_`:

```
[l1_room_01 Лагерь] → [l1_room_02 Тропа] → [l1_room_03 Завал]
                                                  ↓
       [l1_room_04 Врата] → [l1_room_05 Перевал] → [l1_room_06 Арена: Гомункул] → Казармы
```

- `l1_room_01` — спавн, без врагов. `l1_room_02` — 1× Slime. `l1_room_03` — 2× Slime + препятствия.
- `l1_room_04` — **Врата Прозрения** (`CHOICE/MINOR`, обучающие) + 1× Goblin-страж.
- `l1_room_05` — мирная передышка. `l1_room_06` — арена с боссом Гомункулом.
- Комнаты Level02 переименованы в `l2_room_01..l2_room_07`.

### LevelRegistry и межуровневые переходы (`src/levels/LevelRegistry.js`)
- Фабрика: `createLevelByKey('level_01' | 'level_02', systems)`.
- Двери расширены: `Room.addDoor(direction, toRoomId, targetSpawnDir, toLevelKey)`.
- `Level.checkRoomTransition` возвращает объект двери (с `toLevelKey` для межуровневой).
- `GameScene.#loadLevel(levelKey, startRoomId, fromDirection)` — перезагрузка уровня прямо в игровом цикле.
- Восточная дверь `l1_room_06` ведёт в `l2_room_01` → `level_02`.

### Туман войны
- `Room.isSeen` (показывать силуэт) + `Room.isVisited` (посещено).
- `Level.markRoomSeen(roomId)` помечает комнату и её соседей через `Room.neighbors`.
- `HUD.drawMinimap` рисует 3 состояния: невидимо → силуэт → цветная клетка.
- `Level.minimapLayout` теперь поле уровня (хардкод из HUD убран), задаётся в каждом `createLevelXX`.

### Первый босс Гомункул (`src/entities/enemies/bosses/`)
- **`Boss.js`** — базовый класс: поле `phases = [{ hpThreshold, moveSpeed?, damage?, attackSpeed?, attackRange?, armor?, name? }]`, порог `1.0` = стартовые статы.
  - Переходы по HP детектятся в `update()`, применяют статы фазы, эмитят `boss:phaseChange`.
  - `boss:defeat` эмитится один раз при переходе `isAlive: true → false` (через флаг `#wasAlive`).
- **`Homunculus.js`** — HP 120, броня 2, 3 фазы:
  - Равнодушный (100% HP): move 45, dmg 8, attackSpeed 2.0
  - Внимательный (≤66% HP): move 65, dmg 10, attackSpeed 1.4
  - Распад (≤33% HP): move 85, dmg 14, attackSpeed 1.0, armor **0**
- **`HUD.drawBossBar(room)`** — находит живого `isBoss`-врага в комнате, рисует HP-полосу + имя фазы. Не зависит от деградации HUD.
- **GameScene** — подписан на `boss:phaseChange` / `boss:defeat` (уведомления, тряска камеры, реплики Кейна); `#checkBossEncounter` — одноразовая реплика на вход в комнату с живым боссом (флаг сбрасывается при смене комнаты).

### Диалоги Кейна (`src/data/dialogues/kane_dialogues.js`)
- Новые ключи: `environment.entered_rotten_peak`, `boss.encounter.homunculus`, `boss.phase.homunculus`, `boss.defeat.homunculus`.

---

## Структура проекта

```
epic-refund-v2/          ← рабочий корень
├── index.html
├── package.json         (npm start → python3 -m http.server 8000)
├── src/
│   ├── core/
│   │   ├── EventBus.js       ← шина событий, единственный канал связи
│   │   ├── Game.js
│   │   ├── InputManager.js
│   │   ├── Camera.js
│   │   ├── Renderer.js
│   │   ├── SaveManager.js
│   │   └── AudioManager.js
│   ├── systems/
│   │   ├── SkillTree.js      ← 20 навыков, правила обрезки, Эхо
│   │   ├── EchoSystem.js
│   │   ├── CombatSystem.js
│   │   ├── FearSystem.js
│   │   ├── HUDManager.js
│   │   ├── GateSystem.js
│   │   ├── WeightSystem.js
│   │   └── ParticleSystem.js
│   ├── entities/
│   │   ├── Player.js         ← top-down, 8 направлений, без гравитации
│   │   ├── Enemy.js          ← FSM: idle/patrol/alert/chase/attack/flee/stun/dead
│   │   ├── NPC.js
│   │   ├── enemies/
│   │   │   ├── Slime.js
│   │   │   ├── Goblin.js
│   │   │   ├── Skeleton.js
│   │   │   └── bosses/
│   │   │       ├── Boss.js         ← НОВОЕ: фазовый базовый класс
│   │   │       └── Homunculus.js   ← НОВОЕ: первый босс
│   │   └── npcs/
│   │       └── Gribl.js
│   ├── levels/
│   │   ├── Tilemap.js
│   │   ├── Room.js                 ← isSeen, doors с toLevelKey
│   │   ├── Level.js                ← minimapLayout, markRoomSeen
│   │   ├── LevelRegistry.js        ← НОВОЕ: createLevelByKey
│   │   ├── Level01_RottenPeak.js   ← НОВОЕ: 6 комнат + босс
│   │   └── Level02_Barracks.js     ← комнаты теперь l2_room_*
│   ├── render/
│   │   ├── SpriteRegistry.js
│   │   └── WorldRenderer.js
│   ├── ui/
│   │   ├── GameScene.js      ← #loadLevel, boss events, #checkBossEncounter
│   │   ├── HUD.js            ← drawBossBar, drawMinimap (fog-of-war)
│   │   ├── DialogueSystem.js
│   │   ├── GateUI.js
│   │   └── Notifications.js
│   ├── data/
│   │   ├── balance.js        ← ВСЕ числовые константы
│   │   ├── skills.js
│   │   └── dialogues/
│   │       └── kane_dialogues.js
│   ├── utils/
│   │   ├── MathUtils.js
│   │   └── ObjectPool.js
│   └── main.js
└── tests/
    └── runner.js             ← 163/163 ✓
```

---

## Стандарты кода (ОБЯЗАТЕЛЬНО)

1. Чистый JS (ES2022+, ESM). Без TypeScript, без JSDoc-типов.
2. Классы с приватными полями `#`. Никаких прототипов.
3. **Все числа — в `src/data/balance.js`.** Никакого хардкода в логике.
4. Системы общаются ТОЛЬКО через EventBus.
5. Не более 300 строк на файл.
6. Плейсхолдеры везде — ни один модуль не требует ассетов.
7. Комментарии только «почему», не «что».

---

## Ключевые события EventBus

```
skill:lost          { skillId, skillName, branch, remainingCount, echo }
skill:attempted     { skillId }
player:attack       { type, damage, range, arc, dirX, dirY, x, y }
player:speaks       { line, duration }
combat:playerHit    { damage, remainingHP, source }
combat:playerDeath  { skillsRemaining }
combat:kill         { enemyType }
player:parrySuccess { perfect, reflected }
player:deathSave    {}
gate:approach       { gateId, requirement, count }
gate:sacrifice      { gateId, skillId }
gate:open           { gateId }
room:enter          { roomId, firstVisit, fromDirection }
room:cleared        { roomId }
npc:dialogueStart   { npcId, speaker, line }
player:weightChange { category, totalWeight }

# НОВЫЕ (босс):
boss:phaseChange    { bossId, displayName, phase, totalPhases, name }
boss:defeat         { bossId, displayName }
```

---

## Тайлмап

```js
TILE.EMPTY = 0        // пустота
TILE.FLOOR = 1        // пол
TILE.WALL  = 2        // стена
TILE.DOOR_CLOSED = 3
TILE.DOOR_OPEN   = 4
TILE.GATE = 6         // визуал Врат
TILE.SPAWN = 7        // → FLOOR при создании комнаты
```

Комната 15×10 тайлов = 360×240 логических пикселей. `tileSize = 24`.

---

## Добавление спрайтов

```js
// в src/main.js после game.init(canvas)
game.spriteRegistry.register('homunculus', 'assets/sprites/homunculus.png', { width: 22, height: 24 });
```

Без регистрации — плейсхолдер (цветной прямоугольник + подпись).

---

## Фазы игрока

| Фаза | Навыков | Цвет |
|---|---|---|
| god | 17–20 | `#FFD700` золото |
| hero | 12–16 | `#C0C0C0` серебро |
| veteran | 7–11 | `#CD7F32` бронза |
| survivor | 3–6 | `#8B5A2B` тусклый |
| nobody | 0–2 | `#555555` серый |

---

## Ветки навыков (20 всего, 4 тира)

```
strength: str_base → str_t2 → str_t3 → str_t4 (Танец Смерти — УЛЬТ)
magic:    mag_base → mag_t2 → mag_t3 → mag_t4 (Армагеддон — УЛЬТ)
defense:  def_base → def_t2 → def_t3 → def_t4 (Неуязвимость — УЛЬТ)
agility:  agi_base → agi_t2 → agi_t3 → agi_t4 (Телепортация — УЛЬТ)
aura:     aur_base → aur_t2 → aur_t3 → aur_t4 (Аура Аннигиляции — УЛЬТ)
```

Правило обрезки: удалить можно только листовой навык (без активных зависимых).

---

## Milestone 2: что дальше

**По приоритету пользователя** (первые 3 пункта уже сделаны):

1. ✅ ~~Уровень 1 — Гнилой Пик~~
2. ✅ ~~Туман войны~~
3. ✅ ~~Первый босс — Гомункул~~
4. **Ink.js диалоги** — заменить массивы строк (`kane_dialogues.js`, диалоги NPC) на Ink-деревья выбора. Точка интеграции — `DialogueSystem.js` и `NPC.js`.
5. **Уровень 3 — Подземелья** — по паттерну `Level01_RottenPeak.js` / `Level02_Barracks.js`. Добавить `level_03` в `LevelRegistry`. Межуровневая дверь из последней комнаты Level02 → `l3_room_01`. Больше врагов, 2–3 Врат, более сложный рельеф.
6. **Спутница Лира (LiraAI)** — `src/entities/npcs/Lira.js` + `src/systems/LiraAI.js`. Появляется на Уровне 4+. Отвлекает врагов, несёт предметы, один раз спасает от смерти (`player:deathSave`).
7. Дополнительные боссы (Drowned, SlimeOfReckoning) — используют готовый `Boss` базовый класс, `phases = [...]` в подклассе.
8. Загрузка карт из Tiled JSON (низкий приоритет — уровни сейчас описаны в коде).

---

## Известные ограничения / TODO

- **`WeightSystem`** создан, но в `Player.js` не подключён.
- **LiraAI** не реализована.
- **Ink.js** не подключён — диалоги через массивы строк в `kane_dialogues.js`.
- Уровни 1 и 2 соединены через `LevelRegistry`; **Уровня 3 ещё нет**.
- В `GameScene.#setupEventHandlers` реплики Кейна на смену фазы босса берутся по индексу `phase - 2` (для 3-фазного босса есть 2 реплики `phase`). При добавлении боссов с ≠3 фазами — учесть.
- Минимап не показывает значок «босс в комнате» (возможно, пригодится позже).
- Level01 использует только Slime + Goblin. Skeleton — только в Level02 (нарастание сложности).

---

## Запуск и проверки

```bash
# Тесты
cd /home/user/Epic-refund/epic-refund-v2 && node tests/runner.js
# Ожидается: 163 ✓  0 ✗

# Запуск в браузере
cd /home/user/Epic-refund/epic-refund-v2 && npm start
# http://localhost:8000
```

**E2E-прохождение:**
1. Старт в `l1_room_01` (Лагерь) → восток.
2. `l1_room_02` (1 Slime) → `l1_room_03` (2 Slime + камни).
3. `l1_room_04`: убить Goblin → подойти к Вратам → `E` → жертвуем любым листовым навыком (CHOICE/MINOR).
4. `l1_room_05` — мирная передышка.
5. `l1_room_06` — бой с Гомункулом (3 фазы: Равнодушный → Внимательный → Распад). После победы — восточная дверь открыта.
6. Переход в `level_02/l2_room_01` (Казармы Тьмы).

---

## Git

- Ветка: `claude/review-project-context-3VRJt`
- Коммиты (4): `569babf → 855cd88 → 829ee32 → 1a29c9c`
- PR ещё не создан.
