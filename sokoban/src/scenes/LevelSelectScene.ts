import Phaser from 'phaser';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  FONT_FAMILY, COLOR_BG, SCENE_KEYS,
} from '../constants/GameConstants';
import { LEVELS } from '../config/levels';
import { StorageUtil } from '../utils/StorageUtil';

const COLS        = 4;
const CELL_W      = 100;
const CELL_H      = 90;
const TOP_AREA    = 76;   // 标题占用的高度
const BOTTOM_AREA = 100;  // 返回按钮占用的高度
const GRID_TOP    = TOP_AREA;

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super({ key: SCENE_KEYS.SELECT }); }

  create(): void {
    const cx        = CANVAS_WIDTH / 2;
    const totalRows = Math.ceil(LEVELS.length / COLS);
    const totalH    = GRID_TOP + totalRows * CELL_H + 20;

    // 滚动到底时，内容底边停在 CANVAS_HEIGHT - BOTTOM_AREA 处
    const maxScrollY = Math.max(0, totalH - (CANVAS_HEIGHT - BOTTOM_AREA));

    // ── 世界背景 ─────────────────────────────────────────────────────────
    this.add.rectangle(cx, totalH / 2, CANVAS_WIDTH, totalH, COLOR_BG);

    // ── 可滚动关卡格子 ────────────────────────────────────────────────────
    this.drawGrid();

    // ── 固定顶部遮罩 + 标题 ───────────────────────────────────────────────
    this.add.rectangle(cx, TOP_AREA / 2, CANVAS_WIDTH, TOP_AREA, COLOR_BG)
      .setScrollFactor(0).setDepth(10);
    this.add.text(cx, TOP_AREA / 2, '选 择 关 卡', {
      fontSize: '30px', color: '#f39c12', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(11);

    // ── 固定底部遮罩 + 返回按钮 ───────────────────────────────────────────
    const coverTop = CANVAS_HEIGHT - BOTTOM_AREA;
    this.add.rectangle(cx, coverTop + BOTTOM_AREA / 2, CANVAS_WIDTH, BOTTOM_AREA, COLOR_BG)
      .setScrollFactor(0).setDepth(10);

    const backY = CANVAS_HEIGHT - BOTTOM_AREA / 2;
    this.add.rectangle(cx + 3, backY + 5, 200, 46, 0x0c0e16)
      .setOrigin(0.5).setScrollFactor(0).setDepth(11);
    const backBg = this.add.rectangle(cx, backY, 200, 46, 0x4a5568)
      .setOrigin(0.5).setScrollFactor(0).setDepth(11)
      .setInteractive({ useHandCursor: true });
    this.add.rectangle(cx, backY - 21, 192, 4, 0x7a9ab5)
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(11);
    this.add.rectangle(cx, backY + 18, 192, 4, 0x1e2d3d)
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(11);
    const backTxt = this.add.text(cx, backY, '← 返回主菜单', {
      fontSize: '18px', color: '#f9f6f2', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(11)
      .setInteractive({ useHandCursor: true });

    const back = () => this.scene.start(SCENE_KEYS.MENU);
    backBg.on('pointerdown', back);
    backTxt.on('pointerdown', back);
    backBg.on('pointerover', () => backBg.setFillStyle(0x718096));
    backBg.on('pointerout',  () => backBg.setFillStyle(0x4a5568));

    // 不用 setBounds —— 它会把 scrollY 限制在 totalH-CANVAS_HEIGHT，
    // 比考虑底部保留区的 maxScrollY 小，导致最后一行被遮罩挡住。
    // 直接由下方的 Clamp 手动控制范围。

    // ── 触摸拖拽滚动 ──────────────────────────────────────────────────────
    let dragStartY       = 0;
    let dragStartScrollY = 0;
    let isDragging       = false;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      dragStartY       = p.y;
      dragStartScrollY = this.cameras.main.scrollY;
      isDragging       = true;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!isDragging || !p.isDown) return;
      this.cameras.main.scrollY = Phaser.Math.Clamp(
        dragStartScrollY + (dragStartY - p.y), 0, maxScrollY,
      );
    });
    this.input.on('pointerup', () => { isDragging = false; });

    // ── 鼠标滚轮 ─────────────────────────────────────────────────────────
    this.input.on('wheel',
      (_p: Phaser.Input.Pointer, _go: unknown, _dx: number, dy: number) => {
        this.cameras.main.scrollY = Phaser.Math.Clamp(
          this.cameras.main.scrollY + dy, 0, maxScrollY,
        );
      },
    );
  }

  private drawGrid(): void {
    const padX = (CANVAS_WIDTH - COLS * CELL_W) / 2 + CELL_W / 2;

    for (let i = 0; i < LEVELS.length; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x   = padX + col * CELL_W;
      const y   = GRID_TOP + row * CELL_H + CELL_H / 2;
      const rec = StorageUtil.getRecord(i);

      const bgColor = rec.completed ? 0x1e6b3a : 0x2d3748;
      const bg = this.add.rectangle(x, y, CELL_W - 12, CELL_H - 10, bgColor)
        .setOrigin(0.5).setInteractive({ useHandCursor: true });

      this.add.text(x, y - 22, String(i + 1), {
        fontSize: '20px', color: '#ecf0f1', fontStyle: 'bold', fontFamily: FONT_FAMILY,
      }).setOrigin(0.5);

      if (rec.completed) {
        const stars = '★'.repeat(rec.stars) + '☆'.repeat(3 - rec.stars);
        this.add.text(x, y + 2, stars, {
          fontSize: '14px', color: '#f39c12', fontFamily: FONT_FAMILY,
        }).setOrigin(0.5);
        if (rec.bestMoves > 0) {
          this.add.text(x, y + 20, `${rec.bestMoves}步`, {
            fontSize: '14px', color: '#bdc3c7', fontFamily: FONT_FAMILY,
          }).setOrigin(0.5);
        }
      }

      const over = () => bg.setFillStyle(rec.completed ? 0x27ae60 : 0x4a5568);
      const out  = () => bg.setFillStyle(bgColor);
      const idx  = i;
      bg.on('pointerover', over).on('pointerout', out)
        .on('pointerdown', () => this.scene.start(SCENE_KEYS.GAME, { levelIndex: idx }));
    }
  }
}
