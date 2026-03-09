import Phaser from 'phaser';
import { SCENE_KEYS, CANVAS_WIDTH, FONT_FAMILY, GameMode } from '../constants/GameConstants';
import { GameScene } from './GameScene';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.PAUSE });
  }

  create(data: { mode?: GameMode }): void {
    const cx   = CANVAS_WIDTH / 2;
    const cy   = 310;
    const mode = data?.mode ?? 'classic';

    // Backdrop
    this.add.rectangle(cx, cy, 320, 240, 0x000000, 0.92)
      .setStrokeStyle(1, 0x224422, 1);

    // Title
    this.add.text(cx, cy - 85, '已暂停', {
      fontSize: '28px', color: '#44ff44', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    // ── 继续游戏 ──────────────────────────────────────────────────────────────
    const resumeBtn = this.add.text(cx, cy - 30, '[ 继续游戏 ]', {
      fontSize: '22px', color: '#ffffff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    resumeBtn.on('pointerover', () => resumeBtn.setColor('#44ff44'));
    resumeBtn.on('pointerout',  () => resumeBtn.setColor('#ffffff'));
    resumeBtn.on('pointerdown', () => {
      const gameScene = this.scene.get(SCENE_KEYS.GAME) as GameScene;
      gameScene.togglePause();
    });

    // ── 重新开始 ──────────────────────────────────────────────────────────────
    const restartBtn = this.add.text(cx, cy + 22, '[ 重新开始 ]', {
      fontSize: '20px', color: '#88ccff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    restartBtn.on('pointerover', () => restartBtn.setColor('#bbddff'));
    restartBtn.on('pointerout',  () => restartBtn.setColor('#88ccff'));
    restartBtn.on('pointerdown', () => {
      this.scene.stop(SCENE_KEYS.PAUSE);
      this.scene.start(SCENE_KEYS.GAME, { mode });
    });

    // ── 回到主页 ──────────────────────────────────────────────────────────────
    const menuBtn = this.add.text(cx, cy + 72, '[ 回到主页 ]', {
      fontSize: '20px', color: '#ffaa44', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerover', () => menuBtn.setColor('#ffdd88'));
    menuBtn.on('pointerout',  () => menuBtn.setColor('#ffaa44'));
    menuBtn.on('pointerdown', () => {
      this.scene.stop(SCENE_KEYS.PAUSE);
      this.scene.stop(SCENE_KEYS.GAME);
      this.scene.start(SCENE_KEYS.MENU);
    });
  }
}
