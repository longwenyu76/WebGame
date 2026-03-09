import Phaser from 'phaser';
import { SCENE_KEYS, CANVAS_WIDTH, FONT_FAMILY } from '../constants/GameConstants';
import { StorageUtil } from '../utils/StorageUtil';

export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: SCENE_KEYS.GAME_OVER }); }

  create(data: { score: number; levelIndex: number }): void {
    const cx      = CANVAS_WIDTH / 2;
    const isNew   = data.score > StorageUtil.getHighScore();
    StorageUtil.saveHighScore(data.score);
    StorageUtil.saveBestLevel(data.levelIndex + 1);

    this.add.rectangle(cx, 320, 360, 300, 0x000000, 0.90)
      .setStrokeStyle(1, 0x333366);

    this.add.text(cx, 205, 'GAME OVER', {
      fontSize: '36px', color: '#ff3333', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    if (isNew) {
      this.add.text(cx, 252, '★ 新纪录！★', {
        fontSize: '18px', color: '#ffdd00', fontStyle: 'bold', fontFamily: FONT_FAMILY,
      }).setOrigin(0.5);
    }

    const y0 = isNew ? 285 : 265;
    this.add.text(cx, y0,      `得分: ${data.score}`, { fontSize: '26px', color: '#ffffff', fontFamily: FONT_FAMILY }).setOrigin(0.5);
    this.add.text(cx, y0 + 36, `到达第 ${data.levelIndex + 1} 关`, { fontSize: '18px', color: '#aaaadd', fontFamily: FONT_FAMILY }).setOrigin(0.5);
    this.add.text(cx, y0 + 68, `最高分: ${StorageUtil.getHighScore()}`, { fontSize: '18px', color: '#ffdd44', fontFamily: FONT_FAMILY }).setOrigin(0.5);

    const btnY = y0 + 116;
    const retryBtn = this.add.text(cx - 88, btnY, '[ 重新开始 ]', {
      fontSize: '22px', color: '#6666ff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const menuBtn = this.add.text(cx + 88, btnY, '[ 回到主页 ]', {
      fontSize: '22px', color: '#ffaa44', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerover', () => retryBtn.setColor('#aaaaff')).on('pointerout', () => retryBtn.setColor('#6666ff'));
    menuBtn.on('pointerover',  () => menuBtn.setColor('#ffdd88')).on('pointerout',  () => menuBtn.setColor('#ffaa44'));

    retryBtn.on('pointerdown', () => { this.scene.stop(); this.scene.start(SCENE_KEYS.GAME, { levelIndex: 0, score: 0, lives: 3 }); });
    menuBtn.on('pointerdown',  () => { this.scene.stop(); this.scene.start(SCENE_KEYS.MENU); });
  }
}
