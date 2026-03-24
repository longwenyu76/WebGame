import Phaser from 'phaser';
import { SCENE_KEYS } from '../constants/GameConstants';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: SCENE_KEYS.BOOT }); }

  preload(): void {
    this.load.atlasXML(
      'sokoban',
      'assets/sokoban_spritesheet.png',
      'assets/sokoban_spritesheet.xml',
    );
  }

  create(): void {
    this.scene.start(SCENE_KEYS.MENU);
  }
}
