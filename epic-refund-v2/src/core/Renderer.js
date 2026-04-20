// Canvas 2D Renderer с адаптивным letterbox-масштабированием.
// Логический размер viewport фиксирован — физический canvas растягивается под экран.
//
// Ключевая идея: игровая логика работает в "логических" координатах (768×432),
// а рендер масштабирует это под реальный размер окна с сохранением пропорций.

export class Renderer {
  #canvas;
  #ctx;

  // Логический размер игрового viewport — неизменный
  #logicalWidth = 768;
  #logicalHeight = 432;

  // Текущий коэффициент масштабирования под физический canvas
  #scale = 1;

  // Отступы для letterbox
  #offsetX = 0;
  #offsetY = 0;

  constructor(canvas) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');
    this.#ctx.imageSmoothingEnabled = false;

    this.#resize();
    window.addEventListener('resize', () => this.#resize());
    // Для мобильных — обрабатываем смену ориентации
    window.addEventListener('orientationchange', () => setTimeout(() => this.#resize(), 100));
  }

  #resize() {
    // Целимся на весь доступный размер окна
    const targetW = window.innerWidth;
    const targetH = window.innerHeight;

    // Вычисляем масштаб, сохраняя пропорции
    const scaleX = targetW / this.#logicalWidth;
    const scaleY = targetH / this.#logicalHeight;
    this.#scale = Math.min(scaleX, scaleY);

    // Для пиксель-арт: округляем до целого числа при больших значениях
    // (меньше 2× не округляем, чтобы оставить плавность на мобильных)
    if (this.#scale >= 2) {
      this.#scale = Math.floor(this.#scale);
    }

    // Физический размер canvas
    const physicalW = Math.floor(this.#logicalWidth * this.#scale);
    const physicalH = Math.floor(this.#logicalHeight * this.#scale);

    this.#canvas.width = physicalW;
    this.#canvas.height = physicalH;
    this.#canvas.style.width = physicalW + 'px';
    this.#canvas.style.height = physicalH + 'px';

    // Letterbox отступы (нужны только если canvas меньше окна — они уже учтены flex-центрированием)
    this.#offsetX = (targetW - physicalW) / 2;
    this.#offsetY = (targetH - physicalH) / 2;

    // Отключаем сглаживание после каждого resize — некоторые браузеры сбрасывают
    this.#ctx.imageSmoothingEnabled = false;
  }

  // Начало кадра
  beginFrame() {
    this.#ctx.save();
    // Применяем масштаб — дальнейшие команды рендера работают в логических координатах
    this.#ctx.setTransform(this.#scale, 0, 0, this.#scale, 0, 0);
    this.#ctx.imageSmoothingEnabled = false;

    // Очистка
    this.#ctx.fillStyle = '#000';
    this.#ctx.fillRect(0, 0, this.#logicalWidth, this.#logicalHeight);
  }

  endFrame() {
    this.#ctx.restore();
  }

  // Установить клип-регион (для тумана войны или окон)
  clipRect(x, y, w, h) {
    this.#ctx.save();
    this.#ctx.beginPath();
    this.#ctx.rect(x, y, w, h);
    this.#ctx.clip();
  }

  unclip() {
    this.#ctx.restore();
  }

  // Конвертация экранных (screen pixel) координат в логические
  // Нужна для кликов, если когда-то добавим мышь
  screenToLogical(sx, sy) {
    return {
      x: (sx - this.#offsetX) / this.#scale,
      y: (sy - this.#offsetY) / this.#scale,
    };
  }

  get ctx() { return this.#ctx; }
  get logicalWidth() { return this.#logicalWidth; }
  get logicalHeight() { return this.#logicalHeight; }
  get scale() { return this.#scale; }
}
