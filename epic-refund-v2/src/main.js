import { Game } from './core/Game.js';
import { GameScene } from './ui/GameScene.js';
import { MobileControls } from './ui/MobileControls.js';
import { SettingsMenu } from './ui/SettingsMenu.js';
import { MobileFeedback } from './ui/MobileFeedback.js';

const canvas = document.getElementById('game-canvas');
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');

function setProgress(pct) {
  progressBar.style.width = pct + '%';
}

async function main() {
  try {
    setProgress(15);

    const game = new Game();
    await game.init(canvas);

    setProgress(45);

    // Пока нет готовых спрайт-листов, персонажи отрисовываются
    // индивидуальными процедурными пиксельными силуэтами в ActorArt.js.
    // При регистрации готовых спрайтов SpriteRegistry заменит их автоматически.

    await game.loadScene(GameScene);
    const controls = new MobileControls(game.inputManager, game.eventBus);
    const feedback = new MobileFeedback(game.eventBus, controls);
    new SettingsMenu(game, controls, feedback);
    setProgress(100);

    setTimeout(() => {
      loadingScreen.classList.add('hidden');
      setTimeout(() => loadingScreen.remove(), 700);
    }, 300);

    game.start();

    console.log('[Epic Refund] Milestone 2 запущен: Уровень 1 «Гнилой Пик»');
    console.log('[Epic Refund] WASD — движение · J — атака · K — тяжёлый/парирование · Shift — перекат · E — взаимодействие');
  } catch (err) {
    console.error('[Epic Refund] Ошибка инициализации:', err);
    loadingScreen.innerHTML = `
      <h1 style="color: #e74c3c; letter-spacing: 0.05em;">Ошибка</h1>
      <p style="color: #7a6a4a; max-width: 80%; text-align: center; font-family: monospace; font-size: 0.8rem; margin-top: 1rem;">
        ${err.message}
      </p>
    `;
  }
}

main();
