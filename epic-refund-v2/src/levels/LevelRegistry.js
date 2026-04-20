// Регистр уровней: позволяет создавать любой уровень по строковому ключу.
// Используется GameScene для межуровневых переходов.
//
// Ключи стабильны и используются в дверях комнат (Room.addDoor ... toLevelKey).

import { createLevel01 } from './Level01_RottenPeak.js';
import { createLevel02 } from './Level02_Barracks.js';

const FACTORIES = {
  level_01: createLevel01,
  level_02: createLevel02,
};

export function createLevelByKey(key, systems) {
  const factory = FACTORIES[key];
  if (!factory) throw new Error(`Unknown level key: ${key}`);
  return factory(systems);
}

export function hasLevel(key) {
  return key in FACTORIES;
}

export function getLevelKeys() {
  return Object.keys(FACTORIES);
}
