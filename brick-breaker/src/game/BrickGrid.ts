import {
  BRICK_W, BRICK_H, BRICK_GAP_X, BRICK_GAP_Y,
  BRICK_AREA_X, BRICK_AREA_Y,
  BrickType, PowerupType, SCORE,
} from '../constants/GameConstants';
import { LevelData } from '../data/levels';

export interface BrickState {
  type:     BrickType;
  hp:       number;
  maxHp:    number;
  powerup?: PowerupType;
  col:      number;
  row:      number;
  x:        number;   // pixel left edge
  y:        number;   // pixel top edge
  active:   boolean;
}

export interface HitResult {
  destroyed: boolean;
  score:     number;
  powerup?:  PowerupType;
}

export class BrickGrid {
  private bricks: BrickState[] = [];

  constructor(level: LevelData) {
    for (let row = 0; row < level.grid.length; row++) {
      for (let col = 0; col < level.grid[row].length; col++) {
        const cell = level.grid[row][col];
        if (cell.type === 'empty') continue;

        const maxHp = getMaxHp(cell.type);
        this.bricks.push({
          type:    cell.type,
          hp:      maxHp,
          maxHp,
          powerup: cell.powerup,
          col, row,
          x: BRICK_AREA_X + col * (BRICK_W + BRICK_GAP_X),
          y: BRICK_AREA_Y + row * (BRICK_H + BRICK_GAP_Y),
          active: true,
        });
      }
    }
  }

  getActiveBricks(): BrickState[] {
    return this.bricks.filter(b => b.active);
  }

  /** True if any non-iron brick is still alive. */
  hasDestroyableBricks(): boolean {
    return this.bricks.some(b => b.active && b.type !== 'iron');
  }

  /**
   * Register `damage` hits on a brick.
   * Iron bricks are immune. Returns score and powerup on destruction.
   */
  hit(brick: BrickState, damage = 1): HitResult {
    if (brick.type === 'iron') return { destroyed: false, score: 0 };

    brick.hp = Math.max(0, brick.hp - damage);
    if (brick.hp === 0) {
      brick.active = false;
      let score: number = SCORE.NORMAL;
      if (brick.type === 'reinforced') score = SCORE.REINFORCED;
      else if (brick.type === 'solid')  score = SCORE.SOLID;
      return { destroyed: true, score, powerup: brick.powerup };
    }
    return { destroyed: false, score: 0 };
  }
}

function getMaxHp(type: BrickType): number {
  switch (type) {
    case 'reinforced': return 2;
    case 'solid':      return 3;
    case 'iron':       return Infinity;
    default:           return 1;  // normal, powerup
  }
}
