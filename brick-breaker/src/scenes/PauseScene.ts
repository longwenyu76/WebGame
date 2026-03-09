import Phaser from 'phaser';
import { SCENE_KEYS, CANVAS_WIDTH, FONT_FAMILY } from '../constants/GameConstants';
import { GameScene } from './GameScene';

export class PauseScene extends Phaser.Scene {
  constructor() { super({ key: SCENE_KEYS.PAUSE }); }

  create(): void {
    const cx = CANVAS_WIDTH / 2;
    const cy = 320;

    this.add.rectangle(cx, cy, 300, 220, 0x000000, 0.92)
      .setStrokeStyle(1, 0x333366);

    this.add.text(cx, cy - 80, '已暂停', {
      fontSize: '28px', color: '#6666ff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    const resumeBtn = this.add.text(cx, cy - 20, '[ 继续游戏 ]', {
      fontSize: '22px', color: '#ffffff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const restartBtn = this.add.text(cx, cy + 30, '[ 重新开始 ]', {
      fontSize: '20px', color: '#88aaff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const menuBtn = this.add.text(cx, cy + 80, '[ 回到主页 ]', {
      fontSize: '20px', color: '#ffaa44', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    resumeBtn.on('pointerover',  () => resumeBtn.setColor('#6666ff')).on('pointerout', () => resumeBtn.setColor('#ffffff'));
    restartBtn.on('pointerover', () => restartBtn.setColor('#bbccff')).on('pointerout', () => restartBtn.setColor('#88aaff'));
    menuBtn.on('pointerover',    () => menuBtn.setColor('#ffdd88')).on('pointerout',    () => menuBtn.setColor('#ffaa44'));

    resumeBtn.on('pointerdown', () => {
      (this.scene.get(SCENE_KEYS.GAME) as GameScene).togglePause();
    });
    restartBtn.on('pointerdown', () => {
      this.scene.stop(SCENE_KEYS.PAUSE);
      this.scene.start(SCENE_KEYS.GAME, { levelIndex: 0, score: 0, lives: 3 });
    });
    menuBtn.on('pointerdown', () => {
      this.scene.stop(SCENE_KEYS.PAUSE);
      this.scene.stop(SCENE_KEYS.GAME);
      this.scene.start(SCENE_KEYS.MENU);
    });
  }
}
