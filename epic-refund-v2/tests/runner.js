// Запускаемые тесты без vitest: node tests/runner.js
// Используется пока npm install недоступен.

let passed = 0, failed = 0;
const failures = [];
let currentTest = null;

function fail(msg) {
  failed++;
  const full = currentTest ? `${currentTest}: ${msg}` : msg;
  failures.push(full);
  throw new Error(msg);
}

function expect(val) {
  return {
    toBe: (ex) => val === ex ? passed++ : fail(`expected ${ex}, got ${val}`),
    toBeGreaterThan: (n) => val > n ? passed++ : fail(`${val} > ${n}`),
    toBeLessThanOrEqual: (n) => val <= n ? passed++ : fail(`${val} <= ${n}`),
    toContain: (item) => {
      const ok = Array.isArray(val) ? val.includes(item) :
                 typeof val === 'string' ? val.includes(item) : false;
      ok ? passed++ : fail(`${JSON.stringify(val)} does not contain ${item}`);
    },
  };
}

function toThrow(fn) {
  try { fn(); fail('expected throw'); }
  catch (e) {
    if (e.message === 'expected throw') throw e;
    passed++;
  }
}

function describe(name, fn) {
  console.log(`\n[${name}]`);
  fn();
}

function it(name, fn) {
  currentTest = name;
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
  }
  currentTest = null;
}

// === Импорты ===
const { EventBus } = await import('../src/core/EventBus.js');
const { SkillTree } = await import('../src/systems/SkillTree.js');
const { CombatSystem } = await import('../src/systems/CombatSystem.js');
const { EchoSystem } = await import('../src/systems/EchoSystem.js');
const { FearSystem } = await import('../src/systems/FearSystem.js');
const { WeightSystem } = await import('../src/systems/WeightSystem.js');
const { GateSystem, GATE_REQUIREMENTS } = await import('../src/systems/GateSystem.js');
const { TOTAL_SKILLS } = await import('../src/data/skills.js');
const { pickKaneLine } = await import('../src/data/dialogues/kane_dialogues.js');
const { createLevel01 } = await import('../src/levels/Level01_RottenPeak.js');
const { createLevel02 } = await import('../src/levels/Level02_Barracks.js');

function makeLevelSystems() {
  const bus = new EventBus();
  return {
    eventBus: bus,
    skillTree: new SkillTree(bus),
    fearSystem: new FearSystem(),
    gateSystem: null,
  };
}

function assertRoomGraphIntact(level) {
  for (const [, room] of level.rooms) {
    for (const door of room.doors) {
      if (!level.rooms.has(door.toRoomId)) {
        fail(`битая ссылка из ${room.id}: ${door.toRoomId}`);
      }
    }
  }
}

// =========================================================================

describe('EventBus', () => {
  it('вызывает подписчиков', () => {
    const bus = new EventBus();
    let count = 0;
    bus.on('x', () => count++);
    bus.emit('x');
    bus.emit('x');
    expect(count).toBe(2);
  });

  it('отписка через возвращённый unsub', () => {
    const bus = new EventBus();
    let count = 0;
    const unsub = bus.on('x', () => count++);
    bus.emit('x');
    unsub();
    bus.emit('x');
    expect(count).toBe(1);
  });

  it('clear очищает все подписки', () => {
    const bus = new EventBus();
    let c1 = 0, c2 = 0;
    bus.on('a', () => c1++);
    bus.on('b', () => c2++);
    bus.clear();
    bus.emit('a'); bus.emit('b');
    expect(c1).toBe(0);
    expect(c2).toBe(0);
  });
});

