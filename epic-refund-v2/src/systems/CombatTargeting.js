// Контекстное наведение для смартфонов без второго стика.
// Выбираем ближайшего видимого противника, слегка предпочитая направление движения.
export function chooseCombatTarget(enemies, x, y, facingX, facingY, range, isBlocked = null) {
  let result = null;
  let best = Infinity;
  for (const enemy of enemies ?? []) {
    if (!enemy.isAlive) continue;
    const dx = enemy.x - x, dy = enemy.y - y;
    const distance = Math.hypot(dx, dy);
    if (distance > range + (enemy.width ?? 0) / 2 || distance < 0.001) continue;
    if (isBlocked && isBlocked(x, y, enemy.x, enemy.y)) continue;
    const forward = (dx * facingX + dy * facingY) / distance;
    const score = distance + (1 - forward) * range * 0.12;
    if (score < best) {
      result = enemy;
      best = score;
    }
  }
  return result;
}

// Для дальнего боя: не наводиться автоматически через стены.
// Проверяем лишь тонкую линию в мировых координатах (без дорогостоящего raycast).
export function blockedLine(tilemap, x0, y0, x1, y1) {
  if (!tilemap?.isRectBlocked) return false;
  const distance = Math.hypot(x1 - x0, y1 - y0);
  const segments = Math.ceil(distance / 12);
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    if (tilemap.isRectBlocked(x - 2, y - 2, 4, 4)) return true;
  }
  return false;
}
