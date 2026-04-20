// Центральная шина событий. Все системы общаются только через неё.
// Прямые зависимости между несвязанными модулями запрещены.

export class EventBus {
  #listeners = new Map();
  #debugMode = false;

  setDebugMode(enabled) {
    this.#debugMode = enabled;
  }

  on(event, callback) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const set = this.#listeners.get(event);
    if (set) set.delete(callback);
  }

  emit(event, data = {}) {
    if (this.#debugMode) console.log(`[EventBus] ${event}`, data);
    const set = this.#listeners.get(event);
    if (set) for (const callback of set) callback(data);
  }

  clear() { this.#listeners.clear(); }
  clearEvent(event) { this.#listeners.delete(event); }
}
