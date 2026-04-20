// Звук через WebAudio API. Генерирует синтетические звуки, пока нет ассетов.
// При регистрации URL — загружает аудиофайл и использует его вместо синтеза.
//
// Браузеры требуют user interaction перед запуском AudioContext — инициализируем лениво.

export class AudioManager {
  #ctx = null;
  #masterGain = null;
  #sfxGain = null;
  #musicGain = null;

  #soundBuffers = new Map();    // id → AudioBuffer (загруженные файлы)
  #synthDefs = new Map();       // id → функция-генератор

  #masterVolume = 0.5;
  #sfxVolume = 0.7;
  #musicVolume = 0.4;
  #muted = false;

  #eventBus;
  #initialized = false;

  constructor(eventBus) {
    this.#eventBus = eventBus;
    this.#registerDefaultSynths();
    this.#setupEventListeners();

    // Инициализация на первый user interaction
    const init = () => {
      this.#ensureContext();
      window.removeEventListener('click', init);
      window.removeEventListener('keydown', init);
    };
    window.addEventListener('click', init);
    window.addEventListener('keydown', init);
  }

  #ensureContext() {
    if (this.#initialized) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.#ctx = new AC();
      this.#masterGain = this.#ctx.createGain();
      this.#masterGain.gain.value = this.#muted ? 0 : this.#masterVolume;
      this.#masterGain.connect(this.#ctx.destination);

      this.#sfxGain = this.#ctx.createGain();
      this.#sfxGain.gain.value = this.#sfxVolume;
      this.#sfxGain.connect(this.#masterGain);

      this.#musicGain = this.#ctx.createGain();
      this.#musicGain.gain.value = this.#musicVolume;
      this.#musicGain.connect(this.#masterGain);

      this.#initialized = true;
    } catch (e) {
      console.warn('[AudioManager] WebAudio недоступен:', e);
    }
  }

  #setupEventListeners() {
    const on = this.#eventBus.on.bind(this.#eventBus);
    on('player:attack',      ({ type }) => this.play(type === 'heavy' ? 'swing_heavy' : 'swing_light'));
    on('combat:playerHit',   () => this.play('hurt'));
    on('combat:kill',        () => this.play('enemy_death'));
    on('player:parrySuccess',({ perfect }) => this.play(perfect ? 'parry_perfect' : 'parry'));
    on('skill:lost',         () => this.play('skill_shatter'));
    on('skill:attempted',    () => this.play('skill_fail'));
    on('gate:open',          () => this.play('gate_open'));
    on('gate:sacrifice',     () => this.play('skill_shatter'));
    on('player:deathSave',   () => this.play('save_tick'));
    on('room:cleared',       () => this.play('room_clear'));
    on('room:enter',         () => this.play('step'));
  }

  // === Воспроизведение ===

  play(id, options = {}) {
    if (this.#muted) return;
    this.#ensureContext();
    if (!this.#ctx) return;

    // Загруженный файл имеет приоритет
    const buffer = this.#soundBuffers.get(id);
    if (buffer) { this.#playBuffer(buffer, options); return; }

    // Синтетический звук
    const synth = this.#synthDefs.get(id);
    if (synth) { synth(this.#ctx, this.#sfxGain, options); return; }
  }

  #playBuffer(buffer, options = {}) {
    const src = this.#ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = options.rate ?? (0.95 + Math.random() * 0.1);

    const gain = this.#ctx.createGain();
    gain.gain.value = options.volume ?? 1;

    src.connect(gain);
    gain.connect(this.#sfxGain);
    src.start(0);
  }

  // === Регистрация реальных звуков ===

  async loadSFX(id, url) {
    this.#ensureContext();
    if (!this.#ctx) return false;
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.#ctx.decodeAudioData(arrayBuffer);
      this.#soundBuffers.set(id, audioBuffer);
      return true;
    } catch (e) {
      console.warn(`[AudioManager] Не удалось загрузить ${url}:`, e);
      return false;
    }
  }

  // === Синтетические звуки ===

  #registerDefaultSynths() {
    // Лёгкий свист меча — короткий шум с полосовым фильтром
    this.#synthDefs.set('swing_light', (ctx, out) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.2);
    });

    // Тяжёлый удар — ниже и громче
    this.#synthDefs.set('swing_heavy', (ctx, out) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.3);
    });

    // Получение урона — глухой стук
    this.#synthDefs.set('hurt', (ctx, out) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.15);
    });

    // Смерть врага — короткий спад
    this.#synthDefs.set('enemy_death', (ctx, out) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.35);
    });

    // Парирование — звонкий удар
    this.#synthDefs.set('parry', (ctx, out) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'square';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.15);
    });

    // Идеальное парирование — два тона
    this.#synthDefs.set('parry_perfect', (ctx, out) => {
      for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime + i * 0.06;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200 + i * 400, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(out);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    });

    // Потеря навыка — низкий затухающий гул
    this.#synthDefs.set('skill_shatter', (ctx, out) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(220, now);
      osc2.frequency.setValueAtTime(220 * 1.5, now);
      osc1.frequency.exponentialRampToValueAtTime(55, now + 0.8);
      osc2.frequency.exponentialRampToValueAtTime(82, now + 0.8);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(out);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.85);
      osc2.stop(now + 0.85);
    });

    // Промах навыка — короткий "пшик"
    this.#synthDefs.set('skill_fail', (ctx, out) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.2);
    });

    // Открытие Врат
    this.#synthDefs.set('gate_open', (ctx, out) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.8);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 1.1);
    });

    // Очистка комнаты
    this.#synthDefs.set('room_clear', (ctx, out) => {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime + i * 0.08;
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(out);
        osc.start(now);
        osc.stop(now + 0.35);
      });
    });

    // Спасение (Эхо Неуязвимости)
    this.#synthDefs.set('save_tick', (ctx, out) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.45);
    });

    // Шаг — очень тихий
    this.#synthDefs.set('step', (ctx, out) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.value = 80;
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.1);
    });
  }

  // === Настройки ===

  setMasterVolume(v) {
    this.#masterVolume = Math.max(0, Math.min(1, v));
    if (this.#masterGain && !this.#muted) this.#masterGain.gain.value = this.#masterVolume;
  }

  setMuted(muted) {
    this.#muted = muted;
    if (this.#masterGain) this.#masterGain.gain.value = muted ? 0 : this.#masterVolume;
  }

  get isMuted() { return this.#muted; }
}
