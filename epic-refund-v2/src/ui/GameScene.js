// Главная игровая сцена.
// Объединяет: игрок, уровень с комнатами, HUD, диалоги, Врата UI, частицы.

import { Player } from '../entities/Player.js';
import { HUD } from '../ui/HUD.js';
import { DialogueSystem } from '../ui/DialogueSystem.js';
import { GateUI } from '../ui/GateUI.js';
import { Notifications } from '../ui/Notifications.js';
import { WorldRenderer } from '../render/WorldRenderer.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { createLevelByKey } from '../levels/LevelRegistry.js';
import { MathUtils } from '../utils/MathUtils.js';
import { BALANCE } from '../data/balance.js';
import { KANE_DIALOGUES, pickKaneLine } from '../data/dialogues/kane_dialogues.js';

export class GameScene {
  #deps;

  // Игровые объекты
  #player;
  #level;

  // Рендер и UI
  #worldRenderer;
  #hud;
  #dialogue;
  #gateUI;
  #notifications;
  #particles;

  // Накопленные атаки этого кадра
  #pendingAttacks = [];

  // Подписки для последующей отписки
  #unsubs = [];

  // Флаг первых подсказок
  #firstGateApproached = false;
  // Для одноразовой реплики при встрече с боссом (сбрасывается на входе в комнату)
  #bossEncountered = false;

  constructor(deps) {
    this.#deps = deps;
  }

