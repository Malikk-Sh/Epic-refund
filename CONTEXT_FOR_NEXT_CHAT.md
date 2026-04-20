# Epic Refund — Контекст для Claude (следующий чат)

## О проекте

Браузерная reverse-metroidvania / action-RPG **top-down** (вид сверху, как Soul Knight).
Главная механика: игрок начинает с **20 навыками** и теряет их у **Врат Забвения**, чтобы продвигаться дальше. Потеря — не наказание, а основная прогрессия.

**Стек: чистый JavaScript (ES2022, ESM) + Canvas 2D API + WebAudio API. Никаких библиотек рендера. Никакого TypeScript. Никакого vite — запускается через `python3 -m http.server 8000`.**

---

## Текущее состояние (Milestone 1 завершён)

- 40 JS-файлов, 84/84 тестов проходят (`node tests/runner.js`)
- Уровень 2 «Казармы Тьмы» — 7 комнат, 2 Врат Забвения
- Враги: Slime, Goblin, Skeleton
- NPC: Gribl (реплики меняются по фазам)
- HUD деградирует с потерей навыков
- Адаптивный canvas (letterbox)
- WebAudio API — 11 синтетических звуков без ассетов

---

## Структура проекта

```
epic-refund/          ← корень (переименован из epic-refund-v2)
├── index.html
├── package.json      (npm start → python3 -m http.server 8000)
├── README.md
├── src/
│   ├── core/
│   │   ├── EventBus.js       ← шина событий, единственный канал связи между системами
│   │   ├── Game.js           ← игровой цикл, инициализация всех систем
│   │   ├── InputManager.js   ← клавиатура (WASD+стрелки, 8 направлений)
│   │   ├── Camera.js         ← lerp-следование, snapTo при смене комнаты, shake
│   │   ├── Renderer.js       ← Canvas 2D с letterbox-масштабированием
│   │   ├── SaveManager.js    ← localStorage
│   │   └── AudioManager.js   ← WebAudio API, синтетические звуки
│   ├── systems/
│   │   ├── SkillTree.js      ← ГЛАВНАЯ МЕХАНИКА: 20 навыков, правила обрезки, Эхо
│   │   ├── EchoSystem.js     ← пассивные бонусы от потерянных навыков
│   │   ├── CombatSystem.js   ← все формулы урона (урон, парирование, щит)
│   │   ├── FearSystem.js     ← угроза игрока → поведение врагов
│   │   ├── HUDManager.js     ← управляет видимостью элементов HUD
│   │   ├── GateSystem.js     ← Врата Забвения: логика жертвы навыков
│   │   ├── WeightSystem.js   ← вес инвентаря → скорость
│   │   └── ParticleSystem.js ← частицы через ObjectPool
│   ├── entities/
│   │   ├── Player.js         ← top-down игрок, 8 направлений, без гравитации
│   │   ├── Enemy.js          ← базовый враг с FSM (idle/patrol/alert/chase/attack/flee/stun)
│   │   ├── NPC.js            ← базовый НПС
│   │   ├── enemies/
│   │   │   ├── Slime.js
│   │   │   ├── Goblin.js
│   │   │   └── Skeleton.js
│   │   └── npcs/
│   │       └── Gribl.js      ← торговец, реплики по 5 фазам
│   ├── levels/
│   │   ├── Tilemap.js        ← 2D массив тайлов + moveEntity (коллизия + скольжение)
│   │   ├── Room.js           ← комната: тайлмап, враги, двери, Врата, переходы
│   │   ├── Level.js          ← набор комнат + transitionToRoom()
│   │   └── Level02_Barracks.js ← 7 комнат тайлмапами 15×10
│   ├── render/
│   │   ├── SpriteRegistry.js ← каталог спрайтов (fallback → плейсхолдер)
│   │   └── WorldRenderer.js  ← рисует тайлмап, сущности, плейсхолдеры с подписями
│   ├── ui/
│   │   ├── GameScene.js      ← главная сцена, склейка всего
│   │   ├── HUD.js            ← HP/Mana/Stamina, иконки навыков, минимап
│   │   ├── DialogueSystem.js ← диалоги с печатающей машинкой
│   │   ├── GateUI.js         ← модальное окно Врат, навигация стрелками
│   │   └── Notifications.js  ← всплывающие уведомления + числа урона
│   ├── data/
│   │   ├── balance.js        ← ВСЕ числовые константы (tileSize=24, скорости, урон...)
│   │   ├── skills.js         ← 20 навыков с параметрами и Эхо
│   │   └── dialogues/
│   │       └── kane_dialogues.js  ← реплики Кейна по ситуациям и фазам
│   ├── utils/
│   │   ├── MathUtils.js
│   │   └── ObjectPool.js
│   └── main.js               ← точка входа
└── tests/
    └── runner.js             ← node tests/runner.js → 84/84 ✓
```

