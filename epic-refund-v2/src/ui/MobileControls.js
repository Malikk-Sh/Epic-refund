// Экранные элементы управления; физическая клавиатура продолжает работать.
const MOBILE_ACTIONS = [
  ['attackLight', '⚔', 'Атака'],
  ['attackHeavy', '◆', 'Парировать'],
  ['roll', '↝', 'Перекат'],
  ['interact', 'E', 'Действие'],
];
const SKILL_ACTIONS = [
  ['skill1', '1'], ['skill2', '2'], ['skill3', '3'], ['skill4', '★'],
];
const CHOICE_ACTIONS = [
  ['choice1', '1'], ['choice2', '2'], ['choice3', '3'], ['choice4', '4'],
];

export class MobileControls {
  #input;
  #root;
  #stick;
  #knob;
  #activePointer = null;
  #heldDirections = new Set();
  #visible = false;

  constructor(input) {
    this.#input = input;
    this.#root = document.createElement('div');
    this.#root.id = 'mobile-controls';
    this.#root.setAttribute('aria-label', 'Сенсорное управление');
    this.#root.innerHTML = [
      '<div id="move-pad" aria-label="Джойстик движения"><div id="move-knob"></div></div>',
      '<div id="mobile-skills" aria-label="Навыки"></div>',
      '<div id="mobile-actions" aria-label="Действия"></div>',
      '<div id="mobile-choices" aria-label="Варианты ответа"></div>',
    ].join('');
    document.body.append(this.#root);
    this.#stick = this.#root.querySelector('#move-pad');
    this.#knob = this.#root.querySelector('#move-knob');
    this.#populate('#mobile-skills', SKILL_ACTIONS, 'skill');
    this.#populate('#mobile-actions', MOBILE_ACTIONS, 'action');
    this.#populate('#mobile-choices', CHOICE_ACTIONS, 'choice');
    this.#stick.addEventListener('pointerdown', this.#startStick);
    this.#stick.addEventListener('pointermove', this.#moveStick);
    this.#stick.addEventListener('pointerup', this.#stopStick);
    this.#stick.addEventListener('pointercancel', this.#stopStick);
    window.addEventListener('blur', this.#releaseAll);

    const touch = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    let preference = null;
    try { preference = localStorage.getItem('epic_refund_touch_controls'); } catch {}
    this.setVisible(preference === null ? touch : preference === 'true');
  }

  #populate(selector, buttons, variant) {
    const container = this.#root.querySelector(selector);
    for (const [action, label, accessibleLabel] of buttons) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'touch-button ' + variant;
      button.textContent = label;
      button.setAttribute('aria-label', accessibleLabel || action);
      button.dataset.action = action;
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        button.classList.add('held');
        this.#input.pressVirtual(action);
      });
      const release = (event) => {
        event.preventDefault();
        button.classList.remove('held');
        this.#input.releaseVirtual(action);
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', () => {
        button.classList.remove('held');
        this.#input.releaseVirtual(action);
      });
      container.append(button);
    }
  }

  #startStick = (event) => {
    if (this.#activePointer !== null) return;
    event.preventDefault();
    this.#activePointer = event.pointerId;
    this.#stick.setPointerCapture?.(event.pointerId);
    this.#moveStick(event);
  };

  #moveStick = (event) => {
    if (event.pointerId !== this.#activePointer) return;
    event.preventDefault();
    const bounds = this.#stick.getBoundingClientRect();
    const radius = Math.min(bounds.width, bounds.height) / 2;
    const dx = (event.clientX - (bounds.left + radius)) / radius;
    const dy = (event.clientY - (bounds.top + radius)) / radius;
    const length = Math.hypot(dx, dy);
    const nx = length > 1 ? dx / length : dx;
    const ny = length > 1 ? dy / length : dy;
    this.#knob.style.transform = 'translate(' + Math.round(nx * 31) + 'px, ' + Math.round(ny * 31) + 'px)';
    const next = new Set();
    if (nx < -0.26) next.add('left');
    if (nx > 0.26) next.add('right');
    if (ny < -0.26) next.add('up');
    if (ny > 0.26) next.add('down');
    for (const action of this.#heldDirections) {
      if (!next.has(action)) this.#input.releaseVirtual(action);
    }
    for (const action of next) {
      if (!this.#heldDirections.has(action)) this.#input.pressVirtual(action);
    }
    this.#heldDirections = next;
  };

  #stopStick = (event) => {
    if (event.pointerId !== this.#activePointer) return;
    this.#activePointer = null;
    for (const action of this.#heldDirections) this.#input.releaseVirtual(action);
    this.#heldDirections.clear();
    this.#knob.style.transform = 'translate(0, 0)';
  };

  #releaseAll = () => {
    this.#activePointer = null;
    this.#heldDirections.clear();
    this.#knob.style.transform = 'translate(0, 0)';
    this.#input.releaseAllVirtual();
  };

  setVisible(visible) {
    this.#visible = Boolean(visible);
    this.#root.classList.toggle('visible', this.#visible);
    if (!this.#visible) this.#releaseAll();
    try { localStorage.setItem('epic_refund_touch_controls', String(this.#visible)); } catch {}
  }

  get visible() { return this.#visible; }
  destroy() {
    window.removeEventListener('blur', this.#releaseAll);
    this.#releaseAll();
    this.#root.remove();
  }
}
