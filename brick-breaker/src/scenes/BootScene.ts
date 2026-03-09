import Phaser from 'phaser';
import { SCENE_KEYS, FONT_FAMILY } from '../constants/GameConstants';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: SCENE_KEYS.BOOT }); }

  preload(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.add.text(cx, cy - 40, 'Loading...', {
      fontSize: '20px', color: '#aaaacc', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    const fill = this.add.rectangle(cx - 120, cy, 0, 12, 0x4444ff).setOrigin(0, 0.5).setDepth(1);
    this.add.rectangle(cx, cy, 240, 16, 0x1a1a3a).setOrigin(0.5);

    this.load.on('progress', (v: number) => fill.setSize(240 * v, 12));
    this.load.on('loaderror', () => { /* ignore missing assets */ });
  }

  create(): void {
    this.scene.start(SCENE_KEYS.MENU);
  }
}
