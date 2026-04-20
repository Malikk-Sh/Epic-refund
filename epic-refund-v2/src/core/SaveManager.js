// Сохранения через localStorage. При изменении структуры — увеличивай SAVE_VERSION.

const SAVE_VERSION = '0.2.0';
const SAVE_KEY_PREFIX = 'epic_refund_save_';
const AUTO_SAVE_SLOT = 'auto';

export class SaveManager {
  #currentSave = null;

  createNewSave() {
    return {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      currentLevel: 2,
      currentRoom: 'room_01',
      skillTree: {},
      player: {
        maxHP: 100,
        currentHP: 100,
        maxMana: 100,
        currentMana: 100,
        maxStamina: 100,
        currentStamina: 100,
      },
      world: {
        visitedRooms: [],
        defeatedEnemies: {},
        opendGates: [],
      },
      meta: {
        totalPlayTime: 0,
        deathCount: 0,
      },
    };
  }

  save(slot, data) {
    try {
      const saveData = { ...data, timestamp: Date.now() };
      localStorage.setItem(SAVE_KEY_PREFIX + slot, JSON.stringify(saveData));
      this.#currentSave = saveData;
      return true;
    } catch (e) {
      console.error('[SaveManager] Ошибка сохранения:', e);
      return false;
    }
  }

  autoSave(data) { return this.save(AUTO_SAVE_SLOT, data); }

  load(slot) {
    try {
      const raw = localStorage.getItem(SAVE_KEY_PREFIX + slot);
      if (!raw) return null;
      const data = JSON.parse(raw);
      this.#currentSave = this.#migrate(data);
      return this.#currentSave;
    } catch (e) {
      console.error('[SaveManager] Ошибка загрузки:', e);
      return null;
    }
  }

  loadAuto() { return this.load(AUTO_SAVE_SLOT); }
  hasSave(slot) { return localStorage.getItem(SAVE_KEY_PREFIX + slot) !== null; }
  deleteSave(slot) { localStorage.removeItem(SAVE_KEY_PREFIX + slot); }
  getCurrentSave() { return this.#currentSave; }

  #migrate(data) {
    if (data.version === SAVE_VERSION) return data;
    console.warn(`[SaveManager] Миграция ${data.version} → ${SAVE_VERSION}`);
    data.version = SAVE_VERSION;
    return data;
  }
}
