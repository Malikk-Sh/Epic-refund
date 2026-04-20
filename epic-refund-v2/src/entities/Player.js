// Игрок. Top-down: движение по 8 направлениям (диагонали нормализуются), без гравитации.
// Никаких расчётов урона внутри — только через CombatSystem.

import { BALANCE } from '../data/balance.js';

const B = BALANCE.player;
const BC = BALANCE.combat;

// Диалоги при попытке использовать потерянный навык — добавляют "жизни" герою
const SKILL_FAIL_LINES = ['...', 'О, верно. Уже нет.', 'Забыл.', 'Рефлекс.', 'Старая привычка.'];

export class Player {
  x = 0;
  y = 0;
  vx = 0;       // В top-down — желаемая скорость движения
  vy = 0;
  width = B.width;
  height = B.height;
  facingX = 1;  // Нормализованное направление взгляда (для атаки)
  facingY = 0;

  // HP / Мана / Стамина
  hp = B.baseHP;
  maxHP = B.baseHP;
  mana = 0;
  maxMana = 0;
  stamina = B.staminaMax;
  maxStamina = B.staminaMax;

  // Состояние
  isAlive = true;
  inCombat = false;

  // FSM игрока
  #state = 'idle';   // idle | move | attack | roll | hurt | dead
  #stateTimer = 0;

  // Таймеры
  #attackCooldown = 0;
  #rollCooldown = 0;
  #iFrameTimer = 0;
  #combatTimer = 0;
  #parryWindowTimer = 0;

  // Комбо
  #comboIndex = 0;
  #comboTimer = 0;

  // Стейты действий
  #isParrying = false;
  #isRolling = false;
  #rollDirX = 0;
  #rollDirY = 0;

  // Эхо Щит
  #echoShieldReady = false;
  #echoShieldTimer = 0;

  // Death save (Эхо Неуязвимости)
  #deathSaveUsed = false;

  // Магический щит
  shieldCharges = 0;

  // Колбэк на атаку (регистрируется сценой)
  onAttack = null;

  // Системы
  #skillTree;
  #echoSystem;
  #combatSystem;
  #eventBus;

  constructor(systems) {
    this.#skillTree = systems.skillTree;
    this.#echoSystem = systems.echoSystem;
    this.#combatSystem = systems.combatSystem;
    this.#eventBus = systems.eventBus;
    this.#applySkillStats();

    this.#eventBus.on('skill:lost', () => this.#applySkillStats());
  }

  #applySkillStats() {
    const echo = this.#echoSystem.getPassiveBonuses();
    const armorBonus = this.#skillTree.isActive('def_base') ? 50 : 0;
    const newMaxHP = B.baseHP + armorBonus + echo.maxHPBonus;

    if (newMaxHP !== this.maxHP) {
      const pct = this.hp / this.maxHP;
      this.maxHP = newMaxHP;
      this.hp = Math.round(newMaxHP * pct);
    }

    this.maxMana = this.#skillTree.isActive('mag_base') ? 100 : 0;
    if (this.mana > this.maxMana) this.mana = this.maxMana;

