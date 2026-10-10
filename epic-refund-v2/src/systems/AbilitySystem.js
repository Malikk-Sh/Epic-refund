// Реальные активные способности (клавиатура U/I/O/P и сенсорные кнопки 1/2/3/★).
// Все таймеры обновляются игровым dt: пауза и смена комнат не порождают setTimeout.
import { SKILLS } from '../data/skills.js';
import { BALANCE } from '../data/balance.js';

const A = BALANCE.abilities;
const ACTION_BY_SKILL = {
  str_t3: 'skill1',
  mag_t2: 'skill2',
  agi_t3: 'skill3',
  str_t4: 'skill4',
  mag_t4: 'skill4',
  def_t4: 'skill4',
  agi_t4: 'skill4',
  aur_t4: 'skill4',
};
const ULTIMAS = ['str_t4', 'mag_t4', 'def_t4', 'agi_t4', 'aur_t4'];

export class AbilitySystem {
  #player;
  #skills;
  #events;
  #getRoom;
  #camera;
  #cooldowns = new Map();
  #effects = [];
  #projectiles = [];
  #burning = new Map();
  #unsubs = [];
  #uiTimer = 0;
  #stealth = false;

  constructor({ player, skillTree, eventBus, getRoom, camera }) {
    this.#player = player;
    this.#skills = skillTree;
    this.#events = eventBus;
    this.#getRoom = getRoom;
    this.#camera = camera;
    this.#unsubs.push(eventBus.on('player:skillUsed', data => this.use(data.skillId)));
    this.#unsubs.push(eventBus.on('player:attack', attack => {
      if (this.#stealth) {
        attack.damage *= SKILLS.agi_t3.effects.backstabMultiplier;
        this.#stopStealth();
        this.#events.emit('ability:cast', { skillId: 'agi_t3', kind: 'backstab' });
      }
    }));
    this.#unsubs.push(eventBus.on('skill:lost', () => this.#validateStates()));
    this.#unsubs.push(eventBus.on('skill:restored', () => this.#validateStates()));
    this.#announceState();
  }

  #notify(kind, skillId, extra = {}) {
    this.#events.emit('ability:' + kind, { skillId, ...extra });
  }

  #validateStates() {
    if (!this.#skills.isActive('agi_t3')) this.#stopStealth();
    if (!this.#skills.isActive('str_t3')) this.#effects = this.#effects.filter(e => e.skillId !== 'str_t3');
    if (!this.#skills.isActive('mag_t2')) this.#projectiles.length = 0;
    for (const [id] of this.#cooldowns) {
      if (!this.#skills.isActive(id)) this.#cooldowns.delete(id);
    }
    this.#announceState();
  }

  #announceState() {
    const ultimate = ULTIMAS.find(id => this.#skills.isActive(id));
    const slots = [
      { action: 'skill1', id: 'str_t3' },
      { action: 'skill2', id: 'mag_t2' },
      { action: 'skill3', id: 'agi_t3' },
      { action: 'skill4', id: ultimate ?? null },
    ];
    this.#events.emit('ability:status', { slots: slots.map(({ action, id }) => ({
      action, skillId: id, available: id ? this.#skills.isActive(id) : false,
      cooldown: id ? Math.max(0, this.#cooldowns.get(id) ?? 0) : 0,
      active: id === 'agi_t3' && this.#stealth,
    })) });
  }

  use(skillId) {
    if (!this.#player.isAlive || !this.#skills.isActive(skillId)) return false;
    const skill = SKILLS[skillId];
    if (!skill || !ACTION_BY_SKILL[skillId]) return false;
    if (this.#cooldowns.get(skillId) > 0) {
      this.#notify('blocked', skillId, { reason: 'cooldown' });
      return false;
    }
    if (skillId === 'agi_t3' && this.#stealth) {
      this.#stopStealth();
      this.#announceState();
      return true;
    }
    const staminaCost = skill.staminaCost ?? 0;
    const manaCost = skill.manaCost ?? 0;
    if (this.#player.stamina < staminaCost || this.#player.mana < manaCost) {
      this.#notify('blocked', skillId, { reason: 'resource' });
      return false;
    }

    const room = this.#getRoom();
    if (!room) return false;

    let succeeded = true;
    const player = this.#player;
    if (skillId === 'str_t3') {
      this.#effects.push({ skillId, kind: 'vortex', duration: skill.effects.duration,
        remaining: skill.effects.duration, tick: 0 });
    } else if (skillId === 'mag_t2') {
      const dx = player.facingX, dy = player.facingY;
      this.#projectiles.push({ x: player.x + dx * A.projectileSpawnOffset,
        y: player.y + dy * A.projectileSpawnOffset, dx, dy,
        distance: 0, speed: skill.effects.projectileSpeed, skillId });
    } else if (skillId === 'agi_t3') {
      this.#stealth = true;
      player.isStealthed = true;
    } else if (skillId === 'str_t4') {
      this.#effects.push({ skillId, kind: 'dance', duration: skill.effects.duration,
        remaining: skill.effects.duration, tick: 0 });
      player.abilityInvulnerable = true;
    } else if (skillId === 'mag_t4') {
      this.#effects.push({ skillId, kind: 'meteors', duration: skill.effects.totalDuration,
        remaining: skill.effects.totalDuration, tick: 0, count: 0 });
    } else if (skillId === 'def_t4') {
      this.#effects.push({ skillId, kind: 'invulnerable', duration: skill.effects.duration,
        remaining: skill.effects.duration, tick: 0 });
      player.abilityInvulnerable = true;
    } else if (skillId === 'agi_t4') {
      succeeded = this.#teleport(room, skill.effects);
    } else if (skillId === 'aur_t4') {
      this.#effects.push({ skillId, kind: 'annihilate', duration: skill.effects.duration,
        remaining: skill.effects.duration, tick: 0 });
    }
    if (!succeeded) {
      this.#notify('blocked', skillId, { reason: 'space' });
      return false;
    }
    player.stamina -= staminaCost;
    player.mana -= manaCost;
    if (skill.cooldown) this.#cooldowns.set(skillId, skill.cooldown);
    this.#notify('cast', skillId, { kind: skillId });
    this.#announceState();
    return true;
  }

  #stopStealth() {
    this.#stealth = false;
    this.#player.isStealthed = false;
  }

  #teleport(room, effects) {
    const { facingX: dx, facingY: dy } = this.#player;
    const { x: startX, y: startY } = this.#player;
    // Срезать дистанцию в конце, пока точка назначения не станет проходимой.
    // Препятствия по пути можно пересекать, но внутри стен телепорт не заканчивается.
    let destination = null;
    for (let distance = effects.teleportRange; distance >= A.teleportMinDistance; distance -= A.teleportStep) {
      const x = startX + dx * distance;
      const y = startY + dy * distance;
      if (!room.tilemap.isRectBlocked(x - this.#player.width / 2,
          y - this.#player.height / 2, this.#player.width, this.#player.height)) {
        destination = { x, y };
        break;
      }
    }
    if (!destination) return false;
    this.#player.x = destination.x;
    this.#player.y = destination.y;
    this.#damageInRadius(room, destination.x, destination.y,
      A.teleportImpactRadius, effects.damageOnArrival, 'agi_t4');
    this.#camera.shake(5);
    return true;
  }

  #damage(enemy, amount, originX, originY, skillId) {
    if (!enemy.isAlive) return;
    const wasAlive = enemy.isAlive;
    enemy.takeDamage(amount, originX, originY);
    this.#events.emit('ability:hit', { skillId, x: enemy.x, y: enemy.y, damage: amount });
    if (wasAlive && !enemy.isAlive) this.#events.emit('combat:kill', { enemyType: enemy.typeName });
  }

  #damageInRadius(room, cx, cy, radius, damage, skillId, burn = false) {
    for (const enemy of room.enemies) {
      if (!enemy.isAlive) continue;
      if (Math.hypot(enemy.x - cx, enemy.y - cy) > radius + enemy.width / 2) continue;
      this.#damage(enemy, damage, cx, cy, skillId);
      if (burn && enemy.isAlive) this.#burning.set(enemy, {
        remaining: SKILLS.mag_t2.effects.burnDuration,
        tick: 0,
      });
    }
  }

  #explode(room, x, y) {
    const effects = SKILLS.mag_t2.effects;
    this.#damageInRadius(room, x, y, effects.splashRadius, effects.splashDamage, 'mag_t2', true);
    this.#camera.shake(4);
    this.#notify('impact', 'mag_t2', { x, y, radius: effects.splashRadius });
    this.#effects.push({ kind: 'flash', skillId: 'mag_t2',
      x, y, duration: A.explosionFlashDuration, remaining: A.explosionFlashDuration, tick: 0 });
  }

  update(dt) {
    dt = Math.max(0, Math.min(dt, A.maxSimulationStep));
    for (const [id, time] of this.#cooldowns) {
      const remaining = Math.max(0, time - dt);
      if (remaining === 0) this.#cooldowns.delete(id);
      else this.#cooldowns.set(id, remaining);
    }

    if (this.#stealth) {
      if (!this.#skills.isActive('agi_t3') || this.#player.stamina <= 0 || !this.#player.isAlive) {
        this.#stopStealth();
      } else {
        this.#player.stamina = Math.max(0, this.#player.stamina -
          SKILLS.agi_t3.staminaCost * dt);
        if (this.#player.stamina === 0) this.#stopStealth();
      }
    }
    const room = this.#getRoom();
    if (!room) return;

    for (const projectile of this.#projectiles) {
      const step = projectile.speed * dt;
      projectile.x += projectile.dx * step;
      projectile.y += projectile.dy * step;
      projectile.distance += step;
      const blocked = room.tilemap.isRectBlocked(projectile.x - 2, projectile.y - 2, 4, 4);
      const target = room.enemies.find(enemy => enemy.isAlive &&
        Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) < enemy.width / 2 + A.projectileHitRadius);
      if (blocked || target || projectile.distance >= A.projectileMaxDistance) {
        if (target) this.#damage(target, SKILLS.mag_t2.effects.damage, projectile.x, projectile.y, 'mag_t2');
        this.#explode(room, projectile.x, projectile.y);
        projectile.expired = true;
      }
    }
    this.#projectiles = this.#projectiles.filter(p => !p.expired);

    for (const [enemy, burn] of this.#burning) {
      if (!enemy.isAlive || !room.enemies.includes(enemy)) { this.#burning.delete(enemy); continue; }
      burn.remaining -= dt;
      burn.tick += dt;
      while (burn.tick >= SKILLS.mag_t2.effects.burnTickRate) {
        burn.tick -= SKILLS.mag_t2.effects.burnTickRate;
        this.#damage(enemy, SKILLS.mag_t2.effects.burnDamage,
          enemy.x, enemy.y, 'mag_t2');
      }
      if (burn.remaining <= 0) this.#burning.delete(enemy);
    }

    for (const effect of this.#effects) {
      effect.remaining -= dt;
      if (effect.kind === 'flash' || effect.kind === 'invulnerable') continue;
      effect.tick += dt;
      const interval = effect.kind === 'vortex' ? SKILLS.str_t3.effects.tickRate :
        effect.kind === 'dance' ? 1 / SKILLS.str_t4.effects.hitsPerSecond :
        effect.kind === 'meteors' ? SKILLS.mag_t4.effects.totalDuration / SKILLS.mag_t4.effects.meteorCount :
        A.annihilationTickRate;
      while (effect.tick >= interval && effect.remaining > -interval) {
        effect.tick -= interval;
        if (effect.kind === 'vortex') {
          this.#damageInRadius(room, this.#player.x, this.#player.y,
            SKILLS.str_t3.effects.radius, SKILLS.str_t3.effects.damage, effect.skillId);
        } else if (effect.kind === 'dance') {
          this.#damageInRadius(room, this.#player.x, this.#player.y,
            SKILLS.str_t4.effects.radius, SKILLS.str_t4.effects.damagePerHit, effect.skillId);
        } else if (effect.kind === 'annihilate') {
          this.#damageInRadius(room, this.#player.x, this.#player.y,
            SKILLS.aur_t4.effects.radius,
            SKILLS.aur_t4.effects.damagePerSecond * interval, effect.skillId);
        } else if (effect.kind === 'meteors') {
          const living = room.enemies.filter(e => e.isAlive);
          const target = living[effect.count % Math.max(1, living.length)];
          const angle = effect.count * A.meteorAngleStep;
          const mx = target?.x ?? this.#player.x + Math.cos(angle) * A.meteorFallbackRadius;
          const my = target?.y ?? this.#player.y + Math.sin(angle) * A.meteorFallbackRadius;
          this.#damageInRadius(room, mx, my, SKILLS.mag_t4.effects.meteorRadius,
            SKILLS.mag_t4.effects.damagePerMeteor, effect.skillId);
          effect.count++;
          this.#effects.push({ kind: 'flash', skillId: 'mag_t4', x: mx, y: my,
            remaining: A.explosionFlashDuration, duration: A.explosionFlashDuration, tick: 0 });
          this.#camera.shake(4);
        }
      }
    }
    this.#effects = this.#effects.filter(e => e.remaining > 0);
    this.#player.abilityInvulnerable = this.#effects.some(e =>
      e.kind === 'dance' || e.kind === 'invulnerable');
    this.#uiTimer -= dt;
    if (this.#uiTimer <= 0) {
      this.#uiTimer = A.cooldownRefreshInterval;
      this.#announceState();
    }
  }

  draw(ctx, camera) {
    ctx.save();
    const zoom = camera.zoom;
    for (const projectile of this.#projectiles) {
      const p = camera.worldToScreen(projectile.x, projectile.y);
      ctx.fillStyle = '#ffb446';
      ctx.shadowColor = '#ff6726';
      ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.arc(p.x, p.y, A.projectileHitRadius * zoom, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    const aura = this.#effects.filter(e => ['vortex', 'dance', 'annihilate', 'invulnerable'].includes(e.kind));
    for (const effect of aura) {
      const p = camera.worldToScreen(this.#player.x, this.#player.y);
      const radius = (effect.kind === 'vortex' ? SKILLS.str_t3.effects.radius :
        effect.kind === 'dance' ? SKILLS.str_t4.effects.radius :
        effect.kind === 'annihilate' ? SKILLS.aur_t4.effects.radius : A.shieldVisualRadius) * zoom;
      ctx.globalAlpha = 0.12 + Math.sin(performance.now() / 150) * 0.04;
      ctx.strokeStyle = effect.kind === 'annihilate' ? '#bf5aff' :
        effect.kind === 'invulnerable' ? '#ffe88a' : '#7ad7ff';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (this.#stealth) {
      const p = camera.worldToScreen(this.#player.x, this.#player.y);
      ctx.strokeStyle = '#74e7a3';
      ctx.lineWidth = 2; ctx.beginPath();
      ctx.arc(p.x, p.y, A.stealthVisualRadius * zoom, 0, Math.PI * 2); ctx.stroke();
    }
    for (const effect of this.#effects) {
      if (effect.kind !== 'flash') continue;
      const p = camera.worldToScreen(effect.x, effect.y);
      const fraction = effect.remaining / effect.duration;
      ctx.globalAlpha = fraction * 0.8;
      ctx.fillStyle = '#ff7a29';
      ctx.beginPath(); ctx.arc(p.x, p.y, (1 - fraction) * A.flashVisualRadius * zoom, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  reset(clearCooldowns = false) {
    if (clearCooldowns) this.#cooldowns.clear();
    this.#projectiles.length = 0;
    this.#effects.length = 0;
    this.#burning.clear();
    this.#stopStealth();
    this.#player.abilityInvulnerable = false;
    this.#announceState();
  }

  destroy() {
    this.reset();
    for (const unsub of this.#unsubs) unsub();
    this.#unsubs.length = 0;
  }
}
