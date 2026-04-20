// Уровень 2: Казармы Тьмы.
// 7 комнат, 2 Врата Забвения.
//
// Структура (в плане):
//
//   [2-1 Столовая] → [2-2] → [2-3]
//                              ↓
//                            [2-4] → [2-5 Тренировочный зал]
//                                           ↓
//                                         [2-6 Врата] → [2-7 Выход]
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
import { Gribl } from '../entities/npcs/Gribl.js';
import { GATE_REQUIREMENTS, GATE_SIZES } from '../systems/GateSystem.js';

const TS = BALANCE.tileSize;

// Типовая комната 15×10 тайлов = 360×240 логических пикселей
// Двери в центрах стен (с запасом на проход).

// === Шаблоны комнат ===

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

  // Вырезаем двери (по центру каждой стены — 1 тайл шириной)
  const cMid = Math.floor(COLS / 2);
  const rMid = Math.floor(ROWS / 2);

  if (doorDirs.includes('north')) map[0][cMid] = 3;
  if (doorDirs.includes('south')) map[ROWS - 1][cMid] = 3;
  if (doorDirs.includes('west'))  map[rMid][0] = 3;
  if (doorDirs.includes('east'))  map[rMid][COLS - 1] = 3;

  return map;
}

export function createLevel02(systems) {
  const level = new Level(2, 'Казармы Тьмы', systems);

  // === 2-1: Столовая (старт, есть Грибл) ===
  const r01map = makeRoom(['east']);
  // Несколько столов-препятствий в центре
  r01map[3][4] = 2; r01map[3][5] = 2;
  r01map[5][9] = 2; r01map[5][10] = 2;
  r01map[7][4] = 2; r01map[7][5] = 2;
  // Точка спавна игрока
  r01map[4][2] = 7;
  const room01 = new Room('room_01', r01map, TS);

  // Грибл стоит у правой стены, но не в двери
  const griblPos = room01.tilemap.tileToWorldCenter(11, 7);
  room01.addNPC(new Gribl(griblPos.x, griblPos.y, systems.skillTree));

  // В комнате нет врагов — двери сразу открыты
  room01.openDoors();
  room01.isCleared = true;

  // === 2-2: Коридор — первый слабый противник ===
  const r02map = makeRoom(['west', 'east']);
  const room02 = new Room('room_02', r02map, TS);
  // Слизь — просто стоит, боится игрока
  const s1 = room02.tilemap.tileToWorldCenter(7, 5);
  room02.addEnemy(new Slime(s1.x, s1.y));

  // === 2-3: Комната с гоблинами ===
  const r03map = makeRoom(['west', 'south']);
  // Препятствия для разнообразия
  r03map[3][7] = 2;
  r03map[6][3] = 2;
  const room03 = new Room('room_03', r03map, TS);
  const g1 = room03.tilemap.tileToWorldCenter(5, 3);
  const g2 = room03.tilemap.tileToWorldCenter(10, 6);
  room03.addEnemy(new Goblin(g1.x, g1.y));
  room03.addEnemy(new Goblin(g2.x, g2.y));

  // === 2-4: Первые Врата Забвения ===
  // Врата расположены по центру, игроку нужно пройти их чтобы попасть в 2-5
  const r04map = makeRoom(['north', 'east']);
  // Визуальный тайл Врат по центру
  r04map[5][7] = 6;
  const room04 = new Room('room_04', r04map, TS);
  const gatePos4 = room04.tilemap.tileToWorldCenter(7, 5);
  room04.setGate({
    id: 'gate_2_1',
    requirement: GATE_REQUIREMENTS.ATTACK,
    size: GATE_SIZES.MINOR,
    label: 'Врата Силы',
    sublabel: 'Пожертвуй одним навыком атаки',
    x: gatePos4.x, y: gatePos4.y,
    tileCol: 7, tileRow: 5,
  });
  // В комнате слабые враги — чтобы игрок не просто пробежал мимо
  const sl2 = room04.tilemap.tileToWorldCenter(3, 7);
  room04.addEnemy(new Slime(sl2.x, sl2.y));

  // === 2-5: Тренировочный зал — первый настоящий бой ===
  const r05map = makeRoom(['west', 'south']);
  // Тренировочные стойки
  r05map[3][4] = 2; r05map[3][10] = 2;
  r05map[6][6] = 2; r05map[6][8] = 2;
  const room05 = new Room('room_05', r05map, TS);
  const sk1 = room05.tilemap.tileToWorldCenter(5, 5);
  const sk2 = room05.tilemap.tileToWorldCenter(9, 3);
  const sk3 = room05.tilemap.tileToWorldCenter(9, 7);
  room05.addEnemy(new Skeleton(sk1.x, sk1.y));
  room05.addEnemy(new Skeleton(sk2.x, sk2.y));
  room05.addEnemy(new Skeleton(sk3.x, sk3.y));

  // === 2-6: Вторые Врата Забвения ===
  const r06map = makeRoom(['north', 'east']);
  r06map[5][7] = 6;
  const room06 = new Room('room_06', r06map, TS);
  const gatePos6 = room06.tilemap.tileToWorldCenter(7, 5);
  room06.setGate({
    id: 'gate_2_2',
    requirement: GATE_REQUIREMENTS.MOVEMENT,
    size: GATE_SIZES.MINOR,
    label: 'Врата Движения',
    sublabel: 'Пожертвуй навыком передвижения',
    x: gatePos6.x, y: gatePos6.y,
    tileCol: 7, tileRow: 5,
  });

  // === 2-7: Выход с уровня ===
  const r07map = makeRoom(['west']);
  // Яркий тайл "выход" — просто визуально, триггер делается через проверку координат
  const room07 = new Room('room_07', r07map, TS);
  // Без врагов, без Врат — мирная комната
  room07.openDoors();
  room07.isCleared = true;

  // === Связи между комнатами ===
  room01.setNeighbor('east', 'room_02');
  room01.addDoor('east', 'room_02');

  room02.setNeighbor('west', 'room_01');
  room02.addDoor('west', 'room_01');
  room02.setNeighbor('east', 'room_03');
  room02.addDoor('east', 'room_03');

  room03.setNeighbor('west', 'room_02');
  room03.addDoor('west', 'room_02');
  room03.setNeighbor('south', 'room_04');
  room03.addDoor('south', 'room_04');

  room04.setNeighbor('north', 'room_03');
  room04.addDoor('north', 'room_03');
  room04.setNeighbor('east', 'room_05');
  room04.addDoor('east', 'room_05');

  room05.setNeighbor('west', 'room_04');
  room05.addDoor('west', 'room_04');
  room05.setNeighbor('south', 'room_06');
  room05.addDoor('south', 'room_06');

  room06.setNeighbor('north', 'room_05');
  room06.addDoor('north', 'room_05');
  room06.setNeighbor('east', 'room_07');
  room06.addDoor('east', 'room_07');

  room07.setNeighbor('west', 'room_06');
  room07.addDoor('west', 'room_06');

  // Регистрируем все комнаты
  level
    .addRoom(room01)
    .addRoom(room02)
    .addRoom(room03)
    .addRoom(room04)
    .addRoom(room05)
    .addRoom(room06)
    .addRoom(room07)
    .setStartRoom('room_01');

  return level;
}
