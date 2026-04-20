// Диалоги на Canvas. Реагирует на npc:dialogueStart и player:speaks.
// Во время диалога игра не останавливается, но ввод игроком блокируется (в GameScene).

const TYPEWRITER_CPS = 45;      // Символов в секунду
const BOX_HEIGHT = 54;
const BOX_MARGIN = 8;

export class DialogueSystem {
  #renderer;
  #eventBus;

  #active = false;
  #fullText = '';
  #currentText = '';
  #speaker = '';
  #typeTimer = 0;
  #autoCloseTimer = 0;

  constructor(renderer, eventBus) {
    this.#renderer = renderer;
    this.#eventBus = eventBus;

    eventBus.on('npc:dialogueStart', ({ speaker, line }) => this.show(speaker, line));
    eventBus.on('player:speaks', ({ line, duration }) => this.show('Кейн', line, duration));
  }

  show(speaker, text, autoClose = 4) {
    this.#active = true;
    this.#fullText = text ?? '';
    this.#currentText = '';
    this.#speaker = speaker;
    this.#typeTimer = 0;
    this.#autoCloseTimer = autoClose;
  }

  hide() {
    this.#active = false;
    this.#eventBus.emit('npc:dialogueEnd', {});
  }

  update(dt, input) {
    if (!this.#active) return;

    // Печать
    if (this.#currentText.length < this.#fullText.length) {
      this.#typeTimer += dt;
      const target = Math.floor(this.#typeTimer * TYPEWRITER_CPS);
      this.#currentText = this.#fullText.slice(0, Math.min(target, this.#fullText.length));

      // E пропускает печать
      if (input.isPressed('interact')) {
        this.#currentText = this.#fullText;
      }
    } else {
      // Печать завершена — ждём автозакрытия или E
      this.#autoCloseTimer -= dt;
      if (input.isPressed('interact') || this.#autoCloseTimer <= 0) {
        this.hide();
      }
    }
  }

  draw() {
    if (!this.#active) return;
    const ctx = this.#renderer.ctx;
    const W = this.#renderer.logicalWidth;
    const H = this.#renderer.logicalHeight;

    const boxX = BOX_MARGIN;
    const boxY = H - BOX_HEIGHT - BOX_MARGIN;
    const boxW = W - BOX_MARGIN * 2;

    // Фон
    ctx.fillStyle = 'rgba(10, 8, 5, 0.92)';
    ctx.fillRect(boxX, boxY, boxW, BOX_HEIGHT);

    // Рамка
    ctx.strokeStyle = '#c8a96e';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, BOX_HEIGHT - 1);

    // Внутренняя рамка
    ctx.strokeStyle = 'rgba(106, 74, 42, 0.5)';
    ctx.strokeRect(boxX + 2.5, boxY + 2.5, boxW - 5, BOX_HEIGHT - 5);

    // Говорящий
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#c8a96e';
    ctx.fillText(this.#speaker, boxX + 6, boxY + 6);

    // Текст с переносами
    ctx.font = '9px monospace';
    ctx.fillStyle = '#eee';
    const textX = boxX + 6;
    const textY = boxY + 20;
    const maxW = boxW - 12;
    this.#wrapText(ctx, this.#currentText, textX, textY, maxW, 11);

    // Подсказка [E]
    if (this.#currentText === this.#fullText) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 250);
      ctx.globalAlpha = pulse;
      ctx.font = '7px monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#7a6a4a';
      ctx.fillText('[E] далее', boxX + boxW - 6, boxY + BOX_HEIGHT - 10);
      ctx.globalAlpha = 1;
    }
  }

  #wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let curY = y;

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line) {
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
