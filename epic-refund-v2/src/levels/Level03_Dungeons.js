// Уровень 3: Подземелья.
// 8 комнат, 2 Врата Забвения (3 навыка суммарно: 18 → 15).
//
// Структура (в плане):
//
//   [3-1 Вход] → [3-2 Склеп] → [3-3 Врата Силы]
//                                      ↓
//                   [3-5 Арсенал] ← [3-4 Катакомбы]
//                         ↓
//   [3-7 Врата Выбора] ← [3-6 Глубины]
//         ↓
//   [3-8 Выход]
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
import { Skeleton } from '../entities/enemies/Skeleton.js';
import { GATE_REQUIREMENTS, GATE_SIZES } from '../systems/GateSystem.js';

const TS = BALANCE.tileSize;

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

export function createLevel03(systems) {
  const level = new Level(3, 'Подземелья', systems);

  // === 3-1: Вход в подземелья ===
  const r01map = makeRoom(['east']);
  r01map[4][2] = 7;           // спавн игрока
  r01map[3][6] = 2;           // камень
  r01map[6][9] = 2;           // камень
  const room01 = new Room('l3_room_01', r01map, TS);
  const g01 = room01.tilemap.tileToWorldCenter(9, 4);
  const s01 = room01.tilemap.tileToWorldCenter(5, 7);
  room01.addEnemy(new Goblin(g01.x, g01.y));
  room01.addEnemy(new Slime(s01.x, s01.y));

  // === 3-2: Склеп с гробами ===
  const r02map = makeRoom(['west', 'east']);
  // Ряды гробовых блоков
  r02map[2][4] = 2; r02map[2][5] = 2;
  r02map[2][9] = 2; r02map[2][10] = 2;
  r02map[7][4] = 2; r02map[7][5] = 2;
  r02map[7][9] = 2; r02map[7][10] = 2;
  const room02 = new Room('l3_room_02', r02map, TS);
  const g02a = room02.tilemap.tileToWorldCenter(4, 5);
  const g02b = room02.tilemap.tileToWorldCenter(10, 5);
  room02.addEnemy(new Goblin(g02a.x, g02a.y));
  room02.addEnemy(new Goblin(g02b.x, g02b.y));

  // === 3-3: Врата Силы (ATTACK, MINOR) ===
  const r03map = makeRoom(['west', 'south']);
  r03map[4][8] = 6;           // визуал Врат
  const room03 = new Room('l3_room_03', r03map, TS);
  const gatePos03 = room03.tilemap.tileToWorldCenter(8, 4);
  room03.setGate({
    id: 'gate_3_1',
    requirement: GATE_REQUIREMENTS.ATTACK,
    size: GATE_SIZES.MINOR,
    label: 'Врата Силы',
    sublabel: 'Пожертвуй навыком атаки',
    x: gatePos03.x, y: gatePos03.y,
    tileCol: 8, tileRow: 4,
  });
  const sk03 = room03.tilemap.tileToWorldCenter(3, 5);
  room03.addEnemy(new Skeleton(sk03.x, sk03.y));

  // === 3-4: Катакомбы — колоннада ===
  const r04map = makeRoom(['north', 'west']);
  // Четыре пилона создают сужение
  r04map[3][4] = 2; r04map[3][10] = 2;
  r04map[6][4] = 2; r04map[6][10] = 2;
  const room04 = new Room('l3_room_04', r04map, TS);
  const g04a = room04.tilemap.tileToWorldCenter(7, 3);
  const g04b = room04.tilemap.tileToWorldCenter(7, 7);
  const sk04 = room04.tilemap.tileToWorldCenter(11, 5);
  room04.addEnemy(new Goblin(g04a.x, g04a.y));
  room04.addEnemy(new Goblin(g04b.x, g04b.y));
  room04.addEnemy(new Skeleton(sk04.x, sk04.y));

  // === 3-5: Арсенал — тяжёлый бой ===
  const r05map = makeRoom(['east', 'south']);
  // Оружейные стойки у стен
  r05map[2][3] = 2; r05map[2][4] = 2;
  r05map[2][10] = 2; r05map[2][11] = 2;
  r05map[7][3] = 2; r05map[7][4] = 2;
  r05map[7][10] = 2; r05map[7][11] = 2;
  const room05 = new Room('l3_room_05', r05map, TS);
  const sk05a = room05.tilemap.tileToWorldCenter(5, 5);
  const sk05b = room05.tilemap.tileToWorldCenter(9, 3);
  const sk05c = room05.tilemap.tileToWorldCenter(9, 7);
  room05.addEnemy(new Skeleton(sk05a.x, sk05a.y));
  room05.addEnemy(new Skeleton(sk05b.x, sk05b.y));
  room05.addEnemy(new Skeleton(sk05c.x, sk05c.y));

  // === 3-6: Глубины — самый тяжёлый бой ===
  const r06map = makeRoom(['north', 'west']);
  r06map[2][5] = 2; r06map[2][6] = 2;
  r06map[7][5] = 2; r06map[7][6] = 2;
  r06map[4][3] = 2;
  r06map[5][11] = 2;
  const room06 = new Room('l3_room_06', r06map, TS);
  const g06a = room06.tilemap.tileToWorldCenter(3, 7);
  const g06b = room06.tilemap.tileToWorldCenter(11, 3);
  const sk06a = room06.tilemap.tileToWorldCenter(8, 3);
  const sk06b = room06.tilemap.tileToWorldCenter(8, 7);
  room06.addEnemy(new Goblin(g06a.x, g06a.y));
  room06.addEnemy(new Goblin(g06b.x, g06b.y));
  room06.addEnemy(new Skeleton(sk06a.x, sk06a.y));
  room06.addEnemy(new Skeleton(sk06b.x, sk06b.y));

  // === 3-7: Врата Выбора (CHOICE, MAJOR — 2 навыка) ===
  const r07map = makeRoom(['east', 'south']);
  r07map[4][7] = 6;           // визуал Врат
  const room07 = new Room('l3_room_07', r07map, TS);
  const gatePos07 = room07.tilemap.tileToWorldCenter(7, 4);
  room07.setGate({
    id: 'gate_3_2',
    requirement: GATE_REQUIREMENTS.CHOICE,
    size: GATE_SIZES.MAJOR,
    label: 'Врата Выбора',
    sublabel: 'Пожертвуй двумя любыми навыками',
    x: gatePos07.x, y: gatePos07.y,
    tileCol: 7, tileRow: 4,
  });
  const sk07 = room07.tilemap.tileToWorldCenter(3, 5);
  room07.addEnemy(new Skeleton(sk07.x, sk07.y));

  // === 3-8: Выход (мирная) ===
  const r08map = makeRoom(['north']);
  const room08 = new Room('l3_room_08', r08map, TS);

  // === Связи между комнатами ===
  room01.setNeighbor('east', 'l3_room_02');
  room01.addDoor('east', 'l3_room_02');

  room02.setNeighbor('west', 'l3_room_01');
  room02.addDoor('west', 'l3_room_01');
  room02.setNeighbor('east', 'l3_room_03');
  room02.addDoor('east', 'l3_room_03');

  room03.setNeighbor('west', 'l3_room_02');
  room03.addDoor('west', 'l3_room_02');
  room03.setNeighbor('south', 'l3_room_04');
  room03.addDoor('south', 'l3_room_04');

  room04.setNeighbor('north', 'l3_room_03');
  room04.addDoor('north', 'l3_room_03');
  room04.setNeighbor('west', 'l3_room_05');
  room04.addDoor('west', 'l3_room_05');

  room05.setNeighbor('east', 'l3_room_04');
  room05.addDoor('east', 'l3_room_04');
  room05.setNeighbor('south', 'l3_room_06');
  room05.addDoor('south', 'l3_room_06');

  room06.setNeighbor('north', 'l3_room_05');
  room06.addDoor('north', 'l3_room_05');
  room06.setNeighbor('west', 'l3_room_07');
  room06.addDoor('west', 'l3_room_07');

  room07.setNeighbor('east', 'l3_room_06');
  room07.addDoor('east', 'l3_room_06');
  room07.setNeighbor('south', 'l3_room_08');
  room07.addDoor('south', 'l3_room_08');

  room08.setNeighbor('north', 'l3_room_07');
  room08.addDoor('north', 'l3_room_07');

  // Открываем мирные комнаты после регистрации всех дверей
  room01.openDoors(); room01.isCleared = true;
  room08.openDoors(); room08.isCleared = true;

  level
    .addRoom(room01)
    .addRoom(room02)
    .addRoom(room03)
    .addRoom(room04)
    .addRoom(room05)
    .addRoom(room06)
    .addRoom(room07)
    .addRoom(room08)
    .setStartRoom('l3_room_01');

  level.minimapLayout = {
    l3_room_01: { col: 0, row: 0 },
    l3_room_02: { col: 1, row: 0 },
    l3_room_03: { col: 2, row: 0 },
    l3_room_04: { col: 2, row: 1 },
    l3_room_05: { col: 1, row: 1 },
    l3_room_06: { col: 1, row: 2 },
    l3_room_07: { col: 0, row: 2 },
    l3_room_08: { col: 0, row: 3 },
  };

  return level;
}
