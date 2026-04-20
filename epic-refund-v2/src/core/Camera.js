// Камера для top-down. Сильно приближена — игрок видит только свою комнату.
// Lerp-следование с ограничением по границам мира.

const LERP_SPEED = 0.15;     // Плавное следование
const SHAKE_DECAY = 0.85;

export class Camera {
  #x = 0;
  #y = 0;
  #targetX = 0;
  #targetY = 0;

  #shakeIntensity = 0;
  #shakeOffsetX = 0;
  #shakeOffsetY = 0;

  // Логический viewport (мировых единиц) — что видно на экране.
  // Чем меньше — тем ближе камера.
  #viewWidth = 480;
  #viewHeight = 270;

  // Границы мира
  #worldMinX = 0;
  #worldMinY = 0;
  #worldMaxX = 1000;
  #worldMaxY = 1000;

  setViewSize(width, height) {
    this.#viewWidth = width;
    this.#viewHeight = height;
  }

  setWorldBounds(minX, minY, maxX, maxY) {
    this.#worldMinX = minX;
    this.#worldMinY = minY;
    this.#worldMaxX = maxX;
    this.#worldMaxY = maxY;
  }

  follow(target) {
    this.#targetX = target.x - this.#viewWidth / 2;
    this.#targetY = target.y - this.#viewHeight / 2;
  }

  // Мгновенная установка (без lerp) — используется при телепорте/входе в комнату
  snapTo(target) {
    this.#x = this.#targetX = target.x - this.#viewWidth / 2;
    this.#y = this.#targetY = target.y - this.#viewHeight / 2;
    this.#clamp();
  }

  update(dt) {
    this.#x += (this.#targetX - this.#x) * LERP_SPEED;
    this.#y += (this.#targetY - this.#y) * LERP_SPEED;

    this.#clamp();

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

  #clamp() {
    const maxCamX = this.#worldMaxX - this.#viewWidth;
    const maxCamY = this.#worldMaxY - this.#viewHeight;

    // Если мир меньше viewport — центруем
    if (this.#worldMaxX - this.#worldMinX < this.#viewWidth) {
      this.#x = this.#worldMinX - (this.#viewWidth - (this.#worldMaxX - this.#worldMinX)) / 2;
    } else {
      this.#x = Math.max(this.#worldMinX, Math.min(this.#x, maxCamX));
    }

    if (this.#worldMaxY - this.#worldMinY < this.#viewHeight) {
      this.#y = this.#worldMinY - (this.#viewHeight - (this.#worldMaxY - this.#worldMinY)) / 2;
    } else {
      this.#y = Math.max(this.#worldMinY, Math.min(this.#y, maxCamY));
    }
  }

  shake(intensity) {
    this.#shakeIntensity = Math.max(this.#shakeIntensity, intensity);
  }

  // Мировые → экранные
  worldToScreen(wx, wy) {
    return {
      x: wx - this.#x - this.#shakeOffsetX,
      y: wy - this.#y - this.#shakeOffsetY,
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: sx + this.#x + this.#shakeOffsetX,
      y: sy + this.#y + this.#shakeOffsetY,
    };
  }

  get x() { return this.#x + this.#shakeOffsetX; }
  get y() { return this.#y + this.#shakeOffsetY; }
  get viewWidth() { return this.#viewWidth; }
  get viewHeight() { return this.#viewHeight; }
}
