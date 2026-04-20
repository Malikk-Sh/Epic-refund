// Базовый класс врага в top-down.
// Ключевое отличие от v1: нет гравитации. Нокбэк — только по XY в направлении от удара.

import { MathUtils } from '../utils/MathUtils.js';

export const ENEMY_STATE = {
  IDLE:    'idle',
  PATROL:  'patrol',
  ALERT:   'alert',
  CHASE:   'chase',
  ATTACK:  'attack',
  FLEE:    'flee',
  STUN:    'stun',
  DEAD:    'dead',
};

export class Enemy {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  width = 14;
  height = 14;
  facingX = 1;
  facingY = 0;

  // Статы (переопределяются в подклассах)
  hp = 10;
  maxHP = 10;
  damage = 3;
  attackSpeed = 1.5;    // Время между атаками
  moveSpeed = 55;
  detectionRange = 90;
  attackRange = 18;
  fearThreshold = 2;
  armor = 0;

  // Тип для спрайт-реестра и плейсхолдера
  typeName = 'enemy';
  displayName = 'Враг';
  color = '#ff4444';

  // Состояние
  state = ENEMY_STATE.IDLE;
  #stateTimer = 0;
  isAlive = true;

  // Таймеры
  #attackCooldown = 0;
  #stunTimer = 0;
  #alertTimer = 0;

  // Нокбэк (применяется поверх движения AI)
  #knockbackX = 0;
  #knockbackY = 0;
  #knockbackTimer = 0;

  // Визуальный оверлей (красное мигание при уроне)
  #hitFlash = 0;

  // Патруль
  #patrolPoints = [];
  #patrolIndex = 0;
  #patrolWaitTimer = 0;

  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  // ===== ГЛАВНЫЙ ЦИКЛ =====

  update(dt, player, fearSystem, skillTree, tilemap) {
    if (!this.isAlive) return;

    this.#stateTimer += dt;
    if (this.#hitFlash > 0) this.#hitFlash -= dt;

    this.#updateCooldowns(dt);

    // Нокбэк применяется всегда, даже в стане
    let dx = 0, dy = 0;
    if (this.#knockbackTimer > 0) {
      dx += this.#knockbackX * dt;
      dy += this.#knockbackY * dt;
      this.#knockbackTimer -= dt;
      // Затухание
      this.#knockbackX *= 0.85;
      this.#knockbackY *= 0.85;
    }

    // AI (если не в стане)
    if (this.state !== ENEMY_STATE.STUN && this.#stunTimer <= 0) {
      const threat = fearSystem.calculateThreat(skillTree, player);
      const behavior = fearSystem.evaluateBehavior(this, threat);
      this.#updateFSM(dt, player, behavior);

      dx += this.vx * dt;
      dy += this.vy * dt;
    } else if (this.#stunTimer <= 0 && this.state === ENEMY_STATE.STUN) {
      // Выход из стана
      this.state = ENEMY_STATE.CHASE;
    }

    // Применяем движение через tilemap
    if (tilemap) {
      tilemap.moveEntity(this, dx, dy);
    } else {
      this.x += dx;
      this.y += dy;
    }
  }

  #updateCooldowns(dt) {
    if (this.#attackCooldown > 0) this.#attackCooldown -= dt;
    if (this.#stunTimer > 0)      this.#stunTimer -= dt;
    if (this.#alertTimer > 0)     this.#alertTimer -= dt;
    if (this.#patrolWaitTimer > 0) this.#patrolWaitTimer -= dt;
  }

  #updateFSM(dt, player, behavior) {
    switch (this.state) {
      case ENEMY_STATE.IDLE:    this.#updateIdle(dt, player, behavior); break;
      case ENEMY_STATE.PATROL:  this.#updatePatrol(dt, player, behavior); break;
      case ENEMY_STATE.ALERT:   this.#updateAlert(dt, player, behavior); break;
      case ENEMY_STATE.CHASE:   this.#updateChase(dt, player, behavior); break;
      case ENEMY_STATE.ATTACK:  this.#updateAttack(dt, player); break;
      case ENEMY_STATE.FLEE:    this.#updateFlee(dt, player); break;
      default: this.vx = this.vy = 0;
    }
  }

  #updateIdle(dt, player, behavior) {
    this.vx = this.vy = 0;
    const dist = MathUtils.distance(this.x, this.y, player.x, player.y);

    if (dist < this.detectionRange) {
      if (behavior === 'panic') {
        this.#setState(ENEMY_STATE.FLEE);
      } else {
        this.#setState(ENEMY_STATE.ALERT);
        this.#alertTimer = 0.6;
      }
      return;
    }

    if (this.#patrolPoints.length > 0 && this.#stateTimer > 2) {
      this.#setState(ENEMY_STATE.PATROL);
    }
  }

  #updatePatrol(dt, player, behavior) {
    const dist = MathUtils.distance(this.x, this.y, player.x, player.y);
    if (dist < this.detectionRange) {
      this.#setState(behavior === 'panic' ? ENEMY_STATE.FLEE : ENEMY_STATE.ALERT);
      this.#alertTimer = 0.4;
      return;
    }

    if (this.#patrolPoints.length === 0) {
      this.#setState(ENEMY_STATE.IDLE);
      return;
    }

    if (this.#patrolWaitTimer > 0) {
      this.vx = this.vy = 0;
      return;
    }

    const target = this.#patrolPoints[this.#patrolIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d < 3) {
      this.#patrolIndex = (this.#patrolIndex + 1) % this.#patrolPoints.length;
      this.#patrolWaitTimer = 1.2;
      this.vx = this.vy = 0;
    } else {
      this.vx = (dx / d) * this.moveSpeed * 0.55;
      this.vy = (dy / d) * this.moveSpeed * 0.55;
      this.facingX = dx / d;
      this.facingY = dy / d;
    }
  }

