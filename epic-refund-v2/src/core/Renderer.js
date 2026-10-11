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
  #pixelRatio = 1;
  #pixelDensityCap = 2;
  #resizeBound = () => this.#resize();
  #orientationBound = () => this.#resize();

  constructor(canvas) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');
    this.#ctx.imageSmoothingEnabled = false;

    this.#resize();
    window.addEventListener('resize', this.#resizeBound);
    // При повороте orientationchange тоже обновляет пропорции и буфер.
    window.addEventListener('orientationchange', this.#orientationBound);
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

    // CSS-размер и физический буфер различаются на Retina/HiDPI.
    // Не раздуваем буфер бесконтрольно: максимум ~3.2 Мпикселя.
    const cssW = Math.max(1, Math.floor(this.#logicalWidth * this.#scale));
    const cssH = Math.max(1, Math.floor(this.#logicalHeight * this.#scale));
    const maxRatio = Math.sqrt(3_200_000 / (cssW * cssH));
    this.#pixelRatio = Math.max(1, Math.min(this.#pixelDensityCap, window.devicePixelRatio || 1, maxRatio));
    this.#canvas.width = Math.round(cssW * this.#pixelRatio);
    this.#canvas.height = Math.round(cssH * this.#pixelRatio);
    this.#canvas.style.width = cssW + 'px';
    this.#canvas.style.height = cssH + 'px';

    // Letterbox измеряется CSS-пикселями, не размерами backing store.
    this.#offsetX = (targetW - cssW) / 2;
    this.#offsetY = (targetH - cssH) / 2;

    // Отключаем сглаживание после каждого resize — некоторые браузеры сбрасывают
    this.#ctx.imageSmoothingEnabled = false;
  }

  // Начало кадра
  beginFrame() {
    this.#ctx.save();
    // Применяем масштаб — дальнейшие команды рендера работают в логических координатах
    const physicalScale = this.#scale * this.#pixelRatio;
    this.#ctx.setTransform(physicalScale, 0, 0, physicalScale, 0, 0);
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
  get pixelRatio() { return this.#pixelRatio; }

  setPixelDensityCap(value) {
    this.#pixelDensityCap = value >= 2 ? 2 : 1;
    this.#resize();
  }
  get pixelDensityCap() { return this.#pixelDensityCap; }

  destroy() {
    window.removeEventListener('resize', this.#resizeBound);
    window.removeEventListener('orientationchange', this.#orientationBound);
  }
}
