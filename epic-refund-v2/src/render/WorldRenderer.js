// Рендерит игровой мир: тайлы, сущностей, эффекты атак, плейсхолдеры с подписями.
// Использует SpriteRegistry: если спрайт зарегистрирован — рисует его, иначе — плейсхолдер.

import { TILE } from '../levels/Tilemap.js';
import { drawHeroArt, drawEnemyArt, drawNpcArt } from './ActorArt.js';

// Цвета тайлов (для плейсхолдеров)
const TILE_COLORS = {
  [TILE.EMPTY]:       '#0a0806',
  [TILE.FLOOR]:       '#2a2320',
  [TILE.WALL]:        '#4a3a28',
  [TILE.DOOR_CLOSED]: '#6a4a2a',
  [TILE.DOOR_OPEN]:   '#1a1410',
  [TILE.GATE]:        '#2a1a3a',
  [TILE.FRAGILE]:     '#5a4a38',
  [TILE.SPAWN]:       '#2a2320',
};

// Вариация пола (сетка для читаемости)
const FLOOR_VAR_COLOR = '#322824';

export class WorldRenderer {
  #renderer;
  #camera;
  #spriteRegistry;

  constructor(renderer, camera, spriteRegistry) {
    this.#renderer = renderer;
    this.#camera = camera;
    this.#spriteRegistry = spriteRegistry;
  }

  // === ГЛАВНЫЙ МЕТОД ОТРИСОВКИ КОМНАТЫ ===

  drawRoom(room, player) {
    const ctx = this.#renderer.ctx;
    const cam = this.#camera;
    const tm = room.tilemap;

    // 1. Тайлмап
    this.#drawTilemap(ctx, tm, cam, room.id);

    // 2. Врата Забвения (если есть) — под сущностями
    if (room.gate) {
      this.#drawGate(ctx, room.gate, cam);
    }

    // 3. Сущности — сортируем по Y для правильного порядка отрисовки
    const entities = [...room.getAllEntities(), player].sort((a, b) => a.y - b.y);
    for (const entity of entities) {
      if (entity === player) {
        this.#drawPlayer(ctx, entity, cam);
      } else if (entity.typeName && entity.hp !== undefined) {
        this.#drawEnemy(ctx, entity, cam);
      } else {
        this.#drawNPC(ctx, entity, cam);
      }
    }

    // Маленький ненавязчивый ромб показывает, куда попадёт касание атаки.
    // Для клавиатуры / мыши автоприцел не включается.
    if (player.touchAimAssist && player.aimTarget?.isAlive) {
      const { x, y } = cam.worldToScreen(player.aimTarget.x, player.aimTarget.y);
      const r = Math.max(13, player.aimTarget.width * cam.zoom * .5 + 5);
      ctx.save();
      ctx.strokeStyle = '#e8d38b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.lineTo(x + 5, y - r + 4);
      ctx.moveTo(x + r, y); ctx.lineTo(x + r - 4, y + 5);
      ctx.moveTo(x, y + r); ctx.lineTo(x - 5, y + r - 4);
      ctx.moveTo(x - r, y); ctx.lineTo(x - r + 4, y - 5);
      ctx.stroke();
      ctx.restore();
    }
  }

  // === ТАЙЛМАП ===

  #drawTilemap(ctx, tm, cam, roomId) {
    const ts = tm.tileSize;
    // Каждая локация имеет своё окружение: гниль, укреплённый камень, катакомбы.
    const biome = roomId?.startsWith('l3') ? 'catacomb' :
      roomId?.startsWith('l2') ? 'barracks' : 'peak';
    const tint = biome === 'peak' ? {
      floor: '#283029', shade: '#222b25', wall: '#3c493d', edge: '#637466',
      debris: '#5a7653', crack: '#161e1b',
    } : biome === 'barracks' ? {
      floor: '#343039', shade: '#2b2833', wall: '#4c4553', edge: '#786c7d',
      debris: '#82726c', crack: '#231e2b',
    } : {
      floor: '#2c242e', shade: '#27202b', wall: '#463342', edge: '#735563',
      debris: '#7c5367', crack: '#1b1622',
    };

    // Определяем видимый диапазон тайлов (culling с учётом zoom)
    const startCol = Math.max(0, Math.floor(cam.x / ts));
    const endCol   = Math.min(tm.cols - 1, Math.floor((cam.x + cam.visibleWorldWidth)  / ts));
    const startRow = Math.max(0, Math.floor(cam.y / ts));
    const endRow   = Math.min(tm.rows - 1, Math.floor((cam.y + cam.visibleWorldHeight) / ts));

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const t = tm.getTile(c, r);
        const worldX = c * ts;
        const worldY = r * ts;
        const screen = cam.worldToScreen(worldX, worldY);

        // Размер тайла в экранных пикселях с учётом zoom
        const sw = ts * cam.zoom;
        const sh = ts * cam.zoom;

