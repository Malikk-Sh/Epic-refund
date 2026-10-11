// Пиксельные персонажи без внешних ассетов: чёткие силуэты на экранах 360–900 px.
// Координаты в мировых единицах; камера уже отвечает за масштаб.
// Каждый актёр рисуется с собственной тенью, оружием и анимацией состояния.
const PALETTE = {
  gold: '#d7b56e', goldLight: '#fff0b6', steel: '#c4d0d6',
  steelDark: '#556475', shadow: '#0b1018', mantle: '#382b41',
  mantleLight: '#57415e', skin: '#cda383', blood: '#a62938',
};
function box(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
function shadow(ctx, width = 9) {
  ctx.fillStyle = 'rgba(0,0,0,.40)';
  ctx.beginPath();
  ctx.ellipse(0, 5.5, width, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}
function outline(ctx, color, x, y, w, h) {
  box(ctx, '#080d15', x - 1, y - 1, w + 2, h + 2);
  box(ctx, color, x, y, w, h);
}
function banner(ctx, color, size) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size - 1);
  ctx.lineTo(3, -size - 5);
  ctx.lineTo(-3, -size - 5);
  ctx.closePath();
  ctx.fill();
}

export function drawHeroArt(ctx, hero, x, y, zoom, time = 0) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(zoom, zoom);
  shadow(ctx, 8);
  const walking = hero.state === 'move';
  const t = walking ? Math.sin(time * 15) : Math.sin(time * 2) * .2;
  const bob = walking ? Math.round(Math.abs(t) * -1.3) : 0;
  ctx.translate(0, bob);
  const phase = hero.phase ?? 'god';
  const worn = phase === 'survivor' || phase === 'nobody';
  const trim = ({ god: '#f6d779', hero: '#d6e2eb', veteran: '#bb8657',
    survivor: '#846b58', nobody: '#655e65' })[phase] ?? PALETTE.gold;
  if (hero.isStealthed) ctx.globalAlpha = .68;
  // Сапоги с шаговым ходом, читаемые независимо от направления.
  box(ctx, '#161622', -5, 3 + t * .8, 4, 5);
  box(ctx, '#161622', 1, 3 - t * .8, 4, 5);
  box(ctx, '#787080', -5, 5 + t * .8, 4, 1);
  box(ctx, '#787080', 1, 5 - t * .8, 4, 1);
  // Мантия, воротник и плечи.
  outline(ctx, PALETTE.mantle, -7, -7, 14, 11);
  box(ctx, PALETTE.mantleLight, -6, -5, 3, 7);
  box(ctx, worn ? '#3f3949' : '#263b4d', -3, -6, 6, 9);
  box(ctx, trim, -4, -6, 8, 2);
  box(ctx, '#152029', -7, -7, 4, 5);
  box(ctx, '#152029', 3, -7, 4, 5);
  box(ctx, trim, -7, -7, 4, 1);
  box(ctx, trim, 3, -7, 4, 1);
  // Капюшон с яркой каймой и глазами (центральный фокус).
  outline(ctx, '#252431', -5, -13, 10, 8);
  box(ctx, trim, -5, -13, 10, 2);
  box(ctx, PALETTE.shadow, -4, -10, 8, 4);
  box(ctx, PALETTE.goldLight, -3, -9, 2, 1);
  box(ctx, PALETTE.goldLight, 2, -9, 2, 1);
  // Пояс, крепление клинка.
  box(ctx, '#161820', -5, 0, 10, 2);
  box(ctx, trim, -1, 0, 2, 2);
  // Силуэт клинка — разворачивается в сторону взгляда.
  const angle = Math.atan2(hero.facingY ?? 0, hero.facingX ?? 1);
  ctx.save();
  ctx.rotate(angle);
  if (hero.isInAttack) ctx.rotate(-.3 + Math.sin(time * 22) * .7);
  box(ctx, '#111b25', 4, -4, 3, 7);
  box(ctx, '#e6b05d', 6, -4, 7, 2);
  box(ctx, '#e2edf1', 12, -6, 2, 6);
  box(ctx, '#93a8bd', 13, -10, 1, 5);
  box(ctx, '#e8f3fa', 12, -12, 1, 4);
  ctx.restore();
  if (hero.isParrying || hero.abilityInvulnerable) {
    ctx.strokeStyle = hero.abilityInvulnerable ? '#fff4aa' : '#7ed7ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -2, 12, .3, 5.6); ctx.stroke();
  }
  ctx.restore();
}