    this.shieldCharges = this.#skillTree.isActive('def_t3') ? 3 : 0;
  }

  // ===== ГЛАВНЫЙ ЦИКЛ =====

  update(dt, input, tilemap) {
    if (!this.isAlive) return;

    this.#stateTimer += dt;
    this.#updateTimers(dt);

    if (this.#state === 'roll') {
      this.#updateRoll(dt, tilemap);
    } else if (this.#state === 'attack') {
      this.#updateAttackState(dt);
    } else if (this.#state === 'hurt') {
      this.#updateHurt(dt);
    } else {
      this.#handleInput(input);
      this.#applyMovement(dt, input, tilemap);
    }

    this.#updateStamina(dt);
    this.#updateRegen(dt);
  }

  #updateTimers(dt) {
    if (this.#attackCooldown > 0) this.#attackCooldown -= dt;
    if (this.#rollCooldown > 0)   this.#rollCooldown -= dt;
    if (this.#iFrameTimer > 0)    this.#iFrameTimer -= dt;
    if (this.#comboTimer > 0)     this.#comboTimer -= dt;
    if (this.#parryWindowTimer > 0) {
      this.#parryWindowTimer -= dt;
      if (this.#parryWindowTimer <= 0) this.#isParrying = false;
    }
    if (this.#combatTimer > 0) {
      this.#combatTimer -= dt;
      if (this.#combatTimer <= 0) this.inCombat = false;
    }

    // Сброс комбо
    if (this.#comboTimer <= 0 && this.#comboIndex > 0) {
      this.#comboIndex = 0;
    }

    // Эхо Щита — восстановление
    if (this.#echoSystem.hasEcho('echo_shield')) {
      this.#echoShieldTimer += dt;
      if (this.#echoShieldTimer >= BALANCE.echo.shieldAutoBlockInterval) {
        this.#echoShieldTimer = 0;
        this.#echoShieldReady = true;
      }
    }
  }

  #handleInput(input) {
    // Атаки
    if (input.isPressed('attackLight') && this.#attackCooldown <= 0) {
      this.#tryLightAttack();
      return;
    }

    if (input.isPressed('attackHeavy') && this.#attackCooldown <= 0) {
      this.#tryHeavyOrParry();
      return;
    }

    // Перекат
    if (input.isPressed('roll') && this.#rollCooldown <= 0 && this.stamina >= BC.staminaCostRoll) {
      this.#tryRoll(input);
      return;
    }

    // Навыки
    if (input.isPressed('skill1')) this.#trySkill('str_t3');
    if (input.isPressed('skill2')) this.#trySkill('mag_t2');
    if (input.isPressed('skill3')) this.#trySkill('agi_t3');
    if (input.isPressed('skill4')) this.#tryUltima();
  }

  #applyMovement(dt, input, tilemap) {
    const mv = input.getMovementVector();
    const echo = this.#echoSystem.getPassiveBonuses();
    const speedMod = echo.walkSpeedMultiplier;

    const speed = B.baseSpeed * speedMod;

    this.vx = mv.x * speed;
    this.vy = mv.y * speed;

    // Обновляем направление взгляда (только если движемся)
    if (mv.x !== 0 || mv.y !== 0) {
      this.facingX = mv.x;
      this.facingY = mv.y;
      this.#setState('move');
    } else {
      this.#setState('idle');
    }

    // Физика через tilemap
    if (tilemap) {
      tilemap.moveEntity(this, this.vx * dt, this.vy * dt);
    } else {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
  }

  // ===== АТАКИ =====

  #tryLightAttack() {
    const hasSword = this.#skillTree.isActive('str_base');
    const echo = this.#echoSystem.getPassiveBonuses();
    const baseDamage = hasSword ? 15 : B.baseDamage;

    // Комбо
    if (this.#comboTimer > 0) {
      this.#comboIndex = Math.min(this.#comboIndex + 1, 2);
    } else {
      this.#comboIndex = 0;
    }
    this.#comboTimer = BC.comboWindow;

    const damage = this.#combatSystem.calculatePlayerDamage({
      baseDamage,
      comboIndex: this.#comboIndex,
      echoBonuses: echo,
    });

    this.#attackCooldown = BC.attackDuration + 0.1;
    this.stamina = Math.max(0, this.stamina - BC.staminaCostLight);
    this.inCombat = true;
    this.#combatTimer = 5;
    this.#setState('attack');
    this.#stateTimer = 0;

    this.#eventBus.emit('player:attack', {
      type: 'light',
      damage,
      range: BC.attackRangeLight,
      arc: BC.attackArcLight,
      knockback: this.#combatSystem.calculateKnockback(0, echo),
      comboIndex: this.#comboIndex,
      x: this.x, y: this.y,
      dirX: this.facingX, dirY: this.facingY,
    });
  }

  #tryHeavyOrParry() {
    // Парирование (если есть навык)
    if (this.#skillTree.isActive('def_t2') && !this.#isParrying) {
      this.#isParrying = true;
      this.#parryWindowTimer = BC.parryWindow;
      this.stamina = Math.max(0, this.stamina - BC.staminaCostParry);
      this.#eventBus.emit('player:parryStart', { window: BC.parryWindow });
      return;
    }

    // Тяжёлый удар (если есть)
    if (this.#skillTree.isActive('str_t2')) {
      const echo = this.#echoSystem.getPassiveBonuses();
      const damage = this.#combatSystem.calculatePlayerDamage({
        baseDamage: 45,
        echoBonuses: echo,
      });

      this.#attackCooldown = BC.attackDuration * 2;
      this.stamina = Math.max(0, this.stamina - BC.staminaCostHeavy);
      this.inCombat = true;
      this.#combatTimer = 5;
      this.#setState('attack');
      this.#stateTimer = 0;

      this.#eventBus.emit('player:attack', {
        type: 'heavy',
        damage,
        range: BC.attackRangeHeavy,
        arc: BC.attackArcHeavy,
        shieldBreak: true,
        knockback: this.#combatSystem.calculateKnockback(120, echo),
        x: this.x, y: this.y,
        dirX: this.facingX, dirY: this.facingY,
      });
    }
  }

  #tryRoll(input) {
    const mv = input.getMovementVector();
    // Перекат в направлении движения, или в направлении взгляда если стоит
    const dx = mv.x !== 0 || mv.y !== 0 ? mv.x : this.facingX;
    const dy = mv.x !== 0 || mv.y !== 0 ? mv.y : this.facingY;

    this.#rollDirX = dx;
    this.#rollDirY = dy;
    this.#isRolling = true;
    this.stamina = Math.max(0, this.stamina - BC.staminaCostRoll);
    this.#rollCooldown = B.rollCooldown;

    // i-frames только с Акробатикой
    if (this.#skillTree.isActive('agi_t2')) {
      this.#iFrameTimer = BC.iFrameDuration;
    }

    this.#setState('roll');
    this.#stateTimer = 0;
  }

  #updateRoll(dt, tilemap) {
    if (this.#stateTimer >= B.rollDuration) {
      this.#isRolling = false;
      this.#setState('idle');
      return;
    }

    const dx = this.#rollDirX * B.rollSpeed * dt;
    const dy = this.#rollDirY * B.rollSpeed * dt;

    if (tilemap) {
      tilemap.moveEntity(this, dx, dy);
    } else {
      this.x += dx;
      this.y += dy;
    }
  }

  #updateAttackState(dt) {
    if (this.#stateTimer >= BC.attackDuration) {
      this.#setState('idle');
    }
  }

  #updateHurt(dt) {
    if (this.#stateTimer >= 0.25) {
      this.#setState('idle');
    }
  }

  #trySkill(skillId) {
    if (!this.#skillTree.isActive(skillId)) {
      this.#eventBus.emit('skill:attempted', { skillId });
      return;
    }
    this.#eventBus.emit('player:skillUsed', {
      skillId,
      x: this.x, y: this.y,
      dirX: this.facingX, dirY: this.facingY,
    });
  }

  #tryUltima() {
    const ultimas = ['str_t4', 'mag_t4', 'def_t4', 'agi_t4', 'aur_t4'];
    for (const id of ultimas) {
      if (this.#skillTree.isActive(id)) { this.#trySkill(id); return; }
    }
    this.#eventBus.emit('skill:attempted', { skillId: 'ultima_none' });
  }

  // ===== СТАМИНА / РЕГЕНЕРАЦИЯ =====

  #updateStamina(dt) {
    // Регенерация вне активных действий
    if (this.#attackCooldown <= 0 && this.#state !== 'roll') {
      this.stamina = Math.min(this.maxStamina, this.stamina + B.staminaRegen * dt);
    }
  }

  #updateRegen(dt) {
    if (!this.#skillTree.isActive('aur_base')) return;
    if (this.hp >= this.maxHP) return;
    const rate = this.inCombat ? 0.5 : 2;
    this.hp = Math.min(this.maxHP, this.hp + rate * dt);
  }

  // ===== ПОЛУЧЕНИЕ УРОНА =====

  takeDamage(rawDamage, sourceX, sourceY) {
    if (this.#iFrameTimer > 0) return false;

    const echo = this.#echoSystem.getPassiveBonuses();
    const result = this.#combatSystem.calculateDamageToPlayer({
      baseDamage: rawDamage,
      armorReduction: this.#skillTree.isActive('def_base') ? 0.3 : 0,
      shieldActive: this.#skillTree.isActive('def_t3'),
      shieldCharges: this.shieldCharges,
      parrySuccess: this.#isParrying,
      parryPerfect: this.#isParrying &&
        this.#parryWindowTimer > (BC.parryWindow - BC.perfectParryWindow),
      echoAutoBlockReady: this.#echoShieldReady,
      fearAuraReduction: this.#skillTree.isActive('aur_t3') ? 0.15 : 0,
    });

    if (result.parryConsumed) {
      this.#isParrying = false;
      this.#parryWindowTimer = 0;
      this.#eventBus.emit('player:parrySuccess', {
        perfect: result.reflected > 0,
        reflected: result.reflected,
      });
      return false;
    }

    if (result.shieldChargeConsumed) {
      this.shieldCharges = Math.max(0, this.shieldCharges - 1);
      return false;
    }

    if (result.echoShieldConsumed) {
      this.#echoShieldReady = false;
      return false;
    }

    this.hp -= result.damage;
    this.inCombat = true;
    this.#combatTimer = 5;

    this.#setState('hurt');
    this.#stateTimer = 0;
    this.#iFrameTimer = this.#skillTree.isActive('agi_t2') ?
      BC.iFrameDuration : BC.iFrameDurationBase;

    this.#eventBus.emit('combat:playerHit', {
      damage: result.damage,
      remainingHP: this.hp,
      source: { x: sourceX, y: sourceY },
    });

    if (this.hp <= 0) this.#die();
    return true;
  }

  #die() {
    const echo = this.#echoSystem.getPassiveBonuses();

    // Эхо Неуязвимости — death save
    if (echo.deathSaveHP > 0 && !this.#deathSaveUsed) {
      this.hp = echo.deathSaveHP;
      this.#deathSaveUsed = true;
      this.#iFrameTimer = 2.0;
      this.#eventBus.emit('player:deathSave');
      return;
    }

    this.hp = 0;
    this.isAlive = false;
    this.#setState('dead');
    this.#eventBus.emit('combat:playerDeath', {
      skillsRemaining: this.#skillTree.getActiveSkillCount(),
    });
  }

  heal(amount) {
    this.hp = Math.min(this.maxHP, this.hp + amount);
  }

  // Вызывается при входе в комнату
  onRoomEnter() {
    const echo = this.#echoSystem.getPassiveBonuses();
    if (echo.healOnRoomEnter > 0) this.heal(echo.healOnRoomEnter);
  }

  resetForNewLevel() {
    this.#deathSaveUsed = false;
    this.shieldCharges = this.#skillTree.isActive('def_t3') ? 3 : 0;
  }

  #setState(newState) {
    if (this.#state === newState) return;
    this.#state = newState;
    this.#stateTimer = 0;
  }

  // === Геттеры ===

  get state() { return this.#state; }
  get isInvulnerable() { return this.#iFrameTimer > 0; }
  get isInAttack() { return this.#state === 'attack'; }
  get isParrying() { return this.#isParrying; }
  get iFrameTimer() { return this.#iFrameTimer; }
  get comboIndex() { return this.#comboIndex; }
  get phase() { return this.#skillTree.getPlayerPhase(); }

  // Сериализация для сохранения
  serialize() {
    return {
      x: this.x, y: this.y,
      hp: this.hp, maxHP: this.maxHP,
      mana: this.mana, maxMana: this.maxMana,
      stamina: this.stamina,
    };
  }

  deserialize(data) {
    Object.assign(this, data);
  }
}
