import Phaser from 'phaser';
import { SCENE_KEYS, CANVAS_WIDTH, FONT_FAMILY, SCORE } from '../constants/GameConstants';
import { StorageUtil } from '../utils/StorageUtil';

export class GameClearScene extends Phaser.Scene {
  constructor() { super({ key: SCENE_KEYS.GAME_CLEAR }); }

  create(data: { score: number; lives: number }): void {
    const cx       = CANVAS_WIDTH / 2;
    const lifeBonus = data.lives * SCORE.LIFE_BONUS;
    const total     = data.score + lifeBonus;
    const isNew     = total > StorageUtil.getHighScore();
    StorageUtil.saveHighScore(total);

    this.add.rectangle(cx, 330, 360, 320, 0x000000, 0.92)
      .setStrokeStyle(1, 0x4444aa);

    this.add.text(cx, 210, '全 关 通 关 ！', {
      fontSize: '36px', color: '#ffdd00', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    if (isNew) {
      this.add.text(cx, 258, '★ 新纪录！★', {
        fontSize: '20px', color: '#ff8800', fontStyle: 'bold', fontFamily: FONT_FAMILY,
      }).setOrigin(0.5);
    }

    const y0 = isNew ? 295 : 270;
    this.add.text(cx, y0,      `游戏得分: ${data.score}`, { fontSize: '18px', color: '#ccccff', fontFamily: FONT_FAMILY }).setOrigin(0.5);
    this.add.text(cx, y0 + 32, `命数奖励: +${lifeBonus}（${data.lives} 命 × ${SCORE.LIFE_BONUS}）`, { fontSize: '16px', color: '#ff66aa', fontFamily: FONT_FAMILY }).setOrigin(0.5);
    this.add.text(cx, y0 + 68, `最终得分: ${total}`, { fontSize: '22px', color: '#ffffff', fontFamily: FONT_FAMILY }).setOrigin(0.5);

    const nextY = y0 + 118;
    const replayBtn = this.add.text(cx - 88, nextY, '[ 重新挑战 ]', {
      fontSize: '22px', color: '#6666ff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const menuBtn = this.add.text(cx + 88, nextY, '[ 回到主页 ]', {
      fontSize: '22px', color: '#ffaa44', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    replayBtn.on('pointerover', () => replayBtn.setColor('#aaaaff')).on('pointerout', () => replayBtn.setColor('#6666ff'));
    menuBtn.on('pointerover',   () => menuBtn.setColor('#ffdd88')).on('pointerout',   () => menuBtn.setColor('#ffaa44'));

    replayBtn.on('pointerdown', () => this.scene.start(SCENE_KEYS.GAME, { levelIndex: 0, score: 0, lives: 3 }));
    menuBtn.on('pointerdown',   () => this.scene.start(SCENE_KEYS.MENU));
  }
}