        const floor = t === TILE.FLOOR || t === TILE.SPAWN;
        const color = floor ? (((c + r) & 1) ? tint.floor : tint.shade) :
          (t === TILE.WALL ? tint.wall : TILE_COLORS[t] ?? '#000');
        ctx.fillStyle = color;
        ctx.fillRect(screen.x, screen.y, sw + .2, sh + .2);

        // Не-сеточный ритм материалов: деталь детерминирована координатами тайла.
        const seed = ((c * 73856093) ^ (r * 19349663)) >>> 0;
        if (floor) {
          const edge = Math.max(1, Math.round(cam.zoom));
          ctx.fillStyle = tint.crack;
          if ((seed % 6) === 0) {
            ctx.fillRect(screen.x + sw * .18, screen.y + sh * .36,
              sw * .28, edge);
            ctx.fillRect(screen.x + sw * .45, screen.y + sh * .36,
              edge, sh * .23);
          }
          if ((seed % 5) === 0) {
            ctx.fillStyle = tint.debris;
            ctx.globalAlpha = .42;
            ctx.fillRect(screen.x + sw * .73, screen.y + sh * .2,
              edge * 2, edge);
            ctx.fillRect(screen.x + sw * .58, screen.y + sh * .63,
              edge, edge);
            ctx.globalAlpha = 1;
          }
        }

        // Детализация стен
        if (t === TILE.WALL) {
          // Верхний хайлайт
          ctx.fillStyle = tint.edge;
          ctx.fillRect(screen.x, screen.y, sw, Math.max(2, cam.zoom * 2));
          // Вертикальные кладочные швы создают глубину, но не мешают навигации.
          ctx.fillStyle = tint.crack;
          ctx.fillRect(screen.x + sw * ((seed % 2) ? .32 : .72),
            screen.y + sh * .18, Math.max(1, cam.zoom), sh * .56);
          ctx.fillRect(screen.x + sw * .1, screen.y + sh * .69,
            sw * .8, Math.max(1, cam.zoom));
          ctx.fillStyle = 'rgba(6,7,12,.55)';
          ctx.fillRect(screen.x, screen.y + sh - cam.zoom * 3, sw, cam.zoom * 3);
        }

        // Детализация двери
        if (t === TILE.DOOR_CLOSED) {
          ctx.strokeStyle = '#8a6a3a';
          ctx.lineWidth = 1;
          ctx.strokeRect(screen.x + 1, screen.y + 1, sw - 2, sh - 2);
          // Ручка
          ctx.fillStyle = '#d8b868';
          ctx.fillRect(screen.x + sw / 2 - 2, screen.y + sh / 2 - 2, 4, 4);
          // Мотив стянутых металлических полос (чётко закрыт проход).
          ctx.fillStyle = '#241b23';
          ctx.fillRect(screen.x + sw * .2, screen.y + sh * .15, cam.zoom, sh * .7);
          ctx.fillRect(screen.x + sw * .8, screen.y + sh * .15, cam.zoom, sh * .7);
        }

