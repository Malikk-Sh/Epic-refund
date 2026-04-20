// Уровень = набор связанных комнат. Управляет активной комнатой и переходами между ними.

export class Level {
  levelNumber;
  name;
  rooms = new Map();       // roomId → Room
  currentRoomId = null;

  // { roomId: { col, row } } — раскладка для мини-карты в HUD.
  // Null = мини-карта не рисуется.
  minimapLayout = null;

  #eventBus;
  #skillTree;
  #fearSystem;

  constructor(levelNumber, name, systems) {
    this.levelNumber = levelNumber;
    this.name = name;
    this.#eventBus = systems.eventBus;
    this.#skillTree = systems.skillTree;
    this.#fearSystem = systems.fearSystem;
  }

  addRoom(room) {
    this.rooms.set(room.id, room);
    return this;
  }

  setStartRoom(roomId) {
    this.currentRoomId = roomId;
    return this;
  }

  get currentRoom() {
    return this.rooms.get(this.currentRoomId);
  }

  // === ОБНОВЛЕНИЕ ===

  update(dt, player) {
    const room = this.currentRoom;
    if (!room) return;

    room.update(dt, player, this.#fearSystem, this.#skillTree, this.#eventBus);
  }

  // Проверяет: игрок переходит в соседнюю комнату?
  // Возвращает объект перехода или null.
  checkRoomTransition(player) {
    const room = this.currentRoom;
    if (!room) return null;

    const door = room.checkDoorTrigger(player);
    if (!door) return null;
    if (!this.rooms.has(door.toRoomId)) return null;

    return door;
  }

  // Переход в другую комнату
  transitionToRoom(toRoomId, fromDirection, player) {
    const newRoom = this.rooms.get(toRoomId);
    if (!newRoom) return false;

    this.currentRoomId = toRoomId;

    // Ставим игрока на точку спавна
    const spawn = newRoom.getSpawnPosition(fromDirection);
    player.x = spawn.x;
    player.y = spawn.y;

    newRoom.onPlayerEnter(player, fromDirection, this.#eventBus);
    return true;
  }

  // Размеры текущей комнаты — для камеры
  getCurrentRoomBounds() {
    const room = this.currentRoom;
    if (!room) return { minX: 0, minY: 0, maxX: 480, maxY: 270 };
    return {
      minX: 0,
      minY: 0,
      maxX: room.tilemap.width,
      maxY: room.tilemap.height,
    };
  }
}
