import Phaser from 'phaser';
import {
  SCENE_KEYS, CANVAS_WIDTH, CANVAS_HEIGHT, FONT_FAMILY,
  BRICK_W, BRICK_H, BRICK_GAP_X, BRICK_AREA_X,
  NORMAL_BRICK_COLORS,
} from '../constants/GameConstants';
import { StorageUtil } from '../utils/StorageUtil';

const PAD = { top: 6, bottom: 4, left: 4, right: 4 };

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: SCENE_KEYS.MENU }); }

  create(): void {
    const cx = CANVAS_WIDTH / 2;

    // ── 装饰砖块 ──────────────────────────────────────────────────────────────
    this.drawDecoBricks();

    // ── 标题 ──────────────────────────────────────────────────────────────────
    this.add.text(cx, 140, '敲砖英雄', {
      fontSize: '52px', color: '#ffffff', fontStyle: 'bold',
      padding: PAD, fontFamily: FONT_FAMILY,
      stroke: '#0000aa', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(cx, 196, 'Brick Breaker', {
      fontSize: '18px', color: '#334477', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    // ── 分数与最高关卡 ─────────────────────────────────────────────────────────
    const highScore = StorageUtil.getHighScore();
    const bestLevel = StorageUtil.getBestLevel();

    this.add.graphics()
      .lineStyle(1, 0x333366, 1)
      .lineBetween(cx - 160, 202, cx + 160, 202);

    this.add.text(cx - 70, 212, `最高分: ${highScore}`, {
      fontSize: '17px', color: '#aaaadd', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5, 0);

    this.add.text(cx + 70, 212, `最高关: ${bestLevel}`, {
      fontSize: '17px', color: '#aaaadd', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5, 0);

    this.add.graphics()
      .lineStyle(1, 0x333366, 1)
      .lineBetween(cx - 160, 242, cx + 160, 242);

    // ── 开始按钮 ───────────────────────────────────────────────────────────────
    const startBg = this.add.rectangle(cx, 320, 220, 56, 0x0a0a2a)
      .setStrokeStyle(2, 0x4444ff, 1);

    const startBtn = this.add.text(cx, 320, '开 始 游 戏', {
      fontSize: '28px', color: '#6666ff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const hover = () => { startBtn.setColor('#ffffff'); startBg.setFillStyle(0x1a1a44); };
    const out   = () => { startBtn.setColor('#6666ff'); startBg.setFillStyle(0x0a0a2a); };
    const go    = () => this.scene.start(SCENE_KEYS.GAME, { levelIndex: 0, score: 0, lives: 3 });

    startBtn.on('pointerover', hover).on('pointerout', out).on('pointerdown', go);
    startBg.setInteractive({ useHandCursor: true })
      .on('pointerover', hover).on('pointerout', out).on('pointerdown', go);

    // ── 道具说明（简版） ───────────────────────────────────────────────────────
    this.add.text(cx, 400, '道 具 一 览', {
      fontSize: '16px', color: '#666699', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    const items = [
      ['宽板', '#44ff44'], ['窄板', '#ff3333'], ['快球', '#ff8800'],
      ['慢球', '#4488ff'], ['多球', '#ffdd00'], ['火球', '#ff4400'], ['+命', '#ff66aa'],
    ];
    const itemW = 54;
    const startItemX = cx - (items.length * itemW) / 2 + itemW / 2;
    items.forEach(([label, color], i) => {
      this.add.text(startItemX + i * itemW, 424, label, {
        fontSize: '13px', color, fontFamily: FONT_FAMILY,
      }).setOrigin(0.5);
    });

    // ── 操作提示 ───────────────────────────────────────────────────────────────
    this.add.graphics()
      .lineStyle(1, 0x333366, 1)
      .lineBetween(cx - 160, CANVAS_HEIGHT - 74, cx + 160, CANVAS_HEIGHT - 74);

    this.add.text(cx, CANVAS_HEIGHT - 58, '← → / 鼠标移动 控制挡板', {
      fontSize: '13px', color: '#445566', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);
    this.add.text(cx, CANVAS_HEIGHT - 36, '空格 / 点击 发球    P 暂停', {
      fontSize: '13px', color: '#445566', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);
  }

  private drawDecoBricks(): void {
    const g = this.add.graphics();
    const rows = 3;
    for (let row = 0; row < rows; row++) {
      const color = NORMAL_BRICK_COLORS[row % NORMAL_BRICK_COLORS.length];
      for (let col = 0; col < 10; col++) {
        const bx = BRICK_AREA_X + col * (BRICK_W + BRICK_GAP_X);
        const by = 14 + row * (BRICK_H + 4);
        g.fillStyle(color, 1);
        g.fillRoundedRect(bx, by, BRICK_W, BRICK_H, 3);
        g.fillStyle(0xffffff, 0.15);
        g.fillRect(bx + 2, by + 2, BRICK_W - 4, 4);
      }
    }
  }
}
