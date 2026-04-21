// Диалоги на Canvas.
// Два режима:
//   «Монолог» — show(speaker, text, autoClose): одна реплика с автозакрытием (Кейн, события).
//   «История» — startRunner(speaker, runner): ветвящийся диалог с выборами [1][2][3].
//
// Во время диалога ввод игроком блокируется в GameScene.

const TYPEWRITER_CPS  = 45;     // Символов в секунду
const BOX_MARGIN      = 8;
const BOX_HEIGHT      = 54;     // Высота без выборов
const CHOICE_PAD_TOP  = 6;      // Отступ между текстом и первым выбором
const CHOICE_LINE_H   = 11;     // Высота строки выбора

export class DialogueSystem {
  #renderer;
  #eventBus;

  // Состояние печати
  #active       = false;
  #fullText     = '';
  #currentText  = '';
  #speaker      = '';
  #typeTimer    = 0;

  // Режим «монолог»
  #autoCloseTimer = 0;

  // Режим «история» (DialogueRunner)
  #runner      = null;
  #choiceMode  = false;
  #choices     = [];

  constructor(renderer, eventBus) {
    this.#renderer  = renderer;
    this.#eventBus  = eventBus;

    eventBus.on('npc:dialogueStart', ({ speaker, line }) => this.show(speaker, line));
    eventBus.on('player:speaks',     ({ line, duration }) => this.show('Кейн', line, duration));
    eventBus.on('npc:storyStart',    ({ speaker, runner }) => this.startRunner(speaker, runner));
  }

  // === Режим «монолог» — одна реплика ===

  show(speaker, text, autoClose = 4) {
    this.#runner     = null;
    this.#choiceMode = false;
    this.#choices    = [];
    this.#active     = true;
    this.#fullText   = text ?? '';
    this.#currentText = '';
    this.#speaker    = speaker;
    this.#typeTimer  = 0;
    this.#autoCloseTimer = autoClose;
  }

  // === Режим «история» — DialogueRunner ===

  startRunner(speaker, runner) {
    this.#runner     = runner;
    this.#speaker    = speaker;
    this.#active     = true;
    this.#choiceMode = false;
    this.#choices    = [];
    this.#advanceRunner();
  }

  // Читает следующий шаг из runner и обновляет состояние.
  #advanceRunner() {
    const step = this.#runner.peek();

    if (step.type === 'line') {
      this.#fullText    = step.text;
      this.#currentText = '';
      this.#typeTimer   = 0;
      this.#choiceMode  = false;
      this.#choices     = [];
      this.#runner.advance();

    } else if (step.type === 'choices') {
      this.#choiceMode = true;
      this.#choices    = step.choices;

    } else {
      // 'end'
      this.#runner = null;
      this.hide();
    }
  }

  // === Общее ===

  hide() {
    this.#active     = false;
    this.#runner     = null;
    this.#choiceMode = false;
    this.#choices    = [];
    this.#eventBus.emit('npc:dialogueEnd', {});
  }

  update(dt, input) {
    if (!this.#active) return;

    // --- Идёт печать ---
    if (this.#currentText.length < this.#fullText.length) {
      this.#typeTimer += dt;
      const target = Math.floor(this.#typeTimer * TYPEWRITER_CPS);
      this.#currentText = this.#fullText.slice(0, Math.min(target, this.#fullText.length));

      // [E] пропускает печать
      if (input.isPressed('interact')) this.#currentText = this.#fullText;
      return;
    }

    // --- Печать завершена ---

    if (this.#choiceMode) {
      // Ожидание цифровых клавиш [1]-[4]
      for (let i = 0; i < this.#choices.length && i < 4; i++) {
        if (input.isPressed(`choice${i + 1}`)) {
          this.#runner.choose(i);
          this.#choiceMode = false;
          this.#choices    = [];
          if (this.#runner.isEnded) {
            this.#runner = null;
            this.hide();
          } else {
            this.#advanceRunner();
          }
          return;
        }
      }
      return;
    }

    if (this.#runner) {
      // Режим истории — [E] переходит к следующей строке
      if (input.isPressed('interact')) this.#advanceRunner();
    } else {
      // Режим монолога — автозакрытие или [E]
      this.#autoCloseTimer -= dt;
      if (input.isPressed('interact') || this.#autoCloseTimer <= 0) this.hide();
    }
  }

  draw() {
    if (!this.#active) return;
    const ctx  = this.#renderer.ctx;
    const W    = this.#renderer.logicalWidth;
    const H    = this.#renderer.logicalHeight;

    // Высота бокса увеличивается при выборах
    const extraH = this.#choiceMode
      ? CHOICE_PAD_TOP + this.#choices.length * CHOICE_LINE_H + 4
      : 0;
    const BOX_H = BOX_HEIGHT + extraH;

    const boxX = BOX_MARGIN;
    const boxY = H - BOX_H - BOX_MARGIN;
    const boxW = W - BOX_MARGIN * 2;

    // Фон
    ctx.fillStyle = 'rgba(10, 8, 5, 0.92)';
    ctx.fillRect(boxX, boxY, boxW, BOX_H);

    // Внешняя рамка
    ctx.strokeStyle = '#c8a96e';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, BOX_H - 1);

    // Внутренняя рамка
    ctx.strokeStyle = 'rgba(106, 74, 42, 0.5)';
    ctx.strokeRect(boxX + 2.5, boxY + 2.5, boxW - 5, BOX_H - 5);

    // Говорящий
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#c8a96e';
    ctx.fillText(this.#speaker, boxX + 6, boxY + 6);

    // Текст диалога с переносами
    ctx.font = '9px monospace';
    ctx.fillStyle = '#eee';
    this.#wrapText(ctx, this.#currentText, boxX + 6, boxY + 20, boxW - 12, 11);

    if (this.#choiceMode && this.#choices.length > 0) {
      // Разделитель между текстом и выборами
      const sepY = boxY + BOX_HEIGHT - 2;
      ctx.strokeStyle = 'rgba(106, 74, 42, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(boxX + 6,        sepY);
      ctx.lineTo(boxX + boxW - 6, sepY);
      ctx.stroke();

      // Варианты выбора
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      for (let i = 0; i < this.#choices.length && i < 4; i++) {
        const cy = sepY + CHOICE_PAD_TOP + i * CHOICE_LINE_H;
        ctx.fillStyle = '#c8a96e';
        ctx.fillText(`[${i + 1}]`, boxX + 6, cy);
        ctx.fillStyle = '#ddd';
        ctx.fillText(this.#choices[i].text, boxX + 24, cy);
      }

    } else if (this.#currentText === this.#fullText) {
      // Подсказка «продолжить»
      const hintText = this.#runner ? '[E] продолжить' : '[E] далее';
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 250);
      ctx.globalAlpha = pulse;
      ctx.font = '7px monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#7a6a4a';
      ctx.fillText(hintText, boxX + boxW - 6, boxY + BOX_H - 10);
      ctx.globalAlpha = 1;
    }
  }

  #wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let curY = y;

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, curY);
        line = word;
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) ctx.fillText(line, x, curY);
  }

  get isActive() { return this.#active; }
}