export function drawEnemyArt(ctx, enemy, x, y, zoom, time = 0) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(zoom, zoom);
  const name = String(enemy.typeName ?? '').toLowerCase();
  const flash = enemy.hitFlash > 0;
  const scared = enemy.state === 'flee';
  const t = Math.sin(time * 5 + enemy.x * .031) * 1.2;
  shadow(ctx, enemy.isBoss ? 15 : 8);
  const eye = scared ? '#fff3a6' : '#ff6258';

  if (name.includes('slime')) {
    const pulse = Math.sin(time * 6 + enemy.y * .04);
    ctx.translate(0, pulse * .7);
    box(ctx, flash ? '#ffffff' : '#174a48', -8, -3, 16, 8);
    box(ctx, flash ? '#ffffff' : '#428f77', -7, -6, 14, 9);
    box(ctx, flash ? '#ffffff' : '#7bdfad', -5, -8 - pulse, 10, 4);
    box(ctx, '#122c31', -4, -3, 3, 3);
    box(ctx, '#122c31', 2, -3, 3, 3);
    box(ctx, '#bffff0', -3, -3, 1, 1);
    box(ctx, '#bffff0', 3, -3, 1, 1);
    box(ctx, '#225956', -3, 2, 6, 1);
  } else if (name.includes('skeleton')) {
    // Кости + пустые глазницы, рваный щит.
    box(ctx, '#524b4c', -6, 0, 12, 4);
    box(ctx, '#cbc3a9', -3, -2, 6, 9);
    box(ctx, '#584a4b', -2, 2, 4, 3);
    box(ctx, '#d8d0b7', -6, -10 + t * .3, 12, 9);
    box(ctx, '#2b2231', -4, -7 + t * .3, 3, 3);
    box(ctx, '#2b2231', 2, -7 + t * .3, 3, 3);
    box(ctx, eye, -3, -6 + t * .3, 1, 1);
    box(ctx, eye, 3, -6 + t * .3, 1, 1);
    box(ctx, '#eee9cf', -4, -1, 8, 2);
    box(ctx, '#797c7f', 7, -11, 2, 16);
  } else if (name.includes('goblin') || name.includes('gribl')) {
    // Уши и кривая боевая маска.
    box(ctx, '#222633', -6, -2, 12, 8);
    box(ctx, '#5b6d40', -8, -11, 16, 4);
    box(ctx, flash ? '#fff4df' : '#839e4d', -6, -12 + t * .35, 12, 11);
    box(ctx, '#c6e38b', -8, -9, 3, 4);
    box(ctx, '#c6e38b', 5, -9, 3, 4);
    box(ctx, '#251e22', -4, -8, 3, 3);
    box(ctx, '#251e22', 2, -8, 3, 3);
    box(ctx, eye, -3, -7, 1, 1);
    box(ctx, eye, 3, -7, 1, 1);
    box(ctx, '#8c322a', -3, -2, 6, 2);
    box(ctx, '#e8d6ad', 7, -5, 2, 10);
  } else if (enemy.isBoss || name.includes('homunculus')) {
    // Крупная цель: корона-рога, сердцевина, наручи и хвост плаща.
    const pulse = Math.sin(time * 3);
    box(ctx, '#250f27', -12, -9, 24, 19);
    box(ctx, '#432038', -14, -8, 28, 11);
    box(ctx, '#a65c57', -9, -13, 18, 16);
    box(ctx, '#2b172a', -7, -13, 14, 5);
    box(ctx, '#dfa179', -9, -18, 4, 7);
    box(ctx, '#dfa179', 5, -18, 4, 7);
    box(ctx, '#ffada2', -7, -8, 4, 3);
    box(ctx, '#ffada2', 3, -8, 4, 3);
    box(ctx, '#200b1b', -2, -3, 4, 4);
    box(ctx, '#ff5279', -1, -3, 2, 2 + Math.abs(pulse));
    ctx.strokeStyle = '#b94c68'; ctx.lineWidth = 1;
    ctx.strokeRect(-13, -10, 26, 16);
  } else {
    // Остальные враги, если не известен идентификатор.
    outline(ctx, flash ? '#ffffff' : (enemy.color ?? '#b16354'), -7, -10 + t * .2, 14, 15);
    box(ctx, '#281922', -4, -5, 3, 3);
    box(ctx, '#281922', 2, -5, 3, 3);
    box(ctx, '#ffdbc4', -3, -4, 1, 1);
    box(ctx, '#ffdbc4', 3, -4, 1, 1);
  }
  if (flash) {
    ctx.globalAlpha = .42;
    box(ctx, '#ffffff', -8, -11, 16, 11);
  }
  if (scared) banner(ctx, '#e6c75d', 13);
  ctx.restore();
}

export function drawNpcArt(ctx, npc, x, y, zoom, time = 0) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(zoom, zoom);
  shadow(ctx, 7);
  box(ctx, '#1b1725', -7, -6, 14, 13);
  box(ctx, '#65516b', -6, -6, 12, 10);
  box(ctx, '#a47f62', -4, -12, 8, 8);
  box(ctx, '#392b35', -5, -13, 10, 4);
  box(ctx, '#e3cfa3', -3, -8, 2, 1);
  box(ctx, '#e3cfa3', 2, -8, 2, 1);
  box(ctx, '#bb965f', -2, 0, 4, 2);
  const bob = Math.sin(time * 2) * 1.5;
  box(ctx, '#d3aa63', -2, -17 + bob, 4, 2);
  ctx.restore();
}
