import Phaser from 'phaser';
import { SCENE_KEYS, CANVAS_WIDTH, FONT_FAMILY } from '../constants/GameConstants';

export class LevelClearScene extends Phaser.Scene {
  constructor() { super({ key: SCENE_KEYS.LEVEL_CLEAR }); }

  create(data: { levelIndex: number; score: number; lives: number; bonus: number }): void {
    const cx = CANVAS_WIDTH / 2;

    this.add.rectangle(cx, 320, 340, 220, 0x000000, 0.88)
      .setStrokeStyle(1, 0x4444aa);

    this.add.text(cx, 230, `第 ${data.levelIndex + 1} 关通过！`, {
      fontSize: '28px', color: '#6666ff', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    this.add.text(cx, 285, `本关得分奖励: +${data.bonus}`, {
      fontSize: '20px', color: '#ffdd44', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    this.add.text(cx, 320, `当前总分: ${data.score}`, {
      fontSize: '20px', color: '#ffffff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    this.add.text(cx, 360, `剩余命数: ${data.lives}`, {
      fontSize: '18px', color: '#ff66aa', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    this.add.text(cx, 410, '准备进入下一关…', {
      fontSize: '16px', color: '#666699', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    // 2 秒后自动跳转
    this.time.delayedCall(2000, () => {
      this.scene.stop(SCENE_KEYS.LEVEL_CLEAR);
      this.scene.start(SCENE_KEYS.GAME, {
        levelIndex: data.levelIndex + 1,
        score:      data.score,
        lives:      data.lives,
      });
    });
  }
}
