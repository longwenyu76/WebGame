import Phaser from 'phaser';
import {
  CELL_SIZE,
  COLORS,
  INFO_PANEL_X,
  GRID_OFFSET_Y,
  FONT_FAMILY,
} from '../constants/GameConstants';
import { Tetromino, TetrominoType } from '../game/Tetromino';
import { StorageUtil } from '../utils/StorageUtil';

const PANEL_X = INFO_PANEL_X;
const LABEL_COLOR = '#8888aa';
const VALUE_COLOR = '#ffffff';
const SECTION_GAP = 28;

export class InfoPanel {
  private scene: Phaser.Scene;
  private nextGraphics: Phaser.GameObjects.Graphics;
  private scoreText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private linesText: Phaser.GameObjects.Text;
  private bestText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    let y = GRID_OFFSET_Y;

    // ── NEXT ──────────────────────────────────────────────────────────────────
    scene.add.text(PANEL_X, y, 'NEXT', { fontSize: '14px', color: LABEL_COLOR, fontFamily: FONT_FAMILY });
    y += 20;

    // 预览框背景
    const previewSize = CELL_SIZE * 4;
    scene.add.rectangle(PANEL_X + previewSize / 2, y + previewSize / 2, previewSize, previewSize, 0x0d0d1a)
      .setStrokeStyle(1, 0x333355);

    this.nextGraphics = scene.add.graphics();
    y += previewSize + SECTION_GAP;

    // ── SCORE ─────────────────────────────────────────────────────────────────
    scene.add.text(PANEL_X, y, 'SCORE', { fontSize: '14px', color: LABEL_COLOR, fontFamily: FONT_FAMILY });
    y += 20;
    this.scoreText = scene.add.text(PANEL_X, y, '0', { fontSize: '22px', color: VALUE_COLOR, fontFamily: FONT_FAMILY });
    y += 32 + SECTION_GAP;

    // ── LEVEL ─────────────────────────────────────────────────────────────────
    scene.add.text(PANEL_X, y, 'LEVEL', { fontSize: '14px', color: LABEL_COLOR, fontFamily: FONT_FAMILY });
    y += 20;
    this.levelText = scene.add.text(PANEL_X, y, '1', { fontSize: '22px', color: VALUE_COLOR, fontFamily: FONT_FAMILY });
    y += 32 + SECTION_GAP;

    // ── LINES ─────────────────────────────────────────────────────────────────
    scene.add.text(PANEL_X, y, 'LINES', { fontSize: '14px', color: LABEL_COLOR, fontFamily: FONT_FAMILY });
    y += 20;
    this.linesText = scene.add.text(PANEL_X, y, '0', { fontSize: '22px', color: VALUE_COLOR, fontFamily: FONT_FAMILY });
    y += 32 + SECTION_GAP;

    // ── BEST ──────────────────────────────────────────────────────────────────
    scene.add.text(PANEL_X, y, 'BEST', { fontSize: '14px', color: LABEL_COLOR, fontFamily: FONT_FAMILY });
    y += 20;
    this.bestText = scene.add.text(PANEL_X, y, String(StorageUtil.getHighScore()), {
      fontSize: '22px', color: '#ffdd44', fontFamily: FONT_FAMILY,
    });
  }

  updateScore(score: number): void {
    this.scoreText.setText(String(score));
  }

  updateLevel(level: number): void {
    this.levelText.setText(String(level));
  }

  updateLines(lines: number): void {
    this.linesText.setText(String(lines));
  }

  refreshBest(): void {
    this.bestText.setText(String(StorageUtil.getHighScore()));
  }

  updateNextPiece(type: TetrominoType): void {
    this.nextGraphics.clear();

    const shape = Tetromino.getShape(type, 0);
    const color = Tetromino.getColor(type);
    const previewSize   = CELL_SIZE * 4;
    const previewOriginX = PANEL_X;
    const previewOriginY = GRID_OFFSET_Y + 20;

    // 计算填充格子的实际边界
    let minRow = Infinity, maxRow = -Infinity;
    let minCol = Infinity, maxCol = -Infinity;
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 1) {
          if (row < minRow) minRow = row;
          if (row > maxRow) maxRow = row;
          if (col < minCol) minCol = col;
          if (col > maxCol) maxCol = col;
        }
      }
    }

    // 根据实际尺寸计算居中偏移
    const filledCols = maxCol - minCol + 1;
    const filledRows = maxRow - minRow + 1;
    const offsetX = (previewSize - filledCols * CELL_SIZE) / 2 - minCol * CELL_SIZE;
    const offsetY = (previewSize - filledRows * CELL_SIZE) / 2 - minRow * CELL_SIZE;

    this.nextGraphics.fillStyle(color, 1);

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 1) {
          const px = previewOriginX + col * CELL_SIZE + offsetX + 1;
          const py = previewOriginY + row * CELL_SIZE + offsetY + 1;
          this.nextGraphics.fillRect(px, py, CELL_SIZE - 2, CELL_SIZE - 2);

          // 高光
          this.nextGraphics.fillStyle(0xffffff, 0.15);
          this.nextGraphics.fillRect(px, py, CELL_SIZE - 2, 4);
          this.nextGraphics.fillStyle(color, 1);
        }
      }
    }
  }
}
