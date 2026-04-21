// Движок диалоговых деревьев — лёгкая альтернатива inkjs без внешних зависимостей.
// Поддерживает: knots (разделы), lines (текст с контекстными функциями), choices (выборы).
//
// Формат истории (Story): Record<knotId, Knot>
//
// Knot: {
//   lines:    Array<string | (ctx: object) => string>   — строки диалога
//   choices?: Array<{ text: string, next: knotId | null }> — варианты выбора
// }
//
// Если choices отсутствует или пустой — после последней line история заканчивается.
// next: null в выборе тоже завершает историю.

export class DialogueRunner {
  #knots;
  #currentKnot = null;
  #lineIdx = 0;
  #context = {};

  constructor(story) {
    this.#knots = story;
  }

  // Устанавливает контекст для функциональных строк (например, { phase: 'hero' }).
  setContext(ctx) {
    this.#context = ctx ?? {};
  }

  // Начинает (или перезапускает) историю с указанного knot.
  start(knotId = 'start') {
    this.#currentKnot = this.#knots[knotId] ?? null;
    this.#lineIdx = 0;
  }

  // Возвращает текущий шаг без продвижения:
  //   { type: 'line',    text: string }
  //   { type: 'choices', choices: [{text, next}] }
  //   { type: 'end' }
  peek() {
    if (!this.#currentKnot) return { type: 'end' };

    const lines = this.#currentKnot.lines ?? [];
    if (this.#lineIdx < lines.length) {
      const raw = lines[this.#lineIdx];
      const text = typeof raw === 'function' ? raw(this.#context) : raw;
      return { type: 'line', text };
    }

    const choices = this.#currentKnot.choices;
    if (choices?.length) return { type: 'choices', choices };

    return { type: 'end' };
  }

  // Продвигает на следующую строку. Вызывать только когда peek() вернул 'line'.
  advance() {
    if (this.#lineIdx < (this.#currentKnot?.lines?.length ?? 0)) {
      this.#lineIdx++;
    }
  }

  // Выбирает вариант по 0-based индексу. Вызывать только когда peek() вернул 'choices'.
  choose(index) {
    const choices = this.#currentKnot?.choices;
    if (!choices) return;
    const choice = choices[index];
    if (!choice || choice.next === null) {
      this.#currentKnot = null;
      return;
    }
    this.start(choice.next);
  }

  get isEnded() { return !this.#currentKnot || this.peek().type === 'end'; }
}
