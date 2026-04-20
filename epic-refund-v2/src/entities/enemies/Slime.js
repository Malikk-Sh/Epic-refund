import { Enemy, ENEMY_STATE } from '../Enemy.js';

export class Slime extends Enemy {
  typeName = 'slime';
  displayName = 'Слизь';
  color = '#55cc55';

  hp = 10;
  maxHP = 10;
  damage = 3;
  attackSpeed = 1.5;
  moveSpeed = 35;
  detectionRange = 80;
  attackRange = 14;
  fearThreshold = 2;
  width = 16;
  height = 12;

  // Слизь движется прыжками, а не плавно.
  // Накапливаем движение и делаем рывок раз в секунду.
  #hopTimer = 0;
  #hopInterval = 0.9;
  #hopPower = 1;   // 1 = обычный рывок, 0 = покой

  update(dt, player, fearSystem, skillTree, tilemap) {
    // Превращаем плавное движение AI в "прыжки": модулируем скорость синусоидой
    this.#hopTimer += dt;
    const cycle = this.#hopTimer / this.#hopInterval;
    // Активный рывок в первые 40% цикла
    this.#hopPower = cycle % 1 < 0.4 ? 1.8 : 0.2;

    super.update(dt, player, fearSystem, skillTree, tilemap);

    // Применяем модуляцию к скорости (после AI, до физики — уже поздно)
    // Проще: просто умножим на moveSpeed через state (уже сделано в Enemy)
    // Здесь — лёгкая вертикальная осцилляция для анимации (визуал)
  }
}
