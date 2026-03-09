import Phaser from 'phaser';
import { SCENE_KEYS, CANVAS_WIDTH, FONT_FAMILY } from '../constants/GameConstants';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.GAME_OVER });
  }

  create(data: { score: number }): void {
    const cx = CANVAS_WIDTH / 2;

    this.add.rectangle(cx, 320, 340, 270, 0x000000, 0.85).setOrigin(0.5);

    this.add.text(cx, 210, 'GAME OVER', {
      fontSize: '36px', color: '#f00000', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    this.add.text(cx, 278, `得分: ${data.score ?? 0}`, {
      fontSize: '28px', color: '#ffffff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    const restartBtn = this.add.text(cx - 86, 348, '[ 重新开始 ]', {
      fontSize: '22px', color: '#00f0f0', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const menuBtn = this.add.text(cx + 86, 348, '[ 回到主页 ]', {
      fontSize: '22px', color: '#ffaa44', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    restartBtn.on('pointerover', () => restartBtn.setColor('#88ffff'));
    restartBtn.on('pointerout',  () => restartBtn.setColor('#00f0f0'));
    restartBtn.on('pointerdown', () => {
      this.scene.stop(SCENE_KEYS.GAME_OVER);
      this.scene.start(SCENE_KEYS.GAME);
    });

    menuBtn.on('pointerover', () => menuBtn.setColor('#ffdd88'));
    menuBtn.on('pointerout',  () => menuBtn.setColor('#ffaa44'));
    menuBtn.on('pointerdown', () => {
      this.scene.stop(SCENE_KEYS.GAME_OVER);
      this.scene.stop(SCENE_KEYS.GAME);
      this.scene.start(SCENE_KEYS.MENU);
    });
  }
}
