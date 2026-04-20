// Всё, что несёт Кейн, влияет на скорость и доступные маршруты.
// Тяжёлая броня ломает хрупкие мосты. Перегруз отключает прыжок.

import { BALANCE } from '../data/balance.js';

const B = BALANCE.weight;

export const WEIGHT_CATEGORY = {
  LIGHT:    'light',    // 0–30%
  MEDIUM:   'medium',   // 30–60%
  HEAVY:    'heavy',    // 60–90%
  OVERLOAD: 'overload', // 90%+
};

export class WeightSystem {
  #capacity = 100;
  #currentWeight = 0;
  #eventBus;

  constructor(eventBus) {
    this.#eventBus = eventBus;
  }

  setCapacity(capacity) {
    this.#capacity = capacity;
  }

  addWeight(amount) {
    const prev = this.getCategory();
    this.#currentWeight = Math.max(0, this.#currentWeight + amount);
    const next = this.getCategory();
    if (prev !== next) {
      this.#eventBus.emit('player:weightChange', {
        category: next,
        totalWeight: this.#currentWeight,
        pct: this.getPercent(),
      });
    }
  }

  removeWeight(amount) {
    this.addWeight(-amount);
  }

  getPercent() {
    return this.#currentWeight / this.#capacity;
  }

  getCategory() {
    const pct = this.getPercent();
    if (pct < B.lightThreshold)   return WEIGHT_CATEGORY.LIGHT;
    if (pct < B.mediumThreshold)  return WEIGHT_CATEGORY.MEDIUM;
    if (pct < B.heavyThreshold)   return WEIGHT_CATEGORY.HEAVY;
    return WEIGHT_CATEGORY.OVERLOAD;
  }

  // Модификатор скорости в зависимости от нагрузки
  getSpeedModifier() {
    switch (this.getCategory()) {
      case WEIGHT_CATEGORY.LIGHT:    return B.lightSpeedMod;
      case WEIGHT_CATEGORY.MEDIUM:   return B.mediumSpeedMod;
      case WEIGHT_CATEGORY.HEAVY:    return B.heavySpeedMod;
      case WEIGHT_CATEGORY.OVERLOAD: return B.overloadSpeedMod;
    }
  }

  canJump() {
    return !B.overloadDisablesJump || this.getCategory() !== WEIGHT_CATEGORY.OVERLOAD;
  }

  breaksBridges() {
    return B.heavyBreaksBridges && (
      this.getCategory() === WEIGHT_CATEGORY.HEAVY ||
      this.getCategory() === WEIGHT_CATEGORY.OVERLOAD
    );
  }

  get current() { return this.#currentWeight; }
  get capacity() { return this.#capacity; }
}
