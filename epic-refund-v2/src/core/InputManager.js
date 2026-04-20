// Единая точка ввода. Top-down — 4 направления (WASD).
// Нет прыжка (гравитация отсутствует), но действия (атака, перекат, взаимодействие) сохраняются.

const KEY_MAP = {
  // Движение (все 4 направления)
  KeyW: 'up',       ArrowUp: 'up',
  KeyA: 'left',     ArrowLeft: 'left',
  KeyS: 'down',     ArrowDown: 'down',
  KeyD: 'right',    ArrowRight: 'right',

  // Действия
  KeyJ: 'attackLight',
  KeyK: 'attackHeavy',
  KeyU: 'skill1',
  KeyI: 'skill2',
  KeyO: 'skill3',
  KeyP: 'skill4',
  ShiftLeft: 'roll',   ShiftRight: 'roll',
  KeyE: 'interact',
  Tab: 'inventory',
  KeyT: 'skillTree',
  Escape: 'pause',

  // Debug
  F1: 'debug_toggle',
  F3: 'debug_hitbox',
};

export class InputManager {
  #held = new Set();
  #pressed = new Set();
  #released = new Set();

  constructor() {
    window.addEventListener('keydown', this.#onKeyDown.bind(this));
    window.addEventListener('keyup', this.#onKeyUp.bind(this));
    window.addEventListener('blur', this.#onBlur.bind(this));
    // Блокируем контекстное меню, чтобы не мешало геймплею
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  #onKeyDown(e) {
    const action = KEY_MAP[e.code];
    if (!action) return;
    e.preventDefault();
    if (!this.#held.has(action)) {
      this.#held.add(action);
      this.#pressed.add(action);
    }
  }

  #onKeyUp(e) {
    const action = KEY_MAP[e.code];
    if (!action) return;
    this.#held.delete(action);
    this.#released.add(action);
  }

  #onBlur() {
    this.#held.clear();
    this.#pressed.clear();
    this.#released.clear();
  }

  // Вызывается в конце кадра, сбрасывает "нажато в этом кадре"
  flush() {
    this.#pressed.clear();
    this.#released.clear();
  }

  isHeld(action)     { return this.#held.has(action); }
  isPressed(action)  { return this.#pressed.has(action); }
  isReleased(action) { return this.#released.has(action); }

  // Оси для top-down движения
  getHorizontalAxis() {
    return (this.isHeld('right') ? 1 : 0) - (this.isHeld('left') ? 1 : 0);
  }
  getVerticalAxis() {
    return (this.isHeld('down') ? 1 : 0) - (this.isHeld('up') ? 1 : 0);
  }

  // Нормализованный вектор движения (диагональ не быстрее горизонтали)
  getMovementVector() {
    const x = this.getHorizontalAxis();
    const y = this.getVerticalAxis();
    const len = Math.sqrt(x * x + y * y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
  }

  destroy() {
    window.removeEventListener('keydown', this.#onKeyDown.bind(this));
    window.removeEventListener('keyup', this.#onKeyUp.bind(this));
    window.removeEventListener('blur', this.#onBlur.bind(this));
  }
}
