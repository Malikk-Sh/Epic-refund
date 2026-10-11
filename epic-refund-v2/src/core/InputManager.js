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

  // Выборы в диалогах
  Digit1: 'choice1',
  Digit2: 'choice2',
  Digit3: 'choice3',
  Digit4: 'choice4',

  // Debug
  F1: 'debug_toggle',
  F3: 'debug_hitbox',
};

export class InputManager {
  #held = new Set();
  #pressed = new Set();
  #released = new Set();
  #virtualHeld = new Set();
  #touchAssistEnabled = false;
  #onKeyDownBound = this.#onKeyDown.bind(this);
  #onKeyUpBound = this.#onKeyUp.bind(this);
  #onBlurBound = this.#onBlur.bind(this);
  #onContextMenuBound = (e) => e.preventDefault();

  constructor() {
    window.addEventListener('keydown', this.#onKeyDownBound);
    window.addEventListener('keyup', this.#onKeyUpBound);
    window.addEventListener('blur', this.#onBlurBound);
    window.addEventListener('contextmenu', this.#onContextMenuBound);
  }

  #onKeyDown(e) {
    const action = KEY_MAP[e.code];
    if (!action) return;
    e.preventDefault();
    if (!this.isHeld(action)) {
      this.#held.add(action);
      this.#pressed.add(action);
    }
  }

  #onKeyUp(e) {
    const action = KEY_MAP[e.code];
    if (!action) return;
    this.#held.delete(action);
    if (!this.#virtualHeld.has(action)) this.#released.add(action);
  }

  #onBlur() {
    this.#held.clear();
    this.#virtualHeld.clear();
    this.#pressed.clear();
    this.#released.clear();
  }

  // Вызывается в конце кадра, сбрасывает "нажато в этом кадре"
  flush() {
    this.#pressed.clear();
    this.#released.clear();
  }

  pressVirtual(action) {
    if (!this.isHeld(action)) this.#pressed.add(action);
    this.#virtualHeld.add(action);
  }

  releaseVirtual(action) {
    if (!this.#virtualHeld.delete(action)) return;
    if (!this.#held.has(action)) this.#released.add(action);
  }

  releaseAllVirtual() {
    for (const action of [...this.#virtualHeld]) this.releaseVirtual(action);
  }

  setTouchAssistEnabled(value) { this.#touchAssistEnabled = Boolean(value); }
  get touchAssistEnabled() { return this.#touchAssistEnabled; }

  isHeld(action)     { return this.#held.has(action) || this.#virtualHeld.has(action); }
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
    window.removeEventListener('keydown', this.#onKeyDownBound);
    window.removeEventListener('keyup', this.#onKeyUpBound);
    window.removeEventListener('blur', this.#onBlurBound);
    window.removeEventListener('contextmenu', this.#onContextMenuBound);
    this.releaseAllVirtual();
  }
}
