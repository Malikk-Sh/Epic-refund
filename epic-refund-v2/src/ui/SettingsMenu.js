// Настройки доступны в любой момент, включая смартфоны и PWA.
export class SettingsMenu {
  #game;
  #controls;
  #panel;
  #toggle;
  #fullscreen;
  #status;
  #touchToggle;
  #open = false;

  constructor(game, controls) {
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
      '  <p id="settings-status" role="status" aria-live="polite"></p>',
      '  <p class="settings-hint">На iPhone полный экран обычно доступен через «На экран Домой» в меню «Поделиться».</p>',
      '</div>',
    ].join('');
    document.body.append(this.#panel);
    this.#fullscreen = this.#panel.querySelector('#settings-fullscreen');
    this.#touchToggle = this.#panel.querySelector('#settings-touch-toggle');
    this.#status = this.#panel.querySelector('#settings-status');
    this.#toggle.addEventListener('click', this.#show);
    this.#panel.querySelector('#settings-close').addEventListener('click', this.#hide);
    this.#panel.addEventListener('click', (event) => {
      if (event.target === this.#panel) this.#hide();
    });
    this.#fullscreen.addEventListener('click', this.#toggleFullscreen);
    this.#touchToggle.addEventListener('change', () => {
      this.#controls.setVisible(this.#touchToggle.checked);
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
    this.#panel.hidden = false;
    this.#toggle.setAttribute('aria-expanded', 'true');
    this.#game.pause();
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
    this.#game.resume();
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
    this.#toggle.remove();
    this.#panel.remove();
  }
}
