// Главный класс — игровой цикл, инициализация всех систем.

import { EventBus } from './EventBus.js';
import { InputManager } from './InputManager.js';
import { Camera } from './Camera.js';
import { SaveManager } from './SaveManager.js';
import { AudioManager } from './AudioManager.js';
import { Renderer } from './Renderer.js';

import { SkillTree } from '../systems/SkillTree.js';
import { EchoSystem } from '../systems/EchoSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { FearSystem } from '../systems/FearSystem.js';
import { HUDManager } from '../systems/HUDManager.js';
import { GateSystem } from '../systems/GateSystem.js';

import { SpriteRegistry } from '../render/SpriteRegistry.js';
import { BALANCE } from '../data/balance.js';

const MAX_DELTA = 1 / 20;  // Защита от больших шагов

export class Game {
  #canvas;
  #renderer;
  #eventBus;
  #inputManager;
  #camera;
  #saveManager;
  #audioManager;

  #skillTree;
  #echoSystem;
  #combatSystem;
  #fearSystem;
  #hudManager;
  #gateSystem;

  #spriteRegistry;

  #currentScene = null;
  #paused = false;
  #lastTime = 0;
  #rafId = null;
  #debugMode = false;

  async init(canvas) {
    this.#canvas = canvas;
    this.#debugMode = new URLSearchParams(location.search).has('debug');

    this.#renderer = new Renderer(canvas);
    this.#renderer.beginFrame();
    this.#renderer.endFrame();

    // Ядро
    this.#eventBus     = new EventBus();
    if (this.#debugMode) this.#eventBus.setDebugMode(true);

    this.#inputManager = new InputManager();
    this.#camera       = new Camera();
    this.#camera.setViewSize(BALANCE.viewportWidth, BALANCE.viewportHeight);

    this.#saveManager  = new SaveManager();
    this.#audioManager = new AudioManager(this.#eventBus);

    // Системы
    this.#skillTree    = new SkillTree(this.#eventBus);
    this.#echoSystem   = new EchoSystem(this.#skillTree);
    this.#combatSystem = new CombatSystem(this.#eventBus);
    this.#fearSystem   = new FearSystem();
    this.#hudManager   = new HUDManager(this.#eventBus);
    this.#gateSystem   = new GateSystem(this.#eventBus, this.#skillTree);

    // Реестр ассетов
    this.#spriteRegistry = new SpriteRegistry();

    // Паузу на видимость вкладки
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
      else this.resume();
    });

    if (this.#debugMode) this.#setupDebug();

    return this;
  }

  async loadScene(SceneClass) {
    if (this.#currentScene) {
      this.#currentScene.destroy();
    }

    const scene = new SceneClass({
      renderer:      this.#renderer,
      eventBus:      this.#eventBus,
      inputManager:  this.#inputManager,
      camera:        this.#camera,
      saveManager:   this.#saveManager,
      audioManager:  this.#audioManager,
      skillTree:     this.#skillTree,
      echoSystem:    this.#echoSystem,
      combatSystem:  this.#combatSystem,
      fearSystem:    this.#fearSystem,
      hudManager:    this.#hudManager,
      gateSystem:    this.#gateSystem,
      spriteRegistry: this.#spriteRegistry,
    });

    await scene.init();
    this.#currentScene = scene;
  }

  start() {
    this.#lastTime = performance.now();
    this.#rafId = requestAnimationFrame(this.#loop.bind(this));
  }

  #loop(timestamp) {
    this.#rafId = requestAnimationFrame(this.#loop.bind(this));

    let dt = (timestamp - this.#lastTime) / 1000;
    this.#lastTime = timestamp;
    dt = Math.min(dt, MAX_DELTA);

    if (this.#paused) return;

    // Обновление
    this.#currentScene?.update(dt, this.#inputManager);

    // Камера — после обновления игрока
    const playerPos = this.#currentScene?.getPlayerPosition?.();
    if (playerPos) {
      this.#camera.follow(playerPos);
      this.#camera.update(dt);
    }

    // Отрисовка
    this.#currentScene?.render();

    this.#inputManager.flush();
  }

  pause() {
    this.#paused = true;
    this.#eventBus.emit('game:pause');
  }

  resume() {
    this.#paused = false;
    this.#lastTime = performance.now();
    this.#eventBus.emit('game:resume');
  }

  destroy() {
    if (this.#rafId) cancelAnimationFrame(this.#rafId);
    this.#currentScene?.destroy();
    this.#eventBus.clear();
    this.#inputManager.destroy();
  }

  #setupDebug() {
    window.game = {
      debug: {
        getSkillTree: () => this.#skillTree,
        getEchoes:    () => this.#echoSystem.getPassiveBonuses(),
        removeSkill:  (id) => this.#skillTree.removeSkill(id, 1),
        getScene:     () => this.#currentScene,
        setHP:        (n) => {
          const player = this.#currentScene?.getPlayerPosition?.(); // hacky
          console.log('Use getScene().player instead');
        },
      },
    };
    console.log('[Epic Refund] Debug mode. window.game.debug доступен');
  }

  get eventBus() { return this.#eventBus; }
}
