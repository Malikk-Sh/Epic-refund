import { Game } from './core/Game.js';
import { GameScene } from './ui/GameScene.js';

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

    // Здесь можно зарегистрировать спрайты, если они есть в assets/sprites/:
    //   game.spriteRegistry.register('player', 'assets/sprites/player.png', { width: 16, height: 16 });
    //   game.spriteRegistry.register('slime',  'assets/sprites/slime.png',  { width: 16, height: 12 });
    //   game.spriteRegistry.register('goblin', 'assets/sprites/goblin.png', { width: 14, height: 16 });
    // Пока ассетов нет — используются плейсхолдеры с подписями.

    await game.loadScene(GameScene);
    setProgress(100);

    setTimeout(() => {
      loadingScreen.classList.add('hidden');
      setTimeout(() => loadingScreen.remove(), 700);
    }, 300);

    game.start();

    console.log('[Epic Refund] Milestone 1 запущен: Уровень 2 «Казармы Тьмы»');
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
