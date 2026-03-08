import Phaser from 'phaser';
import {
  SCENE_KEYS, CANVAS_WIDTH, CANVAS_HEIGHT,
  FONT_FAMILY, GameMode, COLORS,
} from '../constants/GameConstants';
import { StorageUtil } from '../utils/StorageUtil';

const PAD = { top: 8, bottom: 4, left: 4, right: 4 };

export class MenuScene extends Phaser.Scene {
  private selectedMode: GameMode = 'classic';

  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  create(): void {
    const cx = CANVAS_WIDTH / 2;

    // ── 装饰蛇体 ──────────────────────────────────────────────────────────────
    this.drawSnakeDecoration(cx);

    // ── 标题 ──────────────────────────────────────────────────────────────────
    this.add.text(cx, 110, '贪吃蛇', {
      fontSize: '60px', color: '#44ff44', fontStyle: 'bold',
      padding: PAD, fontFamily: FONT_FAMILY,
      stroke: '#004400', strokeThickness: 5,
    }).setOrigin(0.5);

    // ── 最高分 ─────────────────────────────────────────────────────────────────
    const classicBest  = StorageUtil.getBest('classic');
    const enhancedBest = StorageUtil.getBest('enhanced');

    this.add.graphics()
      .lineStyle(1, 0x224422, 1)
      .lineBetween(cx - 160, 188, cx + 160, 188);

    this.add.text(cx - 80, 198, `经典最高: ${classicBest}`, {
      fontSize: '16px', color: '#88bb88', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5, 0);
    this.add.text(cx + 80, 198, `增强最高: ${enhancedBest}`, {
      fontSize: '16px', color: '#88bbff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5, 0);

    this.add.graphics()
      .lineStyle(1, 0x224422, 1)
      .lineBetween(cx - 160, 228, cx + 160, 228);

    // ── 模式选择 ───────────────────────────────────────────────────────────────
    this.add.text(cx, 250, '选择模式', {
      fontSize: '18px', color: '#668866', padding: PAD, fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    const BTN_Y   = 298;
    const BTN_W   = 160;
    const BTN_H   = 52;
    const GAP     = 20;
    const leftX   = cx - BTN_W / 2 - GAP / 2;
    const rightX  = cx + BTN_W / 2 + GAP / 2;

    // Selection highlight rectangle (behind buttons)
    const highlight = this.add.rectangle(leftX, BTN_Y, BTN_W, BTN_H, 0x224422, 1)
      .setStrokeStyle(1, 0x44ff44, 0.7);

    const classicBtn  = this.makeModeBtn(leftX,  BTN_Y, '经典模式');
    const enhancedBtn = this.makeModeBtn(rightX, BTN_Y, '增强模式');

    const modeDesc = this.add.text(cx, 342, '', {
      fontSize: '13px', color: '#88bb88', padding: PAD, fontFamily: FONT_FAMILY,
      align: 'center',
    }).setOrigin(0.5);

    const refreshModes = () => {
      const isClassic = this.selectedMode === 'classic';
      highlight.setPosition(isClassic ? leftX : rightX, BTN_Y);
      classicBtn.setColor(isClassic  ? '#ffffff' : '#557755');
      enhancedBtn.setColor(!isClassic ? '#ffffff' : '#557755');
      modeDesc.setText(isClassic
        ? '固定边界 · 单一食物 · 速度随分数递增'
        : '固定边界 · 多种食物 · 加速 / 减速 / 加分'
      );
      modeDesc.setColor(isClassic ? '#88bb88' : '#88bbff');
    };
    refreshModes();

    classicBtn.on('pointerdown', () => { this.selectedMode = 'classic';   refreshModes(); });
    enhancedBtn.on('pointerdown', () => { this.selectedMode = 'enhanced'; refreshModes(); });

    // ── 开始按钮 ───────────────────────────────────────────────────────────────
    const startBg = this.add.rectangle(cx, 440, 220, 56, 0x113311)
      .setStrokeStyle(2, 0x44ff44, 0.8);

    const startBtn = this.add.text(cx, 440, '开 始 游 戏', {
      fontSize: '28px', color: '#44ff44', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => {
      startBtn.setColor('#ffffff');
      startBg.setFillStyle(0x224422);
    });
    startBtn.on('pointerout', () => {
      startBtn.setColor('#44ff44');
      startBg.setFillStyle(0x113311);
    });
    startBtn.on('pointerdown', () => {
      this.scene.start(SCENE_KEYS.GAME, { mode: this.selectedMode });
    });

    // Make the bg rect also interactive so the whole button area is tappable
    startBg.setInteractive({ useHandCursor: true });
    startBg.on('pointerover', () => { startBtn.setColor('#ffffff'); startBg.setFillStyle(0x224422); });
    startBg.on('pointerout',  () => { startBtn.setColor('#44ff44'); startBg.setFillStyle(0x113311); });
    startBg.on('pointerdown', () => {
      this.scene.start(SCENE_KEYS.GAME, { mode: this.selectedMode });
    });

    // ── 底部提示 ───────────────────────────────────────────────────────────────
    this.add.graphics()
      .lineStyle(1, 0x224422, 1)
      .lineBetween(cx - 160, CANVAS_HEIGHT - 68, cx + 160, CANVAS_HEIGHT - 68);

    this.add.text(cx, CANVAS_HEIGHT - 54, '↑ ↓ ← → / W A S D 控制方向', {
      fontSize: '13px', color: '#446644', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);
    this.add.text(cx, CANVAS_HEIGHT - 32, 'P 暂停    手机端: 滑动控制方向', {
      fontSize: '13px', color: '#446644', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);
  }

  private drawSnakeDecoration(cx: number): void {
    const g = this.add.graphics();
    const dots = 9;
    const spacing = 22;
    const startX = cx - ((dots - 1) * spacing) / 2;
    const y = 58;

    for (let i = 0; i < dots; i++) {
      const x = startX + i * spacing;
      const isHead = i === 0;
      const color: number = isHead ? COLORS.SNAKE_HEAD : COLORS.SNAKE_BODY;
      g.fillStyle(color, 1);
      g.fillRoundedRect(x - 8, y - 8, 16, 16, isHead ? 5 : 2);

      if (isHead) {
        g.fillStyle(0x003300, 1);
        g.fillCircle(x - 3, y - 2, 2);
        g.fillCircle(x + 3, y - 2, 2);
      } else {
        g.fillStyle(0xffffff, 0.1);
        g.fillRect(x - 7, y - 7, 14, 3);
      }
    }

    // Food dot at the end
    g.fillStyle(COLORS.FOOD_NORMAL, 1);
    g.fillCircle(startX + dots * spacing, y, 7);
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(startX + dots * spacing - 2, y - 2, 2);
  }

  private makeModeBtn(x: number, y: number, label: string): Phaser.GameObjects.Text {
    return this.add.text(x, y, label, {
      fontSize: '20px', color: '#557755', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  }
}
