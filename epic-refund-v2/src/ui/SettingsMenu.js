// Настройки доступны в любой момент, включая смартфоны и PWA.
export class SettingsMenu {
  #game;
  #controls;
  #panel;
  #toggle;
  #fullscreen;
  #status;
  #touchToggle;
  #soundToggle;
  #hapticsToggle;
  #feedback;
  #qualityToggle;
  #open = false;

  constructor(game, controls, feedback = null) {
    this.#feedback = feedback;
    this.#game = game;
    this.#controls = controls;
    this.#toggle = document.createElement('button');
    this.#toggle.id = 'settings-open';
    this.#toggle.type = 'button';
    this.#toggle.setAttribute('aria-label', 'Открыть настройки');
    this.#toggle.textContent = '⚙';
    document.body.append(this.#toggle);

    this.#panel = document.createElement('section');
    this.#panel.id = 'settings-panel';
    this.#panel.setAttribute('role', 'dialog');
    this.#panel.setAttribute('aria-modal', 'true');
    this.#panel.setAttribute('aria-label', 'Настройки Epic Refund');
    this.#panel.hidden = true;
    this.#panel.innerHTML = [
      '<div class="settings-card">',
      '  <header><h2>НАСТРОЙКИ</h2><button type="button" id="settings-close" aria-label="Закрыть настройки">✕</button></header>',
      '  <p class="settings-description">Настройте игру под свой экран</p>',
      '  <button type="button" class="settings-primary" id="settings-fullscreen">⛶ Полный экран</button>',
      '  <label class="settings-touch"><input type="checkbox" id="settings-touch-toggle"> Сенсорное управление</label>',
      '  <label class="settings-touch"><input type="checkbox" id="settings-sound-toggle"> Звуковые эффекты</label>',
      '  <label class="settings-touch"><input type="checkbox" id="settings-quality-toggle"> Чёткая графика (Retina)</label>',
      '  <label class="settings-touch"><input type="checkbox" id="settings-haptics-toggle"> Вибрация при ударах (Android)</label>',
      '  <details class="settings-help"><summary>Как играть и что делают кнопки</summary>',
      '    <p>Левый круг — движение. ⚔ — обычная атака (можно удерживать); ◆ — парирование или сильный удар; ↝ — перекат; E — разговор и взаимодействие.</p>',
      '    <p>Кнопки 1–3 — активные способности, ★ — ультимативная. У Врат ↑↓ выбирают навык, ✓ нужно нажать дважды — потеря необратима.</p>',
      '    <p>Клавиатура: WASD · J/K · Shift · E · U/I/O/P. Прогресс сохраняется на контрольных точках.</p>',
      '  </details>',
      '  <p id="settings-status" role="status" aria-live="polite"></p>',
      '  <p class="settings-hint">На iPhone полный экран обычно доступен через «На экран Домой» в меню «Поделиться».</p>',
      '</div>',
    ].join('');
    document.body.append(this.#panel);
    this.#fullscreen = this.#panel.querySelector('#settings-fullscreen');
    this.#touchToggle = this.#panel.querySelector('#settings-touch-toggle');
    this.#status = this.#panel.querySelector('#settings-status');
    this.#soundToggle = this.#panel.querySelector('#settings-sound-toggle');
    this.#qualityToggle = this.#panel.querySelector('#settings-quality-toggle');
    this.#hapticsToggle = this.#panel.querySelector('#settings-haptics-toggle');
    this.#hapticsToggle.disabled = !this.#feedback?.supported;
    this.#hapticsToggle.checked = this.#feedback?.enabled ?? false;
    try {
      if (localStorage.getItem('epic_refund_retina') === 'false')
        this.#game.renderer.setPixelDensityCap(1);
    } catch {}
    this.#qualityToggle.checked = this.#game.renderer.pixelDensityCap > 1;
    this.#hapticsToggle.checked = this.#feedback?.enabled ?? false;
    try {
      const sound = localStorage.getItem('epic_refund_sound');
      if (sound !== null) this.#game.audioManager.setMuted(sound === 'false');
    } catch {}
    this.#soundToggle.checked = !this.#game.audioManager.isMuted;
    this.#toggle.addEventListener('click', this.#show);
    this.#panel.querySelector('#settings-close').addEventListener('click', this.#hide);
    this.#panel.addEventListener('click', (event) => {
      if (event.target === this.#panel) this.#hide();
    });
    this.#fullscreen.addEventListener('click', this.#toggleFullscreen);
    this.#touchToggle.addEventListener('change', () => {
      this.#controls.setVisible(this.#touchToggle.checked);
    });
    this.#hapticsToggle.addEventListener('change', () => {
      this.#feedback?.setEnabled(this.#hapticsToggle.checked);
    });
    this.#qualityToggle.addEventListener('change', () => {
      this.#game.renderer.setPixelDensityCap(this.#qualityToggle.checked ? 2 : 1);
      // Resize очищает canvas; меню ставит игру на паузу, поэтому перерисуем
      // последний кадр вручную, не возобновляя игровую симуляцию.
      this.#game.redrawFrame();
      try { localStorage.setItem('epic_refund_retina', String(this.#qualityToggle.checked)); } catch {}
    });
    this.#soundToggle.addEventListener('change', () => {
      this.#game.audioManager.setMuted(!this.#soundToggle.checked);
      try { localStorage.setItem('epic_refund_sound', String(this.#soundToggle.checked)); } catch {}
    });
    document.addEventListener('fullscreenchange', this.#syncFullscreen);
    document.addEventListener('webkitfullscreenchange', this.#syncFullscreen);
    window.addEventListener('keydown', this.#onKeyDown);
  }

  #show = () => {
    if (this.#open) return;
    this.#open = true;
    this.#status.textContent = '';
    this.#touchToggle.checked = this.#controls.visible;
    this.#soundToggle.checked = !this.#game.audioManager.isMuted;
    this.#qualityToggle.checked = this.#game.renderer.pixelDensityCap > 1;
    this.#panel.hidden = false;
    this.#toggle.setAttribute('aria-expanded', 'true');
    this.#game.pause('settings');
    this.#syncFullscreen();
    this.#fullscreen.focus();
  };

  #hide = () => {
    if (!this.#open) return;
    this.#open = false;
    this.#panel.hidden = true;
    this.#toggle.setAttribute('aria-expanded', 'false');
    this.#game.inputManager.releaseAllVirtual();
    this.#game.inputManager.flush();
    this.#game.resume('settings');
    this.#toggle.focus();
  };

  #onKeyDown = (event) => {
    if (event.code === 'Escape' && this.#open) {
      event.preventDefault();
      event.stopPropagation();
      this.#hide();
    }
  };

  #syncFullscreen = () => {
    const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    this.#fullscreen.textContent = active ? '⛶ Выйти из полного экрана' : '⛶ Полный экран';
    this.#fullscreen.setAttribute('aria-pressed', String(active));
  };

  #toggleFullscreen = async () => {
    const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    const target = document.documentElement;
    try {
      if (active) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) await exit.call(document);
      } else {
        const enter = target.requestFullscreen || target.webkitRequestFullscreen;
        if (!enter) {
          this.#status.textContent = 'Браузер не поддерживает полноэкранный режим сайта. На iPhone добавьте игру на экран «Домой».';
          return;
        }
        await enter.call(target);
      }
      this.#status.textContent = '';
      this.#syncFullscreen();
    } catch {
      this.#status.textContent = 'Не удалось переключить полный экран. Попробуйте открыть игру отдельно от встроенного браузера.';
    }
  };

  destroy() {
    document.removeEventListener('fullscreenchange', this.#syncFullscreen);
    document.removeEventListener('webkitfullscreenchange', this.#syncFullscreen);
    window.removeEventListener('keydown', this.#onKeyDown);
    this.#feedback?.destroy();
    this.#toggle.remove();
    this.#panel.remove();
  }
}