  async init() {
    const d = this.#deps;

    // Player
    this.#player = new Player({
      skillTree:    d.skillTree,
      echoSystem:   d.echoSystem,
      combatSystem: d.combatSystem,
      eventBus:     d.eventBus,
    });

    // Рендер и UI (создаются один раз и переживают смену уровня)
    this.#worldRenderer = new WorldRenderer(d.renderer, d.camera, d.spriteRegistry);
    this.#hud           = new HUD(d.renderer, d.hudManager, d.skillTree, d.eventBus);
    this.#dialogue      = new DialogueSystem(d.renderer, d.eventBus);
    this.#gateUI        = new GateUI(d.renderer, d.gateSystem, d.eventBus);
    this.#notifications = new Notifications(d.renderer, d.camera);
    this.#particles     = new ParticleSystem(d.camera);

    // События
    this.#setupEventHandlers();

    // Стартовый уровень
    this.#loadLevel('level_01');
  }

  // Загрузка/смена уровня.
  // startRoomId — конкретная стартовая комната (для межуровневых переходов).
  // fromDirection — с какой стороны игрок вошёл (для точки спавна).
  #loadLevel(levelKey, startRoomId = null, fromDirection = null) {
    const d = this.#deps;

    this.#level = createLevelByKey(levelKey, {
      eventBus:    d.eventBus,
      skillTree:   d.skillTree,
      fearSystem:  d.fearSystem,
      gateSystem:  d.gateSystem,
    });

    if (startRoomId) this.#level.setStartRoom(startRoomId);

    // Ставим игрока на точку спавна целевой комнаты
    const startRoom = this.#level.currentRoom;
    const spawn = startRoom.getSpawnPosition(fromDirection);
    this.#player.x = spawn.x;
    this.#player.y = spawn.y;
    startRoom.onPlayerEnter(this.#player, fromDirection, d.eventBus);
    this.#level.markRoomSeen(this.#level.currentRoomId);

    this.#bossEncountered = false;
    this.#setupCameraForRoom(fromDirection);
    this.#announceLevel(levelKey);
    this.#checkBossEncounter();
  }

  #announceLevel(levelKey) {
    const d = this.#deps;
    const INTROS = {
      level_01: { title: 'Уровень 1: Гнилой Пик', line: KANE_DIALOGUES.environment.entered_rotten_peak[0] },
      level_02: { title: 'Уровень 2: Казармы Тьмы', line: KANE_DIALOGUES.environment.entered_barracks[0] },
    };
    const intro = INTROS[levelKey];
    if (!intro) return;

    this.#notifications.show(intro.title, 3.0, '#c8a96e');
    setTimeout(() => {
      d.eventBus.emit('player:speaks', { line: intro.line, duration: 4 });
    }, 1500);
  }

  // fromDirection — сторона, с которой вошёл игрок (для анимации камеры).
  // null = первая загрузка, мгновенный snap без анимации.
  #setupCameraForRoom(fromDirection = null) {
    const d = this.#deps;
    const bounds = this.#level.getCurrentRoomBounds();
    d.camera.setWorldBounds(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
    d.camera.snapTo(this.#player);

    if (!fromDirection) return;

    // Смещаем стартовую позицию камеры на одну комнату в сторону входа.
    // Естественный lerp «довезёт» её к правильной позиции — это и есть анимация.
    const ROOM_W = bounds.maxX - bounds.minX;
    const ROOM_H = bounds.maxY - bounds.minY;
    const offsets = {
      east:  { dx:  ROOM_W, dy: 0 },
      west:  { dx: -ROOM_W, dy: 0 },
      south: { dx: 0, dy:  ROOM_H },
      north: { dx: 0, dy: -ROOM_H },
    };
    const off = offsets[fromDirection];
    if (off) d.camera.startTransition(off.dx, off.dy);
  }

  #setupEventHandlers() {
    const { eventBus } = this.#deps;
    const on = (ev, fn) => this.#unsubs.push(eventBus.on(ev, fn));

    // Атаки — копим для проверки хитбоксов
    on('player:attack', (data) => {
      this.#pendingAttacks.push(data);
    });

    // Попытка использовать потерянный навык
    on('skill:attempted', () => {
      const phase = this.#deps.skillTree.getPlayerPhase();
      const line = pickKaneLine('skillAttempt', 'all', phase);
      if (line) eventBus.emit('player:speaks', { line, duration: 2.2 });
    });

    // Потеря навыка
    on('skill:lost', ({ skillName, branch, echo }) => {
      this.#notifications.show(`«${skillName}» — потеряно`, 2.5, '#bb44ff');
      if (echo) {
        this.#notifications.show(`Эхо: ${echo.description}`, 3.0, '#8866aa', 14);
      }

      const BRANCH_COLORS = {
        strength: '#e74c3c', magic: '#3498db', defense: '#f1c40f',
        agility: '#2ecc71', aura: '#9b59b6',
      };
      this.#particles.skillShatter(
        this.#player.x, this.#player.y - 6,
        BRANCH_COLORS[branch] ?? '#fff'
      );
      this.#deps.camera.shake(6);

      // Реплика Кейна
      const phase = this.#deps.skillTree.getPlayerPhase();
      const count = this.#deps.skillTree.getActiveSkillCount();
      let subcat = 'first';
      if (count <= 10) subcat = 'half';
      if (count <= 3)  subcat = 'last';

      setTimeout(() => {
        const line = pickKaneLine('skillLost', subcat, phase);
        if (line) eventBus.emit('player:speaks', { line, duration: 3.5 });
      }, 3000);

      // Обновить реплики NPC во всех комнатах
      for (const room of this.#level.rooms.values()) {
        for (const npc of room.npcs) {
          if (npc.refreshDialogue) npc.refreshDialogue();
        }
      }
    });

    // Смерть игрока
    on('combat:playerDeath', () => {
      this.#notifications.show('Кейн погиб', 3.0, '#ff3333');
      this.#deps.camera.shake(15);
    });

    // Урон по игроку
    on('combat:playerHit', ({ source }) => {
      this.#deps.camera.shake(4);
      if (source?.x !== undefined) {
        const dx = this.#player.x - source.x;
        const dy = this.#player.y - source.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        this.#particles.blood(this.#player.x, this.#player.y, dx / d, dy / d, 6);
      }
    });

    // Парирование
    on('player:parrySuccess', ({ perfect }) => {
      this.#notifications.show(perfect ? 'ИДЕАЛЬНОЕ ПАРИРОВАНИЕ' : 'Парирование',
        1.2, perfect ? '#FFD700' : '#ccccff');
      this.#particles.hitSparks(
        this.#player.x, this.#player.y,
        perfect ? '#ffffff' : '#ccccff', 10
      );
      this.#deps.camera.shake(perfect ? 8 : 4);
    });

    // Убийство
    on('combat:kill', () => {
      this.#deps.fearSystem.recordKill();
    });

    // Очистка комнаты
    on('room:cleared', ({ roomId }) => {
      this.#notifications.show('Комната зачищена', 1.5, '#44aa44');
    });

    // Вход в комнату
    on('room:enter', ({ firstVisit, roomId }) => {
      if (firstVisit) {
        // Можно показать имя комнаты, но для Milestone 1 тихо
      }
    });

    // Открытие Врат
    on('gate:open', () => {
      this.#notifications.show('Врата открыты', 2.0, '#bb66ff');
      this.#deps.camera.shake(6);
    });

    // Спасение
    on('player:deathSave', () => {
      this.#notifications.show('Эхо уберегло от гибели!', 2.0, '#f1c40f');
    });

    // === Босс ===
    on('boss:phaseChange', ({ bossId, displayName, phase, totalPhases, name }) => {
      const title = name
        ? `${displayName}: ${name} (${phase}/${totalPhases})`
        : `${displayName}: фаза ${phase}/${totalPhases}`;
      this.#notifications.show(title, 2.5, '#d84a6a');
      this.#deps.camera.shake(10);

      const line = KANE_DIALOGUES.boss?.phase?.[bossId]?.[phase - 2];
      if (line) {
        setTimeout(() => eventBus.emit('player:speaks', { line, duration: 3 }), 400);
      }
    });

    on('boss:defeat', ({ bossId, displayName }) => {
      this.#notifications.show(`${displayName} повержен`, 3.5, '#FFD700');
      this.#deps.camera.shake(18);

      const lines = KANE_DIALOGUES.boss?.defeat?.[bossId];
      if (lines && lines.length) {
        const line = lines[Math.floor(Math.random() * lines.length)];
        setTimeout(() => eventBus.emit('player:speaks', { line, duration: 4 }), 1200);
      }
    });
  }

  // Одноразовая реплика при первом входе в комнату с боссом.
  #checkBossEncounter() {
    if (this.#bossEncountered) return;
    const room = this.#level.currentRoom;
    for (const enemy of room.enemies) {
      if (enemy.isBoss && enemy.isAlive) {
        this.#bossEncountered = true;
        const lines = KANE_DIALOGUES.boss?.encounter?.[enemy.typeName];
        if (lines && lines.length) {
          const line = lines[Math.floor(Math.random() * lines.length)];
          this.#deps.eventBus.emit('player:speaks', { line, duration: 4 });
        }
        return;
      }
    }
  }

  // === ГЛАВНЫЙ ЦИКЛ ===

  update(dt, input) {
    // Приоритет: UI (Врата) → диалоги → геймплей
    if (this.#gateUI.visible) {
      this.#gateUI.update(dt, input);
      this.#notifications.update(dt);
      return;
    }

    if (this.#dialogue.isActive) {
      this.#dialogue.update(dt, input);
      this.#notifications.update(dt);
      return;
    }

    // E — взаимодействие с NPC / Вратами
    if (input.isPressed('interact')) {
      this.#handleInteract();
    }

    if (!this.#player.isAlive) {
      this.#notifications.update(dt);
      return;
    }

    // Основной апдейт
    const room = this.#level.currentRoom;
    this.#player.update(dt, input, room.tilemap);
    this.#level.update(dt, this.#player);
    this.#particles.update(dt);
    this.#notifications.update(dt);

    // Проверка атак игрока
    this.#resolveAttacks();

    // Проверка перехода между комнатами
    this.#checkRoomTransition();
  }

  // === ВЗАИМОДЕЙСТВИЕ ===

  #handleInteract() {
    const room = this.#level.currentRoom;

    // 1. NPC
    for (const npc of room.npcs) {
      if (npc.isPlayerNear() && !npc.isDialogueActive) {
        npc.interact(this.#deps.eventBus);
        return;
      }
    }

    // 2. Врата (если игрок стоит рядом с Вратами этой комнаты)
    if (room.gate && !room.isGateOpen) {
      const d = MathUtils.distance(this.#player.x, this.#player.y, room.gate.x, room.gate.y);
      if (d <= 24) {
        // Активируем Врата если ещё не активны
        if (!this.#deps.gateSystem.isActive()) {
          const success = this.#deps.gateSystem.approach(room.gate, 2);
          if (!success) return;

          // Первый раз — комментарий Кейна
          if (!this.#firstGateApproached) {
            this.#firstGateApproached = true;
            setTimeout(() => {
              this.#deps.eventBus.emit('player:speaks', {
                line: KANE_DIALOGUES.nearGate.first[0],
                duration: 4,
              });
              // Откроем UI после реплики
              setTimeout(() => this.#gateUI.show(), 4500);
            }, 300);
          } else {
            this.#gateUI.show();
          }
        } else {
          this.#gateUI.show();
        }
      }
    }
  }

  // === АТАКИ ===

  #resolveAttacks() {
    const room = this.#level.currentRoom;
    const echo = this.#deps.echoSystem.getPassiveBonuses();

    for (const atk of this.#pendingAttacks) {
      for (const enemy of room.enemies) {
        if (!enemy.isAlive) continue;

        // Проверка: враг в дуге атаки игрока
        if (!this.#isInAttackArc(atk, enemy)) continue;

        // Наносим урон
        enemy.takeDamage(atk.damage, atk.x, atk.y);

        // Эффекты
        this.#particles.hitSparks(enemy.x, enemy.y, '#ffcc44', 5);
        this.#deps.camera.shake(atk.type === 'heavy' ? 6 : 3);

        // Число урона
        const dmgColor = enemy.isAlive ? '#ffffff' : '#ff4444';
        this.#notifications.showDamage(atk.damage, enemy.x, enemy.y - enemy.height / 2, dmgColor);

        // Если враг умер — кровь и событие
        if (!enemy.isAlive) {
          this.#particles.blood(enemy.x, enemy.y, atk.dirX, atk.dirY, 12);
          this.#deps.eventBus.emit('combat:kill', { enemyType: enemy.typeName });
        }
      }
    }

    this.#pendingAttacks = [];
  }

  // Проверяет: точка (enemy) попадает в дугу атаки от (atk.x, atk.y)
  #isInAttackArc(atk, enemy) {
    const dx = enemy.x - atk.x;
    const dy = enemy.y - atk.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > atk.range + enemy.width / 2) return false;

    // Если атакующий стоит внутри врага — всегда хит
    if (dist < 4) return true;

    // Угол от атакующего до врага
    const angleToEnemy = Math.atan2(dy, dx);
    // Угол направления атаки
    const attackAngle = Math.atan2(atk.dirY, atk.dirX);

    // Разница углов, нормализованная в [-π, π]
    let diff = angleToEnemy - attackAngle;
    while (diff > Math.PI)  diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    return Math.abs(diff) <= atk.arc / 2;
  }

  // === ПЕРЕХОД МЕЖДУ КОМНАТАМИ ===

  #checkRoomTransition() {
    const door = this.#level.checkRoomTransition(this.#player);
    if (!door) return;

    if (door.toLevelKey) {
      this.#loadLevel(door.toLevelKey, door.toRoomId, door.targetSpawnDir);
      return;
    }

    this.#level.transitionToRoom(door.toRoomId, door.targetSpawnDir, this.#player);
    this.#bossEncountered = false;
    this.#setupCameraForRoom(door.targetSpawnDir);
    this.#checkBossEncounter();
  }

  // === ОТРИСОВКА ===

  render() {
    const d = this.#deps;
    d.renderer.beginFrame();

    // Мир
    const room = this.#level.currentRoom;
    this.#worldRenderer.drawRoom(room, this.#player);

    // Частицы
    this.#particles.render(d.renderer.ctx);

    // HUD
    this.#hud.draw(0.016, this.#player);
    this.#hud.drawBossBar(room);
    this.#hud.drawMinimap(this.#level, this.#level.currentRoomId);

    // Подсказка взаимодействия
    this.#drawInteractHint();

    // Уведомления и числа урона
    this.#notifications.draw();

    // Диалоги (поверх)
    this.#dialogue.draw();

    // Врата UI (поверх всего)
    this.#gateUI.draw();

    // Экран смерти
    if (!this.#player.isAlive) {
      this.#drawDeathScreen();
    }

    d.renderer.endFrame();
  }

  #drawInteractHint() {
    // Показываем подсказку, если игрок рядом с NPC или Вратами
    const room = this.#level.currentRoom;

    for (const npc of room.npcs) {
      if (npc.isPlayerNear() && !npc.isDialogueActive) {
        this.#hud.drawInteractHint(`[E] Говорить с ${npc.displayName}`);
        return;
      }
    }

    if (room.gate) {
      const d = MathUtils.distance(this.#player.x, this.#player.y, room.gate.x, room.gate.y);
      if (d <= 24) {
        this.#hud.drawInteractHint('[E] Взаимодействовать с Вратами');
        return;
      }
    }
  }

  #drawDeathScreen() {
    const d = this.#deps;
    const ctx = d.renderer.ctx;
    const W = d.renderer.logicalWidth;
    const H = d.renderer.logicalHeight;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    ctx.font = 'bold 20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c8a96e';
    ctx.fillText('КЕЙН ПАЛ', W / 2, H / 2 - 8);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#7a6a4a';
    ctx.fillText('F5 — перезагрузить', W / 2, H / 2 + 14);
  }

  // === Для Game ===

  getPlayerPosition() {
    return { x: this.#player.x, y: this.#player.y };
  }

  destroy() {
    for (const unsub of this.#unsubs) unsub();
    this.#unsubs = [];
  }
}
