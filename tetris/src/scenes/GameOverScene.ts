import Phaser from 'phaser';
import { SCENE_KEYS, CANVAS_WIDTH, FONT_FAMILY } from '../constants/GameConstants';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.GAME_OVER });
  }

  create(data: { score: number }): void {
    const cx = CANVAS_WIDTH / 2;

    this.add.rectangle(cx, 320, 320, 240, 0x000000, 0.85).setOrigin(0.5);

    this.add.text(cx, 220, 'GAME OVER', {
      fontSize: '36px', color: '#f00000', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    this.add.text(cx, 290, `得分: ${data.score ?? 0}`, {
      fontSize: '28px', color: '#ffffff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    const restartBtn = this.add.text(cx, 370, '[ 重新开始 ]', {
      fontSize: '26px', color: '#00f0f0', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    restartBtn.on('pointerdown', () => {
      this.scene.stop(SCENE_KEYS.GAME_OVER);
      this.scene.start(SCENE_KEYS.GAME);
    });
  }
}
