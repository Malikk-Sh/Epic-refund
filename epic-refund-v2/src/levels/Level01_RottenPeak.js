// Уровень 1: Гнилой Пик.
// 5 комнат, 1 Врата Забвения (обучающие — требование CHOICE).
//
// Вступительный уровень до Казарм: знакомит игрока с боем и механикой Врат.
//
// Структура (в плане):
//
//   [1-1 Лагерь] → [1-2 Тропа] → [1-3 Завал]
//                                      ↓
//                                    [1-4 Врата] → [1-5 Перевал]
//
// Тайлы:
//   0 = пустота        1 = пол         2 = стена
//   3 = закрытая дверь 4 = открытая    6 = Врата Забвения
//   7 = спавн игрока

import { Level } from './Level.js';
import { Room } from './Room.js';
import { BALANCE } from '../data/balance.js';
import { Slime } from '../entities/enemies/Slime.js';
import { Goblin } from '../entities/enemies/Goblin.js';
import { GATE_REQUIREMENTS, GATE_SIZES } from '../systems/GateSystem.js';

const TS = BALANCE.tileSize;

// Создаёт стандартную пустую комнату 15×10, двери по переданному списку направлений
function makeRoom(doorDirs = []) {
  const COLS = 15, ROWS = 10;
  const map = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const isEdge = r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1;
      row.push(isEdge ? 2 : 1);
    }
    map.push(row);
  }

  const cMid = Math.floor(COLS / 2);
  const rMid = Math.floor(ROWS / 2);

  if (doorDirs.includes('north')) map[0][cMid] = 3;
  if (doorDirs.includes('south')) map[ROWS - 1][cMid] = 3;
  if (doorDirs.includes('west'))  map[rMid][0] = 3;
  if (doorDirs.includes('east'))  map[rMid][COLS - 1] = 3;

  return map;
}

export function createLevel01(systems) {
  const level = new Level(1, 'Гнилой Пик', systems);

  // === 1-1: Лагерь (старт, без врагов) ===
  const r01map = makeRoom(['east']);
  // Точка спавна слева
  r01map[5][2] = 7;
  // Костёр-препятствие по центру для атмосферы
  r01map[5][7] = 2;
  const room01 = new Room('l1_room_01', r01map, TS);
  room01.openDoors();
  room01.isCleared = true;

  // === 1-2: Горная тропа — первый враг ===
  const r02map = makeRoom(['west', 'east']);
  const room02 = new Room('l1_room_02', r02map, TS);
  const s1 = room02.tilemap.tileToWorldCenter(8, 5);
  room02.addEnemy(new Slime(s1.x, s1.y));

  // === 1-3: Завал из камней — 2 слизи, препятствия ===
  const r03map = makeRoom(['west', 'east']);
  // Россыпь камней
  r03map[3][5] = 2;
  r03map[3][9] = 2;
  r03map[6][4] = 2;
  r03map[6][10] = 2;
  const room03 = new Room('l1_room_03', r03map, TS);
  const s2 = room03.tilemap.tileToWorldCenter(7, 3);
  const s3 = room03.tilemap.tileToWorldCenter(7, 7);
  room03.addEnemy(new Slime(s2.x, s2.y));
  room03.addEnemy(new Slime(s3.x, s3.y));

  // === 1-4: Врата Прозрения (обучающие) ===
  const r04map = makeRoom(['west', 'east']);
  r04map[5][7] = 6;
  const room04 = new Room('l1_room_04', r04map, TS);
  const gatePos = room04.tilemap.tileToWorldCenter(7, 5);
  room04.setGate({
    id: 'gate_1_1',
    requirement: GATE_REQUIREMENTS.CHOICE,
    size: GATE_SIZES.MINOR,
    label: 'Врата Прозрения',
    sublabel: 'Пожертвуй любым навыком',
    x: gatePos.x, y: gatePos.y,
    tileCol: 7, tileRow: 5,
  });
  // Страж Врат — один гоблин
  const g1 = room04.tilemap.tileToWorldCenter(4, 5);
  room04.addEnemy(new Goblin(g1.x, g1.y));

  // === 1-5: Перевал (мирная, выход в Казармы) ===
  const r05map = makeRoom(['west', 'east']);
  const room05 = new Room('l1_room_05', r05map, TS);
  room05.openDoors();
  room05.isCleared = true;

  // === Связи между комнатами ===
  room01.setNeighbor('east', 'l1_room_02');
  room01.addDoor('east', 'l1_room_02');

  room02.setNeighbor('west', 'l1_room_01');
  room02.addDoor('west', 'l1_room_01');
  room02.setNeighbor('east', 'l1_room_03');
  room02.addDoor('east', 'l1_room_03');

  room03.setNeighbor('west', 'l1_room_02');
  room03.addDoor('west', 'l1_room_02');
  room03.setNeighbor('east', 'l1_room_04');
  room03.addDoor('east', 'l1_room_04');

  room04.setNeighbor('west', 'l1_room_03');
  room04.addDoor('west', 'l1_room_03');
  room04.setNeighbor('east', 'l1_room_05');
  room04.addDoor('east', 'l1_room_05');

  room05.setNeighbor('west', 'l1_room_04');
  room05.addDoor('west', 'l1_room_04');
  // Восточная дверь 1-5 — переход на Уровень 2 «Казармы Тьмы»
  room05.addDoor('east', 'l2_room_01', 'west', 'level_02');

  level
    .addRoom(room01)
    .addRoom(room02)
    .addRoom(room03)
    .addRoom(room04)
    .addRoom(room05)
    .setStartRoom('l1_room_01');

  level.minimapLayout = {
    l1_room_01: { col: 0, row: 0 },
    l1_room_02: { col: 1, row: 0 },
    l1_room_03: { col: 2, row: 0 },
    l1_room_04: { col: 3, row: 0 },
    l1_room_05: { col: 4, row: 0 },
  };

  return level;
}
