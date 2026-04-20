export const MathUtils = {

  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),

  lerp: (a, b, t) => a + (b - a) * t,

  // Расстояние между двумя точками
  distance: (ax, ay, bx, by) => {
    const dx = bx - ax;
    const dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  },

  // Угол от точки A к точке B (в радианах)
  angle: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),

  // AABB пересечение
  aabbOverlap: (a, b) => {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  },

  // Случайное число в диапазоне
  random: (min, max) => min + Math.random() * (max - min),

  // Случайное целое в диапазоне [min, max)
  randomInt: (min, max) => Math.floor(min + Math.random() * (max - min)),

  // Случайный элемент массива
  randomItem: (arr) => arr[Math.floor(Math.random() * arr.length)],

  // Нормализация вектора
  normalize: (x, y) => {
    const len = Math.sqrt(x * x + y * y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
  },

  // Округление до N знаков
  round: (value, decimals = 2) => {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  },
};
