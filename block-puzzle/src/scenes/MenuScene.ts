import Phaser from 'phaser';
import { SCENE_KEYS, CANVAS_WIDTH, CANVAS_HEIGHT, FONT_FAMILY } from '../constants/GameConstants';
import { StorageUtil } from '../utils/StorageUtil';
import { SettingsManager } from '../utils/SettingsManager';

const PAD  = { top: 8, bottom: 4, left: 4, right: 4 };
const FONT = FONT_FAMILY;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  create(): void {
    const cx = CANVAS_WIDTH / 2;

    // ── 返回平台 ────────────────────────────────────────────────────────────────
    const backBtn = this.add.text(12, 12, '← 游戏平台', {
      fontSize: '14px', color: '#445566', fontFamily: FONT,
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setColor('#aabbcc'));
    backBtn.on('pointerout',  () => backBtn.setColor('#445566'));
    backBtn.on('pointerdown', () => { window.location.href = '../'; });

    this.add.text(cx, 148, '方块消除', {
      fontSize: '48px', color: '#00f0f0', fontStyle: 'bold', padding: PAD, fontFamily: FONT,
    }).setOrigin(0.5);
    this.add.text(cx, 200, 'Block Puzzle', {
      fontSize: '18px', color: '#337799', fontFamily: FONT,
    }).setOrigin(0.5);

    const highScore = StorageUtil.getHighScore();
    this.add.text(cx, 228, `最高分: ${highScore}`, {
      fontSize: '24px', color: '#aaaaaa', padding: PAD, fontFamily: FONT,
    }).setOrigin(0.5);

    // ── 难度选择 ────────────────────────────────────────────────────────────────

    const diffLabel = this.add.text(cx, 310, '', {
      fontSize: '18px', color: '#cccccc', padding: PAD, fontFamily: FONT,
    }).setOrigin(0.5);

    const settings = SettingsManager.get();
    let difficulty = settings.difficulty;

    const updateDiffLabel = () => {
      if (difficulty === 'hard') {
        diffLabel.setText('难度: [ 困难 ]  (无辅助线)');
        diffLabel.setColor('#ff8844');
      } else {
        diffLabel.setText('难度: [ 普通 ]');
        diffLabel.setColor('#cccccc');
      }
    };
    updateDiffLabel();

    diffLabel.setInteractive({ useHandCursor: true });
    diffLabel.on('pointerover', () => diffLabel.setAlpha(0.75));
    diffLabel.on('pointerout',  () => diffLabel.setAlpha(1));
    diffLabel.on('pointerdown', () => {
      difficulty = difficulty === 'normal' ? 'hard' : 'normal';
      SettingsManager.update({ difficulty });
      updateDiffLabel();
    });

    // ── 开始按钮 ────────────────────────────────────────────────────────────────

    const startBtn = this.add.text(cx, 390, '[ 开始游戏 ]', {
      fontSize: '32px', color: '#ffffff', padding: PAD, fontFamily: FONT,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setColor('#00f0f0'));
    startBtn.on('pointerout',  () => startBtn.setColor('#ffffff'));
    startBtn.on('pointerdown', () => this.scene.start(SCENE_KEYS.GAME));

    // ── 设置按钮 ────────────────────────────────────────────────────────────────

    const settingsBtn = this.add.text(cx, 460, '[ 音量设置 ]', {
      fontSize: '20px', color: '#888899', padding: PAD, fontFamily: FONT,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    settingsBtn.on('pointerover', () => settingsBtn.setColor('#aaaacc'));
    settingsBtn.on('pointerout',  () => settingsBtn.setColor('#888899'));
    settingsBtn.on('pointerdown', () => this.scene.start(SCENE_KEYS.SETTINGS));

    // ── 键盘提示 ────────────────────────────────────────────────────────────────

    this.add.text(cx, CANVAS_HEIGHT - 40, '← → 移动  ↑/Z 旋转  X 逆转  空格 落地', {
      fontSize: '13px', color: '#555577', padding: PAD, fontFamily: FONT,
    }).setOrigin(0.5);
  }
}
