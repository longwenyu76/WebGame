import Phaser from 'phaser';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  FONT_FAMILY, COLOR_BG, SCENE_KEYS,
} from '../constants/GameConstants';
import { LEVELS } from '../config/levels';
import { StorageUtil } from '../utils/StorageUtil';

const PER_PAGE = 20;   // 每页显示关卡数（5行×4列）
const COLS     = 4;
const CELL_W   = 100;
const CELL_H   = 88;

export class LevelSelectScene extends Phaser.Scene {
  private page: number = 0;

  constructor() { super({ key: SCENE_KEYS.SELECT }); }

  init(data: { page?: number }): void {
    this.page = data.page ?? 0;
  }

  create(): void {
    const cx        = CANVAS_WIDTH / 2;
    const totalPages = Math.ceil(LEVELS.length / PER_PAGE);

    this.add.rectangle(cx, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_BG);

    // 标题
    this.add.text(cx, 36, '选 择 关 卡', {
      fontSize: '30px', color: '#f39c12', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    // 页码
    if (totalPages > 1) {
      this.add.text(cx, 68, `第 ${this.page + 1} / ${totalPages} 页`, {
        fontSize: '14px', color: '#7f8c8d', fontFamily: FONT_FAMILY,
      }).setOrigin(0.5);
    }

    // 关卡格子
    this.drawGrid();

    // 底部导航区
    const navY  = CANVAS_HEIGHT - 150;
    const backY = CANVAS_HEIGHT - 72;

    // 上一页 / 下一页
    if (totalPages > 1) {
      if (this.page > 0) {
        this.makeNavBtn(cx - 100, navY, '◀  上一页', () =>
          this.scene.restart({ page: this.page - 1 }));
      }
      if (this.page < totalPages - 1) {
        this.makeNavBtn(cx + 100, navY, '下一页  ▶', () =>
          this.scene.restart({ page: this.page + 1 }));
      }
    }

    // 返回主菜单
    this.add.rectangle(cx + 3, backY + 5, 200, 46, 0x0c0e16).setOrigin(0.5);
    const backBg = this.add.rectangle(cx, backY, 200, 46, 0x4a5568)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.add.rectangle(cx, backY - 21, 192, 4, 0x7a9ab5).setOrigin(0.5, 0);
    this.add.rectangle(cx, backY + 18, 192, 4, 0x1e2d3d).setOrigin(0.5, 0);
    const backTxt = this.add.text(cx, backY, '← 返回主菜单', {
      fontSize: '18px', color: '#f9f6f2', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const back = () => this.scene.start(SCENE_KEYS.MENU);
    backBg.on('pointerdown', back);
    backTxt.on('pointerdown', back);
  }

  private drawGrid(): void {
    const startIdx = this.page * PER_PAGE;
    const endIdx   = Math.min(startIdx + PER_PAGE, LEVELS.length);

    const padX   = (CANVAS_WIDTH - COLS * CELL_W) / 2 + CELL_W / 2;
    const startY = 130;

    for (let i = startIdx; i < endIdx; i++) {
      const localIdx = i - startIdx;
      const col = localIdx % COLS;
      const row = Math.floor(localIdx / COLS);
      const x   = padX + col * CELL_W;
      const y   = startY + row * CELL_H;
      const rec = StorageUtil.getRecord(i);

      const bgColor = rec.completed ? 0x1e6b3a : 0x2d3748;
      const bg = this.add.rectangle(x, y, CELL_W - 12, CELL_H - 10, bgColor, 1)
        .setOrigin(0.5).setInteractive({ useHandCursor: true });

      this.add.text(x, y - 22, String(i + 1), {
        fontSize: '20px', color: '#ecf0f1', fontStyle: 'bold', fontFamily: FONT_FAMILY,
      }).setOrigin(0.5);

      if (rec.completed) {
        const stars = '★'.repeat(rec.stars) + '☆'.repeat(3 - rec.stars);
        this.add.text(x, y + 2, stars, {
          fontSize: '13px', color: '#f39c12', fontFamily: FONT_FAMILY,
        }).setOrigin(0.5);
        if (rec.bestMoves > 0) {
          this.add.text(x, y + 20, `${rec.bestMoves}步`, {
            fontSize: '11px', color: '#bdc3c7', fontFamily: FONT_FAMILY,
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

  private makeNavBtn(x: number, y: number, label: string, fn: () => void): void {
    this.add.rectangle(x + 3, y + 5, 160, 42, 0x0c0e16).setOrigin(0.5);
    const bg = this.add.rectangle(x, y, 160, 42, 0x4a5568)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.add.rectangle(x, y - 19, 152, 3, 0x7a9ab5).setOrigin(0.5, 0);
    this.add.rectangle(x, y + 16, 152, 3, 0x1e2d3d).setOrigin(0.5, 0);
    const txt = this.add.text(x, y, label, {
      fontSize: '16px', color: '#f9f6f2', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    bg.on('pointerdown', fn);
    txt.on('pointerdown', fn);
    bg.on('pointerover', () => bg.setFillStyle(0x718096));
    bg.on('pointerout',  () => bg.setFillStyle(0x4a5568));
  }
}
