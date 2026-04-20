// Врата Забвения — ключевые точки прогрессии.
// Здесь происходит ритуал потери навыка: не просто меню, а кинематографика.

import { BALANCE } from '../data/balance.js';

// Типы требований Врат
export const GATE_REQUIREMENTS = {
  ATTACK:     'attack',       // Ветки Силы или Магии
  RESILIENCE: 'resilience',  // Ветки Защиты или Ауры
  MOVEMENT:   'movement',    // Ветка Ловкости
  CHOICE:     'choice',      // Любой навык на выбор
  GREED:      'greed',       // Два навыка из разных веток (редкие)
};

// Типы Врат по количеству жертв
export const GATE_SIZES = {
  MINOR: 'minor',   // 1 навык
  MAJOR: 'major',   // 2 навыка
  GREAT: 'great',   // 3 навыка (перед боссами)
};

export class GateSystem {
  #eventBus;
  #skillTree;

  // Текущие активные Врата (если игрок у них стоит)
  #activeGate = null;
  #sacrificesRemaining = 0;
  #pendingSacrifices = [];

  constructor(eventBus, skillTree) {
    this.#eventBus = eventBus;
    this.#skillTree = skillTree;
  }

  // Игрок подходит к Вратам
  approach(gateData, currentLevel) {
    const { id, requirement, size } = gateData;
    const count = this.#getSacrificeCount(size);
    const removable = this.#skillTree.getRemovableSkills(requirement);

    if (removable.length < count) {
      // Недостаточно удаляемых навыков (не должно происходить при правильном дизайне уровней)
      console.warn(`[GateSystem] Недостаточно навыков для Врат ${id}`);
      return false;
    }

    this.#activeGate = { ...gateData, currentLevel };
    this.#sacrificesRemaining = count;
    this.#pendingSacrifices = [];

    this.#eventBus.emit('gate:approach', {
      gateId: id,
      requirement,
      size,
      count,
      removableSkills: removable,
    });

    return true;
  }

  // Игрок выбирает навык для жертвы
  sacrifice(skillId) {
    if (!this.#activeGate) return false;
    if (this.#sacrificesRemaining <= 0) return false;

    const { requirement } = this.#activeGate;
    const removable = this.#skillTree.getRemovableSkills(requirement);
    const canSacrifice = removable.some(s => s.id === skillId);

    if (!canSacrifice) {
      console.warn(`[GateSystem] Навык ${skillId} не подходит для этих Врат`);
      return false;
    }

    // Совершаем жертву
    const result = this.#skillTree.removeSkill(skillId, this.#activeGate.currentLevel);
    this.#pendingSacrifices.push(skillId);
    this.#sacrificesRemaining--;

    this.#eventBus.emit('gate:sacrifice', {
      gateId: this.#activeGate.id,
      skillId,
      skillName: result.skill.name,
      branch: result.skill.branch,
      sacrificesRemaining: this.#sacrificesRemaining,
      echo: result.echo,
    });

    // Если все жертвы принесены — Врата открываются
    if (this.#sacrificesRemaining <= 0) {
      this.#openGate();
    }

    return true;
  }

  #openGate() {
    const gate = this.#activeGate;
    this.#eventBus.emit('gate:open', {
      gateId: gate.id,
      sacrifices: [...this.#pendingSacrifices],
    });

    this.#activeGate = null;
    this.#pendingSacrifices = [];
  }

  // Игрок отошёл от Врат (например, нажал Escape)
  cancel() {
    if (!this.#activeGate) return;
    this.#eventBus.emit('gate:cancel', { gateId: this.#activeGate.id });
    // Уже совершённые жертвы НЕ отменяются — потеря необратима
    this.#activeGate = null;
    this.#pendingSacrifices = [];
  }

  isActive() {
    return this.#activeGate !== null;
  }

  getActiveGate() {
    return this.#activeGate;
  }

  getSacrificesRemaining() {
    return this.#sacrificesRemaining;
  }

  getRemovableForCurrentGate() {
    if (!this.#activeGate) return [];
    return this.#skillTree.getRemovableSkills(this.#activeGate.requirement);
  }

  #getSacrificeCount(size) {
    switch (size) {
      case GATE_SIZES.MINOR: return 1;
      case GATE_SIZES.MAJOR: return 2;
      case GATE_SIZES.GREAT: return 3;
      default: return 1;
    }
  }
}