  #updateAlert(dt, player, behavior) {
    this.vx = this.vy = 0;

    // Смотрим на игрока
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    this.facingX = dx / d;
    this.facingY = dy / d;

    if (this.#alertTimer <= 0) {
      if (behavior === 'panic' || behavior === 'cautious') {
        this.#setState(ENEMY_STATE.FLEE);
      } else {
        this.#setState(ENEMY_STATE.CHASE);
      }
    }
  }

  #updateChase(dt, player, behavior) {
    if (behavior === 'panic') {
      this.#setState(ENEMY_STATE.FLEE);
      return;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= this.attackRange && this.#attackCooldown <= 0) {
      this.#setState(ENEMY_STATE.ATTACK);
      this.#stateTimer = 0;
      return;
    }

    // Слишком далеко — возврат к патрулю
    if (dist > this.detectionRange * 2.5) {
      this.#setState(ENEMY_STATE.PATROL);
      return;
    }

    if (dist > 0) {
      const speed = behavior === 'aggressive' ? this.moveSpeed * 1.2 : this.moveSpeed;
      this.vx = (dx / dist) * speed;
      this.vy = (dy / dist) * speed;
      this.facingX = dx / dist;
      this.facingY = dy / dist;
    }
  }

  #updateAttack(dt, player) {
    this.vx = this.vy = 0;

    // Выполняем атаку в начале (после "замаха")
    if (this.#stateTimer >= 0.25 && this.#attackCooldown <= 0) {
      const dist = MathUtils.distance(this.x, this.y, player.x, player.y);
      if (dist <= this.attackRange * 1.2) {
        this.onAttack(player);
      }
      this.#attackCooldown = this.attackSpeed;
    }

    if (this.#stateTimer > 0.5) {
      this.#setState(ENEMY_STATE.CHASE);
    }
  }

  #updateFlee(dt, player) {
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;

    this.vx = (dx / d) * this.moveSpeed * 1.3;
    this.vy = (dy / d) * this.moveSpeed * 1.3;
    this.facingX = dx / d;
    this.facingY = dy / d;

    if (d > this.detectionRange * 2.5) {
      this.vx = this.vy = 0;
      this.#setState(ENEMY_STATE.IDLE);
    }
  }

  // Переопределяется в подклассах
  onAttack(player) {
    player.takeDamage(this.damage, this.x, this.y);
  }

  // ===== ПОЛУЧЕНИЕ УРОНА =====

  takeDamage(amount, sourceX, sourceY) {
    if (!this.isAlive) return;

    const finalDamage = Math.max(1, amount - this.armor);
    this.hp = Math.max(0, this.hp - finalDamage);
    this.#hitFlash = 0.15;

    // Нокбэк — теперь ТОЛЬКО горизонтальный от источника (без взлёта!)
    if (sourceX !== undefined && sourceY !== undefined) {
      const dx = this.x - sourceX;
      const dy = this.y - sourceY;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const power = 180;
      this.#knockbackX = (dx / d) * power;
      this.#knockbackY = (dy / d) * power;
      this.#knockbackTimer = 0.15;
    }

    if (this.hp <= 0) {
      this.#die();
    } else {
      if (this.state !== ENEMY_STATE.STUN && this.state !== ENEMY_STATE.FLEE) {
        this.#setState(ENEMY_STATE.CHASE);
      }
    }
  }

  stun(duration) {
    this.#stunTimer = duration;
    this.vx = this.vy = 0;
    this.#setState(ENEMY_STATE.STUN);
  }

  #die() {
    this.hp = 0;
    this.isAlive = false;
    this.#setState(ENEMY_STATE.DEAD);
  }

  // === НАСТРОЙКА ===

  setPatrolPoints(points) {
    this.#patrolPoints = points;
    if (points.length > 0) this.#setState(ENEMY_STATE.PATROL);
  }

  #setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this.#stateTimer = 0;
    this.onStateChange?.(newState);
  }

  // === AABB для коллизий с атаками игрока ===

  getHitbox() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  // Для рендера
  get hitFlash() { return this.#hitFlash; }
}
