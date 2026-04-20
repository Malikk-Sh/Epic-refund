// ГЛАВНАЯ МЕХАНИКА ИГРЫ.
// Хранит состояние всех навыков. Применяет правила обрезки.
// Общается с миром только через EventBus.

import { EventBus } from '../core/EventBus.js';
import { SKILLS, TOTAL_SKILLS } from '../data/skills.js';

export class SkillTree {
  #skills = new Map();      // skillId → { ...data, active, echoActive, lostAtLevel, lostOrder }
  #lostOrder = [];          // История потерь — порядок важен для нарратива
  #eventBus;

  constructor(eventBus) {
    this.#eventBus = eventBus;
    this.#initializeSkills();
  }

  #initializeSkills() {
    for (const [id, data] of Object.entries(SKILLS)) {
      this.#skills.set(id, {
        ...data,
        active: true,
        echoActive: false,
        lostAtLevel: null,
        lostOrder: null,
      });
    }
  }

  // ===== ЗАПРОСЫ СОСТОЯНИЯ =====

  isActive(skillId) {
    return this.#skills.get(skillId)?.active ?? false;
  }

  isEchoActive(skillId) {
    return this.#skills.get(skillId)?.echoActive ?? false;
  }

  getActiveSkillCount() {
    let count = 0;
    for (const skill of this.#skills.values()) {
      if (skill.active) count++;
    }
    return count;
  }

  getActiveSkills() {
    const result = [];
    for (const [id, skill] of this.#skills) {
      if (skill.active) result.push({ id, ...skill });
    }
    return result;
  }

  getActiveEchoes() {
    const result = [];
    for (const [id, skill] of this.#skills) {
      if (skill.echoActive && skill.echo) {
        result.push({ ...skill.echo, sourceSkillId: id, branch: skill.branch });
      }
    }
    return result;
  }

  getLostSkillsCount() {
    return this.#lostOrder.length;
  }

  getLostOrder() {
    return [...this.#lostOrder];
  }

  // ===== ПРАВИЛА УДАЛЕНИЯ =====

  // Навык можно удалить если ВСЕ его зависимые навыки (выше по ветке) уже удалены.
  canRemove(skillId) {
    const skill = this.#skills.get(skillId);
    if (!skill || !skill.active) return false;

    // Проверяем прямые зависимые
    for (const depId of skill.dependents) {
      if (this.#skills.get(depId)?.active) return false;
    }

    return true;
  }

  // Возвращает удаляемые навыки для данного требования Врат
  getRemovableSkills(requirement) {
    const result = [];
    for (const [id, skill] of this.#skills) {
      if (!skill.active) continue;
      if (!this.canRemove(id)) continue;

      const matchesBranch =
        requirement === 'any' ||
        requirement === 'choice' ||
        skill.branch === requirement ||
        // Врата Силы принимают strength или magic
        (requirement === 'attack' && (skill.branch === 'strength' || skill.branch === 'magic')) ||
        // Врата Стойкости принимают defense или aura
        (requirement === 'resilience' && (skill.branch === 'defense' || skill.branch === 'aura')) ||
        // Врата Движения принимают agility
        (requirement === 'movement' && skill.branch === 'agility');

      if (matchesBranch) {
        result.push({ id, ...skill });
      }
    }
    return result;
  }

  // ===== УДАЛЕНИЕ НАВЫКА =====

  removeSkill(skillId, currentLevel) {
    if (!this.canRemove(skillId)) {
      throw new Error(`[SkillTree] Невозможно удалить навык: ${skillId}`);
    }

    const skill = this.#skills.get(skillId);
    const lostIndex = this.#lostOrder.length;

    skill.active = false;
    skill.echoActive = true;
    skill.lostAtLevel = currentLevel;
    skill.lostOrder = lostIndex;

    this.#lostOrder.push(skillId);

    this.#eventBus.emit('skill:lost', {
      skillId,
      skillName: skill.name,
      branch: skill.branch,
      tier: skill.tier,
      remainingCount: this.getActiveSkillCount(),
      totalLost: lostIndex + 1,
      echo: skill.echo,
      isUltima: skill.isUltima ?? false,
    });

    return { echo: skill.echo, skill };
  }

  // Определяет текущую "фазу" игрока по количеству навыков
  getPlayerPhase() {
    const count = this.getActiveSkillCount();
    if (count >= 17) return 'god';
    if (count >= 12) return 'hero';
    if (count >= 7)  return 'veteran';
    if (count >= 3)  return 'survivor';
    return 'nobody';
  }

  // Пытается классифицировать "путь" прохождения
  detectPath() {
    const lost = this.#lostOrder;
    if (lost.length < 3) return 'unknown';

    const branches = lost.map(id => this.#skills.get(id)?.branch);
    const firstBranch = branches[0];

    if (firstBranch === 'magic') return 'warrior';    // Первой убрана магия
    if (firstBranch === 'strength') return 'mage';    // Первой убрана сила
    if (branches.slice(0, 3).includes('agility')) return 'shadow';
    if (firstBranch === 'agility' || firstBranch === 'strength') return 'stoic';
    return 'phoenix';
  }

  // ===== СЕРИАЛИЗАЦИЯ =====

  serialize() {
    const skills = {};
    for (const [id, skill] of this.#skills) {
      skills[id] = {
        active: skill.active,
        echoActive: skill.echoActive,
        lostAtLevel: skill.lostAtLevel,
        lostOrder: skill.lostOrder,
      };
    }
    return { skills, lostOrder: [...this.#lostOrder] };
  }

  deserialize(data) {
    for (const [id, state] of Object.entries(data.skills)) {
      const skill = this.#skills.get(id);
      if (skill) {
        skill.active = state.active;
        skill.echoActive = state.echoActive;
        skill.lostAtLevel = state.lostAtLevel;
        skill.lostOrder = state.lostOrder;
      }
    }
    this.#lostOrder = [...data.lostOrder];
  }
}
