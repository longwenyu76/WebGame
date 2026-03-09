import Phaser from 'phaser';
import {
  GRID_OFFSET_X, GRID_OFFSET_Y,
  GRID_COLS, CELL_SIZE,
  COLORS,
} from '../constants/GameConstants';
import { ActivePiece, Tetromino } from './Tetromino';

const CLEAR_ANIM_MS  = 320; // 行消除动画总时长
const LOCK_FLASH_MS  = 180; // 落地高光时长
const TETRIS_PARTICLES = 24; // Tetris 特效粒子数

export class AnimationManager {
  private scene: Phaser.Scene;
  private clearGraphics: Phaser.GameObjects.Graphics;
  private lockGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // 覆盖在 boardGraphics 之上
    this.clearGraphics = scene.add.graphics().setDepth(10);
    this.lockGraphics  = scene.add.graphics().setDepth(11);
  }

  // ─── 行消除闪烁动画 ───────────────────────────────────────────────────────────

  playLineClearAnimation(rowIndices: number[], onComplete: () => void): void {
    const flashObj = { t: 0 };

    const draw = () => {
      const alpha = Math.abs(Math.sin(flashObj.t * Math.PI * 3)) * 0.9;
      this.clearGraphics.clear();
      this.clearGraphics.fillStyle(0xffffff, alpha);
      for (const row of rowIndices) {
        this.clearGraphics.fillRect(
          GRID_OFFSET_X,
          GRID_OFFSET_Y + row * CELL_SIZE,
          GRID_COLS * CELL_SIZE,
          CELL_SIZE
        );
      }
    };

    this.scene.tweens.add({
      targets: flashObj,
      t: 1,
      duration: CLEAR_ANIM_MS,
      ease: 'Linear',
      onUpdate: draw,
      onComplete: () => {
        this.clearGraphics.clear();
        onComplete();
      },
    });
  }

  // ─── 方块落地高光 ─────────────────────────────────────────────────────────────

  playLockFlash(piece: ActivePiece): void {
    const cells = Tetromino.getCells(piece);
    const flashObj = { alpha: 0.65 };

    const draw = () => {
      this.lockGraphics.clear();
      this.lockGraphics.fillStyle(0xffffff, flashObj.alpha);
      for (const { x, y } of cells) {
        if (y >= 0) {
          this.lockGraphics.fillRect(
            GRID_OFFSET_X + x * CELL_SIZE + 1,
            GRID_OFFSET_Y + y * CELL_SIZE + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2
          );
        }
      }
    };

    draw();
    this.scene.tweens.add({
      targets: flashObj,
      alpha: 0,
      duration: LOCK_FLASH_MS,
      ease: 'Quad.easeOut',
      onUpdate: draw,
      onComplete: () => this.lockGraphics.clear(),
    });
  }

  // ─── Tetris 特效（P2：4行消除爆炸粒子）────────────────────────────────────────

  playTetrisEffect(rowIndices: number[]): void {
    const midRow  = rowIndices[Math.floor(rowIndices.length / 2)];
    const centerX = GRID_OFFSET_X + (GRID_COLS * CELL_SIZE) / 2;
    const centerY = GRID_OFFSET_Y + midRow * CELL_SIZE + CELL_SIZE / 2;

    const palette = [
      COLORS.I, COLORS.T, COLORS.O, COLORS.S,
      COLORS.Z, COLORS.J, COLORS.L, 0xffffff,
    ];

    for (let i = 0; i < TETRIS_PARTICLES; i++) {
      const angle    = (i / TETRIS_PARTICLES) * Math.PI * 2 + Math.random() * 0.3;
      const distance = 80 + Math.random() * 140;
      const color    = palette[Math.floor(Math.random() * palette.length)];
      const size     = 4 + Math.random() * 5;

      const g = this.scene.add.graphics().setDepth(12);
      g.fillStyle(color, 1);
      g.fillRect(-size / 2, -size / 2, size, size);
      g.setPosition(centerX, centerY);

      this.scene.tweens.add({
        targets: g,
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        alpha: 0,
        duration: 500 + Math.random() * 250,
        ease: 'Power2',
        onComplete: () => g.destroy(),
      });
    }
  }

  destroy(): void {
    this.clearGraphics.destroy();
    this.lockGraphics.destroy();
  }
}