describe('SkillTree', () => {
  it('стартует с 20 активными навыками', () => {
    expect(TOTAL_SKILLS).toBe(20);
    const tree = new SkillTree(new EventBus());
    expect(tree.getActiveSkillCount()).toBe(20);
  });

  it('листовой навык можно удалить', () => {
    const tree = new SkillTree(new EventBus());
    expect(tree.canRemove('str_t4')).toBe(true);
    expect(tree.canRemove('str_base')).toBe(false);
  });

  it('удаление активирует эхо и уменьшает счётчик', () => {
    const tree = new SkillTree(new EventBus());
    tree.removeSkill('str_t4', 2);
    expect(tree.getActiveSkillCount()).toBe(19);
    expect(tree.isEchoActive('str_t4')).toBe(true);
    expect(tree.isActive('str_t4')).toBe(false);
  });

  it('предыдущий навык становится удаляемым', () => {
    const tree = new SkillTree(new EventBus());
    tree.removeSkill('str_t4', 2);
    expect(tree.canRemove('str_t3')).toBe(true);
  });

  it('повторное удаление бросает ошибку', () => {
    const tree = new SkillTree(new EventBus());
    tree.removeSkill('str_t4', 2);
    toThrow(() => tree.removeSkill('str_t4', 2));
  });

  it('эмитит событие skill:lost', () => {
    const bus = new EventBus();
    const tree = new SkillTree(bus);
    let ev = null;
    bus.on('skill:lost', (d) => ev = d);
    tree.removeSkill('str_t4', 2);
    expect(ev.skillId).toBe('str_t4');
    expect(ev.remainingCount).toBe(19);
    expect(ev.branch).toBe('strength');
  });

  it('фильтрует по требованию Врат', () => {
    const tree = new SkillTree(new EventBus());
    const attack = tree.getRemovableSkills('attack');
    expect(attack.every(s => s.branch === 'strength' || s.branch === 'magic')).toBe(true);

    const move = tree.getRemovableSkills('movement');
    expect(move.every(s => s.branch === 'agility')).toBe(true);

    const any = tree.getRemovableSkills('any');
    expect(any.length).toBe(5);  // По одному листу с каждой ветки
  });

  it('фазы переключаются по количеству навыков', () => {
    const tree = new SkillTree(new EventBus());
    expect(tree.getPlayerPhase()).toBe('god');

    // Удаляем до veteran (11 скиллов)
    const leaves = ['str_t4', 'mag_t4', 'def_t4', 'agi_t4', 'aur_t4',
                    'str_t3', 'mag_t3', 'def_t3', 'agi_t3'];
    for (const id of leaves) tree.removeSkill(id, 2);
    expect(tree.getActiveSkillCount()).toBe(11);
    expect(tree.getPlayerPhase()).toBe('veteran');
  });

  it('serialize/deserialize сохраняет состояние', () => {
    const tree1 = new SkillTree(new EventBus());
    tree1.removeSkill('str_t4', 2);
    tree1.removeSkill('mag_t4', 2);

    const data = tree1.serialize();
    const tree2 = new SkillTree(new EventBus());
    tree2.deserialize(data);

    expect(tree2.getActiveSkillCount()).toBe(18);
    expect(tree2.isEchoActive('str_t4')).toBe(true);
    expect(tree2.isActive('str_base')).toBe(true);
  });
});

describe('CombatSystem', () => {
  const c = new CombatSystem(new EventBus());
  const E = { meleeDamageMultiplier: 1.0, knockbackOnHit: 0 };

  it('базовый урон = базовому', () => {
    expect(c.calculatePlayerDamage({ baseDamage: 15, echoBonuses: E })).toBe(15);
  });

  it('комбо умножает урон', () => {
    expect(c.calculatePlayerDamage({ baseDamage: 10, comboIndex: 0, echoBonuses: E })).toBe(10);
    expect(c.calculatePlayerDamage({ baseDamage: 10, comboIndex: 1, echoBonuses: E })).toBe(12);
    expect(c.calculatePlayerDamage({ baseDamage: 10, comboIndex: 2, echoBonuses: E })).toBe(15);
  });

  it('backstab x3', () => {
    expect(c.calculatePlayerDamage({ baseDamage: 10, backstabMultiplier: 3, echoBonuses: E })).toBe(30);
  });

  it('минимальный урон = 1', () => {
    expect(c.calculatePlayerDamage({ baseDamage: 5, targetArmor: 100, echoBonuses: E })).toBe(1);
  });

  it('заморозка +50%', () => {
    expect(c.calculatePlayerDamage({ baseDamage: 10, targetFrozen: true, echoBonuses: E })).toBe(15);
  });

  it('броня снижает входящий урон', () => {
    const r = c.calculateDamageToPlayer({ baseDamage: 20, armorReduction: 0.3 });
    expect(r.damage).toBe(14);
  });

  it('идеальное парирование отражает 50%', () => {
    const r = c.calculateDamageToPlayer({ baseDamage: 50, parrySuccess: true, parryPerfect: true });
    expect(r.damage).toBe(0);
    expect(r.reflected).toBe(25);
  });

  it('магический щит поглощает весь урон', () => {
    const r = c.calculateDamageToPlayer({ baseDamage: 100, shieldActive: true, shieldCharges: 3 });
    expect(r.damage).toBe(0);
    expect(r.shieldChargeConsumed).toBe(true);
  });

  it('окно парирования', () => {
    expect(c.checkParry(0.05, true).perfect).toBe(true);
    expect(c.checkParry(0.05, true).success).toBe(true);
    expect(c.checkParry(0.15, true).success).toBe(true);
    expect(c.checkParry(0.3, true).success).toBe(false);
    expect(c.checkParry(0.05, false).success).toBe(false);
  });
});

