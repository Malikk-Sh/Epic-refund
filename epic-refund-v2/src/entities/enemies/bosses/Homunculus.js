// Гомункул — первый босс. Страж на стыке Гнилого Пика и Казарм Тьмы.
// Алхимическое создание, знает историю Кейна.
//
// Три фазы:
//  1) «Равнодушный» (100%–66%): медленный, редкие атаки — прощупывает
//  2) «Внимательный» (66%–33%): ускоряется, удары чаще
//  3) «Распад»       (33%–0%):  агрессия, повышенный урон, меньше брони

import { Boss } from './Boss.js';

export class Homunculus extends Boss {
  typeName = 'homunculus';
  displayName = 'Гомункул';
  color = '#8a4a8a';

  hp = 120;
  maxHP = 120;
  damage = 8;
  attackSpeed = 2.0;
  moveSpeed = 45;
  detectionRange = 160;
  attackRange = 24;
  fearThreshold = 99;   // Босс не боится игрока никогда
  armor = 2;
  width = 22;
  height = 24;

  phases = [
    { hpThreshold: 1.0,  name: 'Равнодушный', moveSpeed: 45, damage: 8,  attackSpeed: 2.0, armor: 2 },
    { hpThreshold: 0.66, name: 'Внимательный', moveSpeed: 65, damage: 10, attackSpeed: 1.4, armor: 2 },
    { hpThreshold: 0.33, name: 'Распад',       moveSpeed: 85, damage: 14, attackSpeed: 1.0, armor: 0 },
  ];
}
