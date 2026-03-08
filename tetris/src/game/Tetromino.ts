import { COLORS } from '../constants/GameConstants';

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// 每种方块的 4 个旋转状态（0° / 90° / 180° / 270°）
const SHAPES: Record<TetrominoType, number[][][]> = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [
    [[0,1,1,0],[0,1,1,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0]],
  ],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]],
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]],
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]],
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]],
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]],
  ],
};

// Wall Kick 偏移表（SRS 简化版）
// [当前旋转 → 目标旋转] 的尝试偏移列表 [dx, dy]
const WALL_KICKS: [number, number][] = [
  [0, 0],   // 原位
  [-1, 0],  // 左移1
  [1, 0],   // 右移1
  [-2, 0],  // 左移2（I型使用）
  [2, 0],   // 右移2（I型使用）
  [0, -1],  // 上移1（卡底部时）
];

export interface ActivePiece {
  type: TetrominoType;
  rotationIndex: number; // 0~3
  gridX: number;
  gridY: number;
}

export class Tetromino {
  static getShape(type: TetrominoType, rotationIndex: number): number[][] {
    return SHAPES[type][rotationIndex];
  }

  static getColor(type: TetrominoType): number {
    return COLORS[type];
  }

  /** 取得方块在网格中所有填充格的坐标 */
  static getCells(piece: ActivePiece): { x: number; y: number }[] {
    const shape = this.getShape(piece.type, piece.rotationIndex);
    const cells: { x: number; y: number }[] = [];
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 1) {
          cells.push({ x: piece.gridX + col, y: piece.gridY + row });
        }
      }
    }
    return cells;
  }

  /** 尝试旋转，返回旋转+Wall Kick 后的新 piece，失败则返回 null */
  static tryRotate(
    piece: ActivePiece,
    direction: 1 | -1,
    isValid: (p: ActivePiece) => boolean
  ): ActivePiece | null {
    const newRotation = (piece.rotationIndex + direction + 4) % 4;
    for (const [dx, dy] of WALL_KICKS) {
      const candidate: ActivePiece = {
        ...piece,
        rotationIndex: newRotation,
        gridX: piece.gridX + dx,
        gridY: piece.gridY + dy,
      };
      if (isValid(candidate)) return candidate;
    }
    return null;
  }
}

// ─── 7-Bag 随机算法 ───────────────────────────────────────────────────────────

const ALL_TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export class TetrominoBag {
  private bag: TetrominoType[] = [];

  next(): TetrominoType {
    if (this.bag.length === 0) this.refill();
    return this.bag.pop()!;
  }

  peek(): TetrominoType {
    if (this.bag.length === 0) this.refill();
    return this.bag[this.bag.length - 1];
  }

  private refill(): void {
    this.bag = [...ALL_TYPES];
    // Fisher-Yates 洗牌
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }
}
