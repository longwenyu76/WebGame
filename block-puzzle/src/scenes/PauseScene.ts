import Phaser from 'phaser';
import { SCENE_KEYS, CANVAS_WIDTH, FONT_FAMILY } from '../constants/GameConstants';

const PAD = { top: 6, bottom: 4 };

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.PAUSE });
  }

  create(): void {
    const cx = CANVAS_WIDTH / 2;

    this.add.rectangle(cx, 320, 280, 240, 0x000000, 0.88)
      .setOrigin(0.5)
      .setStrokeStyle(1, 0x333366);

    this.add.text(cx, 230, '已暂停', {
      fontSize: '36px', color: '#ffffff', fontStyle: 'bold',
      fontFamily: FONT_FAMILY, padding: { top: 8, bottom: 4 },
    }).setOrigin(0.5);

    // ── 继续 ────────────────────────────────────────────────────────────────────

    const resumeBtn = this.add.text(cx, 295, '[ 继续游戏 ]', {
      fontSize: '24px', color: '#00f0f0', padding: PAD, fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    resumeBtn.on('pointerover', () => resumeBtn.setAlpha(0.7));
    resumeBtn.on('pointerout',  () => resumeBtn.setAlpha(1));
    resumeBtn.on('pointerdown', () => {
      const gameScene = this.scene.get(SCENE_KEYS.GAME) as unknown as { togglePause: () => void };
      gameScene.togglePause();
    });

    // ── 设置 ────────────────────────────────────────────────────────────────────

    const settingsBtn = this.add.text(cx, 348, '[ 设置 ]', {
      fontSize: '20px', color: '#aaaacc', padding: PAD, fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    settingsBtn.on('pointerover', () => settingsBtn.setAlpha(0.7));
    settingsBtn.on('pointerout',  () => settingsBtn.setAlpha(1));
    settingsBtn.on('pointerdown', () => {
      this.scene.stop();
      this.scene.launch(SCENE_KEYS.SETTINGS, { from: 'game' });
    });

    // ── 回主页 ──────────────────────────────────────────────────────────────────

    const homeBtn = this.add.text(cx, 396, '[ 回到主页 ]', {
      fontSize: '20px', color: '#ff8844', padding: PAD, fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    homeBtn.on('pointerover', () => homeBtn.setAlpha(0.7));
    homeBtn.on('pointerout',  () => homeBtn.setAlpha(1));
    homeBtn.on('pointerdown', () => {
      this.scene.stop(SCENE_KEYS.PAUSE);
      this.scene.stop(SCENE_KEYS.GAME);
      this.scene.start(SCENE_KEYS.MENU);
    });
  }
}
