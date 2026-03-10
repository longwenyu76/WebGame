import Phaser from 'phaser';
import { SCENE_KEYS } from '../constants/GameConstants';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: SCENE_KEYS.BOOT }); }

  preload(): void {
    // No assets to load — all rendering is procedural
  }

  create(): void {
    this.scene.start(SCENE_KEYS.GAME);
  }
}
