import { Enemy } from '../Enemy.js';

export class Goblin extends Enemy {
  typeName = 'goblin';
  displayName = 'Гоблин';
  color = '#b87834';

  hp = 25;
  maxHP = 25;
  damage = 8;
  attackSpeed = 1.0;
  moveSpeed = 75;
  detectionRange = 110;
  attackRange = 18;
  fearThreshold = 5;
  width = 14;
  height = 16;
}
