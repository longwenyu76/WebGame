import Phaser from 'phaser';
import { SCENE_KEYS, FONT_FAMILY } from '../constants/GameConstants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.add.text(cx, cy - 40, 'Loading...', {
      fontSize: '20px', color: '#44aa44', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    const barFill = this.add.rectangle(cx - 120, cy, 0, 12, 0x44ff44).setOrigin(0, 0.5);
    this.add.rectangle(cx, cy, 240, 16, 0x1a3a1a).setOrigin(0.5);
    // barFill on top
    barFill.setDepth(1);

    this.load.on('progress', (value: number) => {
      barFill.setSize(240 * value, 12);
    });

    // 音频文件缺失时静默跳过
    this.load.on('loaderror', () => { /* ignore */ });
  }

  create(): void {
    this.scene.start(SCENE_KEYS.MENU);
  }
}
