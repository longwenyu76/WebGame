import Phaser from 'phaser';
import { SCENE_KEYS, CANVAS_WIDTH, FONT_FAMILY } from '../constants/GameConstants';

// Phase 5 で詳細実装予定 — minimal placeholder
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.SETTINGS });
  }

  create(): void {
    const cx = CANVAS_WIDTH / 2;

    this.add.text(cx, 200, '设置', {
      fontSize: '32px', color: '#44ff44', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    this.add.text(cx, 280, '(音效设置 开发中…)', {
      fontSize: '18px', color: '#888888', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    const backBtn = this.add.text(cx, 380, '[ 返回 ]', {
      fontSize: '22px', color: '#aaaaaa', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout',  () => backBtn.setColor('#aaaaaa'));
    backBtn.on('pointerdown', () => this.scene.start(SCENE_KEYS.MENU));
  }
}
