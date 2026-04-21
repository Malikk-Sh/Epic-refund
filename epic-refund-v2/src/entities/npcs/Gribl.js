import { NPC } from '../NPC.js';
import { DialogueRunner } from '../../systems/DialogueRunner.js';
import { GRIBL_STORY } from '../../data/dialogues/gribl_story.js';

export class Gribl extends NPC {
  typeName = 'gribl';
  color = '#a07828';
  #skillTree;

  constructor(x, y, skillTree) {
    super(x, y, 'gribl', 'Грибл');
    this.#skillTree = skillTree;
    this.setRunner(new DialogueRunner(GRIBL_STORY));
  }

  getRunnerContext() {
    return { phase: this.#skillTree.getPlayerPhase() };
  }
}
