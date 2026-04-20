// Реестр спрайтов. Добавление ассета — одна строка:
//   spriteRegistry.register('goblin', 'assets/sprites/goblin.png', { width: 16, height: 24 });
//
// Если спрайт зарегистрирован — рисуется он.
// Если нет — автоматически используется плейсхолдер (прямоугольник с подписью).
//
// Это позволяет начать игру БЕЗ единого ассета и добавлять их постепенно.

export class SpriteRegistry {
  #sprites = new Map();  // id → { image, width, height, frameCount, frameWidth }
  #loaded = new Map();   // id → Promise<boolean>

  // Регистрация спрайта. Возвращает Promise, который резолвится когда изображение загружено.
  register(id, url, options = {}) {
    const img = new Image();
    const promise = new Promise((resolve) => {
      img.onload = () => {
        this.#sprites.set(id, {
          image: img,
          width:       options.width       ?? img.naturalWidth,
          height:      options.height      ?? img.naturalHeight,
          frameCount:  options.frameCount  ?? 1,
          frameWidth:  options.frameWidth  ?? (options.width ?? img.naturalWidth),
          frameHeight: options.frameHeight ?? (options.height ?? img.naturalHeight),
          anchorX:     options.anchorX     ?? 0.5,  // 0.5 = центр, 0 = левый край
          anchorY:     options.anchorY     ?? 0.5,
        });
        resolve(true);
      };
      img.onerror = () => {
        console.warn(`[SpriteRegistry] Не удалось загрузить: ${url}`);
        resolve(false);
      };
    });
    img.src = url;
    this.#loaded.set(id, promise);
    return promise;
  }

  // Получить спрайт по id. Если нет — вернёт null, вызывающий код должен использовать плейсхолдер.
  get(id) {
    return this.#sprites.get(id) ?? null;
  }

  has(id) { return this.#sprites.has(id); }

  // Рисует спрайт с учётом анкера, размера и (опционально) кадра анимации.
  // Если спрайт не найден — ничего не делает (рендерер сам нарисует плейсхолдер).
  draw(ctx, id, x, y, options = {}) {
    const sprite = this.#sprites.get(id);
    if (!sprite) return false;

    const frame = options.frame ?? 0;
    const flipX = options.flipX ?? false;
    const scale = options.scale ?? 1;
    const tint  = options.tint ?? null;

    const w = sprite.width * scale;
    const h = sprite.height * scale;
    const sx = (frame % sprite.frameCount) * sprite.frameWidth;
    const sy = 0;

    const dx = Math.round(x - w * sprite.anchorX);
    const dy = Math.round(y - h * sprite.anchorY);

    ctx.save();
    if (flipX) {
      ctx.translate(dx + w, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite.image, sx, sy, sprite.frameWidth, sprite.frameHeight, 0, 0, w, h);
    } else {
      ctx.drawImage(sprite.image, sx, sy, sprite.frameWidth, sprite.frameHeight, dx, dy, w, h);
    }
    if (tint) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = tint;
      if (flipX) {
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillRect(dx, dy, w, h);
      }
    }
    ctx.restore();

    return true;
  }

  // Ждёт загрузки всех зарегистрированных спрайтов
  async waitAll() {
    return Promise.all(this.#loaded.values());
  }
}