describe('EchoSystem', () => {
  it('без потерь — базовые значения', () => {
    const tree = new SkillTree(new EventBus());
    const echo = new EchoSystem(tree);
    expect(echo.getPassiveBonuses().meleeDamageMultiplier).toBe(1.0);
    expect(echo.hasEcho('echo_blade')).toBe(false);
  });

  it('эхо применяется при потере навыка', () => {
    const tree = new SkillTree(new EventBus());
    const echo = new EchoSystem(tree);
    tree.removeSkill('str_t4', 1);
    expect(echo.hasEcho('echo_dance')).toBe(true);
    expect(echo.getPassiveBonuses().attackSpeedBonusOnKill).toBe(1.1);
  });

  it('несколько эхо одновременно', () => {
    const tree = new SkillTree(new EventBus());
    const echo = new EchoSystem(tree);
    tree.removeSkill('str_t4', 1);
    tree.removeSkill('str_t3', 1);
    tree.removeSkill('str_t2', 1);
    tree.removeSkill('str_base', 1);
    const b = echo.getPassiveBonuses();
    expect(b.meleeDamageMultiplier).toBe(1.05);  // echo_blade
    expect(b.knockbackOnHit).toBeGreaterThan(0); // echo_vortex
  });
});

describe('FearSystem', () => {
  it('угроза складывается из навыков и бонусов', () => {
    const fear = new FearSystem();
    const tree = new SkillTree(new EventBus());
    const p = { hp: 100, maxHP: 100 };
    // 20 + str_t4(+2) + def_t4(+2) + aur_t3(+3) = 27
    expect(fear.calculateThreat(tree, p)).toBe(27);
  });

  it('штраф за низкое HP', () => {
    const fear = new FearSystem();
    const tree = new SkillTree(new EventBus());
    expect(fear.calculateThreat(tree, { hp: 25, maxHP: 100 })).toBe(24);  // 27 - 3
    expect(fear.calculateThreat(tree, { hp: 5, maxHP: 100 })).toBe(22);   // 27 - 5
  });

  it('слизь боится при любой угрозе', () => {
    const fear = new FearSystem();
    expect(fear.isFearful({ fearThreshold: 2 }, 27)).toBe(true);
    expect(fear.evaluateBehavior({ fearThreshold: 2 }, 27)).toBe('panic');
  });

  it('поведение переключается по угрозе', () => {
    const fear = new FearSystem();
    const skeleton = { fearThreshold: 8 };
    expect(fear.evaluateBehavior(skeleton, 20)).toBe('panic');     // 20 >= 16
    expect(fear.evaluateBehavior(skeleton, 10)).toBe('cautious');  // 10 >= 8
    expect(fear.evaluateBehavior(skeleton, 5)).toBe('normal');     // 5 >= 4
    expect(fear.evaluateBehavior(skeleton, 2)).toBe('aggressive'); // 2 < 4
  });
});

describe('WeightSystem', () => {
  it('категории по процентам', () => {
    const w = new WeightSystem(new EventBus());
    expect(w.getCategory()).toBe('light');
    w.addWeight(25); expect(w.getCategory()).toBe('light');
    w.addWeight(20); expect(w.getCategory()).toBe('medium');
    w.addWeight(20); expect(w.getCategory()).toBe('heavy');
    w.addWeight(30); expect(w.getCategory()).toBe('overload');
  });

  it('overload блокирует прыжок', () => {
    const w = new WeightSystem(new EventBus());
    w.addWeight(95);
    expect(w.canJump()).toBe(false);
    expect(w.breaksBridges()).toBe(true);
  });

  it('removeWeight снижает категорию', () => {
    const w = new WeightSystem(new EventBus());
    w.addWeight(95);
    w.removeWeight(50);
    expect(w.getCategory()).toBe('medium');
    expect(w.canJump()).toBe(true);
  });
});

