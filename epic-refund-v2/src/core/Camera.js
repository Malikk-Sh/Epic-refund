// Камера для top-down. Zoom-фактор масштабирует мировые координаты в экранные.
// Lerp-следование с ограничением по границам мира.
// Поддерживает анимацию перехода между комнатами (startTransition).

const LERP_SPEED = 0.12;
const SHAKE_DECAY = 0.85;
const TRANSITION_DURATION = 0.45;

export class Camera {
  #x = 0;
  #y = 0;
  #targetX = 0;
  #targetY = 0;

  #shakeIntensity = 0;
  #shakeOffsetX = 0;
  #shakeOffsetY = 0;

  // Логический viewport (пикс. рендерера) — сколько экрана отдано игровому виду
  #viewWidth = 768;
  #viewHeight = 432;

  // zoom=2 → тайл 24 у.е. = 48 логических пикселей рендерера
  #zoom = 2.0;

  // Границы мира (текущей комнаты)
  #worldMinX = 0;
  #worldMinY = 0;
  #worldMaxX = 1000;
  #worldMaxY = 1000;

  // Анимация перехода между комнатами — пока активна, clamping отключён
  #transitioning = false;
  #transitionTimer = 0;

  setViewSize(width, height) {
    this.#viewWidth = width;
    this.#viewHeight = height;
  }

  setZoom(zoom) { this.#zoom = zoom; }
  get zoom() { return this.#zoom; }

  // Сколько мировых единиц видно на экране при текущем zoom
  get visibleWorldWidth()  { return this.#viewWidth  / this.#zoom; }
  get visibleWorldHeight() { return this.#viewHeight / this.#zoom; }

  setWorldBounds(minX, minY, maxX, maxY) {
    this.#worldMinX = minX;
    this.#worldMinY = minY;
    this.#worldMaxX = maxX;
    this.#worldMaxY = maxY;
  }

  // Устанавливает target-позицию (lerp движется к ней).
  // Target тоже клампируется, чтобы избежать дёргания при auto-center.
  follow(target) {
    this.#targetX = target.x - this.visibleWorldWidth  / 2;
    this.#targetY = target.y - this.visibleWorldHeight / 2;
    this.#clampTarget();
  }

  // Мгновенная установка позиции без lerp. clamp=true по умолчанию.
  snapTo(target, clamp = true) {
    this.#targetX = target.x - this.visibleWorldWidth  / 2;
    this.#targetY = target.y - this.visibleWorldHeight / 2;
    if (clamp) {
      this.#clampTarget();
    }
    this.#x = this.#targetX;
    this.#y = this.#targetY;
  }

  // Запускает анимацию выезда камеры.
  // snapTo должен быть вызван перед этим (target установлен правильно).
  // dx/dy — начальное смещение от правильной позиции (обычно ±размер комнаты).
  startTransition(dx, dy) {
    this.#x += dx;
    this.#y += dy;
    this.#transitioning = true;
    this.#transitionTimer = TRANSITION_DURATION;
  }

  update(dt) {
    this.#x += (this.#targetX - this.#x) * LERP_SPEED;
    this.#y += (this.#targetY - this.#y) * LERP_SPEED;

    if (this.#transitioning) {
      this.#transitionTimer -= dt;
      if (this.#transitionTimer <= 0) {
        this.#transitioning = false;
        // Финальный snap к target после анимации
        this.#x = this.#targetX;
        this.#y = this.#targetY;
      }
    } else {
      this.#clampXY();
    }

    if (this.#shakeIntensity > 0.1) {
      this.#shakeOffsetX = (Math.random() * 2 - 1) * this.#shakeIntensity;
      this.#shakeOffsetY = (Math.random() * 2 - 1) * this.#shakeIntensity;
      this.#shakeIntensity *= SHAKE_DECAY;
    } else {
      this.#shakeIntensity = 0;
      this.#shakeOffsetX = 0;
      this.#shakeOffsetY = 0;
    }
  }

  // Клампирует target (вызывать после изменения targetX/Y)
  #clampTarget() {
    const visW = this.visibleWorldWidth;
    const visH = this.visibleWorldHeight;

    if (this.#worldMaxX - this.#worldMinX <= visW) {
      this.#targetX = this.#worldMinX - (visW - (this.#worldMaxX - this.#worldMinX)) / 2;
    } else {
      this.#targetX = Math.max(this.#worldMinX, Math.min(this.#targetX, this.#worldMaxX - visW));
    }

    if (this.#worldMaxY - this.#worldMinY <= visH) {
      this.#targetY = this.#worldMinY - (visH - (this.#worldMaxY - this.#worldMinY)) / 2;
    } else {
      this.#targetY = Math.max(this.#worldMinY, Math.min(this.#targetY, this.#worldMaxY - visH));
    }
  }

  // Клампирует текущую позицию x/y (вызывать в update вне анимации)
  #clampXY() {
    const visW = this.visibleWorldWidth;
    const visH = this.visibleWorldHeight;

    if (this.#worldMaxX - this.#worldMinX <= visW) {
      this.#x = this.#worldMinX - (visW - (this.#worldMaxX - this.#worldMinX)) / 2;
    } else {
      this.#x = Math.max(this.#worldMinX, Math.min(this.#x, this.#worldMaxX - visW));
    }

    if (this.#worldMaxY - this.#worldMinY <= visH) {
      this.#y = this.#worldMinY - (visH - (this.#worldMaxY - this.#worldMinY)) / 2;
    } else {
      this.#y = Math.max(this.#worldMinY, Math.min(this.#y, this.#worldMaxY - visH));
    }
  }

  shake(intensity) {
    this.#shakeIntensity = Math.max(this.#shakeIntensity, intensity);
  }

  // Мировые координаты → логические пиксели рендерера
  worldToScreen(wx, wy) {
    return {
      x: (wx - this.#x) * this.#zoom + this.#shakeOffsetX,
      y: (wy - this.#y) * this.#zoom + this.#shakeOffsetY,
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: sx / this.#zoom + this.#x,
      y: sy / this.#zoom + this.#y,
    };
  }

  get x() { return this.#x; }
  get y() { return this.#y; }
  get viewWidth()  { return this.#viewWidth; }
  get viewHeight() { return this.#viewHeight; }
}