        if (t === TILE.DOOR_OPEN) {
          // Тёмная пустота — проём
          ctx.fillStyle = '#050402';
          ctx.fillRect(screen.x + 3, screen.y, sw - 6, sh);
        }
      }
    }
  }

  // === ПЛЕЙСХОЛДЕРЫ ДЛЯ СУЩНОСТЕЙ ===

  // Общий хелпер для рисования плейсхолдера с подписью над головой
  #drawPlaceholder(ctx, entity, screenX, screenY, color, label, opts = {}) {
    const w = entity.width;
    const h = entity.height;

    // Тень под сущностью
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + h / 2 - 1, w / 2, w / 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Тело
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(screenX - w / 2), Math.round(screenY - h / 2), w, h);

    // Контур
    ctx.strokeStyle = opts.strokeColor ?? '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(screenX - w / 2) + 0.5, Math.round(screenY - h / 2) + 0.5, w - 1, h - 1);

    // Подпись над головой
    if (label) {
      const labelY = Math.round(screenY - h / 2 - 4);
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      // Обводка
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(label, screenX + 1, labelY + 1);
      // Основной текст
      ctx.fillStyle = opts.labelColor ?? '#eee';
      ctx.fillText(label, screenX, labelY);
    }

    // Индикатор направления (маленькая метка куда смотрит)
    if (opts.facingX !== undefined || opts.facingY !== undefined) {
      const fx = opts.facingX ?? 0;
      const fy = opts.facingY ?? 0;
      const d = Math.sqrt(fx * fx + fy * fy) || 1;
      const tx = screenX + (fx / d) * (w / 2 + 2);
      const ty = screenY + (fy / d) * (h / 2 + 2);
      ctx.fillStyle = opts.facingColor ?? '#fff';
      ctx.fillRect(Math.round(tx - 1), Math.round(ty - 1), 2, 2);
    }
  }

  // === ИГРОК ===

  #drawPlayer(ctx, player, cam) {
    const screen = cam.worldToScreen(player.x, player.y);

    // Мигание при неуязвимости
    const visible = player.isInvulnerable ?
      (Math.floor(player.iFrameTimer * 30) % 2 === 0) : true;

    if (!visible) return;

    // Цвет зависит от фазы
    const phaseColors = {
      god:      '#FFD700',
      hero:     '#C0C0C0',
      veteran:  '#CD7F32',
      survivor: '#8B5A2B',
      nobody:   '#555555',
    };
    const color = phaseColors[player.phase] ?? '#ddd';

    // Пытаемся спрайт
    if (this.#spriteRegistry.has('player')) {
      this.#spriteRegistry.draw(ctx, 'player', screen.x, screen.y, {
        flipX: player.facingX < 0,
      });
    } else {
      drawHeroArt(ctx, player, screen.x, screen.y, cam.zoom, performance.now() / 1000);
    }

    // Если атакует — визуализируем дугу атаки
    if (player.isInAttack) {
      this.#drawAttackArc(ctx, player, cam);
    }

    // Если парирует — золотистый круг вокруг
    if (player.isParrying) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  #drawAttackArc(ctx, player, cam) {
    const screen = cam.worldToScreen(player.x, player.y);
    const angle = Math.atan2(player.facingY, player.facingX);
    // Лёгкая белая "вспышка" в направлении атаки
    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(255, 255, 220, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 20, -0.7, 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // === ВРАГИ ===

  #drawEnemy(ctx, enemy, cam) {
    if (!enemy.isAlive) return;

    const screen = cam.worldToScreen(enemy.x, enemy.y);

    // Красная подсветка при получении урона
    let color = enemy.color;
    if (enemy.hitFlash > 0) {
      color = '#ff6666';
    }

    // Состояние "напуган" — желтоватый оттенок
    if (enemy.state === 'flee') {
      color = this.#mixColor(color, '#ffff66', 0.5);
    }

    if (this.#spriteRegistry.has(enemy.typeName)) {
      this.#spriteRegistry.draw(ctx, enemy.typeName, screen.x, screen.y, {
        flipX: enemy.facingX < 0,
        tint: enemy.hitFlash > 0 ? 'rgba(255,100,100,0.6)' : null,
      });
    } else {
      drawEnemyArt(ctx, enemy, screen.x, screen.y, cam.zoom, performance.now() / 1000);
    }

    // HP-бар (если HP < max)
    if (enemy.hp < enemy.maxHP) {
      this.#drawHPBar(ctx, enemy, screen);
    }
  }

  #drawHPBar(ctx, enemy, screen) {
    const barW = enemy.isBoss ? 48 : 27;
    const barH = enemy.isBoss ? 4 : 3;
    const x = Math.round(screen.x - barW / 2);
    const y = Math.round(screen.y - (enemy.isBoss ? 48 : 32));

    ctx.fillStyle = '#000';
    ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#440000';
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(x, y, Math.round(barW * (enemy.hp / enemy.maxHP)), barH);
  }

  // === NPC ===

  #drawNPC(ctx, npc, cam) {
    const screen = cam.worldToScreen(npc.x, npc.y);

    if (this.#spriteRegistry.has(npc.typeName)) {
      this.#spriteRegistry.draw(ctx, npc.typeName, screen.x, screen.y);
    } else {
      drawNpcArt(ctx, npc, screen.x, screen.y, cam.zoom, performance.now() / 1000);
    }

    // Подсказка взаимодействия
    if (npc.isPlayerNear() && !npc.isDialogueActive) {
      const hintY = Math.round(screen.y - npc.height / 2 - 14);
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 300);
      ctx.globalAlpha = pulse;
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFCC44';
      ctx.fillText('[E]', screen.x, hintY);
      ctx.globalAlpha = 1;
    }
  }

  // === ВРАТА ===

  #drawGate(ctx, gate, cam) {
    const screen = cam.worldToScreen(gate.x, gate.y);
    const ts = 24 * cam.zoom;  // visual: world tile scaled to screen

    // Фиолетовое свечение
    const grad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, ts);
    grad.addColorStop(0, 'rgba(139, 0, 255, 0.4)');
    grad.addColorStop(1, 'rgba(139, 0, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(screen.x - ts, screen.y - ts, ts * 2, ts * 2);

    // Арка
    ctx.fillStyle = '#1a0033';
    ctx.fillRect(screen.x - 10, screen.y - 14, 20, 20);

    // Руны (пульсируют)
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 400);
    ctx.fillStyle = `rgba(200, 120, 255, ${pulse})`;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(screen.x - 4 + i * 4, screen.y - 4, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Подпись над вратами
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillText(gate.label, screen.x + 1, screen.y - 18 + 1);
    ctx.fillStyle = '#cc88ff';
    ctx.fillText(gate.label, screen.x, screen.y - 18);
  }

  // === УТИЛИТЫ ===

  #mixColor(hex1, hex2, t) {
    const c1 = this.#hexToRgb(hex1);
    const c2 = this.#hexToRgb(hex2);
    const r = Math.round(c1.r * (1 - t) + c2.r * t);
    const g = Math.round(c1.g * (1 - t) + c2.g * t);
    const b = Math.round(c1.b * (1 - t) + c2.b * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  #hexToRgb(hex) {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  }
}