describe('GateSystem', () => {
  it('approach активирует врата', () => {
    const bus = new EventBus();
    const tree = new SkillTree(bus);
    const gate = new GateSystem(bus, tree);
    expect(gate.isActive()).toBe(false);

    gate.approach({ id: 'g1', requirement: GATE_REQUIREMENTS.ATTACK, size: 'minor' }, 2);
    expect(gate.isActive()).toBe(true);
    expect(gate.getSacrificesRemaining()).toBe(1);
  });

  it('sacrifice удаляет навык и открывает врата', () => {
    const bus = new EventBus();
    const tree = new SkillTree(bus);
    const gate = new GateSystem(bus, tree);

    let opened = false;
    bus.on('gate:open', () => opened = true);

    gate.approach({ id: 'g1', requirement: GATE_REQUIREMENTS.ATTACK, size: 'minor' }, 2);
    gate.sacrifice('str_t4');

    expect(opened).toBe(true);
    expect(tree.isActive('str_t4')).toBe(false);
    expect(gate.isActive()).toBe(false);
  });

  it('major врата требуют 2 жертвы', () => {
    const bus = new EventBus();
    const tree = new SkillTree(bus);
    const gate = new GateSystem(bus, tree);

    gate.approach({ id: 'g', requirement: GATE_REQUIREMENTS.ATTACK, size: 'major' }, 2);
    expect(gate.getSacrificesRemaining()).toBe(2);

    gate.sacrifice('str_t4');
    expect(gate.isActive()).toBe(true);  // Ещё активны
    expect(gate.getSacrificesRemaining()).toBe(1);

    gate.sacrifice('mag_t4');
    expect(gate.isActive()).toBe(false); // Закрыты
  });

  it('sacrifice не принимает неподходящий навык', () => {
    const bus = new EventBus();
    const tree = new SkillTree(bus);
    const gate = new GateSystem(bus, tree);

    gate.approach({ id: 'g', requirement: GATE_REQUIREMENTS.ATTACK, size: 'minor' }, 2);
    // agi_t4 — ловкость, не подходит для attack
    const result = gate.sacrifice('agi_t4');
    expect(result).toBe(false);
    expect(tree.isActive('agi_t4')).toBe(true);
  });
});

describe('Level01_RottenPeak', () => {
  it('createLevel01 возвращает уровень с 5 комнатами', () => {
    const level = createLevel01(makeLevelSystems());
    expect(level.levelNumber).toBe(1);
    expect(level.rooms.size).toBe(5);
  });

  it('стартовая комната — l1_room_01, мирная и зачищена', () => {
    const level = createLevel01(makeLevelSystems());
    expect(level.currentRoomId).toBe('l1_room_01');
    const start = level.currentRoom;
    expect(start.enemies.length).toBe(0);
    expect(start.isCleared).toBe(true);
  });

  it('l1_room_04 имеет Врата с требованием choice', () => {
    const level = createLevel01(makeLevelSystems());
    const gateRoom = level.rooms.get('l1_room_04');
    expect(gateRoom.gate !== null).toBe(true);
    expect(gateRoom.gate.requirement).toBe('choice');
    expect(gateRoom.gate.size).toBe('minor');
  });

  it('все двери ведут в существующие комнаты', () => {
    const level = createLevel01(makeLevelSystems());
    assertRoomGraphIntact(level);
  });

  it('минимап-раскладка определена для всех комнат', () => {
    const level = createLevel01(makeLevelSystems());
    expect(level.minimapLayout !== null).toBe(true);
    for (const id of level.rooms.keys()) {
      expect(level.minimapLayout[id] !== undefined).toBe(true);
    }
  });
});

describe('Level02_Barracks', () => {
  it('createLevel02 возвращает уровень с 7 комнатами', () => {
    const level = createLevel02(makeLevelSystems());
    expect(level.levelNumber).toBe(2);
    expect(level.rooms.size).toBe(7);
    expect(level.currentRoomId).toBe('l2_room_01');
  });

  it('все двери ведут в существующие комнаты', () => {
    const level = createLevel02(makeLevelSystems());
    assertRoomGraphIntact(level);
  });

  it('минимап-раскладка определена для всех комнат', () => {
    const level = createLevel02(makeLevelSystems());
    expect(level.minimapLayout !== null).toBe(true);
    for (const id of level.rooms.keys()) {
      expect(level.minimapLayout[id] !== undefined).toBe(true);
    }
  });
});

describe('KaneDialogues', () => {
  it('pickKaneLine возвращает реплику для существующей категории', () => {
    const line = pickKaneLine('skillAttempt', 'all', 'god');
    expect(typeof line === 'string' && line.length > 0).toBe(true);
  });

  it('все 5 фаз имеют реплики для skillAttempt', () => {
    const phases = ['god', 'hero', 'veteran', 'survivor', 'nobody'];
    for (const p of phases) {
      const line = pickKaneLine('skillAttempt', 'all', p);
      expect(typeof line === 'string').toBe(true);
    }
  });
});

// ===== ИТОГ =====

console.log(`\n${'='.repeat(50)}`);
console.log(`Результат: ${passed} ✓  ${failed} ✗`);
if (failures.length) {
  console.log('\nНеудачи:');
  failures.forEach(f => console.log(`  - ${f}`));
}
process.exit(failed > 0 ? 1 : 0);
