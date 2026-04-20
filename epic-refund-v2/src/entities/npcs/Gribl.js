import { NPC } from '../NPC.js';

// Реплики Грибла меняются по фазам игрока.
const LINES_BY_PHASE = {
  god: [
    { text: 'О... Великий Убийца Королей. Не сожгите мой фургон.' },
    { text: 'Говорят, вы целый Гнилой Пик выжгли за минуту. Правда?' },
    { text: 'Я не мешаю, не мешаю. Что вам от меня, Великий?' },
  ],
  hero: [
    { text: 'Всё ещё при силе, вижу. Хорошо.' },
    { text: 'Слыхал новости? На Севере что-то очнулось.' },
    { text: 'Если хотите — у меня есть чай. Настоящий.' },
  ],
  veteran: [
    { text: 'Постарели. Видно.' },
    { text: 'Помню, как вы проходили тут в первый раз. Страшно было.' },
    { text: 'Теперь уже не страшно. Интересно только.' },
  ],
  survivor: [
    { text: 'Вы... тот самый? Герой Севера?' },
    { text: 'Простите. Не узнал. Трудно узнать.' },
    { text: 'Хотите воды? Бесплатно.' },
  ],
  nobody: [
    { text: 'Эй, старик. Потерялся?' },
    { text: 'Я бы сказал где дорога, но сам не знаю, куда вам надо.' },
    { text: 'Ты ведь был кем-то, да? Вижу по глазам.' },
  ],
};

export class Gribl extends NPC {
  typeName = 'gribl';
  color = '#a07828';
  #skillTree;

  constructor(x, y, skillTree) {
    super(x, y, 'gribl', 'Грибл');
    this.#skillTree = skillTree;
    this.refreshDialogue();
  }

  refreshDialogue() {
    const phase = this.#skillTree.getPlayerPhase();
    this.setLines(LINES_BY_PHASE[phase] ?? LINES_BY_PHASE.hero);
  }
}
