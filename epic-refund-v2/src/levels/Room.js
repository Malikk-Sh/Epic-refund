// Одна игровая комната в стиле Soul Knight.
// Комната имеет:
// - тайлмап (стены, пол, двери)
// - набор врагов (пока живы — двери закрыты)
// - набор NPC
// - опционально: Врата Забвения
// - соседей (direction → roomId)
//
// При очистке (все враги мертвы) — эмитит 'room:cleared', двери открываются.
// При входе — эмитит 'room:enter'.

import { Tilemap, TILE } from './Tilemap.js';

export class Room {
  id;
  tilemap;
  enemies = [];
  npcs = [];
  gate = null;              // { id, requirement, size, tileCol, tileRow, sublabel, label } | null
  neighbors = {};           // { north, south, east, west } → roomId

  // Точки перехода: когда игрок встаёт на тайл двери — переходим
  doors = [];               // [{ tileCol, tileRow, direction, toRoomId, targetSpawnDir }]

  isCleared = false;        // Все враги побеждены?
  isVisited = false;        // Игрок был здесь хоть раз (туман войны)
  isGateOpen = false;       // Врата пройдены?

  // Спавн для входа с каждого направления
  spawnPoints = {};         // { north: {x,y}, south, east, west, default }

  constructor(id, tilemapData, tileSize) {
    this.id = id;
    this.tilemap = new Tilemap(tilemapData, tileSize);

    // Находим точки спавна по TILE.SPAWN — в базовой версии одна точка
    const spawns = this.tilemap.findTiles(TILE.SPAWN);
    if (spawns.length > 0) {
      const s = spawns[0];
      const pos = this.tilemap.tileToWorldCenter(s.col, s.row);
      this.spawnPoints.default = pos;
      // Конвертируем SPAWN → FLOOR, чтобы потом можно было ходить
      this.tilemap.setTile(s.col, s.row, TILE.FLOOR);
    }
  }

  // === КОНСТРУИРОВАНИЕ (fluent API) ===

  setNeighbor(direction, roomId) {
    this.neighbors[direction] = roomId;
    return this;
  }

  // Регистрирует дверь как точку перехода.
  // direction — с какой стороны эта дверь (север/юг/восток/запад).
  addDoor(direction, toRoomId, targetSpawnDir = null) {
    // Находим все тайлы DOOR_CLOSED и определяем, какие относятся к этой стороне
    // Для простоты: ищем ближайший к центру соответствующей стены
    const doorTiles = this.tilemap.findTiles(TILE.DOOR_CLOSED);
    if (doorTiles.length === 0) return this;

    // Определяем сторону тайла: north = top row, south = bottom row и т.д.
    const matchesSide = (t, dir) => {
      if (dir === 'north') return t.row <= 1;
      if (dir === 'south') return t.row >= this.tilemap.rows - 2;
      if (dir === 'west')  return t.col <= 1;
      if (dir === 'east')  return t.col >= this.tilemap.cols - 2;
      return false;
    };

    const tiles = doorTiles.filter(t => matchesSide(t, direction));
    for (const t of tiles) {
      this.doors.push({
        tileCol: t.col,
        tileRow: t.row,
        direction,
        toRoomId,
        targetSpawnDir: targetSpawnDir ?? this.#opposite(direction),
      });
    }
    return this;
  }

  #opposite(dir) {
    return { north: 'south', south: 'north', east: 'west', west: 'east' }[dir];
  }

  addEnemy(enemy) {
    this.enemies.push(enemy);
    return this;
  }

  addNPC(npc) {
    this.npcs.push(npc);
    return this;
  }

  setGate(gateData) {
    this.gate = gateData;
    return this;
  }

  // === ОБНОВЛЕНИЕ ===

  update(dt, player, fearSystem, skillTree, eventBus) {
    // Враги
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;
      enemy.update(dt, player, fearSystem, skillTree, this.tilemap);
    }

    // NPC
    for (const npc of this.npcs) {
      npc.update(dt, player);
    }

    // Проверяем очистку комнаты
    if (!this.isCleared) {
      const anyAlive = this.enemies.some(e => e.isAlive);
      if (!anyAlive && this.enemies.length > 0) {
        this.#clearRoom(eventBus);
      } else if (this.enemies.length === 0 && !this.isCleared) {
        // Комната без врагов — сразу очищена
        this.isCleared = true;
        this.#openAllDoors();
      }
    }
  }

  #clearRoom(eventBus) {
    this.isCleared = true;
    this.#openAllDoors();
    eventBus.emit('room:cleared', { roomId: this.id });
  }

  #openAllDoors() {
    for (const door of this.doors) {
      this.tilemap.setTile(door.tileCol, door.tileRow, TILE.DOOR_OPEN);
    }
  }

  // Принудительное открытие (напр. если в комнате нет врагов сразу)
  openDoors() {
    this.#openAllDoors();
  }

  // Закрытие при входе (для боевых комнат)
  closeDoors() {
    for (const door of this.doors) {
      this.tilemap.setTile(door.tileCol, door.tileRow, TILE.DOOR_CLOSED);
    }
  }

  // === ПЕРЕХОДЫ ===

  // Проверяет: игрок стоит на двери? Если да — возвращает дверь.
  checkDoorTrigger(player) {
    if (!this.isCleared) return null;  // Нельзя выйти пока не зачищено

    const tile = this.tilemap.worldToTile(player.x, player.y);
    for (const door of this.doors) {
      if (door.tileCol === tile.col && door.tileRow === tile.row) {
        return door;
      }
    }
    return null;
  }

  // Спавн-позиция при входе с конкретной стороны
  getSpawnPosition(fromDirection = null) {
    if (fromDirection && this.spawnPoints[fromDirection]) {
      return this.spawnPoints[fromDirection];
    }
    if (this.spawnPoints.default) return this.spawnPoints.default;

    // Фоллбэк: ставим напротив двери, через которую вошли
    // (ищем дверь на стороне fromDirection — это точка входа)
    if (fromDirection) {
      const door = this.doors.find(d => d.direction === fromDirection);
      if (door) {
        // Отступаем на один тайл ВНУТРЬ комнаты от двери
        let col = door.tileCol;
        let row = door.tileRow;
        if (fromDirection === 'north') row = 2;
        if (fromDirection === 'south') row = this.tilemap.rows - 3;
        if (fromDirection === 'west')  col = 2;
        if (fromDirection === 'east')  col = this.tilemap.cols - 3;
        return this.tilemap.tileToWorldCenter(col, row);
      }
    }

    // Совсем фоллбэк — центр комнаты
    return this.tilemap.tileToWorldCenter(
      Math.floor(this.tilemap.cols / 2),
      Math.floor(this.tilemap.rows / 2)
    );
  }

  // Вызывается сценой при входе игрока
  onPlayerEnter(player, fromDirection, eventBus) {
    const wasVisited = this.isVisited;
    this.isVisited = true;

    // Закрываем двери если в комнате живые враги
    const hasEnemies = this.enemies.some(e => e.isAlive);
    if (hasEnemies && !this.isCleared) {
      this.closeDoors();
    }

    eventBus.emit('room:enter', {
      roomId: this.id,
      firstVisit: !wasVisited,
      fromDirection,
    });

    player.onRoomEnter();
  }

  // Ссылки на сущности для рендера
  getAllEntities() {
    return [...this.enemies, ...this.npcs];
  }
}