---

## Стандарты кода (ОБЯЗАТЕЛЬНО соблюдать)

1. **Чистый JS (ES2022+, ESM).** Без TypeScript, без JSDoc-типов, без CommonJS
2. **Классы с приватными полями через `#`.** Никаких прототипов вручную
3. **Все числа — в `src/data/balance.js`.** Никакого хардкода в логике
4. **Системы общаются ТОЛЬКО через EventBus.** Никаких прямых импортов между несвязанными системами
5. **Не более 300 строк на файл.** Если растёт — декомпозируй
6. **Плейсхолдеры везде.** Ни один модуль не должен требовать ассетов для работы
7. **Комментарии только «почему», не «что».** Код самодокументирован

---

## Ключевые события EventBus (стандартные имена)

```
skill:lost          { skillId, skillName, branch, remainingCount, echo }
skill:attempted     { skillId }          ← мышечная память
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
```

---

## Тайлмап: типы тайлов

```js
TILE.EMPTY = 0        // пустота (нельзя ходить)
TILE.FLOOR = 1        // пол (можно ходить)
TILE.WALL  = 2        // стена (блокирует)
TILE.DOOR_CLOSED = 3  // закрытая дверь (блокирует)
TILE.DOOR_OPEN   = 4  // открытая дверь (можно ходить)
TILE.GATE = 6         // визуальный тайл Врат
TILE.SPAWN = 7        // точка спавна (конвертируется в FLOOR при создании комнаты)
```

Комната 15×10 тайлов = 360×240 логических пикселей. `tileSize = 24`.

---

## Добавление спрайтов

В `src/main.js` после `game.init(canvas)`:

```js
// Достаточно одной строки на сущность
game.spriteRegistry.register('player', 'assets/sprites/player.png', { width: 14, height: 14 });
game.spriteRegistry.register('slime',  'assets/sprites/slime.png',  { width: 16, height: 12 });
// и т.д.
```

Если спрайт НЕ зарегистрирован — автоматически рисуется плейсхолдер (цветной прямоугольник + подпись).

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

## Ветки навыков (20 всего, 4 тира каждая)

```
strength: str_base → str_t2 → str_t3 → str_t4 (Танец Смерти — УЛЬТ)
magic:    mag_base → mag_t2 → mag_t3 → mag_t4 (Армагеддон — УЛЬТ)
defense:  def_base → def_t2 → def_t3 → def_t4 (Неуязвимость — УЛЬТ)
agility:  agi_base → agi_t2 → agi_t3 → agi_t4 (Телепортация — УЛЬТ)
aura:     aur_base → aur_t2 → aur_t3 → aur_t4 (Аура Аннигиляции — УЛЬТ)
```

**Правило обрезки:** удалить можно только листовой навык (у которого нет активных зависимых). Двигаемся только от конца к началу ветки.

---

## Milestone 2: что делать дальше

По приоритету:

1. **Уровень 1 — Гнилой Пик** (до Казарм). Создать `Level01_RottenPeak.js` по аналогии с `Level02_Barracks.js`. Враги слабее, Врат нет или 1.
2. **Уровень 3 — Подземелья**. Тяжелее Казарм: больше врагов, 2–3 Врат.
3. **Первый босс — Гомункул** (`src/entities/enemies/bosses/Homunculus.js`). Фазовый бой, 3 фазы, знает историю Кейна.
4. **Спутница Лира** (`src/entities/npcs/Lira.js`). Появляется с уровня 4. Может отвлекать врагов, нести предметы, один раз спасти от смерти.
5. **Загрузка карт из Tiled JSON** (`src/levels/LevelLoader.js`). Более гибкое создание уровней.
6. **Туман войны** — затемнение непосещённых комнат.
7. **Ink.js диалоги** для сложных деревьев разговоров.

---

## Известные ограничения / TODO

- `WeightSystem` создан, но в `Player.js` пока не подключён (нет `weightSystem` в зависимостях Player)
- `LiraAI` не реализована
- Боссы не реализованы
- Ink.js не подключён (упрощённые диалоги через массивы строк)
- Туман войны задуман, но не реализован
- Минимап в `HUD.js` имеет хардкод `layout` для комнат level02 — при добавлении нового уровня нужно обновить

---

## Ссылки на документацию в проекте

Полная GDD и техническая спецификация лежат в `/mnt/project/` (в этом чате были недоступны для записи, только для чтения):
- `/mnt/project/CLAUDE.md` — инструкции Claude
- `/mnt/project/game-concept.PDF` — концепция игры
- `/mnt/project/technical_specification.PDF` — техническая спецификация
