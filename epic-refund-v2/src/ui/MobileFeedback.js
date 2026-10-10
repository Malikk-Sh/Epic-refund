// Добровольная тактильная обратная связь на Android/Chromium.
// navigator.vibrate не поддерживается Safari/iOS — это не ошибка.
const PATTERNS = Object.freeze({
  hit: [28, 40, 16],
  parry: [12, 26, 22],
  ability: 14,
  sacrifice: [40, 35, 65],
});

export class MobileFeedback {
  #enabled = false;
  #supported;
  #controls;
  #unsubs = [];
  #lastPulse = -1000;

  constructor(eventBus, controls) {
    this.#controls = controls;
    this.#supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    try { this.#enabled = localStorage.getItem('epic_refund_haptics') === 'true'; } catch {}
    const on = (event, pattern) => this.#unsubs.push(eventBus.on(event, () => this.pulse(pattern)));
    on('combat:playerHit', PATTERNS.hit);
    on('player:parrySuccess', PATTERNS.parry);
    on('ability:cast', PATTERNS.ability);
    on('gate:sacrifice', PATTERNS.sacrifice);
  }

  pulse(pattern) {
    if (!this.#supported || !this.#enabled || !this.#controls.visible || document.hidden) return false;
    const now = performance.now();
    if (now - this.#lastPulse < 120) return false; // не забивать мотор на множественных попаданиях
    this.#lastPulse = now;
    try { return Boolean(navigator.vibrate(pattern)); } catch { return false; }
  }

  setEnabled(value) {
    this.#enabled = Boolean(value) && this.#supported;
    try { localStorage.setItem('epic_refund_haptics', String(this.#enabled)); } catch {}
    if (!this.#enabled && this.#supported) {
      try { navigator.vibrate(0); } catch {}
    }
  }

  get enabled() { return this.#enabled && this.#supported; }
  get supported() { return this.#supported; }

  destroy() {
    for (const unsub of this.#unsubs) unsub();
    this.#unsubs.length = 0;
    if (this.#supported) {
      try { navigator.vibrate(0); } catch {}
    }
  }
}
