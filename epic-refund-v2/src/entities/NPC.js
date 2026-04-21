// Базовый NPC в top-down. Неподвижен, реагирует на близость игрока.
// Поддерживает два режима диалога:
//   - Плоский массив строк (setLines): цикличный режим, обратная совместимость.
//   - DialogueRunner (setRunner): ветвящийся диалог с выборами.

import { MathUtils } from '../utils/MathUtils.js';

export class NPC {
  x = 0;
  y = 0;
  width = 14;
  height = 16;

  id = 'unknown';
  displayName = '???';
  color = '#8888ff';
  typeName = 'npc';

  interactionRange = 28;

  #playerNear = false;
  #dialogueActive = false;
  #dialogueIndex = 0;
  #lines = [];
  #runner = null;

  constructor(x, y, id, displayName) {
    this.x = x;
    this.y = y;
    this.id = id;
    this.displayName = displayName;
  }

  // --- Плоский массив (legacy) ---

  setLines(lines) {
    this.#lines = lines;
    this.#dialogueIndex = 0;
  }

  // --- DialogueRunner ---

  setRunner(runner) {
    this.#runner = runner;
  }

  // Переопределяется подклассами для передачи контекста в runner.
  getRunnerContext() {
    return {};
  }

  // ---

  update(dt, player) {
    const d = MathUtils.distance(this.x, this.y, player.x, player.y);
    this.#playerNear = d <= this.interactionRange;
  }

  interact(eventBus) {
    if (!this.#playerNear) return null;

    if (this.#runner) {
      this.#runner.setContext(this.getRunnerContext());
      this.#runner.start();
      this.#dialogueActive = true;

      // Сбрасываем флаг когда диалог закроется
      const unsub = eventBus.on('npc:dialogueEnd', () => {
        this.#dialogueActive = false;
        unsub();
      });

      eventBus.emit('npc:storyStart', {
        npcId: this.id,
        speaker: this.displayName,
        runner: this.#runner,
      });
      return { type: 'story' };
    }

    // Legacy: плоский массив строк
    if (this.#lines.length === 0) return null;

    const line = this.#lines[this.#dialogueIndex];
    this.#dialogueIndex = (this.#dialogueIndex + 1) % this.#lines.length;

    this.#dialogueActive = true;
    setTimeout(() => { this.#dialogueActive = false; }, 4500);

    eventBus.emit('npc:dialogueStart', {
      npcId: this.id,
      speaker: this.displayName,
      line: line.text,
    });

    return line;
  }

  isPlayerNear() { return this.#playerNear; }
  get isDialogueActive() { return this.#dialogueActive; }
}
