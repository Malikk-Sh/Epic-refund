import { Enemy } from '../Enemy.js';

export class Skeleton extends Enemy {
  typeName = 'skeleton';
  displayName = 'Скелет';
  color = '#dcdcbc';

  hp = 40;
  maxHP = 40;
  damage = 12;
  attackSpeed = 1.2;
  moveSpeed = 55;
  detectionRange = 130;
  attackRange = 20;
  fearThreshold = 8;
  armor = 3;
  width = 14;
  height = 18;
}
