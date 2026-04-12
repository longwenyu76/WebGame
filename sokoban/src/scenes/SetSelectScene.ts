import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, FONT_FAMILY, COLOR_BG, SCENE_KEYS } from '../constants/GameConstants';
import { LEVEL_SETS } from '../config/levelSets';
import { StorageUtil } from '../utils/StorageUtil';

export class SetSelectScene extends Phaser.Scene {
  private hadPointerDown = false;

  constructor() { super({ key: SCENE_KEYS.SET_SELECT }); }

  create(): void {
    this.hadPointerDown = false;
    const cx = CANVAS_WIDTH / 2;

    this.add.rectangle(cx, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_BG);

    // Header
    const TOP = 66;
    this.add.rectangle(cx, TOP / 2, CANVAS_WIDTH, TOP, COLOR_BG).setDepth(10);
    this.add.rectangle(cx, TOP - 1, CANVAS_WIDTH, 2, 0x2a2a4a).setDepth(10);
    this.add.text(cx, TOP / 2, '选 择 关 卡', {
      fontSize: '24px', color: '#f39c12', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setDepth(11);

    const backBtn = this.add.text(24, TOP / 2, '← 返回', {
      fontSize: '15px', color: '#7f8c8d', fontFamily: FONT_FAMILY,
    }).setOrigin(0, 0.5).setDepth(11).setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setColor('#aabbcc'));
    backBtn.on('pointerout',  () => backBtn.setColor('#7f8c8d'));
    backBtn.on('pointerup',   () => { if (this.hadPointerDown) this.scene.start(SCENE_KEYS.MENU); });

    // Cards
    const cardW = 420, cardH = 200, gap = 24;
    const totalH = LEVEL_SETS.length * cardH + (LEVEL_SETS.length - 1) * gap;
    let cardY = TOP + (CANVAS_HEIGHT - TOP - totalH) / 2 + cardH / 2;

    LEVEL_SETS.forEach((set, i) => {
      const completed = set.levels.filter((_, li) => StorageUtil.getRecord(set.id, li).completed).length;

      // Shadow
      this.add.rectangle(cx + 3, cardY + 5, cardW, cardH, 0x0c0e16).setOrigin(0.5);
      // Card bg
      const bg = this.add.rectangle(cx, cardY, cardW, cardH, 0x2d3748)
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      // Top highlight
      this.add.rectangle(cx, cardY - cardH / 2 + 1, cardW - 8, 4, 0x7a9ab5).setOrigin(0.5, 0);
      // Left accent bar
      this.add.rectangle(cx - cardW / 2 + 4, cardY, 6, cardH - 16, 0xf39c12).setOrigin(0, 0.5);

      // Author CN
      this.add.text(cx - cardW / 2 + 28, cardY - 60, set.authorCN, {
        fontSize: '28px', color: '#f39c12', fontStyle: 'bold', fontFamily: FONT_FAMILY,
      }).setOrigin(0, 0.5);
      // Author EN
      this.add.text(cx - cardW / 2 + 28, cardY - 22, set.authorEN, {
        fontSize: '16px', color: '#7f8c8d', fontFamily: FONT_FAMILY,
      }).setOrigin(0, 0.5);
      // Level count
      this.add.text(cx - cardW / 2 + 28, cardY + 18, `${set.levels.length} 关`, {
        fontSize: '20px', color: '#ecf0f1', fontFamily: FONT_FAMILY,
      }).setOrigin(0, 0.5);
      // Completion
      const pct = set.levels.length > 0 ? Math.round(completed / set.levels.length * 100) : 0;
      this.add.text(cx + cardW / 2 - 20, cardY + 18, `已完成 ${completed} / ${set.levels.length}  (${pct}%)`, {
        fontSize: '15px', color: '#bdc3c7', fontFamily: FONT_FAMILY,
      }).setOrigin(1, 0.5);

      // Progress bar bg
      const barW = cardW - 56, barH = 8;
      const barX = cx - cardW / 2 + 28;
      const barY = cardY + 58;
      this.add.rectangle(barX + barW / 2, barY, barW, barH, 0x1e2d3d).setOrigin(0.5);
      if (completed > 0) {
        const fillW = Math.max(barH, barW * completed / set.levels.length);
        this.add.rectangle(barX, barY, fillW, barH, 0x27ae60).setOrigin(0, 0.5);
      }

      const idx = i;
      const go = () => { if (this.hadPointerDown) this.scene.start(SCENE_KEYS.SELECT, { setIndex: idx }); };
      bg.on('pointerover', () => bg.setFillStyle(0x3d4f64));
      bg.on('pointerout',  () => bg.setFillStyle(0x2d3748));
      bg.on('pointerup', go);

      cardY += cardH + gap;
    });

    this.input.on('pointerdown', () => { this.hadPointerDown = true; });
  }
}
