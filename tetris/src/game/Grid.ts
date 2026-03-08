import { GRID_COLS, GRID_ROWS } from '../constants/GameConstants';
import { ActivePiece, Tetromino } from './Tetromino';

// 每格存储颜色值（0 = 空）
export type GridState = number[][];

export class Grid {
  private state: GridState;

  constructor() {
    this.state = this.createEmpty();
  }

  private createEmpty(): GridState {
    return Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));
  }

  getState(): GridState {
    return this.state;
  }

  getCell(row: number, col: number): number {
    return this.state[row][col];
  }

  reset(): void {
    this.state = this.createEmpty();
  }

  // ─── 碰撞检测 ────────────────────────────────────────────────────────────────

  isValidPosition(piece: ActivePiece): boolean {
    const cells = Tetromino.getCells(piece);
    for (const { x, y } of cells) {
      // 左右边界
      if (x < 0 || x >= GRID_COLS) return false;
      // 底部边界
      if (y >= GRID_ROWS) return false;
      // 与已有方块重叠（y < 0 说明还在顶部生成区，不做格子碰撞）
      if (y >= 0 && this.state[y][x] !== 0) return false;
    }
    return true;
  }

  // ─── 方块锁定 ────────────────────────────────────────────────────────────────

  /** 仅将方块写入网格，不消除行（供动画流程使用） */
  writePiece(piece: ActivePiece): void {
    const cells = Tetromino.getCells(piece);
    const color = Tetromino.getColor(piece.type);
    for (const { x, y } of cells) {
      if (y >= 0 && y < GRID_ROWS && x >= 0 && x < GRID_COLS) {
        this.state[y][x] = color;
      }
    }
  }

  /** 写入网格并立即消行（无动画时使用） */
  lockPiece(piece: ActivePiece): number {
    this.writePiece(piece);
    return this.clearLines();
  }

  // ─── 行消除 ──────────────────────────────────────────────────────────────────

  /**
   * 检测并消除满行
   * @returns 消除的行数
   */
  clearLines(): number {
    const fullRows: number[] = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      if (this.state[row].every(cell => cell !== 0)) {
        fullRows.push(row);
      }
    }

    if (fullRows.length === 0) return 0;

    // 从下往上删除（倒序），避免splice后索引偏移
    for (let i = fullRows.length - 1; i >= 0; i--) {
      this.state.splice(fullRows[i], 1);
    }

    // 在顶部补入空行
    for (let i = 0; i < fullRows.length; i++) {
      this.state.unshift(Array(GRID_COLS).fill(0));
    }

    return fullRows.length;
  }

  /**
   * 获取即将被消除的行索引（用于播放动画，在实际消除前调用）
   */
  getFullRowIndices(): number[] {
    const fullRows: number[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      if (this.state[row].every(cell => cell !== 0)) {
        fullRows.push(row);
      }
    }
    return fullRows;
  }

  // ─── 游戏结束判定 ─────────────────────────────────────────────────────────────

  /**
   * 新方块生成时调用，若位置无效则游戏结束
   */
  isGameOver(piece: ActivePiece): boolean {
    return !this.isValidPosition(piece);
  }

  // ─── Ghost Piece 计算 ─────────────────────────────────────────────────────────

  /**
   * 计算 Ghost Piece 的 Y 坐标（方块会落到哪一行）
   */
  getGhostY(piece: ActivePiece): number {
    let ghostY = piece.gridY;
    while (
      this.isValidPosition({ ...piece, gridY: ghostY + 1 })
    ) {
      ghostY++;
    }
    return ghostY;
  }
}
