// Простой тайлмап: двумерный массив чисел.
// Каждое число — тип тайла.
//
// Слой простой: один массив, без декора. Для Milestone 1 этого достаточно.
// Позже можно добавить несколько слоёв (пол, стены, декор).

export const TILE = {
  EMPTY: 0,       // Пустота (пропасть, не ходим)
  FLOOR: 1,       // Проходимый пол
  WALL:  2,       // Стена, блокирует движение
  DOOR_CLOSED: 3, // Закрытая дверь (блокирует)
  DOOR_OPEN:   4, // Открытая дверь (не блокирует)
  // Резерв для будущего:
  FRAGILE: 5,    // Хрупкий пол (не используется в top-down)
  GATE:    6,    // Визуальный тайл под Вратами Забвения
  SPAWN:   7,    // Точка спавна игрока
};

// Проходим ли по тайлу пешком?
export function isWalkable(tileValue) {
  return tileValue === TILE.FLOOR ||
         tileValue === TILE.DOOR_OPEN ||
         tileValue === TILE.SPAWN ||
         tileValue === TILE.GATE;
}

// Блокирует ли тайл движение?
export function isBlocking(tileValue) {
  return tileValue === TILE.WALL ||
         tileValue === TILE.DOOR_CLOSED ||
         tileValue === TILE.EMPTY;
}

export class Tilemap {
  constructor(data, tileSize) {
    this.tiles = data;          // [][] массив
    this.rows = data.length;
    this.cols = data[0].length;
    this.tileSize = tileSize;
    this.width  = this.cols * tileSize;
    this.height = this.rows * tileSize;
  }

  // Получить тайл в тайловых координатах
  getTile(col, row) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return TILE.EMPTY;
    }
    return this.tiles[row][col];
  }

  // Установить тайл (для открытия дверей)
  setTile(col, row, value) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    this.tiles[row][col] = value;
  }

  // Мировые → тайловые
  worldToTile(wx, wy) {
    return {
      col: Math.floor(wx / this.tileSize),
      row: Math.floor(wy / this.tileSize),
    };
  }

  // Тайловые → мировые (центр тайла)
  tileToWorldCenter(col, row) {
    return {
      x: col * this.tileSize + this.tileSize / 2,
      y: row * this.tileSize + this.tileSize / 2,
    };
  }

  // Все двери (для регистрации в комнате)
  findTiles(value) {
    const result = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.tiles[r][c] === value) {
          result.push({ col: c, row: r });
        }
      }
    }
    return result;
  }

  // Копия массива (для undo или сохранения)
  clone() {
    const copy = this.tiles.map(row => [...row]);
    return new Tilemap(copy, this.tileSize);
  }

  // === КОЛЛИЗИИ ===

  // Проверка: пересекается ли прямоугольник с блокирующими тайлами?
  // Используется для AABB движения сущности.
  isRectBlocked(x, y, width, height) {
    const left   = Math.floor(x / this.tileSize);
    const right  = Math.floor((x + width - 0.001) / this.tileSize);
    const top    = Math.floor(y / this.tileSize);
    const bottom = Math.floor((y + height - 0.001) / this.tileSize);

    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        if (isBlocking(this.getTile(c, r))) return true;
      }
    }
    return false;
  }

  // Сдвиг сущности с разрешением коллизий по осям.
  // Возвращает реальное смещение (может быть меньше заданного при столкновении).
  //
  // Важный нюанс: двигаем по X, потом по Y — отдельно. Это стандарт для
  // сеточных коллизий и даёт корректное "скольжение" вдоль стен.
  moveEntity(entity, dx, dy) {
    const half = { w: entity.width / 2, h: entity.height / 2 };

    // X
    let newX = entity.x + dx;
    if (!this.isRectBlocked(newX - half.w, entity.y - half.h, entity.width, entity.height)) {
      entity.x = newX;
    } else if (dx !== 0) {
      // Прижимаемся к стене
      const sign = dx > 0 ? 1 : -1;
      // Находим ближайшую грань тайла, к которой можно вплотную подойти
      const tileCol = Math.floor((entity.x + sign * half.w + dx) / this.tileSize);
      if (sign > 0) {
        entity.x = tileCol * this.tileSize - half.w - 0.01;
      } else {
        entity.x = (tileCol + 1) * this.tileSize + half.w + 0.01;
      }
    }

    // Y
    let newY = entity.y + dy;
    if (!this.isRectBlocked(entity.x - half.w, newY - half.h, entity.width, entity.height)) {
      entity.y = newY;
    } else if (dy !== 0) {
      const sign = dy > 0 ? 1 : -1;
      const tileRow = Math.floor((entity.y + sign * half.h + dy) / this.tileSize);
      if (sign > 0) {
        entity.y = tileRow * this.tileSize - half.h - 0.01;
      } else {
        entity.y = (tileRow + 1) * this.tileSize + half.h + 0.01;
      }
    }
  }
}
